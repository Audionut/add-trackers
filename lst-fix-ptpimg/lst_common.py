"""Shared validation and BBCode helpers for the LST replacement scripts."""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


PTPIMG_URL = re.compile(
    r"https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+",
    re.IGNORECASE,
)
LINKED_PTPIMG = re.compile(
    r"\[url\s*=\s*(?:\"|')?https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+"
    r"(?:\"|')?\s*\]\s*"
    r"\[img(?:[=\s][^\]]*)?\]\s*"
    r"https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+\s*"
    r"\[/img\]\s*\[/url\]",
    re.IGNORECASE,
)
BARE_PTPIMG = re.compile(
    r"\[img(?:[=\s][^\]]*)?\]\s*"
    r"https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+\s*\[/img\]",
    re.IGNORECASE,
)
COMPARISON_BLOCK = re.compile(
    r"\[comparison(?:[=\s][^\]]*)?\].*?\[/comparison\]",
    re.IGNORECASE | re.DOTALL,
)


class LstError(RuntimeError):
    """Raised for invalid inputs, unsafe replacements, or remote failures."""


def wait_for_request_slot(previous_started: float | None) -> float:
    """Wait until two seconds after the previous LST API request started."""

    now = time.monotonic()
    if previous_started is not None:
        delay = 2.0 - (now - previous_started)
        if delay > 0:
            time.sleep(delay)
            now = time.monotonic()
    return now


@dataclass(frozen=True)
class PtpimgBlock:
    """One replaceable PTPImg image block and its span in a description."""

    start: int
    end: int
    text: str


