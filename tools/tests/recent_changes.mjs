// The title-screen feed includes every merged PR into the fork's main branch, newest first.
import assert from 'node:assert/strict';
import { RECENT_CHANGES } from '../../src/data/recent-changes.js';
import { mergedChangesFromPullRequests, loadRecentChanges } from '../../src/game/recentchanges.js';

const repo = { full_name: 'ZethenZynx/Velscour-PC' };
const mergedBase = { ref: 'main', repo };

const pullRequests = [
  {
    title: 'feat: add 50 shrine and world objects',
    body: '## Summary\n- Add a dedicated shrine chamber and interactive world objects.\n\n## Checks\n- Passed.',
    state: 'closed', merged_at: '2026-11-17T02:51:22Z',
    number: 114, base: mergedBase,
  },
  {
    title: 'Add a curated update feed',
    body: '## Summary\n- Show major features in the title screen.\n\n## Checks\n- Passed.',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    number: 99, base: mergedBase,
  },
  {
    title: 'Fix a tooltip offset',
    body: 'Fix the offset.',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    number: 115, base: mergedBase,
  },
  {
    title: 'Open PR', number: 116, state: 'open', draft: false, merged_at: null, base: mergedBase,
  },
  {
    title: 'Closed without merge', number: 117, state: 'closed', merged_at: null, base: mergedBase,
  },
  {
    title: 'Draft update', number: 118, state: 'open', draft: true, merged_at: null, base: mergedBase,
  },
  {
    title: 'External feature',
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    number: 119, base: { ref: 'main', repo: { full_name: 'someone-else/Velscour' } },
  },
  {
    title: 'Merged into a different branch', number: 120,
    state: 'closed', merged_at: '2026-11-16T00:00:00Z',
    base: { ref: 'release', repo },
  },
];
assert.deepEqual(mergedChangesFromPullRequests(pullRequests), [
  { title: 'Add 50 shrine and world objects', summary: 'Add a dedicated shrine chamber and interactive world objects.', date: '2026-11-17' },
  { title: 'Fix a tooltip offset', summary: '', date: '2026-11-16' },
  { title: 'Add a curated update feed', summary: 'Show major features in the title screen.', date: '2026-11-16' },
]);
assert.equal(RECENT_CHANGES.length, 111, 'the offline list should include the complete merged fork history');
assert.ok(RECENT_CHANGES[0].date >= RECENT_CHANGES.at(-1).date, 'the offline list should be newest first');

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
let requests = 0;
const olderFeatures = Array.from({ length: 15 }, (_, index) => ({
  number: 121 + index,
  title: `Fix: Older update ${index + 1}`,
  body: `## Summary\n- Fix older issue ${index + 1}.`,
  state: 'closed',
  merged_at: `2026-11-${String(15 - Math.floor(index / 10)).padStart(2, '0')}T${String(23 - index).padStart(2, '0')}:00:00Z`,
  base: mergedBase,
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
assert.equal(loaded.length, 18, 'the feed should include all merged PRs across all pages');
assert.ok(loaded[0].date >= loaded.at(-1).date, 'the live feed should be newest first');
await loadRecentChanges();
assert.equal(requests, 2, 'the feed should fetch every page once and use its short-lived cache');

memory.clear();
globalThis.fetch = async () => { throw new Error('offline'); };
assert.deepEqual(await loadRecentChanges(), RECENT_CHANGES, 'offline mode should keep the bundled change list');
console.log('Recent changes GitHub feed, cache, and offline fallback OK');
