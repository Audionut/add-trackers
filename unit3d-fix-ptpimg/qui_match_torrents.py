#!/usr/bin/env python3
"""Match grouped UNIT3D PTPImg results to local media through a qui proxy."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import urlparse

import requests


DEFAULT_PAGE_SIZE = 100
DEFAULT_OUTPUT = Path("qui_torrent_matches.json")
MATCH_SCHEMA_VERSION = 3
VIDEO_EXTENSIONS = (
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
)
RELEASE_SEPARATORS = re.compile(r"[._\-\[\](){}\s]+")
RELEASE_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)
YEAR_TOKEN = re.compile(r"^(?:19|20)\d{2}$")
EPISODE_TOKEN = re.compile(r"^s\d{1,3}(?:e\d{1,3})?$")
COMMENT_URL = re.compile(r"https?://[^\s<>\"'\[\]]+", re.IGNORECASE)
TITLE_STOP_WORDS = {"a", "an", "and", "for", "in", "of", "on", "the", "to"}
TECHNICAL_TOKENS = {
    "2160p",
    "1080i",
    "1080p",
    "720p",
    "576i",
    "576p",
    "480i",
    "480p",
    "bd25",
    "bd50",
    "bd66",
    "bd100",
    "bdrip",
    "bluray",
    "dvd5",
    "dvd9",
    "dvdrip",
    "hdtv",
    "ntsc",
    "pal",
    "remux",
    "uhd",
    "untouched",
    "webdl",
    "webrip",
}
TECHNICAL_CONFLICT_FAMILIES = (
    {"2160p", "1080i", "1080p", "720p", "576i", "576p", "480i", "480p"},
    {"ntsc", "pal"},
    {"dvd5", "dvd9", "bd25", "bd50", "bd66", "bd100"},
    {"bluray", "bdrip", "dvd5", "dvd9", "dvdrip", "hdtv", "webdl", "webrip"},
)
DISC_IMAGE_TOKENS = {"bd25", "bd50", "bd66", "bd100", "dvd5", "dvd9", "untouched"}
FUZZY_SOURCE_THRESHOLD = 0.56


class QuiError(RuntimeError):
    """Raised for invalid inputs, qui failures, or unusable API responses."""


def required_string(item: dict[str, Any], key: str, context: str) -> str:
    """Return one trimmed non-empty string."""

    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise QuiError(f"{context} requires a non-empty {key}")
    return value.strip()


def load_json(path: Path, label: str) -> Any:
    """Read one UTF-8 JSON file."""

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise QuiError(f"Cannot read {label} {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise QuiError(f"Invalid JSON in {label} {path}: {error}") from error


def save_results(path: Path, results: list[dict[str, Any]]) -> None:
    """Atomically write indented UTF-8 matching results."""

    temporary = path.with_name(f".{path.name}.tmp")
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(
            json.dumps(results, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
    except OSError as error:
        raise QuiError(f"Cannot write results to {path}: {error}") from error


def validate_distinct_paths(named_paths: list[tuple[str, Path]]) -> None:
    """Reject path aliases that could overwrite an input or config file."""

    resolved: list[tuple[str, Path, str]] = []
    for label, path in named_paths:
        try:
            canonical = path.resolve(strict=False)
        except (OSError, RuntimeError) as error:
            raise QuiError(f"Cannot resolve {label} path {path}: {error}") from error
        key = os.path.normcase(str(canonical))
        for previous_label, previous_path, previous_key in resolved:
            try:
                same_file = (
                    canonical.exists()
                    and previous_path.exists()
                    and canonical.samefile(previous_path)
                )
            except OSError as error:
                raise QuiError(
                    f"Cannot compare {label} path {path} with {previous_label}: {error}"
                ) from error
            if key == previous_key or same_file:
                raise QuiError(
                    f"{label} path must differ from {previous_label}: {path}"
                )
        resolved.append((label, canonical, key))


def release_name_key(name: str) -> str:
    """Normalize a release across separators, case, and common video extensions."""

    normalized = name.strip()
    lowered = normalized.casefold()
    for extension in VIDEO_EXTENSIONS:
        if lowered.endswith(extension):
            normalized = normalized[: -len(extension)]
            break
    return RELEASE_SEPARATORS.sub(" ", normalized).strip().casefold()


def load_source_groups(path: Path) -> list[dict[str, Any]]:
    """Load and group UNIT3D collector results by normalized release name."""

    payload = load_json(path, "UNIT3D collector output")
    if not isinstance(payload, list):
        raise QuiError("Input must be a JSON array of UNIT3D results")

    groups: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            raise QuiError(f"Input entry {index} must be an object")
        context = f"Input entry {index}"
        name = required_string(item, "name", context)
        source: dict[str, Any] = {
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
            source["file_names"] = (
                valid_file_names if len(valid_file_names) == 1 else []
            )
        key = release_name_key(name)
        group = groups.setdefault(key, {"name": name, "source_torrents": []})
        if source not in group["source_torrents"]:
            group["source_torrents"].append(source)
    return list(groups.values())


def group_key(group: dict[str, Any], context: str = "source group") -> str:
    """Return the normalized identity used for grouping and resume checkpoints."""

    return release_name_key(required_string(group, "name", context))


def load_checkpoint(path: Path) -> dict[str, dict[str, Any]]:
    """Load prior qui results keyed by normalized source-group name."""

    if not path.exists():
        return {}
    payload = load_json(path, "qui output")
    if not isinstance(payload, list):
        raise QuiError("qui output must be a JSON array")
    results: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            raise QuiError(f"qui output entry {index} must be an object")
        context = f"qui output entry {index}"
        key = group_key(item, context)
        if key in results:
            raise QuiError(
                f"qui output contains duplicate source group {item['name']!r}"
            )
        sources = item.get("source_torrents")
        if (
            not isinstance(sources, list)
            or not sources
            or not all(isinstance(source, dict) for source in sources)
        ):
            raise QuiError(f"{context} requires a source_torrents array")
        matches = item.get("client_matches")
        if not isinstance(matches, list) or not all(
            isinstance(match, dict) for match in matches
        ):
            raise QuiError(f"{context} requires a client_matches array")
        for match in matches:
            required_string(match, "hash", f"{context} client match")
            required_string(match, "name", f"{context} client match")
            required_string(match, "content_path", f"{context} client match")
        results[key] = item
    return results


def result_complete_for_group(group: dict[str, Any], result: dict[str, Any]) -> bool:
    """Return whether a saved result belongs to the exact current source group."""

    return (
        result.get("match_schema_version") == MATCH_SCHEMA_VERSION
        and result.get("name") == group["name"]
        and result.get("source_torrents") == group["source_torrents"]
        and "search_error" not in result
    )


def load_qui_settings(path: Path) -> tuple[str, float]:
    """Load and validate the qui proxy URL and request timeout."""

    payload = load_json(path, "config")
    if not isinstance(payload, dict):
        raise QuiError("config must be a JSON object")
    proxy_url = required_string(payload, "qui_proxy_url", "config").rstrip("/")
    parsed = urlparse(proxy_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise QuiError("qui_proxy_url must be an absolute HTTP or HTTPS URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise QuiError(
            "qui_proxy_url must not contain credentials, a query, or a fragment"
        )
    raw_timeout = payload.get("request_timeout", 60)
    if isinstance(raw_timeout, bool) or not isinstance(raw_timeout, (int, float)):
        raise QuiError("request_timeout must be a number")
    timeout = float(raw_timeout)
    if not 1 <= timeout <= 300:
        raise QuiError("request_timeout must be from 1 to 300")
    return proxy_url, timeout


def request_json(
    session: requests.Session,
    url: str,
    params: dict[str, str],
    timeout: float,
    operation: str,
) -> Any:
    """Return one qui JSON response without exposing its proxy key in errors."""

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
    """Return every paginated qui result for one filtered search term."""

    if page_size <= 0:
        raise QuiError("Search page size must be greater than zero")
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
            f"qui search for {search_term!r}",
        )

        has_more: bool | None = None
        total: int | None = None
        if isinstance(payload, dict):
            if "torrents" not in payload:
                raise QuiError("qui search response is missing a torrents field")
            records = payload["torrents"]
            if records is None:
                records = []
            if not isinstance(records, list):
                raise QuiError("qui search torrents field must be an array or null")
            raw_has_more = payload.get("hasMore")
            has_more = raw_has_more if isinstance(raw_has_more, bool) else None
            raw_total = payload.get("total")
            total = raw_total if isinstance(raw_total, int) and raw_total >= 0 else None
        elif isinstance(payload, list):
            records = payload
        else:
            raise QuiError("qui search response must be an object or array")

        new_records = 0
        for item in records:
            if not isinstance(item, dict):
                raise QuiError("qui search contains a non-object torrent")
            torrent_hash = required_string(item, "hash", "qui torrent").casefold()
            required_string(item, "name", f"qui torrent {torrent_hash}")
            if torrent_hash not in seen_hashes:
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
                raise QuiError("qui search returned an empty page before completion")
            return torrents
        if new_records == 0:
            raise QuiError("qui search repeated a page")
        offset = next_offset


def canonical_name(name: str) -> str:
    """Return only Unicode letters and digits from a normalized release name."""

    return "".join(
        character for character in release_name_key(name) if character.isalnum()
    )


def release_tokens(name: str) -> list[str]:
    """Return normalized release tokens with common compound formats joined."""

    value = release_name_key(name)
    value = re.sub(r"\bblu\s+ray\b", "bluray", value)
    value = re.sub(r"\bweb\s+dl\b", "webdl", value)
    return RELEASE_TOKEN.findall(value)


def leaf_name(path: str) -> str:
    """Return the last component from either Windows or POSIX path syntax."""

    return path.replace("\\", "/").rsplit("/", 1)[-1]


def source_torrents(group: dict[str, Any]) -> list[dict[str, Any]]:
    """Return valid source records from one already-loaded group."""

    values = group.get("source_torrents")
    if not isinstance(values, list):
        return []
    return [source for source in values if isinstance(source, dict)]


def source_file_names(group: dict[str, Any]) -> list[str]:
    """Return every distinct retained UNIT3D filename in one source group."""

    names: list[str] = []
    seen: set[str] = set()
    for source in source_torrents(group):
        values = source.get("file_names")
        if not isinstance(values, list):
            continue
        for value in values:
            if (
                isinstance(value, str)
                and value.strip()
                and value.casefold() not in seen
            ):
                seen.add(value.casefold())
                names.append(value.strip())
    return names


def source_release_names(group: dict[str, Any]) -> list[str]:
    """Return the distinct site release names represented by one group."""

    names = [required_string(group, "name", "source group")]
    names.extend(
        source["name"]
        for source in source_torrents(group)
        if isinstance(source.get("name"), str) and source["name"].strip()
    )
    unique: list[str] = []
    seen: set[str] = set()
    for name in names:
        key = canonical_name(name)
        if key and key not in seen:
            seen.add(key)
            unique.append(name)
    return unique


def source_name_candidates(group: dict[str, Any]) -> list[str]:
    """Return release, folder, and single-file names suitable for qui searching."""

    candidates = source_release_names(group)
    for source in source_torrents(group):
        folder = source.get("folder")
        if isinstance(folder, str) and folder.strip():
            candidates.append(leaf_name(folder.strip()))
    candidates.extend(leaf_name(name) for name in source_file_names(group))

    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = canonical_name(candidate)
        if key and key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def filtered_release_term(name: str) -> str:
    """Reduce a release name to its title plus year or season identity."""

    tokens = release_tokens(name)
    if not tokens:
        return ""
    boundary = next(
        (
            index
            for index, token in enumerate(tokens)
            if YEAR_TOKEN.fullmatch(token) or EPISODE_TOKEN.fullmatch(token)
        ),
        None,
    )
    if boundary is not None:
        return " ".join(tokens[: boundary + 1])
    technical = next(
        (index for index, token in enumerate(tokens) if token in TECHNICAL_TOKENS),
        len(tokens),
    )
    return " ".join(tokens[:technical] or tokens)


def sanitize_search_term(value: str) -> str:
    """Apply Upload Assistant's bracket and Unicode-symbol search filtering."""

    bracketed = value.replace("[", ".").replace("]", ".")
    return "".join(
        character
        for character in bracketed
        if not unicodedata.category(character).startswith("S")
    ).strip()


