from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import call, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lst_common import LstError
import lst_ptpimg_torrents as collector
from lst_ptpimg_torrents import (
    QueueItem,
    collect_queue,
    fetch_torrent,
)


class FakeResponse:
    def __init__(
        self,
        *,
        payload: Any = None,
        status_code: int = 200,
    ) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> Any:
        return self.payload


class QueueSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = iter(responses)
        self.calls: list[tuple[str, float]] = []

    def get(self, url: str, timeout: float) -> FakeResponse:
        self.calls.append((url, timeout))
        return next(self.responses)


class ApiSession:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response

    def get(self, _url: str, timeout: float) -> FakeResponse:
        return self.response


class ManagedSession:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}

    def __enter__(self) -> ManagedSession:
        return self

    def __exit__(self, *_args: Any) -> None:
        return None


class LstPtpimgTorrentsTest(unittest.TestCase):
    def test_collects_seeded_replacement_descriptions_from_api(self) -> None:
        first = "Plot [img]https://ptpimg.me/first.png[/img]"
        second = "Screens [img]https://ptpimg.me/second.png[/img]"
        session = QueueSession(
            [
                FakeResponse(
                    payload=[
                        {"id": 1, "description": first},
                        {"id": 2, "description": second},
                    ]
                )
            ]
        )

        rows = collect_queue(session, timeout=15)

        self.assertEqual(
            rows,
            [QueueItem("1", first), QueueItem("2", second)],
        )
        self.assertEqual(session.calls, [(collector.QUEUE_URL, 15)])

    def test_rejects_invalid_seeded_replacement_response(self) -> None:
        cases = [
            ({"id": 1}, "JSON array"),
            ([None], "item 1 must be an object"),
            ([{"id": "1", "description": "text"}], "invalid torrent ID"),
            ([{"id": 1}], "has no description"),
            (
                [
                    {"id": 1, "description": "first"},
                    {"id": 1, "description": "second"},
                ],
                "duplicate torrent ID 1",
            ),
        ]
        for payload, message in cases:
            with self.subTest(message=message):
                session = QueueSession([FakeResponse(payload=payload)])
                with self.assertRaisesRegex(LstError, message):
                    collect_queue(session)

    def test_main_checkpoints_successes_prunes_stale_and_retries_failures(self) -> None:
        queue = [
            QueueItem("1", "saved description"),
            QueueItem("2", "second description"),
            QueueItem("3", "third description"),
            QueueItem("4", "fourth description"),
        ]
        saved = {
            "torrent_id": "1",
            "name": "Saved",
            "description": "saved description",
        }
        outdated = {
            "torrent_id": "2",
            "name": "Old Two",
            "description": "old description",
        }
        second = {"torrent_id": "2", "name": "New Two"}
        fourth = {"torrent_id": "4", "name": "New Four"}
        stale = {"torrent_id": "5", "name": "Stale"}
        snapshots: list[list[dict[str, str]]] = []

        def checkpoint(_path: Path, payload: list[dict[str, str]]) -> None:
            snapshots.append([dict(item) for item in payload])

        args = SimpleNamespace(
            config=Path("config.json"),
            output=Path("output.json"),
            limit=None,
        )
        session = ManagedSession()
        with (
            patch.object(collector, "parse_args", return_value=args),
            patch.object(
                collector,
                "load_config",
                return_value={"lst_api_token": "token"},
            ),
            patch.object(
                collector,
                "load_checkpoint",
                return_value={"1": saved, "2": outdated, "5": stale},
            ),
            patch.object(collector, "collect_queue", return_value=queue),
            patch.object(
                collector,
                "fetch_torrent",
                side_effect=[second, LstError("HTTP 429"), fourth],
            ) as fetch,
            patch.object(
                collector,
                "wait_for_request_slot",
                side_effect=[10.0, 11.0, 12.0, 13.0],
            ) as wait,
            patch.object(collector, "save_json", side_effect=checkpoint),
            patch.object(
                collector.requests,
                "Session",
                return_value=session,
            ),
            patch("builtins.print"),
        ):
            exit_code = collector.main()

        self.assertEqual(exit_code, 1)
        self.assertEqual(session.headers["Authorization"], "Bearer token")
        self.assertEqual(fetch.call_count, 3)
        self.assertEqual(
            wait.call_args_list,
            [call(None), call(10.0), call(11.0), call(12.0)],
        )
        self.assertEqual(
            snapshots,
            [
                [saved],
                [saved, second],
                [saved, second],
                [saved, second, fourth],
            ],
        )

    def test_main_limit_retains_saved_results_outside_processing_prefix(self) -> None:
        queue = [
            QueueItem("1", "new description"),
            QueueItem("2", "later description"),
            QueueItem("3", "saved description"),
        ]
        first = {"torrent_id": "1", "name": "New"}
        saved = {
            "torrent_id": "3",
            "name": "Saved",
            "description": "saved description",
        }
        snapshots: list[list[dict[str, str]]] = []

        def checkpoint(_path: Path, payload: list[dict[str, str]]) -> None:
            snapshots.append([dict(item) for item in payload])

        args = SimpleNamespace(
            config=Path("config.json"),
            output=Path("output.json"),
            limit=1,
        )
        with (
            patch.object(collector, "parse_args", return_value=args),
            patch.object(
                collector,
                "load_config",
                return_value={"lst_api_token": "token"},
            ),
            patch.object(collector, "load_checkpoint", return_value={"3": saved}),
            patch.object(collector, "collect_queue", return_value=queue),
            patch.object(collector, "fetch_torrent", return_value=first) as fetch,
            patch.object(collector, "wait_for_request_slot", return_value=10.0),
            patch.object(collector, "save_json", side_effect=checkpoint),
            patch.object(
                collector.requests,
                "Session",
                return_value=ManagedSession(),
            ),
            patch("builtins.print"),
        ):
            exit_code = collector.main()

        self.assertEqual(exit_code, 0)
        fetch.assert_called_once()
        self.assertEqual(snapshots, [[saved], [first, saved]])

    def test_fetches_metadata_and_retains_the_queue_description(self) -> None:
        description = (
            "[center]Unrelated metadata[/center]\n"
            "[url=https://ptpimg.me/a.png][img=500]https://ptpimg.me/a.png[/img][/url]\n"
            "Footer"
        )
        response = FakeResponse(
            payload={
                "data": {
                    "id": "175387",
                    "attributes": {
                        "name": "Release.Name",
                        "files": [{"name": "Release.Name.mkv", "size": 123}],
                    },
                }
            }
        )

        result = fetch_torrent(
            ApiSession(response), QueueItem("175387", description), timeout=15
        )

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result["description"], description)
        self.assertEqual(result["file_names"], ["Release.Name.mkv"])
        self.assertEqual(len(result["ptpimg_blocks"]), 1)

    def test_fetch_retains_all_disc_filenames_for_qui_matching(self) -> None:
        description = "[img]https://ptpimg.me/a.png[/img]"
        response = FakeResponse(
            payload={
                "data": {
                    "id": "175387",
                    "attributes": {
                        "name": "Pakeezah 1972 NTSC DVD9 DD 5.1",
                        "folder": "Pakeezah",
                        "files": [
                            {"name": "VIDEO_TS/VIDEO_TS.IFO", "size": 1},
                            {"name": "VIDEO_TS/VTS_01_1.VOB", "size": 2},
                        ],
                    },
                }
            }
        )

        result = fetch_torrent(
            ApiSession(response), QueueItem("175387", description), timeout=15
        )

        assert result is not None
        self.assertEqual(
            result["file_names"],
            ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
        )


if __name__ == "__main__":
    unittest.main()
