export const FORK_RELEASES_API = 'https://api.github.com/repos/ZethenZynx/Velscour-PC/releases/latest';
export const FORK_RELEASE_REPOSITORY = 'ZethenZynx/Velscour-PC';

const RELEASE_PAGE_PREFIX = 'https://github.com/ZethenZynx/Velscour-PC/releases/';
const DOWNLOAD_PREFIX = 'https://github.com/ZethenZynx/Velscour-PC/releases/download/';

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

/** Accept only a published release and package hosted by this fork. */
export function normalizeForkRelease(release) {
  if (!release || release.draft || release.prerelease) return null;
  const tag = String(release.tag_name || '').trim();
  const version = tag.replace(/^v/i, '');
  if (compareVersions(version, version) !== 0 || !/^v?\d+\.\d+\.\d+(?:-[\w.-]+)?$/i.test(tag)) return null;
  if (release.html_url && (!String(release.html_url).startsWith(RELEASE_PAGE_PREFIX) || new URL(release.html_url).host !== 'github.com')) return null;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const archive = assets.find((asset) => {
    if (!/\.zip$/i.test(String(asset?.name || ''))) return false;
    const url = String(asset.browser_download_url || '');
    return url.startsWith(DOWNLOAD_PREFIX) && new URL(url).host === 'github.com';
  });
  if (!archive) return null;
  const digest = String(archive.digest || '').match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase() || '';
  if (!digest) return null;
  const checksum = assets.find((asset) => {
    const url = String(asset?.browser_download_url || '');
    return String(asset?.name || '').toLowerCase() === `${archive.name}.sha256`.toLowerCase()
      && url.startsWith(DOWNLOAD_PREFIX) && new URL(url).host === 'github.com';
  });
  return {
    version,
    tag,
    name: String(release.name || `Velscour PC ${version}`),
    body: String(release.body || ''),
    publishedAt: String(release.published_at || ''),
    pageUrl: release.html_url || `${RELEASE_PAGE_PREFIX}tag/${encodeURIComponent(tag)}`,
    archive: {
      name: String(archive.name),
      url: String(archive.browser_download_url),
      size: Number(archive.size) || 0,
      sha256: digest,
    },
    checksumUrl: checksum ? String(checksum.browser_download_url) : '',
  };
}

export function getReleaseUpdateState(release, installedVersion) {
  if (!release) return { available: false, invalid: true };
  const normalized = normalizeForkRelease(release);
  if (!normalized) return { available: false, invalid: true };
  return { ...normalized, available: compareVersions(normalized.version, installedVersion) > 0 };
}
