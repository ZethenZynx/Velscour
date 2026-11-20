// Recent Changes uses only the Velscour PC main-branch commits API, with cache and offline coverage.
// Run: node tools/tests/recent_changes.mjs
import assert from 'node:assert/strict';
import { commitsToRecentChanges, getRecentChangesState, loadRecentChanges } from '../../src/game/recentchanges.js';

const newestSha = 'a'.repeat(40), olderSha = 'b'.repeat(40);
const commit = (sha, date, message) => ({
  sha,
  html_url: `https://github.com/ZethenZynx/Velscour-PC/commit/${sha}`,
  author: { login: 'ZethenZynx' },
  commit: { author: { name: 'Nathan', date }, message },
});
const normalized = commitsToRecentChanges([
  commit(olderSha, '2026-11-18T12:00:00Z', 'docs: update testing notes\n\nMaintenance details\nSecond line'),
  commit(newestSha, '2026-11-19T12:00:00Z', 'Fix the Rift pylon damage\n\nUse the player attack estimate.\nKeep this body multiline.'),
  { ...commit('bad', '2026-11-20T12:00:00Z', 'invalid sha') },
]);
assert.equal(normalized.length, 2);
assert.equal(normalized[0].sha, newestSha, 'newest commits sort first');
assert.equal(normalized[0].category, 'Game update');
assert.equal(normalized[0].body, 'Use the player attack estimate.\nKeep this body multiline.');
assert.equal(normalized[0].summary, 'Use the player attack estimate.');
assert.equal(normalized[0].url, `https://github.com/ZethenZynx/Velscour-PC/commit/${newestSha}`);
assert.equal(normalized[1].category, 'Maintenance');

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

let calls = 0;
let commits = [commit(newestSha, '2026-11-19T12:00:00Z', 'Fix the Rift pylon damage')];
globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(url, 'https://api.github.com/repos/ZethenZynx/Velscour-PC/commits?sha=main&per_page=100');
  assert.equal(options.headers.Accept, 'application/vnd.github+json');
  return { ok: true, json: async () => commits };
};

const first = await loadRecentChanges();
assert.equal(first[0].sha, newestSha);
assert.equal(calls, 1);
assert.equal(getRecentChangesState().kind, 'live');
await loadRecentChanges();
assert.equal(calls, 1, 'fresh cache avoids another GitHub request');

// Overlapping refresh attempts share one request; its result replaces the cache.
const newerSha = 'c'.repeat(40);
commits = [commit(newerSha, '2026-11-20T12:00:00Z', 'Improve title history')];
let release;
globalThis.fetch = async () => { calls++; return await new Promise((resolve) => { release = () => resolve({ ok: true, json: async () => commits }); }); };
const pendingA = loadRecentChanges({ forceRefresh: true });
const pendingB = loadRecentChanges({ forceRefresh: true });
assert.equal(calls, 2, 'only one API request runs for concurrent refreshes');
release();
assert.equal((await pendingA)[0].sha, newerSha);
assert.equal((await pendingB)[0].sha, newerSha);

// Rate limits/network failures retain the last successful commit list.
globalThis.fetch = async () => { calls++; return { ok: false, status: 403 }; };
const stale = await loadRecentChanges({ forceRefresh: true });
assert.equal(stale[0].sha, newerSha);
assert.equal(getRecentChangesState().kind, 'stale');
assert.match(getRecentChangesState().message, /rate limit/i);
const callsAfterRateLimit = calls;
await loadRecentChanges();
assert.equal(calls, callsAfterRateLimit, 'a recent API failure is throttled across title-screen visits');

console.log('Recent Changes API, sorting, descriptions, cache, deduplication, and outage checks passed.');
