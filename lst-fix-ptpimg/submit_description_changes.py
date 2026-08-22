#!/usr/bin/env python3
"""Validate and submit full LST description-change applications."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from lst_common import (
    LstError,
    description_sha256,
    full_description,
    load_config,
    load_json,
    number_setting,
    replacement_source_description,
    require_distinct_paths,
    replace_ptpimg_blocks,
    required_string,
    save_json,
    torrent_attributes,
    validate_source_torrent,
    wait_for_request_slot,
)


API_URL = "https://lst.gg/api"
DEFAULT_STATE = Path(__file__).with_name("submission_results.json")
DEFAULT_MESSAGE = "Replaced PTPImg screenshots with LostImg uploads."


def successful_state_matches(state: dict[str, Any] | None, item: dict[str, Any]) -> bool:
    """Return whether an accepted state entry belongs to this exact proposal."""

    if not isinstance(state, dict) or state.get("success") is not True:
        return False
    source = item["source_torrent"]
    return (
        state.get("source_description_sha256") == source["description_sha256"]
        and state.get("proposed_description_sha256")
        == description_sha256(item["proposed_description"])
    )


def validate_replacement(item: Any, index: int) -> dict[str, Any] | None:
    """Validate one successful capture result; return None for a recorded failure."""

    if not isinstance(item, dict):
        raise LstError(f"Replacement entry {index} must be an object")
    if "proposed_description" not in item:
        if isinstance(item.get("processing_error"), str):
            return None
        raise LstError(f"Replacement entry {index} has no proposed_description")

    source = validate_source_torrent(
        item.get("source_torrent"), f"Replacement entry {index} source_torrent"
    )
    if item.get("image_host") != "lostimg":
        raise LstError(f"Replacement entry {index} was not uploaded to LostImg")
    proposed = item.get("proposed_description")
    if not isinstance(proposed, str):
        raise LstError(f"Replacement entry {index} proposed_description must be a string")
    replacements = item.get("replacements")
    if not isinstance(replacements, list) or not all(
        isinstance(replacement, dict) for replacement in replacements
    ):
        raise LstError(f"Replacement entry {index} requires a replacements array")
    urls = [
        required_string(replacement, "lostimg_url", f"Replacement entry {index}")
        for replacement in replacements
    ]
    has_discarded = "discarded_ptpimg_blocks" in item
    discarded_count = item.get("discarded_ptpimg_blocks", 0)
    if has_discarded and (type(discarded_count) is not int or discarded_count <= 0):
        raise LstError(f"Replacement entry {index} has an invalid discarded block count")
    replacement_source = replacement_source_description(
        source["description"], len(urls), discarded_count
    )
    expected_description, expected_replacements = replace_ptpimg_blocks(
        replacement_source, urls
    )
    if proposed != expected_description or replacements != expected_replacements:
        raise LstError(f"Replacement entry {index} does not match its source description")
    return item


def load_replacements(path: Path) -> tuple[list[dict[str, Any]], int]:
    """Load successful replacement descriptions and count recorded failures."""

    payload = load_json(path, "replacement output")
    if not isinstance(payload, list):
        raise LstError("replacement output must be a JSON array")
    valid: list[dict[str, Any]] = []
    skipped_failures = 0
    seen_ids: set[str] = set()
    for index, raw_item in enumerate(payload, 1):
        item = validate_replacement(raw_item, index)
        source = raw_item.get("source_torrent") if isinstance(raw_item, dict) else None
        torrent_id = source.get("torrent_id") if isinstance(source, dict) else None
        if isinstance(torrent_id, str):
            if torrent_id in seen_ids:
                raise LstError(f"replacement output contains duplicate torrent ID {torrent_id}")
            seen_ids.add(torrent_id)
        if item is None:
            skipped_failures += 1
        else:
            valid.append(item)
    return valid, skipped_failures


def load_state(path: Path) -> dict[str, dict[str, Any]]:
    """Load prior submission attempts keyed by torrent ID."""

    if not path.exists():
        return {}
    payload = load_json(path, "submission state")
    if not isinstance(payload, list):
        raise LstError("submission state must be a JSON array")
    state: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(payload, 1):
        if not isinstance(item, dict):
            raise LstError(f"submission state entry {index} must be an object")
        torrent_id = required_string(item, "torrent_id", f"submission state entry {index}")
        if torrent_id in state:
            raise LstError(f"submission state contains duplicate torrent ID {torrent_id}")
        if not isinstance(item.get("success"), bool):
            raise LstError(f"submission state entry {index} requires a success boolean")
        state[torrent_id] = item
    return state


def request_current_description(
    session: requests.Session,
    torrent_id: str,
    timeout: float,
) -> str:
    """Fetch the current full description immediately before a possible write."""

    try:
        response = session.get(f"{API_URL}/torrents/{torrent_id}", timeout=timeout)
    except requests.RequestException as error:
        raise LstError(
            f"Torrent {torrent_id} current-description request failed: {type(error).__name__}"
        ) from error
    if response.status_code != 200:
        raise LstError(
            f"Torrent {torrent_id} current-description request returned HTTP {response.status_code}"
        )
    try:
        payload = response.json()
    except ValueError as error:
        raise LstError(f"Torrent {torrent_id} current-description response was not JSON") from error
    record, attributes = torrent_attributes(payload, f"Torrent {torrent_id}")
    raw_id = record.get("id", attributes.get("id", torrent_id))
    if str(raw_id).strip() != torrent_id:
        raise LstError(f"Torrent {torrent_id} current-description response returned a different ID")
    return full_description(payload, f"Torrent {torrent_id}")


def verify_current_description(item: dict[str, Any], current: str) -> None:
    """Refuse a stale proposal or one that no longer reproduces exactly."""

    source = item["source_torrent"]
    torrent_id = source["torrent_id"]
    if current != source["description"]:
        raise LstError(
            f"Torrent {torrent_id} description changed after collection; rerun the pipeline"
        )
    urls = [replacement["lostimg_url"] for replacement in item["replacements"]]
    replacement_source = replacement_source_description(
        current,
        len(urls),
        item.get("discarded_ptpimg_blocks", 0),
    )
    proposed, _replacements = replace_ptpimg_blocks(replacement_source, urls)
    if proposed != item["proposed_description"]:
        raise LstError(f"Torrent {torrent_id} proposal cannot be reproduced from current BBCode")


def submit_change(
    session: requests.Session,
    item: dict[str, Any],
    message: str,
    timeout: float,
) -> dict[str, Any]:
    """POST one full description to LST's review application endpoint."""

    torrent_id = item["source_torrent"]["torrent_id"]
    try:
        response = session.post(
            f"{API_URL}/description-changes/torrents/{torrent_id}",
            json={"description": item["proposed_description"], "message": message},
            timeout=timeout,
        )
    except requests.RequestException as error:
        raise LstError(f"Torrent {torrent_id} submission failed: {type(error).__name__}") from error
    if response.status_code not in {200, 201}:
        raise LstError(f"Torrent {torrent_id} submission returned HTTP {response.status_code}")
    try:
        payload = response.json()
    except ValueError as error:
        raise LstError(f"Torrent {torrent_id} submission returned invalid JSON") from error
    if not isinstance(payload, dict) or payload.get("success") is not True:
        raise LstError(f"Torrent {torrent_id} submission was not accepted")
    return payload


