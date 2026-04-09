// ==UserScript==
// @name         PTP - Add Cast & Crew
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Add cast and crew info for boxsets
// @author       passthepopcorn_cc, peterpen1980, Perplexity, Audionut
// @match        https://passthepopcorn.me/upload.php
// @match        https://passthepopcorn.me/torrents.php?action=editgroup*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-add-cast-crew.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-add-cast-crew.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_PREFIX = 'ptpCastCrew';
    const SETTINGS_PREFIX = 'ptpCastCrew:settings';
    const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    const GRAPHQL_ENDPOINT = 'https://api.graphql.imdb.com/';
    const GRAPHQL_PAGE_SIZE = 250;
    const GRAPHQL_MAX_IDS_PER_REQUEST = 250;
    const ROLE_CHAR_LIMIT = 250;
    const NAME_CHAR_LIMIT = 60;
    const DEFAULT_INSERT_DELAY_MS = 1000;
    const DEFAULT_BACKOFF_START_INDEX = 0;
    const DEFAULT_BACKOFF_MAX_DELAY_MS = 2500;
    const DEFAULT_MAX_CAST_PER_IMDB = 0;
    const INSERT_DELAY_BACKOFF_RATE = 1.03;
    const DEBUG_IMDB_CAST = true;

    const cacheKey = (key) => `${CACHE_PREFIX}:${key}`;
    const settingKey = (key) => `${SETTINGS_PREFIX}:${key}`;

    const FORM_SETTING_KEYS = {
        insertDelayMs: 'insertDelayMs',
        backoffStartIndex: 'backoffStartIndex',
        backoffMaxDelayMs: 'backoffMaxDelayMs',
        maxCastPerImdb: 'maxCastPerImdb',
    };

    const deleteCache = async (key) => {
        try {
            await GM.deleteValue(cacheKey(key));
        } catch (e) {
            console.error('Failed to delete cache', e);
        }
    };

    const getCache = async (key) => {
        try {
            const raw = await GM.getValue(cacheKey(key), null);
            if (!raw) return null;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!parsed?.expires || parsed.expires < Date.now()) {
                await deleteCache(key);
                return null;
            }
            return parsed.value;
        } catch (e) {
            console.error('Failed to read cache', e);
            return null;
        }
    };

    const setCache = async (key, value, ttl = CACHE_TTL_MS) => {
        try {
            const payload = {
                value,
                expires: Date.now() + ttl,
            };
            await GM.setValue(cacheKey(key), JSON.stringify(payload));
        } catch (e) {
            console.error('Failed to write cache', e);
        }
    };

    const getSetting = async (key, fallback) => {
        try {
            return await GM.getValue(settingKey(key), fallback);
        } catch (e) {
            console.error('Failed to read setting', key, e);
            return fallback;
        }
    };

    const setSetting = async (key, value) => {
        try {
            await GM.setValue(settingKey(key), value);
        } catch (e) {
            console.error('Failed to write setting', key, e);
        }
    };

    const loadFormSettings = async () => {
        const [insertDelayMs, backoffStartIndex, backoffMaxDelayMs, maxCastPerImdb] = await Promise.all([
            getSetting(FORM_SETTING_KEYS.insertDelayMs, DEFAULT_INSERT_DELAY_MS),
            getSetting(FORM_SETTING_KEYS.backoffStartIndex, DEFAULT_BACKOFF_START_INDEX),
            getSetting(FORM_SETTING_KEYS.backoffMaxDelayMs, DEFAULT_BACKOFF_MAX_DELAY_MS),
            getSetting(FORM_SETTING_KEYS.maxCastPerImdb, DEFAULT_MAX_CAST_PER_IMDB),
        ]);

        return {
            insertDelayMs: parseNonNegativeInt(insertDelayMs, DEFAULT_INSERT_DELAY_MS),
            backoffStartIndex: parseNonNegativeInt(backoffStartIndex, DEFAULT_BACKOFF_START_INDEX),
            backoffMaxDelayMs: parseNonNegativeInt(backoffMaxDelayMs, DEFAULT_BACKOFF_MAX_DELAY_MS),
            maxCastPerImdb: parseNonNegativeInt(maxCastPerImdb, DEFAULT_MAX_CAST_PER_IMDB),
        };
    };

    const persistFormSettings = async (settings) => {
        await Promise.all([
            setSetting(FORM_SETTING_KEYS.insertDelayMs, settings.insertDelayMs),
            setSetting(FORM_SETTING_KEYS.backoffStartIndex, settings.backoffStartIndex),
            setSetting(FORM_SETTING_KEYS.backoffMaxDelayMs, settings.backoffMaxDelayMs),
            setSetting(FORM_SETTING_KEYS.maxCastPerImdb, settings.maxCastPerImdb),
        ]);
    };

    const truncateText = (text, maxLength) => {
        if (!text) {
            return '';
        }
        const trimmed = text.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        if (maxLength <= 1) {
            return trimmed.slice(0, maxLength);
        }
        return `${trimmed.slice(0, maxLength - 1)}…`;
    };

    const updateStatusText = (text) => {
        try {
            let wrapper = null;
            if (globalThis.location.href.includes('upload.php')) {
                wrapper = document.querySelector('#artist_tr > div.grid__item.grid-u-8-10');
            } else if (globalThis.location.href.includes('torrents.php')) {
                wrapper = document.querySelector('#content > div > form:nth-child(6) > div > div.panel__body > div.grid > div');
            }
            const target = wrapper?.querySelector('div');
            if (target) {
                target.textContent = text;
                target.style.display = 'block';
            }
        } catch (e) {
            console.error('Failed to update status text', e);
        }
    };

    const parseNonNegativeInt = (value, fallback) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return fallback;
        }
        return parsed;
    };

    const logCastDebug = (label, details) => {
        if (!DEBUG_IMDB_CAST) {
            return;
        }

        console.groupCollapsed(`[PTP Cast Debug] ${label}`);
        Object.entries(details).forEach(([key, value]) => {
            console.log(key, value);
        });
        console.groupEnd();
    };

    const ensureGroupReady = () => {
        if (globalThis.location.href.includes('torrents.php')) {
            const params = new URLSearchParams(globalThis.location.search);
            const groupId = params.get('groupid');
            if (!groupId || !/^\d+$/.test(groupId)) {
                updateStatusText('Cannot import cast: invalid group ID.');
                return false;
            }

            const imdbInput = document.querySelector('#imdbid');
            const imdbValue = imdbInput?.value?.trim();
            if (imdbValue && imdbValue !== '0') {
                updateStatusText('Cannot import cast: group already has an IMDb ID. Set it to 0 before running the filler.');
                return false;
            }
        }
        return true;
    };

    const validateCastArrays = (entries) => {
        if (!Array.isArray(entries) || !entries.length) {
            updateStatusText('No cast entries available to import.');
            return false;
        }

        const artistIds = entries.map((entry) => entry.cast_id).filter(Boolean);
        const importances = entries.map((entry) => entry.importance_id).filter((value) => typeof value !== 'undefined');
        const expectedLength = entries.length;
        const mismatch = artistIds.length !== expectedLength || importances.length !== expectedLength;

        if (mismatch) {
            updateStatusText('Cannot import cast: artist IDs and importances must be populated for every entry.');
            const roles = entries.map((entry) => entry.role).filter(Boolean);
            console.error('Cast entry validation failed', { entries, artistIds, importances, roles });
            return false;
        }

        return true;
    };

    // ==================== IMDb API Helpers ====================

    const graphqlRequest = (payload) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: GRAPHQL_ENDPOINT,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(payload),
                timeout: 15000,
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        console.error('IMDb GraphQL HTTP error', response.status, response.responseText);
                        reject(new Error(`IMDb GraphQL HTTP ${response.status}`));
                        return;
                    }
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.errors && data.errors.length) {
                            console.error('IMDb GraphQL error payload', data.errors);
                            reject(new Error(data.errors[0].message || 'IMDb GraphQL error'));
                            return;
                        }
                        resolve(data);
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: () => reject(new Error('IMDb GraphQL request failed')),
                ontimeout: () => reject(new Error('IMDb GraphQL request timed out')),
            });
        });
    };

    const chunkArray = (items, chunkSize) => {
        const safeChunkSize = Math.max(1, Math.min(GRAPHQL_MAX_IDS_PER_REQUEST, Number(chunkSize) || GRAPHQL_MAX_IDS_PER_REQUEST));
        const chunks = [];
        for (let i = 0; i < items.length; i += safeChunkSize) {
            chunks.push(items.slice(i, i + safeChunkSize));
        }
        return chunks;
    };

    const fetchNames = async (ids) => {
        const uniqueIds = [...new Set(ids)].filter(Boolean);
        if (!uniqueIds.length) return [];
        const sortedIds = uniqueIds.toSorted((a, b) => a.localeCompare(b));
        const key = `names_${sortedIds.join(',')}`;
        const cached = await getCache(key);
        if (cached) {
            return cached;
        }

        const idChunks = chunkArray(uniqueIds, GRAPHQL_MAX_IDS_PER_REQUEST);
        const allNames = [];

        for (const idChunk of idChunks) {
            const payload = {
                query: `
                    query ($ids: [ID!]!) {
                        names(ids: $ids) {
                            id
                            nameText { text }
                        }
                    }
                `,
                variables: {
                    ids: idChunk,
                },
            };

            const response = await graphqlRequest(payload);
            const names = response.data?.names || [];
            allNames.push(...names);
        }

        const names = [...new Map(allNames.filter((entry) => entry?.id).map((entry) => [entry.id, entry])).values()];
        await setCache(key, names);
        return names;
    };

    const fetchIMDBData = async (imdbId) => {
        if (!imdbId) {
            throw new Error('Missing IMDb ID');
        }
        const normalizedId = imdbId.toLowerCase().startsWith('tt') ? imdbId.toLowerCase() : `tt${imdbId}`;
        const key = `title_v4_${normalizedId}`;
        const cached = await getCache(key);
        if (cached) {
            logCastDebug(`IMDb cache hit ${normalizedId}`, { key, cached });
            return cached;
        }

        const principalPayload = {
            query: `
                query getPrincipalCredits($id: ID!) {
                    title(id: $id) {
                        titleText { text }
                        principalCreditsV2 {
                            credits {
                                ... on CreditV2 {
                                    name {
                                        id
                                    }
                                    creditedRoles(first: 10) {
                                        edges {
                                            node {
                                                category {
                                                    id
                                                    text
                                                }
                                                characters(first: 10) {
                                                    edges {
                                                        node {
                                                            name
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `,
            variables: {
                id: normalizedId,
            },
        };

        const principalResponse = await graphqlRequest(principalPayload);
        const principalTitle = principalResponse.data?.title;
        if (!principalTitle) {
            throw new Error('IMDb principal credits data missing');
        }

        const movieName = principalTitle.titleText?.text || '';
        const principalCreditGroups = Array.isArray(principalTitle.principalCreditsV2)
            ? principalTitle.principalCreditsV2
            : [];
        const principalCredits = principalCreditGroups.flatMap((group) => {
            const creditsForGroup = Array.isArray(group?.credits) ? group.credits : [];
            return creditsForGroup.map((credit) => {
                const firstRole = credit?.creditedRoles?.edges?.[0]?.node;
                const characters = (firstRole?.characters?.edges || [])
                    .map((edge) => ({ name: edge?.node?.name }))
                    .filter((char) => Boolean(char?.name));

                return {
                    name: credit?.name,
                    category: firstRole?.category || { id: 'actor', text: 'Actor' },
                    title: { id: normalizedId, titleText: { text: movieName } },
                    characters,
                };
            }).filter((credit) => credit?.name?.id);
        });

        let afterCursor = null;
        let hasNextPage = true;
        const pagedCredits = [];

        while (hasNextPage) {
            const creditsPayload = {
                query: `
                    query getPagedCredits($id: ID!, $first: Int!, $after: ID) {
                        title(id: $id) {
                            credits(first: $first, after: $after) {
                                edges {
                                    cursor
                                    node {
                                        name {
                                            id
                                            nameText { text }
                                        }
                                        category {
                                            id
                                            text
                                        }
                                        ... on Cast {
                                            characters(limit: 10) {
                                                name
                                            }
                                        }
                                        title {
                                            id
                                            titleText { text }
                                        }
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: normalizedId,
                    first: GRAPHQL_PAGE_SIZE,
                    after: afterCursor,
                },
            };

            const creditsResponse = await graphqlRequest(creditsPayload);
            const title = creditsResponse.data?.title;
            if (!title) {
                throw new Error('IMDb paged credits data missing');
            }

            const edges = title.credits?.edges || [];
            edges.forEach((edge) => {
                if (edge?.node) {
                    pagedCredits.push(edge.node);
                }
            });

            const pageInfo = title.credits?.pageInfo;
            hasNextPage = Boolean(pageInfo?.hasNextPage);
            afterCursor = pageInfo?.endCursor || null;

            if (hasNextPage && !afterCursor) {
                console.warn('IMDb pagination indicated more data but no cursor was provided.');
                hasNextPage = false;
            }
        }

        const principalById = new Map(principalCredits.map((credit) => [credit?.name?.id, credit]));
        const mergedCredits = [...principalCredits];

        pagedCredits.forEach((credit) => {
            const nameId = credit?.name?.id;
            if (!nameId) {
                return;
            }

            const principalCredit = principalById.get(nameId);
            const principalHasCharacters = Boolean(principalCredit?.characters?.length);
            const pagedCharacters = (credit?.characters || [])
                .map((character) => ({ name: character?.name }))
                .filter((char) => Boolean(char?.name));
            const pagedHasCharacters = Boolean(pagedCharacters.length);

            if (!principalCredit) {
                mergedCredits.push({ ...credit, characters: pagedCharacters });
                return;
            }

            if (!principalHasCharacters && pagedHasCharacters) {
                const principalIndex = mergedCredits.findIndex((existing) => existing?.name?.id === nameId);
                if (principalIndex !== -1) {
                    mergedCredits[principalIndex] = {
                        ...credit,
                        characters: pagedCharacters,
                    };
                }
            }
        });

        logCastDebug(`IMDb fetch ${normalizedId}`, {
            movieName,
            principalCredits,
            pagedCredits,
            mergedCredits,
        });

        const payloadToCache = { movieName, credits: mergedCredits };
        await setCache(key, payloadToCache);
        return payloadToCache;
    };

    // ==================== Style Management ====================

    const fixStyle = () => {
        // Apply margin to all select elements
        document.querySelector("#artistlist > tbody").querySelectorAll("select").forEach((element) => {
            element.style.margin = "5px";
        });

        // Apply margin to artist links
        try {
            const rowCount = document.querySelectorAll('#artistlist > tbody > tr').length;
            for (let j = 0; j < rowCount; j++) {
                const link = document.querySelector(`#artistlist > tbody > tr:nth-child(${j+2}) > td:nth-child(4) > a`);
                if (link) link.style.margin = "5px";
            }
        } catch(e) {
            console.error('Error applying link margins:', e);
        }

        // Display artist table
        document.querySelector("#artistlist > tbody").style.display = "block";
        document.querySelector("#AddArtistName").style.marginTop = "26px";

        // Page-specific styling
        if (globalThis.location.href.includes("upload.php")) {
            document.querySelector("#artist_tr > div.grid__item.grid-u-8-10 > div").style.display = "none";
            document.querySelector("#upload_table > div:nth-child(8)").style.marginBottom = "10px";
        } else if (globalThis.location.href.includes("torrents.php")) {
            document.querySelector("#content > div > form:nth-child(6) > div > div.panel__body > div.grid > div > div").style.display = "none";
        }
    };

    // ==================== UI Components ====================

    const viewInputBox = async () => {
        const targetCell = document.querySelector("#AddArtistRow > td");
        const savedSettings = await loadFormSettings();

        // Add textarea for IMDB URLs
        targetCell.innerHTML += '<textarea id="customText" name="Text1" cols="40" rows="5" placeholder="Enter IMDB urls here..."></textarea>';
        targetCell.innerHTML += '<label for="insertDelayInput" style="display:block;margin:6px 0 0;">Insert delay (ms): <input type="number" id="insertDelayInput" min="0" step="50" value="' + savedSettings.insertDelayMs + '" style="width:80px;margin-left:6px;"></label>';
        targetCell.innerHTML += '<label for="backoffStartInput" style="display:block;margin:6px 0 0;">Exponential backoff starts at cast # (0 = disabled): <input type="number" id="backoffStartInput" min="0" step="1" value="' + savedSettings.backoffStartIndex + '" style="width:80px;margin-left:6px;"></label>';
        targetCell.innerHTML += '<label for="backoffMaxDelayInput" style="display:block;margin:6px 0 0;">Maximum backoff delay (ms): <input type="number" id="backoffMaxDelayInput" min="0" step="50" value="' + savedSettings.backoffMaxDelayMs + '" style="width:90px;margin-left:6px;"></label>';
        targetCell.innerHTML += '<label for="maxCastPerImdbInput" style="display:block;margin:6px 0 0;">Max cast/crew per IMDb URL (0 = unlimited): <input type="number" id="maxCastPerImdbInput" min="0" step="1" value="' + savedSettings.maxCastPerImdb + '" style="width:90px;margin-left:6px;"></label>';
        targetCell.innerHTML += '<div id="fill-cast">Fill cast</div>';

        // Style textarea
        const customText = document.getElementById("customText");
        customText.style.display = "block";
        customText.style.margin = "15px 0";

        // Style fill cast button
        const fillCast = document.getElementById("fill-cast");
        fillCast.style.margin = "10px 0";
        fillCast.style.cursor = "pointer";

        // Add hover effects
        fillCast.addEventListener("mouseenter", () => {
            fillCast.style.color = "#ffd483";
        });

        fillCast.addEventListener("mouseout", () => {
            fillCast.style.color = "white";
        });

        // Handle click event
        fillCast.addEventListener("click", () => {
            customText.style.display = "none";
            fillCast.style.display = "none";
            const insertDelayInput = document.getElementById('insertDelayInput');
            const backoffStartInput = document.getElementById('backoffStartInput');
            const backoffMaxDelayInput = document.getElementById('backoffMaxDelayInput');
            const maxCastPerImdbInput = document.getElementById('maxCastPerImdbInput');
            if (insertDelayInput) {
                insertDelayInput.parentElement.style.display = 'none';
            }
            if (backoffStartInput) {
                backoffStartInput.parentElement.style.display = 'none';
            }
            if (backoffMaxDelayInput) {
                backoffMaxDelayInput.parentElement.style.display = 'none';
            }
            if (maxCastPerImdbInput) {
                maxCastPerImdbInput.parentElement.style.display = 'none';
            }

            startProcess();
            customText.value = "";

            // Show loading message
            if (globalThis.location.href.includes("upload.php")) {
                document.querySelector("#artist_tr > div.grid__item.grid-u-2-10").style.marginBottom = "16px";

                const element = document.querySelector("#artist_tr > div.grid__item.grid-u-8-10");
                const loadingDiv = document.createElement("div");
                loadingDiv.textContent = "Importing cast [...]";
                element.insertBefore(loadingDiv, element.firstChild);
                document.querySelector("#artist_tr > div.grid__item.grid-u-8-10 > div").style.display = "block";
            } else if (globalThis.location.href.includes("torrents.php")) {
                const element = document.querySelector("#content > div > form:nth-child(6) > div > div.panel__body > div.grid > div");
                const loadingDiv = document.createElement("div");
                loadingDiv.textContent = "Importing cast [...]";
                element.insertBefore(loadingDiv, element.firstChild);
                document.querySelector("#content > div > form:nth-child(6) > div > div.panel__body > div.grid > div > div").style.display = "block";
            }
        });
    };

    const addCustomDiv = () => {
        const customDiv = document.createElement("div");
        customDiv.id = "customDiv";
        customDiv.textContent = "[View auto filler]";
        customDiv.style.color = "white";
        customDiv.style.display = "inline-block";
        customDiv.style.cursor = "pointer";
        customDiv.style.margin = "12px 0 6px";

        // Add hover effects
        customDiv.addEventListener("mouseenter", () => {
            customDiv.style.color = "#ffd483";
        });

        customDiv.addEventListener("mouseleave", () => {
            customDiv.style.color = "white";
        });

        // Handle click event
        customDiv.addEventListener("click", () => {
            viewInputBox();
            customDiv.style.display = "none";
        });

        document.querySelector("#AddArtistRow > td").appendChild(customDiv);
    };

    // ==================== Cast Data Extraction ====================

    const IMPORTANCE_MAP = new Map([
        ['director', 1],
        ['writer', 2],
        ['screenwriter', 2],
        ['producer', 3],
        ['executive producer', 3],
        ['composer', 4],
        ['music', 4],
        ['cinematographer', 6],
        ['director of photography', 6],
    ]);

    const isActorCategory = (categoryText) => {
        if (!categoryText) return false;
        const normalized = categoryText.toLowerCase();
        return normalized.includes('actor') || normalized.includes('actress');
    };

    const importanceForCategory = (categoryText) => {
        if (!categoryText) return 5;
        const normalized = categoryText.toLowerCase();
        if (isActorCategory(normalized) || normalized === 'cast') {
            return 5;
        }
        for (const [key, value] of IMPORTANCE_MAP.entries()) {
            if (normalized.includes(key)) {
                return value;
            }
        }
        return 5;
    };

    const isSupportedCreditCategory = (categoryText) => {
        if (!categoryText) return false;
        const normalized = categoryText.toLowerCase();
        if (isActorCategory(normalized) || normalized === 'cast') {
            return true;
        }
        for (const key of IMPORTANCE_MAP.keys()) {
            if (normalized.includes(key)) {
                return true;
            }
        }
        return false;
    };

    const buildRoleLabel = (characters) => {
        const names = (characters || [])
            .map((char) => truncateText(char?.name, NAME_CHAR_LIMIT))
            .filter(Boolean);

        if (names.length) {
            return names.join(' / ');
        }

        return '';
    };

    const buildTitleOnlySegment = (movieName) => {
        const titleText = truncateText(movieName || '', NAME_CHAR_LIMIT);
        if (!titleText) {
            return '';
        }
        return `"${titleText}"`;
    };

    const buildRoleSegment = (roleLabel, movieName, sourceIndex, importanceId) => {
        const titleOnly = buildTitleOnlySegment(movieName);
        const isLaterUrl = sourceIndex > 0;
        const isNonActorImportance = importanceId !== 5;

        if (!roleLabel) {
            if (isLaterUrl && isNonActorImportance) {
                return titleOnly;
            }
            return '';
        }

        if (!isLaterUrl) {
            return roleLabel;
        }

        if (!titleOnly) {
            return roleLabel;
        }

        return `${titleOnly} ${roleLabel}`;
    };

    const calculateInsertDelayMs = (idx, delayConfig) => {
        const baseDelayMs = Math.max(0, delayConfig?.baseDelayMs ?? DEFAULT_INSERT_DELAY_MS);
        const backoffStartIndex = Math.max(0, delayConfig?.backoffStartIndex ?? DEFAULT_BACKOFF_START_INDEX);
        const maxDelayMs = Math.max(baseDelayMs, delayConfig?.maxDelayMs ?? DEFAULT_BACKOFF_MAX_DELAY_MS);

        if (backoffStartIndex <= 0 || idx < backoffStartIndex - 1) {
            return baseDelayMs;
        }

        const backoffStep = idx - (backoffStartIndex - 1) + 1;
        const delay = Math.round(baseDelayMs * Math.pow(INSERT_DELAY_BACKOFF_RATE, backoffStep));
        return Math.min(maxDelayMs, delay);
    };

    const getCast = async (imdbId, maxCastPerImdb = DEFAULT_MAX_CAST_PER_IMDB, sourceIndex = 0) => {
        const imdbData = await fetchIMDBData(imdbId);
        if (!imdbData) {
            return [];
        }

        const { movieName, credits } = imdbData;
        const allCredits = Array.isArray(credits) ? credits : [];
        const filteredOutCredits = [];
        const castEntries = allCredits
            .filter((credit) => credit?.name?.id)
            .map((credit) => {
                const categoryText = credit.category?.text || '';
                if (!isSupportedCreditCategory(categoryText)) {
                    filteredOutCredits.push({
                        cast_id: credit?.name?.id,
                        display_name: credit?.name?.nameText?.text || '',
                        category: categoryText,
                        imdb_id: imdbId,
                        movie_name: credit?.title?.titleText?.text || movieName,
                    });
                    return null;
                }
                const importanceId = importanceForCategory(categoryText);
                const castId = credit.name.id;
                const role = buildRoleLabel(credit.characters);
                const titleText = credit.title?.titleText?.text || movieName;
                const roleSegment = buildRoleSegment(role, titleText, sourceIndex, importanceId);
                return {
                    cast_id: castId,
                    importance_id: importanceId,
                    role: roleSegment,
                    movie_name: titleText,
                    display_name: truncateText(credit.name.nameText?.text || '', NAME_CHAR_LIMIT),
                };
            })
            .filter(Boolean);

        if (filteredOutCredits.length) {
            logCastDebug(`Cast filtered categories ${imdbId}`, {
                sourceIndex,
                filteredOutCredits,
            });
        }

        const dedupedCastEntries = getFixedCast(castEntries);
        const creditLimit = Math.max(0, maxCastPerImdb || 0);
        const limitedCastEntries = creditLimit > 0 ? dedupedCastEntries.slice(0, creditLimit) : dedupedCastEntries;
        const names = await fetchNames(limitedCastEntries.map((entry) => entry.cast_id));
        const idToName = {};

        names.forEach((entry) => {
            if (entry?.id) {
                idToName[entry.id] = truncateText(entry.nameText?.text || '', NAME_CHAR_LIMIT);
            }
        });

        const finalCastEntries = limitedCastEntries.map((entry) => ({
            ...entry,
            display_name: idToName[entry.cast_id] || entry.display_name,
        }));

        logCastDebug(`Cast mapping ${imdbId}`, {
            allCredits,
            castEntries,
            dedupedCastEntries,
            limitedCastEntries,
            names,
            finalCastEntries,
        });

        return finalCastEntries;
    };

    const getFixedCast = (allCast) => {
        const fixedCast = [];
        const mergeEvents = [];

        for (const castEntry of allCast) {
            const foundIndex = fixedCast.findIndex(
                e => e.cast_id === castEntry.cast_id && e.importance_id === castEntry.importance_id
            );
            const isDuplicate = foundIndex !== -1;

            if (isDuplicate) {
                const isNonActorImportance = castEntry.importance_id !== 5;
                let existingRole = fixedCast[foundIndex].role;
                const incomingRole = castEntry.role;

                if (!existingRole && isNonActorImportance) {
                    existingRole = buildTitleOnlySegment(fixedCast[foundIndex].movie_name);
                }

                const normalizedIncomingRole = incomingRole || (isNonActorImportance ? buildTitleOnlySegment(castEntry.movie_name) : '');

                if (existingRole && normalizedIncomingRole) {
                    const mergedRole = `${existingRole}, ${normalizedIncomingRole}`;
                    mergeEvents.push({
                        cast_id: castEntry.cast_id,
                        importance_id: castEntry.importance_id,
                        existingRole,
                        incomingRole: normalizedIncomingRole,
                        mergedRole,
                    });
                    fixedCast[foundIndex].role = mergedRole;
                } else if (!existingRole && normalizedIncomingRole) {
                    mergeEvents.push({
                        cast_id: castEntry.cast_id,
                        importance_id: castEntry.importance_id,
                        existingRole,
                        incomingRole: normalizedIncomingRole,
                        mergedRole: normalizedIncomingRole,
                    });
                    fixedCast[foundIndex].role = normalizedIncomingRole;
                }
            } else {
                fixedCast.push(castEntry);
            }
        }

        if (mergeEvents.length) {
            logCastDebug('Cast merge role updates', {
                mergeEvents,
            });
        }

        return fixedCast;
    };

    // ==================== DOM Manipulation ====================

    const insertActor = (actor, idx, lastIdx, delayConfig) => {
        let firstDisplay = true;
        let clicked = false;

        const intervalMs = calculateInsertDelayMs(idx, delayConfig);
        const insertInterval = setInterval(() => {
            try {
                const previousInput = idx === 0 ? null : document.querySelector(`#artistlist > tbody > tr:nth-child(${idx+1}) > td:nth-child(3) > input[type=text]`);
                if (idx !== 0 && !previousInput) {
                    return; // wait until previous row exists
                }

                const previousRowComplete = idx === 0 || previousInput.dataset.autofilled === '1';

                if (previousRowComplete) {
                    if (firstDisplay) {
                        firstDisplay = false;
                    } else {
                        if (!clicked) {
                            document.querySelector("#AddArtistName").value = actor.cast_id;
                            document.querySelector("#AddArtistRow > td > input[type=button]:nth-child(2)").click();
                            clicked = true;
                        }

                        const roleInput = document.querySelector(`#artistlist > tbody > tr:nth-child(${idx+2}) > td:nth-child(3) > input[type=text]`);
                        const typeSelect = document.querySelector(`#artistlist > tbody > tr:nth-child(${idx+2}) > td:nth-child(2) > select`);
                        if (!roleInput || !typeSelect) {
                            return; // wait for row to render
                        }

                        let roleLabel = actor.role;
                        if (roleLabel.length > ROLE_CHAR_LIMIT) {
                            roleLabel = truncateText(roleLabel, ROLE_CHAR_LIMIT);
                        }
                        roleInput.value = roleLabel;
                        roleInput.dataset.autofilled = '1';
                        typeSelect.value = actor.importance_id;

                        // Update progress message
                        const progressText = `Importing cast [${idx+1}/${lastIdx+1}]`;
                        updateStatusText(progressText);

                        clearInterval(insertInterval);
                    }
                }

                // Show table when complete
                if (idx === lastIdx) {
                    fixStyle();
                    document.querySelector("#artistlist > tbody").style.display = "block";
                }
            } catch (e) {
                console.error('Error inserting actor:', e);
            }
        }, intervalMs);
    };

    // ==================== Main Process ====================

    const extractImdbId = (value) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const match = trimmed.match(/tt\d+/i);
        return match ? match[0].toLowerCase() : null;
    };

    const startProcess = async () => {
        document.querySelector("#artistlist > tbody").style.display = "none";

        if (!ensureGroupReady()) {
            document.querySelector('#artistlist > tbody').style.display = 'block';
            return;
        }

        // Parse IMDB URLs
        const imdbIds = [...new Set(
            document
                .getElementById("customText")
                .value
                .split("\n")
                .map(extractImdbId)
                .filter(Boolean)
        )];

        if (!imdbIds.length) {
            updateStatusText('No IMDb IDs detected.');
            document.querySelector('#artistlist > tbody').style.display = 'block';
            return;
        }

        const insertDelayInput = document.getElementById('insertDelayInput');
        const backoffStartInput = document.getElementById('backoffStartInput');
        const backoffMaxDelayInput = document.getElementById('backoffMaxDelayInput');
        const maxCastPerImdbInput = document.getElementById('maxCastPerImdbInput');

        const baseDelayMs = parseNonNegativeInt(insertDelayInput?.value, DEFAULT_INSERT_DELAY_MS);
        const backoffStartIndex = parseNonNegativeInt(backoffStartInput?.value, DEFAULT_BACKOFF_START_INDEX);
        const rawMaxDelayMs = parseNonNegativeInt(backoffMaxDelayInput?.value, DEFAULT_BACKOFF_MAX_DELAY_MS);
        const maxDelayMs = Math.max(baseDelayMs, rawMaxDelayMs);
        const maxCastPerImdb = parseNonNegativeInt(maxCastPerImdbInput?.value, DEFAULT_MAX_CAST_PER_IMDB);
        const delayConfig = { baseDelayMs, backoffStartIndex, maxDelayMs };

        await persistFormSettings({
            insertDelayMs: baseDelayMs,
            backoffStartIndex,
            backoffMaxDelayMs: maxDelayMs,
            maxCastPerImdb,
        });

        // Fetch all cast data with graceful error handling
        const promises = imdbIds.map((id, idx) => getCast(id, maxCastPerImdb, idx));

        try {
            const results = await Promise.allSettled(promises);
            const castLists = [];
            const failures = [];

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    castLists.push(result.value);
                } else {
                    failures.push({ id: imdbIds[idx], reason: result.reason });
                }
            });

            failures.forEach(({ id, reason }) => {
                console.error(`Failed to fetch cast for ${id}:`, reason);
            });

            let allCast = [];
            castLists.forEach(cast => {
                allCast = allCast.concat(cast);
            });

            if (failures.length) {
                updateStatusText(`Imported cast with ${failures.length} error(s). See console for details.`);
            }

            if (!allCast.length) {
                updateStatusText('No cast data retrieved.');
                document.querySelector('#artistlist > tbody').style.display = 'block';
                return;
            }

            const fixedCast = getFixedCast(allCast);

            if (!validateCastArrays(fixedCast)) {
                document.querySelector('#artistlist > tbody').style.display = 'block';
                return;
            }

            // Insert each actor
            fixedCast.forEach((cast, idx) => {
                insertActor(cast, idx, fixedCast.length - 1, delayConfig);
            });
        } catch (error) {
            console.error('Unexpected error processing cast:', error);
            updateStatusText('Unexpected error while importing cast.');
            document.querySelector('#artistlist > tbody').style.display = 'block';
        }
    };

    // ==================== Initialization ====================

    addCustomDiv();

})();
