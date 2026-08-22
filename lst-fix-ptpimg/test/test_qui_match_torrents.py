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
from lst_common import LstError, description_sha256
from qui_match_torrents import (
    direct_match_evidence,
    enrich_torrent,
    filtered_release_term,
    fuzzy_release_score,
    load_sources,
    match_source,
    search_torrents,
    source_search_terms,
)


class FakeResponse:
    def __init__(self, payload: Any) -> None:
        self.payload = payload
        self.status_code = 200

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
                {"torrents": self.search_results, "total": len(self.search_results), "hasMore": False}
            )
        torrent_hash = params["hash"].casefold()
        if endpoint == "properties":
            return FakeResponse({"comment": self.comments.get(torrent_hash, "")})
        if endpoint == "files":
            return FakeResponse([{"name": name} for name in self.files.get(torrent_hash, [])])
        if endpoint == "trackers":
            return FakeResponse([{"url": url} for url in self.trackers.get(torrent_hash, [])])
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
    file_names: list[str] | None = None,
) -> dict[str, Any]:
    description = "head[img]https://ptpimg.me/a.png[/img]tail"
    return {
        "site": "LST",
        "torrent_id": torrent_id,
        "name": name,
        "folder": None,
        "file_names": file_names or [],
        "details_url": f"https://lst.gg/torrents/{torrent_id}",
        "description": description,
        "description_sha256": description_sha256(description),
        "ptpimg_blocks": ["[img]https://ptpimg.me/a.png[/img]"],
    }


def prepared_torrent(**overrides: Any) -> dict[str, Any]:
    item: dict[str, Any] = {
        "hash": "a",
        "name": "Movie.Name.2024.1080p.WEB-DL-GROUP.mkv",
        "content_path": r"D:\Movies\Movie.Name.2024.1080p.WEB-DL-GROUP.mkv",
        "comment": "",
        "file_names": ["Movie.Name.2024.1080p.WEB-DL-GROUP.mkv"],
        "tracker_urls": ["https://tracker.lst.gg/announce/private"],
    }
    item.update(overrides)
    return item


