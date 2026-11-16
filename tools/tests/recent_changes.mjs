// The title-screen feed uses GitHub feat: commits, caches successful results, and falls back offline.
import assert from 'node:assert/strict';
import { RECENT_CHANGES } from '../../src/data/recent-changes.js';
import { featureChangesFromCommits, loadRecentChanges } from '../../src/game/recentchanges.js';

const commits = [
  { commit: { message: 'feat(ui): add a curated update feed\n\nShow major features in the title screen.' } },
  { commit: { message: 'fix: correct a tooltip offset' } },
  { commit: { message: 'feat: add a custom dungeon route' } },
  { commit: { message: 'Merge pull request #100' } },
];
assert.deepEqual(featureChangesFromCommits(commits), [
  { title: 'Add a curated update feed', summary: 'Show major features in the title screen.' },
  { title: 'Add a custom dungeon route', summary: '' },
]);

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
let requests = 0;
globalThis.fetch = async () => {
  requests++;
  return { ok: true, json: async () => commits };
};
assert.equal((await loadRecentChanges())[0].title, 'Add a curated update feed');
await loadRecentChanges();
assert.equal(requests, 1, 'the feed should use its short-lived cache');

memory.clear();
globalThis.fetch = async () => { throw new Error('offline'); };
assert.deepEqual(await loadRecentChanges(), RECENT_CHANGES, 'offline mode should keep the bundled change list');
console.log('Recent changes GitHub feed, cache, and offline fallback OK');
