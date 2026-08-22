from __future__ import annotations

import sys
import tempfile
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
    load_cookie_jar,
    parse_queue_page,
)


def queue_row(torrent_id: str, name: str) -> str:
    return f"""
    <article class="report-item report-item--compact report-item--open"
             wire:key="ptpimg-torrent-{torrent_id}">
      <a href="https://lst.gg/torrents/{torrent_id}"
         class="report-item__title" title="{name}">{name}</a>
      <a href="https://lst.gg/image-replacements/{torrent_id}/apply"
         class="report-item__action">Apply</a>
    </article>
    """


class FakeResponse:
    def __init__(
        self,
        *,
        text: str = "",
        payload: Any = None,
        status_code: int = 200,
        url: str = "https://lst.gg/image-replacements",
        content_type: str = "text/html; charset=UTF-8",
    ) -> None:
        self.text = text
        self.payload = payload
        self.status_code = status_code
        self.url = url
        self.headers = {"Content-Type": content_type}

    def json(self) -> Any:
        return self.payload


class QueueSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = iter(responses)
        self.calls: list[dict[str, str]] = []

    def get(self, _url: str, params: dict[str, str], timeout: float) -> FakeResponse:
        self.calls.append(dict(params))
        return next(self.responses)


class ApiSession:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response

    def get(self, _url: str, timeout: float) -> FakeResponse:
        return self.response


class ManagedSession:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}
        self.cookies: dict[str, str] = {}

    def __enter__(self) -> ManagedSession:
        return self

    def __exit__(self, *_args: Any) -> None:
        return None


