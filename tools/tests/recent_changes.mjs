// The title-screen feed includes every merged feature PR, caches the result, and falls back offline.
import assert from 'node:assert/strict';
import { RECENT_CHANGES } from '../../src/data/recent-changes.js';
import { featureChangesFromPullRequests, loadRecentChanges } from '../../src/game/recentchanges.js';

const pullRequests = [
  {
    title: 'feat: add 50 shrine and world objects',
    body: '## Summary\n- Add a dedicated shrine chamber and interactive world objects.\n\n## Checks\n- Passed.',
    state: 'closed', merged_at: '2026-11-17T02:51:22Z',
    head: { ref: 'feat/50-shrines-world-objects', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'Add a curated update feed',
    body: '## Summary\n- Show major features in the title screen.\n\n## Checks\n- Passed.',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'feat/ui-recent-changes', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'Fix a tooltip offset',
    body: 'Fix the offset.',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'fix/tooltip-offset', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'Open feature PR', state: 'open', draft: false, merged_at: null,
    head: { ref: 'feat/open-feature', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'Closed without merge', state: 'closed', merged_at: null,
    head: { ref: 'feat/closed-unmerged', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'Draft feature', state: 'open', draft: true, merged_at: null,
    head: { ref: 'feature/draft-feature', repo: { full_name: 'ZethenZynx/Velscour-PC' } },
  },
  {
    title: 'External feature',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    head: { ref: 'feature/external', repo: { full_name: 'someone-else/Velscour' } },
  },
];
assert.deepEqual(featureChangesFromPullRequests(pullRequests), [
  { title: 'Add 50 shrine and world objects', summary: 'Add a dedicated shrine chamber and interactive world objects.' },
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
  assert.match(url, /repos\/ZethenZynx\/Velscour-PC\/pulls\?state=closed/);
  const page = new URL(url).searchParams.get('page');
  return {
    ok: true,
    headers: { get: () => page === '1' ? '<https://api.github.com/repos/ZethenZynx/Velscour-PC/pulls?state=closed&per_page=100&page=2>; rel="next"' : null },
    json: async () => page === '1' ? pullRequests : olderFeatures,
  };
};
const loaded = await loadRecentChanges();
assert.equal(loaded[0].title, 'Add 50 shrine and world objects');
assert.equal(loaded.length, 17, 'the feed should include merged feature PRs across all pages');
assert.equal(loaded.at(-1).title, 'Older feature 15');
await loadRecentChanges();
assert.equal(requests, 2, 'the feed should fetch every page once and use its short-lived cache');

memory.clear();
globalThis.fetch = async () => { throw new Error('offline'); };
assert.deepEqual(await loadRecentChanges(), RECENT_CHANGES, 'offline mode should keep the bundled change list');
console.log('Recent changes GitHub feed, cache, and offline fallback OK');
