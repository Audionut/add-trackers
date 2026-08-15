const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const ffmpegPackages = ['@ffmpeg/core', '@ffmpeg/ffmpeg'];
const tonemapScripts = [
  'ptp-tonemap-toggle.user.js',
  path.join('UNIT3D_based', 'unit3d-tonemap-toggle.user.js')
];

test('unmaintained FFmpeg runtime remains disabled', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lockfile = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

  for (const packageName of ffmpegPackages) {
    assert.equal(manifest.dependencies?.[packageName], undefined);
    assert.equal(lockfile.packages?.[`node_modules/${packageName}`], undefined);
  }

  assert.equal(fs.existsSync(path.join(root, 'vendor', 'ffmpeg-wasm')), false);

  for (const script of tonemapScripts) {
    const source = fs.readFileSync(path.join(root, script), 'utf8');
    assert.match(source, /const HDR_FIX_AVAILABLE = false;/);
    assert.doesNotMatch(source, /@require\s+https?:\/\/[^\s]*@ffmpeg/);
    assert.doesNotMatch(source, /https?:\/\/[^\s'"`]*ffmpeg-wasm/);
  }
});
