#!/usr/bin/env python3
"""Migrate torrents between two qBittorrent clients using Web API.

Features:
- Export .torrent files (including metadata) from source client.
- Inject torrents into destination client.
- Preserve save paths by default.
- Optional categories and tags filtering.

Requires:
  pip install requests

Example:
  python qbittorrent_migrate.py \
    --src-url http://localhost:8080 --src-user admin --src-pass adminadmin \
    --dst-url http://otherhost:8080 --dst-user admin --dst-pass adminadmin \
    --category "movies" --dry-run
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Dict, Iterable, List, Optional

import requests

DEFAULT_TIMEOUT = 30


class QbitClient:
    def __init__(self, base_url: str, username: str, password: str, timeout: int = DEFAULT_TIMEOUT):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.timeout = timeout
        self.session = requests.Session()

    def login(self) -> None:
        resp = self.session.post(
            f"{self.base_url}/api/v2/auth/login",
            data={"username": self.username, "password": self.password},
            timeout=self.timeout,
        )
        if resp.status_code != 200 or resp.text.strip() != "Ok.":
            raise RuntimeError(f"Login failed for {self.base_url}: {resp.status_code} {resp.text}")

    def torrents_info(self, category: Optional[str] = None, tag: Optional[str] = None) -> List[Dict]:
        params = {}
        if category:
            params["category"] = category
        if tag:
            params["tag"] = tag
        resp = self.session.get(
            f"{self.base_url}/api/v2/torrents/info",
            params=params,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def export_torrent(self, torrent_hash: str) -> bytes:
        resp = self.session.get(
            f"{self.base_url}/api/v2/torrents/export",
            params={"hash": torrent_hash},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.content

    def add_torrent(
        self,
        torrent_bytes: bytes,
        save_path: Optional[str],
        category: Optional[str],
        tags: Optional[str],
        paused: Optional[bool],
        skip_check: Optional[bool],
    ) -> None:
        data = {}
        if save_path:
            data["savepath"] = save_path
        if category:
            data["category"] = category
        if tags:
            data["tags"] = tags
        if paused is not None:
            data["paused"] = "true" if paused else "false"
        if skip_check is not None:
            data["skip_checking"] = "true" if skip_check else "false"

        files = {
            "torrents": ("migrated.torrent", torrent_bytes, "application/x-bittorrent"),
        }
        resp = self.session.post(
            f"{self.base_url}/api/v2/torrents/add",
            data=data,
            files=files,
            timeout=self.timeout,
        )
        resp.raise_for_status()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate torrents between qBittorrent instances.")

    parser.add_argument("--src-url", required=True, help="Source qBittorrent base URL, e.g. http://localhost:8080")
    parser.add_argument("--src-user", required=True, help="Source username")
    parser.add_argument("--src-pass", required=True, help="Source password")

    parser.add_argument("--dst-url", required=True, help="Destination qBittorrent base URL")
    parser.add_argument("--dst-user", required=True, help="Destination username")
    parser.add_argument("--dst-pass", required=True, help="Destination password")

    parser.add_argument("--category", help="Only migrate torrents in this category")
    parser.add_argument("--tag", help="Only migrate torrents with this tag")
    parser.add_argument("--paused", action="store_true", help="Add torrents paused on destination")
    parser.add_argument("--skip-check", action="store_true", help="Skip hash checking on destination")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without adding torrents")
    parser.add_argument("--sleep", type=float, default=0.0, help="Seconds to sleep between adds")

    parser.add_argument(
        "--map-savepath",
        action="append",
        default=[],
        help="Map save paths: SRC=DEST. Can be supplied multiple times.",
    )

    return parser.parse_args()


def build_savepath_map(mappings: Iterable[str]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for mapping in mappings:
        if "=" not in mapping:
            raise ValueError("--map-savepath must be in SRC=DEST format")
        src, dst = mapping.split("=", 1)
        src = src.strip()
        dst = dst.strip()
        if not src or not dst:
            raise ValueError("--map-savepath SRC and DEST must be non-empty")
        result[src] = dst
    return result


def map_savepath(save_path: Optional[str], mapping: Dict[str, str]) -> Optional[str]:
    if not save_path or not mapping:
        return save_path
    for src, dst in mapping.items():
        if save_path.startswith(src):
            return save_path.replace(src, dst, 1)
    return save_path


def main() -> int:
    args = parse_args()

    try:
        savepath_map = build_savepath_map(args.map_savepath)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    src = QbitClient(args.src_url, args.src_user, args.src_pass)
    dst = QbitClient(args.dst_url, args.dst_user, args.dst_pass)

    print("Logging into source...")
    src.login()
    print("Logging into destination...")
    dst.login()

    torrents = src.torrents_info(category=args.category, tag=args.tag)
    print(f"Found {len(torrents)} torrents to migrate")

    for idx, t in enumerate(torrents, start=1):
        torrent_hash = t.get("hash")
        name = t.get("name")
        save_path = t.get("save_path")
        category = t.get("category")
        tags = t.get("tags")

        mapped_save_path = map_savepath(save_path, savepath_map)

        display_name = name if isinstance(name, str) and name else "<unknown>"
        print(f"[{idx}/{len(torrents)}] {display_name}")
        if not isinstance(torrent_hash, str) or not torrent_hash:
            print("  ERROR: Missing torrent hash, skipping", file=sys.stderr)
            continue
        if args.dry_run:
            print(
                "  DRY RUN -> add with: "
                f"save_path={mapped_save_path!r}, category={category!r}, tags={tags!r}"
            )
            continue

        try:
            torrent_bytes = src.export_torrent(torrent_hash)
            dst.add_torrent(
                torrent_bytes=torrent_bytes,
                save_path=mapped_save_path,
                category=category,
                tags=tags,
                paused=args.paused,
                skip_check=args.skip_check,
            )
            if args.sleep:
                time.sleep(args.sleep)
        except requests.HTTPError as exc:
            print(f"  ERROR: HTTP error while processing {name}: {exc}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"  ERROR: Failed to process {name}: {exc}", file=sys.stderr)

    print("Done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
