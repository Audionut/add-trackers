const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const scriptPath = path.resolve(__dirname, '..', 'ant-adoption-finder.user.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const storage = new Map();
let filterRows = [];
let requestResponses = [];
const requestedUrls = [];
const parsedDocuments = new Map();
const documentNodes = new Map();
const documentNodeLists = new Map();
const documentElements = new Map();
const globalEventListeners = new Map();
const openedTabs = [];
const requestedOptions = [];
const pageRequests = [];
const scheduledTimeouts = [];
let openTabError = null;
let actionSetValueError = null;
let cacheDeleteValueError = null;
let cacheSetValueError = null;
let flowDeleteValueError = null;
let flowDeleteValueFailuresRemaining = 0;
let flowGetValueError = null;
let flowGetValueFailuresRemaining = 0;
let flowSetValueError = null;
let filteredScanCorruptWritesRemaining = 0;
let filteredScanDecompressCount = 0;
let actionGetValueCount = 0;
let gmListValuesCount = 0;
let rowQueryCount = 0;
let markerDeleteValueError = null;
let markerGetValueError = null;
let markerSetValueError = null;
let tokenSequence = 0;
let nowOverride = null;
let webLockTail = Promise.resolve();
const NativeDate = Date;

class TestBlob {
  constructor(_parts = [], options = {}) {
    this.dataUrl = options.dataUrl || 'data:application/octet-stream;base64,';
    this.type = options.type || 'application/octet-stream';
  }
}

const instrumented = source
  .replace(
    'const { batch, stats } = collectBatchRows(rows, trackers, limit, refreshCache);',
    `const { batch, stats } = globalThis.__collectBatchRowsTestOverride
      ? globalThis.__collectBatchRowsTestOverride(rows, trackers, limit, refreshCache)
      : collectBatchRows(rows, trackers, limit, refreshCache);`
  )
  .replaceAll('await processRow(', 'await (globalThis.__processRowTestOverride || processRow)(')
  .replace(
    /\n  (?:const|let) filteredAdoptionView = isFilteredAdoptionView\(\);[\s\S]*?\n\}\)\(\);\s*$/,
    `
  globalThis.__antAdoptionFinderPlusTests = {
    addRefreshedRowKey(key) { refreshedRowKeys.add(key); },
    addControls,
    addRunProgressDisplay,
    applyAdoptionFilters,
    addAdoptionReadyNotice,
    buildAdoptionReadyUrl,
    buildExcludeRegexes,
    cacheGet,
    cacheSet,
    cacheRowProcessingData,
    cacheDelete,
    cleanSiteLookupCache,
    claimAdoptionReadyFlow,
    collectBatchRows,
    consumeAdoptionReadyMarker,
    createAdoptionReadyMarker,
    decorateAdoptionRows,
    findBestquiAddJobMatch,
    findVerifiedquiAddJobMatch,
    findVerifiedAntquiItem,
    getAutoquiMatchDisposition,
    getAntMetadata,
    getAntCrossSeedSavePath,
    getDefaultAdoptionFilterState,
    getAdoptionFilterResult,
    getAdoptionRowMetadata,
    getCachedRowProcessingData,
    getCachedIconDataUrl,
    getCachedRowStatusRestoreQueue() { return cachedRowStatusRestoreQueue; },
    getRowsForCachedDataRestore,
    getActiveAdoptionReadyFlow,
    getRows,
    getScanPageCount,
    getTrackerDefinitions,
    getTorrentAction,
    handleCompletedquiAddJob,
    iconCacheKey,
    ensureIconDataUrl,
    exitFilteredAdoptionView,
    initializeAdoptionReadyView,
    isAdoptionRowSeeding,
    isquiItemSeeding,
    isquiItemReadyForAdoption,
    loadFilteredScan,
    loadCachedRowStatusesOnPageLoad,
    markAdoptionRowGrabbed,
    markAdoptionRowIgnored,
    markRowProcessingComplete,
    maskSensitiveConfigFields,
    maybeAutoTriggerAdoption,
    migrateLegacyRowProcessingCache,
    normalizeMaximumSizeGiBSetting,
    openLastFilteredScan,
    parseSizeToGiB,
    partitionFilteredScanEntries,
    pollAdoptionReadyForqui,
    pollquiAddJobs,
    addTrackerMatchToqui,
    startquiAddPolling,
    stopquiAddPolling,
    schedulequiAddPolling,
    postToqui,
    processRow,
    rescanBrokenRow,
    createActionCell,
    createExclusionGroupsControl,
    readExclusionGroupsControl,
    normalizeExclusionGroups,
    clearAdoptionActions,
    ensureAdoptionColumns,
    queryqui,
    redactDebugUrl,
    releaseAdoptionReadyFlow,
    refreshAdoptionViewFromSettings,
    requestRowProcessingCancellation,
    resetFilteredScanCache() {
      filteredScanCachedRaw = undefined;
      filteredScanCachedValue = null;
      filteredScanLegacyCacheChecked = false;
    },
    renderCachedTrackerRow,
    restoreMaskedSensitiveFieldsForSave,
    restoreCachedRowStatuses,
    runquiCrossSeedFollowup,
    run,
    saveFilteredScan,
    saveAdoptionFilterSettings,
    sanitizeDebugValue,
    scanAdoptionPages,
    scheduleAdoptionReadyPage,
    createMediaFilterControl,
    buildMediaFilterMatchers,
    addAdoptionFilterControls,
    readMediaFilterControl,
    normalizeMediaFilters,
    normalizeMediaFilterSetting,
    scheduleCachedRowStatusesOnPageLoad,
    schedulequiCrossSeedFollowup,
    searchAntquiCandidates,
    searchquiJobCandidates,
    searchBhd,
    searchHdb,
    searchPtp,
    searchScopedTrackers,
    searchUnit3dTracker,
    sleepWithButtonCountdown,
    sortAdoptionRows,
    sortAdoptionRowsByBounty,
    stageFilteredScanEntries,
    startAdoptionScan,
    setAdoptionScanRunning(value) { adoptionScanRunning = value; },
    clearquiAddJobs() { quiAddJobs.clear(); },
    setFilterState(value) { adoptionFilterState = value; },
    getquiAddJob(key) { return quiAddJobs.get(key); },
    setquiAddJob(key, job) { quiAddJobs.set(key, job); },
    setTrackerResultInIndexes,
    setTorrentAction,
    shouldAutoIgnoreTrackerSearch,
    openAdoptionReadyPage,
    updateAdoptionReadyNotice,
    updateOpenLastScanButton,
    updateRunProgress,
    watchAdoptionReadyPageHandling
  };
})();`
  );

assert.notEqual(instrumented, source, 'failed to instrument userscript initialization');

const configValues = new Map();
const context = {
  addEventListener(type, callback) {
    const listeners = globalEventListeners.get(type) || [];
    listeners.push(callback);
    globalEventListeners.set(type, listeners);
  },
  alert() {},
  Blob: TestBlob,
  confirm() {
    return true;
  },
  console,
  fetch() {
    assert.fail('ANT page reads must use the page fetch, not the userscript sandbox fetch');
  },
  CSS: { escape: (value) => String(value) },
  Date: class extends NativeDate {
    static now() {
      return nowOverride ?? NativeDate.now();
    }
  },
  Error,
  FileReader: class {
    readAsDataURL(blob) {
      this.result = blob.dataUrl;
      queueMicrotask(() => this.onload());
    }
  },
  crypto: {
    randomUUID() {
      tokenSequence += 1;
      return `test-token-${tokenSequence}`;
    }
  },
  document: {
    title: 'ANT torrent',
    createTextNode(textContent) {
      return { textContent };
    },
    createElement(tagName) {
      if (String(tagName).toLowerCase() === 'tbody') {
        return {
          children: [],
          insertAdjacentHTML(_position, html) {
            this.children = [...String(html).matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)].map(
              (match) => {
                const className = match[1].match(/\bclass=(['"])(.*?)\1/i)?.[2] || '';
                const classes = new Set(className.split(/\s+/).filter(Boolean));
                const hrefs = [...match[0].matchAll(/\bhref=(['"])(.*?)\1/gi)].map((value) =>
                  value[2].replaceAll('&amp;', '&')
                );
                return {
                  matches(selector) {
                    return (
                      selector === 'tr.torrent.torrent_row' &&
                      classes.has('torrent') &&
                      classes.has('torrent_row')
                    );
                  },
                  querySelector(selector) {
                    if (!selector.includes('torrents.php?action=download')) return null;
                    const href = hrefs.find(
                      (value) =>
                        value.includes('torrents.php?action=download') && /[?&]id=\d+/.test(value)
                    );
                    return href ? { getAttribute: () => href } : null;
                  }
                };
              }
            );
          }
        };
      }
      return {
        tagName,
        addEventListener(type, callback) {
          this.listeners[type] = callback;
        },
        append(...nodes) {
          nodes.forEach((node) => {
            node.parentNode = this;
          });
          this.children.push(...nodes);
        },
        appendChild(node) {
          node.parentNode = this;
          this.children.push(node);
          return node;
        },
        remove() {
          if (this.parentNode)
            this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
        },
        children: [],
        dataset: {},
        listeners: {},
        get options() {
          return this.children;
        },
        querySelector(selector) {
          if (selector.startsWith('.')) return findDescendantByClass(this, selector.slice(1));
          if (selector !== 'select') return null;
          return (
            this.children
              .flatMap(function visit(node) {
                return [node, ...(node.children || []).flatMap(visit)];
              })
              .find((node) => node.tagName === 'select') || null
          );
        },
        querySelectorAll(selector) {
          const descendants = this.children.flatMap(function visit(node) {
            return [node, ...(node.children || []).flatMap(visit)];
          });
          if (selector === 'input' || selector === 'input[type="checkbox"]')
            return descendants.filter((node) => node.type === 'checkbox');
          if (selector === 'input[data-filter-state]')
            return descendants.filter((node) => node.dataset?.filterState);
          if (selector === 'input:checked')
            return descendants.filter((node) => node.type === 'checkbox' && node.checked);
          if (selector.startsWith('.'))
            return descendants.filter((node) =>
              String(node.className || '')
                .split(/\s+/)
                .includes(selector.slice(1))
            );
          return [];
        },
        setAttribute() {},
        textContent: ''
      };
    },
    getElementById(id) {
      return documentElements.get(id) || null;
    },
    querySelector(selector) {
      return documentNodes.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (documentNodeLists.has(selector)) return documentNodeLists.get(selector);
      if (selector.startsWith('tr.torrent.torrent_row')) {
        rowQueryCount += 1;
        return filterRows;
      }
      return [];
    }
  },
  DOMParser: class {
    parseFromString(value) {
      return parsedDocuments.get(value);
    }
  },
  FormData: class {
    constructor() {
      this.entries = [];
    }
    append(name, value) {
      this.entries.push([name, value]);
    }
  },
  history: {
    state: null,
    replaceState(state, _unused, url) {
      this.state = state;
      context.location.href = new URL(url, context.location.href).href;
    }
  },
  GM_config: {
    fields: {},
    get(field) {
      if (configValues.has(field)) return configValues.get(field);
      return this.definition.fields[field]?.default;
    },
    init(definition) {
      this.definition = definition;
    },
    set(field, value) {
      configValues.set(field, value);
    },
    write() {
      const values = Object.fromEntries(
        Object.keys(this.definition.fields).map((field) => [field, this.get(field)])
      );
      storage.set(this.definition.id, JSON.stringify(values));
    },
    open() {}
  },
  GM_deleteValue(key) {
    if (cacheDeleteValueError && String(key).includes(':c:')) {
      throw cacheDeleteValueError;
    }
    if (markerDeleteValueError && String(key).includes(':adoption-ready-token:')) {
      throw markerDeleteValueError;
    }
    if (flowDeleteValueError && String(key).includes(':adoption-ready-flow-v1')) {
      throw flowDeleteValueError;
    }
    if (flowDeleteValueFailuresRemaining > 0 && String(key).includes(':adoption-ready-flow-v1')) {
      flowDeleteValueFailuresRemaining -= 1;
      throw new Error('transient flow delete failure');
    }
    storage.delete(key);
  },
  GM_getValue(key, fallback = null) {
    if (String(key).startsWith('ant-adoption-filename-cross-seed:action:')) {
      actionGetValueCount += 1;
    }
    if (markerGetValueError && String(key).includes(':adoption-ready-token:')) {
      throw markerGetValueError;
    }
    if (flowGetValueError && String(key).includes(':adoption-ready-flow-v1')) {
      throw flowGetValueError;
    }
    if (flowGetValueFailuresRemaining > 0 && String(key).includes(':adoption-ready-flow-v1')) {
      flowGetValueFailuresRemaining -= 1;
      throw new Error('transient flow read failure');
    }
    return storage.has(key) ? storage.get(key) : fallback;
  },
  GM_listValues() {
    gmListValuesCount += 1;
    return [...storage.keys()];
  },
  GM_registerMenuCommand() {},
  GM_openInTab(url, options) {
    if (openTabError) throw openTabError;
    openedTabs.push({ url, options });
  },
  GM_setValue(key, value) {
    if (actionSetValueError && String(key).includes(':action:')) {
      throw actionSetValueError;
    }
    if (cacheSetValueError && String(key).includes(':c:')) {
      throw cacheSetValueError;
    }
    if (markerSetValueError && String(key).includes(':adoption-ready-token:')) {
      throw markerSetValueError;
    }
    if (flowSetValueError && String(key).includes(':adoption-ready-flow-v1')) {
      throw flowSetValueError;
    }
    if (
      key === 'ant-adoption-filename-cross-seed:filtered-scan-v2' &&
      filteredScanCorruptWritesRemaining > 0
    ) {
      filteredScanCorruptWritesRemaining -= 1;
      storage.set(key, `${value}:corrupt`);
      return;
    }
    storage.set(key, value);
  },
  GM_xmlhttpRequest(options) {
    requestedUrls.push(options.url);
    requestedOptions.push(options);
    const response = requestResponses.shift();
    queueMicrotask(() => {
      if (response?.advanceMs) nowOverride += response.advanceMs;
      response?.beforeResponse?.();
      if (response?.errorFromUrl) {
        options.onerror(new Error(`network failed for ${options.url}`));
        return;
      }
      options.onload(response);
    });
  },
  location: {
    href: 'https://anthelion.me/torrents.php?type=adoption',
    origin: 'https://anthelion.me'
  },
  navigator: {
    locks: {
      request(_name, _options, callback) {
        const request = webLockTail.then(() => callback());
        webLockTail = request.then(
          () => undefined,
          () => undefined
        );
        return request;
      }
    }
  },
  LZString: {
    compressToUTF16(value) {
      return value;
    },
    decompressFromUTF16(value) {
      filteredScanDecompressCount += 1;
      return value;
    }
  },
  unsafeWindow: {
    AbortSignal,
    async fetch(url, options) {
      assert.equal(this, context.unsafeWindow);
      const request = { url, ...options };
      pageRequests.push(request);
      requestedUrls.push(url);
      requestedOptions.push(request);
      const response = requestResponses.shift();
      await Promise.resolve();
      if (response?.advanceMs) nowOverride += response.advanceMs;
      response?.beforeResponse?.();
      if (response?.errorFromUrl) throw new Error(`network failed for ${url}`);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        url,
        async text() {
          return response.responseText;
        }
      };
    },
    confirm() {
      return false;
    }
  },
  setTimeout(callback, delay) {
    scheduledTimeouts.push({ callback, delay });
    return scheduledTimeouts.length;
  },
  clearTimeout(timer) {
    if (scheduledTimeouts[timer - 1]) scheduledTimeouts[timer - 1].cancelled = true;
  },
  URL,
  URLSearchParams
};

vm.runInNewContext(instrumented, context, { filename: scriptPath });
const api = context.__antAdoptionFinderPlusTests;

function createRow({
  bounty = 1500000,
  bountyPerGib = 300000,
  sizeGib = 5,
  action = '',
  metadata = '',
  seeding = false,
  trumpable = false
} = {}) {
  const classes = new Set();
  const select = { value: action };
  return {
    classList: {
      add(...values) {
        values.forEach((value) => classes.add(value));
      },
      contains(value) {
        return value === 'zeroseed' || classes.has(value);
      },
      remove(...values) {
        values.forEach((value) => classes.delete(value));
      }
    },
    classes,
    dataset: {
      antAdoptionAction: action,
      antAdoptionBounty: String(bounty),
      antAdoptionBountyGib: String(bountyPerGib),
      antAdoptionMetadata: metadata,
      antAdoptionOriginalIndex: '0',
      antAdoptionSeeding: String(seeding),
      antAdoptionSizeGib: String(sizeGib),
      antAdoptionTorrentId: '123',
      antAdoptionTrumpable: String(trumpable)
    },
    hidden: false,
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    children: [],
    querySelector(selector) {
      return selector.includes('select') ? select : null;
    },
    select
  };
}

function createRestorableRow(torrentId, action = '', overrides = {}) {
  const nodes = new Map();
  const remember = (node) => {
    for (const className of String(node.className || '')
      .split(/\s+/)
      .filter(Boolean)) {
      nodes.set(`.${className}`, node);
    }
    return node;
  };
  const row = {
    classList: {
      add() {},
      contains(className) {
        return className === 'zeroseed';
      },
      remove() {}
    },
    children: [],
    dataset: {
      antAdoptionAction: action,
      antAdoptionBounty: String(overrides.bounty ?? 1000),
      antAdoptionBountyGib: String(overrides.bountyPerGib ?? 1000),
      antAdoptionMetadata: overrides.metadata || '',
      antAdoptionSeeding: String(overrides.seeding ?? false),
      antAdoptionSizeGib: String(overrides.sizeGib ?? 1),
      antAdoptionTorrentId: String(torrentId),
      antAdoptionTrumpable: String(overrides.trumpable ?? false)
    },
    hidden: action !== '',
    append(...children) {
      children.forEach((child) => this.appendChild(child));
    },
    appendChild(child) {
      this.children.push(remember(child));
      return child;
    },
    querySelector(selector) {
      if (selector.includes('torrents.php?action=download')) {
        return {
          getAttribute() {
            return `/torrents.php?action=download&id=${torrentId}`;
          }
        };
      }
      if (selector.includes('a[href*="torrents.php?id="]')) return null;
      if (selector === '.group_info' || selector === '.big_info') return row;
      return nodes.get(selector) || null;
    }
  };
  return row;
}

function createBatchRow(torrentId, groupId = '45') {
  const row = createRestorableRow(torrentId);
  row.textContent = 'Batch example [2020]';
  const originalQuerySelector = row.querySelector.bind(row);
  const titleLink = {
    cloneNode() {
      return this;
    },
    getAttribute() {
      return `/torrents.php?id=${groupId}&torrentid=${torrentId}`;
    }
  };
  row.querySelector = (selector) =>
    selector.includes('torrents.php?id=') ? titleLink : originalQuerySelector(selector);
  return row;
}

function findDescendantByClass(root, className) {
  if (
    String(root?.className || '')
      .split(/\s+/)
      .includes(className)
  )
    return root;
  for (const child of root?.children || []) {
    const found = findDescendantByClass(child, className);
    if (found) return found;
  }
  return null;
}

function createAntquiItem({ state = 'stalledUP' } = {}) {
  return {
    addedOn: 1000,
    contentPath: 'D:\\Media\\Example.mkv',
    hash: 'ant-hash',
    hosts: ['anthelion.me'],
    name: 'Example.mkv',
    progress: state === 'downloading' ? 0.5 : 1,
    raw: { files: [{ name: 'Example.mkv' }] },
    savePath: 'D:\\Media',
    state,
    trackerHost: 'anthelion.me'
  };
}

function createScannedDocument(entries) {
  const createCell = (textContent) => ({
    classList: { contains: () => false },
    textContent
  });
  const header = {
    children: [createCell('Torrent'), createCell('Size'), createCell('Bounty')],
    textContent: 'Torrent Size Bounty'
  };
  const table = {
    querySelector() {
      return header;
    },
    querySelectorAll() {
      return rows;
    }
  };
  const rows = entries.map(({ id, html, bounty = 1000 }) => ({
    children: [createCell('Torrent'), createCell('1 GiB'), createCell(String(bounty))],
    childNodes: [{ nodeType: 3, nodeValue: `Torrent 1 GiB ${bounty}` }],
    classList: { contains: (className) => className === 'zeroseed' },
    closest() {
      return table;
    },
    outerHTML: html,
    querySelector(selector) {
      if (!selector.includes('torrents.php?action=download')) return null;
      return {
        getAttribute() {
          return `torrents.php?action=download&id=${id}`;
        }
      };
    }
  }));
  return {
    querySelector() {
      return rows[0] || null;
    },
    querySelectorAll() {
      return [table];
    }
  };
}

function createFilteredScan(rows, overrides = {}) {
  return {
    version: 2,
    scannedAt: '2026-09-17T00:00:00.000Z',
    pageCount: 1,
    rows,
    rowData: rows.map((_, originalIndex) => ({
      bounty: 1000,
      bountyPerGib: 1000,
      metadata: '',
      originalIndex,
      seeding: false,
      sizeGiB: 1,
      torrentId: String(originalIndex + 1),
      trumpable: false,
      zeroSeed: true
    })),
    ...overrides
  };
}

function createSavedTorrentRowHtml(torrentId) {
  return `<tr class="torrent torrent_row zeroseed"><td><a href="torrents.php?action=download&amp;id=${torrentId}">Download</a></td></tr>`;
}

async function flushScheduledPromise(promise, firstTimerIndex) {
  let timerIndex = firstTimerIndex;
  let settled = false;
  promise.finally(() => {
    settled = true;
  });
  for (let attempts = 0; !settled && attempts < 100; attempts += 1) {
    await Promise.resolve();
    if (timerIndex < scheduledTimeouts.length) {
      const timer = scheduledTimeouts[timerIndex];
      timerIndex += 1;
      await timer.callback();
    }
  }
  assert.equal(settled, true, 'scheduled promise did not settle');
  await promise;
}

test('retains the original settings and cache identity', () => {
  assert.match(source, /const SCRIPT_PREFIX = 'ant-adoption-filename-cross-seed';/);
  assert.match(source, /id: 'ANTAdoptionFilenameCrossSeedConfig'/);
  assert.match(source, /\/\/ @name\s+ANT - Adoption cross-seed finder/);
  assert.match(source, /\/\/ @version\s+0\.2\.1/);
});

test('parses ANT sizes into GiB', () => {
  assert.equal(api.parseSizeToGiB('512 MiB'), 0.5);
  assert.equal(api.parseSizeToGiB('1 TiB'), 1024);
  assert.equal(api.parseSizeToGiB('invalid'), null);
});

test('normalizes a legacy byte-valued maximum size to GiB', () => {
  configValues.set('maximum_size_gib', 20);
  assert.equal(api.normalizeMaximumSizeGiBSetting(), 20);
  configValues.set('maximum_size_gib', 20 * 1024 ** 3);
  assert.equal(api.normalizeMaximumSizeGiBSetting(), 20);
  assert.equal(context.GM_config.get('maximum_size_gib'), 20);
  assert.equal(JSON.parse(storage.get('ANTAdoptionFilenameCrossSeedConfig')).maximum_size_gib, 20);
  assert.equal(api.normalizeMaximumSizeGiBSetting(), 20);
  configValues.set('maximum_size_gib', 0);
});

test('saves page filter values into the durable shared settings record', () => {
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    minimumBounty: 750000,
    maximumSizeGib: 20,
    showOnlyGrabbedRows: true,
    skipTrumpable: false,
    sortField: 'Size',
    sortDirection: 'Ascending'
  });
  api.saveAdoptionFilterSettings();
  assert.equal(context.GM_config.get('maximum_size_gib'), 20);
  const saved = JSON.parse(storage.get('ANTAdoptionFilenameCrossSeedConfig'));
  assert.equal(saved.maximum_size_gib, 20);
  assert.equal(saved.minimum_bounty, 750000);
  assert.equal(saved.show_only_grabbed_rows, true);
  assert.equal(saved.skip_trumpable, false);
  assert.equal(saved.default_sort_field, 'Size');
  assert.equal(saved.default_sort_direction, 'Ascending');

  configValues.clear();
  Object.entries(saved).forEach(([field, value]) => configValues.set(field, value));
  assert.equal(api.getDefaultAdoptionFilterState().maximumSizeGib, 20);
  assert.equal(api.getDefaultAdoptionFilterState().minimumBounty, 750000);
  assert.equal(api.getDefaultAdoptionFilterState().showOnlyGrabbedRows, true);
  assert.equal(api.getDefaultAdoptionFilterState().skipTrumpable, false);
  assert.equal(api.getDefaultAdoptionFilterState().sortField, 'Size');
  assert.equal(api.getDefaultAdoptionFilterState().sortDirection, 'Ascending');

  configValues.set('minimum_bounty', 0);
  configValues.set('show_only_grabbed_rows', false);
  configValues.set('default_sort_field', 'Bounty / GiB');
  configValues.set('default_sort_direction', 'Descending');
});

test('masks an embedded qui proxy token without hiding an ordinary base URL', () => {
  const node = {
    autocomplete: '',
    dataset: {},
    title: '',
    type: 'text',
    value: '',
    addEventListener() {}
  };
  context.GM_config.fields.qui_base_url = { node };

  configValues.set('qui_base_url', 'https://qui.example');
  node.value = 'https://qui.example';
  api.maskSensitiveConfigFields(null);
  assert.equal(node.value, 'https://qui.example');
  assert.equal(node.dataset.antSecretMasked, '0');

  const secretUrl = 'https://qui.example/proxy/embedded-secret';
  configValues.set('qui_base_url', secretUrl);
  node.value = secretUrl;
  api.maskSensitiveConfigFields(null);
  assert.equal(node.value, '[saved value hidden]');
  assert.equal(node.type, 'password');
  assert.equal(node.dataset.antSecretMasked, '1');
  api.restoreMaskedSensitiveFieldsForSave();
  assert.equal(node.value, secretUrl);
  assert.equal(node.dataset.antSecretMasked, '0');

  configValues.set('qui_base_url', 'https://qui.example/api/v2');
  node.value = 'https://qui.example/api/v2';
  api.maskSensitiveConfigFields(null);
  assert.equal(node.value, 'https://qui.example/api/v2');
  assert.equal(node.type, 'text');
  assert.equal(node.dataset.antSecretMasked, '0');
  assert.equal(node.dataset.antSecretEdited, '0');
  assert.equal(node.autocomplete, '');
  assert.equal(node.title, '');

  delete context.GM_config.fields.qui_base_url;
  configValues.set('qui_base_url', '');
});

test('matches dropdown values without matching partial words', () => {
  const [web, tv] = api.buildExcludeRegexes(['WEB', 'TV']);
  assert.equal(web.test('WEB release'), true);
  assert.equal(web.test('Webster'), false);
  assert.equal(tv.test('Format / TV / 1080p'), true);
});

test('media dropdowns discard legacy values and keep empty categories inactive', () => {
  let changed;
  const control = api.createMediaFilterControl(context.document, 'Scene, VHS', (values) => {
    changed = values;
  });
  assert.deepEqual(
    control.children.map((group) => group.dataset.mediaCategory),
    ['Source', 'Codec', 'Audio', 'Subtitles', 'Resolution', 'Language']
  );
  const codec = control.children.find((group) => group.dataset.mediaCategory === 'Codec');
  const mode = codec.querySelector('select');
  assert.equal(mode.disabled, true);
  assert.equal(codec.children[0].textContent, 'Codec: Off');
  const input = codec.querySelectorAll('input').find((input) => input.value === 'H265');
  input.checked = true;
  input.listeners.change();
  assert.equal(mode.disabled, false);
  mode.value = 'only';
  mode.listeners.change();
  assert.equal(changed.Codec.mode, 'only');
  assert.deepEqual([...changed.Codec.values], ['H265']);
  assert.deepEqual([...changed.Source.values], []);
  assert.equal('Saved custom exclusions' in changed, false);
  input.checked = false;
  input.listeners.change();
  assert.equal(mode.disabled, true);
  assert.equal(codec.children[0].textContent, 'Codec: Off');
  assert.equal(api.buildMediaFilterMatchers({ Codec: changed.Codec }).length, 0);
});

test('stored legacy exclusions are cleared while valid dropdown choices survive cleanup', () => {
  const original = configValues.get('excluded_formats');
  try {
    for (const value of ['VHS, Scene', ['VHS', 'Scene']]) {
      configValues.set('excluded_formats', value);
      api.normalizeMediaFilterSetting();
      assert.equal(api.buildMediaFilterMatchers(configValues.get('excluded_formats')).length, 0);
      assert.equal(JSON.stringify(configValues.get('excluded_formats')).includes('Scene'), false);
      const saved = JSON.parse(storage.get('ANTAdoptionFilenameCrossSeedConfig'));
      assert.deepEqual(
        saved.excluded_formats,
        JSON.parse(JSON.stringify(configValues.get('excluded_formats')))
      );
    }
    configValues.set('excluded_formats', {
      Source: { mode: 'only', values: ['VHS', 'Custom format'] },
      Codec: { mode: 'ignore', values: ['H265'] },
      'Saved custom exclusions': { mode: 'ignore', values: ['Scene'] }
    });
    api.normalizeMediaFilterSetting();
    const cleaned = configValues.get('excluded_formats');
    assert.deepEqual([...cleaned.Source.values], ['VHS']);
    assert.equal(cleaned.Source.mode, 'only');
    assert.deepEqual([...cleaned.Codec.values], ['H265']);
    assert.equal('Saved custom exclusions' in cleaned, false);
    assert.deepEqual(
      JSON.parse(storage.get('ANTAdoptionFilenameCrossSeedConfig')).excluded_formats,
      JSON.parse(JSON.stringify(cleaned))
    );
    const control = api.createMediaFilterControl(context.document, cleaned);
    assert.equal(
      control.querySelectorAll('input').some((input) => input.value === 'Custom format'),
      false
    );
    const saved = JSON.stringify(cleaned);
    api.normalizeMediaFilterSetting();
    assert.equal(JSON.stringify(configValues.get('excluded_formats')), saved);
  } finally {
    if (original === undefined) configValues.delete('excluded_formats');
    else configValues.set('excluded_formats', original);
  }
});

test('language Ignore all selects every listed language for exclusion and can be cleared', () => {
  const control = api.createMediaFilterControl(context.document, {});
  const language = control.children.find((group) => group.dataset.mediaCategory === 'Language');
  const all = language.children[1].children[0].children[0];
  const inputs = language
    .querySelectorAll('input')
    .filter((input) => input.dataset.mediaValue === '1');
  assert.ok(inputs.some((input) => input.value === 'Multiple languages'));
  assert.ok(inputs.some((input) => input.value === 'Zxx'));
  all.checked = true;
  all.listeners.change();
  assert.equal(language.querySelector('select').value, 'ignore');
  assert.ok(inputs.every((input) => input.checked));
  assert.equal(api.readMediaFilterControl(control).Language.values.length, inputs.length);
  language.querySelector('select').value = 'only';
  language.querySelector('select').listeners.change();
  assert.equal(all.checked, false);
  all.checked = true;
  all.listeners.change();
  assert.equal(language.querySelector('select').value, 'ignore');
  all.checked = false;
  all.listeners.change();
  assert.ok(inputs.every((input) => !input.checked));
  assert.equal(language.querySelector('select').disabled, true);
  assert.equal(api.buildMediaFilterMatchers(api.readMediaFilterControl(control)).length, 0);
});

test('media filter modes save, reload, reset and discard legacy exclusions', () => {
  const type = context.GM_config.definition.types.exclusions;
  const field = { configId: 'settings', id: 'excluded_formats', value: 'VHS, Scene', default: {} };
  const wrapper = type.toNode.call(field);
  assert.deepEqual([...type.toValue.call(field).Source.values], []);
  assert.equal('Saved custom exclusions' in type.toValue.call(field), false);
  field.node.replaceWith = (replacement) => {
    wrapper.children[0] = replacement;
  };
  type.reset.call(field);
  assert.equal(api.buildMediaFilterMatchers(type.toValue.call(field)).length, 0);
  const original = configValues.get('excluded_formats');
  try {
    configValues.set('excluded_formats', {
      Source: { mode: 'only', values: ['BluRay', 'WEB'] },
      Codec: { mode: 'ignore', values: ['H265'] }
    });
    const state = api.getDefaultAdoptionFilterState();
    api.setFilterState(state);
    api.saveAdoptionFilterSettings();
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.getDefaultAdoptionFilterState().excludedFormats)),
      JSON.parse(JSON.stringify(state.excludedFormats))
    );
    const reopened = api.createMediaFilterControl(
      context.document,
      api.getDefaultAdoptionFilterState().excludedFormats
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.readMediaFilterControl(reopened))),
      JSON.parse(JSON.stringify(state.excludedFormats))
    );
    assert.equal(api.buildExcludeRegexes(['TV'])[0].test('HDTV'), false);
  } finally {
    if (original === undefined) configValues.delete('excluded_formats');
    else configValues.set('excluded_formats', original);
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});

