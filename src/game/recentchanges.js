// Public, fork-only Recent Changes feed. The API response is cached locally so
// the title screen stays useful when GitHub or the network is unavailable.
const GITHUB_COMMITS_URL = 'https://api.github.com/repos/ZethenZynx/Velscour-PC/commits?sha=main&per_page=100';
const CACHE_KEY = 'velscour_recent_commits_v1';
const RETRY_KEY = 'velscour_recent_commits_retry_at_v1';
export const RECENT_CHANGES_REFRESH_MS = 30 * 60 * 1000;
const FAILURE_RETRY_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

let requestInFlight = null;
let state = { kind: 'idle', savedAt: 0, message: '' };

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    const validItems = (items) => items.every((item) => item && typeof item === 'object'
      && /^[a-f0-9]{7,40}$/i.test(item.sha || '') && typeof item.title === 'string'
      && typeof item.date === 'string' && Number.isFinite(item.timestamp));
    if (cached && Array.isArray(cached.items) && validItems(cached.items) && Number.isFinite(cached.savedAt)) return cached;
  } catch (_) { /* unavailable or corrupt storage: continue without a cache */ }
  return null;
}

function writeCache(items) {
  const savedAt = Date.now();
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt, items })); } catch (_) { /* storage is optional */ }
  return savedAt;
}

function getRetryAt() {
  try {
    const retryAt = Number(localStorage.getItem(RETRY_KEY));
    return Number.isFinite(retryAt) ? retryAt : 0;
  } catch (_) { return 0; }
}

function setRetryAt(value) {
  try {
    if (value) localStorage.setItem(RETRY_KEY, String(value));
    else localStorage.removeItem(RETRY_KEY);
  } catch (_) { /* storage is optional */ }
}

function commitCategory(message) {
  const subject = String(message || '').split(/\r?\n/, 1)[0].trim();
  const line = /^Merge pull request\b/i.test(subject)
    ? String(message || '').split(/\r?\n/).map((part) => part.trim()).find((part, i) => i > 0 && part) || subject
    : subject;
  if (/^(?:chore|docs?|ci|test|build|style|refactor|format|merge)(?:\([^)]*\))?!?:/i.test(line)
      || /\b(?:documentation only|test coverage|lint(?:ing)? only|dependency bump|workflow maintenance)\b/i.test(line)) return 'Maintenance';
  if (/^(?:feat(?:ure)?|fix|bugfix|perf|balance|gameplay|content|art|ui|audio|visual)(?:\([^)]*\))?!?:/i.test(line)
      || /\b(?:add|implement|fix|repair|improve|update|rebalance|redesign|restore|prevent|support)\b/i.test(line)) return 'Game update';
  return 'Other change';
}

/** Normalize one GitHub commits API item without interpreting its message as HTML. */
export function normalizeRecentCommit(commit) {
  const sha = String(commit?.sha || '').trim();
  const message = String(commit?.commit?.message || '').replace(/\r\n?/g, '\n').trim();
  if (!/^[a-f0-9]{7,40}$/i.test(sha) || !message) return null;
  const rawDate = commit.commit?.author?.date || commit.commit?.committer?.date;
  const time = Date.parse(rawDate || '');
  if (!Number.isFinite(time)) return null;
  const url = String(commit.html_url || '');
  const validUrl = new RegExp(`^https://github\\.com/ZethenZynx/Velscour-PC/commit/${sha}(?:$|[?#])`, 'i').test(url) ? url : '';
  const [title, ...bodyLines] = message.split('\n');
  return {
    sha,
    shortSha: sha.slice(0, 7),
    date: new Date(time).toISOString().slice(0, 10),
    timestamp: time,
    title: title.trim(),
    body: bodyLines.join('\n').trim(),
    summary: bodyLines.map((line) => line.trim()).find(Boolean) || '',
    author: String(commit.commit.author?.name || commit.author?.login || '').trim(),
    url: validUrl,
    category: commitCategory(message),
  };
}

/** GitHub's main-branch response is newest-first; sort defensively for proxies/mocks. */
export function commitsToRecentChanges(commits) {
  if (!Array.isArray(commits)) return [];
  return commits.map(normalizeRecentCommit).filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function getCachedRecentChanges() {
  return readCache()?.items || [];
}

export function getRecentChangesState() { return { ...state }; }

async function fetchRecentCommits() {
  if (typeof fetch !== 'function') throw new Error('Network requests are unavailable');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const response = await fetch(GITHUB_COMMITS_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached');
      throw new Error(`GitHub returned HTTP ${response.status}`);
    }
    const commits = await response.json();
    if (!Array.isArray(commits)) throw new Error('GitHub returned an invalid commit list');
    const items = commitsToRecentChanges(commits);
    if (commits.length && !items.length) throw new Error('GitHub returned commits in an unsupported format');
    return items;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Load cached commits immediately when fresh, otherwise make one shared public
 * API request. Failed requests preserve the last successful response.
 */
export function loadRecentChanges({ forceRefresh = false } = {}) {
  const cached = readCache();
  if (!forceRefresh && cached && Date.now() >= cached.savedAt && Date.now() - cached.savedAt < RECENT_CHANGES_REFRESH_MS) {
    state = { kind: 'cached', savedAt: cached.savedAt, message: '' };
    return Promise.resolve(cached.items);
  }
  if (!forceRefresh && Date.now() < getRetryAt()) {
    state = {
      kind: cached ? 'stale' : 'unavailable',
      savedAt: cached?.savedAt || 0,
      message: 'A recent GitHub request failed; retrying shortly',
    };
    return Promise.resolve(cached?.items || []);
  }
  if (requestInFlight) return requestInFlight;

  state = { kind: 'loading', savedAt: cached?.savedAt || 0, message: '' };
  requestInFlight = fetchRecentCommits()
    .then((items) => {
      setRetryAt(0);
      const savedAt = writeCache(items);
      state = { kind: 'live', savedAt, message: '' };
      return items;
    })
    .catch((error) => {
      setRetryAt(Date.now() + FAILURE_RETRY_MS);
      state = {
        kind: cached ? 'stale' : 'unavailable',
        savedAt: cached?.savedAt || 0,
        message: String(error?.message || 'Could not reach GitHub'),
      };
      return cached?.items || [];
    })
    .finally(() => { requestInFlight = null; });
  return requestInFlight;
}
