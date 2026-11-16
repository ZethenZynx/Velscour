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
const olderFeatures = Array.from({ length: 15 }, (_, index) => ({
  commit: { message: `feat: add older feature ${index + 1}` },
}));
globalThis.fetch = async (url) => {
  requests++;
  const page = new URL(url).searchParams.get('page');
  return {
    ok: true,
    headers: { get: () => page === '1' ? '<https://api.github.com/repos/ZethenZynx/Velscour/commits?sha=main&per_page=100&page=2>; rel="next"' : null },
    json: async () => page === '1' ? commits : olderFeatures,
  };
};
const loaded = await loadRecentChanges();
assert.equal(loaded[0].title, 'Add a curated update feed');
assert.equal(loaded.length, 17, 'the feed should include every feature across all commit pages');
assert.equal(loaded.at(-1).title, 'Add older feature 15');
await loadRecentChanges();
assert.equal(requests, 2, 'the feed should fetch every page once and use its short-lived cache');

memory.clear();
globalThis.fetch = async () => { throw new Error('offline'); };
assert.deepEqual(await loadRecentChanges(), RECENT_CHANGES, 'offline mode should keep the bundled change list');
console.log('Recent changes GitHub feed, cache, and offline fallback OK');