def parse_args() -> argparse.Namespace:
    """Parse replacement input, shared config, dry-run/apply, and state arguments."""

    parser = argparse.ArgumentParser(
        description="Validate or submit LST full-description replacement applications."
    )
    parser.add_argument("input", type=Path, help="JSON from capture_upload_images.py")
    parser.add_argument("config", type=Path, help="JSON config containing lst_api_token")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="POST applications after validation (the default is a read-only dry run)",
    )
    parser.add_argument(
        "--message",
        default=DEFAULT_MESSAGE,
        help=f"Staff note (default: {DEFAULT_MESSAGE!r})",
    )
    parser.add_argument(
        "--state",
        type=Path,
        default=DEFAULT_STATE,
        help=f"Submission state path (default: {DEFAULT_STATE})",
    )
    return parser.parse_args()


def main() -> int:
    """Recheck current descriptions, dry-run by default, and checkpoint writes."""

    args = parse_args()
    try:
        require_distinct_paths(
            [("input", args.input), ("config", args.config), ("state", args.state)]
        )
        replacements, skipped_failures = load_replacements(args.input)
        config = load_config(args.config)
        api_token = required_string(config, "lst_api_token", "Config")
        timeout = number_setting(config, "request_timeout", 30, 1, 300)
        message = args.message.strip()
        if not message:
            raise LstError("message must not be empty")
        state = load_state(args.state)
    except LstError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    ready = 0
    previous_request_started: float | None = None
    with requests.Session() as session:
        session.headers.update(
            {
                "Accept": "application/json",
                "Authorization": f"Bearer {api_token}",
                "User-Agent": "lst-fix-ptpimg-submit/1.0",
            }
        )
        for index, item in enumerate(replacements, 1):
            torrent_id = item["source_torrent"]["torrent_id"]
            if successful_state_matches(state.get(torrent_id), item):
                print(f"[{index}/{len(replacements)}] {torrent_id} already submitted; skipping")
                continue
            print(f"[{index}/{len(replacements)}] {torrent_id} validating current description")
            try:
                previous_request_started = wait_for_request_slot(
                    previous_request_started
                )
                current = request_current_description(session, torrent_id, timeout)
                verify_current_description(item, current)
                ready += 1
                if not args.apply:
                    continue
                previous_request_started = wait_for_request_slot(
                    previous_request_started
                )
                response = submit_change(session, item, message, timeout)
                state[torrent_id] = {
                    "torrent_id": torrent_id,
                    "success": True,
                    "source_description_sha256": item["source_torrent"][
                        "description_sha256"
                    ],
                    "proposed_description_sha256": description_sha256(
                        item["proposed_description"]
                    ),
                    "submitted_at": datetime.now(timezone.utc).isoformat(),
                    "response": response,
                }
            except LstError as error:
                failed = True
                print(f"Error: {error}", file=sys.stderr)
                if args.apply:
                    state[torrent_id] = {
                        "torrent_id": torrent_id,
                        "success": False,
                        "error": str(error),
                    }
            if args.apply:
                try:
                    save_json(args.state, list(state.values()))
                except LstError as error:
                    print(f"Error: {error}", file=sys.stderr)
                    return 2

    if skipped_failures:
        print(f"Skipped {skipped_failures} capture/upload failures", file=sys.stderr)
    if args.apply:
        submitted = sum(result.get("success") is True for result in state.values())
        print(f"Submission state contains {submitted} accepted applications at {args.state}")
    else:
        print(f"Dry run: {ready} applications are current and ready; rerun with --apply to submit")
    return 1 if failed or skipped_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
