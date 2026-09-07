const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(
  resolve(__dirname, '../UNIT3D_based/unit3d-coming-soon.user.js'),
  'utf8'
);
const start = source.indexOf('  const ROOT_ID');
const end = source.indexOf('\n  function element(', start);
assert.ok(start > 0 && end > start);
const factory = new Function(
  'GM_xmlhttpRequest',
  'crypto',
  'location',
  'GM_getValue',
  'GM_setValue',
  'GM_listValues',
  'GM_deleteValue',
  'fetch',
  'navigator',
  'AbortSignal',
  'Date',
  'setTimeout',
  `${source.slice(start, end)}
  return { imdbGraphqlRequest, dateValue, monthRange, episodeRange, shiftMonth, calendarMonths, normalizeTitle, collectReleases, nextCursor, fetchComingSoon, loadReleases,
    sortReleases, searchUrl, releaseKind, cleanOldCaches, readReleaseCache, searchReleases, encodeStored, decodeStored, savedApiKey, cachedTorrents, mergeTorrentHistory, loadRecentTorrents, torrentEpisodeKeys, torrentPackSeasons,
    readHiddenSeries, setSeriesHidden, filterEpisodes, releaseCountry, timeZone, zonedDate, loadSonarrCalendar, sonarrEpisodeDates, homeDates, homeReleases, homeResolutions, filterSonarrEpisodes, sonarrSeriesMembership, HIDDEN_SERIES_KEY,
    normalizeArrUrl, readArrServers, saveArrServer, removeArrServer, readArrCache, writeArrCache,
    loadArrOptions, loadArrLibrary, arrTarget, arrExisting, arrViewUrl, arrImmediate, addArrTitle,
    ARR_SETTINGS_KEY, ARR_CACHE_PREFIX, ARR_LIBRARY_TTL,
    RELEASE_VIEWS, IMDB_LANGUAGES, COUNTRIES, COMING_SOON_QUERY, RELEASE_DATES_QUERY, TITLES_QUERY, API_KEY_STORAGE, TORRENT_CACHE_KEY, TORRENT_REQUEST_KEY };
`
);
const make = (request, environment = {}) => {
  const storage = environment.storage || new Map();
  return factory(
    request,
    webcrypto,
    { origin: environment.origin || 'https://aither.cc' },
    (key, fallback) => structuredClone(storage.has(key) ? storage.get(key) : fallback),
    (key, value) => storage.set(key, structuredClone(value)),
    () => [...storage.keys()],
    (key) => storage.delete(key),
    environment.fetch || (() => assert.fail('unexpected fetch call')),
    environment.navigator || { locks: { request: async (_name, callback) => callback() } },
    { timeout: () => undefined },
    environment.Date || Date,
    environment.setTimeout || setTimeout
  );
};
const query = 'query UpcomingTest($id: ID!) { title(id: $id) { id } }';

function arrFixture(type = 'radarr', environment = {}) {
  const server = {
    id: type,
    revision: 'first',
    type,
    name: `${type} HD`,
    url: `https://arr.example/${type}`,
    apiKey: `${type}-secret`,
    enabled: true,
    defaults: {
      qualityProfileId: 4,
      rootFolderPath: '/media',
      tags: [6],
      minimumAvailability: 'released',
      monitored: true,
      search: false,
      monitor: 'future',
      monitorNewItems: true,
      seriesType: 'auto',
      seasonFolder: true,
      searchCutoff: false
    }
  };
  const state = {
    profiles: [{ id: 4, name: 'HD' }],
    roots: [{ path: '/media' }],
    tags: [{ id: 6, label: 'upcoming' }],
    records: [],
    lookup: {
      id: 0,
      imdbId: 'tt0123456',
      tmdbId: 321,
      tvdbId: 654,
      title: 'Example',
      seriesType: 'anime'
    }
  };
  const calls = [];
  const storage = environment.storage || new Map();
  const api = make(
    (request) => {
      calls.push(request);
      const url = new URL(request.url);
      if (state.handle?.(request, url)) return;
      const path = url.pathname.split('/api/v3/')[1];
      let data;
      if (path === 'system/status') data = { appName: type };
      else if (path === 'rootfolder') data = state.roots;
      else if (path === 'qualityprofile') data = state.profiles;
      else if (path === 'tag') data = state.tags;
      else if (path.includes('lookup')) data = type === 'radarr' ? state.lookup : [state.lookup];
      else if (request.method === 'POST') {
        data = { ...state.lookup, ...JSON.parse(request.data), id: 99, titleSlug: 'example' };
        state.records.push(data);
      } else {
        const field = type === 'radarr' ? 'tmdbId' : 'tvdbId';
        data = state.records.filter(
          (item) =>
            !url.searchParams.has(field) || item[field] === Number(url.searchParams.get(field))
        );
      }
      request.onload({
        status: request.method === 'POST' ? 201 : 200,
        responseText: JSON.stringify(data)
      });
    },
    { ...environment, storage }
  );
  api.saveArrServer(server);
  return {
    api,
    server,
    state,
    calls,
    storage,
    target: { type, imdbId: 'tt0123456', title: 'Example' }
  };
}

test('Arr server URLs preserve reverse-proxy prefixes and reject credentials or unsafe destinations', () => {
  const { api } = arrFixture();
  assert.equal(
    api.normalizeArrUrl(' http://localhost:7878/radarr/// '),
    'http://localhost:7878/radarr'
  );
  assert.equal(api.normalizeArrUrl('https://arr.example/'), 'https://arr.example');
  for (const url of [
    'javascript:alert(1)',
    'file:///tmp',
    'https://user:key@arr.example',
    'https://arr.example/?apikey=secret',
    'https://arr.example/#section'
  ])
    assert.throws(() => api.normalizeArrUrl(url));
});

test('Arr settings and caches are obfuscated and isolated by server and connection revision', () => {
  const { api, server, storage } = arrFixture();
  const second = { ...server, id: '4k', name: '4K', apiKey: '4k-secret' };
  api.saveArrServer(second);
  api.writeArrCache(server, 'library', { savedAt: 123, records: [] });
  api.writeArrCache(second, 'library', { savedAt: 456, records: [] });
  assert.equal(api.readArrServers().length, 2);
  assert.ok(!storage.get(api.ARR_SETTINGS_KEY).includes('radarr-secret'));
  assert.ok(!storage.get(api.ARR_CACHE_PREFIX + server.id).includes('savedAt'));
  const changed = { ...server, revision: 'changed', apiKey: 'new-secret' };
  api.saveArrServer(changed);
  api.writeArrCache(server, 'library', { savedAt: 789, records: [] });
  assert.deepEqual(api.readArrCache(changed), {});
  assert.equal(api.readArrCache(second).library.savedAt, 456);
  api.removeArrServer(second.id);
  api.writeArrCache(second, 'library', { savedAt: 999, records: [] });
  assert.equal(storage.has(api.ARR_CACHE_PREFIX + second.id), false);
  assert.deepEqual(api.readArrServers(), [changed]);
  api.cleanOldCaches();
  assert.deepEqual(api.readArrServers(), [changed]);
});

test('Arr options use header authentication, preserve the server prefix, and cache all quality profiles', async () => {
  const { api, server, state, calls } = arrFixture();
  state.profiles.push({ id: 5, name: '4K' });
  const [first, shared] = await Promise.all([
    api.loadArrOptions(server),
    api.loadArrOptions(server)
  ]);
  assert.deepEqual(first, shared);
  assert.equal(calls.length, 4);
  assert.deepEqual(
    first.profiles.map((profile) => profile.name),
    ['HD', '4K']
  );
  for (const request of calls) {
    assert.ok(request.url.startsWith('https://arr.example/radarr/api/v3/'));
    assert.equal(request.headers['X-Api-Key'], server.apiKey);
    assert.ok(!request.url.includes(server.apiKey));
    assert.equal(request.anonymous, true);
    assert.equal(request.redirect, 'error');
  }
  await api.loadArrOptions(server);
  assert.equal(calls.length, 4);
  await api.loadArrOptions(server, true);
  assert.equal(calls.length, 8);
});

test('Arr connection tests reject the wrong app, non-JSON and invalid options without saving success', async () => {
  const { api, server, state } = arrFixture();
  state.handle = (request, url) => {
    if (url.pathname.endsWith('/system/status')) {
      request.onload({ status: 200, responseText: '{"appName":"Sonarr"}' });
      return true;
    }
  };
  await assert.rejects(api.loadArrOptions(server), /did not identify itself as Radarr/);
  state.handle = (request) => {
    request.onload({ status: 200, responseText: '<html>Login</html>' });
    return true;
  };
  await assert.rejects(api.loadArrOptions(server), /Expected JSON/);
  state.handle = undefined;
  state.profiles = [{ id: 'wrong', name: 'Bad' }];
  await assert.rejects(api.loadArrOptions(server), /Invalid server options/);
  assert.equal(api.readArrCache(server).options, undefined);
});

test('Arr fetch-mode requests have an aborting deadline even if the userscript manager never times out', async () => {
  const { server } = arrFixture();
  let deadline;
  let aborted = 0;
  const api = make(() => ({ abort: () => aborted++ }), {
    setTimeout: (callback, delay) => {
      assert.equal(delay, 30000);
      deadline = callback;
      return 0;
    }
  });
  const failed = assert.rejects(api.loadArrOptions(server), /Request timed out/);
  deadline();
  await failed;
  assert.equal(aborted, 1);
});

test('an offline Arr server can be disabled with expired or missing cached options', async () => {
  const from = source.indexOf('    function serverEditor(');
  const until = source.indexOf('    async function startAdd(', from);
  assert.ok(from > 0 && until > from);
  for (const cached of [undefined, { savedAt: 1 }]) {
    const { api, server } = arrFixture();
    let connections = 0;
    const nodes = [];
    const element = (tag, _className, text) => {
      const node = {
        tag,
        textContent: text,
        children: [],
        handlers: {},
        append(...children) {
          this.children.push(...children);
        },
        replaceChildren(...children) {
          this.children = children;
        },
        addEventListener(name, callback) {
          this.handlers[name] = callback;
        },
        setAttribute() {},
        reportValidity: () => true,
        focus() {},
        replaceWith() {},
        querySelector: () => ({ textContent: '' })
      };
      nodes.push(node);
      return node;
    };
    const context = {
      element,
      crypto: webcrypto,
      arrName: () => 'Radarr',
      readArrCache: () => ({ options: cached }),
      createArrOptions: (_server, _options, values) => ({
        fields: element('fieldset'),
        read: () => values
      }),
      normalizeArrUrl: api.normalizeArrUrl,
      saveArrServer: api.saveArrServer,
      writeArrCache() {},
      loadArrOptions: async () => {
        connections++;
        throw new Error('offline');
      },
      arrFresh: () => false,
      ARR_OPTIONS_TTL: 86400000,
      attempts: new Map(),
      messages: new Map(),
      statusNodes: new Map(),
      update() {}
    };
    runInNewContext(source.slice(from, until), context);
    context.serverEditor(server);
    const [enabled, showAddDialog] = nodes.filter((node) => node.type === 'checkbox');
    enabled.checked = false;
    assert.equal(showAddDialog.checked, false);
    showAddDialog.checked = true;
    nodes.find((node) => node.tag === 'form').handlers.submit({ preventDefault() {} });
    await Promise.resolve();
    assert.equal(connections, 0);
    assert.equal(api.readArrServers()[0].enabled, false);
    assert.deepEqual(api.readArrServers()[0].defaults, server.defaults);
    assert.equal(api.readArrServers()[0].apiKey, server.apiKey);
    assert.equal(api.readArrServers()[0].showAddDialog, true);
    assert.equal(nodes.filter((node) => node.type === 'checkbox').at(-1).checked, true);
  }
});

test('Arr library snapshots expire at ten minutes, replace deleted entries, and survive failed refreshes', async () => {
  let now = 1800000000000;
  const { api, server, state, calls } = arrFixture('radarr', {
    Date: class extends Date {
      static now() {
        return now;
      }
    }
  });
  state.records = [{ ...state.lookup, id: 7, titleSlug: 'existing', monitored: true }];
  await api.loadArrOptions(server);
  const first = await api.loadArrLibrary(server);
  const count = calls.length;
  state.records = [];
  now += api.ARR_LIBRARY_TTL - 1;
  assert.deepEqual(await api.loadArrLibrary(server), first);
  assert.equal(calls.length, count);
  now++;
  assert.deepEqual((await api.loadArrLibrary(server)).records, []);
  assert.equal(calls.length, count + 1);
  state.handle = (request) => {
    request.onerror();
    return true;
  };
  await assert.rejects(api.loadArrLibrary(server, true), /Request failed/);
  assert.deepEqual(api.readArrCache(server).library.records, []);
  assert.ok(api.readArrCache(server).options, 'library writes preserve options');
});

test('episode Sonarr filters union enabled libraries and wait for every configured instance', () => {
  const { api, server } = arrFixture('sonarr');
  const second = {
    ...server,
    id: 'sonarr-4k',
    revision: 'second',
    name: 'Sonarr 4K'
  };
  const disabled = {
    ...server,
    id: 'sonarr-disabled',
    revision: 'disabled',
    enabled: false
  };
  api.saveArrServer(second);
  api.saveArrServer(disabled);
  api.writeArrCache(server, 'library', {
    savedAt: 1,
    records: [{ imdbId: 'tt100' }]
  });
  api.writeArrCache(second, 'library', {
    savedAt: 1,
    records: [{ imdbId: 'tt200' }]
  });
  const first = { imdbId: 'tt1', seriesImdbId: 'tt100', mode: 'episodes' };
  const secondEpisode = { imdbId: 'tt2', seriesImdbId: 'tt200', mode: 'episodes' };
  const absent = { imdbId: 'tt3', seriesImdbId: 'tt300', mode: 'episodes' };
  const movie = { imdbId: 'tt4', mode: 'theatrical' };
  const releases = [first, secondEpisode, absent, movie];
  assert.deepEqual(Array.from(api.sonarrSeriesMembership().ids).sort(), ['100', '200']);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'all'), releases);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'in'), [first, secondEpisode, movie]);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'out'), [absent, movie]);

  const changed = { ...second, revision: 'changed' };
  api.saveArrServer(changed);
  assert.equal(api.sonarrSeriesMembership().complete, false);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'out'), [movie]);
  api.saveArrServer({ ...changed, enabled: false });
  assert.equal(api.sonarrSeriesMembership().complete, true);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'in'), [first, movie]);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'out'), [secondEpisode, absent, movie]);
});

test('episode Sonarr filters reject add-only snapshots and empty IMDb IDs', async () => {
  const { api, server, target } = arrFixture('sonarr');
  await api.addArrTitle(server, target, server.defaults);
  const matching = {
    imdbId: 'tt1',
    seriesImdbId: target.imdbId,
    mode: 'episodes'
  };
  const absent = { imdbId: 'tt2', seriesImdbId: 'tt9999999', mode: 'episodes' };
  const missing = { imdbId: 'tt3', mode: 'episodes' };
  const movie = { imdbId: 'tt4', mode: 'theatrical' };
  const releases = [matching, absent, missing, movie];
  assert.equal(api.readArrCache(server).library.savedAt, 0);
  assert.equal(api.sonarrSeriesMembership().complete, false);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'in'), [movie]);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'out'), [movie]);

  await api.loadArrLibrary(server, true);
  const library = api.readArrCache(server).library;
  api.writeArrCache(server, 'library', {
    ...library,
    records: [...library.records, { imdbId: '' }]
  });
  const membership = api.sonarrSeriesMembership();
  assert.equal(membership.complete, true);
  assert.equal(membership.ids.has(''), false);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'in'), [matching, movie]);
  assert.deepEqual(api.filterSonarrEpisodes(releases, 'out'), [absent, movie]);
});

test('Arr library errors treat add-only snapshots as failed checks', () => {
  const from = source.indexOf('    function hasLibraryError(');
  const until = source.indexOf('\n\n    function renderSettings', from);
  assert.ok(from > 0 && until > from);
  let library = { savedAt: 0, records: [{ imdbId: 'tt0123456' }] };
  const context = {
    readArrServers: () => [{ id: 'sonarr', revision: 'first', type: 'sonarr', enabled: true }],
    errors: new Set(['sonarr:first']),
    readArrCache: () => ({ library })
  };
  runInNewContext(source.slice(from, until), context);
  assert.equal(context.hasLibraryError('sonarr'), true);
  library = { savedAt: 1, records: [] };
  assert.equal(context.hasLibraryError('sonarr'), false);
});

test('a changed Arr connection cannot receive an older in-flight library response', async () => {
  const { api, server, state, storage } = arrFixture();
  let respond;
  state.handle = (request) => {
    respond = () => request.onload({ status: 200, responseText: '[]' });
    return true;
  };
  const loading = api.loadArrLibrary(server);
  api.saveArrServer({ ...server, revision: 'replacement', apiKey: 'replacement-key' });
  respond();
  await loading;
  assert.equal(storage.has(api.ARR_CACHE_PREFIX + server.id), false);
});

test('Arr direct add requires one relevant server and valid saved defaults regardless of profile count', async () => {
  const { api, server, state } = arrFixture();
  const options = await api.loadArrOptions(server);
  assert.equal(api.arrImmediate([server], options), true);
  assert.equal(api.arrImmediate([server, { ...server, id: '4k' }], options), false);
  assert.equal(
    api.arrImmediate([server], {
      ...options,
      profiles: [...options.profiles, { id: 5, name: '4K' }]
    }),
    true
  );
  for (const invalid of [
    { rootFolderPath: '/other' },
    { qualityProfileId: 99 },
    { tags: [99] },
    { minimumAvailability: 'wrong' }
  ])
    assert.equal(
      api.arrImmediate([{ ...server, defaults: { ...server.defaults, ...invalid } }], options),
      false
    );
  assert.equal(api.arrImmediate([{ ...server, defaults: {} }], options), false);
  state.records = [];
});

test('each Arr server can require the add dialog and restore direct adds with its saved preference', async () => {
  const from = source.indexOf('    async function startAdd(');
  const until = source.indexOf('    function openAddDialog(', from);
  assert.ok(from > 0 && until > from);
  for (const type of ['radarr', 'sonarr']) {
    const { api, server, state, calls, target } = arrFixture(type);
    state.profiles.unshift({ id: 5, name: '4K' });
    state.roots.unshift({ path: '/other' });
    let dialogs = 0;
    let libraryChanges = 0;
    const context = {
      ...api,
      arrName: () => type,
      targetKey: (target) => `${target.type}:${target.imdbId}`,
      messages: new Map(),
      draw() {},
      onLibraryChange: (changedType) => {
        assert.equal(changedType, type);
        libraryChanges++;
      },
      openAddDialog: (selectedTarget, servers) => {
        assert.equal(selectedTarget, target);
        assert.equal(servers[0].id, server.id);
        dialogs++;
      }
    };
    runInNewContext(source.slice(from, until), context);
    const other = { ...server, id: `${type}-4k`, enabled: false, showAddDialog: false };
    api.saveArrServer(other);
    api.saveArrServer({ ...server, showAddDialog: true });
    await context.startAdd(target);
    assert.equal(context.messages.size, 0);
    assert.equal(dialogs, 1);
    assert.equal(libraryChanges, 0);
    assert.equal(calls.filter((request) => request.method === 'POST').length, 0);
    assert.equal(api.readArrServers().find((item) => item.id === other.id).showAddDialog, false);
    api.saveArrServer({ ...server, showAddDialog: false });
    api.saveArrServer({ ...other, enabled: true });
    await context.startAdd(target);
    assert.equal(context.messages.size, 0);
    assert.equal(dialogs, 2);
    assert.equal(calls.filter((request) => request.method === 'POST').length, 0);
    api.saveArrServer(other);
    await context.startAdd(target);
    assert.equal(context.messages.size, 0);
    assert.equal(dialogs, 2);
    const posts = calls.filter((request) => request.method === 'POST');
    assert.equal(posts.length, 1);
    assert.equal(libraryChanges, 1);
    const body = JSON.parse(posts[0].data);
    assert.equal(body.qualityProfileId, server.defaults.qualityProfileId);
    assert.equal(body.rootFolderPath, server.defaults.rootFolderPath);
    assert.deepEqual(body.tags, server.defaults.tags);
  }
});

test('Arr targets use movies for Radarr and parent series for Sonarr episode cards', () => {
  const { api } = arrFixture();
  for (const mode of ['theatrical', 'digital'])
    assert.equal(api.arrTarget({ mode, imdbId: 'tt1', title: 'Movie' }).type, 'radarr');
  assert.equal(api.arrTarget({ mode: 'tv', imdbId: 'tt2', title: 'Series' }).type, 'sonarr');
  assert.deepEqual(
    api.arrTarget({
      mode: 'episodes',
      imdbId: 'tt3',
      seriesImdbId: 'tt2',
      title: 'Episode',
      seriesTitle: 'Series'
    }),
    { type: 'sonarr', imdbId: 'tt2', title: 'Series' }
  );
  assert.equal(api.arrTarget({ mode: 'episodes', imdbId: 'tt3', title: 'Episode' }), null);
});