test('media filters combine only-show and ignore modes and skip empty groups for saved and live rows', () => {
  const filters = {
    Source: { mode: 'only', values: ['WEB', 'BluRay'] },
    Codec: { mode: 'ignore', values: ['H265'] },
    Language: { mode: 'only', values: [] }
  };
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    hideExcludedFormats: true,
    excludedFormats: filters
  };
  const matchers = api.buildMediaFilterMatchers(filters);
  for (const [metadata, hidden] of [
    ['WEB / H264', false],
    ['BluRay / H264', false],
    ['WEB / H265', true],
    ['DVD / H264', true],
    ['', true]
  ]) {
    assert.equal(api.getAdoptionFilterResult({ metadata }, '', matchers, state).hidden, hidden);
  }
  assert.equal(
    api.getAdoptionFilterResult(
      { metadata: '' },
      '',
      api.buildMediaFilterMatchers({ Source: { mode: 'only', values: [] } }),
      state
    ).hidden,
    false
  );
  const entries = ['WEB / H264', 'DVD / H264', 'WEB / H265'].map((metadata, index) => ({
    data: { torrentId: String(index), metadata }
  }));
  const partition = api.partitionFilteredScanEntries(entries, new Map(), matchers, state);
  assert.equal(partition.visibleEntries.length, 1);
  assert.equal(partition.hiddenEntries.length, 2);
  const previousRows = filterRows;
  filterRows = entries.map((entry) => createRow({ metadata: entry.data.metadata }));
  api.setFilterState(state);
  try {
    api.applyAdoptionFilters();
    assert.deepEqual(
      filterRows.map((row) => row.hidden),
      [false, true, true]
    );
  } finally {
    filterRows = previousRows;
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});

test('Show all preserves media choices when another value is selected', () => {
  let toolbar;
  const previousRows = filterRows;
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    excludedFormats: api.normalizeMediaFilters({
      Source: { mode: 'ignore', values: ['VHS'] },
      Codec: { mode: 'ignore', values: ['H265'] }
    }),
    exclusionGroups: [{ Source: { values: ['WEB'] }, Resolution: { values: ['SD'] } }],
    combineMediaFilters: true,
    hideExcludedFormats: true
  };
  const previousTarget = documentNodes.get('.thin, #content, body');
  documentNodes.set('.thin, #content, body', {
    prepend(node) {
      toolbar = node;
    }
  });
  filterRows = [];
  api.setFilterState(state);
  try {
    api.addAdoptionFilterControls();
    assert.equal(toolbar.tagName, 'details');
    assert.equal(toolbar.open, false);
    assert.equal(toolbar.children[0].tagName, 'summary');
    toolbar.open = false;
    const body = toolbar.children[1];
    const mediaSection = body.children.find((node) => node.className?.includes('ant-filter-media'));
    const control = mediaSection.children.find((node) => node.className === 'ant-media-filters');
    const actions = body.children.find((node) => node.className === 'ant-filter-actions');
    actions.children.find((node) => node.textContent === 'Show all').listeners.click();
    assert.equal(state.hideExcludedFormats, false);
    assert.equal(state.combineMediaFilters, true);
    const groupControl = mediaSection.children.find(
      (node) => node.className === 'ant-exclusion-groups'
    );
    assert.equal(api.readExclusionGroupsControl(groupControl)[0].Resolution.values[0], 'SD');
    assert.equal(state.exclusionGroups.length, 1);
    assert.equal(
      toolbar
        .querySelectorAll('input[data-filter-state]')
        .find((node) => node.dataset.filterState === 'combineMediaFilters').checked,
      true
    );
    assert.equal(
      toolbar
        .querySelectorAll('input[data-filter-state]')
        .find((node) => node.dataset.filterState === 'hideExcludedFormats').checked,
      false
    );
    assert.equal(
      toolbar
        .querySelectorAll('input[data-filter-state]')
        .some((node) => node.dataset.filterState === 'highlightRows'),
      false
    );
    assert.deepEqual([...api.readMediaFilterControl(control).Source.values], ['VHS']);
    assert.deepEqual([...api.readMediaFilterControl(control).Codec.values], ['H265']);
    const group = control.children.find((node) => node.dataset.mediaCategory === 'Resolution');
    const next = group.querySelectorAll('input').find((input) => input.value === '2160p');
    next.checked = true;
    next.listeners.change();
    assert.deepEqual([...state.excludedFormats.Source.values], ['VHS']);
    assert.deepEqual([...state.excludedFormats.Resolution.values], ['2160p']);
  } finally {
    if (previousTarget === undefined) documentNodes.delete('.thin, #content, body');
    else documentNodes.set('.thin, #content, body', previousTarget);
    filterRows = previousRows;
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});

test('does not infer seeding status from a torrent title', () => {
  assert.equal(
    api.isAdoptionRowSeeding({
      querySelector() {
        return null;
      },
      textContent: 'The Seeding (2023) 1080p'
    }),
    false
  );
  assert.equal(
    api.isAdoptionRowSeeding({
      querySelector() {
        return {};
      }
    }),
    true
  );
});

test('stores actions per torrent without overwriting other rows', () => {
  api.setTorrentAction('101', 'ignored');
  api.setTorrentAction('202', 'grabbed');
  api.setTorrentAction('101', 'grabbed');
  assert.equal(api.getTorrentAction('101'), 'grabbed');
  assert.equal(api.getTorrentAction('202'), 'grabbed');
});

test('auto-ignore applies only to complete configured searches with no eligible match', async () => {
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  assert.equal(api.getAutoquiMatchDisposition([]).state, 'no-match');
  assert.equal(
    api.getAutoquiMatchDisposition([{ downloadUrl: 'https://tracker/torrent', seeders: 4 }]).state,
    'ineligible'
  );
  assert.equal(
    api.getAutoquiMatchDisposition([{ downloadUrl: 'https://tracker/torrent', seeders: 5 }]).state,
    'eligible'
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'no-match'),
    true
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'ineligible'),
    true
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'ineligible', true),
    false
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: false, trackerCount: 1 }, 'no-match'),
    false
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 0 }, 'no-match'),
    false
  );
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'failed'),
    false
  );
  configValues.set('qui_token', '');
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'no-match'),
    false
  );
  configValues.set('qui_token', 'token');
  configValues.set('qui_auto_ignore_ungrabbed', false);
  assert.equal(
    api.shouldAutoIgnoreTrackerSearch({ complete: true, trackerCount: 1 }, 'no-match'),
    false
  );
  configValues.set('qui_auto_ignore_ungrabbed', true);

  configValues.set('use_cache', true);
  api.setTrackerResultInIndexes('Unavailable', 'Unavailable.mkv', null);
  let searchCalled = false;
  const unavailable = await api.searchScopedTrackers(
    { filename: 'Unavailable.mkv', imdbId: '' },
    '123',
    [
      {
        site: 'Unavailable',
        ready: () => false,
        search: async () => {
          searchCalled = true;
          return null;
        }
      }
    ]
  );
  assert.equal(unavailable.complete, false);
  assert.equal(unavailable.trackerCount, 1);
  assert.equal(searchCalled, false);

  configValues.set('bhd', true);
  configValues.set('bhd_api', '');
  configValues.set('bhd_rss', '');
  const bhd = api.getTrackerDefinitions().find((tracker) => tracker.site === 'BHD');
  assert.equal(bhd.ready({ filename: 'Available.mkv' }), false);
  configValues.set('bhd_api', 'api');
  configValues.set('bhd_rss', 'rss');
  assert.equal(bhd.ready({ filename: 'Available.mkv' }), true);
  assert.equal(bhd.ready({ filename: '', imdbId: 'tt1234567' }), false);
  configValues.set('bhd', false);

  configValues.set('use_cache', false);
  const searched = await api.searchScopedTrackers(
    { filename: 'Available.mkv', imdbId: 'tt1234567' },
    '123',
    [{ site: 'Available', ready: () => true, search: async () => null }]
  );
  assert.equal(searched.complete, true);
  assert.deepEqual([...searched.matches], []);

  const row = createRow();
  filterRows = [row];
  api.markAdoptionRowIgnored(row, '123');
  assert.equal(api.getTorrentAction('123'), 'ignored');
  assert.equal(row.dataset.antAdoptionAction, 'ignored');
  assert.equal(row.select.value, 'ignored');

  row.dataset.antAdoptionAction = 'grabbed';
  row.select.value = 'grabbed';
  api.setTorrentAction('123', 'grabbed');
  assert.equal(api.markAdoptionRowIgnored(row, '123'), false);
  assert.equal(api.getTorrentAction('123'), 'grabbed');

  row.dataset.antAdoptionAction = '';
  row.select.value = '';
  assert.equal(api.markAdoptionRowIgnored(row, '123'), false);
  assert.equal(api.getTorrentAction('123'), 'grabbed');
  assert.equal(row.dataset.antAdoptionAction, '');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
  configValues.set('use_cache', true);
});

