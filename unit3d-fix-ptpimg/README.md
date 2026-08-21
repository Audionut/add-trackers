# UNIT3D PTPImg replacement tools

These scripts find torrents whose descriptions contain linked `ptpimg.me`
images, match those torrents to content in a qBittorrent client exposed through
qui, and capture replacement screenshots for the matched files.

Use a recent version of qBitTorrent for the better torrent comment handling,
so that matching torrents from other sites can have their urls pulled.

Has resume handling, so that interrupted `capture_upload_images.py`
processing can resume past existing processed content.

Disc content handling is currently lacking/not working.

```text
UNIT3D sites
    -> unit3d_ptpimg_torrents.py
    -> unit3d_ptpimg_results.json
    -> qui_match_torrents.py
    -> qui_torrent_matches.json
    -> capture_upload_images.py
    -> matching_results.json + non_matching_results.json
```

Run the commands below from the repository root in PowerShell.

## Requirements

- Python 3.10 or newer.
- The Python packages in `requirements.txt`.
- A qui proxy URL connected to the qBittorrent client containing the media.
- `ffmpeg` and `ffprobe` for screenshot capture.
- API tokens for each UNIT3D site and each configured image host, except
  Imgbox and Pixhost, which do not require keys.
- Read access to the full `content_path` returned by qui.

Install the Python dependencies:

```powershell
py -m pip install -r .\requirements.txt
```

Check that FFmpeg is available:

```powershell
ffmpeg -version
ffprobe -version
```

Configuration files are read directly by the scripts; API keys are not read
from environment variables. Files beginning with `config` are ignored by this
repository, but you should still avoid sharing or committing them.

## 1. Find UNIT3D torrents containing PTPImg BBCode

Create `config.unit3d.json` in the repository root:

```json
[
  {
    "name": "Aither",
    "url": "https://aither.cc",
    "api_token": "YOUR_AITHER_API_TOKEN"
  },
  {
    "name": "Another site",
    "url": "https://tracker.example",
    "api_token": "YOUR_OTHER_API_TOKEN",
    "api_path": "/api/torrents/filter"
  }
]
```

`api_path` is optional and defaults to `/api/torrents/filter`. Site URLs must
be absolute HTTPS URLs without embedded credentials, queries, or fragments.

Run the search for one uploader:

```powershell
py .\unit3d-fix-ptpimg\unit3d_ptpimg_torrents.py `
  .\config.unit3d.json `
  --uploader "UploaderName" `
  --output .\unit3d_ptpimg_results.json
