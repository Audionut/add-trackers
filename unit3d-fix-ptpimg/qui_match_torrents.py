#!/usr/bin/env python3
r"""Match UNIT3D result names against torrents exposed through a qui proxy.

Create an ignored ``config.qui.json`` file:

{
  "qui_proxy_url": "http://localhost:7476/proxy/your-client-api-key"
}

Then run from PowerShell:

  python .\unit3d-fix-ptpimg\qui_match_torrents.py .\unit3d_ptpimg_results.json .\config.qui.json --output .\qui_torrent_matches.json

For each source name, folder, or single-file name, the script uses qui's filtered
torrent search. The output groups source torrents by release name, lists every
matching client torrent with its absolute content path and comment-derived site
links, and aggregates links belonging to sites other than the source sites.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import parse_qsl, urlparse

import requests


DEFAULT_PAGE_SIZE = 100
VIDEO_EXTENSIONS = (".avi", ".m2ts", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".ts", ".webm", ".wmv")
RELEASE_SEPARATORS = re.compile(r"[._\-\[\](){}\s]+")
COMMENT_URL = re.compile(r"https?://[^\s<>\"'\[\]]+", re.IGNORECASE)
SENSITIVE_QUERY_KEYS = {"api_token", "apikey", "authkey", "passkey", "rsskey", "torrent_pass"}


class QuiError(RuntimeError):
    """Raised for invalid inputs, qui failures, or unusable API responses."""


def required_string(item: dict[str, Any], key: str, context: str) -> str:
    """Return a trimmed, non-empty string value.

    Raises:
        QuiError: If the value is absent, empty, or not a string.
    """

    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise QuiError(f"{context} requires a non-empty {key}")
    return value.strip()


def load_source_groups(path: Path) -> list[dict[str, Any]]:
    """Load and group UNIT3D results by release name.

    Raises:
        QuiError: If the input is unreadable or does not match the expected JSON shape.
    """

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise QuiError(f"Cannot read input {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise QuiError(f"Invalid JSON in {path}: {error}") from error

    if not isinstance(payload, list):
        raise QuiError("Input must be a JSON array of UNIT3D results")

    groups: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            raise QuiError(f"Input entry {index} must be an object")

        context = f"Input entry {index}"
        name = required_string(item, "name", context)
        source = {
            "site": required_string(item, "site", context),
            "torrent_id": required_string(item, "torrent_id", context),
            "name": name,
            "details_url": required_string(item, "details_url", context),
        }
        description_bbcode = item.get("description_bbcode")
        if isinstance(description_bbcode, str):
            source["description_bbcode"] = description_bbcode
        folder = item.get("folder")
        if isinstance(folder, str) and folder.strip():
            source["folder"] = folder.strip()
        file_names = item.get("file_names")
        if isinstance(file_names, list):
            valid_file_names = [
                file_name.strip()
                for file_name in file_names
                if isinstance(file_name, str) and file_name.strip()
            ]
            source["file_names"] = valid_file_names if len(valid_file_names) == 1 else []
        key = release_name_key(name)
        group = groups.setdefault(key, {"name": name, "source_torrents": []})
        if source not in group["source_torrents"]:
            group["source_torrents"].append(source)

    return list(groups.values())


def load_qui_proxy_url(path: Path) -> str:
    """Load and validate the qui client-proxy URL from JSON configuration.

    Raises:
        QuiError: If the configuration is unreadable or the URL is unsafe or invalid.
    """

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise QuiError(f"Cannot read config {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise QuiError(f"Invalid JSON in {path}: {error}") from error

    if not isinstance(payload, dict):
        raise QuiError("qui config must be a JSON object")

    proxy_url = required_string(payload, "qui_proxy_url", "qui config").rstrip("/")
    parsed = urlparse(proxy_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise QuiError("qui_proxy_url must be an absolute HTTP or HTTPS URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise QuiError("qui_proxy_url must not contain credentials, a query, or a fragment")
    return proxy_url


def request_json(
    session: requests.Session,
    url: str,
    params: dict[str, str],
    timeout: float,
    operation: str,
) -> Any:
    """Return one JSON response without exposing the proxy key in errors.

    Raises:
        QuiError: If the request fails, returns a non-200 status, or contains invalid JSON.
    """

    try:
        response = session.get(url, params=params, timeout=timeout)
    except requests.RequestException as error:
        raise QuiError(f"{operation} failed: {type(error).__name__}") from error

    if response.status_code != 200:
        raise QuiError(f"{operation} returned HTTP {response.status_code}")

    try:
        return response.json()
    except ValueError as error:
        raise QuiError(f"{operation} returned invalid JSON") from error


def search_torrents(
    session: requests.Session,
    proxy_url: str,
    search_term: str,
    timeout: float = 30,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Return every qui torrent matching one search term.

    qui's object response and Upload Assistant's list-response fallback are both
    accepted. Pages are deduplicated by hash.

    Raises:
        QuiError: If qui returns an invalid response or repeats a page.
    """

    if page_size <= 0:
        raise QuiError("search page size must be greater than zero")

    endpoint = f"{proxy_url}/api/v2/torrents/search"
    offset = 0
    torrents: list[dict[str, Any]] = []
    seen_hashes: set[str] = set()

    while True:
        payload = request_json(
            session,
            endpoint,
            {
                "search": search_term,
                "sort": "added_on",
                "reverse": "true",
                "limit": str(page_size),
                "offset": str(offset),
                "filter": "unregistered,tracker_down",
            },
            timeout,
            f"torrent search for {search_term!r}",
        )

        has_more: bool | None = None
        total: int | None = None
        if isinstance(payload, dict):
            if "torrents" not in payload:
                raise QuiError("torrent search response is missing a torrents field")
            records = payload["torrents"]
            if records is None:
                records = []
            elif not isinstance(records, list):
                raise QuiError("torrent search torrents field must be an array or null")
            raw_has_more = payload.get("hasMore")
            has_more = raw_has_more if isinstance(raw_has_more, bool) else None
            raw_total = payload.get("total")
            total = raw_total if isinstance(raw_total, int) and raw_total >= 0 else None
        elif isinstance(payload, list):
            records = payload
        else:
            raise QuiError("torrent search response must be an object or array")

        new_records = 0
        for item in records:
            if not isinstance(item, dict):
                raise QuiError("torrent search contains a non-object record")
            torrent_hash = required_string(item, "hash", "torrent record").casefold()
            required_string(item, "name", f"torrent {torrent_hash}")
            if torrent_hash in seen_hashes:
                continue
            seen_hashes.add(torrent_hash)
            torrents.append(item)
            new_records += 1

        next_offset = offset + len(records)
        if has_more is False or (total is not None and next_offset >= total):
            return torrents
        if has_more is None and total is None and len(records) < page_size:
            return torrents
        if not records:
            if has_more:
                raise QuiError("torrent search returned an empty page before completion")
            return torrents
        if new_records == 0:
            raise QuiError("torrent search repeated a page")
        offset = next_offset