test('Radarr adds resolve IMDb, verify membership, use saved options and deduplicate concurrent clicks', async () => {
  const { api, server, target, calls } = arrFixture();
  await api.loadArrLibrary(server);
  const savedAt = api.readArrCache(server).library.savedAt;
  const records = await Promise.all([
    api.addArrTitle(server, target, server.defaults),
    api.addArrTitle(server, target, server.defaults)
  ]);
  assert.deepEqual(records[0], records[1]);
  const posts = calls.filter((request) => request.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(
    calls.filter((request) => request.url.includes('/lookup/imdb?imdbId=tt0123456')).length,
    1
  );
  assert.ok(calls.some((request) => request.url.endsWith('movie?tmdbId=321')));
  const body = JSON.parse(posts[0].data);
  assert.deepEqual(body, {
    title: 'Example',
    tmdbId: 321,
    qualityProfileId: 4,
    rootFolderPath: '/media',
    tags: [6],
    monitored: true,
    minimumAvailability: 'released',
    addOptions: { searchForMovie: false }
  });
  assert.equal(api.arrExisting(server, target).id, 99);
  assert.equal(
    api.readArrCache(server).library.savedAt,
    savedAt,
    'one add must not renew the whole snapshot'
  );
  assert.equal(api.arrViewUrl(server, records[0]), 'https://arr.example/radarr/movie/example');
  assert.ok(
    api.arrViewUrl(server, { slug: '../bad?x=1', externalId: 321 }).endsWith('..%2Fbad%3Fx%3D1')
  );
});

test('Sonarr adds the parent series with future monitoring, new seasons and the selected series type', async () => {
  const { api, server, calls } = arrFixture('sonarr');
  const target = api.arrTarget({
    mode: 'episodes',
    imdbId: 'tt9999999',
    seriesImdbId: 'tt0123456',
    seriesTitle: 'Example'
  });
  await api.addArrTitle(server, target, { ...server.defaults, search: true, searchCutoff: true });
  const lookup = calls.find((request) => request.url.includes('series/lookup'));
  assert.equal(new URL(lookup.url).searchParams.get('term'), 'imdb:tt0123456');
  const body = JSON.parse(calls.find((request) => request.method === 'POST').data);
  assert.equal(body.tvdbId, 654);
  assert.equal(body.seriesType, 'anime');
  assert.equal(body.seasonFolder, true);
  assert.equal(body.monitored, true);
  assert.equal(body.monitorNewItems, 'all');
  assert.deepEqual(body.addOptions, {
    monitor: 'future',
    searchForMissingEpisodes: true,
    searchForCutoffUnmetEpisodes: true
  });
  assert.equal(api.arrExisting(server, target).imdbId, '123456');
});

test('existing Arr titles are linked without posting and duplicate responses are verified', async () => {
  const { api, server, state, calls, target } = arrFixture();
  state.records = [{ ...state.lookup, id: 12, titleSlug: 'already-there' }];
  const record = await api.addArrTitle(server, target, server.defaults);
  assert.equal(record.id, 12);
  assert.equal(calls.filter((request) => request.method === 'POST').length, 0);
  state.records = [];
  state.handle = (request) => {
    if (request.method !== 'POST') return;
    state.records.push({ ...state.lookup, id: 14, titleSlug: 'added-elsewhere' });
    request.onload({ status: 400, responseText: 'duplicate' });
    return true;
  };
  assert.equal((await api.addArrTitle(server, target, server.defaults)).id, 14);
  assert.equal(calls.filter((request) => request.method === 'POST').length, 1);
});

test('unmatched titles and rejected adds never become successful library entries', async () => {
  const { api, server, state, calls, target } = arrFixture();
  state.lookup.imdbId = 'tt9999999';
  await assert.rejects(api.addArrTitle(server, target, server.defaults), /No unique IMDb match/);
  assert.equal(calls.filter((request) => request.method === 'POST').length, 0);
  state.lookup.imdbId = target.imdbId;
  state.handle = (request) => {
    if (request.method === 'POST') {
      request.onload({ status: 400, responseText: 'invalid root' });
      return true;
    }
  };
  await assert.rejects(api.addArrTitle(server, target, server.defaults), /server rejected/);
  assert.equal(api.arrExisting(server, target), undefined);
  state.handle = undefined;
  assert.equal(
    (await api.addArrTitle(server, target, server.defaults)).id,
    99,
    'failed adds remain retryable'
  );
});

test('an uncertain Arr POST is reconciled with a read and never automatically posted twice', async () => {
  const { api, server, state, calls, target } = arrFixture();
  state.handle = (request) => {
    if (request.method !== 'POST') return;
    state.records.push({ ...state.lookup, id: 44, titleSlug: 'recovered' });
    request.ontimeout();
    return true;
  };
  assert.equal((await api.addArrTitle(server, target, server.defaults)).id, 44);
  assert.equal(calls.filter((request) => request.method === 'POST').length, 1);
});

test('disabling an Arr server during lookup prevents the subsequent add', async () => {
  const { api, server, state, calls, target } = arrFixture();
  state.handle = (request, url) => {
    if (!url.pathname.includes('lookup')) return;
    api.saveArrServer({ ...server, enabled: false });
    request.onload({ status: 200, responseText: JSON.stringify(state.lookup) });
    return true;
  };
  await assert.rejects(api.addArrTitle(server, target, server.defaults), /changed or disabled/);
  assert.equal(calls.filter((request) => request.method === 'POST').length, 0);
});

test('Arr tabs serialize library refreshes and adds without duplicate posts or overwritten additions', async () => {
  const storage = new Map();
  const locks = new Map();
  const navigator = {
    locks: {
      request(name, callback) {
        const next = (locks.get(name) || Promise.resolve()).then(callback);
        locks.set(
          name,
          next.catch(() => {})
        );
        return next;
      }
    }
  };
  const first = arrFixture('radarr', { storage, navigator });
  const second = arrFixture('radarr', { storage, navigator });
  second.state.records = first.state.records;
  let finishRefresh;
  const started = new Promise((resolve) => {
    first.state.handle = (request, url) => {
      if (url.pathname.endsWith('/movie') && !url.search && request.method === 'GET') {
        finishRefresh = () => request.onload({ status: 200, responseText: '[]' });
        resolve();
        return true;
      }
    };
  });
  const refresh = first.api.loadArrLibrary(first.server);
  await started;
  const add = second.api.addArrTitle(second.server, second.target, second.server.defaults);
  finishRefresh();
  await Promise.all([refresh, add]);
  assert.equal(first.api.arrExisting(first.server, first.target).id, 99);
  await Promise.all([
    first.api.addArrTitle(first.server, first.target, first.server.defaults),
    second.api.addArrTitle(second.server, second.target, second.server.defaults)
  ]);
  assert.equal(
    [...first.calls, ...second.calls].filter((request) => request.method === 'POST').length,
    1
  );
  assert.equal(first.api.readArrCache(first.server).library.records.length, 1);
});

test('IMDb uses the caching endpoint, named APQ GET, then registration POST only on a cache miss', async () => {
  const calls = [];
  const api = make((options) => {
    calls.push(options);
    options.onload({
      status: 200,
      responseText: JSON.stringify(
        calls.length === 1
          ? { errors: [{ extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' } }] }
          : { data: { title: { id: 'tt1234567' } } }
      )
    });
  });
  const data = await api.imdbGraphqlRequest(query, { id: 'tt1234567' }, 'AU', 'fr-FR');
  assert.equal(data.title.id, 'tt1234567');
  assert.equal(calls.length, 2);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://caching.graphql.imdb.com');
  assert.equal(calls[0].method, 'GET');
  assert.equal(Object.hasOwn(calls[0], 'anonymous'), false);
  assert.equal(Object.hasOwn(calls[0], 'redirect'), false, 'IMDb keeps its original XHR transport');
  assert.equal(url.searchParams.get('operationName'), 'UpcomingTest');
  assert.deepEqual(JSON.parse(url.searchParams.get('variables')), { id: 'tt1234567' });
  const extensions = JSON.parse(url.searchParams.get('extensions'));
  assert.equal(
    extensions.persistedQuery.sha256Hash,
    createHash('sha256').update(query).digest('hex')
  );
  assert.equal(calls[1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].data), {
    query,
    operationName: 'UpcomingTest',
    variables: { id: 'tt1234567' },
    extensions
  });
  for (const call of calls) {
    assert.equal(call.headers['X-Imdb-User-Country'], 'AU');
    assert.equal(call.headers['X-Imdb-User-Language'], 'fr-FR');
    assert.equal(call.headers['X-Imdb-Client-Name'], 'imdb-web-next-localized');
    assert.equal(call.headers.Origin, 'https://www.imdb.com');
  }

  let hits = 0;
  const cachedApi = make((options) => {
    hits++;
    assert.equal(options.headers['X-Imdb-User-Language'], 'en-US');
    options.onload({ status: 200, responseText: '{"data":{"title":{"id":"tt1234567"}}}' });
  });
  await cachedApi.imdbGraphqlRequest(query);
  assert.equal(hits, 1, 'a persisted-query hit must not POST again');
});

test('IMDb errors, bad responses and timeouts reject instead of appearing as an empty calendar', async () => {
  const cases = [
    [(options) => options.onload({ status: 403, responseText: 'Forbidden' }), /HTTP 403/],
    [
      (options) =>
        options.onload({ status: 200, responseText: '{"errors":[{"message":"Invalid query"}]}' }),
      /Invalid query/
    ],
    [(options) => options.onload({ status: 200, responseText: '{}' }), /no release data/],
    [(options) => options.onload({ status: 200, responseText: 'not JSON' }), /JSON|Unexpected/],
    [(options) => options.ontimeout(), /timed out/],
    [(options) => options.onerror(), /connection/]
  ];
  for (const [request, pattern] of cases)
    await assert.rejects(make(request).imdbGraphqlRequest(query), pattern);
  await assert.rejects(
    make(() => assert.fail('must not send unnamed query')).imdbGraphqlRequest(
      'query { title { id } }'
    ),
    /named operation/
  );
});

const torrent = (id, imdbId, categoryId) => ({
  id: String(id),
  attributes: {
    imdb_id: imdbId,
    category_id: categoryId,
    name: 'Release',
    download_link: 'https://tracker.test/download?rsskey=must-not-be-cached'
  }
});

test('homepage hidden-series setting defaults to include and leaves Upcoming filtering independent', () => {
  const storage = new Map();
  const api = make(() => assert.fail('unexpected request'), { storage });
  const today = new Date(2026, 8, 6, 0, 1);
  const release = {
    imdbId: 'tt1',
    seriesImdbId: 'tt100',
    title: 'Today',
    mode: 'episodes',
    date: '2026-09-06',
    country: 'US'
  };
  const releases = [
    release,
    { ...release, imdbId: 'tt2', date: '2026-09-05' },
    { ...release, imdbId: 'tt3', date: '2026-09-07' },
    { ...release, imdbId: 'tt4', mode: 'tv' },
    { ...release, imdbId: 'tt5', mode: 'digital' },
    { ...release, imdbId: 'tt6', title: 'Today second episode' }
  ];
  assert.deepEqual(api.homeReleases(releases, today), [{ ...release, episodeKeys: [] }]);
  api.setSeriesHidden({ imdbId: 'tt100', title: 'Hidden' }, true);
  assert.deepEqual(api.homeReleases(releases, today), [{ ...release, episodeKeys: [] }]);
  assert.deepEqual(api.filterEpisodes([release], today), []);
  storage.set('unit3d-upcoming-settings', { homeIncludeHidden: false });
  assert.deepEqual(api.homeReleases(releases, today), []);
  storage.set('unit3d-upcoming-settings', { homeIncludeHidden: true });
  assert.deepEqual(api.homeReleases(releases, today), [{ ...release, episodeKeys: [] }]);
  assert.deepEqual(api.filterEpisodes([release], today), []);
});

test('homepage deduplicates by series ID without merging unrelated series or unidentified episodes', () => {
  const api = make(() => {});
  const today = new Date(2026, 8, 7);
  const release = {
    imdbId: 'tt1',
    seriesImdbId: 'tt100',
    seriesTitle: 'Same title',
    title: 'Same title',
    mode: 'episodes',
    date: '2026-09-07',
    country: 'US'
  };
  const releases = [
    { ...release, imdbId: 'tt0', date: '2026-09-06' },
    release,
    { ...release, imdbId: 'tt2', seriesImdbId: 'tt00100' },
    { ...release, imdbId: 'tt3', seriesImdbId: 'tt200' },
    { ...release, imdbId: 'tt4', seriesImdbId: undefined },
    { ...release, imdbId: 'tt5', seriesImdbId: undefined },
    { ...release, imdbId: 'tt6', seriesImdbId: 'tt300', date: '2026-09-08' }
  ];
  assert.deepEqual(
    api.homeReleases(releases, today).map((item) => item.imdbId),
    ['tt1', 'tt3', 'tt4', 'tt5']
  );
  assert.equal(api.filterEpisodes(releases, today).length, 6);
});

test('homepage day selection crosses years and groups only the selected episodes', () => {
  const storage = new Map([
    ['unit3d-upcoming-settings', { homeYesterday: true, homeTomorrow: true }]
  ]);
  const api = make(() => assert.fail('unexpected request'), { storage });
  const today = new Date(2027, 0, 1);
  assert.deepEqual(api.homeDates(today), ['2026-12-31', '2027-01-01', '2027-01-02']);
  const releases = ['2026-12-30', ...api.homeDates(today), '2027-01-03'].map((date, index) => ({
    imdbId: `tt${index + 1}`,
    seriesImdbId: 'tt123',
    seriesTitle: 'Show',
    title: 'Show',
    mode: 'episodes',
    season: 1,
    episode: index + 2,
    date
  }));
  assert.deepEqual(
    api.homeReleases(releases, today).flatMap((release) => release.episodeKeys),
    ['1:3', '1:4', '1:5']
  );
  storage.set('unit3d-upcoming-settings', {
    homeYesterday: true,
    homeToday: false,
    homeTomorrow: true
  });
  assert.deepEqual(
    api.homeReleases(releases, today).flatMap((release) => release.episodeKeys),
    ['1:3', '1:5']
  );
  api.setSeriesHidden({ imdbId: 'tt123', title: 'Show' }, true);
  storage.set('unit3d-upcoming-settings', { homeYesterday: true, homeIncludeHidden: false });
  assert.deepEqual(api.homeReleases(releases, today), []);
  storage.set('unit3d-upcoming-settings', { homeToday: false });
  assert.deepEqual(api.homeDates(today), []);
});

test('homepage resolutions require episode evidence overlapping the displayed group', () => {
  const api = make(() => {});
  const release = { seriesImdbId: 'tt00123', episodeKeys: ['1:2'] };
  const record = { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'], resolution: '1080p' };
  const records = [
    record,
    { ...record, resolution: '720p', episodeKeys: ['1:1', '1:2'] },
    { ...record, resolution: '2160p', episodeKeys: ['2:2'] },
    { ...record, resolution: '2160p', imdbId: '999' },
    { ...record, resolution: '2160p', categoryId: 1 },
    { ...record, resolution: '2160p', episodeKeys: [] },
    { ...record, resolution: '1080i' },
    { ...record, resolution: '1440p' },
    { ...record, resolution: undefined }
  ];
  assert.deepEqual([...api.homeResolutions(release, records).keys()], ['1080p', '720p']);
  assert.deepEqual([...api.homeResolutions({ seriesImdbId: 'tt123' }, records).keys()], []);
  assert.equal(api.homeResolutions({}, records).size, 0);
  assert.equal(api.homeResolutions({ seriesImdbId: 'tt456' }, records).size, 0);
  assert.equal(api.homeResolutions(release, [{ ...record, categoryId: 1 }]).size, 0);
});

test('API resolution strings survive shared cache and history without merging different resolutions', async () => {
  const storage = new Map();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    fetch: async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          data: ['720p', '1080p', '2160p', '1080i', '1440p'].map((resolution, id) => ({
            ...torrent(id + 1, 123, 2),
            attributes: {
              ...torrent(id + 1, 123, 2).attributes,
              name: 'Show.S01E02',
              resolution,
              internal: [true, 1, '1', false, '0'][id],
              resolution_id: 3
            }
          }))
        })
      };
    }
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  const first = await api.loadRecentTorrents('tv', 'key');
  const cached = await api.loadRecentTorrents('tv', 'key');
  assert.equal(calls, 1);
  assert.deepEqual(cached.records, first.records);
  assert.deepEqual(
    cached.records.map((record) => record.internal),
    [true, true, true, undefined]
  );
  assert.deepEqual(
    [
      ...api.homeResolutions({ seriesImdbId: 'tt123', episodeKeys: ['1:2'] }, cached.records).keys()
    ],
    ['720p', '1080p', '2160p']
  );
  assert.equal(cached.records.length, 4);
  assert.deepEqual(
    cached.records.map((record) => record.torrentId),
    ['1', '2', '3', undefined]
  );
  const legacy = { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'], lastSeen: Date.now() };
  assert.equal(api.mergeTorrentHistory([legacy], cached.records).length, 4);
  const saved = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY));
  assert.ok(!JSON.stringify(saved).includes('must-not-be-cached'));
  assert.deepEqual(
    saved.history.filter((record) => record.resolution).map((record) => record.resolution),
    ['720p', '1080p', '2160p']
  );
  const fixture = homeFixture();
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, fixture.state.releases, cached.records, true);
  assert.deepEqual(
    Array.from(homeRows(list)[0].children[1].children, (icon) => icon.href),
    ['https://aither.cc/torrents/1', 'https://aither.cc/torrents/2', 'https://aither.cc/torrents/3']
  );
});

test('legacy resolution history gains a torrent ID on refresh even with equal timestamps', async () => {
  const now = Date.now();
  const storage = new Map();
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            ...torrent(456, 123, 2),
            attributes: {
              ...torrent(456, 123, 2).attributes,
              name: 'Show.S01E02',
              resolution: '1080p'
            }
          }
        ]
      })
    })
  });
  const record = { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'], resolution: '1080p' };
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  storage.set(
    api.TORRENT_CACHE_KEY,
    api.encodeStored({
      credential: createHash('sha256').update('key').digest('hex'),
      entries: [{ scope: 'tv', savedAt: now - 120001, records: [record], torrentIds: ['456'] }],
      history: [{ ...record, lastSeen: now }]
    })
  );
  const loaded = await api.loadRecentTorrents('tv', 'key');
  assert.deepEqual(loaded.records, [{ ...record, torrentId: '456' }]);
  assert.deepEqual((await api.loadRecentTorrents('tv', 'key')).records, loaded.records);
});

function homeRows(list) {
  return Array.from(list.children).filter((row) => row.dataset.seriesId);
}

