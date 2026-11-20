import { UI } from '../ui/ui.js';
import { escapeHtml } from '../core/util.js';
import { sha256File } from '../core/sha256.js';
import { GAME_VERSION, GAME_BUILD_ID } from '../data/build-version.js';
import { FORK_VERSION_MANIFEST_URL, FORK_RELEASE_REPOSITORY, getReleaseUpdateState } from '../data/fork-release.js';

let cached = null;
let checkedAt = 0;
let pending = null;
const CACHE_MS = 5 * 60 * 1000;

/** Fetch the fork's static Pages manifest; the unique query and no-store mode bypass stale CDN/browser copies. */
export async function checkForForkRelease({ force = false } = {}) {
  if (!force && cached && Date.now() - checkedAt < CACHE_MS) return cached;
  if (pending) return pending;
  pending = (async () => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 9000) : null;
    try {
      const url = new URL(FORK_VERSION_MANIFEST_URL);
      url.searchParams.set('_', String(Date.now()));
      const response = await fetch(url.href, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!response.ok) throw new Error('The fork version manifest returned HTTP ' + response.status + '.');
      const data = await response.json();
      const state = getReleaseUpdateState(data, GAME_VERSION);
      if (state.invalid) throw new Error('The fork published an invalid or incomplete version manifest.');
      const result = { status: state.available ? 'available' : 'current', installedVersion: GAME_VERSION, installedBuild: GAME_BUILD_ID, manifest: state };
      cached = result;
      checkedAt = Date.now();
      return result;
    } catch (error) {
      const result = { status: 'offline', installedVersion: GAME_VERSION,
        error: error?.name === 'AbortError' ? 'The update check timed out.' : String(error?.message || 'Could not reach the fork update manifest.') };
      cached = result;
      checkedAt = Date.now();
      return result;
    } finally {
      if (timeout) clearTimeout(timeout);
      pending = null;
    }
  })();
  return pending;
}

function currentDetails(result) {
  const manifest = result.manifest;
  return '<p>Installed version <b>' + escapeHtml(result.installedVersion) + '</b> matches the latest version currently published by this fork.</p>' +
    '<p class="dim">Installed build: ' + escapeHtml(result.installedBuild) + '<br>Latest build: ' + escapeHtml(manifest.buildId) + '<br>Checked the static manifest on GitHub Pages for ' + escapeHtml(FORK_RELEASE_REPOSITORY) + '. This version check uses the Pages manifest instead of the GitHub API.</p>';
}

function updateDetails(result) {
  const m = result.manifest;
  const size = (m.packageSize / (1024 * 1024)).toFixed(1) + ' MB';
  return '<p><b>Installed:</b> ' + escapeHtml(result.installedVersion) + '<br><b>Available:</b> ' + escapeHtml(m.version) +
    '<br><b>Build:</b> ' + escapeHtml(m.buildId) + '<br><b>Package:</b> ' + escapeHtml(size) + '</p>' +
    '<p class="dim">Download this update ZIP. Before extracting it, choose the downloaded file below to verify its size and SHA-256. Verification runs locally in your browser; the file is never uploaded. Your saves and settings remain in browser storage and are not part of the update package.</p>' +
    '<p class="dim fork-update-hash"><b>Expected SHA-256</b><br><code>' + escapeHtml(m.sha256) + '</code> <a href="' + escapeHtml(m.checksumUrl) + '" target="_blank" rel="noopener noreferrer">Checksum file</a></p>' +
    '<p class="dim">This browser game cannot overwrite its installed files automatically. Only extract the ZIP after it passes verification; the updater will not change your game files or saved data.</p>';
}

export function showForkReleaseDialog(result) {
  if (result.status === 'offline') {
    UI.dialog({ title: 'Update Check Failed', html: '<p>' + escapeHtml(result.error || 'The fork update manifest could not be reached.') + '</p><p class="dim">You can keep playing offline. Your local game files and saves were not changed.</p>', buttons: [{ label: 'Done' }] });
    return;
  }
  if (result.status === 'invalid') {
    UI.dialog({ title: 'Update Information Unavailable', html: '<p>' + escapeHtml(result.error || 'The fork update manifest is invalid.') + '</p><p class="dim">No files were downloaded or changed.</p>', buttons: [{ label: 'Done' }] });
    return;
  }
  const m = result.manifest;
  if (!m?.available) {
    UI.dialog({ title: 'Velscour Is Up to Date', html: currentDetails(result), buttons: [{ label: 'Done' }] });
    return;
  }
  const dialog = UI.dialog({ title: 'Update Available', html: updateDetails(result), cls: 'fork-update-dialog',
    buttons: [{ label: 'Later' }, { label: 'Open Release Notes', fn: () => window.open(m.releaseNotesUrl, '_blank', 'noopener,noreferrer') }] });
  const body = dialog.box.querySelector('.dlg-body');
  const download = document.createElement('a');
  download.className = 'btn red fork-update-download'; download.href = m.downloadUrl;
  download.rel = 'noopener noreferrer'; download.textContent = 'Download Update ZIP'; body.appendChild(download);

  const verifyButton = document.createElement('button');
  verifyButton.type = 'button'; verifyButton.className = 'btn fork-update-verify'; verifyButton.textContent = 'Verify Downloaded ZIP';
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.zip,application/zip'; input.className = 'fork-update-file-input'; input.hidden = true;
  const status = document.createElement('p'); status.className = 'fork-update-verify-status dim'; status.setAttribute('aria-live', 'polite');
  verifyButton.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    verifyButton.disabled = true;
    try {
      if (file.size !== m.packageSize) throw new Error('File size does not match the published package (' + file.size + ' bytes selected). Do not extract this file.');
      status.textContent = 'Verifying the downloaded file locally…';
      const actual = await sha256File(file, (loaded, total) => {
        status.textContent = 'Verifying locally: ' + (loaded / (1024 * 1024)).toFixed(0) + ' / ' + (total / (1024 * 1024)).toFixed(0) + ' MB';
      });
      if (actual !== m.sha256) throw new Error('SHA-256 does not match. Do not extract this file; download it again.');
      status.textContent = 'Verified: ' + file.name + '. It is safe to extract this package.';
      status.classList.add('verified'); status.classList.remove('verification-failed');
    } catch (error) {
      status.textContent = String(error?.message || 'Could not verify this file. Do not extract it.');
      status.classList.add('verification-failed'); status.classList.remove('verified');
    } finally { verifyButton.disabled = false; input.value = ''; }
  });
  body.append(verifyButton, input, status);
}

export function initTitleForkUpdater(button) {
  if (!button) return;
  button.addEventListener('click', () => showForkReleaseDialog(cached || { status: 'offline', error: 'Update details have not loaded yet. Check again while online.' }));
  checkForForkRelease().then((result) => {
    if (result.status === 'available') button.classList.remove('hidden');
    else button.classList.add('hidden');
  });
}

export async function manuallyCheckForForkRelease() {
  showForkReleaseDialog(await checkForForkRelease({ force: true }));
}

export function resetForkReleaseCache() { cached = null; checkedAt = 0; pending = null; }