test('cached under-seeded matches are auto-ignored when processed again', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const match = {
    detailsUrl: 'https://tracker/torrent/456',
    downloadUrl: 'https://tracker/download/456',
    seeders: 4,
    site: 'PTP',
    title: 'Underseeded match'
  };
  api.cacheSet(
    api.iconCacheKey('PTP', 'https://passthepopcorn.me/favicon.ico'),
    'data:image/png;base64,aWNvbg=='
  );
  api.setTrackerResultInIndexes('PTP', 'Underseeded.mkv', match);
  api.cacheRowProcessingData(
    '456',
    'Underseeded.mkv',
    [{ site: 'PTP' }],
    [],
    [match],
    '1 match',
    'done'
  );
  api.setTorrentAction('456', '');
  const row = createRow();

  api.renderCachedTrackerRow(row, '456', 'Underseeded.mkv', [{ site: 'PTP', ready: () => true }]);

  assert.equal(api.getTorrentAction('456'), 'ignored');
  assert.equal(row.dataset.antAdoptionAction, 'ignored');
  assert.equal(row.select.value, 'ignored');
  const state = findDescendantByClass(row, 'ant-cross-seed-state');
  assert.equal(state.textContent, 'ignored: no match met auto-qui requirements');
  assert.equal(state.dataset.state, 'skipped');
  const cached = api.getCachedRowProcessingData('456');
  assert.equal(cached.statusText, 'ignored: no match met auto-qui requirements');
  assert.equal(cached.statusState, 'skipped');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('fresh under-seeded matches are auto-ignored after complete tracker and qui lookups', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const torrentId = '1464';
  const filename = 'FreshUnderseeded.mkv';
  const match = {
    detailsUrl: 'https://tracker.example/torrents/1464',
    downloadUrl: 'https://tracker.example/download/1464',
    seeders: 4,
    site: 'Available',
    title: 'Fresh under-seeded match'
  };
  const tracker = {
    site: 'Available',
    ready: () => true,
    search: async () => match
  };
  const row = createBatchRow(torrentId);
  filterRows = [row];
  api.setTorrentAction(torrentId, '');
  requestResponses = [{ status: 200, responseText: '[]' }];

  await api.processRow(
    row,
    1,
    1,
    [tracker],
    {
      torrentId,
      groupId: '45',
      cachedMetadata: { filename, imdbId: 'tt1234567' },
      trackers: [tracker]
    },
    false
  );

  assert.equal(api.getTorrentAction(torrentId), 'ignored');
  assert.equal(row.dataset.antAdoptionAction, 'ignored');
  const cached = api.getCachedRowProcessingData(torrentId);
  assert.equal(cached.statusText, 'ignored: no match met auto-qui requirements');
  assert.equal(cached.statusState, 'skipped');

  filterRows = [];
  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('cached auto-ignore refreshes stale processing details while preserving qui matches', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const match = {
    detailsUrl: 'https://tracker/torrent/459',
    downloadUrl: 'https://tracker/download/459',
    seeders: 4,
    site: 'PTP',
    title: 'Current underseeded match'
  };
  api.setTrackerResultInIndexes('PTP', 'Current.mkv', match);
  api.cacheSet('row-processing-v1:459', {
    version: 1,
    torrentId: '459',
    filename: 'Current.mkv',
    trackerSites: ['HDB'],
    quiMatches: [{ name: 'Current.mkv', savePath: 'D:\\Media' }],
    trackerMatches: [{ site: 'HDB', title: 'Stale match' }],
    statusText: 'old status',
    statusState: 'done',
    quiLookupComplete: true,
    processedAt: 1
  });
  api.setTorrentAction('459', '');
  const row = createRow();

  api.renderCachedTrackerRow(row, '459', 'Current.mkv', [{ site: 'PTP', ready: () => true }]);

  const cached = api.getCachedRowProcessingData('459');
  assert.equal(cached.filename, 'Current.mkv');
  assert.deepEqual([...cached.trackerSites], ['PTP']);
  assert.equal(cached.quiMatches.length, 1);
  assert.equal(cached.quiMatches[0].name, 'Current.mkv');
  assert.equal(cached.quiMatches[0].savePath, 'D:\\Media');
  assert.equal(cached.trackerMatches.length, 1);
  assert.equal(cached.trackerMatches[0].title, 'Current underseeded match');
  assert.equal(cached.statusText, 'ignored: no match met auto-qui requirements');
  assert.equal(cached.statusState, 'skipped');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('a failed refresh cannot auto-ignore from stale cached matches', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const match = {
    detailsUrl: 'https://tracker/torrent/457',
    downloadUrl: 'https://tracker/download/457',
    seeders: 4,
    site: 'PTP',
    title: 'Stale underseeded match'
  };
  api.setTrackerResultInIndexes('PTP', 'Stale.mkv', match);
  api.setTorrentAction('457', '');
  api.cacheSet('ant-metadata-v2:457', {
    filename: 'Stale.mkv',
    imdbId: 'tt1234567'
  });
  const row = createBatchRow('457');
  const previousWarn = context.console.warn;
  context.console.warn = () => {};
  let failedRefresh;
  try {
    failedRefresh = await api.searchScopedTrackers(
      { filename: 'Stale.mkv', imdbId: 'tt1234567' },
      '457',
      [
        {
          site: 'PTP',
          ready: () => true,
          search: async () => {
            throw new Error('refresh failed');
          }
        }
      ],
      true
    );
  } finally {
    context.console.warn = previousWarn;
  }
  assert.equal(failedRefresh.complete, false);
  assert.deepEqual([...failedRefresh.matches], []);

  // processRow records attempted refreshes so later rows can advance through a limited batch.
  api.addRefreshedRowKey('457:Stale.mkv:PTP');

  const { batch, stats } = api.collectBatchRows([row], [{ site: 'PTP' }], 0, true);

  assert.deepEqual([...batch], []);
  assert.equal(stats.skippedRefreshed, 1);
  assert.equal(api.getTorrentAction('457'), '');
  assert.equal(row.dataset.antAdoptionAction, '');
  const state = findDescendantByClass(row, 'ant-cross-seed-state');
  assert.equal(state.textContent, 'cached no matches');
  assert.equal(state.dataset.state, 'none');

  const retry = api.collectBatchRows([row], [{ site: 'PTP' }], 0, false);
  assert.equal(retry.batch.length, 1);
  assert.equal(retry.stats.eligibleTotal, 1);
  assert.equal(api.getTorrentAction('457'), '');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('cached matches never auto-ignore while a scoped tracker is unavailable', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const match = {
    detailsUrl: 'https://tracker/torrent/460',
    downloadUrl: 'https://tracker/download/460',
    seeders: 4,
    site: 'Unavailable',
    title: 'Cached underseeded match'
  };
  api.setTrackerResultInIndexes('Unavailable', 'UnavailableCached.mkv', match);
  api.cacheSet('ant-metadata-v2:460', {
    filename: 'UnavailableCached.mkv',
    imdbId: 'tt1234567'
  });
  api.cacheRowProcessingData(
    '460',
    'UnavailableCached.mkv',
    [{ site: 'Unavailable' }],
    [],
    [match],
    '1 match',
    'done'
  );
  api.setTorrentAction('460', '');
  const row = createBatchRow('460');

  const { batch, stats } = api.collectBatchRows(
    [row],
    [{ site: 'Unavailable', ready: () => false }],
    0,
    false
  );

  assert.deepEqual([...batch], []);
  assert.equal(stats.skippedCached, 1);
  assert.equal(api.getTorrentAction('460'), '');
  assert.equal(row.dataset.antAdoptionAction, '');
  const state = findDescendantByClass(row, 'ant-cross-seed-state');
  assert.equal(state.textContent, 'cached 1 match');
  assert.equal(state.dataset.state, 'done');
  assert.equal(api.getCachedRowProcessingData('460').statusText, '1 match');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('unconfigured services do not block cached rows, and newly configured services are queued', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  const filename = 'OptionalServices.mkv';
  api.cacheSet('ant-metadata-v2:98220', { filename, imdbId: 'tt1234567' });
  const match = {
    site: 'PTP',
    downloadUrl: 'https://passthepopcorn.me/torrents.php?action=download&id=1',
    title: 'Cached release',
    detailsUrl: 'https://passthepopcorn.me/torrents.php?id=1',
    seeders: 3
  };
  api.setTrackerResultInIndexes('PTP', filename, match);
  let available = false;
  const trackers = [
    { site: 'PTP', ready: () => true },
    { site: 'Optional', ready: (metadata) => available && metadata.imdbId === 'tt1234567' }
  ];
  const row = createBatchRow('98220');
  assert.equal(api.collectBatchRows([row], trackers, 0).batch.length, 0);
  assert.equal(findDescendantByClass(row, 'ant-cross-seed-state').textContent, 'cached 1 match');
  available = true;
  assert.equal(api.collectBatchRows([row], trackers, 0).batch.length, 1);
  available = false;
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  assert.equal(api.collectBatchRows([row], trackers, 0).batch.length, 1);
  assert.equal(api.collectBatchRows([row], trackers, 0, true).batch.length, 1);
});

test('filename-only caches resolve metadata before skipping metadata-dependent trackers', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  const filename = 'LegacyMetadata.mkv';
  api.cacheSet('ant-filename:98223', filename);
  configValues.set('aither', true);
  configValues.set('aither_api', 'token');
  const tracker = api.getTrackerDefinitions().find((entry) => entry.site === 'Aither');
  const row = createBatchRow('98223');
  assert.equal(api.collectBatchRows([row], [tracker], 0).batch.length, 1);
  api.cacheSet('ant-metadata-v2:98223', { filename, imdbId: 'tt1234567' });
  assert.equal(api.collectBatchRows([row], [tracker], 0).batch.length, 1);
  api.setTrackerResultInIndexes(tracker.site, filename, null);
  assert.equal(api.collectBatchRows([row], [tracker], 0).batch.length, 0);
  api.cacheSet('ant-metadata-v2:98223', { filename, imdbId: '' });
  assert.equal(api.collectBatchRows([row], [tracker], 0).batch.length, 0);
  configValues.set('aither', false);
  configValues.set('aither_api', '');
});

test('unavailable trackers preserve cached matches without claiming a complete search', async () => {
  configValues.set('use_cache', true);
  const filename = 'MissingCredentials.mkv';
  const match = {
    site: 'PTP',
    downloadUrl: 'https://passthepopcorn.me/torrents.php?action=download&id=2',
    title: 'Cached release',
    detailsUrl: 'https://passthepopcorn.me/torrents.php?id=2',
    seeders: 2
  };
  api.setTrackerResultInIndexes('PTP', filename, match);
  const trackers = [
    { site: 'PTP', ready: () => false, search: () => assert.fail('must not search') }
  ];
  const result = await api.searchScopedTrackers({ filename }, '98221', trackers);
  assert.equal(result.complete, false);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].detailsUrl, match.detailsUrl);
  const refreshed = await api.searchScopedTrackers({ filename }, '98221', trackers, true);
  assert.equal(refreshed.complete, false);
  assert.equal(refreshed.matches.length, 0);
});

test('page-load display restores tracker matches without a row snapshot or credentials', () => {
  configValues.set('use_cache', true);
  configValues.set('ptp', true);
  configValues.set('ptp_api_user', '');
  configValues.set('ptp_api_key', '');
  const filename = 'IndexOnly.mkv';
  api.cacheSet('ant-metadata-v2:98222', { filename });
  api.setTrackerResultInIndexes('PTP', filename, {
    site: 'PTP',
    downloadUrl: 'https://passthepopcorn.me/torrents.php?action=download&id=3',
    title: 'Cached release',
    detailsUrl: 'https://passthepopcorn.me/torrents.php?id=3',
    seeders: 1
  });
  const row = createRestorableRow('98222');
  assert.equal(api.restoreCachedRowStatuses([row]), 1);
  assert.equal(findDescendantByClass(row, 'ant-cross-seed-state').textContent, 'cached 1 match');
  assert.equal(api.getCachedRowProcessingData('98222'), null);
  configValues.set('ptp', false);
});

test('cached tracker results without a confirmed qui lookup are queued for processing', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  api.cacheSet('ant-metadata-v2:462', {
    filename: 'UnknownQuiState.mkv',
    imdbId: 'tt1234567'
  });
  api.setTrackerResultInIndexes('Available', 'UnknownQuiState.mkv', null);
  api.cacheSet('row-processing-v1:462', {
    version: 1,
    torrentId: '462',
    filename: 'OldFilename.mkv',
    trackerSites: ['Available'],
    quiMatches: [],
    trackerMatches: [],
    statusText: 'no matches',
    statusState: 'none',
    quiLookupComplete: true,
    processedAt: 1
  });
  api.setTorrentAction('462', '');
  const row = createBatchRow('462');

  const result = api.collectBatchRows([row], [{ site: 'Available', ready: () => true }], 0, false);

  assert.equal(result.batch.length, 1);
  assert.equal(result.stats.skippedCached, 0);
  assert.equal(api.getTorrentAction('462'), '');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('a malformed cached tracker match is evicted instead of auto-ignored', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  api.cacheSet('ant-metadata-v2:1462', {
    filename: 'MalformedCachedTracker.mkv',
    imdbId: 'tt1234567'
  });
  api.cacheSet('tracker-results-v6:matches', {
    version: 6,
    sites: {
      Available: {
        'MalformedCachedTracker.mkv': {
          site: 'Available',
          seeders: 0,
          downloadUrl: {},
          title: 'Malformed cached match'
        }
      }
    }
  });
  api.cacheSet('row-complete-v3:1462:MalformedCachedTracker.mkv:Available', {
    torrentId: '1462',
    filename: 'MalformedCachedTracker.mkv',
    trackers: ['Available'],
    status: 'tracker-complete'
  });
  api.cacheRowProcessingData(
    '1462',
    'MalformedCachedTracker.mkv',
    [{ site: 'Available' }],
    [],
    [],
    'no matches',
    'none',
    true
  );
  api.setTorrentAction('1462', '');
  const row = createBatchRow('1462');

  const result = api.collectBatchRows([row], [{ site: 'Available', ready: () => true }], 0, false);

  assert.equal(result.batch.length, 1);
  assert.equal(result.stats.skippedCached, 0);
  assert.equal(api.getTorrentAction('1462'), '');
  assert.equal(
    api.cacheGet('tracker-results-v6:matches').sites?.Available?.['MalformedCachedTracker.mkv'],
    undefined
  );

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('a malformed cached tracker miss is evicted instead of auto-ignored', () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  api.cacheSet('ant-metadata-v2:1463', {
    filename: 'MalformedCachedMiss.mkv',
    imdbId: 'tt1234567'
  });
  api.cacheSet('tracker-results-v6:nulls', {
    version: 6,
    sites: { Available: { 'MalformedCachedMiss.mkv': { unexpected: true } } }
  });
  api.cacheSet('row-complete-v3:1463:MalformedCachedMiss.mkv:Available', {
    torrentId: '1463',
    filename: 'MalformedCachedMiss.mkv',
    trackers: ['Available'],
    status: 'tracker-complete'
  });
  api.cacheRowProcessingData(
    '1463',
    'MalformedCachedMiss.mkv',
    [{ site: 'Available' }],
    [],
    [],
    'no matches',
    'none',
    true
  );
  api.setTorrentAction('1463', '');
  const row = createBatchRow('1463');

  const result = api.collectBatchRows([row], [{ site: 'Available', ready: () => true }], 0, false);

  assert.equal(result.batch.length, 1);
  assert.equal(result.stats.skippedCached, 0);
  assert.equal(api.getTorrentAction('1463'), '');
  assert.equal(
    api.cacheGet('tracker-results-v6:nulls').sites?.Available?.['MalformedCachedMiss.mkv'],
    undefined
  );

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('qui zero-result responses normalize null torrents without accepting malformed shapes', async () => {
  const config = {
    baseUrl: 'http://localhost:7476',
    limit: 300,
    token: 'token'
  };
  requestResponses = [{ status: 200, responseText: JSON.stringify({ torrents: null, total: 0 }) }];
  const empty = await api.queryqui(config, 'Missing.mkv');
  assert.equal(empty.length, 0);

  requestResponses = [{ status: 200, responseText: JSON.stringify({ torrents: null, total: 1 }) }];
  await assert.rejects(api.queryqui(config, 'Malformed.mkv'), /Invalid qui response shape/);
});

test('qui job candidate search continues after a structured zero-result response', async () => {
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  requestResponses = [
    { status: 200, responseText: JSON.stringify({ torrents: null, total: 0 }) },
    {
      status: 200,
      responseText: JSON.stringify({
        torrents: [{ hash: 'candidate-hash', name: 'Candidate.mkv' }],
        total: 1
      })
    },
    { status: 200, responseText: JSON.stringify({ torrents: null, total: 0 }) }
  ];

  const candidates = await api.searchquiJobCandidates({
    filename: 'Candidate.mkv',
    title: 'Candidate.mkv'
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].hash, 'candidate-hash');
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('other-site polling backs off every minute, caps at one minute, and does not reset for a row run', async () => {
  const previousRows = filterRows;
  const previousNow = nowOverride;
  const previousBase = configValues.get('qui_base_url');
  configValues.set('qui_base_url', '');
  api.clearquiAddJobs();
  api.setquiAddJob('backoff', { progress: 0, state: 'downloading' });
  nowOverride = 1000;
  try {
    api.startquiAddPolling();
    await new Promise(setImmediate);
    assert.equal(scheduledTimeouts.at(-1).delay, 5000);
    const timerCount = scheduledTimeouts.length;
    api.startquiAddPolling();
    assert.equal(scheduledTimeouts.length, timerCount);
    for (const [elapsed, expected] of [
      [5000, 5000],
      [59000, 5000],
      [60000, 10000],
      [119999, 10000],
      [120000, 15000],
      [600000, 55000],
      [660000, 60000],
      [1200000, 60000]
    ]) {
      nowOverride = 1000 + elapsed;
      await scheduledTimeouts.at(-1).callback();
      assert.equal(scheduledTimeouts.at(-1).delay, expected);
    }
    const oldTimer = scheduledTimeouts.at(-1);
    filterRows = [];
    await api.run();
    await new Promise(setImmediate);
    assert.equal(oldTimer.cancelled, undefined);
    assert.equal(scheduledTimeouts.at(-1), oldTimer);
    api.startquiAddPolling(true);
    await new Promise(setImmediate);
    assert.equal(oldTimer.cancelled, true);
    assert.equal(scheduledTimeouts.at(-1).delay, 5000);
    const resetCount = scheduledTimeouts.length;
    await oldTimer.callback();
    assert.equal(scheduledTimeouts.length, resetCount);
    api.getquiAddJob('backoff').error = 'stopped';
    await scheduledTimeouts.at(-1).callback();
    assert.equal(scheduledTimeouts.length, resetCount);
  } finally {
    api.stopquiAddPolling();
    api.clearquiAddJobs();
    filterRows = previousRows;
    nowOverride = previousNow;
    if (previousBase === undefined) configValues.delete('qui_base_url');
    else configValues.set('qui_base_url', previousBase);
  }
});

test('resetting polling during an outstanding request keeps the new schedule', async () => {
  const previousRequest = context.GM_xmlhttpRequest;
  const previousRows = filterRows;
  const previousBase = configValues.get('qui_base_url');
  const previousToken = configValues.get('qui_token');
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  let request;
  context.GM_xmlhttpRequest = (options) => {
    request = options;
  };
  api.clearquiAddJobs();
  api.setquiAddJob('pending-request', { progress: 0, state: 'downloading' });
  try {
    api.schedulequiAddPolling(Date.now() - 660000);
    const oldTimer = scheduledTimeouts.at(-1);
    const pendingPoll = oldTimer.callback();
    assert.ok(request);
    api.startquiAddPolling(true);
    const newTimer = scheduledTimeouts.at(-1);
    assert.equal(oldTimer.cancelled, true);
    assert.equal(newTimer.delay, 5000);
    const timerCount = scheduledTimeouts.length;
    request.onload({ status: 200, responseText: '[]' });
    await pendingPoll;
    assert.equal(scheduledTimeouts.length, timerCount);
    assert.equal(newTimer.cancelled, undefined);
    configValues.set('qui_base_url', '');
    await newTimer.callback();
    assert.equal(scheduledTimeouts.at(-1).delay, 5000);
    api.clearquiAddJobs();
    const finalCount = scheduledTimeouts.length;
    await scheduledTimeouts.at(-1).callback();
    assert.equal(scheduledTimeouts.length, finalCount);
  } finally {
    api.stopquiAddPolling();
    api.clearquiAddJobs();
    context.GM_xmlhttpRequest = previousRequest;
    filterRows = previousRows;
    if (previousBase === undefined) configValues.delete('qui_base_url');
    else configValues.set('qui_base_url', previousBase);
    if (previousToken === undefined) configValues.delete('qui_token');
    else configValues.set('qui_token', previousToken);
  }
});

test('only a successful new other-site submission resets polling', async () => {
  const previousRequest = context.GM_xmlhttpRequest;
  const previousBase = configValues.get('qui_base_url');
  const previousToken = configValues.get('qui_token');
  configValues.set('qui_base_url', 'http://localhost:7476/api/v2');
  configValues.set('qui_token', 'token');
  let postStatus = 200;
  let posts = 0;
  context.GM_xmlhttpRequest = (options) => {
    if (options.method === 'POST') posts += 1;
    queueMicrotask(() =>
      options.onload({ status: options.method === 'POST' ? postStatus : 200, responseText: '[]' })
    );
  };
  const monitor = context.document.createElement('div');
  monitor.scrollIntoView = () => {};
  const row = createRow();
  row.dataset.antCrossSeedTorrentId = '123';
  row.querySelector = (selector) => (selector === '.ant-cross-seed-qui-monitor' ? monitor : null);
  const button = { dataset: {} };
  const match = { site: 'Example', downloadUrl: 'https://tracker.example/download/1' };
  api.clearquiAddJobs();
  api.setquiAddJob('existing', { progress: 0, state: 'downloading' });
  try {
    api.schedulequiAddPolling(Date.now() - 660000);
    const slowTimer = scheduledTimeouts.at(-1);
    assert.equal(await api.addTrackerMatchToqui(row, 'Example.mkv', match, button), true);
    await new Promise(setImmediate);
    assert.equal(slowTimer.cancelled, true);
    const freshTimer = scheduledTimeouts.at(-1);
    assert.equal(freshTimer.delay, 5000);
    const submittedPosts = posts;
    assert.equal(await api.addTrackerMatchToqui(row, 'Example.mkv', match, button), true);
    assert.equal(posts, submittedPosts);
    assert.equal(scheduledTimeouts.at(-1), freshTimer);
    postStatus = 500;
    assert.equal(
      await api.addTrackerMatchToqui(
        row,
        'Failed.mkv',
        { ...match, downloadUrl: 'https://tracker.example/download/2' },
        button
      ),
      false
    );
    assert.equal(freshTimer.cancelled, undefined);
    assert.equal(scheduledTimeouts.at(-1), freshTimer);
    postStatus = 200;
    assert.equal(
      await api.addTrackerMatchToqui(
        row,
        'Auto.mkv',
        { ...match, downloadUrl: 'https://tracker.example/download/3' },
        button,
        true
      ),
      true
    );
    await new Promise(setImmediate);
    assert.equal(freshTimer.cancelled, true);
    assert.equal(scheduledTimeouts.at(-1).delay, 5000);
  } finally {
    api.stopquiAddPolling();
    api.clearquiAddJobs();
    context.GM_xmlhttpRequest = previousRequest;
    if (previousBase === undefined) configValues.delete('qui_base_url');
    else configValues.set('qui_base_url', previousBase);
    if (previousToken === undefined) configValues.delete('qui_token');
    else configValues.set('qui_token', previousToken);
  }
});

test('one malformed qui monitor response does not block later jobs in the same poll', async () => {
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  api.clearquiAddJobs();
  api.setquiAddJob('broken-job', {
    filename: 'Broken.mkv',
    progress: 0,
    row: createRow(),
    site: 'Broken',
    state: 'downloading',
    title: 'Broken.mkv'
  });
  api.setquiAddJob('working-job', {
    filename: 'Working.mkv',
    hash: 'working-hash',
    progress: 0,
    row: createRow(),
    site: 'Working',
    state: 'downloading',
    title: 'Working.mkv'
  });
  requestResponses = [
    { status: 200, responseText: JSON.stringify({ error: 'maintenance' }) },
    {
      status: 200,
      responseText: JSON.stringify({
        torrents: [
          {
            hash: 'working-hash',
            name: 'Working.mkv',
            progress: 0.5,
            state: 'downloading'
          }
        ],
        total: 1
      })
    },
    { status: 200, responseText: JSON.stringify({ torrents: null, total: 0 }) },
    { status: 200, responseText: JSON.stringify({ torrents: null, total: 0 }) }
  ];

  const previousWarn = context.console.warn;
  context.console.warn = () => {};
  try {
    await api.pollquiAddJobs();
  } finally {
    context.console.warn = previousWarn;
  }

  assert.equal(api.getquiAddJob('working-job').status, 'Added');
  assert.equal(api.getquiAddJob('working-job').progress, 50);
  assert.equal(api.getquiAddJob('broken-job').status, undefined);
  api.clearquiAddJobs();
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('a wrong-typed qui torrent entry cannot auto-ignore after a complete tracker search', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_auto_add_min_seeders', 5);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const tracker = {
    site: 'Available',
    ready: () => true,
    search: async () => null
  };
  const row = createBatchRow('461');
  api.cacheSet('ant-metadata-v2:461', {
    filename: 'QuiFailure.mkv',
    imdbId: 'tt1234567'
  });
  api.setTorrentAction('461', '');
  requestResponses = [{ status: 200, responseText: '[{"name":{}}]' }];
  const previousWarn = context.console.warn;
  context.console.warn = () => {};
  try {
    await api.processRow(
      row,
      1,
      1,
      [tracker],
      {
        torrentId: '461',
        groupId: '45',
        cachedMetadata: { filename: 'QuiFailure.mkv', imdbId: 'tt1234567' },
        trackers: [tracker]
      },
      false
    );
  } finally {
    context.console.warn = previousWarn;
  }

  assert.equal(api.getTorrentAction('461'), '');
  assert.equal(row.dataset.antAdoptionAction, '');
  const cached = api.getCachedRowProcessingData('461');
  assert.equal(cached.statusText, 'no matches');
  assert.equal(cached.statusState, 'none');
  assert.equal(cached.quiLookupComplete, false);

  const retry = api.collectBatchRows([row], [tracker], 0, false);
  assert.equal(retry.batch.length, 1);
  assert.equal(retry.stats.skippedCached, 0);
  assert.equal(api.getTorrentAction('461'), '');

  requestResponses = [{ status: 200, responseText: '[]' }];
  await api.processRow(row, 1, 1, [tracker], retry.batch[0], false);
  assert.equal(api.getTorrentAction('461'), 'ignored');
  assert.equal(api.getCachedRowProcessingData('461').quiLookupComplete, true);

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('a malformed cached qui result is evicted and retried before auto-ignore', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');

  const tracker = {
    site: 'Available',
    ready: () => true,
    search: async () => null
  };
  const row = createBatchRow('1461');
  const metadata = { filename: 'MalformedCachedQui.mkv', imdbId: 'tt1234567' };
  api.cacheSet('ant-metadata-v2:1461', metadata);
  api.cacheSet('qui-result:MalformedCachedQui.mkv', [{ name: {} }]);
  api.setTorrentAction('1461', '');

  const previousWarn = context.console.warn;
  context.console.warn = () => {};
  try {
    await api.processRow(
      row,
      1,
      1,
      [tracker],
      {
        torrentId: '1461',
        groupId: '45',
        cachedMetadata: metadata,
        trackers: [tracker]
      },
      false
    );
  } finally {
    context.console.warn = previousWarn;
  }

  assert.equal(api.getTorrentAction('1461'), '');
  assert.equal(api.cacheGet('qui-result:MalformedCachedQui.mkv', 'missing'), 'missing');
  assert.equal(api.getCachedRowProcessingData('1461').quiLookupComplete, false);
  const retry = api.collectBatchRows([row], [tracker], 0, false);
  assert.equal(retry.batch.length, 1);

  requestResponses = [{ status: 200, responseText: '[]' }];
  await api.processRow(row, 1, 1, [tracker], retry.batch[0], false);
  assert.equal(api.getTorrentAction('1461'), 'ignored');
  assert.equal(api.getCachedRowProcessingData('1461').quiLookupComplete, true);

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('processing without qui configuration stays retryable after configuration is added', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_auto_add_site_torrent', true);
  configValues.set('qui_auto_ignore_ungrabbed', true);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');

  const tracker = {
    site: 'Available',
    ready: () => true,
    search: async () => null
  };
  const row = createBatchRow('463');
  api.cacheSet('ant-metadata-v2:463', {
    filename: 'MissingQuiConfig.mkv',
    imdbId: 'tt1234567'
  });
  api.setTorrentAction('463', '');

  await api.processRow(
    row,
    1,
    1,
    [tracker],
    {
      torrentId: '463',
      groupId: '45',
      cachedMetadata: { filename: 'MissingQuiConfig.mkv', imdbId: 'tt1234567' },
      trackers: [tracker]
    },
    false
  );

  assert.equal(api.getTorrentAction('463'), '');
  assert.equal(api.getCachedRowProcessingData('463').quiLookupComplete, false);

  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  const retry = api.collectBatchRows([row], [tracker], 0, false);
  assert.equal(retry.batch.length, 1);
  assert.equal(retry.stats.skippedCached, 0);
  assert.equal(api.getTorrentAction('463'), '');

  configValues.set('qui_auto_add_site_torrent', false);
  configValues.set('qui_auto_ignore_ungrabbed', false);
});

test('forced refresh skips fully completed rows before auto-ignore processing', () => {
  configValues.set('use_cache', true);
  api.cacheSet('ant-metadata-v2:458', {
    filename: 'Complete.mkv',
    imdbId: 'tt1234567'
  });
  api.cacheSet('row-complete-v3:458:Complete.mkv:PTP', {
    torrentId: '458',
    filename: 'Complete.mkv',
    trackers: ['PTP'],
    status: 'fully-completed',
    reason: 'manual-ant-added',
    completedAt: Date.now()
  });
  api.setTorrentAction('458', '');
  const row = createBatchRow('458');

  const { batch, stats } = api.collectBatchRows([row], [{ site: 'BHD' }], 0, true);

  assert.deepEqual([...batch], []);
  assert.equal(stats.skippedCached, 1);
  assert.equal(stats.eligibleTotal, 0);
  assert.equal(api.getTorrentAction('458'), '');
  assert.equal(row.dataset.antAdoptionAction, '');
  const state = findDescendantByClass(row, 'ant-cross-seed-state');
  assert.equal(state.textContent, 'completed: ANT submitted to qui');
  assert.equal(state.dataset.state, 'done');
  assert.equal(api.cacheGet('row-fully-completed-v1:458:Complete.mkv').status, 'fully-completed');
});

test('a successful ANT submission with no scoped trackers stays terminal across later scopes', () => {
  configValues.set('use_cache', true);
  const submittedRow = createRestorableRow('1460');
  submittedRow.dataset.antCrossSeedTorrentId = '1460';
  submittedRow.dataset.antCrossSeedFilename = 'NoScopedTrackers.mkv';
  submittedRow.dataset.antCrossSeedTrackerSites = '';

  assert.equal(
    api.markRowProcessingComplete(submittedRow, 'NoScopedTrackers.mkv', 'manual-ant-added'),
    true
  );
  assert.equal(
    api.cacheGet('row-fully-completed-v1:1460:NoScopedTrackers.mkv').status,
    'fully-completed'
  );

  api.cacheSet('ant-metadata-v2:1460', {
    filename: 'NoScopedTrackers.mkv',
    imdbId: 'tt1234567'
  });
  const laterRow = createBatchRow('1460');
  const { batch, stats } = api.collectBatchRows(
    [laterRow],
    [{ site: 'LaterTracker', ready: () => true }],
    0,
    false
  );

  assert.deepEqual([...batch], []);
  assert.equal(stats.skippedCached, 1);
  assert.equal(stats.eligibleTotal, 0);
  assert.equal(api.getTorrentAction('1460'), '');
  assert.equal(
    findDescendantByClass(laterRow, 'ant-cross-seed-state').textContent,
    'completed: ANT submitted to qui'
  );
});

test('cleaning site lookup cache removes current and legacy tracker result indexes', () => {
  configValues.set('use_cache', true);
  api.cacheSet('tracker-results-v6:nulls', { sites: { HDB: { 'Current.mkv': true } } });
  api.cacheSet('tracker-results-v6:matches', { sites: { BHD: { 'Current.mkv': {} } } });
  api.cacheSet('tracker-results-v5:nulls', { sites: { HDB: { 'Previous.mkv': true } } });
  api.cacheSet('tracker-results-v4:nulls', { sites: { HDB: { 'Legacy.mkv': true } } });
  api.cacheSet('row-fully-completed-v1:999:Complete.mkv', { status: 'fully-completed' });
  api.cacheSet('ant-metadata-v2:keep', { filename: 'Keep.mkv' });

  api.cleanSiteLookupCache();

  assert.equal(api.cacheGet('tracker-results-v6:nulls', 'missing'), 'missing');
  assert.equal(api.cacheGet('tracker-results-v6:matches', 'missing'), 'missing');
  assert.equal(api.cacheGet('tracker-results-v5:nulls', 'missing'), 'missing');
  assert.equal(api.cacheGet('tracker-results-v4:nulls', 'missing'), 'missing');
  assert.equal(api.cacheGet('row-fully-completed-v1:999:Complete.mkv', 'missing'), 'missing');
  assert.equal(api.cacheGet('ant-metadata-v2:keep').filename, 'Keep.mkv');
});

test('previous tracker misses are rebuilt and then read from the current cache', async () => {
  configValues.set('use_cache', true);
  const filename = 'NeedsFreshLookup.mkv';
  const site = 'LegacyOnly';
  api.cacheSet('tracker-results-v5:nulls', { sites: { [site]: { [filename]: true } } });
  let searchCount = 0;
  const tracker = {
    site,
    ready: () => true,
    search: async () => {
      searchCount += 1;
      return null;
    }
  };

  const first = await api.searchScopedTrackers({ filename }, 'legacy-cache-test', [tracker]);
  const second = await api.searchScopedTrackers({ filename }, 'legacy-cache-test', [tracker]);

  assert.equal(first.complete, true);
  assert.equal(second.complete, true);
  assert.equal(searchCount, 1);
  assert.equal(api.cacheGet('tracker-results-v6:nulls').sites[site][filename], true);
});

test('tracker adapters reject wrong-shape HTTP 200 responses', async () => {
  configValues.set('aither', true);
  configValues.set('aither_api', 'unit3d-token');
  configValues.set('bhd', true);
  configValues.set('bhd_api', 'bhd-api');
  configValues.set('bhd_rss', 'bhd-rss');
  configValues.set('hdb', true);
  configValues.set('hdb_user', 'hdb-user');
  configValues.set('hdb_pass', 'hdb-pass');
  configValues.set('ptp', true);
  configValues.set('ptp_api_user', 'ptp-user');
  configValues.set('ptp_api_key', 'ptp-key');

  const metadata = {
    filename: 'WrongShape.mkv',
    imdbId: 'tt1234567',
    files: [{ name: 'WrongShape.mkv' }]
  };
  try {
    requestResponses.push({ status: 200, responseText: '{"error":"maintenance"}' });
    await assert.rejects(
      api.searchUnit3dTracker(
        { key: 'aither', site: 'Aither', baseUrl: 'https://aither.cc' },
        metadata
      ),
      /Aither returned an invalid search response/
    );

    requestResponses.push({ status: 200, responseText: '{"error":"maintenance"}' });
    await assert.rejects(api.searchBhd(metadata), /BHD returned an invalid search response/);

    requestResponses.push({ status: 200, responseText: '{"error":"maintenance"}' });
    await assert.rejects(api.searchHdb(metadata), /HDB returned an invalid search response/);

    requestResponses.push({ status: 200, responseText: '{"error":"maintenance"}' });
    await assert.rejects(api.searchPtp(metadata), /PTP returned an invalid search response/);

    requestResponses.push({
      status: 200,
      responseText: '{"data":[{"attributes":{"name":"WrongShape.mkv"}}]}'
    });
    await assert.rejects(
      api.searchUnit3dTracker(
        { key: 'aither', site: 'Aither', baseUrl: 'https://aither.cc' },
        metadata
      ),
      /Aither returned an invalid torrent entry/
    );

    requestResponses.push({ status: 200, responseText: '{"results":[{}]}' });
    await assert.rejects(api.searchBhd(metadata), /BHD returned an invalid torrent entry/);

    requestResponses.push({ status: 200, responseText: '{"data":[{}]}' });
    await assert.rejects(api.searchHdb(metadata), /HDB returned an invalid torrent entry/);

    requestResponses.push({
      status: 200,
      responseText:
        '{"GroupId":"1","Torrents":[{"ReleaseName":"WrongShape.mkv"}],"AuthKey":"a","PassKey":"p"}'
    });
    await assert.rejects(api.searchPtp(metadata), /PTP returned an invalid torrent entry/);
  } finally {
    configValues.set('aither', false);
    configValues.set('aither_api', '');
    configValues.set('bhd', false);
    configValues.set('bhd_api', '');
    configValues.set('bhd_rss', '');
    configValues.set('hdb', false);
    configValues.set('hdb_user', '');
    configValues.set('hdb_pass', '');
    configValues.set('ptp', false);
    configValues.set('ptp_api_user', '');
    configValues.set('ptp_api_key', '');
  }
});

test('BHD searches the internal torrent filename instead of IMDb or the torrent root name', async () => {
  configValues.set('bhd', true);
  configValues.set('bhd_api', 'test-api-key');
  configValues.set('bhd_rss', 'test-rss-key');
  const requestCount = requestedOptions.length;
  const filename = 'Fried.Green.Tomatoes.1991.720p.BluRay.FLAC2.0.x264-DON.mkv';
  requestResponses.push({
    status: 200,
    responseText: JSON.stringify({
      results: [
        {
          name: 'Fried Green Tomatoes 1991 720p BluRay FLAC2.0 x264-DON',
          seeders: 18,
          download_url: 'https://beyond-hd.me/torrents/download/123',
          url: 'https://beyond-hd.me/torrents/123'
        }
      ]
    })
  });

  const match = await api.searchBhd({ filename, imdbId: 'tt0101921' });
  const request = requestedOptions[requestCount];
  const payload = JSON.parse(request.data);

  assert.equal(payload.file_name, filename);
  assert.equal('imdb_id' in payload, false);
  assert.equal(match.site, 'BHD');
  assert.equal(match.seeders, 18);
  assert.equal(match.detailsUrl, 'https://beyond-hd.me/torrents/123');

  configValues.set('bhd', false);
  configValues.set('bhd_api', '');
  configValues.set('bhd_rss', '');
});

test('HDB searches only the internal torrent file path instead of IMDb or the torrent root name', async () => {
  configValues.set('hdb', true);
  configValues.set('hdb_user', 'test-user');
  configValues.set('hdb_pass', 'test-passkey');
  const requestCount = requestedOptions.length;
  const filename = 'Fried.Green.Tomatoes.1991.720p.BluRay.FLAC2.0.x264-DON.mkv';
  const hdb = api.getTrackerDefinitions().find((tracker) => tracker.site === 'HDB');
  assert.equal(hdb.ready({ filename: '', imdbId: 'tt0101921' }), false);
  assert.equal(hdb.ready({ filename }), true);
  assert.equal(await api.searchHdb({ filename: '' }), null);
  assert.equal(requestedOptions.length, requestCount);
  requestResponses.push({
    status: 200,
    responseText: JSON.stringify({
      status: 0,
      data: [
        {
          id: 163826,
          filename: 'Fried.Green.Tomatoes.1991.720p.BluRay.FLAC2.0.x264-DON.torrent',
          name: 'Fried Green Tomatoes 1991 720p BluRay FLAC2.0 x264-DON',
          seeders: 21
        }
      ]
    })
  });

  const match = await api.searchHdb({
    filename,
    files: [{ name: filename }]
  });
  const request = requestedOptions[requestCount];
  const payload = JSON.parse(request.data);

  assert.equal(payload.file_in_torrent, filename);
  assert.equal('imdb' in payload, false);
  assert.equal(match.site, 'HDB');
  assert.equal(match.seeders, 21);
  assert.equal(match.detailsUrl, 'https://hdbits.org/details.php?id=163826');

  configValues.set('hdb', false);
  configValues.set('hdb_user', '');
  configValues.set('hdb_pass', '');
});

test('an auto-qui completion opens the ANT adoption-ready page only once', async () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Example.mkv',
    groupId: '456',
    torrentId: '123',
    site: 'ExampleTracker'
  };
  const readyUrl = api.buildAdoptionReadyUrl(job);
  assert.match(readyUrl, /torrents\.php\?id=456/);
  assert.match(readyUrl, /torrentid=123/);
  assert.match(readyUrl, /ant_adoption_ready=1/);

  const initialCount = openedTabs.length;
  const initialTimerCount = scheduledTimeouts.length;
  assert.equal(api.scheduleAdoptionReadyPage('job-key', job), true);
  assert.equal(api.scheduleAdoptionReadyPage('job-key', job), false);
  assert.equal(openedTabs.length, initialCount);
  assert.equal(scheduledTimeouts.length, initialTimerCount + 1);
  assert.equal(scheduledTimeouts.at(-1).delay, 70000);
  await scheduledTimeouts.at(-1).callback();
  assert.equal(openedTabs.length, initialCount + 1);
  assert.match(openedTabs.at(-1).url, /ant_adoption_token=test-token-/);
  assert.equal(await api.openAdoptionReadyPage('job-key', job), false);
  assert.equal(openedTabs.length, initialCount + 1);
  assert.equal(openedTabs.at(-1).options.active, true);
  assert.equal(api.getActiveAdoptionReadyFlow().token, job.adoptionReadyToken);
  assert.equal(
    await api.openAdoptionReadyPage('manual-job', {
      ...job,
      autoAdded: false,
      adoptionPageOpened: false
    }),
    false
  );
  assert.equal(openedTabs.length, initialCount + 1);
  assert.equal(await api.releaseAdoptionReadyFlow(job.adoptionReadyToken), true);

  const failedJob = {
    ...job,
    adoptionReadyToken: '',
    adoptionPageOpened: false,
    groupId: '789',
    torrentId: '124'
  };
  openTabError = new Error('tab open failed');
  assert.equal(await api.openAdoptionReadyPage('failed-job', failedJob), false);
  assert.equal(failedJob.adoptionPageOpened, false);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);
  openTabError = null;
  configValues.set('qui_auto_trigger_adoption', false);
});

test('ready pages open serially while another page still owns the adoption flow', async () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const firstJob = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'First.mkv',
    groupId: '500',
    torrentId: '150',
    site: 'ExampleTracker'
  };
  const secondJob = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Second.mkv',
    groupId: '501',
    torrentId: '151',
    site: 'ExampleTracker'
  };
  const initialOpenCount = openedTabs.length;

  api.scheduleAdoptionReadyPage('serial-first', firstJob);
  const firstOpenTimer = scheduledTimeouts.at(-1);
  api.scheduleAdoptionReadyPage('serial-second', secondJob);
  const secondOpenTimer = scheduledTimeouts.at(-1);

  await Promise.all([firstOpenTimer.callback(), secondOpenTimer.callback()]);
  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(firstJob.adoptionPageOpened, true);
  assert.equal(secondJob.adoptionPageOpened, false);
  assert.equal(api.getActiveAdoptionReadyFlow().token, firstJob.adoptionReadyToken);
  const secondRetryTimer = scheduledTimeouts.at(-1);
  assert.equal(secondRetryTimer.delay, 10000);

  await api.releaseAdoptionReadyFlow(firstJob.adoptionReadyToken);
  await secondRetryTimer.callback();
  assert.equal(openedTabs.length, initialOpenCount + 2);
  assert.equal(secondJob.adoptionPageOpened, true);
  assert.equal(api.getActiveAdoptionReadyFlow().token, secondJob.adoptionReadyToken);
  await api.releaseAdoptionReadyFlow(secondJob.adoptionReadyToken);
  configValues.set('qui_auto_trigger_adoption', false);
});

test('manual adoption mode opens immediately without flow ownership or qui polling', () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  configValues.set('qui_auto_trigger_adoption', false);
  const row = createRow();
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Manual.mkv',
    followUpStatus: '',
    groupId: '503',
    progress: 100,
    row,
    site: 'ExampleTracker',
    state: 'complete',
    torrentId: '165'
  };
  api.setquiAddJob('manual-ready-job', job);
  const initialOpenCount = openedTabs.length;
  const initialTimerCount = scheduledTimeouts.length;
  const initialRequestCount = requestedUrls.length;
  const pagehideCount = globalEventListeners.get('pagehide')?.length || 0;

  api.handleCompletedquiAddJob('manual-ready-job', job);
  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(job.adoptionPageOpened, true);
  assert.equal(job.followUpScheduled, undefined);
  assert.equal(scheduledTimeouts.length, initialTimerCount);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  context.location.href = openedTabs.at(-1).url;
  assert.equal(api.initializeAdoptionReadyView(), true);
  assert.equal(scheduledTimeouts.length, initialTimerCount);
  assert.equal(requestedUrls.length, initialRequestCount);
  assert.equal(globalEventListeners.get('pagehide')?.length || 0, pagehideCount);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('switching to manual mode while an automatic flow claim awaits releases the claim', async () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Claim switch.mkv',
    groupId: '507',
    site: 'ExampleTracker',
    torrentId: '170'
  };
  const initialOpenCount = openedTabs.length;
  const initialTimerCount = scheduledTimeouts.length;

  const openPromise = api.openAdoptionReadyPage('claim-switch-job', job);
  configValues.set('qui_auto_trigger_adoption', false);
  assert.equal(await openPromise, true);
  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(job.adoptionPageOpened, true);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);
  assert.equal(scheduledTimeouts.length, initialTimerCount);
});

