from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qui_match_torrents import (
    QuiError,
    extract_comment_links,
    format_results,
    load_source_groups,
    match_source_groups,
    search_source_group,
    search_torrents,
    source_name_candidates,
)


class FakeResponse:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> Any:
        return self.payload


class FakeSession:
    def __init__(self, payloads: list[Any]) -> None:
        self.payloads = iter(payloads)
        self.calls: list[tuple[str, dict[str, str], float]] = []

    def get(self, url: str, params: dict[str, str], timeout: float) -> FakeResponse:
        self.calls.append((url, dict(params), timeout))
        return FakeResponse(next(self.payloads))


class QuiMatchTorrentsTest(unittest.TestCase):
    def test_gates_legacy_file_lists_while_loading_source_json(self) -> None:
        entries = [
            {
                "site": "Aither",
                "torrent_id": "1",
                "name": "Disc Release",
                "details_url": "https://aither.cc/torrents/1",
                "description_bbcode": "[url=https://ptpimg.me/a.png][img]https://ptpimg.me/a.png[/img][/url]",
                "file_names": ["BDMV/index.bdmv", "BDMV/STREAM/00000.m2ts"],
            },
            {
                "site": "Blutopia",
                "torrent_id": "2",
                "name": "Single Release",
                "details_url": "https://blutopia.cc/torrents/2",
                "file_names": ["Single.Release.mkv"],
            },
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            path.write_text(json.dumps(entries), encoding="utf-8")

            groups = load_source_groups(path)

        self.assertEqual(groups[0]["source_torrents"][0]["file_names"], [])
        self.assertEqual(groups[0]["source_torrents"][0]["name"], "Disc Release")
        self.assertEqual(
            groups[0]["source_torrents"][0]["description_bbcode"],
            "[url=https://ptpimg.me/a.png][img]https://ptpimg.me/a.png[/img][/url]",
        )
        self.assertEqual(
            groups[1]["source_torrents"][0]["file_names"],
            ["Single.Release.mkv"],
        )

    def test_paginates_through_all_filtered_search_results(self) -> None:
        session = FakeSession(
            [
                {
                    "torrents": [
                        {"hash": "A", "name": "First", "content_path": "D:/TV/First"},
                        {"hash": "B", "name": "Second", "content_path": "D:/TV/Second"},
                    ],
                    "total": 3,
                    "hasMore": True,
                },
                {
                    "torrents": [
                        {"hash": "C", "name": "Third", "content_path": "D:/TV/Third"}
                    ],
                    "total": 3,
                    "hasMore": False,
                },
            ]
        )

        torrents = search_torrents(
            session,
            "http://localhost:7476/proxy/key",
            "Example Movie",
            page_size=2,
        )

        self.assertEqual([torrent["hash"] for torrent in torrents], ["A", "B", "C"])
        self.assertTrue(session.calls[0][0].endswith("/api/v2/torrents/search"))
        self.assertEqual(session.calls[0][1]["search"], "Example Movie")
        self.assertEqual(session.calls[0][1]["filter"], "unregistered,tracker_down")
        self.assertEqual(session.calls[0][1]["offset"], "0")
        self.assertEqual(session.calls[1][1]["offset"], "2")

    def test_preserves_each_exact_source_name_in_a_normalized_group(self) -> None:
        entries = [
            {
                "site": "Aither",
                "torrent_id": "1",
                "name": "Movie Name 2024",
                "details_url": "https://aither.cc/torrents/1",
            },
            {
                "site": "LST",
                "torrent_id": "2",
                "name": "Movie.Name.2024",
                "details_url": "https://lst.gg/torrents/2",
            },
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            path.write_text(json.dumps(entries), encoding="utf-8")

            groups = load_source_groups(path)

        self.assertEqual(len(groups), 1)
        self.assertEqual(
            [source["name"] for source in groups[0]["source_torrents"]],
            ["Movie Name 2024", "Movie.Name.2024"],
        )

    def test_rejects_search_object_without_torrents_field(self) -> None:
        with self.assertRaises(QuiError):
            search_torrents(
                FakeSession([{}]),
                "http://localhost:7476/proxy/key",
                "Example Movie",
            )

    def test_matches_spaced_unit3d_name_to_dotted_single_file(self) -> None:
        name = "Even Lambs Have Teeth 2015 1080p BluRay REMUX AVC DTS-HD MA 5.1-PmP"
        file_name = "Even.Lambs.Have.Teeth.2015.1080p.BluRay.Remux.AVC.DTS-HD.MA.5.1-PmP.mkv"
        group = {
            "name": name,
            "source_torrents": [
                {
                    "site": "Aither",
                    "torrent_id": "12",
                    "details_url": "https://aither.cc/torrents/12",
                    "file_names": [file_name],
                }
            ],
        }

        matches = match_source_groups(
            [group],
            [
                {
                    "hash": "aaa",
                    "name": file_name,
                    "content_path": rf"D:\Movies\{file_name}",
                    "comment": "https://blutopia.cc/torrents/34",
                }
            ],
        )
        results = format_results(matches, {})

        self.assertEqual(source_name_candidates(group), [name])
        self.assertEqual(results[0]["client_matches"][0]["hash"], "aaa")
        self.assertEqual(
            results[0]["client_matches"][0]["content_path"],
            rf"D:\Movies\{file_name}",
        )
        self.assertEqual(results[0]["other_site_links"], ["https://blutopia.cc/torrents/34"])

    def test_uses_folder_or_distinct_single_file_as_additional_search_terms(self) -> None:
        group = {
            "name": "Display Name",
            "source_torrents": [
                {"folder": "Release.Folder", "file_names": ["Actual.File.Name.mkv"]},
                {"folder": "Release.Folder", "file_names": ["one.mkv", "two.mkv"]},
            ],
        }

        self.assertEqual(
            source_name_candidates(group),
            ["Display Name", "Release.Folder", "Actual.File.Name.mkv"],
        )

    def test_replaces_brackets_before_searching_like_upload_assistant(self) -> None:
        session = FakeSession([{"torrents": None, "total": 0, "hasMore": False}])

        search_source_group(
            session,
            "http://localhost:7476/proxy/key",
            {"name": "Movie [2024]", "source_torrents": []},
        )

        self.assertEqual(session.calls[0][1]["search"], "Movie .2024.")

    def test_matches_extensionless_name_and_other_torrents_on_same_path(self) -> None:
        release = "Storage.Wars.S18E07.The.Skeet.Smell.of.Success.1080p.HULU.WEB-DL.AAC2.0.H.264-RAWR"
        content_path = rf"D:\TV\{release}.mkv"
        source_groups = [
            {
                "name": release,
                "source_torrents": [
                    {
                        "site": "Aither",
                        "torrent_id": "12",
                        "details_url": "https://aither.cc/torrents/12",
                    }
                ],
            }
        ]
        torrents = [
            {"hash": "aaa", "name": f"{release}.mkv", "content_path": content_path},
            {"hash": "bbb", "name": "Other.Site.Release.Name.mkv", "content_path": content_path},
            {"hash": "ccc", "name": "Unrelated.mkv", "content_path": r"D:\TV\Unrelated.mkv"},
        ]

        matches = match_source_groups(source_groups, torrents)
        results = format_results(
            matches,
            {
                "aaa": "https://aither.cc/torrents/12",
                "bbb": "https://blutopia.cc/torrents/34",
            },
        )

        self.assertEqual(
            [match["hash"] for match in results[0]["client_matches"]],
            ["bbb", "aaa"],
        )
        self.assertEqual(
            {match["content_path"] for match in results[0]["client_matches"]},
            {content_path},
        )
        self.assertEqual(
            results[0]["other_site_links"],
            ["https://blutopia.cc/torrents/34"],
        )

    def test_extracts_detail_links_without_exposing_announce_credentials(self) -> None:
        comment = (
            "https://aither.cc/torrents/12 "
            "https://alice:secret@example.com/torrents/12 "
            "https://tracker.example/announce?passkey=secret "
            "https://example.com/download?authkey=secret"
        )

        self.assertEqual(extract_comment_links(comment), ["https://aither.cc/torrents/12"])


if __name__ == "__main__":
    unittest.main()
