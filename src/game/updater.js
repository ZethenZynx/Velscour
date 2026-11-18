import { RECENT_CHANGES } from '../data/recent-changes.js';
import { loadRecentChanges } from './recentchanges.js';
import { UI } from '../ui/ui.js';
import { escapeHtml } from '../core/util.js';

const ACKNOWLEDGED_UPDATES_KEY = 'velscour_update_acknowledged_v1';
const changeKey = ({ date, title }) => `${date || ''}\u0000${String(title || '').trim().toLocaleLowerCase()}`;
const bundledChanges = new Set(RECENT_CHANGES.map(changeKey));

function acknowledgedChanges() {
  try {
    const value = JSON.parse(localStorage.getItem(ACKNOWLEDGED_UPDATES_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((key) => typeof key === 'string') : []);
  } catch (_) { return new Set(); }
}

/** Changes merged into main after this game build's bundled history was created. */
export function changesAfterBundledBuild(items) {
  if (!Array.isArray(items)) return [];
  const acknowledged = acknowledgedChanges();
  return items.filter((item) => item?.title && !bundledChanges.has(changeKey(item)) && !acknowledged.has(changeKey(item)));
}

export function showUpdateDialog(items) {
  const updates = changesAfterBundledBuild(items);
  const list = updates.slice(0, 8).map(({ title, summary, date }) =>
    `<li><strong>${escapeHtml(title)}</strong>${summary ? `<span>${escapeHtml(summary)}</span>` : ''}${date ? `<time>${escapeHtml(date)}</time>` : ''}</li>`
  ).join('');

  UI.dialog({
    title: 'Velscour Update Available',
    html: `<p>A newer game update is available. Reload to download the latest published game files.</p><ul class="update-change-list">${list}</ul>`,
    buttons: [
      { label: 'Later' },
      { label: 'Reload to Update', cls: 'red', fn: () => reloadGameForUpdate(updates) },
    ],
  });
}

/** Check the live merged-change feed and show the update result from Settings. */
export async function checkForGameUpdates() {
  const changes = await loadRecentChanges({ forceRefresh: true });
  const updates = changesAfterBundledBuild(changes);
  if (updates.length) showUpdateDialog(updates);
  else UI.dialog({
    title: 'No New Game Update Found',
    html: '<p>No changes newer than this game’s bundled update history were found. Connect to GitHub and check again if you may be offline.</p>',
    buttons: [{ label: 'Done' }],
  });
  return updates;
}

/**
 * The PC edition is a static browser game, so it cannot overwrite its hosted files in place.
 * Revalidating the page and navigating to a cache-busted URL loads the published web build.
 */
export async function reloadGameForUpdate(updates = []) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const stamp = String(Date.now());
  url.searchParams.set('_velscour_update', stamp);
  const freshPage = new URL(window.location.pathname, window.location.origin);
  freshPage.searchParams.set('_velscour_update', stamp);
  let pageResponded = false;
  try {
    const response = await fetch(freshPage.href, { cache: 'reload', credentials: 'same-origin' });
    pageResponded = response.ok;
  } catch (_) { /* navigating still retries the latest published page */ }
  if (pageResponded) {
    try {
      const acknowledged = acknowledgedChanges();
      for (const item of updates) acknowledged.add(changeKey(item));
      localStorage.setItem(ACKNOWLEDGED_UPDATES_KEY, JSON.stringify([...acknowledged].slice(-500)));
    } catch (_) { /* update can still proceed when browser storage is unavailable */ }
  }
  window.location.replace(url.href);
}