def fetch_comment(
    session: requests.Session,
    proxy_url: str,
    torrent_hash: str,
    timeout: float = 30,
) -> str:
    """Fetch a torrent comment by hash through qui.

    Raises:
        QuiError: If the properties response is unavailable or invalid.
    """

    payload = request_json(
        session,
        f"{proxy_url}/api/v2/torrents/properties",
        {"hash": torrent_hash},
        timeout,
        f"properties request for {torrent_hash}",
    )
    if not isinstance(payload, dict):
        raise QuiError(f"properties response for {torrent_hash} must be a JSON object")
    comment = payload.get("comment", "")
    return comment if isinstance(comment, str) else ""


def release_name_key(name: str) -> str:
    """Normalize a release name across case, separators, and video extensions."""

    normalized = name.strip()
    lowered = normalized.casefold()
    for extension in VIDEO_EXTENSIONS:
        if lowered.endswith(extension):
            normalized = normalized[: -len(extension)]
            break
    return RELEASE_SEPARATORS.sub(" ", normalized).strip().casefold()


def leaf_name(path: str) -> str:
    """Return the final component of a UNIT3D file path in either path style."""

    return path.replace("\\", "/").rsplit("/", 1)[-1]


def source_name_candidates(group: dict[str, Any]) -> list[str]:
    """Return release, folder, and single-file names that can identify a group."""

    candidates = [required_string(group, "name", "source group")]
    source_torrents = group.get("source_torrents", [])
    if not isinstance(source_torrents, list):
        return candidates

    for source in source_torrents:
        if not isinstance(source, dict):
            continue
        folder = source.get("folder")
        if isinstance(folder, str) and folder.strip():
            candidates.append(leaf_name(folder.strip()))
        file_names = source.get("file_names")
        if isinstance(file_names, list) and len(file_names) == 1:
            file_name = file_names[0]
            if isinstance(file_name, str) and file_name.strip():
                candidates.append(leaf_name(file_name.strip()))

    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = release_name_key(candidate)
        if key and key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def search_source_group(
    session: requests.Session,
    proxy_url: str,
    group: dict[str, Any],
    timeout: float = 30,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Search qui for every identifying name in one UNIT3D source group."""

    torrents: list[dict[str, Any]] = []
    seen_hashes: set[str] = set()
    for candidate in source_name_candidates(group):
        search_term = candidate.replace("[", ".").replace("]", ".")
        for torrent in search_torrents(session, proxy_url, search_term, timeout, page_size):
            torrent_hash = required_string(torrent, "hash", "torrent record").casefold()
            if torrent_hash not in seen_hashes:
                seen_hashes.add(torrent_hash)
                torrents.append(torrent)
    return torrents


def is_windows_path(path: str) -> bool:
    """Return whether a path uses a Windows drive or UNC form."""

    return re.match(r"^[a-z]:[\\/]", path, re.IGNORECASE) is not None or path.startswith("\\\\")


def normalize_content_path(path: str) -> str:
    """Normalize separators without changing a path's operating-system style."""

    return str(PureWindowsPath(path)) if is_windows_path(path) else str(PurePosixPath(path))


def content_path_for(torrent: dict[str, Any]) -> str:
    """Return the absolute content path supplied by qBittorrent, with a fallback."""

    content_path = torrent.get("content_path")
    if isinstance(content_path, str) and content_path.strip():
        return normalize_content_path(content_path.strip())

    save_path = required_string(torrent, "save_path", "torrent record")
    name = required_string(torrent, "name", "torrent record")
    if is_windows_path(save_path):
        return str(PureWindowsPath(save_path) / name)
    return str(PurePosixPath(save_path) / name)


def content_path_key(path: str) -> str:
    """Return a comparison key that respects Windows path case insensitivity."""

    normalized = normalize_content_path(path)
    return normalized.casefold() if is_windows_path(normalized) else normalized


def match_source_groups(
    source_groups: list[dict[str, Any]],
    torrents: list[dict[str, Any]],
) -> list[tuple[dict[str, Any], list[dict[str, str]]]]:
    """Match names, then include other torrents sharing each matched content path."""

    prepared: list[dict[str, str]] = []
    for torrent in torrents:
        torrent_hash = required_string(torrent, "hash", "torrent record").casefold()
        name = required_string(torrent, "name", f"torrent {torrent_hash}")
        path = content_path_for(torrent)
        comment = torrent.get("comment", "")
        prepared.append(
            {
                "hash": torrent_hash,
                "name": name,
                "name_key": release_name_key(name),
                "content_path": path,
                "path_key": content_path_key(path),
                "comment": comment if isinstance(comment, str) else "",
            }
        )

    matches_by_group: list[tuple[dict[str, Any], list[dict[str, str]]]] = []
    for group in source_groups:
        name_keys = {release_name_key(name) for name in source_name_candidates(group)}
        direct_hashes = {
            torrent["hash"] for torrent in prepared if torrent["name_key"] in name_keys
        }
        direct_paths = {
            torrent["path_key"]
            for torrent in prepared
            if torrent["hash"] in direct_hashes and torrent["path_key"]
        }
        matches = [
            torrent
            for torrent in prepared
            if torrent["hash"] in direct_hashes or (torrent["path_key"] and torrent["path_key"] in direct_paths)
        ]
        matches.sort(key=lambda torrent: (torrent["name"].casefold(), torrent["hash"]))
        matches_by_group.append((group, matches))

    return matches_by_group


def extract_comment_links(comment: str) -> list[str]:
    """Extract non-announce HTTP links while excluding credential-bearing URLs."""

    links: list[str] = []
    seen: set[str] = set()
    for match in COMMENT_URL.finditer(html.unescape(comment)):
        candidate = match.group(0).rstrip(".,);]}>")
        parsed = urlparse(candidate)
        query_keys = {key.casefold() for key, _ in parse_qsl(parsed.query, keep_blank_values=True)}
        if (
            not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or "announce" in parsed.path.casefold()
            or query_keys & SENSITIVE_QUERY_KEYS
        ):
            continue
        if candidate not in seen:
            seen.add(candidate)
            links.append(candidate)
    return links


def format_results(
    matches_by_group: list[tuple[dict[str, Any], list[dict[str, str]]]],
    comments: dict[str, str],
) -> list[dict[str, Any]]:
    """Build JSON-ready results with per-torrent and aggregate site links."""

    results: list[dict[str, Any]] = []
    for group, matches in matches_by_group:
        source_torrents = group.get("source_torrents", [])
        source_hosts = {
            urlparse(source["details_url"]).hostname.casefold()
            for source in source_torrents
            if isinstance(source, dict)
            and isinstance(source.get("details_url"), str)
            and urlparse(source["details_url"]).hostname
        }
        client_matches: list[dict[str, Any]] = []
        other_site_links: list[str] = []
        seen_other_links: set[str] = set()

        for torrent in matches:
            site_links = extract_comment_links(comments.get(torrent["hash"], torrent["comment"]))
            client_matches.append(
                {
                    "hash": torrent["hash"],
                    "name": torrent["name"],
                    "content_path": torrent["content_path"],
                    "site_links": site_links,
                }
            )
            for link in site_links:
                hostname = urlparse(link).hostname
                if hostname and hostname.casefold() not in source_hosts and link not in seen_other_links:
                    seen_other_links.add(link)
                    other_site_links.append(link)

        results.append(
            {
                "name": group["name"],
                "source_torrents": source_torrents,
                "client_matches": client_matches,
                "other_site_links": other_site_links,
            }
        )

    return results


def save_results(path: Path, results: list[dict[str, Any]]) -> None:
    """Write results as indented UTF-8 JSON.

    Raises:
        QuiError: If the output file cannot be written.
    """

    try:
        path.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as error:
        raise QuiError(f"Cannot write results to {path}: {error}") from error


def parse_args() -> argparse.Namespace:
    """Parse input, qui configuration, and JSON output arguments."""

    parser = argparse.ArgumentParser(
        description="Match UNIT3D result names to torrents exposed through qui."
    )
    parser.add_argument("input", type=Path, help="JSON output from unit3d_ptpimg_torrents.py")
    parser.add_argument("config", type=Path, help="JSON config containing qui_proxy_url")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("qui_torrent_matches.json"),
        help="JSON output path (default: qui_torrent_matches.json)",
    )
    return parser.parse_args()


