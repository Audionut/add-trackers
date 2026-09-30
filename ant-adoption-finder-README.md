# ANT Adoption Finder Plus

This README applies only to [`ant-adoption-finder.user.js`](./ant-adoption-finder.user.js), currently version `0.2.1`.

The userscript scans ANT adoption listings, builds a saved multi-page view, filters and sorts the collected rows, and searches enabled trackers using the ANT filename and any tracker-specific metadata they require. It can also send matching torrents to qui, monitor their progress, mark rows as Grabbed or Ignored, and optionally complete the ANT adoption flow.

## Requirements

- A userscript manager with the Greasemonkey/Tampermonkey `GM_*` APIs used by the script.
- An ANT account and access to the adoption pages.
- API credentials for any trackers you enable in Settings.
- A reachable qui endpoint and token for qui search, add, monitoring, or automatic-adoption features.
- Popups allowed for `anthelion.me` if you use **Open last scan** or automatic adoption pages.

The script runs on:

- `https://anthelion.me/torrents.php?type=adoption*`
- `https://anthelion.me/torrents.php?id=*`

## Replace the original script without losing settings

Use this method when replacing `ant-adoption-finder.user.js` and you want to retain its existing settings and cache.

1. Open your userscript manager's dashboard.
2. Open the installed script named **ANT - Adoption cross-seed finder** in its editor.
3. Do not delete or uninstall that installed script.
4. Click inside the source editor, select all of the old source, and replace it with the complete contents of [`ant-adoption-finder.user.js`](./ant-adoption-finder.user.js).
5. Save the same installed script entry, normally with `Ctrl+S` or the editor's Save command.
6. Confirm that its metadata header now shows version `0.2.0`.
7. Make sure only one enabled copy of **ANT - Adoption cross-seed finder** is installed.
8. Refresh the ANT adoption page and open **Settings** to verify the retained values.

Overwriting the existing installed entry is important. Installing this file as a second script can give it a separate userscript-storage area and can also make both copies modify the same ANT page.

The replacement is storage-compatible with the original script. It deliberately keeps:

- The same script name and namespace.
- The same GM_config ID: `ANTAdoptionFilenameCrossSeedConfig`.
- The same storage prefix: `ant-adoption-filename-cross-seed`.

Existing tracker credentials, qui settings, compatible lookup caches, and row-completion data therefore remain available when the source is replaced in place. Aggregate tracker match/miss indexes from versions 4 and 5 are deliberately rebuilt under version 6 so previously cached misses do not hide the filename-only BHD and HDB results. A legacy maximum-size value stored in bytes is converted to GiB automatically when the new script starts. Legacy text exclusions and custom exclusion values are cleared automatically; configure the new media dropdowns after upgrading. Valid selections already stored in the new dropdown format are retained.

## Fresh installation

For an installation that does not need to inherit old userscript storage:

1. Create a new userscript in your userscript manager.
2. Replace the generated template with the complete contents of [`ant-adoption-finder.user.js`](./ant-adoption-finder.user.js).
3. Save and enable it.
4. Open an ANT adoption page.
5. Select **Settings**, enable the trackers you use, and enter their credentials.
6. Configure qui only if you want qui matching, torrent submission, monitoring, or automatic adoption.

Do not keep the original and Plus versions enabled together.

## Page layout

The normal ANT adoption pages intentionally show only:

- **Scan _N_ adoption pages**
- **Scan until bounty < _value_** (disabled until **Minimum bounty** is above `0`)
- **Open last scan**
- **Settings**

All filtering and row-processing controls are shown only on the saved filtered page, whose URL includes:

```text
ant_adoption_filtered=1
```

An example is:

```text
https://anthelion.me/torrents.php?type=adoption&page=1&ant_adoption_filtered=1
```

The Settings button works on both the normal listing and the filtered page. On wide screens, Settings has three columns: **Adoption scanning and filters**, **General**, and **Trackers**. General includes separate **Base qui settings** and **ANT qui** sections. The layout stacks on narrow screens.

## Scan and open a filtered page

