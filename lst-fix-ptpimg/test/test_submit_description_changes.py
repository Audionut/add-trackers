from __future__ import annotations

from copy import deepcopy
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import call, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import submit_description_changes as submit
from lst_common import LstError, description_sha256, replace_ptpimg_blocks
from submit_description_changes import (
    request_current_description,
    submit_change,
    successful_state_matches,
    validate_replacement,
    verify_current_description,
)


def replacement_result() -> dict[str, Any]:
    description = "header[img=500]https://ptpimg.me/a.png[/img]footer"
    proposed, replacements = replace_ptpimg_blocks(
        description, ["https://lostimg.cc/new.png"]
    )
    return {
        "source_torrent": {
            "site": "LST",
            "torrent_id": "12",
            "name": "Release",
            "details_url": "https://lst.gg/torrents/12",
            "description": description,
            "description_sha256": description_sha256(description),
            "ptpimg_blocks": ["[img=500]https://ptpimg.me/a.png[/img]"],
        },
        "image_host": "lostimg",
        "replacements": replacements,
        "proposed_description": proposed,
    }


class FakeResponse:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> Any:
        return self.payload


class FakeSession:
    def __init__(self, current: str) -> None:
        self.current = current
        self.post_call: dict[str, Any] = {}

    def get(self, _url: str, timeout: float) -> FakeResponse:
        return FakeResponse({"data": {"id": "12", "attributes": {"description": self.current}}})

    def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.post_call = {"url": url, **kwargs}
        return FakeResponse({"success": True, "data": {"id": 1, "torrent_id": 12}})


class ManagedSession:
    def __init__(self) -> None:
        self.headers: dict[str, str] = {}

    def __enter__(self) -> ManagedSession:
        return self

    def __exit__(self, *_args: Any) -> None:
        return None


