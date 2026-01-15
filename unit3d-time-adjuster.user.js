// ==UserScript==
// @name         UNIT3D Time Adjuster (UTC → User TZ)
// @version      1.0
// @description  Convert server UTC timestamps to a user-selected timezone.
// @author       Audionut
// @match        https://aither.cc/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'timeAdjuster.timeZone';
    const STORAGE_KEY_OVERWRITE_TEXT = 'timeAdjuster.overwriteText';
    const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const SETTINGS = {
        timeZone: getSavedTimeZone(),
        overwriteText: getSavedOverwriteText()
    };

    const MONTH_INDEX = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11
    };

    function getSavedTimeZone() {
        return GM_getValue(STORAGE_KEY, DEFAULT_TIMEZONE);
    }

    function setSavedTimeZone(tz) {
        GM_setValue(STORAGE_KEY, tz);
        SETTINGS.timeZone = tz;
    }

    function getSavedOverwriteText() {
        return GM_getValue(STORAGE_KEY_OVERWRITE_TEXT, false);
    }

    function setSavedOverwriteText(value) {
        GM_setValue(STORAGE_KEY_OVERWRITE_TEXT, Boolean(value));
        SETTINGS.overwriteText = Boolean(value);
    }

    function isValidTimeZone(tz) {
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
            return true;
        } catch (err) {
            return false;
        }
    }

    function promptForTimeZone() {
        const current = SETTINGS.timeZone || DEFAULT_TIMEZONE;
        const tz = window.prompt('Enter your IANA time zone (e.g., Europe/London, America/New_York):', current);
        if (!tz) return;
        const cleaned = tz.trim();
        if (!isValidTimeZone(cleaned)) {
            window.alert('Invalid time zone. Please use an IANA time zone like Europe/London.');
            return;
        }
        setSavedTimeZone(cleaned);
        updateAllTimes();
    }

    function formatInUserTz(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: SETTINGS.timeZone,
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        return formatter.format(date);
    }

    function parseUtcFromYmdHms(text) {
        const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})[ T]([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/.exec(text);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const hour = Number(match[4]);
        const minute = Number(match[5]);
        const second = Number(match[6] || 0);
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    function parseUtcFromMonthName(text) {
        const match = /^([A-Za-z]{3,})\s+([0-9]{1,2})\s+([0-9]{4})\s+([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/.exec(text);
        if (!match) return null;
        const monthName = match[1].toLowerCase();
        const month = MONTH_INDEX[monthName];
        if (typeof month !== 'number') return null;
        const day = Number(match[2]);
        const year = Number(match[3]);
        const hour = Number(match[4]);
        const minute = Number(match[5]);
        const second = Number(match[6] || 0);
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    function parseServerUtc(text) {
        if (!text) return null;
        const trimmed = text.trim();
        const normalized = trimmed.replace(/,/g, '');
        return parseUtcFromYmdHms(normalized) || parseUtcFromMonthName(normalized);
    }

    function timeAgoFrom(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 5) return 'just now';
        const units = [
            { label: 'year', seconds: 60 * 60 * 24 * 365 },
            { label: 'month', seconds: 60 * 60 * 24 * 30 },
            { label: 'week', seconds: 60 * 60 * 24 * 7 },
            { label: 'day', seconds: 60 * 60 * 24 },
            { label: 'hour', seconds: 60 * 60 },
            { label: 'minute', seconds: 60 },
            { label: 'second', seconds: 1 }
        ];

        const absSeconds = Math.abs(seconds);
        for (const unit of units) {
            if (absSeconds >= unit.seconds) {
                const count = Math.floor(absSeconds / unit.seconds);
                const suffix = count === 1 ? unit.label : `${unit.label}s`;
                return seconds >= 0 ? `${count} ${suffix} ago` : `in ${count} ${suffix}`;
            }
        }
        return 'just now';
    }

    function updateTimeElement(el) {
        if (el.dataset.timeAdjusterProcessed === '1') return;
        const original = el.getAttribute('datetime') || el.getAttribute('title') || el.textContent || '';
        const date = parseServerUtc(original);
        if (!date) return;
        const formatted = formatInUserTz(date);
        if (!formatted) return;

        if (el.hasAttribute('datetime')) {
            el.setAttribute('datetime', formatted);
        }
        if (el.hasAttribute('title')) {
            el.setAttribute('title', formatted);
        }
        if (SETTINGS.overwriteText) {
            el.textContent = formatted;
        }
        el.dataset.timeAdjusterProcessed = '1';
    }

    function updateKeyValueGroups() {
        const labelRegex = /\b(created at|added at|updated at|posted at|date)\b/i;
        const groups = document.querySelectorAll('.key-value__group');
        groups.forEach(group => {
            const dt = group.querySelector('dt');
            const dd = group.querySelector('dd');
            if (!dt || !dd) return;
            if (!labelRegex.test(dt.textContent || '')) return;
            if (dd.dataset.timeAdjusterProcessed === '1') return;

            const date = parseServerUtc(dd.textContent || '');
            if (!date) return;
            const formatted = formatInUserTz(date);
            if (!formatted) return;
            if (SETTINGS.overwriteText) {
                dd.textContent = formatted;
            } else {
                const relative = timeAgoFrom(date);
                if (relative) dd.textContent = relative;
            }
            dd.setAttribute('title', formatted);
            dd.dataset.timeAdjusterProcessed = '1';
        });
    }

    function updateFooterStatsDate() {
        const container = document.querySelector('p.footer__stats');
        if (!container) return;

        const strongs = Array.from(container.querySelectorAll('strong'));
        const dateLabel = strongs.find(el => (el.textContent || '').trim().toLowerCase() === 'date:');
        if (!dateLabel) return;

        const dateSpan = dateLabel.nextElementSibling;
        if (!dateSpan || dateSpan.tagName !== 'SPAN') return;
        if (dateSpan.dataset.timeAdjusterProcessed === '1') return;

        const originalText = (dateSpan.textContent || '').trim();
        const date = parseServerUtc(originalText);
        if (!date) return;
        const formatted = formatInUserTz(date);
        if (!formatted) return;

        dateSpan.textContent = `Local: ${formatted} | Server: ${originalText}`;
        dateSpan.dataset.timeAdjusterProcessed = '1';
    }

    let updateScheduled = false;
    function updateAllTimes() {
        document.querySelectorAll('time[datetime], time[title], time').forEach(updateTimeElement);
        updateKeyValueGroups();
        updateFooterStatsDate();
    }

    function scheduleUpdate() {
        if (updateScheduled) return;
        updateScheduled = true;
        const run = () => {
            updateScheduled = false;
            updateAllTimes();
        };
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout: 500 });
        } else {
            window.setTimeout(run, 100);
        }
    }

    function observeDom() {
        const observer = new MutationObserver(mutations => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes?.length || mutation.removedNodes?.length) {
                        shouldUpdate = true;
                        break;
                    }
                }
                if (mutation.type === 'attributes') {
                    shouldUpdate = true;
                    break;
                }
            }
            if (shouldUpdate) scheduleUpdate();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['datetime', 'title']
        });
    }

    function addHotkey() {
        window.addEventListener('keydown', event => {
            if (event.ctrlKey && event.altKey && event.code === 'KeyT') {
                event.preventDefault();
                promptForTimeZone();
            }
        });
    }

    function isGeneralSettingsEditPage() {
        return /^\/users\/[^/]+\/general-settings\/edit\/?$/.test(window.location.pathname);
    }

    function isGroupRequirementsPage() {
        return /^\/stats\/groups\/requirements\/?$/.test(window.location.pathname);
    }

    function formatCountdown(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function insertGroupRequirementsCountdown() {
        if (!isGroupRequirementsPage()) return;
        if (document.getElementById('timeAdjusterGroupCountdown')) return;

        const heading = document.querySelector('main.page__stats--group-requirements h2.panel__heading');
        if (!heading || !heading.parentNode) return;

        const banner = document.createElement('div');
        banner.id = 'timeAdjusterGroupCountdown';
        banner.style.margin = '12px 0';
        banner.style.padding = '10px 12px';
        banner.style.background = 'rgba(46, 204, 113, 0.12)';
        banner.style.border = '1px solid rgba(46, 204, 113, 0.35)';
        banner.style.borderRadius = '6px';
        banner.style.fontSize = '13px';
        banner.style.textAlign = 'center';

        const label = document.createElement('strong');
        label.textContent = 'User groups updated in: ';

        const value = document.createElement('span');
        value.style.fontFamily = 'monospace';

        banner.appendChild(label);
        banner.appendChild(value);

        heading.parentNode.insertBefore(banner, heading.nextSibling);

        const update = () => {
            const now = new Date();
            const nextMidnightUtc = Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1,
                0, 0, 0
            );
            value.textContent = formatCountdown(nextMidnightUtc - now.getTime());
        };

        update();
        window.setInterval(update, 1000);
    }

    function getAllTimeZones() {
        if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
            const zones = Intl.supportedValuesOf('timeZone');
            if (Array.isArray(zones) && zones.length) return zones;
        }
        return [DEFAULT_TIMEZONE, 'UTC'];
    }

    function getTimeZoneGroups() {
        const zones = getAllTimeZones().slice().sort();
        const groups = new Map();

        zones.forEach(zone => {
            const parts = zone.split('/');
            const region = parts[0] || 'Other';
            let groupLabel = region;

            if (region === 'America') {
                if (parts.length >= 3) {
                    groupLabel = `America - ${parts[1]}`;
                } else {
                    groupLabel = 'America - Other';
                }
            }

            if (!groups.has(groupLabel)) {
                groups.set(groupLabel, []);
            }
            groups.get(groupLabel).push(zone);
        });

        return Array.from(groups.entries()).map(([label, list]) => ({
            label,
            zones: list
        }));
    }

    function formatZoneLabel(zone) {
        const parts = zone.split('/');
        if (parts.length <= 1) return zone.replace(/_/g, ' ');
        return parts.slice(1).join(' / ').replace(/_/g, ' ');
    }

    function insertTimeZoneSettings() {
        if (!isGeneralSettingsEditPage()) return;
        if (document.getElementById('timeAdjusterTimezone')) return;

        const form = document.querySelector('main.page__user-general-setting--index form.form');
        if (!form) return;

        const group = document.createElement('p');
        group.className = 'form__group';

        const label = document.createElement('label');
        label.className = 'form__label';
        label.setAttribute('for', 'timeAdjusterTimezone');
        label.textContent = 'Timezone (Time Adjuster)';

        const select = document.createElement('select');
        select.className = 'form__select';
        select.id = 'timeAdjusterTimezone';
        select.style.width = '100%';
        select.style.maxWidth = '100%';
        select.style.boxSizing = 'border-box';

        const zoneGroups = getTimeZoneGroups();
        zoneGroups.forEach(group => {
            const optGroup = document.createElement('optgroup');
            optGroup.label = group.label;

            group.zones.forEach(zone => {
                const option = document.createElement('option');
                option.className = 'form__option';
                option.value = zone;
                option.textContent = formatZoneLabel(zone);
                optGroup.appendChild(option);
            });

            select.appendChild(optGroup);
        });

        const currentZone = SETTINGS.timeZone || DEFAULT_TIMEZONE;
        const allZones = getAllTimeZones();
        if (allZones.includes(currentZone)) {
            select.value = currentZone;
        } else {
            const fallbackOption = document.createElement('option');
            fallbackOption.value = currentZone;
            fallbackOption.textContent = currentZone;
            select.insertBefore(fallbackOption, select.firstChild);
            select.value = currentZone;
        }

        const hint = document.createElement('span');
        hint.className = 'form__hint';
        hint.textContent = 'Uses IANA time zone names. Saved locally by the userscript.';

        const overwriteWrap = document.createElement('div');
        overwriteWrap.className = 'form__group';

        const overwriteCheckbox = document.createElement('input');
        overwriteCheckbox.type = 'checkbox';
        overwriteCheckbox.id = 'timeAdjusterOverwriteText';
        overwriteCheckbox.checked = Boolean(SETTINGS.overwriteText);

        const overwriteText = document.createElement('span');
        overwriteText.style.marginLeft = '6px';
        overwriteText.textContent = 'Overwrite displayed text -';

        const overwriteHint = document.createElement('span');
        overwriteHint.className = 'form__hint';
        overwriteHint.textContent = ' If enabled, replaces visible time (including relative time) text with the converted longform date/time.';

        const actions = document.createElement('div');
        actions.className = 'form__actions';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'form__button';
        saveButton.textContent = 'Save Timezone';

        const status = document.createElement('span');
        status.style.marginLeft = '10px';
        status.style.fontSize = '12px';

        saveButton.addEventListener('click', () => {
            const candidate = select.value;
            if (!candidate) return;
            if (!isValidTimeZone(candidate)) {
                status.textContent = 'Invalid time zone.';
                status.style.color = '#c00';
                return;
            }
            setSavedTimeZone(candidate);
            setSavedOverwriteText(overwriteCheckbox.checked);
            document.querySelectorAll('[data-time-adjuster-processed="1"]').forEach(el => {
                delete el.dataset.timeAdjusterProcessed;
            });
            updateAllTimes();
            status.textContent = 'Saved.';
            status.style.color = '#0a0';
        });

        actions.appendChild(saveButton);
        actions.appendChild(status);

        group.appendChild(label);
        group.appendChild(select);
        group.appendChild(hint);

        overwriteWrap.appendChild(overwriteCheckbox);
        overwriteWrap.appendChild(overwriteText);
        overwriteWrap.appendChild(overwriteHint);

        group.appendChild(overwriteWrap);
        group.appendChild(actions);

        form.appendChild(group);
    }

    window.TimeAdjuster = {
        setTimeZone: promptForTimeZone,
        update: updateAllTimes,
        getTimeZone: () => SETTINGS.timeZone,
        getOverwriteText: () => SETTINGS.overwriteText
    };

    updateAllTimes();
    observeDom();
    addHotkey();
    insertTimeZoneSettings();
    insertGroupRequirementsCountdown();
})();