1. Open `https://anthelion.me/torrents.php?type=adoption`.
2. Select either **Scan _N_ adoption pages** or **Scan until bounty < _value_**. The second button uses the global **Minimum bounty** setting and is disabled while that setting is `0`.
3. The scan stays on the current listing. Its button displays progress while both scan buttons and **Open last scan** are disabled.
4. Scan requests explicitly sort ANT by total bounty, descending. A fixed scan fetches the configured number of pages. A bounty-limited scan continues until the first row below **Minimum bounty**, then excludes that row and every lower-bounty row from the saved result. Both modes have a hard limit of 30 pages.
5. Duplicate torrent rows are removed and the completed scan is saved in userscript storage.
6. After the full scan is saved, **Open last scan** is enabled. Select it when you want to open the filtered results page.

The **Adoption filters** header reports the number of visible rows, total scanned rows, and visible rows with zero seeders. There is no separate scan-summary line. The separate progress bar reports row-processing progress.

**Open last scan** reopens the most recently saved result without rescanning. The button is disabled until a valid saved scan exists and remains disabled while a scan is running, so a partial scan cannot be opened. Use **Clear saved filtered scan** in Settings to remove it.

Version `0.2.0` uses saved-scan format version 2. Saved-scan keys from any other format version, malformed records, and records whose stored HTML does not match the stored torrent ID are deleted automatically. A stale filtered tab then falls back to the normal adoption listing controls instead of treating ANT page one as saved results. Run a new scan once after upgrading. Settings, Grabbed/Ignored/Broken actions, tracker lookup caches, and processing caches are not removed.

## Filter and sort the saved scan

The in-page **Adoption filters** panel is collapsed by default. Select its header to expand the bounty and size, row visibility, sorting, and media controls.

Changes made in the filtered page take effect immediately on that page. They do not replace the global defaults until you select **Save page settings globally**.

| Page control                | Behavior                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Min bounty/GiB              | Sets the bounty-per-GiB threshold. With hiding enabled, rows at or below the value are hidden.                                                                 |
| Min bounty                  | Sets the minimum total bounty. `0` disables this threshold; otherwise rows below it can be hidden.                                                             |
| Max GiB                     | Sets the maximum torrent size in GiB. `0` disables the size limit.                                                                                             |
| Media filters               | Multi-select dropdowns for Source, Codec, Audio, Subtitles, Resolution, and Language. Each category supports Ignore selected or Only show selected.            |
| Hide below min bounty/GiB   | Hides rows that do not exceed the bounty/GiB threshold.                                                                                                        |
| Hide below min bounty       | Hides rows below Min bounty.                                                                                                                                   |
| Hide above maximum          | Hides rows larger than Max GiB.                                                                                                                                |
| Apply media filters         | Applies the active media-category selections. Empty categories do not filter rows.                                                                             |
| Combine media filters       | Requires every active Ignore category to match before excluding a row. Only-show categories are combined separately and must all match.                        |
| Exclusion groups            | Add or remove groups of dropdown conditions. Match all categories within a group; a match in any group excludes the row.                                       |
| Hide ignored                | Hides rows whose saved action is Ignored.                                                                                                                      |
| Grabbed filter              | Shows all grabbed states, hides Grabbed rows, or shows only Grabbed rows. Show only overrides every other row filter.                                          |
| Skip/hide trumpable         | Hides Trumpable rows and prevents them from being processed.                                                                                                   |
| Seeding filter              | Shows all rows, seeding rows only, or non-seeding rows only.                                                                                                   |
| Sort by / direction         | Sorts by bounty/GiB, total bounty, size, torrent name, listing time, or original scan order in the selected direction. Scan order ignores the direction.       |
| Show all                    | Turns off the hide filters, including Apply media filters, and returns the grabbed and seeding filters to their all-row states. Media selections are retained. |
| Save page settings globally | Saves the current page filters and sorting as the defaults used by later scans and Settings.                                                                   |

