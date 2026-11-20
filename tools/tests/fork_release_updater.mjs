import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareVersions, FORK_VERSION_MANIFEST_URL, FORK_RELEASE_REPOSITORY, getReleaseUpdateState, normalizeForkManifest } from '../../src/data/fork-release.js';
import { checkForForkRelease, resetForkReleaseCache } from '../../src/game/forkreleaseupdater.js';
import { Sha256, sha256File } from '../../src/core/sha256.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = 'a'.repeat(64);
const manifest = (overrides = {}) => ({
  schema: 1,
  version: '0.2.0',
  buildId: 'a'.repeat(40),
  downloadUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.2.0/velscour-pc-v0.2.0.zip',
  sha256: digest,
  packageSize: 1024,
  checksumUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.2.0/velscour-pc-v0.2.0.zip.sha256',
  releaseNotesUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/tag/v0.2.0',
  publishedAt: '2026-11-20T00:00:00Z',
  ...overrides,
});

assert.equal(FORK_RELEASE_REPOSITORY, 'ZethenZynx/Velscour-PC');
assert.equal(FORK_VERSION_MANIFEST_URL, 'https://zethenzynx.github.io/Velscour-PC/version.json');
assert.equal(compareVersions('0.2.0', '0.1.9'), 1);
assert.equal(compareVersions('v1.0.0', '0.9.9'), 1);
assert.equal(compareVersions('1.2.3-beta.2', '1.2.3'), -1);
assert.equal(compareVersions('1.2.3', '1.2.3'), 0);

const normalized = normalizeForkManifest(manifest());
assert.equal(normalized.version, '0.2.0');
assert.equal(normalized.buildId, 'a'.repeat(40));
assert.equal(normalized.sha256, digest);
assert.equal(getReleaseUpdateState(manifest(), '0.1.0').available, true);
assert.equal(getReleaseUpdateState(manifest(), '0.2.0').available, false);
assert.equal(getReleaseUpdateState(manifest({ downloadUrl: null, sha256: null, packageSize: null, checksumUrl: null }), '0.0.0-dev').available, false);
assert.equal(normalizeForkManifest(manifest({ downloadUrl: 'https://github.com/Agilancer/velscour/releases/download/v0.2.0/game.zip' })), null);
assert.equal(normalizeForkManifest(manifest({ downloadUrl: 'https://example.com/game.zip' })), null);
assert.equal(normalizeForkManifest(manifest({ sha256: 'not-a-hash' })), null);
assert.equal(normalizeForkManifest(manifest({ buildId: '' })), null);
assert.equal(getReleaseUpdateState(manifest({ downloadUrl: null, sha256: null, packageSize: null, checksumUrl: null }), '0.1.0').invalid, true,
  'a newer manifest without a verified package cannot be offered as an update');

const originalFetch = globalThis.fetch;
try {
  let calls = 0, requested = '', requestOptions = null;
  globalThis.fetch = async (url, options) => {
    calls++; requested = String(url); requestOptions = options;
    return new Response(JSON.stringify(manifest()), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' } });
  };
  resetForkReleaseCache();
  const available = await checkForForkRelease({ force: true });
  assert.equal(available.status, 'available');
  assert.ok(requested.startsWith(FORK_VERSION_MANIFEST_URL + '?_='), 'the updater requests only the static Pages manifest with a cache-busting query');
  assert.equal(new URL(requested).host, 'zethenzynx.github.io');
  assert.equal(requestOptions.cache, 'no-store');
  assert.match(requestOptions.headers['Cache-Control'], /no-cache/i);
  assert.equal(calls, 1);
  await checkForForkRelease();
  assert.equal(calls, 1, 'title reopening uses short-lived memory cache, not another request');

  globalThis.fetch = async (url) => {
    calls++; requested = String(url);
    return new Response(JSON.stringify(manifest({ version: '0.3.0', buildId: 'b'.repeat(40),
      downloadUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.3.0/velscour-pc-v0.3.0.zip',
      checksumUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.3.0/velscour-pc-v0.3.0.zip.sha256',
      releaseNotesUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/tag/v0.3.0' })), { status: 200 });
  };
  const fresher = await checkForForkRelease({ force: true });
  assert.equal(fresher.status, 'available');
  assert.equal(fresher.manifest.version, '0.3.0');
  assert.notEqual(new URL(requested).searchParams.get('_'), new URL(FORK_VERSION_MANIFEST_URL).searchParams.get('_'), 'force check makes a new URL that bypasses cached version data');

  let failingCalls = 0;
  globalThis.fetch = async () => { failingCalls++; return new Response('unavailable', { status: 503 }); };
  resetForkReleaseCache();
  const failed = await checkForForkRelease({ force: true });
  assert.equal(failed.status, 'offline');
  assert.equal((await checkForForkRelease()).status, 'offline');
  assert.equal(failingCalls, 1, 'network failures are cached during the retry cooldown');
  globalThis.fetch = async () => new Response('not json', { status: 200 });
  assert.equal((await checkForForkRelease({ force: true })).status, 'offline', 'malformed or unavailable manifests fail safely');
} finally {
  globalThis.fetch = originalFetch;
  resetForkReleaseCache();
}

const hash = (value) => new Sha256().update(new TextEncoder().encode(value)).digest();
assert.equal(hash(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.equal(hash('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
const large = Buffer.alloc(2 * 1024 * 1024 + 19);
for (let i = 0; i < large.length; i++) large[i] = (i * 31 + 7) & 255;
const file = new Blob([large]);
assert.equal(await sha256File(file), crypto.createHash('sha256').update(large).digest('hex'), 'streaming hash handles multi-chunk files without buffering the full package');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'velscour-version-manifest-'));
try {
  const filePath = path.join(dir, 'version.json');
  fs.writeFileSync(filePath, JSON.stringify({ schema: 1, version: '0.0.0-dev', buildId: 'development' }));
  const script = path.join(root, 'tools/write_version_manifest.mjs');
  const args = [script, filePath, '0.2.0', 'c'.repeat(40), manifest().downloadUrl, digest, '1024', manifest().checksumUrl, '2026-11-20T00:00:00Z'];
  const write = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  assert.equal(write.status, 0, write.stderr);
  const published = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(published.version, '0.2.0');
  assert.equal(published.buildId, 'c'.repeat(40));
  assert.equal(published.downloadUrl, manifest().downloadUrl);
  assert.equal(published.sha256, digest);
  const older = spawnSync(process.execPath, [script, filePath, '0.1.0', 'd'.repeat(40), 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.1.0/game.zip', digest, '1024', 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.1.0/game.zip.sha256'], { cwd: root, encoding: 'utf8' });
  assert.equal(older.status, 0, older.stderr);
  assert.equal(JSON.parse(fs.readFileSync(filePath, 'utf8')).version, '0.2.0', 'older release tags cannot replace a newer manifest');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }

console.log('PASS: Static fork manifest checks, cache bypass, failure handling, streaming SHA-256 verification, and monotonic release publishing.');
