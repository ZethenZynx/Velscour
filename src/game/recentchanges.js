import { RECENT_CHANGES } from '../data/recent-changes.js';

const GITHUB_PULLS_URL = 'https://api.github.com/repos/ZethenZynx/Velscour-PC/pulls?state=closed&per_page=100&page=1&sort=created&direction=desc';
const CACHE_KEY = 'velscour_recent_changes_v5';
const CACHE_MS = 30 * 60 * 1000;
const REPOSITORY = 'ZethenZynx/Velscour-PC';

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

function cleanTitle(title) {
  return String(title || '')
    .trim()
    .replace(/^(?:(?:feat|feature|fix|bugfix|balance|ui|copy|perf)(?:\([^)]*\))?:\s*)/i, '')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function cleanSummary(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const summaryHeading = lines.findIndex((line) => /^#{1,4}\s+(?:summary|what changed|changes|overview)\s*$/i.test(line.trim()));
  const summaryLines = summaryHeading >= 0 ? lines.slice(summaryHeading + 1) : lines;
  const nextHeading = summaryLines.findIndex((line) => /^#{1,4}\s+/.test(line.trim()));
  const section = nextHeading >= 0 ? summaryLines.slice(0, nextHeading) : summaryLines;
  const text = section
    .map((line) => line.replace(/<!--.*?-->/g, '').replace(/^\s*[-*]\s*/, '').replace(/^\s*>+\s*/, '').trim())
    .filter((line) => line && !/^\[[ xX]\]\s*/.test(line))
    .find(Boolean);
  if (!text) return '';
  const normalized = text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstSentence = normalized.match(/^.{1,190}?(?:[.!?](?=\s|$)|$)/);
  return firstSentence ? firstSentence[0].trim() : normalized.slice(0, 190).trim();
}

/** Include every merged PR into the fork's main branch, including fixes and balance updates. */
export function mergedChangesFromPullRequests(pullRequests) {
  if (!Array.isArray(pullRequests)) return [];
  return pullRequests
    .filter((pullRequest) => pullRequest?.merged_at
      && pullRequest.base?.ref === 'main'
      && pullRequest.base?.repo?.full_name === REPOSITORY)
    .map((pullRequest) => ({
      title: cleanTitle(pullRequest.title),
      summary: cleanSummary(pullRequest.body),
      date: String(pullRequest.merged_at).slice(0, 10),
      mergedAt: String(pullRequest.merged_at),
      number: pullRequest.number,
    }))
    .filter((item) => item.title)
    .sort((a, b) => Date.parse(b.mergedAt) - Date.parse(a.mergedAt) || b.number - a.number)
    .map(({ mergedAt, number, ...item }) => item);
}

async function fetchAllMergedPullRequests() {
  const pullRequests = [];
  let url = GITHUB_PULLS_URL;
  while (url) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
        ...(controller ? { signal: controller.signal } : {}),
        cache: 'no-store',
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

/** Fetch the full merged-PR history, falling back to cached or bundled history offline. */
export async function loadRecentChanges({ forceRefresh = false } = {}) {
  const cached = readCache();
  if (!forceRefresh && cached?.items?.length && Date.now() - cached.savedAt < CACHE_MS) return cached.items;

  try {
    const items = mergedChangesFromPullRequests(await fetchAllMergedPullRequests());
    if (!items.length) return cached?.items?.length ? cached.items : RECENT_CHANGES;
    writeCache(items);
    return items;
  } catch (_) {
    return cached?.items?.length ? cached.items : RECENT_CHANGES;
  }
}