Within a media category, any selected value can match. By default, a match in any Ignore category excludes a row, and every Only-show category must match. Enable **Combine media filters** to exclude a row only when every active Ignore category matches. Only-show categories still all have to match, independently of the Ignore group. For example, ignoring WEB and H265 in combined mode excludes WEB/H265 rows while retaining WEB/H264 and BluRay/H265 rows, provided they pass any Only-show categories. This option is off by default and is available in Settings and the in-page panel. **Show all** preserves it alongside the media selections. **Ignore selected** excludes matching rows, while **Only show selected** requires a match. With no selections, a category is Off and its mode selector is disabled. The Language dropdown starts with **Ignore all listed languages**, which selects every listed language and switches to Ignore selected. Unchecking it clears the language selections. These values match row metadata; shared labels such as Other are not restricted to a typed metadata field.

Use **Add exclusion group** in Settings or the in-page panel for rules that mix independent exclusions with combinations. Every selected category within a group must match; matching any group excludes the row. Multiple values within one category are alternatives, and empty groups or categories do not exclude anything. **Remove group** deletes that group. **Apply media filters** controls these groups too, while **Combine media filters** affects only the original category filters. **Show all** preserves the groups while disabling their application; **Save page settings globally** saves them for later scans.

For `VHS OR Xvid OR (SD AND WEB)`, create three groups:

| Group | Selections                  |
| ----- | --------------------------- |
| 1     | Source: VHS                 |
| 2     | Codec: Xvid                 |
| 3     | Resolution: SD; Source: WEB |

Only-show selections remain separate and must all match. Existing Ignore selections also remain active: clear any broad WEB or SD Ignore selections in the original media filters if you want them excluded only by group 3. Existing filter settings are preserved when upgrading; no groups are enabled initially.

Alternatively, select **VHS** under the top-level Source Ignore filter and **Xvid** under the top-level Codec Ignore filter, then add one exclusion group containing **Source: WEB** and **Resolution: SD**. With **Apply media filters** enabled and no other active media categories, the Combine checkbox changes the result as follows:

| Combine media filters | Rows excluded                    |
| --------------------- | -------------------------------- |
| Checked               | `(VHS AND Xvid) OR (WEB AND SD)` |
| Unchecked             | `VHS OR Xvid OR (WEB AND SD)`    |

Leave **Combine media filters unchecked** to exclude all VHS and all Xvid independently. When checked, VHS without Xvid and Xvid without VHS remain visible unless they match the WEB+SD group or another filter. The exclusion group always requires both WEB and SD, regardless of the Combine checkbox.

Selections within a single dropdown are always alternatives. For example, selecting **HDDVD** and **VHS** in the top-level Source Ignore dropdown excludes either source. If Source is the only active top-level Ignore category, Combine makes no difference. Paired with the WEB+SD exclusion group, the rule is `HDDVD OR VHS OR (WEB AND SD)` in either checkbox state.

Filtered scans open sorted by **Bounty / GiB**, descending, unless you change the global defaults. Select the **Bounty / GiB** column heading to alternate that column between descending and ascending order. On the saved filtered page, the **Torrent**, **Size**, **Bounty**, **Listing Time**, and **Bounty / GiB** headings sort the saved rows locally without navigating. Repeated clicks reverse the direction; the sort controls and heading arrow stay in sync. Torrent uses natural name order, and Listing Time uses the absolute date attached to the listing. Rows with missing sort values remain at the end. Normal ANT listing pages retain their native sorting links.

Each row also has an Action selector:

- **Grabbed** records that the torrent has been obtained.
- **Ignored** records that it should not be acted on.
- **Broken** records that ANT metadata could not be resolved. Normal processing skips these rows, including when refreshing tracker caches. Each Broken row has a **Rescan metadata** button that performs a fresh ANT lookup without using cached metadata. A successful lookup clears Broken and makes the row available for normal processing; another failure leaves it Broken. Rescanning does not itself search trackers or submit torrents.
- **—** clears the saved action.

Grabbed rows retain green tinting and Ignored rows retain gray tinting. The general highlighting option has been removed.

