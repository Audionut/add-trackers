from __future__ import annotations

import _thread
import json
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import capture_upload_images as images


def settings_for_test(**overrides: Any) -> images.Settings:
    """Return small deterministic settings for unit tests."""

    values: dict[str, Any] = {
        "normal_hosts": (
            images.HostConfig("pixhost"),
            images.HostConfig("imgbb", "key"),
        ),
        "lostimg": None,
        "reelflix": None,
        "screenshots": 4,
        "process_limit": 4,
        "thumbnail_size": 350,
        "ffmpeg_compression": 6,
        "tone_map_hdr": True,
        "request_timeout": 10.0,
        "upload_retries": 0,
        "ffmpeg_path": "",
        "ffprobe_path": "",
    }
    values.update(overrides)
    return images.Settings(**values)


def source(
    description: str = "[url=https://ptpimg.me/a.png][img=350]https://ptpimg.me/a.png[/img][/url]",
    name: str = "Release",
) -> dict[str, Any]:
    """Return a valid source-torrent fixture."""

    return {
        "site": "Aither",
        "torrent_id": "12",
        "name": name,
        "details_url": "https://aither.cc/torrents/12",
        "description_bbcode": description,
        "file_names": ["Release.mkv"],
    }


class FakeUploadResponse:
    """Return one configured JSON payload from an upload request."""

    def __init__(self, payload: dict[str, Any], status_code: int = 200) -> None:
        self.payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, Any]:
        """Return the configured response body."""

        return self.payload


