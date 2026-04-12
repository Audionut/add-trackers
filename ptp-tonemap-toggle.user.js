// ==UserScript==
// @name         PTP - Tonemap Toggle
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.4.0
// @description  Adds per-panel toggles for tonemapping and Firefox HDR-black recovery on BBCode images.
// @author       Audionut
// @match        https://passthepopcorn.me/*
// @icon         https://passthepopcorn.me/favicon.ico
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-tonemap-toggle.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-tonemap-toggle.user.js
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ptpimg.me
// @connect      audionut.github.io
// @connect      cdn.jsdelivr.net
// @run-at       document-end
// ==/UserScript==

'use strict';

(async function () {
  const TONEMAP_PREF_KEY = 'ptpTonemapEnabledByTorrent';
  const TONEMAP_ON_CLASS = 'ptp-tonemap-enabled';
  const HDR_FIX_PREF_KEY = 'ptpHdrBlackFixEnabledByTorrent';
  const HDR_FIX_ON_CLASS = 'ptp-hdr-blackfix-enabled';
  const HDR_SETTINGS_PREF_KEY = 'ptpHdrSettingsV1';
  const DEBUG_PREF_KEY = 'ptpHdrDebug';
  const PANEL_SELECTOR = '.movie-page__torrent__panel, .movie-page__torrent_panel';
  const DETAIL_ROW_SELECTOR = 'tr[id^="torrent_"]';
  const ELIGIBLE_PANEL_ATTRIBUTE = 'data-ptp-hdr-eligible';
  const TORRENT_CONTAINER_SELECTOR = `${PANEL_SELECTOR}, ${DETAIL_ROW_SELECTOR}`;
  const IMAGE_SELECTOR = 'img.bbcode__image';
  const IS_FIREFOX = /firefox/i.test(navigator.userAgent);
  const TONEMAP_SVG_ID = 'ptp-tonemap-gamma';
  const TONEMAP_STYLE_ID = 'ptp-tonemap-adjustments-style';
  const TONEMAP_UI_STYLE_ID = 'ptp-tonemap-ui-style';
  const DEFAULT_HDR_SETTINGS = {
    tonemapOnlyContrast: 1,
    tonemapOnlyBrightness: 1,
    tonemapOnlySaturation: 2,
    tonemapOnlyGammaExponent: 1.2,
    forceHdrFixForPtpimgPng: true,
    ffmpegWorkers: 2,
    tonemapMobiusParam: 0.3,
    tonemapDesat: 10,
    tonemapPeak: 12
  };
  const LOCAL_FFMPEG_WASM_BASE_URL = 'https://audionut.github.io/add-trackers/vendor/ffmpeg-wasm';
  const LOCAL_FFMPEG_WASM_ESM_BASE_URL = `${LOCAL_FFMPEG_WASM_BASE_URL}/esm`;
  const CDN_FFMPEG_WASM_ESM_BASE_URL =
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
  const CDN_FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
  const analyzedImages = new WeakSet();
  const pendingImages = new WeakSet();
  const queuedImages = new WeakMap();
  const imageAnalysisQueue = [];
  const convertedSourceCache = new Map();
  const ffmpegWasmState = {
    module: null,
    modulePromise: null,
    pool: [],
    blobUrls: [],
    assetBaseUrl: null,
    assetLabel: null,
    disabled: false
  };
  let lastClickedHdrSource = '';
  let lastClickedConvertedSrc = '';
  let lastClickedTorrentId = '';
  let hasSavedHdrSettingsThisSession = false;
  let activeImageQueueWorkers = 0;

  const tonemapEnabledByTorrent = normalizeTorrentStateMap(await GM.getValue(TONEMAP_PREF_KEY, {}));
  const hdrFixEnabledByTorrent = normalizeTorrentStateMap(await GM.getValue(HDR_FIX_PREF_KEY, {}));
  let hdrSettings = normalizeHdrSettings(await GM.getValue(HDR_SETTINGS_PREF_KEY, {}));
  let debugEnabled = await GM.getValue(DEBUG_PREF_KEY, true);

  Object.keys(hdrFixEnabledByTorrent).forEach((torrentId) => {
    if (hdrFixEnabledByTorrent[torrentId]) {
      tonemapEnabledByTorrent[torrentId] = false;
    }
  });

  function normalizeTorrentStateMap(value) {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value).map(([torrentId, enabled]) => [String(torrentId), Boolean(enabled)])
    );
  }

  function clampNumber(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, numeric));
  }

  function normalizeHdrSettings(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      tonemapOnlyContrast: clampNumber(
        input.tonemapOnlyContrast,
        DEFAULT_HDR_SETTINGS.tonemapOnlyContrast,
        0.1,
        3
      ),
      tonemapOnlyBrightness: clampNumber(
        input.tonemapOnlyBrightness,
        DEFAULT_HDR_SETTINGS.tonemapOnlyBrightness,
        0,
        3
      ),
      tonemapOnlySaturation: clampNumber(
        input.tonemapOnlySaturation,
        DEFAULT_HDR_SETTINGS.tonemapOnlySaturation,
        0,
        3
      ),
      tonemapOnlyGammaExponent: clampNumber(
        input.tonemapOnlyGammaExponent,
        DEFAULT_HDR_SETTINGS.tonemapOnlyGammaExponent,
        0.05,
        4
      ),
      forceHdrFixForPtpimgPng: Boolean(input.forceHdrFixForPtpimgPng ?? DEFAULT_HDR_SETTINGS.forceHdrFixForPtpimgPng),
      ffmpegWorkers: Math.round(
        clampNumber(
          input.ffmpegWorkers ?? input.concurrentImageJobs,
          DEFAULT_HDR_SETTINGS.ffmpegWorkers,
          1,
          6
        )
      ),
      tonemapMobiusParam: clampNumber(
        input.tonemapMobiusParam,
        DEFAULT_HDR_SETTINGS.tonemapMobiusParam,
        0,
        4
      ),
      tonemapDesat: clampNumber(input.tonemapDesat, DEFAULT_HDR_SETTINGS.tonemapDesat, 0, 1000),
      tonemapPeak: clampNumber(input.tonemapPeak, DEFAULT_HDR_SETTINGS.tonemapPeak, 0.1, 1000)
    };
  }

  async function saveHdrSettings(nextSettings) {
    hdrSettings = normalizeHdrSettings(nextSettings);
    await GM.setValue(HDR_SETTINGS_PREF_KEY, hdrSettings);
  }

  function removeTonemapSvgFilter() {
    const filter = document.getElementById(TONEMAP_SVG_ID);
    const svg = filter?.closest('svg');
    if (svg) {
      svg.remove();
      return;
    }
    filter?.remove();
  }

  function updateTonemapAdjustmentStyle() {
    ensureTonemapSvgFilter();
    let style = document.getElementById(TONEMAP_STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement('style');
      style.id = TONEMAP_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = `
      ${IMAGE_SELECTOR}[data-ptp-tonemap-active="1"] {
        filter: url("#${TONEMAP_SVG_ID}") brightness(${hdrSettings.tonemapOnlyBrightness}) contrast(${hdrSettings.tonemapOnlyContrast}) saturate(${hdrSettings.tonemapOnlySaturation}) !important;
      }
    `;
  }

  function ensureTonemapUiStyle() {
    let style = document.getElementById(TONEMAP_UI_STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement('style');
      style.id = TONEMAP_UI_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = `
      .ptp-tonemap-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0 0 8px 0;
      }

      .ptp-tonemap-toggle {
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 0;
        padding: 3px 10px;
        font-size: 11px;
        line-height: 1.3;
        font-family: Tahoma, Helvetica, Geneva, sans-serif;
        color: #b5b5b5;
        background: #212121;
        border: 1px solid #3a3c3f;
        border-radius: 5px;
        box-shadow: none;
        cursor: pointer;
        user-select: none;
      }

      .ptp-tonemap-toggle:hover {
        color: #ffffff;
        background: #2c2c2c;
      }

      .ptp-tonemap-toggle:focus-visible {
        outline: 1px solid #7aa2ff;
        outline-offset: 1px;
      }

      .ptp-tonemap-toggle__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #418b00;
        flex-shrink: 0;
      }

      .ptp-tonemap-toggle:not(.is-enabled) .ptp-tonemap-toggle__dot,
      .ptp-hdr-blackfix-toggle:not(.is-enabled) .ptp-tonemap-toggle__dot {
        background: #666666;
      }
    `;
  }

  function clearHdrCachesForSource(src) {
    if (!src) {
      return;
    }

    convertedSourceCache.delete(`${src}|full-resolution`);
  }

  function clearImageAnalysisState(img) {
    pendingImages.delete(img);
    analyzedImages.delete(img);
    img.dataset.ptpHdrFixApplied = '0';
    img.dataset.ptpHdrFixRendered = '0';
    img.dataset.ptpHdrFixMode = 'refresh-pending';
    syncTonemapStateForImage(img);
  }

  function refreshImages(images) {
    images.forEach((img) => {
      const originalSrc = normalizeUrlCandidate(img.dataset.ptpHdrOriginalSrc || '');
      const fallbackSrc = normalizeUrlCandidate(getEligibleHdrFixSource(img) || getImageSrc(img));
      const sourceForRefresh = originalSrc || fallbackSrc;

      clearHdrCachesForSource(sourceForRefresh);
      restoreOriginalImageSource(img);
      clearImageAnalysisState(img);
      queueImageAnalysis(img, true);
    });
  }

  function refreshAllHdrImages(options = {}) {
    const { automatic = false } = options;
    if (automatic && !hasSavedHdrSettingsThisSession) {
      return;
    }

    refreshImages(getRelevantImages());
    if (lastClickedConvertedSrc) {
      lastClickedConvertedSrc = '';
    }
  }

  function openHdrSettingsModal() {
    let modal = document.getElementById('ptp-hdr-settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      return;
    }

    modal = document.createElement('div');
    modal.id = 'ptp-hdr-settings-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '100000';

    const panel = document.createElement('div');
    panel.style.width = 'min(700px, 96vw)';
    panel.style.maxHeight = '92vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#1f1f1f';
    panel.style.color = '#e7e7e7';
    panel.style.border = '1px solid #444';
    panel.style.borderRadius = '8px';
    panel.style.padding = '16px';
    panel.style.boxSizing = 'border-box';

    panel.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 12px;">PTP Tonemap HDR Settings</div>
      <div style="margin-bottom: 12px; border:1px solid #3a3a3a; border-radius:6px; padding:10px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color:#9ad3ff;">Tonemapping Only</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label for="ptp-tonemap-only-contrast" style="display:block; margin-bottom:4px;">Contrast (0.1-3)</label>
            <input id="ptp-tonemap-only-contrast" type="number" min="0.1" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-tonemap-only-brightness" style="display:block; margin-bottom:4px;">Brightness (0-3)</label>
            <input id="ptp-tonemap-only-brightness" type="number" min="0" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-tonemap-only-saturation" style="display:block; margin-bottom:4px;">Saturation (0-3)</label>
            <input id="ptp-tonemap-only-saturation" type="number" min="0" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-tonemap-only-gamma" style="display:block; margin-bottom:4px;">Gamma Exponent</label>
            <input id="ptp-tonemap-only-gamma" type="number" min="0.05" max="4" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
        </div>
      </div>
      <div style="margin-bottom: 12px; border:1px solid #3a3a3a; border-radius:6px; padding:10px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color:#ffd89a;">HDR Fix</div>
        <div style="font-size: 12px; color:#c7c7c7; margin-bottom: 8px;">FFmpeg conversion</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <label style="display:flex; align-items:center; gap:8px; grid-column:1 / -1;">
            <input id="ptp-hdr-force-fix" type="checkbox" />
            Force tonemap conversion for ptpimg PNG sources
          </label>
          <div>
            <label for="ptp-hdr-tonemap-mobius" style="display:block; margin-bottom:4px;">Mobius Param</label>
            <input id="ptp-hdr-tonemap-mobius" type="number" min="0" max="4" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-hdr-tonemap-desat" style="display:block; margin-bottom:4px;">Desaturation</label>
            <input id="ptp-hdr-tonemap-desat" type="number" min="0" max="1000" step="0.1" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-hdr-tonemap-peak" style="display:block; margin-bottom:4px;">Peak</label>
            <input id="ptp-hdr-tonemap-peak" type="number" min="0.1" max="1000" step="0.1" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="ptp-hdr-ffmpeg-workers" style="display:block; margin-bottom:4px;">FFmpeg Workers (1-6)</label>
            <input id="ptp-hdr-ffmpeg-workers" type="number" min="1" max="6" step="1" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button id="ptp-hdr-settings-cancel" type="button">Cancel</button>
        <button id="ptp-hdr-settings-defaults" type="button">Reset Defaults</button>
        <button id="ptp-hdr-settings-save" type="button">Save</button>
      </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    const tonemapOnlyContrastInput = panel.querySelector('#ptp-tonemap-only-contrast');
    const tonemapOnlyBrightnessInput = panel.querySelector('#ptp-tonemap-only-brightness');
    const tonemapOnlySaturationInput = panel.querySelector('#ptp-tonemap-only-saturation');
    const tonemapOnlyGammaInput = panel.querySelector('#ptp-tonemap-only-gamma');
    const forceFixInput = panel.querySelector('#ptp-hdr-force-fix');
    const tonemapMobiusInput = panel.querySelector('#ptp-hdr-tonemap-mobius');
    const tonemapDesatInput = panel.querySelector('#ptp-hdr-tonemap-desat');
    const tonemapPeakInput = panel.querySelector('#ptp-hdr-tonemap-peak');
    const ffmpegWorkersInput = panel.querySelector('#ptp-hdr-ffmpeg-workers');
    const cancelButton = panel.querySelector('#ptp-hdr-settings-cancel');
    const defaultsButton = panel.querySelector('#ptp-hdr-settings-defaults');
    const saveButton = panel.querySelector('#ptp-hdr-settings-save');

    const fillFromSettings = (value) => {
      tonemapOnlyContrastInput.value = String(value.tonemapOnlyContrast);
      tonemapOnlyBrightnessInput.value = String(value.tonemapOnlyBrightness);
      tonemapOnlySaturationInput.value = String(value.tonemapOnlySaturation);
      tonemapOnlyGammaInput.value = String(value.tonemapOnlyGammaExponent);
      forceFixInput.checked = Boolean(value.forceHdrFixForPtpimgPng);
      tonemapMobiusInput.value = String(value.tonemapMobiusParam);
      tonemapDesatInput.value = String(value.tonemapDesat);
      tonemapPeakInput.value = String(value.tonemapPeak);
      ffmpegWorkersInput.value = String(value.ffmpegWorkers);
    };

    fillFromSettings(hdrSettings);

    const closeModal = () => {
      modal.style.display = 'none';
    };

    cancelButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    defaultsButton.addEventListener('click', () => {
      fillFromSettings(DEFAULT_HDR_SETTINGS);
    });

    saveButton.addEventListener('click', async () => {
      const nextSettings = normalizeHdrSettings({
        tonemapOnlyContrast: Number.parseFloat(tonemapOnlyContrastInput.value),
        tonemapOnlyBrightness: Number.parseFloat(tonemapOnlyBrightnessInput.value),
        tonemapOnlySaturation: Number.parseFloat(tonemapOnlySaturationInput.value),
        tonemapOnlyGammaExponent: Number.parseFloat(tonemapOnlyGammaInput.value),
        forceHdrFixForPtpimgPng: forceFixInput.checked,
        ffmpegWorkers: Number.parseInt(ffmpegWorkersInput.value, 10),
        tonemapMobiusParam: Number.parseFloat(tonemapMobiusInput.value),
        tonemapDesat: Number.parseFloat(tonemapDesatInput.value),
        tonemapPeak: Number.parseFloat(tonemapPeakInput.value)
      });

      await saveHdrSettings(nextSettings);
      hasSavedHdrSettingsThisSession = true;
      removeTonemapSvgFilter();
      updateTonemapAdjustmentStyle();
      refreshAllHdrImages({ automatic: true });
      kickImageQueueWorkers();
      closeModal();
    });
  }

  const registerMenuCommand =
    (typeof GM === 'object' && typeof GM.registerMenuCommand === 'function'
      ? GM.registerMenuCommand.bind(GM)
      : null) || globalThis.GM_registerMenuCommand;
  if (typeof registerMenuCommand === 'function') {
    registerMenuCommand('PTP Tonemap HDR Settings', openHdrSettingsModal);
  }

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
        onload: (response) => {
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

  function patchFfmpegCoreSource(source) {
    return source
      .replace(
        'function printErr(message){if(!message.startsWith("Aborted(native code called abort())"))Module["logger"]({type:"stderr",message:message})}',
        'function printErr(message){const text=typeof message==="string"?message:String(message);if(!text.startsWith("Aborted(native code called abort())"))Module["logger"]({type:"stderr",message:text})}'
      )
      .replace(
        'catch(e){if(!e.message.startsWith("Aborted")){throw e}}return Module["ret"]}',
        'catch(e){const message=typeof e?.message==="string"?e.message:String(e);if(!message.startsWith("Aborted")){throw e}}return Module["ret"]}'
      )
      .replace(
        'catch(e){if(!e.message.startsWith("Aborted")){throw e}}return Module["ret"]}function setLogger',
        'catch(e){const message=typeof e?.message==="string"?e.message:String(e);if(!message.startsWith("Aborted")){throw e}}return Module["ret"]}function setLogger'
      );
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
          ffmpegWasmState.blobUrls.forEach((url) => URL.revokeObjectURL(url));
          ffmpegWasmState.blobUrls = [];

          const [
            classesText,
            constText,
            errorsText,
            utilsText,
            workerText,
            coreJsText,
            coreWasmBuffer
          ] = await Promise.all([
            fetchTextAsset(`${candidate.esmBaseUrl}/classes.js`),
            fetchTextAsset(`${candidate.esmBaseUrl}/const.js`),
            fetchTextAsset(`${candidate.esmBaseUrl}/errors.js`),
            fetchTextAsset(`${candidate.esmBaseUrl}/utils.js`),
            fetchTextAsset(`${candidate.esmBaseUrl}/worker.js`),
            fetchTextAsset(candidate.coreJsUrl),
            fetchBinaryAsset(candidate.coreWasmUrl)
          ]);

          const constUrl = createBlobUrl(constText, 'text/javascript');
          const errorsUrl = createBlobUrl(errorsText, 'text/javascript');
          const utilsUrl = createBlobUrl(utilsText, 'text/javascript');
          const coreJsUrl = createBlobUrl(patchFfmpegCoreSource(coreJsText), 'text/javascript');
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
          logError('ffmpeg.wasm module load failed', {
            candidate: candidate.label,
            error: String(error)
          });
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

  async function ensureFfmpegPoolEntryLoaded(entry, module) {
    if (entry.ffmpeg) {
      return entry.ffmpeg;
    }

    if (entry.loadPromise) {
      return entry.loadPromise;
    }

    entry.loadPromise = (async () => {
      const ffmpeg = new module.FFmpeg();
      if (debugEnabled) {
        ffmpeg.on('log', (event) => {
          log('ffmpeg.wasm', event.message);
        });
      }

      await ffmpeg.load({
        classWorkerURL: module.classWorkerURL,
        coreURL: module.coreURL,
        wasmURL: module.wasmURL
      });
      entry.ffmpeg = ffmpeg;
      log('ffmpeg.wasm worker ready', {
        assetBaseUrl: ffmpegWasmState.assetBaseUrl,
        assetLabel: ffmpegWasmState.assetLabel
      });
      return ffmpeg;
    })();

    try {
      return await entry.loadPromise;
    } finally {
      entry.loadPromise = null;
    }
  }

  function ensureFfmpegPoolSize(minSize) {
    while (ffmpegWasmState.pool.length < minSize) {
      ffmpegWasmState.pool.push({
        ffmpeg: null,
        loadPromise: null,
        busy: false
      });
    }
  }

  async function acquireFfmpegWasmInstance() {
    if (ffmpegWasmState.disabled) {
      return null;
    }

    const module = await loadFfmpegWasmModule();
    if (!module?.FFmpeg) {
      ffmpegWasmState.disabled = true;
      return null;
    }

    while (true) {
      const poolSize = getMaxConcurrentImageJobs();
      ensureFfmpegPoolSize(poolSize);

      for (let index = 0; index < poolSize; index += 1) {
        const entry = ffmpegWasmState.pool[index];
        if (entry.busy) {
          continue;
        }

        entry.busy = true;
        try {
          const ffmpeg = await ensureFfmpegPoolEntryLoaded(entry, module);
          if (!ffmpeg) {
            entry.busy = false;
            continue;
          }

          return {
            ffmpeg,
            release: () => {
              entry.busy = false;
            }
          };
        } catch (error) {
          entry.busy = false;
          ffmpegWasmState.disabled = true;
          logError('ffmpeg.wasm worker load failed', {
            error: String(error),
            assetBaseUrl: ffmpegWasmState.assetBaseUrl,
            assetLabel: ffmpegWasmState.assetLabel
          });
          return null;
        }
      }

      await waitForNextPaint();
    }
  }

  function getTorrentIdFromValue(value) {
    if (!value) {
      return '';
    }

    const text = String(value);
    const plainNumberMatch = /^\d+$/.exec(text);
    if (plainNumberMatch) {
      return plainNumberMatch[0];
    }

    const directMatch = /^torrent_(\d+)$/i.exec(text);
    if (directMatch) {
      return directMatch[1];
    }

    const paramMatch = /[?&]torrentid=(\d+)/i.exec(text);
    if (paramMatch) {
      return paramMatch[1];
    }

    return '';
  }

  function getTorrentIdFromElement(element) {
    if (!(element instanceof Element)) {
      return '';
    }

    const candidates = [
      element.id,
      element.dataset?.torrentId,
      element.getAttribute('href'),
      element.querySelector?.('a[href*="torrentid="]')?.getAttribute('href'),
      element.querySelector?.('[data-torrent-id]')?.dataset?.torrentId
    ];

    for (const candidate of candidates) {
      const torrentId = getTorrentIdFromValue(candidate);
      if (torrentId) {
        return torrentId;
      }
    }

    return '';
  }

  function getTorrentId(element) {
    let current = element instanceof Element ? element : null;
    while (current) {
      const torrentId = getTorrentIdFromElement(current);
      if (torrentId) {
        return torrentId;
      }
      current = current.parentElement;
    }
    return '';
  }

  function getTorrentHeaderRow(torrentId) {
    if (!torrentId) {
      return null;
    }

    return document.getElementById(`group_torrent_header_${torrentId}`);
  }

  function textLooksHdr(text) {
    if (!text) {
      return false;
    }

    return /\bhdr(?:10(?:\+)?)?\b/i.test(String(text));
  }

  function torrentHasHdrMetadata(torrentId) {
    if (!torrentId) {
      return false;
    }

    const headerRow = getTorrentHeaderRow(torrentId);
    if (!headerRow) {
      return false;
    }

    const candidates = [
      headerRow?.dataset?.releasename,
      headerRow?.querySelector('.torrent-info-link')?.textContent
    ];

    if (candidates.some(textLooksHdr)) {
      return true;
    }

    const attrNodes = [...(headerRow?.querySelectorAll?.('[data-attr]') || [])];

    return attrNodes.some((node) => {
      const attrValue = node.dataset?.attr;
      return textLooksHdr(attrValue) || textLooksHdr(node.textContent);
    });
  }

  function shouldProcessImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return false;
    }

    if (img.closest('#lightbox')) {
      return isLightboxImageForLastClickedSource(img);
    }

    return Boolean(img.closest(`${PANEL_SELECTOR}[${ELIGIBLE_PANEL_ATTRIBUTE}="1"]`));
  }

  function isLightboxImageForLastClickedSource(img) {
    if (!(img instanceof HTMLImageElement) || !img.closest('#lightbox')) {
      return false;
    }

    if (!lastClickedTorrentId || !lastClickedHdrSource || !torrentHasHdrMetadata(lastClickedTorrentId)) {
      return false;
    }

    const targetSource = normalizeUrlCandidate(lastClickedHdrSource);
    if (!targetSource) {
      return false;
    }

    return getImageSourceCandidates(img).includes(targetSource);
  }

  function getRelevantImages() {
    const images = [];
    const seen = new Set();

    document
      .querySelectorAll(`${PANEL_SELECTOR}[${ELIGIBLE_PANEL_ATTRIBUTE}="1"]`)
      .forEach((panel) => {
        panel.querySelectorAll(IMAGE_SELECTOR).forEach((img) => {
          if (!seen.has(img)) {
            seen.add(img);
            images.push(img);
          }
        });
      });

    document.querySelectorAll('#lightbox img').forEach((img) => {
      if (!seen.has(img) && isLightboxImageForLastClickedSource(img)) {
        seen.add(img);
        images.push(img);
      }
    });

    return images;
  }

  function setPanelEligibility(panel, eligible) {
    if (!(panel instanceof Element)) {
      return;
    }

    if (eligible) {
      panel.setAttribute(ELIGIBLE_PANEL_ATTRIBUTE, '1');
    } else {
      panel.removeAttribute(ELIGIBLE_PANEL_ATTRIBUTE);
    }
  }

  function isTonemapEnabledForTorrent(torrentId) {
    return Boolean(torrentId && tonemapEnabledByTorrent[torrentId]);
  }

  function isHdrFixEnabledForTorrent(torrentId) {
    return Boolean(torrentId && hdrFixEnabledByTorrent[torrentId]);
  }

  function getImageToggleState(img) {
    const torrentId = getTorrentId(img);
    return {
      torrentId,
      tonemapEnabled: isTonemapEnabledForTorrent(torrentId),
      hdrFixEnabled: isHdrFixEnabledForTorrent(torrentId)
    };
  }

  function syncTonemapStateForImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    const { torrentId, tonemapEnabled, hdrFixEnabled } = getImageToggleState(img);
    const tonemapActive =
      Boolean(torrentId) &&
      tonemapEnabled &&
      !hdrFixEnabled &&
      shouldProcessImage(img) &&
      !img.classList.contains('ptp-hdr-converted') &&
      !img.classList.contains('ptp-hdr-blackfix') &&
      !String(img.dataset.ptpHdrFixRendered || '').startsWith('converted') &&
      img.dataset.ptpHdrFixApplied !== '1';

    img.dataset.ptpTonemapActive = tonemapActive ? '1' : '0';
  }

  function syncTonemapStateForTorrent(torrentId) {
    if (!torrentId) {
      return;
    }

    document.querySelectorAll(IMAGE_SELECTOR).forEach((img) => {
      if (getTorrentId(img) === torrentId) {
        syncTonemapStateForImage(img);
      }
    });
  }

  function syncTonemapStateForImages(images) {
    images.forEach((img) => syncTonemapStateForImage(img));
  }

  function applyStateToContainer(container, torrentId = getTorrentId(container)) {
    if (!(container instanceof Element) || !torrentId) {
      return;
    }

    const tonemapEnabled = isTonemapEnabledForTorrent(torrentId);
    const hdrFixEnabled = isHdrFixEnabledForTorrent(torrentId);

    container.classList.toggle(TONEMAP_ON_CLASS, tonemapEnabled && !hdrFixEnabled);
    container.classList.toggle(HDR_FIX_ON_CLASS, hdrFixEnabled);
  }

  function applyState() {
    document.querySelectorAll(TORRENT_CONTAINER_SELECTOR).forEach((container) => {
      applyStateToContainer(container);
    });

    document.querySelectorAll(IMAGE_SELECTOR).forEach((img) => {
      syncTonemapStateForImage(img);
    });
  }

  function applyStateForTorrent(torrentId) {
    if (!torrentId) {
      return;
    }

    document.querySelectorAll(TORRENT_CONTAINER_SELECTOR).forEach((container) => {
      if (getTorrentId(container) === torrentId) {
        applyStateToContainer(container, torrentId);
      }
    });

    syncTonemapStateForTorrent(torrentId);
  }

  function updateButtons(panel, torrentId = getTorrentId(panel)) {
    if (!(panel instanceof Element) || !torrentId) {
      return;
    }

    panel.querySelectorAll('.ptp-tonemap-main-toggle').forEach((btn) => {
      btn.classList.toggle('is-enabled', isTonemapEnabledForTorrent(torrentId));
      btn.querySelector('.ptp-tonemap-toggle__label').textContent = isTonemapEnabledForTorrent(
        torrentId
      )
        ? 'Tonemap: ON'
        : 'Tonemap: OFF';
    });

    panel.querySelectorAll('.ptp-hdr-blackfix-toggle').forEach((btn) => {
      btn.classList.toggle('is-enabled', isHdrFixEnabledForTorrent(torrentId));
      btn.querySelector('.ptp-tonemap-toggle__label').textContent = isHdrFixEnabledForTorrent(
        torrentId
      )
        ? 'HDR Black Fix: ON'
        : 'HDR Black Fix: OFF';
    });
  }

  async function toggleTonemapForPanel(panel) {
    const torrentId = getTorrentId(panel);
    if (!torrentId) {
      return;
    }

    const nextEnabled = !isTonemapEnabledForTorrent(torrentId);
    tonemapEnabledByTorrent[torrentId] = nextEnabled;
    if (nextEnabled) {
      hdrFixEnabledByTorrent[torrentId] = false;
      await GM.setValue(HDR_FIX_PREF_KEY, hdrFixEnabledByTorrent);
    }
    await GM.setValue(TONEMAP_PREF_KEY, tonemapEnabledByTorrent);
    applyStateForTorrent(torrentId);
    updateButtons(panel, torrentId);
    if (nextEnabled) {
      forceApplyHdrFixToCurrentImages();
    }
  }

  async function toggleHdrBlackFixForPanel(panel) {
    const torrentId = getTorrentId(panel);
    if (!torrentId) {
      return;
    }

    const nextEnabled = !isHdrFixEnabledForTorrent(torrentId);
    hdrFixEnabledByTorrent[torrentId] = nextEnabled;
    if (nextEnabled) {
      tonemapEnabledByTorrent[torrentId] = false;
      await GM.setValue(TONEMAP_PREF_KEY, tonemapEnabledByTorrent);
    }
    await GM.setValue(HDR_FIX_PREF_KEY, hdrFixEnabledByTorrent);
    applyStateForTorrent(torrentId);
    updateButtons(panel, torrentId);
    log('HDR Black Fix toggled', {
      torrentId,
      hdrFixEnabled: isHdrFixEnabledForTorrent(torrentId)
    });
    forceApplyHdrFixToCurrentImages();
    scanImages(true);
  }

  function forceApplyHdrFixToCurrentImages() {
    const images = getRelevantImages();
    let eligible = 0;
    let changed = 0;

    images.forEach((img) => {
      const src = getEligibleHdrFixSource(img);
      const { torrentId, hdrFixEnabled } = getImageToggleState(img);
      if (!isPtpImgPng(src)) {
        return;
      }

      eligible += 1;
      if (!torrentId) {
        return;
      }
      if (!hdrFixEnabled) {
        restoreOriginalImageSource(img);
        img.dataset.ptpHdrFixApplied = '0';
        img.dataset.ptpHdrFixMode = 'disabled-toggle-pass';
        syncTonemapStateForImage(img);
        changed += 1;
      }
    });

    syncTonemapStateForImages(images);

    log('forceApplyHdrFixToCurrentImages', {
      totalInPanels: images.length,
      eligible,
      changed,
      trackedTorrents: Object.keys(hdrFixEnabledByTorrent).length
    });
  }

  function ensureTonemapSvgFilter() {
    if (document.getElementById(TONEMAP_SVG_ID)) {
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
    filter.setAttribute('id', TONEMAP_SVG_ID);
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    const componentTransfer = document.createElementNS(svgNs, 'feComponentTransfer');
    ['R', 'G', 'B'].forEach((channel) => {
      const func = document.createElementNS(svgNs, `feFunc${channel}`);
      func.setAttribute('type', 'gamma');
      func.setAttribute('amplitude', '1');
      func.setAttribute('exponent', String(hdrSettings.tonemapOnlyGammaExponent));
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

  function makeTonemapButton(panel, torrentId = getTorrentId(panel)) {
    const btn = document.createElement('button');
    btn.className = 'ptp-tonemap-toggle ptp-tonemap-main-toggle';
    btn.type = 'button';

    const dot = document.createElement('span');
    dot.className = 'ptp-tonemap-toggle__dot';

    const label = document.createElement('span');
    label.className = 'ptp-tonemap-toggle__label';
    label.textContent = isTonemapEnabledForTorrent(torrentId) ? 'Tonemap: ON' : 'Tonemap: OFF';

    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      void toggleTonemapForPanel(panel);
    });
    btn.classList.toggle('is-enabled', isTonemapEnabledForTorrent(torrentId));
    return btn;
  }

  function makeHdrBlackFixButton(panel, torrentId = getTorrentId(panel)) {
    const btn = document.createElement('button');
    btn.className = 'ptp-tonemap-toggle ptp-hdr-blackfix-toggle';
    btn.type = 'button';

    const dot = document.createElement('span');
    dot.className = 'ptp-tonemap-toggle__dot';

    const label = document.createElement('span');
    label.className = 'ptp-tonemap-toggle__label';
    label.textContent = isHdrFixEnabledForTorrent(torrentId)
      ? 'HDR Black Fix: ON'
      : 'HDR Black Fix: OFF';

    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      void toggleHdrBlackFixForPanel(panel);
    });
    btn.classList.toggle('is-enabled', isHdrFixEnabledForTorrent(torrentId));
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
      normalized = `${globalThis.location.protocol}${normalized}`;
    }

    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }

    try {
      return new URL(normalized, globalThis.location.href).href;
    } catch {
      return normalized;
    }
  }

  function extractEmbeddedPtpimgUrl(value) {
    if (!value) {
      return '';
    }

    const match = /((?:https?:)?\/\/ptpimg\.me\/[^\s"'<>]+)/i.exec(String(value));
    return match ? normalizeUrlCandidate(match[1]) : '';
  }

  function getImageSourceCandidates(img) {
    const candidates = new Set();
    const push = (value) => {
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

    [img.srcset, img.getAttribute('srcset')].forEach((srcset) => {
      if (!srcset) {
        return;
      }

      srcset.split(',').forEach((part) => {
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
      const parsed = new URL(url, globalThis.location.href);
      return /(?:^|\.)ptpimg\.me$/i.test(parsed.hostname) && /\.png$/i.test(parsed.pathname);
    } catch {
      return /(?:https?:)?\/\/ptpimg\.me\/[^\s"'<>]+\.png(?:$|[?#])/i.test(url);
    }
  }

  function getEligibleHdrFixSource(img) {
    return getImageSourceCandidates(img).find((candidate) => isPtpImgPng(candidate)) || '';
  }

  function fetchBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (response) => {
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
        onerror: (e) =>
          reject(
            new Error(
              `Network error while fetching image blob: ${String((e && e.error) || 'unknown')}`
            )
          ),
        ontimeout: () => reject(new Error('Timed out while fetching image blob'))
      });
    });
  }

  async function getToneMappedHdrUrlFromFfmpegWasm(src, img) {
    const lease = await acquireFfmpegWasmInstance();
    if (!lease?.ffmpeg) {
      return null;
    }

    const { ffmpeg, release } = lease;
    const sourceBlob = await fetchBlob(src);
    const inputBytes = new Uint8Array(await sourceBlob.arrayBuffer());
    const sourceWidthHint = img.naturalWidth || 3840;
    const inputName = `input-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const outputName = `output-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filter = [
      'format=gbrpf32le',
      'setparams=color_primaries=bt2020:color_trc=smpte2084:colorspace=bt2020nc:range=pc',
      'zscale=transfer=linear:primaries=bt2020:matrix=bt2020nc:npl=100',
      `tonemap=tonemap=mobius:param=${hdrSettings.tonemapMobiusParam}:desat=${hdrSettings.tonemapDesat}:peak=${hdrSettings.tonemapPeak}`,
      'zscale=transfer=bt709:primaries=bt709:matrix=bt709:range=tv',
      'format=rgb24'
    ].join(',');
    const command = ['-i', inputName, '-vf', filter, '-frames:v', '1', outputName];

    try {
      await ffmpeg.writeFile(inputName, inputBytes);
      log('ffmpeg.wasm tonemap exec', {
        src,
        targetWidth: sourceWidthHint,
        command,
        fullResolution: true
      });
      const exitCode = await ffmpeg.exec(command);
      if (exitCode !== 0) {
        throw new Error(`ffmpeg exited with code ${exitCode}`);
      }
      const outputData = await ffmpeg.readFile(outputName);
      log('ffmpeg.wasm tonemap success', {
        src,
        targetWidth: sourceWidthHint,
        outputBytes: outputData.length,
        fullResolution: true
      });
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
      release();
    }
  }

  async function getToneMappedHdrUrl(src, img) {
    const cacheKey = `${src}|full-resolution`;
    if (convertedSourceCache.has(cacheKey)) {
      return convertedSourceCache.get(cacheKey);
    }

    const promise = (async () => {
      return getToneMappedHdrUrlFromFfmpegWasm(src, img);
    })();

    convertedSourceCache.set(cacheKey, promise);
    return promise;
  }

  function rememberOriginalImageSource(img) {
    if (!Object.hasOwn(img.dataset, 'ptpHdrOriginalSrc')) {
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
    img.style.removeProperty('filter');
    img.dataset.ptpHdrFixRendered = '0';
    img.dataset.ptpHdrFixMode = 'restored-original';
    syncTonemapStateForImage(img);
  }

  async function applyTrueHdrFix(img, src, hdrFixEnabled) {
    rememberOriginalImageSource(img);
    const convertedUrl = await getToneMappedHdrUrl(src, img);
    if (!convertedUrl || !hdrFixEnabled) {
      return false;
    }

    img.classList.add('ptp-hdr-converted');
    img.classList.remove('ptp-hdr-blackfix');
    img.dataset.ptpTonemapActive = '0';
    img.style.setProperty('filter', 'none', 'important');
    img.src = convertedUrl;
    img.removeAttribute('srcset');
    img.dataset.ptpHdrFixRendered = 'converted';
    img.dataset.ptpHdrFixMode = 'pq-bt2020-to-sdr';
    return true;
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
      const { hdrFixEnabled } = getImageToggleState(img);
      log('skipping non-ptpimg png image', { displaySrc, sourceCandidates });
      if (force && !hdrFixEnabled) {
        restoreOriginalImageSource(img);
      }
      analyzedImages.add(img);
      return;
    }

    const { torrentId, hdrFixEnabled } = getImageToggleState(img);

    if (!torrentId) {
      log('analyzeImage skip: torrent id not found', { src, displaySrc, sourceCandidates });
      return;
    }

    if (!hdrFixEnabled) {
      restoreOriginalImageSource(img);
      img.dataset.ptpHdrFixApplied = '0';
      img.dataset.ptpHdrFixMode = 'disabled';
      syncTonemapStateForImage(img);
      analyzedImages.add(img);
      return;
    }

    pendingImages.add(img);
    try {
      if (hdrSettings.forceHdrFixForPtpimgPng) {
        const converted = await applyTrueHdrFix(img, src, hdrFixEnabled);
        if (converted) {
          img.dataset.ptpHdrFixApplied = '1';
          img.dataset.ptpTonemapActive = '0';
          log('image converted hdr fix', {
            src,
            rendered: img.dataset.ptpHdrFixMode,
            currentSrc: img.currentSrc
          });
          return;
        }
      }

      restoreOriginalImageSource(img);
      img.dataset.ptpHdrFixApplied = '0';
      img.dataset.ptpHdrFixRendered = '0';
      img.dataset.ptpHdrFixMode = 'conversion-unavailable';
      syncTonemapStateForImage(img);

      log('image analyzed', {
        src,
        applied: false,
        torrentId,
        hdrFixEnabled,
        rendered: img.dataset.ptpHdrFixMode
      });
    } finally {
      pendingImages.delete(img);
      analyzedImages.add(img);
    }
  }

  function waitForNextPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function getMaxConcurrentImageJobs() {
    return Math.max(1, Math.floor(hdrSettings.ffmpegWorkers || DEFAULT_HDR_SETTINGS.ffmpegWorkers));
  }

  async function runImageQueueWorker() {
    activeImageQueueWorkers += 1;
    try {
      while (imageAnalysisQueue.length > 0) {
        const img = imageAnalysisQueue.shift();
        if (!(img instanceof HTMLImageElement)) {
          continue;
        }

        const force = Boolean(queuedImages.get(img));
        queuedImages.delete(img);
        await analyzeImage(img, force);
        await waitForNextPaint();
      }
    } finally {
      activeImageQueueWorkers -= 1;
      if (imageAnalysisQueue.length > 0) {
        kickImageQueueWorkers();
      }
    }
  }

  function kickImageQueueWorkers() {
    const maxWorkers = getMaxConcurrentImageJobs();
    while (activeImageQueueWorkers < maxWorkers && imageAnalysisQueue.length > 0) {
      void runImageQueueWorker();
    }
  }

  function enqueueImageAnalysis(img, force = false) {
    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    const existingForce = queuedImages.get(img);
    if (existingForce !== undefined) {
      queuedImages.set(img, Boolean(existingForce || force));
      return;
    }

    queuedImages.set(img, Boolean(force));
    imageAnalysisQueue.push(img);
    kickImageQueueWorkers();
  }

  function queueImageAnalysis(img, force = false) {
    if (!(img instanceof HTMLImageElement)) {
      log('queueImageAnalysis skip: non-image target', { nodeName: img?.nodeName || null });
      return;
    }

    syncTonemapStateForImage(img);

    if (!IS_FIREFOX) {
      return;
    }

    if (!shouldProcessImage(img)) {
      return;
    }

    if (
      isLightboxImageForLastClickedSource(img) &&
      isHdrFixEnabledForTorrent(lastClickedTorrentId) &&
      lastClickedConvertedSrc
    ) {
      img.dataset.ptpHdrOriginalSrc = img.getAttribute('src') || img.src || lastClickedHdrSource;
      img.classList.add('ptp-hdr-converted');
      img.dataset.ptpTonemapActive = '0';
      img.style.setProperty('filter', 'none', 'important');
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
      enqueueImageAnalysis(img, force);
      return;
    }

    img.addEventListener(
      'load',
      () => {
        enqueueImageAnalysis(img, force);
      },
      { once: true }
    );
  }

  function scanImages(force = false) {
    const images = getRelevantImages();
    log('scanImages', {
      count: images.length,
      isFirefox: IS_FIREFOX,
      enabledHdrFixTorrents: Object.keys(hdrFixEnabledByTorrent).filter(
        (torrentId) => hdrFixEnabledByTorrent[torrentId]
      ).length,
      enabledTonemapTorrents: Object.keys(tonemapEnabledByTorrent).filter(
        (torrentId) => tonemapEnabledByTorrent[torrentId]
      ).length,
      force
    });
    images.forEach((img) => queueImageAnalysis(img, force));
  }

  function injectButtons() {
    document.querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
      const torrentId = getTorrentId(panel);
      const detailRow = panel.closest(DETAIL_ROW_SELECTOR);
      const existingControls = panel.querySelector(':scope > .ptp-tonemap-controls');
      if (!panel.querySelector(IMAGE_SELECTOR) || !torrentId) {
        setPanelEligibility(panel, false);
        return;
      }

      const isEligible = torrentHasHdrMetadata(torrentId);
      setPanelEligibility(panel, isEligible);

      if (!isEligible) {
        existingControls?.remove();
        return;
      }

      if (existingControls) {
        updateButtons(panel, torrentId);
        return;
      }

      if (detailRow) {
        applyStateToContainer(detailRow, torrentId);
      }
      applyStateToContainer(panel, torrentId);
      const controls = document.createElement('div');
      controls.className = 'ptp-tonemap-controls';
      controls.appendChild(makeTonemapButton(panel, torrentId));

      if (IS_FIREFOX) {
        controls.appendChild(makeHdrBlackFixButton(panel, torrentId));
      }

      panel.insertBefore(controls, panel.firstChild);
      updateButtons(panel, torrentId);
    });
  }

  // Initial state + inject for already-rendered panels
  log('init', {
    isFirefox: IS_FIREFOX,
    enabledTonemapTorrents: Object.keys(tonemapEnabledByTorrent).filter(
      (torrentId) => tonemapEnabledByTorrent[torrentId]
    ).length,
    enabledHdrFixTorrents: Object.keys(hdrFixEnabledByTorrent).filter(
      (torrentId) => hdrFixEnabledByTorrent[torrentId]
    ).length,
    debugEnabled
  });
  ensureTonemapUiStyle();
  updateTonemapAdjustmentStyle();
  applyState();
  injectButtons();
  forceApplyHdrFixToCurrentImages();
  scanImages();

  document.addEventListener(
    'click',
    (event) => {
      const img =
        event.target instanceof HTMLImageElement ? event.target : event.target?.closest?.('img');
      if (!(img instanceof HTMLImageElement)) {
        return;
      }

      const src = getEligibleHdrFixSource(img);
      if (!src) {
        return;
      }

      lastClickedHdrSource = src;
      lastClickedConvertedSrc = img.currentSrc || img.src || '';
      lastClickedTorrentId = getTorrentId(img);
      log('remembered hdr click target', {
        torrentId: lastClickedTorrentId,
        src: lastClickedHdrSource,
        currentSrc: lastClickedConvertedSrc
      });
    },
    true
  );

  // Watch for dynamically opened torrent panels (expand/collapse)
  let refreshScheduled = false;
  function scheduleRefresh() {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      injectButtons();
      scanImages();
    });
  }

  function isEligibleHdrPanel(panel) {
    if (!(panel instanceof Element) || !panel.matches(PANEL_SELECTOR)) {
      return false;
    }

    const torrentId = getTorrentId(panel);
    return Boolean(torrentId && torrentHasHdrMetadata(torrentId));
  }

  function shouldRefreshForAddedElement(node) {
    if (!(node instanceof Element)) {
      return false;
    }

    if (node.matches('#lightbox')) {
      return true;
    }

    if (node.matches(PANEL_SELECTOR)) {
      return isEligibleHdrPanel(node);
    }

    if (node.matches(IMAGE_SELECTOR)) {
      const panel = node.closest(PANEL_SELECTOR);
      if (isEligibleHdrPanel(panel)) {
        return true;
      }

      return Boolean(node.closest('#lightbox') && isLightboxImageForLastClickedSource(node));
    }

    if (node.querySelector?.('#lightbox img')) {
      return true;
    }

    const nestedPanels = node.querySelectorAll?.(PANEL_SELECTOR) || [];
    if ([...nestedPanels].some((panel) => isEligibleHdrPanel(panel))) {
      return true;
    }

    const nestedImages = node.querySelectorAll?.(IMAGE_SELECTOR) || [];
    if (
      [...nestedImages].some((img) => {
        const panel = img.closest(PANEL_SELECTOR);
        return isEligibleHdrPanel(panel) || Boolean(img.closest('#lightbox') && isLightboxImageForLastClickedSource(img));
      })
    ) {
      return true;
    }

    return false;
  }

  const observer = new MutationObserver((mutations) => {
    const shouldRefresh = mutations.some((mutation) =>
      [...mutation.addedNodes].some((node) => shouldRefreshForAddedElement(node))
    );

    if (shouldRefresh) {
      scheduleRefresh();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