function homeFixture({
  saved = { homePanel: true },
  pathname = '/',
  hostname = 'aither.cc',
  main = true,
  key = 'key',
  clock = Date,
  cacheAge,
  movieCacheAge,
  digitalReleases = [],
  sonarrConfigured = false,
  sonarrCacheAge,
  holdSonarr = false,
  holdMovies = false,
  holdCalendar = false,
  holdTorrents = false
} = {}) {
  const nodes = [];
  const handlers = {};
  const timers = [];
  const requests = [];
  const storage = new Map([['unit3d-upcoming-settings', saved]]);
  const api = make(
    (request) => {
      if (request.url.includes('/calendar?')) {
        state.sonarrCalendarCalls = (state.sonarrCalendarCalls || 0) + 1;
        request.onload({ status: 200, responseText: JSON.stringify(state.airtimes || []) });
        return;
      }
      assert.match(request.url, /\/api\/v3\/series$/);
      requests.push({ type: 'sonarr' });
      const finish = () =>
        request.onload({
          status: state.sonarrError ? 500 : 200,
          responseText: JSON.stringify([{ id: 1, tvdbId: 123, imdbId: 'tt123', title: 'Show' }])
        });
      if (holdSonarr) state.finishSonarr = finish;
      else finish();
    },
    { Date: clock, storage }
  );
  const today = api.episodeRange().from;
  const state = {
    movies: digitalReleases,
    finishMovies: [],
    releases: [
      {
        imdbId: 'tt1',
        seriesImdbId: 'tt123',
        season: 1,
        episode: 2,
        title: '<img src=x> — S1E2',
        seriesTitle: '<img src=x>',
        mode: 'episodes',
        date: today
      }
    ],
    records: [
      { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'], resolution: '1080p', torrentId: '456' }
    ]
  };
  if (sonarrConfigured) {
    const server = {
      id: 'sonarr',
      revision: '1',
      name: 'Sonarr',
      type: 'sonarr',
      url: 'https://arr.example',
      apiKey: 'secret',
      enabled: true
    };
    api.saveArrServer(server);
    if (sonarrCacheAge !== undefined)
      api.writeArrCache(server, 'library', {
        savedAt: clock.now() - sonarrCacheAge,
        records: [{ imdbId: 'tt123' }]
      });
  }
  function saveCalendar(age = 0) {
    const yesterday = new clock();
    yesterday.setDate(yesterday.getDate() - 2);
    storage.set('unit3d-upcoming-cache-v5', [
      ...(storage.get('unit3d-upcoming-cache-v5') || []).filter(
        (entry) => !entry.key.startsWith('episodes:')
      ),
      {
        key: `episodes:${saved.country || 'US'}:rolling:${saved.language || 'en-US'}:${saved.titleCountry || 'auto'}`,
        language: saved.language || 'en-US',
        titleCountry: saved.titleCountry || '',
        ...api.episodeRange(),
        from: api.episodeRange(yesterday).from,
        savedAt: clock.now() - age,
        releases: state.releases
      }
    ]);
  }
  function saveMovies(options, age = 0) {
    const entries = ['movies', 'digital'].map((mode) => ({
      key: `${mode}:${options.country || 'US'}:${options.from.slice(0, 7)}:${saved.language || 'en-US'}:${saved.titleCountry || 'auto'}`,
      language: saved.language || 'en-US',
      titleCountry: saved.titleCountry || '',
      from: options.from,
      to: options.to,
      savedAt: clock.now() - age,
      releases: state.movies.filter(
        (release) => release.date >= options.from && release.date <= options.to
      )
    }));
    storage.set('unit3d-upcoming-cache-v5', [
      ...(storage.get('unit3d-upcoming-cache-v5') || []).filter(
        (entry) => !entries.some((next) => next.key === entry.key)
      ),
      ...entries
    ]);
  }
  if (cacheAge !== undefined) saveCalendar(cacheAge);
  if (movieCacheAge !== undefined) {
    for (const month of new Set(api.homeDates().map((date) => date.slice(0, 7))))
      saveMovies(api.monthRange(new Date(`${month}-01T12:00:00`)), movieCacheAge);
  }
  function element(tag, className, text) {
    const node = {
      tag,
      tagName: tag.toUpperCase(),
      className,
      textContent: text || '',
      dataset: {},
      attributes: {},
      children: [],
      handlers: {},
      append(...items) {
        for (const item of items) {
          item.remove();
          item.parentElement = this;
          this.children.push(item);
        }
      },
      replaceChildren(...items) {
        for (const child of [...this.children]) child.remove();
        this.append(...items);
      },
      insertBefore(item, before) {
        item.remove();
        item.parentElement = this;
        this.children.splice(
          before ? this.children.indexOf(before) : this.children.length,
          0,
          item
        );
      },
      replaceWith(item) {
        const parent = this.parentElement;
        const index = parent.children.indexOf(this);
        this.remove();
        item.remove();
        item.parentElement = parent;
        parent.children.splice(index, 0, item);
      },
      remove() {
        if (this.parentElement) {
          const siblings = this.parentElement.children;
          siblings.splice(siblings.indexOf(this), 1);
          this.parentElement = null;
        }
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      addEventListener(name, callback) {
        this.handlers[name] = callback;
      }
    };
    nodes.push(node);
    return node;
  }
  const document = {
    hidden: false,
    head: element('head'),
    getElementById: (id) => nodes.find((node) => node.id === id),
    querySelector: (selector) => {
      assert.equal(selector, 'main.page__home > article');
      return main
        ? {
            parentElement: {
              classList: {
                add: (name) => {
                  state.layoutClass = name;
                }
              },
              prepend: (sidebar) => {
                state.sidebar = sidebar;
                state.inserted = sidebar.children[0];
              }
            }
          }
        : null;
    },
    addEventListener: (name, callback) => {
      handlers[name] = callback;
    }
  };
  const context = {
    element,
    document,
    location: { hostname, pathname, origin: `https://${hostname}` },
    HOME_PANEL_ID: 'today',
    HOME_RESOLUTIONS: ['720p', '1080p', '2160p'],
    SETTINGS_KEY: 'settings',
    TORRENT_CACHE_TTL: 120000,
    EPISODE_CACHE_TTL: 12 * 60 * 60 * 1000,
    CACHE_TTL: 24 * 60 * 60 * 1000,
    ARR_LIBRARY_TTL: 10 * 60 * 1000,
    COUNTRIES: api.COUNTRIES,
    IMDB_LANGUAGES: api.IMDB_LANGUAGES,
    GM_getValue: () => storage.get('unit3d-upcoming-settings'),
    savedApiKey: () => key,
    readReleaseCache: api.readReleaseCache,
    episodeRange: api.episodeRange,
    releaseCountry: api.releaseCountry,
    timeZone: api.timeZone,
    zonedDate: api.zonedDate,
    loadSonarrCalendar: api.loadSonarrCalendar,
    homeDates: api.homeDates,
    monthRange: api.monthRange,
    sortReleases: api.sortReleases,
    homeReleases: api.homeReleases,
    homeResolutions: api.homeResolutions,
    readArrServers: api.readArrServers,
    sonarrSeriesMembership: api.sonarrSeriesMembership,
    loadArrLibrary: api.loadArrLibrary,
    searchUrl: api.searchUrl,
    loadReleases: async (options, onProgress, force) => {
      options = { ...options };
      if (options.mode === 'digital') {
        requests.push({ type: 'movies', options, force });
        if (holdMovies) await new Promise((resolve) => state.finishMovies.push(resolve));
        if (state.movieError) throw new Error('movies offline');
        if (!state.movieNotices?.length) saveMovies(options);
        return {
          releases: state.movies.filter(
            (release) => release.date >= options.from && release.date <= options.to
          ),
          notices: state.movieNotices || []
        };
      }
      requests.push({ type: 'calendar', options, force });
      state.calendarProgress = onProgress;
      if (holdCalendar)
        await new Promise((resolve) => {
          state.finishCalendar = resolve;
        });
      if (state.calendarError) throw new Error('offline');
      saveCalendar(0, options);
      return { releases: state.releases, notices: [] };
    },
    loadRecentTorrents: async (scope, apiKey, force, onProgress) => {
      requests.push({ type: 'torrents', scope, apiKey, force });
      state.torrentProgress = onProgress;
      if (holdTorrents)
        await new Promise((resolve) => {
          state.finishTorrents = resolve;
        });
      if (state.torrentError) throw Object.assign(new Error('offline'), { records: state.records });
      return { records: state.records, savedAt: clock.now(), retryAfter: state.retryAfter };
    },
    setTimeout: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout: () => {},
    Date: clock
  };
  const from = source.indexOf('  function appendEpisodeTime(');
  const to = source.indexOf('  function mountPage()', from);
  runInNewContext(source.slice(from, to), context);
  context.mountHomePanel();
  return { api, context, nodes, state, requests, timers, document, handlers, storage };
}

test('homepage Sonarr-only filtering loads libraries and keeps digital movies independent', async () => {
  const today = api.episodeRange().from;
  const movie = { imdbId: 'tt999', title: 'Movie', mode: 'digital', date: today };
  const missing = homeFixture({
    saved: { homePanel: true, homeSonarrOnly: true, homeDigital: true },
    cacheAge: 0,
    movieCacheAge: 0,
    digitalReleases: [movie]
  });
  await new Promise(setImmediate);
  const missingList = missing.nodes.find((node) => node.tag === 'ul');
  assert.deepEqual(
    Array.from(homeRows(missingList), (row) => row.dataset.mode),
    ['digital']
  );
  assert.match(
    missing.nodes.find((node) => node.tag === 'p').textContent,
    /Configure an enabled Sonarr/
  );
  const fixture = homeFixture({
    saved: { homePanel: true, homeSonarrOnly: true, homeDigital: true },
    cacheAge: 0,
    movieCacheAge: 0,
    digitalReleases: [movie],
    sonarrConfigured: true,
    holdSonarr: true
  });
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  assert.equal(homeRows(list).length, 1);
  const movieRow = homeRows(list)[0];
  assert.ok(fixture.requests.some((request) => request.type === 'sonarr'));
  fixture.state.finishSonarr();
  await new Promise(setImmediate);
  assert.deepEqual(
    Array.from(homeRows(list), (row) => row.dataset.mode),
    ['digital', 'episodes']
  );
  assert.equal(homeRows(list)[0], movieRow);
  assert.ok(
    fixture.requests.some((request) => request.type === 'torrents' && request.scope === 'all')
  );
});

test('homepage cached Sonarr membership stays visible on errors and library retries are bounded', async () => {
  const fresh = homeFixture({
    saved: { homePanel: true, homeSonarrOnly: true },
    cacheAge: 0,
    sonarrConfigured: true,
    sonarrCacheAge: 0
  });
  assert.equal(homeRows(fresh.nodes.find((node) => node.tag === 'ul')).length, 1);
  await new Promise(setImmediate);
  assert.ok(!fresh.requests.some((request) => request.type === 'sonarr'));
  const fixture = homeFixture({
    saved: { homePanel: true, homeSonarrOnly: true },
    cacheAge: 0,
    sonarrConfigured: true,
    sonarrCacheAge: 11 * 60 * 1000,
    holdSonarr: true
  });
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const row = homeRows(list)[0];
  fixture.state.sonarrError = true;
  fixture.state.finishSonarr();
  await new Promise(setImmediate);
  assert.equal(homeRows(list)[0], row);
  assert.match(
    fixture.nodes.find((node) => node.tag === 'p').textContent,
    /Could not update Sonarr/
  );
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.filter((request) => request.type === 'sonarr').length, 1);
});

test('digital movies load above existing episode rows with category-specific links and internal colors', async () => {
  const movie = {
    imdbId: 'tt999',
    title: 'Digital movie',
    mode: 'digital',
    date: api.episodeRange().from
  };
  const fixture = homeFixture({
    saved: { homePanel: true, homeDigital: true },
    cacheAge: 0,
    digitalReleases: [movie],
    holdMovies: true
  });
  fixture.state.records.push(
    { imdbId: '999', categoryId: 2, resolution: '2160p', internal: true, torrentId: '999' },
    { imdbId: '999', categoryId: 1, resolution: '1080p', internal: true, torrentId: '888' }
  );
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const episodeRow = homeRows(list)[0];
  fixture.state.finishMovies.forEach((finish) => finish());
  await new Promise(setImmediate);
  assert.deepEqual(
    Array.from(homeRows(list), (row) => row.dataset.mode),
    ['digital', 'episodes']
  );
  assert.equal(homeRows(list)[1], episodeRow);
  const [title, badges] = homeRows(list)[0].children;
  assert.equal(title.textContent, 'Digital movie');
  assert.equal(title.target, '_blank');
  assert.equal(badges.children[1].href, 'https://aither.cc/torrents/888');
  assert.equal(badges.children[1].target, '_blank');
  assert.equal(badges.children[1].dataset.internal, 'true');
  assert.equal(badges.children[2].dataset.available, 'false');
  assert.match(badges.children[1].title, /this movie/);
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.filter((request) => request.type === 'movies').length, 1);
});

test('digital movie snapshots render immediately and keep their 24-hour retention policy', async () => {
  const movie = {
    imdbId: 'tt999',
    title: 'Digital movie',
    mode: 'digital',
    date: api.episodeRange().from
  };
  const fresh = homeFixture({
    saved: { homePanel: true, homeDigital: true },
    cacheAge: 0,
    movieCacheAge: 13 * 60 * 60 * 1000,
    digitalReleases: [movie]
  });
  assert.equal(homeRows(fresh.nodes.find((node) => node.tag === 'ul'))[0].dataset.mode, 'digital');
  await new Promise(setImmediate);
  assert.ok(!fresh.requests.some((request) => request.type === 'movies'));
  const stale = homeFixture({
    saved: { homePanel: true, homeDigital: true },
    cacheAge: 0,
    movieCacheAge: 25 * 60 * 60 * 1000,
    digitalReleases: [movie],
    holdMovies: true
  });
  const list = stale.nodes.find((node) => node.tag === 'ul');
  const row = homeRows(list)[0];
  assert.equal(row.dataset.mode, 'digital');
  stale.state.movieError = true;
  stale.state.finishMovies.forEach((finish) => finish());
  await new Promise(setImmediate);
  assert.equal(homeRows(list)[0], row);
  assert.match(
    stale.nodes.find((node) => node.tag === 'p').textContent,
    /digital releases could not be updated/
  );
  stale.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(stale.requests.filter((request) => request.type === 'movies').length, 1);
});

test('a successful empty movie refresh removes an obsolete cached release', async () => {
  const movie = {
    imdbId: 'tt999',
    title: 'Removed movie',
    mode: 'digital',
    date: api.episodeRange().from
  };
  const fixture = homeFixture({
    saved: { homePanel: true, homeDigital: true },
    cacheAge: 0,
    movieCacheAge: 25 * 60 * 60 * 1000,
    digitalReleases: [movie],
    holdMovies: true
  });
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  assert.equal(homeRows(list).length, 2);
  fixture.state.movies = [];
  fixture.state.finishMovies.forEach((finish) => finish());
  await new Promise(setImmediate);
  assert.deepEqual(
    Array.from(homeRows(list), (row) => row.dataset.mode),
    ['episodes']
  );
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(homeRows(list).length, 1);
});

test('returning to the homepage applies changed source and day settings', async () => {
  const fixture = homeFixture({ cacheAge: 0, sonarrConfigured: true });
  await new Promise(setImmediate);
  assert.ok(!fixture.requests.some((request) => request.type === 'movies'));
  fixture.storage.set('unit3d-upcoming-settings', {
    homePanel: true,
    homeYesterday: true,
    homeSonarrOnly: true,
    homeDigital: true
  });
  fixture.handlers.visibilitychange();
  await new Promise(setImmediate);
  assert.ok(fixture.requests.some((request) => request.type === 'movies'));
  assert.ok(fixture.requests.some((request) => request.type === 'sonarr'));
  assert.equal(fixture.requests.filter((request) => request.type === 'calendar').length, 0);
});

test('homepage queues option changes made during a pending request without a site API key', async () => {
  const fixture = homeFixture({ key: '', sonarrConfigured: true, holdCalendar: true });
  assert.deepEqual(
    fixture.requests.map((request) => request.type),
    ['sonarr', 'calendar']
  );
  fixture.storage.set('unit3d-upcoming-settings', {
    homePanel: true,
    homeYesterday: true,
    homeDigital: true,
    homeSonarrOnly: true
  });
  fixture.handlers.visibilitychange();
  fixture.state.finishCalendar();
  await new Promise(setImmediate);
  assert.equal(fixture.timers.at(-1).delay, 1);
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.ok(fixture.requests.some((request) => request.type === 'sonarr'));
  assert.ok(fixture.requests.some((request) => request.type === 'movies'));
  const calendars = fixture.requests.filter((request) => request.type === 'calendar');
  assert.equal(calendars.length, 1);
  fixture.state.finishCalendar();
  await new Promise(setImmediate);
});

test('homepage loads adjacent months for selected days and shares the padded episode request', async () => {
  const now = new Date(2027, 0, 1, 12).getTime();
  class BoundaryDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const fixture = homeFixture({
    clock: BoundaryDate,
    saved: { homePanel: true, homeYesterday: true, homeTomorrow: true, homeDigital: true },
    digitalReleases: ['2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'].map(
      (date, index) => ({
        imdbId: `tt${900 + index}`,
        title: `Movie ${index}`,
        mode: 'digital',
        date
      })
    )
  });
  await new Promise(setImmediate);
  assert.deepEqual(
    fixture.requests
      .filter((request) => request.type === 'movies')
      .map((request) => request.options.from),
    ['2026-12-01', '2027-01-01']
  );
  assert.equal(fixture.requests.filter((request) => request.type === 'calendar').length, 1);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  assert.deepEqual(
    Array.from(homeRows(list), (row) => row.dataset.mode),
    ['digital', 'digital', 'digital', 'episodes']
  );
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.filter((request) => request.type === 'movies').length, 2);
});

test('a request crossing midnight checks the new movie month immediately without a site API key', async () => {
  let now = new Date(2026, 11, 31, 23, 59, 59).getTime();
  class MidnightDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const fixture = homeFixture({
    clock: MidnightDate,
    key: '',
    cacheAge: 0,
    holdMovies: true,
    saved: { homePanel: true, homeDigital: true }
  });
  now += 2000;
  fixture.state.finishMovies.forEach((finish) => finish());
  await new Promise(setImmediate);
  assert.equal(fixture.timers.at(-1).delay, 1);
  fixture.timers.at(-1).callback();
  assert.deepEqual(
    fixture.requests
      .filter((request) => request.type === 'movies')
      .map((request) => request.options.from),
    ['2026-12-01', '2027-01-01']
  );
  fixture.state.finishMovies.forEach((finish) => finish());
  await new Promise(setImmediate);
});

test('homepage digital requests and caches use US while episodes retain their configured country', async () => {
  const fixture = homeFixture({ saved: { homePanel: true, homeDigital: true, country: 'AU' } });
  await new Promise(setImmediate);
  assert.equal(
    fixture.requests.find((request) => request.type === 'calendar').options.country,
    'AU'
  );
  assert.equal(fixture.requests.find((request) => request.type === 'movies').options.country, 'US');
  const entries = fixture.storage.get('unit3d-upcoming-cache-v5');
  assert.ok(entries.some((entry) => entry.key.startsWith('episodes:AU:')));
  assert.ok(entries.some((entry) => entry.key.startsWith('movies:US:')));
  assert.ok(entries.some((entry) => entry.key.startsWith('digital:US:')));
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.filter((request) => request.type === 'movies').length, 1);
});

test('homepage headings separate media and days while episode matches stay inside each day', async () => {
  const fixture = homeFixture({
    saved: { homePanel: true, homeYesterday: true, homeTomorrow: true, homeDigital: true }
  });
  await new Promise(setImmediate);
  const dates = fixture.api.homeDates();
  const release = fixture.state.releases[0];
  const releases = dates.flatMap((date, index) => [
    { imdbId: 'tt999', title: 'Movie', mode: 'digital', date },
    { ...release, imdbId: `tt${index + 10}`, date, episode: index + 3 }
  ]);
  releases.push({ ...releases[3], imdbId: 'tt20', episode: 6 });
  const record = fixture.state.records[0];
  const records = [
    { ...record, episodeKeys: ['1:3'] },
    { ...record, episodeKeys: ['1:4'], resolution: '720p', internal: true, torrentId: '789' }
  ];
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, releases, records, true);
  const headings = () => Array.from(list.children).filter((row) => row.dataset.headingId);
  assert.deepEqual(
    headings().map((row) => row.children[0].textContent),
    ['Movies', 'Yesterday', 'Today', 'Tomorrow', 'TV', 'Yesterday', 'Today', 'Tomorrow']
  );
  assert.deepEqual(
    homeRows(list).map((row) => row.dataset.mode),
    ['digital', 'digital', 'digital', 'episodes', 'episodes', 'episodes']
  );
  const episodes = homeRows(list).filter((row) => row.dataset.mode === 'episodes');
  assert.deepEqual(
    episodes.map((row) => Array.from(row.children[1].children, (badge) => badge.dataset.available)),
    [
      ['false', 'true', 'false'],
      ['true', 'false', 'false'],
      ['false', 'false', 'false']
    ]
  );
  assert.equal(episodes[1].children[1].children[0].dataset.internal, 'true');
  const previousHeadings = headings();
  fixture.context.renderHomeReleases(list, releases, records, true);
  assert.ok(headings().every((row, index) => row === previousHeadings[index]));
  assert.ok(episodes.every((row, index) => homeRows(list)[index + 3] === row));
  fixture.context.renderHomeReleases(
    list,
    releases.filter((item) => item.mode === 'episodes'),
    records,
    true
  );
  assert.deepEqual(
    headings().map((row) => row.children[0].textContent),
    ['Yesterday', 'Today', 'Tomorrow']
  );
  fixture.context.renderHomeReleases(list, [], records, true);
  assert.equal(list.children.length, 0);
});

test('homepage day headings relabel at midnight and omit days without results', async () => {
  let now = new Date(2026, 8, 7, 12).getTime();
  class HeaderDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const fixture = homeFixture({
    clock: HeaderDate,
    saved: { homePanel: true, homeYesterday: true, homeTomorrow: true }
  });
  await new Promise(setImmediate);
  const release = fixture.state.releases[0];
  const releases = [release, { ...release, imdbId: 'tt2', date: '2026-09-08', episode: 3 }];
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, releases, [], true);
  const headings = () => Array.from(list.children).filter((row) => row.dataset.headingId);
  assert.deepEqual(
    headings().map((row) => row.children[0].textContent),
    ['Today', 'Tomorrow']
  );
  const tomorrow = headings()[1];
  now += 24 * 60 * 60 * 1000;
  fixture.context.renderHomeReleases(list, releases, [], true);
  assert.deepEqual(
    headings().map((row) => row.children[0].textContent),
    ['Yesterday', 'Today']
  );
  assert.equal(headings()[1], tomorrow);
});

test('homepage panel is opt-in, Aither-root-only, and requires the homepage article', () => {
  for (const options of [
    { saved: {} },
    { saved: { homePanel: false } },
    { pathname: '/torrents' },
    { hostname: 'other.test' },
    { main: false }
  ]) {
    const fixture = homeFixture(options);
    assert.equal(fixture.state.inserted, undefined);
    assert.deepEqual(fixture.requests, []);
  }
});