class RecordingUploadSession:
    """Record one multipart request and return a fake response."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload
        self.call: dict[str, Any] = {}

    def post(self, url: str, **kwargs: Any) -> FakeUploadResponse:
        """Record request metadata while its multipart file is open."""

        files = kwargs.get("files", {})
        field, part = next(iter(files.items()))
        filename, file_object, content_type = part
        self.call = {
            "url": url,
            "headers": kwargs.get("headers", {}),
            "field": field,
            "filename": filename,
            "content_type": content_type,
            "content": file_object.read(),
        }
        return FakeUploadResponse(self.payload)


class CaptureUploadImagesTest(unittest.TestCase):
    def test_loads_four_screenshot_default_and_round_robins_hosts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            path.write_text(
                json.dumps(
                    {
                        "normal_hosts": [
                            {"name": "pixhost"},
                            {"name": "imgbb", "api_key": "key"},
                            {"name": "onlyimage", "api_key": "key"},
                            {"name": "ptscreens", "api_key": "key"},
                        ]
                    }
                ),
                encoding="utf-8",
            )

            settings = images.load_settings(path)

        self.assertEqual(settings.screenshots, 4)
        self.assertEqual(settings.process_limit, 4)
        self.assertEqual(
            [host.name for host in images.normal_host_order(settings.normal_hosts, 1)],
            ["imgbb", "onlyimage", "ptscreens", "pixhost"],
        )
        self.assertEqual(
            [host.name for host in images.normal_host_order(settings.normal_hosts, 4)],
            ["pixhost", "imgbb", "onlyimage", "ptscreens"],
        )

    def test_onlyimage_and_ptscreens_require_config_api_keys(self) -> None:
        for host in ("onlyimage", "ptscreens"):
            with self.subTest(host=host), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "config.json"
                path.write_text(
                    json.dumps({"normal_hosts": [{"name": host}]}),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(images.ImagePipelineError, "requires an api_key"):
                    images.load_settings(path)

    def test_uploads_onlyimage_and_ptscreens_using_current_contracts(self) -> None:
        onlyimage_session = RecordingUploadSession(
            {
                "status_code": 200,
                "success": {"code": 200},
                "image": {
                    "url": "https://onlyimage.org/images/shot.png",
                    "image": {"url": "https://onlyimage.org/images/nested.png"},
                    "medium": {"url": None},
                    "thumb": {"url": "https://onlyimage.org/images/shot.th.png"},
                    "url_viewer": "https://onlyimage.org/image/shot",
                },
            }
        )
        ptscreens_session = RecordingUploadSession(
            {
                "image": {
                    "medium": {"url": "https://ptscreens.com/images/shot.md.png"},
                    "url": "https://ptscreens.com/images/shot.png",
                    "url_viewer": "https://ptscreens.com/image/shot",
                }
            }
        )
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "shot.png"
            image.write_bytes(b"synthetic image")

            onlyimage_result = images.upload_batch(
                onlyimage_session,
                images.HostConfig("onlyimage", "only-key"),
                [image],
                settings_for_test(),
            )
            ptscreens_result = images.upload_batch(
                ptscreens_session,
                images.HostConfig("ptscreens", "pts-key"),
                [image],
                settings_for_test(),
            )

        self.assertEqual(
            onlyimage_result[0],
            images.UploadResult(
                "https://onlyimage.org/images/shot.th.png",
                "https://onlyimage.org/images/shot.png",
                "https://onlyimage.org/image/shot",
            ),
        )
        self.assertEqual(
            ptscreens_result[0],
            images.UploadResult(
                "https://ptscreens.com/images/shot.md.png",
                "https://ptscreens.com/images/shot.png",
                "https://ptscreens.com/image/shot",
            ),
        )
        self.assertEqual(
            onlyimage_session.call,
            {
                "url": "https://onlyimage.org/api/1/upload",
                "headers": {"X-API-Key": "only-key"},
                "field": "source",
                "filename": "shot.png",
                "content_type": "image/png",
                "content": b"synthetic image",
            },
        )
        self.assertEqual(
            ptscreens_session.call,
            {
                "url": "https://ptscreens.com/api/1/upload",
                "headers": {"X-API-Key": "pts-key"},
                "field": "source",
                "filename": "shot.png",
                "content_type": "image/png",
                "content": b"synthetic image",
            },
        )

    def test_load_groups_requires_preserved_description_bbcode(self) -> None:
        payload = [
            {
                "name": "Release",
                "source_torrents": [
                    {
                        "site": "Aither",
                        "torrent_id": "12",
                        "name": "Release",
                        "details_url": "https://aither.cc/torrents/12",
                    }
                ],
                "client_matches": [],
            }
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "qui.json"
            path.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(images.ImagePipelineError, "rerun qui_match_torrents"):
                images.load_groups(path)

    def test_selects_largest_video_from_release_folder(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            small = root / "sample.mkv"
            large = root / "BDMV" / "STREAM" / "00001.m2ts"
            large.parent.mkdir(parents=True)
            small.write_bytes(b"small")
            large.write_bytes(b"larger video")
            (root / "notes.txt").write_text("ignored", encoding="utf-8")

            selected = images.media_file_for_path(str(root))

        self.assertEqual(selected, large)

    def test_uses_upbrr_timestamp_windows_and_hdr_filter(self) -> None:
        self.assertEqual(
            images.screenshot_timestamps("Movie 2024 1080p", 600, 4),
            [30.0, 157.5, 285.0, 412.5],
        )
        self.assertEqual(
            images.screenshot_timestamps("Show.S01E01.1080p", 600, 4),
            [60.0, 180.0, 300.0, 420.0],
        )
        self.assertIn(
            "tonemap=tonemap=mobius",
            images.ffmpeg_filter(images.VideoInfo(600, "smpte2084"), True),
        )

    def test_captures_frames_concurrently_up_to_process_limit(self) -> None:
        """Run bounded FFmpeg workers while preserving screenshot order."""

        barrier = threading.Barrier(2)
        lock = threading.Lock()
        active = 0
        maximum_active = 0

        def run_ffmpeg(command: list[str], **_: Any) -> subprocess.CompletedProcess[bytes]:
            """Synchronize each pair of fake FFmpeg processes."""

            nonlocal active, maximum_active
            with lock:
                active += 1
                maximum_active = max(maximum_active, active)
            try:
                barrier.wait(timeout=5)
                return subprocess.CompletedProcess(command, 0, b"", b"")
            finally:
                with lock:
                    active -= 1

        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(images.subprocess, "run", side_effect=run_ffmpeg),
            patch.object(images, "valid_png", return_value=True),
        ):
            captured = images.capture_screenshots(
                "ffmpeg",
                Path(directory) / "movie.mkv",
                "Example Movie 2026",
                images.VideoInfo(600, ""),
                settings_for_test(screenshots=4, process_limit=2),
                Path(directory),
            )

        self.assertEqual(maximum_active, 2)
        self.assertEqual(
            [path.name for path in captured],
            ["screen-01.png", "screen-02.png", "screen-03.png", "screen-04.png"],
        )

    def test_interrupt_cancels_queued_ffmpeg_captures(self) -> None:
        """Do not start queued FFmpeg work after the main thread is interrupted."""

        calls = 0

        def interrupt_during_ffmpeg(
            command: list[str], **_: Any
        ) -> subprocess.CompletedProcess[bytes]:
            """Interrupt the main thread during the first fake FFmpeg call."""

            nonlocal calls
            calls += 1
            _thread.interrupt_main()
            threading.Event().wait(0.05)
            return subprocess.CompletedProcess(command, 0, b"", b"")

        with (
            tempfile.TemporaryDirectory() as directory,
            patch.object(images.subprocess, "run", side_effect=interrupt_during_ffmpeg),
            patch.object(images, "valid_png", return_value=True),
            self.assertRaises(KeyboardInterrupt),
        ):
            images.capture_screenshots(
                "ffmpeg",
                Path(directory) / "movie.mkv",
                "Example Movie 2026",
                images.VideoInfo(600, ""),
                settings_for_test(screenshots=4, process_limit=1),
                Path(directory),
            )

        self.assertEqual(calls, 1)

    @unittest.skipUnless(
        shutil.which("ffmpeg") and shutil.which("ffprobe"),
        "FFmpeg tools are not installed",
    )
    def test_captures_real_pngs_from_synthetic_video(self) -> None:
        ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        ffprobe = shutil.which("ffprobe") or "ffprobe"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            media = root / "synthetic.mp4"
            output = root / "screens"
            output.mkdir()
            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "testsrc2=size=640x360:rate=24:duration=4",
                    "-c:v",
                    "mpeg4",
                    "-pix_fmt",
                    "yuv420p",
                    str(media),
                ],
                check=True,
                capture_output=True,
            )

            info = images.probe_video(ffprobe, media)
            captured = images.capture_screenshots(
                ffmpeg,
                media,
                "Synthetic Movie 2024",
                info,
                settings_for_test(screenshots=2),
                output,
            )

            self.assertEqual(len(captured), 2)
            self.assertTrue(all(images.valid_png(path) for path in captured))
            self.assertTrue(any(path.stat().st_size < 75_001 for path in captured))

            black_media = root / "black.mp4"
            black_output = root / "black-screens"
            black_output.mkdir()
            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=black:size=640x360:rate=24:duration=4",
                    "-c:v",
                    "mpeg4",
                    "-pix_fmt",
                    "yuv420p",
                    str(black_media),
                ],
                check=True,
                capture_output=True,
            )
            with self.assertRaises(images.ImagePipelineError):
                images.capture_screenshots(
                    ffmpeg,
                    black_media,
                    "Black Movie 2024",
                    images.probe_video(ffprobe, black_media),
                    settings_for_test(screenshots=1),
                    black_output,
                )

    def test_groups_site_links_and_builds_full_bbcode(self) -> None:
        sites = images.collect_matching_sites(
            [
                {
                    "site_links": [
                        "https://lst.gg/torrents/10",
                        "https://lst.gg/torrents/10",
                        "https://reelflix.cc/torrents/20",
                    ]
                },
                {"site_links": ["https://lst.gg/torrents/11", "not a URL"]},
            ]
        )
        uploads = [
            images.UploadResult(
                "https://thumb.example/a.png",
                "https://raw.example/a.png",
                "https://view.example/a",
            ),
            images.UploadResult(
                "https://thumb.example/b.png",
                "https://raw.example/b.png",
                "https://view.example/b",
            ),
        ]

        self.assertEqual(
            sites,
            [
                {
                    "site": "lst.gg",
                    "links": [
                        "https://lst.gg/torrents/10",
                        "https://lst.gg/torrents/11",
                    ],
                },
                {"site": "reelflix.cc", "links": ["https://reelflix.cc/torrents/20"]},
            ],
        )
        self.assertEqual(
            images.bbcode_for_uploads(uploads, 350),
            "[url=https://view.example/a][img=350]https://raw.example/a.png[/img][/url]"
            "[url=https://view.example/b][img=350]https://raw.example/b.png[/img][/url]",
        )

    def test_source_detail_link_is_a_matching_site_without_client_comment(self) -> None:
        lst_source = {
            **source(),
            "site": "LST",
            "details_url": "https://lst.gg/torrents/12",
        }

        sites = images.collect_matching_sites(
            [{"site_links": []}],
            [lst_source],
        )

        self.assertEqual(
            sites,
            [{"site": "lst.gg", "links": ["https://lst.gg/torrents/12"]}],
        )

    def test_lists_each_unmatched_source_torrent(self) -> None:
        groups = [
            {
                "name": "Unmatched Release",
                "source_torrents": [source("old one"), {**source("old two"), "torrent_id": "13"}],
                "client_matches": [],
            },
            {
                "name": "Matched Release",
                "source_torrents": [source("not listed")],
                "client_matches": [{"hash": "abc"}],
            },
        ]

        result = images.unmatched_sources(groups)

        self.assertEqual([item["source_torrent"]["torrent_id"] for item in result], ["12", "13"])
        self.assertEqual([item["source_torrent"]["name"] for item in result], ["Release", "Release"])
        self.assertEqual([item["existing_bbcode"] for item in result], ["old one", "old two"])

    def test_processes_one_client_match_and_both_conditional_hosts(self) -> None:
        normal_uploads = [
            images.UploadResult("https://normal/t.png", "https://normal/a.png", "https://normal/a")
        ]
        lostimg_uploads = [
            images.UploadResult("https://lostimg.cc/a.png", "https://lostimg.cc/a.png", "https://lostimg.cc/a.png")
        ]
        reelflix_uploads = [
            images.UploadResult("https://img.reelflix.cc/t.png", "https://img.reelflix.cc/a.png", "https://img.reelflix.cc/a")
        ]
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "Release.mkv"
            media.write_bytes(b"video")
            group = {
                "name": "Release",
                "source_torrents": [
                    {
                        **source(),
                        "site": "LST",
                        "details_url": "https://lst.gg/torrents/12",
                    }
                ],
                "client_matches": [
                    {
                        "hash": "first",
                        "name": "Release.mkv",
                        "content_path": str(media),
                        "site_links": [
                            "https://reelflix.cc/torrents/20",
                        ],
                    },
                    {
                        "hash": "second",
                        "name": "Release.mkv",
                        "content_path": str(media),
                        "site_links": [],
                    },
                ],
            }
            settings = settings_for_test(
                lostimg=images.HostConfig("lostimg", "lost-key"),
                reelflix=images.HostConfig("reelflix", "rf-key"),
            )
            upload_barrier = threading.Barrier(3)
            upload_sessions: list[object] = []
            upload_headers: list[dict[str, str]] = []

            def concurrent_upload(result: Any) -> Any:
                """Return an uploader that must overlap the other two lanes."""

                def upload(session: Any, *_: Any) -> Any:
                    """Record the lane session and wait until every lane is active."""

                    upload_sessions.append(session)
                    upload_headers.append(dict(session.headers))
                    upload_barrier.wait(timeout=5)
                    return result

                return upload

            with images.requests.Session() as session:
                session.headers.update(
                    {"Accept": "application/json", "User-Agent": "test-image-pipeline"}
                )
                with (
                    patch.object(images, "probe_video", return_value=images.VideoInfo(100, "")),
                    patch.object(images, "capture_screenshots", return_value=[Path("screen.png")]),
                    patch.object(
                        images,
                        "upload_normal_round_robin",
                        side_effect=concurrent_upload(("pixhost", normal_uploads)),
                    ),
                    patch.object(
                        images,
                        "upload_lostimg",
                        side_effect=concurrent_upload(lostimg_uploads),
                    ),
                    patch.object(
                        images,
                        "upload_batch",
                        side_effect=concurrent_upload(reelflix_uploads),
                    ),
                ):
                    result, failed = images.process_matched_group(
                        session, group, settings, "ffmpeg", "ffprobe", 0
                    )

        self.assertFalse(failed)
        self.assertEqual(len({id(session) for session in upload_sessions}), 3)
        self.assertTrue(
            all(headers["User-Agent"] == "test-image-pipeline" for headers in upload_headers)
        )
        self.assertEqual(result[0]["client_match"]["hash"], "first")
        self.assertEqual(result[0]["replacement"]["image_host"], "pixhost")
        by_site = {item["site"]: item for item in result[0]["matching_sites"]}
        self.assertEqual(by_site["lst.gg"]["image_upload"]["image_host"], "lostimg")
        self.assertEqual(
            by_site["reelflix.cc"]["image_upload"]["image_host"],
            "reelflix",
        )

    def test_retains_normal_upload_when_lostimg_cannot_read_a_screenshot(self) -> None:
        """Record a Lostimg file error without discarding the normal upload."""

        normal_uploads = [
            images.UploadResult("https://normal/t.png", "https://normal/a.png", "https://normal/a")
        ]
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "Release.mkv"
            media.write_bytes(b"video")
            group = {
                "name": "Release",
                "source_torrents": [
                    {
                        **source(),
                        "site": "LST",
                        "details_url": "https://lst.gg/torrents/12",
                    }
                ],
                "client_matches": [
                    {
                        "hash": "selected",
                        "name": "Release.mkv",
                        "content_path": str(media),
                        "site_links": [],
                    }
                ],
            }
            settings = settings_for_test(
                lostimg=images.HostConfig("lostimg", "lost-key")
            )
            with (
                images.requests.Session() as session,
                patch.object(images, "probe_video", return_value=images.VideoInfo(100, "")),
                patch.object(images, "capture_screenshots", return_value=[Path("screen.png")]),
                patch.object(
                    images,
                    "upload_normal_round_robin",
                    return_value=("pixhost", normal_uploads),
                ),
                patch.object(images, "upload_lostimg", side_effect=OSError("disk failure")),
            ):
                result, failed = images.process_matched_group(
                    session, group, settings, "ffmpeg", "ffprobe", 0
                )

        self.assertTrue(failed)
        self.assertEqual(result[0]["replacement"]["image_host"], "pixhost")
        by_site = {item["site"]: item for item in result[0]["matching_sites"]}
        self.assertEqual(by_site["lst.gg"]["image_upload_error"], "disk failure")

    def test_retains_selected_client_match_when_probe_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "Release.mkv"
            media.write_bytes(b"video")
            group = {
                "name": "Release",
                "source_torrents": [source()],
                "client_matches": [
                    {
                        "hash": "selected",
                        "name": "Release.mkv",
                        "content_path": str(media),
                        "site_links": [],
                    }
                ],
            }
            with patch.object(
                images,
                "probe_video",
                side_effect=images.ImagePipelineError("probe failed"),
            ):
                result, failed = images.process_matched_group(
                    object(), group, settings_for_test(), "ffmpeg", "ffprobe", 0
                )

        self.assertTrue(failed)
        self.assertEqual(result[0]["client_match"]["hash"], "selected")
        self.assertEqual(result[0]["processing_error"], "probe failed")

    def test_main_resumes_existing_results_and_keeps_original_host_rotation(self) -> None:
        """Skip completed sources and append only remaining source results."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "qui.json"
            config_path = root / "config.images.json"
            matching_path = root / "matching.json"
            nonmatching_path = root / "nonmatching.json"
            groups = []
            for torrent_id, name in (("1", "First Release"), ("2", "Second Release")):
                source_torrent = {
                    **source(name=name),
                    "torrent_id": torrent_id,
                    "details_url": f"https://aither.cc/torrents/{torrent_id}",
                }
                groups.append(
                    {
                        "name": name,
                        "source_torrents": [source_torrent],
                        "client_matches": [
                            {
                                "hash": torrent_id * 40,
                                "name": f"{name}.mkv",
                                "content_path": str(root / f"{name}.mkv"),
                                "site_links": [],
                            }
                        ],
                        "other_site_links": [],
                    }
                )
            input_path.write_text(json.dumps(groups), encoding="utf-8")
            config_path.write_text(
                json.dumps({"normal_hosts": [{"name": "pixhost"}]}),
                encoding="utf-8",
            )
            existing = {
                "source_torrent": {
                    "site": "Aither",
                    "torrent_id": "1",
                    "name": "First Release",
                    "details_url": "https://aither.cc/torrents/1",
                },
                "processing_error": "previous failure",
            }
            matching_path.write_text(json.dumps([existing]), encoding="utf-8")
            processed: list[tuple[str, int]] = []

            def process_group(
                _session: object,
                group: dict[str, Any],
                _settings: images.Settings,
                _ffmpeg: str,
                _ffprobe: str,
                host_index: int,
            ) -> tuple[list[dict[str, Any]], bool]:
                """Return one synthetic result and record the rotation index."""

                processed.append((group["name"], host_index))
                result = images.result_for_source(
                    group,
                    group["source_torrents"][0],
                    group["client_matches"][0],
                    [],
                    {"image_host": "pixhost", "bbcode": "new", "images": []},
                )
                return [result], False

            argv = [
                "capture_upload_images.py",
                str(input_path),
                str(config_path),
                "--matching-output",
                str(matching_path),
                "--non-matching-output",
                str(nonmatching_path),
            ]
            with (
                patch.object(sys, "argv", argv),
                patch.object(images, "resolve_program", side_effect=lambda _path, name: name),
                patch.object(images, "process_matched_group", side_effect=process_group) as process,
            ):
                self.assertEqual(images.main(), 0)
                self.assertEqual(images.main(), 0)

            saved = json.loads(matching_path.read_text(encoding="utf-8"))

        self.assertEqual(processed, [("Second Release", 1)])
        self.assertEqual(process.call_count, 1)
        self.assertEqual([item["source_torrent"]["torrent_id"] for item in saved], ["1", "2"])
        self.assertEqual(saved[0]["processing_error"], "previous failure")

    def test_main_rejects_output_collision_without_overwriting_resume_file(self) -> None:
        """Reject aliased outputs before changing an existing resume file."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "qui.json"
            config_path = root / "config.images.json"
            output_path = root / "matching.json"
            input_path.write_text("[]\n", encoding="utf-8")
            config_path.write_text("{}\n", encoding="utf-8")
            original = '[{"resume":"preserve exactly"}]\n'
            output_path.write_text(original, encoding="utf-8")
            argv = [
                "capture_upload_images.py",
                str(input_path),
                str(config_path),
                "--matching-output",
                str(output_path),
                "--non-matching-output",
                str(output_path),
            ]

            with patch.object(sys, "argv", argv):
                self.assertEqual(images.main(), 2)

            preserved = output_path.read_text(encoding="utf-8")

        self.assertEqual(preserved, original)


if __name__ == "__main__":
    unittest.main()