Actions are saved per ANT torrent and survive page refreshes and later scans. Settings can clear all saved Grabbed/Ignored/Broken actions at once.

## Process adoption rows

On the filtered page, select **Search adoption rows** or **Process next _N_ adoption rows**.

Processing uses only visible ANT rows with the `zeroseed` marker. Hidden rows are skipped and do not consume the configured Rows per button press limit. Cached completed rows and rows marked Broken are also skipped. ANT metadata failures mark that row Broken and let processing continue with the next row; tracker and qui failures do not mark a row Broken. Trumpable rows are skipped when that option is enabled, and M2TS rows are not processed.

For each eligible row, the script:

1. Loads the ANT torrent metadata, including its filename and available IMDb ID.
2. Searches qui for strict filename matches and shows matching save paths when qui is configured.
3. Searches the enabled tracker scope using each tracker's supported fields. BHD receives only the exact ANT filename as `file_name`; HDB receives only the exact ANT filename as `file_in_torrent`.
4. Keeps the exact filename/file-list matches returned by those searches.
5. Displays matching tracker links, tracker icons, and seeder counts in the ANT row.
6. Applies automatic site-torrent selection and safe auto-ignore rules when enabled.
7. Caches the row result and processing status when caching is enabled.

The progress display remains separate from the filter-panel header. **Cancel row processing** requests a safe cancellation: the active network request is allowed to finish, then no further rows are started.

The delay between rows is intentionally rate-limited to a minimum of 30 seconds. A Rows per button press value of `0` processes every uncached eligible visible row.

## qui operation

qui is optional. Without a configured qui endpoint and token, tracker searching and manual Grabbed/Ignored/Broken actions still work.

### Manual qui controls

Tracker matches include a **+qui** control. The row's qui section can also submit the ANT torrent at a selected save path when a matching local torrent is found.

The script monitors other-site torrents submitted through these match controls. It first correlates the submitted torrent from its normal qui metadata; for a newly added folder torrent, it can verify the exact ANT filename from qui's file list. When a monitored other-site torrent completes, the associated ANT row is marked Grabbed. A manually submitted tracker match is monitored, but the automatic ready-page workflow is reserved for matches selected by **Auto add best site torrent to qui**.

Other-site monitoring checks immediately, then starts with a 5-second interval. The interval increases by 5 seconds for each elapsed minute, up to once every 60 seconds. Successfully submitting a new other-site torrent resets that schedule; starting a row-processing run, selecting an existing monitored job, or a failed submission does not. Monitoring has no fixed 10-minute cutoff and continues while jobs remain pollable. This schedule is separate from ANT detail-page polling.

### Automatic site-torrent selection

When **Auto add best site torrent to qui** is enabled, row processing selects the matching tracker result with the highest seeder count that meets **Auto qui minimum seeders** and submits it to qui.

When **Auto-ignore rows with no eligible auto-qui match** is also enabled, the script marks a row Ignored only when:

- Auto-add is enabled.
- qui has a configured base URL and token.
- At least one tracker is in scope.
- Every tracker lookup completes successfully.
- No match exists, or no match meets the auto-add requirements.

Tracker or qui failures remain retryable and do not cause automatic ignoring.
Previously cached tracker results are re-evaluated against the current minimum-seeder setting when the row is processed again.

### Manual adoption mode

**Automatically trigger ANT adoption** is disabled by default.

In this mode, completion of an automatically added other-site torrent:

1. Marks the ANT row Grabbed.
2. Opens the matching ANT torrent page immediately.
3. Shows a large **READY FOR ADOPTION** banner.

The opened page does not poll qui, add the ANT torrent, or click the adoption control. Adoption remains manual.

### Automatic adoption mode

Enable **Automatically trigger ANT adoption** only when you want the script to submit the ANT torrent and operate ANT's adoption control automatically.

After an automatically added other-site torrent completes, the script:

