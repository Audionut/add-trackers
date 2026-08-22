from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import capture_upload_images as images
import qui_match_torrents as qui
import unit3d_ptpimg_torrents as collector


class SharedConfigTest(unittest.TestCase):
    def test_one_config_loads_for_every_pipeline_stage(self) -> None:
        payload = {
            "sites": [
                {
                    "name": "Aither",
                    "url": "https://aither.cc",
                    "api_token": "site-token",
                }
            ],
            "qui_proxy_url": "http://localhost:7476/proxy/client-key",
            "normal_hosts": [{"name": "pixhost"}],
            "request_timeout": 45,
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.unit3d.json"
            path.write_text(json.dumps(payload), encoding="utf-8")

            sites = collector.load_sites(path)
            proxy_url, qui_timeout = qui.load_qui_settings(path)
            image_settings = images.load_settings(path)

        self.assertEqual(
            sites,
            [collector.Site("Aither", "https://aither.cc", "site-token")],
        )
        self.assertEqual(proxy_url, "http://localhost:7476/proxy/client-key")
        self.assertEqual(qui_timeout, 45)
        self.assertEqual(image_settings.request_timeout, 45)
        self.assertEqual(
            image_settings.normal_hosts,
            (images.HostConfig("pixhost"),),
        )

    def test_shared_request_timeout_defaults_consistently(self) -> None:
        payload = {
            "qui_proxy_url": "http://localhost:7476/proxy/client-key",
            "normal_hosts": [{"name": "pixhost"}],
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.unit3d.json"
            path.write_text(json.dumps(payload), encoding="utf-8")

            _proxy_url, qui_timeout = qui.load_qui_settings(path)
            image_settings = images.load_settings(path)

        self.assertEqual(qui_timeout, 60)
        self.assertEqual(image_settings.request_timeout, 60)


if __name__ == "__main__":
    unittest.main()
