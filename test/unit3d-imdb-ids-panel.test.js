const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-imdb-combined.user.js'),
  'utf8'
);

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

const optionsExpression = extract(
  '  const NATIVE_IDS_PLACEMENT_OPTIONS = ',
  ';\n  const NATIVE_IDS_PLACEMENTS'
).replace('  const NATIVE_IDS_PLACEMENT_OPTIONS = ', '');
const placementOptions = new Function(`return (${optionsExpression});`)();
const placements = placementOptions.map(([value]) => value);
assert.deepEqual(placements, ['hidden', 'sidebar', 'original']);

const normalizePlacementSource = extract(
  '  function normalizeNativeIdsPlacement',
  '\n  function normalizeSidebarPanelOrder'
);
const normalizePlacement = new Function(
  'NATIVE_IDS_PLACEMENTS',
  'DEFAULT_SETTINGS',
  `${normalizePlacementSource}\nreturn normalizeNativeIdsPlacement;`
)(placements, { nativeIdsPlacement: 'hidden' });
assert.equal(normalizePlacement('original'), 'original');
assert.equal(normalizePlacement(null, false), 'sidebar');
assert.equal(normalizePlacement(null, true), 'hidden');
assert.equal(normalizePlacement('invalid'), 'hidden');

const sidebarDefinitionsExpression = extract(
  '  const SIDEBAR_PANEL_DEFINITIONS = ',
  ';\n  const DEFAULT_SIDEBAR_PANEL_ORDER'
).replace('  const SIDEBAR_PANEL_DEFINITIONS = ', '');
const sidebarOrder = new Function(`return (${sidebarDefinitionsExpression});`)().map(
  ([key]) => key
);
const normalizeOrderSource = extract(
  '  function normalizeSidebarPanelOrder',
  '\n  function settingKey'
);
const normalizeOrder = new Function(
  'DEFAULT_SIDEBAR_PANEL_ORDER',
  `${normalizeOrderSource}\nreturn normalizeSidebarPanelOrder;`
)(sidebarOrder);
const previousOrder = sidebarOrder.filter((key) => key !== 'nativeIds');
assert.deepEqual(normalizeOrder(previousOrder), sidebarOrder);

const insertSource = extract(
  '  function insertSidebarPanelByOrder',
  '\n  function ensureMainPanelOrder'
);
const insertPanel = new Function('settings', `${insertSource}\nreturn insertSidebarPanelByOrder;`)({
  sidebarPanelOrder: ['movieInfo', 'nativeIds', 'awards']
});
const root = {
  children: [],
  appendChild(panel) {
    panel.parent = this;
    this.children.push(panel);
  }
};
function panel(key) {
  return {
    dataset: { unit3dImdbSidebarPanel: key },
    before(item) {
      const index = this.parent.children.indexOf(this);
      item.parent = this.parent;
      this.parent.children.splice(index, 0, item);
    }
  };
}
root.appendChild(panel('movieInfo'));
root.appendChild(panel('awards'));
insertPanel(root, 'nativeIds', panel('nativeIds'));
assert.deepEqual(
  root.children.map((item) => item.dataset.unit3dImdbSidebarPanel),
  ['movieInfo', 'nativeIds', 'awards']
);

const syncSource = extract('  function syncNativeIdsSource', '\n  function replaceCastPanel');
const classes = new Set(['unit3d-ptp-meta-sidebar-hidden']);
const ids = {
  classList: {
    toggle(name, enabled) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    }
  }
};
const placement = { nativeIdsPlacement: 'original' };
const syncIds = new Function('document', 'settings', `${syncSource}\nreturn syncNativeIdsSource;`)(
  { querySelector: () => ids },
  placement
);
syncIds();
assert.equal(classes.has('unit3d-ptp-meta-sidebar-hidden'), false);
assert.equal(classes.has('unit3d-ptp-inline-ids'), true);
placement.nativeIdsPlacement = 'sidebar';
syncIds();
assert.equal(classes.has('unit3d-ptp-meta-sidebar-hidden'), true);
assert.equal(classes.has('unit3d-ptp-inline-ids'), false);
