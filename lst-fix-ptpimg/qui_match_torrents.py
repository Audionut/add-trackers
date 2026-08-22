#!/usr/bin/env python3
"""Match LST replacement-queue torrents to local media through a qui proxy."""

from __future__ import annotations

import argparse
import html
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any
from urllib.parse import parse_qsl, urlparse

import requests

from lst_common import (
    LstError,
    load_config,
    load_json,
    number_setting,
    require_distinct_paths,
    required_string,
    save_json,
    validate_source_torrent,
)


DEFAULT_PAGE_SIZE = 100
DEFAULT_OUTPUT = Path(__file__).with_name("qui_torrent_matches.json")
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
    ".webm",
    ".wmv",
)
RELEASE_SEPARATORS = re.compile(r"[._\-\[\](){}\s]+")
RELEASE_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)
YEAR_TOKEN = re.compile(r"^(?:19|20)\d{2}$")
EPISODE_TOKEN = re.compile(r"^s\d{1,3}(?:e\d{1,3})?$")
LST_COMMENT_ID = re.compile(
    r"https?://(?:www\.)?lst\.gg/torrents/(\d+)(?:[/?#]|$)", re.IGNORECASE
)
COMMENT_URL = re.compile(r"https?://[^\s<>\"'\[\]]+", re.IGNORECASE)
SENSITIVE_QUERY_KEYS = {
    "api_token",
    "apikey",
    "authkey",
    "passkey",
    "rsskey",
    "torrent_pass",
}
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
FUZZY_LST_THRESHOLD = 0.56


def load_sources(path: Path) -> list[dict[str, Any]]:
    """Load collector output as validated LST source torrents."""

    payload = load_json(path, "LST collector output")
    if not isinstance(payload, list):
        raise LstError("LST collector output must be a JSON array")
    sources = [
        validate_source_torrent(item, f"Input entry {index}")
        for index, item in enumerate(payload, 1)
    ]
    ids = [source["torrent_id"] for source in sources]
    if len(ids) != len(set(ids)):
        raise LstError("LST collector output contains duplicate torrent IDs")
    return sources


def load_checkpoint(path: Path) -> dict[str, dict[str, Any]]:
    """Load prior qui results keyed by LST torrent ID."""

    if not path.exists():
        return {}
    payload = load_json(path, "qui output")
    if not isinstance(payload, list):
        raise LstError("qui output must be a JSON array")
    results: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            raise LstError(f"qui output entry {index} must be an object")
        source = validate_source_torrent(
            item.get("source_torrent"), f"qui output entry {index} source_torrent"
        )
        torrent_id = source["torrent_id"]
        if torrent_id in results:
            raise LstError(f"qui output contains duplicate torrent ID {torrent_id}")
        matches = item.get("client_matches")
        if not isinstance(matches, list) or not all(isinstance(match, dict) for match in matches):
            raise LstError(f"qui output entry {index} requires a client_matches array")
        for match in matches:
            required_string(match, "hash", f"qui output entry {index} client match")
            required_string(match, "name", f"qui output entry {index} client match")
            required_string(match, "content_path", f"qui output entry {index} client match")
        results[torrent_id] = item
    return results


def result_complete_for_source(source: dict[str, Any], result: dict[str, Any]) -> bool:
    """Return whether a saved qui result is complete for the exact current source."""

    return result.get("source_torrent") == source and "search_error" not in result


