from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from unit3d_ptpimg_torrents import (
    Match,
    Site,
    Unit3dError,
    iter_matches,
    load_sites,
    next_page_params,
    save_matches,
    torrent_file_names,
)


class FakeResponse:
    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self.payload


class FakeSession:
    def __init__(self, payloads: list[dict[str, Any]]) -> None:
        self.payloads = iter(payloads)
        self.calls: list[tuple[str, dict[str, str], float]] = []

    def get(self, url: str, params: dict[str, str], timeout: float) -> FakeResponse:
        self.calls.append((url, dict(params), timeout))
        return FakeResponse(next(self.payloads))


class Unit3dPtpimgTorrentsTest(unittest.TestCase):
    def test_only_keeps_a_root_level_single_filename(self) -> None:
        self.assertEqual(
            torrent_file_names({"folder": None, "files": [{"name": "Movie.mkv"}]}),
            ("Movie.mkv",),
        )
        self.assertEqual(
            torrent_file_names(
                {"folder": "Release.Root", "files": [{"name": "Release.Root/movie.mkv"}]}
            ),
            (),
        )
        self.assertEqual(
            torrent_file_names({"folder": None, "files": [{"name": "Folder/movie.mkv"}]}),
            (),
        )

    def test_loads_api_token_directly_from_config(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "config.unit3d.json"
            config.write_text(
                json.dumps(
                    [
                        {
                            "name": "Aither",
                            "url": "https://aither.cc",
                            "api_token": "secret-token",
                        }
                    ]
                ),
                encoding="utf-8",
            )

            self.assertEqual(
                load_sites(config),
                [Site("Aither", "https://aither.cc", "secret-token")],
            )

    def test_filters_descriptions_and_preserves_filter_across_pages(self) -> None:
        session = FakeSession(
            [
                {
                    "data": [
                        {
                            "id": "12",
                            "attributes": {
                                "name": "Example Movie 2024 1080p BluRay",
                                "folder": None,
                                "files": [
                                    {
                                        "name": "Example.Movie.2024.1080p.BluRay-GROUP.mkv",
                                        "size": 123,
                                    }
                                ],
                                "description": (
                                    "[url=https://ptpimg.me/abc123.png]"
                                    "[img=350]https://ptpimg.me/abc123.png[/img][/url]"
                                    "[url=https://ptpimg.me/abc123-large.png]"
                                    "[img=350]https://ptpimg.me/abc123-large.png[/img][/url]"
                                ),
                                "details_link": "https://aither.cc/torrents/12",
                            },
                        },
                        {"id": "13", "attributes": {"description": "https://example.com/image.png"}},
                    ],
                    "links": {
                        "next": "https://untrusted.invalid/api/torrents/filter?page=2&api_token=secret"
                    },
                },
                {
                    "data": [
                        {
                            "id": "14",
                            "attributes": {
                                "name": "Another Movie 2023 2160p BluRay",
                                "folder": "Another.Movie.2023.2160p.BluRay-GROUP",
                                "files": [
                                    {
                                        "name": "Another.Movie.2023.2160p.BluRay-GROUP/movie.mkv",
                                        "size": 456,
                                    },
                                    {
                                        "name": "Another.Movie.2023.2160p.BluRay-GROUP/sample.mkv",
                                        "size": 78,
                                    },
                                ],
                                "description": (
                                    "[URL=HTTPS://PTPIMG.ME/def456.jpg]"
                                    "[IMG width=1920]HTTPS://PTPIMG.ME/def456.jpg[/IMG][/URL]"
                                ),
                                "details_link": "https://elsewhere.invalid/torrents/14",
                            },
                        },
                        {
                            "id": "12",
                            "attributes": {"description": "https://ptpimg.me/duplicate.webp"},
                        },
                    ],
                    "links": {"next": None},
                },
            ]
        )
        site = Site("Aither", "https://aither.cc", "token")

        matches = list(iter_matches(session, site, "UploaderName"))

        self.assertEqual(
            matches,
            [
                Match(
                    "Aither",
                    "12",
                    "Example Movie 2024 1080p BluRay",
                    "https://aither.cc/torrents/12",
                    (
                        "[url=https://ptpimg.me/abc123.png]"
                        "[img=350]https://ptpimg.me/abc123.png[/img][/url]"
                        "[url=https://ptpimg.me/abc123-large.png]"
                        "[img=350]https://ptpimg.me/abc123-large.png[/img][/url]"
                    ),
                    None,
                    ("Example.Movie.2024.1080p.BluRay-GROUP.mkv",),
                ),
                Match(
                    "Aither",
                    "14",
                    "Another Movie 2023 2160p BluRay",
                    "https://aither.cc/torrents/14",
                    (
                        "[URL=HTTPS://PTPIMG.ME/def456.jpg]"
                        "[IMG width=1920]HTTPS://PTPIMG.ME/def456.jpg[/IMG][/URL]"
                    ),
                    "Another.Movie.2023.2160p.BluRay-GROUP",
                    (),
                ),
            ],
        )
        self.assertEqual(
            session.calls[0][1],
            {"description": "ptpimg", "uploader": "UploaderName", "perPage": "100"},
        )
        self.assertEqual(
            session.calls[1][1],
            {
                "description": "ptpimg",
                "uploader": "UploaderName",
                "perPage": "100",
                "page": "2",
            },
        )
        self.assertEqual({call[0] for call in session.calls}, {"https://aither.cc/api/torrents/filter"})

    def test_uses_last_page_metadata_when_next_link_is_absent(self) -> None:
        self.assertEqual(
            next_page_params({"meta": {"current_page": 2, "last_page": 3}}),
            {"page": "3"},
        )
        self.assertIsNone(next_page_params({"meta": {"current_page": 3, "last_page": 3}}))

    def test_rejects_next_link_without_supported_pagination(self) -> None:
        with self.assertRaises(Unit3dError):
            next_page_params({"links": {"next": "https://aither.cc/api/torrents/filter?offset=100"}})

    def test_saves_json_with_full_image_bbcode(self) -> None:
        match = Match(
            "Aither",
            "12",
            "Example Movie 2024 1080p BluRay",
            "https://aither.cc/torrents/12",
            (
                "[url=https://ptpimg.me/abc123.png]"
                "[img=350]https://ptpimg.me/abc123.png[/img][/url]"
            ),
            None,
            ("Example.Movie.2024.1080p.BluRay-GROUP.mkv",),
        )
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "results.json"
            save_matches(output, [match])

            self.assertEqual(
                json.loads(output.read_text(encoding="utf-8")),
                [
                    {
                        "site": "Aither",
                        "torrent_id": "12",
                        "name": "Example Movie 2024 1080p BluRay",
                        "folder": None,
                        "file_names": ["Example.Movie.2024.1080p.BluRay-GROUP.mkv"],
                        "details_url": "https://aither.cc/torrents/12",
                        "description_bbcode": (
                            "[url=https://ptpimg.me/abc123.png]"
                            "[img=350]https://ptpimg.me/abc123.png[/img][/url]"
                        ),
                    }
                ],
            )


if __name__ == "__main__":
    unittest.main()