test('homepage mounts a left sidebar with only title text and three resolution badges per series', async () => {
  const fixture = homeFixture({
    saved: { homePanel: true, country: 'AU', language: 'fr-CA', titleCountry: 'GB' }
  });
  await new Promise(setImmediate);
  const { context, nodes, state, requests, timers } = fixture;
  assert.equal(state.layoutClass, 'unit3d-upcoming__home-layout');
  assert.equal(state.sidebar.tag, 'aside');
  assert.equal(state.sidebar.className, 'unit3d-upcoming__home-sidebar');
  assert.equal(state.sidebar.attributes['aria-label'], 'Release calendar');
  assert.equal(state.inserted.className, 'panelV2');
  assert.equal(state.inserted.children[0].className, 'panel__header');
  assert.equal(state.inserted.children[1].className, 'panel__body');
  assert.equal(state.inserted.children[0].children[0].textContent, 'Release calendar');
  const list = nodes.find((node) => node.tag === 'ul');
  assert.equal(homeRows(list).length, 1);
  const [title, icons] = homeRows(list)[0].children;
  assert.equal(title.textContent, '<img src=x>');
  assert.equal(title.href, 'https://aither.cc/torrents?imdbId=123');
  assert.deepEqual(
    Array.from(icons.children, (icon) => icon.textContent),
    ['720p', '1080p', '2160p']
  );
  assert.deepEqual(
    Array.from(icons.children, (icon) => icon.dataset.available),
    ['false', 'true', 'false']
  );
  assert.match(icons.children[1].attributes['aria-label'], /Available on site/);
  assert.equal(icons.children[1].tag, 'a');
  assert.equal(icons.children[1].href, 'https://aither.cc/torrents/456');
  assert.equal(icons.children[0].tag, 'span');
  assert.equal(icons.children[0].href, undefined);
  assert.match(icons.children[0].title, /Not found in recent/);
  assert.ok(!nodes.some((node) => node.tag === 'img'));
  assert.equal(homeRows(list)[0].children.length, 2);
  assert.deepEqual(
    { ...requests[0].options },
    { mode: 'episodes', country: 'AU', language: 'fr-CA', titleCountry: 'GB' }
  );
  assert.equal(requests[1].scope, 'tv');
  assert.ok(timers[0].delay > 0 && timers[0].delay <= 120000);
  context.mountHomePanel();
  assert.equal(requests.length, 2);
  assert.ok(!nodes.some((node) => node.tag === 'button'));
  timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.deepEqual(
    requests.slice(2).map((request) => request.type),
    ['torrents']
  );
});

test('homepage links only resolutions overlapping its grouped episodes', async () => {
  const fixture = homeFixture();
  await new Promise(setImmediate);
  const release = fixture.state.releases[0];
  fixture.state.releases.push(
    { ...release, imdbId: 'tt2', season: 2, episode: 3 },
    { ...release, imdbId: 'tt3', seriesImdbId: 'tt999' }
  );
  const record = fixture.state.records[0];
  fixture.state.records.push(
    { ...record, resolution: '720p', torrentId: '123', episodeKeys: ['2:3'] },
    { ...record, resolution: '2160p', torrentId: '789', episodeKeys: undefined }
  );
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, fixture.state.releases, fixture.state.records, true);
  assert.equal(homeRows(list).length, 2);
  const first = homeRows(list)[0].children[1].children;
  const second = homeRows(list)[1].children[1].children;
  assert.deepEqual(
    Array.from(first, (icon) => icon.href),
    ['https://aither.cc/torrents/123', 'https://aither.cc/torrents/456', undefined]
  );
  assert.ok(second.every((icon) => icon.dataset.available === 'false' && !icon.href));
});

test('homepage deduplication keeps episodes 3 through 5 as the exact site-match boundary', async () => {
  const fixture = homeFixture();
  const api = make(() => assert.fail('unexpected request'));
  await new Promise(setImmediate);
  const release = fixture.state.releases[0];
  const releases = [3, 4, 5].map((episode) => ({ ...release, imdbId: `tt${episode}`, episode }));
  releases.push(
    { ...releases[1], seriesImdbId: 'tt00123' },
    { ...release, episode: 2, date: '2000-01-01' },
    { ...release, episode: 6, date: '2099-01-01' }
  );
  const groups = api.homeReleases(releases);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].episodeKeys, ['1:3', '1:4', '1:5']);
  assert.equal(release.episodeKeys, undefined);
  const record = fixture.state.records[0];
  const records = [
    { ...record, torrentId: '555', episodeKeys: ['1:5'] },
    { ...record, torrentId: '999', internal: true, episodeKeys: ['1:2'] },
    {
      ...record,
      resolution: '720p',
      torrentId: '333',
      internal: true,
      episodeKeys: api.torrentEpisodeKeys({ files: [{ name: 'Show.S01E03-E04.mkv' }] })
    },
    ...[['1:6'], ['2:3', '2:4', '2:5'], [], undefined].map((episodeKeys) => ({
      ...record,
      resolution: '2160p',
      internal: true,
      episodeKeys
    }))
  ];
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, releases, records, true);
  assert.equal(homeRows(list).length, 1);
  const badges = homeRows(list)[0].children[1].children;
  assert.deepEqual(
    Array.from(badges, (badge) => badge.href),
    ['https://aither.cc/torrents/333', 'https://aither.cc/torrents/555', undefined]
  );
  assert.deepEqual(
    Array.from(badges, (badge) => badge.dataset.internal),
    ['true', 'false', 'false']
  );
  assert.equal(badges[2].dataset.available, 'false');
  assert.match(badges[0].title, /selected episode or a matching season pack/);
});

test('season pack parsing distinguishes packs, season ranges and individual episodes', () => {
  const api = make(() => assert.fail('unexpected request'));
  for (const [name, seasons] of [
    ['Show.S01.1080p', [1]],
    ['Show.Season 2.COMPLETE', [2]],
    ['Show.Season1.1080p', [1]],
    ['Show.Season1Ep03.1080p', []],
    ['Show.S01-S03.1080p', [1, 2, 3]],
    ['Show.S01.S03.1080p', [1, 3]],
    ['Show.S01E03.1080p', []],
    ['Show.S01 E03.1080p', []],
    ['Show.Season 1 Episode 3.1080p', []],
    ['Show.Season 1 Ep 3.1080p', []],
    ['Show.S01.Ep03.1080p', []],
    ['Show.S01.Eps03-05.1080p', []],
    ['Show.Season 1 Episodes 3-5.1080p', []],
    ['Show.S01-E03.1080p', []],
    ['Show.S01E03-E05.1080p', []],
    ['Show.S01-S03E05.1080p', []],
    ['Show.COMPLETE.1080p', []],
    ['Show.S03-S01', []]
  ])
    assert.deepEqual(api.torrentPackSeasons(name), seasons, name);
});

test('API season packs survive cache and history and match only a represented season', async () => {
  const storage = new Map();
  let calls = 0;
  const api = make(() => assert.fail('unexpected request'), {
    storage,
    fetch: async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          data: [1, 2, 3].map((season) => ({
            ...torrent(season, 123, 2),
            attributes: {
              ...torrent(season, 123, 2).attributes,
              name:
                season === 3 ? 'Show.Season 1 Episodes 1-2.2160p' : `Show.Season${season}.1080p`,
              files: [],
              resolution: season === 3 ? '2160p' : '1080p',
              internal: season !== 1
            }
          }))
        })
      };
    }
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  const fresh = await api.loadRecentTorrents('tv', 'key');
  const cached = await api.loadRecentTorrents('tv', 'key');
  assert.equal(calls, 1);
  assert.deepEqual(cached.records, fresh.records);
  assert.deepEqual(
    cached.records.map((record) => record.packSeasons),
    [[1], [2], undefined]
  );
  const history = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY)).history;
  assert.deepEqual(
    history.map((record) => record.packSeasons),
    [[1], [2], undefined]
  );
  const fixture = homeFixture();
  await new Promise(setImmediate);
  const release = fixture.state.releases[0];
  const releases = [3, 4, 5].map((episode) => ({ ...release, imdbId: `tt${episode}`, episode }));
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, releases, cached.records, true);
  const badge = homeRows(list)[0].children[1].children[1];
  assert.equal(badge.href, 'https://aither.cc/torrents/1');
  assert.equal(badge.dataset.internal, 'false');
  assert.equal(homeRows(list)[0].children[1].children[2].dataset.available, 'false');
  fixture.context.renderHomeReleases(list, releases, [cached.records[1]], true);
  assert.equal(homeRows(list)[0].children[1].children[1].dataset.available, 'false');
});

test('resolution links reject invalid IDs and keep a linked match when legacy matches coexist', async () => {
  const fixture = homeFixture();
  await new Promise(setImmediate);
  const record = fixture.state.records[0];
  const records = [
    { ...record, resolution: '720p', torrentId: undefined },
    { ...record, torrentId: '../download/456' },
    { ...record, resolution: '2160p', torrentId: '789' },
    { ...record, resolution: '2160p', torrentId: undefined },
    { ...record, resolution: '2160p', torrentId: '999', imdbId: '999', episodeKeys: ['2:2'] }
  ];
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  fixture.context.renderHomeReleases(list, fixture.state.releases, records, true);
  const icons = homeRows(list)[0].children[1].children;
  assert.deepEqual(
    Array.from(icons, (icon) => icon.tag),
    ['span', 'span', 'a']
  );
  assert.deepEqual(
    Array.from(icons, (icon) => icon.href),
    [undefined, undefined, 'https://aither.cc/torrents/789']
  );
});

test('internal matches survive mixed history and color the linked resolution in either order', async () => {
  const api = make(() => assert.fail('unexpected request'));
  const fixture = homeFixture();
  await new Promise(setImmediate);
  const ordinary = fixture.state.records[0];
  const internal = { ...ordinary, internal: true, torrentId: '789' };
  const now = Date.now();
  const records = api.mergeTorrentHistory([{ ...internal, lastSeen: now - 1000 }], [ordinary], now);
  assert.equal(records.length, 2);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  for (const ordered of [records, [...records].reverse()]) {
    fixture.context.renderHomeReleases(list, fixture.state.releases, ordered, true);
    const badge = homeRows(list)[0].children[1].children[1];
    assert.equal(badge.dataset.internal, 'true');
    assert.equal(badge.href, 'https://aither.cc/torrents/789');
    assert.match(badge.title, /internal/);
  }
  fixture.context.renderHomeReleases(list, fixture.state.releases, [ordinary], true);
  assert.equal(homeRows(list)[0].children[1].children[1].dataset.internal, 'false');
  fixture.context.renderHomeReleases(list, fixture.state.releases, [], true);
  assert.ok(
    homeRows(list)[0].children[1].children.every((badge) => badge.dataset.internal === 'false')
  );
  assert.match(
    source,
    /resolution\[data-internal="true"\].*var\(--torrent-row-internal-fg, #baaf92\)/
  );
  assert.match(
    source,
    /torrent-card\[data-internal="true"\].*outline-color: var\(--torrent-row-internal-fg, #baaf92\)/
  );
});

test('homepage reports missing credentials and errors, retains saved matches, and pauses when hidden', async () => {
  const noKey = homeFixture({ key: '' });
  await new Promise(setImmediate);
  assert.equal(noKey.requests.length, 1);
  assert.match(noKey.nodes.find((node) => node.tag === 'p').textContent, /API key/);
  assert.ok(
    homeRows(noKey.nodes.find((node) => node.tag === 'ul'))[0].children[1].children.every(
      (icon) => icon.dataset.available === 'false'
    )
  );
  const fixture = homeFixture();
  await new Promise(setImmediate);
  fixture.state.calendarError = true;
  fixture.state.torrentError = true;
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.match(fixture.nodes.find((node) => node.tag === 'p').textContent, /Site check failed/);
  const icons = homeRows(fixture.nodes.find((node) => node.tag === 'ul'))[0].children[1].children;
  assert.equal(icons[1].dataset.available, 'true');
  assert.match(icons[0].title, /not checked/);
  const calls = fixture.requests.length;
  fixture.document.hidden = true;
  fixture.handlers.visibilitychange();
  fixture.timers.at(-1).callback();
  assert.equal(fixture.requests.length, calls);
  fixture.document.hidden = false;
  fixture.handlers.visibilitychange();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.length, calls + 1);
});

test('homepage removes yesterday at midnight without refetching a fresh schedule and retries site cooldown', async () => {
  let now = new Date(2026, 8, 6, 23, 59, 59).getTime();
  class HomeDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const fixture = homeFixture({ clock: HomeDate });
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  assert.equal(homeRows(list).length, 1);
  assert.equal(fixture.timers.at(-1).delay, 1000);
  now += 1000;
  fixture.timers.at(-1).callback();
  assert.equal(homeRows(list).length, 0);
  await new Promise(setImmediate);
  assert.match(fixture.nodes.find((node) => node.tag === 'p').textContent, /No matching releases/);
  fixture.state.retryAfter = 2000;
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.timers.at(-1).delay, 2000);
  fixture.state.retryAfter = undefined;
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.at(-1).force, false);
  assert.equal(fixture.requests.filter((request) => request.type === 'calendar').length, 1);
});

test('fresh cached homepage schedules render synchronously and skip IMDb during site checks', async () => {
  const fixture = homeFixture({ cacheAge: 11 * 60 * 60 * 1000, holdTorrents: true });
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const progress = fixture.nodes.find((node) => node.tag === 'progress');
  assert.equal(homeRows(list).length, 1);
  assert.equal(progress.hidden, true);
  assert.deepEqual(
    fixture.requests.map((request) => request.type),
    ['torrents']
  );
  const row = homeRows(list)[0];
  const title = row.children[0];
  fixture.state.torrentProgress({ records: fixture.state.records, pages: 0 });
  const linked = row.children[1].children[1];
  assert.equal(linked.href, 'https://aither.cc/torrents/456');
  fixture.state.finishTorrents();
  await new Promise(setImmediate);
  assert.equal(homeRows(list)[0], row);
  assert.equal(row.children[0], title);
  assert.equal(row.children[1].children[1], linked);
  assert.equal(fixture.nodes.find((node) => node.tag === 'p').textContent, '');
});

test('stale homepage schedules and site matches remain visible while IMDb is pending', async () => {
  const fixture = homeFixture({
    cacheAge: 13 * 60 * 60 * 1000,
    holdCalendar: true,
    holdTorrents: true
  });
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const row = homeRows(list)[0];
  assert.ok(row, 'stale cached schedule is visible before either request finishes');
  assert.equal(fixture.nodes.find((node) => node.tag === 'progress').hidden, true);
  fixture.state.torrentProgress({ records: fixture.state.records, pages: 0 });
  const linked = row.children[1].children[1];
  fixture.state.finishTorrents();
  await new Promise(setImmediate);
  assert.equal(linked.href, 'https://aither.cc/torrents/456');
  fixture.state.releases = [{ ...fixture.state.releases[0], seriesTitle: 'Updated title' }];
  fixture.state.finishCalendar();
  await new Promise(setImmediate);
  assert.equal(homeRows(list)[0], row);
  assert.equal(row.children[0].textContent, 'Updated title');
  assert.equal(row.children[1].children[1], linked);
});

test('cold homepage progress follows IMDb and reveals the schedule before the site check finishes', async () => {
  const fixture = homeFixture({ holdCalendar: true, holdTorrents: true });
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const progress = fixture.nodes.find((node) => node.tag === 'progress');
  const status = fixture.nodes.find((node) => node.tag === 'p');
  assert.equal(homeRows(list).length, 0);
  assert.equal(progress.hidden, false);
  fixture.state.calendarProgress('Loading IMDb episode releases… 100 titles checked.');
  assert.match(status.textContent, /100 titles checked/);
  fixture.state.finishCalendar();
  await new Promise(setImmediate);
  assert.equal(homeRows(list).length, 1);
  assert.equal(progress.hidden, true);
  fixture.state.finishTorrents();
  await new Promise(setImmediate);
});

test('a failed homepage schedule update retains rows and does not retry IMDb at the site cadence', async () => {
  const fixture = homeFixture({ cacheAge: 13 * 60 * 60 * 1000, holdCalendar: true });
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  const row = homeRows(list)[0];
  fixture.state.calendarError = true;
  fixture.state.finishCalendar();
  await new Promise(setImmediate);
  assert.match(fixture.nodes.find((node) => node.tag === 'p').textContent, /Could not update/);
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.requests.filter((request) => request.type === 'calendar').length, 1);
  assert.equal(homeRows(list)[0], row);
});

test('torrent cache history is delivered before an outstanding site request completes', async () => {
  const storage = new Map();
  const record = { imdbId: '123', categoryId: 2, resolution: '1080p', torrentId: '456' };
  let finish;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    fetch: () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  storage.set(
    api.TORRENT_CACHE_KEY,
    api.encodeStored({
      credential: createHash('sha256').update('key').digest('hex'),
      entries: [],
      history: [{ ...record, lastSeen: Date.now() - 600000 }]
    })
  );
  const progress = [];
  const pending = api.loadRecentTorrents('tv', 'key', false, (data) => progress.push(data));
  await new Promise(setImmediate);
  assert.deepEqual(progress[0].records, [record]);
  finish({ ok: true, json: async () => ({ data: [] }) });
  assert.deepEqual((await pending).records, [record]);
});

test('torrent episode evidence handles multiple episodes and only identified pack video files', () => {
  const api = make(() => assert.fail('unexpected request'));
  for (const [name, expected] of [
    ['Show.S01E02.1080p', ['1:2']],
    ['Show.S01E02-1080p', ['1:2']],
    ['Show_s01e02e04_1080p', ['1:2', '1:4']],
    ['Show.S01E02-E04.1080p', ['1:2', '1:3', '1:4']],
    ['Show.S01E02-04.1080p', ['1:2', '1:3', '1:4']],
    ['Show.S00E01.1080p', ['0:1']],
    ['Show.S02.Complete', []],
    ['Show.Complete.Series', []],
    ['Show.2026.1080p', []]
  ])
    assert.deepEqual(api.torrentEpisodeKeys({ name }), expected, name);
  assert.deepEqual(
    api.torrentEpisodeKeys({
      name: 'Show.S01E01-E10',
      files: [
        { name: 'Show.S01/Show.S01E02.mkv' },
        { name: 'Show.S01/Show.S01E04.mp4' },
        { name: 'Show.S01/Show.S01E03.srt' },
        { name: 'Show.S01/Show.S02E01.nfo' }
      ]
    }),
    ['1:2', '1:4']
  );
});

test('torrent episode evidence survives history merging and cached reads without merging different episodes', async () => {
  const storage = new Map();
  let now = Date.now();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            ...torrent(++calls, 123, 2),
            attributes: { ...torrent(1, 123, 2).attributes, name: `Show.S01E0${calls}` }
          }
        ]
      })
    })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  await api.loadRecentTorrents('tv', 'key');
  now += 120_001;
  const updated = await api.loadRecentTorrents('tv', 'key');
  assert.deepEqual(updated.records, [
    { imdbId: '123', categoryId: 2, episodeKeys: ['1:1'] },
    { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'] }
  ]);
  assert.deepEqual((await api.loadRecentTorrents('tv', 'key')).records, updated.records);
  assert.equal(calls, 2);
});

test('availability markers distinguish seasons and episodes and reject legacy series-only evidence', () => {
  const from = source.indexOf('    function markRecentTorrents(');
  const until = source.indexOf('\n\n    async function refreshTorrentMatches', from);
  assert.ok(from > 0 && until > from);
  const card = (imdbId, episodeKey) => {
    const link = {
      children: [],
      replaceChildren() {
        this.children = [];
      },
      append(value) {
        this.children.push(value);
      },
      setAttribute() {}
    };
    return {
      dataset: { imdbId, ...(episodeKey !== undefined ? { episodeKey } : {}) },
      link,
      querySelector: (selector) =>
        selector === '.torrent-card__title' ? { textContent: 'Show' } : link
    };
  };
  const cards = [
    card('123', '1:2'),
    card('123', '1:3'),
    card('123', '2:2'),
    card('123', ''),
    card('456', '1:2'),
    card('123'),
    card('789', '1:2')
  ];
  const context = {
    torrentMatches: [],
    results: { querySelectorAll: () => cards },
    element: () => ({ setAttribute() {} })
  };
  runInNewContext(source.slice(from, until), context);
  context.markRecentTorrents([
    { imdbId: '123', categoryId: 2, episodeKeys: ['1:2'], internal: true },
    { imdbId: '456', categoryId: 2 },
    { imdbId: '789', categoryId: 1, episodeKeys: ['1:2'] }
  ]);
  assert.deepEqual(
    cards.map((item) => item.dataset.recent),
    ['true', 'false', 'false', 'false', 'false', 'true', 'false']
  );
  assert.equal(cards[0].link.children.at(-1), 'View torrents');
  assert.equal(cards[1].link.children.at(-1), 'Search torrents');
  assert.deepEqual(
    cards.map((item) => item.dataset.internal),
    ['true', 'false', 'false', 'false', 'false', 'true', 'false']
  );
  context.markRecentTorrents([]);
  assert.ok(cards.every((item) => item.dataset.recent === 'false'));
  assert.ok(cards.every((item) => item.dataset.internal === 'false'));
});

test('the torrent API uses one newest-first page of 100 with a Bearer token and obfuscated storage', async () => {
  const storage = new Map();
  const requests = [];
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            torrent(1, 'tt0012345', 1),
            torrent(2, 9876543, 2),
            torrent(3, 'tt555', 3),
            torrent(4, 'bad id', 1)
          ]
        })
      };
    }
  });
  const key = '1|test-api-key';
  storage.set(api.API_KEY_STORAGE, api.encodeStored(key));
  assert.equal(api.savedApiKey(), key);
  const result = await api.loadRecentTorrents('all', key);
  assert.deepEqual(result.records, [
    { imdbId: '12345', categoryId: 1 },
    { imdbId: '9876543', categoryId: 2 }
  ]);
  assert.equal(requests.length, 1);
  const url = new URL(requests[0].url);
  assert.equal(url.origin, 'https://aither.cc');
  assert.equal(url.pathname, '/api/torrents/filter');
  assert.equal(url.searchParams.get('perPage'), '100');
  assert.equal(url.searchParams.get('sortField'), 'created_at');
  assert.equal(url.searchParams.get('sortDirection'), 'desc');
  assert.deepEqual(url.searchParams.getAll('categories[]'), ['1', '2']);
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(requests[0].options.headers.Authorization, `Bearer ${key}`);
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.equal(requests[0].options.redirect, 'error');
  assert.deepEqual((await api.loadRecentTorrents('movies', key)).records, [result.records[0]]);
  assert.deepEqual((await api.loadRecentTorrents('tv', key)).records, [result.records[1]]);
  assert.equal(requests.length, 1, 'a combined cache must serve either individual view');

  const rawStorage = JSON.stringify([...storage.entries()]);
  assert.equal(rawStorage.includes(key), false);
  assert.equal(rawStorage.includes('rsskey'), false);
  const cached = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null);
  assert.deepEqual(cached.entries[0].records, result.records);
  assert.equal(cached.entries[0].records[0].download_link, undefined);
});

