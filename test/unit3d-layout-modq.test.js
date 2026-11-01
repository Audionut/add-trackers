const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-layout-change.user.js'),
  'utf8'
);

function harness({ similarAvailable = true, failure = false, direct = false } = {}) {
  const navigations = [];
  const requests = [];
  const values = new Map();
  const location = {};
  const setLocation = (value) => {
    const url = new URL(value, 'https://aither.cc');
    Object.assign(location, {
      href: url.href,
      origin: url.origin,
      pathname: url.pathname,
      hash: url.hash,
      replace: (url) => navigations.push(url)
    });
  };
  setLocation('/');
  const similarLink = { getAttribute: () => '/torrents/similar/1.482233' };
  const context = {
    URL,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    location,
    document: {
      querySelector: () => similarLink,
      addEventListener() {}
    },
    DOMParser: class {
      parseFromString() {
        return {
          querySelector: () => (similarAvailable ? {} : null),
          querySelectorAll: () => [similarLink]
        };
      }
    },
    GM_registerMenuCommand() {},
    GM_getValue: (key) => values.get(key) ?? false,
    GM_setValue: (key, value) => values.set(key, value),
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: !failure, status: 404, text: async () => '<html></html>' };
    }
  };
  const exposed = source.replace(
    /\}\)\(\);\s*$/,
    `globalThis.api = {
      initSingleTorrentPageRedirector, prepareTorrentIndexSimilarLink,
      extractUnlistedTorrent, getUnlistedTorrentContext, directTorrentViewUrl,
      isDirectTorrentViewUrl, getRedirectableTorrentLink, consumeSingleTorrentInlineIntent,
      rememberSingleTorrentViewBypass,
      get pendingTorrentUrl() { return pendingSingleTorrentInlineTorrentUrl; }
    };})();`
  );
  assert.notEqual(exposed, source);
  runInNewContext(exposed, context);
  setLocation(`/torrents/123${direct ? '?unit3d-ptp-view=direct' : ''}`);
  return { ...context.api, context, values, navigations, requests, setLocation };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('single torrent redirects only when an actual similar table is available', async () => {
  for (const options of [{ failure: true }, { similarAvailable: false }, { direct: true }, {}]) {
    const app = harness(options);
    app.initSingleTorrentPageRedirector();
    await flush();
    assert.deepEqual(
      app.navigations,
      Object.keys(options).length
        ? []
        : ['https://aither.cc/torrents/similar/1.482233#unit3d-ptp-open=123']
    );
    assert.equal(app.requests.length, options.direct ? 0 : 1);
    if (!options.direct) assert.equal(app.requests[0].options.credentials, 'same-origin');
  }
});

test('nearby similar links are validated before a torrent link is rewritten', async () => {
  for (const similarAvailable of [false, true]) {
    const app = harness({ similarAvailable });
    const link = {
      href: 'https://aither.cc/torrents/123',
      dataset: {},
      closest: () => ({
        querySelector: () => ({ getAttribute: () => '/torrents/similar/1.482233' })
      })
    };
    const result = await app.prepareTorrentIndexSimilarLink(link, { priority: true });
    assert.equal(app.requests.length, 1);
    assert.equal(app.requests[0].url, 'https://aither.cc/torrents/similar/1.482233');
    assert.equal(result, similarAvailable ? 'https://aither.cc/torrents/similar/1.482233' : '');
    assert.equal(
      link.href,
      similarAvailable
        ? 'https://aither.cc/torrents/similar/1.482233#unit3d-ptp-open=123'
        : 'https://aither.cc/torrents/123'
    );
  }
});

function detailDocument({
  group = '/torrents/similar/1.482233',
  status,
  name = 'Example.2026.1080p.WEB-DL-GRP'
} = {}) {
  const fields = {
    '.torrent__name': { textContent: name },
    '.meta__title-link[href*="/torrents/similar/"]': { getAttribute: () => group },
    '.torrent__size-link': { textContent: '1 GiB', getAttribute: () => '1,073,741,824\u202fB' },
    '.torrent__seeder-count': { textContent: '2' },
    '.torrent__leecher-count': { textContent: '3' },
    '.torrent__times-completed-count': { textContent: '4' },
    '.torrent__uploaded-at time': { textContent: '1 hour ago' },
    '.torrent__type-link': { textContent: 'WEB-DL' },
    'form[action*="/torrents/moderation/"] input[name="old_status"]':
      status === undefined ? null : { value: status }
  };
  return {
    querySelector: (selector) => fields[selector] || null,
    querySelectorAll: () => [{ getAttribute: () => '/torrents/download_check/123' }]
  };
}

