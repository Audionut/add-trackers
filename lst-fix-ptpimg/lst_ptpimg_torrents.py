#!/usr/bin/env python3
"""Collect LST's seeded replacement queue and torrent metadata."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from lst_common import (
    LstError,
    description_sha256,
    find_ptpimg_blocks,
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
API_URL = f"{BASE_URL}/api"
QUEUE_URL = f"{API_URL}/description-changes/seeding"
DEFAULT_OUTPUT = Path(__file__).with_name("lst_ptpimg_results.json")


@dataclass(frozen=True)
class QueueItem:
    """One validated LST seeded image-replacement item."""

    torrent_id: str
    description: str


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


def collect_queue(
    session: requests.Session,
    timeout: float = 30,
) -> list[QueueItem]:
    """Collect the API's seeded torrents awaiting image replacement."""

    try:
        response = session.get(QUEUE_URL, timeout=timeout)
    except requests.RequestException as error:
        raise LstError(f"LST replacement queue request failed: {type(error).__name__}") from error
    if response.status_code != 200:
        raise LstError(f"LST replacement queue request returned HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:
        raise LstError("LST replacement queue response was not JSON") from error
    if not isinstance(payload, list):
        raise LstError("LST replacement queue response must be a JSON array")

    items: list[QueueItem] = []
    seen: set[str] = set()
    for index, record in enumerate(payload, 1):
        if not isinstance(record, dict):
            raise LstError(f"LST replacement queue item {index} must be an object")
        raw_id = record.get("id")
        if isinstance(raw_id, bool) or not isinstance(raw_id, int) or raw_id < 1:
            raise LstError(f"LST replacement queue item {index} has an invalid torrent ID")
        description = record.get("description")
        if not isinstance(description, str):
            raise LstError(f"LST replacement queue item {index} has no description")
        torrent_id = str(raw_id)
        if torrent_id in seen:
            raise LstError(f"LST replacement queue contains duplicate torrent ID {torrent_id}")
        seen.add(torrent_id)
        items.append(QueueItem(torrent_id, description))
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
    """Fetch torrent metadata and return an eligible LST source torrent."""

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
    description = item.description
    blocks = find_ptpimg_blocks(description)
    if not blocks:
        return None

    raw_name = attributes.get("name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise LstError(f"Torrent {item.torrent_id} has no release name")
    name = raw_name.strip()
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
    parser.add_argument("config", type=Path, help="JSON config with an LST API token")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument("--limit", type=int, metavar="N", help="Process at most N queue items")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    return args


def main() -> int:
    """Collect seeded descriptions and metadata, saving partial safe results."""

    args = parse_args()
    try:
        config = load_config(args.config)
        api_token = required_string(config, "lst_api_token", "Config")
        require_distinct_paths(
            [
                ("config", args.config),
                ("output", args.output),
            ]
        )
        timeout = number_setting(config, "request_timeout", 30, 1, 300)
        checkpoint = load_checkpoint(args.output)
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
        previous_request_started = wait_for_request_slot(previous_request_started)
        try:
            queue = collect_queue(api_session, timeout)
        except LstError as error:
            print(f"Error: {error}", file=sys.stderr)
            return 2

        result_by_id = {
            item.torrent_id: checkpoint[item.torrent_id]
            for item in queue
            if item.torrent_id in checkpoint
            and checkpoint[item.torrent_id].get("description") == item.description
        }
        processing_queue = queue[: args.limit] if args.limit is not None else queue
        try:
            save_json(
                args.output,
                [
                    result_by_id[item.torrent_id]
                    for item in queue
                    if item.torrent_id in result_by_id
                ],
            )
        except LstError as error:
            print(f"Error: {error}", file=sys.stderr)
            return 2

        for index, item in enumerate(processing_queue, 1):
            if item.torrent_id in result_by_id:
                name = result_by_id[item.torrent_id]["name"]
                print(
                    f"[{index}/{len(processing_queue)}] "
                    f"{item.torrent_id} {name} (saved)"
                )
                continue
            print(f"[{index}/{len(processing_queue)}] {item.torrent_id}")
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
        f"Saved {len(result_by_id)} eligible torrents from {len(queue)} queue items "
        f"to {args.output}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