test('combined and separate movie/TV results share the two-minute cache', async () => {
  const storage = new Map();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    fetch: async (url) => {
      calls++;
      const category = Number(new URL(url).searchParams.get('categories[]'));
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [torrent(calls, 100 + calls, category)] })
      };
    }
  });
  const key = 'token';
  storage.set(api.API_KEY_STORAGE, api.encodeStored(key));
  await api.loadRecentTorrents('movies', key);
  storage.set(api.TORRENT_REQUEST_KEY, Date.now() - 10_001);
  await api.loadRecentTorrents('tv', key);
  const combined = await api.loadRecentTorrents('all', key);
  assert.equal(calls, 2);
  assert.equal(combined.cached, true);
  assert.deepEqual(combined.records, [
    { imdbId: '101', categoryId: 1 },
    { imdbId: '102', categoryId: 2 }
  ]);
  assert.equal((await api.loadRecentTorrents('movies', key)).cached, true);
  assert.equal((await api.loadRecentTorrents('tv', key)).cached, true);
  assert.equal(calls, 2);
  const now = Date.now();
  assert.ok(
    api.cachedTorrents(
      [{ scope: 'all', savedAt: now - 119_999, records: combined.records }],
      'tv',
      now
    )
  );
  assert.equal(
    api.cachedTorrents(
      [{ scope: 'all', savedAt: now - 120_000, records: combined.records }],
      'tv',
      now
    ),
    null
  );
});

test('tracker pagination follows cursors or page numbers for at most three pages, paced two seconds apart', async () => {
  for (const parameter of ['cursor', 'page']) {
    const storage = new Map();
    let now = Date.now();
    const requests = [];
    const progress = [];
    const api = make(() => assert.fail('unexpected IMDb request'), {
      storage,
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setTimeout: (callback, delay) => {
        now += delay;
        callback();
      },
      fetch: async (url, options) => {
        const page = Number(new URL(url).searchParams.get(parameter) || 1);
        requests.push({ url: new URL(url), now, options });
        return {
          ok: true,
          json: async () => ({
            data: [torrent(page, 100 + page, 1)],
            links: {
              next: `https://aither.cc/api/torrents/filter?${parameter}=${page + 1}&perPage=1&categories[]=999&api_token=not-forwarded`
            }
          })
        };
      }
    });
    storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
    const result = await api.loadRecentTorrents('movies', 'key', false, (data) =>
      progress.push(data)
    );
    assert.equal(requests.length, 3);
    assert.deepEqual(
      progress.map((data) => data.records.length),
      [0, 1, 2, 3]
    );
    assert.equal(result.pages, 3);
    assert.deepEqual(
      requests.map((request) => request.url.searchParams.get(parameter)),
      [null, '2', '3']
    );
    assert.deepEqual(
      requests.slice(1).map((request, index) => request.now - requests[index].now),
      [2000, 2000]
    );
    for (const { url, options } of requests) {
      assert.equal(url.searchParams.get('perPage'), '100');
      assert.deepEqual(url.searchParams.getAll('categories[]'), ['1']);
      assert.equal(url.searchParams.has('api_token'), false);
      assert.equal(options.headers.Authorization, 'Bearer key');
    }
    const saved = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null);
    assert.deepEqual(saved.entries[0].torrentIds, ['1', '2', '3']);
    assert.equal((await api.loadRecentTorrents('movies', 'key')).cached, true);
    assert.equal(requests.length, 3);
    now += 120_001;
    const refreshed = await api.loadRecentTorrents('movies', 'key');
    assert.equal(
      requests.length,
      4,
      'a complete page already covered by a previous scan ends pagination'
    );
    assert.equal(refreshed.pages, 1);
    assert.deepEqual(refreshed.records, result.records, 'older matched titles remain in history');
  }
});

test('known movie pages cannot end a combined scan before its older TV results are checked', async () => {
  const storage = new Map();
  let now = Date.now();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    setTimeout: (callback, delay) => {
      now += delay;
      callback();
    },
    fetch: async () => ({
      ok: true,
      json: async () =>
        ++calls === 1
          ? { data: [torrent(1, 111, 1)], links: { next: '/api/torrents/filter?page=2' } }
          : { data: [torrent(2, 222, 2)], links: { next: null } }
    })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  storage.set(
    api.TORRENT_CACHE_KEY,
    api.encodeStored({
      credential: createHash('sha256').update('key').digest('hex'),
      entries: [
        {
          scope: 'movies',
          savedAt: now - 120001,
          records: [{ imdbId: '111', categoryId: 1 }],
          torrentIds: ['1']
        }
      ]
    })
  );
  assert.deepEqual((await api.loadRecentTorrents('all', 'key')).records, [
    { imdbId: '111', categoryId: 1 },
    { imdbId: '222', categoryId: 2 }
  ]);
  assert.equal(calls, 2);
});

test('a failed later tracker page preserves earlier matches without caching the scan as complete', async () => {
  const storage = new Map();
  let now = Date.now();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    setTimeout: (callback, delay) => {
      now += delay;
      callback();
    },
    fetch: async () =>
      ++calls === 1
        ? {
            ok: true,
            json: async () => ({
              data: [torrent(1, 111, 1)],
              links: { next: '/api/torrents/filter?page=2' }
            })
          }
        : { ok: false, status: 503 }
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  await assert.rejects(api.loadRecentTorrents('movies', 'key'), (error) => {
    assert.deepEqual(error.records, [{ imdbId: '111', categoryId: 1 }]);
    return /503/.test(error.message);
  });
  const saved = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null);
  assert.equal(saved.history.length, 1);
  assert.equal(api.cachedTorrents(saved.entries, 'movies', now), null);
  assert.equal((await api.loadRecentTorrents('movies', 'key')).retryAfter, 2000);
});

test('tracker pagination refuses off-site next links and stops if the key changes between pages', async () => {
  for (const changeKey of [false, true]) {
    const storage = new Map();
    let now = Date.now();
    let calls = 0;
    const api = make(() => assert.fail('unexpected IMDb request'), {
      storage,
      Date: class extends Date {
        static now() {
          return now;
        }
      },
      setTimeout: (callback, delay) => {
        now += delay;
        storage.set(api.API_KEY_STORAGE, api.encodeStored('replacement'));
        callback();
      },
      fetch: async () => {
        calls++;
        return {
          ok: true,
          json: async () => ({
            data: [torrent(1, 111, 1)],
            links: {
              next: changeKey
                ? '/api/torrents/filter?page=2'
                : 'https://other.test/api/torrents/filter?page=2'
            }
          })
        };
      }
    });
    storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
    if (changeKey)
      assert.deepEqual(await api.loadRecentTorrents('movies', 'key'), { cancelled: true });
    else await assert.rejects(api.loadRecentTorrents('movies', 'key'), /invalid next-page URL/);
    assert.equal(calls, 1);
  }
});

test('torrent API cache misses cannot request faster than once every two seconds', async () => {
  const storage = new Map();
  const requests = [];
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    fetch: async (url) => {
      requests.push(url);
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    }
  });
  const key = 'token';
  storage.set(api.API_KEY_STORAGE, api.encodeStored(key));
  await api.loadRecentTorrents('movies', key);
  const blocked = await api.loadRecentTorrents('tv', key);
  assert.equal(requests.length, 1);
  assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= 2_000);
  await api.loadRecentTorrents('movies', key, true);
  assert.equal(requests.length, 1, 'Refresh must respect the cooldown');
  storage.set(api.TORRENT_REQUEST_KEY, Date.now() - 2_001);
  await api.loadRecentTorrents('tv', key);
  assert.equal(requests.length, 2);
});

test('new API pages merge with older matches and cache hits do not renew their age', async () => {
  const storage = new Map();
  const start = Date.now();
  let now = start;
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ data: [[torrent(1, 111, 1)], [torrent(2, 222, 1)], []][calls++] })
    })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  await api.loadRecentTorrents('movies', 'key');
  now += 120_001;
  const updated = await api.loadRecentTorrents('movies', 'key');
  assert.deepEqual(updated.records, [
    { imdbId: '111', categoryId: 1 },
    { imdbId: '222', categoryId: 1 }
  ]);
  const history = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history;
  assert.deepEqual(
    history.map(({ lastSeen }) => lastSeen),
    [start, now]
  );
  now += 60_000;
  assert.equal((await api.loadRecentTorrents('movies', 'key')).cached, true);
  assert.equal(calls, 2);
  assert.deepEqual(api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history, history);
  now += 60_001;
  assert.deepEqual((await api.loadRecentTorrents('movies', 'key')).records, updated.records);
  assert.equal(calls, 3, 'an empty latest page must still refresh the two-minute search cache');
  assert.deepEqual(api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history, history);
});

test('matches expire exactly fourteen days after last seen, including during a fresh search-cache hit', async () => {
  const storage = new Map();
  const start = Date.now();
  const retention = 14 * 24 * 60 * 60 * 1000;
  let now = start;
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ data: [torrent(++calls, 100 + calls, 1)] })
    })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  await api.loadRecentTorrents('movies', 'key');
  now = start + retention - 1;
  assert.equal((await api.loadRecentTorrents('movies', 'key')).records.length, 2);
  now++;
  const result = await api.loadRecentTorrents('movies', 'key');
  assert.equal(result.cached, true);
  assert.equal(calls, 2);
  assert.deepEqual(result.records, [{ imdbId: '102', categoryId: 1 }]);
  assert.deepEqual(api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history, [
    { imdbId: '102', categoryId: 1, lastSeen: start + retention - 1 }
  ]);
  const record = { imdbId: '111', categoryId: 1 };
  const merged = api.mergeTorrentHistory(
    [
      { ...record, lastSeen: now - 1 },
      { ...record, lastSeen: now - 3 },
      { imdbId: '222', categoryId: 1, lastSeen: now + 1 },
      { imdbId: '333', categoryId: 1 }
    ],
    [],
    now
  );
  assert.deepEqual(merged, [{ ...record, lastSeen: now - 1 }]);
  assert.deepEqual(api.mergeTorrentHistory(merged, [record], now), [{ ...record, lastSeen: now }]);
});

test('existing v1 movie and TV cache pages migrate into history with their original timestamps', async () => {
  const storage = new Map();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () => ({ ok: true, json: async () => ({ data: [torrent(3, 333, 1)] }) })
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  storage.set(
    api.TORRENT_CACHE_KEY,
    api.encodeStored({
      credential: createHash('sha256').update('key').digest('hex'),
      entries: [
        { scope: 'movies', savedAt: now - 3 * day, records: [{ imdbId: '111', categoryId: 1 }] },
        { scope: 'tv', savedAt: now - 2 * day, records: [{ imdbId: '222', categoryId: 2 }] },
        { scope: 'all', savedAt: now - 15 * day, records: [{ imdbId: '999', categoryId: 1 }] },
        { scope: 'movies', savedAt: now - 8 * day, records: [{ imdbId: '888', categoryId: 1 }] }
      ]
    })
  );
  const result = await api.loadRecentTorrents('movies', 'key');
  assert.deepEqual(result.records, [
    { imdbId: '111', categoryId: 1 },
    { imdbId: '888', categoryId: 1 },
    { imdbId: '333', categoryId: 1 }
  ]);
  assert.deepEqual(api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history, [
    { imdbId: '111', categoryId: 1, lastSeen: now - 3 * day },
    { imdbId: '222', categoryId: 2, lastSeen: now - 2 * day },
    { imdbId: '888', categoryId: 1, lastSeen: now - 8 * day },
    { imdbId: '333', categoryId: 1, lastSeen: now }
  ]);
});

test('failed updates and cooldowns retain historical matches without leaking them to a changed key', async () => {
  const storage = new Map();
  let now = Date.now();
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    storage,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    fetch: async () =>
      ++calls === 1
        ? { ok: true, json: async () => ({ data: [torrent(1, 111, 1), torrent(2, 222, 2)] }) }
        : { ok: false, status: 503 }
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('key'));
  const first = await api.loadRecentTorrents('all', 'key');
  const saved = api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history;
  now += 120_001;
  await assert.rejects(api.loadRecentTorrents('all', 'key'), (error) => {
    assert.match(error.message, /HTTP 503/);
    assert.deepEqual(error.records, first.records);
    return true;
  });
  assert.deepEqual(api.decodeStored(storage.get(api.TORRENT_CACHE_KEY), null).history, saved);
  const waiting = await api.loadRecentTorrents('tv', 'key');
  assert.equal(waiting.retryAfter, 2_000);
  assert.deepEqual(waiting.records, [{ imdbId: '222', categoryId: 2 }]);
  storage.set(api.API_KEY_STORAGE, api.encodeStored('other-key'));
  assert.deepEqual((await api.loadRecentTorrents('all', 'other-key')).records, []);
  assert.equal(calls, 2);
});

test('obsolete calendar caches are removed without deleting current data, migrations or settings', () => {
  const obsolete = [
    'unit3d-upcoming-cache',
    'unit3d-upcoming-cache-v1',
    'unit3d-upcoming-cache-v2',
    'unit3d-upcoming-cache-v3',
    'unit3d-upcoming-cache-v4'
  ];
  const retained = [
    'unit3d-upcoming-cache-v5',
    'unit3d-upcoming-cache-v6',
    'unit3d-upcoming-torrents-v1:https://aither.cc',
    'unit3d-upcoming-torrents-v1:https://other.test',
    'unit3d-upcoming-settings',
    'unit3d-upcoming-api-key:https://aither.cc',
    'unit3d-upcoming-last-api-request:https://aither.cc',
    'another-script-cache-v1'
  ];
  const storage = new Map([...obsolete, ...retained].map((key) => [key, { saved: key }]));
  make(() => assert.fail('unexpected request'), { storage }).cleanOldCaches();
  assert.deepEqual(
    [...storage],
    retained.map((key) => [key, { saved: key }])
  );
});

test('obfuscated history can grow beyond JavaScript argument-spread limits', () => {
  const api = make(() => assert.fail('unexpected request'));
  const history = Array.from({ length: 5000 }, (_, index) => ({
    imdbId: String(1000000 + index),
    categoryId: 1,
    lastSeen: 1788512770907
  }));
  const value = { label: 'Caché 🎞', history };
  const encoded = api.encodeStored(value);
  assert.equal(encoded.includes('lastSeen'), false);
  assert.deepEqual(api.decodeStored(encoded, null), value);
});

test('site caches and credentials stay separate and changed keys cannot save old in-flight results', async () => {
  const storage = new Map();
  let finish;
  let calls = 0;
  const api = make(() => assert.fail('unexpected IMDb request'), {
    origin: 'https://another-unit3d.test',
    storage,
    fetch: async (url) => {
      assert.equal(new URL(url).origin, 'https://another-unit3d.test');
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
  });
  storage.set(api.API_KEY_STORAGE, api.encodeStored('old-key'));
  const pending = api.loadRecentTorrents('movies', 'old-key');
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  storage.set(api.API_KEY_STORAGE, api.encodeStored('new-key'));
  finish({ ok: true, status: 200, json: async () => ({ data: [torrent(1, 123, 1)] }) });
  assert.deepEqual(await pending, { cancelled: true });
  assert.equal(storage.has(api.TORRENT_CACHE_KEY), false);
  assert.ok((await api.loadRecentTorrents('movies', 'new-key')).retryAfter > 0);
  assert.equal(calls, 1, 'changing credentials must not reset the cooldown');
  const otherSite = make(() => assert.fail('unexpected IMDb request'), { storage });
  assert.equal(otherSite.savedApiKey(), '');
  assert.notEqual(api.TORRENT_REQUEST_KEY, otherSite.TORRENT_REQUEST_KEY);
});

test('same-site callers share a lock and failed API requests still consume the cooldown', async () => {
  const storage = new Map();
  let calls = 0;
  let queue = Promise.resolve();
  const navigator = {
    locks: {
      request: (_name, callback) => {
        const result = queue.then(callback);
        queue = result.catch(() => {});
        return result;
      }
    }
  };
  const environment = {
    storage,
    navigator,
    fetch: async () => {
      calls++;
      return { ok: false, status: 401 };
    }
  };
  const first = make(() => assert.fail('unexpected IMDb request'), environment);
  const second = make(() => assert.fail('unexpected IMDb request'), environment);
  storage.set(first.API_KEY_STORAGE, first.encodeStored('bad-key'));
  const results = await Promise.allSettled([
    first.loadRecentTorrents('movies', 'bad-key'),
    second.loadRecentTorrents('tv', 'bad-key')
  ]);
  assert.equal(calls, 1);
  assert.equal(results[0].status, 'rejected');
  assert.match(results[0].reason.message, /HTTP 401/);
  assert.equal(results[1].status, 'fulfilled');
  assert.ok(results[1].value.retryAfter > 0);
  assert.equal(storage.has(first.TORRENT_CACHE_KEY), false);
});

const api = make(() => assert.fail('unexpected network call'));
const options = { mode: 'digital', country: 'US', from: '2026-09-01', to: '2026-09-30' };
const releaseDate = (day, attributes = [], country = 'US') => ({
  year: 2026,
  month: 9,
  day,
  attributes: attributes.map((text) => ({ text })),
  country: { id: country },
  isWideRelease: true
});
const connection = (nodes, endCursor = null, hasNextPage = false) => ({
  edges: nodes.map((node) => ({ node })),
  pageInfo: { endCursor, hasNextPage }
});
const title = (id = 'tt1234567') => ({
  id,
  titleText: { text: 'A film' },
  releaseDate: { year: 2026, month: 7, day: 10 }
});

test('title metadata keeps cast and directors separately and leaves missing credits blank', () => {
  const normalized = api.normalizeTitle({
    ...title(),
    principalCredits: [
      {
        category: { id: 'director' },
        credits: [{ name: { id: 'nm123', nameText: { text: 'Director' } } }]
      },
      {
        category: { id: 'cast' },
        credits: [
          { name: { id: 'nm14019256', nameText: { text: 'Isabel Feldman' } } },
          { name: { id: 'nm12201270', nameText: { text: 'Evan Adams' } } },
          { name: { nameText: { text: 'Name without ID' } } },
          { name: null },
          { name: { nameText: { text: '' } } }
        ]
      },
      { category: { id: 'writer' }, credits: [{ name: { nameText: { text: 'Writer' } } }] }
    ]
  });
  assert.deepEqual(normalized.cast, [
    { id: 'nm14019256', name: 'Isabel Feldman' },
    { id: 'nm12201270', name: 'Evan Adams' },
    { id: undefined, name: 'Name without ID' }
  ]);
  assert.deepEqual(normalized.directors, [{ id: 'nm123', name: 'Director' }]);
  assert.deepEqual(api.normalizeTitle(title()).cast, []);
  assert.deepEqual(api.normalizeTitle(title()).directors, []);
  assert.deepEqual(
    api.normalizeTitle({ ...title(), principalCredits: [{ category: { id: 'cast' } }] }).cast,
    []
  );
});

test('the month selector includes the previous month and six ahead, expanding for navigation', () => {
  const today = new Date(2026, 8, 4);
  const months = [
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
    '2027-01',
    '2027-02',
    '2027-03'
  ];
  assert.deepEqual(api.calendarMonths('2026-09', today), months);
  assert.deepEqual(api.calendarMonths('2026-06', today), ['2026-06', '2026-07', ...months]);
  assert.deepEqual(api.calendarMonths('2027-05', today), [...months, '2027-04', '2027-05']);
  assert.equal(api.shiftMonth('2026-12', 1), '2027-01');
  assert.equal(api.shiftMonth('2026-01', -1), '2025-12');
});

test('calendar dates do not invent days and survive leap years and month/year boundaries', () => {
  assert.equal(api.dateValue({ year: 2026, month: 9, day: null }), null);
  assert.equal(api.dateValue({ year: 2026, month: 9, day: 0 }), null);
  assert.equal(api.dateValue({ year: 2026, month: 2, day: 29 }), null);
  assert.equal(api.dateValue({ year: 2028, month: 2, day: 29 }), '2028-02-29');
  assert.deepEqual(api.monthRange(new Date(2026, 11, 1)), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(api.monthRange(new Date(2026, 12, 1)), { from: '2027-01-01', to: '2027-01-31' });
  assert.deepEqual(api.monthRange(new Date(2028, 1, 1)), { from: '2028-02-01', to: '2028-02-29' });
});

test('episode windows include today and exactly the next 29 calendar days', () => {
  for (const [today, from, to] of [
    [new Date(2026, 8, 4, 23, 59), '2026-09-04', '2026-10-03'],
    [new Date(2026, 11, 20), '2026-12-20', '2027-01-18'],
    [new Date(2028, 1, 15), '2028-02-15', '2028-03-15'],
    [new Date(2026, 2, 1), '2026-03-01', '2026-03-30']
  ])
    assert.deepEqual(api.episodeRange(today), { from, to });
});

test('episode metadata keeps its own ID and title alongside the parent series and episode number', () => {
  const episode = api.normalizeTitle({
    ...title('tt36595781'),
    titleText: { text: 'Morocco' },
    series: {
      displayableEpisodeNumber: {
        displayableSeason: { season: '3' },
        episodeNumber: { episodeNumber: '3' }
      },
      series: {
        id: 'tt27790101',
        titleText: { text: "Conan O'Brien Must Go" },
        primaryImage: { url: 'https://example.com/series.jpg' }
      }
    }
  });
  assert.equal(episode.imdbId, 'tt36595781');
  assert.equal(episode.seriesImdbId, 'tt27790101');
  assert.equal(episode.seriesTitle, "Conan O'Brien Must Go");
  assert.equal(episode.season, 3);
  assert.equal(episode.episode, 3);
  assert.equal(episode.title, "Conan O'Brien Must Go — S3E3 — Morocco");
  assert.equal(episode.image, 'https://example.com/series.jpg');
  assert.equal(api.normalizeTitle(title()).title, 'A film');
  assert.equal(api.normalizeTitle(title()).seriesImdbId, undefined);
});

test('episodes use TV_EPISODE pagination and keep separate episodes of one series within the rolling window', async () => {
  const requests = [];
  class EpisodeDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [2026, 8, 4]));
    }
    static now() {
      return new EpisodeDate().getTime();
    }
  }
  const node = (id, dates) => ({
    ...title(id),
    releaseDates: connection(dates),
    series: { series: { id: 'tt999', titleText: { text: 'A series' } } }
  });
  const first = node('tt1', [releaseDate(4, ['internet']), releaseDate(8)]);
  const second = node('tt2', [{ ...releaseDate(3), month: 10 }]);
  const past = node('tt3', [releaseDate(3), releaseDate(5)]);
  const later = node('tt4', [{ ...releaseDate(4), month: 10 }]);
  const episodeApi = make(
    (request) => {
      const variables = JSON.parse(new URL(request.url).searchParams.get('variables'));
      requests.push(variables);
      request.onload({
        status: 200,
        responseText: JSON.stringify({
          data: {
            comingSoon: variables.after
              ? connection([first, second, later])
              : connection([first, past], 'page2', true)
          }
        })
      });
    },
    { Date: EpisodeDate }
  );
  const data = await episodeApi.loadReleases(
    { mode: 'episodes', country: 'US', from: '2026-01-01', to: '2027-12-31' },
    () => {}
  );
  assert.deepEqual(
    episodeApi.filterEpisodes(data.releases).map(({ imdbId, seriesImdbId, date, mode }) => ({
      imdbId,
      seriesImdbId,
      date,
      mode
    })),
    [
      { imdbId: 'tt1', seriesImdbId: 'tt999', date: '2026-09-04', mode: 'episodes' },
      { imdbId: 'tt2', seriesImdbId: 'tt999', date: '2026-10-03', mode: 'episodes' }
    ]
  );
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.type, 'TV_EPISODE');
    assert.equal(request.includeSeries, true);
    assert.equal(request.from, '2026-09-02');
    assert.equal(request.to, '2026-10-04');
  }
  assert.equal(
    (await episodeApi.loadReleases({ mode: 'episodes', country: 'US' }, () => {})).cached,
    true
  );
  assert.equal(requests.length, 2);
});