1. Marks its ANT row Grabbed.
2. Schedules the matching ANT detail page to open after **qui cross-seed follow-up delay seconds + 10 seconds** when that setting is greater than zero, or after **5 seconds** when it is zero.
3. Handles only one automatic-adoption detail page at a time. Other completed jobs wait for the active page to finish or time out.
4. Checks qui every 10 seconds for the matching ANT torrent. The check uses the ANT tracker identity plus verified filename/file-list data; it does not use the torrent comment.
5. During the cross-seed follow-up, inspects the completed source torrent's qBittorrent content path and file list, then submits the ANT torrent to qui at the matching file's containing directory. For a source folder containing the matching video, this is the folder itself rather than its parent save path, including when the folder also contains companion files such as `.idx` and `.sub`. The configured follow-up delay is the fallback deadline when a usable ANT item has not appeared first.
6. On the opened ANT page, polls qui every 10 seconds for up to 60 seconds until that ANT torrent is both 100% complete and in a seeding state. A missing, downloading, or incomplete torrent keeps polling rather than ending the page workflow.
7. Clicks the matching **Reserve for adoption** control and accepts its confirmation prompt only when the verified ANT torrent is 100% complete and seeding.
8. Changes the red **READY FOR ADOPTION** banner to a green **ADOPTED** banner after the click succeeds. The green result requires both the stored terminal marker and a URL-side click-dispatch confirmation, survives ANT's post-adoption refresh, and then removes the temporary ready parameters from the page URL.

Each automatic page has a maximum handling window of two minutes so a stalled page cannot block later completed jobs indefinitely. A timeout leaves the page open for manual handling and releases the next queued job.

Transient adoption-flow storage reads are retried on the same 10-second cadence without consuming the page's one-time marker or clicking early. A confirmed ownership loss still stops automatic handling immediately.

## Settings reference

### Scan and filter defaults

| Setting                                |        Default | Meaning                                                                                                                               |
| -------------------------------------- | -------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| Adoption pages to scan                 |           `10` | Number of pages fetched by the fixed scan, starting at page 1; maximum `30`.                                                          |
| Delay between scanned pages            |    `3` seconds | Pause between ANT page requests.                                                                                                      |
| Minimum bounty per GiB                 |       `200000` | Default bounty/GiB threshold.                                                                                                         |
| Minimum bounty                         |            `0` | Default total-bounty threshold. Values above `0` also enable the bounty-limited scan button.                                          |
| Maximum size in GiB                    |            `0` | Default maximum size; `0` means unlimited.                                                                                            |
| Media filters                          |          Empty | Multi-select Source, Codec, Audio, Subtitles, Resolution, and Language filters, each with Ignore selected or Only show selected mode. |
| Hide rows below the bounty/GiB minimum |        Enabled | Applies the minimum bounty/GiB filter by default.                                                                                     |
| Hide rows below the minimum bounty     |        Enabled | Applies Min bounty when it is greater than zero.                                                                                      |
| Hide rows above the maximum size       |        Enabled | Applies Max GiB when it is greater than zero.                                                                                         |
| Apply media filters                    |       Disabled | Applies selected media filters; empty categories remain inactive.                                                                     |
| Combine media filters                  |       Disabled | Excludes only when all active Ignore categories match; all Only-show categories must still match.                                     |
| Exclusion groups                       |          Empty | Excludes a row matching all selected categories in any group. Independent of Combine media filters.                                   |
| Hide Ignored rows                      |       Disabled | Hides saved Ignored actions by default.                                                                                               |
| Hide Grabbed rows                      |       Disabled | Hides saved Grabbed actions by default.                                                                                               |
| Show only Grabbed rows                 |       Disabled | Shows Grabbed rows irrespective of all other filters when enabled.                                                                    |
| Default sort field                     | `Bounty / GiB` | Initial filtered-page sort; also supports Bounty, Size, Torrent, Listing Time, or Scan order.                                         |
| Default sort direction                 |   `Descending` | Initial ascending or descending order.                                                                                                |
| Seeding filter                         |       All rows | Default seeding-state filter.                                                                                                         |
| Skip Trumpable rows                    |        Enabled | Hides and skips Trumpable rows.                                                                                                       |

### Processing and cache