class QuiMatchTorrentsTest(unittest.TestCase):
    def test_search_paginates_and_keeps_qbittorrent_filter(self) -> None:
        session = PagedSession(
            [
                {
                    "torrents": [{"hash": "A", "name": "One", "content_path": "D:/One"}],
                    "total": 2,
                    "hasMore": True,
                },
                {
                    "torrents": [{"hash": "B", "name": "Two", "content_path": "D:/Two"}],
                    "total": 2,
                    "hasMore": False,
                },
            ]
        )

        results = search_torrents(session, "http://localhost:7476/proxy/key", "Movie", page_size=1)

        self.assertEqual([result["hash"] for result in results], ["A", "B"])
        self.assertEqual(session.calls[0]["filter"], "unregistered,tracker_down")
        self.assertEqual([call["offset"] for call in session.calls], ["0", "1"])

    def test_disc_search_adds_title_and_year_term(self) -> None:
        item = source(name="Pakeezah 1972 NTSC DVD9 DD 5.1")

        self.assertEqual(filtered_release_term(item["name"]), "pakeezah 1972")
        self.assertIn("pakeezah 1972", source_search_terms(item))

    def test_fuzzy_disc_name_requires_lst_tracker_evidence(self) -> None:
        item = source(name="Pakeezah 1972 NTSC DVD9 DD 5.1")
        torrent = prepared_torrent(
            name="Pakeezah.1972.Shemaroo.DVD9.Untouched",
            content_path=r"D:\Discs\Pakeezah",
            file_names=["VIDEO_TS/VIDEO_TS.IFO"],
        )

        reasons, score = direct_match_evidence(item, torrent)

        self.assertIn("fuzzy_name_with_lst_tracker", reasons)
        self.assertGreaterEqual(score, 0.56)
        torrent["tracker_urls"] = ["https://tracker.example/announce"]
        reasons, _score = direct_match_evidence(item, torrent)
        self.assertEqual(reasons, [])

    def test_comment_id_and_single_filename_are_strong_matches(self) -> None:
        item = source(torrent_id="175387", file_names=["Movie.Name.2024.mkv"])
        torrent = prepared_torrent(
            name="Completely.Different.Client.Name",
            comment="Imported from https://lst.gg/torrents/175387",
            file_names=["Movie.Name.2024.mkv"],
            tracker_urls=["https://tracker.example/announce"],
        )

        reasons, _score = direct_match_evidence(item, torrent)

        self.assertIn("lst_comment_id", reasons)
        self.assertIn("exact_filename", reasons)

    def test_fuzzy_name_rejects_a_different_year(self) -> None:
        self.assertIsNone(
            fuzzy_release_score(
                "Pakeezah 1972 NTSC DVD9 DD 5.1",
                "Pakeezah.1973.Shemaroo.DVD9.Untouched",
            )
        )

    def test_fuzzy_name_rejects_a_longer_different_title(self) -> None:
        self.assertIsNone(
            fuzzy_release_score(
                "Up 2009 1080p BluRay",
                "Step.Up.2009.1080p.BluRay",
            )
        )

    def test_fuzzy_name_rejects_conflicting_tv_standard(self) -> None:
        self.assertIsNone(
            fuzzy_release_score(
                "Pakeezah 1972 NTSC DVD9",
                "Pakeezah.1972.PAL.DVD9",
            )
        )

    def test_match_retains_every_torrent_sharing_the_content_path(self) -> None:
        item = source(
            torrent_id="175387",
            name="Pakeezah 1972 NTSC DVD9 DD 5.1",
            file_names=["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
        )
        direct = {
            "hash": "A",
            "name": "Pakeezah.1972.Shemaroo.DVD9.Untouched",
            "content_path": r"D:\Discs\Pakeezah",
            "trackers": [{"url": "https://tracker.lst.gg/announce/private"}],
        }
        cross_seed = {
            "hash": "B",
            "name": "Unrelated.CrossSeed.Label",
            "content_path": r"D:\Discs\Pakeezah",
            "comment": "https://other.example/torrents/44",
            "trackers": [{"url": "https://tracker.other.example/announce/private"}],
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
            comments={"a": "Imported from https://lst.gg/torrents/175387"},
            files={
                "a": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
                "b": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
                "c": ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
            },
        )

        matches = match_source(
            session,
            "http://localhost:7476/proxy/key",
            item,
            [direct, cross_seed, rejected],
            {},
        )

        self.assertEqual([match["hash"] for match in matches], ["a", "b"])
        self.assertIn("lst_comment_id", matches[0]["match_reasons"])
        self.assertEqual(matches[1]["match_reasons"], ["shared_content_path"])
        self.assertEqual(matches[1]["site_links"], ["https://other.example/torrents/44"])
        self.assertEqual(matches[0]["tracker_hosts"], ["tracker.lst.gg"])
        search_terms = [params["search"] for endpoint, params in session.calls if endpoint == "search"]
        self.assertIn("pakeezah 1972", search_terms)

    def test_enrichment_fetches_full_trackers_when_search_has_only_primary(self) -> None:
        torrent = {
            "hash": "A",
            "name": "Movie.Name.2024",
            "content_path": r"D:\Movies\Movie.Name.2024.mkv",
            "comment": "",
            "tracker": "https://tracker.other.example/announce/private",
        }
        session = QuiSession(
            [],
            files={"a": ["Movie.Name.2024.mkv"]},
            trackers={"a": ["https://tracker.lst.gg/announce/private"]},
        )

        enriched = enrich_torrent(
            session, "http://localhost:7476/proxy/key", torrent, {}, 30
        )

        self.assertEqual(
            set(enriched["tracker_urls"]),
            {
                "https://tracker.other.example/announce/private",
                "https://tracker.lst.gg/announce/private",
            },
        )
        self.assertIn(("trackers", {"hash": "a"}), session.calls)

    def test_loader_preserves_full_source_description(self) -> None:
        expected = source()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.json"
            path.write_text(json.dumps([expected]), encoding="utf-8")
            loaded = load_sources(path)
        self.assertEqual(loaded, [expected])

    def test_checkpoint_loader_keys_results_by_lst_torrent_id(self) -> None:
        saved = {"source_torrent": source(), "client_matches": []}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "matches.json"
            path.write_text(json.dumps([saved]), encoding="utf-8")

            loaded = qui.load_checkpoint(path)

        self.assertEqual(loaded, {"12": saved})

    def test_main_checkpoints_each_result_and_retries_saved_failures(self) -> None:
        first = source(torrent_id="1", name="First")
        second = source(torrent_id="2", name="Second")
        third = source(torrent_id="3", name="Third")
        stale = source(torrent_id="4", name="Stale")
        saved = {"source_torrent": first, "client_matches": []}
        prior_failure = {
            "source_torrent": third,
            "client_matches": [],
            "search_error": "previous failure",
        }
        new_match = prepared_torrent(hash="b", name="Second", content_path=r"D:\Second")
        second_result = {"source_torrent": second, "client_matches": [new_match]}
        retry_failure = {
            "source_torrent": third,
            "client_matches": [],
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
            torrent_id = item["torrent_id"]
            events.append(f"search:{torrent_id}")
            if torrent_id == "2":
                return [new_match]
            raise LstError("still unavailable")

        args = SimpleNamespace(
            input=Path("input.json"),
            config=Path("config.json"),
            output=Path("output.json"),
        )
        with (
            patch.object(qui, "parse_args", return_value=args),
            patch.object(qui, "load_sources", return_value=[first, second, third]),
            patch.object(qui, "load_qui_settings", return_value=("http://qui", 30)),
            patch.object(
                qui,
                "load_checkpoint",
                return_value={
                    "1": saved,
                    "3": prior_failure,
                    "4": {"source_torrent": stale, "client_matches": []},
                },
            ),
            patch.object(qui, "search_torrents", return_value=[]) as inventory,
            patch.object(
                qui,
                "match_source",
                side_effect=find_matches,
            ) as match_source_call,
            patch.object(qui, "save_json", side_effect=checkpoint),
            patch.object(qui.requests, "Session", return_value=ManagedSession()),
            patch("builtins.print"),
        ):
            exit_code = qui.main()

        self.assertEqual(exit_code, 1)
        inventory.assert_called_once()
        self.assertEqual(
            [match_call.args[2]["torrent_id"] for match_call in match_source_call.call_args_list],
            ["2", "3"],
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
            ["save:2", "search:2", "save:3", "search:3", "save:3"],
        )


if __name__ == "__main__":
    unittest.main()
