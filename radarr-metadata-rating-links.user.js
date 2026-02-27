// ==UserScript==
// @name         Radarr - Metadata Rating Links
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.1.0
// @description  Use Radarr API metadata to make TMDb/IMDb/Trakt rating badges clickable on movie pages. Add ptp link
// @author       Audionut
// @match        http://localhost:7878/*
// @match        https://localhost:7878/*
// @match        http://127.0.0.1:7878/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE = {
        legacyApiKey: 'radarr_api_key',
        legacyBaseUrl: 'radarr_api_base_url',
        settings: 'radarr_metadata_links_settings_v2'
    };

    const FAVICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const REDACTED_API_KEY_PLACEHOLDER = '<Redacted>';

    const DEFAULT_SETTINGS = {
        radarr: {
            baseUrl: '',
            apiKey: ''
        },
        customSites: [],
        faviconCache: {
            ttlMs: FAVICON_CACHE_TTL_MS,
            byOrigin: {}
        }
    };

    const metadataCache = new Map();
    const pendingFetches = new Map();
    let updateTimer = null;
    let settingsCache = null;
    let customRatingsContainer = null;
    let customRatingEntries = [];

    function getTmdbIdFromPathname(pathname) {
        const match = pathname.match(/\/movie\/(\d+)(?:\/|$)/i);
        return match ? match[1] : null;
    }

    function normalizeBaseUrl(value) {
        return (value || '').trim().replace(/\/$/, '');
    }

    function cloneDefaultSettings() {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    function createDefaultCustomSite() {
        return {
            enabled: true,
            name: '',
            url: '',
            iconInput: '',
            useTemplate: false
        };
    }

    function sanitizeSettings(raw) {
        const defaults = cloneDefaultSettings();
        const output = cloneDefaultSettings();

        if (!raw || typeof raw !== 'object') {
            return output;
        }

        if (raw.radarr && typeof raw.radarr === 'object') {
            output.radarr.baseUrl = normalizeBaseUrl(raw.radarr.baseUrl || defaults.radarr.baseUrl);
            output.radarr.apiKey = String(raw.radarr.apiKey || defaults.radarr.apiKey).trim();
        }

        const incomingSites = Array.isArray(raw.customSites) ? raw.customSites : [];
        output.customSites = incomingSites
            .map((entry) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }

                const site = createDefaultCustomSite();
                site.enabled = entry.enabled !== false;
                site.name = String(entry.name || '').trim();
                site.url = String(entry.url || '').trim();
                site.iconInput = String(entry.iconInput || '').trim();
                site.useTemplate = entry.useTemplate === true;
                return site;
            })
            .filter(Boolean);

        if (raw.faviconCache && typeof raw.faviconCache === 'object') {
            output.faviconCache.ttlMs = Number(raw.faviconCache.ttlMs) > 0
                ? Number(raw.faviconCache.ttlMs)
                : defaults.faviconCache.ttlMs;

            const entries = raw.faviconCache.byOrigin && typeof raw.faviconCache.byOrigin === 'object'
                ? raw.faviconCache.byOrigin
                : {};

            Object.keys(entries).forEach((origin) => {
                const entry = entries[origin];
                if (!entry || typeof entry !== 'object') {
                    return;
                }

                output.faviconCache.byOrigin[origin] = {
                    iconUrl: String(entry.iconUrl || '').trim(),
                    fetchedAt: Number(entry.fetchedAt) || 0,
                    expiresAt: Number(entry.expiresAt) || 0,
                    failCount: Number(entry.failCount) || 0,
                    lastError: String(entry.lastError || '').trim()
                };
            });
        }

        return output;
    }

    async function saveSettings(nextSettings) {
        const sanitized = sanitizeSettings(nextSettings);
        settingsCache = sanitized;
        await GM.setValue(STORAGE.settings, sanitized);
        return sanitized;
    }

    async function loadSettings(forceRefresh) {
        if (!forceRefresh && settingsCache) {
            return settingsCache;
        }

        const stored = await GM.getValue(STORAGE.settings, null);
        const settings = sanitizeSettings(stored);

        if (!stored || typeof stored !== 'object') {
            const legacyBaseUrl = normalizeBaseUrl(await GM.getValue(STORAGE.legacyBaseUrl, ''));
            const legacyApiKey = (await GM.getValue(STORAGE.legacyApiKey, '') || '').trim();

            if (legacyBaseUrl) {
                settings.radarr.baseUrl = legacyBaseUrl;
            }
            if (legacyApiKey) {
                settings.radarr.apiKey = legacyApiKey;
            }

            await saveSettings(settings);
            return settings;
        }

        settingsCache = settings;
        return settings;
    }

    async function getConfig() {
        const settings = await loadSettings();
        return {
            baseUrl: settings.radarr.baseUrl || globalThis.location.origin,
            apiKey: settings.radarr.apiKey
        };
    }

    function tryGetApiKeyFromPage() {
        if (globalThis.Radarr && typeof globalThis.Radarr.apiKey === 'string' && globalThis.Radarr.apiKey.trim()) {
            return globalThis.Radarr.apiKey.trim();
        }

        const runtimeApiKey = globalThis.__APP_CONFIG__ && typeof globalThis.__APP_CONFIG__.apiKey === 'string'
            ? globalThis.__APP_CONFIG__.apiKey.trim()
            : '';
        if (runtimeApiKey) {
            return runtimeApiKey;
        }

        return '';
    }

    function getDomainLabel(rawUrl) {
        try {
            const parsed = new URL(rawUrl);
            return parsed.hostname.replace(/^www\./i, '') || 'External';
        } catch (_error) {
            return 'External';
        }
    }

    function isLikelyImageUrl(value) {
        if (!value) {
            return false;
        }

        if (/^data:image\//i.test(value)) {
            return true;
        }

        try {
            const parsed = new URL(value);
            return /^https?:$/i.test(parsed.protocol);
        } catch (_error) {
            return false;
        }
    }

    function gmRequest(options) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                ...options,
                onload: resolve,
                onerror: () => reject(new Error(`Request failed: ${options.url}`)),
                ontimeout: () => reject(new Error(`Request timed out: ${options.url}`))
            });
        });
    }

    function readHeader(headers, headerName) {
        const match = String(headers || '').match(new RegExp(`^${headerName}:\\s*(.+)$`, 'im'));
        return match ? match[1].trim() : '';
    }

    async function discoverFaviconCandidates(pageUrl) {
        const candidates = [];
        let origin = '';

        try {
            origin = new URL(pageUrl).origin;
        } catch (_error) {
            return candidates;
        }

        try {
            const response = await gmRequest({
                method: 'GET',
                url: pageUrl,
                timeout: 7000,
                headers: {
                    Accept: 'text/html,*/*;q=0.8'
                }
            });

            if (response.status >= 200 && response.status < 400 && response.responseText) {
                const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
                const links = Array.from(doc.querySelectorAll('link[href]'));
                links.forEach((link) => {
                    const rel = String(link.getAttribute('rel') || '').toLowerCase();
                    if (!rel.includes('icon')) {
                        return;
                    }

                    const href = String(link.getAttribute('href') || '').trim();
                    if (!href) {
                        return;
                    }

                    try {
                        candidates.push(new URL(href, pageUrl).href);
                    } catch (_error) {
                    }
                });
            }
        } catch (_error) {
        }

        candidates.push(`${origin}/favicon.ico`);
        return Array.from(new Set(candidates));
    }

    async function findFirstReachableIcon(urls) {
        for (let i = 0; i < urls.length; i += 1) {
            const url = urls[i];
            if (!url) {
                continue;
            }

            try {
                const response = await gmRequest({
                    method: 'GET',
                    url,
                    timeout: 7000,
                    headers: {
                        Accept: 'image/*,*/*;q=0.3'
                    }
                });

                const contentType = readHeader(response.responseHeaders, 'content-type').toLowerCase();
                const looksLikeImage = contentType.includes('image') || /\.(ico|png|svg|jpg|jpeg|webp)(\?|$)/i.test(url);
                if (response.status >= 200 && response.status < 400 && looksLikeImage) {
                    return url;
                }
            } catch (_error) {
            }
        }

        return '';
    }

    async function resolveAutoFavicon(settings, siteUrl) {
        let origin = '';

        try {
            origin = new URL(siteUrl).origin;
        } catch (_error) {
            return '';
        }

        const now = Date.now();
        const ttlMs = Number(settings.faviconCache.ttlMs) > 0 ? Number(settings.faviconCache.ttlMs) : FAVICON_CACHE_TTL_MS;
        const existing = settings.faviconCache.byOrigin[origin];

        if (existing && existing.iconUrl && existing.expiresAt > now) {
            return existing.iconUrl;
        }

        const candidates = await discoverFaviconCandidates(siteUrl);
        const iconUrl = await findFirstReachableIcon(candidates);

        settings.faviconCache.byOrigin[origin] = {
            iconUrl,
            fetchedAt: now,
            expiresAt: now + ttlMs,
            failCount: iconUrl ? 0 : ((existing && existing.failCount) || 0) + 1,
            lastError: iconUrl ? '' : 'No reachable icon found'
        };

        await saveSettings(settings);
        return iconUrl;
    }

    async function resolveCustomIcon(settings, site) {
        if (!site || typeof site !== 'object') {
            return '';
        }

        const iconInput = String(site.iconInput || '').trim();
        if (iconInput && isLikelyImageUrl(iconInput)) {
            return iconInput;
        }

        const siteUrl = String(site.url || '').trim();
        if (!siteUrl) {
            return '';
        }

        return resolveAutoFavicon(settings, siteUrl);
    }

    function applyTemplateToUrl(template, values) {
        const tokenMap = {
            imdbid: 'imdbId',
            tmdbid: 'tmdbId',
            title: 'title',
            year: 'year'
        };

        return String(template || '').replace(/\{([^{}]+)\}/g, (match, key) => {
            const normalized = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const valueKey = tokenMap[normalized];
            if (!valueKey) {
                return match;
            }

            return values[valueKey] || '';
        });
    }

    function buildCustomHref(site, values) {
        const rawUrl = String(site.url || '').trim();
        if (!rawUrl) {
            return '';
        }

        if (site.useTemplate) {
            return applyTemplateToUrl(rawUrl, values).trim();
        }

        if (!values.imdbId) {
            return '';
        }

        return `${rawUrl}${values.imdbId}`;
    }

    function createModalField(labelText, input) {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'block';
        wrapper.style.fontSize = '13px';
        wrapper.style.marginBottom = '10px';

        const label = document.createElement('div');
        label.textContent = labelText;
        label.style.fontWeight = '600';
        label.style.marginBottom = '4px';

        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '8px';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '6px';
        input.style.background = '#1f1f1f';
        input.style.color = '#fff';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        return wrapper;
    }

    function styleModalInput(input) {
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.padding = '8px';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '6px';
        input.style.background = '#1f1f1f';
        input.style.color = '#fff';
    }

    function createCustomSiteEditor(site, index, totalSites, onMove, onDelete) {
        if (typeof site._uiCollapsed !== 'boolean') {
            site._uiCollapsed = true;
        }

        const card = document.createElement('div');
        card.style.border = '1px solid #333';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.marginBottom = '10px';
        card.style.background = '#171717';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        header.style.gap = '10px';
        header.style.cursor = 'pointer';

        const title = document.createElement('strong');
        title.style.flex = '1';
        title.style.minWidth = '140px';
        title.textContent = site.name || `Custom Site ${index + 1}`;

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '6px';

        const upButton = document.createElement('button');
        upButton.type = 'button';
        upButton.textContent = '↑';
        upButton.disabled = index === 0;

        const downButton = document.createElement('button');
        downButton.type = 'button';
        downButton.textContent = '↓';
        downButton.disabled = index >= totalSites - 1;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';

        [upButton, downButton, deleteButton].forEach((button) => {
            button.style.padding = '6px 8px';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.background = '#252525';
            button.style.color = '#fff';
            if (button.disabled) {
                button.style.opacity = '0.55';
                button.style.cursor = 'default';
            }
        });

        upButton.addEventListener('click', () => onMove(index, -1));
        downButton.addEventListener('click', () => onMove(index, 1));
        deleteButton.addEventListener('click', () => onDelete(index));

        controls.appendChild(upButton);
        controls.appendChild(downButton);
        controls.appendChild(deleteButton);

        header.appendChild(title);
        header.appendChild(controls);

        const body = document.createElement('div');
        body.style.display = site._uiCollapsed ? 'none' : 'block';

        const setCollapsed = (collapsed) => {
            site._uiCollapsed = collapsed;
            body.style.display = collapsed ? 'none' : 'block';
            header.style.marginBottom = collapsed ? '0' : '8px';
        };

        header.addEventListener('click', (event) => {
            if (event.target && (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT')) {
                return;
            }

            setCollapsed(!site._uiCollapsed);
        });

        setCollapsed(site._uiCollapsed);

        const enabledRow = document.createElement('label');
        enabledRow.style.display = 'flex';
        enabledRow.style.alignItems = 'center';
        enabledRow.style.gap = '8px';
        enabledRow.style.marginBottom = '10px';
        enabledRow.style.fontSize = '13px';

        const enabledInput = document.createElement('input');
        enabledInput.type = 'checkbox';
        enabledInput.checked = site.enabled !== false;
        enabledInput.addEventListener('change', () => {
            site.enabled = enabledInput.checked;
        });

        const enabledText = document.createElement('span');
        enabledText.textContent = 'Enabled';
        enabledRow.appendChild(enabledInput);
        enabledRow.appendChild(enabledText);

        const useTemplateRow = document.createElement('label');
        useTemplateRow.style.display = 'flex';
        useTemplateRow.style.alignItems = 'center';
        useTemplateRow.style.gap = '8px';
        useTemplateRow.style.marginBottom = '10px';
        useTemplateRow.style.fontSize = '13px';

        const useTemplateInput = document.createElement('input');
        useTemplateInput.type = 'checkbox';
        useTemplateInput.checked = site.useTemplate === true;
        useTemplateInput.addEventListener('change', () => {
            site.useTemplate = useTemplateInput.checked;
        });

        const useTemplateText = document.createElement('span');
        useTemplateText.textContent = 'Use template URL';
        useTemplateRow.appendChild(useTemplateInput);
        useTemplateRow.appendChild(useTemplateText);

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.placeholder = 'https://example.com/search/';
        urlInput.value = site.url || '';
        styleModalInput(urlInput);
        urlInput.addEventListener('input', () => {
            site.url = (urlInput.value || '').trim();
        });

        const iconInput = document.createElement('input');
        iconInput.type = 'text';
        iconInput.placeholder = 'PNG/ICO URL or data:image/...;base64,...';
        iconInput.value = site.iconInput || '';
        styleModalInput(iconInput);
        iconInput.addEventListener('input', () => {
            site.iconInput = (iconInput.value || '').trim();
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Custom Site ${index + 1}`;
        nameInput.value = site.name || '';
        styleModalInput(nameInput);
        nameInput.addEventListener('input', () => {
            site.name = (nameInput.value || '').trim();
            title.textContent = site.name || `Custom Site ${index + 1}`;
        });

        body.appendChild(enabledRow);
        body.appendChild(useTemplateRow);
        body.appendChild(createModalField('Site Title', nameInput));
        body.appendChild(createModalField('Site URL', urlInput));
        body.appendChild(createModalField('Site Icon (optional)', iconInput));

        card.appendChild(header);
        card.appendChild(body);
        return card;
    }

    async function openSettingsModal() {
        const existing = document.getElementById('radarr-links-settings-overlay');
        if (existing) {
            existing.remove();
        }

        const settings = await loadSettings();

        const overlay = document.createElement('div');
        overlay.id = 'radarr-links-settings-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0, 0, 0, 0.75)';
        overlay.style.zIndex = '2147483647';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const modal = document.createElement('div');
        modal.style.width = 'min(560px, 92vw)';
        modal.style.maxHeight = '90vh';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.background = '#121212';
        modal.style.color = '#fff';
        modal.style.border = '1px solid #333';
        modal.style.borderRadius = '10px';
        modal.style.padding = '14px';
        modal.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        modal.style.boxShadow = '0 10px 35px rgba(0, 0, 0, 0.45)';

        const modalContent = document.createElement('div');
        modalContent.style.overflowY = 'auto';
        modalContent.style.flex = '1';
        modalContent.style.paddingRight = '4px';

        const title = document.createElement('h2');
        title.textContent = 'Radarr Metadata Links Settings';
        title.style.margin = '0 0 14px';
        title.style.fontSize = '18px';

        const radarrBaseInput = document.createElement('input');
        radarrBaseInput.type = 'text';
        radarrBaseInput.placeholder = globalThis.location.origin;
        radarrBaseInput.value = settings.radarr.baseUrl || '';

        const radarrKeyInput = document.createElement('input');
        radarrKeyInput.type = 'text';
        radarrKeyInput.placeholder = 'Optional if Radarr runtime key is available';
        let apiKeyEdited = false;
        if ((settings.radarr.apiKey || '').trim()) {
            radarrKeyInput.value = REDACTED_API_KEY_PLACEHOLDER;
        } else {
            radarrKeyInput.value = '';
        }
        radarrKeyInput.addEventListener('input', () => {
            apiKeyEdited = true;
        });

        const workingSites = Array.isArray(settings.customSites)
            ? settings.customSites.map((site) => ({ ...createDefaultCustomSite(), ...site }))
            : [];

        const customSection = document.createElement('div');
        customSection.style.marginBottom = '12px';

        const customTitle = document.createElement('h3');
        customTitle.textContent = 'Custom Sites';
        customTitle.style.margin = '10px 0 8px';
        customTitle.style.fontSize = '15px';

        const sitesContainer = document.createElement('div');
        sitesContainer.style.maxHeight = '42vh';
        sitesContainer.style.overflowY = 'auto';
        sitesContainer.style.paddingRight = '4px';

        const addSiteButton = document.createElement('button');
        addSiteButton.type = 'button';
        addSiteButton.textContent = 'Add Site';
        addSiteButton.style.padding = '8px 10px';
        addSiteButton.style.border = '1px solid #666';
        addSiteButton.style.borderRadius = '6px';
        addSiteButton.style.cursor = 'pointer';
        addSiteButton.style.background = '#252525';
        addSiteButton.style.color = '#fff';

        const emptyState = document.createElement('div');
        emptyState.style.fontSize = '12px';
        emptyState.style.opacity = '0.8';
        emptyState.style.marginBottom = '8px';
        emptyState.textContent = 'No custom sites configured.';

        const moveSite = (index, direction) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= workingSites.length) {
                return;
            }

            const temp = workingSites[index];
            workingSites[index] = workingSites[nextIndex];
            workingSites[nextIndex] = temp;
            renderSites();
        };

        const deleteSite = (index) => {
            if (index < 0 || index >= workingSites.length) {
                return;
            }

            workingSites.splice(index, 1);
            renderSites();
        };

        function renderSites() {
            sitesContainer.textContent = '';

            if (workingSites.length === 0) {
                sitesContainer.appendChild(emptyState);
                return;
            }

            workingSites.forEach((site, index) => {
                sitesContainer.appendChild(createCustomSiteEditor(site, index, workingSites.length, moveSite, deleteSite));
            });
        }

        addSiteButton.addEventListener('click', () => {
            const newSite = createDefaultCustomSite();
            newSite._uiCollapsed = false;
            workingSites.push(newSite);
            renderSites();
        });

        customSection.appendChild(customTitle);
        customSection.appendChild(sitesContainer);
        customSection.appendChild(addSiteButton);

        renderSites();

        const helper = document.createElement('div');
        helper.textContent = 'When template mode is enabled, URL supports {imdbId}, {tmdbId}, {title}, {year}. Without template mode, IMDb ID is appended. Leave icon empty to auto-resolve favicon and cache it.';
        helper.style.fontSize = '12px';
        helper.style.opacity = '0.8';
        helper.style.marginBottom = '12px';

        const status = document.createElement('div');
        status.style.minHeight = '18px';
        status.style.fontSize = '12px';
        status.style.marginBottom = '10px';
        status.style.color = '#9ecbff';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.flexWrap = 'wrap';
        actions.style.paddingTop = '10px';
        actions.style.marginTop = '8px';
        actions.style.borderTop = '1px solid #2a2a2a';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';

        const clearCacheButton = document.createElement('button');
        clearCacheButton.type = 'button';
        clearCacheButton.textContent = 'Clear Favicon Cache';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';

        [saveButton, clearCacheButton, cancelButton].forEach((button) => {
            button.style.padding = '8px 10px';
            button.style.border = '1px solid #666';
            button.style.borderRadius = '6px';
            button.style.cursor = 'pointer';
            button.style.background = '#252525';
            button.style.color = '#fff';
        });

        actions.appendChild(saveButton);
        actions.appendChild(clearCacheButton);
        actions.appendChild(cancelButton);

        modalContent.appendChild(title);
        modalContent.appendChild(createModalField('Radarr Base URL', radarrBaseInput));
        modalContent.appendChild(createModalField('Radarr API Key', radarrKeyInput));
        modalContent.appendChild(customSection);
        modalContent.appendChild(helper);
        modalContent.appendChild(status);

        modal.appendChild(modalContent);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            overlay.remove();
        });

        modal.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        cancelButton.addEventListener('click', () => {
            overlay.remove();
        });

        clearCacheButton.addEventListener('click', async () => {
            const latest = await loadSettings();
            latest.faviconCache.byOrigin = {};
            await saveSettings(latest);
            status.textContent = 'Favicon cache cleared.';
        });

        saveButton.addEventListener('click', async () => {
            const latest = await loadSettings();
            latest.radarr.baseUrl = normalizeBaseUrl(radarrBaseInput.value || '');

            if (!apiKeyEdited && (settings.radarr.apiKey || '').trim()) {
                latest.radarr.apiKey = settings.radarr.apiKey;
            } else {
                const apiValue = (radarrKeyInput.value || '').trim();
                latest.radarr.apiKey = apiValue === REDACTED_API_KEY_PLACEHOLDER ? settings.radarr.apiKey : apiValue;
            }

            latest.customSites = workingSites
                .map((site) => ({ ...createDefaultCustomSite(), ...site }))
                .filter((site) => String(site.url || '').trim())
                .map((site) => {
                    const normalized = {
                        enabled: site.enabled !== false,
                        useTemplate: site.useTemplate === true,
                        name: String(site.name || '').trim(),
                        url: String(site.url || '').trim(),
                        iconInput: String(site.iconInput || '').trim()
                    };

                    return normalized;
                });

            const invalidIcon = latest.customSites.find((site) => {
                return site.iconInput && !isLikelyImageUrl(site.iconInput);
            });

            if (invalidIcon) {
                status.textContent = 'Each custom icon must be a valid image URL or data:image base64 string.';
                return;
            }

            await saveSettings(latest);
            overlay.remove();
            globalThis.location.reload();
        });
    }

    async function fetchMovieLookup(tmdbId) {
        const config = await getConfig();
        const keyFromPage = tryGetApiKeyFromPage();
        const apiKey = config.apiKey || keyFromPage;

        const url = `${config.baseUrl}/api/v3/movie/lookup?term=tmdb:${encodeURIComponent(tmdbId)}`;
        const headers = { Accept: 'application/json' };
        if (apiKey) {
            headers['X-Api-Key'] = apiKey;
        }

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error('Radarr API unauthorized. Set your API key from the userscript menu.');
        }

        if (!response.ok) {
            throw new Error(`Radarr API request failed: ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }

        const exact = payload.find((item) => String(item.tmdbId || '') === String(tmdbId));
        return exact || payload[0] || null;
    }

    async function getMovieMetadata(tmdbId) {
        if (metadataCache.has(tmdbId)) {
            return metadataCache.get(tmdbId);
        }

        if (pendingFetches.has(tmdbId)) {
            return pendingFetches.get(tmdbId);
        }

        const fetchPromise = fetchMovieLookup(tmdbId)
            .then((metadata) => {
                metadataCache.set(tmdbId, metadata);
                pendingFetches.delete(tmdbId);
                return metadata;
            })
            .catch((error) => {
                pendingFetches.delete(tmdbId);
                throw error;
            });

        pendingFetches.set(tmdbId, fetchPromise);
        return fetchPromise;
    }

    function buildLinkMap(tmdbId, metadata, settings) {
        const imdbId = metadata && metadata.imdbId ? String(metadata.imdbId).trim() : '';
        const trailerId = metadata && metadata.youTubeTrailerId ? String(metadata.youTubeTrailerId).trim() : '';
        const title = metadata && metadata.title ? String(metadata.title).trim() : '';
        const year = metadata && (metadata.year || metadata.inCinemas)
            ? String(metadata.year || new Date(metadata.inCinemas).getFullYear() || '').trim()
            : '';

        const templateValues = {
            imdbId,
            tmdbId: String(tmdbId || '').trim(),
            title: encodeURIComponent(title),
            year
        };

        const customLinks = Array.isArray(settings.customSites)
            ? settings.customSites
                .map((site, index) => {
                    if (!site || site.enabled === false) {
                        return null;
                    }

                    const href = buildCustomHref(site, templateValues);
                    if (!href) {
                        return null;
                    }

                    const label = getDomainLabel(site.url);
                    const customName = String(site.name || '').trim();
                    return {
                        id: `custom-${index}`,
                        href,
                        title: `${customName || label} search`,
                        label: customName || label,
                        site
                    };
                })
                .filter(Boolean)
            : [];

        return {
            tmdb: {
                href: `https://www.themoviedb.org/movie/${tmdbId}`,
                title: `TMDb ID: ${tmdbId}`
            },
            imdb: imdbId
                ? {
                    href: `https://www.imdb.com/title/${imdbId}/`,
                    title: `IMDb ID: ${imdbId}`
                }
                : null,
            trakt: {
                href: `https://trakt.tv/search/tmdb/${tmdbId}?id_type=movie`,
                title: `Trakt (TMDb ${tmdbId})`
            },
            ptp: imdbId
                ? {
                    href: `https://passthepopcorn.me/torrents.php?searchstr=${encodeURIComponent(imdbId)}`,
                    title: `PTP search: ${imdbId}`
                }
                : null,
            trailer: trailerId
                ? {
                    href: `https://www.youtube.com/watch?v=${trailerId}`,
                    title: `YouTube trailer: ${trailerId}`
                }
                : null,
            customLinks
        };
    }

    function getRatingsContext() {
        const tmdbImage = document.querySelector('img[alt="TMDb Rating"]');
        const imdbImage = document.querySelector('img[alt="IMDb Rating"]');
        const traktImage = document.querySelector('img[alt="Trakt Rating"]');
        const referenceImage = tmdbImage || imdbImage || traktImage;
        if (!referenceImage) {
            return null;
        }

        const detailsContainer =
            referenceImage.closest('div[class*="MovieDetails-details"]') ||
            referenceImage.closest('div[class*="MovieDetails-ratings"]') ||
            referenceImage.parentElement;
        if (!detailsContainer) {
            return null;
        }

        const ratingTemplate =
            referenceImage.closest('span[class*="MovieDetails-rating"]') ||
            detailsContainer.querySelector('span[class*="MovieDetails-rating"]');

        return { referenceImage, detailsContainer, ratingTemplate };
    }

    function ensurePtpRatingIcon(linkData) {
        if (!linkData || !linkData.href) {
            return;
        }

        const context = getRatingsContext();
        if (!context) {
            return;
        }

        const { referenceImage, detailsContainer, ratingTemplate } = context;

        const existing = detailsContainer.querySelector('a[data-radarr-link-ptp="1"]');
        if (existing) {
            existing.href = linkData.href;
            existing.title = linkData.title;
            return;
        }

        const ratingWrapper = document.createElement('span');
        if (ratingTemplate && ratingTemplate.className) {
            ratingWrapper.className = ratingTemplate.className;
        }

        const innerSpan = document.createElement('span');
        const anchor = document.createElement('a');
        anchor.href = linkData.href;
        anchor.title = linkData.title;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        anchor.dataset.radarrLinkPtp = '1';
        anchor.style.display = 'inline-flex';
        anchor.style.alignItems = 'center';
        anchor.style.lineHeight = '0';

        const img = document.createElement('img');
        img.alt = 'PTP Search';
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAA5CAMAAAC7xnO3AAAAV1BMVEUAAAD///9oiM2CacFm5Mj/jGb842dn3auC3X/z82j/uWZw14xudcRwbsBmpdz83GZm4NBq26KP4Hrm9Wr/rmdmr91u2ZNmntln5L/902b/l2Zt1otnseEVRKmYAAAAeUlEQVRIx+3WtwqAMBCAYU2zpNlii+//nAZFCDooSIaQ+5fjhm89LoNCl7u+TpCvM8kopUNda81YVfVu78rS8rEtCkJI4/ZNKYSQkBJjfJerk4sv+SHnUxo1/ZMCJEiQIKOV8pKPe8s8aa317q3x7m2SxfUnxCWhAO24CSsei22B/wAAAABJRU5ErkJggg==';
        const referenceHeight = referenceImage.getBoundingClientRect().height;
        img.style.height = referenceHeight > 0 ? `${Math.round(referenceHeight * 1.3)}px` : '26px';
        img.style.display = 'block';
        img.style.verticalAlign = 'middle';
        img.style.transform = 'translateY(6px)';

        anchor.appendChild(img);
        innerSpan.appendChild(anchor);
        ratingWrapper.appendChild(innerSpan);
        detailsContainer.appendChild(ratingWrapper);
    }

    function renderCustomAnchorContent(anchor, iconSrc, label, referenceImage) {
        anchor.textContent = '';

        if (iconSrc) {
            const img = document.createElement('img');
            img.alt = `${label} Search`;
            img.src = iconSrc;
            const referenceHeight = referenceImage.getBoundingClientRect().height;
            img.style.height = referenceHeight > 0 ? `${Math.round(referenceHeight * 1.3)}px` : '26px';
            img.style.display = 'block';
            img.style.verticalAlign = 'middle';
            img.style.transform = 'translateY(6px)';
            anchor.appendChild(img);
            return;
        }

        const text = document.createElement('span');
        text.textContent = label;
        text.style.fontSize = '11px';
        text.style.lineHeight = '1';
        anchor.appendChild(text);
    }

    function clearTrackedCustomRatingIcons() {
        customRatingEntries.forEach((entry) => {
            if (!entry || !entry.wrapper) {
                return;
            }

            if (entry.wrapper.parentElement) {
                entry.wrapper.remove();
            }
        });

        customRatingEntries = [];
    }

    function ensureCustomRatingIcon(context, linkData, iconSrc, index) {
        if (!context || !linkData || !linkData.href) {
            return;
        }

        const { referenceImage, detailsContainer, ratingTemplate } = context;
        const label = linkData.label || 'External';
        const nextSignature = `${linkData.href}|${linkData.title || ''}|${iconSrc || ''}|${label}`;
        const existingEntry = customRatingEntries[index];

        if (
            existingEntry
            && existingEntry.wrapper
            && existingEntry.wrapper.parentElement === detailsContainer
            && existingEntry.anchor
        ) {
            if (ratingTemplate && ratingTemplate.className && existingEntry.wrapper.className !== ratingTemplate.className) {
                existingEntry.wrapper.className = ratingTemplate.className;
            }

            if (existingEntry.signature === nextSignature) {
                return;
            }

            existingEntry.anchor.href = linkData.href;
            existingEntry.anchor.title = linkData.title;
            existingEntry.anchor.target = '_blank';
            existingEntry.anchor.rel = 'noreferrer noopener';
            renderCustomAnchorContent(existingEntry.anchor, iconSrc, label, referenceImage);
            existingEntry.signature = nextSignature;
            return;
        }

        const ratingWrapper = document.createElement('span');
        if (ratingTemplate && ratingTemplate.className) {
            ratingWrapper.className = ratingTemplate.className;
        }

        const innerSpan = document.createElement('span');
        const anchor = document.createElement('a');
        anchor.href = linkData.href;
        anchor.title = linkData.title;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        anchor.style.display = 'inline-flex';
        anchor.style.alignItems = 'center';
        anchor.style.lineHeight = '0';

        renderCustomAnchorContent(anchor, iconSrc, label, referenceImage);

        innerSpan.appendChild(anchor);
        ratingWrapper.appendChild(innerSpan);
        detailsContainer.appendChild(ratingWrapper);

        customRatingEntries[index] = {
            wrapper: ratingWrapper,
            anchor,
            signature: nextSignature
        };
    }

    function wrapImageWithLink(img, linkData, keyName) {
        if (!img || !linkData || !linkData.href) {
            return;
        }

        const marker = `data-radarr-link-${keyName}`;
        const existingWrapper = img.parentElement && img.parentElement.hasAttribute(marker)
            ? img.parentElement
            : null;

        if (existingWrapper) {
            existingWrapper.href = linkData.href;
            existingWrapper.title = linkData.title;
            return;
        }

        if (img.parentElement && img.parentElement.tagName === 'A') {
            img.parentElement.href = linkData.href;
            img.parentElement.title = linkData.title;
            img.parentElement.target = '_blank';
            img.parentElement.rel = 'noreferrer noopener';
            return;
        }

        const anchor = document.createElement('a');
        anchor.href = linkData.href;
        anchor.title = linkData.title;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        anchor.style.display = 'inline-flex';
        anchor.style.alignItems = 'center';
        anchor.dataset[`radarrLink${keyName.charAt(0).toUpperCase()}${keyName.slice(1)}`] = '1';

        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(img);
    }

    async function applyLinksToRatings(linkMap, settings) {
        const context = getRatingsContext();
        const tmdbImage = document.querySelector('img[alt="TMDb Rating"]');
        const imdbImage = document.querySelector('img[alt="IMDb Rating"]');
        const traktImage = document.querySelector('img[alt="Trakt Rating"]');

        if (tmdbImage) {
            wrapImageWithLink(tmdbImage, linkMap.tmdb, 'tmdb');
        }
        if (imdbImage && linkMap.imdb) {
            wrapImageWithLink(imdbImage, linkMap.imdb, 'imdb');
        }
        if (traktImage) {
            wrapImageWithLink(traktImage, linkMap.trakt, 'trakt');
        }
        if (linkMap.ptp) {
            ensurePtpRatingIcon(linkMap.ptp);
        }

        if (!context) {
            customRatingsContainer = null;
            clearTrackedCustomRatingIcons();
        } else if (customRatingsContainer !== context.detailsContainer) {
            clearTrackedCustomRatingIcons();
            customRatingsContainer = context.detailsContainer;
        }

        if (context && Array.isArray(linkMap.customLinks) && linkMap.customLinks.length > 0) {
            for (let i = 0; i < linkMap.customLinks.length; i += 1) {
                const customLink = linkMap.customLinks[i];
                const iconSrc = await resolveCustomIcon(settings, customLink.site);
                ensureCustomRatingIcon(context, customLink, iconSrc, i);
            }

            if (customRatingEntries.length > linkMap.customLinks.length) {
                for (let i = linkMap.customLinks.length; i < customRatingEntries.length; i += 1) {
                    const entry = customRatingEntries[i];
                    if (entry && entry.wrapper && entry.wrapper.parentElement) {
                        entry.wrapper.remove();
                    }
                }
                customRatingEntries.length = linkMap.customLinks.length;
            }
        } else {
            clearTrackedCustomRatingIcons();
        }

        const trailerImage = document.querySelector('img[alt="YouTube Trailer"], img[alt="Trailer"]');
        if (trailerImage && linkMap.trailer) {
            wrapImageWithLink(trailerImage, linkMap.trailer, 'trailer');
        }
    }

    async function updatePageLinks() {
        const tmdbId = getTmdbIdFromPathname(globalThis.location.pathname);
        if (!tmdbId) {
            return;
        }

        try {
            const settings = await loadSettings();
            const metadata = await getMovieMetadata(tmdbId);
            if (!metadata) {
                return;
            }

            const linkMap = buildLinkMap(tmdbId, metadata, settings);
            await applyLinksToRatings(linkMap, settings);
        } catch (error) {
            console.warn('Radarr metadata links:', error.message || error);
        }
    }

    function scheduleUpdate() {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }

        updateTimer = setTimeout(() => {
            updateTimer = null;
            updatePageLinks();
        }, 120);
    }

    function patchHistory() {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            const result = originalPushState.apply(this, arguments);
            scheduleUpdate();
            return result;
        };

        history.replaceState = function () {
            const result = originalReplaceState.apply(this, arguments);
            scheduleUpdate();
            return result;
        };

        globalThis.addEventListener('popstate', scheduleUpdate);
    }

    function observeDomChanges() {
        const observer = new MutationObserver(() => {
            scheduleUpdate();
        });

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true
        });
    }

    GM.registerMenuCommand('Radarr: Open Settings', () => {
        openSettingsModal();
    });

    patchHistory();
    observeDomChanges();
    scheduleUpdate();
})();
