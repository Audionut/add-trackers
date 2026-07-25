// ==UserScript==
// @name         UNIT3D - Tonemap Toggle
// @namespace    https://github.com/Audionut/add-trackers
// @version      0.1.0
// @description  Add per-torrent tonemapping and Firefox HDR-black recovery to UNIT3D full-size lightbox images.
// @author       Audionut
// @match        https://aither.cc/torrents/similar/1*
// @match        https://aither.cc/torrents/similar/2*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-tonemap-toggle.user.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/UNIT3D_based/unit3d-tonemap-toggle.user.js
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      *
// @connect      audionut.github.io
// @connect      cdn.jsdelivr.net
// @run-at       document-end
// ==/UserScript==

'use strict';

(async function () {
  const TONEMAP_PREF_KEY = 'unit3dTonemapEnabledByTorrent';
  const TONEMAP_ON_CLASS = 'unit3d-tonemap-enabled';
  const HDR_FIX_PREF_KEY = 'unit3dHdrBlackFixEnabledByTorrent';
  const HDR_FIX_ON_CLASS = 'unit3d-hdr-blackfix-enabled';
  const HDR_SETTINGS_PREF_KEY = 'unit3dHdrSettingsV1';
  const DEBUG_PREF_KEY = 'unit3dHdrDebug';
  const DEBUG_LEVELS = {
    off: 0,
    normal: 1,
    verbose: 2
  };
  const PANEL_SELECTOR = '.unit3d-ptp-detail.movie-page__torrent__panel';
  const DETAIL_ROW_SELECTOR = 'tr.torrent_info_row[data-unit3d-torrent-id]';
  const ELIGIBLE_PANEL_ATTRIBUTE = 'data-unit3d-hdr-eligible';
  const TORRENT_CONTAINER_SELECTOR = `${PANEL_SELECTOR}, ${DETAIL_ROW_SELECTOR}`;
  const LIGHTBOX_TRIGGER_SELECTOR = [
    '.unit3d-ptp-description-lightbox-trigger[data-unit3d-ptp-lightbox-url]',
    '.unit3d-ptp-description-lightbox-link[data-unit3d-ptp-lightbox-url]'
  ].join(', ');
  const LIGHTBOX_SELECTOR = '.unit3d-ptp-lightbox';
  const LIGHTBOX_IMAGE_SELECTOR = `${LIGHTBOX_SELECTOR} img`;
  const IS_FIREFOX = /firefox/i.test(navigator.userAgent);
  const IS_UNIT3D =
    globalThis.location.hostname === 'aither.cc' &&
    /^\/torrents\/similar\/[12]/i.test(globalThis.location.pathname);
  const TONEMAP_SVG_ID = 'unit3d-tonemap-gamma';
  const TONEMAP_STYLE_ID = 'unit3d-tonemap-adjustments-style';
  const TONEMAP_UI_STYLE_ID = 'unit3d-tonemap-ui-style';
  const HDR_CONVERSION_VERSION = 'hdr-v1';
  const FFMPEG_IDLE_CLEANUP_MS = 10_000;
  const DEFAULT_HDR_SETTINGS = {
    tonemapOnlyContrast: 1,
    tonemapOnlyBrightness: 1,
    tonemapOnlySaturation: 2,
    tonemapOnlyGammaExponent: 1.2,
    tonemapMobiusParam: 0.3,
    tonemapDesat: 10,
    tonemapPeak: 12
  };
  const LOCAL_FFMPEG_WASM_BASE_URL = 'https://audionut.github.io/add-trackers/vendor/ffmpeg-wasm';
  const LOCAL_FFMPEG_WASM_ESM_BASE_URL = `${LOCAL_FFMPEG_WASM_BASE_URL}/esm`;
  const CDN_FFMPEG_WASM_ESM_BASE_URL =
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
  const CDN_FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
  const CSP_COMPATIBLE_FFMPEG_CORE_URL = `${CDN_FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`;
  const analyzedImages = new WeakSet();
  const analyzedImageKeys = new WeakMap();
  const pendingImages = new WeakSet();
  const queuedImages = new WeakMap();
  const imageAnalysisQueue = [];
  const convertedSourceCache = new Map();
  const hdrProcessingByTorrent = new Map();
  const hdrProcessingClearTimers = new Map();
  const hdrProcessingGenerationByTorrent = new Map();
  const imageProcessingTorrent = new WeakMap();
  const pendingImageProcessingContext = new WeakMap();
  const tonemapTrackedSourcesByTorrent = new Map();
  const tonemapSourceToTorrent = new Map();
  const ffmpegWasmState = {
    module: null,
    modulePromise: null,
    instance: null,
    instancePromise: null,
    blobUrls: [],
    idleCleanupTimer: null,
    assetBaseUrl: null,
    assetLabel: null,
    disabled: false
  };
  let lastClickedHdrSource = '';
  let lastClickedTorrentId = '';
  let imageQueueActive = false;

  const tonemapEnabledByTorrent = normalizeTorrentStateMap(await GM.getValue(TONEMAP_PREF_KEY, {}));
  const hdrFixEnabledByTorrent = normalizeTorrentStateMap(await GM.getValue(HDR_FIX_PREF_KEY, {}));
  let hdrSettings = normalizeHdrSettings(await GM.getValue(HDR_SETTINGS_PREF_KEY, {}));
  let debugLevel = normalizeDebugLevel(await GM.getValue(DEBUG_PREF_KEY, 'off'));

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

  function normalizeDebugLevel(value) {
    if (value === true) {
      return 'verbose';
    }

    if (value === false || value == null) {
      return 'off';
    }

    const normalized = String(value).toLowerCase();
    return Object.hasOwn(DEBUG_LEVELS, normalized) ? normalized : 'off';
  }

  function isDebugLevelAtLeast(level) {
    return DEBUG_LEVELS[debugLevel] >= DEBUG_LEVELS[level];
  }

  async function saveDebugLevel(nextLevel) {
    debugLevel = normalizeDebugLevel(nextLevel);
    await GM.setValue(DEBUG_PREF_KEY, debugLevel);
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
      ${LIGHTBOX_IMAGE_SELECTOR}[data-unit3d-tonemap-active="1"] {
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
      .unit3d-tonemap-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0 0 8px 0;
      }

      .unit3d-tonemap-toggle {
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

      .unit3d-tonemap-toggle:hover {
        color: #ffffff;
        background: #2c2c2c;
      }

      .unit3d-tonemap-toggle:focus-visible {
        outline: 1px solid #7aa2ff;
        outline-offset: 1px;
      }

      .unit3d-tonemap-toggle__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #418b00;
        flex-shrink: 0;
      }

      .unit3d-tonemap-toggle:not(.is-enabled) .unit3d-tonemap-toggle__dot,
      .unit3d-hdr-blackfix-toggle:not(.is-enabled) .unit3d-tonemap-toggle__dot {
        background: #666666;
      }

      .unit3d-hdr-processing-note {
        display: none;
        align-items: center;
        min-height: 21px;
        padding: 3px 0;
        font-size: 11px;
        line-height: 1.3;
        color: #c7c7c7;
      }

      .unit3d-hdr-processing-note.is-visible {
        display: inline-flex;
      }

      .unit3d-hdr-processing-note.is-error {
        color: #ffbf7a;
      }

      .unit3d-lightbox-hdr-processing-note.is-applied {
        color: #83e39b;
      }
    `;
  }

  function clearHdrCachesForSource(src) {
    if (!src) {
      return;
    }

    const normalizedSrc = normalizeUrlCandidate(src);
    [...convertedSourceCache.keys()].forEach((key) => {
      if (key.includes(`|${normalizedSrc}|full-resolution`)) {
        convertedSourceCache.delete(key);
      }
    });
  }

  function clearImageAnalysisState(img) {
    imageProcessingTorrent.delete(img);
    pendingImageProcessingContext.delete(img);
    pendingImages.delete(img);
    analyzedImages.delete(img);
    analyzedImageKeys.delete(img);
    queuedImages.delete(img);
    for (let index = imageAnalysisQueue.length - 1; index >= 0; index -= 1) {
      if (imageAnalysisQueue[index] === img) {
        imageAnalysisQueue.splice(index, 1);
      }
    }
    img.dataset.unit3dHdrFixApplied = '0';
    img.dataset.unit3dHdrFixRendered = '0';
    img.dataset.unit3dHdrFixMode = 'refresh-pending';
    syncTonemapStateForImage(img);
  }

  function getImageAnalysisKey(img, source = getEligibleHdrFixSource(img)) {
    if (!(img instanceof HTMLImageElement)) {
      return '';
    }

    const { torrentId, hdrFixEnabled } = getImageToggleState(img);
    return [
      torrentId,
      hdrFixEnabled ? 'hdr-on' : 'hdr-off',
      getHdrConversionSettingsKey(),
      normalizeUrlCandidate(source)
    ].join('|');
  }

  function isImageAnalysisCurrent(img, source = getEligibleHdrFixSource(img)) {
    const key = getImageAnalysisKey(img, source);
    return Boolean(key && analyzedImages.has(img) && analyzedImageKeys.get(img) === key);
  }

  function markImageAnalyzed(img, source = getEligibleHdrFixSource(img)) {
    const key = getImageAnalysisKey(img, source);
    if (!key) {
      return;
    }

    analyzedImages.add(img);
    analyzedImageKeys.set(img, key);
  }

  function refreshImages(images) {
    const hdrImagesByTorrent = new Map();
    images.forEach((img) => {
      const { torrentId, hdrFixEnabled } = getImageToggleState(img);
      if (!torrentId || !hdrFixEnabled) {
        return;
      }

      hdrImagesByTorrent.set(torrentId, (hdrImagesByTorrent.get(torrentId) || 0) + 1);
    });

    const hdrProcessingGenerationByRefreshTorrent = new Map();
    hdrImagesByTorrent.forEach((count, torrentId) => {
      hdrProcessingGenerationByRefreshTorrent.set(torrentId, startHdrProcessing(torrentId, count));
    });

    images.forEach((img) => {
      const originalSrc = normalizeUrlCandidate(img.dataset.unit3dHdrOriginalSrc || '');
      const fallbackSrc = normalizeUrlCandidate(getEligibleHdrFixSource(img) || getImageSrc(img));
      const sourceForRefresh = originalSrc || fallbackSrc;
      const { torrentId, hdrFixEnabled } = getImageToggleState(img);

      clearHdrCachesForSource(sourceForRefresh);
      restoreOriginalImageSource(img);
      clearImageAnalysisState(img);
      if (torrentId && hdrFixEnabled) {
        const context = {
          torrentId,
          generation: hdrProcessingGenerationByRefreshTorrent.get(torrentId)
        };
        imageProcessingTorrent.set(img, context);
        if (!queueImageAnalysis(img, true)) {
          finishHdrProcessingForImage(img, false, context);
        }
      }
    });
  }

  function refreshAllHdrImages() {
    refreshImages(getRelevantImages());
  }

  function openHdrSettingsModal() {
    let modal = document.getElementById('unit3d-hdr-settings-modal');
    if (modal) {
      modal.style.display = 'flex';
      return;
    }

    modal = document.createElement('div');
    modal.id = 'unit3d-hdr-settings-modal';
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
      <div style="font-size: 18px; margin-bottom: 12px;">UNIT3D Tonemap HDR Settings</div>
      <div style="margin-bottom: 12px; border:1px solid #3a3a3a; border-radius:6px; padding:10px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color:#9ad3ff;">Tonemapping Only</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label for="unit3d-tonemap-only-contrast" style="display:block; margin-bottom:4px;">Contrast (0.1-3)</label>
            <input id="unit3d-tonemap-only-contrast" type="number" min="0.1" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="unit3d-tonemap-only-brightness" style="display:block; margin-bottom:4px;">Brightness (0-3)</label>
            <input id="unit3d-tonemap-only-brightness" type="number" min="0" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="unit3d-tonemap-only-saturation" style="display:block; margin-bottom:4px;">Saturation (0-3)</label>
            <input id="unit3d-tonemap-only-saturation" type="number" min="0" max="3" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="unit3d-tonemap-only-gamma" style="display:block; margin-bottom:4px;">Gamma Exponent</label>
            <input id="unit3d-tonemap-only-gamma" type="number" min="0.05" max="4" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
        </div>
      </div>
      <div style="margin-bottom: 12px; border:1px solid #3a3a3a; border-radius:6px; padding:10px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color:#ffd89a;">HDR Fix</div>
        <div style="font-size: 12px; color:#c7c7c7; margin-bottom: 8px;">FFmpeg conversion</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <label for="unit3d-hdr-tonemap-mobius" style="display:block; margin-bottom:4px;">Mobius Param</label>
            <input id="unit3d-hdr-tonemap-mobius" type="number" min="0" max="4" step="0.01" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="unit3d-hdr-tonemap-desat" style="display:block; margin-bottom:4px;">Desaturation</label>
            <input id="unit3d-hdr-tonemap-desat" type="number" min="0" max="1000" step="0.1" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
          <div>
            <label for="unit3d-hdr-tonemap-peak" style="display:block; margin-bottom:4px;">Peak</label>
            <input id="unit3d-hdr-tonemap-peak" type="number" min="0.1" max="1000" step="0.1" style="width:100%; box-sizing:border-box; padding:6px;" />
          </div>
        </div>
      </div>
      <div style="margin-bottom: 12px; border:1px solid #3a3a3a; border-radius:6px; padding:10px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color:#d8d8d8;">Diagnostics</div>
        <label for="unit3d-hdr-debug-level" style="display:block; margin-bottom:4px;">Debug logging</label>
        <select id="unit3d-hdr-debug-level" style="width:100%; box-sizing:border-box; padding:6px;">
          <option value="off">Off</option>
          <option value="normal">Normal</option>
          <option value="verbose">Verbose</option>
        </select>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button id="unit3d-hdr-settings-cancel" type="button">Cancel</button>
        <button id="unit3d-hdr-settings-defaults" type="button">Reset Defaults</button>
        <button id="unit3d-hdr-settings-save" type="button">Save</button>
      </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    const tonemapOnlyContrastInput = panel.querySelector('#unit3d-tonemap-only-contrast');
    const tonemapOnlyBrightnessInput = panel.querySelector('#unit3d-tonemap-only-brightness');
    const tonemapOnlySaturationInput = panel.querySelector('#unit3d-tonemap-only-saturation');
    const tonemapOnlyGammaInput = panel.querySelector('#unit3d-tonemap-only-gamma');
    const tonemapMobiusInput = panel.querySelector('#unit3d-hdr-tonemap-mobius');
    const tonemapDesatInput = panel.querySelector('#unit3d-hdr-tonemap-desat');
    const tonemapPeakInput = panel.querySelector('#unit3d-hdr-tonemap-peak');
    const debugLevelInput = panel.querySelector('#unit3d-hdr-debug-level');
    const cancelButton = panel.querySelector('#unit3d-hdr-settings-cancel');
    const defaultsButton = panel.querySelector('#unit3d-hdr-settings-defaults');
    const saveButton = panel.querySelector('#unit3d-hdr-settings-save');

    const fillFromSettings = (value) => {
      tonemapOnlyContrastInput.value = String(value.tonemapOnlyContrast);
      tonemapOnlyBrightnessInput.value = String(value.tonemapOnlyBrightness);
      tonemapOnlySaturationInput.value = String(value.tonemapOnlySaturation);
      tonemapOnlyGammaInput.value = String(value.tonemapOnlyGammaExponent);
      tonemapMobiusInput.value = String(value.tonemapMobiusParam);
      tonemapDesatInput.value = String(value.tonemapDesat);
      tonemapPeakInput.value = String(value.tonemapPeak);
      debugLevelInput.value = debugLevel;
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
      debugLevelInput.value = 'off';
    });

    saveButton.addEventListener('click', async () => {
      const nextSettings = normalizeHdrSettings({
        tonemapOnlyContrast: Number.parseFloat(tonemapOnlyContrastInput.value),
        tonemapOnlyBrightness: Number.parseFloat(tonemapOnlyBrightnessInput.value),
        tonemapOnlySaturation: Number.parseFloat(tonemapOnlySaturationInput.value),
        tonemapOnlyGammaExponent: Number.parseFloat(tonemapOnlyGammaInput.value),
        tonemapMobiusParam: Number.parseFloat(tonemapMobiusInput.value),
        tonemapDesat: Number.parseFloat(tonemapDesatInput.value),
        tonemapPeak: Number.parseFloat(tonemapPeakInput.value)
      });

      await saveHdrSettings(nextSettings);
      await saveDebugLevel(debugLevelInput.value);
      removeTonemapSvgFilter();
      updateTonemapAdjustmentStyle();
      refreshAllHdrImages();
      closeModal();
    });
  }

  const registerMenuCommand =
    (typeof GM === 'object' && typeof GM.registerMenuCommand === 'function'
      ? GM.registerMenuCommand.bind(GM)
      : null) || globalThis.GM_registerMenuCommand;
  if (typeof registerMenuCommand === 'function') {
    registerMenuCommand('UNIT3D Tonemap HDR Settings', openHdrSettingsModal);
  }

  function log(...args) {
    if (isDebugLevelAtLeast('verbose')) {
      console.log('[UNIT3D Tonemap]', ...args);
    }
  }

  function logNormal(...args) {
    if (isDebugLevelAtLeast('normal')) {
      console.log('[UNIT3D Tonemap]', ...args);
    }
  }

  function logError(...args) {
    if (isDebugLevelAtLeast('normal')) {
      console.error('[UNIT3D Tonemap]', ...args);
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

  function patchFfmpegWorkerForEmbeddedWasm(source) {
    const loadSignature =
      'const load = async ({ coreURL: _coreURL, wasmURL: _wasmURL, workerURL: _workerURL, }) => {';
    const embeddedWasmLoadSignature =
      'const load = async ({ coreURL: _coreURL, wasmURL: _wasmURL, workerURL: _workerURL, wasmBinary: _wasmBinary, }) => {';
    const coreFactoryConfig =
      'mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,';
    const embeddedWasmCoreFactoryConfig = `${coreFactoryConfig}
        wasmBinary: _wasmBinary ? new Uint8Array(_wasmBinary) : undefined,`;

    const output = source
      .replace(loadSignature, embeddedWasmLoadSignature)
      .replace(coreFactoryConfig, embeddedWasmCoreFactoryConfig);

    if (output === source || !output.includes('wasmBinary: _wasmBinary')) {
      throw new Error('Unable to patch FFmpeg worker for embedded WASM');
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
          coreWasmUrl: `${LOCAL_FFMPEG_WASM_BASE_URL}/ffmpeg-core.wasm`
        },
        {
          label: 'cdn',
          esmBaseUrl: CDN_FFMPEG_WASM_ESM_BASE_URL,
          coreWasmUrl: `${CDN_FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`
        }
      ];

      for (const candidate of candidates) {
        try {
          ffmpegWasmState.blobUrls.forEach((url) => URL.revokeObjectURL(url));
          ffmpegWasmState.blobUrls = [];

          const [classesText, constText, errorsText, utilsText, workerText, coreWasmBuffer] =
            await Promise.all([
              fetchTextAsset(`${candidate.esmBaseUrl}/classes.js`),
              fetchTextAsset(`${candidate.esmBaseUrl}/const.js`),
              fetchTextAsset(`${candidate.esmBaseUrl}/errors.js`),
              fetchTextAsset(`${candidate.esmBaseUrl}/utils.js`),
              fetchTextAsset(`${candidate.esmBaseUrl}/worker.js`),
              fetchBinaryAsset(candidate.coreWasmUrl)
            ]);

          const constUrl = createBlobUrl(constText, 'text/javascript');
          const errorsUrl = createBlobUrl(errorsText, 'text/javascript');
          const utilsUrl = createBlobUrl(utilsText, 'text/javascript');

          const workerPatched = replaceModuleImports(patchFfmpegWorkerForEmbeddedWasm(workerText), {
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
            coreURL: CSP_COMPATIBLE_FFMPEG_CORE_URL,
            wasmBinary: coreWasmBuffer
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

  function cancelFfmpegIdleCleanup() {
    if (ffmpegWasmState.idleCleanupTimer) {
      clearTimeout(ffmpegWasmState.idleCleanupTimer);
      ffmpegWasmState.idleCleanupTimer = null;
    }
  }

  function hasPendingImageWork() {
    return imageAnalysisQueue.length > 0 || imageQueueActive;
  }

  function terminateIdleFfmpegInstance() {
    if (hasPendingImageWork() || ffmpegWasmState.instancePromise) {
      scheduleFfmpegIdleCleanup();
      return;
    }

    ffmpegWasmState.idleCleanupTimer = null;
    if (!ffmpegWasmState.instance) {
      return;
    }

    try {
      ffmpegWasmState.instance.terminate?.();
    } catch (error) {
      log('ffmpeg.wasm idle terminate failed', { error: String(error) });
    }
    ffmpegWasmState.instance = null;
    logNormal('ffmpeg.wasm idle instance terminated', {
      idleSeconds: FFMPEG_IDLE_CLEANUP_MS / 1000
    });
  }

  function scheduleFfmpegIdleCleanup() {
    cancelFfmpegIdleCleanup();
    if (hasPendingImageWork() || ffmpegWasmState.instancePromise) {
      return;
    }

    ffmpegWasmState.idleCleanupTimer = setTimeout(
      terminateIdleFfmpegInstance,
      FFMPEG_IDLE_CLEANUP_MS
    );
  }

  async function loadFfmpegWasmInstance() {
    if (ffmpegWasmState.disabled) {
      return null;
    }

    if (ffmpegWasmState.instance) {
      return ffmpegWasmState.instance;
    }

    if (ffmpegWasmState.instancePromise) {
      return ffmpegWasmState.instancePromise;
    }

    ffmpegWasmState.instancePromise = (async () => {
      const module = await loadFfmpegWasmModule();
      if (!module?.FFmpeg) {
        ffmpegWasmState.disabled = true;
        return null;
      }

      const ffmpeg = new module.FFmpeg();
      if (isDebugLevelAtLeast('verbose')) {
        ffmpeg.on('log', (event) => {
          log('ffmpeg.wasm', event.message);
        });
      }

      await ffmpeg.load({
        classWorkerURL: module.classWorkerURL,
        coreURL: module.coreURL,
        wasmBinary: module.wasmBinary
      });
      ffmpegWasmState.instance = ffmpeg;
      log('ffmpeg.wasm instance ready', {
        assetBaseUrl: ffmpegWasmState.assetBaseUrl,
        assetLabel: ffmpegWasmState.assetLabel
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegWasmState.disabled = true;
      logError('ffmpeg.wasm instance load failed', {
        error: String(error),
        assetBaseUrl: ffmpegWasmState.assetBaseUrl,
        assetLabel: ffmpegWasmState.assetLabel
      });
      return null;
    });

    try {
      return await ffmpegWasmState.instancePromise;
    } finally {
      ffmpegWasmState.instancePromise = null;
    }
  }

  async function acquireFfmpegWasmInstance() {
    cancelFfmpegIdleCleanup();
    const ffmpeg = await loadFfmpegWasmInstance();
    if (!ffmpeg) {
      return null;
    }

    return {
      ffmpeg,
      release: scheduleFfmpegIdleCleanup
    };
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

    const unit3dTorrentId = element.dataset?.unit3dTorrentId;
    if (unit3dTorrentId) {
      return String(unit3dTorrentId);
    }

    const nestedUnit3dTorrentId = element.querySelector?.('[data-unit3d-torrent-id]')?.dataset
      ?.unit3dTorrentId;
    if (nestedUnit3dTorrentId) {
      return String(nestedUnit3dTorrentId);
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

    return /(^|[^A-Za-z0-9+])(?:DV\s+HDR10\+|DV\s+HDR|HDR10\+\s+DV|HDR\s+DV|HDR10\+|HDR10|HDR|DV|HLG)(?=$|[^A-Za-z0-9+])/i.test(
      String(text)
    );
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
    if (!(img instanceof HTMLImageElement) || !isActiveUnit3dLightboxImage(img)) {
      return false;
    }

    return (
      isLightboxImageForLastClickedSource(img) ||
      isLightboxImageForTrackedTonemapSource(img) ||
      isLightboxTonemapContextActive()
    );
  }

  function isActiveUnit3dLightboxImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return false;
    }

    const lightbox = img.closest(LIGHTBOX_SELECTOR);
    return Boolean(lightbox && !lightbox.hidden);
  }

  function isLightboxImageForTrackedTonemapSource(img) {
    if (!(img instanceof HTMLImageElement) || !img.closest(LIGHTBOX_SELECTOR)) {
      return false;
    }

    return Boolean(getTrackedTonemapTorrentIdForImage(img));
  }

  function getTrackedTonemapTorrentIdForImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return '';
    }

    const candidates = getImageSourceCandidates(img);
    if (!candidates.length) {
      return '';
    }

    for (const candidate of candidates) {
      const mappedTorrentId = tonemapSourceToTorrent.get(candidate);
      if (
        mappedTorrentId &&
        isTonemapEnabledForTorrent(mappedTorrentId) &&
        !isHdrFixEnabledForTorrent(mappedTorrentId)
      ) {
        return mappedTorrentId;
      }
    }

    for (const [torrentId, trackedSources] of tonemapTrackedSourcesByTorrent.entries()) {
      if (!trackedSources || trackedSources.size === 0) {
        continue;
      }

      if (!isTonemapEnabledForTorrent(torrentId) || isHdrFixEnabledForTorrent(torrentId)) {
        continue;
      }

      if (candidates.some((candidate) => trackedSources.has(candidate))) {
        return torrentId;
      }
    }

    return '';
  }

  function getLightboxContextTorrentId(img) {
    const trackedTorrentId = getTrackedTonemapTorrentIdForImage(img);
    if (trackedTorrentId) {
      return trackedTorrentId;
    }

    if (!lastClickedTorrentId || !torrentHasHdrMetadata(lastClickedTorrentId)) {
      return '';
    }

    return lastClickedTorrentId;
  }

  function isLightboxTonemapContextActive() {
    return (
      Boolean(lastClickedTorrentId) &&
      torrentHasHdrMetadata(lastClickedTorrentId) &&
      isTonemapEnabledForTorrent(lastClickedTorrentId) &&
      !isHdrFixEnabledForTorrent(lastClickedTorrentId)
    );
  }

  function isLightboxImageForLastClickedSource(img) {
    if (!(img instanceof HTMLImageElement) || !img.closest(LIGHTBOX_SELECTOR)) {
      return false;
    }

    if (
      !lastClickedTorrentId ||
      !lastClickedHdrSource ||
      !torrentHasHdrMetadata(lastClickedTorrentId)
    ) {
      return false;
    }

    const targetSource = normalizeUrlCandidate(lastClickedHdrSource);
    if (!targetSource) {
      return false;
    }

    return getImageSourceCandidates(img).includes(targetSource);
  }

  function getRelevantImages() {
    return [...document.querySelectorAll(LIGHTBOX_IMAGE_SELECTOR)].filter((img) =>
      shouldProcessImage(img)
    );
  }

  function getRelevantImagesForTorrent(torrentId) {
    if (!torrentId) {
      return [];
    }

    return getRelevantImages().filter((img) => getImageToggleState(img).torrentId === torrentId);
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
    const torrentId =
      getTorrentId(img) || (img.closest(LIGHTBOX_SELECTOR) ? getLightboxContextTorrentId(img) : '');
    return {
      torrentId,
      tonemapEnabled: isTonemapEnabledForTorrent(torrentId),
      hdrFixEnabled: isHdrFixEnabledForTorrent(torrentId)
    };
  }

  function rememberTonemapSource(torrentId, source) {
    const normalizedSource = normalizeUrlCandidate(source);
    if (!torrentId || !normalizedSource) {
      return;
    }

    let trackedSources = tonemapTrackedSourcesByTorrent.get(torrentId);
    if (!trackedSources) {
      trackedSources = new Set();
      tonemapTrackedSourcesByTorrent.set(torrentId, trackedSources);
    }

    trackedSources.add(normalizedSource);
    tonemapSourceToTorrent.set(normalizedSource, torrentId);
  }

  function syncTonemapStateForImage(img) {
    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    const { torrentId, tonemapEnabled, hdrFixEnabled } = getImageToggleState(img);
    const tonemapActive =
      isActiveUnit3dLightboxImage(img) &&
      Boolean(torrentId) &&
      tonemapEnabled &&
      !hdrFixEnabled &&
      shouldProcessImage(img) &&
      !img.classList.contains('unit3d-hdr-converted') &&
      !img.classList.contains('unit3d-hdr-blackfix') &&
      !String(img.dataset.unit3dHdrFixRendered || '').startsWith('converted') &&
      img.dataset.unit3dHdrFixApplied !== '1';

    img.dataset.unit3dTonemapActive = tonemapActive ? '1' : '0';
  }

  function syncTonemapStateForTorrent(torrentId) {
    if (!torrentId) {
      return;
    }

    document.querySelectorAll(LIGHTBOX_IMAGE_SELECTOR).forEach((img) => {
      if (getImageToggleState(img).torrentId === torrentId) {
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

    document.querySelectorAll(LIGHTBOX_IMAGE_SELECTOR).forEach((img) => {
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

    panel.querySelectorAll('.unit3d-tonemap-main-toggle').forEach((btn) => {
      btn.classList.toggle('is-enabled', isTonemapEnabledForTorrent(torrentId));
      btn.querySelector('.unit3d-tonemap-toggle__label').textContent = isTonemapEnabledForTorrent(
        torrentId
      )
        ? 'Tonemap: ON'
        : 'Tonemap: OFF';
    });

    panel.querySelectorAll('.unit3d-hdr-blackfix-toggle').forEach((btn) => {
      btn.classList.toggle('is-enabled', isHdrFixEnabledForTorrent(torrentId));
      btn.querySelector('.unit3d-tonemap-toggle__label').textContent = isHdrFixEnabledForTorrent(
        torrentId
      )
        ? 'HDR Black Fix: ON'
        : 'HDR Black Fix: OFF';
    });

    ensureHdrProcessingNote(panel, torrentId);
  }

  function getHdrProcessingNoteElements(torrentId) {
    if (!torrentId) {
      return [];
    }

    return [...document.querySelectorAll('.unit3d-hdr-processing-note')].filter(
      (note) => note.dataset?.torrentId === torrentId || getTorrentId(note) === torrentId
    );
  }

  function ensureLightboxHdrProcessingNote() {
    if (!IS_FIREFOX || !lastClickedTorrentId) {
      return null;
    }

    const lightbox = document.querySelector(LIGHTBOX_SELECTOR);
    const bar = lightbox?.querySelector('.unit3d-ptp-lightbox__bar');
    if (!(bar instanceof Element)) {
      return null;
    }

    let note = bar.querySelector('.unit3d-lightbox-hdr-processing-note');
    if (!(note instanceof HTMLElement)) {
      note = document.createElement('span');
      note.className = 'unit3d-hdr-processing-note unit3d-lightbox-hdr-processing-note';
      note.setAttribute('aria-live', 'polite');
      const closeButton = bar.querySelector('.unit3d-ptp-lightbox__close');
      bar.insertBefore(note, closeButton || null);
    }

    note.dataset.torrentId = lastClickedTorrentId;
    updateHdrProcessingNote(lastClickedTorrentId);
    return note;
  }

  function updateHdrProcessingNote(torrentId) {
    const state = hdrProcessingByTorrent.get(torrentId);
    getHdrProcessingNoteElements(torrentId).forEach((note) => {
      const isLightboxNote = note.classList.contains('unit3d-lightbox-hdr-processing-note');
      const lightbox = isLightboxNote ? note.closest(LIGHTBOX_SELECTOR) : null;
      const lightboxImage = lightbox?.querySelector(LIGHTBOX_IMAGE_SELECTOR);
      const isActiveLightboxNote =
        isLightboxNote &&
        !lightbox?.hidden &&
        lastClickedTorrentId === torrentId &&
        isHdrFixEnabledForTorrent(torrentId);
      const isApplied =
        isActiveLightboxNote &&
        lightboxImage instanceof HTMLImageElement &&
        (lightboxImage.dataset.unit3dHdrFixApplied === '1' ||
          String(lightboxImage.dataset.unit3dHdrFixRendered || '').startsWith('converted'));

      note.classList.toggle('is-visible', Boolean(state) || isActiveLightboxNote);
      note.classList.toggle('is-error', Boolean(state?.errors));
      note.classList.toggle('is-applied', !state && isApplied);

      if (!state) {
        note.textContent = isApplied
          ? 'HDR Black Fix: applied'
          : isActiveLightboxNote
            ? 'HDR Black Fix: waiting for image...'
            : '';
        return;
      }

      if (state.completed >= state.total && state.errors > 0) {
        note.textContent = isLightboxNote
          ? 'HDR Black Fix: conversion failed'
          : 'Some images failed. Enable debug logging, retry, and check console.';
        return;
      }

      note.textContent = isLightboxNote
        ? `HDR Black Fix: processing ${state.completed}/${state.total}`
        : `Processing images... ${state.completed}/${state.total}`;
    });
  }

  function clearHdrProcessing(torrentId) {
    const existingTimer = hdrProcessingClearTimers.get(torrentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hdrProcessingClearTimers.delete(torrentId);
    }

    hdrProcessingByTorrent.delete(torrentId);
    updateHdrProcessingNote(torrentId);
  }

  function nextHdrProcessingGeneration(torrentId) {
    const generation = (hdrProcessingGenerationByTorrent.get(torrentId) || 0) + 1;
    hdrProcessingGenerationByTorrent.set(torrentId, generation);
    return generation;
  }

  function getHdrProcessingGeneration(torrentId) {
    return hdrProcessingGenerationByTorrent.get(torrentId) || 0;
  }

  function cancelHdrProcessing(torrentId) {
    const generation = nextHdrProcessingGeneration(torrentId);
    clearHdrProcessing(torrentId);
    return generation;
  }

  function isProcessingContextCurrent(context) {
    if (!context) {
      return true;
    }

    return getHdrProcessingGeneration(context.torrentId) === context.generation;
  }

  function startHdrProcessing(torrentId, total) {
    if (!torrentId || total <= 0) {
      return cancelHdrProcessing(torrentId);
    }

    const generation = nextHdrProcessingGeneration(torrentId);
    const existingTimer = hdrProcessingClearTimers.get(torrentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      hdrProcessingClearTimers.delete(torrentId);
    }

    hdrProcessingByTorrent.set(torrentId, {
      generation,
      total,
      completed: 0,
      errors: 0
    });
    updateHdrProcessingNote(torrentId);
    return generation;
  }

  function finishHdrProcessingForImage(
    img,
    hasError = false,
    context = imageProcessingTorrent.get(img)
  ) {
    if (!context) {
      return;
    }

    if (imageProcessingTorrent.get(img) === context) {
      imageProcessingTorrent.delete(img);
    }

    finishHdrProcessingContext(context, hasError);
  }

  function finishHdrProcessingContext(context, hasError = false) {
    if (!isProcessingContextCurrent(context)) {
      return;
    }

    const state = hdrProcessingByTorrent.get(context.torrentId);
    if (!state || state.generation !== context.generation) {
      return;
    }

    state.completed = Math.min(state.total, state.completed + 1);
    if (hasError) {
      state.errors += 1;
    }

    if (state.completed >= state.total) {
      if (state.errors > 0) {
        updateHdrProcessingNote(context.torrentId);
        const generation = context.generation;
        const timer = setTimeout(() => {
          const currentState = hdrProcessingByTorrent.get(context.torrentId);
          if (currentState?.generation === generation) {
            clearHdrProcessing(context.torrentId);
          }
        }, 10000);
        hdrProcessingClearTimers.set(context.torrentId, timer);
        return;
      }

      clearHdrProcessing(context.torrentId);
      return;
    }

    updateHdrProcessingNote(context.torrentId);
  }

  function ensureHdrProcessingNote(panel, torrentId = getTorrentId(panel)) {
    if (!IS_FIREFOX || !(panel instanceof Element) || !torrentId) {
      return null;
    }

    const controls = panel.querySelector(':scope > .unit3d-tonemap-controls');
    const hdrButton = controls?.querySelector('.unit3d-hdr-blackfix-toggle');
    if (!controls || !hdrButton) {
      return null;
    }

    let note = controls.querySelector(':scope > .unit3d-hdr-processing-note');
    if (!(note instanceof HTMLElement)) {
      note = document.createElement('span');
      note.className = 'unit3d-hdr-processing-note';
      note.setAttribute('aria-live', 'polite');
      note.dataset.torrentId = torrentId;
      hdrButton.after(note);
    }

    updateHdrProcessingNote(torrentId);
    return note;
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
      cancelHdrProcessing(torrentId);
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
    logNormal('HDR Black Fix toggled', {
      torrentId,
      hdrFixEnabled: isHdrFixEnabledForTorrent(torrentId)
    });
    queueHdrFixRefreshForTorrent(torrentId, nextEnabled);
  }

  function queueHdrFixRefreshForTorrent(torrentId, enabled) {
    const images = getRelevantImagesForTorrent(torrentId);
    const generation = enabled
      ? startHdrProcessing(torrentId, images.length)
      : cancelHdrProcessing(torrentId);

    images.forEach((img) => {
      if (enabled) {
        clearImageAnalysisState(img);
        const context = { torrentId, generation };
        imageProcessingTorrent.set(img, context);
        if (!queueImageAnalysis(img, true)) {
          finishHdrProcessingForImage(img, false, context);
        }
        return;
      }

      imageProcessingTorrent.delete(img);
      restoreOriginalImageSource(img);
      clearImageAnalysisState(img);
      img.dataset.unit3dHdrFixApplied = '0';
      img.dataset.unit3dHdrFixRendered = '0';
      img.dataset.unit3dHdrFixMode = 'disabled';
      syncTonemapStateForImage(img);
      markImageAnalyzed(img);
    });

    logNormal('HDR Black Fix refresh queued', {
      torrentId,
      enabled,
      images: images.length
    });
  }

  function imageHasActiveHdrFixState(img) {
    const rendered = String(img.dataset.unit3dHdrFixRendered || '');
    const originalSrc = img.dataset.unit3dHdrOriginalSrc || '';

    return (
      img.classList.contains('unit3d-hdr-converted') ||
      img.classList.contains('unit3d-hdr-blackfix') ||
      img.dataset.unit3dHdrFixApplied === '1' ||
      rendered.startsWith('converted') ||
      Boolean(originalSrc && !imageSourceMatches(img, originalSrc))
    );
  }

  function forceApplyHdrFixToCurrentImages() {
    const images = getRelevantImages();
    let eligible = 0;
    let changed = 0;

    images.forEach((img) => {
      const src = getEligibleHdrFixSource(img);
      const { torrentId, hdrFixEnabled } = getImageToggleState(img);
      if (!isHdrFixCandidateSource(src)) {
        return;
      }

      eligible += 1;
      if (!torrentId) {
        return;
      }
      if (!hdrFixEnabled && imageHasActiveHdrFixState(img)) {
        restoreOriginalImageSource(img);
        img.dataset.unit3dHdrFixApplied = '0';
        img.dataset.unit3dHdrFixMode = 'disabled-toggle-pass';
        syncTonemapStateForImage(img);
        changed += 1;
      }
    });

    syncTonemapStateForImages(images);

    log('forceApplyHdrFixToCurrentImages', {
      totalInLightbox: images.length,
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
    btn.className = 'unit3d-tonemap-toggle unit3d-tonemap-main-toggle';
    btn.type = 'button';
    btn.title = 'Applies to full-resolution lightbox images only';

    const dot = document.createElement('span');
    dot.className = 'unit3d-tonemap-toggle__dot';

    const label = document.createElement('span');
    label.className = 'unit3d-tonemap-toggle__label';
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
    btn.className = 'unit3d-tonemap-toggle unit3d-hdr-blackfix-toggle';
    btn.type = 'button';
    btn.title = 'Applies to full-resolution lightbox images only';

    const dot = document.createElement('span');
    dot.className = 'unit3d-tonemap-toggle__dot';

    const label = document.createElement('span');
    label.className = 'unit3d-tonemap-toggle__label';
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

  function getImageSourceCandidates(img) {
    const candidates = new Set();
    const push = (value) => {
      if (/^(?:data|blob):/i.test(String(value || '').trim())) {
        return;
      }

      const normalized = normalizeUrlCandidate(value);
      if (normalized) {
        candidates.add(normalized);
      }
    };

    push(img.dataset.unit3dHdrOriginalSrc);
    push(img.currentSrc);
    push(img.src);
    push(img.getAttribute('src'));

    return Array.from(candidates);
  }

  function getUnit3dLightboxSource(element) {
    if (!(element instanceof Element)) {
      return '';
    }

    const sourceElement = element.matches('[data-unit3d-ptp-lightbox-url]')
      ? element
      : element.querySelector?.('[data-unit3d-ptp-lightbox-url]');
    return normalizeUrlCandidate(sourceElement?.dataset?.unit3dPtpLightboxUrl || '');
  }

  function prepareUnit3dLightboxForSource(source) {
    const normalizedSource = normalizeUrlCandidate(source);
    if (!normalizedSource) {
      return;
    }

    document.querySelectorAll(LIGHTBOX_IMAGE_SELECTOR).forEach((img) => {
      const processingContext = imageProcessingTorrent.get(img);
      if (processingContext?.torrentId) {
        cancelHdrProcessing(processingContext.torrentId);
      }

      clearImageAnalysisState(img);
      img.classList.remove('unit3d-hdr-converted', 'unit3d-hdr-blackfix');
      img.style.removeProperty('filter');
      img.dataset.unit3dHdrOriginalSrc = normalizedSource;
      img.dataset.unit3dHdrOriginalSrcset = '';
    });
  }

  function isHdrFixCandidateSource(url) {
    if (!url) {
      return false;
    }

    try {
      const parsed = new URL(url, globalThis.location.href);
      return /^https?:$/i.test(parsed.protocol);
    } catch {
      return /^(?:https?:)?\/\//i.test(url);
    }
  }

  function getEligibleHdrFixSource(img) {
    const originalSource = normalizeUrlCandidate(img?.dataset?.unit3dHdrOriginalSrc || '');
    if (isHdrFixCandidateSource(originalSource)) {
      return originalSource;
    }

    return (
      getImageSourceCandidates(img).find((candidate) => isHdrFixCandidateSource(candidate)) || ''
    );
  }

  function getHdrConversionSettingsKey() {
    return [
      HDR_CONVERSION_VERSION,
      `mobius=${hdrSettings.tonemapMobiusParam}`,
      `desat=${hdrSettings.tonemapDesat}`,
      `peak=${hdrSettings.tonemapPeak}`
    ].join('|');
  }

  function getHdrConversionCacheKey(src) {
    return `${getHdrConversionSettingsKey()}|${normalizeUrlCandidate(src)}|full-resolution`;
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

  async function getToneMappedHdrBlobFromFfmpegWasm(src, img) {
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
      return new Blob([outputData], { type: 'image/png' });
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

  function blobToDataUrl(blob) {
    if (!(blob instanceof Blob)) {
      return Promise.resolve('');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error || new Error('Unable to encode image Blob'));
      reader.readAsDataURL(blob);
    });
  }

  async function getToneMappedHdrUrl(src, img) {
    const cacheKey = getHdrConversionCacheKey(src);
    if (convertedSourceCache.has(cacheKey)) {
      return convertedSourceCache.get(cacheKey);
    }

    const promise = (async () => {
      const convertedBlob = await getToneMappedHdrBlobFromFfmpegWasm(src, img);
      if (!convertedBlob) {
        return null;
      }

      return blobToDataUrl(convertedBlob);
    })();

    convertedSourceCache.set(cacheKey, promise);
    try {
      const convertedUrl = await promise;
      if (!convertedUrl) {
        convertedSourceCache.delete(cacheKey);
      }
      return convertedUrl;
    } catch (error) {
      convertedSourceCache.delete(cacheKey);
      throw error;
    }
  }

  function rememberOriginalImageSource(img) {
    if (!Object.hasOwn(img.dataset, 'unit3dHdrOriginalSrc')) {
      img.dataset.unit3dHdrOriginalSrc = img.getAttribute('src') || img.src || '';
      img.dataset.unit3dHdrOriginalSrcset = img.getAttribute('srcset') || '';
    }
  }

  function restoreOriginalImageSource(img) {
    const originalSrc = img.dataset.unit3dHdrOriginalSrc || '';
    const originalSrcset = img.dataset.unit3dHdrOriginalSrcset || '';
    if (originalSrc) {
      img.src = originalSrc;
    }
    if (originalSrcset) {
      img.setAttribute('srcset', originalSrcset);
    } else {
      img.removeAttribute('srcset');
    }
    img.classList.remove('unit3d-hdr-converted');
    img.style.removeProperty('filter');
    img.dataset.unit3dHdrFixRendered = '0';
    img.dataset.unit3dHdrFixMode = 'restored-original';
    syncTonemapStateForImage(img);
  }

  async function applyTrueHdrFix(img, src, hdrFixEnabled, processingContext) {
    rememberOriginalImageSource(img);
    const convertedUrl = await getToneMappedHdrUrl(src, img);
    const { hdrFixEnabled: stillHdrFixEnabled } = getImageToggleState(img);
    if (!isProcessingContextCurrent(processingContext)) {
      log('discarding stale converted image', {
        src,
        currentGeneration: processingContext?.torrentId
          ? getHdrProcessingGeneration(processingContext.torrentId)
          : null,
        resultGeneration: processingContext?.generation ?? null
      });
      return null;
    }

    if (!convertedUrl || !hdrFixEnabled || !stillHdrFixEnabled) {
      return false;
    }

    img.classList.add('unit3d-hdr-converted');
    img.classList.remove('unit3d-hdr-blackfix');
    img.dataset.unit3dTonemapActive = '0';
    img.style.setProperty('filter', 'none', 'important');
    img.src = convertedUrl;
    img.removeAttribute('srcset');
    img.dataset.unit3dHdrFixRendered = 'converted';
    img.dataset.unit3dHdrFixMode = 'pq-bt2020-to-sdr';
    return true;
  }

  function getImageSrc(img) {
    return img.currentSrc || img.src || '';
  }

  function imageSourceMatches(img, src) {
    const normalizedSrc = normalizeUrlCandidate(src);
    if (!normalizedSrc) {
      return false;
    }

    return [img.currentSrc, img.src, img.getAttribute('src')].some(
      (candidate) => normalizeUrlCandidate(candidate) === normalizedSrc
    );
  }

  async function analyzeImage(img, force = false) {
    const processingContext = imageProcessingTorrent.get(img);
    const src = getEligibleHdrFixSource(img);
    const displaySrc = getImageSrc(img);
    const sourceCandidates = getImageSourceCandidates(img);

    if (!IS_FIREFOX) {
      log('analyzeImage skip: not Firefox');
      finishHdrProcessingForImage(img, false, processingContext);
      return;
    }

    if (!force && isImageAnalysisCurrent(img, src)) {
      finishHdrProcessingForImage(img, false, processingContext);
      return;
    }

    if (pendingImages.has(img)) {
      log('analyzeImage skip: pending', { src: getImageSrc(img) });
      const pendingContext = pendingImageProcessingContext.get(img);
      if (
        processingContext &&
        (!pendingContext || pendingContext.generation !== processingContext.generation)
      ) {
        setTimeout(() => {
          enqueueImageAnalysis(img, force);
        }, 250);
      }
      return;
    }

    log('analyzeImage start', { src, displaySrc, sourceCandidates, complete: img.complete });
    if (!isHdrFixCandidateSource(src)) {
      const { hdrFixEnabled } = getImageToggleState(img);
      logNormal('skipping unsupported image source', { displaySrc, sourceCandidates });
      if (force && !hdrFixEnabled) {
        restoreOriginalImageSource(img);
      }
      markImageAnalyzed(img, src);
      finishHdrProcessingForImage(img, true, processingContext);
      return;
    }

    const { torrentId, hdrFixEnabled } = getImageToggleState(img);

    if (!torrentId) {
      logNormal('analyzeImage skip: torrent id not found', { src, displaySrc, sourceCandidates });
      finishHdrProcessingForImage(img, true, processingContext);
      return;
    }

    if (!hdrFixEnabled) {
      restoreOriginalImageSource(img);
      img.dataset.unit3dHdrFixApplied = '0';
      img.dataset.unit3dHdrFixMode = 'disabled';
      syncTonemapStateForImage(img);
      markImageAnalyzed(img, src);
      finishHdrProcessingForImage(img, false, processingContext);
      return;
    }

    let processingError = false;
    pendingImages.add(img);
    pendingImageProcessingContext.set(img, processingContext);
    try {
      const converted = await applyTrueHdrFix(img, src, hdrFixEnabled, processingContext);
      if (converted === null) {
        return;
      }

      if (converted) {
        img.dataset.unit3dHdrFixApplied = '1';
        img.dataset.unit3dTonemapActive = '0';
        logNormal('image converted hdr fix', {
          src,
          rendered: img.dataset.unit3dHdrFixMode,
          currentSrc: img.currentSrc
        });
        return;
      }

      processingError = true;
      restoreOriginalImageSource(img);
      img.dataset.unit3dHdrFixApplied = '0';
      img.dataset.unit3dHdrFixRendered = '0';
      img.dataset.unit3dHdrFixMode = 'conversion-unavailable';
      syncTonemapStateForImage(img);

      logNormal('image analyzed', {
        src,
        applied: false,
        torrentId,
        hdrFixEnabled,
        rendered: img.dataset.unit3dHdrFixMode
      });
    } catch (error) {
      const ownsPendingState =
        pendingImageProcessingContext.has(img) &&
        pendingImageProcessingContext.get(img) === processingContext;
      if (!ownsPendingState || !isProcessingContextCurrent(processingContext)) {
        log('discarding stale image processing failure', { src, error: String(error) });
        return;
      }

      processingError = true;
      restoreOriginalImageSource(img);
      img.dataset.unit3dHdrFixApplied = '0';
      img.dataset.unit3dHdrFixRendered = '0';
      img.dataset.unit3dHdrFixMode = 'conversion-error';
      syncTonemapStateForImage(img);
      logError('image processing failed', {
        src,
        torrentId,
        error: String(error)
      });
    } finally {
      const ownsPendingState =
        pendingImageProcessingContext.has(img) &&
        pendingImageProcessingContext.get(img) === processingContext;
      if (ownsPendingState) {
        pendingImages.delete(img);
        pendingImageProcessingContext.delete(img);
        if (isProcessingContextCurrent(processingContext)) {
          markImageAnalyzed(img, src);
        } else {
          analyzedImages.delete(img);
          analyzedImageKeys.delete(img);
        }
      }
      finishHdrProcessingForImage(img, processingError, processingContext);
    }
  }

  function waitForNextPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function runImageQueue() {
    if (imageQueueActive) {
      return;
    }

    imageQueueActive = true;
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
      imageQueueActive = false;
      if (imageAnalysisQueue.length > 0) {
        kickImageQueue();
      } else {
        scheduleFfmpegIdleCleanup();
      }
    }
  }

  function kickImageQueue() {
    if (!imageQueueActive && imageAnalysisQueue.length > 0) {
      void runImageQueue();
    }
  }

  function enqueueImageAnalysis(img, force = false) {
    if (!(img instanceof HTMLImageElement)) {
      return;
    }

    cancelFfmpegIdleCleanup();
    const existingForce = queuedImages.get(img);
    if (existingForce !== undefined) {
      queuedImages.set(img, Boolean(existingForce || force));
      return;
    }

    queuedImages.set(img, Boolean(force));
    imageAnalysisQueue.push(img);
    kickImageQueue();
  }

  function queueImageAnalysis(img, force = false) {
    if (!(img instanceof HTMLImageElement)) {
      log('queueImageAnalysis skip: non-image target', { nodeName: img?.nodeName || null });
      return false;
    }

    syncTonemapStateForImage(img);

    if (!IS_FIREFOX) {
      return false;
    }

    if (!shouldProcessImage(img)) {
      return false;
    }

    if (!getImageToggleState(img).hdrFixEnabled) {
      return false;
    }

    const source = getEligibleHdrFixSource(img);
    if (!force && isImageAnalysisCurrent(img, source)) {
      return false;
    }

    if (img.complete) {
      enqueueImageAnalysis(img, force);
      return true;
    }

    const onLoad = () => {
      img.removeEventListener('error', onError);
      enqueueImageAnalysis(img, force);
    };
    const onError = () => {
      img.removeEventListener('load', onLoad);
      logNormal('image load failed before HDR processing', { src: getImageSrc(img) });
      finishHdrProcessingForImage(img, true);
    };

    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    return true;
  }

  function shouldTrackHdrProcessingFromScan(img, force) {
    if (!(img instanceof HTMLImageElement) || !shouldProcessImage(img)) {
      return false;
    }

    const { torrentId, hdrFixEnabled } = getImageToggleState(img);
    if (!torrentId || !hdrFixEnabled) {
      return false;
    }

    return (
      force || (!isImageAnalysisCurrent(img) && !pendingImages.has(img) && !queuedImages.has(img))
    );
  }

  function scanImages(force = false) {
    const images = getRelevantImages();
    const hasPendingWork = images.some((img) => shouldTrackHdrProcessingFromScan(img, force));
    if (force || hasPendingWork) {
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
    }

    const trackedImagesByTorrent = new Map();
    images.forEach((img) => {
      if (!shouldTrackHdrProcessingFromScan(img, force)) {
        return;
      }

      const { torrentId } = getImageToggleState(img);
      if (!trackedImagesByTorrent.has(torrentId)) {
        trackedImagesByTorrent.set(torrentId, []);
      }
      trackedImagesByTorrent.get(torrentId).push(img);
    });

    const trackedContexts = new WeakMap();
    trackedImagesByTorrent.forEach((trackedImages, torrentId) => {
      const generation = startHdrProcessing(torrentId, trackedImages.length);
      trackedImages.forEach((img) => {
        const context = { torrentId, generation };
        trackedContexts.set(img, context);
        imageProcessingTorrent.set(img, context);
      });
    });

    images.forEach((img) => {
      const context = trackedContexts.get(img);
      const queued = queueImageAnalysis(img, force);
      if (context && !queued) {
        finishHdrProcessingForImage(img, false, context);
      }
    });
  }

  function injectButtons() {
    document.querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
      const torrentId = getTorrentId(panel);
      const detailRow = panel.closest(DETAIL_ROW_SELECTOR);
      const existingControls = panel.querySelector(':scope > .unit3d-tonemap-controls');
      if (!panel.querySelector(LIGHTBOX_TRIGGER_SELECTOR) || !torrentId) {
        setPanelEligibility(panel, false);
        existingControls?.remove();
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
      controls.className = 'unit3d-tonemap-controls';
      controls.appendChild(makeTonemapButton(panel, torrentId));

      if (IS_FIREFOX) {
        controls.appendChild(makeHdrBlackFixButton(panel, torrentId));
      }

      panel.insertBefore(controls, panel.firstChild);
      updateButtons(panel, torrentId);
    });
  }

  function shouldRunOnCurrentPage() {
    return IS_UNIT3D;
  }

  if (!shouldRunOnCurrentPage()) {
    log('init skip: unsupported page', {
      host: globalThis.location.hostname,
      path: globalThis.location.pathname
    });
    return;
  }

  // Initial state + inject for already-rendered panels
  logNormal('init', {
    isFirefox: IS_FIREFOX,
    enabledTonemapTorrents: Object.keys(tonemapEnabledByTorrent).filter(
      (torrentId) => tonemapEnabledByTorrent[torrentId]
    ).length,
    enabledHdrFixTorrents: Object.keys(hdrFixEnabledByTorrent).filter(
      (torrentId) => hdrFixEnabledByTorrent[torrentId]
    ).length,
    debugLevel
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
      const trigger = event.target?.closest?.(LIGHTBOX_TRIGGER_SELECTOR);
      if (!(trigger instanceof Element)) {
        return;
      }

      const img = trigger instanceof HTMLImageElement ? trigger : trigger.querySelector?.('img');
      const torrentId = getTorrentId(trigger);
      const lightboxSource = getUnit3dLightboxSource(trigger);
      lastClickedTorrentId = torrentId || '';
      if (lastClickedTorrentId) {
        if (
          lightboxSource &&
          isTonemapEnabledForTorrent(lastClickedTorrentId) &&
          !isHdrFixEnabledForTorrent(lastClickedTorrentId)
        ) {
          rememberTonemapSource(lastClickedTorrentId, lightboxSource);
        }
      }

      lastClickedHdrSource = lightboxSource;
      prepareUnit3dLightboxForSource(lightboxSource);
      log(
        lightboxSource ? 'remembered full-resolution lightbox target' : 'missing lightbox target',
        {
          torrentId: lastClickedTorrentId,
          src: lastClickedHdrSource,
          previewSrc: img instanceof HTMLImageElement ? img.currentSrc || img.src || '' : ''
        }
      );
      scheduleLightboxSync();
    },
    true
  );
  // Watch for dynamically opened torrent panels (expand/collapse)
  let refreshScheduled = false;
  let lightboxSyncScheduled = false;

  function syncLightboxImages() {
    document.querySelectorAll(LIGHTBOX_IMAGE_SELECTOR).forEach((img) => {
      syncTonemapStateForImage(img);
    });
    ensureLightboxHdrProcessingNote();
  }

  function scheduleLightboxSync() {
    if (lightboxSyncScheduled) {
      return;
    }

    lightboxSyncScheduled = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lightboxSyncScheduled = false;
        syncLightboxImages();
      });
    });
  }

  function scheduleRefresh() {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      injectButtons();
      scanImages();
      scheduleLightboxSync();
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

    if (node.matches(LIGHTBOX_SELECTOR)) {
      return true;
    }

    if (node.matches(PANEL_SELECTOR)) {
      return isEligibleHdrPanel(node);
    }

    if (node.matches(LIGHTBOX_IMAGE_SELECTOR)) {
      return true;
    }

    if (node.matches(LIGHTBOX_TRIGGER_SELECTOR)) {
      const panel = node.closest(PANEL_SELECTOR);
      return isEligibleHdrPanel(panel);
    }

    if (node.querySelector?.(LIGHTBOX_IMAGE_SELECTOR)) {
      return true;
    }

    const nestedPanels = node.querySelectorAll?.(PANEL_SELECTOR) || [];
    if ([...nestedPanels].some((panel) => isEligibleHdrPanel(panel))) {
      return true;
    }

    const nestedTriggers = node.querySelectorAll?.(LIGHTBOX_TRIGGER_SELECTOR) || [];
    return [...nestedTriggers].some((trigger) =>
      isEligibleHdrPanel(trigger.closest(PANEL_SELECTOR))
    );
  }

  if (IS_UNIT3D) {
    document.addEventListener('unit3d:ptp-dom-ready', scheduleRefresh);

    const observer = new MutationObserver((mutations) => {
      const shouldRefresh = mutations.some((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (!(target instanceof Element)) {
            return false;
          }

          if (target.matches(LIGHTBOX_IMAGE_SELECTOR) && mutation.attributeName === 'src') {
            return mutation.oldValue !== target.getAttribute('src');
          }

          return target.matches(LIGHTBOX_SELECTOR) && mutation.attributeName === 'hidden';
        }

        return [...mutation.addedNodes].some((node) => shouldRefreshForAddedElement(node));
      });

      if (shouldRefresh) {
        scheduleRefresh();
        scheduleLightboxSync();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'hidden'],
      attributeOldValue: true
    });
  }
})();
