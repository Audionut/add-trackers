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

const contextSource = extract(
  '    function getUnit3dExternalRowContext',
  '\n    function buildUnit3dFilterState'
);
const episodePolicySource = extract(
  '    const shouldExcludeEpisodeRelease',
  '\n    // Find the year'
);
const setFilteredRowVisibilitySource = extract(
  '    function setFilteredRowVisibility',
  '\n\n    function setFilterDetailRowsDisplay'
);

function makeEpisodePolicy(tvPage) {
  return new Function(
    'isMiniSeriesFromSpan',
    `${episodePolicySource}\nreturn shouldExcludeEpisodeRelease;`
  )(tvPage);
}

function makeResolver(rows, tvPage = true) {
  const document = {
    querySelector: () => rows[0] || null,
    querySelectorAll: () => rows
  };

  return new Function(
    'document',
    'isUnit3dTvPage',
    `${contextSource}\nreturn getUnit3dExternalRowContext;`
  )(document, () => tvPage);
}

const episodeRow = {
  dataset: {
    unit3dTvEpisodeSort: '1',
    unit3dTvGroupKey: 's003:e0001',
    unit3dTvGroupLabel: 'Season 3 / Episode 1',
    unit3dTvScope: 'episode',
    unit3dTvScopeSort: '1',
    unit3dTvSeasonSort: '3'
  }
};
const seasonRow = {
  dataset: {
    unit3dTvEpisodeSort: 'Infinity',
    unit3dTvGroupKey: 's002:season',
    unit3dTvGroupLabel: 'Season 2 / Season Packs',
    unit3dTvScope: 'season',
    unit3dTvScopeSort: '0',
    unit3dTvSeasonSort: '2'
  }
};
const resolveTvContext = makeResolver([episodeRow, seasonRow]);

assert.deepEqual(
  resolveTvContext(
    { datasetRelease: 'Example.Show.S03E01.1080p.WEB-DL-GROUP' },
    'Example.Show.S03E01.1080p.WEB-DL-GROUP'
  ),
  {
    episode: '1',
    groupKey: 's003:e0001',
    groupLabel: 'Season 3 / Episode 1',
    scope: 'episode',
    scopeSort: '1',
    season: '3'
  }
);

assert.deepEqual(
  resolveTvContext(
    { info_text: 'Example Show S02 2160p BluRay Remux-GROUP' },
    'Example Show S02 2160p BluRay Remux-GROUP'
  ),
  {
    episode: 'Infinity',
    groupKey: 's002:season',
    groupLabel: 'Season 2 / Season Packs',
    scope: 'season',
    scopeSort: '0',
    season: '2'
  }
);

assert.deepEqual(resolveTvContext({ title: 'Season 4 / Episode 2' }, 'Season 4 / Episode 2'), {
  episode: '2',
  groupKey: 's004:e0002',
  groupLabel: 'Season 4 / Episode 2',
  scope: 'episode',
  scopeSort: '1',
  season: '4'
});

assert.deepEqual(resolveTvContext({ title: 'Unnumbered special' }, 'Unnumbered special'), {
  episode: '1',
  groupKey: 's003:e0001',
  groupLabel: 'Season 3 / Episode 1',
  scope: 'episode',
  scopeSort: '1',
  season: '3'
});

assert.deepEqual(makeResolver([], false)({ title: 'Movie.S03E01' }, 'Movie.S03E01'), {
  episode: 'Infinity',
  groupKey: 'movie',
  groupLabel: '',
  scope: 'movie',
  scopeSort: 'Infinity',
  season: 'Infinity'
});

assert.equal(makeEpisodePolicy(true)('Example.Show.S03E06.1080p'), false);
assert.equal(makeEpisodePolicy(true)('Example.Show.S03.1080p'), false);
assert.equal(makeEpisodePolicy(false)('Example.Show.S03E06.1080p'), true);
assert.equal(
  (source.match(/shouldExcludeEpisodeRelease\(infoText\)/g) || []).length,
  8,
  'Every tracker-specific episode exclusion should use the TV-aware policy'
);

const setFilteredRowVisibility = new Function(
  `${setFilteredRowVisibilitySource}\nreturn setFilteredRowVisibility;`
)();
const filteredRow = {
  hidden: true,
  style: {
    display: 'table-row',
    removeProperty(property) {
      assert.equal(property, 'display');
      this.display = '';
    }
  }
};
setFilteredRowVisibility(filteredRow, true);
assert.equal(filteredRow.style.display, '');
assert.equal(filteredRow.hidden, true);
setFilteredRowVisibility(filteredRow, false);
assert.equal(filteredRow.style.display, 'none');
assert.equal(filteredRow.hidden, true);

assert.match(source, /const context = getUnit3dExternalRowContext\(torrent, releaseName\);/);
assert.match(source, /row\.hidden = context\.scope !== 'movie';/);
assert.match(
  source,
  /buildUnit3dExternalDetailRow\(\s*torrent,\s*id,\s*header\.dataset\.unit3dTvGroupKey\s*\)/
);
