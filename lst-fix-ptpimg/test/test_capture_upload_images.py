from __future__ import annotations

import sys
import shutil
import subprocess
import tempfile
import threading
import unittest
import json
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import capture_upload_images as capture
from lst_common import description_sha256


def settings() -> capture.Settings:
    return capture.Settings(
        lostimg_api_key="secret",
        normal_hosts=(capture.HostConfig("pixhost"), capture.HostConfig("imgbox")),
        process_limit=4,
        max_screenshots=12,
        thumbnail_size=350,
        ffmpeg_compression=6,
        tone_map_hdr=True,
        request_timeout=10,
        upload_retries=0,
        ffmpeg_path="",
        ffprobe_path="",
    )


def source() -> dict[str, Any]:
    description = (
        "head"
        "[url=https://ptpimg.me/a.png][img=500]https://ptpimg.me/a.png[/img][/url]"
        "middle"
        "[img=350]https://ptpimg.me/b.png[/img]"
        "tail"
    )
    return {
        "site": "LST",
        "torrent_id": "12",
        "name": "Release",
        "details_url": "https://lst.gg/torrents/12",
        "description": description,
        "description_sha256": description_sha256(description),
        "ptpimg_blocks": [
            "[url=https://ptpimg.me/a.png][img=500]https://ptpimg.me/a.png[/img][/url]",
            "[img=350]https://ptpimg.me/b.png[/img]",
        ],
    }


class FakeResponse:
    status_code = 200

    def json(self) -> dict[str, Any]:
        return {"urls": ["https://lostimg.cc/one.png", "https://lostimg.cc/two.png"]}


class FakeSession:
    def __init__(self) -> None:
        self.call: dict[str, Any] = {}
        self.headers: dict[str, str] = {}

    def post(self, url: str, **kwargs: Any) -> FakeResponse:
        self.call = {"url": url, **kwargs}
        return FakeResponse()

    def __enter__(self) -> FakeSession:
        return self

    def __exit__(self, *_args: Any) -> None:
        return None