test('accessible unlisted releases retain details and distinguish known moderation status', () => {
  const app = harness();
  app.setLocation('/torrents/similar/1.482233');
  for (const [status, label] of [
    ['0', 'ModQ'],
    ['3', 'ModQ (postponed)'],
    ['2', 'Rejected'],
    ['1', 'Unlisted'],
    [undefined, 'Unlisted']
  ]) {
    const torrent = app.extractUnlistedTorrent(
      detailDocument({ status }),
      'https://aither.cc/torrents/123'
    );
    assert.equal(torrent.id, '123');
    assert.equal(torrent.releaseName, 'Example.2026.1080p.WEB-DL-GRP');
    assert.equal(torrent.visibilityLabel, label);
    assert.equal(torrent.sizeBytes, 1073741824);
    assert.equal(torrent.seeders, 2);
    assert.equal(torrent.leechers, 3);
    assert.equal(torrent.completed, 4);
    assert.equal(torrent.age, '1 hour ago');
    assert.equal(torrent.downloadUrl, 'https://aither.cc/torrents/download_check/123');
    assert.equal(torrent.quality, 'hd');
  }
  assert.equal(
    app.extractUnlistedTorrent(
      detailDocument({ group: '/torrents/similar/1.99' }),
      'https://aither.cc/torrents/123'
    ),
    null
  );
  assert.equal(
    app.extractUnlistedTorrent({ querySelector: () => null }, 'https://aither.cc/torrents/123'),
    null
  );
});

test('unlisted TV releases join their episode or season group', () => {
  const app = harness();
  app.setLocation('/torrents/similar/2.482233');
  for (const [name, key, label] of [
    ['Example.S03E02.1080p.WEB-DL-GRP', 's003:e0002', 'Season 3 / Episode 2'],
    ['Example.Season.3.1080p.WEB-DL-GRP', 's003:season', 'Season 3 / Season Packs'],
    ['Example.Complete.1080p.WEB-DL-GRP', 'tv:unlisted', 'Other TV']
  ]) {
    const torrent = app.extractUnlistedTorrent(
      detailDocument({ group: '/torrents/similar/2.482233', name }),
      'https://aither.cc/torrents/123'
    );
    assert.equal(torrent.tvGroupKey, key);
    assert.equal(torrent.tvGroupLabel, label);
  }
});

test('direct View URLs bypass link rewriting and survive revisits without a stored token', async () => {
  const app = harness();
  const href = app.directTorrentViewUrl('https://aither.cc/torrents/123?foo=bar#files');
  assert.equal(href, 'https://aither.cc/torrents/123?foo=bar&unit3d-ptp-view=direct#files');
  app.context.HTMLAnchorElement = class {};
  const link = new app.context.HTMLAnchorElement();
  Object.assign(link, { href, dataset: {} });
  assert.equal(app.getRedirectableTorrentLink({ closest: () => link }), null);
  assert.equal(
    app.isDirectTorrentViewUrl('https://example.org/torrents/123?unit3d-ptp-view=direct'),
    false
  );
  app.setLocation(href);
  app.initSingleTorrentPageRedirector();
  await flush();
  app.initSingleTorrentPageRedirector();
  await flush();
  assert.deepEqual(app.navigations, []);
  assert.equal(app.requests.length, 0);
  app.rememberSingleTorrentViewBypass(href);
  app.initSingleTorrentPageRedirector();
  await flush();
  app.setLocation('/torrents/123');
  app.initSingleTorrentPageRedirector();
  await flush();
  assert.equal(app.requests.length, 1, 'a later plain link must still resolve its similar page');
  assert.deepEqual(app.navigations, [
    'https://aither.cc/torrents/similar/1.482233#unit3d-ptp-open=123'
  ]);
});

test('a hash intent cannot borrow the URL of a different stored torrent', () => {
  const app = harness();
  app.context.history = { replaceState() {} };
  app.setLocation('/torrents/similar/1.482233#unit3d-ptp-open=456');
  app.values.set(
    'UNIT3DLayoutChange_singleTorrentInlineIntent',
    JSON.stringify({
      'https://aither.cc/torrents/similar/1.482233': {
        torrentId: '123',
        torrentUrl: 'https://aither.cc/torrents/123',
        expiresAt: Date.now() + 60000
      }
    })
  );
  assert.equal(app.consumeSingleTorrentInlineIntent(), '456');
  assert.equal(app.context.api.pendingTorrentUrl, '');
});
