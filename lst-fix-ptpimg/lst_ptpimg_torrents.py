#!/usr/bin/env python3
"""Collect LST's replacement queue and fetch each torrent's full description."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from http.cookiejar import MozillaCookieJar
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

import requests

from lst_common import (
    LstError,
    description_sha256,
    find_ptpimg_blocks,
    full_description,
    load_config,
    load_json,
    number_setting,
    require_distinct_paths,
    required_string,
    save_json,
    torrent_attributes,
    validate_source_torrent,
    wait_for_request_slot,
)


BASE_URL = "https://lst.gg"
QUEUE_URL = f"{BASE_URL}/image-replacements"
API_URL = f"{BASE_URL}/api"
WIRE_ID = re.compile(r"^ptpimg-torrent-(\d+)$")
TORRENT_PATH = re.compile(r"^/torrents/(\d+)/?$")
DEFAULT_OUTPUT = Path(__file__).with_name("lst_ptpimg_results.json")


@dataclass(frozen=True)
class QueueItem:
    """One validated LST replacement-queue row."""

    torrent_id: str
    name: str


def load_checkpoint(path: Path) -> dict[str, dict[str, Any]]:
    """Load atomically checkpointed eligible torrents keyed by torrent ID."""

    if not path.exists():
        return {}
    payload = load_json(path, "collector output")
    if not isinstance(payload, list):
        raise LstError("collector output must be a JSON array")
    results: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        source = validate_source_torrent(item, f"collector output entry {index}")
        torrent_id = source["torrent_id"]
        if torrent_id in results:
            raise LstError(f"collector output contains duplicate torrent ID {torrent_id}")
        results[torrent_id] = source
    return results


class QueueParser(HTMLParser):
    """Extract queue-row IDs, names, and pagination from server-rendered HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.wire_ids: set[str] = set()
        self.pending_ids: set[str] = set()
        self.title_rows: list[tuple[str | None, QueueItem]] = []
        self.pages: set[int] = {1}
        self.article_ids: list[str | None] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attributes}
        classes = set(attrs.get("class", "").split())
        if tag == "article":
            match = (
                WIRE_ID.fullmatch(attrs.get("wire:key", ""))
                if "report-item" in classes
                else None
            )
            article_id = match.group(1) if match else None
            self.article_ids.append(article_id)
            if article_id:
                self.wire_ids.add(article_id)
                if "report-item--snoozed" in classes:
                    self.pending_ids.add(article_id)
        article_id = self.article_ids[-1] if self.article_ids else None
        if article_id and "report-item__badge--status-snoozed" in classes:
            self.pending_ids.add(article_id)
        if tag != "a":
            return

        href = attrs.get("href", "")
        if article_id and "report-item__action" in classes and (
            "/image-replacements/applications/" in urlparse(href).path
            or attrs.get("title", "").strip().casefold() == "view application"
        ):
            self.pending_ids.add(article_id)
        if "report-item__title" in classes:
            parsed = urlparse(urljoin(f"{BASE_URL}/", href))
            match = TORRENT_PATH.fullmatch(parsed.path)
            if (
                parsed.scheme == "https"
                and (parsed.hostname or "").casefold() in {"lst.gg", "www.lst.gg"}
                and match
            ):
                article_id = self.article_ids[-1] if self.article_ids else None
                self.title_rows.append(
                    (article_id, QueueItem(match.group(1), attrs.get("title", "").strip()))
                )

        if classes & {"pagination__link", "pagination__next"}:
            values = parse_qs(urlparse(href).query).get("page", [])
            for value in values:
                try:
                    page = int(value)
                except ValueError:
                    continue
                if page > 0:
                    self.pages.add(page)

    def handle_endtag(self, tag: str) -> None:
        if tag == "article" and self.article_ids:
            self.article_ids.pop()