def source_search_terms(group: dict[str, Any]) -> list[str]:
    """Build distinct full and title-identity terms for qui's fuzzy search."""

    terms: list[str] = []
    seen: set[str] = set()
    for candidate in source_name_candidates(group):
        for value in (
            sanitize_search_term(candidate),
            filtered_release_term(candidate),
        ):
            key = release_name_key(value)
            if key and key not in seen:
                seen.add(key)
                terms.append(value)
    return terms


def is_windows_path(path: str) -> bool:
    """Return whether a path uses a Windows drive or UNC form."""

    return re.match(
        r"^[a-z]:[\\/]", path, re.IGNORECASE
    ) is not None or path.startswith("\\\\")


def normalize_content_path(path: str) -> str:
    """Normalize separators without changing the operating-system path style."""

    return (
        str(PureWindowsPath(path))
        if is_windows_path(path)
        else str(PurePosixPath(path))
    )


def content_path_for(torrent: dict[str, Any]) -> str:
    """Return qBittorrent's absolute content path, with a save-path fallback."""

    content_path = torrent.get("content_path")
    if isinstance(content_path, str) and content_path.strip():
        return normalize_content_path(content_path.strip())
    save_path = required_string(torrent, "save_path", "qui torrent")
    name = required_string(torrent, "name", "qui torrent")
    if is_windows_path(save_path):
        return str(PureWindowsPath(save_path) / name)
    return str(PurePosixPath(save_path) / name)


