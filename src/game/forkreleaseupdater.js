import { UI } from '../ui/ui.js';
import { escapeHtml } from '../core/util.js';
import { GAME_VERSION } from '../data/build-version.js';
import { FORK_RELEASES_API, getReleaseUpdateState } from '../data/fork-release.js';

let cached = null;
let checkedAt = 0;
let pending = null;
const CACHE_MS = 5 * 60 * 1000;

export async function checkForForkRelease({ force = false } = {}) {
  if (!force && cached && Date.now() - checkedAt < CACHE_MS) return cached;
  if (!force && pending) return pending;

  pending = (async () => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 7000) : null;
    try {
      const response = await fetch(FORK_RELEASES_API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (response.status === 404) {
        // GitHub's latest-release endpoint returns 404 when this public fork has
        // no published release. Cache that normal state to avoid querying it on
        // every title-screen visit.
        cached = { status: 'no-release', installedVersion: GAME_VERSION };
        checkedAt = Date.now();
        return cached;
      }
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const data = await response.json();
      const state = getReleaseUpdateState(data, GAME_VERSION);
      if (state.invalid) throw new Error('The latest fork release has no supported, checksummed ZIP package.');
      const result = { status: state.available ? 'available' : 'current', installedVersion: GAME_VERSION, release: { ...state, installedVersion: GAME_VERSION } };
      cached = result;
      checkedAt = Date.now();
      return result;
    } catch (error) {
      return { status: 'offline', installedVersion: GAME_VERSION, error: error?.name === 'AbortError' ? 'The update check timed out.' : String(error?.message || 'Could not reach GitHub.') };
    } finally {
      if (timeout) clearTimeout(timeout);
      pending = null;
    }
  })();
  return pending;
}

function releaseDetails(release) {
  const installedVersion = release.installedVersion || GAME_VERSION;
  const installedLabel = installedVersion.endsWith('-dev') ? `Development build (${installedVersion})` : installedVersion;
  const details = release.body.trim()
    ? escapeHtml(release.body).replace(/\r?\n/g, '<br>')
    : 'No release notes were provided.';
  const size = release.archive.size > 0
    ? `${(release.archive.size / (1024 * 1024)).toFixed(1)} MB`
    : 'Size listed on GitHub';
  const checksumLink = release.checksumUrl
    ? ` <a href="${escapeHtml(release.checksumUrl)}" target="_blank" rel="noopener noreferrer">SHA-256 file</a>`
    : '';
  return `<p><b>Installed:</b> ${escapeHtml(installedLabel)}<br><b>Available:</b> ${escapeHtml(release.version)}<br><b>Package:</b> ${escapeHtml(release.archive.name)} (${escapeHtml(size)})</p>
    <p class="fork-update-notes">${details}</p>
    <p class="dim fork-update-hash"><b>SHA-256</b><br><code>${escapeHtml(release.archive.sha256)}</code>${checksumLink}</p>
    <p class="dim">Your browser will show download progress. This game cannot safely replace files in its local folder: verify the ZIP's SHA-256, then extract it beside your existing game. The updater never writes to your files or browser saves.</p>`;
}

export function showForkReleaseDialog(result) {
  if (result.status === 'offline') {
    UI.dialog({ title: 'Update Check Failed', html: `<p>${escapeHtml(result.error || 'GitHub could not be reached.')}</p><p class="dim">You can keep playing offline. Your local game files and saves were not changed.</p>`, buttons: [{ label: 'Done' }] });
    return;
  }
  if (result.status === 'no-release') {
    UI.dialog({ title: 'No Fork Release Published', html: '<p>Your fork has not published a versioned PC release yet. The game remains playable, and no files were changed.</p>', buttons: [{ label: 'Done' }] });
    return;
  }
  const release = result.release;
  if (!release.available) {
    const installed = GAME_VERSION.endsWith('-dev') ? `Development build (${GAME_VERSION})` : GAME_VERSION;
    UI.dialog({ title: 'Velscour Is Up to Date', html: `<p>Installed version <b>${escapeHtml(installed)}</b> is the latest published release for your fork.</p><p class="dim">Checked only ${escapeHtml('ZethenZynx/Velscour-PC')}.</p>`, buttons: [{ label: 'Done' }] });
    return;
  }
  const dialog = UI.dialog({
    title: 'Update Available',
    html: releaseDetails(release),
    cls: 'fork-update-dialog',
    buttons: [
      { label: 'Later' },
      { label: 'Open Release Page', fn: () => window.open(release.pageUrl, '_blank', 'noopener,noreferrer') },
    ],
  });
  const download = document.createElement('a');
  download.className = 'btn red fork-update-download';
  download.href = release.archive.url;
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.textContent = 'Download Update ZIP';
  dialog.box.querySelector('.dlg-body').appendChild(download);
}

export function initTitleForkUpdater(button) {
  if (!button) return;
  button.addEventListener('click', () => showForkReleaseDialog(cached || { status: 'offline', error: 'Update details are not loaded. Use Check for Updates to try again.' }));
  checkForForkRelease().then((result) => {
    if (result.status === 'available') button.classList.remove('hidden');
  });
}

export async function manuallyCheckForForkRelease() {
  showForkReleaseDialog(await checkForForkRelease({ force: true }));
}