class LstPtpimgTorrentsTest(unittest.TestCase):
    def test_parses_verified_report_row_and_pagination(self) -> None:
        html = queue_row("175387", "Gold Rush &amp; Rescue") + """
        <nav class="pagination">
          <a class="pagination__link" href="image-replacements?page=2">2</a>
          <a class="pagination__link" href="image-replacements?page=20">20</a>
        </nav>
        """

        rows, pages = parse_queue_page(html)

        self.assertEqual(rows, [QueueItem("175387", "Gold Rush & Rescue")])
        self.assertEqual(pages, {1, 2, 20})

    def test_rejects_wire_key_and_title_link_mismatch(self) -> None:
        html = queue_row("175387", "Release").replace("/torrents/175387", "/torrents/99")
        with self.assertRaisesRegex(LstError, "does not match"):
            parse_queue_page(html)

    def test_rejects_title_links_swapped_between_two_rows(self) -> None:
        first = queue_row("1", "First").replace("/torrents/1", "/torrents/2")
        second = queue_row("2", "Second").replace("/torrents/2", "/torrents/1")
        with self.assertRaisesRegex(LstError, "does not match"):
            parse_queue_page(first + second)

    def test_skips_pending_review_rows(self) -> None:
        pending = """
        <article class="report-item report-item--compact report-item--snoozed"
                 wire:key="ptpimg-torrent-175387">
          <a href="https://lst.gg/torrents/175387"
             class="report-item__title" title="Pending Release">Pending Release</a>
          <span class="report-item__badge report-item__badge--status-snoozed">
            Pending review
          </span>
          <a href="https://lst.gg/image-replacements/applications/62"
             class="report-item__action" title="View application">View</a>
        </article>
        """

        rows, _pages = parse_queue_page(pending + queue_row("99", "Open Release"))

        self.assertEqual(rows, [QueueItem("99", "Open Release")])

    def test_paginates_while_reapplying_pending_and_seeding_filters(self) -> None:
        first = queue_row("1", "First") + (
            '<a class="pagination__link" href="image-replacements?page=2">2</a>'
        )
        second = queue_row("2", "Second")
        session = QueueSession([FakeResponse(text=first), FakeResponse(text=second)])

        rows = collect_queue(session, timeout=15)

        self.assertEqual([row.torrent_id for row in rows], ["1", "2"])
        self.assertEqual(
            session.calls,
            [
                {"pending": "false", "seeding": "true", "page": "1"},
                {"pending": "false", "seeding": "true", "page": "2"},
            ],
        )

    def test_main_checkpoints_successes_prunes_stale_and_retries_failures(self) -> None:
        queue = [
            QueueItem("1", "Saved"),
            QueueItem("2", "New Two"),
            QueueItem("3", "Fails"),
            QueueItem("4", "New Four"),
        ]
        saved = {"torrent_id": "1", "name": "Saved"}
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
        with (
            patch.object(collector, "parse_args", return_value=args),
            patch.object(
                collector,
                "load_config",
                return_value={
                    "lst_api_token": "token",
                    "lst_cookie_file": "cookie.txt",
                },
            ),
            patch.object(collector, "load_cookie_jar", return_value=[]),
            patch.object(
                collector,
                "load_checkpoint",
                return_value={"1": saved, "5": stale},
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
                side_effect=[10.0, 11.0, 12.0],
            ) as wait,
            patch.object(collector, "save_json", side_effect=checkpoint),
            patch.object(
                collector.requests,
                "Session",
                side_effect=[ManagedSession(), ManagedSession()],
            ),
            patch("builtins.print"),
        ):
            exit_code = collector.main()

        self.assertEqual(exit_code, 1)
        self.assertEqual(fetch.call_count, 3)
        self.assertEqual(
            wait.call_args_list,
            [call(None), call(10.0), call(11.0)],
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
        queue = [QueueItem("1", "New"), QueueItem("2", "Later"), QueueItem("3", "Saved")]
        first = {"torrent_id": "1", "name": "New"}
        saved = {"torrent_id": "3", "name": "Saved"}
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
                return_value={
                    "lst_api_token": "token",
                    "lst_cookie_file": "cookie.txt",
                },
            ),
            patch.object(collector, "load_cookie_jar", return_value=[]),
            patch.object(collector, "load_checkpoint", return_value={"3": saved}),
            patch.object(collector, "collect_queue", return_value=queue),
            patch.object(collector, "fetch_torrent", return_value=first) as fetch,
            patch.object(collector, "wait_for_request_slot", return_value=10.0),
            patch.object(collector, "save_json", side_effect=checkpoint),
            patch.object(
                collector.requests,
                "Session",
                side_effect=[ManagedSession(), ManagedSession()],
            ),
            patch("builtins.print"),
        ):
            exit_code = collector.main()

        self.assertEqual(exit_code, 0)
        fetch.assert_called_once()
        self.assertEqual(snapshots, [[saved], [first, saved]])

    def test_loads_only_unexpired_lst_netscape_cookies(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cookies.txt"
            path.write_text(
                "# Netscape HTTP Cookie File\n"
                ".lst.gg\tTRUE\t/\tTRUE\t2147483647\tlst_session\tsecret\n"
                ".example.com\tTRUE\t/\tTRUE\t2147483647\tother\tignored\n",
                encoding="utf-8",
            )

            jar = load_cookie_jar(path)

        self.assertEqual([(cookie.domain, cookie.name) for cookie in jar], [(".lst.gg", "lst_session")])

    def test_accepts_exported_session_cookie_with_zero_expiry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cookies.txt"
            path.write_text(
                "# Netscape HTTP Cookie File\n"
                ".lst.gg\tTRUE\t/\tTRUE\t0\tlst_session\tsecret\n",
                encoding="utf-8",
            )

            jar = load_cookie_jar(path)

        self.assertEqual([cookie.name for cookie in jar], ["lst_session"])

    def test_fetches_and_retains_the_full_description(self) -> None:
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
                        "description": description,
                        "files": [{"name": "Release.Name.mkv", "size": 123}],
                    },
                }
            },
            content_type="application/json",
        )

        result = fetch_torrent(
            ApiSession(response), QueueItem("175387", "Fallback name"), timeout=15
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
                        "description": description,
                        "files": [
                            {"name": "VIDEO_TS/VIDEO_TS.IFO", "size": 1},
                            {"name": "VIDEO_TS/VTS_01_1.VOB", "size": 2},
                        ],
                    },
                }
            },
            content_type="application/json",
        )

        result = fetch_torrent(
            ApiSession(response), QueueItem("175387", "Fallback name"), timeout=15
        )

        assert result is not None
        self.assertEqual(
            result["file_names"],
            ["VIDEO_TS/VIDEO_TS.IFO", "VIDEO_TS/VTS_01_1.VOB"],
        )


if __name__ == "__main__":
    unittest.main()
