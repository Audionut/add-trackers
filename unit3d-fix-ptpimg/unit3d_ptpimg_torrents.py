#!/usr/bin/env python3
r"""Save UNIT3D torrents whose descriptions contain ptpimg.me image BBCode.

Create an ignored ``config.unit3d.json`` file:

[
  {
    "name": "Aither",
    "url": "https://aither.cc",
    "api_token": "your API token"
  }
]

Then run from PowerShell:

  python .\unit3d-fix-ptpimg\unit3d_ptpimg_torrents.py .\config.unit3d.json --uploader UploaderName --output .\results.json

Each JSON result contains the site, torrent ID, name, folder, a filename only for
single-file torrents, the details URL, and the matching
``[url=...][img...]...[/img][/url]`` blocks concatenated in source order.
Sites with a nonstandard endpoint can set ``api_path`` in their config entry.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import parse_qs, urljoin, urlparse

import requests


DEFAULT_API_PATH = "/api/torrents/filter"
PTPIMG_BBCODE = re.compile(
    r"\[url=https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+\]"
    r"\s*\[img(?:[=\s][^\]]*)?\]\s*"
    r"https?://(?:www\.)?ptpimg\.me/[^\s<>\"'\[\]]+\s*\[/img\]\s*\[/url\]",
    re.IGNORECASE,
)


class Unit3dError(RuntimeError):
    """Raised for invalid configuration or unusable UNIT3D responses."""


@dataclass(frozen=True)
class Site:
    """Connection settings and API credential for one UNIT3D site."""

    name: str
    base_url: str
    api_token: str
    api_path: str = DEFAULT_API_PATH

    @property
    def endpoint(self) -> str:
        """Return the configured torrent-filter API URL."""

        return f"{self.base_url}{self.api_path}"


@dataclass(frozen=True)
class Match:
    """A matching torrent and its complete ptpimg description BBCode."""

    site: str
    torrent_id: str
    name: str
    details_url: str
    description_bbcode: str
    folder: str | None = None
    file_names: tuple[str, ...] = ()


def torrent_file_names(attributes: dict[str, Any]) -> tuple[str, ...]:
    """Return the sole filename, or nothing for multi-file torrents."""

    folder = attributes.get("folder")
    if isinstance(folder, str) and folder.strip():
        return ()

    files = attributes.get("files")
    if not isinstance(files, list) or len(files) != 1:
        return ()

    file = files[0]
    if not isinstance(file, dict):
        return ()
    name = file.get("name")
    if not isinstance(name, str) or not name.strip() or "/" in name or "\\" in name:
        return ()
    return (name.strip(),)


def load_sites(path: Path) -> list[Site]:
    """Load validated sites and their API tokens from a JSON file.

    Raises:
        Unit3dError: If the file, JSON, or site settings are invalid.
    """

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise Unit3dError(f"Cannot read config {path}: {error}") from error
    except json.JSONDecodeError as error:
        raise Unit3dError(f"Invalid JSON in {path}: {error}") from error

    if not isinstance(raw, list) or not raw:
        raise Unit3dError("Config must be a non-empty JSON array of sites")

    sites: list[Site] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise Unit3dError(f"Config entry {index} must be an object")

        name = required_string(item, "name", index)
        base_url = required_string(item, "url", index).rstrip("/")
        api_token = required_string(item, "api_token", index)
        api_path = item.get("api_path", DEFAULT_API_PATH)

        parsed_url = urlparse(base_url)
        if parsed_url.scheme != "https" or not parsed_url.netloc:
            raise Unit3dError(f"Config entry {index} url must be an absolute HTTPS URL")
        if parsed_url.username or parsed_url.password or parsed_url.query or parsed_url.fragment:
            raise Unit3dError(f"Config entry {index} url must not contain credentials, a query, or a fragment")
        if not isinstance(api_path, str) or not api_path.startswith("/"):
            raise Unit3dError(f"Config entry {index} api_path must start with /")

        sites.append(Site(name=name, base_url=base_url, api_token=api_token, api_path=api_path))

    return sites


def required_string(item: dict[str, Any], key: str, index: int) -> str:
    """Return a trimmed, non-empty string from a site configuration entry.

    Raises:
        Unit3dError: If the requested value is absent, empty, or not a string.
    """

    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise Unit3dError(f"Config entry {index} requires a non-empty {key}")
    return value.strip()


def request_page(
    session: requests.Session,
    site: Site,
    params: dict[str, str],
    timeout: float,
) -> dict[str, Any]:
    """Fetch and validate one page from a site's torrent-filter API.

    Raises:
        Unit3dError: If the request fails or the response is not a JSON object.
    """

    try:
        response = session.get(site.endpoint, params=params, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as error:
        raise Unit3dError(f"{site.name}: request failed: {error}") from error

    try:
        payload = response.json()
    except ValueError as error:
        raise Unit3dError(f"{site.name}: API returned invalid JSON") from error

    if not isinstance(payload, dict):
        raise Unit3dError(f"{site.name}: API response must be a JSON object")
    return payload


def next_page_params(payload: dict[str, Any]) -> dict[str, str] | None:
    """Return the next page or cursor parameters, or ``None`` at the last page.

    ``links.next`` is preferred; older current-page/last-page metadata is used
    when no next link is present.

    Raises:
        Unit3dError: If a next link lacks a supported pagination parameter.
    """

    links = payload.get("links")
    next_url = links.get("next") if isinstance(links, dict) else None

    if isinstance(next_url, str) and next_url:
        query = parse_qs(urlparse(next_url).query)
        paging = {key: values[-1] for key in ("page", "cursor") if (values := query.get(key))}
        if paging:
            return paging
        raise Unit3dError("API supplied a next-page link without a page or cursor parameter")

    meta = payload.get("meta")
    if isinstance(meta, dict):
        try:
            current_page = int(meta["current_page"])
            last_page = int(meta["last_page"])
        except (KeyError, TypeError, ValueError):
            return None
        if current_page < last_page:
            return {"page": str(current_page + 1)}

    return None


def iter_api_records(
    session: requests.Session,
    site: Site,
    uploader: str,
    timeout: float,
) -> Iterator[dict[str, Any]]:
    """Yield torrent records from every API page for one uploader.

    The uploader and ptpimg description filters are reapplied to each page.

    Raises:
        Unit3dError: If pagination repeats or a response has an invalid shape.
    """

    base_params = {"description": "ptpimg", "uploader": uploader, "perPage": "100"}
    params = dict(base_params)
    seen_pages: set[tuple[tuple[str, str], ...]] = set()

    while True:
        marker = tuple(sorted(params.items()))
        if marker in seen_pages:
            raise Unit3dError(f"{site.name}: API repeated a pagination link")
        seen_pages.add(marker)

        payload = request_page(session, site, params, timeout)
        records = payload.get("data")
        if not isinstance(records, list):
            raise Unit3dError(f"{site.name}: API response is missing a data array")

        for record in records:
            if not isinstance(record, dict):
                raise Unit3dError(f"{site.name}: API returned a non-object torrent record")
            yield record

        paging = next_page_params(payload)
        if paging is None:
            return
        params = base_params | paging


def iter_matches(
    session: requests.Session,
    site: Site,
    uploader: str,
    timeout: float = 30,
) -> Iterator[Match]:
    """Yield unique torrents containing linked ptpimg image BBCode.

    Duplicate records are suppressed by torrent ID within the site scan.

    Raises:
        Unit3dError: If a torrent record lacks required attributes or an ID.
    """

    seen_ids: set[str] = set()

    for record in iter_api_records(session, site, uploader, timeout):
        attributes = record.get("attributes")
        if not isinstance(attributes, dict):
            raise Unit3dError(f"{site.name}: torrent record is missing attributes")

        description = attributes.get("description")
        description_bbcode = (
            "".join(match.group(0) for match in PTPIMG_BBCODE.finditer(description))
            if isinstance(description, str)
            else ""
        )
        if not description_bbcode:
            continue

        raw_id = record.get("id") or attributes.get("id") or attributes.get("torrent_id")
        if raw_id is None or not str(raw_id).strip():
            raise Unit3dError(f"{site.name}: matching torrent record is missing an id")

        torrent_id = str(raw_id).strip()
        if torrent_id in seen_ids:
            continue
        seen_ids.add(torrent_id)

        name = attributes.get("name")
        if not isinstance(name, str) or not name.strip():
            raise Unit3dError(f"{site.name}: matching torrent record is missing a name")

        raw_folder = attributes.get("folder")
        folder = raw_folder.strip() if isinstance(raw_folder, str) and raw_folder.strip() else None
        details_url = site_details_url(site, torrent_id, attributes.get("details_link"))
        yield Match(
            site=site.name,
            torrent_id=torrent_id,
            name=name.strip(),
            details_url=details_url,
            description_bbcode=description_bbcode,
            folder=folder,
            file_names=torrent_file_names(attributes),
        )


def site_details_url(site: Site, torrent_id: str, api_url: Any) -> str:
    """Return a same-site HTTPS details URL or the standard torrent route."""

    fallback = f"{site.base_url}/torrents/{torrent_id}"
    if not isinstance(api_url, str) or not api_url.strip():
        return fallback

    candidate = urljoin(f"{site.base_url}/", api_url.strip())
    configured = urlparse(site.base_url)
    parsed_candidate = urlparse(candidate)
    if parsed_candidate.scheme == "https" and parsed_candidate.netloc == configured.netloc:
        return candidate
    return fallback


def save_matches(path: Path, matches: list[Match]) -> None:
    """Write matches as indented UTF-8 JSON.

    Raises:
        Unit3dError: If the output file cannot be written.
    """

    payload = [
        {
            "site": match.site,
            "torrent_id": match.torrent_id,
            "name": match.name,
            "folder": match.folder,
            "file_names": list(match.file_names),
            "details_url": match.details_url,
            "description_bbcode": match.description_bbcode,
        }
        for match in matches
    ]
    try:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as error:
        raise Unit3dError(f"Cannot write results to {path}: {error}") from error


def parse_args() -> argparse.Namespace:
    """Parse the site config, uploader, and JSON output arguments."""

    parser = argparse.ArgumentParser(
        description="Save UNIT3D torrents with ptpimg.me image BBCode to JSON."
    )
    parser.add_argument("config", type=Path, help="JSON site config containing each site's API token")
    parser.add_argument("--uploader", required=True, help="Only search torrents uploaded by this username")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("unit3d_ptpimg_results.json"),
        help="JSON output path (default: unit3d_ptpimg_results.json)",
    )
    return parser.parse_args()


def main() -> int:
    """Scan configured sites, save collected matches, and return an exit code.

    Returns:
        ``0`` when all sites succeed, ``1`` when partial results are saved after
        a site failure, or ``2`` when configuration or output handling fails.
    """

    args = parse_args()
    try:
        sites = load_sites(args.config)
    except Unit3dError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    failed = False
    matches: list[Match] = []
    for site in sites:
        try:
            with requests.Session() as session:
                session.headers.update(
                    {
                        "Accept": "application/json",
                        "Authorization": f"Bearer {site.api_token}",
                        "User-Agent": "unit3d-ptpimg-torrents/1.0",
                    }
                )
                matches.extend(iter_matches(session, site, args.uploader))
        except Unit3dError as error:
            failed = True
            print(f"Error: {error}", file=sys.stderr)

    try:
        save_matches(args.output, matches)
    except Unit3dError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    print(f"Saved {len(matches)} matching torrents to {args.output}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
