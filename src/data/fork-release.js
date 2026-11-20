// The updater reads one cache-busted static manifest from this fork's GitHub Pages site.
export const FORK_VERSION_MANIFEST_URL = 'https://zethenzynx.github.io/Velscour-PC/version.json';
export const FORK_RELEASE_REPOSITORY = 'ZethenZynx/Velscour-PC';

const RELEASE_DOWNLOAD_PREFIX = 'https://github.com/ZethenZynx/Velscour-PC/releases/download/';
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;

export function compareVersions(left, right) {
  const parse = (value) => {
    const match = String(value || '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/);
    if (!match) return null;
    return { parts: match.slice(1, 4).map(Number), prerelease: match[4] || '' };
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return 0;
  for (let i = 0; i < 3; i++) if (a.parts[i] !== b.parts[i]) return a.parts[i] > b.parts[i] ? 1 : -1;
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

/** Accept only the schema and release-package URLs published by this PC fork. */
export function normalizeForkManifest(value) {
  if (!value || value.schema !== 1 || !SEMVER.test(String(value.version || ''))) return null;
  const buildId = String(value.buildId || '').trim();
  if (!buildId || buildId.length > 100) return null;
  const manifest = {
    version: String(value.version),
    buildId,
    downloadUrl: null,
    sha256: null,
    packageSize: Number.isSafeInteger(value.packageSize) && value.packageSize > 0 ? value.packageSize : 0,
    checksumUrl: '',
    releaseNotesUrl: '',
    publishedAt: String(value.publishedAt || ''),
  };
  if (value.downloadUrl == null || value.downloadUrl === '') return manifest;

  try {
    const url = new URL(String(value.downloadUrl));
    const tag = `v${manifest.version}`;
    if (url.protocol !== 'https:' || url.host !== 'github.com' || !url.href.startsWith(RELEASE_DOWNLOAD_PREFIX)) return null;
    if (url.pathname.split('/')[5] !== tag || !/\.zip$/i.test(url.pathname)) return null;
    const sha256 = String(value.sha256 || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(sha256) || !manifest.packageSize) return null;
    manifest.downloadUrl = url.href;
    manifest.sha256 = sha256;
    const checksumUrl = new URL(String(value.checksumUrl || ''));
    if (checksumUrl.protocol !== 'https:' || checksumUrl.host !== 'github.com' || !checksumUrl.href.startsWith(RELEASE_DOWNLOAD_PREFIX)
      || checksumUrl.pathname.split('/')[5] !== tag || !checksumUrl.pathname.endsWith('.zip.sha256')) return null;
    manifest.checksumUrl = checksumUrl.href;
    const notesUrl = new URL(String(value.releaseNotesUrl || ''));
    if (notesUrl.protocol !== 'https:' || notesUrl.host !== 'github.com' || !notesUrl.pathname.startsWith('/ZethenZynx/Velscour-PC/releases/')) return null;
    manifest.releaseNotesUrl = notesUrl.href;
  } catch (_) { return null; }
  return manifest;
}

export function getReleaseUpdateState(manifestValue, installedVersion) {
  const manifest = normalizeForkManifest(manifestValue);
  if (!manifest) return { available: false, invalid: true };
  const available = compareVersions(manifest.version, installedVersion) > 0;
  if (available && (!manifest.downloadUrl || !manifest.sha256 || !manifest.packageSize)) return { ...manifest, available: false, invalid: true };
  return { ...manifest, available };
}
