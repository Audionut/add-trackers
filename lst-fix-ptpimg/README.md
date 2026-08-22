# LST PTPImg replacement tools

This LST-only pipeline reads the authenticated image-replacement queue, fetches
each torrent's complete BBCode description, finds the matching local torrent
through qui/qBittorrent, captures new screenshots, uploads one copy to LostImg,
uploads one shared normal-host copy for every matching non-LST torrent, and
submits the complete LostImg description to LST for staff review.

```text
LST image-replacements queue
    -> lst_ptpimg_torrents.py
    -> lst_ptpimg_results.json
    -> qui_match_torrents.py
    -> qui_torrent_matches.json
    -> capture_upload_images.py
    -> replacement_results.json + non_matching_results.json + site_matches\*.json
    -> submit_description_changes.py
    -> submission_results.json
```

The scripts replace linked or bare PTPImg image BBCode one block at a time.
Everything else in the description is preserved byte-for-byte. PTPImg links
inside `[comparison]...[/comparison]` blocks are intentionally left unchanged,
as permitted by LST's API.

## Requirements

- Python 3.10 or newer.
- Packages from the repository's `requirements.txt`.
- `ffmpeg` and `ffprobe` on `PATH`, or explicit executable paths in config.
- A qui proxy connected to the qBittorrent instance holding the media.
- An LST API token with `torrents.read` and `description_changes.write` scopes.
- A LostImg API key.
- API keys for each configured normal host that requires one. Imgbox and Pixhost
  are keyless.
- A Netscape-format cookie file exported only for `lst.gg`.

From the repository root in PowerShell:

```powershell
py -m pip install -r .\requirements.txt
ffmpeg -version
ffprobe -version
```

## Configuration

Create `lst-fix-ptpimg\config.lst.json`. Config files are ignored by Git.

```json
{
  "lst_api_token": "YOUR_LST_API_TOKEN",
  "lst_cookie_file": "cookies.lst.txt",
  "qui_proxy_url": "http://localhost:7476/proxy/YOUR_QUI_CLIENT_API_KEY",
  "lostimg_api_key": "YOUR_LOSTIMG_API_KEY",
  "normal_hosts": [
    {"name": "pixhost"},
    {"name": "imgbox"},
    {"name": "imgbb", "api_key": "YOUR_IMGBB_API_KEY"},
    {"name": "onlyimage", "api_key": "YOUR_ONLYIMAGE_API_KEY"},
    {"name": "ptscreens", "api_key": "YOUR_PTSCREENS_API_KEY"}
  ],
  "process_limit": 4,
  "max_screenshots": 12,
  "thumbnail_size": 350,
  "ffmpeg_compression": 6,
  "tone_map_hdr": true,
  "request_timeout": 60,
  "upload_retries": 3,
  "ffmpeg_path": "",
  "ffprobe_path": ""
}
```

Relative `lst_cookie_file` paths are resolved from the config directory.
Export the logged-in LST cookies in Netscape `cookies.txt` format and save them
as `lst-fix-ptpimg\cookies.lst.txt`. The collector ignores cookies for other
domains and rejects expired or unauthenticated cookies. Never put the cookie
value directly in the JSON config.

Generated result, cookie, state, and config files in this folder are ignored by
Git. They can contain private tracker descriptions, client paths, or credentials.

## 1. Collect the LST queue and full descriptions

```powershell
py .\lst-fix-ptpimg\lst_ptpimg_torrents.py `
  .\lst-fix-ptpimg\config.lst.json
```

For a bounded test run, add `--limit 1` to process only the first current queue
row. Queue discovery still completes so valid saved results outside that prefix
are retained and stale or pending IDs are pruned correctly.

The collector requests every page of:

```text
https://lst.gg/image-replacements?pending=false&seeding=true
```

Rows marked snoozed or pending review are skipped even if LST includes them in
the filtered response, so an existing application is never collected again.

It requires each `ptpimg-torrent-{id}` row key to agree with that row's
`/torrents/{id}` title link. The `pending=false` and `seeding=true` filters are
sent again on every page even though LST's pagination links omit them.

For every queue ID, the script calls `GET /api/torrents/{id}` and stores the
complete `attributes.description`, not only the matching image blocks. It also
keeps every API filename for later client matching. Queue entries that no longer
contain replaceable PTPImg BBCode are skipped.

Torrent API requests start no more than once every two seconds. The output is written
atomically after every attempted row; rerunning reloads that checkpoint, skips
already saved queue IDs, and retries IDs that previously failed.

Default output:

```text
lst-fix-ptpimg\lst_ptpimg_results.json
```

## 2. Find the local torrent through qui

```powershell
py .\lst-fix-ptpimg\qui_match_torrents.py `
  .\lst-fix-ptpimg\lst_ptpimg_results.json `
  .\lst-fix-ptpimg\config.lst.json