def parse_queue_page(html: str) -> tuple[list[QueueItem], set[int]]:
    """Return open rows whose wire key and torrent title link agree."""

    parser = QueueParser()
    parser.feed(html)
    title_rows = [
        (article_id, item)
        for article_id, item in parser.title_rows
        if article_id not in parser.pending_ids
    ]
    wire_ids = parser.wire_ids - parser.pending_ids
    if any(article_id != item.torrent_id for article_id, item in title_rows):
        raise LstError("An LST queue row wire key does not match its torrent title link")
    title_ids = {item.torrent_id for _article_id, item in title_rows}
    if wire_ids != title_ids:
        raise LstError("LST queue row IDs do not match their torrent title links")

    rows: list[QueueItem] = []
    seen: set[str] = set()
    for _article_id, item in title_rows:
        if item.torrent_id not in seen:
            seen.add(item.torrent_id)
            rows.append(item)
    return rows, parser.pages


def load_cookie_jar(path: Path) -> MozillaCookieJar:
    """Load unexpired lst.gg cookies from a Netscape-format cookie file."""

    jar = MozillaCookieJar(str(path))
    try:
        jar.load(ignore_discard=True, ignore_expires=True)
    except (OSError, ValueError) as error:
        raise LstError(f"Cannot load Netscape cookie file {path}: {error}") from error

    lst_cookies = [
        cookie
        for cookie in jar
        if cookie.domain.lstrip(".").casefold() in {"lst.gg", "www.lst.gg"}
        and (cookie.expires in {None, 0} or not cookie.is_expired())
    ]
    if not lst_cookies:
        raise LstError("Cookie file contains no unexpired lst.gg cookies")

    filtered = MozillaCookieJar()
    for cookie in lst_cookies:
        filtered.set_cookie(cookie)
    return filtered


def request_queue_page(
    session: requests.Session,
    page: int,
    timeout: float,
) -> str:
    """Fetch one filtered replacement-queue page without losing its filters."""

    try:
        response = session.get(
            QUEUE_URL,
            params={"pending": "false", "seeding": "true", "page": str(page)},
            timeout=timeout,
        )
    except requests.RequestException as error:
        raise LstError(f"LST queue page {page} request failed: {type(error).__name__}") from error
    if response.status_code != 200:
        raise LstError(f"LST queue page {page} returned HTTP {response.status_code}")
    if urlparse(response.url).path.rstrip("/") == "/login":
        raise LstError("LST cookie is not authenticated; the queue redirected to login")
    if "html" not in response.headers.get("Content-Type", "").casefold():
        raise LstError(f"LST queue page {page} did not return HTML")
    return response.text


def collect_queue(
    session: requests.Session,
    timeout: float = 30,
) -> list[QueueItem]:
    """Collect and deduplicate all filtered queue rows."""

    page = 1
    last_page = 1
    items: list[QueueItem] = []
    seen: set[str] = set()
    while page <= last_page:
        rows, pages = parse_queue_page(request_queue_page(session, page, timeout))
        last_page = max(last_page, *pages)
        for item in rows:
            if item.torrent_id not in seen:
                seen.add(item.torrent_id)
                items.append(item)
        page += 1
    return items


def torrent_file_names(attributes: dict[str, Any]) -> list[str]:
    """Return every non-empty file name supplied by the LST torrent API."""

    files = attributes.get("files")
    if not isinstance(files, list):
        return []
    names: list[str] = []
    seen: set[str] = set()
    for item in files:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        value = name.strip()
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            names.append(value)
    return names


