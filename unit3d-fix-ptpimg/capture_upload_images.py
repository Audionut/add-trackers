#!/usr/bin/env python3
r"""Capture replacement screenshots and upload them for matched UNIT3D torrents.

Create an ignored ``config.images.json`` file. API keys are read directly from
this file, never from environment variables:

{
  "normal_hosts": [
    {"name": "pixhost"},
    {"name": "imgbb", "api_key": "your ImgBB API key"},
    {"name": "onlyimage", "api_key": "your OnlyImage API key"},
    {"name": "ptscreens", "api_key": "your PTScreens API key"}
  ],
  "lostimg": {"enabled": false, "api_key": ""},
  "reelflix": {"enabled": false, "api_key": ""},
  "screenshots": 4,
  "process_limit": 4,
  "thumbnail_size": 350,
  "ffmpeg_compression": 6,
  "tone_map_hdr": true
}

Then run from the ``unit3d-fix-ptpimg`` directory in PowerShell:

  py .\capture_upload_images.py .\qui_torrent_matches.json .\config.images.json --matching-output .\matching_results.json --non-matching-output .\non_matching_results.json

One accessible client match is selected per release. Four frames are captured
concurrently by default and uploaded to one normal host, rotating the starting
host for each release. The normal, Lostimg, and ReelFlix upload lanes then run
concurrently for that release, but releases are processed one at a time.
Lostimg receives the same frames only when an LST match exists, and ReelFlix
receives them only when a ReelFlix match exists.

When the matching output already exists, its source torrents are preserved and
skipped by site and torrent ID. Only source torrents missing from that output
are captured and appended.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
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
from typing import Any, Callable
from urllib.parse import urlparse

import requests


NORMAL_HOSTS = {"imgbb", "onlyimage", "pixhost", "ptscreens"}
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
LST_HOSTS = {"lst.gg", "www.lst.gg"}
REELFLIX_HOSTS = {
    "reelflix.cc",
    "www.reelflix.cc",
    "reelflix.xyz",
    "www.reelflix.xyz",
}
BLACK_FRAME_OFFSETS = (0, 2, 4, 8, 16, 32, 64, -2, -4, -8, -16, -32, -64)
TV_RELEASE = re.compile(r"(?i)(?:^|[ ._-])S\d{1,3}(?:E\d{1,3})?(?:[ ._-]|$)")
BLACK_FRAME = re.compile(rb"\bpblack:100(?:\.0+)?\b")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ImagePipelineError(RuntimeError):
    """Raised for invalid input, capture failures, or image-host failures."""


@dataclass(frozen=True)
class HostConfig:
    """Configuration for one image host."""

    name: str
    api_key: str = ""


@dataclass(frozen=True)
class Settings:
    """Validated capture and image-upload settings."""

    normal_hosts: tuple[HostConfig, ...]
    lostimg: HostConfig | None
    reelflix: HostConfig | None
    screenshots: int
    process_limit: int
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


@dataclass(frozen=True)
class UploadResult:
    """Thumbnail, original, and viewer URLs returned by an image host."""

    thumbnail_url: str
    raw_url: str
    web_url: str

    def to_json(self) -> dict[str, str]:
        """Return the public JSON representation of this upload."""

        return {
            "thumbnail_url": self.thumbnail_url,
            "raw_url": self.raw_url,
            "web_url": self.web_url,
        }


def load_json(path: Path, label: str) -> Any:
    """Read one UTF-8 JSON file.

    Raises:
        ImagePipelineError: If the file cannot be read or decoded.
    """

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise ImagePipelineError(f"Cannot read {label} {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise ImagePipelineError(f"Invalid JSON in {label} {path}: {error}") from error


def integer_setting(
    payload: dict[str, Any],
    key: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    """Return a bounded integer configuration value."""

    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ImagePipelineError(f"{key} must be an integer from {minimum} to {maximum}")
    return value


def number_setting(
    payload: dict[str, Any],
    key: str,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    """Return a bounded numeric configuration value."""

    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ImagePipelineError(f"{key} must be a number")
    result = float(value)
    if not minimum <= result <= maximum:
        raise ImagePipelineError(f"{key} must be from {minimum:g} to {maximum:g}")
    return result


def parse_normal_host(item: Any, index: int) -> HostConfig:
    """Validate one normal image-host entry."""

    if not isinstance(item, dict):
        raise ImagePipelineError(f"normal_hosts entry {index} must be an object")
    raw_name = item.get("name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise ImagePipelineError(f"normal_hosts entry {index} requires a name")
    name = raw_name.strip().casefold()
    if name not in NORMAL_HOSTS:
        raise ImagePipelineError(
            f"normal_hosts entry {index} uses unsupported host {name!r}; "
            "supported hosts are imgbb, onlyimage, pixhost, and ptscreens"
        )
    raw_key = item.get("api_key", "")
    if not isinstance(raw_key, str):
        raise ImagePipelineError(f"normal_hosts entry {index} api_key must be a string")
    api_key = raw_key.strip()
    if name != "pixhost" and not api_key:
        raise ImagePipelineError(f"normal_hosts entry {index} requires an api_key")
    return HostConfig(name=name, api_key=api_key)


def parse_conditional_host(payload: dict[str, Any], name: str) -> HostConfig | None:
    """Return an enabled tracker-owned host, or ``None`` when disabled."""

    raw = payload.get(name, {})
    if not isinstance(raw, dict):
        raise ImagePipelineError(f"{name} config must be an object")
    enabled = raw.get("enabled", False)
    if not isinstance(enabled, bool):
        raise ImagePipelineError(f"{name}.enabled must be true or false")
    raw_key = raw.get("api_key", "")
    if not isinstance(raw_key, str):
        raise ImagePipelineError(f"{name}.api_key must be a string")
    api_key = raw_key.strip()
    if enabled and not api_key:
        raise ImagePipelineError(f"{name}.api_key is required when enabled")
    return HostConfig(name=name, api_key=api_key) if enabled else None


def optional_path_setting(payload: dict[str, Any], key: str) -> str:
    """Return an optional executable path setting."""

    value = payload.get(key, "")
    if not isinstance(value, str):
        raise ImagePipelineError(f"{key} must be a string")
    return value.strip()


def load_settings(path: Path) -> Settings:
    """Load and validate image capture and host configuration."""

    payload = load_json(path, "config")
    if not isinstance(payload, dict):
        raise ImagePipelineError("image config must be a JSON object")
    raw_hosts = payload.get("normal_hosts")
    if not isinstance(raw_hosts, list) or not raw_hosts:
        raise ImagePipelineError("normal_hosts must be a non-empty JSON array")
    normal_hosts = tuple(parse_normal_host(item, index) for index, item in enumerate(raw_hosts, 1))
    if len({host.name for host in normal_hosts}) != len(normal_hosts):
        raise ImagePipelineError("normal_hosts must not contain duplicates")
    tone_map_hdr = payload.get("tone_map_hdr", True)
    if not isinstance(tone_map_hdr, bool):
        raise ImagePipelineError("tone_map_hdr must be true or false")
    return Settings(
        normal_hosts=normal_hosts,
        lostimg=parse_conditional_host(payload, "lostimg"),
        reelflix=parse_conditional_host(payload, "reelflix"),
        screenshots=integer_setting(payload, "screenshots", 4, 1, 20),
        process_limit=integer_setting(payload, "process_limit", 4, 1, 20),
        thumbnail_size=integer_setting(payload, "thumbnail_size", 350, 1, 1000),
        ffmpeg_compression=integer_setting(payload, "ffmpeg_compression", 6, 0, 9),
        tone_map_hdr=tone_map_hdr,
        request_timeout=number_setting(payload, "request_timeout", 60, 1, 300),
        upload_retries=integer_setting(payload, "upload_retries", 3, 0, 5),
        ffmpeg_path=optional_path_setting(payload, "ffmpeg_path"),
        ffprobe_path=optional_path_setting(payload, "ffprobe_path"),
    )


def load_groups(path: Path) -> list[dict[str, Any]]:
    """Load the grouped JSON produced by ``qui_match_torrents.py``."""

    payload = load_json(path, "qui results")
    if not isinstance(payload, list):
        raise ImagePipelineError("qui results must be a JSON array")
    groups: list[dict[str, Any]] = []
    for index, group in enumerate(payload, 1):
        if not isinstance(group, dict):
            raise ImagePipelineError(f"qui result {index} must be an object")
        if not isinstance(group.get("name"), str) or not group["name"].strip():
            raise ImagePipelineError(f"qui result {index} requires a name")
        if not isinstance(group.get("source_torrents"), list) or not group["source_torrents"]:
            raise ImagePipelineError(f"qui result {index} requires source_torrents")
        if not all(isinstance(source, dict) for source in group["source_torrents"]):
            raise ImagePipelineError(f"qui result {index} contains an invalid source torrent")
        if not isinstance(group.get("client_matches"), list):
            raise ImagePipelineError(f"qui result {index} requires client_matches")
        if not all(isinstance(match, dict) for match in group["client_matches"]):
            raise ImagePipelineError(f"qui result {index} contains an invalid client match")
        for source in group["source_torrents"]:
            required = ("site", "torrent_id", "name", "details_url")
            if any(
                not isinstance(source.get(key), str) or not source[key].strip()
                for key in required
            ):
                raise ImagePipelineError(
                    f"qui result {index} contains an incomplete source torrent"
                )
            if not isinstance(source.get("description_bbcode"), str):
                raise ImagePipelineError(
                    f"qui result {index} source torrent is missing description_bbcode; "
                    "rerun qui_match_torrents.py"
                )
        groups.append(group)
    return groups


def source_output(group: dict[str, Any], source: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Return a compact source torrent and its existing description BBCode."""

    required = ("site", "torrent_id", "name", "details_url")
    for key in required:
        if not isinstance(source.get(key), str) or not source[key].strip():
            raise ImagePipelineError(f"source torrent requires {key}")
    description = source.get("description_bbcode")
    if not isinstance(description, str):
        raise ImagePipelineError(
            "source torrent is missing description_bbcode; rerun qui_match_torrents.py"
        )
    result: dict[str, Any] = {
        "site": source["site"].strip(),
        "torrent_id": source["torrent_id"].strip(),
        "name": source["name"].strip(),
        "details_url": source["details_url"].strip(),
    }
    folder = source.get("folder")
    if isinstance(folder, str) and folder.strip():
        result["folder"] = folder.strip()
    file_names = source.get("file_names")
    if isinstance(file_names, list):
        result["file_names"] = [name for name in file_names if isinstance(name, str)]
    return result, description


