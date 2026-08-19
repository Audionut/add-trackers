const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-layout-change.user.js'),
  'utf8'
);
assert.match(source, /showTvmazeId:\s*{\s*default: false,/);

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

const iconData = /const TVMAZE_ICON\s*=\s*'data:image\/png;base64,([^']+)'/.exec(source)?.[1];
assert.ok(iconData, 'TVmaze icon missing');
const icon = Buffer.from(iconData, 'base64');
assert.equal(icon.readUInt32BE(16), 126);
assert.equal(icon.readUInt32BE(20), 40);
assert.match(
  source,
  /img\.unit3d-ptp-tvmaze-icon[^}]+height: 24px !important;[^}]+max-width: 76px !important;/s
);

const normalizeSource = extract(
  '  function normalizeTvmazeId',
  '\n  function getFirstDirectorName'
);
const normalizeTvmazeId = new Function(`${normalizeSource}\nreturn normalizeTvmazeId;`)();
assert.equal(normalizeTvmazeId(82), 82);
assert.equal(normalizeTvmazeId('82'), 82);
assert.equal(normalizeTvmazeId(-1), 0);
assert.equal(normalizeTvmazeId('nope'), 0);

const extractImdbSource = extract(
  '  function extractImdbIdFromMetaIds',
  '\n  function getTvmazeId'
);
const extractImdbId = new Function(`${extractImdbSource}\nreturn extractImdbIdFromMetaIds;`)();
assert.equal(
  extractImdbId({
    querySelector: () => ({ href: 'https://www.imdb.com/title/TT0944947/' })
  }),
  'tt0944947'
);

async function main() {
  const requests = [];
  const writes = [];
  const getTvmazeSource = extract('  function getTvmazeId', '\n  function normalizeTvmazeId');
  const getTvmazeId = new Function(
    'TVMAZE_ID_CACHE_PREFIX',
    'GM_getValue',
    'normalizeTvmazeId',
    'tvmazeLookupPromises',
    'fetchCrossOriginText',
    'GM_setValue',
    `${getTvmazeSource}\nreturn getTvmazeId;`
  )(
    'cache_',
    () => 0,
    normalizeTvmazeId,
    new Map(),
    (url) => {
      requests.push(url);
      return Promise.resolve('{"id":82}');
    },
    (key, value) => writes.push([key, value])
  );

  assert.equal(await getTvmazeId('tt0944947'), 82);
  assert.equal(await getTvmazeId('tt0944947'), 82);
  assert.deepEqual(requests, ['https://api.tvmaze.com/lookup/shows?imdb=tt0944947']);
  assert.deepEqual(writes, [['cache_tt0944947', 82]]);

  let inserted = null;
  const tvdb = {
    after(item) {
      inserted = item;
    },
    querySelector: () => null
  };
  const ids = {
    children: [tvdb],
    isConnected: true,
    appendChild() {
      throw new Error('TVmaze should be inserted after TVDB');
    },
    querySelector(selector) {
      if (selector === ':scope > .meta__tvmaze') return null;
      if (selector === ':scope > .meta__tvdb') return tvdb;
      if (selector.includes('imdb.com')) {
        return { href: 'https://www.imdb.com/title/tt0944947/' };
      }
      return null;
    }
  };
  const document = {
    createElement(tagName) {
      return {
        children: [],
        tagName,
        appendChild(child) {
          this.children.push(child);
        }
      };
    },
    querySelector: () => ids
  };
  const addSource = extract(
    '  async function addTvmazeIdLink',
    '\n  function extractImdbIdFromMetaIds'
  );
  const addTvmazeIdLink = new Function(
    'document',
    'extractImdbIdFromMetaIds',
    'getTvmazeId',
    'openLinkInNewTab',
    'TVMAZE_ICON',
    `${addSource}\nreturn addTvmazeIdLink;`
  )(
    document,
    extractImdbId,
    () => Promise.resolve(82),
    (link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    },
    'data:image/png;base64,test'
  );

  await addTvmazeIdLink();
  assert.equal(inserted.className, 'meta__tvmaze');
  assert.equal(inserted.children[0].href, 'https://www.tvmaze.com/shows/82');
  assert.equal(inserted.children[0].children[0].alt, 'TVmaze');
}

main().catch((error) => {
  process.nextTick(() => {
    throw error;
  });
});