test('switching to manual mode while a blocked flow claim awaits opens without retrying', async () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const owner = {
    adoptionReadyToken: 'claim-switch-owner-token',
    filename: 'Existing owner.mkv',
    torrentId: '172'
  };
  assert.equal(await api.claimAdoptionReadyFlow(owner), true);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Blocked claim switch.mkv',
    groupId: '509',
    site: 'ExampleTracker',
    torrentId: '173'
  };
  const initialOpenCount = openedTabs.length;
  const initialTimerCount = scheduledTimeouts.length;

  const openPromise = api.openAdoptionReadyPage('blocked-claim-switch-job', job);
  configValues.set('qui_auto_trigger_adoption', false);
  assert.equal(await openPromise, true);
  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(job.adoptionPageOpened, true);
  assert.equal(api.getActiveAdoptionReadyFlow().token, owner.adoptionReadyToken);
  assert.equal(scheduledTimeouts.length, initialTimerCount);

  assert.equal(await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken), true);
});

test('a page switched to manual mode after opening releases its automatic flow', async () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  configValues.set('qui_auto_trigger_adoption', true);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Initialize switch.mkv',
    groupId: '508',
    site: 'ExampleTracker',
    torrentId: '171'
  };
  const initialRequestCount = requestedUrls.length;
  const initialTimerCount = scheduledTimeouts.length;
  const pagehideCount = globalEventListeners.get('pagehide')?.length || 0;

  assert.equal(await api.openAdoptionReadyPage('initialize-switch-job', job), true);
  assert.equal(api.getActiveAdoptionReadyFlow().token, job.adoptionReadyToken);
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = openedTabs.at(-1).url;
  flowGetValueFailuresRemaining = 1;
  assert.equal(api.initializeAdoptionReadyView(), true);
  await webLockTail;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(api.getActiveAdoptionReadyFlow().token, job.adoptionReadyToken);
  assert.equal(requestedUrls.length, initialRequestCount);
  assert.equal(scheduledTimeouts.length, initialTimerCount + 1);
  const releaseRetry = scheduledTimeouts.at(-1);
  assert.equal(releaseRetry.delay, 10000);
  await releaseRetry.callback();
  assert.equal(api.getActiveAdoptionReadyFlow(), null);
  assert.equal(globalEventListeners.get('pagehide')?.length || 0, pagehideCount);

  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('switching to manual mode cancels a pending qui follow-up without polling', () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const job = {
    error: '',
    filename: 'Cancel follow-up.mkv',
    followUpScheduled: false,
    followUpStatus: '',
    progress: 100,
    row: createRow(),
    site: 'ExampleTracker',
    state: 'complete'
  };
  api.setquiAddJob('cancel-follow-up-job', job);
  const requestCount = requestedUrls.length;
  api.schedulequiCrossSeedFollowup('cancel-follow-up-job');
  const followUpTimer = scheduledTimeouts.at(-1);
  assert.equal(job.followUpStatus, 'pending');

  configValues.set('qui_auto_trigger_adoption', false);
  followUpTimer.callback();
  assert.equal(requestedUrls.length, requestCount);
  assert.equal(job.followUpScheduled, false);
  assert.equal(job.followUpStatus, '');
  assert.equal(job.followUpRunAt, 0);
});

test('ANT follow-up targets the containing directory with companion files in the source torrent', async () => {
  assert.equal(
    api.getAntCrossSeedSavePath(
      {
        contentPath: 'D:\\Media\\Example.mkv',
        raw: { files: [{ name: 'Example.mkv' }] },
        savePath: 'D:\\Media'
      },
      'Example.mkv'
    ),
    'D:\\Media'
  );
  assert.equal(
    api.getAntCrossSeedSavePath(
      {
        contentPath: 'D:\\Media\\Release.Folder',
        raw: { files: [{ name: 'Release.Folder\\Example.mkv' }] },
        savePath: 'D:\\Media'
      },
      'Example.mkv'
    ),
    'D:\\Media\\Release.Folder'
  );

  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const job = {
    error: '',
    filename: 'Example.mkv',
    followUpRunAt: 0,
    followUpScheduled: true,
    followUpStatus: 'pending',
    hash: 'source-layout-hash',
    progress: 100,
    row: createRestorableRow('123'),
    savePath: 'D:\\Media',
    site: 'ExampleTracker',
    sourceContentPath: 'D:\\Media\\Release.Folder',
    sourceSavePath: 'D:\\Media',
    state: 'complete'
  };
  api.setquiAddJob('layout-follow-up-job', job);
  const requestCount = requestedUrls.length;
  const optionCount = requestedOptions.length;
  requestResponses = [
    { status: 200, responseText: '[]' },
    { status: 200, responseText: '[]' },
    {
      status: 200,
      responseText: JSON.stringify([
        { name: 'Release.Folder\\Example.idx' },
        { name: 'Release.Folder\\Example.mkv' },
        { name: 'Release.Folder\\Example.sub' }
      ])
    },
    { status: 200, responseText: '' }
  ];

  await api.runquiCrossSeedFollowup('layout-follow-up-job');

  assert.equal(job.followUpStatus, 'added', job.followUpError);
  assert.equal(requestedUrls.length, requestCount + 4);
  assert.match(requestedUrls[requestCount + 2], /torrents\/files\?hash=source-layout-hash$/);
  assert.equal(job.followUpSavePath, 'D:\\Media\\Release.Folder');
  const addRequest = requestedOptions[optionCount + 3];
  assert.equal(addRequest.method, 'POST');
  assert.deepEqual(
    addRequest.data.entries.find(([name]) => name === 'savepath'),
    ['savepath', 'D:\\Media\\Release.Folder']
  );

  configValues.set('qui_auto_trigger_adoption', false);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('ANT save path uses the source folder only with matching video evidence', () => {
  const release = 'Shaun.the.Sheep.Movie.2015.720p.BluRay.X264-AMIABLE';
  const source = {
    contentPath: `D:\\Movies\\${release}`,
    savePath: 'D:\\Movies',
    raw: {
      files: ['idx', 'mkv', 'sub'].map((extension) => ({
        name: `${release}/${release}.${extension}`
      }))
    }
  };
  assert.equal(api.getAntCrossSeedSavePath(source, `${release}.mkv`), source.contentPath);
  assert.equal(api.getAntCrossSeedSavePath(source, 'Different.mkv'), source.savePath);
});

test('switching to manual mode during a ready-page search prevents file polling', async () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?id=506&torrentid=169&ant_adoption_ready=1';
  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const readyMarker = {
    filename: 'Search cancellation.mkv',
    token: 'search-cancellation-token',
    torrentId: '169'
  };
  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );
  const requestCount = requestedUrls.length;
  requestResponses = [
    {
      beforeResponse() {
        configValues.set('qui_auto_trigger_adoption', false);
      },
      status: 200,
      responseText: JSON.stringify([
        {
          hash: 'search-cancellation-hash',
          name: readyMarker.filename,
          save_path: 'D:\\Media',
          state: 'stalledUP',
          tracker: 'https://anthelion.me/announce'
        }
      ])
    }
  ];

  const result = await api.pollAdoptionReadyForqui(
    readyMarker,
    null,
    Date.now(),
    Date.now() + 60000
  );
  assert.equal(result.state, 'not-triggered');
  assert.match(result.message, /disabled/);
  assert.equal(requestedUrls.length, requestCount + 1);
  assert.doesNotMatch(requestedUrls.at(-1), /\/torrents\/files/);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  context.location.href = previousHref;
});

test('switching to manual mode during file verification prevents ANT submission', async () => {
  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const job = {
    error: '',
    filename: 'File cancellation.mkv',
    followUpRunAt: Date.now() + 60000,
    followUpScheduled: true,
    followUpStatus: 'pending',
    progress: 100,
    row: createRow(),
    savePath: 'D:\\Media',
    site: 'ExampleTracker',
    state: 'complete'
  };
  api.setquiAddJob('file-cancellation-job', job);
  const requestCount = requestedUrls.length;
  requestResponses = [
    {
      status: 200,
      responseText: JSON.stringify([
        {
          hash: 'file-cancellation-hash',
          name: 'Release.Folder',
          save_path: 'D:\\Media',
          state: 'stalledUP',
          tracker: 'https://anthelion.me/announce'
        }
      ])
    },
    { status: 200, responseText: '[]' },
    {
      beforeResponse() {
        configValues.set('qui_auto_trigger_adoption', false);
      },
      status: 200,
      responseText: JSON.stringify([{ name: job.filename }])
    }
  ];

  await api.runquiCrossSeedFollowup('file-cancellation-job');
  assert.equal(requestedUrls.length, requestCount + 3);
  assert.match(requestedUrls.at(-1), /\/torrents\/files\?hash=file-cancellation-hash$/);
  assert.equal(
    requestedUrls.slice(requestCount).some((url) => /\/torrents\/add(?:\?|$)/.test(url)),
    false
  );
  assert.equal(job.followUpScheduled, false);
  assert.equal(job.followUpStatus, '');
  assert.equal(job.followUpRunAt, 0);

  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('adoption flow storage and lock failures fail closed', async () => {
  const owner = {
    adoptionReadyToken: 'owner-token',
    filename: 'Owner.mkv',
    torrentId: '160'
  };
  const contender = {
    adoptionReadyToken: 'contender-token',
    filename: 'Contender.mkv',
    torrentId: '161'
  };

  assert.equal(await api.claimAdoptionReadyFlow(owner), true);
  flowGetValueError = new Error('flow read unavailable');
  try {
    assert.equal(await api.claimAdoptionReadyFlow(contender), false);
    assert.equal(await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken), false);
  } finally {
    flowGetValueError = null;
  }
  assert.equal(api.getActiveAdoptionReadyFlow().token, owner.adoptionReadyToken);

  flowDeleteValueError = new Error('flow delete unavailable');
  try {
    assert.equal(await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken), false);
  } finally {
    flowDeleteValueError = null;
  }
  assert.equal(api.getActiveAdoptionReadyFlow().token, owner.adoptionReadyToken);
  assert.equal(await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken), true);

  flowSetValueError = new Error('flow write unavailable');
  try {
    assert.equal(await api.claimAdoptionReadyFlow(contender), false);
  } finally {
    flowSetValueError = null;
  }
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  const locks = context.navigator.locks;
  context.navigator.locks = null;
  try {
    assert.equal(await api.claimAdoptionReadyFlow(contender), false);
  } finally {
    context.navigator.locks = locks;
  }
  assert.equal(api.getActiveAdoptionReadyFlow(), null);
});

test('the active-page heartbeat retries transient failures without extending the hard cap', async () => {
  const previousNow = nowOverride;
  nowOverride = 1000;
  const owner = {
    adoptionReadyToken: 'heartbeat-owner-token',
    filename: 'Heartbeat.mkv',
    torrentId: '163'
  };
  const contender = {
    adoptionReadyToken: 'heartbeat-contender-token',
    filename: 'Queued.mkv',
    torrentId: '164'
  };
  assert.equal(await api.claimAdoptionReadyFlow(owner), true);

  const pagehideCount = globalEventListeners.get('pagehide')?.length || 0;
  api.watchAdoptionReadyPageHandling(owner.adoptionReadyToken);
  const firstHeartbeat = scheduledTimeouts.at(-1);
  assert.equal(firstHeartbeat.delay, 60000);
  assert.equal(globalEventListeners.get('pagehide').length, pagehideCount + 1);

  nowOverride = 61000;
  flowGetValueFailuresRemaining = 1;
  await firstHeartbeat.callback();
  const retry = scheduledTimeouts.at(-1);
  assert.equal(retry.delay, 10000);

  nowOverride = 71000;
  await retry.callback();
  const renewedHeartbeat = scheduledTimeouts.at(-1);
  assert.equal(renewedHeartbeat.delay, 60000);
  assert.equal(api.getActiveAdoptionReadyFlow().handlingDeadlineAt, 121000);
  assert.equal(api.getActiveAdoptionReadyFlow().expiresAt, 121000);

  nowOverride = 121001;
  assert.equal(await api.claimAdoptionReadyFlow(contender), true);
  assert.equal(api.getActiveAdoptionReadyFlow().token, contender.adoptionReadyToken);

  globalEventListeners.get('pagehide').at(-1)();
  await webLockTail;
  assert.equal(api.getActiveAdoptionReadyFlow().token, contender.adoptionReadyToken);
  const timerCount = scheduledTimeouts.length;
  await renewedHeartbeat.callback();
  assert.equal(scheduledTimeouts.length, timerCount);
  assert.equal(await api.releaseAdoptionReadyFlow(contender.adoptionReadyToken), true);
  flowGetValueFailuresRemaining = 0;
  nowOverride = previousNow;
});

test('an uninitialized automatic page cannot hold the shared queue past two minutes', async () => {
  const previousNow = nowOverride;
  nowOverride = 1000;
  configValues.set('qui_auto_trigger_adoption', true);
  const owner = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Uninitialized.mkv',
    groupId: '504',
    site: 'ExampleTracker',
    torrentId: '167'
  };
  const contender = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Following.mkv',
    groupId: '505',
    site: 'ExampleTracker',
    torrentId: '168'
  };
  const initialOpenCount = openedTabs.length;

  api.scheduleAdoptionReadyPage('uninitialized-owner', owner);
  const ownerOpenTimer = scheduledTimeouts.at(-1);
  await ownerOpenTimer.callback();
  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(api.getActiveAdoptionReadyFlow().handlingDeadlineAt, 121000);

  api.scheduleAdoptionReadyPage('uninitialized-contender', contender);
  const contenderOpenTimer = scheduledTimeouts.at(-1);
  await contenderOpenTimer.callback();
  assert.equal(openedTabs.length, initialOpenCount + 1);
  const contenderRetryTimer = scheduledTimeouts.at(-1);

  nowOverride = 121001;
  assert.equal(await api.claimAdoptionReadyFlow(owner), false);
  await contenderRetryTimer.callback();
  assert.equal(openedTabs.length, initialOpenCount + 2);
  assert.equal(api.getActiveAdoptionReadyFlow().token, contender.adoptionReadyToken);
  assert.equal(await api.releaseAdoptionReadyFlow(contender.adoptionReadyToken), true);
  configValues.set('qui_auto_trigger_adoption', false);
  nowOverride = previousNow;
});

test('automatic page handling times out and releases the queue slot', async () => {
  const previousNow = nowOverride;
  nowOverride = 1000;
  const owner = {
    adoptionReadyToken: 'timeout-owner-token',
    filename: 'Timeout.mkv',
    torrentId: '165'
  };
  const contender = {
    adoptionReadyToken: 'timeout-contender-token',
    filename: 'Next.mkv',
    torrentId: '166'
  };
  assert.equal(await api.claimAdoptionReadyFlow(owner), true);

  const timerCount = scheduledTimeouts.length;
  api.watchAdoptionReadyPageHandling(owner.adoptionReadyToken, 121000);
  const handlingTimeout = scheduledTimeouts.at(-2);
  const heartbeat = scheduledTimeouts.at(-1);
  assert.equal(scheduledTimeouts.length, timerCount + 2);
  assert.equal(handlingTimeout.delay, 120000);
  assert.equal(heartbeat.delay, 60000);

  nowOverride = 121000;
  await handlingTimeout.callback();
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  const stoppedTimerCount = scheduledTimeouts.length;
  await heartbeat.callback();
  assert.equal(scheduledTimeouts.length, stoppedTimerCount);
  assert.equal(await api.claimAdoptionReadyFlow(contender), true);
  assert.equal(await api.releaseAdoptionReadyFlow(contender.adoptionReadyToken), true);
  nowOverride = previousNow;
});

test('a replayed ready URL without its one-time marker cannot attach flow handlers', async () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  configValues.set('qui_auto_trigger_adoption', true);
  const owner = {
    adoptionReadyToken: 'replayed-owner-token',
    filename: 'Replay.mkv',
    torrentId: '162'
  };
  assert.equal(await api.claimAdoptionReadyFlow(owner), true);
  context.location.href =
    'https://anthelion.me/torrents.php?id=502&torrentid=162&ant_adoption_ready=1&ant_adoption_token=replayed-owner-token';
  const pagehideCount = globalEventListeners.get('pagehide')?.length || 0;
  const timerCount = scheduledTimeouts.length;

  assert.equal(api.initializeAdoptionReadyView(), false);
  assert.equal(globalEventListeners.get('pagehide')?.length || 0, pagehideCount);
  assert.equal(scheduledTimeouts.length, timerCount);
  assert.equal(api.getActiveAdoptionReadyFlow().token, owner.adoptionReadyToken);

  await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken);
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('a stale ready page stops before querying qui or adopting', async () => {
  const previousHref = context.location.href;
  const owner = {
    adoptionReadyToken: 'current-owner-token',
    filename: 'Current.mkv',
    torrentId: '123'
  };
  const staleMarker = {
    filename: 'Example.mkv',
    token: 'stale-page-token',
    torrentId: '123'
  };
  context.location.href =
    'https://anthelion.me/torrents.php?id=456&torrentid=123&ant_adoption_ready=1';
  configValues.set('qui_auto_trigger_adoption', true);
  assert.equal(await api.claimAdoptionReadyFlow(owner), true);

  const timerCount = scheduledTimeouts.length;
  const result = await api.pollAdoptionReadyForqui(
    staleMarker,
    null,
    Date.now(),
    Date.now() + 60000
  );
  assert.equal(result.state, 'not-triggered');
  assert.match(result.message, /no longer owns/);
  assert.equal(scheduledTimeouts.length, timerCount);
  assert.equal(api.getActiveAdoptionReadyFlow().token, owner.adoptionReadyToken);

  await api.releaseAdoptionReadyFlow(owner.adoptionReadyToken);
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = previousHref;
});