def safe_public_url(value: Any, context: str) -> str:
    """Validate an HTTP URL before embedding it into JSON or BBCode."""

    if not isinstance(value, str) or not value.strip():
        raise ImagePipelineError(f"{context} returned an empty URL")
    candidate = value.strip()
    parsed = urlparse(candidate)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise ImagePipelineError(f"{context} returned an invalid public URL")
    return candidate


def collect_matching_sites(
    client_matches: list[dict[str, Any]],
    source_torrents: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Group source-detail and client-comment links by site hostname."""

    grouped: dict[str, list[str]] = {}
    seen: dict[str, set[str]] = {}

    def add_link(raw_link: Any, context: str) -> None:
        """Add one valid, unique HTTP link to its hostname group."""

        try:
            link = safe_public_url(raw_link, context)
        except ImagePipelineError:
            return
        hostname = (urlparse(link).hostname or "").casefold()
        if link in seen.setdefault(hostname, set()):
            return
        seen[hostname].add(link)
        grouped.setdefault(hostname, []).append(link)

    for source in source_torrents or []:
        add_link(source.get("details_url"), "source torrent")
    for match in client_matches:
        links = match.get("site_links", [])
        if not isinstance(links, list):
            continue
        for raw_link in links:
            add_link(raw_link, "client comment")
    return [{"site": hostname, "links": links} for hostname, links in grouped.items()]


def media_file_for_path(content_path: str) -> Path:
    """Resolve a client content path to one representative video file.

    A direct video file is used as-is. For folders, the largest supported video
    file is selected, which covers ordinary folders and Blu-ray ``STREAM`` trees.
    """

    path = Path(content_path)
    if path.is_file():
        if path.suffix.casefold() not in VIDEO_EXTENSIONS:
            raise ImagePipelineError(f"unsupported media file: {path}")
        return path
    if not path.is_dir():
        raise ImagePipelineError(f"content path does not exist: {path}")

    largest: tuple[int, Path] | None = None
    try:
        candidates = path.rglob("*")
        for candidate in candidates:
            if not candidate.is_file() or candidate.suffix.casefold() not in VIDEO_EXTENSIONS:
                continue
            try:
                size = candidate.stat().st_size
            except OSError:
                continue
            if largest is None or size > largest[0]:
                largest = (size, candidate)
    except OSError as error:
        raise ImagePipelineError(f"cannot scan content path {path}: {error}") from error
    if largest is None:
        raise ImagePipelineError(f"content path contains no supported video file: {path}")
    return largest[1]


def select_client_match(
    client_matches: list[dict[str, Any]],
) -> tuple[dict[str, Any], Path]:
    """Select the first client match with an accessible representative video."""

    for match in client_matches:
        content_path = match.get("content_path")
        if not isinstance(content_path, str) or not content_path.strip():
            continue
        try:
            return match, media_file_for_path(content_path.strip())
        except ImagePipelineError:
            continue
    raise ImagePipelineError("no client match has an accessible video file")


def resolve_program(configured: str, name: str) -> str:
    """Resolve a configured executable or find it on ``PATH``."""

    if configured:
        path = Path(configured)
        if not path.is_file():
            raise ImagePipelineError(f"configured {name} executable does not exist: {path}")
        return str(path)
    found = shutil.which(name)
    if not found:
        raise ImagePipelineError(f"{name} executable was not found")
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
        raise ImagePipelineError(f"ffprobe failed for {path}: {type(error).__name__}") from error
    if completed.returncode != 0:
        raise ImagePipelineError(f"ffprobe returned exit code {completed.returncode} for {path}")
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise ImagePipelineError(f"ffprobe returned invalid JSON for {path}") from error
    streams = payload.get("streams", []) if isinstance(payload, dict) else []
    stream = streams[0] if isinstance(streams, list) and streams and isinstance(streams[0], dict) else {}
    format_data = payload.get("format", {}) if isinstance(payload, dict) else {}
    raw_duration = format_data.get("duration") if isinstance(format_data, dict) else None
    if raw_duration is None and isinstance(stream, dict):
        raw_duration = stream.get("duration")
    try:
        duration = float(raw_duration)
    except (TypeError, ValueError) as error:
        raise ImagePipelineError(f"ffprobe returned no usable duration for {path}") from error
    if duration <= 0:
        raise ImagePipelineError(f"ffprobe returned no usable duration for {path}")
    color_transfer = stream.get("color_transfer", "") if isinstance(stream, dict) else ""
    return VideoInfo(
        duration=duration,
        color_transfer=color_transfer.casefold() if isinstance(color_transfer, str) else "",
    )


def screenshot_timestamps(name: str, duration: float, count: int) -> list[float]:
    """Return evenly distributed timestamps using upbrr's 5%/10%-to-90% window."""

    start_fraction = 0.10 if TV_RELEASE.search(name) else 0.05
    start = duration * start_fraction
    usable = max((duration * 0.90) - start, 0)
    interval = usable / count if count > 1 else usable
    return [start + (index * interval) for index in range(count)]


def ffmpeg_filter(info: VideoInfo, tone_map_hdr: bool) -> str:
    """Return the SDR or upbrr-style software HDR filter chain."""

    if tone_map_hdr and info.color_transfer in HDR_TRANSFERS:
        return (
            "zscale=transfer=linear,"
            "tonemap=tonemap=mobius:desat=10.00,"
            "zscale=transfer=bt709,format=rgb24"
        )
    return "format=rgb24"


def valid_png(path: Path) -> bool:
    """Return whether an ffmpeg output has a usable PNG header."""

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
    settings: Settings,
    output_dir: Path,
) -> list[Path]:
    """Capture ordered PNG frames concurrently with per-frame timestamp retries."""

    video_filter = ffmpeg_filter(info, settings.tone_map_hdr) + ",blackframe=amount=100:threshold=20"
    stop_capture = Event()

    def capture_one(index: int, requested: float) -> Path:
        """Capture one non-black frame, trying nearby timestamps in order."""

        output = output_dir / f"screen-{index:02d}.png"
        tried: set[float] = set()
        for offset in BLACK_FRAME_OFFSETS:
            if stop_capture.is_set():
                raise ImagePipelineError(f"screenshot capture {index} was cancelled")
            timestamp = min(max(requested + offset, 0), max(info.duration - 0.1, 0))
            timestamp = round(timestamp, 3)
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
                completed = subprocess.run(
                    command,
                    check=False,
                    capture_output=True,
                    timeout=180,
                )
            except (OSError, subprocess.TimeoutExpired):
                continue
            if stop_capture.is_set():
                raise ImagePipelineError(f"screenshot capture {index} was cancelled")
            if (
                completed.returncode == 0
                and valid_png(output)
                and not BLACK_FRAME.search(completed.stderr)
            ):
                return output
        raise ImagePipelineError(
            f"ffmpeg could not capture a valid screenshot {index} from {media_path}"
        )

    timestamps = screenshot_timestamps(release_name, info.duration, settings.screenshots)
    worker_count = min(settings.process_limit, len(timestamps))
    executor = ThreadPoolExecutor(max_workers=worker_count)
    futures = []
    try:
        futures = [
            executor.submit(capture_one, index, requested)
            for index, requested in enumerate(timestamps, 1)
        ]
        outputs = [future.result() for future in futures]
    except BaseException:
        stop_capture.set()
        for future in futures:
            future.cancel()
        executor.shutdown(wait=True, cancel_futures=True)
        raise
    else:
        executor.shutdown(wait=True)
        return outputs


