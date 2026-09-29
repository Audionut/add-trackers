const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = readFileSync(
  resolve(__dirname, '..', 'UNIT3D_based', 'unit3d-layout-change.user.js'),
  'utf8'
);

function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

const actionSource = extract(
  '  function extractDetailActionMenu',
  '\n  function rewriteActionMenuIds'
);
const extractDetailActionMenu = new Function(
  'rewriteActionMenuIds',
  'absolutizeUrl',
  'HTMLAnchorElement',
  `let actionMenuCounter = 0;\n${actionSource}\nreturn extractDetailActionMenu;`
)(
  () => {},
  (url) => new URL(url, 'https://aither.cc').href,
  class {}
);

function makeMenu(zeroSeeders) {
  const button = { attributes: new Set(['x-on:click.prevent']) };
  button.removeAttribute = (name) => button.attributes.delete(name);
  const form = {
    attributes: new Map([
      ['x-data', 'freeleechTokenConfirmation'],
      ['action', '/torrents/123/freeleech_token']
    ]),
    csrf: 'original-csrf-token',
    dataset: {},
    getAttribute(name) {
      return this.attributes.get(name);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    querySelector(selector) {
      return selector === 'button' ? button : null;
    }
  };
  const menu = {
    classList: { add() {} },
    cloneNode() {
      return this;
    },
    querySelector(selector) {
      return selector === 'form[x-data="freeleechTokenConfirmation"]' ? form : null;
    },
    querySelectorAll(selector) {
      return selector === 'form[action]' ? [form] : [];
    }
  };
  const doc = {
    querySelector(selector) {
      if (selector === 'menu.torrent__buttons') return menu;
      if (selector === '.torrent__activity') return zeroSeeders ? {} : null;
      return null;
    }
  };
  extractDetailActionMenu(doc);
  assert.equal(form.getAttribute('x-data'), undefined);
  assert.equal(button.attributes.has('x-on:click.prevent'), false);
  assert.equal(form.getAttribute('action'), 'https://aither.cc/torrents/123/freeleech_token');
  assert.equal(form.csrf, 'original-csrf-token');
  assert.equal(form.dataset.unit3dPtpZeroSeeders, String(zeroSeeders));
}

makeMenu(false);
makeMenu(true);

const submitSource = extract(
  '  async function handleFreeleechTokenSubmit',
  '\n  function getDetailPanels'
);

async function submitToken({
  zeroSeeders = false,
  decisions = [],
  matches = true,
  downloadPath = '/torrents/download_check/123',
  tokenResponse = 'You have successfully activated a freeleech token for this torrent!',
  responseOk = true
} = {}) {
  const prompts = [];
  const alerts = [];
  const downloads = [];
  const requests = [];
  const invalidated = [];
  let prevented = false;
  let removed = false;
  const button = { disabled: false };
  const form = {
    action: 'https://aither.cc/torrents/123/freeleech_token',
    dataset: { unit3dPtpZeroSeeders: String(zeroSeeders) },
    matches: () => matches,
    closest(selector) {
      if (selector === 'li')
        return {
          remove: () => {
            removed = true;
          }
        };
      if (selector === 'tr.torrent_info_row')
        return {
          previousElementSibling: {
            querySelector: () => ({ href: 'https://aither.cc/torrents/123' })
          }
        };
      return {
        querySelector: () => (downloadPath ? { href: `https://aither.cc${downloadPath}` } : null)
      };
    },
    querySelector: () => button
  };
  const handleSubmit = new Function(
    'globalThis',
    'fetch',
    'FormData',
    'location',
    'detailCache',
    `${submitSource}\nreturn handleFreeleechTokenSubmit;`
  )(
    {
      confirm(message) {
        prompts.push(message);
        return decisions.shift();
      },
      alert(message) {
        alerts.push(message);
      }
    },
    async (url, options) => {
      requests.push({ url, options });
      return { ok: responseOk, status: 403, text: async () => tokenResponse };
    },
    class {
      constructor(receivedForm) {
        assert.equal(receivedForm, form);
      }
    },
    {
      href: 'https://aither.cc/torrents/similar/1.123',
      origin: 'https://aither.cc',
      assign(url) {
        downloads.push(url);
      }
    },
    {
      delete(url) {
        invalidated.push(url);
      }
    }
  );
  await handleSubmit({
    target: form,
    preventDefault: () => {
      prevented = true;
    }
  });
  return {
    prompts,
    alerts,
    downloads,
    requests,
    invalidated,
    prevented,
    removed,
    disabled: button.disabled
  };
}

async function main() {
  const success = await submitToken({ decisions: [true] });
  assert.deepEqual(success.prompts, ['This will use one of your freeleech tokens. Continue?']);
  assert.equal(success.requests.length, 1);
  assert.equal(success.requests[0].url, 'https://aither.cc/torrents/123/freeleech_token');
  assert.equal(success.requests[0].options.method, 'POST');
  assert.equal(success.requests[0].options.credentials, 'same-origin');
  assert.deepEqual(success.downloads, ['https://aither.cc/torrents/download/123']);
  assert.deepEqual(success.invalidated, ['https://aither.cc/torrents/123']);
  assert.deepEqual(success.alerts, []);
  assert.equal(success.prevented, true);
  assert.equal(success.removed, true);
  assert.equal(success.disabled, true);

  const direct = await submitToken({
    decisions: [true],
    downloadPath: '/torrents/download/123'
  });
  assert.deepEqual(direct.downloads, ['https://aither.cc/torrents/download/123']);

  const cancelled = await submitToken({ decisions: [false] });
  assert.equal(cancelled.requests.length, 0);
  assert.deepEqual(cancelled.downloads, []);

  const zeroSeeders = await submitToken({ zeroSeeders: true, decisions: [true, false] });
  assert.equal(zeroSeeders.prompts.length, 2);
  assert.equal(zeroSeeders.requests.length, 0);
  assert.deepEqual(zeroSeeders.downloads, []);

  const confirmedZeroSeeders = await submitToken({ zeroSeeders: true, decisions: [true, true] });
  assert.equal(confirmedZeroSeeders.prompts.length, 2);
  assert.deepEqual(confirmedZeroSeeders.downloads, ['https://aither.cc/torrents/download/123']);

  const rejected = await submitToken({ decisions: [true], tokenResponse: 'Error' });
  assert.deepEqual(rejected.downloads, []);
  assert.deepEqual(rejected.invalidated, []);
  assert.equal(rejected.disabled, false);
  assert.match(rejected.alerts[0], /did not confirm token activation/);

  const httpError = await submitToken({ decisions: [true], responseOk: false });
  assert.deepEqual(httpError.downloads, []);
  assert.equal(httpError.disabled, false);

  const noLink = await submitToken({ downloadPath: '' });
  assert.equal(noLink.requests.length, 0);
  assert.match(noLink.alerts[0], /No token was used/);

  const wrongTorrent = await submitToken({ downloadPath: '/torrents/download/456' });
  assert.equal(wrongTorrent.requests.length, 0);
  assert.deepEqual(wrongTorrent.downloads, []);

  const unrelated = await submitToken({ matches: false });
  assert.deepEqual(unrelated.prompts, []);
  assert.equal(unrelated.prevented, false);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
