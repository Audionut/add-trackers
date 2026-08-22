from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import qui_match_torrents as qui
from qui_match_torrents import (
    MATCH_SCHEMA_VERSION,
    QuiError,
    direct_match_evidence,
    enrich_torrent,
    extract_comment_links,
    filtered_release_term,
    fuzzy_release_score,
    load_source_groups,
    match_group,
    result_for_group,
    search_torrents,
    source_name_candidates,
    source_search_terms,
)


class FakeResponse:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> Any:
        return self.payload


class PagedSession:
    def __init__(self, payloads: list[Any]) -> None:
        self.payloads = iter(payloads)
        self.calls: list[dict[str, str]] = []

    def get(self, _url: str, params: dict[str, str], timeout: float) -> FakeResponse:
        self.calls.append(dict(params))
        return FakeResponse(next(self.payloads))


class QuiSession:
    def __init__(
        self,
        search_results: list[dict[str, Any]],
        *,
        comments: dict[str, str] | None = None,
        files: dict[str, list[str]] | None = None,
        trackers: dict[str, list[str]] | None = None,
    ) -> None:
        self.search_results = search_results
        self.comments = comments or {}
        self.files = files or {}
        self.trackers = trackers or {}
        self.calls: list[tuple[str, dict[str, str]]] = []

    def get(self, url: str, params: dict[str, str], timeout: float) -> FakeResponse:
        endpoint = url.rsplit("/", 1)[-1]
        self.calls.append((endpoint, dict(params)))
        if endpoint == "search":
            return FakeResponse(
                {
                    "torrents": self.search_results,
                    "total": len(self.search_results),
                    "hasMore": False,
                }
            )
        torrent_hash = params["hash"].casefold()
        if endpoint == "properties":
            return FakeResponse({"comment": self.comments.get(torrent_hash, "")})
        if endpoint == "files":
            return FakeResponse(
                [{"name": name} for name in self.files.get(torrent_hash, [])]
            )
        if endpoint == "trackers":
            return FakeResponse(
                [{"url": value} for value in self.trackers.get(torrent_hash, [])]
            )
        raise AssertionError(f"Unexpected qui endpoint: {endpoint}")


class ManagedSession:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}

    def __enter__(self) -> ManagedSession:
        return self

    def __exit__(self, *_args: Any) -> None:
        return None


def source(
    *,
    torrent_id: str = "12",
    name: str = "Movie Name 2024 1080p WEB-DL-GROUP",
    site: str = "Aither",
    host: str = "aither.cc",
    file_names: list[str] | None = None,
    folder: str | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "site": site,
        "torrent_id": torrent_id,
        "name": name,
        "details_url": f"https://{host}/torrents/{torrent_id}",
        "description_bbcode": (
            "[url=https://ptpimg.me/a.png][img]https://ptpimg.me/a.png[/img][/url]"
        ),
        "file_names": file_names if file_names is not None else [],
    }
    if folder is not None:
        item["folder"] = folder
    return item


def source_group(
    *,
    torrent_id: str = "12",
    name: str = "Movie Name 2024 1080p WEB-DL-GROUP",
    file_names: list[str] | None = None,
    folder: str | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "source_torrents": [
            source(
                torrent_id=torrent_id,
                name=name,
                file_names=file_names,
                folder=folder,
            )
        ],
    }


def prepared_torrent(**overrides: Any) -> dict[str, Any]:
    item: dict[str, Any] = {
        "hash": "a",
        "name": "Movie.Name.2024.1080p.WEB-DL-GROUP.mkv",
        "content_path": r"D:\Movies\Movie.Name.2024.1080p.WEB-DL-GROUP.mkv",
        "comment": "",
        "file_names": ["Movie.Name.2024.1080p.WEB-DL-GROUP.mkv"],
        "tracker_urls": ["https://tracker.aither.cc/announce/private"],
    }
    item.update(overrides)
    return item