test('ready-page initialization retries a transient flow read without consuming its marker', async () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  const readyJob = {
    filename: 'Initialization retry.mkv',
    groupId: '612',
    torrentId: '278'
  };
  api.createAdoptionReadyMarker(readyJob);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  const markerKey = `ant-adoption-filename-cross-seed:adoption-ready-token:${readyJob.adoptionReadyToken}`;
  const initialTimerCount = scheduledTimeouts.length;
  const initialRequestCount = requestedUrls.length;

  flowGetValueFailuresRemaining = 1;
  assert.equal(api.initializeAdoptionReadyView(), true);
  assert.equal(storage.has(markerKey), true);
  assert.equal(scheduledTimeouts.length, initialTimerCount + 1);
  const initializationRetry = scheduledTimeouts.at(-1);
  assert.ok(initializationRetry.delay > 0 && initializationRetry.delay <= 10000);

  assert.equal(initializationRetry.callback(), true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(storage.has(markerKey), false);
  assert.equal(api.getActiveAdoptionReadyFlow().token, readyJob.adoptionReadyToken);
  assert.equal(requestedUrls.length, initialRequestCount);
  const pollingRetry = scheduledTimeouts.at(-1);
  assert.ok(pollingRetry.delay > 0 && pollingRetry.delay <= 10000);

  configValues.set('qui_auto_trigger_adoption', false);
  const manualResult = await pollingRetry.callback();
  assert.equal(manualResult.state, 'not-triggered');
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  flowGetValueFailuresRemaining = 0;
  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('automatic adoption page delay follows the configured cross-seed follow-up delay', () => {
  const previousAutomatic = configValues.get('qui_auto_trigger_adoption');
  const previousDelay = configValues.get('qui_cross_seed_followup_delay_seconds');
  configValues.set('qui_auto_trigger_adoption', true);
  try {
    for (const [seconds, expectedDelay] of [
      [0, 5000],
      [1, 11000],
      [60, 70000]
    ]) {
      configValues.set('qui_cross_seed_followup_delay_seconds', seconds);
      const job = {
        autoAdded: true,
        filename: 'Delay.mkv',
        groupId: '456',
        torrentId: '123',
        site: 'ExampleTracker'
      };
      const startedAt = Date.now();
      assert.equal(api.scheduleAdoptionReadyPage(`delay-${seconds}`, job), true);
      assert.equal(scheduledTimeouts.at(-1).delay, expectedDelay);
      assert.ok(job.adoptionPageOpenAt >= startedAt + expectedDelay);
      assert.ok(job.adoptionPageOpenAt <= Date.now() + expectedDelay);
    }
  } finally {
    configValues.set('qui_auto_trigger_adoption', previousAutomatic);
    if (previousDelay === undefined) configValues.delete('qui_cross_seed_followup_delay_seconds');
    else configValues.set('qui_cross_seed_followup_delay_seconds', previousDelay);
  }
});

test('adoption marker storage failure does not suppress completion follow-up work', () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Marker failure.mkv',
    groupId: '457',
    torrentId: '124',
    site: 'ExampleTracker'
  };
  const initialTimerCount = scheduledTimeouts.length;
  let followUpSchedulingReached = false;

  markerSetValueError = new Error('marker storage unavailable');
  assert.doesNotThrow(() => {
    assert.equal(api.scheduleAdoptionReadyPage('marker-failure-job', job), true);
    followUpSchedulingReached = true;
  });
  markerSetValueError = null;

  assert.equal(followUpSchedulingReached, true);
  assert.equal(job.adoptionPageScheduled, true);
  assert.equal(job.adoptionReadyToken, undefined);
  assert.equal(scheduledTimeouts.length, initialTimerCount + 1);
  assert.equal(scheduledTimeouts.at(-1).delay, 70000);
  configValues.set('qui_auto_trigger_adoption', false);
});

test('manual adoption still opens immediately when marker storage is unavailable', () => {
  const previousHref = context.location.href;
  configValues.set('qui_auto_trigger_adoption', false);
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Manual marker failure.mkv',
    groupId: '459',
    torrentId: '126',
    site: 'ExampleTracker'
  };
  const initialOpenCount = openedTabs.length;
  const initialTimerCount = scheduledTimeouts.length;
  const initialRequestCount = requestedUrls.length;

  markerSetValueError = new Error('marker storage unavailable');
  try {
    assert.equal(api.scheduleAdoptionReadyPage('manual-marker-failure-job', job), true);
  } finally {
    markerSetValueError = null;
  }

  assert.equal(openedTabs.length, initialOpenCount + 1);
  assert.equal(job.adoptionPageOpened, true);
  assert.equal(scheduledTimeouts.length, initialTimerCount);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);
  assert.doesNotMatch(openedTabs.at(-1).url, /ant_adoption_token=/);

  context.location.href = openedTabs.at(-1).url;
  assert.equal(api.initializeAdoptionReadyView(), true);
  assert.equal(scheduledTimeouts.length, initialTimerCount);
  assert.equal(requestedUrls.length, initialRequestCount);
  context.location.href = previousHref;
});

test('Grabbed persistence failure does not suppress ready-page or follow-up scheduling', () => {
  configValues.set('qui_auto_trigger_adoption', true);
  const row = createRow();
  const job = {
    autoAdded: true,
    adoptionPageOpened: false,
    filename: 'Action failure.mkv',
    followUpStatus: '',
    groupId: '458',
    progress: 100,
    row,
    site: 'ExampleTracker',
    state: 'complete',
    torrentId: '125'
  };
  const initialTimerCount = scheduledTimeouts.length;
  api.setquiAddJob('action-failure-job', job);

  actionSetValueError = new Error('action storage unavailable');
  assert.doesNotThrow(() => api.handleCompletedquiAddJob('action-failure-job', job));
  actionSetValueError = null;

  assert.equal(job.adoptionPageScheduled, true);
  assert.equal(job.followUpScheduled, true);
  assert.equal(job.followUpStatus, 'pending');
  assert.equal(scheduledTimeouts.length, initialTimerCount + 2);
  configValues.set('qui_auto_trigger_adoption', false);
});

test('post-success cache bookkeeping failures stay best-effort', () => {
  cacheDeleteValueError = new Error('cache delete unavailable');
  assert.equal(api.cacheDelete('qui-result:Accepted.mkv'), false);
  cacheDeleteValueError = null;

  const row = createRow();
  row.dataset.antCrossSeedFilename = 'Accepted.mkv';
  row.dataset.antCrossSeedTorrentId = '127';
  row.dataset.antCrossSeedTrackerSites = 'ExampleTracker';
  cacheSetValueError = new Error('cache write unavailable');
  assert.equal(api.markRowProcessingComplete(row, 'Accepted.mkv', 'manual-ant-added'), false);
  cacheSetValueError = null;

  assert.doesNotMatch(source, /job\.submittedAtSec\s*=/);
});

test('qui search and add failures redact tokens from nested and attempted URLs', async () => {
  const token = 'super-secret-token';
  const config = {
    baseUrl: 'https://qui.example',
    categories: '',
    instanceId: '',
    limit: 300,
    savePath: '',
    skipRecheck: false,
    tags: '',
    token
  };
  const assertRedacted = (error) => {
    assert.doesNotMatch(error.message, new RegExp(token));
    assert.match(error.message, /\/proxy\/\[redacted\]\//);
    return true;
  };

  requestResponses = [{ errorFromUrl: true }];
  await assert.rejects(api.queryqui(config, 'Example'), assertRedacted);

  requestResponses = [{ errorFromUrl: true }, { errorFromUrl: true }];
  await assert.rejects(
    api.postToqui(config, ['https://tracker.example/download/1']),
    assertRedacted
  );

  const sanitized = api.sanitizeDebugValue(
    new Error(`network failed for https://qui.example/proxy/${token}/api/v2/torrents/add`)
  );
  assert.doesNotMatch(sanitized.message, new RegExp(token));
  assert.doesNotMatch(sanitized.stack, new RegExp(token));
  assert.doesNotMatch(source, /attempted\.join\(' \| '\)/);
});

test('debug payload sanitizing bounds large strings, arrays, objects, and nesting', () => {
  const sanitized = api.sanitizeDebugValue({
    large: 'x'.repeat(700),
    nested: { first: { second: { third: { fourth: ['hidden'] } } } },
    rows: Array.from({ length: 30 }, (_, index) => ({ index })),
    wide: Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`field${index}`, index]))
  });

  assert.match(sanitized.large, /200 characters omitted/);
  assert.equal(sanitized.rows.length, 13);
  assert.equal(sanitized.rows.at(-1), '[18 more items omitted]');
  assert.equal(sanitized.wide.__omittedEntries, 5);
  assert.equal(sanitized.nested.first.second.third, '[object with 1 entries]');
});

test('qui monitoring rejects an old completed item that only shares the filename', () => {
  const job = {
    filename: 'Example.mkv',
    hash: '',
    savePath: 'D:\\Media',
    submittedAtSec: 1000,
    title: 'Example.Release',
    trackerHost: 'tracker.example'
  };
  const oldItem = {
    addedOn: 999,
    contentPath: 'D:\\Media\\Example.mkv',
    hash: 'old',
    hosts: ['tracker.example'],
    name: 'Example.Release',
    raw: { files: [{ name: 'Example.mkv' }] },
    savePath: 'D:\\Media'
  };
  assert.equal(api.findBestquiAddJobMatch([oldItem], job), null);

  const submittedItem = { ...oldItem, addedOn: 1001, hash: 'new' };
  assert.equal(api.findBestquiAddJobMatch([submittedItem], job), submittedItem);

  const acceptedBeforeSlowResponse = { ...submittedItem, addedOn: 1000, hash: 'slow-response' };
  assert.equal(
    api.findBestquiAddJobMatch([acceptedBeforeSlowResponse], job),
    acceptedBeforeSlowResponse
  );

  const unrelatedItem = {
    ...oldItem,
    addedOn: 1001,
    contentPath: 'E:\\Other\\Different.mkv',
    hash: 'unrelated',
    hosts: ['other.example'],
    name: 'Example.Release.Extras',
    raw: { files: [{ name: 'Different.mkv' }] },
    savePath: 'E:\\Other'
  };
  assert.equal(api.findBestquiAddJobMatch([unrelatedItem], job), null);

  const titleOnlyItem = {
    ...unrelatedItem,
    hash: 'title-only',
    name: 'Example.Release'
  };
  assert.equal(api.findBestquiAddJobMatch([titleOnlyItem], job), null);
});

test('qui monitoring verifies a folder torrent by its exact internal filename', async () => {
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  const job = {
    filename: 'Exact.Target.mkv',
    hash: '',
    savePath: 'D:\\Media',
    site: 'BHD',
    submittedAtSec: 1000,
    title: 'BHD API title that differs from the torrent root',
    trackerHost: 'beyond-hd.me'
  };
  const candidate = {
    addedOn: 1001,
    contentPath: 'D:\\Media\\BHD.Release.Folder',
    hash: 'bhd-folder-hash',
    hosts: ['beyond-hd.me'],
    name: 'BHD.Release.Folder',
    progress: 0.5,
    raw: {},
    savePath: 'D:\\Media',
    state: 'downloading',
    trackerHost: 'beyond-hd.me'
  };
  assert.equal(api.findBestquiAddJobMatch([candidate], job), null);
  const requestCount = requestedUrls.length;
  requestResponses = [
    {
      status: 200,
      responseText: JSON.stringify([{ name: 'BHD.Release.Folder\\Exact.Target.mkv' }])
    }
  ];

  const matched = await api.findVerifiedquiAddJobMatch([candidate], job);

  assert.equal(matched.hash, candidate.hash);
  assert.equal(requestedUrls.length, requestCount + 1);
  assert.match(requestedUrls.at(-1), /\/torrents\/files\?hash=bhd-folder-hash$/);

  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('qui monitoring rejects a stem-matched folder whose internal file differs', async () => {
  configValues.set('qui_base_url', 'http://localhost:7476');
  configValues.set('qui_token', 'token');
  const job = {
    filename: 'Movie.mkv',
    hash: '',
    savePath: 'D:\\Media',
    site: 'BHD',
    submittedAtSec: 1000,
    title: 'Movie',
    trackerHost: 'beyond-hd.me'
  };
  const candidate = {
    addedOn: 1001,
    contentPath: 'D:\\Media\\Movie',
    hash: 'wrong-folder-hash',
    hosts: ['beyond-hd.me'],
    name: 'Movie',
    progress: 1,
    raw: {},
    savePath: 'D:\\Media',
    state: 'stalledUP',
    trackerHost: 'beyond-hd.me'
  };
  assert.equal(api.findBestquiAddJobMatch([candidate], job), null);
  const requestCount = requestedUrls.length;
  requestResponses = [
    {
      status: 200,
      responseText: JSON.stringify([{ name: 'Movie\\Different.Feature.mkv' }])
    }
  ];

  const matched = await api.findVerifiedquiAddJobMatch([candidate], job);

  assert.equal(matched, null);
  assert.equal(requestedUrls.length, requestCount + 1);
  assert.match(requestedUrls.at(-1), /\/torrents\/files\?hash=wrong-folder-hash$/);

  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('renders and preserves the adopted banner across the ANT refresh', async () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  const inserted = [];
  let adoptionClicks = 0;
  const adoptionButton = {
    click() {
      adoptionClicks += 1;
    },
    getAttribute(name) {
      return name === 'onclick' ? "return adopt('123');" : '';
    }
  };
  const target = {
    nextSibling: null,
    parentNode: {
      insertBefore(node) {
        inserted.push(node);
      }
    }
  };
  documentNodes.set('.thin > h2, #content > h2, h2', target);
  documentElements.set('torrent_123', {
    querySelectorAll(selector) {
      return selector === 'button' ? [adoptionButton] : [];
    }
  });
  configValues.set('qui_auto_trigger_adoption', true);

  context.location.href =
    'https://anthelion.me/torrents.php?id=456&torrentid=123&ant_adoption_ready=1&ant_adoption_source=ExampleTracker';
  assert.equal(api.maybeAutoTriggerAdoption(null, createAntquiItem()).state, 'not-triggered');
  assert.equal(adoptionClicks, 0);

  const readyJob = {
    autoAdded: true,
    filename: 'Example.mkv',
    groupId: '456',
    torrentId: '123',
    site: 'ExampleTracker'
  };
  assert.match(api.createAdoptionReadyMarker(readyJob), /^test-token-/);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);

  const notice = api.addAdoptionReadyNotice();
  assert.equal(notice.dataset.state, 'ready');
  assert.match(notice.textContent, /READY FOR ADOPTION/);
  const marker = api.consumeAdoptionReadyMarker();
  assert.equal(marker.torrentId, '123');
  assert.equal(marker.filename, 'Example.mkv');
  assert.equal(api.consumeAdoptionReadyMarker(), null);
  const adoption = api.maybeAutoTriggerAdoption(marker, createAntquiItem());
  api.updateAdoptionReadyNotice(notice, adoption);

  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].id, 'ant-adoption-ready-notice');
  assert.equal(adoptionClicks, 1);
  assert.equal(inserted[0].dataset.state, 'adopted');
  assert.match(inserted[0].textContent, /ADOPTED/);
  assert.match(context.document.title, /^ADOPTED - /);
  assert.match(source, /@match\s+https:\/\/anthelion\.me\/torrents\.php\?id=\*/);
  const adoptedMarker = api.consumeAdoptionReadyMarker();
  assert.equal(adoptedMarker.state, 'adopted');
  assert.equal(api.maybeAutoTriggerAdoption(adoptedMarker, createAntquiItem()).state, 'adopted');
  assert.equal(adoptionClicks, 1);

  const insertedBeforeRefresh = inserted.length;
  const timerCountBeforeRefresh = scheduledTimeouts.length;
  flowGetValueFailuresRemaining = 1;
  assert.equal(api.initializeAdoptionReadyView(), true);
  await webLockTail;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(inserted.length, insertedBeforeRefresh + 1);
  assert.equal(inserted.at(-1).dataset.state, 'adopted');
  assert.match(inserted.at(-1).textContent, /ADOPTED/);
  assert.doesNotMatch(context.location.href, /ant_adoption_ready=/);
  assert.doesNotMatch(context.location.href, /ant_adoption_token=/);
  assert.doesNotMatch(context.location.href, /ant_adoption_source=/);
  assert.equal(adoptionClicks, 1);
  assert.equal(api.getActiveAdoptionReadyFlow().token, readyJob.adoptionReadyToken);
  assert.equal(scheduledTimeouts.length, timerCountBeforeRefresh + 1);
  const refreshReleaseRetry = scheduledTimeouts.at(-1);
  assert.equal(refreshReleaseRetry.delay, 10000);
  await refreshReleaseRetry.callback();
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  api.createAdoptionReadyMarker(readyJob);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  const secondMarker = api.consumeAdoptionReadyMarker();
  const notSeeding = api.maybeAutoTriggerAdoption(
    secondMarker,
    createAntquiItem({ state: 'downloading' })
  );
  assert.equal(notSeeding.state, 'not-triggered');
  assert.match(notSeeding.message, /not both 100% complete and seeding in qui/);
  assert.equal(adoptionClicks, 1);

  await api.releaseAdoptionReadyFlow(readyJob.adoptionReadyToken);

  documentNodes.delete('.thin > h2, #content > h2, h2');
  documentElements.delete('torrent_123');
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('auto-adoption stages the refresh marker before clicking and rolls it back on failure', async () => {
  const previousHref = context.location.href;
  configValues.set('qui_auto_trigger_adoption', true);
  const readyJob = {
    filename: 'Example.mkv',
    groupId: '456',
    torrentId: '123'
  };
  let adoptionClicks = 0;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            adoptionClicks += 1;
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });

  api.createAdoptionReadyMarker(readyJob);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  const persistenceMarker = api.consumeAdoptionReadyMarker();
  markerSetValueError = new Error('terminal marker write failed');
  const persistenceFailure = api.maybeAutoTriggerAdoption(persistenceMarker, createAntquiItem());
  markerSetValueError = null;
  assert.equal(persistenceFailure.state, 'not-triggered');
  assert.match(persistenceFailure.message, /could not be preserved/);
  assert.equal(adoptionClicks, 0);
  assert.equal(api.consumeAdoptionReadyMarker(), null);
  assert.equal(await api.releaseAdoptionReadyFlow(readyJob.adoptionReadyToken), true);

  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            adoptionClicks += 1;
            markerSetValueError = new Error('terminal marker invalidation failed');
            throw new Error('adoption click failed');
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });
  api.createAdoptionReadyMarker(readyJob);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  const clickMarker = api.consumeAdoptionReadyMarker();
  markerDeleteValueError = new Error('terminal marker delete failed');
  const clickFailure = api.maybeAutoTriggerAdoption(clickMarker, createAntquiItem());
  markerDeleteValueError = null;
  markerSetValueError = null;
  assert.equal(clickFailure.state, 'not-triggered');
  assert.match(clickFailure.message, /Automatic adoption failed/);
  assert.equal(adoptionClicks, 1);
  assert.doesNotMatch(context.location.href, /ant_adoption_dispatched=/);
  assert.equal(api.consumeAdoptionReadyMarker(), null);
  assert.equal(api.initializeAdoptionReadyView(), false);
  storage.delete(
    `ant-adoption-filename-cross-seed:adoption-ready-token:${readyJob.adoptionReadyToken}`
  );
  assert.equal(await api.releaseAdoptionReadyFlow(readyJob.adoptionReadyToken), true);

  documentElements.delete('torrent_123');
  configValues.set('qui_auto_trigger_adoption', false);
  markerDeleteValueError = null;
  markerSetValueError = null;
  context.location.href = previousHref;
});

test('auto-adoption retries a transient ownership read immediately before the click', async () => {
  const previousHref = context.location.href;
  configValues.set('qui_auto_trigger_adoption', true);
  const readyJob = {
    filename: 'Example.mkv',
    groupId: '456',
    torrentId: '123'
  };
  api.createAdoptionReadyMarker(readyJob);
  assert.equal(await api.claimAdoptionReadyFlow(readyJob), true);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  const readyMarker = api.consumeAdoptionReadyMarker();
  let injectTransientFailure = true;
  let adoptionClicks = 0;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      if (injectTransientFailure) {
        injectTransientFailure = false;
        flowGetValueFailuresRemaining = 1;
      }
      return [
        {
          click() {
            adoptionClicks += 1;
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });

  const waitingResult = api.maybeAutoTriggerAdoption(readyMarker, createAntquiItem());
  assert.equal(waitingResult.state, 'waiting');
  assert.equal(adoptionClicks, 0);
  assert.equal(api.consumeAdoptionReadyMarker(), null);

  const adoptedResult = api.maybeAutoTriggerAdoption(readyMarker, createAntquiItem());
  assert.equal(adoptedResult.state, 'adopted');
  assert.equal(adoptionClicks, 1);
  assert.equal(api.consumeAdoptionReadyMarker().state, 'adopted');

  storage.delete(
    `ant-adoption-filename-cross-seed:adoption-ready-token:${readyJob.adoptionReadyToken}`
  );
  assert.equal(await api.releaseAdoptionReadyFlow(readyJob.adoptionReadyToken), true);
  documentElements.delete('torrent_123');
  configValues.set('qui_auto_trigger_adoption', false);
  flowGetValueFailuresRemaining = 0;
  context.location.href = previousHref;
});

test('auto-adoption accepts only the exact ANT adopt handler', async () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?id=456&torrentid=123&ant_adoption_ready=1';
  configValues.set('qui_auto_trigger_adoption', true);
  const readyMarker = { filename: 'Example.mkv', token: 'handler-token', torrentId: '123' };
  const seedingItem = createAntquiItem();
  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );

  for (const handler of [
    "return notadopt('123');",
    "log(); return adopt('123');",
    "return adopt('123'); log();",
    "return adopt('124');"
  ]) {
    let clicks = 0;
    documentElements.set('torrent_123', {
      querySelectorAll() {
        return [
          {
            click() {
              clicks += 1;
            },
            getAttribute() {
              return handler;
            }
          }
        ];
      }
    });
    assert.equal(api.maybeAutoTriggerAdoption(readyMarker, seedingItem).state, 'not-triggered');
    assert.equal(clicks, 0);
  }

  const originalConfirm = context.unsafeWindow.confirm;
  let missingConfirmClicks = 0;
  delete context.unsafeWindow.confirm;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            missingConfirmClicks += 1;
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });
  assert.equal(api.maybeAutoTriggerAdoption(readyMarker, seedingItem).state, 'not-triggered');
  assert.equal(missingConfirmClicks, 0);
  context.unsafeWindow.confirm = originalConfirm;

  let disabledClicks = 0;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            disabledClicks += 1;
          },
          disabled: true,
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });
  assert.equal(api.maybeAutoTriggerAdoption(readyMarker, seedingItem).state, 'not-triggered');
  assert.equal(disabledClicks, 0);

  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            throw new Error('click failed');
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });
  assert.equal(api.maybeAutoTriggerAdoption(readyMarker, seedingItem).state, 'not-triggered');
  assert.equal(context.unsafeWindow.confirm, originalConfirm);

  let ownershipRaceClicks = 0;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      storage.set(
        'ant-adoption-filename-cross-seed:adoption-ready-flow-v1',
        JSON.stringify({
          version: 1,
          token: 'replacement-owner-token',
          expiresAt: Date.now() + 300000
        })
      );
      return [
        {
          click() {
            ownershipRaceClicks += 1;
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });
  const lostOwnership = api.maybeAutoTriggerAdoption(readyMarker, seedingItem);
  assert.equal(lostOwnership.state, 'not-triggered');
  assert.match(lostOwnership.message, /no longer owns/);
  assert.equal(ownershipRaceClicks, 0);
  await api.releaseAdoptionReadyFlow('replacement-owner-token');
  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );

  let exactClicks = 0;
  const confirmAnswers = [];
  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            confirmAnswers.push(context.unsafeWindow.confirm('Reserve this torrent?'));
            exactClicks += 1;
          },
          getAttribute() {
            return ' return adopt("123") ';
          }
        }
      ];
    }
  });
  assert.equal(api.maybeAutoTriggerAdoption(readyMarker, seedingItem).state, 'adopted');
  assert.equal(exactClicks, 1);
  assert.deepEqual(confirmAnswers, [true]);
  assert.equal(context.unsafeWindow.confirm, originalConfirm);

  await api.releaseAdoptionReadyFlow(readyMarker.token);
  documentElements.delete('torrent_123');
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = previousHref;
});