class SubmitDescriptionChangesTest(unittest.TestCase):
    def test_refetches_then_posts_the_full_proposed_description(self) -> None:
        item = replacement_result()
        validated = validate_replacement(item, 1)
        self.assertIs(validated, item)
        session = FakeSession(item["source_torrent"]["description"])

        current = request_current_description(session, "12", timeout=10)
        verify_current_description(item, current)
        response = submit_change(session, item, "Staff note", timeout=10)

        self.assertTrue(response["success"])
        self.assertTrue(session.post_call["url"].endswith("/description-changes/torrents/12"))
        self.assertEqual(
            session.post_call["json"],
            {"description": item["proposed_description"], "message": "Staff note"},
        )
        self.assertTrue(session.post_call["json"]["description"].startswith("header"))
        self.assertTrue(session.post_call["json"]["description"].endswith("footer"))

    def test_rejects_description_changed_after_capture(self) -> None:
        item = replacement_result()
        with self.assertRaisesRegex(LstError, "changed after collection"):
            verify_current_description(item, item["source_torrent"]["description"] + " changed")

    def test_rejects_tampered_proposed_description(self) -> None:
        item = replacement_result()
        item["proposed_description"] += " unrelated edit"
        with self.assertRaisesRegex(LstError, "does not match"):
            validate_replacement(item, 1)

    def test_validates_truncated_proposal_and_preserves_comparison_images(self) -> None:
        first = "[img]https://ptpimg.me/a.png[/img]"
        second = "[img]https://ptpimg.me/b.png[/img]"
        comparison = "[comparison][img]https://ptpimg.me/c.png[/img][/comparison]"
        description = f"header{first}{comparison}{second}footer"
        limited = submit.replacement_source_description(description, 1, 1)
        proposed, replacements = replace_ptpimg_blocks(
            limited, ["https://lostimg.cc/new.png"]
        )
        item = {
            "source_torrent": {
                "site": "LST",
                "torrent_id": "12",
                "name": "Release",
                "details_url": "https://lst.gg/torrents/12",
                "description": description,
                "description_sha256": description_sha256(description),
                "ptpimg_blocks": [first, second],
            },
            "image_host": "lostimg",
            "replacements": replacements,
            "proposed_description": proposed,
            "discarded_ptpimg_blocks": 1,
        }

        self.assertIs(validate_replacement(item, 1), item)
        verify_current_description(item, description)
        self.assertIn(comparison, proposed)
        self.assertNotIn("https://ptpimg.me/b.png", proposed)
        tampered = deepcopy(item)
        tampered["discarded_ptpimg_blocks"] = 2
        with self.assertRaisesRegex(LstError, "replaceable PTPImg blocks"):
            validate_replacement(tampered, 1)

    def test_resume_state_is_bound_to_the_exact_source_and_proposal(self) -> None:
        item = replacement_result()
        matching = {
            "torrent_id": "12",
            "success": True,
            "source_description_sha256": item["source_torrent"]["description_sha256"],
            "proposed_description_sha256": description_sha256(item["proposed_description"]),
        }

        self.assertTrue(successful_state_matches(matching, item))
        self.assertFalse(successful_state_matches({"torrent_id": "12", "success": True}, item))
        matching["proposed_description_sha256"] = "different"
        self.assertFalse(successful_state_matches(matching, item))

    def test_apply_rate_limits_validation_gets_and_submission_posts(self) -> None:
        first = replacement_result()
        second = deepcopy(first)
        second["source_torrent"]["torrent_id"] = "13"
        second["source_torrent"]["details_url"] = "https://lst.gg/torrents/13"
        args = SimpleNamespace(
            input=Path("replacements.json"),
            config=Path("config.json"),
            state=Path("state.json"),
            message="Staff note",
            apply=True,
        )
        with (
            patch.object(submit, "parse_args", return_value=args),
            patch.object(submit, "load_replacements", return_value=([first, second], 0)),
            patch.object(submit, "load_config", return_value={"lst_api_token": "token"}),
            patch.object(submit, "load_state", return_value={}),
            patch.object(
                submit,
                "request_current_description",
                side_effect=[
                    first["source_torrent"]["description"],
                    second["source_torrent"]["description"],
                ],
            ) as request_current,
            patch.object(
                submit,
                "submit_change",
                side_effect=[{"success": True}, {"success": True}],
            ) as post_change,
            patch.object(
                submit,
                "wait_for_request_slot",
                side_effect=[10.0, 12.0, 14.0, 16.0],
            ) as wait,
            patch.object(submit, "save_json"),
            patch.object(submit.requests, "Session", return_value=ManagedSession()),
            patch("builtins.print"),
        ):
            exit_code = submit.main()

        self.assertEqual(exit_code, 0)
        self.assertEqual(request_current.call_count, 2)
        self.assertEqual(post_change.call_count, 2)
        self.assertEqual(
            wait.call_args_list,
            [call(None), call(10.0), call(12.0), call(14.0)],
        )

    def test_apply_keeps_rate_limit_clock_after_request_failures(self) -> None:
        first = replacement_result()
        second = deepcopy(first)
        second["source_torrent"]["torrent_id"] = "13"
        second["source_torrent"]["details_url"] = "https://lst.gg/torrents/13"
        third = deepcopy(first)
        third["source_torrent"]["torrent_id"] = "14"
        third["source_torrent"]["details_url"] = "https://lst.gg/torrents/14"
        args = SimpleNamespace(
            input=Path("replacements.json"),
            config=Path("config.json"),
            state=Path("state.json"),
            message="Staff note",
            apply=True,
        )
        with (
            patch.object(submit, "parse_args", return_value=args),
            patch.object(
                submit,
                "load_replacements",
                return_value=([first, second, third], 0),
            ),
            patch.object(submit, "load_config", return_value={"lst_api_token": "token"}),
            patch.object(submit, "load_state", return_value={}),
            patch.object(
                submit,
                "request_current_description",
                side_effect=[
                    LstError("GET failed"),
                    second["source_torrent"]["description"],
                    third["source_torrent"]["description"],
                ],
            ) as request_current,
            patch.object(
                submit,
                "submit_change",
                side_effect=[LstError("POST failed"), {"success": True}],
            ) as post_change,
            patch.object(
                submit,
                "wait_for_request_slot",
                side_effect=[10.0, 12.0, 14.0, 16.0, 18.0],
            ) as wait,
            patch.object(submit, "save_json"),
            patch.object(submit.requests, "Session", return_value=ManagedSession()),
            patch("builtins.print"),
        ):
            exit_code = submit.main()

        self.assertEqual(exit_code, 1)
        self.assertEqual(request_current.call_count, 3)
        self.assertEqual(post_change.call_count, 2)
        self.assertEqual(
            wait.call_args_list,
            [call(None), call(10.0), call(12.0), call(14.0), call(16.0)],
        )


if __name__ == "__main__":
    unittest.main()
