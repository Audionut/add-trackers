// ==UserScript==
// @name         Radarr - Metadata Rating Links
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Use Radarr API metadata to make TMDb/IMDb/Trakt rating badges clickable on movie pages. Add ptp link
// @author       Audionut
// @match        http://localhost:7878/*
// @match        https://localhost:7878/*
// @match        http://127.0.0.1:7878/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE = {
        apiKey: 'radarr_api_key',
        baseUrl: 'radarr_api_base_url'
    };

    const metadataCache = new Map();
    const pendingFetches = new Map();
    let updateTimer = null;

    function getTmdbIdFromPathname(pathname) {
        const match = pathname.match(/\/movie\/(\d+)(?:\/|$)/i);
        return match ? match[1] : null;
    }

    function normalizeBaseUrl(value) {
        return (value || '').trim().replace(/\/$/, '');
    }

    async function getConfig() {
        const storedBaseUrl = normalizeBaseUrl(await GM.getValue(STORAGE.baseUrl, ''));
        const storedApiKey = (await GM.getValue(STORAGE.apiKey, '') || '').trim();
        return {
            baseUrl: storedBaseUrl || window.location.origin,
            apiKey: storedApiKey
        };
    }

    function tryGetApiKeyFromPage() {
        if (window.Radarr && typeof window.Radarr.apiKey === 'string' && window.Radarr.apiKey.trim()) {
            return window.Radarr.apiKey.trim();
        }

        const runtimeApiKey = window.__APP_CONFIG__ && typeof window.__APP_CONFIG__.apiKey === 'string'
            ? window.__APP_CONFIG__.apiKey.trim()
            : '';
        if (runtimeApiKey) {
            return runtimeApiKey;
        }

        return '';
    }

    async function promptForConfig() {
        const currentBase = normalizeBaseUrl(await GM.getValue(STORAGE.baseUrl, '')) || window.location.origin;
        const currentKey = (await GM.getValue(STORAGE.apiKey, '') || '').trim();

        const baseUrl = normalizeBaseUrl(prompt('Radarr base URL:', currentBase) || '');
        const apiKey = (prompt('Radarr API key:', currentKey) || '').trim();

        if (baseUrl) {
            await GM.setValue(STORAGE.baseUrl, baseUrl);
        }
        await GM.setValue(STORAGE.apiKey, apiKey);
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

    function buildLinkMap(tmdbId, metadata) {
        const imdbId = metadata && metadata.imdbId ? String(metadata.imdbId).trim() : '';
        const trailerId = metadata && metadata.youTubeTrailerId ? String(metadata.youTubeTrailerId).trim() : '';

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
                : null
        };
    }

    function ensurePtpRatingIcon(linkData) {
        if (!linkData || !linkData.href) {
            return;
        }

        const tmdbImage = document.querySelector('img[alt="TMDb Rating"]');
        const imdbImage = document.querySelector('img[alt="IMDb Rating"]');
        const traktImage = document.querySelector('img[alt="Trakt Rating"]');
        const referenceImage = tmdbImage || imdbImage || traktImage;
        if (!referenceImage) {
            return;
        }

        const detailsContainer =
            referenceImage.closest('div[class*="MovieDetails-details"]') ||
            referenceImage.closest('div[class*="MovieDetails-ratings"]') ||
            referenceImage.parentElement;
        if (!detailsContainer) {
            return;
        }

        const existing = detailsContainer.querySelector('a[data-radarr-link-ptp="1"]');
        if (existing) {
            existing.href = linkData.href;
            existing.title = linkData.title;
            return;
        }

        const ratingTemplate =
            referenceImage.closest('span[class*="MovieDetails-rating"]') ||
            detailsContainer.querySelector('span[class*="MovieDetails-rating"]');
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
        anchor.setAttribute('data-radarr-link-ptp', '1');
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
        anchor.setAttribute(marker, '1');

        img.parentNode.insertBefore(anchor, img);
        anchor.appendChild(img);
    }

    function applyLinksToRatings(linkMap) {
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

        const trailerImage = document.querySelector('img[alt="YouTube Trailer"], img[alt="Trailer"]');
        if (trailerImage && linkMap.trailer) {
            wrapImageWithLink(trailerImage, linkMap.trailer, 'trailer');
        }
    }

    async function updatePageLinks() {
        const tmdbId = getTmdbIdFromPathname(window.location.pathname);
        if (!tmdbId) {
            return;
        }

        try {
            const metadata = await getMovieMetadata(tmdbId);
            if (!metadata) {
                return;
            }

            const linkMap = buildLinkMap(tmdbId, metadata);
            applyLinksToRatings(linkMap);
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

        window.addEventListener('popstate', scheduleUpdate);
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

    GM.registerMenuCommand('Radarr: Set API URL/Key', () => {
        promptForConfig().then(() => {
            metadataCache.clear();
            pendingFetches.clear();
            scheduleUpdate();
        });
    });

    patchHistory();
    observeDomChanges();
    scheduleUpdate();
})();