test('the ready page polls qui every ten seconds and adopts only after ANT is seeding', async () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?id=456&torrentid=123&ant_adoption_ready=1';
  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const readyMarker = { filename: 'Example.mkv', token: 'poll-token', torrentId: '123' };
  nowOverride = 1000;
  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );
  api.watchAdoptionReadyPageHandling(readyMarker.token);
  const readyPageHeartbeat = scheduledTimeouts.at(-1);
  assert.equal(readyPageHeartbeat.delay, 60000);
  const notice = { dataset: { state: 'ready' }, textContent: '' };
  const confirmationAnswers = [];
  let adoptionClicks = 0;
  const originalConfirm = context.unsafeWindow.confirm;
  documentElements.set('torrent_123', {
    querySelectorAll() {
      return [
        {
          click() {
            confirmationAnswers.push(context.unsafeWindow.confirm('Reserve this torrent?'));
            adoptionClicks += 1;
          },
          getAttribute() {
            return "return adopt('123');";
          }
        }
      ];
    }
  });

  const rawquiItem = (
    state,
    tracker = 'https://anthelion.me/announce',
    files,
    comment = '',
    hash = 'ant-hash',
    name = 'Example.mkv'
  ) => {
    const item = {
      added_on: 1000,
      comment,
      content_path: `D:\\Media\\${name}`,
      hash,
      name,
      progress: state === 'downloading' ? 0.5 : 1,
      save_path: 'D:\\Media',
      state,
      tracker
    };
    if (files !== undefined) item.files = files;
    return item;
  };
  assert.equal(api.isquiItemSeeding(createAntquiItem({ state: 'stalledUP' })), true);
  assert.equal(api.isquiItemSeeding(createAntquiItem({ state: 'pausedUP' })), false);
  const initialTimerCount = scheduledTimeouts.length;
  const initialRequestCount = requestedUrls.length;
  requestResponses = [
    {
      advanceMs: 3000,
      status: 200,
      responseText: JSON.stringify([
        rawquiItem(
          'uploading',
          'https://tracker.example/announce',
          undefined,
          'source https://anthelion.me/torrents.php?id=456&torrentid=123'
        ),
        rawquiItem(
          'stalledUP',
          'https://anthelion.me/announce',
          [{ name: 'Example.mkv' }],
          '',
          'empty-files-hash'
        ),
        rawquiItem('stalledUP', 'https://anthelion.me/announce', undefined, '', 'wrong-file-hash'),
        rawquiItem('downloading')
      ])
    },
    { status: 200, responseText: '[]' },
    { status: 200, responseText: JSON.stringify([{ name: 'Different.mkv' }]) }
  ];
  const firstResult = await api.pollAdoptionReadyForqui(readyMarker, notice, 1000, 61000);
  assert.equal(firstResult.state, 'waiting');
  assert.equal(adoptionClicks, 0);
  assert.equal(scheduledTimeouts.length, initialTimerCount + 1);
  assert.equal(scheduledTimeouts.at(-1).delay, 7000);
  assert.match(requestedUrls[initialRequestCount + 1], /\/torrents\/files\?hash=empty-files-hash$/);
  assert.match(requestedUrls[initialRequestCount + 2], /\/torrents\/files\?hash=wrong-file-hash$/);

  nowOverride = 11000;
  requestResponses = [
    {
      status: 200,
      responseText: JSON.stringify([
        rawquiItem(
          'stalledUP',
          'https://anthelion.me/announce',
          undefined,
          '',
          'exact-file-hash',
          'Release.Folder'
        )
      ])
    },
    { status: 200, responseText: JSON.stringify([{ name: 'Example.mkv' }]) }
  ];
  const secondPoll = scheduledTimeouts.at(-1);
  flowDeleteValueFailuresRemaining = 1;
  const adoptedResult = await secondPoll.callback();
  assert.equal(adoptedResult.state, 'adopted');
  assert.equal(adoptionClicks, 1);
  assert.deepEqual(confirmationAnswers, [true]);
  assert.equal(context.unsafeWindow.confirm, originalConfirm);
  assert.equal(notice.dataset.state, 'adopted');
  const retainedLease = api.getActiveAdoptionReadyFlow();
  assert.equal(retainedLease.token, readyMarker.token);
  const releaseRetry = scheduledTimeouts.at(-1);
  assert.equal(releaseRetry.delay, 10000);
  const timerCountAfterAdoption = scheduledTimeouts.length;
  await readyPageHeartbeat.callback();
  assert.equal(scheduledTimeouts.length, timerCountAfterAdoption);
  assert.equal(api.getActiveAdoptionReadyFlow().expiresAt, retainedLease.expiresAt);
  await releaseRetry.callback();
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );
  nowOverride = 61000;
  requestResponses = [
    {
      advanceMs: 1,
      status: 200,
      responseText: JSON.stringify([
        rawquiItem('seeding', 'https://anthelion.me/announce', undefined, '', 'deadline-hash')
      ])
    },
    { status: 200, responseText: JSON.stringify([{ name: 'Example.mkv' }]) }
  ];
  const deadlineResult = await api.pollAdoptionReadyForqui(readyMarker, notice, 1000, 61000);
  assert.equal(deadlineResult.state, 'adopted');
  assert.equal(adoptionClicks, 2);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );
  nowOverride = 61001;
  const timedOutResult = await api.pollAdoptionReadyForqui(readyMarker, notice, 1000, 61000);
  assert.equal(timedOutResult.state, 'not-triggered');
  assert.match(timedOutResult.message, /Timed out/);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  documentElements.delete('torrent_123');
  configValues.set('qui_auto_trigger_adoption', false);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  nowOverride = null;
  context.location.href = previousHref;
});

test('ready-page polling waits through absent and incomplete ANT states until 100% and seeding', async () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?id=789&torrentid=321&ant_adoption_ready=1';
  configValues.set('qui_auto_trigger_adoption', true);
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const readyMarker = {
    filename: 'Progressive.mkv',
    token: 'progress-poll-token',
    torrentId: '321'
  };
  nowOverride = 1000;
  assert.equal(
    await api.claimAdoptionReadyFlow({
      adoptionReadyToken: readyMarker.token,
      filename: readyMarker.filename,
      torrentId: readyMarker.torrentId
    }),
    true
  );

  const notice = { dataset: { state: 'ready' }, textContent: '' };
  let adoptionClicks = 0;
  documentElements.set('torrent_321', {
    querySelectorAll() {
      return [
        {
          click() {
            adoptionClicks += 1;
          },
          getAttribute() {
            return "return adopt('321');";
          }
        }
      ];
    }
  });

  const rawAntItem = (state, progress) => ({
    added_on: 1000,
    content_path: 'D:\\Media\\Progressive.mkv',
    hash: 'progressive-ant-hash',
    name: 'Progressive.mkv',
    progress,
    save_path: 'D:\\Media',
    state,
    tracker: 'https://anthelion.me/announce'
  });

  assert.equal(api.isquiItemReadyForAdoption({ state: 'downloading', progress: 1 }), false);
  assert.equal(api.isquiItemReadyForAdoption({ state: 'stalledUP', progress: 0.99 }), false);
  assert.equal(api.isquiItemReadyForAdoption({ state: 'stalledUP', progress: 1 }), true);

  requestResponses = [{ status: 200, responseText: '[]' }];
  const missingResult = await api.pollAdoptionReadyForqui(readyMarker, notice, 1000, 61000);
  assert.equal(missingResult.state, 'waiting');
  assert.equal(notice.dataset.state, 'ready');
  assert.match(notice.textContent, /reach 100% and seed.*60 seconds remaining/);
  assert.equal(adoptionClicks, 0);
  assert.equal(scheduledTimeouts.at(-1).delay, 10000);

  nowOverride = 11000;
  requestResponses = [
    { status: 200, responseText: JSON.stringify([rawAntItem('downloading', 1)]) }
  ];
  const nonSeedingResult = await scheduledTimeouts.at(-1).callback();
  assert.equal(nonSeedingResult.state, 'waiting');
  assert.equal(notice.dataset.state, 'ready');
  assert.match(notice.textContent, /50 seconds remaining/);
  assert.equal(adoptionClicks, 0);
  assert.equal(scheduledTimeouts.at(-1).delay, 10000);

  nowOverride = 21000;
  requestResponses = [
    { status: 200, responseText: JSON.stringify([rawAntItem('stalledUP', 0.99)]) }
  ];
  const incompleteResult = await scheduledTimeouts.at(-1).callback();
  assert.equal(incompleteResult.state, 'waiting');
  assert.equal(notice.dataset.state, 'ready');
  assert.match(notice.textContent, /40 seconds remaining/);
  assert.equal(adoptionClicks, 0);
  assert.equal(scheduledTimeouts.at(-1).delay, 10000);

  nowOverride = 31000;
  requestResponses = [
    { status: 200, responseText: JSON.stringify([rawAntItem('stalledUP', 1)]) },
    { status: 200, responseText: JSON.stringify([{ name: 'Progressive.mkv' }]) }
  ];
  const adoptedResult = await scheduledTimeouts.at(-1).callback();
  assert.equal(adoptedResult.state, 'adopted');
  assert.equal(notice.dataset.state, 'adopted');
  assert.match(notice.textContent, /^ADOPTED/);
  assert.equal(adoptionClicks, 1);
  assert.equal(api.getActiveAdoptionReadyFlow(), null);

  documentElements.delete('torrent_321');
  configValues.set('qui_auto_trigger_adoption', false);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  nowOverride = null;
  context.location.href = previousHref;
});

test('broad ANT candidate search verifies folder-named torrents by fetched files', async () => {
  configValues.set('qui_base_url', 'https://qui.example');
  configValues.set('qui_token', 'token');
  const initialRequestCount = requestedUrls.length;
  requestResponses = [
    { status: 200, responseText: '[]' },
    {
      status: 200,
      responseText: JSON.stringify([
        {
          added_on: 1000,
          content_path: 'D:\\Media\\Release.Folder',
          hash: 'folder-release-hash',
          name: 'Release.Folder',
          progress: 1,
          save_path: 'D:\\Media',
          state: 'stalledUP',
          tracker: 'https://anthelion.me/announce'
        }
      ])
    },
    { status: 200, responseText: JSON.stringify([{ name: 'Example.mkv' }]) }
  ];

  const candidates = await api.searchAntquiCandidates('Example.mkv');
  assert.equal(candidates.length, 1);
  const verified = await api.findVerifiedAntquiItem(candidates, 'Example.mkv');
  assert.equal(verified.hash, 'folder-release-hash');
  assert.match(requestedUrls[initialRequestCount], /search=Example\.mkv/);
  assert.doesNotMatch(requestedUrls[initialRequestCount + 1], /[?&]search=/);
  assert.match(
    requestedUrls[initialRequestCount + 2],
    /\/torrents\/files\?hash=folder-release-hash$/
  );

  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
});

test('adoption marker read and delete failures fail closed without blocking the banner', () => {
  const previousHref = context.location.href;
  const previousTitle = context.document.title;
  const readyJob = {
    autoAdded: true,
    filename: 'Example.mkv',
    groupId: '459',
    torrentId: '126',
    site: 'ExampleTracker'
  };
  api.createAdoptionReadyMarker(readyJob);
  context.location.href = api.buildAdoptionReadyUrl(readyJob);
  configValues.set('qui_auto_trigger_adoption', true);

  markerGetValueError = new Error('marker read unavailable');
  let marker;
  let readNotice;
  assert.doesNotThrow(() => {
    marker = api.consumeAdoptionReadyMarker();
    readNotice = api.addAdoptionReadyNotice();
  });
  markerGetValueError = null;
  assert.equal(marker, null);
  assert.equal(readNotice.dataset.state, 'ready');
  assert.equal(api.maybeAutoTriggerAdoption(marker, createAntquiItem()).state, 'not-triggered');

  markerDeleteValueError = new Error('marker delete unavailable');
  let deleteNotice;
  assert.doesNotThrow(() => {
    marker = api.consumeAdoptionReadyMarker();
    deleteNotice = api.addAdoptionReadyNotice();
  });
  markerDeleteValueError = null;
  assert.equal(marker, null);
  assert.equal(deleteNotice.dataset.state, 'ready');
  assert.equal(api.maybeAutoTriggerAdoption(marker, createAntquiItem()).state, 'not-triggered');

  api.consumeAdoptionReadyMarker();
  configValues.set('qui_auto_trigger_adoption', false);
  context.location.href = previousHref;
  context.document.title = previousTitle;
});

test('round-trips a filtered scan independently of lookup-cache settings', () => {
  configValues.set('use_cache', false);
  const scan = createFilteredScan(['<tr></tr>'], {
    scannedAt: '2026-09-15T00:00:00.000Z',
    pageCount: 2
  });
  api.saveFilteredScan(scan);
  assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(scan));
});

test('decodes an unchanged saved scan only once per page lifecycle', () => {
  const key = 'ant-adoption-filename-cross-seed:filtered-scan-v2';
  const firstScan = createFilteredScan(['<tr>large saved scan</tr>'], { pageCount: 21 });
  storage.set(key, `lz-json-v3:${JSON.stringify(firstScan)}`);
  api.resetFilteredScanCache();
  const before = filteredScanDecompressCount;

  const firstLoad = api.loadFilteredScan();
  const secondLoad = api.loadFilteredScan();

  assert.equal(firstLoad.pageCount, 21);
  assert.equal(secondLoad, firstLoad);
  assert.equal(filteredScanDecompressCount, before + 1);

  storage.set(key, `lz-json-v3:${JSON.stringify({ ...firstScan, pageCount: 22 })}`);
  assert.equal(api.loadFilteredScan().pageCount, 22);
  assert.equal(filteredScanDecompressCount, before + 2);
});

test('removes legacy and incompatible filtered scan caches', () => {
  const legacyKey = 'ant-adoption-filename-cross-seed:filtered-scan-v1';
  const unknownLegacyKey = 'ant-adoption-filename-cross-seed:filtered-scan-v99';
  const currentKey = 'ant-adoption-filename-cross-seed:filtered-scan-v2';
  const grabbedActionKey = 'ant-adoption-filename-cross-seed:action:98765';
  storage.set(legacyKey, JSON.stringify({ version: 1, rows: ['<tr>legacy</tr>'] }));
  storage.set(unknownLegacyKey, JSON.stringify({ version: 99, rows: ['<tr>legacy</tr>'] }));
  storage.set(currentKey, JSON.stringify({ version: 1, rows: ['<tr>wrong version</tr>'] }));
  storage.set(grabbedActionKey, 'grabbed');
  api.resetFilteredScanCache();

  assert.equal(api.loadFilteredScan(), null);
  assert.equal(storage.has(legacyKey), false);
  assert.equal(storage.has(unknownLegacyKey), false);
  assert.equal(storage.has(currentKey), false);
  assert.equal(storage.get(grabbedActionKey), 'grabbed');

  const malformedScans = [
    { version: 2, pageCount: 1, rows: ['<tr>bad</tr>'], rowData: [null] },
    {
      version: 2,
      pageCount: 1,
      rows: ['<tr>incomplete</tr>'],
      rowData: [{ torrentId: '1' }]
    },
    {
      version: 2,
      pageCount: 1,
      rows: [42],
      rowData: createFilteredScan(['<tr>valid metadata</tr>']).rowData
    }
  ];
  for (const malformed of malformedScans) {
    storage.set(currentKey, JSON.stringify(malformed));
    api.resetFilteredScanCache();
    assert.equal(api.loadFilteredScan(), null);
    assert.equal(storage.has(currentKey), false);
  }
  storage.delete(grabbedActionKey);
});

test('evicts saved scans whose row HTML is missing or has a mismatched torrent ID', () => {
  const currentKey = 'ant-adoption-filename-cross-seed:filtered-scan-v2';
  const valid = createFilteredScan([createSavedTorrentRowHtml('71')]);
  valid.rowData[0].torrentId = '71';
  storage.set(currentKey, JSON.stringify(valid));
  api.resetFilteredScanCache();
  assert.equal(api.stageFilteredScanEntries(api.loadFilteredScan()).length, 1);
  assert.equal(storage.has(currentKey), true);

  const malformedScans = [
    createFilteredScan(['not a torrent row']),
    createFilteredScan([`${createSavedTorrentRowHtml('1')}${createSavedTorrentRowHtml('1')}`]),
    createFilteredScan([createSavedTorrentRowHtml('71')], {
      rowData: [{ ...valid.rowData[0], torrentId: '72' }]
    })
  ];
  for (const malformed of malformedScans) {
    storage.set(currentKey, JSON.stringify(malformed));
    api.resetFilteredScanCache();
    const loaded = api.loadFilteredScan();
    assert.ok(loaded, 'schema-valid cache should reach row HTML validation');
    assert.equal(api.stageFilteredScanEntries(loaded), null);
    assert.equal(storage.has(currentKey), false);
  }
});

test('collects adoption metadata without cloning excluded row content', () => {
  const textNode = (value) => ({ nodeType: 3, nodeValue: value });
  const elementNode = (excluded, childNodes) => ({
    nodeType: 1,
    childNodes,
    matches() {
      return excluded;
    }
  });
  const row = {
    childNodes: [
      textNode('Movie '),
      elementNode(false, [textNode('1080p '), elementNode(true, [textNode('tooltip ')])]),
      elementNode(true, [textNode('Grabbed ')]),
      textNode('FLAC')
    ]
  };

  assert.equal(api.getAdoptionRowMetadata(row), 'Movie 1080p FLAC');
});

test('decorates adoption rows once and reads only stored action values', () => {
  const headerCell = (textContent) => ({
    classList: { contains: () => false },
    textContent
  });
  const header = {
    children: [
      headerCell('Torrent'),
      headerCell('Size'),
      headerCell('Bounty'),
      headerCell('Listing Time')
    ],
    textContent: 'Torrent Size Bounty',
    appendChild(cell) {
      this.children.push(cell);
      return cell;
    },
    querySelector(selector) {
      const className = selector.slice(1);
      return (
        this.children.find((cell) =>
          String(cell.className || '')
            .split(/\s+/)
            .includes(className)
        ) || null
      );
    }
  };
  const createDecorationRow = (torrentId, title) => {
    const row = {
      children: [
        headerCell(title),
        headerCell('2 GiB'),
        headerCell('600,000'),
        {
          textContent: '1 day ago',
          querySelector: () => ({
            getAttribute: (name) => (name === 'title' ? '2026-09-18 12:00:00' : null)
          })
        }
      ],
      childNodes: [{ nodeType: 3, nodeValue: `${title} 2 GiB 600,000` }],
      dataset: {},
      textContent: `${title} 2 GiB 600,000`,
      appendChild(cell) {
        this.children.push(cell);
        return cell;
      },
      querySelector(selector) {
        if (selector.includes('torrents.php?id=')) return { textContent: title };
        if (selector.includes('torrents.php?action=download')) {
          return {
            getAttribute() {
              return `torrents.php?action=download&id=${torrentId}`;
            }
          };
        }
        if (selector.startsWith('.')) {
          const className = selector.slice(1).split(/\s/)[0];
          return (
            this.children.find((cell) =>
              String(cell.className || '')
                .split(/\s+/)
                .includes(className)
            ) || null
          );
        }
        return null;
      }
    };
    return row;
  };
  const rows = [
    createDecorationRow('980001', 'First Movie'),
    createDecorationRow('980002', 'Second Movie')
  ];
  const table = {
    querySelector() {
      return header;
    },
    querySelectorAll() {
      return rows;
    }
  };
  storage.set('ant-adoption-filename-cross-seed:action:980001', 'grabbed');
  documentNodeLists.set('table', [table]);
  const listCallsBefore = gmListValuesCount;
  const actionReadsBefore = actionGetValueCount;

  api.decorateAdoptionRows();

  assert.equal(gmListValuesCount, listCallsBefore + 1);
  assert.equal(actionGetValueCount, actionReadsBefore + 1);
  assert.equal(rows[0].dataset.antAdoptionAction, 'grabbed');
  assert.equal(rows[1].dataset.antAdoptionAction, '');
  assert.equal(rows[0].dataset.antAdoptionDecorated, 'true');
  assert.equal(rows[0].dataset.antAdoptionName, 'First Movie');
  assert.equal(Number(rows[0].dataset.antAdoptionListingTime), Date.parse('2026-09-18 12:00:00'));
  assert.equal(rows[1].dataset.antAdoptionDecorated, 'true');
  const childCounts = rows.map((row) => row.children.length);

  api.decorateAdoptionRows();

  assert.equal(gmListValuesCount, listCallsBefore + 1);
  assert.equal(actionGetValueCount, actionReadsBefore + 1);
  assert.deepEqual(
    rows.map((row) => row.children.length),
    childCounts
  );

  storage.delete('ant-adoption-filename-cross-seed:action:980001');
  documentNodeLists.delete('table');
});

test('filtered-page widgets defer row counting to the single filter pass', () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?type=adoption&page=1&ant_adoption_filtered=1';
  const mainToolbar = {
    parentNode: {},
    insertAdjacentElement(_position, node) {
      documentNodes.set('#ant-cross-seed-progress', node);
    }
  };
  documentNodes.set('#ant-cross-seed-toolbar', mainToolbar);
  const queriesBeforeWidgets = rowQueryCount;

  api.addRunProgressDisplay();

  assert.equal(rowQueryCount, queriesBeforeWidgets);

  const bar = { max: 0, value: 0 };
  const label = { textContent: '' };
  const display = {
    dataset: { state: 'idle' },
    querySelector(selector) {
      return selector === 'progress' ? bar : label;
    }
  };
  documentNodes.set('#ant-cross-seed-progress', display);
  const status = { textContent: '' };
  documentNodes.set('#ant-adoption-filter-status', status);
  const seededRow = createRow();
  const contains = seededRow.classList.contains;
  seededRow.classList.contains = (value) => value !== 'zeroseed' && contains(value);
  filterRows = [createRow(), seededRow, createRow({ action: 'ignored' })];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    hideIgnoredRows: true
  });
  const queriesBeforeFilter = rowQueryCount;

  api.applyAdoptionFilters();

  assert.equal(rowQueryCount, queriesBeforeFilter + 1);
  assert.match(status.textContent, /^Showing 2 of \d+ adoption rows \(1 with zero seeders\)$/);
  assert.equal(label.textContent, 'Ready to process 1 visible zero-seed row.');

  filterRows = [];
  documentNodes.delete('#ant-adoption-filter-toolbar');
  documentNodes.delete('#ant-cross-seed-toolbar');
  documentNodes.delete('#ant-cross-seed-progress');
  documentNodes.delete('#ant-adoption-filter-status');
  context.location.href = previousHref;
});

test('maximum size filtering hides only rows larger than the configured limit', () => {
  const withinLimit = createRow({ sizeGib: 10 });
  const aboveLimit = createRow({ sizeGib: 10.01 });
  filterRows = [withinLimit, aboveLimit];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    maximumSizeGib: 10,
    hideAboveMaximumSize: true,
    hideBelowBountyThreshold: false
  });
  api.applyAdoptionFilters();
  assert.equal(withinLimit.hidden, false);
  assert.equal(aboveLimit.hidden, true);
});

test('minimum bounty filtering hides rows below but not equal to the configured amount', () => {
  const belowMinimum = createRow({ bounty: 499999 });
  const atMinimum = createRow({ bounty: 500000 });
  filterRows = [belowMinimum, atMinimum];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    minimumBounty: 500000,
    hideBelowMinimumBounty: true,
    hideBelowBountyThreshold: false
  });
  api.applyAdoptionFilters();
  assert.equal(belowMinimum.hidden, true);
  assert.equal(atMinimum.hidden, false);
});

test('show only Grabbed overrides every other row filter', () => {
  const grabbed = createRow({
    action: 'grabbed',
    bounty: 1,
    bountyPerGib: 1,
    metadata: 'VHS',
    sizeGib: 100,
    trumpable: true
  });
  const normal = createRow({ action: '' });
  filterRows = [grabbed, normal];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    minimumBounty: 999999999,
    maximumSizeGib: 1,
    excludedFormats: { Source: { mode: 'ignore', values: ['VHS'] } },
    hideBelowBountyThreshold: true,
    hideBelowMinimumBounty: true,
    hideAboveMaximumSize: true,
    hideExcludedFormats: true,
    hideGrabbedRows: true,
    showOnlyGrabbedRows: true,
    skipTrumpable: true,
    seedingFilter: 'Seeding only'
  });
  api.applyAdoptionFilters();
  assert.equal(grabbed.hidden, false);
  assert.equal(normal.hidden, true);
  assert.deepEqual([...api.getRows()], [grabbed]);
});

test('saved-scan metadata uses the same filtering rules before DOM rendering', () => {
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: true,
    hideExcludedFormats: true,
    excludedFormats: { Source: { mode: 'ignore', values: ['VHS'] } },
    minimumBountyPerGib: 200
  };
  const regexes = api.buildMediaFilterMatchers(state.excludedFormats);

  assert.equal(
    api.getAdoptionFilterResult(
      { bounty: 1000, bountyPerGib: 500, metadata: 'Movie WEB-DL', sizeGiB: 2 },
      '',
      regexes,
      state
    ).hidden,
    false
  );
  assert.equal(
    api.getAdoptionFilterResult(
      { bounty: 1000, bountyPerGib: 500, metadata: 'Movie VHS', sizeGiB: 2 },
      '',
      regexes,
      state
    ).hidden,
    true
  );
});

test('deferred saved-scan hydration selects only rows exposed by the current filters', () => {
  const entries = [
    { data: { bounty: 750000, bountyPerGib: 1000, torrentId: '1' }, html: 'visible' },
    { data: { bounty: 250000, bountyPerGib: 1000, torrentId: '2' }, html: 'low bounty' },
    { data: { bounty: 900000, bountyPerGib: 1000, torrentId: '3' }, html: 'normal' }
  ];
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    hideBelowMinimumBounty: true,
    hideIgnoredRows: false,
    minimumBounty: 500000
  };
  const result = api.partitionFilteredScanEntries(
    entries,
    new Map([
      ['1', 'ignored'],
      ['2', 'ignored']
    ]),
    [],
    state
  );

  assert.equal(result.visibleEntries.map((entry) => entry.data.torrentId).join(','), '1,3');
  assert.equal(result.hiddenEntries.map((entry) => entry.data.torrentId).join(','), '2');
});

test('filter lifecycle logging measures through browser presentation', () => {
  const previousConsole = context.console;
  const previousHref = context.location.href;
  const previousRequestAnimationFrame = context.requestAnimationFrame;
  const frameCallbacks = [];
  const lifecycleMessages = [];
  context.console = {
    ...console,
    info(...args) {
      lifecycleMessages.push(args);
    }
  };
  context.location.href =
    'https://anthelion.me/torrents.php?type=adoption&page=1&ant_adoption_filtered=1';
  context.requestAnimationFrame = (callback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  };
  configValues.set('use_cache', false);
  filterRows = [createRow()];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false
  });

  try {
    api.applyAdoptionFilters(false);
    assert.equal(frameCallbacks.length, 1);
    frameCallbacks.shift()();
    assert.equal(frameCallbacks.length, 1);
    frameCallbacks.shift()();

    const presented = lifecycleMessages.find(([message]) =>
      message.endsWith('adoption filter update presented')
    );
    assert.ok(presented);
    assert.match(presented[1].timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(typeof presented[1].durationMs, 'number');
    assert.equal(typeof presented[1].lifecycleElapsedMs, 'number');
    assert.equal(typeof presented[1].sincePreviousLogMs, 'number');
    assert.equal(typeof presented[1].sequence, 'number');
    assert.equal(presented[1].evaluatedRows, 1);
    assert.equal(presented[1].visibleRows, 1);
  } finally {
    context.console = previousConsole;
    context.location.href = previousHref;
    context.requestAnimationFrame = previousRequestAnimationFrame;
    configValues.delete('use_cache');
    api.setFilterState(null);
    filterRows = [];
  }
});