class CaptureUploadImagesTest(unittest.TestCase):
    def test_selects_video_ts_directory_for_dvd_folder(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            video_ts = Path(directory) / "VIDEO_TS"
            video_ts.mkdir()
            small = video_ts / "VTS_01_0.VOB"
            large = video_ts / "VTS_01_1.VOB"
            small.write_bytes(b"menu")
            large.write_bytes(b"main title")
            (video_ts / "VIDEO_TS.IFO").write_bytes(b"control")

            selected = capture.media_file_for_path(directory)

        self.assertEqual(selected, video_ts)

    def test_selects_longest_authored_dvd_title(self) -> None:
        durations = [715.5, 11050.833, 2034.666]
        responses = [
            SimpleNamespace(
                returncode=0,
                stdout=json.dumps(
                    {
                        "streams": [{"color_transfer": "BT470BG"}],
                        "format": {"duration": duration},
                    }
                ),
                stderr="",
            )
            for duration in durations
        ]
        responses.append(
            SimpleNamespace(
                returncode=1,
                stdout="{}",
                stderr=(
                    "DVDOpenFilePath:findDVDFile /VIDEO_TS/VTS_03_0.IFO failed\n"
                    "DVDOpenFilePath:findDVDFile /VIDEO_TS/VTS_03_0.BUP failed"
                ),
            )
        )
        commands: list[list[str]] = []

        def run_ffprobe(command: list[str], **_: Any) -> SimpleNamespace:
            commands.append(command)
            return responses.pop(0)

        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(capture.subprocess, "run", side_effect=run_ffprobe),
        ):
            video_ts = Path(directory) / "VIDEO_TS"
            video_ts.mkdir()
            info = capture.probe_video("ffprobe", video_ts)

        self.assertEqual(info, capture.VideoInfo(11050.833, "bt470bg", 2))
        self.assertEqual(
            [command[command.index("-title") + 1] for command in commands],
            ["1", "2", "3", "4"],
        )

    def test_dvd_probe_failure_is_not_treated_as_end_of_titles(self) -> None:
        responses = [
            SimpleNamespace(
                returncode=0,
                stdout=json.dumps(
                    {
                        "streams": [{"color_transfer": "BT470BG"}],
                        "format": {"duration": 715.5},
                    }
                ),
                stderr="",
            ),
            SimpleNamespace(returncode=1, stdout="{}", stderr="disk I/O failure"),
        ]

        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(capture.subprocess, "run", side_effect=responses),
            self.assertRaisesRegex(
                capture.LstError,
                "failed while reading DVD title 2",
            ),
        ):
            video_ts = Path(directory) / "VIDEO_TS"
            video_ts.mkdir()
            capture.probe_video("ffprobe", video_ts)

    def test_selects_largest_m2ts_from_bluray_folder(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            stream = Path(directory) / "BDMV" / "STREAM"
            stream.mkdir(parents=True)
            small = stream / "00000.m2ts"
            large = stream / "00001.m2ts"
            small.write_bytes(b"clip")
            large.write_bytes(b"main feature")
            (Path(directory) / "BDMV" / "index.bdmv").write_bytes(b"control")

            selected = capture.media_file_for_path(directory)

        self.assertEqual(selected, large)


    @unittest.skipUnless(
        shutil.which("ffmpeg") and shutil.which("ffprobe"),
        "FFmpeg tools are not installed",
    )
    def test_capture_corrects_anamorphic_pixels(self) -> None:
        ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        ffprobe = shutil.which("ffprobe") or "ffprobe"
        cases = (
            ("pal_wide", "720x576", "64/45", "", True, (1024, 576)),
            ("pal_standard", "720x576", "16/15", "", True, (768, 576)),
            ("ntsc_wide", "720x480", "32/27", "", True, (854, 480)),
            ("ntsc_standard", "720x480", "8/9", "", True, (720, 540)),
            ("square", "641x361", "1", "", True, (641, 361)),
            ("unknown", "641x361", "0", "", True, (641, 361)),
            ("hdr", "720x576", "64/45", "smpte2084", True, (1024, 576)),
            ("hdr_disabled", "720x576", "64/45", "smpte2084", False, (1024, 576)),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, size, sar, transfer, tone_map, dimensions in cases:
                with self.subTest(name=name):
                    media = root / f"{name}.mkv"
                    output = root / name
                    output.mkdir()
                    subprocess.run(
                        [
                            ffmpeg, "-hide_banner", "-loglevel", "error",
                            "-f", "lavfi", "-i",
                            f"testsrc=size={size}:rate=4:duration=1,setsar={sar}",
                            "-c:v", "ffv1", "-pix_fmt", "yuv444p10le",
                            "-color_primaries", "bt2020", "-colorspace", "bt2020nc",
                            "-color_trc", transfer or "bt709", str(media),
                        ],
                        check=True, capture_output=True, timeout=30,
                    )
                    info = capture.probe_video(ffprobe, media)
                    captured = capture.capture_screenshots(
                        ffmpeg, media, "Synthetic Movie", info, 1,
                        replace(settings(), tone_map_hdr=tone_map), output,
                    )
                    self.assertEqual(len(captured), 1)
                    png_info = subprocess.run(
                        [
                            ffprobe, "-v", "error", "-select_streams", "v:0",
                            "-show_entries", "stream=width,height,sample_aspect_ratio",
                            "-of", "json", str(captured[0]),
                        ],
                        check=True, capture_output=True, text=True, timeout=30,
                    )
                    stream = json.loads(png_info.stdout)["streams"][0]
                    self.assertEqual((stream["width"], stream["height"]), dimensions)
                    self.assertEqual(stream["sample_aspect_ratio"], "1:1")
    def test_capture_decodes_preroll_before_requested_timestamp(self) -> None:
        for duration, expected_seeks in (
            (600, ["25.000", "5.000"]),
            (60, ["0.000", "3.000"]),
        ):
            with self.subTest(duration=duration):
                commands: list[list[str]] = []

                def run_ffmpeg(command: list[str], **_: Any) -> SimpleNamespace:
                    commands.append(command)
                    return SimpleNamespace(returncode=0, stderr=b"")

                with (
                    tempfile.TemporaryDirectory() as directory,
                    patch.object(capture.subprocess, "run", side_effect=run_ffmpeg),
                    patch.object(capture, "valid_png", return_value=True),
                ):
                    media_path = Path(directory) / "movie.mkv"
                    capture.capture_screenshots(
                        "ffmpeg",
                        media_path,
                        "Example Movie 2026",
                        capture.VideoInfo(duration, ""),
                        1,
                        replace(settings(), process_limit=1),
                        Path(directory),
                    )

                command = commands[0]
                seek_positions = [
                    index for index, argument in enumerate(command) if argument == "-ss"
                ]
                self.assertEqual(
                    [command[index + 1] for index in seek_positions],
                    expected_seeks,
                )
                input_position = command.index("-i")
                self.assertLess(seek_positions[0], input_position)
                self.assertGreater(seek_positions[1], input_position)

    def test_capture_uses_selected_dvd_title(self) -> None:
        commands: list[list[str]] = []

        def run_ffmpeg(command: list[str], **_: Any) -> SimpleNamespace:
            commands.append(command)
            return SimpleNamespace(returncode=0, stderr=b"")

        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(capture.subprocess, "run", side_effect=run_ffmpeg),
            patch.object(capture, "valid_png", return_value=True),
        ):
            capture.capture_screenshots(
                "ffmpeg",
                Path(directory) / "VIDEO_TS",
                "Example Movie 2026 DVD",
                capture.VideoInfo(600, "", 2),
                1,
                replace(settings(), process_limit=1),
                Path(directory),
            )

        command = commands[0]
        input_position = command.index("-i")
        self.assertEqual(
            command[input_position - 4 : input_position],
            ["-f", "dvdvideo", "-title", "2"],
        )

    def test_uploads_ordered_batch_with_lostimg_bearer_key(self) -> None:
        fake = FakeSession()
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / "one.png", Path(directory) / "two.png"]
            for path in paths:
                path.write_bytes(b"png")
            urls = capture.upload_lostimg(fake, paths, settings())

        self.assertEqual(urls, ["https://lostimg.cc/one.png", "https://lostimg.cc/two.png"])
        self.assertEqual(fake.call["url"], "https://lostimg.cc/api/v1/images")
        self.assertEqual(fake.call["headers"], {"Authorization": "Bearer secret"})
        self.assertEqual([field for field, _part in fake.call["files"]], ["file[]", "file[]"])

    def test_recognizes_allow_listed_ffmpeg_frame_corruption(self) -> None:
        diagnostics = {
            b"[h264] Error while decoding stream #0:0": "error while decoding",
            b"Invalid data found when processing input": "invalid data found when processing input",
            b"non-existing PPS 0 referenced": "non-existing pps",
            b"Incomplete frame": "incomplete frame",
            b"corrupt decoded frame in stream 0": "corrupt decoded frame",
            b"corrupt input packet in stream 0": "corrupt input packet",
        }
        for stderr, expected in diagnostics.items():
            with self.subTest(stderr=stderr):
                self.assertEqual(
                    capture.ffmpeg_frame_corruption_indicator(stderr),
                    expected,
                )
        self.assertIsNone(
            capture.ffmpeg_frame_corruption_indicator(b"concealing one decoding error")
        )

    def test_frame_corruption_hard_fails_without_retry_and_deletes_output(self) -> None:
        """Reject a PNG when FFmpeg reports decoder corruption despite exit code zero."""

        calls: list[str] = []
        first_started = threading.Event()
        corrupt_output_deleted = threading.Event()
        original_unlink = Path.unlink

        def run_ffmpeg(command: list[str], **_: Any) -> SimpleNamespace:
            output = Path(command[-1])
            calls.append(output.name)
            output.write_bytes(b"candidate")
            if output.name == "screen-01.png":
                first_started.set()
                if not corrupt_output_deleted.wait(timeout=5):
                    raise AssertionError("corrupt output was not deleted")
                return SimpleNamespace(returncode=0, stderr=b"pblack:100")
            if output.name == "screen-02.png":
                if not first_started.wait(timeout=5):
                    raise AssertionError("first capture did not start")
                return SimpleNamespace(
                    returncode=0,
                    stderr=b"[h264] Error while decoding stream #0:0",
                )
            return SimpleNamespace(
                returncode=0,
                stderr=b"",
            )

        def unlink(path: Path, missing_ok: bool = False) -> None:
            original_unlink(path, missing_ok=missing_ok)
            if path.name == "screen-02.png":
                corrupt_output_deleted.set()

        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            with (
                patch.object(capture.subprocess, "run", side_effect=run_ffmpeg),
                patch.object(capture, "valid_png", return_value=True),
                patch.object(Path, "unlink", new=unlink),
                self.assertRaisesRegex(
                    capture.LstError,
                    "frame corruption.*error while decoding",
                ),
            ):
                capture.capture_screenshots(
                    "ffmpeg",
                    output_dir / "movie.mkv",
                    "Example Movie 2026",
                    capture.VideoInfo(600, ""),
                    3,
                    replace(settings(), process_limit=2),
                    output_dir,
                )

            self.assertFalse((output_dir / "screen-02.png").exists())
        self.assertCountEqual(calls, ["screen-01.png", "screen-02.png"])

    def test_process_captures_exactly_one_frame_per_replaceable_block(self) -> None:
        item = {
            "source_torrent": source(),
            "client_matches": [
                {"hash": "abc", "name": "Release", "content_path": r"D:\Release.mkv"}
            ],
        }
        captured_counts: list[int] = []

        def fake_capture(
            _ffmpeg: str,
            _media_path: Path,
            _release_name: str,
            _info: capture.VideoInfo,
            count: int,
            _settings: capture.Settings,
            output_dir: Path,
        ) -> list[Path]:
            captured_counts.append(count)
            return [output_dir / f"{index}.png" for index in range(count)]

        with (
            patch.object(capture, "select_client_match", return_value=(item["client_matches"][0], Path("x.mkv"))),
            patch.object(capture, "probe_video", return_value=capture.VideoInfo(100, "")),
            patch.object(capture, "capture_screenshots", side_effect=fake_capture),
            patch.object(
                capture,
                "upload_lostimg",
                return_value=["https://lostimg.cc/one.png", "https://lostimg.cc/two.png"],
            ),
            patch.object(capture, "upload_normal_round_robin") as normal_upload,
        ):
            result, failed = capture.process_match(
                FakeSession(), item, settings(), "ffmpeg", "ffprobe", 0
            )

        self.assertFalse(failed)
        normal_upload.assert_not_called()
        self.assertEqual(captured_counts, [2])
        self.assertEqual(len(result["replacements"]), 2)
        self.assertEqual(
            result["proposed_description"],
            "head"
            "[url=https://lostimg.cc/one.png][img=500]https://lostimg.cc/one.png[/img][/url]"
            "middle"
            "[img=350]https://lostimg.cc/two.png[/img]"
            "tail",
        )
        self.assertTrue(capture.result_complete_for_item(item, result))
        invalid_checkpoint = dict(result)
        invalid_checkpoint["site_matches"] = {}
        self.assertFalse(capture.result_complete_for_item(item, invalid_checkpoint))

    def test_uploads_lostimg_and_one_shared_normal_batch_concurrently(self) -> None:
        item = {
            "source_torrent": source(),
            "client_matches": [
                {
                    "hash": "abc",
                    "name": "Release.Site.One",
                    "content_path": r"D:\Release.mkv",
                    "file_names": ["Release.Site.One.mkv"],
                    "site_links": [
                        "https://aither.cc/torrents/101",
                        "https://lst.gg/torrents/12",
                    ],
                },
                {
                    "hash": "def",
                    "name": "Release.Site.Two",
                    "content_path": r"D:\Release.mkv",
                    "file_names": ["BDMV/index.bdmv", "BDMV/MovieObject.bdmv"],
                    "site_links": ["https://blutopia.cc/torrents/202"],
                },
            ],
        }
        rendezvous = threading.Barrier(2)
        normal_calls = 0

        def fake_lostimg(
            _session: Any,
            _images: list[Path],
            _settings: capture.Settings,
        ) -> list[str]:
            rendezvous.wait(timeout=2)
            return ["https://lostimg.cc/one.png", "https://lostimg.cc/two.png"]

        def fake_normal(
            _session: Any,
            _settings: capture.Settings,
            _images: list[Path],
            _start_index: int,
        ) -> tuple[str, list[capture.UploadResult]]:
            nonlocal normal_calls
            normal_calls += 1
            rendezvous.wait(timeout=2)
            return (
                "pixhost",
                [
                    capture.UploadResult(
                        "https://t1.pixhost.to/thumbs/1/one.png",
                        "https://img1.pixhost.to/images/1/one.png",
                        "https://pixhost.to/show/1/one",
                    ),
                    capture.UploadResult(
                        "https://t1.pixhost.to/thumbs/1/two.png",
                        "https://img1.pixhost.to/images/1/two.png",
                        "https://pixhost.to/show/1/two",
                    ),
                ],
            )

        with (
            patch.object(
                capture,
                "select_client_match",
                return_value=(item["client_matches"][0], Path("x.mkv")),
            ),
            patch.object(capture, "probe_video", return_value=capture.VideoInfo(100, "")),
            patch.object(
                capture,
                "capture_screenshots",
                return_value=[Path("one.png"), Path("two.png")],
            ),
            patch.object(capture, "upload_lostimg", side_effect=fake_lostimg),
            patch.object(capture, "upload_normal_round_robin", side_effect=fake_normal),
        ):
            result, failed = capture.process_match(
                FakeSession(), item, settings(), "ffmpeg", "ffprobe", 1
            )

        self.assertFalse(failed)
        self.assertEqual(normal_calls, 1)
        self.assertEqual(result["normal_image_upload"]["image_host"], "pixhost")
        records = result["site_matches"]
        self.assertEqual([record["site"] for record in records], ["aither.cc", "blutopia.cc"])
        self.assertEqual(records[0]["torrent_id"], "101")
        self.assertEqual(records[0]["filename"], "Release.Site.One.mkv")
        self.assertNotIn("filename", records[1])
        self.assertEqual([record["info_hash"] for record in records], ["abc", "def"])
        self.assertTrue(all(record["lst_name"] == "Release" for record in records))
        self.assertTrue(
            all(
                record["proposed_description"] == records[0]["proposed_description"]
                for record in records
            )
        )
        self.assertIn("https://pixhost.to/show/1/one", records[0]["proposed_description"])
        self.assertIn(
            "https://img1.pixhost.to/images/1/two.png",
            records[0]["proposed_description"],
        )
        self.assertTrue(all("existing_bbcode" not in record for record in records))
        self.assertTrue(capture.result_complete_for_item(item, result))
        stale_name = json.loads(json.dumps(result))
        stale_name["site_matches"][0]["lst_name"] = "Stale"
        self.assertFalse(capture.result_complete_for_item(item, stale_name))
        forbidden_bbcode = json.loads(json.dumps(result))
        forbidden_bbcode["site_matches"][0]["existing_bbcode"] = "old"
        self.assertFalse(capture.result_complete_for_item(item, forbidden_bbcode))

    def test_process_at_max_discards_extra_blocks_from_both_descriptions(self) -> None:
        item = {
            "source_torrent": source(),
            "client_matches": [
                {
                    "hash": "abc",
                    "name": "Release",
                    "content_path": r"D:\Release.mkv",
                    "file_names": ["Release.mkv"],
                    "site_links": ["https://aither.cc/torrents/101"],
                }
            ],
        }
        limited_settings = replace(settings(), max_screenshots=1)
        upload = capture.UploadResult(
            "https://t1.pixhost.to/thumbs/1/one.png",
            "https://img1.pixhost.to/images/1/one.png",
            "https://pixhost.to/show/1/one",
        )
        captured_counts: list[int] = []

        def capture_one(
            _ffmpeg: str,
            _media_path: Path,
            _release_name: str,
            _info: capture.VideoInfo,
            count: int,
            _settings: capture.Settings,
            _output_dir: Path,
        ) -> list[Path]:
            captured_counts.append(count)
            return [Path("one.png")]

        with (
            patch.object(
                capture,
                "select_client_match",
                return_value=(item["client_matches"][0], Path("x.mkv")),
            ),
            patch.object(capture, "probe_video", return_value=capture.VideoInfo(100, "")),
            patch.object(capture, "capture_screenshots", side_effect=capture_one),
            patch.object(
                capture,
                "upload_lostimg",
                return_value=["https://lostimg.cc/one.png"],
            ),
            patch.object(
                capture,
                "upload_normal_round_robin",
                return_value=("pixhost", [upload]),
            ),
        ):
            result, failed = capture.process_match(
                FakeSession(), item, limited_settings, "ffmpeg", "ffprobe", 0, True
            )

        self.assertFalse(failed)
        self.assertEqual(captured_counts, [1])
        self.assertEqual(result["discarded_ptpimg_blocks"], 1)
        self.assertNotIn("https://ptpimg.me/b.png", result["proposed_description"])
        self.assertNotIn(
            "https://ptpimg.me/b.png",
            result["site_matches"][0]["proposed_description"],
        )
        self.assertTrue(capture.result_complete_for_item(item, result, 1, True))
        self.assertFalse(capture.result_complete_for_item(item, result, 1, False))
        with self.assertRaisesRegex(capture.LstError, "needs 2 screenshots"):
            capture.process_match(
                FakeSession(), item, limited_settings, "ffmpeg", "ffprobe", 0
            )

    def test_round_robin_falls_through_each_normal_host_once(self) -> None:
        upload = capture.UploadResult(
            "https://imgbox.com/thumb.png",
            "https://imgbox.com/image.png",
            "https://imgbox.com/view/image",
        )
        with patch.object(
            capture,
            "upload_batch",
            side_effect=[capture.LstError("down"), [upload]],
        ) as batch:
            host, uploads = capture.upload_normal_round_robin(
                FakeSession(), settings(), [Path("one.png")], 0
            )

        self.assertEqual(host, "imgbox")
        self.assertEqual(uploads, [upload])
        self.assertEqual(
            [call.args[1].name for call in batch.call_args_list],
            ["pixhost", "imgbox"],
        )

    def test_writes_one_file_per_site_without_existing_bbcode(self) -> None:
        records = [
            {
                "site": "aither.cc",
                "details_url": "https://aither.cc/torrents/101",
                "torrent_id": "101",
                "name": "Site.Release",
                "info_hash": "abc",
                "lst_torrent_id": "12",
                "lst_name": "Release",
                "image_host": "pixhost",
                "proposed_description": "full description",
            },
            {
                "site": "blutopia.cc",
                "details_url": "https://blutopia.cc/torrents/202",
                "torrent_id": "202",
                "name": "Site.Release",
                "info_hash": "def",
                "lst_torrent_id": "12",
                "lst_name": "Release",
                "image_host": "pixhost",
                "proposed_description": "full description",
            },
        ]
        with tempfile.TemporaryDirectory() as directory:
            paths = capture.save_site_match_files(
                Path(directory),
                [{"site_matches": records}],
                {"aither.cc", "blutopia.cc"},
            )
            aither = json.loads((Path(directory) / "aither.cc.json").read_text("utf-8"))
            capture.save_site_match_files(
                Path(directory),
                [{"site_matches": [records[0]]}],
                {"aither.cc"},
            )
            obsolete = json.loads(
                (Path(directory) / "blutopia.cc.json").read_text("utf-8")
            )

        self.assertEqual([path.name for path in paths], ["aither.cc.json", "blutopia.cc.json"])
        expected_aither = {
            key: value
            for key, value in records[0].items()
            if key not in {"lst_torrent_id", "lst_name"}
        }
        self.assertEqual(aither, [expected_aither])
        self.assertNotIn("lst_torrent_id", aither[0])
        self.assertNotIn("lst_name", aither[0])
        self.assertNotIn("existing_bbcode", aither[0])
        self.assertEqual(obsolete, [])

    def test_extracts_common_tracker_ids_and_normalizes_www_site(self) -> None:
        self.assertEqual(capture.torrent_id_from_url("https://aither.cc/torrents/123"), "123")
        self.assertEqual(
            capture.torrent_id_from_url(
                "https://gazelle.example/torrents.php?id=1&torrentid=456"
            ),
            "456",
        )
        self.assertEqual(
            capture.site_name_for_url("https://www.aither.cc/torrents/123"),
            ("aither.cc", "https://www.aither.cc/torrents/123"),
        )

    def test_loads_all_general_unit3d_normal_hosts(self) -> None:
        config = {
            "lostimg_api_key": "lost-key",
            "normal_hosts": [
                {"name": "pixhost"},
                {"name": "imgbox"},
                {"name": "imgbb", "api_key": "imgbb-key"},
                {"name": "onlyimage", "api_key": "onlyimage-key"},
                {"name": "ptscreens", "api_key": "ptscreens-key"},
            ],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            path.write_text(json.dumps(config), encoding="utf-8")
            loaded = capture.load_settings(path)

        self.assertEqual(
            [host.name for host in loaded.normal_hosts],
            ["pixhost", "imgbox", "imgbb", "onlyimage", "ptscreens"],
        )

    def test_main_checkpoints_replacement_and_site_files_after_each_result(self) -> None:
        first_source = source()
        second_source = dict(first_source)
        second_source.update(
            {
                "torrent_id": "13",
                "name": "Second",
                "details_url": "https://lst.gg/torrents/13",
            }
        )
        third_source = dict(first_source)
        third_source.update(
            {
                "torrent_id": "14",
                "name": "Third",
                "details_url": "https://lst.gg/torrents/14",
            }
        )
        first = {
            "source_torrent": first_source,
            "client_matches": [
                {"hash": "abc", "name": "First", "content_path": r"D:\First.mkv"}
            ],
        }
        second = {
            "source_torrent": second_source,
            "client_matches": [
                {"hash": "def", "name": "Second", "content_path": r"D:\Second.mkv"}
            ],
        }
        third = {
            "source_torrent": third_source,
            "client_matches": [
                {"hash": "ghi", "name": "Third", "content_path": r"D:\Third.mkv"}
            ],
        }
        first_result = {
            "source_torrent": first_source,
            "proposed_description": "first replacement",
            "site_matches": [{"site": "aither.cc"}],
        }
        second_result = {
            "source_torrent": second_source,
            "processing_error": "LostImg failed",
            "site_matches": [{"site": "aither.cc"}],
        }
        third_result = {
            "source_torrent": third_source,
            "processing_error": "capture failed",
        }
        replacement_snapshots: list[list[dict[str, Any]]] = []
        site_snapshots: list[list[dict[str, Any]]] = []
        events: list[str] = []
        args = SimpleNamespace(
            input=Path("matches.json"),
            config=Path("config.json"),
            output=Path("replacement_results.json"),
            non_matching_output=Path("non_matching_results.json"),
            site_output_dir=Path("site_matches"),
            process_at_max_screenshots=False,
        )

        def save_output(path: Path, payload: list[dict[str, Any]]) -> None:
            if path == args.output:
                replacement_snapshots.append(json.loads(json.dumps(payload)))
                events.append(f"replacement:{len(payload)}")

        def save_sites(
            _path: Path,
            results: list[dict[str, Any]],
            _sites: set[str],
        ) -> list[Path]:
            site_snapshots.append(json.loads(json.dumps(results)))
            events.append(f"sites:{len(results)}")
            return []

        def process(
            _session: Any,
            item: dict[str, Any],
            _settings: capture.Settings,
            _ffmpeg: str,
            _ffprobe: str,
            _normal_host_index: int,
            _process_at_max_screenshots: bool,
        ) -> tuple[dict[str, Any], bool]:
            torrent_id = item["source_torrent"]["torrent_id"]
            events.append(f"process:{torrent_id}")
            if torrent_id == "12":
                return first_result, False
            if torrent_id == "13":
                return second_result, True
            raise capture.LstError("capture failed")

        with (
            patch.object(capture, "parse_args", return_value=args),
            patch.object(capture, "load_matches", return_value=[first, second, third]),
            patch.object(capture, "other_site_matches", return_value=[{"site": "aither.cc"}]),
            patch.object(capture, "existing_site_output_paths", return_value=[]),
            patch.object(capture, "require_distinct_paths"),
            patch.object(capture, "load_settings", return_value=settings()),
            patch.object(capture, "existing_successes", return_value={}),
            patch.object(capture, "resolve_program", side_effect=["ffmpeg", "ffprobe"]),
            patch.object(
                capture,
                "process_match",
                side_effect=process,
            ),
            patch.object(capture, "save_json", side_effect=save_output),
            patch.object(capture, "save_site_match_files", side_effect=save_sites),
            patch.object(capture.requests, "Session", return_value=FakeSession()),
            patch("builtins.print"),
        ):
            exit_code = capture.main()

        self.assertEqual(exit_code, 1)
        self.assertEqual(
            replacement_snapshots,
            [
                [],
                [first_result],
                [first_result, second_result],
                [first_result, second_result, third_result],
            ],
        )
        self.assertEqual(
            site_snapshots,
            [
                [],
                [first_result],
                [first_result, second_result],
                [first_result, second_result, third_result],
            ],
        )
        self.assertEqual(
            events,
            [
                "replacement:0",
                "sites:0",
                "process:12",
                "replacement:1",
                "sites:1",
                "process:13",
                "replacement:2",
                "sites:2",
                "process:14",
                "replacement:3",
                "sites:3",
            ],
        )

    def test_site_write_failure_recovers_from_saved_replacement_without_reprocessing(
        self,
    ) -> None:
        source_torrent = source()
        client_match = {
            "hash": "abc",
            "name": "Release",
            "content_path": r"D:\Release.mkv",
            "file_names": ["Release.mkv"],
            "site_links": ["https://aither.cc/torrents/101"],
        }
        item = {"source_torrent": source_torrent, "client_matches": [client_match]}
        lostimg_description, replacements = capture.replace_ptpimg_blocks(
            source_torrent["description"],
            ["https://lostimg.cc/one.png", "https://lostimg.cc/two.png"],
        )
        uploads = [
            capture.UploadResult(
                "https://t1.pixhost.to/thumbs/1/one.png",
                "https://img1.pixhost.to/images/1/one.png",
                "https://pixhost.to/show/1/one",
            ),
            capture.UploadResult(
                "https://t1.pixhost.to/thumbs/1/two.png",
                "https://img1.pixhost.to/images/1/two.png",
                "https://pixhost.to/show/1/two",
            ),
        ]
        normal_description = capture.replace_ptpimg_blocks_with_links(
            source_torrent["description"],
            [(upload.web_url, upload.raw_url) for upload in uploads],
        )
        result = {
            "source_torrent": source_torrent,
            "client_match": {
                key: client_match[key] for key in ("hash", "name", "content_path")
            },
            "image_host": "lostimg",
            "replacements": replacements,
            "proposed_description": lostimg_description,
            "normal_image_upload": {
                "image_host": "pixhost",
                "images": [upload.to_json() for upload in uploads],
            },
            "site_matches": capture.build_site_records(
                item,
                capture.other_site_matches(item),
                "pixhost",
                normal_description,
            ),
        }
        self.assertTrue(capture.result_complete_for_item(item, result))

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            args = SimpleNamespace(
                input=root / "matches.json",
                config=root / "config.json",
                output=root / "replacement_results.json",
                non_matching_output=root / "non_matching_results.json",
                site_output_dir=root / "site_matches",
                process_at_max_screenshots=False,
            )
            site_calls = 0

            def fail_after_replacement(
                _path: Path,
                _results: list[dict[str, Any]],
                _sites: set[str],
            ) -> list[Path]:
                nonlocal site_calls
                site_calls += 1
                if site_calls == 2:
                    raise capture.LstError("site write failed")
                return []

            with (
                patch.object(capture, "parse_args", return_value=args),
                patch.object(capture, "load_matches", return_value=[item]),
                patch.object(capture, "load_settings", return_value=settings()),
                patch.object(capture, "resolve_program", return_value="tool"),
                patch.object(capture, "process_match", return_value=(result, False)),
                patch.object(
                    capture,
                    "save_site_match_files",
                    side_effect=fail_after_replacement,
                ),
                patch.object(capture.requests, "Session", return_value=FakeSession()),
                patch("builtins.print"),
            ):
                first_exit = capture.main()

            self.assertEqual(first_exit, 2)
            self.assertEqual(
                json.loads(args.output.read_text(encoding="utf-8")),
                [result],
            )

            with (
                patch.object(capture, "parse_args", return_value=args),
                patch.object(capture, "load_matches", return_value=[item]),
                patch.object(capture, "load_settings", return_value=settings()),
                patch.object(capture, "process_match") as process_again,
                patch.object(capture.requests, "Session", return_value=FakeSession()),
                patch("builtins.print"),
            ):
                second_exit = capture.main()

            site_records = json.loads(
                (args.site_output_dir / "aither.cc.json").read_text(encoding="utf-8")
            )

        self.assertEqual(second_exit, 0)
        process_again.assert_not_called()
        self.assertEqual(len(site_records), 1)
        self.assertNotIn("lst_torrent_id", site_records[0])
        self.assertNotIn("lst_name", site_records[0])
        self.assertNotIn("existing_bbcode", site_records[0])


if __name__ == "__main__":
    unittest.main()
