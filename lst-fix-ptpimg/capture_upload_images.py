#!/usr/bin/env python3
"""Capture LST replacements for LostImg and matching sites' normal image hosts."""

from __future__ import annotations

import argparse
import base64
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from dataclasses import dataclass
from pathlib import Path
from threading import Event
from typing import Any, Callable, TypeVar
from urllib.parse import parse_qs, urlparse

import requests

from lst_common import (
    LstError,
    image_host_url,
    integer_setting,
    load_config,
    load_json,
    lostimg_url,
    number_setting,
    replacement_source_description,
    require_distinct_paths,
    replace_ptpimg_blocks,
    replace_ptpimg_blocks_with_links,
    required_string,
    save_json,
    validate_source_torrent,
)


DEFAULT_OUTPUT = Path(__file__).with_name("replacement_results.json")
DEFAULT_NON_MATCHING_OUTPUT = Path(__file__).with_name("non_matching_results.json")
DEFAULT_SITE_OUTPUT_DIR = Path(__file__).with_name("site_matches")
NORMAL_HOSTS = {"imgbb", "imgbox", "onlyimage", "pixhost", "ptscreens"}
LST_HOSTS = {"lst.gg", "www.lst.gg"}
VIDEO_EXTENSIONS = {
    ".avi",
    ".m2ts",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".ts",
    ".vob",
    ".webm",
    ".wmv",
}
HDR_TRANSFERS = {"arib-std-b67", "smpte2084"}
BLACK_FRAME_OFFSETS = (0, 2, 4, 8, 16, 32, 64, -2, -4, -8, -16, -32, -64)
TV_RELEASE = re.compile(r"(?i)(?:^|[ ._-])S\d{1,3}(?:E\d{1,3})?(?:[ ._-]|$)")
BLACK_FRAME = re.compile(rb"\bpblack:100(?:\.0+)?\b")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
SITE_FILE_NAME = re.compile(r"^[a-z0-9.-]+$")
UploadValue = TypeVar("UploadValue")


@dataclass(frozen=True)
class HostConfig:
    """Configuration for one normal image host."""

    name: str
    api_key: str = ""


@dataclass(frozen=True)
class UploadResult:
    """Thumbnail, original, and viewer URLs returned by an image host."""

    thumbnail_url: str
    raw_url: str
    web_url: str

    def to_json(self) -> dict[str, str]:
        """Return public upload metadata."""

        return {
            "thumbnail_url": self.thumbnail_url,
            "raw_url": self.raw_url,
            "web_url": self.web_url,
        }


@dataclass(frozen=True)
class Settings:
    """Validated image-host, FFmpeg, and request settings."""

    lostimg_api_key: str
    normal_hosts: tuple[HostConfig, ...]
    process_limit: int
    max_screenshots: int
    thumbnail_size: int
    ffmpeg_compression: int
    tone_map_hdr: bool
    request_timeout: float
    upload_retries: int
    ffmpeg_path: str
    ffprobe_path: str


@dataclass(frozen=True)
class VideoInfo:
    """Duration and transfer characteristics returned by ffprobe."""

    duration: float
    color_transfer: str


def optional_string(payload: dict[str, Any], key: str) -> str:
    """Return an optional trimmed string setting."""

    value = payload.get(key, "")
    if not isinstance(value, str):
        raise LstError(f"{key} must be a string")
    return value.strip()