class QuiMatchTorrentsTest(unittest.TestCase):
    def test_gates_legacy_file_lists_while_loading_source_json(self) -> None:
        entries = [
            {
                **source(name="Disc Release"),
                "file_names": ["BDMV/index.bdmv", "BDMV/STREAM/00000.m2ts"],
            },
            source(
                torrent_id="2",
                name="Single Release",
                site="Blutopia",
                host="blutopia.cc",
                file_names=["Single.Release.mkv"],
            ),
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            path.write_text(json.dumps(entries), encoding="utf-8")
            groups = load_source_groups(path)

        self.assertEqual(groups[0]["source_torrents"][0]["file_names"], [])
        self.assertEqual(groups[0]["source_torrents"][0]["name"], "Disc Release")
        self.assertIn(
            "description_bbcode",
            groups[0]["source_torrents"][0],
        )
        self.assertEqual(
            groups[1]["source_torrents"][0]["file_names"],
            ["Single.Release.mkv"],
        )

    def test_preserves_each_exact_source_name_in_a_normalized_group(self) -> None:
        entries = [
            source(torrent_id="1", name="Movie Name 2024"),
            source(
                torrent_id="2",
                name="Movie.Name.2024",
                site="LST",
                host="lst.gg",
            ),
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"
            path.write_text(json.dumps(entries), encoding="utf-8")
            groups = load_source_groups(path)

        self.assertEqual(len(groups), 1)
        self.assertEqual(
            [item["name"] for item in groups[0]["source_torrents"]],
            ["Movie Name 2024", "Movie.Name.2024"],
        )

    def test_search_paginates_and_keeps_qbittorrent_filter(self) -> None:
        session = PagedSession(
            [
                {
                    "torrents": [
                        {"hash": "A", "name": "One", "content_path": "D:/One"}
                    ],
                    "total": 2,
                    "hasMore": True,
                },
                {
                    "torrents": [
                        {"hash": "B", "name": "Two", "content_path": "D:/Two"}
                    ],
                    "total": 2,
                    "hasMore": False,
                },
            ]
        )

        results = search_torrents(
            session,
            "http://localhost:7476/proxy/key",
            "Movie",
            page_size=1,
        )

        self.assertEqual([result["hash"] for result in results], ["A", "B"])
        self.assertEqual(session.calls[0]["filter"], "unregistered,tracker_down")
        self.assertEqual([call["offset"] for call in session.calls], ["0", "1"])

    def test_uses_release_folder_and_distinct_single_file_as_candidates(self) -> None:
        group = {
            "name": "Display Name",
            "source_torrents": [
                {
                    "name": "Display Name",
                    "folder": "Release.Folder",
                    "file_names": ["Actual.File.Name.mkv"],
                },
                {
                    "name": "Display Name",
                    "folder": "Release.Folder",
                    "file_names": ["one.mkv", "two.mkv"],
                },
            ],
        }

        self.assertEqual(
            source_name_candidates(group),
            [
                "Display Name",
                "Release.Folder",
                "Actual.File.Name.mkv",
                "one.mkv",
                "two.mkv",
            ],
        )

    def test_disc_search_adds_title_year_and_sanitizes_symbols(self) -> None:
        group = source_group(name="Pakeezah [1972] ★ NTSC DVD9 DD 5.1")

        self.assertEqual(filtered_release_term(group["name"]), "pakeezah 1972")
        terms = source_search_terms(group)
        self.assertIn("Pakeezah .1972.  NTSC DVD9 DD 5.1", terms)
        self.assertIn("pakeezah 1972", terms)
        self.assertTrue(all("★" not in term for term in terms))

    def test_fuzzy_disc_name_requires_source_tracker_evidence(self) -> None:
        group = source_group(name="Pakeezah 1972 NTSC DVD9 DD 5.1")
        torrent = prepared_torrent(
            name="Pakeezah.1972.Shemaroo.DVD9.Untouched",
            content_path=r"D:\Discs\Pakeezah",
            file_names=["VIDEO_TS/VIDEO_TS.IFO"],
        )

        reasons, score = direct_match_evidence(group, torrent)

        self.assertIn("fuzzy_name_with_source_tracker", reasons)
        self.assertGreaterEqual(score, 0.56)
        torrent["tracker_urls"] = ["https://tracker.example/announce"]
        reasons, _score = direct_match_evidence(group, torrent)
        self.assertEqual(reasons, [])

    def test_comment_id_and_single_filename_are_strong_matches(self) -> None:
        group = source_group(
            torrent_id="175387",
            file_names=["Movie.Name.2024.mkv"],
        )
        torrent = prepared_torrent(
            name="Completely.Different.Client.Name",
            comment="Imported from http://www.aither.cc/torrents/175387/?foo=bar",
            file_names=["Movie.Name.2024.mkv"],
            tracker_urls=["https://tracker.example/announce"],
        )

        reasons, _score = direct_match_evidence(group, torrent)

        self.assertIn("source_comment_id", reasons)
        self.assertIn("exact_filename", reasons)

    def test_fuzzy_name_rejects_conflicting_identity_or_format(self) -> None:
        cases = [
            (
                "Pakeezah 1972 NTSC DVD9 DD 5.1",
                "Pakeezah.1973.Shemaroo.DVD9.Untouched",
            ),
            ("Up 2009 1080p BluRay", "Step.Up.2009.1080p.BluRay"),
            ("Pakeezah 1972 NTSC DVD9", "Pakeezah.1972.PAL.DVD9"),
            (
                "Example 2024 1080p BluRay BD50",
                "Example.2024.1080p.BluRay.REMUX",
            ),
            (
                "Example 2024 1080p BluRay REMUX",
                "Example.2024.1080p.BluRay.Untouched",
            ),
        ]
        for source_name, client_name in cases:
            with self.subTest(client_name=client_name):
                self.assertIsNone(fuzzy_release_score(source_name, client_name))
        self.assertIsNotNone(
            fuzzy_release_score(
                "Example 2024 1080p BluRay BD50 REMUX",
                "Example.2024.1080p.BluRay.BD50.REMUX",
            )
        )

    def test_match_retains_every_torrent_sharing_the_content_path(self) -> None:
        group = source_group(
            torrent_id="175387",
            name="Pakeezah 1972 NTSC DVD9 DD 5.1",
        )
        direct = {
            "hash": "A",
            "name": "Pakeezah.1972.Shemaroo.DVD9.Untouched",
            "content_path": r"D:\Discs\Pakeezah",
            "trackers": [{"url": "https://tracker.aither.cc/announce/private"}],
        }
        cross_seed = {
            "hash": "B",
            "name": "Unrelated.CrossSeed.Label",
            "content_path": r"D:\Discs\Pakeezah",
            "comment": "https://blutopia.cc/torrents/44",
            "trackers": [{"url": "https://tracker.blutopia.cc/announce/private"}],
        }
        rejected = {
            "hash": "C",
            "name": "Pakeezah.1972.Another.DVD9.Untouched",
            "content_path": r"D:\Discs\Other-Pakeezah",
            "comment": "",
            "trackers": [{"url": "https://tracker.other.example/announce/private"}],
        }
        session = QuiSession(
            [direct, rejected],
            comments={"a": "Imported from https://aither.cc/torrents/175387"},
            files={
                "a": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
                "b": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
                "c": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
            },
        )

        matches = match_group(
            session,
            "http://localhost:7476/proxy/key",
            group,
            [direct, cross_seed, rejected],
            {},
        )

        self.assertEqual([match["hash"] for match in matches], ["a", "b"])
        self.assertIn("source_comment_id", matches[0]["match_reasons"])
        self.assertEqual(matches[1]["match_reasons"], ["shared_content_path"])
        self.assertEqual(matches[1]["site_links"], ["https://blutopia.cc/torrents/44"])
        self.assertEqual(matches[0]["tracker_hosts"], ["tracker.aither.cc"])
        result = result_for_group(group, matches)
        self.assertEqual(
            result["other_site_links"], ["https://blutopia.cc/torrents/44"]
        )
        search_terms = [
            params["search"]
            for endpoint, params in session.calls
            if endpoint == "search"
        ]
        self.assertIn("pakeezah 1972", search_terms)

    def test_inventory_comment_finds_an_unrelated_client_name(self) -> None:
        group = source_group(torrent_id="175387", name="Site Release Name")
        torrent = {
            "hash": "A",
            "name": "Completely.Unrelated.Client.Label",
            "content_path": r"D:\Movies\Actual Content",
            "comment": "https://aither.cc/torrents/175387",
            "trackers": [{"url": "https://tracker.example/announce"}],
        }
        session = QuiSession([], files={"a": ["Actual Content/movie.mkv"]})

        matches = match_group(
            session,
            "http://localhost:7476/proxy/key",
            group,
            [torrent],
            {},
        )

        self.assertEqual([match["hash"] for match in matches], ["a"])
        self.assertEqual(matches[0]["match_reasons"], ["source_comment_id"])

    def test_enrichment_fetches_empty_comment_files_and_full_trackers(self) -> None:
        torrent = {
            "hash": "A",
            "name": "Movie.Name.2024",
            "content_path": r"D:\Movies\Movie.Name.2024.mkv",
            "comment": "",
            "tracker": "https://tracker.other.example/announce/private",
        }
        session = QuiSession(
            [],
            comments={"a": "https://aither.cc/torrents/12"},
            files={"a": ["Movie.Name.2024.mkv"]},
            trackers={"a": ["https://tracker.aither.cc/announce/private"]},
        )

        enriched = enrich_torrent(
            session,
            "http://localhost:7476/proxy/key",
            torrent,
            {},
            30,
        )

        self.assertEqual(enriched["comment"], "https://aither.cc/torrents/12")
        self.assertEqual(enriched["file_names"], ["Movie.Name.2024.mkv"])
        self.assertEqual(
            set(enriched["tracker_urls"]),
            {
                "https://tracker.other.example/announce/private",
                "https://tracker.aither.cc/announce/private",
            },
        )
        self.assertIn(("properties", {"hash": "a"}), session.calls)
        self.assertIn(("files", {"hash": "a"}), session.calls)
        self.assertIn(("trackers", {"hash": "a"}), session.calls)

    def test_extracts_detail_links_without_exposing_announce_credentials(self) -> None:
        comment = (
            "https://aither.cc/torrents/12 "
            "https://alice:secret@example.com/torrents/12 "
            "https://tracker.example/announce?passkey=secret "
            "https://example.com/download?authkey=secret "
            "https://blutopia.cc/torrents/44?token=secret#application"
        )

        self.assertEqual(
            extract_comment_links(comment),
            [
                "https://aither.cc/torrents/12",
                "https://example.com/download",
                "https://blutopia.cc/torrents/44",
            ],
        )

    def test_checkpoint_loader_and_schema_force_legacy_results_to_retry(self) -> None:
        group = source_group()
        saved = result_for_group(group, [])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "matches.json"
            path.write_text(json.dumps([saved]), encoding="utf-8")
            loaded = qui.load_checkpoint(path)

        self.assertEqual(loaded, {qui.group_key(group): saved})
        self.assertTrue(qui.result_complete_for_group(group, saved))
        legacy = dict(saved)
        legacy.pop("match_schema_version")
        self.assertFalse(qui.result_complete_for_group(group, legacy))
        self.assertEqual(saved["match_schema_version"], MATCH_SCHEMA_VERSION)

    def test_main_checkpoints_each_result_and_retries_saved_failures(self) -> None:
        first = source_group(torrent_id="1", name="First")
        second = source_group(torrent_id="2", name="Second")
        third = source_group(torrent_id="3", name="Third")
        stale = source_group(torrent_id="4", name="Stale")
        saved = result_for_group(first, [])
        prior_failure = {
            **result_for_group(third, []),
            "search_error": "previous failure",
        }
        new_match = {
            "hash": "b",
            "name": "Second",
            "content_path": r"D:\Second",
            "file_names": [],
            "tracker_hosts": [],
            "site_links": [],
            "match_reasons": ["exact_torrent_name"],
        }
        second_result = result_for_group(second, [new_match])
        retry_failure = {
            **result_for_group(third, []),
            "search_error": "still unavailable",
        }
        snapshots: list[list[dict[str, Any]]] = []
        events: list[str] = []

        def checkpoint(_path: Path, payload: list[dict[str, Any]]) -> None:
            snapshots.append(json.loads(json.dumps(payload)))
            events.append(f"save:{len(payload)}")

        def find_matches(
            _session: Any,
            _proxy_url: str,
            item: dict[str, Any],
            _inventory: list[dict[str, Any]],
            _cache: dict[str, dict[str, Any]],
            _timeout: float,
        ) -> list[dict[str, Any]]:
            events.append(f"search:{item['name']}")
            if item["name"] == "Second":
                return [new_match]
            raise QuiError("still unavailable")

        args = SimpleNamespace(
            input=Path("input.json"),
            config=Path("config.json"),
            output=Path("output.json"),
        )
        with (
            patch.object(qui, "parse_args", return_value=args),
            patch.object(
                qui,
                "load_source_groups",
                return_value=[first, second, third],
            ),
            patch.object(qui, "load_qui_settings", return_value=("http://qui", 30)),
            patch.object(
                qui,
                "load_checkpoint",
                return_value={
                    qui.group_key(first): saved,
                    qui.group_key(third): prior_failure,
                    qui.group_key(stale): result_for_group(stale, []),
                },
            ),
            patch.object(qui, "search_torrents", return_value=[]) as inventory,
            patch.object(qui, "match_group", side_effect=find_matches) as matcher,
            patch.object(qui, "save_results", side_effect=checkpoint),
            patch.object(qui.requests, "Session", return_value=ManagedSession()),
            patch("builtins.print"),
        ):
            exit_code = qui.main()

        self.assertEqual(exit_code, 1)
        inventory.assert_called_once()
        self.assertEqual(
            [call.args[2]["name"] for call in matcher.call_args_list],
            ["Second", "Third"],
        )
        self.assertEqual(
            snapshots,
            [
                [saved, prior_failure],
                [saved, second_result, prior_failure],
                [saved, second_result, retry_failure],
            ],
        )
        self.assertEqual(
            events,
            [
                "save:2",
                "search:Second",
                "save:3",
                "search:Third",
                "save:3",
            ],
        )


if __name__ == "__main__":
    unittest.main()
