import { RECENT_CHANGES } from '../data/recent-changes.js';

const GITHUB_COMMITS_URL = 'https://api.github.com/repos/ZethenZynx/Velscour/commits?sha=main&per_page=100&page=1';
const CACHE_KEY = 'velscour_recent_feature_commits_v2';
const CACHE_MS = 30 * 60 * 1000;
const FEATURE_TITLE = /^(?:feat|feature)(?:\([^)]*\))?!?:\s*(.+)$/i;

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

function cleanSummary(lines) {
  const text = lines.join(' ')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/^\s*[-*]\s*/gm, '')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const firstSentence = text.match(/^.{1,180}?(?:[.!?](?=\s|$)|$)/);
  return firstSentence ? firstSentence[0].trim() : text.slice(0, 180).trim();
}

/** Read concise, user-facing feature summaries from the fork's conventional feature commits. */
export function featureChangesFromCommits(commits) {
  if (!Array.isArray(commits)) return [];
  return commits.flatMap((entry) => {
    const lines = String(entry?.commit?.message || '').split(/\r?\n/);
    const match = lines[0].trim().match(FEATURE_TITLE);
    if (!match) return [];
    const title = match[1].trim();
    if (!title) return [];
    return [{ title: title[0].toUpperCase() + title.slice(1), summary: cleanSummary(lines.slice(1)) }];
  });
}

async function fetchAllCommits() {
  const commits = [];
  let url = GITHUB_COMMITS_URL;
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
      if (!Array.isArray(page)) throw new Error('GitHub returned an invalid commit list');
      commits.push(...page);
      url = page.length ? nextPageUrl(response) : null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return commits;
}

/** Load every feature commit from GitHub, falling back to cached or bundled summaries if unavailable. */
export async function loadRecentChanges() {
  const cached = readCache();
  if (cached?.items?.length && Date.now() - cached.savedAt < CACHE_MS) return cached.items;

  try {
    const items = featureChangesFromCommits(await fetchAllCommits());
    if (!items.length) return cached?.items?.length ? cached.items : RECENT_CHANGES;
    writeCache(items);
    return items;
  } catch (_) {
    return cached?.items?.length ? cached.items : RECENT_CHANGES;
  }
}
