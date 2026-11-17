import { RECENT_CHANGES } from '../data/recent-changes.js';

const GITHUB_FEATURE_PULLS_URL = 'https://api.github.com/repos/ZethenZynx/Velscour-PC/pulls?state=closed&per_page=100&page=1&sort=created&direction=desc';
const CACHE_KEY = 'velscour_recent_feature_pulls_v4';
const CACHE_MS = 30 * 60 * 1000;
const FEATURE_BRANCH = /^(?:feat|feature)\//i;

function nextPageUrl(response) {
  const links = response.headers?.get?.('Link') || '';
  return links.match(/<([^>]+)>\s*;\s*rel="next"/i)?.[1] || null;
}

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (saved && Array.isArray(saved.items) && Number.isFinite(saved.savedAt)) return saved;
  } catch (_) { /* corrupted or unavailable browser storage: use the bundled list */ }
  return null;
}

function writeCache(items) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items })); } catch (_) { /* storage is optional */ }
}

function cleanSummary(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const summaryHeading = lines.findIndex((line) => /^#{1,4}\s+summary\s*$/i.test(line.trim()));
  let summaryLines = lines;
  if (summaryHeading >= 0) {
    summaryLines = lines.slice(summaryHeading + 1);
    const nextHeading = summaryLines.findIndex((line) => /^#{1,4}\s+/.test(line.trim()));
    if (nextHeading >= 0) summaryLines = summaryLines.slice(0, nextHeading);
  }
  const text = summaryLines
    .map((line) => line.replace(/^\s*[-*]\s*/, '').replace(/^\s*#+\s*/, '').replace(/^\s*>+\s*/, '').trim())
    .find(Boolean);
  if (!text) return '';
  const normalized = text.replace(/[`*_>#]/g, '').replace(/\s+/g, ' ').trim();
  const firstSentence = normalized.match(/^.{1,180}?(?:[.!?](?=\s|$)|$)/);
  return firstSentence ? firstSentence[0].trim() : normalized.slice(0, 180).trim();
}

/** Use titles and short summaries from merged feature pull requests in the fork. */
export function featureChangesFromPullRequests(pullRequests) {
  if (!Array.isArray(pullRequests)) return [];
  return pullRequests.flatMap((pullRequest) => {
    const branch = String(pullRequest?.head?.ref || '');
    const sourceRepo = pullRequest?.head?.repo?.full_name;
    const title = String(pullRequest?.title || '').trim().replace(/^(?:feat|feature):\s*/i, '').replace(/^./, (letter) => letter.toUpperCase());
    const ownFork = sourceRepo === 'ZethenZynx/Velscour-PC' || sourceRepo === 'ZethenZynx/Velscour';
    if (!pullRequest?.merged_at || !FEATURE_BRANCH.test(branch) || !ownFork || !title) return [];
    return [{ title, summary: cleanSummary(pullRequest.body) }];
  });
}

async function fetchAllFeaturePullRequests() {
  const pullRequests = [];
  let url = GITHUB_FEATURE_PULLS_URL;
  while (url) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
        ...(controller ? { signal: controller.signal } : {}),
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('GitHub returned an invalid pull request list');
      pullRequests.push(...page);
      url = page.length ? nextPageUrl(response) : null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return pullRequests;
}

/** Load merged feature PRs, falling back to cached or bundled summaries if unavailable. */
export async function loadRecentChanges() {
  const cached = readCache();
  if (cached?.items?.length && Date.now() - cached.savedAt < CACHE_MS) return cached.items;

  try {
    const items = featureChangesFromPullRequests(await fetchAllFeaturePullRequests());
    if (!items.length) return cached?.items?.length ? cached.items : RECENT_CHANGES;
    writeCache(items);
    return items;
  } catch (_) {
    return cached?.items?.length ? cached.items : RECENT_CHANGES;
  }
}