test('the page toggle hides trumpable rows and exposes them when disabled', () => {
  const normal = createRow();
  const trumpable = createRow({ trumpable: true });
  filterRows = [normal, trumpable];
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    skipTrumpable: true
  };
  api.setFilterState(state);
  api.applyAdoptionFilters();
  assert.equal(normal.hidden, false);
  assert.equal(trumpable.hidden, true);
  assert.deepEqual([...api.getRows()], [normal]);

  state.skipTrumpable = false;
  api.applyAdoptionFilters();
  assert.equal(trumpable.hidden, false);
  assert.deepEqual([...api.getRows()], [normal, trumpable]);
});

test('updates the filtered-page progress display', () => {
  const bar = { max: 0, value: 0 };
  const label = { textContent: '' };
  const display = {
    dataset: {},
    querySelector(selector) {
      return selector === 'progress' ? bar : label;
    }
  };
  documentNodes.set('#ant-cross-seed-progress', display);

  api.updateRunProgress(2, 5, 'Handled 2 of 5 rows.', 'running');

  assert.equal(display.dataset.state, 'running');
  assert.equal(bar.max, 5);
  assert.equal(bar.value, 2);
  assert.equal(label.textContent, 'Handled 2 of 5 rows.');
  assert.match(source, /if \(!isFilteredAdoptionView\(\)/);
  documentNodes.delete('#ant-cross-seed-progress');
});

test('normal adoption pages get only scan, last scan, and settings controls', () => {
  const previousHref = context.location.href;
  configValues.set('scan_page_count', 2);
  configValues.set('minimum_bounty', 500);
  configValues.set('row_limit', 25);
  storage.delete('ant-adoption-filename-cross-seed:filtered-scan-v2');
  const inserted = [];
  const target = {
    nextSibling: null,
    parentNode: {
      insertBefore(node) {
        inserted.push(node);
      }
    }
  };
  documentNodes.set('.thin > h2, #content > h2, h2', target);

  context.location.href = 'https://anthelion.me/torrents.php?type=adoption&page=1';
  api.addControls();
  assert.deepEqual(
    Array.from(inserted.at(-1).children, (child) => child.textContent),
    ['Scan 2 adoption pages', 'Scan until bounty < 500', 'Open last scan', 'Settings']
  );
  const openLastScanButton = inserted.at(-1).children[2];
  documentNodes.set('#ant-adoption-open-last-scan', openLastScanButton);
  api.updateOpenLastScanButton();
  assert.equal(openLastScanButton.hidden, false);
  assert.equal(openLastScanButton.disabled, true);

  context.location.href =
    'https://anthelion.me/torrents.php?type=adoption&page=1&ant_adoption_filtered=1';
  api.addControls();
  assert.deepEqual(
    Array.from(inserted.at(-1).children, (child) => child.textContent),
    [
      'Scan 2 adoption pages',
      'Scan until bounty < 500',
      'Open last scan',
      'Process next 25 adoption rows',
      'Cancel row processing',
      'Settings'
    ]
  );
  assert.match(source, /if \(!filteredAdoptionView\) return;\s+decorateAdoptionRows\(\);/);

  documentNodes.delete('.thin > h2, #content > h2, h2');
  documentNodes.delete('#ant-adoption-open-last-scan');
  configValues.delete('scan_page_count');
  configValues.set('minimum_bounty', 0);
  configValues.delete('row_limit');
  context.location.href = previousHref;
});

test('an unavailable saved scan exits filtered mode before controls initialize', () => {
  const previousHref = context.location.href;
  context.location.href =
    'https://anthelion.me/torrents.php?type=adoption&page=1&ant_adoption_filtered=1';

  api.exitFilteredAdoptionView();

  assert.equal(new URL(context.location.href).searchParams.has('ant_adoption_filtered'), false);
  assert.match(
    source,
    /if \(filteredAdoptionView && !restoreFilteredScanRows\(\)\) \{\s+exitFilteredAdoptionView\(\);\s+filteredAdoptionView = false;/
  );
  context.location.href = previousHref;
});

test('settings refresh preserves scan locks and keeps bounty scan disabled at zero', () => {
  const fixedProgress = 'Scanning adoption page 2/4...';
  const bountyProgress = 'Scanning bounty-sorted adoption page 2/30; stopping below 500...';
  const fixedButton = { disabled: false, textContent: fixedProgress };
  const bountyButton = { disabled: false, textContent: 'Scan until bounty < 500', title: '' };
  const openLastScanButton = { disabled: false, hidden: false, title: '' };
  documentNodes.set('#ant-adoption-scan', fixedButton);
  documentNodes.set('#ant-adoption-scan-bounty', bountyButton);
  documentNodes.set('#ant-adoption-open-last-scan', openLastScanButton);
  configValues.set('scan_page_count', 4);
  configValues.set('minimum_bounty', 500);
  api.saveFilteredScan(createFilteredScan(['<tr>saved scan</tr>']));

  api.setAdoptionScanRunning(true);
  api.refreshAdoptionViewFromSettings();
  assert.equal(fixedButton.disabled, true);
  assert.equal(bountyButton.disabled, true);
  assert.equal(openLastScanButton.disabled, true);
  assert.equal(openLastScanButton.title, 'Wait for the current scan to finish');
  assert.equal(fixedButton.textContent, fixedProgress);

  bountyButton.textContent = bountyProgress;
  api.refreshAdoptionViewFromSettings();
  assert.equal(bountyButton.textContent, bountyProgress);

  api.setAdoptionScanRunning(false);
  configValues.set('minimum_bounty', 0);
  api.refreshAdoptionViewFromSettings();
  assert.equal(fixedButton.disabled, false);
  assert.equal(fixedButton.textContent, 'Scan 4 adoption pages');
  assert.equal(bountyButton.disabled, true);
  assert.equal(bountyButton.textContent, 'Scan until minimum bounty');
  assert.equal(openLastScanButton.disabled, false);

  documentNodes.delete('#ant-adoption-scan');
  documentNodes.delete('#ant-adoption-scan-bounty');
  documentNodes.delete('#ant-adoption-open-last-scan');
  configValues.delete('scan_page_count');
});

test('a triggered scan stays on the current page and locks Open last scan until complete', async () => {
  const fixedButton = { disabled: false, textContent: '' };
  const bountyButton = { disabled: false, textContent: '', title: '' };
  const openLastScanButton = { disabled: false, hidden: false, title: '' };
  documentNodes.set('#ant-adoption-scan', fixedButton);
  documentNodes.set('#ant-adoption-scan-bounty', bountyButton);
  documentNodes.set('#ant-adoption-open-last-scan', openLastScanButton);
  configValues.set('scan_page_count', 1);
  configValues.set('scan_delay_seconds', 0);
  configValues.set('minimum_bounty', 500);
  api.saveFilteredScan(createFilteredScan(['<tr>previous scan</tr>']));
  parsedDocuments.set(
    'current-page-scan',
    createScannedDocument([{ id: '901', html: '<tr>current scan</tr>' }])
  );
  let openCalls = 0;
  context.window = {
    open() {
      openCalls += 1;
    }
  };
  requestResponses = [
    {
      status: 200,
      responseText: 'current-page-scan',
      beforeResponse() {
        assert.equal(fixedButton.disabled, true);
        assert.equal(bountyButton.disabled, true);
        assert.equal(openLastScanButton.disabled, true);
        assert.equal(openLastScanButton.title, 'Wait for the current scan to finish');
        api.openLastFilteredScan();
        assert.equal(openCalls, 0);
      }
    }
  ];

  await api.startAdoptionScan(fixedButton);

  assert.equal(openCalls, 0);
  assert.equal(fixedButton.disabled, false);
  assert.equal(fixedButton.textContent, 'Scan 1 adoption pages');
  assert.equal(bountyButton.disabled, false);
  assert.equal(openLastScanButton.disabled, false);
  assert.deepEqual([...api.loadFilteredScan().rows], ['<tr>current scan</tr>']);
  api.openLastFilteredScan();
  assert.equal(openCalls, 1, 'the filtered page should open only after an explicit button action');

  delete context.window;
  documentNodes.delete('#ant-adoption-scan');
  documentNodes.delete('#ant-adoption-scan-bounty');
  documentNodes.delete('#ant-adoption-open-last-scan');
  configValues.delete('scan_page_count');
  configValues.delete('scan_delay_seconds');
  configValues.set('minimum_bounty', 0);
});

test('row cancellation stops retries, later rows, and an active delay', async () => {
  const runButton = { disabled: false, textContent: '' };
  const cancelButton = { disabled: true, textContent: '' };
  const bar = { max: 0, value: 0 };
  const label = { textContent: '' };
  const display = {
    dataset: {},
    querySelector(selector) {
      return selector === 'progress' ? bar : label;
    }
  };
  documentNodes.set('#ant-cross-seed-run', runButton);
  documentNodes.set('#ant-cross-seed-cancel', cancelButton);
  documentNodes.set('#ant-cross-seed-progress', display);
  context.__collectBatchRowsTestOverride = () => ({
    batch: [{ row: {} }, { row: {} }],
    stats: { eligibleTotal: 2 }
  });
  configValues.set('row_delay_seconds', 30);

  let processCalls = 0;
  let rejectRequest;
  context.__processRowTestOverride = () => {
    processCalls += 1;
    return new Promise((_resolve, reject) => {
      rejectRequest = reject;
    });
  };
  const inFlightRun = api.run();
  await Promise.resolve();
  assert.equal(processCalls, 1);
  assert.equal(api.requestRowProcessingCancellation(), true);
  rejectRequest(new Error('cancelled request settled'));
  await inFlightRun;
  assert.equal(processCalls, 1, 'cancelled failure must not retry or process the next row');
  assert.equal(runButton.disabled, false);
  assert.equal(cancelButton.disabled, true);
  assert.equal(cancelButton.textContent, 'Cancel row processing');
  assert.equal(display.dataset.state, 'cancelled');

  scheduledTimeouts.length = 0;
  processCalls = 0;
  context.__processRowTestOverride = async () => {
    processCalls += 1;
  };
  const delayedRun = api.run();
  for (let attempt = 0; attempt < 5 && scheduledTimeouts.length === 0; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(processCalls, 1);
  assert.equal(scheduledTimeouts.length, 1);
  assert.equal(api.requestRowProcessingCancellation(), true);
  scheduledTimeouts.shift().callback();
  await delayedRun;
  assert.equal(processCalls, 1, 'cancelling the delay must prevent the next row');
  assert.equal(runButton.disabled, false);
  assert.equal(cancelButton.disabled, true);
  assert.equal(display.dataset.state, 'cancelled');

  delete context.__collectBatchRowsTestOverride;
  delete context.__processRowTestOverride;
  configValues.delete('row_delay_seconds');
  documentNodes.delete('#ant-cross-seed-run');
  documentNodes.delete('#ant-cross-seed-cancel');
  documentNodes.delete('#ant-cross-seed-progress');
});

test('bounty sorting parses each row once and reorders the table in one append', () => {
  const low = createRow({ bountyPerGib: 100 });
  const high = createRow({ bountyPerGib: 300 });
  const missing = createRow({ bountyPerGib: Number.NaN });
  let appendCalls = 0;
  let appended = [];
  const body = {
    append(...rows) {
      appendCalls += 1;
      appended = rows;
    }
  };
  const table = {
    querySelectorAll() {
      return [low, missing, high];
    },
    tBodies: [body]
  };

  api.sortAdoptionRowsByBounty(table, 'DESC');

  assert.equal(appendCalls, 1);
  assert.deepEqual(appended, [high, low, missing]);
});

test('configurable sorting supports field, direction, and restoring scan order', () => {
  const first = createRow({ bounty: 300, sizeGib: 3 });
  const second = createRow({ bounty: 100, sizeGib: 1 });
  const third = createRow({ bounty: 200, sizeGib: 2 });
  first.dataset.antAdoptionOriginalIndex = '0';
  second.dataset.antAdoptionOriginalIndex = '1';
  third.dataset.antAdoptionOriginalIndex = '2';
  let rows = [first, second, third];
  const body = {
    append(...values) {
      rows = values;
    }
  };
  const table = {
    querySelectorAll() {
      return rows;
    },
    tBodies: [body]
  };

  api.sortAdoptionRows(table, 'Bounty', 'Ascending');
  assert.deepEqual(rows, [second, third, first]);
  api.sortAdoptionRows(table, 'Size', 'Descending');
  assert.deepEqual(rows, [first, third, second]);
  api.sortAdoptionRows(table, 'Scan order', 'Descending');
  assert.deepEqual(rows, [first, second, third]);
});

test('page load restores cached processing details for action rows without lookup requests', () => {
  configValues.set('use_cache', true);
  configValues.set('load_cache_status_on_page_load', false);
  const normal = createRestorableRow('901');
  const grabbed = createRestorableRow('902', 'grabbed');
  grabbed.hidden = false;
  filterRows = [normal, grabbed];
  const trackerMatch = {
    downloadUrl: 'https://passthepopcorn.me/torrents.php?action=download&id=1',
    title: 'Cached release',
    detailsUrl: 'https://passthepopcorn.me/torrents.php?id=1',
    downloadUrl: '',
    seeders: 4,
    site: 'PTP',
    title: 'Example'
  };
  api.cacheSet(
    api.iconCacheKey('PTP', 'https://passthepopcorn.me/favicon.ico'),
    'data:image/png;base64,aWNvbg=='
  );
  api.cacheRowProcessingData(
    '901',
    'Normal.mkv',
    [{ site: 'PTP' }],
    [{ name: 'Normal.mkv', savePath: 'D:\\Media' }],
    [trackerMatch],
    '1 match',
    'done'
  );
  api.cacheRowProcessingData(
    '902',
    'Grabbed.mkv',
    [{ site: 'PTP' }],
    [{ name: 'Grabbed.mkv', savePath: 'D:\\Media' }],
    [trackerMatch],
    '1 match',
    'done'
  );

  const requestCount = requestedUrls.length;
  api.loadCachedRowStatusesOnPageLoad();

  assert.equal(findDescendantByClass(normal, 'ant-cross-seed-state'), null);
  assert.equal(findDescendantByClass(grabbed, 'ant-cross-seed-state').textContent, '1 match');
  assert.ok(findDescendantByClass(grabbed, 'ant-cross-seed-qui-title'));
  assert.ok(findDescendantByClass(grabbed, 'ant-cross-seed-match'));
  assert.equal(requestedUrls.length, requestCount);

  configValues.set('load_cache_status_on_page_load', true);
  api.loadCachedRowStatusesOnPageLoad();
  assert.equal(findDescendantByClass(normal, 'ant-cross-seed-state').textContent, '1 match');
  assert.equal(requestedUrls.length, requestCount);

  configValues.delete('load_cache_status_on_page_load');
  filterRows = [];
});

test('filter transitions enqueue cached UI restoration for each newly visible row', async () => {
  configValues.set('use_cache', true);
  configValues.set('load_cache_status_on_page_load', false);
  const firstGrabbed = createRestorableRow('1902', 'grabbed', { bounty: 100 });
  const secondGrabbed = createRestorableRow('1903', 'grabbed', { bounty: 200 });
  api.cacheRowProcessingData('1902', 'FirstGrabbed.mkv', [], [], [], 'first cached', 'done');
  api.cacheRowProcessingData('1903', 'SecondGrabbed.mkv', [], [], [], 'second cached', 'done');
  filterRows = [firstGrabbed, secondGrabbed];
  const filterState = {
    ...api.getDefaultAdoptionFilterState(),
    hideAboveMaximumSize: false,
    hideBelowBountyThreshold: false,
    hideBelowMinimumBounty: true,
    hideExcludedFormats: false,
    hideGrabbedRows: false,
    hideIgnoredRows: false,
    maximumSizeGib: 0,
    minimumBounty: 300,
    minimumBountyPerGib: 0,
    seedingFilter: 'All rows',
    showOnlyGrabbedRows: false,
    skipTrumpable: false
  };
  api.setFilterState(filterState);
  api.applyAdoptionFilters(false);
  assert.equal(firstGrabbed.hidden, true);
  assert.equal(secondGrabbed.hidden, true);

  filterState.minimumBounty = 150;
  let timerStart = scheduledTimeouts.length;
  api.applyAdoptionFilters(false);
  let restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(secondGrabbed, 'ant-cross-seed-state').textContent,
    'second cached'
  );
  assert.equal(findDescendantByClass(firstGrabbed, 'ant-cross-seed-state'), null);

  filterState.minimumBounty = 0;
  timerStart = scheduledTimeouts.length;
  api.applyAdoptionFilters(false);
  restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(firstGrabbed, 'ant-cross-seed-state').textContent,
    'first cached'
  );

  const actionTransition = createRestorableRow('1906');
  api.cacheRowProcessingData(
    '1906',
    'ActionTransition.mkv',
    [],
    [],
    [],
    'action transition cached',
    'done'
  );
  filterRows = [actionTransition];
  api.applyAdoptionFilters(false);
  assert.equal(findDescendantByClass(actionTransition, 'ant-cross-seed-state'), null);
  timerStart = scheduledTimeouts.length;
  api.markAdoptionRowGrabbed(actionTransition);
  restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(actionTransition, 'ant-cross-seed-state').textContent,
    'action transition cached'
  );

  const settingsTransition = createRestorableRow('1907');
  api.cacheRowProcessingData(
    '1907',
    'SettingsTransition.mkv',
    [],
    [],
    [],
    'settings transition cached',
    'done'
  );
  filterRows = [settingsTransition];
  configValues.set('load_cache_status_on_page_load', false);
  api.applyAdoptionFilters(false);
  assert.equal(findDescendantByClass(settingsTransition, 'ant-cross-seed-state'), null);
  configValues.set('load_cache_status_on_page_load', true);
  timerStart = scheduledTimeouts.length;
  api.applyAdoptionFilters(false);
  restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(settingsTransition, 'ant-cross-seed-state').textContent,
    'settings transition cached'
  );

  const firstNormal = createRestorableRow('1904', '', { bounty: 100 });
  const secondNormal = createRestorableRow('1905', '', { bounty: 200 });
  api.cacheRowProcessingData('1904', 'FirstNormal.mkv', [], [], [], 'first normal cached', 'done');
  api.cacheRowProcessingData(
    '1905',
    'SecondNormal.mkv',
    [],
    [],
    [],
    'second normal cached',
    'done'
  );
  filterRows = [firstNormal, secondNormal];
  filterState.minimumBounty = 300;
  api.applyAdoptionFilters(false);

  filterState.minimumBounty = 150;
  timerStart = scheduledTimeouts.length;
  api.applyAdoptionFilters(false);
  restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(secondNormal, 'ant-cross-seed-state').textContent,
    'second normal cached'
  );
  assert.equal(findDescendantByClass(firstNormal, 'ant-cross-seed-state'), null);

  filterState.minimumBounty = 0;
  timerStart = scheduledTimeouts.length;
  api.applyAdoptionFilters(false);
  restoration = api.getCachedRowStatusRestoreQueue();
  await flushScheduledPromise(restoration, timerStart);
  assert.equal(
    findDescendantByClass(firstNormal, 'ant-cross-seed-state').textContent,
    'first normal cached'
  );

  configValues.delete('load_cache_status_on_page_load');
  api.setFilterState(null);
  filterRows = [];
});

test('deferred cache restoration uses one pass without timer-throttled chunks', async () => {
  const previousHref = context.location.href;
  context.location.href = 'https://anthelion.me/torrents.php?type=adoption';
  configValues.set('use_cache', true);
  configValues.set('load_cache_status_on_page_load', false);
  const rows = Array.from({ length: 41 }, (_, index) => {
    const torrentId = String(2000 + index);
    const row = createRestorableRow(torrentId, 'grabbed');
    row.hidden = false;
    api.cacheRowProcessingData(
      torrentId,
      `Chunk${index}.mkv`,
      [],
      [],
      [],
      `cached ${index}`,
      'done'
    );
    return row;
  });
  filterRows = rows;

  const timerStart = scheduledTimeouts.length;
  await api.scheduleCachedRowStatusesOnPageLoad();
  assert.equal(scheduledTimeouts.length, timerStart);
  assert.equal(rows[0].dataset.antCrossSeedPageCacheChecked, 'true');
  assert.equal(rows[40].dataset.antCrossSeedPageCacheChecked, 'true');
  assert.equal(findDescendantByClass(rows[40], 'ant-cross-seed-state').textContent, 'cached 40');

  configValues.delete('load_cache_status_on_page_load');
  filterRows = [];
  context.location.href = previousHref;
});

test('fetches tracker icons as blobs, stores Base64, and reuses the persistent cache', async () => {
  configValues.set('use_cache', true);
  const iconUrl = 'https://icons.example/favicon.ico';
  const dataUrl = 'data:image/png;base64,aWNvbg==';
  const key = api.iconCacheKey('TEST', iconUrl);
  api.cacheDelete(key);
  requestedOptions.length = 0;
  requestResponses = [
    { status: 200, response: new TestBlob([], { dataUrl, type: 'image/png' }), responseText: '' }
  ];

  assert.equal(await api.ensureIconDataUrl('TEST', iconUrl), dataUrl);
  assert.equal(requestedOptions.length, 1);
  assert.equal(requestedOptions[0].responseType, 'blob');
  assert.equal(api.getCachedIconDataUrl('TEST', iconUrl), dataUrl);

  assert.equal(await api.ensureIconDataUrl('TEST', iconUrl), dataUrl);
  assert.equal(requestedOptions.length, 1, 'cached icon must not be fetched again');
});

test('uncached match icons never assign a remote image source to the page', async () => {
  configValues.set('use_cache', true);
  const torrentId = '19810';
  const iconUrl = 'https://aura4k.net/favicon.ico';
  const dataUrl = 'data:image/png;base64,dW5jYWNoZWQ=';
  const match = {
    detailsUrl: 'https://aura4k.net/torrents/1',
    downloadUrl: 'https://aura4k.net/download/1',
    seeders: 1,
    site: 'A4K',
    title: 'Uncached icon match'
  };
  api.cacheDelete(api.iconCacheKey(match.site, iconUrl));
  api.cacheRowProcessingData(
    torrentId,
    'UncachedIcon.mkv',
    [{ site: match.site }],
    [],
    [match],
    '1 match',
    'done'
  );
  requestResponses = [
    { status: 200, response: new TestBlob([], { dataUrl, type: 'image/png' }), responseText: '' }
  ];
  const row = createRestorableRow(torrentId, 'grabbed');
  row.hidden = false;

  api.restoreCachedRowStatuses([row]);
  const icon = findDescendantByClass(row, 'ant-cross-seed-icon');
  assert.equal(icon.hidden, true);
  assert.doesNotMatch(String(icon.src || ''), /^https?:/);
  for (let attempt = 0; attempt < 8 && icon.src !== dataUrl; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(icon.src, dataUrl);
  assert.equal(icon.hidden, false);
});

test('the cross-seed run receives only currently visible zero-seed rows', () => {
  const visible = createRow();
  const hidden = createRow();
  hidden.hidden = true;
  filterRows = [visible, hidden];
  assert.deepEqual([...api.getRows()], [visible]);
});

test('adoption page scans have a hard limit of 30 pages', () => {
  configValues.set('scan_page_count', 99);
  assert.equal(api.getScanPageCount(), 30);
  assert.equal(context.GM_config.definition.fields.scan_page_count.max, 30);
  configValues.delete('scan_page_count');
});

test('ANT page reads use the page session for scans and torrent metadata', async () => {
  const previousRequest = context.GM_xmlhttpRequest;
  const previousHref = context.location.href;
  const requestStart = pageRequests.length;
  let backgroundRequests = 0;
  context.GM_xmlhttpRequest = (options) => {
    backgroundRequests += 1;
    queueMicrotask(() =>
      options.onload({ status: 403, responseText: 'blocked extension request' })
    );
  };
  context.location.href = 'https://anthelion.me/torrents.php?type=adoption';
  configValues.set('scan_page_count', 1);
  configValues.set('scan_delay_seconds', 0);
  configValues.set('use_cache', false);
  parsedDocuments.set(
    'session-ant-scan',
    createScannedDocument([{ id: '98411', html: '<tr>session scan</tr>' }])
  );
  parsedDocuments.set('session-ant-metadata', {
    querySelectorAll: () => [{ textContent: 'Session.mkv' }],
    querySelector: () => null
  });
  requestResponses = [
    { status: 200, responseText: 'session-ant-scan' },
    { status: 200, responseText: 'session-ant-metadata' }
  ];
  try {
    await api.scanAdoptionPages(null);
    assert.deepEqual([...api.loadFilteredScan().rows], ['<tr>session scan</tr>']);
    const metadata = await api.getAntMetadata('98411', '741');
    assert.equal(metadata.filename, 'Session.mkv');
    assert.equal(backgroundRequests, 0);
    const requests = pageRequests.slice(requestStart);
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /type=adoption/);
    assert.match(requests[1].url, /id=741&torrentid=98411/);
    for (const request of requests) {
      assert.equal(request.credentials, 'same-origin');
      assert.equal(request.mode, 'same-origin');
      assert.ok(request.signal instanceof AbortSignal);
    }
  } finally {
    context.GM_xmlhttpRequest = previousRequest;
    context.location.href = previousHref;
    configValues.delete('scan_page_count');
    configValues.delete('scan_delay_seconds');
    configValues.set('use_cache', true);
  }
});