test('episode caches span month boundaries and roll forward without keeping obsolete windows', async () => {
  let now = new Date(2026, 8, 30, 23, 58).getTime();
  const requests = [];
  const storage = new Map();
  class EpisodeDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const episodeApi = make(
    (request) => {
      requests.push(JSON.parse(new URL(request.url).searchParams.get('variables')));
      request.onload({
        status: 200,
        responseText: JSON.stringify({ data: { comingSoon: connection([]) } })
      });
    },
    { Date: EpisodeDate, storage }
  );
  const selected = { mode: 'episodes', country: 'US' };
  await episodeApi.loadReleases(selected, () => {});
  await episodeApi.loadReleases(selected, () => {});
  assert.equal(requests.length, 1);
  now += 4 * 60 * 1000;
  await episodeApi.loadReleases(selected, () => {});
  assert.equal(requests.length, 2, 'a fresh cache missing the new last day must reload');
  assert.deepEqual(
    requests.map(({ from, to }) => ({ from, to })),
    [
      { from: '2026-09-28', to: '2026-10-30' },
      { from: '2026-09-29', to: '2026-10-31' }
    ]
  );
  const cache = storage.get('unit3d-upcoming-cache-v5');
  assert.equal(cache.length, 1);
  assert.equal(cache[0].key, 'episodes:US:rolling:en-US:auto');
  assert.equal(cache[0].from, '2026-09-29');
  await episodeApi.loadReleases({ ...selected, country: 'GB' }, () => {});
  assert.equal(storage.get('unit3d-upcoming-cache-v5').length, 2);
});

test('hiding a parent series persists its name and hides all of its episodes until restored', () => {
  const storage = new Map([['unit3d-upcoming-cache-v3', []]]);
  const episodeApi = make(() => assert.fail('unexpected API request'), { storage });
  const first = {
    imdbId: 'tt1',
    seriesImdbId: 'tt100',
    title: 'Show — S1E1 — First',
    mode: 'episodes',
    date: '2026-09-04'
  };
  const second = { ...first, imdbId: 'tt2', title: 'Show — S1E2 — Second', date: '2026-10-03' };
  const another = {
    ...first,
    imdbId: 'tt5',
    seriesImdbId: 'tt200',
    title: 'Another show — Episode'
  };
  const past = { ...first, imdbId: 'tt3', date: '2026-09-03' };
  const later = { ...first, imdbId: 'tt4', date: '2026-10-04' };
  const film = { ...first, title: 'Film', mode: 'theatrical' };
  const today = new Date(2026, 8, 4);
  const series = { imdbId: 'tt100', title: 'Show' };
  episodeApi.setSeriesHidden(series, true);
  episodeApi.setSeriesHidden({ ...series, title: 'Renamed show' }, true);
  episodeApi.cleanOldCaches();
  storage.delete('unit3d-upcoming-cache-v5');
  const reloaded = make(() => assert.fail('unexpected API request'), { storage });
  assert.deepEqual(reloaded.readHiddenSeries(), [{ imdbId: 'tt100', title: 'Renamed show' }]);
  assert.deepEqual(reloaded.filterEpisodes([first, second, another, past, later, film], today), [
    another,
    film
  ]);
  reloaded.setSeriesHidden({ imdbId: 'tt200', title: 'Another show' }, true);
  reloaded.setSeriesHidden(series, false);
  assert.deepEqual(reloaded.readHiddenSeries(), [{ imdbId: 'tt200', title: 'Another show' }]);
  assert.deepEqual(reloaded.filterEpisodes([first, second, another, past, later, film], today), [
    first,
    second,
    film
  ]);
  assert.equal(storage.has('unit3d-upcoming-cache-v3'), false);
});

test('digital dates come from regional release events, never the primary theatrical date', () => {
  const dates = [
    releaseDate(2),
    releaseDate(8, ['internet']),
    releaseDate(9, ['Digital Film Festival']),
    releaseDate(10, ['internet'], 'GB'),
    releaseDate(null, ['internet']),
    { ...releaseDate(3, ['internet']), month: 10 },
    releaseDate(12, ['DVD premiere'])
  ];
  const digital = api.collectReleases(title(), dates, options);
  assert.deepEqual(
    digital.map((release) => release.date),
    ['2026-09-08']
  );
  const theatrical = api.collectReleases(title(), dates, { ...options, mode: 'theatrical' });
  assert.deepEqual(
    theatrical.map((release) => release.date),
    ['2026-09-02']
  );
  assert.equal(api.releaseKind(releaseDate(1, ['TV premiere'])), null);
  assert.equal(api.releaseKind(releaseDate(1, ['video on demand'])), 'digital');
  assert.equal(api.releaseKind({ ...releaseDate(1), isWideRelease: false }), null);
  assert.deepEqual(api.collectReleases({ ...title(), id: '"><script>' }, dates, options), []);
});

test('release sorting deduplicates a title/day while preserving later digital releases', () => {
  const one = { imdbId: 'tt1234567', date: '2026-09-08', mode: 'digital', title: 'B' };
  const later = { ...one, date: '2026-09-09' };
  const another = { ...one, imdbId: 'tt7654321', title: 'A' };
  assert.deepEqual(api.sortReleases([later, one, another, one]), [another, one, later]);
  assert.equal(api.searchUrl('tt0012345'), 'https://aither.cc/torrents?imdbId=0012345');
});

test('TV cards keep the earliest date per title and country regardless of event order', () => {
  const premiere = {
    imdbId: 'tt44898747',
    date: '2026-09-02',
    country: 'US',
    mode: 'tv',
    title: 'The Tyler Black Gets Grounded Show'
  };
  const later = { ...premiere, date: '2026-09-04' };
  const anotherCountry = { ...premiere, date: '2026-09-06', country: 'GB' };
  const anotherShow = { ...later, imdbId: 'tt43716919', title: 'Broken: Enemies Attract' };
  const theatrical = { ...premiere, imdbId: 'tt1234567', mode: 'theatrical', title: 'Film' };
  const digital = { ...theatrical, date: '2026-09-04', mode: 'digital' };
  const expected = [theatrical, premiere, anotherShow, digital, anotherCountry];
  const releases = [later, digital, anotherCountry, premiere, theatrical, anotherShow, later];
  assert.deepEqual(api.sortReleases(releases), expected);
  assert.deepEqual(api.sortReleases([...releases].reverse()), expected);
});

test('both calendar and per-title release connections paginate, including duplicate title rows', async () => {
  const requests = [];
  const first = { ...title(), releaseDates: connection([releaseDate(2)], 'dates-2', true) };
  const second = {
    ...title('tt7654321'),
    releaseDates: connection([releaseDate(12, ['internet'])])
  };
  const pageApi = make((request) => {
    const url = new URL(request.url);
    assert.equal(request.headers['X-Imdb-User-Language'], 'de-DE');
    assert.equal(request.headers['X-Imdb-User-Country'], 'PL');
    const operation = url.searchParams.get('operationName');
    const variables = JSON.parse(url.searchParams.get('variables'));
    requests.push({ operation, variables });
    let data;
    if (operation === 'Unit3dUpcomingReleaseDates') {
      assert.equal(variables.after, 'dates-2');
      data = { title: { releaseDates: connection([releaseDate(8, ['internet'])]) } };
    } else if (!variables.after) {
      data = { comingSoon: connection([first], 'titles-2', true) };
    } else {
      assert.equal(variables.after, 'titles-2');
      data = { comingSoon: connection([first, second]) };
    }
    request.onload({ status: 200, responseText: JSON.stringify({ data }) });
  });
  const movies = await pageApi.fetchComingSoon(
    { ...options, language: 'de-DE', titleCountry: 'PL' },
    () => {}
  );
  assert.deepEqual(
    movies.releases.map((movie) => movie.date),
    ['2026-09-08', '2026-09-12']
  );
  assert.equal(requests.length, 3);
  assert.equal(requests[0].variables.type, 'MOVIE');
  assert.deepEqual(requests[0].variables.countries, ['US']);
  assert.equal(requests[0].variables.region, 'US');
  assert.deepEqual(requests[1].variables.countries, ['US']);
  assert.equal(requests[0].variables.to, '2026-09-30');
});

test('stalled, cyclic and malformed pagination fails instead of caching incomplete success', () => {
  const seen = new Set();
  assert.equal(api.nextCursor(connection([], 'one', true), seen), 'one');
  assert.equal(api.nextCursor(connection([], 'two', true), seen), 'two');
  assert.throws(() => api.nextCursor(connection([], 'one', true), seen), /pagination/);
  assert.throws(() => api.nextCursor(connection([], null, true), new Set()), /pagination/);
  assert.throws(() => api.nextCursor({ edges: [] }, new Set()), /incomplete/);
});

function extractFunction(name, next) {
  const begin = source.indexOf(`  async function ${name}(`);
  const finish = source.indexOf(`\n  ${next}`, begin);
  assert.ok(begin >= 0 && finish > begin);
  return source.slice(begin, finish);
}

function digitalLoader(read, parse, query = async () => ({ titles: [] })) {
  return new Function(
    'requestText',
    'parseDigitalSchedule',
    'imdbGraphqlRequest',
    'normalizeTitle',
    'DVD_ORIGIN',
    'TITLES_QUERY',
    `${extractFunction('fetchDigitalSchedule', 'function sortReleases(')}; return fetchDigitalSchedule;`
  )(read, parse, query, api.normalizeTitle, 'https://www.dvdsreleasedates.com', api.TITLES_QUERY);
}

test('digital enrichment uses the title country and metadata language while preserving the US schedule date', async () => {
  const calendar = [
    {
      imdbId: 'tt1234567',
      date: '2026-09-08',
      title: 'A film',
      image: 'poster',
      mode: 'digital',
      country: 'US'
    }
  ];
  const fetchDigital = digitalLoader(
    async () => '<html>',
    () => calendar,
    async (_query, _variables, country, language) => {
      assert.equal(country, 'PL');
      assert.equal(language, 'fr-FR');
      return {
        titles: [
          {
            ...title(),
            titleText: { text: 'Un film' },
            plot: { plotText: { plainText: 'Un récit en français.' } },
            principalCredits: [
              {
                category: { id: 'cast' },
                credits: [{ name: { id: 'nm123', nameText: { text: 'Actor One' } } }]
              }
            ]
          }
        ]
      };
    }
  );
  const data = await fetchDigital({ ...options, language: 'fr-FR', titleCountry: 'PL' }, () => {});
  assert.equal(data.releases[0].date, '2026-09-08');
  assert.equal(data.releases[0].mode, 'digital');
  assert.equal(data.releases[0].country, 'US');
  assert.equal(data.releases[0].title, 'Un film');
  assert.equal(data.releases[0].plot, 'Un récit en français.');
  assert.deepEqual(data.releases[0].cast, [{ id: 'nm123', name: 'Actor One' }]);
  assert.deepEqual(data.notices, []);
});

test('digital loading requests only the selected month and enriches only the requested dates', async () => {
  const requests = [];
  const titleRequests = [];
  const january = { imdbId: 'tt1234567', date: '2027-01-05', mode: 'digital', title: 'Film' };
  const load = digitalLoader(
    async (url) => {
      requests.push(url);
      return url;
    },
    (html, from, to) => {
      if (html.endsWith('/2027/1/')) {
        assert.equal(from, '2027-01-04');
        assert.equal(to, '2027-01-31');
        return [january];
      }
      assert.fail('no other month should be fetched');
    },
    async (query, variables) => {
      titleRequests.push(variables.ids);
      return { titles: [] };
    }
  );
  const data = await load({ ...options, from: '2027-01-04', to: '2027-01-31' }, () => {});
  assert.deepEqual(
    requests.map((url) => new URL(url).pathname),
    ['/digital-releases/2027/1/']
  );
  assert.deepEqual(titleRequests, [['tt1234567']]);
  assert.equal(data.releases[0].imdbId, january.imdbId);
  assert.deepEqual(data.notices, []);
  await assert.rejects(
    digitalLoader(
      async () => {
        throw new Error('offline');
      },
      () => []
    )(options, () => {}),
    /offline/
  );
});

test('a digital source failure preserves the other schedule and reports incomplete coverage', async () => {
  const movies = [{ imdbId: 'tt1234567', date: '2026-09-08', title: 'A film', mode: 'digital' }];
  const fail = async () => {
    throw new Error('timeout');
  };
  const result = await mixedLoader(fail, async () => ({ releases: movies, notices: [] }))(
    options,
    () => {}
  );
  assert.deepEqual(result.releases, movies);
  assert.match(result.notices[0], /IMDb digital calendar unavailable: timeout/);
  await assert.rejects(
    mixedLoader(fail, fail)(options, () => {}),
    /US digital schedule unavailable/
  );
});

test('combined movies preserve both theatrical and digital events under the same date', () => {
  const dates = [releaseDate(8), releaseDate(8, ['internet']), releaseDate(8, ['internet'])];
  const movies = api.sortReleases(
    api.collectReleases(title(), dates, { ...options, mode: 'movies' })
  );
  assert.deepEqual(
    movies.map(({ date, mode }) => ({ date, mode })),
    [
      { date: '2026-09-08', mode: 'theatrical' },
      { date: '2026-09-08', mode: 'digital' }
    ]
  );
});

