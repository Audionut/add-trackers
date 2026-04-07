// ==UserScript==
// @name         PTP Seeded qui Targets
// @version      1.3
// @description  Finds seeded PTP rows, compares compatible cross-seed rows against qui, and lists missing targets.
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-seeded-qui-targets.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-seeded-qui-targets.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const EVENT_NAME = 'PTPAddReleasesFromOtherTrackersComplete';
    const PANEL_ID = 'ptp-seeded-qui-targets-panel';
    const RESULTS_ID = 'ptp-seeded-qui-targets-results';
    const STATUS_ID = 'ptp-seeded-qui-targets-status';
    const FEEDBACK_ID = 'ptp-seeded-qui-targets-feedback';
    const QUI_TITLE_LOOKUP_STATUS_ID = 'ptp-sqt-qui-title-lookup-status';
    const QUI_TITLE_LOOKUP_RESULTS_ID = 'ptp-sqt-qui-title-lookup-results';
    const QUI_TITLE_DELETE_SELECT_ALL_ID = 'ptp-sqt-qui-title-delete-select-all';
    const QUI_TITLE_DELETE_SELECT_NONE_ID = 'ptp-sqt-qui-title-delete-select-none';
    const QUI_TITLE_DELETE_BUTTON_ID = 'ptp-sqt-qui-title-delete-selected';
    const QUI_TITLE_DELETE_CONTENT_ID = 'ptp-sqt-qui-title-delete-content';
    const QUI_TITLE_DELETE_SUMMARY_ID = 'ptp-sqt-qui-title-delete-summary';
    const REDACTED_VALUE = '<REDACTED>';

    const KEYS = {
        baseUrl: 'PTP_SQT_BASE_URL',
        token: 'PTP_SQT_TOKEN',
        savePath: 'PTP_SQT_SAVE_PATH',
        selectedSavePath: 'PTP_SQT_SELECTED_SAVE_PATH',
        skipRecheck: 'PTP_SQT_SKIP_RECHECK',
        pollMaxMinutes: 'PTP_SQT_POLL_MAX_MINUTES',
        instanceId: 'PTP_SQT_INSTANCE_ID',
        categories: 'PTP_SQT_CATEGORIES',
        tags: 'PTP_SQT_TAGS',
        excludeStatus: 'PTP_SQT_EXCLUDE_STATUS',
        limit: 'PTP_SQT_LIMIT',
        waitForEvent: 'PTP_SQT_WAIT_FOR_EVENT',
        collapsed: 'PTP_SQT_COLLAPSED',
        qualityContainer: 'PTP_SQT_QUALITY_CONTAINER',
        qualityCodec: 'PTP_SQT_QUALITY_CODEC',
        qualitySource: 'PTP_SQT_QUALITY_SOURCE',
        qualityResolution: 'PTP_SQT_QUALITY_RESOLUTION',
        qualityHdrMode: 'PTP_SQT_QUALITY_HDR_MODE',
        qualityReleaseType: 'PTP_SQT_QUALITY_RELEASE_TYPE',
        qualityMode: 'PTP_SQT_QUALITY_MODE',
        qualityTieBreaker: 'PTP_SQT_QUALITY_TIE_BREAKER',
        selectedPtpTorrentId: 'PTP_SQT_SELECTED_PTP_TORRENT_ID',
        enableNoSeedFallback: 'PTP_SQT_ENABLE_NOSEED_FALLBACK',
        stagedMainThenFanout: 'PTP_SQT_STAGED_MAIN_THEN_FANOUT',
        mainSeedSource: 'PTP_SQT_MAIN_SEED_SOURCE'
    };

    const DEFAULTS = {
        baseUrl: '',
        token: '',
        savePath: '',
        instanceId: '',
        skipRecheck: true,
        pollMaxMinutes: 5,
        categories: '',
        tags: '',
        excludeStatus: '',
        limit: 300,
        waitForEvent: true,
        collapsed: true,
        qualityContainer: '',
        qualityCodec: '',
        qualitySource: '',
        qualityResolution: '',
        qualityHdrMode: 'any',
        qualityReleaseType: '',
        qualityMode: 'weighted-best',
        qualityTieBreaker: 'size-desc',
        selectedPtpTorrentId: '',
        enableNoSeedFallback: true,
        stagedMainThenFanout: true,
        mainSeedSource: ''
    };

    const QUALITY_SELECT_OPTIONS = {
        container: ['', 'AVI', 'MPG', 'MKV', 'MP4', 'VOB IFO', 'ISO', 'm2ts'],
        codec: ['', 'XviD', 'DivX', 'H.264', 'x264', 'H.265', 'x265', 'DVD5', 'DVD9', 'BD25', 'BD50', 'BD66', 'BD100'],
        source: ['', 'CAM', 'TS', 'R5', 'DVD-Screener', 'VHS', 'WEB', 'DVD', 'TV', 'HDTV', 'HD-DVD', 'Blu-ray'],
        resolution: ['', 'anysd', 'anyhd', 'anyhdplus', 'anyuhd', 'NTSC', 'PAL', '480p', '576p', '720p', '1080i', '1080p', '2160p'],
        releaseType: ['', 'golden-popcorn', 'non-scene', 'scene']
    };

    let hasSeenEvent = false;
    let refreshToken = 0;
    const targetByKey = new Map();
    const targetSelectionState = new Map();
    const quiTitleLookupDeleteByKey = new Map();
    const quiTitleLookupDeleteSelectionState = new Map();
    const addJobs = new Map();
    let addPollTimer = null;
    let addPollInFlight = false;
    let addPollStartedAt = 0;
    let discoveredSavePaths = [];
    const discoveredSavePathsBySection = new Map();
    const sectionControlState = new Map();
    const PTP_PRIMARY_HOST = 'passthepopcorn.me';
    const HOST_MATCH_ALIAS_TARGETS = {
        'tleechreload.org': 'torrentleech.cc',
        'tracker.tleechreload.org': 'torrentleech.cc'
    };
    const stageMainTargetKeyBySection = new Map();
    const stageCandidateTargetKeysBySection = new Map();
    let stageMainObserver = null;
    let discoveredSavePathObserver = null;
    let lastComputedResults = [];
    const POST_ADD_VERIFICATION_POLLS = 2;
    const POST_ADD_VERIFICATION_DELAY_MS = 1200;
    const POLL_PENDING_STATES = new Set(['checkingresumedata', 'queuedup']);
    const KNOWN_FILE_EXTENSIONS = new Set([
        'mkv', 'mp4', 'avi', 'm2ts', 'ts', 'mov', 'wmv', 'm4v', 'mpg', 'mpeg', 'vob', 'iso',
        'srt', 'ass', 'ssa', 'sup', 'idx', 'sub', 'nfo', 'txt', 'jpg', 'jpeg', 'png', 'webp',
        'rar', 'zip', '7z', 'flac', 'aac', 'ac3', 'dts', 'dtshd', 'thd'
    ]);

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function getConfig() {
        const limitValue = Number(GM_getValue(KEYS.limit, DEFAULTS.limit));
        const pollMaxMinutesValue = Number(GM_getValue(KEYS.pollMaxMinutes, DEFAULTS.pollMaxMinutes));
        return {
            baseUrl: String(GM_getValue(KEYS.baseUrl, DEFAULTS.baseUrl)).trim().replace(/\/+$/, ''),
            token: String(GM_getValue(KEYS.token, DEFAULTS.token)).trim(),
            savePath: String(GM_getValue(KEYS.savePath, DEFAULTS.savePath)).trim(),
            instanceId: sanitizeInstanceId(GM_getValue(KEYS.instanceId, DEFAULTS.instanceId)),
            skipRecheck: Boolean(GM_getValue(KEYS.skipRecheck, DEFAULTS.skipRecheck)),
            pollMaxMinutes: sanitizePollMaxMinutes(pollMaxMinutesValue),
            categories: String(GM_getValue(KEYS.categories, DEFAULTS.categories)).trim(),
            tags: String(GM_getValue(KEYS.tags, DEFAULTS.tags)).trim(),
            excludeStatus: String(GM_getValue(KEYS.excludeStatus, DEFAULTS.excludeStatus)).trim(),
            limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : DEFAULTS.limit,
            waitForEvent: Boolean(GM_getValue(KEYS.waitForEvent, DEFAULTS.waitForEvent)),
            collapsed: Boolean(GM_getValue(KEYS.collapsed, DEFAULTS.collapsed)),
            qualityContainer: String(GM_getValue(KEYS.qualityContainer, DEFAULTS.qualityContainer)).trim(),
            qualityCodec: String(GM_getValue(KEYS.qualityCodec, DEFAULTS.qualityCodec)).trim(),
            qualitySource: String(GM_getValue(KEYS.qualitySource, DEFAULTS.qualitySource)).trim(),
            qualityResolution: String(GM_getValue(KEYS.qualityResolution, DEFAULTS.qualityResolution)).trim(),
            qualityHdrMode: sanitizeHdrMode(GM_getValue(KEYS.qualityHdrMode, DEFAULTS.qualityHdrMode)),
            qualityReleaseType: String(GM_getValue(KEYS.qualityReleaseType, DEFAULTS.qualityReleaseType)).trim(),
            qualityMode: sanitizeQualityMode(GM_getValue(KEYS.qualityMode, DEFAULTS.qualityMode)),
            qualityTieBreaker: sanitizeQualityTieBreaker(GM_getValue(KEYS.qualityTieBreaker, DEFAULTS.qualityTieBreaker)),
            selectedPtpTorrentId: String(GM_getValue(KEYS.selectedPtpTorrentId, DEFAULTS.selectedPtpTorrentId)).trim(),
            enableNoSeedFallback: Boolean(GM_getValue(KEYS.enableNoSeedFallback, DEFAULTS.enableNoSeedFallback)),
            stagedMainThenFanout: Boolean(GM_getValue(KEYS.stagedMainThenFanout, DEFAULTS.stagedMainThenFanout)),
            mainSeedSource: sanitizeMainSeedSource(GM_getValue(KEYS.mainSeedSource, DEFAULTS.mainSeedSource))
        };
    }

    function saveConfig(config) {
        GM_setValue(KEYS.baseUrl, String(config.baseUrl || '').trim().replace(/\/+$/, ''));
        GM_setValue(KEYS.token, String(config.token || '').trim());
        GM_setValue(KEYS.savePath, String(config.savePath || '').trim());
        GM_setValue(KEYS.instanceId, sanitizeInstanceId(config.instanceId));
        GM_setValue(KEYS.skipRecheck, Boolean(config.skipRecheck));
        GM_setValue(KEYS.pollMaxMinutes, sanitizePollMaxMinutes(config.pollMaxMinutes));
        GM_setValue(KEYS.categories, String(config.categories || '').trim());
        GM_setValue(KEYS.tags, String(config.tags || '').trim());
        GM_setValue(KEYS.excludeStatus, String(config.excludeStatus || '').trim());
        const limitValue = Number(config.limit);
        GM_setValue(KEYS.limit, Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : DEFAULTS.limit);
        GM_setValue(KEYS.waitForEvent, Boolean(config.waitForEvent));
        GM_setValue(KEYS.collapsed, Boolean(config.collapsed));
        GM_setValue(KEYS.qualityContainer, String(config.qualityContainer || '').trim());
        GM_setValue(KEYS.qualityCodec, String(config.qualityCodec || '').trim());
        GM_setValue(KEYS.qualitySource, String(config.qualitySource || '').trim());
        GM_setValue(KEYS.qualityResolution, String(config.qualityResolution || '').trim());
        GM_setValue(KEYS.qualityHdrMode, sanitizeHdrMode(config.qualityHdrMode));
        GM_setValue(KEYS.qualityReleaseType, String(config.qualityReleaseType || '').trim());
        GM_setValue(KEYS.qualityMode, sanitizeQualityMode(config.qualityMode));
        GM_setValue(KEYS.qualityTieBreaker, sanitizeQualityTieBreaker(config.qualityTieBreaker));
        GM_setValue(KEYS.selectedPtpTorrentId, String(config.selectedPtpTorrentId || '').trim());
        GM_setValue(KEYS.enableNoSeedFallback, Boolean(config.enableNoSeedFallback));
        GM_setValue(KEYS.stagedMainThenFanout, Boolean(config.stagedMainThenFanout));
        GM_setValue(KEYS.mainSeedSource, sanitizeMainSeedSource(config.mainSeedSource));
    }

    function setStatus(text, isError = false) {
        const status = document.getElementById(STATUS_ID);
        if (!status) return;
        status.textContent = text;
        status.style.color = isError ? '#ff8080' : '';
    }

    function renderWaitingMessage(reason) {
        const container = document.getElementById(RESULTS_ID);
        if (!container) return;
        container.innerHTML = `<div class="box pad" style="margin-top:8px;">${escapeHtml(reason)}</div>`;
    }

    function setQuiTitleLookupStatus(panel, text, isError = false) {
        const status = panel?.querySelector(`#${QUI_TITLE_LOOKUP_STATUS_ID}`);
        if (!status) return;
        status.textContent = String(text || '');
        status.style.color = isError ? '#ff8080' : '';
    }

    function cleanPageTitleForQuiSearch(value) {
        return String(value || '')
            .replace(/\s+by\s+.*$/i, ' ')
            .replaceAll(/\[(?:18|19|20)\d{2}\]/g, ' ')
            .replaceAll(/\((?:18|19|20)\d{2}\)/g, ' ')
            .replaceAll(/\s+/g, ' ')
            .trim();
    }

    function extractAkaSearchTermsFromPageTitle() {
        const titleNode = document.querySelector('h2.page__title');
        const rawTitle = String(titleNode?.textContent || '').replaceAll(/\s+/g, ' ').trim();
        const cleaned = cleanPageTitleForQuiSearch(rawTitle);
        if (!cleaned) {
            return [];
        }

        const terms = [];
        const seen = new Set();
        const addTerm = (term) => {
            const value = sanitizeQuiSearchTerm(cleanPageTitleForQuiSearch(term));
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            terms.push(value);
        };

        const akaRegex = /\s+AKA\s+/i;
        const akaMatch = akaRegex.exec(cleaned);
        if (akaMatch && Number.isInteger(akaMatch.index)) {
            const index = akaMatch.index;
            const beforeAka = cleaned.slice(0, index).trim();
            const afterAka = cleaned.slice(index + akaMatch[0].length).trim();
            addTerm(beforeAka);
            addTerm(afterAka);
        } else {
            addTerm(cleaned);
        }

        return terms;
    }

    function buildQuiTitleResultDedupeKey(item) {
        const hash = String(item?.hash || item?.infohash_v1 || item?.infohash || '').trim().toLowerCase();
        if (hash) {
            return `hash:${hash}`;
        }
        const name = String(item?.name || '').trim().toLowerCase();
        const savePath = String(item?.save_path || item?.savepath || '').trim().toLowerCase();
        return `name:${name}|path:${savePath}`;
    }

    function findNestedValueByKey(input, targetKey, depth = 0) {
        if (depth > 4 || input == null) return '';

        if (Array.isArray(input)) {
            for (const entry of input) {
                const nested = findNestedValueByKey(entry, targetKey, depth + 1);
                if (nested) return nested;
            }
            return '';
        }

        if (typeof input !== 'object') {
            return '';
        }

        const key = String(targetKey || '').trim().toLowerCase();
        const entries = Object.entries(input);

        for (const [entryKey, entryValue] of entries) {
            if (String(entryKey || '').trim().toLowerCase() !== key) continue;
            const value = String(entryValue ?? '').trim();
            if (value) return value;
        }

        for (const [, entryValue] of entries) {
            const nested = findNestedValueByKey(entryValue, targetKey, depth + 1);
            if (nested) return nested;
        }

        return '';
    }

    function resolveQuiTitleLookupStatus(item) {
        const trackerHealth = findNestedValueByKey(item, 'tracker_health');
        if (trackerHealth) return trackerHealth;
        return String(item?.state || item?.status || '').trim() || '(unknown)';
    }

    function resolveQuiTitleLookupTrackerDomain(item, normalized) {
        const trackerValue = item?.tracker;
        if (typeof trackerValue === 'string' && trackerValue.trim()) {
            return safeHostFromUrl(trackerValue) || normalizeHost(trackerValue) || '(unknown)';
        }

        if (trackerValue && typeof trackerValue === 'object') {
            const trackerUrl = String(trackerValue.url || trackerValue.announce || trackerValue.tracker || '').trim();
            if (trackerUrl) {
                return safeHostFromUrl(trackerUrl) || normalizeHost(trackerUrl) || '(unknown)';
            }
            const trackerHost = String(trackerValue.host || trackerValue.domain || '').trim();
            if (trackerHost) {
                return normalizeHost(trackerHost) || '(unknown)';
            }
        }

        const siteValue = String(item?.site || '').trim();
        if (siteValue) {
            return safeHostFromUrl(siteValue) || normalizeHost(siteValue) || '(unknown)';
        }

        return String(normalized?.hosts?.[0] || '').trim() || '(unknown)';
    }

    function renderQuiTitleLookupResults(panel, terms, items) {
        const container = panel?.querySelector(`#${QUI_TITLE_LOOKUP_RESULTS_ID}`);
        if (!container) return;

        quiTitleLookupDeleteByKey.clear();

        const searchTerms = Array.isArray(terms) ? terms.filter(Boolean) : [];
        const rows = Array.isArray(items) ? items : [];
        const termsLine = searchTerms.length > 0
            ? `<div style="margin-bottom:6px;"><strong>Search terms:</strong> ${escapeHtml(searchTerms.join(' | '))}</div>`
            : '';

        if (rows.length === 0) {
            quiTitleLookupDeleteSelectionState.clear();
            container.innerHTML = `<div class="box pad" style="margin-top:6px;">${termsLine}<div>No matching QUI torrents found for title lookup.</div></div>`;
            return;
        }

        const tableRows = rows.map((item, index) => {
            const normalized = normalizeQuiItem(item);
            const name = normalized.name || '(unnamed torrent)';
            const status = resolveQuiTitleLookupStatus(item);
            const tracker = resolveQuiTitleLookupTrackerDomain(item, normalized);
            const savePath = normalized.savePath || '(no save path)';
            const hash = String(item?.hash || item?.infohash_v1 || item?.infohash || '').trim().toLowerCase();
            const fallbackKey = `${tracker}::${savePath}::${name}`;
            const rowKey = `title::${index + 1}::${hash || fallbackKey}`;

            if (hash) {
                quiTitleLookupDeleteByKey.set(rowKey, {
                    key: rowKey,
                    hash,
                    name,
                    tracker,
                    savePath
                });
                if (!quiTitleLookupDeleteSelectionState.has(rowKey)) {
                    quiTitleLookupDeleteSelectionState.set(rowKey, false);
                }
            }

            const selectorCell = hash
                ? `<input type="checkbox" data-sqt-qui-title-delete-key="${escapeHtml(rowKey)}" ${quiTitleLookupDeleteSelectionState.get(rowKey) === true ? 'checked' : ''}>`
                : '<span style="opacity:0.8;">n/a</span>';

            return `<tr><td style="padding:4px 6px; border-top:1px solid rgba(255,255,255,0.12); width:70px;">${selectorCell}</td><td style="padding:4px 6px; border-top:1px solid rgba(255,255,255,0.12);">${escapeHtml(name)}</td><td style="padding:4px 6px; border-top:1px solid rgba(255,255,255,0.12);">${escapeHtml(status)}</td><td style="padding:4px 6px; border-top:1px solid rgba(255,255,255,0.12);">${escapeHtml(tracker)}</td><td style="padding:4px 6px; border-top:1px solid rgba(255,255,255,0.12);">${escapeHtml(savePath)}</td></tr>`;
        }).join('');

        const activeDeleteKeys = new Set(quiTitleLookupDeleteByKey.keys());
        Array.from(quiTitleLookupDeleteSelectionState.keys()).forEach((key) => {
            if (!activeDeleteKeys.has(key)) {
                quiTitleLookupDeleteSelectionState.delete(key);
            }
        });

        const deleteControls = quiTitleLookupDeleteByKey.size > 0
            ? `<div style="margin-bottom:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"><input type="submit" id="${QUI_TITLE_DELETE_SELECT_ALL_ID}" value="Select All"><input type="submit" id="${QUI_TITLE_DELETE_SELECT_NONE_ID}" value="Select None"><input type="submit" id="${QUI_TITLE_DELETE_BUTTON_ID}" value="Delete Selected QUI Torrents"><label><input type="checkbox" id="${QUI_TITLE_DELETE_CONTENT_ID}"> Delete content/files</label><span id="${QUI_TITLE_DELETE_SUMMARY_ID}"></span></div>`
            : '';

        container.innerHTML = `
            <div class="box pad" style="margin-top:6px;">
                ${termsLine}
                <div style="margin-bottom:6px;"><strong>QUI torrents:</strong> ${escapeHtml(String(rows.length))}</div>
                ${deleteControls}
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding:4px 6px; width:70px;">Delete</th>
                                <th style="text-align:left; padding:4px 6px;">Torrent Name</th>
                                <th style="text-align:left; padding:4px 6px;">Status</th>
                                <th style="text-align:left; padding:4px 6px;">Tracker</th>
                                <th style="text-align:left; padding:4px 6px;">SavePath</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        updateQuiTitleLookupDeleteSummary(panel);
    }

    async function runQuiAkaTitleLookup(panel, options = {}) {
        if (!panel) return;

        const force = Boolean(options.force);
        const terms = extractAkaSearchTermsFromPageTitle();
        const signature = terms.join('||').toLowerCase();
        const previousSignature = String(panel.dataset.sqtQuiTitleLookupSig || '');
        if (!force && signature && previousSignature === signature) {
            return;
        }
        panel.dataset.sqtQuiTitleLookupSig = signature;

        if (terms.length === 0) {
            setQuiTitleLookupStatus(panel, 'Title lookup skipped: no page title terms found.', true);
            renderQuiTitleLookupResults(panel, [], []);
            return;
        }

        const config = gatherPanelConfig(panel, getConfig());
        if (!String(config.baseUrl || '').trim() || !String(config.token || '').trim()) {
            setQuiTitleLookupStatus(panel, 'Title lookup unavailable: set qui Base URL and Token.', true);
            renderQuiTitleLookupResults(panel, terms, []);
            return;
        }

        setQuiTitleLookupStatus(panel, `Running QUI title lookup for ${terms.length} term(s)...`);

        const settled = await Promise.allSettled(terms.map((term) => queryQui(config, term)));
        const merged = [];
        const seen = new Set();
        const errors = [];

        settled.forEach((result) => {
            if (result.status !== 'fulfilled') {
                errors.push(String(result.reason?.message || result.reason || 'Lookup failed'));
                return;
            }

            result.value.forEach((item) => {
                const key = buildQuiTitleResultDedupeKey(item);
                if (seen.has(key)) return;
                seen.add(key);
                merged.push(item);
            });
        });

        renderQuiTitleLookupResults(panel, terms, merged);
        if (errors.length > 0) {
            setQuiTitleLookupStatus(panel, `QUI title lookup partial: ${merged.length} result(s), ${errors.length} error(s).`, true);
            return;
        }

        setQuiTitleLookupStatus(panel, `QUI title lookup complete (${merged.length} result(s)).`);
    }

    function sanitizeInstanceId(value) {
        const normalized = String(value ?? '').trim();
        if (!normalized) return '';
        const parsed = Number(normalized);
        if (!Number.isInteger(parsed) || parsed < 0) {
            return '';
        }
        return String(parsed);
    }

    function sanitizePollMaxMinutes(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return DEFAULTS.pollMaxMinutes;
        const rounded = Math.floor(parsed);
        if (rounded < 1) return 1;
        if (rounded > 24 * 60) return 24 * 60;
        return rounded;
    }

    function sanitizeHdrMode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['any', 'none', 'dv', 'hdr', 'dv+hdr'].includes(normalized)) {
            return normalized;
        }
        return DEFAULTS.qualityHdrMode;
    }

    function sanitizeQualityMode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['weighted-best', 'strict-all', 'any-selected'].includes(normalized)) {
            return normalized;
        }
        return DEFAULTS.qualityMode;
    }

    function sanitizeQualityTieBreaker(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['size-asc', 'size-desc', 'seeders-asc', 'seeders-desc', 'uploaded-asc', 'uploaded-desc'].includes(normalized)) {
            return normalized;
        }
        return DEFAULTS.qualityTieBreaker;
    }

    function sanitizeMainSeedSource(value) {
        return normalizeHost(value);
    }

    function buildSelectOptionsHtml(values, selectedValue, labelMap = null) {
        return values.map((value) => {
            const selected = String(selectedValue || '') === String(value) ? 'selected' : '';
            const label = labelMap?.[value] || value || 'Any';
            return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
        }).join('');
    }

    function getPtpRowSelectionOptions() {
        const rows = getTorrentRows().filter((row) => isPtpRow(row));
        const entries = rows.map((row) => {
            const meta = getRowMeta(row);
            const key = String(meta?.torrentId || meta?.rowId || '').trim();
            if (!key) return null;
            const releaseName = String(meta?.releaseName || key).trim();
            const seeded = rowHasSeedingMarker(row);
            const label = seeded
                ? `${releaseName} [seeded]`
                : releaseName;
            return { key, label };
        }).filter(Boolean);

        entries.sort((a, b) => a.label.localeCompare(b.label));
        return entries;
    }

    function renderMainSeedSourceOptions(panel, sourceHosts, config = null) {
        const select = panel?.querySelector('#ptp-sqt-main-seed-source');
        if (!select) return;

        const canonicalSources = new Set();
        (sourceHosts || []).forEach((host) => {
            const normalized = normalizeHost(host);
            if (!normalized) return;
            const canonical = getDomainTail(normalized) || normalized;
            if (!canonical) return;
            canonicalSources.add(canonical);
        });

        const uniqueSources = Array.from(canonicalSources).sort((a, b) => a.localeCompare(b));

        const activeConfig = config || getConfig();
        const configuredSource = sanitizeMainSeedSource(activeConfig.mainSeedSource);
        const selectedValue = configuredSource
            ? (uniqueSources.find((source) => hostsFuzzyMatch(source, configuredSource)) || '')
            : '';

        const options = ['', ...uniqueSources];
        select.innerHTML = buildSelectOptionsHtml(options, selectedValue, { '': 'Auto (first match)' });
    }

    function collectSectionDiscoveredSavePaths(quiMatches) {
        const ordered = [];
        const seen = new Set();
        (quiMatches || []).forEach((item) => {
            const path = String(item?.savePath || '').trim();
            if (!path) return;
            const key = path.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            ordered.push(path);
        });
        return ordered;
    }

    function getSectionControlState(sectionKey) {
        const key = String(sectionKey || '').trim();
        if (!key) {
            return { selectedSavePath: '', mainSeedSource: '' };
        }
        const existing = sectionControlState.get(key);
        if (existing) {
            return existing;
        }
        const initial = { selectedSavePath: '', mainSeedSource: '' };
        sectionControlState.set(key, initial);
        return initial;
    }

    function syncDiscoveredSavePathSelections(scopeNode = null) {
        const root = scopeNode || document;
        const selectors = Array.from(root.querySelectorAll('.ptp-sqt-savepath-choice[data-sqt-section-key]'));
        selectors.forEach((selector) => {
            const sectionKey = String(selector.dataset.sqtSectionKey || '').trim();
            if (!sectionKey) return;
            const state = getSectionControlState(sectionKey);
            state.selectedSavePath = String(selector.value || '').trim();
            sectionControlState.set(sectionKey, state);
        });
    }

    function observeDiscoveredSavePathSelections(resultsContainer) {
        if (!resultsContainer) return;
        if (discoveredSavePathObserver) {
            discoveredSavePathObserver.disconnect();
        }
        discoveredSavePathObserver = new MutationObserver(() => {
            syncDiscoveredSavePathSelections(resultsContainer);
        });
        discoveredSavePathObserver.observe(resultsContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['selected', 'value']
        });
        syncDiscoveredSavePathSelections(resultsContainer);
    }

    function pruneSectionState(activeSectionKeys) {
        sectionControlState.forEach((_, key) => {
            if (!activeSectionKeys.has(key)) {
                sectionControlState.delete(key);
            }
        });
        discoveredSavePathsBySection.forEach((_, key) => {
            if (!activeSectionKeys.has(key)) {
                discoveredSavePathsBySection.delete(key);
            }
        });
        stageMainTargetKeyBySection.forEach((_, key) => {
            if (!activeSectionKeys.has(key)) {
                stageMainTargetKeyBySection.delete(key);
            }
        });
        stageCandidateTargetKeysBySection.forEach((_, key) => {
            if (!activeSectionKeys.has(key)) {
                stageCandidateTargetKeysBySection.delete(key);
            }
        });
    }

    function findMainColumn() {
        return document.querySelector('.main-column');
    }

    function findFilterReleasesPanel() {
        const headings = Array.from(document.querySelectorAll('.panel .panel__heading .panel__heading__title'));
        const heading = headings.find((node) => String(node.textContent || '').trim().toLowerCase() === 'filter releases');
        return heading ? heading.closest('.panel') : null;
    }

    function removeExistingPanel() {
        if (stageMainObserver) {
            stageMainObserver.disconnect();
            stageMainObserver = null;
        }
        if (discoveredSavePathObserver) {
            discoveredSavePathObserver.disconnect();
            discoveredSavePathObserver = null;
        }
        const existing = document.getElementById(PANEL_ID);
        if (existing) {
            existing.remove();
        }
    }

    function applyPanelCollapsedState(collapsed, persist = false) {
        const panel = document.getElementById(PANEL_ID);
        const body = panel?.querySelector('.box.pad');
        if (!body) return;

        body.style.display = collapsed ? 'none' : 'block';
        if (persist) {
            GM_setValue(KEYS.collapsed, collapsed);
        }
    }

    function createPanel() {
        removeExistingPanel();

        const mainColumn = findMainColumn();
        if (!mainColumn) return null;

        const config = getConfig();
        const displayBaseUrl = config.baseUrl ? REDACTED_VALUE : '';
        const displayToken = config.token ? REDACTED_VALUE : '';
        const displaySavePath = config.savePath ? REDACTED_VALUE : '';
        const ptpSelectionOptions = getPtpRowSelectionOptions();
        const ptpOptionValues = ['', ...ptpSelectionOptions.map((entry) => entry.key)];
        const ptpOptionLabels = { '': 'Auto (quality-based)' };
        ptpSelectionOptions.forEach((entry) => {
            ptpOptionLabels[entry.key] = entry.label;
        });
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.className = 'panel';

        const heading = document.createElement('div');
        heading.className = 'panel__heading';
        heading.style.cursor = 'pointer';

        const title = document.createElement('span');
        title.className = 'panel__heading__title';
        title.textContent = 'Seeded Cross-Seed Targets';
        heading.appendChild(title);

        const body = document.createElement('div');
        body.className = 'box pad';
        body.style.display = config.collapsed ? 'none' : 'block';

        body.innerHTML = `
            <details>
                <summary><strong>qui Config</strong></summary>
                <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <label>Base URL: <input type="text" id="ptp-sqt-base-url" value="${escapeHtml(displayBaseUrl)}" style="min-width:240px;"></label>
                    <label>Token: <input type="text" id="ptp-sqt-token" value="${escapeHtml(displayToken)}" style="min-width:180px;"></label>
                    <label>savePath: <input type="text" id="ptp-sqt-save-path" value="${escapeHtml(displaySavePath)}" style="min-width:220px;"></label>
                    <label>instanceId: <input type="number" id="ptp-sqt-instance-id" value="${escapeHtml(config.instanceId)}" min="0" step="1" style="width:90px;"></label>
                    <label><input type="checkbox" id="ptp-sqt-skip-recheck" ${config.skipRecheck ? 'checked' : ''}> Skip recheck on add</label>
                    <label>Polling max (minutes): <input type="number" id="ptp-sqt-poll-max-minutes" value="${escapeHtml(config.pollMaxMinutes)}" min="1" step="1" style="width:90px;"></label>
                    <label>Categories: <input type="text" id="ptp-sqt-categories" value="${escapeHtml(config.categories)}" style="min-width:120px;"></label>
                    <label>Tags: <input type="text" id="ptp-sqt-tags" value="${escapeHtml(config.tags)}" style="min-width:140px;"></label>
                    <label><input type="checkbox" id="ptp-sqt-wait-event" ${config.waitForEvent ? 'checked' : ''}> Wait for ${EVENT_NAME}</label>
                    <label><input type="checkbox" id="ptp-sqt-collapsed-default" ${config.collapsed ? 'checked' : ''}> Panel collapsed by default</label>
                </div>
                <div id="ptp-sqt-discovered-savepaths" style="margin-top:8px;"></div>
                <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
                    <input type="submit" id="ptp-sqt-save" value="Save">
                    <input type="submit" id="ptp-sqt-refresh" value="Refresh">
                    <input type="submit" id="ptp-sqt-test" value="Test qui">
                    <span id="${STATUS_ID}"></span>
                </div>
            </details>
            <details style="margin-top:8px;">
                <summary><strong>Target Quality & Fallback</strong></summary>
                <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <label>Resolution:
                        <select id="ptp-sqt-quality-resolution">${buildSelectOptionsHtml(QUALITY_SELECT_OPTIONS.resolution, config.qualityResolution, {
                            '': 'Any',
                            anysd: 'Any SD',
                            anyhd: 'Any HD',
                            anyhdplus: 'Any HD+',
                            anyuhd: 'Any UHD'
                        })}</select>
                    </label>
                    <label>Source:
                        <select id="ptp-sqt-quality-source">${buildSelectOptionsHtml(QUALITY_SELECT_OPTIONS.source, config.qualitySource)}</select>
                    </label>
                    <label>Codec:
                        <select id="ptp-sqt-quality-codec">${buildSelectOptionsHtml(QUALITY_SELECT_OPTIONS.codec, config.qualityCodec)}</select>
                    </label>
                    <label>Container:
                        <select id="ptp-sqt-quality-container">${buildSelectOptionsHtml(QUALITY_SELECT_OPTIONS.container, config.qualityContainer)}</select>
                    </label>
                    <label>Release type:
                        <select id="ptp-sqt-quality-release-type">${buildSelectOptionsHtml(QUALITY_SELECT_OPTIONS.releaseType, config.qualityReleaseType, {
                            '': 'Any',
                            'golden-popcorn': 'Golden Popcorn',
                            'non-scene': 'Non-Scene',
                            scene: 'Scene'
                        })}</select>
                    </label>
                    <label>HDR Mode:
                        <select id="ptp-sqt-quality-hdr-mode">
                            <option value="any" ${config.qualityHdrMode === 'any' ? 'selected' : ''}>Any</option>
                            <option value="none" ${config.qualityHdrMode === 'none' ? 'selected' : ''}>No HDR</option>
                            <option value="dv" ${config.qualityHdrMode === 'dv' ? 'selected' : ''}>DV</option>
                            <option value="hdr" ${config.qualityHdrMode === 'hdr' ? 'selected' : ''}>HDR</option>
                            <option value="dv+hdr" ${config.qualityHdrMode === 'dv+hdr' ? 'selected' : ''}>DV + HDR</option>
                        </select>
                    </label>
                    <label>Quality matching:
                        <select id="ptp-sqt-quality-mode">
                            <option value="weighted-best" ${config.qualityMode === 'weighted-best' ? 'selected' : ''}>Weighted Best</option>
                            <option value="strict-all" ${config.qualityMode === 'strict-all' ? 'selected' : ''}>Strict (All)</option>
                            <option value="any-selected" ${config.qualityMode === 'any-selected' ? 'selected' : ''}>Any selected</option>
                        </select>
                    </label>
                    <label>Tie-breaker:
                        <select id="ptp-sqt-quality-tie-breaker">
                            <option value="size-desc" ${config.qualityTieBreaker === 'size-desc' ? 'selected' : ''}>Size (desc)</option>
                            <option value="size-asc" ${config.qualityTieBreaker === 'size-asc' ? 'selected' : ''}>Size (asc)</option>
                            <option value="seeders-desc" ${config.qualityTieBreaker === 'seeders-desc' ? 'selected' : ''}>Seeders (desc)</option>
                            <option value="seeders-asc" ${config.qualityTieBreaker === 'seeders-asc' ? 'selected' : ''}>Seeders (asc)</option>
                            <option value="uploaded-desc" ${config.qualityTieBreaker === 'uploaded-desc' ? 'selected' : ''}>Uploaded date (desc)</option>
                            <option value="uploaded-asc" ${config.qualityTieBreaker === 'uploaded-asc' ? 'selected' : ''}>Uploaded date (asc)</option>
                        </select>
                    </label>
                    <label>PTP release override:
                        <select id="ptp-sqt-selected-ptp-torrent-id">${buildSelectOptionsHtml(ptpOptionValues, config.selectedPtpTorrentId, ptpOptionLabels)}</select>
                    </label>
                    <label><input type="checkbox" id="ptp-sqt-enable-no-seed-fallback" ${config.enableNoSeedFallback ? 'checked' : ''}> Enable no-seeded fallback</label>
                    <label><input type="checkbox" id="ptp-sqt-staged-main-then-fanout" ${config.stagedMainThenFanout ? 'checked' : ''}> Stage main seed then fan-out</label>
                </div>
            </details>
            <details style="margin-top:8px;" open>
                <summary><strong>QUI Title Lookup (AKA)</strong></summary>
                <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <input type="submit" id="ptp-sqt-run-qui-title-lookup" value="Run title lookup">
                    <span id="${QUI_TITLE_LOOKUP_STATUS_ID}"></span>
                </div>
                <div id="${QUI_TITLE_LOOKUP_RESULTS_ID}" style="margin-top:6px;"></div>
            </details>
            <div id="${RESULTS_ID}" style="margin-top:10px;"></div>
            <div id="${FEEDBACK_ID}" style="margin-top:10px;"></div>
        `;

        heading.addEventListener('click', () => {
            const nextCollapsed = body.style.display !== 'none';
            applyPanelCollapsedState(nextCollapsed, true);
            if (!nextCollapsed) {
                runQuiAkaTitleLookup(panel, { force: false });
            }
        });

        panel.append(heading, body);

        const filterPanel = findFilterReleasesPanel();
        if (filterPanel && filterPanel.parentNode === mainColumn) {
            filterPanel.before(panel);
        } else if (mainColumn.firstElementChild) {
            mainColumn.insertBefore(panel, mainColumn.firstElementChild);
        } else {
            mainColumn.appendChild(panel);
        }

        wirePanelActions(panel);
        if (body.style.display !== 'none') {
            runQuiAkaTitleLookup(panel, { force: false });
        }
        return panel;
    }

    function wirePanelActions(panel) {
        const saveBtn = panel.querySelector('#ptp-sqt-save');
        const refreshBtn = panel.querySelector('#ptp-sqt-refresh');
        const testBtn = panel.querySelector('#ptp-sqt-test');
        const quiTitleLookupBtn = panel.querySelector('#ptp-sqt-run-qui-title-lookup');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const config = gatherPanelConfig(panel, getConfig());
                saveConfig(config);
                setStatus('Saved');
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const config = gatherPanelConfig(panel, getConfig());
                saveConfig(config);
                runMatchingPass({ force: true });
            });
        }

        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const config = gatherPanelConfig(panel, getConfig());
                saveConfig(config);
                setStatus('Testing qui...');
                try {
                    const results = await queryQui(config);
                    setStatus(`qui OK (${results.length} torrents)`);
                } catch (error) {
                    setStatus(`qui test failed: ${error.message || error}`, true);
                }
            });
        }

        if (quiTitleLookupBtn) {
            quiTitleLookupBtn.addEventListener('click', async () => {
                await runQuiAkaTitleLookup(panel, { force: true });
            });
        }

        const resultsContainer = panel.querySelector(`#${RESULTS_ID}`);
        if (resultsContainer) {
            resultsContainer.addEventListener('click', onResultsClick);
            resultsContainer.addEventListener('change', onResultsChange);
            resultsContainer.addEventListener('input', onResultsChange);

            if (stageMainObserver) {
                stageMainObserver.disconnect();
            }
            stageMainObserver = new MutationObserver(() => {
                refreshStageMainTargetKey(panel);
            });
            stageMainObserver.observe(resultsContainer, { childList: true, subtree: true });

            observeDiscoveredSavePathSelections(resultsContainer);
        }

        const quiTitleLookupResults = panel.querySelector(`#${QUI_TITLE_LOOKUP_RESULTS_ID}`);
        if (quiTitleLookupResults) {
            quiTitleLookupResults.addEventListener('click', onQuiTitleLookupResultsClick);
            quiTitleLookupResults.addEventListener('change', onQuiTitleLookupResultsChange);
            quiTitleLookupResults.addEventListener('input', onQuiTitleLookupResultsChange);
        }

        renderDiscoveredSavePathOptions(panel, getConfig());
        renderMainSeedSourceOptions(panel, [], getConfig());
    }

    function renderDiscoveredSavePathOptions(panel, config) {
        const wrapper = panel.querySelector('#ptp-sqt-discovered-savepaths');
        if (!wrapper) return;
        if (Array.isArray(discoveredSavePaths) && discoveredSavePaths.length > 0) {
            wrapper.innerHTML = `<span style="opacity:0.85;">Discovered qui save paths across results: ${escapeHtml(String(discoveredSavePaths.length))}. Section-specific selectors are shown under each seeded torrent section.</span>`;
            return;
        }
        wrapper.innerHTML = '';
    }

    function resolveEffectiveSavePath(config, sectionKey = '') {
        const section = String(sectionKey || '').trim();
        let selected = '';
        if (section) {
            const panelChoice = document.querySelector(`#${PANEL_ID} .ptp-sqt-savepath-choice[data-sqt-section-key="${section}"]`);
            const state = getSectionControlState(section);
            selected = String(panelChoice?.value || state.selectedSavePath || '').trim();
        }
        if (selected) return selected;

        const defaultSavePath = String(config.savePath || '').trim();
        const normalizedDefault = normalizeSavePath(defaultSavePath);
        const discoveredForScope = section
            ? (discoveredSavePathsBySection.get(section) || [])
            : discoveredSavePaths;
        const hasDefaultMatch = normalizedDefault
            ? discoveredForScope.some((path) => normalizeSavePath(path) === normalizedDefault)
            : false;

        if (Array.isArray(discoveredForScope) && discoveredForScope.length > 0 && normalizedDefault && !hasDefaultMatch) {
            return discoveredForScope[0];
        }

        return String(config.savePath || '').trim();
    }

    async function onResultsClick(event) {
        const runQualityButton = event.target?.closest?.('.ptp-sqt-run-quality');
        if (runQualityButton) {
            const idx = Number(runQualityButton.dataset.sqtSeededIndex);
            if (Number.isFinite(idx)) {
                await runQualityUpgradeForComputedIndex(idx);
            }
            return;
        }

        const selectAllButton = event.target?.closest?.('#ptp-sqt-select-all');
        if (selectAllButton) {
            targetByKey.forEach((_, key) => targetSelectionState.set(key, true));
            syncTargetCheckboxesFromState();
            updateSelectionSummary();
            return;
        }

        const selectNoneButton = event.target?.closest?.('#ptp-sqt-select-none');
        if (selectNoneButton) {
            targetByKey.forEach((_, key) => targetSelectionState.set(key, false));
            syncTargetCheckboxesFromState();
            updateSelectionSummary();
            return;
        }

        const addSelectedButton = event.target?.closest?.('#ptp-sqt-add-selected');
        if (addSelectedButton) {
            await addSelectedTargets(addSelectedButton);
        }

    }

    function onResultsChange(event) {
        const sectionSavePathSelect = event.target?.closest?.('.ptp-sqt-savepath-choice[data-sqt-section-key]');
        if (sectionSavePathSelect) {
            const sectionKey = String(sectionSavePathSelect.dataset.sqtSectionKey || '').trim();
            if (!sectionKey) return;
            const state = getSectionControlState(sectionKey);
            state.selectedSavePath = String(sectionSavePathSelect.value || '').trim();
            sectionControlState.set(sectionKey, state);
            return;
        }

        const mainSeedSourceSelect = event.target?.closest?.('.ptp-sqt-main-seed-source[data-sqt-section-key]');
        if (mainSeedSourceSelect) {
            const sectionKey = String(mainSeedSourceSelect.dataset.sqtSectionKey || '').trim();
            if (!sectionKey) return;
            const state = getSectionControlState(sectionKey);
            state.mainSeedSource = sanitizeMainSeedSource(mainSeedSourceSelect.value);
            sectionControlState.set(sectionKey, state);
            const panel = document.getElementById(PANEL_ID);
            refreshStageMainTargetKey(panel, sectionKey);
            return;
        }

        const checkbox = event.target?.closest?.('input[data-sqt-target-key]');
        if (checkbox) {
            const key = String(checkbox.dataset.sqtTargetKey || '').trim();
            if (!key) return;
            targetSelectionState.set(key, Boolean(checkbox.checked));
            const panel = document.getElementById(PANEL_ID);
            const sectionKey = String(targetByKey.get(key)?.sectionKey || '').trim();
            refreshStageMainTargetKey(panel, sectionKey);
            updateSelectionSummary();
        }

    }

    function syncTargetCheckboxesFromState() {
        const boxes = Array.from(document.querySelectorAll(`#${PANEL_ID} #${RESULTS_ID} input[data-sqt-target-key]`));
        boxes.forEach((box) => {
            const key = String(box.dataset.sqtTargetKey || '').trim();
            if (!key) return;
            box.checked = targetSelectionState.get(key) !== false;
        });
    }

    function getSelectedTargetKeys() {
        const selected = [];
        targetByKey.forEach((_, key) => {
            if (targetSelectionState.get(key) !== false) {
                selected.push(key);
            }
        });
        return selected;
    }

    function updateSelectionSummary() {
        const summary = document.querySelector(`#${PANEL_ID} #ptp-sqt-selection-summary`);
        const addButton = document.querySelector(`#${PANEL_ID} #ptp-sqt-add-selected`);

        if (summary && addButton) {
            const total = targetByKey.size;
            const selectedCount = getSelectedTargetKeys().length;
            summary.textContent = `${selectedCount}/${total} add selected`;
            addButton.disabled = selectedCount === 0;
        }
    }

    function getSelectedQuiTitleLookupDeleteKeys() {
        const selected = [];
        quiTitleLookupDeleteByKey.forEach((_, key) => {
            if (quiTitleLookupDeleteSelectionState.get(key) === true) {
                selected.push(key);
            }
        });
        return selected;
    }

    function syncQuiTitleLookupDeleteCheckboxesFromState() {
        const panel = document.getElementById(PANEL_ID);
        const container = panel?.querySelector(`#${QUI_TITLE_LOOKUP_RESULTS_ID}`);
        if (!container) return;
        const boxes = Array.from(container.querySelectorAll('input[data-sqt-qui-title-delete-key]'));
        boxes.forEach((box) => {
            const key = String(box.dataset.sqtQuiTitleDeleteKey || '').trim();
            if (!key) return;
            box.checked = quiTitleLookupDeleteSelectionState.get(key) === true;
        });
    }

    function updateQuiTitleLookupDeleteSummary(panel) {
        const scope = panel || document.getElementById(PANEL_ID);
        const summary = scope?.querySelector(`#${QUI_TITLE_DELETE_SUMMARY_ID}`);
        const button = scope?.querySelector(`#${QUI_TITLE_DELETE_BUTTON_ID}`);
        if (!summary || !button) return;

        const total = quiTitleLookupDeleteByKey.size;
        const selectedCount = getSelectedQuiTitleLookupDeleteKeys().length;
        summary.textContent = `${selectedCount}/${total} delete selected`;
        button.disabled = selectedCount === 0;
    }

    async function onQuiTitleLookupResultsClick(event) {
        const panel = document.getElementById(PANEL_ID);

        const selectAll = event.target?.closest?.(`#${QUI_TITLE_DELETE_SELECT_ALL_ID}`);
        if (selectAll) {
            quiTitleLookupDeleteByKey.forEach((_, key) => {
                quiTitleLookupDeleteSelectionState.set(key, true);
            });
            syncQuiTitleLookupDeleteCheckboxesFromState();
            updateQuiTitleLookupDeleteSummary(panel);
            return;
        }

        const selectNone = event.target?.closest?.(`#${QUI_TITLE_DELETE_SELECT_NONE_ID}`);
        if (selectNone) {
            quiTitleLookupDeleteByKey.forEach((_, key) => {
                quiTitleLookupDeleteSelectionState.set(key, false);
            });
            syncQuiTitleLookupDeleteCheckboxesFromState();
            updateQuiTitleLookupDeleteSummary(panel);
            return;
        }

        const deleteButton = event.target?.closest?.(`#${QUI_TITLE_DELETE_BUTTON_ID}`);
        if (deleteButton) {
            await deleteSelectedQuiTitleLookupTorrents(deleteButton);
        }
    }

    function onQuiTitleLookupResultsChange(event) {
        const deleteCheckbox = event.target?.closest?.('input[data-sqt-qui-title-delete-key]');
        if (!deleteCheckbox) return;
        const deleteKey = String(deleteCheckbox.dataset.sqtQuiTitleDeleteKey || '').trim();
        if (!deleteKey) return;
        quiTitleLookupDeleteSelectionState.set(deleteKey, Boolean(deleteCheckbox.checked));
        const panel = document.getElementById(PANEL_ID);
        updateQuiTitleLookupDeleteSummary(panel);
    }

    function seedAddJobs(entries, statusText) {
        entries.forEach(({ key, target }) => {
            addJobs.set(key, {
                key,
                releaseName: target.releaseName,
                trackerHost: target.trackerHost,
                trackerUrl: target.trackerUrl,
                downloadUrl: target.downloadUrl,
                status: statusText,
                progress: null,
                state: '',
                hash: '',
                ratio: null,
                submittedAtSec: Math.floor(Date.now() / 1000),
                updatedAt: Date.now(),
                error: ''
            });
        });
    }

    function markAddJobsSubmitted(entries) {
        entries.forEach(({ key }) => {
            const current = addJobs.get(key);
            if (!current) return;
            current.status = 'Submitted. Waiting for qui state...';
            current.updatedAt = Date.now();
            addJobs.set(key, current);
        });
    }

    function setAddJobsError(entries, error) {
        entries.forEach(({ key }) => {
            const current = addJobs.get(key);
            if (!current) return;
            current.status = 'Error';
            current.error = String(error?.message || error || 'Unknown add error');
            current.updatedAt = Date.now();
            addJobs.set(key, current);
        });
    }

    function getStageCandidateEntries(sectionKey, allowedKeys = null) {
        const keys = stageCandidateTargetKeysBySection.get(String(sectionKey || '').trim()) || [];
        return keys
            .filter((key) => !allowedKeys || allowedKeys.has(key))
            .map((key) => ({ key, target: targetByKey.get(key) }))
            .filter((entry) => Boolean(entry.target));
    }

    function refreshStageMainTargetKey(panel = null, onlySectionKey = '') {
        const selectedSet = new Set(getSelectedTargetKeys());
        const sectionKeys = String(onlySectionKey || '').trim()
            ? [String(onlySectionKey || '').trim()]
            : Array.from(stageCandidateTargetKeysBySection.keys());

        sectionKeys.forEach((sectionKey) => {
            const selectedCandidates = getStageCandidateEntries(sectionKey, selectedSet);
            const candidates = selectedCandidates.length > 0
                ? selectedCandidates
                : getStageCandidateEntries(sectionKey);

            if (candidates.length === 0) {
                stageMainTargetKeyBySection.delete(sectionKey);
                return;
            }

            const sectionState = getSectionControlState(sectionKey);
            const preferredSource = sanitizeMainSeedSource(sectionState.mainSeedSource);
            stageMainTargetKeyBySection.set(sectionKey, pickStageMainCandidate(candidates, preferredSource));
        });

        if (String(onlySectionKey || '').trim()) {
            return String(stageMainTargetKeyBySection.get(String(onlySectionKey || '').trim()) || '');
        }
        return '';
    }

    function getSelectedMainTargetKey(sectionKey, selectedEntries = []) {
        const normalizedSectionKey = String(sectionKey || '').trim();
        if (!normalizedSectionKey) {
            return '';
        }
        const selectedSet = new Set((selectedEntries || []).map((entry) => entry.key));
        const stagedCandidates = selectedSet.size > 0
            ? getStageCandidateEntries(normalizedSectionKey, selectedSet)
            : getStageCandidateEntries(normalizedSectionKey);

        if (stagedCandidates.length === 0) {
            stageMainTargetKeyBySection.delete(normalizedSectionKey);
            return '';
        }

        const existingMainKey = String(stageMainTargetKeyBySection.get(normalizedSectionKey) || '').trim();
        if (existingMainKey && stagedCandidates.some((entry) => entry.key === existingMainKey)) {
            return existingMainKey;
        }

        const sectionState = getSectionControlState(normalizedSectionKey);
        const selectedMain = pickStageMainCandidate(stagedCandidates, sectionState.mainSeedSource);
        stageMainTargetKeyBySection.set(normalizedSectionKey, selectedMain);
        return selectedMain;
    }

    async function waitForJobCompletion(targetKey, pollMaxMinutes) {
        const timeoutMs = sanitizePollMaxMinutes(pollMaxMinutes) * 60 * 1000;
        const startedAt = Date.now();

        while ((Date.now() - startedAt) < timeoutMs) {
            await pollAddedJobs();
            const job = addJobs.get(targetKey);
            if (!job) return false;
            if (job.error) return false;

            if (!isJobPending(job)) {
                return true;
            }

            await delay(2500);
        }

        return false;
    }

    async function addTargetsStaged(addConfig, withDownload, selectedMainKey) {
        const mainEntry = withDownload.find((entry) => entry.key === selectedMainKey) || withDownload[0];
        const fanoutEntries = withDownload.filter((entry) => entry.key !== mainEntry.key);

        seedAddJobs([mainEntry], 'Submitting main seed to qui...');
        renderFeedbackPanel();
        await postToQui(addConfig, [mainEntry.target.downloadUrl], { skipChecking: false });
        markAddJobsSubmitted([mainEntry]);
        renderFeedbackPanel();
        startAddPolling();

        const completed = await waitForJobCompletion(mainEntry.key, addConfig.pollMaxMinutes);
        if (!completed) {
            throw new Error('Main seed did not reach 100% before timeout.');
        }

        if (fanoutEntries.length === 0) {
            return { mainCount: 1, fanoutCount: 0 };
        }

        seedAddJobs(fanoutEntries, 'Submitting fan-out targets to qui...');
        renderFeedbackPanel();
        await postToQui(addConfig, fanoutEntries.map((entry) => entry.target.downloadUrl), { skipChecking: true });
        markAddJobsSubmitted(fanoutEntries);
        renderFeedbackPanel();
        await pollAddedJobs();
        await runPostAddVerificationPolls();

        return { mainCount: 1, fanoutCount: fanoutEntries.length };
    }

    async function addSelectedTargets(button) {
        const selectedKeys = getSelectedTargetKeys();
        if (selectedKeys.length === 0) {
            setStatus('No targets selected.');
            return;
        }

        const selectedTargets = selectedKeys
            .map((key) => ({ key, target: targetByKey.get(key) }))
            .filter((entry) => Boolean(entry.target));

        const withDownload = selectedTargets.filter((entry) => Boolean(entry.target.downloadUrl));
        if (withDownload.length === 0) {
            setStatus('No selected targets have a download URL.', true);
            return;
        }

        const panel = document.getElementById(PANEL_ID);
        syncDiscoveredSavePathSelections(panel);
        const config = panel ? gatherPanelConfig(panel, getConfig()) : getConfig();
        if (!config.baseUrl || !config.token) {
            setStatus('Missing qui base URL or token.', true);
            return;
        }

        const selectedBySection = new Map();
        withDownload.forEach((entry) => {
            const sectionKey = String(entry.target.sectionKey || '').trim() || '__default__';
            if (!selectedBySection.has(sectionKey)) {
                selectedBySection.set(sectionKey, []);
            }
            selectedBySection.get(sectionKey).push(entry);
        });

        button.disabled = true;
        button.value = 'Adding selected...';

        addJobs.clear();
        renderFeedbackPanel();

        try {
            let totalSubmitted = 0;
            let totalMain = 0;
            let totalFanout = 0;

            for (const [sectionKey, sectionEntries] of selectedBySection.entries()) {
                const addConfig = {
                    ...config,
                    savePath: resolveEffectiveSavePath(config, sectionKey)
                };

                const selectedBasePaths = sectionEntries
                    .map((entry) => String(entry.target.baseSavePath || '').trim())
                    .filter(Boolean);
                const uniqueBasePaths = Array.from(new Set(selectedBasePaths));
                const hasSectionSavePathSelector = Boolean(panel?.querySelector(`.ptp-sqt-savepath-choice[data-sqt-section-key="${sectionKey}"]`));
                if (uniqueBasePaths.length === 1 && !hasSectionSavePathSelector) {
                    addConfig.savePath = uniqueBasePaths[0];
                }

                const selectedMainKey = getSelectedMainTargetKey(sectionKey, sectionEntries);
                const shouldStage = config.stagedMainThenFanout
                    && selectedMainKey
                    && sectionEntries.some((entry) => entry.key === selectedMainKey)
                    && sectionEntries.length > 1;

                if (shouldStage) {
                    const stagedResult = await addTargetsStaged(addConfig, sectionEntries, selectedMainKey);
                    totalMain += stagedResult.mainCount;
                    totalFanout += stagedResult.fanoutCount;
                    totalSubmitted += stagedResult.mainCount + stagedResult.fanoutCount;
                } else {
                    seedAddJobs(sectionEntries, 'Submitting to qui...');
                    renderFeedbackPanel();
                    await postToQui(addConfig, sectionEntries.map((entry) => entry.target.downloadUrl));
                    markAddJobsSubmitted(sectionEntries);
                    renderFeedbackPanel();
                    startAddPolling();
                    await pollAddedJobs();
                    await runPostAddVerificationPolls();
                    totalSubmitted += sectionEntries.length;
                }
            }

            if (totalMain > 0) {
                setStatus(`Main seed added (${totalMain}), then fan-out added (${totalFanout}).`);
            } else {
                const skipInfo = config.skipRecheck ? ' skip_recheck=ON' : ' skip_recheck=OFF';
                setStatus(`Submitted ${totalSubmitted} selected target(s) to qui.${skipInfo}`);
            }
        } catch (error) {
            setAddJobsError(withDownload, error);
            renderFeedbackPanel();
            setStatus(`Add failed: ${error?.message || error}`, true);
        } finally {
            button.value = 'Add Selected to qui';
            button.disabled = false;
            updateSelectionSummary();
        }
    }

    function delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    async function runPostAddVerificationPolls() {
        for (let i = 0; i < POST_ADD_VERIFICATION_POLLS; i += 1) {
            if (!hasUnresolvedAddJobs()) {
                return;
            }
            await delay(POST_ADD_VERIFICATION_DELAY_MS);
            await pollAddedJobs();
        }
    }

    function resolveSensitiveValue(rawValue, fallbackValue) {
        const normalizedRaw = String(rawValue || '').trim();
        if (normalizedRaw === REDACTED_VALUE) {
            return String(fallbackValue || '').trim();
        }
        return normalizedRaw;
    }

    function gatherPanelConfig(panel, currentConfig) {
        const valueOf = (selector) => String(panel.querySelector(selector)?.value || '').trim();
        return {
            baseUrl: resolveSensitiveValue(valueOf('#ptp-sqt-base-url'), currentConfig?.baseUrl || '').replace(/\/+$/, ''),
            token: resolveSensitiveValue(valueOf('#ptp-sqt-token'), currentConfig?.token || ''),
            savePath: resolveSensitiveValue(valueOf('#ptp-sqt-save-path'), currentConfig?.savePath || ''),
            instanceId: sanitizeInstanceId(valueOf('#ptp-sqt-instance-id')),
            skipRecheck: Boolean(panel.querySelector('#ptp-sqt-skip-recheck')?.checked),
            pollMaxMinutes: sanitizePollMaxMinutes(valueOf('#ptp-sqt-poll-max-minutes')),
            categories: valueOf('#ptp-sqt-categories'),
            tags: valueOf('#ptp-sqt-tags'),
            excludeStatus: String(currentConfig?.excludeStatus || '').trim(),
            limit: Number(currentConfig?.limit) || DEFAULTS.limit,
            waitForEvent: Boolean(panel.querySelector('#ptp-sqt-wait-event')?.checked),
            collapsed: Boolean(panel.querySelector('#ptp-sqt-collapsed-default')?.checked),
            qualityContainer: valueOf('#ptp-sqt-quality-container'),
            qualityCodec: valueOf('#ptp-sqt-quality-codec'),
            qualitySource: valueOf('#ptp-sqt-quality-source'),
            qualityResolution: valueOf('#ptp-sqt-quality-resolution'),
            qualityHdrMode: sanitizeHdrMode(valueOf('#ptp-sqt-quality-hdr-mode')),
            qualityReleaseType: valueOf('#ptp-sqt-quality-release-type'),
            qualityMode: sanitizeQualityMode(valueOf('#ptp-sqt-quality-mode')),
            qualityTieBreaker: sanitizeQualityTieBreaker(valueOf('#ptp-sqt-quality-tie-breaker')),
            selectedPtpTorrentId: valueOf('#ptp-sqt-selected-ptp-torrent-id'),
            enableNoSeedFallback: Boolean(panel.querySelector('#ptp-sqt-enable-no-seed-fallback')?.checked),
            stagedMainThenFanout: Boolean(panel.querySelector('#ptp-sqt-staged-main-then-fanout')?.checked),
            mainSeedSource: sanitizeMainSeedSource(currentConfig?.mainSeedSource || '')
        };
    }

    function splitCsv(value) {
        return String(value || '')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
    }

    function sanitizeUrlToken(value) {
        return String(value || '')
            .trim()
            .replaceAll(/^\/+/g, '')
            .replaceAll(/\/+$/g, '');
    }

    function pushUniqueUrl(urls, value) {
        if (value && !urls.includes(value)) {
            urls.push(value);
        }
    }

    function sanitizeQuiSearchTerm(value) {
        return String(value || '')
            .replaceAll('.', ' ')
            .replaceAll('[', ' ')
            .replaceAll(']', ' ')
            .replaceAll(/\bhevc\b/ig, ' ')
            .replaceAll(/\s+/g, ' ')
            .trim();
    }

    function buildProxySearchCandidateUrls(baseUrl, tokenValue) {
        const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
        if (!normalizedBaseUrl) return [];

        const token = sanitizeUrlToken(tokenValue);
        if (!token) return [];

        const urls = [];

        if (/\/proxy\/[^/]+\/api\/v2\/torrents\/search$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, normalizedBaseUrl);
            return urls;
        }

        if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/search`);
            return urls;
        }

        if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/torrents/search`);
            return urls;
        }

        if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/search`);
            return urls;
        }

        pushUniqueUrl(urls, `${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/search`);
        return urls;
    }

    function buildProxyAddCandidateUrls(baseUrl, tokenValue) {
        const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
        if (!normalizedBaseUrl) return [];

        const token = sanitizeUrlToken(tokenValue);
        if (!token) return [];

        const urls = [];

        if (/\/proxy\/[^/]+\/api\/v2\/torrents\/add$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, normalizedBaseUrl);
            return urls;
        }

        if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/add`);
            return urls;
        }

        if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/torrents/add`);
            return urls;
        }

        if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/add`);
            return urls;
        }

        pushUniqueUrl(urls, `${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/add`);
        pushUniqueUrl(urls, `${normalizedBaseUrl}/api/proxy/${token}/api/v2/torrents/add`);
        return urls;
    }

    function buildProxyDeleteCandidateUrls(baseUrl, tokenValue) {
        const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
        if (!normalizedBaseUrl) return [];

        const token = sanitizeUrlToken(tokenValue);
        if (!token) return [];

        const urls = [];

        if (/\/proxy\/[^/]+\/api\/v2\/torrents\/delete$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, normalizedBaseUrl);
            return urls;
        }

        if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/delete`);
            return urls;
        }

        if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/torrents/delete`);
            return urls;
        }

        if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUniqueUrl(urls, `${normalizedBaseUrl}/api/v2/torrents/delete`);
            return urls;
        }

        pushUniqueUrl(urls, `${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/delete`);
        pushUniqueUrl(urls, `${normalizedBaseUrl}/api/proxy/${token}/api/v2/torrents/delete`);
        return urls;
    }

    function buildProxySearchUrl(searchBaseUrl, config, searchTerm = '') {
        const normalizedSearch = sanitizeQuiSearchTerm(searchTerm);
        const queryParts = [
            ...(normalizedSearch ? [`search=${encodeURIComponent(normalizedSearch)}`] : []),
            'sort=added_on',
            'reverse=true',
            `limit=${encodeURIComponent(String(Math.min(Math.max(1, Number(config.limit) || DEFAULTS.limit), 2000)))}`
        ];

        return `${searchBaseUrl}?${queryParts.join('&')}`;
    }

    function parseQuiResults(responseText) {
        try {
            const parsed = JSON.parse(responseText || '[]');
            if (Array.isArray(parsed)) return parsed;
            if (parsed && Array.isArray(parsed.torrents)) return parsed.torrents;
            return [];
        } catch {
            return [];
        }
    }

    function queryQui(config, searchTerm = '') {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing qui token.'));
                return;
            }

            const candidateUrls = buildProxySearchCandidateUrls(config.baseUrl, token);
            if (candidateUrls.length === 0) {
                reject(new Error('Missing qui base URL or token.'));
                return;
            }

            const attempted = [];

            const tryRequest = (index) => {
                const base = candidateUrls[index];
                const url = buildProxySearchUrl(base, config, searchTerm);
                attempted.push(url);
                console.debug(`[PTP Seeded qui Targets] qui search request ${index + 1}/${candidateUrls.length}: ${url}`);

                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    onload: (response) => {
                        console.debug(`[PTP Seeded qui Targets] qui response status=${response.status} for ${url}`);
                        if (response.status >= 200 && response.status < 300) {
                            const parsedResults = parseQuiResults(response.responseText);
                            console.debug(`[PTP Seeded qui Targets] qui results count=${parsedResults.length} (search filter only)`);
                            resolve(parsedResults);
                            return;
                        }

                        if ((response.status === 401 || response.status === 403 || response.status === 404) && index < candidateUrls.length - 1) {
                            console.debug(`[PTP Seeded qui Targets] Retrying next qui endpoint after status ${response.status}.`);
                            tryRequest(index + 1);
                            return;
                        }

                        reject(new Error(`Search failed with ${response.status} (${attempted.join(' | ')})`));
                    },
                    onerror: () => {
                        console.debug(`[PTP Seeded qui Targets] qui request transport error for ${url}`);
                        if (index < candidateUrls.length - 1) {
                            tryRequest(index + 1);
                            return;
                        }
                        reject(new Error(`Search request failed (${attempted.join(' | ')})`));
                    }
                });
            };

            tryRequest(0);
        });
    }

    function postToQui(config, urls, options = {}) {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing qui token.'));
                return;
            }

            const candidateUrls = buildProxyAddCandidateUrls(config.baseUrl, token);
            if (candidateUrls.length === 0) {
                reject(new Error('Missing qui base URL or token.'));
                return;
            }

            const formData = new FormData();
            formData.append('urls', urls.join('\n'));
            if (String(config.savePath || '').trim()) {
                formData.append('savepath', String(config.savePath || '').trim());
            }
            if (String(config.categories || '').trim()) {
                formData.append('category', splitCsv(config.categories).join(','));
            }
            if (String(config.tags || '').trim()) {
                formData.append('tags', splitCsv(config.tags).join(','));
            }
            if (String(config.instanceId || '').trim()) {
                formData.append('instance_id', String(config.instanceId || '').trim());
            }
            const shouldSkipChecking = typeof options.skipChecking === 'boolean'
                ? options.skipChecking
                : Boolean(config.skipRecheck);
            if (shouldSkipChecking) {
                formData.append('skip_checking', 'true');
            }

            const attempted = [];

            const tryPost = (index) => {
                const url = candidateUrls[index];
                attempted.push(url);
                console.debug(`[PTP Seeded qui Targets] qui add request ${index + 1}/${candidateUrls.length}: ${url}`);

                GM_xmlhttpRequest({
                    method: 'POST',
                    url,
                    data: formData,
                    onload: (response) => {
                        console.debug(`[PTP Seeded qui Targets] qui add response status=${response.status} for ${url}`);
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                            return;
                        }

                        if ((response.status === 401 || response.status === 403 || response.status === 404) && index < candidateUrls.length - 1) {
                            tryPost(index + 1);
                            return;
                        }

                        reject(new Error(`Add failed with ${response.status} (${attempted.join(' | ')})`));
                    },
                    onerror: () => {
                        if (index < candidateUrls.length - 1) {
                            tryPost(index + 1);
                            return;
                        }
                        reject(new Error(`Add request failed (${attempted.join(' | ')})`));
                    }
                });
            };

            tryPost(0);
        });
    }

    function deleteFromQui(config, hashes, deleteFiles) {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing qui token.'));
                return;
            }

            const candidateUrls = buildProxyDeleteCandidateUrls(config.baseUrl, token);
            if (candidateUrls.length === 0) {
                reject(new Error('Missing qui base URL or token.'));
                return;
            }

            const normalizedHashes = Array.isArray(hashes)
                ? hashes.map((hash) => String(hash || '').trim().toLowerCase()).filter(Boolean)
                : [];

            if (normalizedHashes.length === 0) {
                reject(new Error('No QUI torrent hashes selected for delete.'));
                return;
            }

            const formData = new FormData();
            formData.append('hashes', normalizedHashes.join('|'));
            formData.append('deleteFiles', deleteFiles ? 'true' : 'false');

            const attempted = [];

            const tryPost = (index) => {
                const url = candidateUrls[index];
                attempted.push(url);
                console.debug(`[PTP Seeded qui Targets] qui delete request ${index + 1}/${candidateUrls.length}: ${url}`);

                GM_xmlhttpRequest({
                    method: 'POST',
                    url,
                    data: formData,
                    onload: (response) => {
                        console.debug(`[PTP Seeded qui Targets] qui delete response status=${response.status} for ${url}`);
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                            return;
                        }

                        if ((response.status === 401 || response.status === 403 || response.status === 404) && index < candidateUrls.length - 1) {
                            tryPost(index + 1);
                            return;
                        }

                        reject(new Error(`Delete failed with ${response.status} (${attempted.join(' | ')})`));
                    },
                    onerror: () => {
                        if (index < candidateUrls.length - 1) {
                            tryPost(index + 1);
                            return;
                        }
                        reject(new Error(`Delete request failed (${attempted.join(' | ')})`));
                    }
                });
            };

            tryPost(0);
        });
    }

    async function deleteSelectedQuiTitleLookupTorrents(button) {
        const selectedKeys = getSelectedQuiTitleLookupDeleteKeys();
        if (selectedKeys.length === 0) {
            setStatus('No matched QUI torrents selected for delete.');
            return;
        }

        const selectedEntries = selectedKeys
            .map((key) => ({ key, item: quiTitleLookupDeleteByKey.get(key) }))
            .filter((entry) => Boolean(entry.item));
        const hashes = selectedEntries
            .map((entry) => String(entry.item.hash || '').trim().toLowerCase())
            .filter(Boolean);

        if (hashes.length === 0) {
            setStatus('Selected QUI rows are missing torrent hashes; cannot delete.', true);
            return;
        }

        const panel = document.getElementById(PANEL_ID);
        const config = panel ? gatherPanelConfig(panel, getConfig()) : getConfig();
        const deleteContent = Boolean(panel?.querySelector(`#${QUI_TITLE_DELETE_CONTENT_ID}`)?.checked);

        if (!config.baseUrl || !config.token) {
            setStatus('Missing qui base URL or token.', true);
            return;
        }

        const confirmMessage = deleteContent
            ? `Delete ${hashes.length} matched QUI torrent(s) and remove content files? This cannot be undone.`
            : `Delete ${hashes.length} matched QUI torrent(s) from QUI?`;
        const shouldProceed = typeof globalThis.confirm === 'function'
            ? globalThis.confirm(confirmMessage)
            : true;
        if (!shouldProceed) {
            setStatus('Delete cancelled.');
            return;
        }

        button.disabled = true;
        button.value = 'Deleting selected...';

        try {
            await deleteFromQui(config, hashes, deleteContent);
            selectedKeys.forEach((key) => {
                quiTitleLookupDeleteSelectionState.set(key, false);
            });

            if (panel) {
                await runQuiAkaTitleLookup(panel, { force: true });
                const remainingHashes = new Set(
                    Array.from(quiTitleLookupDeleteByKey.values())
                        .map((entry) => String(entry?.hash || '').trim().toLowerCase())
                        .filter(Boolean)
                );
                const stillPresent = hashes.filter((hash) => remainingHashes.has(hash));
                if (stillPresent.length === 0) {
                    setStatus(`Deleted ${hashes.length} QUI title-lookup torrent(s). Fresh title lookup confirms removal.`);
                } else {
                    setStatus(`Delete completed, but fresh title lookup still shows ${stillPresent.length} torrent(s).`, true);
                }
            } else {
                setStatus(`Deleted ${hashes.length} QUI title-lookup torrent(s). delete content: ${deleteContent ? 'ON' : 'OFF'}`);
            }
        } catch (error) {
            setStatus(`Delete failed: ${error?.message || error}`, true);
        } finally {
            button.value = 'Delete Selected QUI Torrents';
            button.disabled = false;
            updateQuiTitleLookupDeleteSummary(panel);
        }
    }

    function normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, '.');
    }

    function parseInteger(value) {
        const parsed = Number.parseInt(String(value || '').replaceAll(/[^0-9-]+/g, ''), 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getNameExtension(name) {
        const value = String(name || '').trim();
        if (!value) return '';
        const basename = value.replaceAll('\\', '/').split('/').findLast(Boolean) || '';
        if (!basename.includes('.')) return '';
        const ext = basename.split('.').findLast(Boolean) || '';
        return String(ext || '').trim().toLowerCase();
    }

    function inferTypeFromName(name) {
        const ext = getNameExtension(name);
        if (!ext) return 'folder';
        return 'file';
    }

    function inferTypeFromFileList(fileNames) {
        const names = Array.isArray(fileNames)
            ? fileNames.map((item) => String(item || '').trim()).filter(Boolean)
            : [];
        if (names.length === 0) return 'unknown';

        if (names.length > 1) {
            return 'folder';
        }

        const only = names[0];
        if (/[\\/]/.test(only)) {
            return 'folder';
        }

        const ext = getNameExtension(only);
        if (ext && KNOWN_FILE_EXTENSIONS.has(ext)) {
            return 'file';
        }

        return ext ? 'file' : 'unknown';
    }

    function inferTypeFromFileCount(fileCount) {
        if (!Number.isInteger(fileCount)) return 'unknown';
        if (fileCount <= 0) return 'unknown';
        if (fileCount === 1) return 'file';
        return 'folder';
    }

    function parseRowInlineFiles(row) {
        if (!row) {
            return { fileNames: [], fileCount: null };
        }

        const fileNames = [];
        row.querySelectorAll('span.files[title]').forEach((node) => {
            const raw = String(node.getAttribute('title') || '').trim();
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                const fileName = String(parsed?.name || '').trim();
                if (fileName) {
                    fileNames.push(fileName);
                }
            } catch {
                // ignore malformed inline file metadata
            }
        });

        const inlineCount = parseInteger(row.querySelector('.filecount[title]')?.getAttribute('title') || '');
        const fileCount = Number.isInteger(inlineCount) && inlineCount >= 0
            ? inlineCount
            : (fileNames.length > 0 ? fileNames.length : null);

        return { fileNames, fileCount };
    }

    function inferTypeFromPtpHeaderPath(container) {
        if (!container) return 'unknown';

        const headerCell = container.querySelector('thead th');
        if (!headerCell) return 'unknown';

        const headerDivs = Array.from(headerCell.querySelectorAll('div'));
        const rightText = String(headerDivs.findLast(Boolean)?.textContent || '').trim();
        if (!rightText) return 'unknown';

        if (rightText === '//') {
            return 'file';
        }

        if (rightText.startsWith('/') && rightText.endsWith('/')) {
            const inner = rightText.slice(1, -1).trim();
            return inner ? 'folder' : 'unknown';
        }

        return 'unknown';
    }

    function parsePtpHiddenFilesByTorrentId(torrentId) {
        const id = String(torrentId || '').trim();
        if (!id) {
            return { fileNames: [], fileCount: null, contentType: 'unknown' };
        }

        const filesContainer = document.getElementById(`files_${id}`);
        const hiddenRow = document.getElementById(`torrent_${id}`);
        const scopedContainer = filesContainer || hiddenRow?.querySelector(`#files_${id}`) || hiddenRow;
        if (!scopedContainer) {
            return { fileNames: [], fileCount: null, contentType: 'unknown' };
        }

        const rows = Array.from(scopedContainer.querySelectorAll('tbody tr'));
        const fileNames = rows
            .map((tr) => {
                const firstCell = tr.querySelector('td');
                return String(firstCell?.textContent || '').trim();
            })
            .filter(Boolean);

        return {
            fileNames,
            fileCount: fileNames.length > 0 ? fileNames.length : null,
            contentType: inferTypeFromPtpHeaderPath(scopedContainer)
        };
    }

    function collectRowFileMeta(row, torrentId) {
        const inlineMeta = parseRowInlineFiles(row);
        const hiddenMeta = parsePtpHiddenFilesByTorrentId(torrentId);

        const preferInline = inlineMeta.fileNames.length > 0 || Number.isInteger(inlineMeta.fileCount);
        const selectedMeta = preferInline ? inlineMeta : hiddenMeta;
        const fileCount = Number.isInteger(selectedMeta.fileCount) && selectedMeta.fileCount >= 0 ? selectedMeta.fileCount : null;
        const fileNames = Array.isArray(selectedMeta.fileNames) ? selectedMeta.fileNames : [];
        const inferredTypeFromFiles = inferTypeFromFileList(fileNames);
        const inferredTypeFromCount = inferTypeFromFileCount(fileCount);
        const fallbackInferredType = inferredTypeFromFiles === 'unknown' ? inferredTypeFromCount : inferredTypeFromFiles;
        const rowContentType = selectedMeta.contentType && selectedMeta.contentType !== 'unknown'
            ? selectedMeta.contentType
            : fallbackInferredType;

        return {
            rowFileNames: fileNames,
            rowFileCount: fileCount,
            rowContentType,
            rowFileMetaSource: preferInline ? 'inline' : (fileNames.length > 0 ? 'hidden' : 'none')
        };
    }

    function extractQuiFileMeta(rawItem) {
        const item = rawItem && typeof rawItem === 'object' ? rawItem : {};
        const possibleCounts = [
            item.file_count,
            item.fileCount,
            item.filecount,
            item.files_count,
            item.filesCount,
            item.num_files
        ];

        let fileCount = null;
        possibleCounts.forEach((value) => {
            if (fileCount !== null) return;
            const parsed = parseInteger(value);
            if (Number.isInteger(parsed) && parsed >= 0) {
                fileCount = parsed;
            }
        });

        if (fileCount === null && Array.isArray(item.files)) {
            fileCount = item.files.length;
        }

        let contentType = 'unknown';
        if (Array.isArray(item.files) && item.files.length > 0) {
            const names = item.files
                .map((entry) => {
                    if (typeof entry === 'string') return entry;
                    return entry?.name || entry?.path || '';
                })
                .map((name) => String(name || '').trim())
                .filter(Boolean);
            contentType = inferTypeFromFileList(names);
        } else if (Number.isInteger(fileCount)) {
            if (fileCount === 1) contentType = 'file';
            if (fileCount > 1) contentType = 'folder';
        }

        return {
            expectedFileCount: fileCount,
            reportedContentType: contentType
        };
    }

    function formatTypeLabel(type) {
        if (type === 'file') return 'file';
        if (type === 'folder') return 'folder';
        return 'unknown';
    }

    function collectMismatchNotes({ actualType, actualFileCount, expectedType, expectedFileCount, seededFileCount }) {
        const notes = [];

        if (expectedType && expectedType !== 'unknown' && actualType && actualType !== 'unknown' && expectedType !== actualType) {
            notes.push(`got ${formatTypeLabel(actualType)}, expected ${formatTypeLabel(expectedType)}`);
        }

        if (Number.isInteger(actualFileCount) && Number.isInteger(seededFileCount) && actualFileCount !== seededFileCount) {
            notes.push(`file count mismatch (seeded ${seededFileCount}, got ${actualFileCount})`);
        }

        if (Number.isInteger(actualFileCount) && Number.isInteger(expectedFileCount) && actualFileCount !== expectedFileCount) {
            notes.push(`file count mismatch (qui ${expectedFileCount}, got ${actualFileCount})`);
        }

        return notes;
    }

    function buildTargetMismatchNotes(targetMeta, quiItem, seededMeta) {
        const seededType = seededMeta?.rowContentType || 'unknown';
        const quiExpectedType = quiItem?.expectedTypeFromName || 'unknown';
        const expectedType = quiExpectedType === 'unknown' ? seededType : quiExpectedType;
        return collectMismatchNotes({
            actualType: targetMeta?.rowContentType || 'unknown',
            actualFileCount: targetMeta?.rowFileCount,
            expectedType,
            expectedFileCount: quiItem?.expectedFileCount,
            seededFileCount: seededMeta?.rowFileCount
        });
    }

    function buildQuiMismatchNotes(quiItem, seededMeta) {
        const reportedType = quiItem?.reportedContentType || 'unknown';
        const seededType = seededMeta?.rowContentType || 'unknown';
        const notes = [];

        if (reportedType !== 'unknown' && seededType !== 'unknown' && reportedType !== seededType) {
            notes.push(`type mismatch (seeded ${formatTypeLabel(seededType)}, qui ${formatTypeLabel(reportedType)})`);
        }

        if (Number.isInteger(quiItem?.expectedFileCount) && Number.isInteger(seededMeta?.rowFileCount) && quiItem.expectedFileCount !== seededMeta.rowFileCount) {
            notes.push(`file count mismatch (seeded ${seededMeta.rowFileCount}, qui ${quiItem.expectedFileCount})`);
        }

        return notes;
    }

    function renderMismatchNotesInline(notes) {
        if (!Array.isArray(notes) || notes.length === 0) return '';
        const text = notes.join('; ');
        return ` <span style="color:#ffcc80;" title="${escapeHtml(text)}">[${escapeHtml(text)}]</span>`;
    }

    function normalizeReleaseNameKey(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replaceAll(/dolby[\s._-]*vision|dovi/ig, 'dv')
            .replaceAll(/hdr10\+/ig, 'hdr10plus')
            .replaceAll(/\.(?:mkv|mp4|avi|m2ts|iso)$/ig, '')
            .replaceAll(/[^a-z0-9]+/g, '');
    }

    function normalizeSavePath(value) {
        return String(value || '')
            .trim()
            .replaceAll('\\', '/')
            .replaceAll(/\/+$/g, '')
            .toLowerCase();
    }

    function normalizeHost(host) {
        let normalized = String(host || '').trim().toLowerCase();
        if (!normalized) return '';

        normalized = normalized
            .replaceAll(/^["'`]+/g, '')
            .replaceAll(/["'`]+$/g, '');
        if (!normalized) return '';

        const parseHost = (value) => {
            try {
                const parsed = new URL(value);
                return String(parsed.hostname || '').trim().toLowerCase();
            } catch {
                return '';
            }
        };

        let parsedHost = '';
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
            parsedHost = parseHost(normalized);
        } else if (normalized.startsWith('//')) {
            parsedHost = parseHost(`https:${normalized}`);
        } else if (/[/?#]/.test(normalized) || /:\d{1,5}(?:$|[/?#])/.test(normalized)) {
            parsedHost = parseHost(`https://${normalized.replaceAll(/^\/+/, '')}`);
        }

        if (parsedHost) {
            normalized = parsedHost;
        } else if (/^[^\s/:]+:\d{1,5}$/i.test(normalized)) {
            normalized = normalized.replace(/:\d{1,5}$/i, '');
        }

        return normalized
            .replaceAll(/^\[/g, '')
            .replaceAll(/\]$/g, '')
            .replace(/^www\./, '');
    }

    function canonicalizeHostForMatch(host) {
        const normalized = normalizeHost(host);
        if (!normalized) return '';

        if (HOST_MATCH_ALIAS_TARGETS[normalized]) {
            return HOST_MATCH_ALIAS_TARGETS[normalized];
        }

        const parts = normalized.split('.').filter(Boolean);
        for (let index = 1; index < parts.length; index += 1) {
            const suffix = parts.slice(index).join('.');
            if (HOST_MATCH_ALIAS_TARGETS[suffix]) {
                return HOST_MATCH_ALIAS_TARGETS[suffix];
            }
        }

        return normalized;
    }

    function getDomainTail(host) {
        const normalized = normalizeHost(host);
        const parts = normalized.split('.').filter(Boolean);
        if (parts.length >= 2) {
            return `${parts.at(-2)}.${parts.at(-1)}`;
        }
        return normalized;
    }

    function hostsFuzzyMatch(left, right) {
        const a = canonicalizeHostForMatch(left);
        const b = canonicalizeHostForMatch(right);
        if (!a || !b) return false;
        if (a === b) return true;
        if (getDomainTail(a) === getDomainTail(b)) return true;

        const aHasDot = a.includes('.');
        const bHasDot = b.includes('.');
        if (aHasDot === bHasDot) return false;

        const bare = aHasDot ? b : a;
        const dotted = aHasDot ? a : b;
        if (!bare) return false;

        const dottedLabels = dotted.split('.').filter(Boolean);
        return dottedLabels.includes(bare);
    }

    function namesLikelyMatch(left, right) {
        const leftNorm = normalizeText(left);
        const rightNorm = normalizeText(right);
        if (leftNorm && rightNorm && leftNorm === rightNorm) {
            return true;
        }

        const leftKey = normalizeReleaseNameKey(left);
        const rightKey = normalizeReleaseNameKey(right);
        if (!leftKey || !rightKey) {
            return false;
        }
        if (leftKey === rightKey) {
            return true;
        }

        if (Math.min(leftKey.length, rightKey.length) < 16) {
            return false;
        }

        return leftKey.includes(rightKey) || rightKey.includes(leftKey);
    }

    function extractUrls(text) {
        const raw = String(text || '');
        if (!raw) return [];
        const matches = raw.match(/https?:\/\/[^\s"'<>]+/ig) || [];
        return matches;
    }

    function extractMagnetParamUrls(text) {
        const raw = String(text || '').trim();
        if (!raw) return [];

        const magnetLinks = raw.match(/magnet:\?[^\s"'<>]+/ig) || [];
        if (magnetLinks.length === 0 && /^magnet:\?/i.test(raw)) {
            magnetLinks.push(raw);
        }

        const urls = [];

        magnetLinks.forEach((magnetLink) => {
            let parsed;
            try {
                parsed = new URL(magnetLink);
            } catch {
                return;
            }

            parsed.searchParams.forEach((value) => {
                const candidate = String(value || '').trim();
                if (!candidate) return;

                if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
                    urls.push(candidate);
                    return;
                }

                if (candidate.startsWith('//')) {
                    urls.push(`https:${candidate}`);
                }
            });
        });

        return urls;
    }

    function safeHostFromUrl(urlValue) {
        try {
            return normalizeHost(new URL(urlValue, location.origin).hostname);
        } catch {
            return '';
        }
    }

    function normalizeQualityToken(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replaceAll(/[\s_]+/g, '-')
            .replaceAll(/\.+/g, '-');
    }

    function normalizeResolution(value) {
        const normalized = normalizeQualityToken(value);
        if (!normalized) return '';
        if (normalized === '4k') return '2160p';
        if (normalized === 'uhd') return '2160p';
        if (normalized === 'fhd') return '1080p';
        return normalized;
    }

    function normalizeSource(value) {
        const normalized = normalizeQualityToken(value);
        if (!normalized) return '';
        if (['bluray', 'blu-ray', 'bdrip', 'bdremux', 'bd-rip'].includes(normalized)) return 'blu-ray';
        if (['web-dl', 'webdl', 'web-rip', 'webrip', 'web'].includes(normalized)) return 'web';
        if (normalized === 'dvd-screener') return 'dvd-screener';
        return normalized;
    }

    function normalizeCodec(value) {
        const normalized = normalizeQualityToken(value);
        if (!normalized) return '';
        if (normalized === 'h-264') return 'h264';
        if (normalized === 'h-265') return 'h265';
        return normalized;
    }

    function normalizeContainer(value) {
        const normalized = normalizeQualityToken(value);
        if (!normalized) return '';
        if (normalized === 'vob-ifo') return 'vob-ifo';
        return normalized;
    }

    function normalizeReleaseType(value) {
        const normalized = normalizeQualityToken(value);
        if (!normalized) return '';
        if (['goldenpopcorn', 'golden-popcorn', 'gp'].includes(normalized)) return 'golden-popcorn';
        if (['nonscene', 'non-scene'].includes(normalized)) return 'non-scene';
        if (normalized === 'scene') return 'scene';
        return normalized;
    }

    function parseCsvSet(value, normalizer = normalizeQualityToken) {
        const parts = splitCsv(value);
        const normalized = parts
            .map((part) => normalizer(part))
            .filter(Boolean);
        return new Set(normalized);
    }

    function parseQualityFilters(config) {
        return {
            resolution: parseCsvSet(config.qualityResolution, normalizeResolution),
            source: parseCsvSet(config.qualitySource, normalizeSource),
            codec: parseCsvSet(config.qualityCodec, normalizeCodec),
            container: parseCsvSet(config.qualityContainer, normalizeContainer),
            releaseType: parseCsvSet(config.qualityReleaseType, normalizeReleaseType),
            hdrMode: sanitizeHdrMode(config.qualityHdrMode),
            mode: sanitizeQualityMode(config.qualityMode),
            tieBreaker: sanitizeQualityTieBreaker(config.qualityTieBreaker)
        };
    }

    function compareRowsByTieBreaker(left, right, tieBreaker) {
        const mode = sanitizeQualityTieBreaker(tieBreaker);
        const [key, directionToken] = mode.split('-');
        const direction = directionToken === 'asc' ? 1 : -1;

        const getMetric = (meta) => {
            if (key === 'seeders') {
                return Number.isInteger(meta?.seeders) ? meta.seeders : null;
            }
            if (key === 'uploaded') {
                return Number.isInteger(meta?.uploadedAt) ? meta.uploadedAt : null;
            }
            return Number.isInteger(meta?.sizeBytes) ? meta.sizeBytes : null;
        };

        const leftMetric = getMetric(left);
        const rightMetric = getMetric(right);
        if (Number.isInteger(leftMetric) && Number.isInteger(rightMetric) && leftMetric !== rightMetric) {
            return (leftMetric - rightMetric) * direction;
        }

        if (Number.isInteger(leftMetric) && !Number.isInteger(rightMetric)) {
            return -1;
        }
        if (!Number.isInteger(leftMetric) && Number.isInteger(rightMetric)) {
            return 1;
        }

        const leftSeeders = Number.isInteger(left?.seeders) ? left.seeders : -1;
        const rightSeeders = Number.isInteger(right?.seeders) ? right.seeders : -1;
        if (leftSeeders !== rightSeeders) {
            return rightSeeders - leftSeeders;
        }

        const leftSize = Number.isInteger(left?.sizeBytes) ? left.sizeBytes : -1;
        const rightSize = Number.isInteger(right?.sizeBytes) ? right.sizeBytes : -1;
        if (leftSize !== rightSize) {
            return rightSize - leftSize;
        }

        const leftUploaded = Number.isInteger(left?.uploadedAt) ? left.uploadedAt : -1;
        const rightUploaded = Number.isInteger(right?.uploadedAt) ? right.uploadedAt : -1;
        if (leftUploaded !== rightUploaded) {
            return rightUploaded - leftUploaded;
        }

        return String(left?.releaseName || '').localeCompare(String(right?.releaseName || ''));
    }

    function parseRowQuality(row) {
        const attrs = Array.from(row.querySelectorAll('.torrent-info-link [data-attr]'))
            .map((node) => String(node.dataset.attr || '').trim())
            .filter(Boolean);
        const tagText = Array.from(row.querySelectorAll('.torrent-info-link span'))
            .map((node) => String(node.textContent || '').trim())
            .filter(Boolean)
            .join(' ');
        const releaseName = String(row.dataset.releasename || '').trim();
        const releaseTypeText = String(row.textContent || '').trim();

        const allTokens = `${attrs.join(' ')} ${tagText} ${releaseName}`;
        const allTokensLower = allTokens.toLowerCase();

        let resolution = '';
        const resolutionCandidate = attrs.find((value) => /^(?:\d{3,4}p|ntsc|pal)$/i.test(value)) || '';
        if (resolutionCandidate) {
            resolution = normalizeResolution(resolutionCandidate);
        } else if (/\b4k\b/i.test(tagText) || /\b2160p\b/i.test(allTokens)) {
            resolution = '2160p';
        } else {
            const releaseRes = /(2160p|1080p|1080i|720p|576p|480p|ntsc|pal)\b/i.exec(releaseName)?.[1] || '';
            resolution = normalizeResolution(releaseRes);
        }

        const sourceCandidate = attrs.find((value) => /^(cam|ts|r5|dvd-screener|vhs|web|dvd|tv|hdtv|hd-dvd|blu-ray)$/i.test(value)) || '';
        const source = normalizeSource(sourceCandidate || (/\b(bluray|blu-ray|web[-_. ]?dl|web[-_. ]?rip|web|hdtv|dvd|tv|cam|ts|r5)\b/i.exec(allTokensLower)?.[1] || ''));

        const codecCandidate = attrs.find((value) => /^(xvid|divx|h\.264|x264|h\.265|x265|dvd5|dvd9|bd25|bd50|bd66|bd100)$/i.test(value)) || '';
        const codec = normalizeCodec(codecCandidate || (/\b(x265|h\.?265|x264|h\.?264|xvid|divx|av1|hevc)\b/i.exec(allTokensLower)?.[1] || ''));

        const containerCandidate = attrs.find((value) => /^(avi|mpg|mkv|mp4|vob ifo|iso|m2ts)$/i.test(value)) || '';
        const container = normalizeContainer(containerCandidate || (/\b(mkv|mp4|avi|m2ts|iso|mpg|vob[\s._-]*ifo)\b/i.exec(allTokensLower)?.[1] || ''));

        const hasDv = /dolby\s*vision|\bdv\b/i.test(allTokensLower);
        const hasHdr = /\bhdr(?:10\+?)?\b/i.test(allTokensLower);
        const hdrMode = hasDv && hasHdr ? 'dv+hdr' : (hasDv ? 'dv' : (hasHdr ? 'hdr' : 'none'));

        let releaseType = '';
        if (/golden\s+popcorn/i.test(releaseTypeText)) {
            releaseType = 'golden-popcorn';
        } else if (/non-?scene/i.test(releaseTypeText)) {
            releaseType = 'non-scene';
        } else if (/\bscene\b/i.test(releaseTypeText)) {
            releaseType = 'scene';
        }

        return {
            resolution,
            source,
            codec,
            container,
            hdrMode,
            releaseType
        };
    }

    function scoreRowQuality(rowMeta, filters) {
        const quality = rowMeta.quality || {};
        const resolutionValue = normalizeResolution(quality.resolution);
        const resolutionFilter = filters.resolution;
        const resolutionMatched = resolutionFilter.size === 0
            ? false
            : (
                (resolutionValue && resolutionFilter.has(resolutionValue))
                || (resolutionFilter.has('anysd') && ['ntsc', 'pal', '480p', '576p'].includes(resolutionValue))
                || (resolutionFilter.has('anyhd') && ['720p', '1080i', '1080p'].includes(resolutionValue))
                || (resolutionFilter.has('anyhdplus') && ['1080i', '1080p', '2160p'].includes(resolutionValue))
                || (resolutionFilter.has('anyuhd') && ['2160p'].includes(resolutionValue))
            );

        const dimensions = [
            { key: 'resolution', value: resolutionValue, selected: resolutionFilter, weight: 3, matched: resolutionMatched },
            { key: 'source', value: normalizeSource(quality.source), selected: filters.source, weight: 2 },
            { key: 'codec', value: normalizeCodec(quality.codec), selected: filters.codec, weight: 2 },
            { key: 'container', value: normalizeContainer(quality.container), selected: filters.container, weight: 1 },
            { key: 'releaseType', value: normalizeReleaseType(quality.releaseType), selected: filters.releaseType, weight: 1 }
        ];

        let matchedWeight = 0;
        let totalWeight = 0;
        let matchedDimensionCount = 0;
        let requiredDimensions = 0;

        dimensions.forEach((dimension) => {
            const hasSelection = dimension.selected.size > 0;
            if (!hasSelection) return;
            requiredDimensions += 1;
            totalWeight += dimension.weight;
            const isMatched = typeof dimension.matched === 'boolean'
                ? dimension.matched
                : (dimension.value && dimension.selected.has(dimension.value));
            if (isMatched) {
                matchedWeight += dimension.weight;
                matchedDimensionCount += 1;
            }
        });

        const hdrSelection = sanitizeHdrMode(filters.hdrMode);
        const hasHdrSelection = hdrSelection !== 'any';
        let hdrMatched = true;
        if (hasHdrSelection) {
            requiredDimensions += 1;
            totalWeight += 2;
            hdrMatched = (quality.hdrMode || 'none') === hdrSelection;
            if (hdrMatched) {
                matchedWeight += 2;
                matchedDimensionCount += 1;
            }
        }

        const hasAnySelection = requiredDimensions > 0;
        const score = hasAnySelection ? (matchedWeight / Math.max(1, totalWeight)) : 1;

        return {
            score,
            matchedWeight,
            totalWeight,
            requiredDimensions,
            matchedDimensionCount,
            strictMatch: hasAnySelection ? (matchedWeight === totalWeight) : true,
            anyMatch: hasAnySelection ? (matchedWeight > 0) : true,
            hdrMatched
        };
    }

    function selectRowsByQuality(rowMetas, config) {
        const filters = parseQualityFilters(config);
        const scored = rowMetas.map((meta) => {
            const qualityScore = scoreRowQuality(meta, filters);
            return {
                ...meta,
                qualityScore
            };
        });

        if (scored.length === 0) return [];

        const sortByTieBreaker = (rows) => {
            return [...rows].sort((left, right) => compareRowsByTieBreaker(left, right, filters.tieBreaker));
        };

        const hasAnySelection = scored.some((entry) => entry.qualityScore.requiredDimensions > 0);
        if (!hasAnySelection) return sortByTieBreaker(scored);

        if (filters.mode === 'strict-all') {
            return sortByTieBreaker(scored.filter((entry) => entry.qualityScore.strictMatch));
        }

        if (filters.mode === 'any-selected') {
            return sortByTieBreaker(scored.filter((entry) => entry.qualityScore.anyMatch));
        }

        const maxScore = scored.reduce((best, entry) => Math.max(best, entry.qualityScore.score), 0);
        if (maxScore <= 0) return [];
        return sortByTieBreaker(scored.filter((entry) => entry.qualityScore.score === maxScore));
    }

    function getTorrentRows() {
        return Array.from(document.querySelectorAll('#torrent-table > tbody tr.group_torrent.group_torrent_header'));
    }

    function isPtpRow(row) {
        if (!row || !row.classList) return false;
        return Array.from(row.classList).some((name) => /^ptp_\d+$/i.test(name));
    }

    function rowHasSeedingMarker(row) {
        return Boolean(
            row.querySelector('[data-attr="Seeding"]') ||
            row.querySelector('.torrent-info__user-seeding') ||
            row.querySelector('.torrent-info-link[title*="Seeding"]')
        );
    }

    function parseTorrentIdFromValue(value) {
        const text = String(value || '');
        const torrentIdMatch = /(?:^|[?&])torrentid=(\d+)/i.exec(text);
        if (torrentIdMatch?.[1]) return torrentIdMatch[1];
        const idMatch = /(?:^|[?&])id=(\d+)/i.exec(text);
        if (idMatch?.[1]) return idMatch[1];
        const pathMatch = /(?:^|\/)torrents?\/(\d+)(?:$|[/?#])/i.exec(text);
        if (pathMatch?.[1]) return pathMatch[1];
        const detailsPathMatch = /(?:^|\/)details\/(\d+)(?:$|[/?#])/i.exec(text);
        if (detailsPathMatch?.[1]) return detailsPathMatch[1];
        return '';
    }

    function getRowExternalIds(rowMeta) {
        const ids = new Set();
        [
            rowMeta?.trackerUrl,
            rowMeta?.downloadUrl,
            rowMeta?.permalink,
            rowMeta?.releaseName
        ].forEach((value) => {
            const parsed = parseTorrentIdFromValue(value);
            if (parsed) ids.add(parsed);
        });
        return ids;
    }

    function getRowTorrentId(row) {
        const idFromDom = /group_torrent_header_(\d+)/i.exec(String(row.id || ''))?.[1];
        if (idFromDom) return idFromDom;

        const permalink = row.querySelector('.basic-movie-list__torrent__action a[title="Permalink"]');
        if (permalink?.getAttribute('href')) {
            return parseTorrentIdFromValue(permalink.getAttribute('href'));
        }

        return '';
    }

    function getRowPermalink(row) {
        const actionPermalink = row.querySelector('.basic-movie-list__torrent__action a[title="Permalink"]');
        if (actionPermalink?.getAttribute('href')) {
            return new URL(actionPermalink.getAttribute('href'), location.origin).href;
        }

        const id = getRowTorrentId(row);
        if (!id) return '';
        const groupId = new URLSearchParams(location.search).get('id') || '';
        if (!groupId) return '';
        return `${location.origin}/torrents.php?id=${groupId}&torrentid=${id}`;
    }

    function getTrackerPageUrlFromRow(row) {
        const links = Array.from(row.querySelectorAll('a[href]'));
        const trackerLink = links.find((link) => {
            const href = link.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(href)) return false;
            const host = safeHostFromUrl(href);
            if (!host) return false;
            return host !== 'passthepopcorn.me';
        });
        return trackerLink ? trackerLink.getAttribute('href') : '';
    }

    function getRowDownloadUrl(row) {
        const actionDownload = row.querySelector('.basic-movie-list__torrent__action a[title="Download"]');
        if (actionDownload?.getAttribute('href')) {
            return new URL(actionDownload.getAttribute('href'), location.origin).href;
        }

        const actionLinks = Array.from(row.querySelectorAll('.basic-movie-list__torrent__action a[href]'));
        const fallbackDownload = actionLinks.find((link) => {
            const title = String(link.getAttribute('title') || '').trim().toLowerCase();
            const text = String(link.textContent || '').trim().toLowerCase();
            const href = String(link.getAttribute('href') || '').trim();
            if (title === 'download' || text === 'dl') return true;
            return /\/download\//i.test(href);
        });

        if (fallbackDownload?.getAttribute('href')) {
            return new URL(fallbackDownload.getAttribute('href'), location.origin).href;
        }

        return '';
    }

    function getRowSizeBytes(row) {
        const rawSize = String(row?.querySelector('.nobr span[title]')?.getAttribute('title') || '').trim();
        if (!rawSize) return null;

        const bytesDigits = rawSize.replaceAll(/\D/g, '');
        if (!bytesDigits) return null;

        const bytes = Number.parseInt(bytesDigits, 10);
        return Number.isFinite(bytes) ? bytes : null;
    }

    function getRowSeeders(row) {
        const sizeSpan = row?.querySelector('.nobr span[title]');
        let sizeCell = null;
        if (sizeSpan) {
            sizeCell = sizeSpan.closest('td');
        }
        if (!sizeCell) {
            sizeCell = row?.querySelector('td.nobr') || row?.querySelector('.nobr');
        }
        if (!sizeCell) return null;

        const rowCells = Array.from(row?.querySelectorAll('td') || []);
        const sizeIndex = rowCells.indexOf(sizeCell);

        const parseCellInt = (cell) => {
            const text = String(cell?.textContent || '').trim();
            if (!text) return null;
            const digits = text.replaceAll(/\D/g, '');
            if (!digits) return null;
            const n = Number.parseInt(digits, 10);
            return Number.isFinite(n) ? n : null;
        };

        let seederCell = null;

        if (sizeIndex >= 0) {
            const candidateAfterSnatches = rowCells[sizeIndex + 2] || null;
            const candidateImmediate = rowCells[sizeIndex + 1] || null;
            const candidateAfterLeechers = rowCells[sizeIndex + 3] || null;

            if (candidateAfterSnatches) {
                seederCell = candidateAfterSnatches;
            } else if (candidateImmediate) {
                seederCell = candidateImmediate;
            } else if (candidateAfterLeechers) {
                seederCell = candidateAfterLeechers;
            }
        }

        if (!seederCell) {
            seederCell = sizeCell.nextElementSibling?.nextElementSibling || sizeCell.nextElementSibling;
        }

        if (!seederCell) return null;

        const parsed = parseCellInt(seederCell);
        if (Number.isInteger(parsed)) {
            return parsed;
        }

        if (sizeIndex >= 0) {
            const fallbackCandidates = [rowCells[sizeIndex + 1], rowCells[sizeIndex + 3]];
            for (const candidate of fallbackCandidates) {
                const n = parseCellInt(candidate);
                if (Number.isInteger(n)) {
                    return n;
                }
            }
        }

        return null;
    }

    function getRowUploadedAt(row) {
        const timeNode = row?.querySelector('.time-cell .release.time[title], .release.time[title], span.release.time[title]');
        const rawValue = String(timeNode?.getAttribute('title') || '').trim();
        if (!rawValue) return null;
        const parsed = parseInteger(rawValue);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    function getRowMeta(row) {
        const trackerUrl = getTrackerPageUrlFromRow(row);
        const permalink = getRowPermalink(row);
        const downloadUrl = getRowDownloadUrl(row);
        const torrentId = getRowTorrentId(row);
        const rowFileMeta = collectRowFileMeta(row, torrentId);
        return {
            row,
            rowId: String(row.id || ''),
            torrentId,
            permalink,
            releaseName: String(row.dataset.releasename || '').trim(),
            releaseGroup: String(row.dataset.releasegroup || '').trim(),
            sizeBytes: getRowSizeBytes(row),
            seeders: getRowSeeders(row),
            uploadedAt: getRowUploadedAt(row),
            downloadUrl,
            trackerUrl,
            trackerHost: safeHostFromUrl(trackerUrl) || safeHostFromUrl(downloadUrl) || safeHostFromUrl(permalink),
            quality: parseRowQuality(row),
            rowFileNames: rowFileMeta.rowFileNames,
            rowFileCount: rowFileMeta.rowFileCount,
            rowContentType: rowFileMeta.rowContentType,
            rowFileMetaSource: rowFileMeta.rowFileMetaSource
        };
    }

    function collectSeededPtpRows(allRows) {
        return allRows
            .filter((row) => isPtpRow(row) && rowHasSeedingMarker(row))
            .map((row) => getRowMeta(row))
            .filter((entry) => Number.isInteger(entry.sizeBytes));
    }

    // Run a quality-only check for an already-computed seeded entry index
    // using the same fallback quality path used when no seeded PTP row exists.
    async function runQualityUpgradeForComputedIndex(index) {
        const entry = Array.isArray(lastComputedResults) && lastComputedResults[index];
        if (!entry) {
            setStatus('Entry not found for quality check.', true);
            return;
        }

        createPanel();
        const panel = document.getElementById(PANEL_ID);
        const config = panel ? gatherPanelConfig(panel, getConfig()) : getConfig();

        const seededMeta = entry.seeded;
        setStatus(`Running quality-only fallback check for ${seededMeta.releaseName}...`);

        try {
            const allRows = getTorrentRows();
            if (allRows.length === 0) {
                setStatus('No torrent rows found', true);
                renderWaitingMessage('No torrent rows were found on this page.');
                return;
            }

            const myToken = ++refreshToken;
            const fallbackResult = await computeNoSeedFallback(allRows, config, myToken);
            if (myToken !== refreshToken) {
                return;
            }

            discoveredSavePaths = collectDiscoveredSavePaths(fallbackResult.quiItemsByReleaseName);
            const panelEl = document.getElementById(PANEL_ID);
            if (panelEl) renderDiscoveredSavePathOptions(panelEl, config);

            renderResults(fallbackResult.results);
            const totalTargets = fallbackResult.results.reduce((sum, item) => sum + item.targets.length, 0);
            setStatus(`Quality-only check complete (${fallbackResult.mode}). Candidate sets: ${fallbackResult.results.length}, targets: ${totalTargets}`);
        } catch (err) {
            setStatus(`Quality-only check failed: ${err?.message || err}`, true);
            console.debug('[PTP Seeded qui Targets] runQualityUpgradeForComputedIndex error', err);
        }
    }

    function findCompatibleRowsForSeeded(allRows, seeded) {
        const seededSizeBytes = Number.isInteger(seeded?.sizeBytes) ? seeded.sizeBytes : getRowSizeBytes(seeded?.row);
        if (!Number.isInteger(seededSizeBytes)) {
            return [];
        }

        const matched = [];
        const seen = new Set();
        const getRowKey = (row) => row?.id || `${row?.rowIndex}-${row?.sectionRowIndex}`;
        const include = (row) => {
            if (!row || row === seeded.row) return;
            if (isPtpRow(row)) return;
            const key = getRowKey(row);
            if (seen.has(key)) return;
            seen.add(key);
            matched.push(getRowMeta(row));
        };

        allRows.forEach((row) => {
            if (isPtpRow(row)) return;
            const rowSizeBytes = getRowSizeBytes(row);
            if (!Number.isInteger(rowSizeBytes)) return;
            if (rowSizeBytes === seededSizeBytes) {
                include(row);
            }
        });

        return matched;
    }

    function normalizeQuiItem(item) {
        const name = String(item?.name || '').trim();
        const comment = String(item?.comment || '').trim();
        const tracker = String(item?.tracker || item?.site || '').trim();
        const trackerHost = safeHostFromUrl(tracker) || normalizeHost(tracker);
        const magnetUri = String(item?.magnet_uri || '');
        const savePath = String(item?.save_path || item?.savepath || '').trim();
        const urls = [
            ...extractUrls(comment),
            ...extractUrls(tracker),
            ...extractUrls(String(item?.content_path || '')),
            ...extractUrls(String(item?.save_path || '')),
            ...extractUrls(magnetUri),
            ...extractMagnetParamUrls(magnetUri)
        ];

        const hosts = new Set();
        if (trackerHost) hosts.add(trackerHost);
        urls.forEach((url) => {
            const host = safeHostFromUrl(url);
            if (host) hosts.add(host);
        });

        const externalIds = new Set();
        urls.forEach((url) => {
            const parsed = parseTorrentIdFromValue(url);
            if (parsed) externalIds.add(parsed);
        });

        const expectedTypeFromName = inferTypeFromName(name);
        const quiFileMeta = extractQuiFileMeta(item);

        return {
            raw: item,
            name,
            normalizedName: normalizeText(name),
            comment,
            savePath,
            hosts: Array.from(hosts),
            externalIds: Array.from(externalIds),
            expectedTypeFromName,
            expectedFileCount: quiFileMeta.expectedFileCount,
            reportedContentType: quiFileMeta.reportedContentType
        };
    }

    function collectDiscoveredSavePaths(quiItemsByReleaseName) {
        const ordered = [];
        const seen = new Set();

        Array.from(quiItemsByReleaseName.values()).forEach((items) => {
            items.forEach((item) => {
                const path = String(item?.savePath || '').trim();
                if (!path) return;
                const key = path.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                ordered.push(path);
            });
        });

        return ordered;
    }

    function isRowPresentInQui(rowMeta, quiMatches) {
        return Boolean(findRowMatchInQui(rowMeta, quiMatches));
    }

    function findRowMatchInQui(rowMeta, quiMatches) {
        const rowTrackerHost = normalizeHost(rowMeta.trackerHost);
        if (!rowTrackerHost) return null;

        const hostMatches = (quiMatches || []).filter((item) => {
            return Array.isArray(item?.hosts) && item.hosts.some((host) => hostsFuzzyMatch(host, rowTrackerHost));
        });

        if (hostMatches.length === 0) {
            return null;
        }

        const releaseName = String(rowMeta?.releaseName || '').trim();
        const rowExternalIds = getRowExternalIds(rowMeta);

        return hostMatches.find((item) => releaseName && namesLikelyMatch(item.name, releaseName))
            || hostMatches.find((item) => rowExternalIds.size > 0 && Array.isArray(item.externalIds) && item.externalIds.some((id) => rowExternalIds.has(id)))
            || hostMatches[0]
            || null;
    }

    function findRowHostMatchInQui(rowMeta, quiMatches) {
        const rowTrackerHost = normalizeHost(rowMeta?.trackerHost);
        if (!rowTrackerHost) return null;

        return (quiMatches || []).find((item) => {
            return Array.isArray(item?.hosts) && item.hosts.some((host) => hostsFuzzyMatch(host, rowTrackerHost));
        }) || null;
    }

    function isRowPresentInQuiForFallback(rowMeta, quiMatches) {
        return Boolean(findRowMatchInQui(rowMeta, quiMatches) || findRowHostMatchInQui(rowMeta, quiMatches));
    }

    function findBaseQuiMatch(qualityMatchedRows, quiMatches) {
        const matches = (qualityMatchedRows || []).map((rowMeta) => {
            const quiItem = findRowMatchInQui(rowMeta, quiMatches) || findRowHostMatchInQui(rowMeta, quiMatches);
            if (!quiItem) return null;
            return { rowMeta, quiItem };
        }).filter(Boolean);

        if (matches.length === 0) {
            return null;
        }

        const nonPtpMatch = matches.find((entry) => !hostsFuzzyMatch(entry.rowMeta?.trackerHost, PTP_PRIMARY_HOST));
        return nonPtpMatch || matches[0];
    }

    function toPercent(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return null;
        if (numeric <= 1) return Math.max(0, Math.min(100, numeric * 100));
        return Math.max(0, Math.min(100, numeric));
    }

    function normalizeTorrentState(value) {
        return String(value || '').trim().toLowerCase();
    }

    function isPendingTorrentState(value) {
        const normalized = normalizeTorrentState(value);
        if (!normalized) return false;
        return POLL_PENDING_STATES.has(normalized);
    }

    function isJobPending(job) {
        if (!job || job.error) return false;
        if (isPendingTorrentState(job.state)) return true;
        const progress = Number(job.progress);
        if (!Number.isFinite(progress)) return true;
        return progress < 100;
    }

    function formatPercent(value) {
        const percent = toPercent(value);
        if (percent === null) return '—';
        return `${percent.toFixed(1)}%`;
    }

    function renderFeedbackPanel() {
        const container = document.getElementById(FEEDBACK_ID);
        if (!container) return;

        const jobs = Array.from(addJobs.values());
        if (jobs.length === 0) {
            container.innerHTML = '';
            return;
        }

        const rows = jobs.map((job) => {
            const status = escapeHtml(job.error ? `${job.status}: ${job.error}` : (job.status || 'Queued'));
            return `
                <tr>
                    <td>${escapeHtml(job.releaseName || '')}</td>
                    <td>${escapeHtml(job.trackerHost || '')}</td>
                    <td>${status}</td>
                    <td>${escapeHtml(formatPercent(job.progress))}</td>
                    <td>${escapeHtml(job.state || '—')}</td>
                    <td>${escapeHtml(job.hash || '—')}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="box pad" style="margin-top:8px;">
                <div><strong>Added Torrent Feedback</strong></div>
                <table style="margin-top:8px; width:100%; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left; padding:4px;">Release</th>
                            <th style="text-align:left; padding:4px;">Tracker</th>
                            <th style="text-align:left; padding:4px;">Status</th>
                            <th style="text-align:left; padding:4px;">Progress</th>
                            <th style="text-align:left; padding:4px;">State</th>
                            <th style="text-align:left; padding:4px;">Hash</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function getQuiItemIdentityKey(item) {
        const raw = item?.raw || {};
        const hash = String(raw.hash || raw.infohash_v1 || raw.infohash || '').trim().toLowerCase();
        if (hash) return `hash:${hash}`;

        const externalIds = Array.isArray(item?.externalIds) ? item.externalIds : [];
        const ext = externalIds.map((value) => String(value || '').trim()).find(Boolean) || '';
        if (ext) return `id:${ext}`;

        const host = Array.isArray(item?.hosts)
            ? item.hosts.map((value) => normalizeHost(value)).find(Boolean) || ''
            : '';
        const name = normalizeReleaseNameKey(item?.name || '');
        if (host || name) {
            return `hn:${host}|${name}`;
        }

        return '';
    }

    function findBestJobMatch(items, job, usedIdentityKeys = null) {
        if (!Array.isArray(items) || items.length === 0) return null;

        const jobReleaseName = String(job?.releaseName || '').trim();
        const jobTrackerHost = normalizeHost(job?.trackerHost);
        const jobExternalIds = new Set([
            parseTorrentIdFromValue(job?.downloadUrl),
            parseTorrentIdFromValue(job?.trackerUrl),
            parseTorrentIdFromValue(jobReleaseName)
        ].filter(Boolean));

        const submittedAtSec = Number(job.submittedAtSec) || 0;

        const scored = items.map((item) => {
            const hostMatched = jobTrackerHost
                ? item.hosts.some((host) => hostsFuzzyMatch(host, jobTrackerHost))
                : false;
            const nameMatched = jobReleaseName
                ? namesLikelyMatch(item.name, jobReleaseName)
                : false;
            const idMatched = jobExternalIds.size > 0
                && Array.isArray(item.externalIds)
                && item.externalIds.some((id) => jobExternalIds.has(id));
            const addedOn = Number(item.raw?.added_on) || 0;
            const afterSubmit = submittedAtSec > 0 && addedOn >= (submittedAtSec - 5);

            const score =
                (idMatched ? 8 : 0)
                + (hostMatched ? 4 : 0)
                + (nameMatched ? 3 : 0)
                + (afterSubmit ? 2 : 0);

            return {
                item,
                idMatched,
                hostMatched,
                nameMatched,
                afterSubmit,
                addedOn,
                score
            };
        });

        const candidates = scored.filter((entry) => entry.idMatched || entry.hostMatched || entry.nameMatched);
        if (candidates.length === 0) return null;

        const usedKeys = usedIdentityKeys instanceof Set ? usedIdentityKeys : null;

        candidates.sort((left, right) => {
            if (left.score !== right.score) return right.score - left.score;
            if (left.afterSubmit !== right.afterSubmit) return Number(right.afterSubmit) - Number(left.afterSubmit);
            return right.addedOn - left.addedOn;
        });

        if (usedKeys) {
            const unusedCandidate = candidates.find((entry) => {
                const identityKey = getQuiItemIdentityKey(entry.item);
                return identityKey ? !usedKeys.has(identityKey) : true;
            });
            if (unusedCandidate) {
                const identityKey = getQuiItemIdentityKey(unusedCandidate.item);
                if (identityKey) usedKeys.add(identityKey);
                return unusedCandidate.item;
            }
        }

        const selected = candidates[0]?.item || null;
        if (selected && usedKeys) {
            const identityKey = getQuiItemIdentityKey(selected);
            if (identityKey) usedKeys.add(identityKey);
        }
        return selected;
    }

    function hasPendingHashResolution(jobs) {
        const activeJobs = Array.isArray(jobs)
            ? jobs.filter((job) => job && !job.error)
            : [];
        if (activeJobs.length <= 1) return false;

        const groups = new Map();
        activeJobs.forEach((job) => {
            const releaseName = String(job.releaseName || '').trim().toLowerCase();
            const key = releaseName || '__all__';
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(job);
        });

        for (const groupJobs of groups.values()) {
            if (!Array.isArray(groupJobs) || groupJobs.length <= 1) continue;

            const completed = groupJobs.filter((job) => !isJobPending(job));
            if (completed.length <= 1) continue;

            if (completed.some((job) => !String(job.hash || '').trim())) {
                return true;
            }

            const uniqueHashes = new Set(
                completed
                    .map((job) => String(job.hash || '').trim().toLowerCase())
                    .filter(Boolean)
            );

            if (uniqueHashes.size < completed.length) {
                return true;
            }
        }

        return false;
    }

    async function pollAddedJobs() {
        if (addPollInFlight || addJobs.size === 0) return;

        const config = getConfig();
        const maxMillis = sanitizePollMaxMinutes(config.pollMaxMinutes) * 60 * 1000;
        if (addPollStartedAt > 0 && (Date.now() - addPollStartedAt) >= maxMillis) {
            addJobs.forEach((job, key) => {
                const progress = Number(job.progress);
                const isDone = job.error || (Number.isFinite(progress) && progress >= 100);
                if (!isDone) {
                    job.status = 'Polling timeout reached';
                    job.updatedAt = Date.now();
                    addJobs.set(key, job);
                }
            });
            renderFeedbackPanel();
            stopAddPolling(`max runtime reached (${sanitizePollMaxMinutes(config.pollMaxMinutes)} minute(s))`);
            return;
        }

        addPollInFlight = true;

        try {
            const groups = new Map();
            const queriedItemsPool = [];
            const queriedItemsPoolIdentity = new Set();

            const addItemsToQueriedPool = (items) => {
                (items || []).forEach((item) => {
                    const identityKey = getQuiItemIdentityKey(item)
                        || `pool:${normalizeReleaseNameKey(item?.name || '')}|${normalizeSavePath(item?.savePath || '')}|${Number(item?.raw?.added_on) || 0}`;
                    if (!identityKey || queriedItemsPoolIdentity.has(identityKey)) {
                        return;
                    }
                    queriedItemsPoolIdentity.add(identityKey);
                    queriedItemsPool.push(item);
                });
            };

            Array.from(addJobs.entries()).forEach(([key, job]) => {
                if (job.error) return;
                const releaseName = String(job.releaseName || '').trim();
                if (!releaseName) return;
                if (!groups.has(releaseName)) {
                    groups.set(releaseName, []);
                }
                groups.get(releaseName).push({ key, job });
            });

            for (const [releaseName, jobEntries] of groups.entries()) {
                const quiRaw = await queryQui(config, releaseName);
                const quiItems = quiRaw.map(normalizeQuiItem);
                addItemsToQueriedPool(quiItems);
                const usedIdentityKeys = new Set();

                for (const { key, job } of jobEntries) {
                    let matched = findBestJobMatch(quiItems, job, usedIdentityKeys);
                    if (!matched && queriedItemsPool.length > 0) {
                        matched = findBestJobMatch(queriedItemsPool, job, usedIdentityKeys);
                    }

                    if (!matched) {
                        job.status = 'Submitted. Waiting for tracker match...';
                        job.updatedAt = Date.now();
                        addJobs.set(key, job);
                        continue;
                    }

                    const raw = matched.raw || {};
                    job.progress = toPercent(raw.progress);
                    job.state = String(raw.state || '').trim();
                    job.hash = String(raw.hash || raw.infohash_v1 || '').trim();
                    job.ratio = Number(raw.ratio);
                    const isComplete = !isJobPending(job);
                    const hasHash = Boolean(String(job.hash || '').trim());
                    job.status = isComplete
                        ? (hasHash ? 'Complete' : 'Complete (hash pending)')
                        : 'Added';
                    job.updatedAt = Date.now();
                    addJobs.set(key, job);
                }
            }
        } catch (error) {
            console.debug(`[PTP Seeded qui Targets] Polling error: ${error?.message || error}`);
        } finally {
            addPollInFlight = false;
            renderFeedbackPanel();
            if (!hasUnresolvedAddJobs()) {
                stopAddPolling('all added torrents reached 100% and hash identities were resolved');
            }
        }
    }

    function startAddPolling() {
        if (addPollTimer) return;
        addPollStartedAt = Date.now();
        addPollTimer = setInterval(() => {
            pollAddedJobs();
        }, 5000);
    }

    function stopAddPolling(reason = '') {
        if (addPollTimer) {
            clearInterval(addPollTimer);
            addPollTimer = null;
        }
        addPollStartedAt = 0;
        if (reason) {
            console.debug(`[PTP Seeded qui Targets] Polling stopped: ${reason}`);
        }
    }

    function hasUnresolvedAddJobs() {
        const jobs = Array.from(addJobs.values());
        if (jobs.some((job) => isJobPending(job))) {
            return true;
        }
        return hasPendingHashResolution(jobs);
    }

    function pickStageMainCandidate(candidates, selectedSourceRaw = '') {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return '';
        }

        const selectedSource = sanitizeMainSeedSource(selectedSourceRaw);
        if (selectedSource) {
            const sourceMatch = candidates.find((entry) => hostsFuzzyMatch(entry.target?.trackerHost, selectedSource));
            if (sourceMatch) {
                return sourceMatch.key;
            }
        }

        return candidates[0].key;
    }

    async function fetchQuiItemsByReleaseNames(config, releaseNames, token) {
        const map = new Map();
        for (const releaseName of releaseNames) {
            const normalized = String(releaseName || '').trim();
            if (!normalized || map.has(normalized)) {
                continue;
            }

            const quiRaw = await queryQui(config, normalized);
            if (token !== refreshToken) {
                return map;
            }
            map.set(normalized, quiRaw.map(normalizeQuiItem));
        }
        return map;
    }

    function collectCandidateReleaseNamesForSeeded(allRows, seededRowMeta, includeSeededRowInCandidates = false) {
        const names = new Set();
        const seen = new Set();
        const addCandidate = (rowMeta) => {
            const torrentId = String(rowMeta?.torrentId || '').trim();
            const rowId = String(rowMeta?.rowId || '').trim();
            const trackerHost = normalizeHost(rowMeta?.trackerHost || '');
            const releaseName = String(rowMeta?.releaseName || '').trim();
            const key = torrentId || `${rowId}::${trackerHost}::${normalizeText(releaseName)}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (releaseName) {
                names.add(releaseName);
            }
        };

        if (includeSeededRowInCandidates) {
            addCandidate(seededRowMeta);
        }

        const compatibleRows = findCompatibleRowsForSeeded(allRows, seededRowMeta);
        compatibleRows.forEach(addCandidate);
        return Array.from(names);
    }

    function mergeQuiItemsForSeededRelease(baseItems, candidateItemsByName, candidateNames) {
        const merged = [];
        const seen = new Set();
        const appendUnique = (item) => {
            if (!item) return;
            const raw = item.raw || {};
            const key = String(raw.hash || raw.infohash_v1 || raw.infohash || '').trim().toLowerCase()
                || `${normalizeText(item.name || '')}::${normalizeSavePath(item.savePath || '')}::${Number(raw.added_on) || 0}`;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(item);
        };

        (baseItems || []).forEach(appendUnique);
        (candidateNames || []).forEach((name) => {
            (candidateItemsByName.get(name) || []).forEach(appendUnique);
        });

        return merged;
    }

    async function buildQuiItemsBySeededReleaseName(allRows, seededRows, config, token, includeSeededRowInCandidates = false) {
        const seededReleaseNames = (seededRows || []).map((seeded) => String(seeded?.releaseName || '').trim()).filter(Boolean);
        const baseItemsByReleaseName = await fetchQuiItemsByReleaseNames(config, seededReleaseNames, token);
        if (token !== refreshToken) {
            return baseItemsByReleaseName;
        }

        const candidateNamesBySeeded = new Map();
        const candidateReleaseNamesToQuery = new Set();

        (seededRows || []).forEach((seeded) => {
            const seededReleaseName = String(seeded?.releaseName || '').trim();
            if (!seededReleaseName) return;

            const candidateNames = collectCandidateReleaseNamesForSeeded(allRows, seeded, includeSeededRowInCandidates);
            candidateNamesBySeeded.set(seededReleaseName, candidateNames);
            candidateNames.forEach((name) => {
                if (!baseItemsByReleaseName.has(name)) {
                    candidateReleaseNamesToQuery.add(name);
                }
            });
        });

        if (candidateReleaseNamesToQuery.size === 0) {
            return baseItemsByReleaseName;
        }

        const candidateItemsByName = await fetchQuiItemsByReleaseNames(config, Array.from(candidateReleaseNamesToQuery), token);
        if (token !== refreshToken) {
            return baseItemsByReleaseName;
        }

        const mergedBySeededReleaseName = new Map();
        (seededRows || []).forEach((seeded) => {
            const seededReleaseName = String(seeded?.releaseName || '').trim();
            if (!seededReleaseName) return;
            const baseItems = baseItemsByReleaseName.get(seededReleaseName) || [];
            const candidateNames = candidateNamesBySeeded.get(seededReleaseName) || [];
            const mergedItems = mergeQuiItemsForSeededRelease(baseItems, candidateItemsByName, candidateNames);
            mergedBySeededReleaseName.set(seededReleaseName, mergedItems);
        });

        return mergedBySeededReleaseName;
    }

    function buildComputedForSeededRows(allRows, seededRows, quiItemsByReleaseName, config, includeSeededRowInCandidates = false, fallbackMode = '') {
        const getRowMetaKey = (rowMeta) => {
            const torrentId = String(rowMeta?.torrentId || '').trim();
            if (torrentId) return `tid:${torrentId}`;
            const rowId = String(rowMeta?.rowId || '').trim();
            const trackerHost = normalizeHost(rowMeta?.trackerHost || '');
            const releaseName = normalizeText(rowMeta?.releaseName || '');
            return `row:${rowId}|host:${trackerHost}|name:${releaseName}`;
        };

        const mergeUniqueRowMetas = (...lists) => {
            const merged = [];
            const seen = new Set();
            lists.forEach((list) => {
                (list || []).forEach((item) => {
                    const key = getRowMetaKey(item);
                    if (seen.has(key)) return;
                    seen.add(key);
                    merged.push(item);
                });
            });
            return merged;
        };

        return seededRows.map((seeded) => {
            const compatibleRows = findCompatibleRowsForSeeded(allRows, seeded);
            const releaseName = String(seeded.releaseName || '').trim();
            const quiItems = quiItemsByReleaseName.get(releaseName) || [];

            let qualityMatched = mergeUniqueRowMetas(compatibleRows);

            if (includeSeededRowInCandidates) {
                qualityMatched = mergeUniqueRowMetas([seeded], qualityMatched);
            }

            const rowPresentCheck = includeSeededRowInCandidates ? isRowPresentInQuiForFallback : isRowPresentInQui;
            const targets = qualityMatched.filter((rowMeta) => !rowPresentCheck(rowMeta, quiItems));
            const baseQuiMatch = findBaseQuiMatch(qualityMatched, quiItems);
            const baseSavePath = String(baseQuiMatch?.quiItem?.savePath || '').trim();

            return {
                seeded,
                compatibleRows: qualityMatched,
                quiMatches: quiItems,
                targets,
                baseQuiMatch,
                baseSavePath,
                fallbackMode
            };
        }).filter((entry) => entry.compatibleRows.length > 0);
    }

    async function computeNoSeedFallback(allRows, config, token, forcedPtpMeta = null) {
        const ptpCandidates = allRows
            .filter((row) => isPtpRow(row))
            .map((row) => getRowMeta(row))
            .filter((entry) => entry.releaseName);

        const forcedKey = String(config?.selectedPtpTorrentId || '').trim();
        const forcedFromCandidates = forcedKey
            ? ptpCandidates.find((entry) => String(entry?.torrentId || entry?.rowId || '').trim() === forcedKey) || null
            : null;
        const qualityMatchedPtp = forcedPtpMeta
            ? [forcedPtpMeta]
            : (forcedFromCandidates ? [forcedFromCandidates] : selectRowsByQuality(ptpCandidates, config));
        if (qualityMatchedPtp.length === 0) {
            return {
                results: [],
                quiItemsByReleaseName: new Map(),
                mode: 'none'
            };
        }

        const quiItemsByReleaseName = await buildQuiItemsBySeededReleaseName(allRows, qualityMatchedPtp, config, token, true);
        if (token !== refreshToken) {
            return {
                results: [],
                quiItemsByReleaseName,
                mode: 'stale'
            };
        }

        const seededLikeRows = [];
        qualityMatchedPtp.forEach((seeded) => {
            const releaseName = String(seeded.releaseName || '').trim();
            const quiItems = quiItemsByReleaseName.get(releaseName) || [];
            const candidateRows = [seeded, ...findCompatibleRowsForSeeded(allRows, seeded)];
            const hasQuiPresence = candidateRows.some((rowMeta) => isRowPresentInQuiForFallback(rowMeta, quiItems));
            if (hasQuiPresence) {
                seededLikeRows.push(seeded);
            }
        });

        if (seededLikeRows.length > 0) {
            const computed = buildComputedForSeededRows(allRows, seededLikeRows, quiItemsByReleaseName, config, true, 'qui-seeded-fallback');
            return {
                results: computed,
                quiItemsByReleaseName,
                mode: 'qui-seeded'
            };
        }

        const stagedSeeded = qualityMatchedPtp.slice(0, 1);
        const stagedComputed = buildComputedForSeededRows(allRows, stagedSeeded, quiItemsByReleaseName, config, true, 'staged-fallback');
        return {
            results: stagedComputed,
            quiItemsByReleaseName,
            mode: 'staged'
        };
    }

    function renderResults(results) {
        const container = document.getElementById(RESULTS_ID);
        if (!container) return;

        const panel = document.getElementById(PANEL_ID);
        const config = panel ? gatherPanelConfig(panel, getConfig()) : getConfig();

        lastComputedResults = Array.isArray(results) ? results : [];

        targetByKey.clear();
        stageMainTargetKeyBySection.clear();
        stageCandidateTargetKeysBySection.clear();

        if (!results || results.length === 0) {
            container.innerHTML = '<div class="box pad" style="margin-top:8px;">No qualifying seeded or fallback quality matches were found.</div>';
            applyPanelCollapsedState(Boolean(config.collapsed), false);
            renderFeedbackPanel();
            return;
        }
        const activeSectionKeys = new Set();

        const sections = results.map((entry, index) => {
            const sectionIdentity = String(entry.seeded.torrentId || entry.seeded.rowId || `section-${index + 1}`).trim();
            const sectionKey = `${sectionIdentity}::${index + 1}`;
            activeSectionKeys.add(sectionKey);

            const seededHost = entry.seeded.trackerHost || '(PTP source row)';
            const compatibleCount = entry.compatibleRows.length;
            const quiCount = entry.quiMatches.length;
            const rowPresentCheck = entry.fallbackMode === 'seeded' ? isRowPresentInQui : isRowPresentInQuiForFallback;
            const filteredTargets = (entry.targets || []).filter((target) => !rowPresentCheck(target, entry.quiMatches || []));
            const targetCount = filteredTargets.length;
            const fallbackLabel = entry.fallbackMode === 'staged-fallback'
                ? 'No-seeded fallback (staged add mode)'
                : (entry.fallbackMode === 'qui-seeded-fallback' ? 'No-seeded fallback (qui release already seeded)' : 'Seeded mode');
            const baseMatch = entry.baseQuiMatch || null;
            const baseHost = baseMatch?.rowMeta?.trackerHost || '(unknown tracker)';
            const baseName = baseMatch?.quiItem?.name || baseMatch?.rowMeta?.releaseName || '';
            const baseSavePath = String(entry.baseSavePath || '').trim();
            const quiMatchRows = (entry.quiMatches || []).map((item) => {
                const itemName = String(item?.name || '').trim() || '(unnamed torrent)';
                const itemHost = Array.isArray(item?.hosts) && item.hosts.length > 0 ? item.hosts[0] : '(unknown tracker)';
                const itemSavePath = String(item?.savePath || '').trim() || '(no save path)';
                const mismatchNotes = buildQuiMismatchNotes(item, entry.seeded);
                return `<li>${escapeHtml(itemName)} — ${escapeHtml(itemHost)} | savePath: ${escapeHtml(itemSavePath)}${renderMismatchNotesInline(mismatchNotes)}</li>`;
            }).join('');
            const quiMatchesBlock = (entry.quiMatches || []).length > 0
                ? `<div style="margin-top:6px;"><strong>Matching qui targets:</strong> ${entry.quiMatches.length}</div><ul style="margin:6px 0 0 18px;">${quiMatchRows}</ul>`
                : '';

            const discoveredPathsForSection = collectSectionDiscoveredSavePaths(entry.quiMatches);
            discoveredSavePathsBySection.set(sectionKey, discoveredPathsForSection);

            const sectionState = getSectionControlState(sectionKey);
            const defaultSavePath = normalizeSavePath(config.savePath);
            const hasDefaultMatch = defaultSavePath
                ? discoveredPathsForSection.some((path) => normalizeSavePath(path) === defaultSavePath)
                : false;
            const showSavePathSelector = discoveredPathsForSection.length > 0
                && (discoveredPathsForSection.length > 1 || (defaultSavePath && !hasDefaultMatch));

            if (showSavePathSelector) {
                const preferredSavePath = String(sectionState.selectedSavePath || entry.baseSavePath || config.savePath || '').trim();
                sectionState.selectedSavePath = discoveredPathsForSection.includes(preferredSavePath)
                    ? preferredSavePath
                    : discoveredPathsForSection[0];
            }

            const savePathOptionsHtml = discoveredPathsForSection
                .map((path) => `<option value="${escapeHtml(path)}" ${path === sectionState.selectedSavePath ? 'selected' : ''}>${escapeHtml(path)}</option>`)
                .join('');

            const discoveredSavePathBlock = showSavePathSelector
                ? `<div style="margin-top:6px;"><label>Discovered qui save paths: <select class="ptp-sqt-savepath-choice" data-sqt-section-key="${escapeHtml(sectionKey)}" style="min-width:320px; margin-left:6px;">${savePathOptionsHtml}</select></label></div>`
                : '';

            const sectionSourceSet = new Set();
            if (entry.fallbackMode === 'staged-fallback') {
                entry.compatibleRows.forEach((rowMeta) => {
                    if (rowMeta?.trackerHost) {
                        sectionSourceSet.add(rowMeta.trackerHost);
                    }
                });
            } else if (entry.fallbackMode === 'qui-seeded-fallback' && baseHost && baseHost !== '(unknown tracker)') {
                sectionSourceSet.add(baseHost);
                if (!sectionState.mainSeedSource) {
                    sectionState.mainSeedSource = sanitizeMainSeedSource(baseHost);
                }
            }

            (entry.quiMatches || []).forEach((item) => {
                (item?.hosts || []).forEach((host) => {
                    const normalizedHost = normalizeHost(host);
                    if (normalizedHost) {
                        sectionSourceSet.add(normalizedHost);
                    }
                });
            });

            const showMainSeedSourceSelector = entry.fallbackMode === 'staged-fallback';
            let mainSeedSourceBlock = '';

            if (showMainSeedSourceSelector) {
                const canonicalSources = new Set();
                Array.from(sectionSourceSet).forEach((host) => {
                    const normalized = normalizeHost(host);
                    if (!normalized) return;
                    const canonical = getDomainTail(normalized) || normalized;
                    if (canonical) {
                        canonicalSources.add(canonical);
                    }
                });

                const uniqueSources = Array.from(canonicalSources).sort((a, b) => a.localeCompare(b));
                const configuredSource = sanitizeMainSeedSource(sectionState.mainSeedSource);
                const selectedSource = configuredSource
                    ? (uniqueSources.find((source) => hostsFuzzyMatch(source, configuredSource)) || '')
                    : '';
                sectionState.mainSeedSource = selectedSource;

                const mainSourceOptions = buildSelectOptionsHtml(['', ...uniqueSources], selectedSource, { '': 'Auto (first match)' });
                mainSeedSourceBlock = `<div style="margin-top:6px;"><label>Main seed source: <select class="ptp-sqt-main-seed-source" data-sqt-section-key="${escapeHtml(sectionKey)}">${mainSourceOptions}</select></label></div>`;
            } else {
                sectionState.mainSeedSource = '';
            }

            sectionControlState.set(sectionKey, sectionState);
            const stagedCandidatesForSection = [];

            const targetRows = filteredTargets.length === 0
                ? '<li>None</li>'
                : (() => {
                    const targetDiagnostics = filteredTargets.map((target) => {
                        const targetQuiMatch = findRowMatchInQui(target, entry.quiMatches)
                            || findRowHostMatchInQui(target, entry.quiMatches)
                            || entry.baseQuiMatch?.quiItem
                            || null;
                        const mismatchNotes = buildTargetMismatchNotes(target, targetQuiMatch, entry.seeded);
                        const hasTypeMismatch = mismatchNotes.some((note) => /^got\s+(file|folder),\s+expected\s+(file|folder)$/i.test(String(note || '')));
                        const hasFileMeta = target?.rowFileMetaSource !== 'none' || Number.isInteger(target?.rowFileCount);
                        return {
                            target,
                            targetQuiMatch,
                            mismatchNotes,
                            hasTypeMismatch,
                            hasFileMeta
                        };
                    });

                    const sectionHasConfirmedTypeMismatch = targetDiagnostics.some((item) => item.hasTypeMismatch);

                    return targetDiagnostics.map((item) => {
                        const { target } = item;
                        const mismatchNotes = Array.isArray(item.mismatchNotes) ? [...item.mismatchNotes] : [];
                        if (sectionHasConfirmedTypeMismatch && !item.hasFileMeta) {
                            mismatchNotes.push('type unknown (no files/filecount; other targets mismatch)');
                        }

                    const label = target.releaseName || target.rowId || 'row';
                    const host = target.trackerHost || '(unknown tracker)';
                    const href = target.trackerUrl || '#';
                    const seederCount = Number.isInteger(target.seeders) ? `${target.seeders} seeders` : '';
                    const targetKey = `${sectionKey}::${target.torrentId || target.rowId || host}::${host}::${label}`;
                    targetByKey.set(targetKey, {
                        releaseName: target.releaseName || entry.seeded.releaseName,
                        trackerHost: target.trackerHost,
                        trackerUrl: target.trackerUrl,
                        downloadUrl: target.downloadUrl,
                        seeders: target.seeders ?? null,
                        fallbackMode: entry.fallbackMode,
                        sectionKey,
                        baseSavePath,
                        baseHost,
                        baseName
                    });
                    const hasMismatch = mismatchNotes.length > 0;

                    if (!targetSelectionState.has(targetKey)) {
                        targetSelectionState.set(targetKey, !hasMismatch);
                    }

                    const disabled = !target.downloadUrl;
                    const checked = targetSelectionState.get(targetKey) !== false;
                    if (!disabled && entry.fallbackMode === 'staged-fallback') {
                        stagedCandidatesForSection.push({ key: targetKey, target });
                    }
                    return `<li><label><input type="checkbox" data-sqt-target-key="${escapeHtml(targetKey)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}> <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a> — ${escapeHtml(host)}${seederCount ? ' (' + escapeHtml(seederCount) + ')' : ''}${disabled ? ' (No DL URL)' : ''}${renderMismatchNotesInline(mismatchNotes)}</label></li>`;
                    }).join('');
                })();

            if (stagedCandidatesForSection.length > 0) {
                stageCandidateTargetKeysBySection.set(sectionKey, stagedCandidatesForSection.map((candidate) => candidate.key));
            }

            return `
                <div class="box pad" style="margin-top:8px;" data-sqt-section-key="${escapeHtml(sectionKey)}">
                    <div style="margin-bottom:4px;"><strong>Mode:</strong> ${escapeHtml(fallbackLabel)}</div>
                    <div><strong>${index + 1}. Seeded PTP:</strong> ${escapeHtml(entry.seeded.releaseName)} ${entry.seeded.releaseGroup ? `(${escapeHtml(entry.seeded.releaseGroup)})` : ''} <input type="submit" class="ptp-sqt-run-quality" data-sqt-seeded-index="${index}" value="Quality-only check" style="margin-left:8px;"></div>
                    <div style="margin-top:4px;">Seeded row torrent id: ${escapeHtml(entry.seeded.torrentId || 'n/a')} | Tracker: ${escapeHtml(seededHost)}</div>
                    ${quiMatchesBlock}
                    ${discoveredSavePathBlock}
                    ${mainSeedSourceBlock}
                    <div style="margin-top:4px;">Compatible rows: ${compatibleCount} | qui release matches: ${quiCount} | Missing targets: ${targetCount}</div>
                    <div style="margin-top:6px;"><strong>Targets to add:</strong></div>
                    <ul style="margin:6px 0 0 18px;">${targetRows}</ul>
                </div>
            `;
        }).join('');

        const activeKeys = new Set(targetByKey.keys());
        Array.from(targetSelectionState.keys()).forEach((key) => {
            if (!activeKeys.has(key)) {
                targetSelectionState.delete(key);
            }
        });

        pruneSectionState(activeSectionKeys);

        const controls = targetByKey.size > 0
            ? `<div class="box pad" style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;"><input type="submit" id="ptp-sqt-select-all" value="Select All"><input type="submit" id="ptp-sqt-select-none" value="Select None"><input type="submit" id="ptp-sqt-add-selected" value="Add Selected to qui"><span id="ptp-sqt-selection-summary"></span></div>`
            : '';

        container.innerHTML = `${sections}${controls}`;

        const panelEl = document.getElementById(PANEL_ID);
        renderDiscoveredSavePathOptions(panelEl, config);
        refreshStageMainTargetKey(panelEl);

        applyPanelCollapsedState(Boolean(config.collapsed), false);
        updateSelectionSummary();
        renderFeedbackPanel();
    }

    async function runMatchingPass(options = {}) {
        const config = getConfig();
        const force = Boolean(options.force);

        createPanel();

        if (config.waitForEvent && !hasSeenEvent && !force) {
            setStatus(`Waiting for ${EVENT_NAME}...`);
            renderWaitingMessage(`Waiting for ${EVENT_NAME} before running.`);
            return;
        }

        const allRows = getTorrentRows();
        if (allRows.length === 0) {
            setStatus('No torrent rows found', true);
            renderWaitingMessage('No torrent rows were found on this page.');
            return;
        }

        const selectedPtpKey = String(config.selectedPtpTorrentId || '').trim();
        const selectedPtpRow = selectedPtpKey
            ? allRows.find((row) => {
                if (!isPtpRow(row)) return false;
                const torrentId = String(getRowTorrentId(row) || '').trim();
                const rowId = String(row.id || '').trim();
                return torrentId === selectedPtpKey || rowId === selectedPtpKey;
            }) || null
            : null;
        const selectedPtpMeta = selectedPtpRow ? getRowMeta(selectedPtpRow) : null;

        const seededRows = selectedPtpMeta
            ? (rowHasSeedingMarker(selectedPtpRow) ? [selectedPtpMeta] : [])
            : collectSeededPtpRows(allRows);
        const myToken = ++refreshToken;

        if (seededRows.length === 0) {
            if (!config.enableNoSeedFallback) {
                setStatus('No seeded PTP rows');
                renderResults([]);
                return;
            }

            setStatus('No seeded PTP rows; running fallback quality matching...');
            let fallbackResult;
            try {
                fallbackResult = await computeNoSeedFallback(allRows, config, myToken, selectedPtpMeta);
            } catch (error) {
                if (myToken !== refreshToken) return;
                setStatus(`Fallback qui error: ${error.message || error}`, true);
                renderWaitingMessage(`Fallback qui request failed: ${error.message || error}`);
                return;
            }

            if (myToken !== refreshToken) return;

            discoveredSavePaths = collectDiscoveredSavePaths(fallbackResult.quiItemsByReleaseName);
            const fallbackPanel = document.getElementById(PANEL_ID);
            if (fallbackPanel) {
                renderDiscoveredSavePathOptions(fallbackPanel, config);
            }

            renderResults(fallbackResult.results);
            const fallbackTotalTargets = fallbackResult.results.reduce((sum, item) => sum + item.targets.length, 0);
            setStatus(`Fallback done (${fallbackResult.mode}). Candidate sets: ${fallbackResult.results.length}, targets: ${fallbackTotalTargets}`);
            return;
        }

        setStatus('Searching qui...');

        let quiItemsByReleaseName;
        try {
            quiItemsByReleaseName = await buildQuiItemsBySeededReleaseName(allRows, seededRows, config, myToken, false);
        } catch (error) {
            if (myToken !== refreshToken) return;
            setStatus(`qui error: ${error.message || error}`, true);
            renderWaitingMessage(`qui request failed: ${error.message || error}`);
            return;
        }

        if (myToken !== refreshToken) return;

        const computed = buildComputedForSeededRows(allRows, seededRows, quiItemsByReleaseName, config, false, 'seeded');

        discoveredSavePaths = collectDiscoveredSavePaths(quiItemsByReleaseName);
        const panel = document.getElementById(PANEL_ID);
        if (panel) {
            renderDiscoveredSavePathOptions(panel, config);
        }

        renderResults(computed);

        const quiTorrentsTotal = Array.from(quiItemsByReleaseName.values()).reduce((sum, list) => sum + list.length, 0);
        const totalTargets = computed.reduce((sum, item) => sum + item.targets.length, 0);
        setStatus(`Done. Seeded rows: ${seededRows.length}, qui torrents: ${quiTorrentsTotal}, targets: ${totalTargets}`);
    }

    function installEventHooks() {
        document.addEventListener(EVENT_NAME, () => {
            console.debug(`[PTP Seeded qui Targets] Received ${EVENT_NAME}; creating panel and running match pass.`);
            hasSeenEvent = true;
            runMatchingPass();
        });
    }

    function init() {
        console.debug(`[PTP Seeded qui Targets] Waiting for ${EVENT_NAME} before creating panel.`);
        installEventHooks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