```

For each site, the script sends an authenticated `GET` request to the configured
torrent filter endpoint with these query values:

```text
description=ptpimg
uploader=UploaderName
perPage=100
```

The API token is sent as a Bearer authorization header. The script follows all
`page` or `cursor` results and reapplies the uploader and description filters on
every request.

Only complete linked image blocks are retained:

```bbcode
[url=https://ptpimg.me/abc123.png][img=350]https://ptpimg.me/abc123.png[/img][/url]
```

Example output:

```json
[
  {
    "site": "Aither",
    "torrent_id": "12345",
    "name": "Example Movie 2024 1080p BluRay REMUX AVC-GROUP",
    "folder": null,
    "file_names": [
      "Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv"
    ],
    "details_url": "https://aither.cc/torrents/12345",
    "description_bbcode": "[url=https://ptpimg.me/abc123.png][img=350]https://ptpimg.me/abc123.png[/img][/url]"
  }
]
```

`file_names` contains a value only when UNIT3D reports one root-level file and
no torrent folder. Multi-file torrents and disc structures use an empty array,
preventing large file listings from being copied into the output.

## 2. Match the results to torrents in qui

Create `config.qui.json`:

```json
{
  "qui_proxy_url": "http://localhost:7476/proxy/YOUR_QUI_CLIENT_API_KEY"
}
```

Run the matcher:

```powershell
py .\unit3d-fix-ptpimg\qui_match_torrents.py `
  .\unit3d_ptpimg_results.json `
  .\config.qui.json `
  --output .\qui_torrent_matches.json
```

For each source release, the script:

1. Searches qui using the UNIT3D release name, torrent folder, and retained
   single filename when available.
2. Normalizes case, spaces, dots, brackets, dashes, and common video extensions
   so differently formatted single-file names can match.
3. Paginates through all qui search results in groups of 100.
4. Includes other client torrents sharing the same content path.
5. Reads torrent comments through the properties endpoint and extracts safe
   tracker links while excluding announce URLs and credential-bearing links.

Example output:

```json
[
  {
    "name": "Example Movie 2024 1080p BluRay REMUX AVC-GROUP",
    "source_torrents": [
      {
        "site": "Aither",
        "torrent_id": "12345",
        "name": "Example Movie 2024 1080p BluRay REMUX AVC-GROUP",
        "details_url": "https://aither.cc/torrents/12345",
        "description_bbcode": "[url=https://ptpimg.me/abc123.png][img=350]https://ptpimg.me/abc123.png[/img][/url]",
        "file_names": [
          "Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv"
        ]
      }
    ],
    "client_matches": [
      {
        "hash": "0123456789abcdef0123456789abcdef01234567",
        "name": "Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv",
        "content_path": "D:\\Movies\\Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv",
        "site_links": [
          "https://lst.gg/torrents/67890",
          "https://reelflix.cc/torrents/24680"
        ]
      }
    ],
    "other_site_links": [
      "https://lst.gg/torrents/67890",
      "https://reelflix.cc/torrents/24680"
    ]
  }
]
```

Groups with no qui match remain in the output with an empty `client_matches`
array. `content_path` is the full path reported by the client.

## 3. Capture and upload replacement screenshots

Create `config.images.json`. The example below enables every supported host;
remove hosts you do not use and disable special hosts as needed.

```json
{
  "normal_hosts": [
    {
      "name": "pixhost"
    },
    {
      "name": "imgbox"
    },
    {
      "name": "imgbb",
      "api_key": "YOUR_IMGBB_API_KEY"
    },
    {
      "name": "onlyimage",
      "api_key": "YOUR_ONLYIMAGE_API_KEY"
    },
    {
      "name": "ptscreens",
      "api_key": "YOUR_PTSCREENS_API_KEY"
    }
  ],
  "lostimg": {
    "enabled": true,
    "api_key": "YOUR_LOSTIMG_API_KEY"
  },
  "reelflix": {
    "enabled": true,
    "api_key": "YOUR_REELFLIX_IMAGE_HOST_API_KEY"
  },
  "screenshots": 4,
  "process_limit": 4,
  "thumbnail_size": 350,
  "ffmpeg_compression": 6,
  "tone_map_hdr": true,
  "request_timeout": 60,
  "upload_retries": 3,
  "ffmpeg_path": "",
  "ffprobe_path": ""
}
```

Run the capture and upload stage:

```powershell
py .\unit3d-fix-ptpimg\capture_upload_images.py `
  .\qui_torrent_matches.json `
  .\config.images.json `
  --matching-output .\matching_results.json `
  --non-matching-output .\non_matching_results.json
```

You can pass a config elsewhere, for example `D:\config.images.json`.

### Resume an interrupted run

Resume is automatic when `--matching-output` already exists. Before resolving
FFmpeg or starting an upload, the script loads and validates that JSON file and
matches its entries to the current qui input by case-insensitive `site` plus
`torrent_id`.

- Existing matching results are preserved in their original order.
- Only missing source torrents are processed and appended.
- If part of a multi-source release is missing, the release is processed once
  and only its missing result entries are appended.
- Normal-host rotation uses the release's original position in the full input,
  so resuming does not change its assigned starting host.
- Existing entries containing `processing_error` or `image_upload_error` count
  as processed. Delete that source-torrent entry from the matching JSON if you
  want to retry it.
- The exit code reports work attempted by the current invocation; inspect any
  preserved error fields separately.
- Existing entries that are no longer present in the input are preserved and
  reported with a warning.
- `non_matching_results.json` is regenerated from the current input because it
  does not require capture or upload work.

To force a completely fresh run, delete or rename the matching output file, or
choose a different `--matching-output` path.

The input, config, matching-output, and non-matching-output paths must all be
different. The script resolves and compares them before writing anything, then
stops with exit code `2` if two paths refer to the same file.

### Image configuration reference

| Setting | Default | Description |
| --- | ---: | --- |
| `normal_hosts` | Required | Non-empty, duplicate-free list containing `pixhost`, `imgbox`, `imgbb`, `onlyimage`, or `ptscreens`. Imgbox and Pixhost are keyless; all others require `api_key`. |
| `lostimg` | Disabled | Set `enabled` to `true` and provide `api_key` to upload for matching `lst.gg` torrents. |
| `reelflix` | Disabled | Set `enabled` to `true` and provide `api_key` to upload for matching ReelFlix torrents. |
| `screenshots` | `4` | Frames captured per file; allowed range is 1–20. |
| `process_limit` | `4` | Maximum concurrent FFmpeg screenshot processes for the current file; allowed range is 1–20. |
| `thumbnail_size` | `350` | Value placed in `[img=...]`; allowed range is 1–1000. |
| `ffmpeg_compression` | `6` | PNG compression level; allowed range is 0–9. |
| `tone_map_hdr` | `true` | Tone-map detected PQ or HLG video to SDR before upload. |
| `request_timeout` | `60` | Timeout in seconds for an image-host request; allowed range is 1–300. |
| `upload_retries` | `3` | Retries after the first upload attempt; allowed range is 0–5. |
| `ffmpeg_path` | `""` | Full executable path. Leave empty to search `PATH`. |
| `ffprobe_path` | `""` | Full executable path. Leave empty to search `PATH`. |

Windows paths inside JSON must escape backslashes:

```json
{
  "ffmpeg_path": "C:\\ffmpeg\\bin\\ffmpeg.exe",
  "ffprobe_path": "C:\\ffmpeg\\bin\\ffprobe.exe"
}
```

### Capture and upload behavior

- One accessible client match is selected for each release. Other matched
  torrents remain listed as matching-site evidence but are not captured again.
- A direct video file is used as-is. For a folder or disc structure, the largest
  supported video file below that folder is selected.
- Frames are distributed through the video and generated concurrently, up to
  `process_limit` FFmpeg processes for the current file. Each frame retries
  nearby timestamps sequentially when it is black or invalid.
- Screenshots are stored only in a temporary directory. Local PNG files are
  deleted after the upload stage completes.
- Ctrl+C cancels queued frame captures and prevents active workers from starting
  another timestamp retry. Any FFmpeg process already running is allowed to
  unwind before the temporary files are removed.
- Releases are processed one at a time.
- Within the current release, the normal-host, Lostimg, and ReelFlix upload
  lanes run concurrently using separate HTTP sessions.
- Normal hosts rotate by release. If the assigned host fails, each remaining
  configured normal host is tried once in order.
- Imgbox uses one anonymous session and upload token for the current screenshot
  batch; no Imgbox API key is required.
- Lostimg runs only when Lostimg is enabled and an `lst.gg` match exists.
- ReelFlix image hosting runs only when it is enabled and a matching
  `reelflix.cc` or `reelflix.xyz` link exists.
- A release matching both LST and ReelFlix therefore produces three upload
  sets: one normal replacement, one Lostimg set, and one ReelFlix set.
- Matching results are saved after every release so completed work remains in
  the JSON if a later release fails or the process is interrupted.

## Output files

### `matching_results.json`

This file contains source torrents with at least one qui client match. The
normal upload is the general replacement for the old PTPImg BBCode. Special
uploads are attached to their corresponding matching-site entries.

```json
[
  {
    "source_torrent": {
      "site": "Aither",
      "torrent_id": "12345",
      "name": "Example Movie 2024 1080p BluRay REMUX AVC-GROUP",
      "details_url": "https://aither.cc/torrents/12345",
      "file_names": [
        "Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv"
      ]
    },
    "existing_bbcode": "[url=https://ptpimg.me/abc123.png][img=350]https://ptpimg.me/abc123.png[/img][/url]",
    "client_match": {
      "hash": "0123456789abcdef0123456789abcdef01234567",
      "name": "Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv",
      "content_path": "D:\\Movies\\Example.Movie.2024.1080p.BluRay.REMUX.AVC-GROUP.mkv"
    },
    "matching_sites": [
      {
        "site": "lst.gg",
        "links": [
          "https://lst.gg/torrents/67890"
        ],
        "image_upload": {
          "image_host": "lostimg",
          "bbcode": "[url=https://lostimg.cc/example.png][img=350]https://lostimg.cc/example.png[/img][/url]",
          "images": [
            {
              "thumbnail_url": "https://lostimg.cc/example.png",
              "raw_url": "https://lostimg.cc/example.png",
              "web_url": "https://lostimg.cc/example.png"
            }
          ]
        }
      }
    ],
    "replacement": {
      "image_host": "pixhost",
      "bbcode": "[url=https://pixhost.to/show/example][img=350]https://img.example/images/example.png[/img][/url]",
      "images": [
        {
          "thumbnail_url": "https://t.example/thumbs/example.png",
          "raw_url": "https://img.example/images/example.png",
          "web_url": "https://pixhost.to/show/example"
        }
      ]
    }
  }
]
```

With the default four screenshots, each `bbcode` value contains four complete
`[url][img][/img][/url]` blocks concatenated in screenshot order. Each image is
also listed separately under `images` with its thumbnail, original, and viewer
URL.

If capture or the normal upload fails, the entry contains `processing_error`
instead of `replacement`. If Lostimg or ReelFlix alone fails, the corresponding
site contains `image_upload_error` and a successful normal replacement remains
available.

### `non_matching_results.json`

This file lists every source torrent belonging to a group with no qui client
match:

```json
[
  {
    "source_torrent": {
      "site": "Aither",
      "torrent_id": "54321",
      "name": "Unmatched Movie 2023 1080p WEB-DL-GROUP",
      "details_url": "https://aither.cc/torrents/54321"
    },
    "existing_bbcode": "[url=https://ptpimg.me/old123.png][img=350]https://ptpimg.me/old123.png[/img][/url]"
  }
]
```

Capture failures are not placed in this file because they had a qui match;
check `processing_error` in `matching_results.json` instead.

## Exit codes

| Script | Code | Meaning |
| --- | ---: | --- |
| `unit3d_ptpimg_torrents.py` | `0` | Every configured site completed. |
| `unit3d_ptpimg_torrents.py` | `1` | At least one site failed; partial results were still saved. |
| `unit3d_ptpimg_torrents.py` | `2` | Configuration or output handling failed. |
| `qui_match_torrents.py` | `0` | Search and output completed. Comment-property warnings may still be printed. |
| `qui_match_torrents.py` | `2` | Input, config, qui response, or output handling failed. |
| `capture_upload_images.py` | `0` | Every matching release and applicable image host succeeded. |
| `capture_upload_images.py` | `1` | At least one capture or image-host operation failed; inspect the saved JSON. |
| `capture_upload_images.py` | `2` | Startup validation or output handling failed. |
| `capture_upload_images.py` | `130` | The capture process was interrupted with Ctrl+C. |

## Troubleshooting

### `torrent search response is missing a torrents field`

Confirm that `qui_proxy_url` points to the qui client proxy, not directly to
qBittorrent or the qui web interface. The search endpoint must return either a
JSON object containing `torrents` or the older array response.

### No qui client match

Check that the torrent is visible through the configured qui proxy. Compare the
UNIT3D name, folder, and single filename with the qBittorrent name, then inspect
the corresponding entry in `qui_torrent_matches.json`.

### `no client match has an accessible video file`

The `content_path` must exist and be readable on the machine running the
capture script. If qui and the capture script run on different machines or
operating systems, their media paths must refer to the same accessible path.

### FFmpeg or ffprobe was not found

Add the FFmpeg `bin` directory to `PATH`, or set the full escaped paths in
`config.images.json` using `ffmpeg_path` and `ffprobe_path`.

### An image host returns HTTP 401 or 403

Verify that the API key belongs to that image host, is still active, and was
copied into the correct config property. For Lostimg, the script sends the key
as a Bearer token and uploads the screenshots as a `file[]` multipart batch.

### The capture script exits with code 1

The output files may still contain usable completed results. Check
`processing_error` on the matching result and `image_upload_error` on LST or
ReelFlix matching-site entries before rerunning the entire input.

## Run the tests

```powershell
py -m unittest discover -s .\unit3d-fix-ptpimg\test -v
```