def load_json(path: Path, label: str) -> Any:
    """Read one UTF-8 JSON file."""

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise LstError(f"Cannot read {label} {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise LstError(f"Invalid JSON in {label} {path}: {error}") from error


def save_json(path: Path, payload: Any) -> None:
    """Atomically write indented UTF-8 JSON."""

    temporary = path.with_name(f".{path.name}.tmp")
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
    except OSError as error:
        raise LstError(f"Cannot write output {path}: {error}") from error


def require_distinct_paths(named_paths: list[tuple[str, Path]]) -> None:
    """Reject path aliases that could overwrite an input, config, or other output."""

    resolved: list[tuple[str, Path, str]] = []
    for label, path in named_paths:
        try:
            canonical = path.resolve(strict=False)
        except (OSError, RuntimeError) as error:
            raise LstError(f"Cannot resolve {label} path {path}: {error}") from error
        key = os.path.normcase(str(canonical))
        for previous_label, previous_path, previous_key in resolved:
            try:
                same_file = (
                    canonical.exists()
                    and previous_path.exists()
                    and canonical.samefile(previous_path)
                )
            except OSError as error:
                raise LstError(
                    f"Cannot compare {label} path {path} with {previous_label}: {error}"
                ) from error
            if key == previous_key or same_file:
                raise LstError(f"{label} path must differ from {previous_label}: {path}")
        resolved.append((label, canonical, key))


def load_config(path: Path) -> dict[str, Any]:
    """Load a JSON object shared by the LST scripts."""

    payload = load_json(path, "config")
    if not isinstance(payload, dict):
        raise LstError("Config must be a JSON object")
    return payload


def required_string(payload: dict[str, Any], key: str, context: str) -> str:
    """Return one trimmed non-empty string."""

    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise LstError(f"{context} requires a non-empty {key}")
    return value.strip()


def number_setting(
    payload: dict[str, Any],
    key: str,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    """Return one bounded numeric setting."""

    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise LstError(f"{key} must be a number")
    result = float(value)
    if not minimum <= result <= maximum:
        raise LstError(f"{key} must be from {minimum:g} to {maximum:g}")
    return result


def integer_setting(
    payload: dict[str, Any],
    key: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    """Return one bounded integer setting."""

    value = payload.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise LstError(f"{key} must be an integer from {minimum} to {maximum}")
    return value


def find_ptpimg_blocks(description: str) -> list[PtpimgBlock]:
    """Find linked or bare PTPImg image BBCode outside comparison blocks."""

    comparisons = [match.span() for match in COMPARISON_BLOCK.finditer(description)]

    def in_comparison(start: int, end: int) -> bool:
        return any(start >= left and end <= right for left, right in comparisons)

    linked = [
        PtpimgBlock(match.start(), match.end(), match.group(0))
        for match in LINKED_PTPIMG.finditer(description)
        if not in_comparison(match.start(), match.end())
    ]
    linked_spans = [(block.start, block.end) for block in linked]
    bare = [
        PtpimgBlock(match.start(), match.end(), match.group(0))
        for match in BARE_PTPIMG.finditer(description)
        if not in_comparison(match.start(), match.end())
        and not any(match.start() >= left and match.end() <= right for left, right in linked_spans)
    ]
    return sorted(linked + bare, key=lambda block: block.start)


def replacement_source_description(
    description: str,
    replacement_count: int,
    discarded_count: int = 0,
) -> str:
    """Remove trailing replaceable blocks while preserving comparisons and other BBCode."""

    if (
        type(replacement_count) is not int
        or replacement_count < 0
        or type(discarded_count) is not int
        or discarded_count < 0
        or (discarded_count > 0 and replacement_count == 0)
    ):
        raise LstError("PTPImg replacement and discarded counts are invalid")
    blocks = find_ptpimg_blocks(description)
    if replacement_count + discarded_count != len(blocks):
        raise LstError(
            f"Description has {len(blocks)} replaceable PTPImg blocks but "
            f"{replacement_count} replacements and {discarded_count} discarded blocks"
        )
    if discarded_count == 0:
        return description

    pieces: list[str] = []
    position = 0
    for block in blocks[replacement_count:]:
        pieces.append(description[position : block.start])
        position = block.end
    pieces.append(description[position:])
    return "".join(pieces)


def lostimg_url(value: Any) -> str:
    """Validate one public LostImg HTTPS URL before embedding it in BBCode."""

    candidate = image_host_url(value, "LostImg")
    parsed = urlparse(candidate)
    if (
        parsed.scheme != "https"
        or (parsed.hostname or "").casefold() not in {"lostimg.cc", "www.lostimg.cc"}
    ):
        raise LstError("LostImg returned an invalid public URL")
    return candidate


def image_host_url(value: Any, context: str) -> str:
    """Validate an HTTP image-host URL before embedding it in BBCode."""

    if not isinstance(value, str) or not value.strip():
        raise LstError(f"{context} returned an empty URL")
    candidate = value.strip()
    if any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in candidate
    ) or any(character in candidate for character in "[]<>\"'"):
        raise LstError(f"{context} returned an invalid public URL")
    parsed = urlparse(candidate)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or not parsed.path.strip("/")
    ):
        raise LstError(f"{context} returned an invalid public URL")
    return candidate


def replace_ptpimg_blocks_with_links(
    description: str,
    replacement_links: list[tuple[str, str]],
) -> str:
    """Replace PTPImg blocks with viewer/raw URL pairs from a normal image host."""

    blocks = find_ptpimg_blocks(description)
    if len(blocks) != len(replacement_links):
        raise LstError(
            f"Description has {len(blocks)} replaceable PTPImg blocks but "
            f"{len(replacement_links)} image-host links were supplied"
        )
    links = [
        (
            image_host_url(web_url, "Image host viewer"),
            image_host_url(raw_url, "Image host image"),
        )
        for web_url, raw_url in replacement_links
    ]
    pieces: list[str] = []
    position = 0
    for block, (web_url, raw_url) in zip(blocks, links):
        linked = LINKED_PTPIMG.fullmatch(block.text) is not None
        occurrence = 0

        def replacement(_match: re.Match[str]) -> str:
            nonlocal occurrence
            url = web_url if linked and occurrence == 0 else raw_url
            occurrence += 1
            return url

        pieces.extend(
            (description[position : block.start], PTPIMG_URL.sub(replacement, block.text))
        )
        position = block.end
    pieces.append(description[position:])
    proposed = "".join(pieces)
    if find_ptpimg_blocks(proposed):
        raise LstError("Normal-host description still contains replaceable PTPImg BBCode")
    return proposed


def replace_ptpimg_blocks(
    description: str,
    replacement_urls: list[str],
) -> tuple[str, list[dict[str, str]]]:
    """Replace each eligible PTPImg block one-for-one while preserving other BBCode."""

    blocks = find_ptpimg_blocks(description)
    if len(blocks) != len(replacement_urls):
        raise LstError(
            f"Description has {len(blocks)} replaceable PTPImg blocks but "
            f"{len(replacement_urls)} LostImg URLs were supplied"
        )

    urls = [lostimg_url(url) for url in replacement_urls]
    pieces: list[str] = []
    replacements: list[dict[str, str]] = []
    position = 0
    for block, url in zip(blocks, urls):
        replacement = PTPIMG_URL.sub(lambda _match: url, block.text)
        pieces.extend((description[position : block.start], replacement))
        replacements.append(
            {
                "existing_bbcode": block.text,
                "replacement_bbcode": replacement,
                "lostimg_url": url,
            }
        )
        position = block.end
    pieces.append(description[position:])
    proposed = "".join(pieces)
    if find_ptpimg_blocks(proposed):
        raise LstError("Proposed description still contains replaceable PTPImg BBCode")
    return proposed, replacements


def description_sha256(description: str) -> str:
    """Return a stable fingerprint for stale-description and resume checks."""

    return hashlib.sha256(description.encode("utf-8")).hexdigest()


def validate_source_torrent(item: Any, context: str) -> dict[str, Any]:
    """Validate one LST collector record and its full-description invariants."""

    if not isinstance(item, dict):
        raise LstError(f"{context} must be an object")
    if required_string(item, "site", context).casefold() != "lst":
        raise LstError(f"{context} must belong to LST")
    required_string(item, "torrent_id", context)
    required_string(item, "name", context)
    required_string(item, "details_url", context)
    description = item.get("description")
    if not isinstance(description, str):
        raise LstError(f"{context} is missing the full description")
    if item.get("description_sha256") != description_sha256(description):
        raise LstError(f"{context} description fingerprint does not match")
    blocks = item.get("ptpimg_blocks")
    expected = [block.text for block in find_ptpimg_blocks(description)]
    if blocks != expected or not expected:
        raise LstError(f"{context} PTPImg blocks do not match its full description")
    return item


def torrent_attributes(payload: Any, context: str) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return a torrent API record and its attributes from supported JSON:API shapes."""

    if not isinstance(payload, dict):
        raise LstError(f"{context} response must be a JSON object")
    raw_record = payload.get("data", payload)
    if not isinstance(raw_record, dict):
        raise LstError(f"{context} response is missing a torrent object")
    raw_attributes = raw_record.get("attributes", raw_record)
    if not isinstance(raw_attributes, dict):
        raise LstError(f"{context} response is missing torrent attributes")
    return raw_record, raw_attributes


def full_description(payload: Any, context: str) -> str:
    """Extract the required full BBCode description from a torrent API response."""

    record, attributes = torrent_attributes(payload, context)
    value = attributes.get("description", record.get("description"))
    if not isinstance(value, str):
        raise LstError(f"{context} response does not include the full description")
    return value