def content_path_key(path: str) -> str:
    """Return a path key respecting Windows case-insensitive semantics."""

    normalized = normalize_content_path(path)
    return normalized.casefold() if is_windows_path(normalized) else normalized


def tracker_urls_from(torrent: dict[str, Any]) -> list[str]:
    """Extract primary and hydrated tracker URLs from a qui torrent record."""

    values: list[str] = []
    primary = torrent.get("tracker")
    if isinstance(primary, str) and primary.strip():
        values.append(primary.strip())
    trackers = torrent.get("trackers")
    if isinstance(trackers, list):
        for tracker in trackers:
            if isinstance(tracker, str):
                value = tracker
            elif isinstance(tracker, dict):
                raw = tracker.get("url", tracker.get("announce"))
                value = raw if isinstance(raw, str) else ""
            else:
                value = ""
            if value.strip():
                values.append(value.strip())
    return list(dict.fromkeys(values))


def tracker_hosts(urls: list[str]) -> list[str]:
    """Return safe tracker hostnames without persisting announce credentials."""

    hosts: list[str] = []
    seen: set[str] = set()
    for value in urls:
        hostname = urlparse(value).hostname
        if not hostname:
            continue
        host = hostname.casefold().removeprefix("www.")
        if host not in seen:
            seen.add(host)
            hosts.append(host)
    return hosts