| Setting                        |              Default | Meaning                                                                                                                       |
| ------------------------------ | -------------------: | ----------------------------------------------------------------------------------------------------------------------------- |
| Delay between rows in seconds  |                 `60` | Delay between processed rows; minimum `30`.                                                                                   |
| Rows per button press          |                  `0` | `0` means all uncached eligible visible rows.                                                                                 |
| Cache all lookup results       |              Enabled | Stores ANT metadata, tracker and qui results, row completion data, and tracker icon data.                                     |
| Load cache status on page load |             Disabled | Restores cached processing detail after the initial render. Grabbed/Ignored/Broken rows are restored even when this is off.   |
| Tracker processing scope       | All enabled trackers | Restricts a run to one tracker when needed.                                                                                   |
| Refresh scoped tracker cache   |             Disabled | Rechecks the current tracker scope during this page session.                                                                  |
| Debug logging                  |             Disabled | Writes request, matching, cache, and qui details to the browser console. Repeated message types and payload sizes are capped. |

**Clean site lookup cache** removes tracker/qui lookup and row-completion caches. **Clean ANT cache** removes cached ANT detail metadata and legacy filename data. These commands do not clear saved Grabbed/Ignored/Broken actions or the saved multi-page scan; those have separate controls.

On the first filtered-page load when the row-cache migration has not yet completed, the script performs one verified cache migration. It creates the per-row processing snapshots used by page restoration, recovers a missing Grabbed action when a completed ANT submission proves the row was handled, verifies every written snapshot, and only then removes obsolete cache-format entries. A failed migration keeps its source entries and retries on the next filtered-page load. Later page loads read those snapshots directly. When a snapshot is missing, the script can display validated tracker matches from the lookup indexes without creating a completion marker or marking the row Grabbed or Ignored.

### qui

| Setting                                          |  Default | Meaning                                                                               |
| ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------- |
| qui Base URL                                     |    Empty | Accepts a direct `/api/v2`, `/proxy/<token>`, or compatible base qui URL.             |
| qui Token                                        |    Empty | Token used by the configured qui endpoint.                                            |
| Default qui save path                            |    Empty | Save path for submitted site torrents and fallback ANT submissions.                   |
| Site qui categories/tags                         |    Empty | Metadata applied to other-site submissions.                                           |
| qui instance_id                                  |    Empty | Optional client instance selector.                                                    |
| qui search result limit                          |    `300` | Maximum result count inspected during searches.                                       |
| ANT qui categories/tags                          |    Empty | Metadata for ANT submissions; falls back to the site values.                          |
| ANT qui skip checking                            |  Enabled | Sends the skip-recheck option only for ANT submissions.                               |
| qui cross-seed follow-up delay seconds           |     `60` | Maximum wait before the automatic follow-up falls back to submitting the ANT torrent. |
| Auto add best site torrent to qui                | Disabled | Automatically selects and submits the highest-seeded eligible match.                  |
| Auto qui minimum seeders                         |      `1` | Minimum seeders required for automatic site-torrent selection.                        |
| Auto-ignore rows with no eligible auto-qui match | Disabled | Saves safe, fully searched no-match/ineligible rows as Ignored.                       |
| Automatically trigger ANT adoption               | Disabled | Enables serialized ANT submission, qui polling, confirmation, and adoption clicking.  |

### Trackers

All trackers are disabled by default. Enable only the trackers you use and provide the credentials requested beside each tracker.

Supported tracker scopes are:

```text
PTP, BHD, HDB, A4K, Aither, BLU, CBR, DP, DT, FRIKI, HHD, HUNO,
IHD, ITT, LCD, LDU, LST, LT, LUME, OE, OTW, PT, PTT, RAS, RF, RMC,
SAM, SHRI, SP, STC, TIK, TLZ, TOS, TTR, ULCX, UTP, YOINK, YUS
```

Credential values are stored by the userscript manager. Treat exported userscript data as sensitive.

## Saved data and refresh behavior

The script stores several kinds of data independently:

