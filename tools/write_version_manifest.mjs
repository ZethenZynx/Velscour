// Release workflow helper: atomically write the latest version manifest without downgrading it.
import fs from 'node:fs';
import path from 'node:path';
import { compareVersions } from '../src/data/fork-release.js';

const [, , manifestPath, version, buildId, downloadUrl, sha256, sizeText, checksumUrl, publishedAt = ''] = process.argv;
if (!manifestPath || !version || !buildId || !downloadUrl || !/^[a-f\d]{64}$/i.test(sha256 || '') || !/^\d+$/.test(sizeText || '')) {
  throw new Error('Usage: node tools/write_version_manifest.mjs <path> <version> <build-id> <download-url> <sha256> <size-bytes> <checksum-url> [published-at]');
}
const absolute = path.resolve(manifestPath);
const versionPattern = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;
if (!versionPattern.test(version)) throw new Error('Release version must be semantic version format.');
const releasePrefix = 'https://github.com/ZethenZynx/Velscour-PC/releases/download/v' + version + '/';
if (!downloadUrl.startsWith(releasePrefix) || !downloadUrl.endsWith('.zip')) throw new Error('Update URL must point to this fork’s versioned ZIP release.');
if (!checksumUrl.startsWith(releasePrefix) || !checksumUrl.endsWith('.zip.sha256')) throw new Error('Checksum URL must point to this fork’s versioned SHA-256 file.');
const size = Number(sizeText);
if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Package size must be a positive safe integer.');

let previous = null;
try { previous = JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous?.version && compareVersions(previous.version, version) >= 0) {
  console.log('Manifest left unchanged: it already contains this version or a newer one.');
  process.exit(0);
}
const manifest = {
  schema: 1,
  version,
  buildId,
  downloadUrl,
  sha256: sha256.toLowerCase(),
  packageSize: size,
  checksumUrl,
  releaseNotesUrl: 'https://github.com/ZethenZynx/Velscour-PC/releases/tag/v' + version,
  publishedAt: publishedAt || new Date().toISOString(),
};
fs.mkdirSync(path.dirname(absolute), { recursive: true });
const tmp = absolute + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
fs.renameSync(tmp, absolute);
console.log('Wrote version manifest for v' + version + ' (' + buildId + ').');