def source_hosts(group: dict[str, Any]) -> set[str]:
    """Return normalized details-site hosts represented by a source group."""

    hosts: set[str] = set()
    for source in source_torrents(group):
        details_url = source.get("details_url")
        hostname = (
            urlparse(details_url).hostname if isinstance(details_url, str) else None
        )
        if hostname:
            hosts.add(hostname.casefold().removeprefix("www."))
    return hosts


def has_source_tracker(group: dict[str, Any], urls: list[str]) -> bool:
    """Return whether tracker metadata identifies any source site in a group."""

    details_hosts = source_hosts(group)
    return any(
        tracker == source or tracker.endswith(f".{source}")
        for tracker in tracker_hosts(urls)
        for source in details_hosts
    )


def fetch_comment(
    session: requests.Session,
    proxy_url: str,
    torrent_hash: str,
    timeout: float,
) -> str:
    """Fetch a torrent's comment through qui."""

    payload = request_json(
        session,
        f"{proxy_url}/api/v2/torrents/properties",
        {"hash": torrent_hash},
        timeout,
        f"qui properties for {torrent_hash}",
    )
    if not isinstance(payload, dict):
        raise QuiError(f"qui properties for {torrent_hash} must be a JSON object")
    comment = payload.get("comment", "")
    return comment if isinstance(comment, str) else ""