def fetch_torrent(
    session: requests.Session,
    item: QueueItem,
    timeout: float = 30,
) -> dict[str, Any] | None:
    """Fetch one full API record and return an eligible LST source torrent."""

    try:
        response = session.get(f"{API_URL}/torrents/{item.torrent_id}", timeout=timeout)
    except requests.RequestException as error:
        raise LstError(
            f"Torrent {item.torrent_id} API request failed: {type(error).__name__}"
        ) from error
    if response.status_code != 200:
        raise LstError(f"Torrent {item.torrent_id} API request returned HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:
        raise LstError(f"Torrent {item.torrent_id} API response was not JSON") from error

    record, attributes = torrent_attributes(payload, f"Torrent {item.torrent_id}")
    raw_id = record.get("id", attributes.get("id", item.torrent_id))
    if str(raw_id).strip() != item.torrent_id:
        raise LstError(f"Torrent {item.torrent_id} API response returned a different ID")
    description = full_description(payload, f"Torrent {item.torrent_id}")
    blocks = find_ptpimg_blocks(description)
    if not blocks:
        return None

    raw_name = attributes.get("name")
    name = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else item.name
    if not name:
        raise LstError(f"Torrent {item.torrent_id} has no release name")
    folder_value = attributes.get("folder")
    folder = folder_value.strip() if isinstance(folder_value, str) and folder_value.strip() else None
    return {
        "site": "LST",
        "torrent_id": item.torrent_id,
        "name": name,
        "folder": folder,
        "file_names": torrent_file_names(attributes),
        "details_url": f"{BASE_URL}/torrents/{item.torrent_id}",
        "description": description,
        "description_sha256": description_sha256(description),
        "ptpimg_blocks": [block.text for block in blocks],
    }


def parse_args() -> argparse.Namespace:
    """Parse shared configuration and output arguments."""

    parser = argparse.ArgumentParser(
        description="Collect LST torrents awaiting seeded PTPImg replacement."
    )
    parser.add_argument("config", type=Path, help="JSON config with LST token and cookie file")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument("--limit", type=int, metavar="N", help="Process at most N queue rows")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    return args


def main() -> int:
    """Collect queue rows, fetch full descriptions, and save partial safe results."""

    args = parse_args()
    try:
        config = load_config(args.config)
        api_token = required_string(config, "lst_api_token", "Config")
        raw_cookie_path = required_string(config, "lst_cookie_file", "Config")
        cookie_path = Path(raw_cookie_path)
        if not cookie_path.is_absolute():
            cookie_path = args.config.parent / cookie_path
        require_distinct_paths(
            [
                ("config", args.config),
                ("cookie file", cookie_path),
                ("output", args.output),
            ]
        )
        cookies = load_cookie_jar(cookie_path)
        timeout = number_setting(config, "request_timeout", 30, 1, 300)
        checkpoint = load_checkpoint(args.output)
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    try:
        with requests.Session() as queue_session:
            queue_session.headers.update({"User-Agent": "lst-fix-ptpimg/1.0"})
            queue_session.cookies.update(cookies)
            queue = collect_queue(queue_session, timeout)
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    result_by_id = {
        item.torrent_id: checkpoint[item.torrent_id]
        for item in queue
        if item.torrent_id in checkpoint
    }
    processing_queue = queue[: args.limit] if args.limit is not None else queue
    try:
        save_json(
            args.output,
            [result_by_id[item.torrent_id] for item in queue if item.torrent_id in result_by_id],
        )
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    previous_request_started: float | None = None
    with requests.Session() as api_session:
        api_session.headers.update(
            {
                "Accept": "application/json",
                "Authorization": f"Bearer {api_token}",
                "User-Agent": "lst-fix-ptpimg/1.0",
            }
        )
        for index, item in enumerate(processing_queue, 1):
            if item.torrent_id in result_by_id:
                print(
                    f"[{index}/{len(processing_queue)}] "
                    f"{item.torrent_id} {item.name} (saved)"
                )
                continue
            print(f"[{index}/{len(processing_queue)}] {item.torrent_id} {item.name}")
            previous_request_started = wait_for_request_slot(previous_request_started)
            try:
                match = fetch_torrent(api_session, item, timeout)
                if match is not None:
                    result_by_id[item.torrent_id] = match
            except LstError as error:
                failed = True
                print(f"Error: {error}", file=sys.stderr)
            try:
                save_json(
                    args.output,
                    [
                        result_by_id[queued.torrent_id]
                        for queued in queue
                        if queued.torrent_id in result_by_id
                    ],
                )
            except LstError as error:
                print(f"Error: {error}", file=sys.stderr)
                return 2

    print(
        f"Saved {len(result_by_id)} eligible torrents from {len(queue)} queue rows "
        f"to {args.output}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