def load_qui_settings(path: Path) -> tuple[str, float]:
    """Load and validate the qui proxy URL and request timeout."""

    config = load_config(path)
    proxy_url = required_string(config, "qui_proxy_url", "Config").rstrip("/")
    parsed = urlparse(proxy_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise LstError("qui_proxy_url must be an absolute HTTP or HTTPS URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise LstError("qui_proxy_url must not contain credentials, a query, or a fragment")
    timeout = number_setting(config, "request_timeout", 30, 1, 300)
    return proxy_url, timeout


def request_json(
    session: requests.Session,
    url: str,
    params: dict[str, str],
    timeout: float,
    operation: str,
) -> Any:
    """Return a qui JSON response without exposing its proxy key in errors."""

    try:
        response = session.get(url, params=params, timeout=timeout)
    except requests.RequestException as error:
        raise LstError(f"{operation} failed: {type(error).__name__}") from error
    if response.status_code != 200:
        raise LstError(f"{operation} returned HTTP {response.status_code}")
    try:
        return response.json()
    except ValueError as error:
        raise LstError(f"{operation} returned invalid JSON") from error


def search_torrents(
    session: requests.Session,
    proxy_url: str,
    search_term: str,
    timeout: float = 30,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Return all paginated qui results for one filtered search term."""

    if page_size <= 0:
        raise LstError("Search page size must be greater than zero")
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
                raise LstError("qui search response is missing a torrents field")
            records = payload["torrents"]
            if records is None:
                records = []
            if not isinstance(records, list):
                raise LstError("qui search torrents field must be an array or null")
            raw_has_more = payload.get("hasMore")
            has_more = raw_has_more if isinstance(raw_has_more, bool) else None
            raw_total = payload.get("total")
            total = raw_total if isinstance(raw_total, int) and raw_total >= 0 else None
        elif isinstance(payload, list):
            records = payload
        else:
            raise LstError("qui search response must be an object or array")

        new_records = 0
        for item in records:
            if not isinstance(item, dict):
                raise LstError("qui search contains a non-object torrent")
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
                raise LstError("qui search returned an empty page before completion")
            return torrents
        if new_records == 0:
            raise LstError("qui search repeated a page")
        offset = next_offset


def release_name_key(name: str) -> str:
    """Normalize a release across separators, case, and common video extensions."""

    normalized = name.strip()
    lowered = normalized.casefold()
    for extension in VIDEO_EXTENSIONS:
        if lowered.endswith(extension):
            normalized = normalized[: -len(extension)]
            break
    return RELEASE_SEPARATORS.sub(" ", normalized).strip().casefold()


def canonical_name(name: str) -> str:
    """Return only Unicode letters and digits from a normalized release name."""

    return "".join(character for character in release_name_key(name) if character.isalnum())


def release_tokens(name: str) -> list[str]:
    """Return normalized release tokens with common compound formats joined."""

    value = release_name_key(name)
    value = re.sub(r"\bblu\s+ray\b", "bluray", value)
    value = re.sub(r"\bweb\s+dl\b", "webdl", value)
    return RELEASE_TOKEN.findall(value)


def leaf_name(path: str) -> str:
    """Return the last component from either Windows or POSIX path syntax."""

    return path.replace("\\", "/").rsplit("/", 1)[-1]


def source_file_names(source: dict[str, Any]) -> list[str]:
    """Return every valid LST API filename from one source record."""

    values = source.get("file_names")
    if not isinstance(values, list):
        return []
    return [value.strip() for value in values if isinstance(value, str) and value.strip()]


def source_name_candidates(source: dict[str, Any]) -> list[str]:
    """Return release, folder, and single-file names suitable for qui searching."""

    candidates = [required_string(source, "name", "source torrent")]
    folder = source.get("folder")
    if isinstance(folder, str) and folder.strip():
        candidates.append(leaf_name(folder.strip()))
    file_names = source_file_names(source)
    if len(file_names) == 1:
        candidates.append(leaf_name(file_names[0]))

    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = canonical_name(candidate)
        if key and key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def filtered_release_term(name: str) -> str:
    """Reduce a site release name to its title plus year or season identity."""

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


def source_search_terms(source: dict[str, Any]) -> list[str]:
    """Build distinct full and title-identity terms for qui's fuzzy search."""

    terms: list[str] = []
    seen: set[str] = set()
    for candidate in source_name_candidates(source):
        for value in (sanitize_search_term(candidate), filtered_release_term(candidate)):
            key = release_name_key(value)
            if key and key not in seen:
                seen.add(key)
                terms.append(value)
    return terms


def is_windows_path(path: str) -> bool:
    """Return whether a path uses a Windows drive or UNC form."""

    return re.match(r"^[a-z]:[\\/]", path, re.IGNORECASE) is not None or path.startswith("\\\\")


def normalize_content_path(path: str) -> str:
    """Normalize separators without changing the operating-system path style."""

    return str(PureWindowsPath(path)) if is_windows_path(path) else str(PurePosixPath(path))


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


def has_lst_tracker(urls: list[str]) -> bool:
    """Return whether tracker metadata identifies LST."""

    return any(host == "lst.gg" or host.endswith(".lst.gg") for host in tracker_hosts(urls))


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
        raise LstError(f"qui properties for {torrent_hash} must be a JSON object")
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
        raise LstError(f"qui files for {torrent_hash} must be a JSON array")
    names: list[str] = []
    seen: set[str] = set()
    for item in payload:
        if not isinstance(item, dict):
            raise LstError(f"qui files for {torrent_hash} contains a non-object file")
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
        raise LstError(f"qui trackers for {torrent_hash} must be a JSON array")
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
        if isinstance(inline_comment, str)
        else fetch_comment(session, proxy_url, torrent_hash, timeout)
    )
    inline_trackers = tracker_urls_from(torrent)
    tracker_urls = (
        inline_trackers
        if isinstance(torrent.get("trackers"), list) and inline_trackers
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


def lst_ids_from_comment(comment: str) -> set[str]:
    """Return LST torrent IDs embedded as details links in a comment."""

    return {match.group(1) for match in LST_COMMENT_ID.finditer(html.unescape(comment))}


def release_identity(name: str) -> tuple[tuple[str, ...], str, str, set[str], list[str]]:
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
    title = tuple(
        token
        for token in tokens[:boundary]
        if token not in TITLE_STOP_WORDS
    )
    formats = {token for token in tokens if token in TECHNICAL_TOKENS}
    return title, year, episode, formats, tokens


def fuzzy_release_score(source_name: str, client_name: str) -> float | None:
    """Score compatible title/year/season names while rejecting format conflicts."""

    source_title, source_year, source_episode, source_formats, source_tokens = release_identity(
        source_name
    )
    client_title, client_year, client_episode, client_formats, client_tokens = release_identity(
        client_name
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


def preliminary_inventory_match(source: dict[str, Any], torrent: dict[str, Any]) -> bool:
    """Select likely inventory records before their expensive metadata lookups."""

    name = required_string(torrent, "name", "qui torrent")
    identifiers = {canonical_name(name), canonical_name(leaf_name(content_path_for(torrent)))}
    source_identifiers = {canonical_name(value) for value in source_name_candidates(source)}
    if identifiers & source_identifiers:
        return True
    score = fuzzy_release_score(required_string(source, "name", "source torrent"), name)
    return (
        score is not None
        and score >= FUZZY_LST_THRESHOLD
        and has_lst_tracker(tracker_urls_from(torrent))
    )


def direct_match_evidence(
    source: dict[str, Any],
    torrent: dict[str, Any],
) -> tuple[list[str], float]:
    """Return strong matching reasons and the best fuzzy score for one torrent."""

    reasons: list[str] = []
    source_id = required_string(source, "torrent_id", "source torrent")
    if source_id in lst_ids_from_comment(torrent["comment"]):
        reasons.append("lst_comment_id")

    source_names = source_name_candidates(source)
    client_names = [torrent["name"], leaf_name(torrent["content_path"])]
    client_names.extend(leaf_name(name) for name in torrent["file_names"])
    source_keys = {canonical_name(name) for name in source_names if canonical_name(name)}
    client_keys = {canonical_name(name) for name in client_names if canonical_name(name)}
    if source_keys & client_keys:
        reasons.append("exact_torrent_name")

    lst_files = source_file_names(source)
    if len(lst_files) == 1:
        filename_key = canonical_name(leaf_name(lst_files[0]))
        if filename_key and filename_key in client_keys:
            reasons.append("exact_filename")

    score = 0.0
    source_name = required_string(source, "name", "source torrent")
    for client_name in client_names:
        candidate_score = fuzzy_release_score(source_name, client_name)
        if candidate_score is not None:
            score = max(score, candidate_score)
    if (
        not reasons
        and score >= FUZZY_LST_THRESHOLD
        and has_lst_tracker(torrent["tracker_urls"])
    ):
        reasons.append("fuzzy_name_with_lst_tracker")
    return reasons, score


def format_match(torrent: dict[str, Any], reasons: list[str], score: float) -> dict[str, Any]:
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


def match_source(
    session: requests.Session,
    proxy_url: str,
    source: dict[str, Any],
    inventory: list[dict[str, Any]],
    cache: dict[str, dict[str, Any]],
    timeout: float = 30,
) -> list[dict[str, Any]]:
    """Match one source, then retain every qui torrent sharing matched content."""

    candidates: dict[str, dict[str, Any]] = {}
    for search_term in source_search_terms(source):
        for torrent in search_torrents(session, proxy_url, search_term, timeout):
            torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
            candidates.setdefault(torrent_hash, torrent)
    for torrent in inventory:
        if preliminary_inventory_match(source, torrent):
            torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
            candidates.setdefault(torrent_hash, torrent)

    evidence: dict[str, tuple[list[str], float]] = {}
    direct_paths: set[str] = set()
    prepared: dict[str, dict[str, Any]] = {}
    for torrent_hash, torrent in candidates.items():
        item = enrich_torrent(session, proxy_url, torrent, cache, timeout)
        prepared[torrent_hash] = item
        reasons, score = direct_match_evidence(source, item)
        if reasons:
            evidence[torrent_hash] = (reasons, score)
            direct_paths.add(content_path_key(item["content_path"]))

    if not evidence:
        return []
    for torrent in inventory:
        path = content_path_for(torrent)
        if content_path_key(path) not in direct_paths:
            continue
        torrent_hash = required_string(torrent, "hash", "qui torrent").casefold()
        if torrent_hash not in prepared:
            prepared[torrent_hash] = enrich_torrent(session, proxy_url, torrent, cache, timeout)
        evidence.setdefault(torrent_hash, (["shared_content_path"], 0.0))

    priority = {
        "lst_comment_id": 0,
        "exact_torrent_name": 1,
        "exact_filename": 1,
        "fuzzy_name_with_lst_tracker": 2,
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
    """Parse collector input, shared config, and output paths."""

    parser = argparse.ArgumentParser(description="Match LST queue torrents through qui.")
    parser.add_argument("input", type=Path, help="JSON from lst_ptpimg_torrents.py")
    parser.add_argument("config", type=Path, help="JSON config containing qui_proxy_url")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


def main() -> int:
    """Search each source, preserve cross-seeds, and save partial results."""

    args = parse_args()
    try:
        require_distinct_paths(
            [("input", args.input), ("config", args.config), ("output", args.output)]
        )
        sources = load_sources(args.input)
        proxy_url, timeout = load_qui_settings(args.config)
        checkpoint = load_checkpoint(args.output)
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    result_by_id: dict[str, dict[str, Any]] = {}
    pending_ids: set[str] = set()
    for source in sources:
        torrent_id = source["torrent_id"]
        saved = checkpoint.get(torrent_id)
        if saved is not None and saved.get("source_torrent") == source:
            result_by_id[torrent_id] = saved
        if saved is None or not result_complete_for_source(source, saved):
            pending_ids.add(torrent_id)

    try:
        save_json(
            args.output,
            [
                result_by_id[source["torrent_id"]]
                for source in sources
                if source["torrent_id"] in result_by_id
            ],
        )
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    with requests.Session() as session:
        session.headers.update(
            {"Accept": "application/json", "User-Agent": "lst-fix-ptpimg-qui/1.0"}
        )
        inventory: list[dict[str, Any]] = []
        if pending_ids:
            try:
                inventory = search_torrents(session, proxy_url, "", timeout)
            except LstError as error:
                print(f"Error: cannot load qui torrent inventory: {error}", file=sys.stderr)
                return 2
        cache: dict[str, dict[str, Any]] = {}
        for index, source in enumerate(sources, 1):
            torrent_id = source["torrent_id"]
            if torrent_id not in pending_ids:
                print(
                    f"[{index}/{len(sources)}] {torrent_id} {source['name']} (saved)"
                )
                continue
            print(f"[{index}/{len(sources)}] {source['torrent_id']} {source['name']}")
            result: dict[str, Any] = {"source_torrent": source, "client_matches": []}
            try:
                result["client_matches"] = match_source(
                    session, proxy_url, source, inventory, cache, timeout
                )
            except LstError as error:
                failed = True
                result["search_error"] = str(error)
                print(f"Error: torrent {source['torrent_id']}: {error}", file=sys.stderr)
            result_by_id[torrent_id] = result
            try:
                save_json(
                    args.output,
                    [
                        result_by_id[item["torrent_id"]]
                        for item in sources
                        if item["torrent_id"] in result_by_id
                    ],
                )
            except LstError as error:
                print(f"Error: {error}", file=sys.stderr)
                return 2

    output = [result_by_id[source["torrent_id"]] for source in sources]
    match_count = sum(len(result["client_matches"]) for result in output)
    matched_sources = sum(bool(result["client_matches"]) for result in output)
    print(
        f"Saved {match_count} client torrents for {matched_sources} of "
        f"{len(output)} LST torrents to {args.output}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