def fetch_file_names(
    session: requests.Session,
    proxy_url: str,
    torrent_hash: str,
    timeout: float,
) -> list[str]:
    """Fetch every qBittorrent filename through qui."""

    payload = request_json(
        session,
        f"{proxy_url}/api/v2/torrents/files",
        {"hash": torrent_hash},
        timeout,
        f"qui files for {torrent_hash}",
    )
    if not isinstance(payload, list):
        raise QuiError(f"qui files for {torrent_hash} must be a JSON array")
    names: list[str] = []
    seen: set[str] = set()
    for item in payload:
        if not isinstance(item, dict):
            raise QuiError(f"qui files for {torrent_hash} contains a non-object file")
        name = item.get("name")
        if isinstance(name, str) and name.strip() and name.casefold() not in seen:
            seen.add(name.casefold())
            names.append(name.strip())
    return names


def fetch_tracker_urls(
    session: requests.Session,
    proxy_url: str,
    torrent_hash: str,
    timeout: float,
) -> list[str]:
    """Fetch every tracker URL when qui's search record was not hydrated."""

    payload = request_json(
        session,
        f"{proxy_url}/api/v2/torrents/trackers",
        {"hash": torrent_hash},
        timeout,
        f"qui trackers for {torrent_hash}",
    )
    if not isinstance(payload, list):
        raise QuiError(f"qui trackers for {torrent_hash} must be a JSON array")
    return tracker_urls_from({"trackers": payload})


def enrich_torrent(
    session: requests.Session,
    proxy_url: str,
    torrent: dict[str, Any],
    cache: dict[str, dict[str, Any]],
    timeout: float,
) -> dict[str, Any]:
    """Fetch and cache the comment, filenames, and complete tracker evidence."""

    torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
    cached = cache.get(torrent_hash)
    if cached is not None:
        return cached
    name = required_string(torrent, "name", f"qui torrent {torrent_hash}")
    inline_comment = torrent.get("comment")
    comment = (
        inline_comment
        if isinstance(inline_comment, str) and inline_comment.strip()
        else fetch_comment(session, proxy_url, torrent_hash, timeout)
    )
    inline_trackers = tracker_urls_from(torrent)
    hydrated_trackers = torrent.get("trackers")
    tracker_urls = (
        inline_trackers
        if isinstance(hydrated_trackers, list) and hydrated_trackers
        else list(
            dict.fromkeys(
                inline_trackers
                + fetch_tracker_urls(session, proxy_url, torrent_hash, timeout)
            )
        )
    )
    prepared = {
        "hash": torrent_hash,
        "name": name,
        "content_path": content_path_for(torrent),
        "comment": comment,
        "file_names": fetch_file_names(session, proxy_url, torrent_hash, timeout),
        "tracker_urls": tracker_urls,
    }
    cache[torrent_hash] = prepared
    return prepared


def extract_comment_links(comment: str) -> list[str]:
    """Extract safe non-announce links from a qBittorrent comment."""

    links: list[str] = []
    seen: set[str] = set()
    for match in COMMENT_URL.finditer(html.unescape(comment)):
        candidate = match.group(0).rstrip(".,);]}>")
        parsed = urlparse(candidate)
        if (
            not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or "announce" in parsed.path.casefold()
        ):
            continue
        candidate = parsed._replace(query="", fragment="").geturl()
        if candidate not in seen:
            seen.add(candidate)
            links.append(candidate)
    return links


def link_identity(value: str) -> tuple[str, str] | None:
    """Return a scheme-independent host and path identity for one details link."""

    parsed = urlparse(value)
    if not parsed.hostname:
        return None
    host = parsed.hostname.casefold().removeprefix("www.")
    path = parsed.path.rstrip("/").casefold() or "/"
    return host, path