def parse_normal_host(item: Any, index: int) -> HostConfig:
    """Validate one normal image-host entry."""

    if not isinstance(item, dict):
        raise LstError(f"normal_hosts entry {index} must be an object")
    raw_name = item.get("name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise LstError(f"normal_hosts entry {index} requires a name")
    name = raw_name.strip().casefold()
    if name not in NORMAL_HOSTS:
        raise LstError(
            f"normal_hosts entry {index} uses unsupported host {name!r}; "
            "supported hosts are imgbb, imgbox, onlyimage, pixhost, and ptscreens"
        )
    raw_key = item.get("api_key", "")
    if not isinstance(raw_key, str):
        raise LstError(f"normal_hosts entry {index} api_key must be a string")
    api_key = raw_key.strip()
    if name not in {"imgbox", "pixhost"} and not api_key:
        raise LstError(f"normal_hosts entry {index} requires an api_key")
    return HostConfig(name=name, api_key=api_key)


def load_settings(path: Path) -> Settings:
    """Load the image-host and screenshot settings from shared JSON config."""

    payload = load_config(path)
    raw_hosts = payload.get("normal_hosts")
    if not isinstance(raw_hosts, list) or not raw_hosts:
        raise LstError("normal_hosts must be a non-empty JSON array")
    normal_hosts = tuple(
        parse_normal_host(item, index) for index, item in enumerate(raw_hosts, 1)
    )
    if len({host.name for host in normal_hosts}) != len(normal_hosts):
        raise LstError("normal_hosts must not contain duplicates")
    tone_map_hdr = payload.get("tone_map_hdr", True)
    if not isinstance(tone_map_hdr, bool):
        raise LstError("tone_map_hdr must be true or false")
    return Settings(
        lostimg_api_key=required_string(payload, "lostimg_api_key", "Config"),
        normal_hosts=normal_hosts,
        process_limit=integer_setting(payload, "process_limit", 4, 1, 32),
        max_screenshots=integer_setting(payload, "max_screenshots", 12, 1, 50),
        thumbnail_size=integer_setting(payload, "thumbnail_size", 350, 1, 1000),
        ffmpeg_compression=integer_setting(payload, "ffmpeg_compression", 6, 0, 9),
        tone_map_hdr=tone_map_hdr,
        request_timeout=number_setting(payload, "request_timeout", 60, 1, 300),
        upload_retries=integer_setting(payload, "upload_retries", 3, 0, 10),
        ffmpeg_path=optional_string(payload, "ffmpeg_path"),
        ffprobe_path=optional_string(payload, "ffprobe_path"),
    )


def load_matches(path: Path) -> list[dict[str, Any]]:
    """Load and validate the per-torrent qui matcher output."""

    payload = load_json(path, "qui output")
    if not isinstance(payload, list):
        raise LstError("qui output must be a JSON array")
    results: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            raise LstError(f"qui output entry {index} must be an object")
        source = validate_source_torrent(
            item.get("source_torrent"), f"qui output entry {index} source_torrent"
        )
        torrent_id = source["torrent_id"]
        if torrent_id in seen_ids:
            raise LstError(f"qui output contains duplicate torrent ID {torrent_id}")
        seen_ids.add(torrent_id)
        matches = item.get("client_matches")
        if not isinstance(matches, list) or not all(isinstance(match, dict) for match in matches):
            raise LstError(f"qui output entry {index} requires a client_matches array")
        for match in matches:
            required_string(match, "hash", f"qui output entry {index} client match")
            required_string(match, "name", f"qui output entry {index} client match")
            required_string(match, "content_path", f"qui output entry {index} client match")
        results.append(item)
    return results


def media_file_for_path(content_path: str) -> Path:
    """Resolve a qBittorrent content path to one representative video file."""

    path = Path(content_path)
    if path.is_file():
        if path.suffix.casefold() not in VIDEO_EXTENSIONS:
            raise LstError(f"Unsupported media file: {path}")
        return path
    if not path.is_dir():
        raise LstError(f"Content path does not exist: {path}")

    largest: tuple[int, Path] | None = None
    try:
        for candidate in path.rglob("*"):
            if not candidate.is_file() or candidate.suffix.casefold() not in VIDEO_EXTENSIONS:
                continue
            try:
                size = candidate.stat().st_size
            except OSError:
                continue
            if largest is None or size > largest[0]:
                largest = (size, candidate)
    except OSError as error:
        raise LstError(f"Cannot scan content path {path}: {error}") from error
    if largest is None:
        raise LstError(f"Content path contains no supported video file: {path}")
    return largest[1]


def select_client_match(matches: list[dict[str, Any]]) -> tuple[dict[str, Any], Path]:
    """Choose the first qui match whose media is accessible on this machine."""

    for match in matches:
        try:
            return match, media_file_for_path(required_string(match, "content_path", "client match"))
        except LstError:
            continue
    raise LstError("No qui client match has an accessible video file")


def resolve_program(configured: str, name: str) -> str:
    """Resolve a configured executable or find it on PATH."""

    if configured:
        path = Path(configured)
        if not path.is_file():
            raise LstError(f"Configured {name} executable does not exist: {path}")
        return str(path)
    found = shutil.which(name)
    if not found:
        raise LstError(f"{name} executable was not found")
    return found


def probe_video(ffprobe: str, path: Path) -> VideoInfo:
    """Probe the first video stream and container duration."""

    command = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=duration,color_transfer:format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise LstError(f"ffprobe failed for {path}: {type(error).__name__}") from error
    if completed.returncode != 0:
        raise LstError(f"ffprobe returned exit code {completed.returncode} for {path}")
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise LstError(f"ffprobe returned invalid JSON for {path}") from error

    streams = payload.get("streams", []) if isinstance(payload, dict) else []
    stream = streams[0] if isinstance(streams, list) and streams and isinstance(streams[0], dict) else {}
    format_data = payload.get("format", {}) if isinstance(payload, dict) else {}
    raw_duration = format_data.get("duration") if isinstance(format_data, dict) else None
    if raw_duration is None:
        raw_duration = stream.get("duration")
    try:
        duration = float(raw_duration)
    except (TypeError, ValueError) as error:
        raise LstError(f"ffprobe returned no usable duration for {path}") from error
    if duration <= 0:
        raise LstError(f"ffprobe returned no usable duration for {path}")
    transfer = stream.get("color_transfer", "")
    return VideoInfo(duration, transfer.casefold() if isinstance(transfer, str) else "")


def screenshot_timestamps(name: str, duration: float, count: int) -> list[float]:
    """Distribute screenshots through the useful 5%/10%-to-90% window."""

    start_fraction = 0.10 if TV_RELEASE.search(name) else 0.05
    start = duration * start_fraction
    usable = max((duration * 0.90) - start, 0)
    interval = usable / count if count > 1 else usable
    return [start + (index * interval) for index in range(count)]


def ffmpeg_filter(info: VideoInfo, tone_map_hdr: bool) -> str:
    """Return an SDR or software HDR-to-SDR filter chain."""

    if tone_map_hdr and info.color_transfer in HDR_TRANSFERS:
        return (
            "zscale=transfer=linear,"
            "tonemap=tonemap=mobius:desat=10.00,"
            "zscale=transfer=bt709,format=rgb24"
        )
    return "format=rgb24"


def valid_png(path: Path) -> bool:
    """Return whether an FFmpeg output has a usable PNG header."""

    try:
        with path.open("rb") as image:
            header = image.read(24)
        return (
            header.startswith(PNG_SIGNATURE)
            and header[12:16] == b"IHDR"
            and int.from_bytes(header[16:20], "big") > 0
            and int.from_bytes(header[20:24], "big") > 0
        )
    except OSError:
        return False


def capture_screenshots(
    ffmpeg: str,
    media_path: Path,
    release_name: str,
    info: VideoInfo,
    count: int,
    settings: Settings,
    output_dir: Path,
) -> list[Path]:
    """Capture ordered non-black PNG frames concurrently."""

    video_filter = ffmpeg_filter(info, settings.tone_map_hdr) + ",blackframe=amount=100:threshold=20"
    stop_capture = Event()

    def capture_one(index: int, requested: float) -> Path:
        output = output_dir / f"screen-{index:02d}.png"
        tried: set[float] = set()
        for offset in BLACK_FRAME_OFFSETS:
            if stop_capture.is_set():
                raise LstError(f"Screenshot capture {index} was cancelled")
            timestamp = round(min(max(requested + offset, 0), max(info.duration - 0.1, 0)), 3)
            if timestamp in tried:
                continue
            tried.add(timestamp)
            command = [
                ffmpeg,
                "-hide_banner",
                "-y",
                "-loglevel",
                "info",
                "-ss",
                f"{timestamp:.3f}",
                "-i",
                str(media_path),
                "-frames:v",
                "1",
                "-vf",
                video_filter,
                "-compression_level",
                str(settings.ffmpeg_compression),
                "-pred",
                "mixed",
                str(output),
            ]
            try:
                completed = subprocess.run(command, check=False, capture_output=True, timeout=180)
            except (OSError, subprocess.TimeoutExpired):
                continue
            if completed.returncode == 0 and valid_png(output) and not BLACK_FRAME.search(completed.stderr):
                return output
        raise LstError(f"FFmpeg could not capture screenshot {index} from {media_path}")

    timestamps = screenshot_timestamps(release_name, info.duration, count)
    executor = ThreadPoolExecutor(max_workers=min(settings.process_limit, count))
    futures = []
    try:
        futures = [
            executor.submit(capture_one, index, timestamp)
            for index, timestamp in enumerate(timestamps, 1)
        ]
        return [future.result() for future in futures]
    except BaseException:
        stop_capture.set()
        for future in futures:
            future.cancel()
        executor.shutdown(wait=True, cancel_futures=True)
        raise
    finally:
        if not stop_capture.is_set():
            executor.shutdown(wait=True)


def response_json(
    response: requests.Response,
    host: str,
    statuses: set[int],
) -> dict[str, Any]:
    """Validate an image-host response without exposing credentials or bodies."""

    if response.status_code not in statuses:
        raise LstError(f"{host} upload returned HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:
        raise LstError(f"{host} upload returned invalid JSON") from error
    if not isinstance(payload, dict):
        raise LstError(f"{host} upload returned an invalid JSON object")
    return payload


def retry_upload(
    operation: Callable[[], UploadValue],
    host: str,
    retries: int,
) -> UploadValue:
    """Retry one image-host operation with a short linear backoff."""

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return operation()
        except (LstError, requests.RequestException, OSError) as error:
            last_error = error
            if attempt < retries:
                time.sleep(1.1 * (attempt + 1))
    raise LstError(f"{host} upload failed after {retries + 1} attempts") from last_error


def upload_imgbox(
    session: requests.Session,
    host: HostConfig,
    images: list[Path],
    settings: Settings,
) -> list[UploadResult]:
    """Upload one screenshot batch through an anonymous Imgbox session."""

    def operation() -> list[UploadResult]:
        homepage = session.get(
            "https://imgbox.com/",
            headers={
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout=settings.request_timeout,
        )
        if homepage.status_code != 200:
            raise LstError(
                f"imgbox anonymous upload session returned HTTP {homepage.status_code}"
            )
        content_type = homepage.headers.get("Content-Type", "").strip().casefold()
        if content_type and not content_type.startswith("text/html"):
            raise LstError("imgbox anonymous upload session returned unexpected content")
        document = homepage.text
        normalized = document.casefold()
        if any(
            marker in normalized
            for marker in ("cf-chl-", "attention required", "checking your browser")
        ):
            raise LstError("imgbox anonymous upload session is temporarily challenged")
        token_match = re.search(
            r"name=(?:\"authenticity_token\"|'authenticity_token')[^>]*"
            r"value=(?:\"([^\"]+)\"|'([^']+)')",
            document,
        )
        if token_match is None:
            raise LstError("imgbox authenticity token not found")
        csrf_token = (token_match.group(1) or token_match.group(2)).strip()
        if not csrf_token:
            raise LstError("imgbox authenticity token not found")

        upload_headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Origin": "https://imgbox.com",
            "Referer": "https://imgbox.com/",
            "X-CSRF-Token": csrf_token,
            "X-Requested-With": "XMLHttpRequest",
        }
        token_response = session.post(
            "https://imgbox.com/ajax/token/generate",
            headers=upload_headers,
            timeout=settings.request_timeout,
        )
        token_payload = response_json(token_response, host.name, {200})
        upload_token: dict[str, str] = {}
        for key in ("token_id", "token_secret", "gallery_id", "gallery_secret"):
            value = token_payload.get(key)
            upload_token[key] = (
                "null" if value is None or not str(value).strip() else str(value).strip()
            )
        if upload_token["token_id"] == "null" or upload_token["token_secret"] == "null":
            raise LstError("imgbox anonymous upload token response was incomplete")

        results: list[UploadResult] = []
        for image in images:
            fields = {
                **upload_token,
                "content_type": "1",
                "thumbnail_size": f"{settings.thumbnail_size}r",
                "comments_enabled": "0",
            }
            with image.open("rb") as image_file:
                response = session.post(
                    "https://imgbox.com/upload/process",
                    headers=upload_headers,
                    data=fields,
                    files={"files[]": (image.name, image_file, "image/png")},
                    timeout=settings.request_timeout,
                )
            payload = response_json(response, host.name, {200})
            files = payload.get("files")
            if payload.get("ok") is not True and not files:
                raise LstError("imgbox upload was rejected")
            if not isinstance(files, list) or not files or not isinstance(files[0], dict):
                raise LstError("imgbox upload returned no image")
            image_data = files[0]
            results.append(
                UploadResult(
                    image_host_url(image_data.get("thumbnail_url"), "imgbox thumbnail"),
                    image_host_url(image_data.get("original_url"), "imgbox image"),
                    image_host_url(
                        image_data.get("image_url") or image_data.get("gallery_url"),
                        "imgbox viewer",
                    ),
                )
            )
        return results

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_imgbb(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG to ImgBB."""

    def operation() -> UploadResult:
        encoded = base64.b64encode(image.read_bytes()).decode("ascii")
        response = session.post(
            "https://api.imgbb.com/1/upload",
            data={"key": host.api_key, "image": encoded},
            timeout=settings.request_timeout,
        )
        payload = response_json(response, host.name, {200})
        data = payload.get("data")
        if payload.get("success") is not True or not isinstance(data, dict):
            raise LstError("imgbb upload failed")
        image_data = data.get("image", {})
        medium = data.get("medium", {})
        thumb = data.get("thumb", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        if not thumbnail and isinstance(thumb, dict):
            thumbnail = thumb.get("url")
        return UploadResult(
            image_host_url(thumbnail, "imgbb thumbnail"),
            image_host_url(
                image_data.get("url") if isinstance(image_data, dict) else "",
                "imgbb image",
            ),
            image_host_url(data.get("url_viewer"), "imgbb viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_pixhost(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG to Pixhost."""

    def operation() -> UploadResult:
        with image.open("rb") as image_file:
            response = session.post(
                "https://api.pixhost.to/images",
                data={"content_type": "0", "max_th_size": str(settings.thumbnail_size)},
                files={"img": (image.name, image_file, "image/png")},
                timeout=settings.request_timeout,
            )
        payload = response_json(response, host.name, {200})
        thumbnail = image_host_url(payload.get("th_url"), "pixhost thumbnail")
        raw = thumbnail.replace("https://t", "https://img").replace(
            "/thumbs/", "/images/"
        )
        return UploadResult(
            thumbnail,
            image_host_url(raw, "pixhost image"),
            image_host_url(payload.get("show_url"), "pixhost viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_onlyimage(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG through OnlyImage's multipart API."""

    def operation() -> UploadResult:
        with image.open("rb") as image_file:
            response = session.post(
                "https://onlyimage.org/api/1/upload",
                headers={"X-API-Key": host.api_key},
                files={"source": (image.name, image_file, "image/png")},
                timeout=settings.request_timeout,
            )
        payload = response_json(response, host.name, {200})
        success = payload.get("success", {})
        success_code = success.get("code", 0) if isinstance(success, dict) else None
        if payload.get("status_code") != 200 or success_code not in {0, 200}:
            raise LstError("onlyimage upload failed")
        image_data = payload.get("image")
        if not isinstance(image_data, dict):
            raise LstError("onlyimage upload returned no image")
        nested_image = image_data.get("image", {})
        raw = image_data.get("url")
        if not raw and isinstance(nested_image, dict):
            raw = nested_image.get("url")
        raw_url = image_host_url(raw, "onlyimage image")
        medium = image_data.get("medium", {})
        thumb = image_data.get("thumb", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        if not thumbnail and isinstance(thumb, dict):
            thumbnail = thumb.get("url")
        return UploadResult(
            image_host_url(thumbnail or raw_url, "onlyimage thumbnail"),
            raw_url,
            image_host_url(image_data.get("url_viewer") or raw_url, "onlyimage viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_ptscreens(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG to PTScreens."""

    def operation() -> UploadResult:
        with image.open("rb") as image_file:
            response = session.post(
                "https://ptscreens.com/api/1/upload",
                headers={"X-API-Key": host.api_key},
                files={"source": (image.name, image_file, "image/png")},
                timeout=settings.request_timeout,
            )
        payload = response_json(response, host.name, {200})
        image_data = payload.get("image")
        if not isinstance(image_data, dict):
            raise LstError("ptscreens upload returned no image")
        raw = image_host_url(image_data.get("url"), "ptscreens image")
        medium = image_data.get("medium", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        return UploadResult(
            image_host_url(thumbnail or raw, "ptscreens thumbnail"),
            raw,
            image_host_url(image_data.get("url_viewer") or raw, "ptscreens viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_batch(
    session: requests.Session,
    host: HostConfig,
    images: list[Path],
    settings: Settings,
) -> list[UploadResult]:
    """Upload all screenshots to one supported normal image host."""

    if host.name in {"imgbox", "pixhost"} and any(
        image.stat().st_size > 10_000_000 for image in images
    ):
        raise LstError(f"{host.name} does not accept images larger than 10 MB")
    if host.name == "imgbb" and any(
        image.stat().st_size > 31_000_000 for image in images
    ):
        raise LstError("imgbb does not accept images larger than 31 MB")
    if host.name == "imgbox":
        return upload_imgbox(session, host, images, settings)
    uploader: Callable[[requests.Session, HostConfig, Path, Settings], UploadResult]
    if host.name == "imgbb":
        uploader = upload_imgbb
    elif host.name == "onlyimage":
        uploader = upload_onlyimage
    elif host.name == "pixhost":
        uploader = upload_pixhost
    elif host.name == "ptscreens":
        uploader = upload_ptscreens
    else:
        raise LstError(f"Unsupported image host: {host.name}")
    return [uploader(session, host, image, settings) for image in images]


def normal_host_order(
    hosts: tuple[HostConfig, ...],
    start_index: int,
) -> list[HostConfig]:
    """Return one full round-robin host cycle from ``start_index``."""

    return [hosts[(start_index + offset) % len(hosts)] for offset in range(len(hosts))]


def upload_normal_round_robin(
    session: requests.Session,
    settings: Settings,
    images: list[Path],
    start_index: int,
) -> tuple[str, list[UploadResult]]:
    """Upload to the assigned normal host, falling through one host cycle."""

    errors: list[str] = []
    for host in normal_host_order(settings.normal_hosts, start_index):
        try:
            return host.name, upload_batch(session, host, images, settings)
        except (LstError, requests.RequestException, OSError) as error:
            errors.append(f"{host.name}: {error}")
            print(
                f"Warning: {host.name} failed; trying the next normal image host",
                file=sys.stderr,
            )
    raise LstError("All normal image hosts failed: " + "; ".join(errors))


def upload_lostimg(
    session: requests.Session,
    images: list[Path],
    settings: Settings,
) -> list[str]:
    """Upload one ordered screenshot batch to LostImg with bounded retries."""

    last_error: Exception | None = None
    for attempt in range(settings.upload_retries + 1):
        try:
            with ExitStack() as stack:
                files = [
                    (
                        "file[]",
                        (image.name, stack.enter_context(image.open("rb")), "image/png"),
                    )
                    for image in images
                ]
                response = session.post(
                    "https://lostimg.cc/api/v1/images",
                    headers={"Authorization": f"Bearer {settings.lostimg_api_key}"},
                    files=files,
                    timeout=settings.request_timeout,
                )
            if response.status_code != 200:
                raise LstError(f"LostImg upload returned HTTP {response.status_code}")
            try:
                payload = response.json()
            except ValueError as error:
                raise LstError("LostImg upload returned invalid JSON") from error
            if not isinstance(payload, dict):
                raise LstError("LostImg upload response must be a JSON object")
            if isinstance(payload.get("error"), str) and payload["error"].strip():
                raise LstError("LostImg upload failed")
            urls = payload.get("urls")
            if not isinstance(urls, list):
                single = payload.get("url")
                urls = [single] if isinstance(single, str) and single else []
            if len(urls) != len(images):
                raise LstError(
                    f"LostImg returned {len(urls)} URLs for {len(images)} screenshots"
                )
            return [lostimg_url(url) for url in urls]
        except (LstError, requests.RequestException, OSError) as error:
            last_error = error
            if attempt < settings.upload_retries:
                time.sleep(1.1 * (attempt + 1))
    raise LstError(
        f"LostImg upload failed after {settings.upload_retries + 1} attempts"
    ) from last_error


def site_name_for_url(raw_link: Any) -> tuple[str, str] | None:
    """Return a filesystem-safe non-LST hostname and validated details URL."""

    try:
        link = image_host_url(raw_link, "Client comment")
    except LstError:
        return None
    hostname = (urlparse(link).hostname or "").casefold()
    if hostname in LST_HOSTS:
        return None
    site = hostname.removeprefix("www.")
    if (
        not site
        or "." not in site
        or site.startswith(".")
        or site.endswith(".")
        or ".." in site
        or SITE_FILE_NAME.fullmatch(site) is None
    ):
        return None
    return site, link


def torrent_id_from_url(link: str) -> str:
    """Extract a numeric torrent ID from common private-tracker details URLs."""

    parsed = urlparse(link)
    path = parsed.path.casefold()
    path_match = re.search(r"/(?:torrents?|details)/(\d+)(?:[/-]|$)", path)
    if path_match is not None:
        return path_match.group(1)
    query = {
        key.casefold(): values
        for key, values in parse_qs(parsed.query, keep_blank_values=True).items()
    }
    for key in ("torrentid", "torrent_id"):
        values = query.get(key, [])
        if values and values[0].isdigit():
            return values[0]
    if any(marker in path for marker in ("torrent", "detail")):
        values = query.get("id", [])
        if values and values[0].isdigit():
            return values[0]
    return ""


def other_site_matches(item: dict[str, Any]) -> list[dict[str, str]]:
    """Map every non-LST client-comment link to its exact qBittorrent torrent."""

    matches: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    for client_match in item["client_matches"]:
        info_hash = required_string(client_match, "hash", "client match")
        name = required_string(client_match, "name", "client match")
        raw_file_names = client_match.get("file_names", [])
        file_names = (
            [value.strip() for value in raw_file_names if isinstance(value, str) and value.strip()]
            if isinstance(raw_file_names, list)
            else []
        )
        raw_links = client_match.get("site_links", [])
        if not isinstance(raw_links, list):
            continue
        for raw_link in raw_links:
            site_link = site_name_for_url(raw_link)
            if site_link is None:
                continue
            site, details_url = site_link
            key = (site, details_url, info_hash.casefold())
            if key in seen:
                continue
            seen.add(key)
            result = {
                "site": site,
                "details_url": details_url,
                "name": name,
                "info_hash": info_hash,
            }
            torrent_id = torrent_id_from_url(details_url)
            if torrent_id:
                result["torrent_id"] = torrent_id
            if len(file_names) == 1:
                result["filename"] = file_names[0]
            matches.append(result)
    return matches


def build_site_records(
    item: dict[str, Any],
    matches: list[dict[str, str]],
    image_host: str,
    proposed_description: str,
) -> list[dict[str, str]]:
    """Attach shared LST and normal-host replacement data to site matches."""

    source = item["source_torrent"]
    records: list[dict[str, str]] = []
    for match in matches:
        record = dict(match)
        record.update(
            {
                "lst_torrent_id": source["torrent_id"],
                "lst_name": source["name"],
                "image_host": image_host,
                "proposed_description": proposed_description,
            }
        )
        records.append(record)
    return records


def site_output_path(output_dir: Path, site: str) -> Path:
    """Return a safe per-site JSON output path."""

    if (
        not site
        or "." not in site
        or site.startswith(".")
        or site.endswith(".")
        or ".." in site
        or SITE_FILE_NAME.fullmatch(site) is None
    ):
        raise LstError(f"Invalid site output name: {site!r}")
    return output_dir / f"{site}.json"


def existing_site_output_paths(output_dir: Path) -> list[Path]:
    """Return generated-looking site files already present in the owned directory."""

    if not output_dir.exists():
        return []
    if not output_dir.is_dir():
        raise LstError(f"Site output path is not a directory: {output_dir}")
    try:
        candidates = sorted(output_dir.iterdir(), key=lambda path: path.name.casefold())
    except OSError as error:
        raise LstError(f"Cannot inspect site output directory {output_dir}: {error}") from error
    results: list[Path] = []
    for candidate in candidates:
        if not candidate.is_file() or candidate.suffix != ".json":
            continue
        site = candidate.stem
        try:
            expected = site_output_path(output_dir, site)
        except LstError:
            continue
        if candidate.name == expected.name:
            results.append(candidate)
    return results


def save_site_match_files(
    output_dir: Path,
    results: list[dict[str, Any]],
    expected_sites: set[str],
) -> list[Path]:
    """Reconcile one JSON array per currently matched non-LST tracker hostname."""

    grouped: dict[str, list[dict[str, str]]] = {}
    for site in sorted(expected_sites):
        site_output_path(output_dir, site)
        grouped[site] = []
    seen: dict[str, set[tuple[str, str, str]]] = {}
    for result in results:
        records = result.get("site_matches", [])
        if not isinstance(records, list):
            raise LstError("site_matches checkpoint must be an array")
        for record in records:
            if not isinstance(record, dict):
                raise LstError("site_matches checkpoint contains a non-object record")
            required_keys = {
                "site",
                "details_url",
                "name",
                "info_hash",
                "lst_torrent_id",
                "lst_name",
                "image_host",
                "proposed_description",
            }
            allowed_keys = required_keys | {"torrent_id", "filename"}
            if not required_keys <= set(record) or not set(record) <= allowed_keys:
                raise LstError("site_matches checkpoint has an invalid record schema")
            site = record.get("site")
            details_url = record.get("details_url")
            info_hash = record.get("info_hash")
            lst_torrent_id = record.get("lst_torrent_id")
            if not all(
                isinstance(value, str) and value
                for value in record.values()
            ):
                raise LstError("site_matches checkpoint contains an empty field")
            if site not in grouped or record["image_host"] not in NORMAL_HOSTS:
                raise LstError("site_matches checkpoint does not match the current input")
            key = (details_url, info_hash.casefold(), lst_torrent_id)
            if key in seen.setdefault(site, set()):
                continue
            seen[site].add(key)
            grouped[site].append(
                {
                    field: value
                    for field, value in record.items()
                    if field not in {"lst_torrent_id", "lst_name"}
                }
            )

    written: dict[str, Path] = {}
    for path in existing_site_output_paths(output_dir):
        if path.stem not in grouped:
            save_json(path, [])
            written[path.name] = path
    for site in sorted(grouped):
        path = site_output_path(output_dir, site)
        save_json(path, grouped[site])
        written[path.name] = path
    return [written[name] for name in sorted(written)]


def process_match(
    session: requests.Session,
    item: dict[str, Any],
    settings: Settings,
    ffmpeg: str,
    ffprobe: str,
    normal_host_index: int,
    process_at_max_screenshots: bool = False,
) -> tuple[dict[str, Any], bool]:
    """Capture once, upload concurrently, and build LST and per-site descriptions."""

    source = item["source_torrent"]
    block_count = len(source["ptpimg_blocks"])
    discarded_count = max(0, block_count - settings.max_screenshots)
    if discarded_count and not process_at_max_screenshots:
        raise LstError(
            f"Torrent {source['torrent_id']} needs {block_count} screenshots, above "
            f"max_screenshots={settings.max_screenshots}"
        )
    if discarded_count:
        block_count = settings.max_screenshots
    replacement_source = replacement_source_description(
        source["description"], block_count, discarded_count
    )
    client_match, media_path = select_client_match(item["client_matches"])
    info = probe_video(ffprobe, media_path)
    site_matches = other_site_matches(item)
    with tempfile.TemporaryDirectory(prefix="lst-fix-ptpimg-") as directory:
        images = capture_screenshots(
            ffmpeg,
            media_path,
            source["name"],
            info,
            block_count,
            settings,
            Path(directory),
        )
        source_headers = getattr(session, "headers", {})
        lane_headers = {
            header: source_headers[header]
            for header in ("Accept", "User-Agent")
            if header in source_headers
        }
        worker_count = 1 + int(bool(site_matches))
        with ExitStack() as upload_sessions, ThreadPoolExecutor(
            max_workers=worker_count
        ) as executor:
            lostimg_future = executor.submit(upload_lostimg, session, images, settings)
            normal_future = None
            if site_matches:
                normal_session = upload_sessions.enter_context(requests.Session())
                normal_session.headers.update(lane_headers)
                normal_future = executor.submit(
                    upload_normal_round_robin,
                    normal_session,
                    settings,
                    images,
                    normal_host_index,
                )

            lostimg_error: Exception | None = None
            lostimg_urls: list[str] = []
            try:
                lostimg_urls = lostimg_future.result()
            except (LstError, requests.RequestException, OSError) as error:
                lostimg_error = error

            normal_error: Exception | None = None
            normal_host = ""
            normal_uploads: list[UploadResult] = []
            if normal_future is not None:
                try:
                    normal_host, normal_uploads = normal_future.result()
                except (LstError, requests.RequestException, OSError) as error:
                    normal_error = error

    result: dict[str, Any] = {
        "source_torrent": source,
        "client_match": {
            "hash": client_match["hash"],
            "name": client_match["name"],
            "content_path": client_match["content_path"],
        },
    }
    if discarded_count:
        result["discarded_ptpimg_blocks"] = discarded_count
    if lostimg_error is None:
        try:
            proposed, replacements = replace_ptpimg_blocks(
                replacement_source, lostimg_urls
            )
            result.update(
                {
                    "image_host": "lostimg",
                    "replacements": replacements,
                    "proposed_description": proposed,
                }
            )
        except LstError as error:
            lostimg_error = error
    if lostimg_error is not None:
        result["processing_error"] = str(lostimg_error)

    if site_matches and normal_error is None:
        try:
            normal_description = replace_ptpimg_blocks_with_links(
                replacement_source,
                [(upload.web_url, upload.raw_url) for upload in normal_uploads],
            )
            result["normal_image_upload"] = {
                "image_host": normal_host,
                "images": [upload.to_json() for upload in normal_uploads],
            }
            result["site_matches"] = build_site_records(
                item,
                site_matches,
                normal_host,
                normal_description,
            )
        except LstError as error:
            normal_error = error
    if normal_error is not None:
        result["site_match_error"] = str(normal_error)
    return result, lostimg_error is not None or normal_error is not None


def existing_successes(path: Path) -> dict[str, dict[str, Any]]:
    """Load resumable complete or partial results keyed by torrent ID."""

    if not path.exists():
        return {}
    payload = load_json(path, "replacement output")
    if not isinstance(payload, list):
        raise LstError("replacement output must be a JSON array")
    successes: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            continue
        source = validate_source_torrent(
            item.get("source_torrent"), f"replacement output entry {index} source_torrent"
        )
        torrent_id = source["torrent_id"]
        if torrent_id in successes:
            raise LstError(f"replacement output contains duplicate torrent ID {torrent_id}")
        successes[torrent_id] = item
    return successes


def result_complete_for_item(
    item: dict[str, Any],
    result: dict[str, Any],
    max_screenshots: int | None = None,
    process_at_max_screenshots: bool = False,
) -> bool:
    """Return whether a checkpoint exactly reconstructs every required upload lane."""

    source = item["source_torrent"]
    saved_source = result.get("source_torrent")
    if (
        saved_source != source
        or not isinstance(result.get("proposed_description"), str)
        or "processing_error" in result
    ):
        return False

    raw_replacements = result.get("replacements")
    if result.get("image_host") != "lostimg" or not isinstance(raw_replacements, list):
        return False
    try:
        lostimg_urls = [
            required_string(replacement, "lostimg_url", "Saved replacement")
            for replacement in raw_replacements
            if isinstance(replacement, dict)
        ]
        has_discarded = "discarded_ptpimg_blocks" in result
        discarded_count = result.get("discarded_ptpimg_blocks", 0)
        if has_discarded and (
            type(discarded_count) is not int
            or discarded_count <= 0
            or not process_at_max_screenshots
            or max_screenshots is None
            or len(lostimg_urls) != max_screenshots
        ):
            return False
        replacement_source = replacement_source_description(
            source["description"], len(lostimg_urls), discarded_count
        )
        lst_description, expected_replacements = replace_ptpimg_blocks(
            replacement_source, lostimg_urls
        )
    except LstError:
        return False
    if (
        len(lostimg_urls) != len(raw_replacements)
        or result["proposed_description"] != lst_description
        or raw_replacements != expected_replacements
    ):
        return False

    expected_matches = other_site_matches(item)
    if not expected_matches:
        return (
            "site_match_error" not in result
            and "normal_image_upload" not in result
            and (
                "site_matches" not in result
                or result["site_matches"] == []
            )
        )
    raw_upload = result.get("normal_image_upload")
    if "site_match_error" in result or not isinstance(raw_upload, dict):
        return False
    image_host = raw_upload.get("image_host")
    raw_images = raw_upload.get("images")
    if (
        not isinstance(image_host, str)
        or image_host not in NORMAL_HOSTS
        or not isinstance(raw_images, list)
    ):
        return False
    uploads: list[UploadResult] = []
    try:
        for image in raw_images:
            if not isinstance(image, dict) or set(image) != {
                "thumbnail_url",
                "raw_url",
                "web_url",
            }:
                return False
            uploads.append(
                UploadResult(
                    image_host_url(image["thumbnail_url"], "Saved thumbnail"),
                    image_host_url(image["raw_url"], "Saved image"),
                    image_host_url(image["web_url"], "Saved viewer"),
                )
            )
        normal_description = replace_ptpimg_blocks_with_links(
            replacement_source,
            [(upload.web_url, upload.raw_url) for upload in uploads],
        )
    except LstError:
        return False
    expected_upload = {
        "image_host": image_host,
        "images": [upload.to_json() for upload in uploads],
    }
    if raw_upload != expected_upload:
        return False
    raw_records = result.get("site_matches")
    if not isinstance(raw_records, list):
        return False
    expected_records = build_site_records(
        item,
        expected_matches,
        image_host,
        normal_description,
    )
    return raw_records == expected_records


def parse_args() -> argparse.Namespace:
    """Parse qui input, shared config, and generated output paths."""

    parser = argparse.ArgumentParser(
        description=(
            "Capture LST replacement screenshots for LostImg and matching sites' normal hosts."
        )
    )
    parser.add_argument("input", type=Path, help="JSON from qui_match_torrents.py")
    parser.add_argument("config", type=Path, help="JSON config with LostImg and FFmpeg settings")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Replacement JSON path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--non-matching-output",
        type=Path,
        default=DEFAULT_NON_MATCHING_OUTPUT,
        help=f"Non-matching JSON path (default: {DEFAULT_NON_MATCHING_OUTPUT})",
    )
    parser.add_argument(
        "--site-output-dir",
        type=Path,
        default=DEFAULT_SITE_OUTPUT_DIR,
        help=f"Per-site JSON directory (default: {DEFAULT_SITE_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--process-at-max-screenshots",
        action="store_true",
        help=(
            "Capture at most max_screenshots and remove later replaceable PTPImg blocks; "
            "comparison blocks are preserved"
        ),
    )
    return parser.parse_args()


def main() -> int:
    """Resume completed uploads, retry failures, and checkpoint every result."""

    args = parse_args()
    try:
        matches = load_matches(args.input)
        site_names = sorted(
            {
                match["site"]
                for item in matches
                for match in other_site_matches(item)
            }
        )
        site_paths = list(
            dict.fromkeys(
                [
                    *(site_output_path(args.site_output_dir, site) for site in site_names),
                    *existing_site_output_paths(args.site_output_dir),
                ]
            )
        )
        require_distinct_paths(
            [
                ("input", args.input),
                ("config", args.config),
                ("output", args.output),
                ("non-matching output", args.non_matching_output),
                ("site output directory", args.site_output_dir),
                *[
                    (f"{path.stem} site output", path)
                    for path in site_paths
                ],
            ]
        )
        settings = load_settings(args.config)
        resumable = existing_successes(args.output)
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    result_by_id: dict[str, dict[str, Any]] = {}
    non_matching: list[dict[str, Any]] = []
    pending: list[dict[str, Any]] = []
    matching_order: list[str] = []
    normal_host_indices: dict[str, int] = {}
    normal_host_count = 0
    for item in matches:
        source = item["source_torrent"]
        torrent_id = source["torrent_id"]
        if not item["client_matches"]:
            nonmatch: dict[str, Any] = {"source_torrent": source}
            if isinstance(item.get("search_error"), str):
                nonmatch["search_error"] = item["search_error"]
            non_matching.append(nonmatch)
            continue
        matching_order.append(torrent_id)
        if other_site_matches(item):
            normal_host_indices[torrent_id] = normal_host_count
            normal_host_count += 1
        existing = resumable.get(torrent_id)
        if existing is not None and result_complete_for_item(
            item,
            existing,
            settings.max_screenshots,
            args.process_at_max_screenshots,
        ):
            result_by_id[torrent_id] = existing
            continue
        pending.append(item)

    try:
        save_json(args.non_matching_output, non_matching)
        ordered_results = [
            result_by_id[key] for key in matching_order if key in result_by_id
        ]
        save_json(args.output, ordered_results)
        save_site_match_files(args.site_output_dir, ordered_results, set(site_names))
        ffmpeg = resolve_program(settings.ffmpeg_path, "ffmpeg") if pending else ""
        ffprobe = resolve_program(settings.ffprobe_path, "ffprobe") if pending else ""
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    with requests.Session() as session:
        session.headers.update({"Accept": "application/json", "User-Agent": "lst-fix-ptpimg-images/1.0"})
        for index, item in enumerate(pending, 1):
            source = item["source_torrent"]
            torrent_id = source["torrent_id"]
            print(f"[{index}/{len(pending)}] {torrent_id} {source['name']}")
            try:
                result, item_failed = process_match(
                    session,
                    item,
                    settings,
                    ffmpeg,
                    ffprobe,
                    normal_host_indices.get(torrent_id, 0),
                    args.process_at_max_screenshots,
                )
                result_by_id[torrent_id] = result
                failed = failed or item_failed
                for error_key in ("processing_error", "site_match_error"):
                    if isinstance(result.get(error_key), str):
                        print(
                            f"Error: torrent {torrent_id}: {result[error_key]}",
                            file=sys.stderr,
                        )
            except (LstError, requests.RequestException, OSError) as error:
                failed = True
                failed_result = dict(result_by_id.get(torrent_id, {}))
                failed_result.update(
                    {
                        "source_torrent": source,
                        "processing_error": str(error),
                    }
                )
                result_by_id[torrent_id] = failed_result
                print(f"Error: torrent {torrent_id}: {error}", file=sys.stderr)
            try:
                ordered_results = [
                    result_by_id[key]
                    for key in matching_order
                    if key in result_by_id
                ]
                save_json(args.output, ordered_results)
                save_site_match_files(
                    args.site_output_dir,
                    ordered_results,
                    set(site_names),
                )
            except LstError as error:
                print(f"Error: {error}", file=sys.stderr)
                return 2

    successful = sum(
        isinstance(result.get("proposed_description"), str) for result in result_by_id.values()
    )
    site_records = sum(
        len(result.get("site_matches", []))
        for result in result_by_id.values()
        if isinstance(result.get("site_matches"), list)
    )
    print(
        f"Saved {successful} replacement descriptions to {args.output}; "
        f"{site_records} other-site matches to {args.site_output_dir}; "
        f"{len(non_matching)} torrents had no qui match"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
