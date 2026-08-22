from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import lst_common
from lst_common import (
    LstError,
    description_sha256,
    find_ptpimg_blocks,
    replacement_source_description,
    replace_ptpimg_blocks,
    replace_ptpimg_blocks_with_links,
    require_distinct_paths,
    validate_source_torrent,
)


class LstCommonTest(unittest.TestCase):
    def test_waits_two_seconds_between_lst_api_request_starts(self) -> None:
        with (
            patch.object(lst_common.time, "monotonic", side_effect=[10.25, 12.0]),
            patch.object(lst_common.time, "sleep") as sleep,
        ):
            started = lst_common.wait_for_request_slot(10.0)

        sleep.assert_called_once_with(1.75)
        self.assertEqual(started, 12.0)

    def test_replaces_only_image_blocks_outside_comparisons(self) -> None:
        linked = (
            '[URL="https://ptpimg.me/first.png"]\n'
            '[IMG width=500]https://ptpimg.me/first.png[/IMG]\n[/URL]'
        )
        comparison = (
            "[comparison=Source,Encode]"
            "[url=https://ptpimg.me/compare.png]"
            "[img]https://ptpimg.me/compare.png[/img][/url]"
            "[/comparison]"
        )
        bare = "[img=350]http://ptpimg.me/second.jpg[/img]"
        description = f"before\n{linked}\nmiddle\n{comparison}\n{bare}\nafter"

        blocks = find_ptpimg_blocks(description)
        proposed, replacements = replace_ptpimg_blocks(
            description,
            ["https://lostimg.cc/new-one.png", "https://lostimg.cc/new-two.png"],
        )

        self.assertEqual([block.text for block in blocks], [linked, bare])
        self.assertIn(comparison, proposed)
        self.assertIn('[IMG width=500]https://lostimg.cc/new-one.png[/IMG]', proposed)
        self.assertIn("[img=350]https://lostimg.cc/new-two.png[/img]", proposed)
        self.assertEqual(proposed.replace(replacements[0]["replacement_bbcode"], linked).replace(
            replacements[1]["replacement_bbcode"], bare
        ), description)

    def test_rejects_wrong_count_and_non_lostimg_urls(self) -> None:
        description = "[img]https://ptpimg.me/a.png[/img]"
        with self.assertRaisesRegex(LstError, "1 replaceable.*0 LostImg"):
            replace_ptpimg_blocks(description, [])
        with self.assertRaisesRegex(LstError, "invalid public URL"):
            replace_ptpimg_blocks(description, ["https://example.com/a.png"])
        with self.assertRaisesRegex(LstError, "invalid public URL"):
            replace_ptpimg_blocks(
                description,
                ["https://lostimg.cc/a.png[/img][url=https://example.com/evil]"],
            )

    def test_discards_only_trailing_replaceable_blocks_and_preserves_comparisons(
        self,
    ) -> None:
        first = "[img]https://ptpimg.me/first.png[/img]"
        second = "[img]https://ptpimg.me/second.png[/img]"
        third = "[img]https://ptpimg.me/third.png[/img]"
        comparison = (
            "[comparison=Source,Encode]"
            "[img]https://ptpimg.me/comparison.png[/img]"
            "[/comparison]"
        )
        description = f"before{first}middle{comparison}{second}between{third}after"

        limited = replacement_source_description(description, 1, 2)
        proposed, _replacements = replace_ptpimg_blocks(
            limited, ["https://lostimg.cc/replacement.png"]
        )

        self.assertIn(comparison, proposed)
        self.assertIn("https://lostimg.cc/replacement.png", proposed)
        self.assertNotIn("https://ptpimg.me/second.png", proposed)
        self.assertNotIn("https://ptpimg.me/third.png", proposed)
        self.assertEqual(
            proposed,
            "before[img]https://lostimg.cc/replacement.png[/img]"
            f"middle{comparison}betweenafter",
        )

    def test_normal_host_replacement_uses_viewer_and_raw_links(self) -> None:
        linked = "[url=https://ptpimg.me/a.png][img=500]https://ptpimg.me/a.png[/img][/url]"
        bare = "[img]https://ptpimg.me/b.png[/img]"
        comparison = "[comparison][img]https://ptpimg.me/c.png[/img][/comparison]"

        proposed = replace_ptpimg_blocks_with_links(
            f"{linked}\n{comparison}\n{bare}",
            [
                ("https://pixhost.to/show/a", "https://img.pixhost.to/images/a.png"),
                ("https://pixhost.to/show/b", "https://img.pixhost.to/images/b.png"),
            ],
        )

        self.assertIn(
            "[url=https://pixhost.to/show/a]"
            "[img=500]https://img.pixhost.to/images/a.png[/img][/url]",
            proposed,
        )
        self.assertIn("[img]https://img.pixhost.to/images/b.png[/img]", proposed)
        self.assertIn(comparison, proposed)

    def test_validates_full_description_fingerprint_and_blocks(self) -> None:
        description = "head[img]https://ptpimg.me/a.png[/img]tail"
        source = {
            "site": "LST",
            "torrent_id": "12",
            "name": "Release",
            "details_url": "https://lst.gg/torrents/12",
            "description": description,
            "description_sha256": description_sha256(description),
            "ptpimg_blocks": ["[img]https://ptpimg.me/a.png[/img]"],
        }

        self.assertIs(validate_source_torrent(source, "source"), source)
        source["description_sha256"] = "bad"
        with self.assertRaisesRegex(LstError, "fingerprint"):
            validate_source_torrent(source, "source")

    def test_rejects_output_path_that_aliases_an_input(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.json"
            path.write_text("[]", encoding="utf-8")
            with self.assertRaisesRegex(LstError, "must differ"):
                require_distinct_paths([("input", path), ("output", path)])


if __name__ == "__main__":
    unittest.main()