def main() -> int:
    """Query qui, enrich matching torrents, save JSON, and return an exit code."""

    args = parse_args()
    try:
        source_groups = load_source_groups(args.input)
        proxy_url = load_qui_proxy_url(args.config)
        with requests.Session() as session:
            session.headers.update(
                {
                    "Accept": "application/json",
                    "User-Agent": "qui-match-torrents/1.0",
                }
            )
            matches_by_group: list[tuple[dict[str, Any], list[dict[str, str]]]] = []
            for group in source_groups:
                candidates = search_source_group(session, proxy_url, group)
                matches_by_group.extend(match_source_groups([group], candidates))

            matched_torrents = {
                torrent["hash"]: torrent
                for _, matches in matches_by_group
                for torrent in matches
            }
            comments: dict[str, str] = {}
            for torrent_hash, torrent in matched_torrents.items():
                if torrent["comment"]:
                    comments[torrent_hash] = torrent["comment"]
                    continue
                try:
                    comments[torrent_hash] = fetch_comment(session, proxy_url, torrent_hash)
                except QuiError as error:
                    print(f"Warning: {error}", file=sys.stderr)
                    comments[torrent_hash] = ""

        results = format_results(matches_by_group, comments)
        save_results(args.output, results)
    except QuiError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    match_count = sum(len(result["client_matches"]) for result in results)
    print(f"Saved {match_count} client matches across {len(results)} names to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