test('ANT access errors explain how to retry and preserve the saved scan and metadata', async () => {
  const previous = createFilteredScan(['<tr>previous session scan</tr>']);
  api.saveFilteredScan(previous);
  configValues.set('scan_page_count', 1);
  configValues.set('scan_delay_seconds', 0);
  api.cacheDelete('ant-metadata-v2:98412');
  try {
    for (const status of [401, 403]) {
      requestResponses = [{ status, responseText: 'ANT access denied' }];
      await assert.rejects(api.scanAdoptionPages(null), (error) => {
        assert.match(error.message, new RegExp(`ANT page 1 returned HTTP ${status}`));
        assert.match(error.message, /sign in or complete any security check/);
        return true;
      });
      assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(previous));
      requestResponses = [{ status, responseText: 'ANT access denied' }];
      await assert.rejects(api.getAntMetadata('98412', '741'), (error) => {
        assert.match(error.message, new RegExp(`ANT torrent 98412 returned HTTP ${status}`));
        assert.match(error.message, /sign in or complete any security check/);
        return true;
      });
      assert.equal(api.cacheGet('ant-metadata-v2:98412', null), null);
    }
  } finally {
    configValues.delete('scan_page_count');
    configValues.delete('scan_delay_seconds');
  }
});

test('ANT page timeouts cover pending responses and bodies without replacing the saved scan', async () => {
  const previousFetch = context.unsafeWindow.fetch;
  const previousAbortSignal = context.unsafeWindow.AbortSignal;
  const previous = createFilteredScan(['<tr>previous timeout scan</tr>']);
  api.saveFilteredScan(previous);
  configValues.set('scan_page_count', 1);
  configValues.set('scan_delay_seconds', 0);
  try {
    for (const phase of ['response', 'body']) {
      const controller = new AbortController();
      const timeoutError = new DOMException('ANT request timed out', 'TimeoutError');
      context.unsafeWindow.AbortSignal = {
        timeout(milliseconds) {
          assert.equal(milliseconds, 30000);
          return controller.signal;
        }
      };
      let markWaiting;
      const waiting = new Promise((resolve) => {
        markWaiting = resolve;
      });
      context.unsafeWindow.fetch = async (_url, options) => {
        const pending = () => {
          markWaiting();
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(options.signal.reason), {
              once: true
            });
          });
        };
        return phase === 'response' ? pending() : { ok: true, status: 200, text: pending };
      };
      const scan = api.scanAdoptionPages(null);
      await waiting;
      controller.abort(timeoutError);
      await assert.rejects(scan, (error) => error === timeoutError);
      assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(previous));
    }
  } finally {
    context.unsafeWindow.fetch = previousFetch;
    context.unsafeWindow.AbortSignal = previousAbortSignal;
    configValues.delete('scan_page_count');
    configValues.delete('scan_delay_seconds');
  }
});

test('a bounty-limited scan sorts descending and stops before the first lower bounty', async () => {
  configValues.set('minimum_bounty', 500);
  configValues.set('scan_delay_seconds', 0);
  parsedDocuments.set(
    'bounty-page-one',
    createScannedDocument([
      { id: '11', html: '<tr>one thousand</tr>', bounty: 1000 },
      { id: '12', html: '<tr>seven hundred fifty</tr>', bounty: 750 }
    ])
  );
  parsedDocuments.set(
    'bounty-page-two',
    createScannedDocument([
      { id: '13', html: '<tr>five hundred</tr>', bounty: 500 },
      { id: '14', html: '<tr>four hundred ninety nine</tr>', bounty: 499 }
    ])
  );
  requestResponses = [
    { status: 200, responseText: 'bounty-page-one' },
    { status: 200, responseText: 'bounty-page-two' }
  ];
  const requestStart = requestedOptions.length;
  await api.scanAdoptionPages(null, true);

  const scan = api.loadFilteredScan();
  assert.equal(scan.version, 2);
  assert.equal(scan.pageCount, 2);
  assert.equal(scan.scanMode, 'minimum-bounty');
  assert.equal(scan.minimumBounty, 500);
  assert.deepEqual(
    [...scan.rows],
    ['<tr>one thousand</tr>', '<tr>seven hundred fifty</tr>', '<tr>five hundred</tr>']
  );
  assert.deepEqual(
    Array.from(scan.rowData, (entry) => entry.torrentId),
    ['11', '12', '13']
  );
  const scanRequests = requestedOptions.slice(requestStart);
  assert.equal(scanRequests.length, 2);
  for (const [index, options] of scanRequests.entries()) {
    const url = new URL(options.url);
    assert.equal(url.searchParams.get('order'), 'Bounty');
    assert.equal(url.searchParams.get('way'), 'DESC');
    assert.equal(url.searchParams.get('page'), String(index + 1));
  }
  configValues.set('minimum_bounty', 0);
  configValues.delete('scan_delay_seconds');
});

test('a bounty-limited scan rejects unsorted results without replacing the saved scan', async () => {
  configValues.set('minimum_bounty', 500);
  configValues.set('scan_delay_seconds', 0);
  const previous = createFilteredScan(['<tr>previous bounty scan</tr>'], {
    scannedAt: '2026-09-16T00:00:00.000Z'
  });
  api.saveFilteredScan(previous);
  parsedDocuments.set(
    'unsorted-bounty-page',
    createScannedDocument([
      { id: '21', html: '<tr>seven hundred</tr>', bounty: 700 },
      { id: '22', html: '<tr>eight hundred</tr>', bounty: 800 }
    ])
  );
  requestResponses = [{ status: 200, responseText: 'unsorted-bounty-page' }];

  await assert.rejects(api.scanAdoptionPages(null, true), /not sorted by bounty descending/);
  assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(previous));

  configValues.set('minimum_bounty', 0);
  configValues.delete('scan_delay_seconds');
});

test('a filtered scan verification failure restores the previous saved scan', () => {
  const previous = createFilteredScan(['<tr>verified previous scan</tr>'], {
    scannedAt: '2026-09-16T00:00:00.000Z'
  });
  api.saveFilteredScan(previous);
  filteredScanCorruptWritesRemaining = 1;

  assert.throws(
    () =>
      api.saveFilteredScan(
        createFilteredScan(['<tr>replacement scan</tr>'], {
          pageCount: 2
        })
      ),
    /could not be verified/
  );
  assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(previous));
});

test('a failed scan preserves the previously saved complete snapshot', async () => {
  configValues.set('scan_page_count', 2);
  configValues.set('scan_delay_seconds', 0);
  const previous = createFilteredScan(['<tr>previous</tr>'], {
    scannedAt: '2026-09-14T00:00:00.000Z'
  });
  api.saveFilteredScan(previous);
  parsedDocuments.set('page-one', createScannedDocument([{ id: '1', html: '<tr>one</tr>' }]));
  requestResponses = [
    { status: 200, responseText: 'page-one' },
    { status: 500, responseText: 'failure' }
  ];

  await assert.rejects(api.scanAdoptionPages(null), /HTTP 500/);
  assert.equal(JSON.stringify(api.loadFilteredScan()), JSON.stringify(previous));
});

test('a complete scan deduplicates and saves rows without opening the filtered ANT view', async () => {
  configValues.set('scan_page_count', 2);
  configValues.set('scan_delay_seconds', 0);
  parsedDocuments.set(
    'page-one',
    createScannedDocument([
      { id: '1', html: '<tr>one</tr>' },
      { id: '2', html: '<tr>two</tr>' }
    ])
  );
  parsedDocuments.set(
    'page-two',
    createScannedDocument([
      { id: '2', html: '<tr>two duplicate</tr>' },
      { id: '3', html: '<tr>three</tr>' }
    ])
  );
  requestResponses = [
    { status: 200, responseText: 'page-one' },
    { status: 200, responseText: 'page-two' }
  ];
  await api.scanAdoptionPages(null);

  const scan = api.loadFilteredScan();
  assert.equal(scan.rows.length, 3);
  assert.deepEqual([...scan.rows], ['<tr>one</tr>', '<tr>two</tr>', '<tr>three</tr>']);
  assert.deepEqual(
    Array.from(scan.rowData, (entry) => entry.torrentId),
    ['1', '2', '3']
  );
});

test('qui completion marking persists Grabbed and updates the row control', () => {
  assert.match(
    source,
    /if \(!isquiAddJobPending\(job\)\) \{\s+handleCompletedquiAddJob\(key, job\);/
  );
  const row = createRow();
  filterRows = [row];
  api.setFilterState({
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false
  });
  api.markAdoptionRowGrabbed(row, '123');
  assert.equal(api.getTorrentAction('123'), 'grabbed');
  assert.equal(row.dataset.antAdoptionAction, 'grabbed');
  assert.equal(row.select.value, 'grabbed');
  assert.equal(row.classes.has('ant-adoption-highlight-grabbed'), true);
});

test('page-load restoration reads only migrated row snapshots', () => {
  configValues.set('use_cache', true);
  const torrentId = '98100';
  const row = createRestorableRow(torrentId, 'grabbed');
  row.hidden = false;
  api.cacheDelete(`row-processing-v1:${torrentId}`);
  api.cacheSet(`ant-metadata-v2:${torrentId}`, { filename: 'LegacyOnly.mkv' });
  api.cacheSet(`row-complete-v3:${torrentId}:LegacyOnly.mkv:PTP`, {
    completedAt: 1,
    filename: 'LegacyOnly.mkv',
    status: 'fully-completed',
    torrentId,
    trackers: ['PTP']
  });

  assert.equal(api.restoreCachedRowStatuses([row], [{ site: 'PTP' }]), 0);
  assert.equal(row.dataset.antCrossSeedPageCacheChecked, 'true');
  assert.equal(findDescendantByClass(row, 'ant-cross-seed-state'), null);
});

test('one-time row cache migration verifies snapshots before removing stale entries', () => {
  const migrationKey = 'ant-adoption-filename-cross-seed:row-processing-migration-v1';
  const suppressKey = 'ant-adoption-filename-cross-seed:suppress-completed-action-recovery';
  const grabbedId = '98101';
  const ignoredId = '98102';
  const staleCompletionKey = `row-complete-v2:${grabbedId}:MigratedGrabbed.mkv:PTP`;
  storage.delete(migrationKey);
  storage.delete(suppressKey);
  api.setTorrentAction(grabbedId, '');
  api.setTorrentAction(ignoredId, 'ignored');
  api.cacheDelete(`row-processing-v1:${grabbedId}`);
  api.cacheDelete(`row-processing-v1:${ignoredId}`);
  api.cacheSet(`ant-metadata-v2:${grabbedId}`, { filename: 'MigratedGrabbed.mkv' });
  api.cacheSet(`ant-metadata-v2:${ignoredId}`, { filename: 'MigratedIgnored.mkv' });
  api.cacheSet(staleCompletionKey, {
    completedAt: 10,
    filename: 'MigratedGrabbed.mkv',
    reason: 'qui-follow-up-ant-added',
    status: 'fully-completed',
    torrentId: grabbedId,
    trackers: ['PTP']
  });
  api.cacheSet(`row-complete-v3:${ignoredId}:MigratedIgnored.mkv:PTP`, {
    completedAt: 11,
    filename: 'MigratedIgnored.mkv',
    status: 'tracker-complete',
    torrentId: ignoredId,
    trackers: ['PTP']
  });

  cacheSetValueError = new Error('migration write failed');
  assert.equal(api.migrateLegacyRowProcessingCache(), false);
  cacheSetValueError = null;
  assert.ok(api.cacheGet(staleCompletionKey));
  assert.equal(storage.has(migrationKey), false);

  assert.equal(api.migrateLegacyRowProcessingCache(), true);
  assert.equal(storage.get(migrationKey), 1);
  assert.equal(api.getTorrentAction(grabbedId), 'grabbed');
  assert.equal(api.getTorrentAction(ignoredId), 'ignored');
  assert.equal(api.getCachedRowProcessingData(grabbedId).filename, 'MigratedGrabbed.mkv');
  assert.equal(api.getCachedRowProcessingData(ignoredId).filename, 'MigratedIgnored.mkv');
  assert.equal(api.cacheGet(staleCompletionKey, null), null);

  api.cacheDelete(`row-processing-v1:${grabbedId}`);
  assert.equal(api.migrateLegacyRowProcessingCache(), false);
  assert.equal(api.getCachedRowProcessingData(grabbedId), null);
});

test('metadata failures persist Broken, skip normal processing, and rescan bypasses cached metadata', async () => {
  configValues.set('use_cache', true);
  configValues.set('qui_base_url', '');
  configValues.set('qui_token', '');
  const row = createBatchRow('98301');
  const query = row.querySelector.bind(row);
  row.querySelector = (selector) =>
    selector === '.ant-cross-seed-state'
      ? findDescendantByClass(row, 'ant-cross-seed-state')
      : query(selector);
  requestedUrls.length = 0;
  requestResponses = [{ status: 500, responseText: 'failed' }];
  await api.processRow(row, 1, 2, []);
  assert.equal(api.getTorrentAction('98301'), 'broken');
  assert.match(findDescendantByClass(row, 'ant-cross-seed-state').textContent, /^broken:/);
  assert.equal(api.collectBatchRows([row], [], 0, true).stats.skippedBroken, 1);
  await api.processRow(row, 1, 1, []);
  assert.equal(requestedUrls.length, 1);
  const reloaded = createBatchRow('98301');
  assert.equal(api.restoreCachedRowStatuses([reloaded]), 1);
  assert.match(findDescendantByClass(reloaded, 'ant-cross-seed-state').textContent, /^broken:/);
  api.cacheSet('ant-metadata-v2:98301', { filename: 'Stale.mkv', imdbId: 'tt1234567' });
  requestResponses = [{ status: 200, responseText: 'missing-ant-files' }];
  parsedDocuments.set('missing-ant-files', {
    querySelectorAll: () => [],
    querySelector: () => null
  });
  await api.rescanBrokenRow(row, '98301');
  assert.equal(api.getTorrentAction('98301'), 'broken');
  assert.equal(requestedUrls.length, 2);
  parsedDocuments.set('recovered-ant-files', {
    querySelectorAll: () => [{ textContent: 'Recovered.mkv' }],
    querySelector: () => null
  });
  requestResponses = [{ status: 200, responseText: 'recovered-ant-files' }];
  await api.rescanBrokenRow(row, '98301');
  assert.equal(api.getTorrentAction('98301'), '');
  assert.equal(api.cacheGet('ant-metadata-v2:98301').filename, 'Recovered.mkv');
  assert.equal(requestedUrls.length, 3);
  assert.match(findDescendantByClass(row, 'ant-cross-seed-state').textContent, /ready to process/);
  const next = createBatchRow('98302');
  await api.processRow(next, 2, 2, [], {
    cachedMetadata: { filename: 'Next.mkv', imdbId: 'tt1234567' }
  });
  assert.equal(api.getTorrentAction('98302'), '');
  assert.ok(api.getCachedRowProcessingData('98302'));
});

test('filtered header sorting stays local and supports names and listing times', () => {
  const previousUrl = context.location.href;
  const headers = ['Name', 'Size', 'Bounty', 'Time'].map((order) => ({
    href: `https://anthelion.me/torrents.php?type=adoption&order=${order}&way=ASC`,
    textContent: order,
    dataset: {},
    listeners: {},
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
  }));
  const header = { querySelector: () => ({}), querySelectorAll: () => headers };
  const first = createRow();
  const second = createRow();
  first.dataset.antAdoptionName = 'Movie 10';
  second.dataset.antAdoptionName = 'Movie 2';
  first.dataset.antAdoptionListingTime = '1000';
  second.dataset.antAdoptionListingTime = '2000';
  let rows = [first, second];
  const table = {
    querySelector: () => header,
    querySelectorAll: (selector) => (selector === 'a[data-ant-adoption-sort]' ? headers : rows),
    tBodies: [
      {
        append(...values) {
          rows = values;
        }
      }
    ]
  };
  try {
    context.location.href = 'https://anthelion.me/torrents.php?type=adoption';
    api.ensureAdoptionColumns(table);
    assert.equal(headers[0].listeners.click, undefined);
    context.location.href += '&ant_adoption_filtered=1';
    api.ensureAdoptionColumns(table);
    let prevented = 0;
    headers[0].listeners.click({
      preventDefault() {
        prevented++;
      }
    });
    assert.deepEqual(rows, [second, first]);
    headers[0].listeners.click({
      preventDefault() {
        prevented++;
      }
    });
    assert.deepEqual(rows, [first, second]);
    headers[3].listeners.click({
      preventDefault() {
        prevented++;
      }
    });
    assert.deepEqual(rows, [second, first]);
    assert.equal(prevented, 3);
    assert.equal(headers[3].textContent, 'Listing Time ↓');
    assert.equal(context.location.href.includes('order='), false);
  } finally {
    context.location.href = previousUrl;
  }
});

test('missing title links with torrent IDs become Broken in collection and direct processing', async () => {
  const collected = createRestorableRow('98303');
  const result = api.collectBatchRows([collected], [], 0);
  assert.equal(result.batch.length, 0);
  assert.equal(api.getTorrentAction('98303'), 'broken');
  assert.equal(collected.dataset.antAdoptionAction, 'broken');
  const direct = createRestorableRow('98304');
  await api.processRow(direct, 1, 1, []);
  assert.equal(api.getTorrentAction('98304'), 'broken');
  assert.match(
    findDescendantByClass(direct, 'ant-cross-seed-state').textContent,
    /broken: missing ANT title/
  );
});

test('clearing Broken actions clears their stale status and hides rescan controls', () => {
  const previousRows = filterRows;
  const row = createBatchRow('98305');
  row.dataset.antAdoptionAction = 'broken';
  api.setTorrentAction('98305', 'broken');
  const cell = api.createActionCell(row, '98305', 'broken');
  row.appendChild(cell);
  const query = row.querySelector.bind(row);
  row.querySelector = (selector) => {
    if (selector === '.ant-cross-seed-state')
      return findDescendantByClass(row, 'ant-cross-seed-state');
    if (selector === '.ant-cross-seed-rescan-metadata')
      return findDescendantByClass(row, 'ant-cross-seed-rescan-metadata');
    return query(selector);
  };
  try {
    filterRows = [row];
    api.restoreCachedRowStatuses([row]);
    const button = findDescendantByClass(row, 'ant-cross-seed-rescan-metadata');
    assert.equal(button.hidden, false);
    api.clearAdoptionActions();
    assert.equal(api.getTorrentAction('98305'), '');
    assert.equal(button.hidden, true);
    assert.equal(
      findDescendantByClass(row, 'ant-cross-seed-state').textContent,
      'ready to retry metadata'
    );
  } finally {
    filterRows = previousRows;
  }
});

test('combined media filters require all ignores and all inclusions independently', () => {
  const previous = configValues.get('combine_media_filters');
  const previousRows = filterRows;
  const filters = {
    Source: { mode: 'ignore', values: ['WEB', 'DVD'] },
    Codec: { mode: 'ignore', values: ['H265'] },
    Resolution: { mode: 'only', values: ['1080p', '2160p'] },
    Audio: { mode: 'only', values: ['AAC'] },
    Language: { mode: 'ignore', values: [] }
  };
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    hideExcludedFormats: true,
    combineMediaFilters: true,
    excludedFormats: filters
  };
  const cases = [
    ['WEB H265 1080p AAC', true],
    ['DVD H265 2160p AAC', true],
    ['WEB H264 1080p AAC', false],
    ['BluRay H265 1080p AAC', false],
    ['BluRay H264 1080p AAC', false],
    ['BluRay H264 720p AAC', true],
    ['BluRay H264 1080p DTS', true]
  ];
  const matchers = api.buildMediaFilterMatchers(filters);
  try {
    for (const [metadata, hidden] of cases) {
      assert.equal(
        api.getAdoptionFilterResult({ metadata }, '', matchers, state).hidden,
        hidden,
        metadata
      );
    }
    const entries = cases.map(([metadata], index) => ({
      data: { torrentId: String(index), metadata }
    }));
    assert.equal(
      api.partitionFilteredScanEntries(entries, new Map(), matchers, state).visibleEntries.length,
      3
    );
    filterRows = cases.map(([metadata]) => createRow({ metadata }));
    api.setFilterState(state);
    api.applyAdoptionFilters();
    assert.deepEqual(
      filterRows.map((row) => row.hidden),
      cases.map(([, hidden]) => hidden)
    );
    api.saveAdoptionFilterSettings();
    assert.equal(api.getDefaultAdoptionFilterState().combineMediaFilters, true);
    state.combineMediaFilters = false;
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'WEB H264 1080p AAC' }, '', matchers, state).hidden,
      true
    );
    state.combineMediaFilters = true;
    for (const filters of [
      {},
      { Language: { mode: 'only', values: [] } },
      { Audio: { mode: 'only', values: ['AAC'] } }
    ]) {
      assert.equal(
        api.getAdoptionFilterResult(
          { metadata: 'AAC' },
          '',
          api.buildMediaFilterMatchers(filters),
          state
        ).hidden,
        false
      );
    }
    state.hideExcludedFormats = false;
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'WEB H265 1080p AAC' }, '', matchers, state).hidden,
      false
    );
  } finally {
    if (previous === undefined) configValues.delete('combine_media_filters');
    else configValues.set('combine_media_filters', previous);
    filterRows = previousRows;
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});

test('exclusion groups express VHS OR Xvid OR (SD AND WEB) independently of combination mode', () => {
  const groups = [
    { Source: { values: ['VHS'] } },
    { Codec: { values: ['Xvid'] } },
    { Resolution: { values: ['SD'] }, Source: { values: ['WEB'] } },
    {}
  ];
  const cases = [
    ['VHS H264 1080p AAC', true],
    ['BluRay Xvid 1080p AAC', true],
    ['WEB H264 SD AAC', true],
    ['DVD H264 SD AAC', false],
    ['WEB H264 1080p AAC', false],
    ['BluRay H265 2160p AAC', false]
  ];
  const previousRows = filterRows;
  const state = {
    ...api.getDefaultAdoptionFilterState(),
    hideBelowBountyThreshold: false,
    hideExcludedFormats: true,
    excludedFormats: {},
    exclusionGroups: groups
  };
  try {
    for (const combine of [false, true]) {
      state.combineMediaFilters = combine;
      const matchers = api.buildMediaFilterMatchers({}, groups);
      for (const [metadata, hidden] of cases) {
        assert.equal(
          api.getAdoptionFilterResult({ metadata }, '', matchers, state).hidden,
          hidden,
          metadata
        );
      }
      const entries = cases.map(([metadata], index) => ({
        data: { torrentId: String(index), metadata }
      }));
      assert.equal(
        api.partitionFilteredScanEntries(entries, new Map(), matchers, state).visibleEntries.length,
        3
      );
      filterRows = cases.map(([metadata]) => createRow({ metadata }));
      api.setFilterState(state);
      api.applyAdoptionFilters();
      assert.deepEqual(
        filterRows.map((row) => row.hidden),
        cases.map(([, hidden]) => hidden)
      );
    }
    const mixed = api.buildMediaFilterMatchers(
      { Audio: { mode: 'only', values: ['AAC'] } },
      groups
    );
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'WEB H264 1080p DTS' }, '', mixed, state).hidden,
      true
    );
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'WEB H264 1080p AAC' }, '', mixed, state).hidden,
      false
    );
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'VHS AAC' }, '', mixed, state).hidden,
      true
    );
    assert.equal(
      api.getAdoptionFilterResult(
        { metadata: 'anything' },
        '',
        api.buildMediaFilterMatchers({}, [{}]),
        state
      ).hidden,
      false
    );
    const multi = api.buildMediaFilterMatchers({}, [
      { Source: { values: ['WEB', 'DVD'] }, Resolution: { values: ['SD'] } }
    ]);
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'DVD SD' }, '', multi, state).hidden,
      true
    );
    assert.equal(
      api.getAdoptionFilterResult({ metadata: 'DVD 1080p' }, '', multi, state).hidden,
      false
    );
    state.hideExcludedFormats = false;
    assert.equal(api.getAdoptionFilterResult({ metadata: 'VHS' }, '', mixed, state).hidden, false);
  } finally {
    filterRows = previousRows;
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});

test('exclusion group controls add, remove, normalize, save and reload groups', () => {
  let changed;
  const control = api.createExclusionGroupsControl(context.document, [], (value) => {
    changed = value;
  });
  control.children.at(-1).listeners.click();
  let groups = control.querySelectorAll('.ant-exclusion-group');
  assert.equal(groups.length, 1);
  const filters = groups[0].querySelector('.ant-media-filters');
  const source = filters.children.find((node) => node.dataset.mediaCategory === 'Source');
  assert.equal(source.querySelector('select').hidden, true);
  const vhs = source.querySelectorAll('input').find((input) => input.value === 'VHS');
  vhs.checked = true;
  vhs.listeners.change();
  assert.deepEqual([...changed[0].Source.values], ['VHS']);
  control.children.at(-1).listeners.click();
  groups = control.querySelectorAll('.ant-exclusion-group');
  assert.equal(groups.length, 2);
  groups[0].children.at(-1).listeners.click();
  assert.equal(changed.length, 1);
  assert.equal(changed[0].Source.values.length, 0);
  assert.equal(api.normalizeExclusionGroups('invalid').length, 0);
  const normalized = api.normalizeExclusionGroups([
    { Source: { mode: 'only', values: ['VHS', 'custom'] } }
  ]);
  assert.equal(normalized[0].Source.mode, 'ignore');
  assert.deepEqual([...normalized[0].Source.values], ['VHS']);
  const type = context.GM_config.definition.types.exclusionGroups;
  const field = { configId: 'test', id: 'exclusion_groups', value: normalized, default: [] };
  type.toNode.call(field);
  assert.equal(type.toValue.call(field)[0].Source.values[0], 'VHS');
  field.node.replaceWith = () => {};
  type.reset.call(field);
  assert.equal(type.toValue.call(field).length, 0);
  const previous = configValues.get('exclusion_groups');
  try {
    api.setFilterState({ ...api.getDefaultAdoptionFilterState(), exclusionGroups: normalized });
    api.saveAdoptionFilterSettings();
    assert.equal(api.getDefaultAdoptionFilterState().exclusionGroups[0].Source.values[0], 'VHS');
  } finally {
    if (previous === undefined) configValues.delete('exclusion_groups');
    else configValues.set('exclusion_groups', previous);
    api.setFilterState(api.getDefaultAdoptionFilterState());
  }
});