test('TV fetch accepts broadcast and streaming dates and displays the earliest once', async () => {
  const dates = [
    { ...releaseDate(8, ['TV premiere']), isWideRelease: false },
    releaseDate(9, ['internet']),
    releaseDate(9),
    releaseDate(10, ['Digital Film Festival']),
    releaseDate(11, ['DVD premiere']),
    releaseDate(null, ['internet']),
    releaseDate(12, ['TV premiere'], 'GB')
  ];
  const calls = [];
  const tvApi = make((request) => {
    const url = new URL(request.url);
    calls.push(JSON.parse(url.searchParams.get('variables')));
    request.onload({
      status: 200,
      responseText: JSON.stringify({
        data: {
          comingSoon: connection([
            { ...title(), releaseDates: connection(dates) },
            {
              ...title('tt7654321'),
              releaseDates: connection([releaseDate(9, ['internet'])])
            }
          ])
        }
      })
    });
  });
  const data = await tvApi.fetchComingSoon({ ...options, mode: 'tv' }, () => {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'TV');
  assert.deepEqual(calls[0].countries, ['US']);
  assert.deepEqual(
    api.sortReleases(data.releases).map(({ imdbId, date, mode }) => ({ imdbId, date, mode })),
    [
      { imdbId: 'tt1234567', date: '2026-09-08', mode: 'tv' },
      { imdbId: 'tt7654321', date: '2026-09-09', mode: 'tv' }
    ]
  );
});

test('an earlier TV premiere on a later release-date page suppresses duplicate events in the requested month', async () => {
  const tvApi = make((request) => {
    const operation = new URL(request.url).searchParams.get('operationName');
    const data =
      operation === 'Unit3dUpcomingReleaseDates'
        ? { title: { releaseDates: connection([releaseDate(2, ['internet'])]) } }
        : {
            comingSoon: connection([
              {
                ...title('tt44898747'),
                releaseDates: connection([releaseDate(6, ['internet'])], 'earlier-date', true)
              }
            ])
          };
    request.onload({ status: 200, responseText: JSON.stringify({ data }) });
  });
  const initial = await tvApi.fetchComingSoon(
    { ...options, mode: 'tv', from: '2026-09-04' },
    () => {}
  );
  assert.deepEqual(initial.releases, []);
  const full = await tvApi.fetchComingSoon({ ...options, mode: 'tv' }, () => {});
  assert.deepEqual(
    full.releases.map(({ date }) => date),
    ['2026-09-02']
  );
  const nextMonth = api.collectReleases(
    title(),
    [releaseDate(2), { ...releaseDate(6), month: 10 }],
    {
      ...options,
      mode: 'tv',
      from: '2026-10-01',
      to: '2026-10-31'
    }
  );
  assert.deepEqual(nextMonth, []);
});

function mixedLoader(imdb, digital, storage = new Map()) {
  return new Function(
    'fetchComingSoon',
    'fetchDigitalSchedule',
    'sortReleases',
    'RELEASE_VIEWS',
    'GM_getValue',
    'GM_setValue',
    'CACHE_KEY',
    'CACHE_TTL',
    'EPISODE_CACHE_TTL',
    'RELEASE_CACHE_RETENTION',
    'dateValue',
    'releaseRequests',
    'episodeRange',
    'SETTINGS_KEY',
    `${source.slice(source.indexOf('  function readReleaseCache('), source.indexOf('\n  function searchUrl('))}; return loadReleases;`
  )(
    imdb,
    digital,
    api.sortReleases,
    api.RELEASE_VIEWS,
    (key, fallback) => structuredClone(storage.has(key) ? storage.get(key) : fallback),
    (key, value) => storage.set(key, structuredClone(value)),
    'unit3d-upcoming-cache-v5',
    24 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
    30 * 24 * 60 * 60 * 1000,
    api.dateValue,
    new Map(),
    api.episodeRange,
    'unit3d-upcoming-settings'
  );
}

test('episode fetching retains adjacent IMDb days in the shared cache', async () => {
  const requests = [];
  const load = mixedLoader(
    async (request) => {
      requests.push(request);
      return { releases: [], notices: [] };
    },
    () => assert.fail('unexpected digital request')
  );
  await load({ ...options, mode: 'episodes' }, () => {});
  const range = api.episodeRange();
  assert.equal(Date.parse(range.from) - Date.parse(requests[0].from), 2 * 86400000);
  assert.equal(Date.parse(requests[0].to) - Date.parse(range.to), 86400000);
  await load({ ...options, mode: 'episodes' }, () => {});
  assert.equal(requests.length, 1);
});

test('episodes refresh after 12 hours, movie and TV data after 24, and stale data stays readable', async () => {
  for (const [mode, hours] of [
    ['episodes', 12],
    ['theatrical', 24],
    ['tv', 24]
  ]) {
    const storage = new Map();
    let calls = 0;
    const load = mixedLoader(
      async () => {
        calls++;
        return { releases: [], notices: [] };
      },
      () => assert.fail('unexpected digital request'),
      storage
    );
    await load({ ...options, mode }, () => {});
    const entries = storage.get('unit3d-upcoming-cache-v5');
    entries[0].savedAt = Date.now() - hours * 60 * 60 * 1000 + 60000;
    await load({ ...options, mode }, () => {});
    assert.equal(calls, 1, mode);
    entries[0].savedAt = Date.now() - hours * 60 * 60 * 1000 - 1;
    const cacheApi = make(() => {}, { storage });
    assert.equal(cacheApi.readReleaseCache().length, 0);
    assert.equal(cacheApi.readReleaseCache('en-US', '', true).length, 1);
    await load({ ...options, mode }, () => {});
    assert.equal(calls, 2, mode);
  }
});

test('writing another calendar keeps stale snapshots for display but prunes expired retention', async () => {
  const storage = new Map([
    [
      'unit3d-upcoming-cache-v5',
      [
        {
          key: 'episodes:US:rolling:en-US:auto',
          savedAt: Date.now() - 13 * 60 * 60 * 1000,
          releases: []
        },
        { key: 'old', savedAt: Date.now() - 31 * 24 * 60 * 60 * 1000, releases: [] }
      ]
    ]
  ]);
  const load = mixedLoader(
    async () => ({ releases: [], notices: [] }),
    () => {},
    storage
  );
  await load({ ...options, mode: 'theatrical' }, () => {});
  assert.deepEqual(
    storage.get('unit3d-upcoming-cache-v5').map((entry) => entry.key),
    ['episodes:US:rolling:en-US:auto', 'movies:US:2026-09:en-US:auto']
  );
});

test('concurrent languages keep independent requests and caches, including cached searches', async () => {
  const storage = new Map();
  const finish = new Map();
  const requests = [];
  const load = mixedLoader(
    (request) => {
      requests.push(request);
      return new Promise((resolve) =>
        finish.set(request.language, () =>
          resolve({
            releases: [
              {
                imdbId: 'tt123',
                title: request.language,
                date: '2026-09-08',
                country: request.country,
                mode: 'theatrical'
              }
            ],
            notices: []
          })
        )
      );
    },
    () => assert.fail('unexpected digital request'),
    storage
  );
  const selected = { ...options, mode: 'theatrical', country: 'CA' };
  const english = load({ ...selected, language: 'en-US' }, () => {});
  const french = load({ ...selected, language: 'fr-CA' }, () => {});
  assert.equal(requests.length, 2, 'different languages must not share an in-flight request');
  finish.get('fr-CA')();
  await french;
  finish.get('en-US')();
  await english;
  for (const language of ['fr-CA', 'en-US']) {
    const cached = await load({ ...selected, language }, () => {});
    assert.equal(cached.cached, true);
    assert.deepEqual(
      cached.releases.map((release) => release.title),
      [language]
    );
  }
  assert.equal(requests.length, 2);
  const cacheApi = make(() => assert.fail('unexpected request'), { storage });
  assert.deepEqual(
    cacheApi
      .readReleaseCache('fr-CA')
      .flatMap((entry) => entry.releases.map((release) => release.title)),
    ['fr-CA']
  );
  const entries = storage.get('unit3d-upcoming-cache-v5');
  entries.push({ key: 'legacy', savedAt: Date.now(), releases: [{ title: 'Old English' }] });
  storage.set('unit3d-upcoming-cache-v5', entries);
  assert.equal(cacheApi.readReleaseCache('fr-CA').length, 1);
  assert.equal(cacheApi.readReleaseCache('en-US').length, 2);
});

test('regional title preferences isolate concurrent requests, cached results and legacy searches', async () => {
  const storage = new Map();
  const finish = new Map();
  let requests = 0;
  const load = mixedLoader(
    (request) => {
      requests++;
      return new Promise((resolve) =>
        finish.set(request.titleCountry || '', () =>
          resolve({
            releases: [
              {
                imdbId: 'tt123',
                title: request.titleCountry || 'default',
                date: '2026-09-08',
                country: request.country,
                mode: 'theatrical'
              }
            ],
            notices: []
          })
        )
      );
    },
    () => assert.fail('unexpected digital request'),
    storage
  );
  const selected = { ...options, mode: 'theatrical', country: 'CA', language: 'fr-FR' };
  const automatic = load(selected, () => {});
  const polish = load({ ...selected, titleCountry: 'PL' }, () => {});
  assert.equal(requests, 2);
  finish.get('PL')();
  await polish;
  finish.get('')();
  await automatic;
  for (const titleCountry of ['', 'PL']) {
    const cached = await load({ ...selected, titleCountry }, () => {});
    assert.equal(cached.cached, true);
    assert.deepEqual(
      cached.releases.map((release) => release.title),
      [titleCountry || 'default']
    );
    assert.equal(cached.releases[0].country, 'CA');
  }
  assert.equal(requests, 2);
  const cacheApi = make(() => assert.fail('unexpected request'), { storage });
  const entries = storage.get('unit3d-upcoming-cache-v5');
  entries.push({
    key: 'legacy',
    language: 'fr-FR',
    savedAt: Date.now(),
    releases: [{ title: 'Old regional default' }]
  });
  storage.set('unit3d-upcoming-cache-v5', entries);
  assert.deepEqual(
    cacheApi
      .readReleaseCache('fr-FR', 'PL')
      .flatMap((entry) => entry.releases.map((release) => release.title)),
    ['PL']
  );
  assert.equal(cacheApi.readReleaseCache('fr-FR').length, 2);
});

test('background and foreground month requests merge their caches regardless of completion order', async () => {
  const storage = new Map();
  const finish = new Map();
  const load = mixedLoader(
    (request) =>
      new Promise((resolve) =>
        finish.set(request.from, () => resolve({ releases: [], notices: [] }))
      ),
    () => assert.fail('unexpected digital request'),
    storage
  );
  const september = load({ ...options, mode: 'theatrical' }, () => {});
  const october = load(
    { ...options, mode: 'theatrical', from: '2026-10-01', to: '2026-10-31' },
    () => {}
  );
  finish.get('2026-10-01')();
  await october;
  finish.get('2026-09-01')();
  await september;
  assert.deepEqual(
    storage
      .get('unit3d-upcoming-cache-v5')
      .map((entry) => entry.key)
      .sort(),
    ['movies:US:2026-09:en-US:auto', 'movies:US:2026-10:en-US:auto']
  );
});

test('simultaneous full-month consumers share the same missing-prefix request', async () => {
  const calls = [];
  let finishInitial;
  const load = mixedLoader(
    async (request) => {
      calls.push(request);
      if (calls.length === 1)
        await new Promise((resolve) => {
          finishInitial = resolve;
        });
      return {
        releases: [
          {
            imdbId: `tt${calls.length}`,
            title: 'Example',
            mode: 'theatrical',
            country: 'US',
            date: request.from
          }
        ],
        notices: []
      };
    },
    () => assert.fail('unexpected digital request')
  );
  const initial = load({ ...options, mode: 'theatrical', from: '2026-09-04' }, () => {});
  const fullA = load({ ...options, mode: 'theatrical' }, () => {});
  const fullB = load({ ...options, mode: 'theatrical' }, () => {});
  finishInitial();
  await initial;
  assert.equal((await fullA).releases.length, 2);
  assert.equal((await fullB).releases.length, 2);
  assert.deepEqual(
    calls.map(({ from, to }) => ({ from, to })),
    [
      { from: '2026-09-04', to: '2026-09-30' },
      { from: '2026-09-01', to: '2026-09-03' }
    ]
  );
});

test('search spans dates and release types, matching title, cast, director and genre terms together', () => {
  const first = {
    imdbId: 'tt1',
    title: 'The Quiet Moon',
    mode: 'theatrical',
    date: '2026-08-01',
    cast: [{ name: 'Alex Green' }],
    directors: [{ name: 'Morgan Stone' }],
    genres: ['Drama', 'Science Fiction']
  };
  const second = {
    ...first,
    imdbId: 'tt2',
    mode: 'tv',
    date: '2027-01-01',
    title: 'Moon River',
    cast: [],
    directors: [],
    genres: ['Comedy']
  };
  const data = [second, first, { ...first, mode: 'digital', date: '2026-10-01' }];
  assert.equal(api.searchReleases(data, { title: 'moon', name: '', genre: '' }).length, 3);
  assert.equal(
    api.searchReleases(data, { title: 'quiet THE', name: 'alex', genre: 'science, drama' }).length,
    2
  );
  assert.equal(api.searchReleases(data, { title: '', name: 'STONE', genre: '' }).length, 2);
  assert.deepEqual(api.searchReleases(data, { title: 'river', name: 'green', genre: '' }), []);
  assert.deepEqual(api.searchReleases(data, { title: '  ', name: '', genre: 'comedy' }), [second]);
});

test('cast/director and genre filters independently support Any, All and excluding their matches', () => {
  const release = (imdbId, title, cast, directors, genres) => ({
    imdbId,
    title,
    mode: 'theatrical',
    date: '2026-09-04',
    cast: cast.map((name) => ({ name })),
    directors: directors.map((name) => ({ name })),
    genres
  });
  const both = release('tt1', 'Both', ['Alex Green'], ['Morgan Stone'], ['Drama', 'Comedy']);
  const castOnly = release('tt2', 'Cast only', ['Alex Green'], [], ['Drama']);
  const directorOnly = release('tt3', 'Director only', [], ['Morgan Stone'], ['Comedy']);
  const neither = release(
    'tt4',
    'Neither',
    ['Alex Stone', 'Morgan Green'],
    [],
    ['Science Fiction']
  );
  const missing = { imdbId: 'tt5', title: 'Missing', mode: 'tv', date: '2026-09-04' };
  const data = [both, castOnly, directorOnly, neither, missing];
  const ids = (results) => results.map(({ imdbId }) => imdbId).sort();
  for (const [field, query] of [
    ['name', ' Alex Green, MORGAN Stone '],
    ['genre', ' DRAMA, comedy ']
  ]) {
    assert.deepEqual(ids(api.searchReleases(data, { [field]: query })), ['tt1']);
    assert.deepEqual(
      ids(api.searchReleases(data, { [field]: query }, { [field]: { match: 'any' } })),
      ['tt1', 'tt2', 'tt3']
    );
    assert.deepEqual(
      ids(
        api.searchReleases(data, { [field]: query }, { [field]: { match: 'all', exclude: true } })
      ),
      ['tt2', 'tt3', 'tt4', 'tt5']
    );
    assert.deepEqual(
      ids(
        api.searchReleases(data, { [field]: query }, { [field]: { match: 'any', exclude: true } })
      ),
      ['tt4', 'tt5']
    );
    for (const match of ['all', 'any']) {
      assert.deepEqual(
        ids(api.searchReleases(data, { [field]: ' , , ' }, { [field]: { match, exclude: true } })),
        ids(data)
      );
    }
  }
  assert.deepEqual(
    api.searchReleases(data, { genre: 'science fiction' }, { genre: { match: 'any' } }),
    [neither]
  );
  assert.deepEqual(
    api.searchReleases(
      data,
      { name: 'Alex Green', genre: 'Drama,Comedy' },
      { name: { exclude: true }, genre: { match: 'any' } }
    ),
    [directorOnly]
  );
});

test('Settings restore language and title-country choices with independent defaults', () => {
  const from = source.indexOf("    const languageLabel = element('label'");
  const until = source.indexOf('    const settingsForm =', from);
  assert.ok(from > 0 && until > from);
  for (const [savedLanguage, expected, savedTitleCountry, expectedTitleCountry] of [
    [undefined, 'en-US', undefined, ''],
    ['fr-CA', 'fr-CA', 'PL', 'PL'],
    ['invalid', 'en-US', 'invalid', '']
  ]) {
    const nodes = [];
    const context = {
      ROOT_ID: 'test',
      IMDB_LANGUAGES: api.IMDB_LANGUAGES,
      COUNTRIES: api.COUNTRIES,
      country: { options: api.COUNTRIES.map((code) => ({ text: code, value: code })) },
      saved: { language: savedLanguage, titleCountry: savedTitleCountry },
      settings: { append() {} },
      Option: class {
        constructor(text, value) {
          this.text = text;
          this.value = value;
        }
      },
      element: (tag) => {
        const node = {
          tag,
          children: [],
          append(...items) {
            this.children.push(...items);
          },
          setAttribute() {}
        };
        nodes.push(node);
        return node;
      }
    };
    runInNewContext(source.slice(from, until), context);
    const select = nodes.find((node) => node.tag === 'select');
    assert.equal(select.value, expected);
    assert.deepEqual(
      select.children.map((option) => option.value),
      ['en-US', 'fr-CA', 'fr-FR', 'de-DE', 'hi-IN', 'it-IT', 'pt-BR', 'es-MX', 'es-ES']
    );
    const countrySelect = nodes.filter((node) => node.tag === 'select')[1];
    assert.equal(countrySelect.value, expectedTitleCountry);
    assert.deepEqual(
      countrySelect.children.map((option) => option.value),
      ['', ...api.COUNTRIES]
    );
    assert.ok(countrySelect.children.length > select.children.length);
  }
});

test('homepage settings restore their saved values and default to today with optional sources disabled', () => {
  const from = source.indexOf('    const homeOptions = {};');
  const to = source.indexOf('    const timeZoneLabel =', from);
  for (const saved of [
    {},
    {
      homeSonarrOnly: true,
      homeYesterday: true,
      homeToday: false,
      homeTomorrow: true,
      homeDigital: true
    }
  ]) {
    const context = {
      saved,
      homeSettings: { append() {} },
      settings: { append() {} },
      saveSettings() {},
      element: () => ({ append() {}, addEventListener() {} })
    };
    runInNewContext(`${source.slice(from, to)};globalThis.inputs = homeOptions;`, context);
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(context.inputs).map(([key, input]) => [key, input.checked])
      ),
      {
        homeSonarrOnly: saved.homeSonarrOnly === true,
        homeYesterday: saved.homeYesterday === true,
        homeToday: saved.homeToday !== false,
        homeTomorrow: saved.homeTomorrow === true,
        homeDigital: saved.homeDigital === true,
        showEpisodeTime: saved.showEpisodeTime === true
      }
    );
  }
});

test('the main episode Sonarr filter and language are saved with the other page settings', () => {
  const from = source.indexOf('    function saveSettings()');
  const until = source.indexOf('    fullWidth.addEventListener', from);
  assert.ok(from > 0 && until > from);
  let saved;
  const context = {
    SETTINGS_KEY: 'settings',
    mode: { value: 'episodes' },
    country: { value: 'US' },
    language: { value: 'fr-CA' },
    titleCountry: { value: 'PL' },
    fullWidth: { checked: false },
    zoneSelect: { value: 'Australia/Brisbane' },
    homePanel: { checked: true },
    homeIncludeHidden: { checked: false },
    homeOptions: {
      homeSonarrOnly: { checked: true },
      homeYesterday: { checked: true },
      homeToday: { checked: false },
      homeTomorrow: { checked: true },
      homeDigital: { checked: true }
    },
    episodeSonarrFilter: { value: 'out' },
    GM_setValue: (key, value) => {
      assert.equal(key, 'settings');
      saved = value;
    }
  };
  runInNewContext(source.slice(from, until), context);
  context.saveSettings();
  assert.deepEqual(
    { ...saved },
    {
      mode: 'episodes',
      country: 'US',
      language: 'fr-CA',
      titleCountry: 'PL',
      fullWidth: false,
      homePanel: true,
      timeZone: 'Australia/Brisbane',
      homeIncludeHidden: false,
      homeSonarrOnly: true,
      homeYesterday: true,
      homeToday: false,
      homeTomorrow: true,
      homeDigital: true,
      episodeSonarrFilter: 'out'
    }
  );
});

test('Sonarr changes reapply episode filters to cached search results after a calendar failure', () => {
  const from = source.indexOf('    const arr = mountArrIntegration(settings, results,');
  const until = source.indexOf('\n\n    function renderHiddenSeries', from);
  assert.ok(from > 0 && until > from);
  let onLibraryChange;
  let renders = 0;
  const context = {
    settings: {},
    results: {},
    calendar: undefined,
    searching: true,
    mode: { value: 'episodes' },
    episodeSonarrFilter: { value: 'out' },
    mountArrIntegration: (_settings, _results, callback) => {
      onLibraryChange = callback;
      return {};
    },
    updateVisibleReleases: (keepCount) => {
      assert.equal(keepCount, true);
      renders++;
    }
  };
  runInNewContext(source.slice(from, until), context);
  onLibraryChange('sonarr');
  assert.equal(renders, 1);
});

test('the main episode Sonarr control reapplies its filter and Refresh forces Sonarr libraries', () => {
  const from = source.indexOf("    previous.addEventListener('click'");
  const boundary = source.indexOf('\n  function init()', from);
  const until =
    source.lastIndexOf('    void refreshPage();', boundary) + '    void refreshPage();'.length;
  assert.ok(from > 0 && until > from);
  const control = () => ({
    handlers: {},
    addEventListener(event, callback) {
      this.handlers[event] = callback;
    }
  });
  const updates = [];
  const refreshes = [];
  const pageRefreshes = [];
  let saves = 0;
  let renders = 0;
  const context = {
    previous: control(),
    next: control(),
    current: control(),
    monthSelect: { ...control(), value: '2026-09' },
    mode: { ...control(), value: 'episodes' },
    country: control(),
    language: control(),
    titleCountry: control(),
    episodeSonarrFilter: control(),
    refresh: control(),
    month: '2026-09',
    shiftMonth: () => '2026-09',
    monthRange: () => ({ from: '2026-09-01' }),
    selectMonth() {},
    saveSettings: () => saves++,
    updateVisibleReleases: () => renders++,
    refreshPage: (force) => pageRefreshes.push(force),
    arr: {
      update: (...args) => updates.push(args),
      refresh: (type) => refreshes.push(type)
    }
  };
  runInNewContext(source.slice(from, until), context);
  pageRefreshes.length = 0;
  context.episodeSonarrFilter.handlers.change();
  assert.equal(saves, 1);
  assert.equal(renders, 1);
  assert.deepEqual(updates, [[false, 'sonarr']]);
  context.refresh.handlers.click();
  assert.deepEqual(refreshes, ['sonarr']);
  assert.deepEqual(pageRefreshes, [true]);
  context.language.handlers.change();
  assert.deepEqual(pageRefreshes, [true, undefined]);
  context.titleCountry.handlers.change();
  assert.deepEqual(pageRefreshes, [true, undefined, undefined]);
});

test('failed Refresh restores an active cached search even when background months are already cached', async () => {
  const month = api.monthRange(new Date()).from.slice(0, 7);
  const releases = Array.from({ length: 30 }, (_, index) => ({
    imdbId: `tt${index + 1}`,
    title: 'Quiet Moon',
    mode: 'tv',
    country: 'US',
    date: `${month}-15`
  }));
  const node = () => ({
    textContent: '',
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute() {}
  });
  const scheduled = [];
  const calls = [];
  const context = {
    ...Object.fromEntries(
      ['status', 'apiStatus', 'backgroundStatus', 'message', 'results', 'source'].map((name) => [
        name,
        node()
      ])
    ),
    mode: { value: 'tv' },
    country: { value: 'US' },
    language: { value: 'fr-FR' },
    titleCountry: { value: 'PL' },
    monthSelect: node(),
    previous: {},
    current: {},
    next: {},
    refresh: {},
    countryLabel: {},
    panel: { dataset: {} },
    moreRow: {},
    searchStatus: {},
    generation: 0,
    backgroundGeneration: 0,
    torrentGeneration: 0,
    backgroundTimer: undefined,
    torrentRetry: undefined,
    calendar: { releases, notices: [] },
    searching: true,
    visibleReleases: [],
    renderedCount: 0,
    torrentMatches: [],
    month,
    fromToday: false,
    CARD_PAGE_SIZE: 24,
    RELEASE_VIEWS: api.RELEASE_VIEWS,
    monthRange: api.monthRange,
    calendarMonths: api.calendarMonths,
    readReleaseCache: (language, titleCountry) => {
      assert.equal(language, 'fr-FR');
      assert.equal(titleCountry, 'PL');
      return [{ releases }];
    },
    searchFilters: () => ({ title: 'moon' }),
    searchOptions: {},
    filterEpisodes: api.filterEpisodes,
    releaseCountry: api.releaseCountry,
    sortReleases: api.sortReleases,
    filterSonarrEpisodes: api.filterSonarrEpisodes,
    sonarrSeriesMembership: api.sonarrSeriesMembership,
    episodeWindow: {},
    episodeSonarrFilter: { value: 'all' },
    episodeSonarrLabel: {},
    searchReleases: api.searchReleases,
    renderReleases: (target, batch) => target.children.push(...batch),
    markRecentTorrents() {},
    arr: { update() {}, hasLibraryError: () => false },
    saveSettings() {},
    initialStyle: null,
    initialLoading: null,
    requestAnimationFrame: (callback) => callback(),
    clearTimeout() {},
    setTimeout: (callback) => scheduled.push(callback),
    Option: class {},
    loadReleases: async (options, _onProgress, force) => {
      assert.equal(options.language, 'fr-FR');
      assert.equal(options.titleCountry, 'PL');
      calls.push(options);
      if (force) throw new Error('offline');
      return { cached: true, notices: [] };
    }
  };
  for (const [first, last] of [
    ['    function appendReleases(', '    function updateSearch('],
    ['    async function prefetchMonths(', '    function saveSettings('],
    ['    async function refreshPage(', '    function selectMonth(']
  ]) {
    const start = source.indexOf(first);
    const end = source.indexOf(last, start);
    assert.ok(start > 0 && end > start);
    runInNewContext(source.slice(start, end), context);
  }
  context.calendar.cached = true;
  context.calendar.notices = ['Selected calendar warning'];
  context.updateVisibleReleases();
  assert.equal(context.results.children.length, 24);
  assert.match(context.status.textContent, /^30 releases for the current search/);
  assert.doesNotMatch(
    context.status.textContent,
    /for this month|for the next 30 days|Cached|Selected calendar warning/
  );
  assert.doesNotMatch(context.message.textContent, /Selected calendar warning/);
  await context.refreshPage(true);
  assert.equal(context.results.children.length, 24, 'cached matches survive a failed Refresh');
  assert.equal(context.visibleReleases.length, 30);
  assert.match(context.searchStatus.textContent, /^30 matching releases/);
  assert.match(context.message.textContent, /offline/);
  assert.equal(context.calendar, undefined, 'failure must not restore the previous calendar');
  assert.equal(scheduled.length, 1);
  await context.prefetchMonths('US', context.backgroundGeneration);
  assert.equal(calls.length, 9, 'foreground failure followed by eight cached month reads');
  assert.equal(context.results.children.length, 24);
  context.searching = false;
  context.updateVisibleReleases();
  assert.equal(context.results.children.length, 0);
  assert.match(context.message.textContent, /offline/);
});

