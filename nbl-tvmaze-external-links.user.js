// ==UserScript==
// @name         NBL - TVMaze External Links
// @version      1.0.0
// @description  Add IMDb and TVDB links by resolving the TVMaze show ID from show info boxes.
// @author       Audionut
// @match        https://nebulance.io/torrents.php*
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      api.tvmaze.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const ICONS = {
        imdb: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiB2aWV3Qm94PSIwIDAgNTc1IDI4OS44MyIgd2lkdGg9IjU3NSIgaGVpZ2h0PSIyODkuODMiPjxkZWZzPjxwYXRoIGQ9Ik01NzUgMjQuOTFDNTczLjQ0IDEyLjE1IDU2My45NyAxLjk4IDU1MS45MSAwQzQ5OS4wNSAwIDc2LjE4IDAgMjMuMzIgMEMxMC4xMSAyLjE3IDAgMTQuMTYgMCAyOC42MUMwIDUxLjg0IDAgMjM3LjY0IDAgMjYwLjg2QzAgMjc2Ljg2IDEyLjM3IDI4OS44MyAyNy42NCAyODkuODNDNzkuNjMgMjg5LjgzIDQ5NS42IDI4OS44MyA1NDcuNTkgMjg5LjgzQzU2MS42NSAyODkuODMgNTczLjI2IDI3OC44MiA1NzUgMjY0LjU3QzU3NSAyMTYuNjQgNTc1IDQ4Ljg3IDU3NSAyNC45MVoiIGlkPSJkMXB3aGY5d3kyIj48L3BhdGg+PHBhdGggZD0iTTY5LjM1IDU4LjI0TDExNC45OCA1OC4yNEwxMTQuOTggMjMzLjg5TDY5LjM1IDIzMy44OUw2OS4zNSA1OC4yNFoiIGlkPSJnNWpqbnEyNnlTIj48L3BhdGg+PHBhdGggZD0iTTIwMS4yIDEzOS4xNUMxOTcuMjggMTEyLjM4IDE5NS4xIDk3LjUgMTk0LjY3IDk0LjUzQzE5Mi43NiA4MC4yIDE5MC45NCA2Ny43MyAxODkuMiA1Ny4wOUMxODUuMjUgNTcuMDkgMTY1LjU0IDU3LjA5IDEzMC4wNCA1Ny4wOUwxMzAuMDQgMjMyLjc0TDE3MC4wMSAyMzIuNzRMMTcwLjE1IDExNi43NkwxODYuOTcgMjMyLjc0TDIxNS40NCAyMzIuNzRMMjMxLjM5IDExNC4xOEwyMzEuNTQgMjMyLjc0TDI3MS4zOCAyMzIuNzRMMjcxLjM4IDU3LjA5TDIxMS43NyA1Ny4wOUwyMDEuMiAxMzkuMTVaIiBpZD0iaTNQcmgxSnBYdCI+PC9wYXRoPjxwYXRoIGQ9Ik0zNDYuNzEgOTMuNjNDMzQ3LjIxIDk1Ljg3IDM0Ny40NyAxMDAuOTUgMzQ3LjQ3IDEwOC44OUMzNDcuNDcgMTE1LjcgMzQ3LjQ3IDE3MC4xOCAzNDcuNDcgMTc2Ljk5QzM0Ny40NyAxODguNjggMzQ2LjcxIDE5NS44NCAzNDUuMiAxOTguNDhDMzQzLjY4IDIwMS4xMiAzMzkuNjQgMjAyLjQzIDMzMy4wOSAyMDIuNDNDMzMzLjA5IDE5MC45IDMzMy4wOSA5OC42NiAzMzMuMDkgODcuMTNDMzM4LjA2IDg3LjEzIDM0MS40NSA4Ny42NiAzNDMuMjUgODguN0MzNDUuMDUgODkuNzUgMzQ2LjIxIDkxLjM5IDM0Ni43MSA5My42M1pNMzY3LjMyIDIzMC45NUMzNzIuNzUgMjI5Ljc2IDM3Ny4zMSAyMjcuNjYgMzgxLjAxIDIyNC42N0MzODQuNyAyMjEuNjcgMzg3LjI5IDIxNy41MiAzODguNzcgMjEyLjIxQzM5MC4yNiAyMDYuOTEgMzkxLjE0IDE5Ni4zOCAzOTEuMTQgMTgwLjYzQzM5MS4xNCAxNzQuNDcgMzkxLjE0IDEyNS4xMiAzOTEuMTQgMTE4Ljk1QzM5MS4xNCAxMDIuMzMgMzkwLjQ5IDkxLjE5IDM4OS40OCA4NS41M0MzODguNDYgNzkuODYgMzg1LjkzIDc0LjcxIDM4MS44OCA3MC4wOUMzNzcuODIgNjUuNDcgMzcxLjkgNjIuMTUgMzY0LjEyIDYwLjEzQzM1Ni4zMyA1OC4xMSAzNDMuNjMgNTcuMDkgMzIxLjU0IDU3LjA5QzMxOS4yNyA1Ny4wOSAzMDcuOTMgNTcuMDkgMjg3LjUgNTcuMDlMMjg3LjUgMjMyLjc0TDM0Mi43OCAyMzIuNzRDMzU1LjUyIDIzMi4zNCAzNjMuNyAyMzEuNzUgMzY3LjMyIDIzMC45NVoiIGlkPSJhNG92OXJSR1FtIj48L3BhdGg+PHBhdGggZD0iTTQ2NC43NiAyMDQuN0M0NjMuOTIgMjA2LjkzIDQ2MC4yNCAyMDguMDYgNDU3LjQ2IDIwOC4wNkM0NTQuNzQgMjA4LjA2IDQ1Mi45MyAyMDYuOTggNDUyLjAxIDIwNC44MUM0NTEuMDkgMjAyLjY1IDQ1MC42NCAxOTcuNzIgNDUwLjY0IDE5MEM0NTAuNjQgMTg1LjM2IDQ1MC42NCAxNDguMjIgNDUwLjY0IDE0My41OEM0NTAuNjQgMTM1LjU4IDQ1MS4wNCAxMzAuNTkgNDUxLjg1IDEyOC42QzQ1Mi42NSAxMjYuNjMgNDU0LjQxIDEyNS42MyA0NTcuMTMgMTI1LjYzQzQ1OS45MSAxMjUuNjMgNDYzLjY0IDEyNi43NiA0NjQuNiAxMjkuMDNDNDY1LjU1IDEzMS4zIDQ2Ni4wMyAxMzYuMTUgNDY2LjAzIDE0My41OEM0NjYuMDMgMTQ2LjU4IDQ2Ni4wMyAxNjEuNTggNDY2LjAzIDE4OC41OUM0NjUuNzQgMTk3Ljg0IDQ2NS4zMiAyMDMuMjEgNDY0Ljc2IDIwNC43Wk00MDYuNjggMjMxLjIxTDQ0Ny43NiAyMzEuMjFDNDQ5LjQ3IDIyNC41IDQ1MC40MSAyMjAuNzcgNDUwLjYgMjIwLjAyQzQ1NC4zMiAyMjQuNTIgNDU4LjQxIDIyNy45IDQ2Mi45IDIzMC4xNEM0NjcuMzcgMjMyLjM5IDQ3NC4wNiAyMzMuNTEgNDc5LjI0IDIzMy41MUM0ODYuNDUgMjMzLjUxIDQ5Mi42NyAyMzEuNjIgNDk3LjkyIDIyNy44M0M1MDMuMTYgMjI0LjA1IDUwNi41IDIxOS41NyA1MDcuOTIgMjE0LjQyQzUwOS4zNCAyMDkuMjYgNTEwLjA1IDIwMS40MiA1MTAuMDUgMTkwLjg4QzUxMC4wNSAxODUuOTUgNTEwLjA1IDE0Ni41MyA1MTAuMDUgMTQxLjZDNTEwLjA1IDEzMSA1MDkuODEgMTI0LjA4IDUwOS4zNCAxMjAuODNDNTA4Ljg3IDExNy41OCA1MDcuNDcgMTE0LjI3IDUwNS4xNCAxMTAuODhDNTAyLjgxIDEwNy40OSA0OTkuNDIgMTA0Ljg2IDQ5NC45OCAxMDIuOThDNDkwLjU0IDEwMS4xIDQ4NS4zIDEwMC4xNiA0NzkuMjYgMTAwLjE2QzQ3NC4wMSAxMDAuMTYgNDY3LjI5IDEwMS4yMSA0NjIuODEgMTAzLjI4QzQ1OC4zNCAxMDUuMzUgNDU0LjI4IDEwOC40OSA0NTAuNjQgMTEyLjdDNDUwLjY0IDEwOC44OSA0NTAuNjQgODkuODUgNDUwLjY0IDU1LjU2TDQwNi42OCA1NS41Nkw0MDYuNjggMjMxLjIxWiIgaWQ9ImZrOTY4QnBzWCI+PC9wYXRoPjwvZGVmcz48Zz48Zz48Zz48dXNlIHhsaW5rOmhyZWY9IiNkMXB3aGY5d3kyIiBvcGFjaXR5PSIxIiBmaWxsPSIjZjZjNzAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2QxcHdoZjl3eTIiIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2c1ampucTI2eVMiIG9wYWNpdHk9IjEiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMSI+PC91c2U+PGc+PHVzZSB4bGluazpocmVmPSIjZzVqam5xMjZ5UyIgb3BhY2l0eT0iMSIgZmlsbC1vcGFjaXR5PSIwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLW9wYWNpdHk9IjAiPjwvdXNlPjwvZz48L2c+PGc+PHVzZSB4bGluazpocmVmPSIjaTNQcmgxSnBYdCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNpM1ByaDFKcFh0IiBvcGFjaXR5PSIxIiBmaWxsLW9wYWNpdHk9IjAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2Utb3BhY2l0eT0iMCI+PC91c2U+PC9nPjwvZz48Zz48dXNlIHhsaW5rOmhyZWY9IiNhNG92OXJSR1FtIiBvcGFjaXR5PSIxIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjEiPjwvdXNlPjxnPjx1c2UgeGxpbms6aHJlZj0iI2E0b3Y5clJHUW0iIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjxnPjx1c2UgeGxpbms6aHJlZj0iI2ZrOTY4QnBzWCIgb3BhY2l0eT0iMSIgZmlsbD0iIzAwMDAwMCIgZmlsbC1vcGFjaXR5PSIxIj48L3VzZT48Zz48dXNlIHhsaW5rOmhyZWY9IiNmazk2OEJwc1giIG9wYWNpdHk9IjEiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1vcGFjaXR5PSIwIj48L3VzZT48L2c+PC9nPjwvZz48L2c+PC9zdmc+',
        tvdb: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAA2CAMAAAAGesyaAAAAqFBMVEUAAABs1ZH///9RoG2/v782a0lAQECAgIAbNiUIDglfvIBs1pIQEBBZr3dmyYkVKRxgYGAyX0FMk2REhlswMDDv7+9GiWApUTfPz89v15JSoG0+eVMlRjEOGxIgICASHRWwsLBwcHBSom4pUDciQy4gOSrf39+goKCQkJBCe1lUpHJMlWZQUFArUjhy2Jlpy4pZsH05bks5YEdozY5isH04blAyUz4eLCPbOFdaAAAAAXRSTlMAQObYZgAAArZJREFUWMO9mOl2qjAQgGcIUXYQUVuLVdu61253e/83u8cxMdwoQqiX749JDocvmcyYKADsQ0R8YynvORP4T/SxiMeG/MVx4bb08BJ+OObcWcCN8PAa0W2iiLXwxt+KIprgfzSLoo/m+A+GawqxCVswYoyN2IMJQ2xECiZwbIQHBWwik40EdEZYgNX2+lDAIjqy0QUdpw3JnzYk0IokakPC2pBsG0mGZhJ+MjD2QCPPTBGiwqMROhueAYJkbQs0yVIMr+aPZxK4xBQV+ekkHQF0B5ZCSTTsTCsUuEiqFfkEET8huLOsSgmR1JG8oKRH/QfEMQA5KiXK4l6XwDseeXPp6QhxAWurvmRAG1O68bmcOtGX944tPFpHlklQnl2Z3LUVHVtlKfxEvVj0YnnveJELmQXXUzgTlsNjrEyCk8LZ+UHtPaIfiB0ZBFV1kljEKx1bZZJj9L6oPaL2E+JP+a41VEkC1eelkojm6t4fmnBggYg7yMRLKyViyTN5bJ1L1PT7tCjZ4tCpLbGpb1OhlEpC6udyeybYWBKXSlRKpfS5oSuEDHVSLVmq/hVJX7w8l4VIqxuI/K+QyHqa07FVLolcCpN3LFIa8l2YWURWIZHPUckzTeKg4plGZNSI3zL/7yqKcS4ek8lPyER1f1y8X+WnmQSilAfdTqkkS2xL1KIenunR0uOci3k7IFBzWcCrwRekDbqkd3b290EQFxN7VVNCMdX34N3VJb57/ttyA9CtKZkFcCbBcKpJ5OKmPipGAB27hmSpasnFAtEwj/+ReHpMpflx3rUl6sKt6M4zKIDm7MCUEI25B1NYG5J+GxKOxjAw5QuN2YApDpoSuWBKbOyIwRw0wGPDngsNuMcahGP+y4mhMenVbGU7PnKm8F1ylJz/iwc3I9X/tvukwNwY54kCk1Jgbs1fyDwsK7JykskAAAAASUVORK5CYII='
    };

    const STYLE_ID = 'nbl-tvmaze-external-links-style';
    const ROW_CLASS = 'nbl-tvmaze-external-links';
    const TVMAZE_CACHE_KEY_PREFIX = 'nbl_tvmaze_show_cache_v1_';
    const TVMAZE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
    const showCache = new Map();

    async function gmGetValue(key, defaultValue) {
        if (typeof GM === 'object' && GM && typeof GM.getValue === 'function') {
            try {
                return await GM.getValue(key, defaultValue);
            } catch {
                return defaultValue;
            }
        }

        return defaultValue;
    }

    async function gmSetValue(key, value) {
        if (typeof GM === 'object' && GM && typeof GM.setValue === 'function') {
            try {
                await GM.setValue(key, value);
            } catch {
                // Non-fatal; script can continue without persistent cache writes.
            }
        }
    }

    function getTvMazeCacheKey(tvMazeId) {
        return `${TVMAZE_CACHE_KEY_PREFIX}${tvMazeId}`;
    }

    async function readCachedShow(tvMazeId) {
        const cacheKey = getTvMazeCacheKey(tvMazeId);
        const entry = await gmGetValue(cacheKey, null);

        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const expiresAt = Number(entry.expiresAt || 0);
        const showData = entry.showData;
        if (expiresAt > Date.now() && showData && typeof showData === 'object') {
            return showData;
        }

        await gmSetValue(cacheKey, null);
        return null;
    }

    async function writeCachedShow(tvMazeId, showData) {
        if (!showData || typeof showData !== 'object') {
            return;
        }

        const cacheKey = getTvMazeCacheKey(tvMazeId);
        await gmSetValue(cacheKey, {
            expiresAt: Date.now() + TVMAZE_CACHE_TTL_MS,
            showData
        });
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${ROW_CLASS} {
                display: inline-flex;
                align-items: center;
                gap: 18px;
                margin-left: 18px;
                vertical-align: middle;
            }
            .${ROW_CLASS} a {
                display: inline-flex;
                align-items: center;
                line-height: 1;
            }
            .${ROW_CLASS} img {
                width: 30px;
                height: 24px;
                vertical-align: middle;
                transform: translateY(-2px);
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function requestJson(url) {
        if (typeof GM === 'object' && GM && typeof GM.xmlHttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: 'GET',
                    url,
                    timeout: 10000,
                    headers: { Accept: 'application/json' },
                    onload: (response) => {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`TVMaze request failed with status ${response.status}`));
                            return;
                        }

                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch {
                            reject(new Error('Failed to parse TVMaze JSON response'));
                        }
                    },
                    onerror: () => reject(new Error('TVMaze request failed')),
                    ontimeout: () => reject(new Error('TVMaze request timed out'))
                });
            });
        }

        return fetch(url, { credentials: 'omit' }).then((response) => {
            if (!response.ok) {
                throw new Error(`TVMaze request failed with status ${response.status}`);
            }
            return response.json();
        });
    }

    function extractTvMazeId(scope) {
        const anchor = scope.querySelector('a[href*="tvmaze.com/shows/"]');
        if (!anchor) {
            return '';
        }

        const href = String(anchor.getAttribute('href') || '').trim();
        const match = /tvmaze\.com\/shows\/(\d+)/i.exec(href);
        return match ? match[1] : '';
    }

    function fetchTvMazeShow(tvMazeId) {
        if (showCache.has(tvMazeId)) {
            return showCache.get(tvMazeId);
        }

        const promise = (async () => {
            const cachedShow = await readCachedShow(tvMazeId);
            if (cachedShow) {
                return cachedShow;
            }

            const freshShow = await requestJson(`https://api.tvmaze.com/shows/${encodeURIComponent(tvMazeId)}`);
            await writeCachedShow(tvMazeId, freshShow);
            return freshShow;
        })().catch((error) => {
            console.warn('[NBL TVMaze External Links]', error.message);
            return null;
        });

        showCache.set(tvMazeId, promise);
        return promise;
    }

    function createExternalLinksInline(show) {
        const externals = show && show.externals ? show.externals : {};
        const imdbId = String(externals.imdb || '').trim();
        const tvdbId = String(externals.thetvdb || externals.tvdb || '').trim();

        const links = [];
        if (imdbId) {
            links.push({
                label: 'IMDb',
                href: `https://www.imdb.com/title/${imdbId}/`,
                icon: ICONS.imdb,
                title: `IMDb ID: ${imdbId}`
            });
        }
        if (tvdbId) {
            links.push({
                label: 'TVDB',
                href: `https://thetvdb.com/dereferrer/series/${tvdbId}`,
                icon: ICONS.tvdb,
                title: `TVDB ID: ${tvdbId}`
            });
        }

        if (!links.length) {
            return null;
        }

        const inline = document.createElement('span');
        inline.className = ROW_CLASS;

        links.forEach((entry) => {

            const a = document.createElement('a');
            a.href = entry.href;
            a.target = '_blank';
            a.rel = 'noreferrer';
            a.title = entry.title;

            const img = document.createElement('img');
            img.src = entry.icon;
            img.alt = `${entry.label} icon`;
            a.appendChild(img);

            inline.appendChild(a);
        });

        return inline;
    }

    function getInfoboxTargets() {
        const targets = [];

        const showBox = document.querySelector('#showinfobox .box');
        if (showBox) {
            targets.push(showBox);
        }

        const seasonBox = document.querySelector('#seasoninfobox td[style*="padding:10px"]')
            || document.querySelector('#seasoninfobox');
        if (seasonBox) {
            targets.push(seasonBox);
        }

        return targets;
    }

    async function processInfobox(target) {
        if (!target || target.querySelector(`.${ROW_CLASS}`)) {
            return;
        }

        const tvMazeAnchor = target.querySelector('a[href*="tvmaze.com/shows/"]');
        if (!tvMazeAnchor) {
            return;
        }

        const tvMazeId = extractTvMazeId(target);
        if (!tvMazeId) {
            return;
        }

        const show = await fetchTvMazeShow(tvMazeId);
        if (!show) {
            return;
        }

        const inline = createExternalLinksInline(show);
        if (!inline) {
            return;
        }

        tvMazeAnchor.after(inline);
    }

    async function init() {
        ensureStyle();
        const targets = getInfoboxTargets();
        await Promise.all(targets.map((target) => processInfobox(target)));
    }

    init();
})();
