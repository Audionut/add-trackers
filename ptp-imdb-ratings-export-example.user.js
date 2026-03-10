// ==UserScript==
// @name         PTP IMDb Ratings Export Example
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Example consumer for ratings data exported by PTP - iMDB Combined Script
// @author       Audionut
// @match        https://passthepopcorn.me/torrents.php?id=*
// @match        https://passthepopcorn.me/requests.php?*
// @icon         https://passthepopcorn.me/favicon.ico
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const UPDATE_EVENT = 'imdbRatingsDataUpdate';
    const REQUEST_EVENT = 'requestIMDbRatingsData';
    const RESPONSE_EVENT = 'imdbRatingsDataResponse';
    const REQUEST_TIMEOUT_MS = 10000;

    function getImdbIdFromPage() {
        const directLink = document.getElementById('imdb-title-link')?.href;
        if (directLink) {
            const directMatch = directLink.match(/tt\d+/);
            if (directMatch) {
                return directMatch[0];
            }
        }

        const ratingLink = document.querySelector('a#imdb-title-link.rating')?.href;
        if (ratingLink) {
            const ratingMatch = ratingLink.match(/tt\d+/);
            if (ratingMatch) {
                return ratingMatch[0];
            }
        }

        const requestTableLink = Array.from(document.querySelectorAll('a[href*="imdb.com/title/"]'))
            .map((link) => link.href.match(/tt\d+/))
            .find(Boolean);
        return requestTableLink ? requestTableLink[0] : null;
    }

    async function waitForImdbId(maxAttempts = 20, delayMs = 500) {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const imdbId = getImdbIdFromPage();
            if (imdbId) {
                return imdbId;
            }

            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        }

        return null;
    }

    function summarizeProviders(providers = {}) {
        return Object.fromEntries(
            Object.entries(providers).map(([providerKey, providerState]) => [providerKey, providerState?.status || 'missing'])
        );
    }

    function logRatingsUpdate(prefix, detail) {
        console.log(prefix, {
            imdbId: detail?.imdbId || null,
            complete: !!detail?.complete,
            providers: summarizeProviders(detail?.providers),
            payload: detail
        });
    }

    function requestRatingsSnapshot(imdbId) {
        return new Promise((resolve, reject) => {
            const requestId = `ratings-example-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            let timeoutId = null;

            const cleanup = () => {
                document.removeEventListener(RESPONSE_EVENT, onResponse);
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }
            };

            const onResponse = (event) => {
                const detail = event.detail || {};
                if (detail.requestId !== requestId) {
                    return;
                }

                cleanup();
                resolve(detail);
            };

            document.addEventListener(RESPONSE_EVENT, onResponse);

            timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out waiting for ${RESPONSE_EVENT}`));
            }, REQUEST_TIMEOUT_MS);

            document.dispatchEvent(new CustomEvent(REQUEST_EVENT, {
                detail: { imdbId, requestId }
            }));
        });
    }

    document.addEventListener(UPDATE_EVENT, (event) => {
        logRatingsUpdate('[PTP IMDb Ratings Export Example] Progressive update received', event.detail);
    });

    async function init() {
        const imdbId = await waitForImdbId();
        if (!imdbId) {
            console.warn('[PTP IMDb Ratings Export Example] Could not find IMDb ID on this page');
            return;
        }

        console.log('[PTP IMDb Ratings Export Example] Listening for progressive ratings updates', { imdbId });

        try {
            const snapshot = await requestRatingsSnapshot(imdbId);
            logRatingsUpdate('[PTP IMDb Ratings Export Example] Snapshot response received', snapshot);
        } catch (error) {
            console.warn('[PTP IMDb Ratings Export Example] Snapshot request failed', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
