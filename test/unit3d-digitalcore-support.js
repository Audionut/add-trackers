const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'UNIT3D_based', 'unit3d-add-filter-all-releases.user.js'),
  'utf8'
);
const start = source.indexOf('    const mapDigitalCoreTorrent =');
const end = source.indexOf('\n\n    const get_post_torrent_objects', start);
assert.ok(start >= 0 && end > start, 'DigitalCore mapper not found');

const context = {
  simplediscounts: false,
  toUnixTime(value) {
    if (value === ' +02:00') return Number.NaN;
    assert.equal(value, '2021-10-27 12:07:22 +02:00');
    return 123;
  },
  extractExternalReleaseGroup(_torrent, name) {
    assert.equal(name, 'Movie.2021.2160p-FraMeSToR');
    return 'FraMeSToR';
  },
  get_torrent_quality(torrent) {
    assert.equal(torrent.info_text, 'Movie.2021.2160p-FraMeSToR');
    return 'UHD';
  }
};
vm.createContext(context);
vm.runInContext(
  source
    .slice(start, end)
    .replace('const mapDigitalCoreTorrent =', 'globalThis.mapDigitalCoreTorrent ='),
  context
);

const torrent = context.mapDigitalCoreTorrent({
  id: 42,
  name: 'Movie.2021.2160p-FraMeSToR',
  added: '2021-10-27 12:07:22',
  size: 2 * 1024 * 1024,
  numfiles: 3,
  times_completed: 4,
  seeders: 5,
  leechers: 6,
  frileech: 1
});

assert.deepEqual(JSON.parse(JSON.stringify(torrent)), {
  api_size: 2097152,
  datasetRelease: 'Movie.2021.2160p-FraMeSToR',
  size: 2,
  info_text: 'Movie.2021.2160p-FraMeSToR',
  tracker: 'DC',
  site: 'DC',
  snatch: 4,
  seed: 5,
  leech: 6,
  download_link: 'https://digitalcore.club/api/v1/torrents/download/42',
  torrent_page: 'https://digitalcore.club/torrent/42/',
  externalId: '42',
  discount: 'Freeleech',
  status: 'default',
  groupId: 'FraMeSToR',
  time: 123,
  filecount: 3,
  quality: 'UHD'
});
assert.equal(context.mapDigitalCoreTorrent({}), null);