```

The matcher follows Upload Assistant's qui search filtering: brackets and
Unicode symbols are sanitized, and each full name is supplemented by a compact
title-plus-year or title-plus-season search. For example,
`Pakeezah 1972 NTSC DVD9 DD 5.1` also searches `pakeezah 1972`, allowing qui to
return `Pakeezah.1972.Shemaroo.DVD9.Untouched`.

Each candidate is enriched through qui's properties, files, and trackers
endpoints. Matching evidence is applied in this order:

1. The qBittorrent comment contains the exact `https://lst.gg/torrents/{id}`.
2. The torrent name, content name, or sole filename matches after normalization.
3. A title/year-or-season fuzzy match passes only when the torrent also has an
   LST tracker.

The script loads qui's paginated torrent inventory once. After finding a direct
match, it also saves every other qBittorrent torrent with the same absolute
`content_path`, matching the general UNIT3D workflow's cross-seed retention.
Output records include all qBittorrent filenames, safe comment links, tracker
hostnames, and match reasons; announce URLs and their passkeys are not saved.
Each source success or error is checkpointed atomically as soon as its search finishes.
Rerunning skips completed records for unchanged LST sources and retries saved
search failures or records whose source data changed.

Default output:

```text
lst-fix-ptpimg\qui_torrent_matches.json
```

## 3. Capture and upload replacements

```powershell
py .\lst-fix-ptpimg\capture_upload_images.py `
  .\lst-fix-ptpimg\qui_torrent_matches.json `
  .\lst-fix-ptpimg\config.lst.json
```

To process descriptions with more replaceable images than `max_screenshots`, add
`--process-at-max-screenshots`. The script captures and replaces the first
`max_screenshots` blocks, removes later replaceable PTPImg blocks from both LST
and other-site descriptions, and preserves every `[comparison]` block unchanged.
Without the flag, oversized torrents remain recorded failures.

The script captures exactly one new screenshot for each replaceable image block.
It uploads the ordered batch to `https://lostimg.cc/api/v1/images` and, when qui
found a matching non-LST torrent link, concurrently uploads the same screenshots
to one normal host. Normal hosts are assigned round-robin in configured order;
one failed host falls through to each remaining configured host once. Supported
normal hosts are ImgBB, Imgbox, OnlyImage, Pixhost, and PTScreens.

The one normal-host upload set for an LST torrent is reused for every other-site
match to that LST ID. Original image-tag sizing and formatting are preserved
while only PTPImg URLs change. A linked image uses the normal host's viewer URL
outside and original-image URL inside; a bare image uses the original-image URL.
For a DVD directory the largest VOB is used; for a Blu-ray directory the largest
M2TS is used.

Each success or error is checkpointed to `replacement_results.json` immediately
after that torrent finishes. Rerunning the same command preserves only records
that exactly reconstruct both saved descriptions and retries stale, tampered, or
failed records. Per-site files are reconciled on every checkpoint; a tracker no
longer present in the current input is retained as an empty JSON array instead of
stale matches. Increase `max_screenshots` only when a legitimate LST description
contains more than the configured limit.

Default outputs:

```text
lst-fix-ptpimg\replacement_results.json
lst-fix-ptpimg\non_matching_results.json
lst-fix-ptpimg\site_matches\<tracker-host>.json
```

Each tracker-host file contains that site's details URL and torrent ID when it
can be parsed, qBittorrent name and `info_hash`, an optional sole `filename`, the
chosen `image_host`, and the complete normal-host `proposed_description`. It
never contains LST metadata or `existing_bbcode`.

## 4. Validate and submit full descriptions

Run the read-only dry run first:

```powershell
py .\lst-fix-ptpimg\submit_description_changes.py `
  .\lst-fix-ptpimg\replacement_results.json `
  .\lst-fix-ptpimg\config.lst.json
```

The dry run refetches every current full description and rejects any torrent
whose description changed after collection. It also reconstructs the proposal
from the current BBCode and LostImg URLs to prove that no unrelated text changes.

Submit the validated applications:

```powershell
py .\lst-fix-ptpimg\submit_description_changes.py `
  .\lst-fix-ptpimg\replacement_results.json `
  .\lst-fix-ptpimg\config.lst.json `
  --apply
```

Each `POST /api/description-changes/torrents/{id}` sends JSON containing the full
proposed `description` plus a staff `message`. Accepted applications are saved
to `submission_results.json` and skipped on later runs, preventing duplicate
submissions of that exact source/proposal fingerprint. A failed, changed, or
stale item is never posted and remains retryable.

Submission validation GETs and description-change POSTs share the same global
one-request-every-two-seconds LST API gate used by the collector.

## Tests

```powershell
py -m unittest discover -s .\lst-fix-ptpimg\test -v
```
