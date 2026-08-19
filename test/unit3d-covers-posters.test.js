const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const coversSource = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-covers-posters.user.js'),
  'utf8'
);
const start = coversSource.indexOf('  function findPanelAnchor');
const end = coversSource.indexOf('\n\n  function syncPanel', start);
assert.ok(start >= 0 && end > start, 'panel placement helpers not found');

const factory = new Function(
  `${coversSource.slice(start, end)}\nreturn { findPanelAnchor, placePanelAtAnchor };`
);
const { findPanelAnchor, placePanelAtAnchor } = factory();

const synopsis = {};
const table = {};
const meta = {};
const matches = new Map([
  ['.unit3d-ptp-synopsis-panel', synopsis],
  ['.unit3d-ptp-page .unit3d-ptp-table-scroll', table],
  ['section.meta', meta]
]);
const root = { querySelector: (selector) => matches.get(selector) || null };

assert.equal(findPanelAnchor(root), synopsis, 'layout synopsis must win');
matches.delete('.unit3d-ptp-synopsis-panel');
assert.equal(findPanelAnchor(root), table, 'layout table must be the no-synopsis fallback');
matches.delete('.unit3d-ptp-page .unit3d-ptp-table-scroll');
assert.equal(findPanelAnchor(root), meta, 'native metadata must be the standalone anchor');

const parent = {};
const panel = { isConnected: false, parentElement: null };
const anchor = {
  parentElement: parent,
  matches() {
    return true;
  },
  before(node) {
    node.isConnected = true;
    node.parentElement = parent;
    this.beforeInsertions = (this.beforeInsertions || 0) + 1;
  },
  after(node) {
    node.isConnected = true;
    node.parentElement = parent;
    this.afterInsertions = (this.afterInsertions || 0) + 1;
  }
};

let previousAnchor = placePanelAtAnchor(panel, anchor, null, 'below');
assert.equal(anchor.afterInsertions, 1, 'below placement must follow synopsis');
previousAnchor = placePanelAtAnchor(panel, anchor, previousAnchor, 'below');
assert.equal(anchor.afterInsertions, 1, 'stable placement must not fight other scripts');

placePanelAtAnchor(panel, anchor, null, 'above');
assert.equal(anchor.beforeInsertions, 1, 'above placement must precede synopsis');

const fallbackAnchor = {
  ...anchor,
  afterInsertions: 0,
  matches() {
    return false;
  }
};
placePanelAtAnchor(panel, fallbackAnchor, previousAnchor, 'above');
assert.equal(fallbackAnchor.afterInsertions, 1, 'no-synopsis fallback must remain below the table');

const imdbSource = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-imdb-combined.user.js'),
  'utf8'
);
assert.match(
  imdbSource,
  /const COVERS_POSTERS_PLACEMENT_OPTIONS = \[\s*\['main',[\s\S]*\['sidebar',/,
  'IMDb settings must offer main and sidebar placement'
);

const orderStart = imdbSource.indexOf('  function ensureMainPanelOrder');
const orderEnd = imdbSource.indexOf('\n\n  function cleanupDuplicateSidebarPanels', orderStart);
assert.ok(orderStart >= 0 && orderEnd > orderStart, 'IMDb panel ordering helper not found');

function orderedMain(initialOrder, placement) {
  const elements = {};
  const main = {
    children: [],
    querySelector(selector) {
      return {
        '.unit3d-ptp-table-scroll': elements.table,
        '.unit3d-ptp-synopsis-panel': elements.synopsis,
        '#unit3d-covers-posters': elements.covers,
        '#unit3d-imdb-cast': null
      }[selector];
    }
  };

  function moveAfter(target, item) {
    main.children.splice(main.children.indexOf(item), 1);
    main.children.splice(main.children.indexOf(target) + 1, 0, item);
  }

  function item(name) {
    return {
      name,
      dataset: name === 'covers' ? { unit3dCoversPostersPlacement: placement } : {},
      parentElement: main,
      querySelector: () => null,
      get previousElementSibling() {
        return main.children[main.children.indexOf(this) - 1] || null;
      },
      get nextElementSibling() {
        return main.children[main.children.indexOf(this) + 1] || null;
      },
      after(node) {
        moveAfter(this, node);
      }
    };
  }

  ['table', 'synopsis', 'covers', 'root'].forEach((name) => {
    elements[name] = item(name);
  });
  main.children = initialOrder.map((name) => elements[name]);
  const document = { getElementById: () => elements.root };
  const order = new Function(
    'document',
    'PANEL_ROOT_ID',
    'COVERS_POSTERS_PANEL_ID',
    'getCoversPostersSynopsisPlacement',
    `${imdbSource.slice(orderStart, orderEnd)}\nreturn ensureMainPanelOrder;`
  )(
    document,
    'unit3d-imdb-panels',
    'unit3d-covers-posters',
    (entry) => entry?.dataset.unit3dCoversPostersPlacement || 'below'
  );
  order(main);
  return main.children.map(({ name }) => name);
}

assert.deepEqual(orderedMain(['table', 'synopsis', 'covers', 'root'], 'above'), [
  'table',
  'covers',
  'synopsis',
  'root'
]);
assert.deepEqual(orderedMain(['table', 'covers', 'synopsis', 'root'], 'below'), [
  'table',
  'synopsis',
  'covers',
  'root'
]);