def comment_matches_source(group: dict[str, Any], comment: str) -> bool:
    """Return whether a comment contains one exact source details identity."""

    source_links = {
        identity
        for source in source_torrents(group)
        if isinstance(source.get("details_url"), str)
        if (identity := link_identity(source["details_url"])) is not None
    }
    return any(
        link_identity(link) in source_links for link in extract_comment_links(comment)
    )


def release_identity(
    name: str,
) -> tuple[tuple[str, ...], str, str, set[str], list[str]]:
    """Return title, year, episode, format, and complete release tokens."""

    tokens = release_tokens(name)
    year = next((token for token in tokens if YEAR_TOKEN.fullmatch(token)), "")
    episode = next((token for token in tokens if EPISODE_TOKEN.fullmatch(token)), "")
    boundary = next(
        (
            index
            for index, token in enumerate(tokens)
            if YEAR_TOKEN.fullmatch(token)
            or EPISODE_TOKEN.fullmatch(token)
            or token in TECHNICAL_TOKENS
        ),
        len(tokens),
    )
    title = tuple(token for token in tokens[:boundary] if token not in TITLE_STOP_WORDS)
    formats = {token for token in tokens if token in TECHNICAL_TOKENS}
    return title, year, episode, formats, tokens


def fuzzy_release_score(source_name: str, client_name: str) -> float | None:
    """Score compatible title/year/season names while rejecting format conflicts."""

    source_title, source_year, source_episode, source_formats, source_tokens = (
        release_identity(source_name)
    )
    client_title, client_year, client_episode, client_formats, client_tokens = (
        release_identity(client_name)
    )
    if not source_title or source_title != client_title:
        return None
    if source_year and source_year != client_year:
        return None
    if source_episode and source_episode != client_episode:
        return None
    if any(
        source_formats & family
        and client_formats & family
        and source_formats & family != client_formats & family
        for family in TECHNICAL_CONFLICT_FAMILIES
    ):
        return None
    source_type = (
        "remux"
        if "remux" in source_formats
        else "disc"
        if source_formats & DISC_IMAGE_TOKENS
        else ""
    )
    client_type = (
        "remux"
        if "remux" in client_formats
        else "disc"
        if client_formats & DISC_IMAGE_TOKENS
        else ""
    )
    if {source_type, client_type} == {"disc", "remux"}:
        return None
    if source_formats and not (source_formats & client_formats):
        return None
    if not source_year and not source_episode and len(source_title) < 2:
        return None
    source_key = " ".join(source_tokens)
    client_key = " ".join(client_tokens)
    sequence_score = SequenceMatcher(None, source_key, client_key).ratio()
    source_set = set(source_tokens)
    client_set = set(client_tokens)
    token_score = 2 * len(source_set & client_set) / (len(source_set) + len(client_set))
    return max(sequence_score, token_score)


def fuzzy_group_score(group: dict[str, Any], client_name: str) -> float | None:
    """Return the best compatible fuzzy score across a group's source names."""

    scores = [
        score
        for source_name in source_release_names(group)
        if (score := fuzzy_release_score(source_name, client_name)) is not None
    ]
    return max(scores, default=None)


def preliminary_inventory_match(group: dict[str, Any], torrent: dict[str, Any]) -> bool:
    """Select likely inventory records before their expensive metadata lookups."""

    inline_comment = torrent.get("comment")
    if isinstance(inline_comment, str) and comment_matches_source(
        group, inline_comment
    ):
        return True
    name = required_string(torrent, "name", "qui torrent")
    identifiers = {
        canonical_name(name),
        canonical_name(leaf_name(content_path_for(torrent))),
    }
    source_identifiers = {
        canonical_name(value) for value in source_name_candidates(group)
    }
    if identifiers & source_identifiers:
        return True
    score = fuzzy_group_score(group, name)
    return (
        score is not None
        and score >= FUZZY_SOURCE_THRESHOLD
        and has_source_tracker(group, tracker_urls_from(torrent))
    )


