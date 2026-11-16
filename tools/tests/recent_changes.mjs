// The title-screen feed includes every merged feature PR, caches the result, and falls back offline.
import assert from 'node:assert/strict';
import { RECENT_CHANGES } from '../../src/data/recent-changes.js';
import { featureChangesFromPullRequests, loadRecentChanges } from '../../src/game/recentchanges.js';

const pullRequests = [
  {
    title: 'Add a curated update feed',
    body: '## Summary\n- Show major features in the title screen.\n\n## Checks\n- Passed.',
    merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'feat/ui-recent-changes', repo: { full_name: 'ZethenZynx/Velscour' } },
  },
  {
    title: 'Fix a tooltip offset',
    body: 'Fix the offset.',
    merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'fix/tooltip-offset', repo: { full_name: 'ZethenZynx/Velscour' } },
  },
  {
    title: 'Unmerged feature',
    merged_at: null,
    head: { ref: 'feat/unmerged', repo: { full_name: 'ZethenZynx/Velscour' } },
  },
  {
    title: 'External feature',
    merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'feature/external', repo: { full_name: 'someone-else/Velscour' } },
  },
];
assert.deepEqual(featureChangesFromPullRequests(pullRequests), [
  { title: 'Add a curated update feed', summary: 'Show major features in the title screen.' },
]);
assert.ok(RECENT_CHANGES.length >= 40, 'the offline list should include the full curated feature history');

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
let requests = 0;
const olderFeatures = Array.from({ length: 15 }, (_, index) => ({
  title: `Older feature ${index + 1}`,
  body: `## Summary\n- Add older feature ${index + 1}.`,
  merged_at: '2026-11-15T00:00:00Z',
  head: { ref: `feature/older-${index + 1}`, repo: { full_name: 'ZethenZynx/Velscour' } },
}));
globalThis.fetch = async (url) => {
  requests++;
  const page = new URL(url).searchParams.get('page');
  return {
    ok: true,
    headers: { get: () => page === '1' ? '<https://api.github.com/repos/ZethenZynx/Velscour/pulls?state=closed&per_page=100&page=2>; rel="next"' : null },
    json: async () => page === '1' ? pullRequests : olderFeatures,
  };
};
const loaded = await loadRecentChanges();
assert.equal(loaded[0].title, 'Add a curated update feed');
assert.equal(loaded.length, 16, 'the feed should include feature PRs across all pages');
assert.equal(loaded.at(-1).title, 'Older feature 15');
await loadRecentChanges();
assert.equal(requests, 2, 'the feed should fetch every page once and use its short-lived cache');

memory.clear();
globalThis.fetch = async () => { throw new Error('offline'); };
assert.deepEqual(await loadRecentChanges(), RECENT_CHANGES, 'offline mode should keep the bundled change list');
console.log('Recent changes GitHub feed, cache, and offline fallback OK');
