import assert from 'node:assert/strict';
import { compareVersions, FORK_RELEASES_API, FORK_RELEASE_REPOSITORY, getReleaseUpdateState, normalizeForkRelease } from '../../src/data/fork-release.js';
import { checkForForkRelease } from '../../src/game/forkreleaseupdater.js';

const digest = 'a'.repeat(64);
const release = (overrides = {}) => ({
  tag_name: 'v0.2.0',
  name: 'Velscour PC 0.2.0',
  body: 'Improves exploration and fixes crashes.',
  html_url: 'https://github.com/ZethenZynx/Velscour-PC/releases/tag/v0.2.0',
  published_at: '2026-11-18T00:00:00Z',
  assets: [
    { name: 'velscour-pc-v0.2.0.zip', size: 1234, digest: `sha256:${digest}`, browser_download_url: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.2.0/velscour-pc-v0.2.0.zip' },
    { name: 'velscour-pc-v0.2.0.zip.sha256', browser_download_url: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.2.0/velscour-pc-v0.2.0.zip.sha256' },
  ],
  ...overrides,
});

assert.equal(FORK_RELEASE_REPOSITORY, 'ZethenZynx/Velscour-PC');
assert.equal(FORK_RELEASES_API, 'https://api.github.com/repos/ZethenZynx/Velscour-PC/releases/latest');
assert.equal(compareVersions('0.2.0', '0.1.9'), 1);
assert.equal(compareVersions('v1.0.0', '0.9.9'), 1);
assert.equal(compareVersions('1.2.3-beta.2', '1.2.3'), -1);
assert.equal(compareVersions('1.2.3', '1.2.3'), 0);

const normalized = normalizeForkRelease(release());
assert.equal(normalized.version, '0.2.0');
assert.equal(normalized.archive.sha256, digest);
assert.equal(normalized.checksumUrl.endsWith('.zip.sha256'), true);
assert.equal(getReleaseUpdateState(release(), '0.1.0').available, true);
assert.equal(getReleaseUpdateState(release(), '0.2.0').available, false);

assert.equal(normalizeForkRelease(release({ prerelease: true })), null);
assert.equal(normalizeForkRelease(release({ draft: true })), null);
assert.equal(normalizeForkRelease(release({ tag_name: 'latest' })), null);
assert.equal(normalizeForkRelease(release({ html_url: 'https://github.com/cyelis1224/velscour-online-v2/releases/tag/v0.2.0' })), null);
assert.equal(normalizeForkRelease(release({ assets: [{ name: 'game.zip', digest: `sha256:${digest}`, browser_download_url: 'https://github.com/cyelis1224/velscour-online-v2/releases/download/v0.2.0/game.zip' }] })), null);
assert.equal(normalizeForkRelease(release({ assets: [{ name: 'game.zip', digest: 'sha1:bad', browser_download_url: 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v0.2.0/game.zip' }] })), null);

const originalFetch = globalThis.fetch;
let requestedUrl = '';
try {
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify(release()), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const available = await checkForForkRelease({ force: true });
  assert.equal(requestedUrl, FORK_RELEASES_API, 'update check must request only the configured fork release endpoint');
  assert.equal(available.status, 'available');
  assert.equal(available.release.archive.sha256, digest);

  let missingReleaseRequests = 0;
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    missingReleaseRequests++;
    return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };
  const noRelease = await checkForForkRelease({ force: true });
  assert.equal(noRelease.status, 'no-release', 'a missing latest release is a normal no-release state');
  assert.equal(requestedUrl, FORK_RELEASES_API, '404 handling stays on this fork\'s release endpoint');
  const cachedNoRelease = await checkForForkRelease();
  assert.equal(cachedNoRelease.status, 'no-release');
  assert.equal(missingReleaseRequests, 1, 'a missing release is cached across automatic title-screen checks');

  globalThis.fetch = async () => new Response('offline', { status: 503 });
  const failed = await checkForForkRelease({ force: true });
  assert.equal(failed.status, 'offline');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('PASS: fork updater accepts only newer, published, checksummed ZIP releases from the configured fork.');