test('lazy loading reuses sources across views and months, and loads only missing earlier days for This month', async () => {
  const calls = [];
  const fetch = async (request) => {
    calls.push(request);
    const kinds = request.mode === 'movies' ? ['theatrical', 'digital'] : [request.mode];
    return {
      releases: kinds
        .flatMap((mode) =>
          [2, 8].map((day) => ({
            imdbId: `tt${mode === 'tv' ? 9 : 1}${day}`,
            title: mode,
            mode,
            country: request.country,
            date: `${request.from.slice(0, 7)}-${String(day).padStart(2, '0')}`
          }))
        )
        .filter((release) => release.date >= request.from && release.date <= request.to),
      notices: []
    };
  };
  const load = mixedLoader(fetch, fetch);
  const initial = { ...options, mode: 'theatrical', from: '2026-09-04' };
  const first = await load(initial, () => {});
  assert.deepEqual(
    first.releases.map(({ date, mode }) => ({ date, mode })),
    [{ date: '2026-09-08', mode: 'theatrical' }]
  );
  assert.deepEqual(
    calls.map(({ from, to, mode }) => ({ from, to, mode })),
    [{ from: '2026-09-04', to: '2026-09-30', mode: 'movies' }]
  );
  await load({ ...initial, mode: 'all' }, () => {});
  assert.deepEqual(
    calls.map(({ mode }) => mode),
    ['movies', 'digital', 'tv']
  );
  await load({ ...options, mode: 'all', from: '2026-10-01', to: '2026-10-31' }, () => {});
  assert.equal(calls.length, 6);
  assert.ok(calls.slice(3).every((call) => call.from === '2026-10-01' && call.to === '2026-10-31'));
  const full = await load({ ...options, mode: 'all' }, () => {});
  assert.equal(full.releases.length, 6);
  assert.ok(calls.slice(6).every((call) => call.from === '2026-09-01' && call.to === '2026-09-03'));
  assert.equal(calls.length, 9);
  const cached = await load({ ...options, mode: 'all' }, () => {});
  assert.equal(cached.cached, true);
  await load(initial, () => {});
  await load({ ...options, mode: 'tv', from: '2026-10-01', to: '2026-10-31' }, () => {});
  assert.equal(calls.length, 9, 'revisiting a month or narrowing a view must not make requests');
  await load({ ...options, mode: 'tv', country: 'AU' }, () => {});
  assert.equal(calls.length, 10, 'country caches must remain separate');
});

test('empty months are cached, Refresh bypasses the selected sources, and expired entries reload', async () => {
  const storage = new Map();
  let calls = 0;
  const fetch = async () => {
    calls++;
    return { releases: [], notices: [] };
  };
  const load = mixedLoader(fetch, fetch, storage);
  const selected = { ...options, mode: 'theatrical' };
  await load(selected, () => {});
  await load(selected, () => {});
  assert.equal(calls, 1);
  await load(selected, () => {}, true);
  assert.equal(calls, 2);
  const entries = storage.get('unit3d-upcoming-cache-v5');
  entries[0].savedAt = Date.now() - 24 * 60 * 60 * 1000 - 1;
  await load(selected, () => {});
  assert.equal(calls, 3);
  assert.equal(storage.get('unit3d-upcoming-cache-v5').length, 1);
});

test('a failed month extension keeps known results and retries missing days without caching failure', async () => {
  const calls = [];
  const known = { imdbId: 'tt123', title: 'Known', mode: 'theatrical', date: '2026-09-08' };
  let fail = true;
  const load = mixedLoader(
    async (request) => {
      calls.push(request);
      if (request.to === '2026-09-03' && fail) throw new Error('offline');
      return { releases: request.from === '2026-09-04' ? [known] : [], notices: [] };
    },
    async () => assert.fail('no digital source needed')
  );
  await load({ ...options, mode: 'theatrical', from: '2026-09-04' }, () => {});
  const partial = await load({ ...options, mode: 'theatrical' }, () => {});
  assert.deepEqual(partial.releases, [known]);
  assert.match(partial.notices[0], /offline/);
  fail = false;
  const full = await load({ ...options, mode: 'theatrical' }, () => {});
  assert.deepEqual(full.releases, [known]);
  assert.deepEqual(full.notices, []);
  assert.deepEqual(
    calls.slice(1).map(({ from, to }) => ({ from, to })),
    [
      { from: '2026-09-01', to: '2026-09-03' },
      { from: '2026-09-01', to: '2026-09-03' }
    ]
  );
  assert.equal((await load({ ...options, mode: 'theatrical' }, () => {})).cached, true);
});

test('Everything merges three release kinds by date with one movie query and one TV query', async () => {
  const calls = [];
  const digital = { imdbId: 'tt1234567', date: '2026-09-08', title: 'Film', mode: 'digital' };
  const theatrical = { ...digital, date: '2026-09-02', mode: 'theatrical' };
  const tv = { imdbId: 'tt7654321', date: '2026-09-05', title: 'Show', mode: 'tv' };
  const load = mixedLoader(
    async (request) => {
      calls.push(request);
      return { releases: request.mode === 'tv' ? [tv] : [digital, theatrical], notices: [] };
    },
    async (request) => {
      calls.push({ ...request, source: 'DVD' });
      return { releases: [digital], notices: [] };
    }
  );
  const data = await load({ ...options, mode: 'all' }, () => {});
  assert.deepEqual(data.releases, [theatrical, tv, digital]);
  assert.deepEqual(data.notices, []);
  assert.equal(calls.filter((call) => !call.source && call.mode === 'movies').length, 1);
  assert.equal(calls.filter((call) => call.mode === 'tv').length, 1);
  assert.equal(calls.filter((call) => call.source === 'DVD').length, 1);
});

test('movie-only and TV-only selections fetch only their selected sources', async () => {
  for (const mode of ['movies', 'tv']) {
    const calls = [];
    const load = mixedLoader(
      async (request) => {
        calls.push(request.mode);
        return { releases: [], notices: [] };
      },
      async () => {
        calls.push('DVD');
        return { releases: [], notices: [] };
      }
    );
    await load({ ...options, mode }, () => {});
    assert.deepEqual(calls, mode === 'movies' ? ['movies', 'DVD'] : ['tv']);
  }
});

test('a failed TV calendar leaves movie results visible in Everything and reports the missing source', async () => {
  const movie = { imdbId: 'tt1234567', date: '2026-09-02', title: 'Film', mode: 'theatrical' };
  const load = mixedLoader(
    async (request) => {
      if (request.mode === 'tv') throw new Error('timeout');
      return { releases: [movie], notices: [] };
    },
    async () => ({ releases: [], notices: [] })
  );
  const data = await load({ ...options, mode: 'all' }, () => {});
  assert.deepEqual(data.releases, [movie]);
  assert.deepEqual(data.notices, ['IMDb TV calendar unavailable: timeout']);
  await assert.rejects(
    load({ ...options, mode: 'tv' }, () => {}),
    /IMDb TV calendar unavailable: timeout/
  );
});

const imageStart = source.indexOf('  function createPosterImage(');
const imageEnd = source.indexOf('\n  function openPosterLightbox(', imageStart);
assert.ok(imageStart >= 0 && imageEnd > imageStart);
const createPosterImage = new Function(
  'element',
  'location',
  `${source.slice(imageStart, imageEnd)}; return createPosterImage;`
)(() => ({}), { origin: 'https://aither.cc' });
const brokenEnemiesPoster =
  'https://m.media-amazon.com/images/M/MV5BMDY5ODI4NDktMmExMy00MTQxLThkYmMtMWE0YmRlYWFmN2E5XkEyXkFqcGc@._V1_.jpg';

test('TV posters use calendar-style renditions, with a larger image for the lightbox', () => {
  const thumbnail = createPosterImage(brokenEnemiesPoster, 'Broken: Enemies Attract', 440);
  const lightbox = createPosterImage(brokenEnemiesPoster, 'Broken: Enemies Attract', 1080);
  assert.equal(thumbnail.src, brokenEnemiesPoster.replace('._V1_.jpg', '._V1_QL75_UY440_.jpg'));
  assert.equal(lightbox.src, brokenEnemiesPoster.replace('._V1_.jpg', '._V1_QL75_UY1080_.jpg'));
  assert.equal(thumbnail.alt, 'Broken: Enemies Attract');
  assert.equal(thumbnail.referrerPolicy, 'no-referrer');
  assert.equal(lightbox.referrerPolicy, 'no-referrer');
});

test('a failed rendition tries the original before the placeholder, without an error loop', () => {
  const image = createPosterImage(brokenEnemiesPoster, 'Broken: Enemies Attract', 440);
  image.onerror();
  assert.equal(image.src, brokenEnemiesPoster);
  image.onerror();
  assert.equal(image.src, 'https://aither.cc/img/poster-placeholder.svg');
  assert.equal(image.onerror, null);
});

test('other poster hosts remain unchanged and missing or unsafe sources use the placeholder', () => {
  const external = createPosterImage(
    'https://www.dvdsreleasedates.com/posters/example.jpg',
    'Film',
    440
  );
  assert.equal(external.src, 'https://www.dvdsreleasedates.com/posters/example.jpg');
  external.onerror();
  assert.equal(external.src, 'https://aither.cc/img/poster-placeholder.svg');
  assert.equal(external.onerror, null);
  for (const src of ['', undefined, 'javascript:alert(1)']) {
    assert.equal(
      createPosterImage(src, 'Film', 440).src,
      'https://aither.cc/img/poster-placeholder.svg'
    );
  }
});

test('the shared country uses browser region by default and respects explicit selections', () => {
  const storage = new Map();
  const api = make(() => {}, { storage, navigator: { language: 'en-AU' } });
  assert.equal(api.releaseCountry(), 'AU');
  storage.set('unit3d-upcoming-settings', { country: 'GB' });
  assert.equal(api.releaseCountry(), 'GB');
  assert.equal(
    api.releaseCountry(''),
    'AU',
    'selecting Browser ignores the previously saved country'
  );
  assert.equal(api.releaseCountry('NZ'), 'NZ');
});

test('Sonarr timestamps override IMDb dates on both pages using exact series, season and episode matches', async () => {
  class CalendarDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : ['2026-09-07T01:30:00Z']));
    }
    static now() {
      return Date.parse('2026-09-07T01:30:00Z');
    }
  }
  const fixture = arrFixture('sonarr', { Date: CalendarDate });
  const { api, server, state, storage } = fixture;
  storage.set('unit3d-upcoming-settings', { timeZone: 'Australia/Brisbane' });
  const episode = {
    series: { imdbId: 'tt0123456' },
    seasonNumber: 1,
    episodeNumber: 4,
    airDateUtc: '2026-09-07T01:00:00Z'
  };
  let calendarCalls = 0;
  state.handle = (request, url) => {
    if (!url.pathname.endsWith('/calendar')) return false;
    calendarCalls++;
    assert.equal(url.searchParams.get('includeSeries'), 'true');
    assert.equal(url.searchParams.get('unmonitored'), 'true');
    assert.ok(Date.parse(url.searchParams.get('start')) < CalendarDate.now() - 86400000);
    request.onload({
      status: 200,
      responseText: JSON.stringify([
        episode,
        { ...episode, episodeNumber: 5, airDateUtc: '2026-09-07T00:00:00Z' },
        { ...episode, episodeNumber: 6, airDateUtc: null },
        { ...episode, episodeNumber: 7, airDateUtc: 'invalid' },
        { ...episode, seasonNumber: null },
        { ...episode, series: {} }
      ])
    });
    return true;
  };
  const [calendar] = await Promise.all([
    api.loadSonarrCalendar(server),
    api.loadSonarrCalendar(server)
  ]);
  assert.equal(calendar.records.length, 2);
  await api.loadSonarrCalendar(server);
  assert.equal(calendarCalls, 1);
  const releases = [4, 5, 6].map((episode) => ({
    imdbId: `tt${episode}`,
    seriesImdbId: 'tt0123456',
    seriesTitle: 'Lanterns',
    title: `Episode ${episode}`,
    mode: 'episodes',
    season: 1,
    episode,
    date: '2026-09-06'
  }));
  assert.deepEqual(
    api.filterEpisodes(releases).map((item) => item.episode),
    [4, 5]
  );
  const [group] = api.homeReleases(releases);
  assert.equal(group.date, '2026-09-07');
  assert.equal(group.airDateUtc, '2026-09-07T00:00:00.000Z');
  assert.deepEqual(group.episodeKeys, ['1:4', '1:5']);
  assert.ok(
    releases.every((item) => item.date === '2026-09-06'),
    'raw IMDb cache stays unchanged'
  );
  assert.equal(api.sonarrEpisodeDates([{ ...releases[0], season: 2 }])[0].date, '2026-09-06');
  assert.equal(
    api.sonarrEpisodeDates([{ ...releases[0], seriesImdbId: 'tt999' }])[0].date,
    '2026-09-06'
  );
  storage.set('unit3d-upcoming-settings', { timeZone: 'America/Los_Angeles' });
  assert.equal(api.zonedDate(), '2026-09-06');
  assert.equal(api.episodeRange().from, '2026-09-06');
  assert.equal(api.sonarrEpisodeDates(releases)[0].date, '2026-09-06');
  assert.equal(api.zonedDate(new Date('2026-03-08T09:30:00Z')), '2026-03-08');
  assert.equal(api.zonedDate(new Date('2026-03-08T10:30:00Z')), '2026-03-08');
  state.handle = (request) => {
    request.onerror();
    return true;
  };
  await assert.rejects(api.loadSonarrCalendar(server, true));
  assert.equal(api.readArrCache(server).calendar.records.length, 2);
  api.saveArrServer({ ...server, enabled: false });
  assert.equal(api.sonarrEpisodeDates(releases)[0].airDateUtc, undefined);
});

test('optional Sonarr time labels follow daylight saving and omit unknown episode times', () => {
  const storage = new Map([
    ['unit3d-upcoming-settings', { timeZone: 'America/Los_Angeles', showEpisodeTime: true }]
  ]);
  const api = make(() => {}, { storage });
  const context = {
    SETTINGS_KEY: 'unit3d-upcoming-settings',
    GM_getValue: (key) => storage.get(key),
    timeZone: api.timeZone,
    element: (tag, _className, textContent) => ({ tag, textContent })
  };
  const from = source.indexOf('  function appendEpisodeTime(');
  const to = source.indexOf('  function renderHomeReleases(', from);
  runInNewContext(source.slice(from, to), context);
  const nodes = [];
  const title = { append: (node) => nodes.push(node) };
  context.appendEpisodeTime(title, { airDateUtc: '2026-03-08T09:30:00Z' });
  context.appendEpisodeTime(title, { airDateUtc: '2026-03-08T10:30:00Z' });
  assert.equal(nodes[0].tag, 'small');
  assert.match(nodes[0].textContent, /01:30/);
  assert.match(nodes[1].textContent, /03:30/);
  assert.match(nodes[0].textContent, /^ \(.*\)$/);
  context.appendEpisodeTime(title, {});
  storage.set('unit3d-upcoming-settings', { showEpisodeTime: false });
  context.appendEpisodeTime(title, { airDateUtc: '2026-03-08T09:30:00Z' });
  assert.equal(nodes.length, 2);
});

test('main-page Sonarr synchronization loads timestamps even with a fresh library and redraws all-series results', async () => {
  const { api, server } = arrFixture('sonarr');
  api.writeArrCache(server, 'library', { savedAt: Date.now(), records: [] });
  let calendars = 0;
  let redraws = 0;
  const context = {
    readArrCache: api.readArrCache,
    arrFresh: (entry) => Boolean(entry?.savedAt),
    ARR_LIBRARY_TTL: api.ARR_LIBRARY_TTL,
    attempts: new Map(),
    errors: new Map(),
    loadArrLibrary: async () => {},
    loadSonarrCalendar: async () => {
      calendars++;
    },
    draw() {},
    onLibraryChange: (type) => {
      assert.equal(type, 'sonarr');
      redraws++;
    }
  };
  const from = source.indexOf('    async function sync(server');
  const to = source.indexOf('    function update(', from);
  runInNewContext(source.slice(from, to), context);
  await context.sync(server);
  assert.equal(calendars, 1);
  assert.equal(redraws, 1);
  await context.sync(server);
  assert.equal(calendars, 1, 'retries remain bounded');
  await context.sync(server, true);
  assert.equal(calendars, 2);
});

test('homepage advances the selected timezone day and refreshes Sonarr without a site key or library-only filter', async () => {
  let now = Date.parse('2026-09-07T09:59:00Z');
  class CalendarDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const fixture = homeFixture({
    clock: CalendarDate,
    key: '',
    cacheAge: 0,
    sonarrConfigured: true,
    sonarrCacheAge: 0,
    saved: { homePanel: true, timeZone: 'Pacific/Honolulu' }
  });
  await new Promise(setImmediate);
  const list = fixture.nodes.find((node) => node.tag === 'ul');
  assert.equal(homeRows(list).length, 1);
  assert.equal(fixture.state.sonarrCalendarCalls, 1);
  assert.ok(fixture.timers.at(-1).delay <= 60000);
  now += 2 * 60000;
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(homeRows(list).length, 0, 'yesterday leaves the selected today group');
  assert.equal(
    fixture.requests.filter((request) => request.type === 'calendar').length,
    0,
    'minute redraws reuse a fresh IMDb snapshot'
  );
  now += 8 * 60000;
  fixture.timers.at(-1).callback();
  await new Promise(setImmediate);
  assert.equal(fixture.state.sonarrCalendarCalls, 2, 'Sonarr remains on its ten-minute cadence');
});

test('main episode status counts visible dates and changes after a Sonarr timestamp redraw', () => {
  const { api, server, storage } = arrFixture('sonarr');
  storage.set('unit3d-upcoming-settings', { timeZone: 'UTC' });
  const { from, to } = api.episodeRange();
  const yesterday = new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10);
  const outside = new Date(Date.parse(to) + 86400000).toISOString().slice(0, 10);
  const releases = [yesterday, from, outside].map((date, index) => ({
    imdbId: `tt${index + 1}`,
    seriesImdbId: 'tt0123456',
    season: 1,
    episode: index + 1,
    title: `Episode ${index + 1}`,
    country: 'US',
    mode: 'episodes',
    date
  }));
  const context = {
    renderedCount: 0,
    visibleReleases: [],
    searching: false,
    fromToday: true,
    mode: { value: 'episodes' },
    country: { value: 'US' },
    episodeSonarrFilter: { value: 'all' },
    RELEASE_VIEWS: api.RELEASE_VIEWS,
    releaseCountry: api.releaseCountry,
    filterEpisodes: api.filterEpisodes,
    sortReleases: api.sortReleases,
    filterSonarrEpisodes: api.filterSonarrEpisodes,
    sonarrSeriesMembership: api.sonarrSeriesMembership,
    calendar: { releases, notices: [] },
    panel: { dataset: {} },
    results: { replaceChildren() {} },
    appendReleases() {},
    CARD_PAGE_SIZE: 24,
    searchStatus: {},
    status: {},
    message: {},
    arr: {}
  };
  const start = source.indexOf('    function updateVisibleReleases(');
  const end = source.indexOf('    function updateSearch(', start);
  runInNewContext(source.slice(start, end), context);
  context.updateVisibleReleases();
  assert.match(context.status.textContent, /^1 releases for the next 30 days/);
  api.writeArrCache(server, 'calendar', {
    savedAt: Date.now(),
    records: [
      {
        seriesImdbId: '123456',
        season: 1,
        episode: 1,
        airDateUtc: `${from}T01:00:00Z`
      }
    ]
  });
  context.updateVisibleReleases(true);
  assert.match(context.status.textContent, /^2 releases for the next 30 days/);
});
