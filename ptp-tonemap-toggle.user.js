// ==UserScript==
// @name         PTP - Tonemap Toggle
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.3.1
// @description  Adds per-panel toggles for tonemapping and Firefox HDR-black recovery on BBCode images. Requires widescreen.css to be active.
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-tonemap-toggle.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-tonemap-toggle.user.js
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ptpimg.me
// @connect      audionut.github.io
// @connect      cdn.jsdelivr.net
// @run-at       document-end
// ==/UserScript==

'use strict';

(async function () {
    const TONEMAP_PREF_KEY = 'ptpTonemapEnabled';
    const TONEMAP_OFF_CLASS = 'ptp-tonemap-off';
    const HDR_FIX_PREF_KEY = 'ptpHdrBlackFixEnabled';
    const HDR_FIX_OFF_CLASS = 'ptp-hdr-blackfix-off';
    const DEBUG_PREF_KEY = 'ptpHdrDebug';
    const PANEL_SELECTOR = '.movie-page__torrent__panel, .movie-page__torrent_panel';
    const IMAGE_SELECTOR = 'img.bbcode__image';
    const HDR_TARGET_SELECTOR = [
        '.movie-page__torrent__panel img.bbcode__image',
        '.movie-page__torrent_panel img.bbcode__image',
        'tr[id^="torrent_"] img.bbcode__image',
        '#lightbox img'
    ].join(', ');
    const IS_FIREFOX = /firefox/i.test(navigator.userAgent);
    const FORCE_HDR_FIX_FOR_PTPIMG_PNG = true;
    const HDR_FIX_SVG_ID = 'ptp-hdr-blackfix-gamma';
    const HDR_FIX_INLINE_FILTER = `url("#${HDR_FIX_SVG_ID}") brightness(1.80) contrast(1.08) saturate(1.12)`;
    const HDR_REFERENCE_WHITE_SCALE = 150.0;
    const HDR_TONEMAP_MOBIUS_PARAM = 0.3;
    const HDR_TONEMAP_DESAT = 10.0;
    const HDR_TONEMAP_PEAK = 12.0;
    const HDR_POST_BRIGHTNESS = 1.00;
    const HDR_POST_GAMMA = 1.00;
    const HDR_POST_SATURATION = 1.00;
    const HDR_DITHER_STRENGTH = 0.75 / 255;
    const HDR_DEBAND_THRESHOLD = 14;
    const HDR_DEBAND_RANGE = 1;
    const HDR_DEBAND_BRIGHTNESS_FLOOR = 110;
    const LOCAL_FFMPEG_WASM_BASE_URL = 'https://audionut.github.io/add-trackers/vendor/ffmpeg-wasm';
    const LOCAL_FFMPEG_WASM_ESM_BASE_URL = `${LOCAL_FFMPEG_WASM_BASE_URL}/esm`;
    const CDN_FFMPEG_WASM_ESM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
    const CDN_FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    const analyzedImages = new WeakSet();
    const pendingImages = new WeakSet();
    const sourceDecisionCache = new Map();
    const convertedSourceCache = new Map();
    const ffmpegWasmState = {
        instance: null,
        loadPromise: null,
        module: null,
        modulePromise: null,
        blobUrls: [],
        assetBaseUrl: null,
        assetLabel: null,
        disabled: false
    };
    let lastClickedHdrSource = '';
    let lastClickedConvertedSrc = '';

    let tonemapEnabled = await GM.getValue(TONEMAP_PREF_KEY, true);
    let hdrFixEnabled = await GM.getValue(HDR_FIX_PREF_KEY, true);
    let debugEnabled = await GM.getValue(DEBUG_PREF_KEY, true);
    function log(...args) {
        if (debugEnabled) {
            console.log('[PTP Tonemap]', ...args);
        }
    }

    function logError(...args) {
        if (debugEnabled) {
            console.error('[PTP Tonemap]', ...args);
        }
    }

    function gmRequest(url, responseType = 'text') {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${response.status} for ${url}`));
                    }
                },
                onerror: () => reject(new Error(`Request failed for ${url}`))
            });
        });
    }

    async function fetchTextAsset(url) {
        const response = await gmRequest(url, 'text');
        return response.responseText ?? response.response;
    }

    async function fetchBinaryAsset(url) {
        const response = await gmRequest(url, 'arraybuffer');
        return response.response;
    }

    function createBlobUrl(content, type) {
        const blobUrl = URL.createObjectURL(new Blob([content], { type }));
        ffmpegWasmState.blobUrls.push(blobUrl);
        return blobUrl;
    }

    function replaceModuleImports(source, replacements) {
        let output = source;
        for (const [from, to] of Object.entries(replacements)) {
            output = output.replaceAll(from, to);
        }
        return output;
    }

    async function loadFfmpegWasmModule() {
        if (ffmpegWasmState.disabled) {
            return null;
        }

        if (ffmpegWasmState.module) {
            return ffmpegWasmState.module;
        }

        if (ffmpegWasmState.modulePromise) {
            return ffmpegWasmState.modulePromise;
        }

        ffmpegWasmState.modulePromise = (async () => {
            const candidates = [
                {
                    label: 'local',
                    esmBaseUrl: LOCAL_FFMPEG_WASM_ESM_BASE_URL,
                    coreJsUrl: `${LOCAL_FFMPEG_WASM_BASE_URL}/ffmpeg-core.js`,
                    coreWasmUrl: `${LOCAL_FFMPEG_WASM_BASE_URL}/ffmpeg-core.wasm`
                },
                {
                    label: 'cdn',
                    esmBaseUrl: CDN_FFMPEG_WASM_ESM_BASE_URL,
                    coreJsUrl: `${CDN_FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
                    coreWasmUrl: `${CDN_FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`
                }
            ];

            for (const candidate of candidates) {
                try {
                    ffmpegWasmState.blobUrls.forEach(url => URL.revokeObjectURL(url));
                    ffmpegWasmState.blobUrls = [];

                    const [classesText, constText, errorsText, utilsText, workerText, coreJsBuffer, coreWasmBuffer] = await Promise.all([
                        fetchTextAsset(`${candidate.esmBaseUrl}/classes.js`),
                        fetchTextAsset(`${candidate.esmBaseUrl}/const.js`),
                        fetchTextAsset(`${candidate.esmBaseUrl}/errors.js`),
                        fetchTextAsset(`${candidate.esmBaseUrl}/utils.js`),
                        fetchTextAsset(`${candidate.esmBaseUrl}/worker.js`),
                        fetchBinaryAsset(candidate.coreJsUrl),
                        fetchBinaryAsset(candidate.coreWasmUrl)
                    ]);

                    const constUrl = createBlobUrl(constText, 'text/javascript');
                    const errorsUrl = createBlobUrl(errorsText, 'text/javascript');
                    const utilsUrl = createBlobUrl(utilsText, 'text/javascript');
                    const coreJsUrl = createBlobUrl(coreJsBuffer, 'text/javascript');
                    const coreWasmUrl = createBlobUrl(coreWasmBuffer, 'application/wasm');

                    const workerPatched = replaceModuleImports(workerText, {
                        './const.js': constUrl,
                        './errors.js': errorsUrl
                    });
                    const workerUrl = createBlobUrl(workerPatched, 'text/javascript');

                    const classesPatched = replaceModuleImports(classesText, {
                        './const.js': constUrl,
                        './utils.js': utilsUrl,
                        './errors.js': errorsUrl
                    });
                    const classesUrl = createBlobUrl(classesPatched, 'text/javascript');

                    const module = await import(/* webpackIgnore: true */ classesUrl);
                    if (!module?.FFmpeg) {
                        throw new Error('FFmpeg module missing FFmpeg export');
                    }

                    ffmpegWasmState.module = {
                        FFmpeg: module.FFmpeg,
                        classWorkerURL: workerUrl,
                        coreURL: coreJsUrl,
                        wasmURL: coreWasmUrl
                    };
                    ffmpegWasmState.assetBaseUrl = candidate.esmBaseUrl;
                    ffmpegWasmState.assetLabel = candidate.label;
                    log('ffmpeg.wasm module ready', { candidate: candidate.label });
                    return ffmpegWasmState.module;
                } catch (error) {
                    logError('ffmpeg.wasm module load failed', { candidate: candidate.label, error: String(error) });
                }
            }

            ffmpegWasmState.disabled = true;
            return null;
        })();

        try {
            return await ffmpegWasmState.modulePromise;
        } finally {
            ffmpegWasmState.modulePromise = null;
        }
    }

    async function ensureFfmpegWasmReady() {
        if (ffmpegWasmState.disabled) {
            return null;
        }

        if (ffmpegWasmState.instance) {
            return ffmpegWasmState.instance;
        }

        if (ffmpegWasmState.loadPromise) {
            return ffmpegWasmState.loadPromise;
        }

        ffmpegWasmState.loadPromise = (async () => {
            const module = await loadFfmpegWasmModule();
            if (!module?.FFmpeg) {
                ffmpegWasmState.disabled = true;
                return null;
            }

            const ffmpeg = new module.FFmpeg();
            if (debugEnabled) {
                ffmpeg.on('log', event => {
                    log('ffmpeg.wasm', event.message);
                });
            }

            try {
                await ffmpeg.load({
                    classWorkerURL: module.classWorkerURL,
                    coreURL: module.coreURL,
                    wasmURL: module.wasmURL
                });
                ffmpegWasmState.instance = ffmpeg;
                log('ffmpeg.wasm ready', {
                    assetBaseUrl: ffmpegWasmState.assetBaseUrl,
                    assetLabel: ffmpegWasmState.assetLabel
                });
                return ffmpeg;
            } catch (error) {
                ffmpegWasmState.disabled = true;
                logError('ffmpeg.wasm load failed', {
                    error: String(error),
                    assetBaseUrl: ffmpegWasmState.assetBaseUrl,
                    assetLabel: ffmpegWasmState.assetLabel
                });
                return null;
            }
        })();

        try {
            return await ffmpegWasmState.loadPromise;
        } finally {
            ffmpegWasmState.loadPromise = null;
        }
    }

    function applyState() {
        if (tonemapEnabled) {
            document.documentElement.classList.remove(TONEMAP_OFF_CLASS);
        } else {
            document.documentElement.classList.add(TONEMAP_OFF_CLASS);
        }

        if (hdrFixEnabled) {
            document.documentElement.classList.remove(HDR_FIX_OFF_CLASS);
        } else {
            document.documentElement.classList.add(HDR_FIX_OFF_CLASS);
        }
    }

    function updateButtons() {
        document.querySelectorAll('.ptp-tonemap-toggle').forEach(btn => {
            btn.querySelector('.ptp-tonemap-toggle__label').textContent =
                tonemapEnabled ? 'Tonemap: ON' : 'Tonemap: OFF';
        });

        document.querySelectorAll('.ptp-hdr-blackfix-toggle').forEach(btn => {
            btn.querySelector('.ptp-tonemap-toggle__label').textContent =
                hdrFixEnabled ? 'HDR Black Fix: ON' : 'HDR Black Fix: OFF';
        });
    }

    async function toggleTonemap() {
        tonemapEnabled = !tonemapEnabled;
        await GM.setValue(TONEMAP_PREF_KEY, tonemapEnabled);
        applyState();
        updateButtons();
    }

    async function toggleHdrBlackFix() {
        hdrFixEnabled = !hdrFixEnabled;
        await GM.setValue(HDR_FIX_PREF_KEY, hdrFixEnabled);
        applyState();
        updateButtons();
        log('HDR Black Fix toggled', { hdrFixEnabled });
        forceApplyHdrFixToCurrentImages();
        scanImages(true);
    }

    function forceApplyHdrFixToCurrentImages() {
        const images = document.querySelectorAll(HDR_TARGET_SELECTOR);
        let eligible = 0;
        let changed = 0;

        images.forEach(img => {
            const src = getEligibleHdrFixSource(img);
            if (!isPtpImgPng(src)) {
                return;
            }

            eligible += 1;
            if (!hdrFixEnabled) {
                restoreOriginalImageSource(img);
                removeInlineHdrFix(img);
                img.dataset.ptpHdrFixApplied = '0';
                img.dataset.ptpHdrFixMode = 'disabled-toggle-pass';
                changed += 1;
            }
        });

        log('forceApplyHdrFixToCurrentImages', {
            totalInPanels: images.length,
            eligible,
            changed,
            hdrFixEnabled
        });
    }

    function applyInlineHdrFix(img) {
        ensureHdrFixSvgFilter();
        if (!Object.prototype.hasOwnProperty.call(img.dataset, 'ptpOriginalFilter')) {
            img.dataset.ptpOriginalFilter = img.style.getPropertyValue('filter') || '';
            img.dataset.ptpOriginalFilterPriority = img.style.getPropertyPriority('filter') || '';
        }
        img.classList.add('ptp-hdr-blackfix');
        img.style.setProperty('filter', HDR_FIX_INLINE_FILTER, 'important');
    }

    function removeInlineHdrFix(img) {
        img.classList.remove('ptp-hdr-blackfix');
        const original = img.dataset.ptpOriginalFilter || '';
        const originalPriority = img.dataset.ptpOriginalFilterPriority || '';
        if (original) {
            img.style.setProperty('filter', original, originalPriority);
        } else {
            img.style.removeProperty('filter');
        }
    }

    function ensureHdrFixSvgFilter() {
        if (document.getElementById(HDR_FIX_SVG_ID)) {
            return;
        }

        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.style.width = '0';
        svg.style.height = '0';
        svg.style.pointerEvents = 'none';

        const defs = document.createElementNS(svgNs, 'defs');
        const filter = document.createElementNS(svgNs, 'filter');
        filter.setAttribute('id', HDR_FIX_SVG_ID);
        filter.setAttribute('color-interpolation-filters', 'sRGB');

        const componentTransfer = document.createElementNS(svgNs, 'feComponentTransfer');
        ['R', 'G', 'B'].forEach(channel => {
            const func = document.createElementNS(svgNs, `feFunc${channel}`);
            func.setAttribute('type', 'gamma');
            func.setAttribute('amplitude', '1');
            func.setAttribute('exponent', '0.58');
            func.setAttribute('offset', '0');
            componentTransfer.appendChild(func);
        });

        const alpha = document.createElementNS(svgNs, 'feFuncA');
        alpha.setAttribute('type', 'identity');
        componentTransfer.appendChild(alpha);

        filter.appendChild(componentTransfer);
        defs.appendChild(filter);
        svg.appendChild(defs);
        (document.body || document.documentElement).appendChild(svg);
    }

    function makeTonemapButton() {
        const btn = document.createElement('button');
        btn.className = 'ptp-tonemap-toggle';
        btn.type = 'button';

        const dot = document.createElement('span');
        dot.className = 'ptp-tonemap-toggle__dot';

        const label = document.createElement('span');
        label.className = 'ptp-tonemap-toggle__label';
        label.textContent = tonemapEnabled ? 'Tonemap: ON' : 'Tonemap: OFF';

        btn.appendChild(dot);
        btn.appendChild(label);
        btn.addEventListener('click', toggleTonemap);
        return btn;
    }

    function makeHdrBlackFixButton() {
        const btn = document.createElement('button');
        btn.className = 'ptp-tonemap-toggle ptp-hdr-blackfix-toggle';
        btn.type = 'button';

        const dot = document.createElement('span');
        dot.className = 'ptp-tonemap-toggle__dot';

        const label = document.createElement('span');
        label.className = 'ptp-tonemap-toggle__label';
        label.textContent = hdrFixEnabled ? 'HDR Black Fix: ON' : 'HDR Black Fix: OFF';

        btn.appendChild(dot);
        btn.appendChild(label);
        btn.addEventListener('click', toggleHdrBlackFix);
        return btn;
    }

    function normalizeUrlCandidate(value) {
        if (!value) {
            return '';
        }

        let normalized = String(value).trim();
        if (!normalized) {
            return '';
        }

        if (normalized.startsWith('//')) {
            normalized = `${window.location.protocol}${normalized}`;
        }

        if (/^https?:\/\//i.test(normalized)) {
            return normalized;
        }

        try {
            return new URL(normalized, window.location.href).href;
        } catch {
            return normalized;
        }
    }

    function extractEmbeddedPtpimgUrl(value) {
        if (!value) {
            return '';
        }

        const match = String(value).match(/((?:https?:)?\/\/ptpimg\.me\/[^\s"'<>]+)/i);
        return match ? normalizeUrlCandidate(match[1]) : '';
    }

    function getImageSourceCandidates(img) {
        const candidates = new Set();
        const push = value => {
            const normalized = normalizeUrlCandidate(value);
            if (normalized) {
                candidates.add(normalized);
            }

            const embedded = extractEmbeddedPtpimgUrl(value);
            if (embedded) {
                candidates.add(embedded);
            }
        };

        push(img.currentSrc);
        push(img.src);
        push(img.getAttribute('src'));
        push(img.dataset.src);
        push(img.dataset.original);
        push(img.dataset.full);
        push(img.dataset.ptpHdrOriginalSrc);

        [img.srcset, img.getAttribute('srcset')].forEach(srcset => {
            if (!srcset) {
                return;
            }

            srcset.split(',').forEach(part => {
                const candidate = part.trim().split(/\s+/)[0];
                push(candidate);
            });
        });

        return Array.from(candidates);
    }

    function isPtpImgPng(url) {
        if (!url) {
            return false;
        }

        try {
            const parsed = new URL(url, window.location.href);
            return /(?:^|\.)ptpimg\.me$/i.test(parsed.hostname) && /\.png$/i.test(parsed.pathname);
        } catch {
            return /(?:https?:)?\/\/ptpimg\.me\/[^\s"'<>]+\.png(?:$|[?#])/i.test(url);
        }
    }

    function getEligibleHdrFixSource(img) {
        return getImageSourceCandidates(img).find(candidate => isPtpImgPng(candidate)) || '';
    }

    function fetchBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType: 'blob',
                onload: response => {
                    log('fetchBlob response', {
                        url,
                        status: response.status,
                        finalUrl: response.finalUrl,
                        headers: response.responseHeaders || '(no headers)'
                    });
                    if (response.status >= 200 && response.status < 300 && response.response) {
                        resolve(response.response);
                    } else {
                        reject(new Error(`Request failed: ${response.status}`));
                    }
                },
                onerror: e => reject(new Error(`Network error while fetching image blob: ${String(e && e.error || 'unknown')}`)),
                ontimeout: () => reject(new Error('Timed out while fetching image blob'))
            });
        });
    }

    async function readPngHdrMetadata(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        if (bytes.length < 8 || signature.some((value, index) => bytes[index] !== value)) {
            return { isPqBt2020Png: false };
        }

        let offset = 8;
        let bitDepth = null;
        let colourPrimaries = null;
        let transferCharacteristics = null;

        while (offset + 8 <= bytes.length) {
            const length =
                (bytes[offset] << 24) |
                (bytes[offset + 1] << 16) |
                (bytes[offset + 2] << 8) |
                bytes[offset + 3];
            const type = String.fromCharCode(
                bytes[offset + 4],
                bytes[offset + 5],
                bytes[offset + 6],
                bytes[offset + 7]
            );
            const dataOffset = offset + 8;
            const nextOffset = dataOffset + length + 4;
            if (nextOffset > bytes.length) {
                break;
            }

            if (type === 'IHDR' && length >= 10) {
                bitDepth = bytes[dataOffset + 8];
            } else if (type === 'cICP' && length >= 4) {
                colourPrimaries = bytes[dataOffset];
                transferCharacteristics = bytes[dataOffset + 1];
            } else if (type === 'IDAT') {
                break;
            }

            offset = nextOffset;
        }

        return {
            bitDepth,
            colourPrimaries,
            transferCharacteristics,
            isPqBt2020Png: colourPrimaries === 9 && transferCharacteristics === 16
        };
    }

    async function inflateZlib(data) {
        if (typeof DecompressionStream !== 'function') {
            throw new Error('DecompressionStream is not available in this browser');
        }

        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
        const response = new Response(stream);
        return new Uint8Array(await response.arrayBuffer());
    }

    function paethPredictor(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc) {
            return a;
        }
        if (pb <= pc) {
            return b;
        }
        return c;
    }

    async function decodePngRgbFromBlob(blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        if (bytes.length < 8 || signature.some((value, index) => bytes[index] !== value)) {
            throw new Error('Not a PNG file');
        }

        let offset = 8;
        let width = 0;
        let height = 0;
        let bitDepth = 0;
        let colorType = 0;
        let compressionMethod = 0;
        let filterMethod = 0;
        let interlaceMethod = 0;
        const idatParts = [];

        while (offset + 8 <= bytes.length) {
            const length =
                (bytes[offset] << 24) |
                (bytes[offset + 1] << 16) |
                (bytes[offset + 2] << 8) |
                bytes[offset + 3];
            const type = String.fromCharCode(
                bytes[offset + 4],
                bytes[offset + 5],
                bytes[offset + 6],
                bytes[offset + 7]
            );
            const dataOffset = offset + 8;
            const nextOffset = dataOffset + length + 4;
            if (nextOffset > bytes.length) {
                throw new Error(`Corrupt PNG chunk: ${type}`);
            }

            if (type === 'IHDR') {
                width =
                    (bytes[dataOffset] << 24) |
                    (bytes[dataOffset + 1] << 16) |
                    (bytes[dataOffset + 2] << 8) |
                    bytes[dataOffset + 3];
                height =
                    (bytes[dataOffset + 4] << 24) |
                    (bytes[dataOffset + 5] << 16) |
                    (bytes[dataOffset + 6] << 8) |
                    bytes[dataOffset + 7];
                bitDepth = bytes[dataOffset + 8];
                colorType = bytes[dataOffset + 9];
                compressionMethod = bytes[dataOffset + 10];
                filterMethod = bytes[dataOffset + 11];
                interlaceMethod = bytes[dataOffset + 12];
            } else if (type === 'IDAT') {
                idatParts.push(bytes.slice(dataOffset, dataOffset + length));
            } else if (type === 'IEND') {
                break;
            }

            offset = nextOffset;
        }

        if (!width || !height) {
            throw new Error('PNG missing IHDR');
        }
        if (bitDepth !== 8 || colorType !== 2 || compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
            throw new Error(`Unsupported PNG format: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlaceMethod}`);
        }

        const compressedLength = idatParts.reduce((sum, part) => sum + part.length, 0);
        const compressed = new Uint8Array(compressedLength);
        let writeOffset = 0;
        idatParts.forEach(part => {
            compressed.set(part, writeOffset);
            writeOffset += part.length;
        });

        const inflated = await inflateZlib(compressed);
        const bytesPerPixel = 3;
        const stride = width * bytesPerPixel;
        const expectedLength = (stride + 1) * height;
        if (inflated.length < expectedLength) {
            throw new Error(`Inflated PNG data too short: got ${inflated.length}, expected ${expectedLength}`);
        }

        const rgb = new Uint8ClampedArray(width * height * 4);
        const prev = new Uint8Array(stride);
        const current = new Uint8Array(stride);
        let srcOffset = 0;

        for (let y = 0; y < height; y += 1) {
            const filterType = inflated[srcOffset];
            srcOffset += 1;

            for (let x = 0; x < stride; x += 1) {
                const raw = inflated[srcOffset + x];
                const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
                const up = prev[x];
                const upLeft = x >= bytesPerPixel ? prev[x - bytesPerPixel] : 0;
                let value = raw;

                switch (filterType) {
                case 0:
                    break;
                case 1:
                    value = (raw + left) & 0xff;
                    break;
                case 2:
                    value = (raw + up) & 0xff;
                    break;
                case 3:
                    value = (raw + Math.floor((left + up) / 2)) & 0xff;
                    break;
                case 4:
                    value = (raw + paethPredictor(left, up, upLeft)) & 0xff;
                    break;
                default:
                    throw new Error(`Unsupported PNG filter type: ${filterType}`);
                }

                current[x] = value;
            }

            srcOffset += stride;

            for (let x = 0; x < width; x += 1) {
                const srcIndex = x * bytesPerPixel;
                const dstIndex = (y * width + x) * 4;
                rgb[dstIndex] = current[srcIndex];
                rgb[dstIndex + 1] = current[srcIndex + 1];
                rgb[dstIndex + 2] = current[srcIndex + 2];
                rgb[dstIndex + 3] = 255;
            }

            prev.set(current);
        }

        return new ImageData(rgb, width, height);
    }

    function canvasToBlob(canvas, type = 'image/png', quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error('Canvas export returned no blob'));
            }, type, quality);
        });
    }

    function pqToLinear(value) {
        const m1 = 2610 / 16384;
        const m2 = 2523 / 32;
        const c1 = 3424 / 4096;
        const c2 = 2413 / 128;
        const c3 = 2392 / 128;
        const vp = Math.pow(Math.max(value, 0), 1 / m2);
        const numerator = Math.max(vp - c1, 0);
        const denominator = c2 - c3 * vp;
        if (denominator <= 0) {
            return 0;
        }
        return Math.pow(numerator / denominator, 1 / m1);
    }

    function linearToSrgb(value) {
        const clamped = Math.min(Math.max(value, 0), 1);
        if (clamped <= 0.0031308) {
            return clamped * 12.92;
        }
        return 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    }

    function applyPostTonemapTrim(r, g, b) {
        let sr = Math.pow(Math.min(Math.max(r, 0), 1), HDR_POST_GAMMA) * HDR_POST_BRIGHTNESS;
        let sg = Math.pow(Math.min(Math.max(g, 0), 1), HDR_POST_GAMMA) * HDR_POST_BRIGHTNESS;
        let sb = Math.pow(Math.min(Math.max(b, 0), 1), HDR_POST_GAMMA) * HDR_POST_BRIGHTNESS;

        const luma = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
        sr = luma + (sr - luma) * HDR_POST_SATURATION;
        sg = luma + (sg - luma) * HDR_POST_SATURATION;
        sb = luma + (sb - luma) * HDR_POST_SATURATION;

        return [
            Math.min(Math.max(sr, 0), 1),
            Math.min(Math.max(sg, 0), 1),
            Math.min(Math.max(sb, 0), 1)
        ];
    }

    function getOrderedDither(x, y) {
        const bayer4 = [
            0, 8, 2, 10,
            12, 4, 14, 6,
            3, 11, 1, 9,
            15, 7, 13, 5
        ];
        const index = ((y & 3) << 2) | (x & 3);
        return ((bayer4[index] / 16) - 0.5) * HDR_DITHER_STRENGTH;
    }

    function applyHighlightDeband(imageData) {
        const { data, width, height } = imageData;
        const source = new Uint8ClampedArray(data);

        for (let y = HDR_DEBAND_RANGE; y < height - HDR_DEBAND_RANGE; y += 1) {
            for (let x = HDR_DEBAND_RANGE; x < width - HDR_DEBAND_RANGE; x += 1) {
                const index = (y * width + x) * 4;
                const centerR = source[index];
                const centerG = source[index + 1];
                const centerB = source[index + 2];
                const centerLuma = 0.2126 * centerR + 0.7152 * centerG + 0.0722 * centerB;

                if (centerLuma < HDR_DEBAND_BRIGHTNESS_FLOOR) {
                    continue;
                }

                let minLuma = centerLuma;
                let maxLuma = centerLuma;
                let sumR = 0;
                let sumG = 0;
                let sumB = 0;
                let count = 0;

                for (let oy = -HDR_DEBAND_RANGE; oy <= HDR_DEBAND_RANGE; oy += 1) {
                    for (let ox = -HDR_DEBAND_RANGE; ox <= HDR_DEBAND_RANGE; ox += 1) {
                        const sampleIndex = ((y + oy) * width + (x + ox)) * 4;
                        const r = source[sampleIndex];
                        const g = source[sampleIndex + 1];
                        const b = source[sampleIndex + 2];
                        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        minLuma = Math.min(minLuma, luma);
                        maxLuma = Math.max(maxLuma, luma);
                        sumR += r;
                        sumG += g;
                        sumB += b;
                        count += 1;
                    }
                }

                if (maxLuma - minLuma > HDR_DEBAND_THRESHOLD) {
                    continue;
                }

                data[index] = Math.round(sumR / count);
                data[index + 1] = Math.round(sumG / count);
                data[index + 2] = Math.round(sumB / count);
            }
        }

        return imageData;
    }

    function mobiusTonemap(value, transition, peak) {
        if (value <= transition) {
            return value;
        }

        const a = -transition * transition * (peak - 1.0) / (transition * transition - 2.0 * transition + peak);
        const b = (transition * transition - 2.0 * transition * peak + peak) / Math.max(peak - 1.0, 1e-6);
        return ((b * b + 2.0 * b * transition + transition * transition) / (b - a)) * ((value + a) / (value + b));
    }

    function toneMapPqBt2020PixelToSdr(r8, g8, b8, x, y) {
        const r2020 = pqToLinear(r8 / 255) * HDR_REFERENCE_WHITE_SCALE;
        const g2020 = pqToLinear(g8 / 255) * HDR_REFERENCE_WHITE_SCALE;
        const b2020 = pqToLinear(b8 / 255) * HDR_REFERENCE_WHITE_SCALE;

        let r = 1.6605 * r2020 - 0.5876 * g2020 - 0.0728 * b2020;
        let g = -0.1246 * r2020 + 1.1329 * g2020 - 0.0083 * b2020;
        let b = -0.0182 * r2020 - 0.1006 * g2020 + 1.1187 * b2020;

        const luma = 0.2627 * r + 0.6780 * g + 0.0593 * b;
        if (HDR_TONEMAP_DESAT > 0 && luma > HDR_TONEMAP_DESAT) {
            const overbright = Math.max(luma - HDR_TONEMAP_DESAT, 0) / Math.max(luma, 1e-6);
            r = r * (1 - overbright) + luma * overbright;
            g = g * (1 - overbright) + luma * overbright;
            b = b * (1 - overbright) + luma * overbright;
        }

        const sigOrig = Math.max(r, g, b, 1e-6);
        const sig = mobiusTonemap(sigOrig, HDR_TONEMAP_MOBIUS_PARAM, HDR_TONEMAP_PEAK);
        const scale = sig / sigOrig;

        r = Math.max(r * scale, 0);
        g = Math.max(g * scale, 0);
        b = Math.max(b * scale, 0);

        const [sr, sg, sb] = applyPostTonemapTrim(
            linearToSrgb(r),
            linearToSrgb(g),
            linearToSrgb(b)
        );

        const dither = getOrderedDither(x, y);

        return [
            Math.round(Math.min(Math.max(sr + dither, 0), 1) * 255),
            Math.round(Math.min(Math.max(sg + dither, 0), 1) * 255),
            Math.round(Math.min(Math.max(sb + dither, 0), 1) * 255)
        ];
    }

    function toneMapHdrPqBt2020ToSdrResized(sourceImageData, targetWidth, targetHeight) {
        const src = sourceImageData.data;
        const srcWidth = sourceImageData.width;
        const srcHeight = sourceImageData.height;
        const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);

        for (let y = 0; y < targetHeight; y += 1) {
            const srcY = Math.min(srcHeight - 1, Math.floor((y + 0.5) * srcHeight / targetHeight));
            for (let x = 0; x < targetWidth; x += 1) {
                const srcX = Math.min(srcWidth - 1, Math.floor((x + 0.5) * srcWidth / targetWidth));
                const srcIndex = (srcY * srcWidth + srcX) * 4;
                const dstIndex = (y * targetWidth + x) * 4;
                const [r, g, b] = toneMapPqBt2020PixelToSdr(
                    src[srcIndex],
                    src[srcIndex + 1],
                    src[srcIndex + 2],
                    x,
                    y
                );
                output[dstIndex] = r;
                output[dstIndex + 1] = g;
                output[dstIndex + 2] = b;
                output[dstIndex + 3] = 255;
            }
        }

        return applyHighlightDeband(new ImageData(output, targetWidth, targetHeight));
    }

    function getTargetRenderWidth(img, sourceWidth) {
        const rectWidth = Math.round(img.getBoundingClientRect().width);
        if (img.closest('#lightbox')) {
            return Math.min(sourceWidth, Math.max(rectWidth || 0, window.innerWidth || sourceWidth));
        }
        return Math.min(sourceWidth, Math.max(rectWidth || 0, 1450));
    }

    async function getToneMappedHdrUrlFromFfmpegWasm(src, img) {
        const ffmpeg = await ensureFfmpegWasmReady();
        if (!ffmpeg) {
            return null;
        }

        const sourceBlob = await fetchBlob(src);
        const inputBytes = new Uint8Array(await sourceBlob.arrayBuffer());
        const sourceWidthHint = img.naturalWidth || 3840;
        const targetWidth = Math.max(320, getTargetRenderWidth(img, sourceWidthHint));
        const inputName = `input-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const outputName = `output-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const filter = [
            'zscale=transfer=linear:npl=100',
            `tonemap=tonemap=mobius:param=${HDR_TONEMAP_MOBIUS_PARAM}:desat=${HDR_TONEMAP_DESAT}:peak=${HDR_TONEMAP_PEAK}`,
            'zscale=transfer=bt709:primaries=bt709:matrix=bt709:range=tv',
            `scale=${targetWidth}:-2:flags=lanczos:force_original_aspect_ratio=decrease`,
            'format=rgb24'
        ].join(',');

        try {
            await ffmpeg.writeFile(inputName, inputBytes);
            await ffmpeg.exec([
                '-i',
                inputName,
                '-vf',
                filter,
                '-frames:v',
                '1',
                outputName
            ]);
            const outputData = await ffmpeg.readFile(outputName);
            log('ffmpeg.wasm tonemap success', { src, targetWidth, outputBytes: outputData.length });
            return URL.createObjectURL(new Blob([outputData], { type: 'image/png' }));
        } catch (error) {
            logError('ffmpeg.wasm tonemap failed', { src, error: String(error) });
            ffmpegWasmState.disabled = true;
            return null;
        } finally {
            try {
                await ffmpeg.deleteFile(inputName);
            } catch {}
            try {
                await ffmpeg.deleteFile(outputName);
            } catch {}
        }
    }

    async function getToneMappedHdrUrl(src, img) {
        const sourceWidthHint = img.naturalWidth || 3840;
        const targetWidth = Math.max(320, getTargetRenderWidth(img, sourceWidthHint));
        const cacheKey = `${src}|${targetWidth}`;
        if (convertedSourceCache.has(cacheKey)) {
            return convertedSourceCache.get(cacheKey);
        }

        const promise = (async () => {
            const wasmUrl = await getToneMappedHdrUrlFromFfmpegWasm(src, img);
            if (wasmUrl) {
                return wasmUrl;
            }

            const blob = await fetchBlob(src);
            const metadata = await readPngHdrMetadata(blob);
            log('hdr metadata', { src, ...metadata, targetWidth });
            if (!metadata.isPqBt2020Png) {
                return null;
            }

            const decoded = await decodePngRgbFromBlob(blob);
            const scale = Math.min(1, targetWidth / decoded.width);
            const width = Math.max(1, Math.round(decoded.width * scale));
            const height = Math.max(1, Math.round(decoded.height * scale));
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = width;
            outputCanvas.height = height;
            const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
            if (!outputCtx) {
                throw new Error('Could not acquire 2D context');
            }

            const outputImageData = toneMapHdrPqBt2020ToSdrResized(decoded, width, height);
            outputCtx.putImageData(outputImageData, 0, 0);
            const outputBlob = await canvasToBlob(outputCanvas, 'image/png');
            return URL.createObjectURL(outputBlob);
        })();

        convertedSourceCache.set(cacheKey, promise);
        return promise;
    }

    function rememberOriginalImageSource(img) {
        if (!Object.prototype.hasOwnProperty.call(img.dataset, 'ptpHdrOriginalSrc')) {
            img.dataset.ptpHdrOriginalSrc = img.getAttribute('src') || img.src || '';
            img.dataset.ptpHdrOriginalSrcset = img.getAttribute('srcset') || '';
        }
    }

    function restoreOriginalImageSource(img) {
        const originalSrc = img.dataset.ptpHdrOriginalSrc || '';
        const originalSrcset = img.dataset.ptpHdrOriginalSrcset || '';
        if (originalSrc) {
            img.src = originalSrc;
        }
        if (originalSrcset) {
            img.setAttribute('srcset', originalSrcset);
        } else {
            img.removeAttribute('srcset');
        }
        img.classList.remove('ptp-hdr-converted');
        img.dataset.ptpHdrFixRendered = '0';
        img.dataset.ptpHdrFixMode = 'restored-original';
    }

    async function applyTrueHdrFix(img, src) {
        rememberOriginalImageSource(img);
        const convertedUrl = await getToneMappedHdrUrl(src, img);
        if (!convertedUrl || !hdrFixEnabled) {
            return false;
        }

        img.classList.add('ptp-hdr-converted');
        img.classList.remove('ptp-hdr-blackfix');
        img.style.removeProperty('filter');
        img.src = convertedUrl;
        img.removeAttribute('srcset');
        img.dataset.ptpHdrFixRendered = 'converted';
        img.dataset.ptpHdrFixMode = 'pq-bt2020-to-sdr';
        return true;
    }

    async function decodeToCanvas(blob) {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
            throw new Error('Could not acquire 2D context');
        }

        if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(blob);
            ctx.drawImage(bitmap, 0, 0, size, size);
            bitmap.close();
            return ctx.getImageData(0, 0, size, size).data;
        }

        const objectUrl = URL.createObjectURL(blob);
        try {
            const image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('Image decode failed'));
                img.src = objectUrl;
            });
            ctx.drawImage(image, 0, 0, size, size);
            return ctx.getImageData(0, 0, size, size).data;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    function analyzeLuminance(data) {
        let totalLuma = 0;
        let veryDark = 0;
        let midBright = 0;
        const pixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            totalLuma += luma;

            if (luma < 22) {
                veryDark += 1;
            }
            if (luma > 85) {
                midBright += 1;
            }
        }

        const avgLuma = totalLuma / pixels;
        const veryDarkRatio = veryDark / pixels;
        const midBrightRatio = midBright / pixels;
        const isCrushed = avgLuma < 28 && veryDarkRatio > 0.84 && midBrightRatio < 0.03;

        return {
            isCrushed,
            avgLuma: Number(avgLuma.toFixed(2)),
            veryDarkRatio: Number(veryDarkRatio.toFixed(4)),
            midBrightRatio: Number(midBrightRatio.toFixed(4))
        };
    }

    async function shouldApplyHdrFixForSource(src) {
        if (sourceDecisionCache.has(src)) {
            return sourceDecisionCache.get(src);
        }

        const decisionPromise = (async () => {
            try {
                const blob = await fetchBlob(src);
                const pixelData = await decodeToCanvas(blob);
                const analysis = analyzeLuminance(pixelData);
                log('luminance analysis', { src, ...analysis });
                return analysis;
            } catch (error) {
                logError('failed to analyze source', { src, error: String(error) });
                return {
                    isCrushed: false,
                    avgLuma: null,
                    veryDarkRatio: null,
                    midBrightRatio: null
                };
            }
        })();

        sourceDecisionCache.set(src, decisionPromise);
        return decisionPromise;
    }

    function getImageSrc(img) {
        return img.currentSrc || img.src || '';
    }

    async function analyzeImage(img, force = false) {
        if (!IS_FIREFOX) {
            log('analyzeImage skip: not Firefox');
            return;
        }

        if (!force && analyzedImages.has(img)) {
            log('analyzeImage skip: already analyzed', { src: getImageSrc(img) });
            return;
        }

        if (pendingImages.has(img)) {
            log('analyzeImage skip: pending', { src: getImageSrc(img) });
            return;
        }

        const src = getEligibleHdrFixSource(img);
        const displaySrc = getImageSrc(img);
        const sourceCandidates = getImageSourceCandidates(img);
        log('analyzeImage start', { src, displaySrc, sourceCandidates, complete: img.complete });
        if (!isPtpImgPng(src)) {
            log('skipping non-ptpimg png image', { displaySrc, sourceCandidates });
            if (force && !hdrFixEnabled) {
                restoreOriginalImageSource(img);
                removeInlineHdrFix(img);
            }
            analyzedImages.add(img);
            return;
        }

        if (!hdrFixEnabled) {
            restoreOriginalImageSource(img);
            removeInlineHdrFix(img);
            img.dataset.ptpHdrFixApplied = '0';
            img.dataset.ptpHdrFixMode = 'disabled';
            analyzedImages.add(img);
            return;
        }

        pendingImages.add(img);
        try {
            if (FORCE_HDR_FIX_FOR_PTPIMG_PNG) {
                const converted = await applyTrueHdrFix(img, src);
                if (converted) {
                    img.dataset.ptpHdrFixApplied = '1';
                    log('image converted hdr fix', {
                        src,
                        rendered: img.dataset.ptpHdrFixMode,
                        currentSrc: img.currentSrc
                    });
                    return;
                }
            }

            const analysis = await shouldApplyHdrFixForSource(src);
            if (analysis.isCrushed) {
                applyInlineHdrFix(img);
            } else {
                restoreOriginalImageSource(img);
                removeInlineHdrFix(img);
            }
            img.dataset.ptpHdrFixApplied = analysis.isCrushed ? '1' : '0';
            img.dataset.ptpHdrFixAvgLuma = String(analysis.avgLuma);
            img.dataset.ptpHdrFixVeryDark = String(analysis.veryDarkRatio);
            img.dataset.ptpHdrFixMidBright = String(analysis.midBrightRatio);

            const computedFilter = getComputedStyle(img).filter;

            log('image analyzed', {
                src,
                applied: analysis.isCrushed,
                avgLuma: analysis.avgLuma,
                veryDarkRatio: analysis.veryDarkRatio,
                midBrightRatio: analysis.midBrightRatio,
                hdrFixEnabled,
                hasFixClass: img.classList.contains('ptp-hdr-blackfix'),
                computedFilter
            });
        } finally {
            pendingImages.delete(img);
            analyzedImages.add(img);
        }
    }

    function queueImageAnalysis(img, force = false) {
        if (!IS_FIREFOX) {
            return;
        }

        if (!(img instanceof HTMLImageElement)) {
            log('queueImageAnalysis skip: non-image target', { nodeName: img?.nodeName || null });
            return;
        }

        if (img.closest('#lightbox') && hdrFixEnabled && lastClickedConvertedSrc) {
            img.dataset.ptpHdrOriginalSrc = img.getAttribute('src') || img.src || lastClickedHdrSource;
            img.classList.add('ptp-hdr-converted');
            img.src = lastClickedConvertedSrc;
            img.removeAttribute('srcset');
            img.dataset.ptpHdrFixRendered = 'converted-lightbox';
            img.dataset.ptpHdrFixMode = 'pq-bt2020-to-sdr-lightbox';
            analyzedImages.add(img);
            log('lightbox inherited converted hdr image', {
                originalSrc: img.dataset.ptpHdrOriginalSrc,
                convertedSrc: lastClickedConvertedSrc
            });
            return;
        }

        if (img.complete) {
            void analyzeImage(img, force);
            return;
        }

        img.addEventListener('load', () => {
            void analyzeImage(img, force);
        }, { once: true });
    }

    function scanImages(force = false) {
        const images = document.querySelectorAll(HDR_TARGET_SELECTOR);
        log('scanImages', { count: images.length, isFirefox: IS_FIREFOX, hdrFixEnabled, tonemapEnabled, force });
        images.forEach(img => queueImageAnalysis(img, force));
    }

    function injectButtons() {
        document.querySelectorAll(PANEL_SELECTOR).forEach(panel => {
            if (!panel.querySelector(IMAGE_SELECTOR) || panel.querySelector('.ptp-tonemap-controls')) {
                return;
            }

            const controls = document.createElement('div');
            controls.className = 'ptp-tonemap-controls';
            controls.appendChild(makeTonemapButton());

            if (IS_FIREFOX) {
                controls.appendChild(makeHdrBlackFixButton());
            }

            panel.insertBefore(controls, panel.firstChild);
        });
    }

    // Initial state + inject for already-rendered panels
    log('init', { isFirefox: IS_FIREFOX, tonemapEnabled, hdrFixEnabled, debugEnabled });
    applyState();
    injectButtons();
    forceApplyHdrFixToCurrentImages();
    scanImages();

    document.addEventListener('click', event => {
        const img = event.target instanceof HTMLImageElement ? event.target : event.target?.closest?.('img');
        if (!(img instanceof HTMLImageElement)) {
            return;
        }

        const src = getEligibleHdrFixSource(img);
        if (!src) {
            return;
        }

        lastClickedHdrSource = src;
        lastClickedConvertedSrc = img.currentSrc || img.src || '';
        log('remembered hdr click target', {
            src: lastClickedHdrSource,
            currentSrc: lastClickedConvertedSrc
        });
    }, true);

    // Watch for dynamically opened torrent panels (expand/collapse)
    const observer = new MutationObserver(() => {
        injectButtons();
        scanImages();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