def response_json(response: requests.Response, host: str, statuses: set[int]) -> dict[str, Any]:
    """Validate an image-host HTTP response without echoing credentials or bodies."""

    if response.status_code not in statuses:
        raise ImagePipelineError(f"{host} upload returned HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:
        raise ImagePipelineError(f"{host} upload returned invalid JSON") from error
    if not isinstance(payload, dict):
        raise ImagePipelineError(f"{host} upload returned an invalid JSON object")
    return payload


def retry_upload(operation: Callable[[], UploadResult], host: str, retries: int) -> UploadResult:
    """Retry one image upload with a short linear backoff."""

    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return operation()
        except (ImagePipelineError, requests.RequestException) as error:
            last_error = error
            if attempt < retries:
                time.sleep(1.1 * (attempt + 1))
    raise ImagePipelineError(f"{host} upload failed after {retries + 1} attempts") from last_error


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
            raise ImagePipelineError("imgbb upload failed")
        image_data = data.get("image", {})
        medium = data.get("medium", {})
        thumb = data.get("thumb", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        if not thumbnail and isinstance(thumb, dict):
            thumbnail = thumb.get("url")
        return UploadResult(
            safe_public_url(thumbnail, "imgbb thumbnail"),
            safe_public_url(image_data.get("url") if isinstance(image_data, dict) else "", "imgbb image"),
            safe_public_url(data.get("url_viewer"), "imgbb viewer"),
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
        thumbnail = safe_public_url(payload.get("th_url"), "pixhost thumbnail")
        raw = thumbnail.replace("https://t", "https://img").replace("/thumbs/", "/images/")
        return UploadResult(
            thumbnail,
            safe_public_url(raw, "pixhost image"),
            safe_public_url(payload.get("show_url"), "pixhost viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_onlyimage(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG using OnlyImage's current multipart API contract."""

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
            raise ImagePipelineError("onlyimage upload failed")
        image_data = payload.get("image")
        if not isinstance(image_data, dict):
            raise ImagePipelineError("onlyimage upload returned no image")
        nested_image = image_data.get("image", {})
        raw = image_data.get("url")
        if not raw and isinstance(nested_image, dict):
            raw = nested_image.get("url")
        raw_url = safe_public_url(raw, "onlyimage image")
        medium = image_data.get("medium", {})
        thumb = image_data.get("thumb", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        if not thumbnail and isinstance(thumb, dict):
            thumbnail = thumb.get("url")
        return UploadResult(
            safe_public_url(thumbnail or raw_url, "onlyimage thumbnail"),
            raw_url,
            safe_public_url(image_data.get("url_viewer") or raw_url, "onlyimage viewer"),
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
            raise ImagePipelineError("ptscreens upload returned no image")
        raw = safe_public_url(image_data.get("url"), "ptscreens image")
        medium = image_data.get("medium", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        return UploadResult(
            safe_public_url(thumbnail or raw, "ptscreens thumbnail"),
            raw,
            safe_public_url(image_data.get("url_viewer") or raw, "ptscreens viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_reelflix(
    session: requests.Session,
    host: HostConfig,
    image: Path,
    settings: Settings,
) -> UploadResult:
    """Upload one PNG to ReelFlix's tracker-owned image host."""

    def operation() -> UploadResult:
        with image.open("rb") as image_file:
            response = session.post(
                "https://img.reelflix.cc/api/1/upload",
                headers={"X-API-Key": host.api_key},
                files={"source": (image.name, image_file, "image/png")},
                timeout=settings.request_timeout,
            )
        payload = response_json(response, host.name, {200})
        status_code = payload.get("status_code", 0)
        if status_code not in {0, 200}:
            raise ImagePipelineError("reelflix upload failed")
        image_data = payload.get("image")
        if not isinstance(image_data, dict):
            raise ImagePipelineError("reelflix upload returned no image")
        raw = safe_public_url(image_data.get("url"), "reelflix image")
        medium = image_data.get("medium", {})
        thumbnail = medium.get("url") if isinstance(medium, dict) else ""
        return UploadResult(
            safe_public_url(thumbnail or raw, "reelflix thumbnail"),
            raw,
            safe_public_url(image_data.get("url_viewer") or raw, "reelflix viewer"),
        )

    return retry_upload(operation, host.name, settings.upload_retries)


def upload_lostimg(
    session: requests.Session,
    host: HostConfig,
    images: list[Path],
    settings: Settings,
) -> list[UploadResult]:
    """Upload one screenshot batch to Lostimg."""

    def operation() -> list[UploadResult]:
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
                headers={"Authorization": f"Bearer {host.api_key}"},
                files=files,
                timeout=settings.request_timeout,
            )
        payload = response_json(response, host.name, {200})
        if isinstance(payload.get("error"), str) and payload["error"].strip():
            raise ImagePipelineError("lostimg upload failed")
        urls = payload.get("urls")
        if not isinstance(urls, list):
            single = payload.get("url")
            urls = [single] if isinstance(single, str) and single else []
        if len(urls) != len(images):
            raise ImagePipelineError(
                f"lostimg returned {len(urls)} images for {len(images)} uploads"
            )
        return [
            UploadResult(url, url, url)
            for url in (safe_public_url(raw, "lostimg image") for raw in urls)
        ]

    last_error: Exception | None = None
    for attempt in range(settings.upload_retries + 1):
        try:
            return operation()
        except (ImagePipelineError, requests.RequestException) as error:
            last_error = error
            if attempt < settings.upload_retries:
                time.sleep(1.1 * (attempt + 1))
    raise ImagePipelineError(
        f"lostimg upload failed after {settings.upload_retries + 1} attempts"
    ) from last_error


def upload_batch(
    session: requests.Session,
    host: HostConfig,
    images: list[Path],
    settings: Settings,
) -> list[UploadResult]:
    """Upload all screenshots to one supported non-batch image host."""

    if host.name == "pixhost" and any(image.stat().st_size > 10_000_000 for image in images):
        raise ImagePipelineError("pixhost does not accept images larger than 10 MB")
    if host.name == "imgbb" and any(image.stat().st_size > 31_000_000 for image in images):
        raise ImagePipelineError("imgbb does not accept images larger than 31 MB")
    uploader: Callable[[requests.Session, HostConfig, Path, Settings], UploadResult]
    if host.name == "imgbb":
        uploader = upload_imgbb
    elif host.name == "onlyimage":
        uploader = upload_onlyimage
    elif host.name == "pixhost":
        uploader = upload_pixhost
    elif host.name == "ptscreens":
        uploader = upload_ptscreens
    elif host.name == "reelflix":
        uploader = upload_reelflix
    else:
        raise ImagePipelineError(f"unsupported image host: {host.name}")
    return [uploader(session, host, image, settings) for image in images]


def normal_host_order(hosts: tuple[HostConfig, ...], start_index: int) -> list[HostConfig]:
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
        except (ImagePipelineError, requests.RequestException) as error:
            errors.append(f"{host.name}: {error}")
            print(f"Warning: {host.name} failed; trying the next normal image host", file=sys.stderr)
    raise ImagePipelineError("all normal image hosts failed: " + "; ".join(errors))


def bbcode_for_uploads(uploads: list[UploadResult], thumbnail_size: int) -> str:
    """Build concatenated UNIT3D image BBCode in screenshot order."""

    return "".join(
        f"[url={upload.web_url}][img={thumbnail_size}]{upload.raw_url}[/img][/url]"
        for upload in uploads
    )


def upload_output(host: str, uploads: list[UploadResult], thumbnail_size: int) -> dict[str, Any]:
    """Build one JSON image-upload record."""

    return {
        "image_host": host,
        "bbcode": bbcode_for_uploads(uploads, thumbnail_size),
        "images": [upload.to_json() for upload in uploads],
    }


def attach_special_upload(
    matching_sites: list[dict[str, Any]],
    eligible_hosts: set[str],
    upload: dict[str, Any],
) -> None:
    """Attach one tracker-owned upload to each eligible matching-site record."""

    for site in matching_sites:
        if site.get("site") in eligible_hosts:
            site["image_upload"] = upload


def save_json(path: Path, payload: Any) -> None:
    """Atomically write indented UTF-8 JSON."""

    temporary = path.with_name(f".{path.name}.tmp")
    try:
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)
    except OSError as error:
        raise ImagePipelineError(f"Cannot write output {path}: {error}") from error


def source_identity(source: Any, context: str) -> tuple[str, str]:
    """Return a stable, case-insensitive site and torrent-ID identity."""

    if not isinstance(source, dict):
        raise ImagePipelineError(f"{context} source_torrent must be an object")
    site = source.get("site")
    torrent_id = source.get("torrent_id")
    if not isinstance(site, str) or not site.strip():
        raise ImagePipelineError(f"{context} source_torrent requires site")
    if not isinstance(torrent_id, str) or not torrent_id.strip():
        raise ImagePipelineError(f"{context} source_torrent requires torrent_id")
    return site.strip().casefold(), torrent_id.strip()


def load_existing_matching_results(
    path: Path,
) -> tuple[list[dict[str, Any]], set[tuple[str, str]]]:
    """Load resume results and return their unique source-torrent identities."""

    if not path.exists():
        return [], set()
    payload = load_json(path, "matching output")
    if not isinstance(payload, list):
        raise ImagePipelineError("matching output must be a JSON array")

    results: list[dict[str, Any]] = []
    identities: set[tuple[str, str]] = set()
    for index, result in enumerate(payload, 1):
        if not isinstance(result, dict):
            raise ImagePipelineError(f"matching output entry {index} must be an object")
        identity = source_identity(result.get("source_torrent"), f"matching output entry {index}")
        if identity in identities:
            raise ImagePipelineError(
                f"matching output contains duplicate source torrent {identity[0]} {identity[1]}"
            )
        identities.add(identity)
        results.append(result)
    return results, identities


def validate_distinct_paths(named_paths: list[tuple[str, Path]]) -> None:
    """Reject path aliases that could overwrite an input or another output."""

    resolved: list[tuple[str, Path, str]] = []
    for label, path in named_paths:
        try:
            canonical = path.resolve(strict=False)
        except (OSError, RuntimeError) as error:
            raise ImagePipelineError(f"Cannot resolve {label} path {path}: {error}") from error
        key = os.path.normcase(str(canonical))
        for previous_label, previous_path, previous_key in resolved:
            try:
                same_existing_file = (
                    canonical.exists()
                    and previous_path.exists()
                    and canonical.samefile(previous_path)
                )
            except OSError as error:
                raise ImagePipelineError(
                    f"Cannot compare {label} path {path} with {previous_label}: {error}"
                ) from error
            if key == previous_key or same_existing_file:
                raise ImagePipelineError(
                    f"{label} path must differ from {previous_label}: {path}"
                )
        resolved.append((label, canonical, key))


def unmatched_sources(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return source torrents belonging to groups with no qui client match."""

    results: list[dict[str, Any]] = []
    for group in groups:
        if group["client_matches"]:
            continue
        for source in group["source_torrents"]:
            source_torrent, existing_bbcode = source_output(group, source)
            results.append(
                {
                    "source_torrent": source_torrent,
                    "existing_bbcode": existing_bbcode,
                }
            )
    return results


def result_for_source(
    group: dict[str, Any],
    source: dict[str, Any],
    client_match: dict[str, Any],
    matching_sites: list[dict[str, Any]],
    replacement: dict[str, Any] | None,
    processing_error: str = "",
) -> dict[str, Any]:
    """Build one successful or failed matching result."""

    source_torrent, existing_bbcode = source_output(group, source)
    result: dict[str, Any] = {
        "source_torrent": source_torrent,
        "existing_bbcode": existing_bbcode,
        "client_match": {
            key: client_match[key]
            for key in ("hash", "name", "content_path")
            if isinstance(client_match.get(key), str)
        },
        "matching_sites": matching_sites,
    }
    if replacement is not None:
        result["replacement"] = replacement
    if processing_error:
        result["processing_error"] = processing_error
    return result


def process_matched_group(
    session: requests.Session,
    group: dict[str, Any],
    settings: Settings,
    ffmpeg: str,
    ffprobe: str,
    normal_host_index: int,
) -> tuple[list[dict[str, Any]], bool]:
    """Capture one matched release, then run its eligible upload lanes concurrently."""

    matching_sites = collect_matching_sites(
        group["client_matches"],
        group["source_torrents"],
    )
    client_match: dict[str, Any] = {}
    try:
        client_match, media_path = select_client_match(group["client_matches"])
        info = probe_video(ffprobe, media_path)
        with tempfile.TemporaryDirectory(prefix="unit3d-fix-ptpimg-") as directory:
            images = capture_screenshots(
                ffmpeg,
                media_path,
                group["name"],
                info,
                settings,
                Path(directory),
            )
            site_names = {site["site"] for site in matching_sites}
            lostimg_host = settings.lostimg if site_names & LST_HOSTS else None
            reelflix_host = settings.reelflix if site_names & REELFLIX_HOSTS else None
            worker_count = (
                1 + int(lostimg_host is not None) + int(reelflix_host is not None)
            )
            lane_headers = {
                header: session.headers[header]
                for header in ("Accept", "User-Agent")
                if header in session.headers
            }

            with ExitStack() as upload_sessions, ThreadPoolExecutor(
                max_workers=worker_count
            ) as executor:
                normal_future = executor.submit(
                    upload_normal_round_robin,
                    session,
                    settings,
                    images,
                    normal_host_index,
                )
                lostimg_future = None
                if lostimg_host is not None:
                    lostimg_session = upload_sessions.enter_context(requests.Session())
                    lostimg_session.headers.update(lane_headers)
                    lostimg_future = executor.submit(
                        upload_lostimg,
                        lostimg_session,
                        lostimg_host,
                        images,
                        settings,
                    )
                reelflix_future = None
                if reelflix_host is not None:
                    reelflix_session = upload_sessions.enter_context(requests.Session())
                    reelflix_session.headers.update(lane_headers)
                    reelflix_future = executor.submit(
                        upload_batch,
                        reelflix_session,
                        reelflix_host,
                        images,
                        settings,
                    )

                normal_error: Exception | None = None
                try:
                    normal_host, normal_uploads = normal_future.result()
                except (ImagePipelineError, requests.RequestException, OSError) as error:
                    normal_error = error

                special_failed = False
                if lostimg_future is not None:
                    try:
                        lostimg_uploads = lostimg_future.result()
                        attach_special_upload(
                            matching_sites,
                            LST_HOSTS,
                            upload_output("lostimg", lostimg_uploads, settings.thumbnail_size),
                        )
                    except (ImagePipelineError, requests.RequestException, OSError) as error:
                        special_failed = True
                        for site in matching_sites:
                            if site["site"] in LST_HOSTS:
                                site["image_upload_error"] = str(error)

                if reelflix_future is not None:
                    try:
                        reelflix_uploads = reelflix_future.result()
                        attach_special_upload(
                            matching_sites,
                            REELFLIX_HOSTS,
                            upload_output("reelflix", reelflix_uploads, settings.thumbnail_size),
                        )
                    except (ImagePipelineError, requests.RequestException, OSError) as error:
                        special_failed = True
                        for site in matching_sites:
                            if site["site"] in REELFLIX_HOSTS:
                                site["image_upload_error"] = str(error)

            if normal_error is not None:
                raise normal_error
            replacement = upload_output(
                normal_host,
                normal_uploads,
                settings.thumbnail_size,
            )

        return (
            [
                result_for_source(
                    group,
                    source,
                    client_match,
                    matching_sites,
                    replacement,
                )
                for source in group["source_torrents"]
            ],
            special_failed,
        )
    except (ImagePipelineError, requests.RequestException, OSError) as error:
        return (
            [
                result_for_source(
                    group,
                    source,
                    client_match,
                    matching_sites,
                    None,
                    str(error),
                )
                for source in group["source_torrents"]
            ],
            True,
        )


def parse_args() -> argparse.Namespace:
    """Parse qui input, image config, and the two output paths."""

    parser = argparse.ArgumentParser(
        description="Capture and upload replacement screenshots for qui-matched torrents."
    )
    parser.add_argument("input", type=Path, help="JSON output from qui_match_torrents.py")
    parser.add_argument("config", type=Path, help="JSON image-host and ffmpeg configuration")
    parser.add_argument(
        "--matching-output",
        type=Path,
        default=Path("matching_results.json"),
        help="Resume-capable matching JSON output path (default: matching_results.json)",
    )
    parser.add_argument(
        "--non-matching-output",
        type=Path,
        default=Path("non_matching_results.json"),
        help="Non-matching JSON output path (default: non_matching_results.json)",
    )
    return parser.parse_args()


def main() -> int:
    """Run capture/upload processing and return a process exit code."""

    args = parse_args()
    try:
        validate_distinct_paths(
            [
                ("input", args.input),
                ("config", args.config),
                ("matching output", args.matching_output),
                ("non-matching output", args.non_matching_output),
            ]
        )
        groups = load_groups(args.input)
        matching, processed = load_existing_matching_results(args.matching_output)
        nonmatching = unmatched_sources(groups)
        all_matched_groups = [group for group in groups if group["client_matches"]]
        all_input_identities = {
            source_identity(source, "qui input")
            for group in groups
            for source in group["source_torrents"]
        }
        matched_input_identities = {
            source_identity(source, "qui input")
            for group in all_matched_groups
            for source in group["source_torrents"]
        }
        remaining_groups = [
            (original_index, group)
            for original_index, group in enumerate(all_matched_groups)
            if any(
                source_identity(source, "qui input") not in processed
                for source in group["source_torrents"]
            )
        ]
        if remaining_groups:
            settings = load_settings(args.config)
            ffmpeg = resolve_program(settings.ffmpeg_path, "ffmpeg")
            ffprobe = resolve_program(settings.ffprobe_path, "ffprobe")
        save_json(args.non_matching_output, nonmatching)
        save_json(args.matching_output, matching)
    except ImagePipelineError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    skipped = len(processed & matched_input_identities)
    if skipped:
        print(f"Resume: preserving {skipped} previously processed source torrents")
    stale = len(processed - all_input_identities)
    if stale:
        print(
            f"Warning: preserving {stale} existing results not present in the current input",
            file=sys.stderr,
        )

    failed = False
    with requests.Session() as session:
        session.headers.update(
            {
                "Accept": "application/json",
                "User-Agent": "unit3d-fix-ptpimg-images/1.0",
            }
        )
        for progress, (original_index, group) in enumerate(remaining_groups, 1):
            print(f"[{progress}/{len(remaining_groups)}] {group['name']}")
            results, group_failed = process_matched_group(
                session,
                group,
                settings,
                ffmpeg,
                ffprobe,
                original_index,
            )
            new_results: list[dict[str, Any]] = []
            for result in results:
                identity = source_identity(result.get("source_torrent"), "processed result")
                if identity in processed:
                    continue
                processed.add(identity)
                new_results.append(result)
            matching.extend(new_results)
            failed = failed or group_failed
            try:
                save_json(args.matching_output, matching)
            except ImagePipelineError as error:
                print(f"Error: {error}", file=sys.stderr)
                return 2

    print(
        f"Saved {len(matching)} total matching results to {args.matching_output} and "
        f"{len(nonmatching)} non-matching results to {args.non_matching_output}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        raise SystemExit(130) from None