- Main settings and tracker credentials.
- ANT metadata and filename cache.
- Tracker and qui lookup results.
- Per-row processing snapshots, including rendered match information.
- Per-torrent Grabbed/Ignored/Broken actions.
- The most recent multi-page filtered scan.
- Tracker favicons converted to Base64 data URLs.
- Short-lived automatic-adoption coordination records.

Refreshing the filtered page reconstructs it from the saved scan, reapplies the global filter defaults, and restores saved actions. The scan stores derived filter metadata, and the first render inserts only rows that match the current filters. Rows excluded by those filters stay in memory. When a page setting is loosened, only deferred rows that now pass every filter are inserted; **Show all** inserts all remaining rows. Cached processing UI is restored in one direct snapshot pass, including for rows revealed later, without timer-throttled chunk waits. With caching enabled, Grabbed/Ignored/Broken row processing snapshots are restored automatically; enable **Load cache status on page load** to restore processing detail for every visible row that has a snapshot. When a snapshot is missing, available indexed tracker matches can still be displayed under the same page-load restoration rules.

The script always writes a small set of lifecycle timing messages to the browser console, independently of **Debug logging**. These report saved-scan decoding, stored-row validation, visible-row HTML parsing, row restoration, decoration, sorting, filtering, initial rendering, and deferred cache restoration. Every message includes an ISO timestamp, time since filtered-page initialization, time since the previous lifecycle message, and a sequence number. The `adoption filter update presented` message is emitted after two animation frames, so its duration includes browser layout and paint work that synchronous filtering measurements cannot see.

Page-only filter edits are intentionally temporary until **Save page settings globally** is selected.

## Troubleshooting

### Adoption scanning or ANT metadata lookup returns HTTP 401/403

Version `0.2.1` reads ANT adoption and torrent detail pages through the page's browser session, including its cookies, with a 30-second request timeout. This helps avoid differences between normal browsing and extension background requests, such as Brave/Tampermonkey requests missing login or security-check cookies.

If access is still refused, open ANT in the same browser, sign in or complete any security check, then retry. On Brave, temporarily disabling Shields for `anthelion.me` and reloading can help identify whether site protection settings are involved. A server-side block can still prevent access. Failed scans preserve the previous saved scan.

### Only scan and settings controls appear on the normal adoption page

That is expected. The two scan buttons, Open last scan, and Settings are the only controls on normal adoption listings. Open or create a filtered scan to see filter, progress, action, and row-processing controls.

### Open last scan is disabled

No valid saved scan exists, or a scan is still running. Wait for the scan to finish or run a scan first.

### Processing reports fewer rows than are present in the scan

Only visible zero-seed rows are eligible. Hidden, Trumpable, M2TS, cached-complete, and otherwise ineligible rows are skipped. Hidden rows do not count against Rows per button press.

### Missing credentials or cached results

With caching enabled, an unconfigured qui endpoint or an enabled tracker with missing credentials does not block available cached tracker results or repeatedly queue a row whose available lookups are already cached. Cached tracker matches remain displayable even when that tracker cannot currently be queried. Enable **Load cache status on page load** to restore results for ordinary visible rows without starting processing.

Configured qui lookup failures remain retryable. Correcting a tracker configuration makes its uncached lookup eligible again. Older filename-only caches resolve ANT metadata before a metadata-dependent tracker can be skipped. Unavailable trackers do not authorize automatic Ignored status.

### Cancellation is not immediate

Cancellation stops between requests. The currently active request is allowed to finish before the run stops.

### Max GiB looks like a byte value after upgrading

Refresh the ANT page and reopen Settings. Values large enough to be a legacy byte count are converted to GiB and written back automatically.

### Automatic adoption does not click the button

Check that:

- **Auto add best site torrent to qui** selected the original other-site torrent.
- **Automatically trigger ANT adoption** is enabled.
- The qui base URL and token are valid.
- The matching ANT torrent reaches 100% completion and a seeding state during the polling window.
- The opened ANT page contains the expected adoption control for the matching torrent ID.

If automatic handling times out or cannot verify the torrent, the page remains open for manual adoption.