def direct_match_evidence(
    group: dict[str, Any],
    torrent: dict[str, Any],
) -> tuple[list[str], float]:
    """Return strong matching reasons and the best fuzzy score for one torrent."""

    reasons: list[str] = []
    if comment_matches_source(group, torrent["comment"]):
        reasons.append("source_comment_id")

    client_names = [torrent["name"], leaf_name(torrent["content_path"])]
    client_names.extend(leaf_name(name) for name in torrent["file_names"])
    source_keys = {
        canonical_name(name)
        for name in source_name_candidates(group)
        if canonical_name(name)
    }
    client_keys = {
        canonical_name(name) for name in client_names if canonical_name(name)
    }
    if source_keys & client_keys:
        reasons.append("exact_torrent_name")

    filename_keys = {
        canonical_name(leaf_name(name))
        for name in source_file_names(group)
        if canonical_name(leaf_name(name))
    }
    if filename_keys & client_keys:
        reasons.append("exact_filename")

    score = 0.0
    for client_name in client_names:
        candidate_score = fuzzy_group_score(group, client_name)
        if candidate_score is not None:
            score = max(score, candidate_score)
    if (
        not reasons
        and score >= FUZZY_SOURCE_THRESHOLD
        and has_source_tracker(group, torrent["tracker_urls"])
    ):
        reasons.append("fuzzy_name_with_source_tracker")
    return reasons, score


def format_match(
    torrent: dict[str, Any], reasons: list[str], score: float
) -> dict[str, Any]:
    """Build a credential-safe JSON representation of one client match."""

    result: dict[str, Any] = {
        "hash": torrent["hash"],
        "name": torrent["name"],
        "content_path": torrent["content_path"],
        "file_names": torrent["file_names"],
        "tracker_hosts": tracker_hosts(torrent["tracker_urls"]),
        "site_links": extract_comment_links(torrent["comment"]),
        "match_reasons": reasons,
    }
    if score:
        result["fuzzy_score"] = round(score, 3)
    return result


def result_for_group(
    group: dict[str, Any], client_matches: list[dict[str, Any]]
) -> dict[str, Any]:
    """Build one grouped result and aggregate links from non-source sites."""

    details_hosts = source_hosts(group)
    other_site_links: list[str] = []
    seen: set[str] = set()
    for match in client_matches:
        for link in match.get("site_links", []):
            hostname = urlparse(link).hostname
            host = hostname.casefold().removeprefix("www.") if hostname else ""
            if host and host not in details_hosts and link not in seen:
                seen.add(link)
                other_site_links.append(link)
    return {
        "match_schema_version": MATCH_SCHEMA_VERSION,
        "name": group["name"],
        "source_torrents": group["source_torrents"],
        "client_matches": client_matches,
        "other_site_links": other_site_links,
    }


def match_group(
    session: requests.Session,
    proxy_url: str,
    group: dict[str, Any],
    inventory: list[dict[str, Any]],
    cache: dict[str, dict[str, Any]],
    timeout: float = 30,
) -> list[dict[str, Any]]:
    """Match one source group, then retain every torrent sharing matched content."""

    candidates: dict[str, dict[str, Any]] = {}
    for search_term in source_search_terms(group):
        for torrent in search_torrents(session, proxy_url, search_term, timeout):
            torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
            candidates.setdefault(torrent_hash, torrent)
    for torrent in inventory:
        if preliminary_inventory_match(group, torrent):
            torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
            candidates.setdefault(torrent_hash, torrent)

    evidence: dict[str, tuple[list[str], float]] = {}
    direct_paths: set[str] = set()
    prepared: dict[str, dict[str, Any]] = {}
    for torrent_hash, torrent in candidates.items():
        item = enrich_torrent(session, proxy_url, torrent, cache, timeout)
        prepared[torrent_hash] = item
        reasons, score = direct_match_evidence(group, item)
        if reasons:
            evidence[torrent_hash] = reasons, score
            direct_paths.add(content_path_key(item["content_path"]))

    if not evidence:
        return []
    for torrent in inventory:
        path = content_path_for(torrent)
        if content_path_key(path) not in direct_paths:
            continue
        torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
        if torrent_hash not in prepared:
            prepared[torrent_hash] = enrich_torrent(
                session, proxy_url, torrent, cache, timeout
            )
        evidence.setdefault(torrent_hash, (["shared_content_path"], 0.0))

    priority = {
        "source_comment_id": 0,
        "exact_torrent_name": 1,
        "exact_filename": 1,
        "fuzzy_name_with_source_tracker": 2,
        "shared_content_path": 3,
    }
    matches = [
        format_match(prepared[torrent_hash], reasons, score)
        for torrent_hash, (reasons, score) in evidence.items()
    ]
    matches.sort(
        key=lambda item: (
            min(priority[reason] for reason in item["match_reasons"]),
            item["name"].casefold(),
            item["hash"],
        )
    )
    return matches


