const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-add-filter-all-releases.user.js'),
  'utf8'
);

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

function createElement(tagName) {
  return {
    attributes: {},
    children: [],
    className: '',
    tagName: tagName.toUpperCase(),
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

const ageSource = extract(
  '    function buildUnit3dExternalAgeCell',
  '\n    function buildUnit3dExternalDetailRow'
);
const { buildUnit3dExternalAgeCell } = new Function(
  'document',
  `${ageSource}\nreturn { buildUnit3dExternalAgeCell };`
)({ createElement });

const originalDateNow = Date.now;
Date.now = () => Date.parse('2026-08-24T00:00:00.000Z');
try {
  const cell = buildUnit3dExternalAgeCell({
    time: Date.parse('2026-08-22T00:00:00.000Z') / 1000
  });
  assert.equal(cell.className, 'torrent-search--grouped__age');
  assert.equal(cell.children.length, 1);
  assert.equal(cell.children[0].tagName, 'TIME');
  assert.equal(cell.children[0].attributes.datetime, '2026-08-22T00:00:00.000Z');
  assert.equal(cell.children[0].title, '2026-08-22T00:00:00.000Z');
  assert.equal(cell.children[0].textContent, '2 days ago');

  assert.equal(buildUnit3dExternalAgeCell({ time: 'None' }).children.length, 0);
} finally {
  Date.now = originalDateNow;
}

assert.match(source, /buildUnit3dNumberCell\(completed\),\s*buildUnit3dExternalAgeCell\(torrent\)/);
assert.match(source, /function buildUnit3dExternalDetailRow[\s\S]+?cell\.colSpan = 7;/);
