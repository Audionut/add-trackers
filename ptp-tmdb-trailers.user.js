// ==UserScript==
// @name         PTP - TMDB Trailer Selector
// @version      1.6
// @description  Add a dropdown to switch between various TMDB videos
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAA5CAMAAAC7xnO3AAAAV1BMVEUAAAD///9oiM2CacFm5Mj/jGb842dn3auC3X/z82j/uWZw14xudcRwbsBmpdz83GZm4NBq26KP4Hrm9Wr/rmdmr91u2ZNmntln5L/902b/l2Zt1otnseEVRKmYAAAAeUlEQVRIx+3WtwqAMBCAYU2zpNlii+//nAZFCDooSIaQ+5fjhm89LoNCl7u+TpCvM8kopUNda81YVfVu78rS8rEtCkJI4/ZNKYSQkBJjfJerk4sv+SHnUxo1/ZMCJEiQIKOV8pKPe8s8aa317q3x7m2SxfUnxCWhAO24CSsei22B/wAAAABJRU5ErkJggg==
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-tmdb-trailers.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-tmdb-trailers.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @author       Audionut
// ==/UserScript==

(function() {
    'use strict';

    const SETTINGS_KEY = 'ptp_tmdb_trailers_settings_v1';
    const DEFAULT_SETTINGS = {
        apiKey: '',
        cacheTtlDays: 28,
        replaceSiteLogo: false,
        replacePageBackground: false,
        logoPlacement: 'title',
        hiddenSiteLogoSpacerPx: 16,
        backdropDarkness: 38,
        backdropSharpness: 100,
        columnBackgroundTransparency: 0,
        columnContentTransparency: 0,
        enabledVideoTypes: {
            trailer: true,
            teaser: true,
            featurette: true,
            'behind the scenes': true,
            clip: true
        }
    };
    const CACHE_KEY_PREFIX = 'ptp_tmdb_trailers_cache_v1_';
    const LOGO_CACHE_KEY_PREFIX = 'ptp_tmdb_logo_cache_v1_';
    const BACKDROP_CACHE_KEY_PREFIX = 'ptp_tmdb_backdrop_cache_v1_';
    const RATINGS_CACHE_KEY_PREFIX = 'ptp_tmdb_ratings_cache_v1_';
    const API_KEY_PLACEHOLDER = '<REDACTED>';
    let settings = loadSettings();
    let columnBackgroundObserver = null;
    let columnBackgroundObserverTimer = null;
    let latestTMDBRatings = null;
    let tmdbRatingsPromise = null;
    let tmdbRatingsPromiseImdbId = '';

    // Base64-encoded TMDB icon
    const tmdbIconBase64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNDg5LjA0IDM1LjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDp1cmwoI2xpbmVhci1ncmFkaWVudCk7fTwvc3R5bGU+PGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQiIHkxPSIxNy43IiB4Mj0iNDg5LjA0IiB5Mj0iMTcuNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzkwY2VhMSIvPjxzdG9wIG9mZnNldD0iMC41NiIgc3RvcC1jb2xvcj0iIzNjYmVjOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwYjNlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5Bc3NldCA1PC90aXRsZT48ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIj48ZyBpZD0iTGF5ZXJfMS0yIiBkYXRhLW5hbWU9IkxheWVyIDEiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI5My41LDBoOC45bDguNzUsMjMuMmguMUwzMjAuMTUsMGg4LjM1TDMxMy45LDM1LjRoLTYuMjVabTQ2LjYsMGg3LjhWMzUuNGgtNy44Wm0yMi4yLDBoMjQuMDVWNy4ySDM3MC4xdjYuNmgxNS4zNVYyMUgzNzAuMXY3LjJoMTcuMTV2Ny4ySDM2Mi4zWm01NSwwSDQyOWEzMy41NCwzMy41NCwwLDAsMSw4LjA3LDFBMTguNTUsMTguNTUsMCwwLDEsNDQzLjc1LDRhMTUuMSwxNS4xLDAsMCwxLDQuNTIsNS41M0ExOC41LDE4LjUsMCwwLDEsNDUwLDE3LjhhMTYuOTEsMTYuOTEsMCwwLDEtMS42Myw3LjU4LDE2LjM3LDE2LjM3LDAsMCwxLTQuMzcsNS41LDE5LjUyLDE5LjUyLDAsMCwxLTYuMzUsMy4zN0EyNC41OSwyNC41OSwwLDAsMSw0MzAsMzUuNEg0MTcuMjlabTcuODEsMjguMmg0YTIxLjU3LDIxLjU3LDAsMCwwLDUtLjU1LDEwLjg3LDEwLjg3LDAsMCwwLDQtMS44Myw4LjY5LDguNjksMCwwLDAsMi42Ny0zLjM0LDExLjkyLDExLjkyLDAsMCwwLDEtNS4wOCw5Ljg3LDkuODcsMCwwLDAtMS00LjUyLDksOSwwLDAsMC0yLjYyLTMuMTgsMTEuNjgsMTEuNjgsMCwwLDAtMy44OC0xLjg4LDE3LjQzLDE3LjQzLDAsMCwwLTQuNjctLjYyaC00LjZaTTQ2MS4yNCwwaDEzLjJhMzQuNDIsMzQuNDIsMCwwLDEsNC42My4zMiwxMi45LDEyLjksMCwwLDEsNC4xNywxLjMsNy44OCw3Ljg4LDAsMCwxLDMsMi43M0E4LjM0LDguMzQsMCwwLDEsNDg3LjM5LDlhNy40Miw3LjQyLDAsMCwxLTEuNjcsNSw5LjI4LDkuMjgsMCwwLDEtNC40MywyLjgydi4xYTEwLDEwLDAsMCwxLDMuMTgsMSw4LjM4LDguMzgsMCwwLDEsMi40NSwxLjg1LDcuNzksNy43OSwwLDAsMSwxLjU3LDIuNjIsOS4xNiw5LjE2LDAsMCwxLC41NSwzLjIsOC41Miw4LjUyLDAsMCwxLTEuMiw0LjY4LDkuNDIsOS40MiwwLDAsMS0zLjEsMywxMy4zOCwxMy4zOCwwLDAsMS00LjI3LDEuNjUsMjMuMTEsMjMuMTEsMCwwLDEtNC43My41aC0xNC41Wk00NjksMTQuMTVoNS42NWE4LjE2LDguMTYsMCwwLDAsMS43OC0uMkE0Ljc4LDQuNzgsMCwwLDAsNDc4LDEzLjNhMy4zNCwzLjM0LDAsMCwwLDEuMTMtMS4yLDMuNjMsMy42MywwLDAsMCwuNDItMS44LDMuMjIsMy4yMiwwLDAsMC0uNDctMS44MiwzLjMzLDMuMzMsMCwwLDAtMS4yMy0xLjEzLDUuNzcsNS43NywwLDAsMC0xLjctLjU4LDEwLjc5LDEwLjc5LDAsMCwwLTEuODUtLjE3SDQ2OVptMCwxNC42NWg3YTguOTEsOC45MSwwLDAsMCwxLjgzLS4yLDQuNzgsNC43OCwwLDAsMCwxLjY3LS43LDQsNCwwLDAsMCwxLjIzLTEuMywzLjcxLDMuNzEsMCwwLDAsLjQ3LTIsMy4xMywzLjEzLDAsMCwwLS42Mi0yQTQsNCwwLDAsMCw0NzksMjEuNDUsNy44Myw3LjgzLDAsMCwwLDQ3NywyMC45YTE1LjEyLDE1LjEyLDAsMCwwLTIuMDUtLjE1SDQ2OVptLTI2NSw2LjUzSDI3MWExNy42NiwxNy42NiwwLDAsMCwxNy42Ni0xNy42NmgwQTE3LjY3LDE3LjY3LDAsMCwwLDI3MSwwSDIwNC4wNkExNy42NywxNy42NywwLDAsMCwxODYuNCwxNy42N2gwQTE3LjY2LDE3LjY2LDAsMCwwLDIwNC4wNiwzNS4zM1pNMTAuMSw2LjlIMFYwSDI4VjYuOUgxNy45VjM1LjRIMTAuMVpNMzksMGg3LjhWMTMuMkg2MS45VjBoNy44VjM1LjRINjEuOVYyMC4xSDQ2Ljc1VjM1LjRIMzlaTTgwLjIsMGgyNFY3LjJIODh2Ni42aDE1LjM1VjIxSDg4djcuMmgxNy4xNXY3LjJoLTI1Wm01NSwwSDE0N2w4LjE1LDIzLjFoLjFMMTYzLjQ1LDBIMTc1LjJWMzUuNGgtNy44VjguMjVoLS4xTDE1OCwzNS40aC01Ljk1bC05LTI3LjE1SDE0M1YzNS40aC03LjhaIi8+PC9nPjwvZz48L3N2Zz4=';

    let movieId = ''; // Declare movieId in a higher scope to use later
    let isTVShow = 0;
    let hasInitialized = false;

    function getImdbIdFromPage() {
        const imdbLinkElement = document.getElementById('imdb-title-link');
        if (!imdbLinkElement || !imdbLinkElement.href) return '';
        const match = imdbLinkElement.href.match(/title\/(tt\d+)\//);
        return match ? match[1] : '';
    }

    function normalizeSettings(value) {
        const normalized = Object.assign({}, DEFAULT_SETTINGS, value && typeof value === 'object' ? value : {});
        const ttl = Number.parseInt(normalized.cacheTtlDays, 10);
        normalized.cacheTtlDays = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_SETTINGS.cacheTtlDays;
        normalized.apiKey = String(normalized.apiKey || '').trim();
        normalized.replaceSiteLogo = Boolean(normalized.replaceSiteLogo);
        normalized.replacePageBackground = Boolean(normalized.replacePageBackground);
        normalized.logoPlacement = normalized.logoPlacement === 'site' ? 'site' : 'title';
        const hiddenSiteLogoSpacerPx = Number.parseInt(normalized.hiddenSiteLogoSpacerPx, 10);
        const darkness = Number.parseInt(normalized.backdropDarkness, 10);
        const sharpness = Number.parseInt(normalized.backdropSharpness, 10);
        const legacyTransparency = Number.parseInt(normalized.columnTransparency, 10);
        const backgroundTransparency = Number.parseInt(normalized.columnBackgroundTransparency, 10);
        const contentTransparency = Number.parseInt(normalized.columnContentTransparency, 10);
        normalized.hiddenSiteLogoSpacerPx = Number.isFinite(hiddenSiteLogoSpacerPx)
            ? Math.min(120, Math.max(0, hiddenSiteLogoSpacerPx))
            : DEFAULT_SETTINGS.hiddenSiteLogoSpacerPx;
        normalized.backdropDarkness = Number.isFinite(darkness) ? Math.min(100, Math.max(0, darkness)) : DEFAULT_SETTINGS.backdropDarkness;
        normalized.backdropSharpness = Number.isFinite(sharpness) ? Math.min(100, Math.max(0, sharpness)) : DEFAULT_SETTINGS.backdropSharpness;
        normalized.columnBackgroundTransparency = Number.isFinite(backgroundTransparency)
            ? Math.min(100, Math.max(0, backgroundTransparency))
            : DEFAULT_SETTINGS.columnBackgroundTransparency;
        normalized.columnContentTransparency = Number.isFinite(contentTransparency)
            ? Math.min(100, Math.max(0, contentTransparency))
            : (Number.isFinite(legacyTransparency)
                ? Math.min(100, Math.max(0, legacyTransparency))
                : DEFAULT_SETTINGS.columnContentTransparency);
        delete normalized.columnTransparency;
        const inputTypes = normalized.enabledVideoTypes && typeof normalized.enabledVideoTypes === 'object'
            ? normalized.enabledVideoTypes
            : {};
        normalized.enabledVideoTypes = {
            trailer: inputTypes.trailer !== undefined ? Boolean(inputTypes.trailer) : true,
            teaser: inputTypes.teaser !== undefined ? Boolean(inputTypes.teaser) : true,
            featurette: inputTypes.featurette !== undefined ? Boolean(inputTypes.featurette) : true,
            'behind the scenes': inputTypes['behind the scenes'] !== undefined ? Boolean(inputTypes['behind the scenes']) : true,
            clip: inputTypes.clip !== undefined ? Boolean(inputTypes.clip) : true
        };
        return normalized;
    }

    function loadSettings() {
        if (typeof GM_getValue !== 'function') return Object.assign({}, DEFAULT_SETTINGS);
        try {
            const raw = GM_getValue(SETTINGS_KEY, '');
            if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
            return normalizeSettings(JSON.parse(raw));
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            return Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    function saveSettings(nextSettings) {
        settings = normalizeSettings(nextSettings);
        if (typeof GM_setValue !== 'function') return;
        try {
            GM_setValue(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    function openSettingsModal() {
        let modal = document.getElementById('ptp-tmdb-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            return;
        }

        modal = document.createElement('div');
        modal.id = 'ptp-tmdb-settings-modal';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '100000';

        const panel = document.createElement('div');
        panel.style.width = 'min(560px, 95vw)';
        panel.style.background = '#1f1f1f';
        panel.style.color = '#e7e7e7';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '8px';
        panel.style.padding = '16px';
        panel.style.boxSizing = 'border-box';

        panel.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 12px;">PTP TMDB Trailer Settings</div>
            <div style="margin-bottom: 10px;">
                <label for="ptp-tmdb-api-key" style="display:block; margin-bottom: 4px;">TMDB API Key</label>
                <input id="ptp-tmdb-api-key" type="text" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label for="ptp-tmdb-cache-ttl" style="display:block; margin-bottom: 4px;">Cache TTL (days)</label>
                <input id="ptp-tmdb-cache-ttl" type="number" min="1" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display:flex; align-items:center; gap:8px;">
                    <input id="ptp-tmdb-replace-logo" type="checkbox" />
                    Replace site logo with TMDB logo when available
                </label>
            </div>
            <div style="margin-bottom: 12px;">
                <label for="ptp-tmdb-logo-placement" style="display:block; margin-bottom: 4px;">Logo Placement</label>
                <select id="ptp-tmdb-logo-placement" style="width:100%; box-sizing:border-box; padding:6px;">
                    <option value="title">Above Page Title (Default)</option>
                    <option value="site">Replace Existing Site Logo</option>
                </select>
            </div>
            <div style="margin-bottom: 12px;">
                <label for="ptp-tmdb-hidden-site-logo-spacer" style="display:block; margin-bottom: 4px;">Hidden Site Logo Spacer (px)</label>
                <input id="ptp-tmdb-hidden-site-logo-spacer" type="number" min="0" max="120" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display:flex; align-items:center; gap:8px;">
                    <input id="ptp-tmdb-replace-background" type="checkbox" />
                    Replace page background with random TMDB backdrop (prefers largest)
                </label>
            </div>
            <div style="margin-bottom: 10px;">
                <label for="ptp-tmdb-backdrop-darkness" style="display:block; margin-bottom: 4px;">Backdrop Darkness (0-100)</label>
                <input id="ptp-tmdb-backdrop-darkness" type="number" min="0" max="100" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 12px;">
                <label for="ptp-tmdb-backdrop-sharpness" style="display:block; margin-bottom: 4px;">Backdrop Sharpness (0-100)</label>
                <input id="ptp-tmdb-backdrop-sharpness" type="number" min="0" max="100" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label for="ptp-tmdb-column-bg-transparency" style="display:block; margin-bottom: 4px;">Column Background Transparency (0-100)</label>
                <input id="ptp-tmdb-column-bg-transparency" type="number" min="0" max="100" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 12px;">
                <label for="ptp-tmdb-column-content-transparency" style="display:block; margin-bottom: 4px;">Column Text/Image Transparency (0-100)</label>
                <input id="ptp-tmdb-column-content-transparency" type="number" min="0" max="100" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
            </div>
            <div style="margin-bottom: 12px;">
                <div style="margin-bottom: 4px;">Enabled TMDB Video Types</div>
                <label style="display:block;"><input id="ptp-tmdb-type-trailer" type="checkbox" /> Trailer</label>
                <label style="display:block;"><input id="ptp-tmdb-type-teaser" type="checkbox" /> Teaser</label>
                <label style="display:block;"><input id="ptp-tmdb-type-featurette" type="checkbox" /> Featurette</label>
                <label style="display:block;"><input id="ptp-tmdb-type-behind-scenes" type="checkbox" /> Behind the Scenes</label>
                <label style="display:block;"><input id="ptp-tmdb-type-clip" type="checkbox" /> Clip</label>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button id="ptp-tmdb-settings-cancel" type="button">Cancel</button>
                <button id="ptp-tmdb-settings-save" type="button">Save</button>
            </div>
        `;

        modal.appendChild(panel);
        document.body.appendChild(modal);

        const apiKeyInput = panel.querySelector('#ptp-tmdb-api-key');
        const ttlInput = panel.querySelector('#ptp-tmdb-cache-ttl');
        const replaceLogoInput = panel.querySelector('#ptp-tmdb-replace-logo');
        const logoPlacementInput = panel.querySelector('#ptp-tmdb-logo-placement');
        const hiddenSiteLogoSpacerInput = panel.querySelector('#ptp-tmdb-hidden-site-logo-spacer');
        const replaceBackgroundInput = panel.querySelector('#ptp-tmdb-replace-background');
        const backdropDarknessInput = panel.querySelector('#ptp-tmdb-backdrop-darkness');
        const backdropSharpnessInput = panel.querySelector('#ptp-tmdb-backdrop-sharpness');
        const columnBgTransparencyInput = panel.querySelector('#ptp-tmdb-column-bg-transparency');
        const columnContentTransparencyInput = panel.querySelector('#ptp-tmdb-column-content-transparency');
        const typeTrailerInput = panel.querySelector('#ptp-tmdb-type-trailer');
        const typeTeaserInput = panel.querySelector('#ptp-tmdb-type-teaser');
        const typeFeaturetteInput = panel.querySelector('#ptp-tmdb-type-featurette');
        const typeBehindScenesInput = panel.querySelector('#ptp-tmdb-type-behind-scenes');
        const typeClipInput = panel.querySelector('#ptp-tmdb-type-clip');
        const cancelButton = panel.querySelector('#ptp-tmdb-settings-cancel');
        const saveButton = panel.querySelector('#ptp-tmdb-settings-save');

        apiKeyInput.value = settings.apiKey ? API_KEY_PLACEHOLDER : '';
        ttlInput.value = String(settings.cacheTtlDays || DEFAULT_SETTINGS.cacheTtlDays);
        replaceLogoInput.checked = Boolean(settings.replaceSiteLogo);
        logoPlacementInput.value = settings.logoPlacement || 'title';
        hiddenSiteLogoSpacerInput.value = String(settings.hiddenSiteLogoSpacerPx ?? DEFAULT_SETTINGS.hiddenSiteLogoSpacerPx);
        replaceBackgroundInput.checked = Boolean(settings.replacePageBackground);
        backdropDarknessInput.value = String(settings.backdropDarkness ?? DEFAULT_SETTINGS.backdropDarkness);
        backdropSharpnessInput.value = String(settings.backdropSharpness ?? DEFAULT_SETTINGS.backdropSharpness);
        columnBgTransparencyInput.value = String(settings.columnBackgroundTransparency ?? DEFAULT_SETTINGS.columnBackgroundTransparency);
        columnContentTransparencyInput.value = String(settings.columnContentTransparency ?? DEFAULT_SETTINGS.columnContentTransparency);
        typeTrailerInput.checked = Boolean(settings.enabledVideoTypes?.trailer);
        typeTeaserInput.checked = Boolean(settings.enabledVideoTypes?.teaser);
        typeFeaturetteInput.checked = Boolean(settings.enabledVideoTypes?.featurette);
        typeBehindScenesInput.checked = Boolean(settings.enabledVideoTypes?.['behind the scenes']);
        typeClipInput.checked = Boolean(settings.enabledVideoTypes?.clip);

        const closeModal = () => {
            modal.style.display = 'none';
        };

        cancelButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });

        saveButton.addEventListener('click', () => {
            const ttl = Number.parseInt(ttlInput.value, 10);
            if (!Number.isFinite(ttl) || ttl < 1) {
                alert('Cache TTL must be a whole number of at least 1 day.');
                return;
            }
            const darkness = Number.parseInt(backdropDarknessInput.value, 10);
            const sharpness = Number.parseInt(backdropSharpnessInput.value, 10);
            if (!Number.isFinite(darkness) || darkness < 0 || darkness > 100) {
                alert('Backdrop darkness must be between 0 and 100.');
                return;
            }
            if (!Number.isFinite(sharpness) || sharpness < 0 || sharpness > 100) {
                alert('Backdrop sharpness must be between 0 and 100.');
                return;
            }
            const hiddenSiteLogoSpacerPx = Number.parseInt(hiddenSiteLogoSpacerInput.value, 10);
            if (!Number.isFinite(hiddenSiteLogoSpacerPx) || hiddenSiteLogoSpacerPx < 0 || hiddenSiteLogoSpacerPx > 120) {
                alert('Hidden site logo spacer must be between 0 and 120 pixels.');
                return;
            }
            const columnBgTransparency = Number.parseInt(columnBgTransparencyInput.value, 10);
            if (!Number.isFinite(columnBgTransparency) || columnBgTransparency < 0 || columnBgTransparency > 100) {
                alert('Column background transparency must be between 0 and 100.');
                return;
            }
            const columnContentTransparency = Number.parseInt(columnContentTransparencyInput.value, 10);
            if (!Number.isFinite(columnContentTransparency) || columnContentTransparency < 0 || columnContentTransparency > 100) {
                alert('Column text/image transparency must be between 0 and 100.');
                return;
            }

            saveSettings({
                apiKey: (() => {
                    const inputValue = String(apiKeyInput.value || '').trim();
                    if (!inputValue) return '';
                    if (settings.apiKey && inputValue === API_KEY_PLACEHOLDER) return settings.apiKey;
                    return inputValue;
                })(),
                cacheTtlDays: ttl,
                replaceSiteLogo: replaceLogoInput.checked,
                replacePageBackground: replaceBackgroundInput.checked,
                logoPlacement: logoPlacementInput.value,
                hiddenSiteLogoSpacerPx,
                backdropDarkness: darkness,
                backdropSharpness: sharpness,
                columnBackgroundTransparency: columnBgTransparency,
                columnContentTransparency: columnContentTransparency,
                enabledVideoTypes: {
                    trailer: typeTrailerInput.checked,
                    teaser: typeTeaserInput.checked,
                    featurette: typeFeaturetteInput.checked,
                    'behind the scenes': typeBehindScenesInput.checked,
                    clip: typeClipInput.checked
                }
            });
            closeModal();
            window.location.reload();
        });
    }

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('PTP TMDB Trailer Settings', openSettingsModal);
    }

    function getCacheKey(imdbId) {
        return `${CACHE_KEY_PREFIX}${imdbId}`;
    }

    function getLogoCacheKey(imdbId) {
        return `${LOGO_CACHE_KEY_PREFIX}${imdbId}`;
    }

    function getBackdropCacheKey(imdbId) {
        return `${BACKDROP_CACHE_KEY_PREFIX}${imdbId}`;
    }

    function getRatingsCacheKey(imdbId) {
        return `${RATINGS_CACHE_KEY_PREFIX}${imdbId}`;
    }

    function loadCachedTMDBLogo(imdbId) {
        if (typeof GM_getValue !== 'function') return null;

        try {
            const raw = GM_getValue(getLogoCacheKey(imdbId), '');
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') return null;

            const expiresAt = Number(cached.expiresAt || 0);
            if (!expiresAt || Date.now() > expiresAt) {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(getLogoCacheKey(imdbId));
                }
                return null;
            }

            if (!cached.logoUrl) return null;
            return cached;
        } catch (error) {
            console.warn('Failed to load TMDB logo cache:', error);
            return null;
        }
    }

    function saveCachedTMDBLogo(imdbId, logoUrl, movieIdValue, isTVShowValue) {
        if (typeof GM_setValue !== 'function' || !logoUrl) return;

        try {
            const expiresAt = Date.now() + (settings.cacheTtlDays * 24 * 60 * 60 * 1000);
            const payload = {
                logoUrl,
                movieId: movieIdValue || '',
                isTVShow: isTVShowValue ? 1 : 0,
                expiresAt
            };
            GM_setValue(getLogoCacheKey(imdbId), JSON.stringify(payload));
        } catch (error) {
            console.warn('Failed to save TMDB logo cache:', error);
        }
    }

    function loadCachedTMDBBackdrops(imdbId) {
        if (typeof GM_getValue !== 'function') return null;

        try {
            const raw = GM_getValue(getBackdropCacheKey(imdbId), '');
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') return null;

            const expiresAt = Number(cached.expiresAt || 0);
            if (!expiresAt || Date.now() > expiresAt) {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(getBackdropCacheKey(imdbId));
                }
                return null;
            }

            if (!Array.isArray(cached.backdrops) || cached.backdrops.length === 0) return null;
            return cached;
        } catch (error) {
            console.warn('Failed to load TMDB backdrop cache:', error);
            return null;
        }
    }

    function saveCachedTMDBBackdrops(imdbId, backdrops, movieIdValue, isTVShowValue) {
        if (typeof GM_setValue !== 'function' || !Array.isArray(backdrops) || backdrops.length === 0) return;

        try {
            const expiresAt = Date.now() + (settings.cacheTtlDays * 24 * 60 * 60 * 1000);
            const payload = {
                backdrops,
                movieId: movieIdValue || '',
                isTVShow: isTVShowValue ? 1 : 0,
                expiresAt
            };
            GM_setValue(getBackdropCacheKey(imdbId), JSON.stringify(payload));
        } catch (error) {
            console.warn('Failed to save TMDB backdrop cache:', error);
        }
    }

    function loadCachedTMDBVideos(imdbId) {
        if (typeof GM_getValue !== 'function') return null;

        try {
            const raw = GM_getValue(getCacheKey(imdbId), '');
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') return null;

            const expiresAt = Number(cached.expiresAt || 0);
            if (!expiresAt || Date.now() > expiresAt) {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(getCacheKey(imdbId));
                }
                return null;
            }

            if (!Array.isArray(cached.videos)) return null;
            return cached;
        } catch (error) {
            console.warn('Failed to load TMDB cache:', error);
            return null;
        }
    }

    function saveCachedTMDBVideos(imdbId, videos, movieIdValue, isTVShowValue) {
        if (typeof GM_setValue !== 'function') return;

        try {
            const expiresAt = Date.now() + (settings.cacheTtlDays * 24 * 60 * 60 * 1000);
            const payload = {
                videos,
                movieId: movieIdValue || '',
                isTVShow: isTVShowValue ? 1 : 0,
                expiresAt
            };
            GM_setValue(getCacheKey(imdbId), JSON.stringify(payload));
        } catch (error) {
            console.warn('Failed to save TMDB cache:', error);
        }
    }

    function loadCachedTMDBRatings(imdbId) {
        if (typeof GM_getValue !== 'function') return null;

        try {
            const raw = GM_getValue(getRatingsCacheKey(imdbId), '');
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || typeof cached !== 'object') return null;

            const expiresAt = Number(cached.expiresAt || 0);
            if (!expiresAt || Date.now() > expiresAt) {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(getRatingsCacheKey(imdbId));
                }
                return null;
            }

            if (!cached.ratings || typeof cached.ratings !== 'object') return null;
            return cached;
        } catch (error) {
            console.warn('Failed to load TMDB ratings cache:', error);
            return null;
        }
    }

    function saveCachedTMDBRatings(imdbId, ratings, movieIdValue, isTVShowValue) {
        if (typeof GM_setValue !== 'function' || !ratings || typeof ratings !== 'object') return;

        try {
            const expiresAt = Date.now() + (settings.cacheTtlDays * 24 * 60 * 60 * 1000);
            const payload = {
                ratings,
                movieId: movieIdValue || '',
                isTVShow: isTVShowValue ? 1 : 0,
                expiresAt
            };
            GM_setValue(getRatingsCacheKey(imdbId), JSON.stringify(payload));
        } catch (error) {
            console.warn('Failed to save TMDB ratings cache:', error);
        }
    }

    function getTMDBMediaType() {
        return isTVShow === 1 ? 'tv' : 'movie';
    }

    function createTMDBRatingsPayload(imdbId, result, mediaType) {
        return {
            imdbId,
            tmdbId: result && result.id ? result.id : movieId || '',
            mediaType,
            title: result && (result.title || result.name) ? (result.title || result.name) : '',
            voteAverage: Number(result && result.vote_average) || 0,
            voteCount: Number(result && result.vote_count) || 0
        };
    }

    function publishTMDBRatings(ratings, cacheSource) {
        if (!ratings || typeof ratings !== 'object') return;

        latestTMDBRatings = ratings;
        document.dispatchEvent(new CustomEvent('tmdbRatingsReady', {
            detail: {
                ...ratings,
                source: 'ptp-tmdb-trailers',
                cacheSource
            }
        }));
    }

    function fetchTMDBRatings(imdbId) {
        if (!settings.apiKey) return Promise.resolve(null);

        if (latestTMDBRatings && latestTMDBRatings.imdbId === imdbId) {
            return Promise.resolve(latestTMDBRatings);
        }

        const cached = loadCachedTMDBRatings(imdbId);
        if (cached) {
            if (!movieId && cached.movieId) {
                movieId = cached.movieId;
            }
            if (cached.isTVShow !== undefined) {
                isTVShow = cached.isTVShow ? 1 : 0;
            }
            publishTMDBRatings(cached.ratings, 'cache');
            return Promise.resolve(cached.ratings);
        }

        if (tmdbRatingsPromise && tmdbRatingsPromiseImdbId === imdbId) {
            return tmdbRatingsPromise;
        }

        const searchUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${settings.apiKey}&external_source=imdb_id`;
        tmdbRatingsPromiseImdbId = imdbId;
        tmdbRatingsPromise = fetch(searchUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch TMDB ratings');
                return response.json();
            })
            .then(data => {
                let match = null;
                let mediaType = '';

                if (data && data.movie_results && data.movie_results.length > 0) {
                    match = data.movie_results[0];
                    mediaType = 'movie';
                    movieId = match.id || movieId;
                    isTVShow = 0;
                } else if (data && data.tv_results && data.tv_results.length > 0) {
                    match = data.tv_results[0];
                    mediaType = 'tv';
                    movieId = match.id || movieId;
                    isTVShow = 1;
                } else {
                    console.warn('No TMDB rating match found for IMDb ID:', imdbId);
                    return null;
                }

                const ratings = createTMDBRatingsPayload(imdbId, match, mediaType);
                saveCachedTMDBRatings(imdbId, ratings, movieId, isTVShow);
                publishTMDBRatings(ratings, 'api');
                return ratings;
            })
            .catch(error => {
                console.warn('TMDB ratings lookup failed:', error);
                return null;
            })
            .finally(() => {
                tmdbRatingsPromise = null;
                tmdbRatingsPromiseImdbId = '';
            });

        return tmdbRatingsPromise;
    }

    function respondWithTMDBRatings(requestId, imdbId, ratings) {
        document.dispatchEvent(new CustomEvent('tmdbRatingsResponse', {
            detail: {
                requestId,
                imdbId,
                found: Boolean(ratings),
                data: ratings,
                source: 'ptp-tmdb-trailers'
            }
        }));
    }

    function registerTMDBRatingsEventBridge() {
        document.addEventListener('requestTMDBRatings', (event) => {
            const detail = event && event.detail ? event.detail : {};
            const requestId = detail.requestId;
            const imdbId = detail.imdbId || getImdbIdFromPage();

            if (!imdbId) {
                respondWithTMDBRatings(requestId, '', null);
                return;
            }

            if (latestTMDBRatings && latestTMDBRatings.imdbId === imdbId) {
                respondWithTMDBRatings(requestId, imdbId, latestTMDBRatings);
                return;
            }

            const cached = loadCachedTMDBRatings(imdbId);
            if (cached && cached.ratings) {
                if (!movieId && cached.movieId) {
                    movieId = cached.movieId;
                }
                if (cached.isTVShow !== undefined) {
                    isTVShow = cached.isTVShow ? 1 : 0;
                }
                publishTMDBRatings(cached.ratings, 'cache');
                respondWithTMDBRatings(requestId, imdbId, cached.ratings);
                return;
            }

            fetchTMDBRatings(imdbId).then((ratings) => {
                respondWithTMDBRatings(requestId, imdbId, ratings);
            });
        });
    }

    function pickBestTMDBLogo(logos) {
        if (!Array.isArray(logos) || logos.length === 0) return null;

        const languageScore = (logo) => {
            if (logo.iso_639_1 === 'en') return 0;
            if (logo.iso_639_1 === null) return 1;
            return 2;
        };

        return logos
            .slice()
            .sort((a, b) => {
                const langDiff = languageScore(a) - languageScore(b);
                if (langDiff !== 0) return langDiff;
                const voteDiff = (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0);
                if (voteDiff !== 0) return voteDiff;
                return (Number(b.width) || 0) - (Number(a.width) || 0);
            })[0];
    }

    function replaceSiteLogo(logoUrl) {
        if (!logoUrl) return;

        const originalSiteLogo = document.querySelector('.site-logo');
        const titleLogoWrapper = document.getElementById('ptp-tmdb-title-logo-wrap');
        const existingSpacer = document.getElementById('ptp-tmdb-site-logo-spacer');

        if (settings.logoPlacement === 'site') {
            if (titleLogoWrapper) {
                titleLogoWrapper.remove();
            }
            if (existingSpacer) {
                existingSpacer.remove();
            }
            if (originalSiteLogo) {
                originalSiteLogo.style.display = '';
                delete originalSiteLogo.dataset.tmdbSpacerApplied;
            }

            const logoContainer = document.querySelector('.site-logo');
            const logoLink = document.querySelector('.site-logo .site-logo__link');
            if (!logoContainer || !logoLink) return;
            if (logoLink.dataset.tmdbLogoApplied === '1') {
                const existing = logoLink.querySelector('img');
                if (existing) {
                    existing.src = logoUrl;
                }
                return;
            }

            const img = document.createElement('img');
            img.src = logoUrl;
            img.alt = 'TMDB Logo';
            img.style.maxHeight = '100%';
            img.style.maxWidth = '100%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';

            logoLink.dataset.tmdbLogoApplied = '1';
            logoContainer.style.backgroundImage = 'none';
            logoLink.style.backgroundImage = 'none';
            logoLink.style.width = '100%';
            logoLink.style.height = '100%';
            logoLink.style.marginTop = '0';
            logoLink.style.display = 'flex';
            logoLink.style.alignItems = 'center';
            logoLink.style.justifyContent = 'center';
            logoLink.textContent = '';
            logoLink.appendChild(img);
            return;
        }

        const pageTitle = document.querySelector('h2.page__title');
        if (!pageTitle || !pageTitle.parentElement) return;
        if (originalSiteLogo) {
            if (originalSiteLogo.dataset.tmdbSpacerApplied !== '1') {
                const spacer = document.createElement('div');
                spacer.id = 'ptp-tmdb-site-logo-spacer';
                spacer.style.width = '100%';
                spacer.style.margin = '0';
                spacer.style.pointerEvents = 'none';
                originalSiteLogo.insertAdjacentElement('afterend', spacer);
                originalSiteLogo.dataset.tmdbSpacerApplied = '1';
            }
            const spacer = document.getElementById('ptp-tmdb-site-logo-spacer');
            if (spacer) {
                spacer.style.height = `${settings.hiddenSiteLogoSpacerPx}px`;
            }
            originalSiteLogo.style.display = 'none';
        }

        let logoWrapper = titleLogoWrapper;
        if (!logoWrapper) {
            logoWrapper = document.createElement('div');
            logoWrapper.id = 'ptp-tmdb-title-logo-wrap';
            logoWrapper.style.display = 'flex';
            logoWrapper.style.justifyContent = 'center';
            logoWrapper.style.alignItems = 'center';
            logoWrapper.style.margin = '0 0 10px 0';

            const logoImage = document.createElement('img');
            logoImage.id = 'ptp-tmdb-title-logo';
            logoImage.alt = 'TMDB Logo';
            logoImage.style.maxWidth = '700px';
            logoImage.style.width = 'min(700px, 95%)';
            logoImage.style.maxHeight = '140px';
            logoImage.style.objectFit = 'contain';
            logoImage.style.display = 'block';
            logoWrapper.appendChild(logoImage);
            pageTitle.parentElement.insertBefore(logoWrapper, pageTitle);
        }

        const existing = logoWrapper.querySelector('#ptp-tmdb-title-logo');
        if (existing) {
            existing.src = logoUrl;
        }
    }

    function applyPageBackground(imageUrl) {
        if (!imageUrl) return;
        let layer = document.getElementById('ptp-tmdb-backdrop-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'ptp-tmdb-backdrop-layer';
            if (document.body.firstChild) {
                document.body.insertBefore(layer, document.body.firstChild);
            } else {
                document.body.appendChild(layer);
            }
        }

        let styleNode = document.getElementById('ptp-tmdb-backdrop-style');
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = 'ptp-tmdb-backdrop-style';
            document.head.appendChild(styleNode);
        }

        const safeUrl = imageUrl.replace(/"/g, '\\"');
        const darknessAlpha = (Math.min(100, Math.max(0, Number(settings.backdropDarkness) || 0)) / 100).toFixed(2);
        const sharpnessValue = Math.min(100, Math.max(0, Number(settings.backdropSharpness) || 0));
        const blurPx = (((100 - sharpnessValue) / 100) * 6).toFixed(2);
        const columnBgFactor = 1 - (Math.min(100, Math.max(0, Number(settings.columnBackgroundTransparency) || 0)) / 100);
        const columnContentOpacity = (1 - (Math.min(100, Math.max(0, Number(settings.columnContentTransparency) || 0)) / 100)).toFixed(2);
        styleNode.textContent = `
            #ptp-tmdb-backdrop-layer {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                transform: scale(1.03);
                transform-origin: center center;
                background: linear-gradient(rgba(0, 0, 0, ${darknessAlpha}), rgba(0, 0, 0, ${darknessAlpha})), black url("${safeUrl}") center center / cover no-repeat fixed;
                filter: blur(${blurPx}px);
            }
            html {
                background: black !important;
            }
            body {
                background-color: transparent !important;
            }
            #wrapper,
            #content,
            .page__main-content {
                position: relative;
                z-index: 1;
            }
            .sidebar,
            .main-column {
                opacity: 1 !important;
            }
            .sidebar :is(span, p, a, strong, em, small, li, dt, dd, label, code, pre, h1, h2, h3, h4, h5, h6, td, th, button, input, select, textarea),
            .main-column :is(span, p, a, strong, em, small, li, dt, dd, label, code, pre, h1, h2, h3, h4, h5, h6, td, th, button, input, select, textarea),
            .sidebar :is(img, svg, video, canvas),
            .main-column :is(img, svg, video, canvas) {
                opacity: ${columnContentOpacity} !important;
            }
            #header,
            .header,
            .linkbox,
            #header *,
            .header *,
            .linkbox * {
                opacity: 1 !important;
            }
            .page__main-content {
                background-color: transparent !important;
            }
        `;

        applyColumnBackgroundTransparency(columnBgFactor);
        ensureColumnBackgroundObserver(columnBgFactor);
    }

    function parseCssColor(colorString) {
        if (!colorString || colorString === 'transparent') return null;
        const match = colorString.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s\/]+([\d.]+))?\s*\)$/i);
        if (!match) return null;

        const r = Math.max(0, Math.min(255, Math.round(Number(match[1]) || 0)));
        const g = Math.max(0, Math.min(255, Math.round(Number(match[2]) || 0)));
        const b = Math.max(0, Math.min(255, Math.round(Number(match[3]) || 0)));
        const a = match[4] !== undefined ? Math.max(0, Math.min(1, Number(match[4]) || 0)) : 1;
        return { r, g, b, a };
    }

    function applyColumnBackgroundTransparency(alphaFactor) {
        const nodes = document.querySelectorAll('.sidebar, .main-column, .sidebar *, .main-column *');
        nodes.forEach(node => {
            const element = node;
            if (element.closest('#header, .header, .linkbox')) {
                return;
            }
            if (!element.dataset.tmdbBaseBgColor) {
                element.dataset.tmdbBaseBgColor = window.getComputedStyle(element).backgroundColor || '';
            }

            const parsed = parseCssColor(element.dataset.tmdbBaseBgColor);
            if (!parsed || parsed.a === 0) {
                element.style.removeProperty('background-color');
                return;
            }

            const adjustedAlpha = Math.max(0, Math.min(1, parsed.a * alphaFactor));
            element.style.setProperty('background-color', `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${adjustedAlpha.toFixed(3)})`, 'important');
        });
    }

    function scheduleColumnBackgroundRefresh(alphaFactor) {
        if (columnBackgroundObserverTimer) {
            clearTimeout(columnBackgroundObserverTimer);
        }
        columnBackgroundObserverTimer = setTimeout(() => {
            applyColumnBackgroundTransparency(alphaFactor);
        }, 50);
    }

    function ensureColumnBackgroundObserver(alphaFactor) {
        if (columnBackgroundObserver) return;

        const targets = document.querySelectorAll('.sidebar, .main-column');
        if (targets.length === 0) return;

        columnBackgroundObserver = new MutationObserver(() => {
            scheduleColumnBackgroundRefresh(alphaFactor);
        });

        targets.forEach(target => {
            columnBackgroundObserver.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        });
    }

    function pickRandomPreferredBackdrop(backdrops) {
        if (!Array.isArray(backdrops) || backdrops.length === 0) return null;
        const maxWidth = backdrops.reduce((max, item) => Math.max(max, Number(item.width) || 0), 0);
        const candidates = backdrops.filter(item => (Number(item.width) || 0) === maxWidth);
        if (candidates.length === 0) return backdrops[0];

        const index = Math.floor(Math.random() * candidates.length);
        return candidates[index];
    }

    function applyCachedLogoEarly(imdbId) {
        if (!settings.replaceSiteLogo) return;
        const cachedLogo = loadCachedTMDBLogo(imdbId);
        if (!cachedLogo || !cachedLogo.logoUrl) return;

        if (!movieId && cachedLogo.movieId) {
            movieId = cachedLogo.movieId;
            isTVShow = cachedLogo.isTVShow ? 1 : 0;
        }

        replaceSiteLogo(cachedLogo.logoUrl);
    }

    function applyCachedBackdropEarly(imdbId) {
        if (!settings.replacePageBackground) return;
        const cachedBackdropData = loadCachedTMDBBackdrops(imdbId);
        if (!cachedBackdropData || !Array.isArray(cachedBackdropData.backdrops)) return;

        if (!movieId && cachedBackdropData.movieId) {
            movieId = cachedBackdropData.movieId;
            isTVShow = cachedBackdropData.isTVShow ? 1 : 0;
        }

        const selected = pickRandomPreferredBackdrop(cachedBackdropData.backdrops);
        if (selected && selected.url) {
            applyPageBackground(selected.url);
        }
    }

    function fetchAndApplyTMDBLogo(imdbId) {
        if (!settings.replaceSiteLogo || !movieId || !settings.apiKey) return;

        const mediaType = getTMDBMediaType();
        const logoUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/images?api_key=${settings.apiKey}&include_image_language=en,null`;

        fetch(logoUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch TMDB logos');
                return response.json();
            })
            .then(data => {
                const bestLogo = pickBestTMDBLogo(data.logos || []);
                if (!bestLogo || !bestLogo.file_path) return;
                const bestLogoUrl = `https://image.tmdb.org/t/p/original${bestLogo.file_path}`;
                saveCachedTMDBLogo(imdbId, bestLogoUrl, movieId, isTVShow);
                replaceSiteLogo(bestLogoUrl);
            })
            .catch(error => console.warn('TMDB logo lookup failed:', error));
    }

    function fetchAndApplyTMDBBackdrops(imdbId) {
        if (!settings.replacePageBackground || !movieId || !settings.apiKey) return;

        const mediaType = getTMDBMediaType();
        const backdropUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/images?api_key=${settings.apiKey}&include_image_language=en,null`;

        fetch(backdropUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch TMDB backdrops');
                return response.json();
            })
            .then(data => {
                const backdrops = (data.backdrops || [])
                    .filter(item => item && item.file_path)
                    .map(item => ({
                        url: `https://image.tmdb.org/t/p/original${item.file_path}`,
                        width: Number(item.width) || 0,
                        height: Number(item.height) || 0,
                        voteAverage: Number(item.vote_average) || 0
                    }));

                if (backdrops.length === 0) return;
                const maxWidth = backdrops.reduce((max, item) => Math.max(max, Number(item.width) || 0), 0);
                const filteredBackdrops = backdrops.filter(item => (Number(item.width) || 0) === maxWidth);
                if (filteredBackdrops.length === 0) return;

                saveCachedTMDBBackdrops(imdbId, filteredBackdrops, movieId, isTVShow);
                const selected = pickRandomPreferredBackdrop(filteredBackdrops);
                if (selected && selected.url) {
                    applyPageBackground(selected.url);
                }
            })
            .catch(error => console.warn('TMDB backdrop lookup failed:', error));
    }

    // Function to fetch all TMDB video types using IMDb ID
    function searchTMDBVideos(imdbId, callback) {
        if (!settings.apiKey) {
            console.warn('TMDB API key is not configured. Open userscript menu: PTP TMDB Trailer Settings.');
            callback([]);
            return;
        }

        const cached = loadCachedTMDBVideos(imdbId);
        if (cached) {
            movieId = cached.movieId || '';
            isTVShow = cached.isTVShow ? 1 : 0;
            const cachedRatings = loadCachedTMDBRatings(imdbId);
            if (cachedRatings && cachedRatings.ratings) {
                publishTMDBRatings(cachedRatings.ratings, 'cache');
            } else {
                fetchTMDBRatings(imdbId);
            }
            callback(cached.videos || []);
            return;
        }

        const searchUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${settings.apiKey}&external_source=imdb_id`;
        console.warn(`TMDB URL: ${searchUrl}`);

        fetch(searchUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch from TMDB');
                return response.json();
            })
            .then(data => {
                let mediaType = '';
                let match = null;

                if (data && data.movie_results && data.movie_results.length > 0) {
                    match = data.movie_results[0];
                    movieId = match.id;  // Save movieId for later (movie)
                    isTVShow = 0;
                    mediaType = 'movie';
                    console.warn(`TMDB Movie ID: ${movieId}`);
                } else if (data && data.tv_results && data.tv_results.length > 0) {
                    match = data.tv_results[0];
                    movieId = match.id;  // Save tvId for later (TV show)
                    isTVShow = 1;
                    mediaType = 'tv';
                    console.warn(`TMDB TV Show ID: ${movieId}`);
                } else {
                    console.warn('No TMDB movie or TV show found for the IMDb ID:', imdbId);
                    callback([]);
                    return null;
                }

                const ratings = createTMDBRatingsPayload(imdbId, match, mediaType);
                saveCachedTMDBRatings(imdbId, ratings, movieId, isTVShow);
                publishTMDBRatings(ratings, 'api');

                const videoUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/videos?api_key=${settings.apiKey}`;
                return fetch(videoUrl).then(response => {
                    if (!response.ok) throw new Error('Failed to fetch TMDB videos');
                    return response.json();
                });
            })
            .then(data => {
                if (!data) return;

                const tmdbVideos = (data.results || [])
                    .map(video => ({
                        title: `${video.type}: ${video.name}`,
                        videoId: video.key,
                        type: video.type.toLowerCase(), // Used for sorting
                        site: video.site
                    }));
                saveCachedTMDBVideos(imdbId, tmdbVideos, movieId, isTVShow);
                callback(tmdbVideos);
            })
            .catch(error => console.error('Error fetching TMDB videos:', error));
    }

    // Function to set the highest resolution available
    function getHighestResolutionVideoUrl(videoId) {
        const resolutions = ['hd2160', 'hd1440', 'hd1080', 'hd720'];
        const baseUrl = `https://www.youtube.com/embed/${videoId}`;
        return `${baseUrl}?vq=${resolutions[0]}`;
    }

    // Function to sort videos in the desired order
    function sortVideos(videos) {
        const sortOrder = {
            trailer: 1,
            teaser: 2,
            featurette: 3,
            'behind the scenes': 4,
            clip: 5
        };

        return videos.sort((a, b) => {
            const aOrder = sortOrder[a.type] || 100; // Use 100 for unsorted types
            const bOrder = sortOrder[b.type] || 100;
            if (aOrder === bOrder) {
                return a.title.localeCompare(b.title);
            }

            return aOrder - bOrder;
        });
    }

    function showinfo(info, node) {
        const showinfo_class = "tmdb_copyinfobox";

        // Ensure parent has relative positioning to anchor the pop-up correctly
        const parentNode = node.parentElement;
        if (window.getComputedStyle(parentNode).position === 'static') {
            parentNode.style.position = 'relative';
        }

        // Check if the pop-up already exists, if not create it
        let el = parentNode.getElementsByClassName(showinfo_class)[0];
        if (!el) {
            el = document.createElement("div");
            el.classList.add(showinfo_class);
            el.style = `
                position: absolute;
                right: 10px;
                top: -40px;
                background-color: white;
                border: 1px solid red;
                border-radius: 5px;
                padding: 5px;
                color: black;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;`;
            parentNode.insertAdjacentElement("beforeend", el);
        }

        // Set the content and make it visible
        el.textContent = info;
        el.style.opacity = 1; // Fade in
        el.style.visibility = "visible";

        // Start the fade-out after 2 seconds
        setTimeout(() => {
            el.style.opacity = 0; // Fade out
            setTimeout(() => {
                el.style.visibility = "hidden"; // Hide after fading out
            }, 500); // Match the transition duration
        }, 2000); // Keep visible for 2 seconds
    }

    // Function to copy text to clipboard and show the pop-up confirmation
    async function copyToClipboard(text, node) {
        try {
            await navigator.clipboard.writeText(text);
            showinfo("YouTube link copied!", node);  // Use the pop-up instead of alert
        } catch (err) {
            showinfo("Failed to copy link.\nCheck console for errors.", node);
            console.error('Failed to copy text: ', err);
        }
    }

    const TMDB_OPTION_PREFIX = 'tmdb:';

    function getTMDBVideoId(selectValue) {
        return selectValue.startsWith(TMDB_OPTION_PREFIX) ? selectValue.slice(TMDB_OPTION_PREFIX.length) : '';
    }

    function createCopyButton(videoDropdown, getCurrentVideo) {
        const copyLinkButton = document.createElement('a');
        copyLinkButton.textContent = '(Copy YouTube Link)';
        copyLinkButton.style.cursor = 'pointer';
        copyLinkButton.style.marginLeft = '10px';
        copyLinkButton.disabled = true;

        copyLinkButton.addEventListener('click', () => {
            const selected = getCurrentVideo(videoDropdown.value);
            if (!selected || selected.site !== 'YouTube') return;
            copyToClipboard(`https://www.youtube.com/watch?v=${selected.videoId}`, copyLinkButton);
        });

        return copyLinkButton;
    }

    function appendTMDBInfoElements(anchorNode, isTVShow, copyLinkButton) {
        if (!anchorNode) return;
        if (window.getComputedStyle(anchorNode).display !== 'flex') {
            anchorNode.style.display = 'flex';
        }
        anchorNode.style.alignItems = 'center';

        const tmdbLink = addTMDBLink(isTVShow);
        const rightControls = document.createElement('div');
        rightControls.style.display = 'inline-flex';
        rightControls.style.alignItems = 'center';
        rightControls.style.marginLeft = 'auto';
        rightControls.appendChild(tmdbLink);
        rightControls.appendChild(copyLinkButton);
        anchorNode.appendChild(rightControls);
    }

    function watchForLateImdbSelector(panelBody, videos, originalIframe, videoDiv, originalLoaded, isTVShow, fallbackContainer) {
        const observer = new MutationObserver(() => {
            const externalSelector = panelBody.querySelector('#imdb-trailer-selector');
            if (!externalSelector || externalSelector.dataset.tmdbIntegrated === '1') return;

            populateDropdowns(videos, externalSelector, originalIframe, videoDiv, originalLoaded, isTVShow, true);
            externalSelector.dataset.tmdbIntegrated = '1';

            if (fallbackContainer && fallbackContainer.parentElement) {
                fallbackContainer.parentElement.removeChild(fallbackContainer);
            }
            observer.disconnect();
        });

        observer.observe(panelBody, { childList: true, subtree: true });
    }

    // Modify the populateDropdowns function to support integrating with an existing selector
    function populateDropdowns(videos, videoDropdown, originalIframe, videoDiv, originalLoaded, isTVShow, useExistingSelector) {
        const enabledTypes = settings.enabledVideoTypes || {};
        const filteredVideos = videos.filter(video => enabledTypes[video.type] !== false);
        const sortedVideos = sortVideos(filteredVideos);
        const getCurrentTMDBVideo = (selectValue) => {
            const videoId = useExistingSelector ? getTMDBVideoId(selectValue) : selectValue;
            return sortedVideos.find(video => video.videoId === videoId);
        };
        const copyLinkButton = createCopyButton(videoDropdown, getCurrentTMDBVideo);

        if (useExistingSelector) {
            if (videoDropdown.dataset.tmdbIntegrated === '1') return;
            videoDropdown.dataset.tmdbIntegrated = '1';

            const existingGroup = Array.from(videoDropdown.querySelectorAll('optgroup'))
                .find(group => group.label === 'TMDB Videos');
            const group = existingGroup || document.createElement('optgroup');
            group.label = 'TMDB Videos';

            sortedVideos.forEach(video => {
                const optionValue = `${TMDB_OPTION_PREFIX}${video.videoId}`;
                const alreadyPresent = Array.from(group.querySelectorAll('option'))
                    .some(option => option.value === optionValue);
                if (alreadyPresent) return;

                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = video.title;
                group.appendChild(option);
            });

            if (!existingGroup) {
                videoDropdown.appendChild(group);
            }

            videoDropdown.addEventListener('change', function(event) {
                const selectedVideoId = getTMDBVideoId(videoDropdown.value);
                if (!selectedVideoId) {
                    copyLinkButton.disabled = true;
                    return;
                }

                const selectedVideo = sortedVideos.find(video => video.videoId === selectedVideoId);
                if (!selectedVideo) {
                    copyLinkButton.disabled = true;
                    return;
                }

                event.stopImmediatePropagation();
                event.stopPropagation();

                if (selectedVideo.site === 'YouTube') {
                    videoDiv.innerHTML = `<iframe width="100%" height="400px" src="${getHighestResolutionVideoUrl(selectedVideo.videoId)}" frameborder="0" allowfullscreen></iframe>`;
                    copyLinkButton.disabled = false;
                } else {
                    videoDiv.innerHTML = `Video hosted on ${selectedVideo.site}, cannot auto-play here.`;
                    copyLinkButton.disabled = true;
                }
            }, true);

            appendTMDBInfoElements(videoDropdown.parentElement, isTVShow, copyLinkButton);
            return;
        }

        // Standalone mode (legacy behavior when no existing selector is present)
        videoDropdown.innerHTML = '';

        const originalOption = document.createElement('option');
        originalOption.value = 'original';
        originalOption.textContent = 'Original Video';
        videoDropdown.appendChild(originalOption);

        sortedVideos.forEach(video => {
            const option = document.createElement('option');
            option.value = video.videoId;
            option.textContent = video.title;
            videoDropdown.appendChild(option);
        });

        if (originalLoaded) {
            videoDiv.innerHTML = originalIframe;
        }

        videoDropdown.addEventListener('change', function() {
            const selectedVideoId = videoDropdown.value;
            const selectedVideo = sortedVideos.find(video => video.videoId === selectedVideoId);

            if (selectedVideoId === 'original') {
                videoDiv.innerHTML = originalIframe;
                copyLinkButton.disabled = true;
            } else if (selectedVideo && selectedVideo.site === 'YouTube') {
                videoDiv.innerHTML = `<iframe width="100%" height="400px" src="${getHighestResolutionVideoUrl(selectedVideoId)}" frameborder="0" allowfullscreen></iframe>`;
                copyLinkButton.disabled = false;
            } else {
                videoDiv.innerHTML = `Video hosted on ${selectedVideo ? selectedVideo.site : 'an unknown site'}, cannot auto-play here.`;
                copyLinkButton.disabled = true;
            }
        });

        if (!originalLoaded && sortedVideos.length > 0 && sortedVideos[0].site === 'YouTube') {
            const firstVideo = sortedVideos[0];
            videoDiv.innerHTML = `<iframe width="100%" height="400px" src="${getHighestResolutionVideoUrl(firstVideo.videoId)}" frameborder="0" allowfullscreen></iframe>`;
            copyLinkButton.disabled = false;
        }

        appendTMDBInfoElements(videoDropdown.parentElement, isTVShow, copyLinkButton);
    }

    // Function to add TMDB link for both movies and TV shows
    function addTMDBLink(isTVShow) {
        const tmdbLink = document.createElement('a');
        if (isTVShow === 1) {
            tmdbLink.href = `https://www.themoviedb.org/tv/${movieId}`;  // TV show link
        } else {
            tmdbLink.href = `https://www.themoviedb.org/movie/${movieId}`;  // Movie link
        }
        tmdbLink.target = '_blank';
        tmdbLink.style.marginLeft = '10px';

        const tmdbIcon = document.createElement('img');
        tmdbIcon.title = 'TMDB Link';
        tmdbIcon.style.height = '18px';
        tmdbIcon.style.verticalAlign = 'middle';
        tmdbIcon.src = `data:image/svg+xml;base64,${tmdbIconBase64}`;
        tmdbIcon.alt = 'TMDB Link';
        tmdbIcon.title = 'TMDB Link';

        tmdbLink.appendChild(tmdbIcon);
        return tmdbLink;
    }

    function initializeWhenReady() {
        if (hasInitialized) return true;

        const imdbId = getImdbIdFromPage();
        const synopsisPanel = document.querySelector('#synopsis-and-trailer');
        const panelBody = synopsisPanel ? synopsisPanel.querySelector('.panel__body') : null;
        const videoDiv = panelBody ? panelBody.querySelector('#trailer') : null;

        if (!imdbId || !synopsisPanel || !panelBody || !videoDiv) {
            return false;
        }

        hasInitialized = true;
        console.log('TMDB Video Selector Loaded.');
        applyCachedLogoEarly(imdbId);
        applyCachedBackdropEarly(imdbId);

        const originalIframe = videoDiv.innerHTML;
        let originalLoaded = true;

        const existingSelector = panelBody.querySelector('#imdb-trailer-selector');
        let containerDiv;
        let videoDropdown;
        let useExistingSelector = false;

        if (existingSelector) {
            videoDropdown = existingSelector;
            containerDiv = existingSelector.parentElement;
            useExistingSelector = true;
        } else {
            containerDiv = document.createElement('div');
            containerDiv.style.display = 'flex';
            containerDiv.style.justifyContent = 'space-between';
            containerDiv.style.alignItems = 'center';
            containerDiv.style.marginBottom = '10px';

            videoDropdown = document.createElement('select');
            videoDropdown.style.marginRight = '10px';
            containerDiv.appendChild(videoDropdown);
            panelBody.insertBefore(containerDiv, videoDiv);
        }

        searchTMDBVideos(imdbId, (videos) => {
            fetchAndApplyTMDBLogo(imdbId);
            fetchAndApplyTMDBBackdrops(imdbId);
            if (videos.length > 0) {
                populateDropdowns(videos, videoDropdown, originalIframe, videoDiv, originalLoaded, isTVShow, useExistingSelector);
                if (!useExistingSelector) {
                    watchForLateImdbSelector(panelBody, videos, originalIframe, videoDiv, originalLoaded, isTVShow, containerDiv);
                }
            } else {
                console.error('No videos found.');
            }
        });

        return true;
    }

    function boot() {
        registerTMDBRatingsEventBridge();

        if (initializeWhenReady()) return;

        const observer = new MutationObserver(() => {
            if (initializeWhenReady()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        window.addEventListener('load', () => {
            if (initializeWhenReady()) observer.disconnect();
        }, { once: true });
    }

    boot();
})();