def parse_args() -> argparse.Namespace:
    """Parse collector input, qui configuration, and output paths."""

    parser = argparse.ArgumentParser(
        description="Match grouped UNIT3D PTPImg results through qui."
    )
    parser.add_argument("input", type=Path, help="JSON from unit3d_ptpimg_torrents.py")
    parser.add_argument(
        "config", type=Path, help="Shared JSON config containing qui_proxy_url"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"JSON output path (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


def main() -> int:
    """Search each group, preserve cross-seeds, and checkpoint every result."""

    args = parse_args()
    try:
        validate_distinct_paths(
            [("input", args.input), ("config", args.config), ("output", args.output)]
        )
        groups = load_source_groups(args.input)
        proxy_url, timeout = load_qui_settings(args.config)
        checkpoint = load_checkpoint(args.output)
    except QuiError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    result_by_key: dict[str, dict[str, Any]] = {}
    pending_keys: set[str] = set()
    for group in groups:
        key = group_key(group)
        saved = checkpoint.get(key)
        if saved is not None and (
            saved.get("name") == group["name"]
            and saved.get("source_torrents") == group["source_torrents"]
        ):
            result_by_key[key] = saved
        if saved is None or not result_complete_for_group(group, saved):
            pending_keys.add(key)

    try:
        save_results(
            args.output,
            [
                result_by_key[group_key(group)]
                for group in groups
                if group_key(group) in result_by_key
            ],
        )
    except QuiError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    with requests.Session() as session:
        session.headers.update(
            {"Accept": "application/json", "User-Agent": "unit3d-fix-ptpimg-qui/1.0"}
        )
        inventory: list[dict[str, Any]] = []
        if pending_keys:
            try:
                inventory = search_torrents(session, proxy_url, "", timeout)
            except QuiError as error:
                print(
                    f"Error: cannot load qui torrent inventory: {error}",
                    file=sys.stderr,
                )
                return 2
        cache: dict[str, dict[str, Any]] = {}
        for index, group in enumerate(groups, 1):
            key = group_key(group)
            if key not in pending_keys:
                print(f"[{index}/{len(groups)}] {group['name']} (saved)")
                continue
            print(f"[{index}/{len(groups)}] {group['name']}")
            result = result_for_group(group, [])
            try:
                result = result_for_group(
                    group,
                    match_group(session, proxy_url, group, inventory, cache, timeout),
                )
            except QuiError as error:
                failed = True
                result["search_error"] = str(error)
                print(f"Error: {group['name']}: {error}", file=sys.stderr)
            result_by_key[key] = result
            try:
                save_results(
                    args.output,
                    [
                        result_by_key[group_key(item)]
                        for item in groups
                        if group_key(item) in result_by_key
                    ],
                )
            except QuiError as error:
                print(f"Error: {error}", file=sys.stderr)
                return 2

    output = [result_by_key[group_key(group)] for group in groups]
    match_count = sum(len(result["client_matches"]) for result in output)
    matched_groups = sum(bool(result["client_matches"]) for result in output)
    print(
        f"Saved {match_count} client torrents for {matched_groups} of "
        f"{len(output)} source groups to {args.output}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
