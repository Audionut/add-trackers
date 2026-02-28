// ==UserScript==
// @name         OPS Album handler
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0
// @description  Queue best matching OPS album FL torrents to local proxy after OPS/RED matching completes
// @author       Audionut
// @match        https://orpheus.network/artist.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ops-album-fl-proxy-queue.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ops-album-fl-proxy-queue.user.js
// @icon         https://orpheus.network/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    const EVENT_NAME = 'OPSaddREDreleasescomplete';
    const KEY_BASE_URL = 'OPS_FL_PROXY_BASE_URL';
    const KEY_TOKEN = 'OPS_FL_PROXY_TOKEN';
    const KEY_SAVE_PATH = 'OPS_FL_PROXY_SAVE_PATH';
    const KEY_CATEGORY = 'OPS_FL_PROXY_CATEGORY';
    const KEY_TAGS = 'OPS_FL_PROXY_TAGS';
    const KEY_RED_CATEGORY = 'OPS_FL_PROXY_RED_CATEGORY';
    const KEY_RED_TAGS = 'OPS_FL_PROXY_RED_TAGS';
    const KEY_RED_API_KEY = 'OPS_FL_PROXY_RED_API_KEY';
    const KEY_RED_PAUSED = 'OPS_FL_PROXY_RED_PAUSED';
    const KEY_RED_SKIP_CHECKING = 'OPS_FL_PROXY_RED_SKIP_CHECKING';
    const KEY_PAUSED = 'OPS_FL_PROXY_PAUSED';
    const KEY_INSTANCE_ID = 'OPS_FL_PROXY_INSTANCE_ID';
    const KEY_WAIT_EVENT = 'OPS_FL_PROXY_WAIT_EVENT';
    const KEY_MEDIA_ORDER = 'OPS_FL_PROXY_MEDIA_ORDER';
    const KEY_MEDIA_ENABLED = 'OPS_FL_PROXY_MEDIA_ENABLED';
    const KEY_FORMAT_ORDER = 'OPS_FL_PROXY_FORMAT_ORDER';
    const KEY_FORMAT_ENABLED = 'OPS_FL_PROXY_FORMAT_ENABLED';
    const KEY_BITRATE_ORDER = 'OPS_FL_PROXY_BITRATE_ORDER';
    const KEY_BITRATE_ENABLED = 'OPS_FL_PROXY_BITRATE_ENABLED';
    const KEY_TARGET_SECTION_ID = 'OPS_FL_PROXY_TARGET_SECTION_ID';
    const KEY_SENT_RELEASES = 'OPS_FL_PROXY_SENT_RELEASES';
    const KEY_MATCH_TIE_BREAKER = 'OPS_FL_PROXY_MATCH_TIE_BREAKER';
    const KEY_MATCH_TIE_BREAKER_DIRECTION = 'OPS_FL_PROXY_MATCH_TIE_BREAKER_DIRECTION';
    const KEY_POLL_MAX_MINUTES = 'OPS_FL_PROXY_POLL_MAX_MINUTES';
    const REDACTED_VALUE = '<REDACTED>';
    const DOWNLOAD_STATUS_POLL_INTERVAL_MS = 5000;

    const MATCH_TIE_BREAKER_OPTIONS = [
        { value: 'seeders', label: 'Seeder count' },
        { value: 'age', label: 'Age (newest year)' },
        { value: 'size', label: 'Size (largest)' }
    ];

    const MATCH_TIE_BREAKER_DIRECTION_OPTIONS = [
        { value: 'desc', label: 'Descending' },
        { value: 'asc', label: 'Ascending' }
    ];

    const MEDIA_OPTIONS = [
        { key: 'CD', label: 'CD' },
        { key: 'WEB', label: 'WEB' },
        { key: 'Vinyl', label: 'Vinyl' },
        { key: 'DVD', label: 'DVD' },
        { key: 'BD', label: 'BD' },
        { key: 'Soundboard', label: 'Soundboard' },
        { key: 'SACD', label: 'SACD' },
        { key: 'DAT', label: 'DAT' },
        { key: 'Cassette', label: 'Cassette' }
    ];

    const FORMAT_OPTIONS = [
        { key: 'MP3', label: 'MP3' },
        { key: 'FLAC', label: 'FLAC' },
        { key: 'Ogg Vorbis', label: 'Ogg Vorbis' },
        { key: 'AAC', label: 'AAC' },
        { key: 'AC3', label: 'AC3' },
        { key: 'DTS', label: 'DTS' },
        { key: 'perfectflac', label: 'Perfect FLACs' }
    ];

    const BITRATE_OPTIONS = [
        { key: 'Lossless', label: 'Lossless' },
        { key: '24bit Lossless', label: '24bit Lossless' },
        { key: 'V0 (VBR)', label: 'V0 (VBR)' },
        { key: 'V1 (VBR)', label: 'V1 (VBR)' },
        { key: 'V2 (VBR)', label: 'V2 (VBR)' },
        { key: '320', label: '320' },
        { key: '256', label: '256' },
        { key: '192', label: '192' },
        { key: '160', label: '160' },
        { key: '128', label: '128' },
        { key: '96', label: '96' },
        { key: '64', label: '64' },
        { key: 'APS (VBR)', label: 'APS (VBR)' },
        { key: 'APX (VBR)', label: 'APX (VBR)' },
        { key: 'q8.x (VBR)', label: 'q8.x (VBR)' },
        { key: 'Other', label: 'Other' }
    ];

    const DEFAULT_MEDIA_ORDER = MEDIA_OPTIONS.map((option) => option.key);
    const DEFAULT_FORMAT_ORDER = FORMAT_OPTIONS.map((option) => option.key);
    const DEFAULT_BITRATE_ORDER = BITRATE_OPTIONS.map((option) => option.key);

    const DEFAULTS = {
        baseUrl: '',
        token: '',
        savePath: '',
        category: '',
        tags: '',
        redCategory: '',
        redTags: '',
        redApiKey: '',
        redPaused: '',
        redSkipChecking: true,
        paused: '',
        instanceId: '',
        waitEvent: true,
        targetSectionId: 'torrents_album',
        pollMaxMinutes: 10,
        matchTieBreaker: 'seeders',
        matchTieBreakerDirection: 'desc',
        mediaOrder: DEFAULT_MEDIA_ORDER,
        formatOrder: DEFAULT_FORMAT_ORDER,
        bitrateOrder: DEFAULT_BITRATE_ORDER,
        mediaEnabled: Object.fromEntries(DEFAULT_MEDIA_ORDER.map((key) => [key, true])),
        formatEnabled: Object.fromEntries(DEFAULT_FORMAT_ORDER.map((key) => [key, true])),
        bitrateEnabled: Object.fromEntries(DEFAULT_BITRATE_ORDER.map((key) => [key, true]))
    };

    if (!globalThis.location.hostname.includes('orpheus.network') || !globalThis.location.href.includes('/artist.php?id=')) {
        return;
    }

    function sanitizeOrder(order, defaults) {
        const source = Array.isArray(order) ? order : [];
        const allowed = new Set(defaults);
        const cleaned = source.filter((key) => allowed.has(key));
        const missing = defaults.filter((key) => !cleaned.includes(key));
        return [...cleaned, ...missing];
    }

    function sanitizeEnabledMap(map, defaults) {
        const source = map && typeof map === 'object' ? map : {};
        const result = {};
        defaults.forEach((key) => {
            result[key] = source[key] !== false;
        });
        return result;
    }

    function sanitizeTargetSectionId(sectionId) {
        const value = String(sectionId || '').trim();
        return /^torrents_[a-z_]+$/i.test(value) ? value : DEFAULTS.targetSectionId;
    }

    function sanitizeMatchTieBreaker(value) {
        const allowed = new Set(MATCH_TIE_BREAKER_OPTIONS.map((option) => option.value));
        const normalized = String(value || '').trim().toLowerCase();
        return allowed.has(normalized) ? normalized : DEFAULTS.matchTieBreaker;
    }

    function sanitizeMatchTieBreakerDirection(value) {
        const allowed = new Set(MATCH_TIE_BREAKER_DIRECTION_OPTIONS.map((option) => option.value));
        const normalized = String(value || '').trim().toLowerCase();
        return allowed.has(normalized) ? normalized : DEFAULTS.matchTieBreakerDirection;
    }

    function parseStoredJson(value, fallback) {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        }
        return value ?? fallback;
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

    function sanitizePausedState(value) {
        const normalized = String(value ?? '').trim().toLowerCase();
        if (!normalized) return '';
        if (normalized === 'true') return 'true';
        if (normalized === 'false') return 'false';
        return '';
    }

    function sanitizePollMaxMinutes(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return DEFAULTS.pollMaxMinutes;
        const rounded = Math.round(parsed);
        if (rounded < 1) return DEFAULTS.pollMaxMinutes;
        if (rounded > 240) return 240;
        return rounded;
    }

    function getConfig() {
        const parsedMediaOrder = parseStoredJson(GM_getValue(KEY_MEDIA_ORDER, DEFAULTS.mediaOrder), DEFAULTS.mediaOrder);
        const parsedFormatOrder = parseStoredJson(GM_getValue(KEY_FORMAT_ORDER, DEFAULTS.formatOrder), DEFAULTS.formatOrder);
        const parsedBitrateOrder = parseStoredJson(GM_getValue(KEY_BITRATE_ORDER, DEFAULTS.bitrateOrder), DEFAULTS.bitrateOrder);
        const parsedMediaEnabled = parseStoredJson(GM_getValue(KEY_MEDIA_ENABLED, DEFAULTS.mediaEnabled), DEFAULTS.mediaEnabled);
        const parsedFormatEnabled = parseStoredJson(GM_getValue(KEY_FORMAT_ENABLED, DEFAULTS.formatEnabled), DEFAULTS.formatEnabled);
        const parsedBitrateEnabled = parseStoredJson(GM_getValue(KEY_BITRATE_ENABLED, DEFAULTS.bitrateEnabled), DEFAULTS.bitrateEnabled);

        return {
            baseUrl: String(GM_getValue(KEY_BASE_URL, DEFAULTS.baseUrl)).trim().replace(/\/$/, ''),
            token: String(GM_getValue(KEY_TOKEN, DEFAULTS.token)).trim(),
            savePath: String(GM_getValue(KEY_SAVE_PATH, DEFAULTS.savePath)).trim(),
            category: String(GM_getValue(KEY_CATEGORY, DEFAULTS.category)).trim(),
            tags: String(GM_getValue(KEY_TAGS, DEFAULTS.tags)).trim(),
            redCategory: String(GM_getValue(KEY_RED_CATEGORY, DEFAULTS.redCategory)).trim(),
            redTags: String(GM_getValue(KEY_RED_TAGS, DEFAULTS.redTags)).trim(),
            redApiKey: String(GM_getValue(KEY_RED_API_KEY, DEFAULTS.redApiKey)).trim(),
            redPaused: sanitizePausedState(GM_getValue(KEY_RED_PAUSED, DEFAULTS.redPaused)),
            redSkipChecking: Boolean(GM_getValue(KEY_RED_SKIP_CHECKING, DEFAULTS.redSkipChecking)),
            paused: sanitizePausedState(GM_getValue(KEY_PAUSED, DEFAULTS.paused)),
            instanceId: sanitizeInstanceId(GM_getValue(KEY_INSTANCE_ID, DEFAULTS.instanceId)),
            waitEvent: Boolean(GM_getValue(KEY_WAIT_EVENT, DEFAULTS.waitEvent)),
            targetSectionId: sanitizeTargetSectionId(GM_getValue(KEY_TARGET_SECTION_ID, DEFAULTS.targetSectionId)),
            pollMaxMinutes: sanitizePollMaxMinutes(GM_getValue(KEY_POLL_MAX_MINUTES, DEFAULTS.pollMaxMinutes)),
            matchTieBreaker: sanitizeMatchTieBreaker(GM_getValue(KEY_MATCH_TIE_BREAKER, DEFAULTS.matchTieBreaker)),
            matchTieBreakerDirection: sanitizeMatchTieBreakerDirection(GM_getValue(KEY_MATCH_TIE_BREAKER_DIRECTION, DEFAULTS.matchTieBreakerDirection)),
            mediaOrder: sanitizeOrder(parsedMediaOrder, DEFAULT_MEDIA_ORDER),
            formatOrder: sanitizeOrder(parsedFormatOrder, DEFAULT_FORMAT_ORDER),
            bitrateOrder: sanitizeOrder(parsedBitrateOrder, DEFAULT_BITRATE_ORDER),
            mediaEnabled: sanitizeEnabledMap(parsedMediaEnabled, DEFAULT_MEDIA_ORDER),
            formatEnabled: sanitizeEnabledMap(parsedFormatEnabled, DEFAULT_FORMAT_ORDER),
            bitrateEnabled: sanitizeEnabledMap(parsedBitrateEnabled, DEFAULT_BITRATE_ORDER)
        };
    }

    function setConfig(config) {
        GM_setValue(KEY_BASE_URL, config.baseUrl);
        GM_setValue(KEY_TOKEN, config.token);
        GM_setValue(KEY_SAVE_PATH, config.savePath);
        GM_setValue(KEY_CATEGORY, String(config.category ?? '').trim());
        GM_setValue(KEY_TAGS, String(config.tags ?? '').trim());
        GM_setValue(KEY_RED_CATEGORY, String(config.redCategory ?? '').trim());
        GM_setValue(KEY_RED_TAGS, String(config.redTags ?? '').trim());
        GM_setValue(KEY_RED_API_KEY, String(config.redApiKey ?? '').trim());
        GM_setValue(KEY_RED_PAUSED, sanitizePausedState(config.redPaused));
        GM_setValue(KEY_RED_SKIP_CHECKING, Boolean(config.redSkipChecking));
        GM_setValue(KEY_PAUSED, sanitizePausedState(config.paused));
        GM_setValue(KEY_INSTANCE_ID, sanitizeInstanceId(config.instanceId));
        GM_setValue(KEY_WAIT_EVENT, config.waitEvent);
        GM_setValue(KEY_TARGET_SECTION_ID, sanitizeTargetSectionId(config.targetSectionId));
        GM_setValue(KEY_POLL_MAX_MINUTES, sanitizePollMaxMinutes(config.pollMaxMinutes));
        GM_setValue(KEY_MATCH_TIE_BREAKER, sanitizeMatchTieBreaker(config.matchTieBreaker));
        GM_setValue(KEY_MATCH_TIE_BREAKER_DIRECTION, sanitizeMatchTieBreakerDirection(config.matchTieBreakerDirection));
        GM_setValue(KEY_MEDIA_ORDER, JSON.stringify(sanitizeOrder(config.mediaOrder, DEFAULT_MEDIA_ORDER)));
        GM_setValue(KEY_FORMAT_ORDER, JSON.stringify(sanitizeOrder(config.formatOrder, DEFAULT_FORMAT_ORDER)));
        GM_setValue(KEY_BITRATE_ORDER, JSON.stringify(sanitizeOrder(config.bitrateOrder, DEFAULT_BITRATE_ORDER)));
        GM_setValue(KEY_MEDIA_ENABLED, JSON.stringify(sanitizeEnabledMap(config.mediaEnabled, DEFAULT_MEDIA_ORDER)));
        GM_setValue(KEY_FORMAT_ENABLED, JSON.stringify(sanitizeEnabledMap(config.formatEnabled, DEFAULT_FORMAT_ORDER)));
        GM_setValue(KEY_BITRATE_ENABLED, JSON.stringify(sanitizeEnabledMap(config.bitrateEnabled, DEFAULT_BITRATE_ORDER)));
    }

    function getArtistIdFromPage() {
        const artistId = new URLSearchParams(globalThis.location.search).get('id');
        return artistId ? String(artistId).trim() : 'unknown_artist';
    }

    function getSentCacheContextKey(artistId, targetSectionId) {
        return `artist_${artistId}::${sanitizeTargetSectionId(targetSectionId)}`;
    }

    function getSentReleasesCache() {
        const stored = GM_getValue(KEY_SENT_RELEASES, '{}');
        if (typeof stored === 'string') {
            try {
                const parsed = JSON.parse(stored);
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        }
        return stored && typeof stored === 'object' ? stored : {};
    }

    function setSentReleasesCache(cache) {
        GM_setValue(KEY_SENT_RELEASES, JSON.stringify(cache || {}));
    }

    function getSentReleasesCacheForContext(contextKey) {
        const allCache = getSentReleasesCache();
        const contextCache = allCache[contextKey];
        return contextCache && typeof contextCache === 'object' ? contextCache : {};
    }

    function setSentReleasesCacheForContext(contextKey, contextCache) {
        const allCache = getSentReleasesCache();
        allCache[contextKey] = contextCache || {};
        setSentReleasesCache(allCache);
    }

    function clearSentReleasesCacheForContext(contextKey) {
        const allCache = getSentReleasesCache();
        delete allCache[contextKey];
        setSentReleasesCache(allCache);
    }

    function makeReleaseCacheKey(entry) {
        return `ops_torrent_${entry.torrentId}`;
    }

    function configureSettings() {
        const current = getConfig();
        const baseUrl = prompt('Proxy base URL', current.baseUrl);
        if (baseUrl === null) return;

        const token = prompt('Proxy token (appended to URL path)', current.token);
        if (token === null) return;

        const savePath = prompt('Proxy savePath (optional)', current.savePath);
        if (savePath === null) return;

        const category = prompt('Proxy category (optional)', current.category);
        if (category === null) return;

        const tags = prompt('Proxy tags (optional, comma-separated)', current.tags);
        if (tags === null) return;

        const paused = prompt('Proxy paused state (optional: true/false)', current.paused);
        if (paused === null) return;

        const instanceId = prompt('Proxy instanceId (optional integer)', current.instanceId);
        if (instanceId === null) return;

        const waitEvent = confirm('Wait for OPSaddREDreleasescomplete event before running?\nOK = yes, Cancel = no');

        setConfig({
            baseUrl: String(baseUrl).trim().replace(/\/$/, ''),
            token: String(token).trim(),
            savePath: String(savePath).trim(),
            category: String(category).trim(),
            tags: String(tags).trim(),
            redCategory: current.redCategory,
            redTags: current.redTags,
            redApiKey: current.redApiKey,
            redPaused: current.redPaused,
            redSkipChecking: current.redSkipChecking,
            paused: sanitizePausedState(paused),
            instanceId: sanitizeInstanceId(instanceId),
            waitEvent,
            targetSectionId: current.targetSectionId,
            pollMaxMinutes: current.pollMaxMinutes,
            matchTieBreaker: current.matchTieBreaker,
            matchTieBreakerDirection: current.matchTieBreakerDirection,
            mediaOrder: current.mediaOrder,
            formatOrder: current.formatOrder,
            bitrateOrder: current.bitrateOrder,
            mediaEnabled: current.mediaEnabled,
            formatEnabled: current.formatEnabled,
            bitrateEnabled: current.bitrateEnabled
        });

        alert('OPS Album FL Proxy Queue settings saved. Reloading page...');
        globalThis.location.reload();
    }

    GM_registerMenuCommand('Configure OPS Album FL Proxy Queue', configureSettings);

    function getMediaLabel(mediaKey) {
        return MEDIA_OPTIONS.find((option) => option.key === mediaKey)?.label || mediaKey;
    }

    function getFormatLabel(formatKey) {
        return FORMAT_OPTIONS.find((option) => option.key === formatKey)?.label || formatKey;
    }

    function getBitrateLabel(bitrateKey) {
        return BITRATE_OPTIONS.find((option) => option.key === bitrateKey)?.label || bitrateKey;
    }

    function sanitizeUrlToken(value) {
        const normalized = String(value || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
        return encodeURIComponent(normalized);
    }

    function getRankMap(order) {
        const rankMap = new Map();
        order.forEach((key, index) => {
            rankMap.set(key, index + 1);
        });
        return rankMap;
    }

    let hasRun = false;

    function startOnce(reason) {
        if (hasRun) return;
        hasRun = true;
        run(reason).catch((error) => {
            console.error('[OPS Album FL Proxy Queue] Failed:', error);
        });
    }

    function getGroupIdFromClasses(element) {
        const classNames = Array.from(element.classList || []);
        const groupClass = classNames.find((c) => /^groupid_\d+(_header)?$/.test(c));
        if (!groupClass) return null;
        const match = groupClass.match(/^groupid_(\d+)/);
        return match ? match[1] : null;
    }

    function getEditionNumberFromRow(editionRow) {
        const toggle = editionRow.querySelector('a[onclick*="toggle_edition("]');
        const onclickValue = toggle ? toggle.getAttribute('onclick') : '';
        if (!onclickValue) return null;
        const match = onclickValue.match(/toggle_edition\(\s*\d+\s*,\s*(\d+)\s*,/);
        return match ? Number(match[1]) : null;
    }

    function getEditionNumberFromTorrentRow(torrentRow) {
        const classNames = Array.from(torrentRow.classList || []);
        const editionClass = classNames.find((c) => /^edition_\d+$/.test(c));
        if (!editionClass) return null;
        const match = editionClass.match(/^edition_(\d+)$/);
        return match ? Number(match[1]) : null;
    }

    function extractAlbumName(headerRow) {
        const albumAnchor = headerRow.querySelector('td.td_info.big_info strong a');
        if (albumAnchor && albumAnchor.textContent) {
            return albumAnchor.textContent.trim();
        }
        return `Group ${getGroupIdFromClasses(headerRow) || ''}`.trim();
    }

    function getArtistNameFromPage() {
        const candidates = [
            '#content .header h2 a[href^="artist.php?id="]',
            '#content .header h2',
            '#content h2.page__title',
            '#content h2'
        ];

        for (const selector of candidates) {
            const value = String(document.querySelector(selector)?.textContent || '').trim();
            if (value) {
                return value.replace(/\s+::\s+Orpheus.*$/i, '').trim();
            }
        }

        const title = String(document.title || '').trim();
        if (title) {
            return title.split('::')[0].trim();
        }

        return 'Unknown Artist';
    }

    function parseCommaSeparatedList(value) {
        return String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function getRedTorrentIdFromMatchRow(matchRow) {
        if (!matchRow) return '';

        const detailsLink = matchRow.querySelector('a[href*="redacted.sh/torrents.php"]');
        if (detailsLink) {
            const href = String(detailsLink.getAttribute('href') || '').trim();
            const queryMatch = href.match(/[?&]torrentid=(\d+)/i);
            if (queryMatch) {
                return queryMatch[1];
            }

            const hashMatch = href.match(/#torrent(\d+)/i);
            if (hashMatch) {
                return hashMatch[1];
            }
        }

        const dlLink = matchRow.querySelector('a.dl-link[data-id]');
        if (dlLink) {
            const id = String(dlLink.getAttribute('data-id') || '').trim();
            if (/^\d+$/.test(id)) {
                return id;
            }
        }

        return '';
    }

    function getRedGroupIdFromMatchRow(matchRow) {
        if (!matchRow) return '';

        const detailsLink = matchRow.querySelector('a[href*="redacted.sh/torrents.php"]');
        if (!detailsLink) {
            return '';
        }

        const href = String(detailsLink.getAttribute('href') || '').trim();
        const groupMatch = href.match(/[?&]id=(\d+)/i);
        if (groupMatch) {
            return groupMatch[1];
        }

        return '';
    }

    function getSectionRows(sectionId) {
        const sectionHeader = document.querySelector(`tr.colhead_dark#${sectionId}`);
        if (!sectionHeader) {
            return [];
        }

        const rows = [];
        let cursor = sectionHeader.nextElementSibling;
        while (cursor) {
            if (cursor.matches('tr.colhead_dark[id^="torrents_"]')) {
                break;
            }
            if (cursor.tagName === 'TR') {
                rows.push(cursor);
            }
            cursor = cursor.nextElementSibling;
        }

        return rows;
    }

    function parseReleaseDetails(torrentRow) {
        const links = Array.from(torrentRow.querySelectorAll('td.td_info a'));
        const detailsAnchor = links.find((link) => /\[[^\]]+\]/.test(link.textContent || ''));
        if (!detailsAnchor) return null;

        const text = detailsAnchor.textContent || '';
        const bracketMatch = text.match(/\[([^\]]+)\]/);
        if (!bracketMatch) return null;

        const parts = bracketMatch[1].split('/').map((part) => part.trim());
        if (parts.length < 3) return null;

        const media = parts[0].toUpperCase();
        const format = parts[1];
        const encoding = parts[2].toLowerCase();
        const releaseType = `${parts[0]} / ${format} / ${parts[2]}`;

        return { media, format, encoding, releaseType };
    }

    function extractFlTokenLink(torrentRow) {
        const flAnchor = torrentRow.querySelector('a[href*="action=download"][href*="usetoken=1"]');
        if (!flAnchor) return null;
        const href = flAnchor.getAttribute('href');
        if (!href) return null;
        return new URL(href, globalThis.location.origin).href;
    }

    function parseSeeders(torrentRow) {
        const seedersCell = torrentRow.querySelector('.td_seeders');
        if (!seedersCell) return 0;
        const value = Number((seedersCell.textContent || '').trim());
        return Number.isFinite(value) ? value : 0;
    }

    function parseFileCount(torrentRow) {
        const fileCountCell = torrentRow.querySelector('.td_filecount');
        if (!fileCountCell) return null;
        const value = Number((fileCountCell.textContent || '').trim());
        return Number.isFinite(value) ? value : null;
    }

    function parseSizeBytes(torrentRow) {
        const sizeCell = torrentRow.querySelector('.td_size');
        if (!sizeCell) return null;

        const text = (sizeCell.textContent || '').trim();
        const match = text.match(/([\d.]+)\s*(KiB|MiB|GiB|KB|MB|GB)/i);
        if (!match) return null;

        const value = Number(match[1]);
        if (!Number.isFinite(value)) return null;

        const unit = match[2].toUpperCase();
        if (unit === 'KIB' || unit === 'KB') return value * 1024;
        if (unit === 'MIB' || unit === 'MB') return value * 1024 * 1024;
        if (unit === 'GIB' || unit === 'GB') return value * 1024 * 1024 * 1024;
        return null;
    }

    function parseEditionYear(editionText) {
        const text = String(editionText || '');
        const yearRegex = /\b(19\d{2}|20\d{2})\b/;
        const match = yearRegex.exec(text);
        if (!match) return null;
        const year = Number(match[1]);
        return Number.isFinite(year) ? year : null;
    }

    function getMediaKey(media) {
        const normalized = String(media || '').trim().toLowerCase();
        const hit = MEDIA_OPTIONS.find((option) => option.key.toLowerCase() === normalized);
        return hit ? hit.key : null;
    }

    function getFormatKey(format) {
        const normalized = String(format || '').trim().toLowerCase();
        const hit = FORMAT_OPTIONS.find((option) => option.key.toLowerCase() === normalized);
        return hit ? hit.key : null;
    }

    function getBitrateKey(encoding) {
        const normalized = String(encoding || '').trim().toLowerCase();
        const hit = BITRATE_OPTIONS.find((option) => option.key.toLowerCase() === normalized);
        return hit ? hit.key : null;
    }

    function collectCandidatesByGroup(albumRows, selectionConfig, requireRedMatch) {
        const editionInfoByGroup = new Map();
        const groupMetaByGroup = new Map();
        const candidatesByGroup = new Map();
        let currentHeaderGroupId = null;

        for (const row of albumRows) {
            const groupId = getGroupIdFromClasses(row) || currentHeaderGroupId;

            if (Array.from(row.classList).some((c) => /^groupid_\d+_header$/.test(c))) {
                currentHeaderGroupId = getGroupIdFromClasses(row) || currentHeaderGroupId;
                if (currentHeaderGroupId) {
                    groupMetaByGroup.set(currentHeaderGroupId, {
                        albumName: extractAlbumName(row)
                    });
                }
                continue;
            }

            if (!groupId) {
                continue;
            }

            if (row.classList.contains('edition') && row.classList.contains('group_torrent')) {
                const editionNo = getEditionNumberFromRow(row);
                if (editionNo !== null) {
                    if (!editionInfoByGroup.has(groupId)) {
                        editionInfoByGroup.set(groupId, new Map());
                    }
                    editionInfoByGroup.get(groupId).set(editionNo, (row.textContent || '').trim());
                }
                continue;
            }

            if (!row.classList.contains('torrent_row')) {
                continue;
            }

            if (!row.id || !row.id.startsWith('torrent')) {
                continue;
            }

            if (requireRedMatch) {
                const matchRow = document.getElementById(`${row.id}_match`);
                if (!matchRow || !matchRow.classList.contains('exact_match_row')) {
                    continue;
                }

                const opsFileCount = parseFileCount(row);
                const redFileCount = parseFileCount(matchRow);
                if (opsFileCount === null || redFileCount === null || opsFileCount !== redFileCount) {
                    continue;
                }
            }

            const matchRow = requireRedMatch ? document.getElementById(`${row.id}_match`) : null;
            const redTorrentId = requireRedMatch ? getRedTorrentIdFromMatchRow(matchRow) : '';
            const redGroupId = requireRedMatch ? getRedGroupIdFromMatchRow(matchRow) : '';

            const details = parseReleaseDetails(row);
            if (!details) {
                continue;
            }

            const flTokenUrl = extractFlTokenLink(row);
            if (!flTokenUrl) {
                continue;
            }

            const editionNo = getEditionNumberFromTorrentRow(row);
            const editionText = editionNo !== null && editionInfoByGroup.has(groupId)
                ? (editionInfoByGroup.get(groupId).get(editionNo) || '')
                : '';
            const editionYear = parseEditionYear(editionText);

            const mediaKey = getMediaKey(details.media);
            if (!mediaKey || !selectionConfig.mediaEnabled[mediaKey]) {
                continue;
            }

            const formatKey = getFormatKey(details.format);
            if (!formatKey || !selectionConfig.formatEnabled[formatKey]) {
                continue;
            }

            const bitrateKey = getBitrateKey(details.encoding);
            if (!bitrateKey || !selectionConfig.bitrateEnabled[bitrateKey]) {
                continue;
            }

            const mediaRank = selectionConfig.mediaRankMap.get(mediaKey);
            const formatRank = selectionConfig.formatRankMap.get(formatKey);
            const bitrateRank = selectionConfig.bitrateRankMap.get(bitrateKey);
            if (!mediaRank || !formatRank || !bitrateRank) {
                continue;
            }

            const seeders = parseSeeders(row);
            const sizeBytes = parseSizeBytes(row);
            const torrentId = row.id.replace('torrent', '');

            if (!candidatesByGroup.has(groupId)) {
                candidatesByGroup.set(groupId, []);
            }

            candidatesByGroup.get(groupId).push({
                groupId,
                torrentId,
                redTorrentId,
                redGroupId,
                flTokenUrl,
                mediaRank,
                formatRank,
                bitrateRank,
                mediaKey,
                formatKey,
                bitrateKey,
                seeders,
                sizeBytes,
                editionYear,
                albumName: groupMetaByGroup.get(groupId)?.albumName || `Group ${groupId}`,
                releaseType: `${details.releaseType}`
            });
        }

        return candidatesByGroup;
    }

    function chooseBestCandidate(candidates, matchTieBreaker, matchTieBreakerDirection) {
        if (!candidates || candidates.length === 0) return null;

        const tieBreaker = sanitizeMatchTieBreaker(matchTieBreaker);
        const tieBreakerDirection = sanitizeMatchTieBreakerDirection(matchTieBreakerDirection);
        const directionSign = tieBreakerDirection === 'asc' ? 1 : -1;

        const tieBreakerCompare = (a, b) => {
            if (tieBreaker === 'age') {
                const yearA = Number.isFinite(a.editionYear) ? a.editionYear : 0;
                const yearB = Number.isFinite(b.editionYear) ? b.editionYear : 0;
                if (yearA !== yearB) return (yearA - yearB) * directionSign;
                return 0;
            }

            if (tieBreaker === 'size') {
                const sizeA = Number.isFinite(a.sizeBytes) ? a.sizeBytes : 0;
                const sizeB = Number.isFinite(b.sizeBytes) ? b.sizeBytes : 0;
                if (sizeA !== sizeB) return (sizeA - sizeB) * directionSign;
                return 0;
            }

            if (a.seeders !== b.seeders) return (a.seeders - b.seeders) * directionSign;
            return 0;
        };

        return candidates
            .slice()
            .sort((a, b) => {
                if (a.mediaRank !== b.mediaRank) return a.mediaRank - b.mediaRank;
                if (a.formatRank !== b.formatRank) return a.formatRank - b.formatRank;
                if (a.bitrateRank !== b.bitrateRank) return a.bitrateRank - b.bitrateRank;
                const tieBreakerResult = tieBreakerCompare(a, b);
                if (tieBreakerResult !== 0) return tieBreakerResult;
                if (a.seeders !== b.seeders) return b.seeders - a.seeders;
                return Number(a.torrentId) - Number(b.torrentId);
            })[0];
    }

    function normalizeBaseUrl(value) {
        return String(value || '').trim().replace(/\/+$/, '');
    }

    function buildProxyCandidateUrls(baseUrl, tokenValue) {
        const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
        if (!normalizedBaseUrl) return [];

        const token = sanitizeUrlToken(tokenValue);
        if (!token) return [];

        const urls = [];
        const pushUrl = (value) => {
            if (value && !urls.includes(value)) {
                urls.push(value);
            }
        };

        if (/\/proxy\/[^/]+\/api\/v2\/torrents\/add$/i.test(normalizedBaseUrl)) {
            pushUrl(normalizedBaseUrl);
            return urls;
        }

        if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUrl(`${normalizedBaseUrl}/api/v2/torrents/add`);
            return urls;
        }

        if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
            pushUrl(`${normalizedBaseUrl}/torrents/add`);
            return urls;
        }

        pushUrl(`${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/add`);
        pushUrl(`${normalizedBaseUrl}/api/proxy/${token}/api/v2/torrents/add`);
        return urls;
    }

    function postToProxyWithOptions(config, urls, extraFields, options) {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing proxy token. Set qUI token in settings.'));
                return;
            }

            const proxyUrls = buildProxyCandidateUrls(config.baseUrl, token);
            if (proxyUrls.length === 0) {
                reject(new Error('Missing proxy base URL or token. Set qUI base URL and token in settings.'));
                return;
            }

            const includeDefaultFields = options?.includeDefaultFields !== false;
            const formData = new FormData();
            formData.append('urls', urls.join('\n'));
            if (includeDefaultFields && config.savePath) {
                formData.append('savepath', config.savePath);
            }
            if (includeDefaultFields && config.category) {
                formData.append('category', config.category);
            }
            if (includeDefaultFields && config.tags) {
                formData.append('tags', config.tags);
            }
            if (includeDefaultFields && config.paused) {
                formData.append('paused', config.paused);
            }

            if (extraFields && typeof extraFields === 'object') {
                Object.entries(extraFields).forEach(([key, value]) => {
                    if (value === undefined || value === null || value === '') {
                        return;
                    }
                    formData.append(key, String(value));
                });
            }

            const tryPost = (endpointIndex) => {
                const proxyUrl = proxyUrls[endpointIndex];
                GM_xmlhttpRequest({
                    url: proxyUrl,
                    method: 'POST',
                    data: formData,
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                            return;
                        }

                        if (response.status === 401 || response.status === 403) {
                            if (endpointIndex < proxyUrls.length - 1) {
                                tryPost(endpointIndex + 1);
                                return;
                            }

                            reject(new Error(`Proxy request failed with status ${response.status}: Unauthorized after trying ${proxyUrls.length} endpoint(s): ${proxyUrls.join(', ')}. Ensure token is valid and expected in /proxy/<token> path.`));
                            return;
                        }

                        if (response.status === 404 && endpointIndex < proxyUrls.length - 1) {
                            tryPost(endpointIndex + 1);
                            return;
                        }

                        if (response.status === 404) {
                            reject(new Error(`Proxy request failed with status 404 after trying ${proxyUrls.length} endpoint(s): ${proxyUrls.join(', ')}. Adjust qUI base URL and confirm the proxy token path route.`));
                            return;
                        }

                        reject(new Error(`Proxy request failed with status ${response.status} at ${proxyUrl}: ${response.responseText || ''}`));
                    },
                    onerror: (error) => reject(error)
                });
            };

            tryPost(0);
        });
    }

    function postToProxy(config, urls) {
        return postToProxyWithOptions(config, urls, {});
    }

    function postTorrentFilesToProxyWithOptions(config, torrentFiles, extraFields, options) {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing proxy token. Set qUI token in settings.'));
                return;
            }

            const proxyUrls = buildProxyCandidateUrls(config.baseUrl, token);
            if (proxyUrls.length === 0) {
                reject(new Error('Missing proxy base URL or token. Set qUI base URL and token in settings.'));
                return;
            }

            if (!Array.isArray(torrentFiles) || torrentFiles.length === 0) {
                reject(new Error('No torrent files provided for upload.'));
                return;
            }

            const includeDefaultFields = options?.includeDefaultFields !== false;
            const buildFormData = () => {
                const formData = new FormData();

                torrentFiles.forEach((torrentFile, index) => {
                    const blob = torrentFile?.blob;
                    if (!blob) {
                        return;
                    }
                    const fileName = String(torrentFile.fileName || `upload_${index + 1}.torrent`);
                    formData.append('torrents', blob, fileName);
                });

                if (includeDefaultFields && config.savePath) {
                    formData.append('savepath', config.savePath);
                }
                if (includeDefaultFields && config.category) {
                    formData.append('category', config.category);
                }
                if (includeDefaultFields && config.tags) {
                    formData.append('tags', config.tags);
                }
                if (includeDefaultFields && config.paused) {
                    formData.append('paused', config.paused);
                }

                if (extraFields && typeof extraFields === 'object') {
                    Object.entries(extraFields).forEach(([key, value]) => {
                        if (value === undefined || value === null || value === '') {
                            return;
                        }
                        formData.append(key, String(value));
                    });
                }

                return formData;
            };

            const tryPost = (endpointIndex) => {
                const proxyUrl = proxyUrls[endpointIndex];
                const formData = buildFormData();

                GM_xmlhttpRequest({
                    url: proxyUrl,
                    method: 'POST',
                    data: formData,
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response);
                            return;
                        }

                        if ((response.status === 401 || response.status === 403 || response.status === 404) && endpointIndex < proxyUrls.length - 1) {
                            tryPost(endpointIndex + 1);
                            return;
                        }

                        reject(new Error(`Proxy torrent upload failed with status ${response.status} at ${proxyUrl}: ${response.responseText || ''}`));
                    },
                    onerror: (error) => reject(error)
                });
            };

            tryPost(0);
        });
    }

    function buildProxySearchCandidateUrls(baseUrl, tokenValue) {
        const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
        if (!normalizedBaseUrl) return [];

        const token = sanitizeUrlToken(tokenValue);
        if (!token) return [];

        const urls = [];
        const pushUrl = (value) => {
            if (value && !urls.includes(value)) {
                urls.push(value);
            }
        };

        if (/\/proxy\/[^/]+\/api\/v2\/torrents\/search$/i.test(normalizedBaseUrl)) {
            pushUrl(normalizedBaseUrl);
            return urls;
        }

        if (/\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUrl(`${normalizedBaseUrl}/api/v2/torrents/search`);
            return urls;
        }

        if (/\/api\/v2$/i.test(normalizedBaseUrl)) {
            pushUrl(`${normalizedBaseUrl}/torrents/search`);
            return urls;
        }

        if (/\/api\/proxy\/[^/]+$/i.test(normalizedBaseUrl)) {
            pushUrl(`${normalizedBaseUrl}/api/v2/torrents/search`);
            return urls;
        }

        pushUrl(`${normalizedBaseUrl}/proxy/${token}/api/v2/torrents/search`);
        return urls;
    }

    function buildProxySearchUrl(qbtProxySearchBaseUrl, quiFilters) {
        const queryParts = [
            'sort=added_on',
            'reverse=true',
            'limit=100'
        ];

        if (quiFilters.excludeStatus && quiFilters.excludeStatus.length > 0) {
            queryParts.push(`filter=${encodeURIComponent(quiFilters.excludeStatus.join(','))}`);
        }

        if (quiFilters.categories && quiFilters.categories.length > 0) {
            queryParts.push(`category=${encodeURIComponent(quiFilters.categories.join(','))}`);
        }

        if (quiFilters.tags && quiFilters.tags.length > 0) {
            queryParts.push(`tag=${encodeURIComponent(quiFilters.tags.join(','))}`);
        }

        return `${qbtProxySearchBaseUrl}?${queryParts.join('&')}`;
    }

    function parseSearchResults(responseText) {
        try {
            const parsed = JSON.parse(responseText || '[]');
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && Array.isArray(parsed.torrents)) {
                return parsed.torrents;
            }
            return [];
        } catch {
            return [];
        }
    }

    function queryProxyTorrentSearch(config, quiFilters) {
        return new Promise((resolve, reject) => {
            const token = String(config.token || '').trim();
            if (!token) {
                reject(new Error('Missing proxy token. Set qUI token in settings.'));
                return;
            }

            const proxyUrls = buildProxySearchCandidateUrls(config.baseUrl, token);
            if (proxyUrls.length === 0) {
                reject(new Error('Missing proxy base URL or token. Set qUI base URL and token in settings.'));
                return;
            }

            const attemptedUrls = [];

            const tryGet = (endpointIndex) => {
                const searchBaseUrl = proxyUrls[endpointIndex];
                const url = buildProxySearchUrl(searchBaseUrl, quiFilters);
                attemptedUrls.push(url);
                console.log(`[OPS Album FL Proxy Queue] Searching qBittorrent via proxy: ${url}`);

                GM_xmlhttpRequest({
                    url,
                    method: 'GET',
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(parseSearchResults(response.responseText));
                            return;
                        }

                        if ((response.status === 401 || response.status === 403 || response.status === 404) && endpointIndex < proxyUrls.length - 1) {
                            tryGet(endpointIndex + 1);
                            return;
                        }

                        reject(new Error(`Proxy search failed with status ${response.status} at ${url}: ${response.responseText || ''}${attemptedUrls.length > 1 ? ` (attempted: ${attemptedUrls.join(' | ')})` : ''}`));
                    },
                    onerror: () => {
                        if (endpointIndex < proxyUrls.length - 1) {
                            tryGet(endpointIndex + 1);
                            return;
                        }
                        reject(new Error(`Proxy search request error at ${url}${attemptedUrls.length > 1 ? ` (attempted: ${attemptedUrls.join(' | ')})` : ''}`));
                    }
                });
            };

            tryGet(0);
        });
    }

    function normalizeTorrentProgress(result) {
        const progressValue = Number(result?.progress);
        if (Number.isFinite(progressValue)) {
            if (progressValue <= 1) {
                return Math.max(0, Math.min(100, progressValue * 100));
            }
            return Math.max(0, Math.min(100, progressValue));
        }
        if (Number(result?.amount_left) === 0) {
            return 100;
        }
        return 0;
    }

    function extractTorrentIdsFromComment(commentValue) {
        const text = String(commentValue || '').trim();
        if (!text) return [];

        const found = new Set();

        const queryIdPattern = /[?&](?:torrentid|id)=(\d+)/ig;
        let queryMatch;
        while ((queryMatch = queryIdPattern.exec(text)) !== null) {
            if (queryMatch[1]) {
                found.add(queryMatch[1]);
            }
        }

        const directMatch = text.match(/[?&]torrentid=(\d+)/i);
        if (directMatch) {
            found.add(directMatch[1]);
        }

        const torrentPathPattern = /\/torrents?\/?(\d+)/ig;
        let pathMatch;
        while ((pathMatch = torrentPathPattern.exec(text)) !== null) {
            if (pathMatch[1]) {
                found.add(pathMatch[1]);
            }
        }

        return Array.from(found);
    }

    function commentContainsTorrentId(commentValue, torrentId) {
        const target = String(torrentId || '').trim();
        if (!target) return false;

        const rawComment = String(commentValue || '');
        if (!rawComment) return false;

        if (rawComment.includes(target)) {
            return true;
        }

        try {
            const decoded = decodeURIComponent(rawComment);
            if (decoded.includes(target)) {
                return true;
            }
        } catch {
            // ignore decode failures and continue to structured parsing fallback
        }

        return extractTorrentIdsFromComment(rawComment).includes(target);
    }

    function pickBestSearchResult(results, albumName, torrentId) {
        if (!Array.isArray(results) || results.length === 0) {
            return null;
        }

        const targetTorrentId = String(torrentId || '').trim();
        if (targetTorrentId) {
            const commentIdsByResult = results.map((item) => ({
                item,
                name: String(item?.name || '').trim(),
                ids: extractTorrentIdsFromComment(item?.comment)
            }));
            const byCommentTorrentId = commentIdsByResult.find((entry) => commentContainsTorrentId(entry.item?.comment, targetTorrentId));
            if (!byCommentTorrentId) {
                console.warn(`[OPS Album Handler][qUI] Search returned ${results.length} result(s) but no comment ID match for torrentId=${targetTorrentId} (album="${String(albumName || '').trim()}"). Extracted IDs: ${JSON.stringify(commentIdsByResult.slice(0, 10))}`);
            }
            return byCommentTorrentId ? byCommentTorrentId.item : null;
        }

        const normalizedAlbum = String(albumName || '').trim().toLowerCase();
        const withSortData = results.map((item) => {
            const name = String(item?.name || '').toLowerCase();
            const albumHit = normalizedAlbum && name.includes(normalizedAlbum) ? 1 : 0;
            const addedOn = Number(item?.added_on) || 0;
            return { item, albumHit, addedOn };
        });

        withSortData.sort((a, b) => {
            if (a.albumHit !== b.albumHit) return b.albumHit - a.albumHit;
            return b.addedOn - a.addedOn;
        });

        return withSortData[0]?.item || null;
    }

    let downloadStatusPollTimer = null;
    let downloadStatusPollState = null;
    let redStatusByReleaseKey = new Map();

    function clearDownloadStatusPolling() {
        if (downloadStatusPollTimer) {
            clearInterval(downloadStatusPollTimer);
            downloadStatusPollTimer = null;
        }
        downloadStatusPollState = null;
        redStatusByReleaseKey = new Map();
    }

    function removeExistingDownloadStatusPanel() {
        const existing = document.getElementById('ops-fl-proxy-download-status-panel');
        if (existing) {
            existing.remove();
        }
    }

    function removeExistingRedStatusPanel() {
        const existing = document.getElementById('ops-fl-proxy-red-status-panel');
        if (existing) {
            existing.remove();
        }
    }

    function renderDownloadStatusPanel(state) {
        const previewContainer = document.getElementById('ops-fl-proxy-preview-container');
        if (!previewContainer) {
            return;
        }

        let panel = document.getElementById('ops-fl-proxy-download-status-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'ops-fl-proxy-download-status-panel';
            panel.className = 'box pad';
            panel.style.marginTop = '10px';
            previewContainer.appendChild(panel);
        }

        const trackedItems = Array.isArray(state?.items) ? state.items : [];
        const completeCount = trackedItems.filter((item) => item.progressPercent >= 100).length;
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(state?.startedAt || Date.now())) / 1000));
        const statusLabel = String(state?.statusLabel || 'Idle');

        const rowsHtml = trackedItems
            .map((item) => `
                <tr class="torrent_row">
                    <td class="td_info">${escapeHtml(item.albumName || '')}</td>
                    <td class="td_info">${escapeHtml(item.state || 'unknown')}</td>
                    <td class="number_column m_td_right">${Number(item.progressPercent || 0).toFixed(1)}%</td>
                    <td class="td_info">${escapeHtml(item.lastUpdate || 'Waiting for first poll...')}</td>
                </tr>
            `)
            .join('');

        panel.innerHTML = `
            <table class="torrent_table grouped release_table m_table">
                <tr class="colhead_dark">
                    <td class="td_info" colspan="4">
                        Download Status (${completeCount}/${trackedItems.length} complete) - ${escapeHtml(statusLabel)} - elapsed ${elapsedSeconds}s
                    </td>
                </tr>
                <tr class="colhead">
                    <td class="td_info">Album</td>
                    <td class="td_info">State</td>
                    <td class="number_column m_td_right">Progress</td>
                    <td class="td_info">Last update</td>
                </tr>
                ${rowsHtml}
            </table>
        `;
    }

    function renderRedStatusPanel(state) {
        if (!state?.enableRedHandling) {
            removeExistingRedStatusPanel();
            return;
        }

        const previewContainer = document.getElementById('ops-fl-proxy-preview-container');
        if (!previewContainer) {
            return;
        }

        let panel = document.getElementById('ops-fl-proxy-red-status-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'ops-fl-proxy-red-status-panel';
            panel.className = 'box pad';
            panel.style.marginTop = '10px';
            previewContainer.appendChild(panel);
        }

        const trackedItems = Array.isArray(state?.items) ? state.items : [];
        const redRows = trackedItems
            .map((item) => {
                const redState = redStatusByReleaseKey.get(item.releaseKey) || {
                    addStatus: item.redTorrentId ? 'waiting' : 'not_available',
                    qbtState: '-',
                    progressPercent: 0,
                    lastUpdate: item.redTorrentId ? 'Waiting for OPS completion condition.' : 'No matching RED torrent id.'
                };

                return `
                    <tr class="torrent_row">
                        <td class="td_info">${escapeHtml(item.albumName || '')}</td>
                        <td class="td_info">${escapeHtml(item.redTorrentId || '-')}</td>
                        <td class="td_info">${escapeHtml(redState.addStatus || '-')}</td>
                        <td class="td_info">${escapeHtml(redState.qbtState || '-')}</td>
                        <td class="number_column m_td_right">${Number(redState.progressPercent || 0).toFixed(1)}%</td>
                        <td class="td_info">${escapeHtml(redState.lastUpdate || '-')}</td>
                    </tr>
                `;
            })
            .join('');

        panel.innerHTML = `
            <table class="torrent_table grouped release_table m_table">
                <tr class="colhead_dark">
                    <td class="td_info" colspan="6">RED Add Status</td>
                </tr>
                <tr class="colhead">
                    <td class="td_info">Album</td>
                    <td class="td_info">RED Torrent ID</td>
                    <td class="td_info">Add status</td>
                    <td class="td_info">qUI state</td>
                    <td class="number_column m_td_right">Progress</td>
                    <td class="td_info">Last update</td>
                </tr>
                ${redRows}
            </table>
        `;
    }

    function isReadyForRedAdd(item) {
        const state = String(item?.state || '').trim().toLowerCase();
        if (Number(item?.progressPercent || 0) < 100) return false;
        return state === 'stalledup' || state === 'seeding';
    }

    function getRedApiKey(config) {
        return String(config?.redApiKey || GM_getValue('RED_API_KEY', '') || '').trim();
    }

    function parseRedApiError(responseText) {
        try {
            const parsed = JSON.parse(responseText || '{}');
            const status = String(parsed?.status || '').trim().toLowerCase();
            const error = String(parsed?.error || parsed?.response || '').trim();
            if (status === 'failure' && error) {
                return error;
            }
            if (error) {
                return error;
            }
        } catch {
            // ignore parse failures and fall back to generic error handling
        }
        return '';
    }

    function downloadRedTorrentFile(redTorrentId, config) {
        return new Promise((resolve, reject) => {
            const torrentId = String(redTorrentId || '').trim();
            if (!/^\d+$/.test(torrentId)) {
                reject(new Error('Invalid RED torrent id.'));
                return;
            }

            const redApiKey = getRedApiKey(config);
            if (!redApiKey) {
                reject(new Error('Missing RED_API_KEY in userscript storage (set in OPS/RED add releases script).'));
                return;
            }

            const downloadUrl = `https://redacted.sh/ajax.php?action=download&id=${torrentId}&usetoken=0`;
            console.log(`[OPS Album Handler][RED] Downloading RED torrent file via API: ${downloadUrl}`);
            GM_xmlhttpRequest({
                url: downloadUrl,
                method: 'GET',
                headers: { Authorization: redApiKey },
                responseType: 'blob',
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const responseHeaders = String(response.responseHeaders || '');
                        const contentTypeHeader = responseHeaders.match(/content-type:\s*([^\r\n;]+)/i);
                        const contentType = String(contentTypeHeader?.[1] || '').trim().toLowerCase();
                        const blob = response.response;

                        if (contentType.includes('application/x-bittorrent') && blob instanceof Blob) {
                            resolve({
                                blob,
                                fileName: `red_${torrentId}.torrent`
                            });
                            return;
                        }

                        const apiError = parseRedApiError(String(response.responseText || ''));
                        reject(new Error(apiError || `RED download API did not return a torrent file for redTorrentId=${torrentId}.`));
                        return;
                    }

                    const apiError = parseRedApiError(String(response.responseText || ''));
                    console.error(`[OPS Album Handler][RED] Failed RED download API for redTorrentId=${torrentId} (status=${response.status}).`);
                    reject(new Error(apiError || `Failed to download RED torrent file (status ${response.status}).`));
                },
                onerror: (error) => reject(error)
            });
        });
    }

    async function addRedTorrentToProxy(config, item) {
        const redTorrentId = String(item.redTorrentId || '').trim();
        if (!redTorrentId) {
            throw new Error('Missing RED torrent id for auto-add.');
        }

        console.log(`[OPS Album Handler][RED] Preparing RED API-backed add for album="${item.albumName}" opsTorrentId=${item.torrentId} redTorrentId=${redTorrentId}.`);

        const redCategory = String(config.redCategory || '').trim() || String(config.category || '').trim();
        const redTags = String(config.redTags || '').trim() || String(config.tags || '').trim();
        const redPaused = sanitizePausedState(config.redPaused) || sanitizePausedState(config.paused);

        const extraFields = {
            savepath: String(config.savePath || '').trim(),
            category: redCategory,
            tags: redTags,
            paused: redPaused
        };

        if (config.redSkipChecking !== false) {
            extraFields.skip_checking = 'true';
        }

        const redTorrentFile = await downloadRedTorrentFile(redTorrentId, config);
        console.log(`[OPS Album Handler][RED] Downloaded RED torrent file via API for redTorrentId=${redTorrentId}; uploading file to qUI.`);
        await postTorrentFilesToProxyWithOptions(config, [redTorrentFile], {
            ...extraFields
        }, {
            includeDefaultFields: false
        });
        console.log(`[OPS Album Handler][RED] qUI accepted RED file upload for redTorrentId=${redTorrentId}.`);
    }

    async function pollDownloadStatusesOnce() {
        if (!downloadStatusPollState || !Array.isArray(downloadStatusPollState.items) || downloadStatusPollState.items.length === 0) {
            return;
        }

        if (downloadStatusPollState.isPolling) {
            return;
        }

        downloadStatusPollState.isPolling = true;

        const { config, quiFilters, redQuiFilters, items, enableRedHandling } = downloadStatusPollState;

        try {
            for (const item of items) {
                const results = await queryProxyTorrentSearch(config, quiFilters);
                const bestResult = pickBestSearchResult(results, item.albumName, item.torrentId);

                if (!bestResult) {
                    item.state = 'not_found';
                    item.lastUpdate = 'No matching qUI search results yet.';
                    console.warn(`[OPS Album Handler][OPS] No qUI comment match for opsTorrentId=${item.torrentId} (album="${item.albumName}").`);
                    continue;
                }

                const progressPercent = normalizeTorrentProgress(bestResult);
                item.progressPercent = progressPercent;
                item.state = String(bestResult.state || 'unknown');
                item.lastUpdate = String(bestResult.name || 'Matched');

                if (enableRedHandling) {
                    const existingRedStatus = redStatusByReleaseKey.get(item.releaseKey) || {
                        addStatus: item.redTorrentId ? 'waiting' : 'not_available',
                        qbtState: '-',
                        progressPercent: 0,
                        lastUpdate: item.redTorrentId ? 'Waiting for OPS completion condition.' : 'No matching RED torrent id.'
                    };

                    if (item.redTorrentId && existingRedStatus.addStatus === 'waiting' && isReadyForRedAdd(item)) {
                        console.log(`[OPS Album Handler][RED] Trigger condition met for redTorrentId=${item.redTorrentId} (ops progress=${item.progressPercent.toFixed(1)}%, state=${item.state}).`);
                        existingRedStatus.addStatus = 'adding';
                        existingRedStatus.lastUpdate = 'Submitting RED torrent to qUI with skip_checking=true...';
                        redStatusByReleaseKey.set(item.releaseKey, existingRedStatus);
                        renderRedStatusPanel(downloadStatusPollState);

                        try {
                            await addRedTorrentToProxy(config, item);
                            existingRedStatus.addStatus = 'submitted';
                            existingRedStatus.lastUpdate = 'Submitted to qUI.';
                        } catch (error) {
                            existingRedStatus.addStatus = 'failed';
                            existingRedStatus.lastUpdate = error && error.message ? error.message : 'RED add request failed';
                        }

                        redStatusByReleaseKey.set(item.releaseKey, existingRedStatus);
                    }

                    if (item.redTorrentId) {
                        const redStatus = redStatusByReleaseKey.get(item.releaseKey);
                        if (redStatus && redStatus.addStatus === 'submitted') {
                            const redResults = await queryProxyTorrentSearch(config, redQuiFilters);
                            const redResult = pickBestSearchResult(redResults, item.albumName, item.redTorrentId);

                            if (redResult) {
                                console.log(`[OPS Album Handler][RED] Tracking match found for redTorrentId=${item.redTorrentId}: state=${String(redResult.state || 'unknown')}, progress=${normalizeTorrentProgress(redResult).toFixed(1)}%, name="${String(redResult.name || '')}".`);
                            }

                            if (redResult) {
                                redStatus.qbtState = String(redResult.state || 'unknown');
                                redStatus.progressPercent = normalizeTorrentProgress(redResult);
                                redStatus.lastUpdate = String(redResult.name || 'Matched');
                            } else {
                                console.warn(`[OPS Album Handler][RED] No qUI comment match for redTorrentId=${item.redTorrentId} (album="${item.albumName}").`);
                                redStatus.lastUpdate = 'Submitted, waiting for qUI search visibility.';
                            }

                            redStatusByReleaseKey.set(item.releaseKey, redStatus);
                        }
                    }
                }
            }

            const now = Date.now();
            const elapsedMs = now - downloadStatusPollState.startedAt;
            const timeoutMs = downloadStatusPollState.maxMinutes * 60 * 1000;
            const allComplete = items.every((item) => {
                if (item.progressPercent < 100) {
                    return false;
                }

                if (!enableRedHandling || !item.redTorrentId) {
                    return true;
                }

                const redStatus = redStatusByReleaseKey.get(item.releaseKey);
                if (!redStatus) {
                    return false;
                }

                if (redStatus.addStatus === 'failed' || redStatus.addStatus === 'not_available') {
                    return true;
                }

                if (redStatus.addStatus === 'submitted') {
                    return Number(redStatus.progressPercent || 0) >= 100;
                }

                return false;
            });

            if (allComplete) {
                downloadStatusPollState.statusLabel = 'Completed';
                renderDownloadStatusPanel(downloadStatusPollState);
                renderRedStatusPanel(downloadStatusPollState);
                clearDownloadStatusPolling();
                return;
            }

            if (elapsedMs >= timeoutMs) {
                downloadStatusPollState.statusLabel = `Stopped at timeout (${downloadStatusPollState.maxMinutes}m)`;
                renderDownloadStatusPanel(downloadStatusPollState);
                renderRedStatusPanel(downloadStatusPollState);
                clearDownloadStatusPolling();
                return;
            }

            downloadStatusPollState.statusLabel = 'Polling every 5s';
            renderDownloadStatusPanel(downloadStatusPollState);
            renderRedStatusPanel(downloadStatusPollState);
        } finally {
            if (downloadStatusPollState) {
                downloadStatusPollState.isPolling = false;
            }
        }
    }

    function startDownloadStatusPolling(config, trackedItems) {
        clearDownloadStatusPolling();

        const maxMinutes = sanitizePollMaxMinutes(config.pollMaxMinutes);
        const items = trackedItems.map((item) => ({
            ...item,
            progressPercent: 0,
            state: 'queued',
            lastUpdate: 'Waiting for first poll...'
        }));

        const enableRedHandling = Boolean(config.waitEvent);
        redStatusByReleaseKey = enableRedHandling
            ? new Map(items.map((item) => [
                item.releaseKey,
                {
                    addStatus: item.redTorrentId ? 'waiting' : 'not_available',
                    qbtState: '-',
                    progressPercent: 0,
                    lastUpdate: item.redTorrentId ? 'Waiting for OPS completion condition.' : 'No matching RED torrent id.'
                }
            ]))
            : new Map();

        const quiFilters = {
            status: [],
            excludeStatus: ['unregistered', 'tracker_down'],
            categories: config.category ? [config.category] : [],
            excludeCategories: [],
            tags: parseCommaSeparatedList(config.tags),
            excludeTags: []
        };
        const redQuiFilters = {
            status: [],
            excludeStatus: ['unregistered', 'tracker_down'],
            categories: config.redCategory ? [config.redCategory] : (config.category ? [config.category] : []),
            excludeCategories: [],
            tags: parseCommaSeparatedList(config.redTags || config.tags),
            excludeTags: []
        };

        downloadStatusPollState = {
            config,
            items,
            quiFilters,
            redQuiFilters,
            enableRedHandling,
            startedAt: Date.now(),
            maxMinutes,
            statusLabel: 'Starting...'
        };

        renderDownloadStatusPanel(downloadStatusPollState);
        renderRedStatusPanel(downloadStatusPollState);

        pollDownloadStatusesOnce().catch((error) => {
            if (downloadStatusPollState) {
                downloadStatusPollState.statusLabel = `Failed: ${error && error.message ? error.message : 'request error'}`;
                renderDownloadStatusPanel(downloadStatusPollState);
                renderRedStatusPanel(downloadStatusPollState);
            }
            clearDownloadStatusPolling();
        });

        downloadStatusPollTimer = setInterval(() => {
            pollDownloadStatusesOnce().catch((error) => {
                if (downloadStatusPollState) {
                    downloadStatusPollState.statusLabel = `Failed: ${error && error.message ? error.message : 'request error'}`;
                    renderDownloadStatusPanel(downloadStatusPollState);
                    renderRedStatusPanel(downloadStatusPollState);
                }
                clearDownloadStatusPolling();
            });
        }, DOWNLOAD_STATUS_POLL_INTERVAL_MS);
    }

    function getDiscogTableAnchor() {
        const discog = document.getElementById('discog_table');
        if (!discog) return null;
        return discog.querySelector('table.torrent_table.grouped.release_table.m_table');
    }

    function getDiscogReleaseTypeOptions() {
        const links = Array.from(document.querySelectorAll('#discog_table .box.center a[href^="#torrents_"]'));
        const options = links
            .map((link) => {
                const href = link.getAttribute('href') || '';
                const id = href.startsWith('#') ? href.slice(1) : '';
                if (!id) return null;
                const label = (link.textContent || '').trim() || id;
                return { id, label };
            })
            .filter((item) => item && item.id);

        if (options.length > 0) {
            return options;
        }

        return [{ id: DEFAULTS.targetSectionId, label: 'Albums' }];
    }

    function removeExistingPanel() {
        const existing = document.getElementById('ops-fl-proxy-config-panel');
        if (existing) {
            existing.remove();
        }
    }

    function removeExistingPreview() {
        clearDownloadStatusPolling();

        const existing = document.getElementById('ops-fl-proxy-preview-table');
        if (existing) {
            existing.remove();
        }

        removeExistingDownloadStatusPanel();
        removeExistingRedStatusPanel();
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function renderControlPanel() {
        removeExistingPanel();

        const anchorTable = getDiscogTableAnchor();
        if (!anchorTable) {
            return;
        }

        const config = getConfig();
        const releaseTypeOptions = getDiscogReleaseTypeOptions();
        const availableSectionIds = new Set(releaseTypeOptions.map((option) => option.id));
        const selectedSectionId = availableSectionIds.has(config.targetSectionId)
            ? config.targetSectionId
            : (releaseTypeOptions[0]?.id || DEFAULTS.targetSectionId);
        const panel = document.createElement('details');
        panel.id = 'ops-fl-proxy-config-panel';
        panel.className = 'box pad';

        const releaseTypeOptionsHtml = releaseTypeOptions
            .map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === selectedSectionId ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
            .join('');

        const tieBreakerOptionsHtml = MATCH_TIE_BREAKER_OPTIONS
            .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === config.matchTieBreaker ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
            .join('');

        const tieBreakerDirectionOptionsHtml = MATCH_TIE_BREAKER_DIRECTION_OPTIONS
            .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === config.matchTieBreakerDirection ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
            .join('');

        const displayBaseUrl = config.baseUrl ? REDACTED_VALUE : '';
        const displayToken = config.token ? REDACTED_VALUE : '';
        const displaySavePath = config.savePath ? REDACTED_VALUE : '';
        const displayCategory = config.category || '';
        const displayTags = config.tags || '';
        const displayRedCategory = config.redCategory || '';
        const displayRedTags = config.redTags || '';
        const displayRedApiKey = config.redApiKey ? REDACTED_VALUE : '';
        const displayRedPaused = config.redPaused || '';
        const displayRedSkipChecking = Boolean(config.redSkipChecking);
        const displayPaused = config.paused || '';
        const displayInstanceId = config.instanceId || '';
        const displayPollMaxMinutes = sanitizePollMaxMinutes(config.pollMaxMinutes);

        const mediaRows = MEDIA_OPTIONS
            .map((option) => {
                const currentRank = config.mediaOrder.indexOf(option.key) + 1;
                const rankOptions = MEDIA_OPTIONS
                    .map((_, index) => `<option value="${index + 1}" ${currentRank === index + 1 ? 'selected' : ''}>${index + 1}</option>`)
                    .join('');

                return `
                    <tr>
                        <td style="padding:3px 8px 3px 0;"><input type="checkbox" data-media-enable-key="${option.key}" ${config.mediaEnabled[option.key] ? 'checked' : ''}></td>
                        <td style="padding:3px 8px 3px 0;">${escapeHtml(option.label)}</td>
                        <td style="padding:3px 0;">
                            <select data-media-order-key="${option.key}">${rankOptions}</select>
                        </td>
                    </tr>
                `;
            })
            .join('');

        const formatRows = FORMAT_OPTIONS
            .map((option) => {
                const currentRank = config.formatOrder.indexOf(option.key) + 1;
                const rankOptions = FORMAT_OPTIONS
                    .map((_, index) => `<option value="${index + 1}" ${currentRank === index + 1 ? 'selected' : ''}>${index + 1}</option>`)
                    .join('');

                return `
                    <tr>
                        <td style="padding:3px 8px 3px 0;"><input type="checkbox" data-format-enable-key="${option.key}" ${config.formatEnabled[option.key] ? 'checked' : ''}></td>
                        <td style="padding:3px 8px 3px 0;">${escapeHtml(option.label)}</td>
                        <td style="padding:3px 0;">
                            <select data-format-order-key="${option.key}">${rankOptions}</select>
                        </td>
                    </tr>
                `;
            })
            .join('');

        const bitrateRows = BITRATE_OPTIONS
            .map((option) => {
                const currentRank = config.bitrateOrder.indexOf(option.key) + 1;
                const rankOptions = BITRATE_OPTIONS
                    .map((_, index) => `<option value="${index + 1}" ${currentRank === index + 1 ? 'selected' : ''}>${index + 1}</option>`)
                    .join('');

                return `
                    <tr>
                        <td style="padding:3px 8px 3px 0;"><input type="checkbox" data-bitrate-enable-key="${option.key}" ${config.bitrateEnabled[option.key] ? 'checked' : ''}></td>
                        <td style="padding:3px 8px 3px 0;">${escapeHtml(option.label)}</td>
                        <td style="padding:3px 0;">
                            <select data-bitrate-order-key="${option.key}">${rankOptions}</select>
                        </td>
                    </tr>
                `;
            })
            .join('');

        panel.innerHTML = `
            <summary><strong>OPS Album Handler</strong></summary>
            <div style="margin-top:10px;">
                <details id="ops-fl-proxy-settings-section">
                    <summary><strong>Config / Settings</strong></summary>
                    <div style="margin-top:10px;">
                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
                            <label>Target release type: <select id="ops-fl-proxy-target-section">${releaseTypeOptionsHtml}</select></label>
                            <label>Candidate tie-breaker: <select id="ops-fl-proxy-match-tie-breaker">${tieBreakerOptionsHtml}</select></label>
                            <label>Tie-breaker direction: <select id="ops-fl-proxy-match-tie-breaker-direction">${tieBreakerDirectionOptionsHtml}</select></label>
                            <label>qUI base URL: <input type="text" id="ops-fl-proxy-base-url" value="${escapeHtml(displayBaseUrl)}" style="min-width:220px;"></label>
                            <label>Token: <input type="text" id="ops-fl-proxy-token" value="${escapeHtml(displayToken)}" style="min-width:220px;"></label>
                            <label>savePath: <input type="text" id="ops-fl-proxy-save-path" value="${escapeHtml(displaySavePath)}" style="min-width:220px;"></label>
                            <label>category: <input type="text" id="ops-fl-proxy-category" value="${escapeHtml(displayCategory)}" style="min-width:120px;"></label>
                            <label>tags: <input type="text" id="ops-fl-proxy-tags" value="${escapeHtml(displayTags)}" style="min-width:180px;"></label>
                            <label>paused: <select id="ops-fl-proxy-paused"><option value="" ${displayPaused === '' ? 'selected' : ''}>omit</option><option value="true" ${displayPaused === 'true' ? 'selected' : ''}>true</option><option value="false" ${displayPaused === 'false' ? 'selected' : ''}>false</option></select></label>
                            <label>instanceId: <input type="number" id="ops-fl-proxy-instance-id" value="${escapeHtml(displayInstanceId)}" min="0" step="1" style="width:90px;"></label>
                            <label>Max poll time (minutes): <input type="number" id="ops-fl-proxy-poll-max-minutes" value="${escapeHtml(displayPollMaxMinutes)}" min="1" step="1" style="width:90px;"></label>
                            <label><input type="checkbox" id="ops-fl-proxy-wait-event" ${config.waitEvent ? 'checked' : ''}> Wait for ${EVENT_NAME}</label>
                        </div>

                        <details id="ops-fl-proxy-red-section" style="margin-top:8px;">
                            <summary><strong>RED Torrent Add Settings</strong></summary>
                            <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                                <label>RED category: <input type="text" id="ops-fl-proxy-red-category" value="${escapeHtml(displayRedCategory)}" style="min-width:120px;"></label>
                                <label>RED tags: <input type="text" id="ops-fl-proxy-red-tags" value="${escapeHtml(displayRedTags)}" style="min-width:180px;"></label>
                                <label>RED API key: <input type="text" id="ops-fl-proxy-red-api-key" value="${escapeHtml(displayRedApiKey)}" style="min-width:260px;"></label>
                                <label>RED paused: <select id="ops-fl-proxy-red-paused"><option value="" ${displayRedPaused === '' ? 'selected' : ''}>use OPS/default</option><option value="true" ${displayRedPaused === 'true' ? 'selected' : ''}>true</option><option value="false" ${displayRedPaused === 'false' ? 'selected' : ''}>false</option></select></label>
                                <label><input type="checkbox" id="ops-fl-proxy-red-skip-checking" ${displayRedSkipChecking ? 'checked' : ''}> RED skip recheck (skip_checking=true)</label>
                            </div>
                        </details>

                        <details id="ops-fl-proxy-media-section">
                            <summary><strong>Media Priority (first)</strong></summary>
                            <table style="margin-top:8px;">
                                <tr><td style="padding:3px 8px 3px 0;"><strong>Use</strong></td><td style="padding:3px 8px 3px 0;"><strong>Media</strong></td><td><strong>Rank</strong></td></tr>
                                ${mediaRows}
                            </table>
                        </details>

                        <details id="ops-fl-proxy-format-section" style="margin-top:8px;">
                            <summary><strong>Format Priority (within selected media)</strong></summary>
                            <table style="margin-top:8px;">
                                <tr><td style="padding:3px 8px 3px 0;"><strong>Use</strong></td><td style="padding:3px 8px 3px 0;"><strong>Format</strong></td><td><strong>Rank</strong></td></tr>
                                ${formatRows}
                            </table>
                        </details>

                        <details id="ops-fl-proxy-bitrate-section" style="margin-top:8px;">
                            <summary><strong>Bitrate Priority (within selected media/format)</strong></summary>
                            <table style="margin-top:8px;">
                                <tr><td style="padding:3px 8px 3px 0;"><strong>Use</strong></td><td style="padding:3px 8px 3px 0;"><strong>Bitrate</strong></td><td><strong>Rank</strong></td></tr>
                                ${bitrateRows}
                            </table>
                        </details>

                        <div style="margin-top:10px; display:flex; gap:8px; align-items:center;">
                            <button type="button" id="ops-fl-proxy-save-config">Save settings</button>
                            <button type="button" id="ops-fl-proxy-rescan">Rescan now</button>
                            <button type="button" id="ops-fl-proxy-reset-priority">Reset media/format/bitrate priorities</button>
                            <button type="button" id="ops-fl-proxy-reset-sent-cache">Reset sent cache (artist/type)</button>
                            <span id="ops-fl-proxy-config-status"></span>
                        </div>
                    </div>
                </details>
                <div id="ops-fl-proxy-preview-container" style="margin-top:12px;"></div>
            </div>
        `;

        anchorTable.parentNode.insertBefore(panel, anchorTable);

        const status = panel.querySelector('#ops-fl-proxy-config-status');
        const saveButton = panel.querySelector('#ops-fl-proxy-save-config');
        const rescanButton = panel.querySelector('#ops-fl-proxy-rescan');
        const resetButton = panel.querySelector('#ops-fl-proxy-reset-priority');
        const resetSentCacheButton = panel.querySelector('#ops-fl-proxy-reset-sent-cache');

        const gatherOrderedKeys = (selector, datasetKey, defaults) => {
            const rows = Array.from(panel.querySelectorAll(selector));
            const withRank = rows.map((select, index) => ({
                key: select.dataset[datasetKey] || '',
                rank: Number(select.value),
                stableIndex: index
            }));

            withRank.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                return a.stableIndex - b.stableIndex;
            });

            return sanitizeOrder(withRank.map((item) => item.key), defaults);
        };

        const gatherEnabledMap = (selector, datasetKey, defaults) => {
            const map = {};
            const boxes = Array.from(panel.querySelectorAll(selector));
            boxes.forEach((box) => {
                const key = box.dataset[datasetKey] || '';
                if (key) {
                    map[key] = Boolean(box.checked);
                }
            });
            return sanitizeEnabledMap(map, defaults);
        };

        if (saveButton && status) {
            saveButton.addEventListener('click', () => {
                const resolveSensitiveValue = (inputSelector, existingValue) => {
                    const rawValue = String(panel.querySelector(inputSelector)?.value || '').trim();
                    if (rawValue === REDACTED_VALUE) {
                        return existingValue;
                    }
                    return rawValue;
                };

                const newConfig = {
                    baseUrl: resolveSensitiveValue('#ops-fl-proxy-base-url', config.baseUrl).replace(/\/$/, ''),
                    token: resolveSensitiveValue('#ops-fl-proxy-token', config.token),
                    savePath: resolveSensitiveValue('#ops-fl-proxy-save-path', config.savePath),
                    category: String(panel.querySelector('#ops-fl-proxy-category')?.value || '').trim(),
                    tags: String(panel.querySelector('#ops-fl-proxy-tags')?.value || '').trim(),
                    redCategory: String(panel.querySelector('#ops-fl-proxy-red-category')?.value || '').trim(),
                    redTags: String(panel.querySelector('#ops-fl-proxy-red-tags')?.value || '').trim(),
                    redApiKey: resolveSensitiveValue('#ops-fl-proxy-red-api-key', config.redApiKey),
                    redPaused: sanitizePausedState(panel.querySelector('#ops-fl-proxy-red-paused')?.value || ''),
                    redSkipChecking: Boolean(panel.querySelector('#ops-fl-proxy-red-skip-checking')?.checked),
                    paused: sanitizePausedState(panel.querySelector('#ops-fl-proxy-paused')?.value || ''),
                    instanceId: sanitizeInstanceId(panel.querySelector('#ops-fl-proxy-instance-id')?.value || ''),
                    pollMaxMinutes: sanitizePollMaxMinutes(panel.querySelector('#ops-fl-proxy-poll-max-minutes')?.value || DEFAULTS.pollMaxMinutes),
                    waitEvent: Boolean(panel.querySelector('#ops-fl-proxy-wait-event')?.checked),
                    targetSectionId: sanitizeTargetSectionId(panel.querySelector('#ops-fl-proxy-target-section')?.value || ''),
                    matchTieBreaker: sanitizeMatchTieBreaker(panel.querySelector('#ops-fl-proxy-match-tie-breaker')?.value || DEFAULTS.matchTieBreaker),
                    matchTieBreakerDirection: sanitizeMatchTieBreakerDirection(panel.querySelector('#ops-fl-proxy-match-tie-breaker-direction')?.value || DEFAULTS.matchTieBreakerDirection),
                    mediaOrder: gatherOrderedKeys('select[data-media-order-key]', 'mediaOrderKey', DEFAULT_MEDIA_ORDER),
                    formatOrder: gatherOrderedKeys('select[data-format-order-key]', 'formatOrderKey', DEFAULT_FORMAT_ORDER),
                    bitrateOrder: gatherOrderedKeys('select[data-bitrate-order-key]', 'bitrateOrderKey', DEFAULT_BITRATE_ORDER),
                    mediaEnabled: gatherEnabledMap('input[data-media-enable-key]', 'mediaEnableKey', DEFAULT_MEDIA_ORDER),
                    formatEnabled: gatherEnabledMap('input[data-format-enable-key]', 'formatEnableKey', DEFAULT_FORMAT_ORDER),
                    bitrateEnabled: gatherEnabledMap('input[data-bitrate-enable-key]', 'bitrateEnableKey', DEFAULT_BITRATE_ORDER)
                };

                setConfig(newConfig);
                status.textContent = 'Saved.';
                globalThis.location.reload();
            });
        }

        if (rescanButton && status) {
            rescanButton.addEventListener('click', () => {
                run('panel-rescan').catch((error) => {
                    console.error('[OPS Album FL Proxy Queue] Rescan failed:', error);
                });
            });
        }

        if (resetButton && status) {
            resetButton.addEventListener('click', () => {
                const mediaSelects = Array.from(panel.querySelectorAll('select[data-media-order-key]'));
                mediaSelects.forEach((select, index) => {
                    select.value = String(index + 1);
                });

                const formatSelects = Array.from(panel.querySelectorAll('select[data-format-order-key]'));
                formatSelects.forEach((select, index) => {
                    select.value = String(index + 1);
                });

                const bitrateSelects = Array.from(panel.querySelectorAll('select[data-bitrate-order-key]'));
                bitrateSelects.forEach((select, index) => {
                    select.value = String(index + 1);
                });

                const mediaChecks = Array.from(panel.querySelectorAll('input[data-media-enable-key]'));
                mediaChecks.forEach((checkbox) => {
                    checkbox.checked = true;
                });

                const formatChecks = Array.from(panel.querySelectorAll('input[data-format-enable-key]'));
                formatChecks.forEach((checkbox) => {
                    checkbox.checked = true;
                });

                const bitrateChecks = Array.from(panel.querySelectorAll('input[data-bitrate-enable-key]'));
                bitrateChecks.forEach((checkbox) => {
                    checkbox.checked = true;
                });

                status.textContent = 'Default media/format/bitrate priorities restored (click Save settings).';
            });
        }

        if (resetSentCacheButton && status) {
            resetSentCacheButton.addEventListener('click', () => {
                const selectedSectionId = sanitizeTargetSectionId(panel.querySelector('#ops-fl-proxy-target-section')?.value || DEFAULTS.targetSectionId);
                const contextKey = getSentCacheContextKey(getArtistIdFromPage(), selectedSectionId);
                clearSentReleasesCacheForContext(contextKey);
                status.textContent = `Cleared sent cache for ${selectedSectionId}.`;

                run('panel-rescan').catch((error) => {
                    console.error('[OPS Album FL Proxy Queue] Rescan failed:', error);
                });
            });
        }
    }

    function renderPreviewTable(selected, config, reason, contextKey) {
        removeExistingPreview();

        const previewContainer = document.getElementById('ops-fl-proxy-preview-container');
        if (!previewContainer) {
            console.warn('[OPS Album FL Proxy Queue] Could not locate preview container in settings panel.');
            return;
        }

        const previewTable = document.createElement('table');
        previewTable.id = 'ops-fl-proxy-preview-table';
        previewTable.className = 'torrent_table grouped release_table m_table';

        const sentCache = getSentReleasesCacheForContext(contextKey);
        const defaultSelectedCount = selected.filter((entry) => !sentCache[makeReleaseCacheKey(entry)]).length;
        const selectedByReleaseKey = new Map(selected.map((entry) => [makeReleaseCacheKey(entry), entry]));

        const rowsHtml = selected
            .map((entry) => {
                const releaseKey = makeReleaseCacheKey(entry);
                const wasSent = Boolean(sentCache[releaseKey]);

                return `
                <tr class="torrent_row">
                    <td class="center"><input type="checkbox" class="ops-fl-result-select" value="${escapeHtml(releaseKey)}" data-url="${escapeHtml(entry.flTokenUrl)}" ${wasSent ? '' : 'checked'} ${wasSent ? 'disabled' : ''}></td>
                    <td class="td_info">${escapeHtml(entry.albumName)}</td>
                    <td class="td_info">${escapeHtml(entry.releaseType)} (${escapeHtml(getMediaLabel(entry.mediaKey))} / ${escapeHtml(getFormatLabel(entry.formatKey))} / ${escapeHtml(getBitrateLabel(entry.bitrateKey))})${wasSent ? ' <strong class="torrent_label tl_notice">Already sent</strong>' : ''}</td>
                    <td class="number_column m_td_right td_seeders">${entry.seeders}</td>
                </tr>
            `;
            })
            .join('');

        previewTable.innerHTML = `
            <tr class="colhead_dark">
                <td class="td_info" colspan="4">
                    OPS Album FL Proxy Queue Preview (${defaultSelectedCount} selected / ${selected.length} total) - Trigger: ${reason}
                </td>
            </tr>
            <tr class="colhead">
                <td class="center">Use</td>
                <td class="td_info">Album</td>
                <td class="td_info">Release Type</td>
                <td class="number_column m_td_right">Seeders</td>
            </tr>
            ${rowsHtml}
            <tr class="torrent_row">
                <td class="td_info" colspan="4">
                    <button type="button" id="ops-fl-proxy-select-all-btn">Select all</button>
                    <button type="button" id="ops-fl-proxy-select-none-btn">Select none</button>
                    <button type="button" id="ops-fl-proxy-send-btn">Send selected to qUI proxy</button>
                    <span id="ops-fl-proxy-send-status" style="margin-left:10px;"></span>
                </td>
            </tr>
        `;

        previewContainer.appendChild(previewTable);

        const selectAllButton = document.getElementById('ops-fl-proxy-select-all-btn');
        const selectNoneButton = document.getElementById('ops-fl-proxy-select-none-btn');
        const button = document.getElementById('ops-fl-proxy-send-btn');
        const status = document.getElementById('ops-fl-proxy-send-status');
        if (!button || !status) {
            return;
        }

        if (selectAllButton) {
            selectAllButton.addEventListener('click', () => {
                const checkboxes = Array.from(previewTable.querySelectorAll('.ops-fl-result-select'));
                checkboxes.forEach((checkbox) => {
                    if (!checkbox.disabled) {
                        checkbox.checked = true;
                    }
                });
            });
        }

        if (selectNoneButton) {
            selectNoneButton.addEventListener('click', () => {
                const checkboxes = Array.from(previewTable.querySelectorAll('.ops-fl-result-select'));
                checkboxes.forEach((checkbox) => {
                    checkbox.checked = false;
                });
            });
        }

        button.addEventListener('click', async () => {
            if (button.disabled) return;

            const selectedCheckboxes = Array.from(previewTable.querySelectorAll('.ops-fl-result-select:checked'));
            const sentCacheLatest = getSentReleasesCacheForContext(contextKey);
            const releasesToSend = selectedCheckboxes
                .map((checkbox) => ({
                    releaseKey: checkbox.value,
                    url: checkbox.dataset.url || ''
                }))
                .filter((item) => item.url)
                .filter((item) => !sentCacheLatest[item.releaseKey]);

            const urls = Array.from(new Set(releasesToSend.map((item) => item.url)));
            if (urls.length === 0) {
                status.textContent = 'No new selected FL token URLs to submit.';
                return;
            }

            if (!config.baseUrl || !config.token) {
                status.textContent = 'Missing proxy base URL or token. Use menu config.';
                return;
            }

            button.disabled = true;
            status.textContent = 'Sending...';

            try {
                await postToProxy(config, urls);
                const updatedCache = getSentReleasesCacheForContext(contextKey);
                releasesToSend.forEach((item) => {
                    updatedCache[item.releaseKey] = {
                        timestamp: Date.now(),
                        url: item.url
                    };
                });
                setSentReleasesCacheForContext(contextKey, updatedCache);

                const submittedKeys = new Set(releasesToSend.map((item) => item.releaseKey));
                const checkboxes = Array.from(previewTable.querySelectorAll('.ops-fl-result-select'));
                checkboxes.forEach((checkbox) => {
                    if (submittedKeys.has(checkbox.value)) {
                        checkbox.checked = false;
                        checkbox.disabled = true;
                    }
                });

                const trackedItems = releasesToSend
                    .map((item) => {
                        const releaseMeta = selectedByReleaseKey.get(item.releaseKey);
                        if (!releaseMeta) return null;

                        return {
                            releaseKey: item.releaseKey,
                            albumName: releaseMeta.albumName,
                            artistName: releaseMeta.artistName || getArtistNameFromPage(),
                            torrentId: releaseMeta.torrentId,
                            redTorrentId: releaseMeta.redTorrentId,
                            redGroupId: releaseMeta.redGroupId
                        };
                    })
                    .filter(Boolean);

                if (trackedItems.length > 0) {
                    startDownloadStatusPolling(config, trackedItems);
                }

                status.textContent = `Submitted ${urls.length} URLs.`;
                console.log(`[OPS Album FL Proxy Queue] Submitted ${urls.length} FL token URLs to proxy.`);
            } catch (error) {
                status.textContent = `Failed: ${error && error.message ? error.message : 'request error'}`;
                console.error('[OPS Album FL Proxy Queue] Proxy submit failed:', error);
            } finally {
                button.disabled = false;
            }
        });
    }

    async function run(reason) {
        const config = getConfig();
        const artistName = getArtistNameFromPage();
        const mediaRankMap = getRankMap(config.mediaOrder);
        const formatRankMap = getRankMap(config.formatOrder);
        const bitrateRankMap = getRankMap(config.bitrateOrder);
        const selectionConfig = {
            mediaRankMap,
            formatRankMap,
            bitrateRankMap,
            mediaEnabled: config.mediaEnabled,
            formatEnabled: config.formatEnabled,
            bitrateEnabled: config.bitrateEnabled
        };
        const requireRedMatch = Boolean(config.waitEvent);
        const targetSectionId = sanitizeTargetSectionId(config.targetSectionId);
        const targetLabel = getDiscogReleaseTypeOptions().find((item) => item.id === targetSectionId)?.label || targetSectionId;
        const artistId = getArtistIdFromPage();
        const cacheContextKey = getSentCacheContextKey(artistId, targetSectionId);

        const sectionRows = getSectionRows(targetSectionId);
        if (sectionRows.length === 0) {
            console.warn(`[OPS Album FL Proxy Queue] No rows found under #${targetSectionId}.`);
            return;
        }

        const candidatesByGroup = collectCandidatesByGroup(sectionRows, selectionConfig, requireRedMatch);
        if (candidatesByGroup.size === 0) {
            console.log(`[OPS Album FL Proxy Queue] No eligible candidates found (${requireRedMatch ? 'requires RED match + file count match' : 'OPS-only mode'} + OPS FL token link + enabled media/format/bitrate filters).`);
            return;
        }

        const selected = [];
        for (const [, candidates] of candidatesByGroup) {
            const winner = chooseBestCandidate(candidates, config.matchTieBreaker, config.matchTieBreakerDirection);
            if (winner) {
                winner.artistName = artistName;
                selected.push(winner);
            }
        }

        if (selected.length === 0) {
            console.log('[OPS Album FL Proxy Queue] No winners selected after ranking.');
            return;
        }

        selected.sort((a, b) => a.albumName.localeCompare(b.albumName));
        renderPreviewTable(selected, config, reason, cacheContextKey);
        console.log(`[OPS Album FL Proxy Queue] Prepared ${selected.length} selections for ${targetLabel}. Waiting for manual submit.`);
    }

    renderControlPanel();

    const config = getConfig();
    if (config.waitEvent) {
        document.addEventListener(EVENT_NAME, () => startOnce('event'), { once: true });
        console.log('[OPS Album FL Proxy Queue] Waiting for OPSaddREDreleasescomplete event.');
        return;
    }

    startOnce('immediate');
})();
