// Headless browser integration test for the title release updater. No Playwright dependency.
// Usage: node tools/tests/fork_release_browser.mjs [path-to-Edge-or-Chromium]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browserPath = process.argv[2] || process.env.CHROMIUM_PATH || (process.platform === 'win32'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : '/usr/bin/chromium');
assert.ok(fs.existsSync(browserPath), `Browser executable not found: ${browserPath}`);

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

let edge, socket, commandId = 0;
const replies = new Map();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'velscour-release-browser-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { replies.delete(id); reject(new Error(`Timed out waiting for ${method}`)); }, 15000);
    replies.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser expression failed');
  return result.result?.value;
}

async function waitFor(expression) {
  const deadline = Date.now() + 20000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      if (await evaluate(expression)) return;
    } catch (error) { lastError = error.message; }
    await sleep(200);
  }
  throw new Error(`Browser condition timed out${lastError ? ` (${lastError})` : ''}`);
}

function fakeFetchScript(mode, release) {
  const payload = JSON.stringify(release);
  return `(() => {
    window.VELSCOUR_TEST_MENU = true;
    window.__forkUpdaterBrowserErrors = [];
    window.addEventListener('error', (event) => { if (event.error) window.__forkUpdaterBrowserErrors.push(String(event.error.stack || event.error)); });
    window.addEventListener('unhandledrejection', (event) => window.__forkUpdaterBrowserErrors.push(String(event.reason?.stack || event.reason)));
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api.github.com/repos/ZethenZynx/Velscour-PC/releases/latest') {
        if (${JSON.stringify(mode)} === 'offline') return Promise.resolve(new Response('unavailable', { status: 503 }));
        return Promise.resolve(new Response(${JSON.stringify(mode)} === 'no-release' ? '{}' : JSON.stringify(${payload}), {
          status: ${JSON.stringify(mode)} === 'no-release' ? 404 : 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return originalFetch(input, options);
    };
  })();`;
}

async function installResponse(mode, release) {
  if (globalThis.injectedScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: globalThis.injectedScript });
  const result = await send('Page.addScriptToEvaluateOnNewDocument', { source: fakeFetchScript(mode, release) });
  globalThis.injectedScript = result.identifier;
}

async function reload(mode, release) {
  await installResponse(mode, release);
  await send('Page.navigate', { url: `${globalThis.baseUrl}/index.html` });
  await sleep(250);
  await waitFor("document.querySelector('.title-screen') && [...document.querySelectorAll('.title-menu button')].some(button => button.textContent.includes('Check for Updates'))");
}

const sha = 'a'.repeat(64);
const buildRelease = (version) => ({
  tag_name: `v${version}`,
  name: `Velscour PC ${version}`,
  body: 'A fork-only test release with readable update notes.',
  html_url: `https://github.com/ZethenZynx/Velscour-PC/releases/tag/v${version}`,
  published_at: '2026-11-18T00:00:00Z',
  assets: [
    { name: `velscour-pc-v${version}.zip`, size: 8192, digest: `sha256:${sha}`, browser_download_url: `https://github.com/ZethenZynx/Velscour-PC/releases/download/v${version}/velscour-pc-v${version}.zip` },
    { name: `velscour-pc-v${version}.zip.sha256`, browser_download_url: `https://github.com/ZethenZynx/Velscour-PC/releases/download/v${version}/velscour-pc-v${version}.zip.sha256` },
  ],
});

try {
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve()));
  globalThis.baseUrl = `http://127.0.0.1:${server.address().port}`;
  edge = spawn(browserPath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  const activePortFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100 && !fs.existsSync(activePortFile); attempt++) await sleep(100);
  assert.ok(fs.existsSync(activePortFile), 'Headless browser did not start its debugging endpoint');
  const port = Number(fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]);
  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const target = await targetResponse.json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && replies.has(message.id)) replies.get(message.id)(message);
  });
  await send('Page.enable');
  await send('Runtime.enable');

  await reload('release', buildRelease('0.0.0-dev'));
  assert.equal(await evaluate("document.querySelector('.fork-update-btn').classList.contains('hidden')"), true, 'button stays hidden when up to date');
  await evaluate("[...document.querySelectorAll('.title-menu button')].find(button => button.textContent.includes('Check for Updates')).click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.toLowerCase().includes('up to date')");
  console.log('PASS: Title screen hides the release button when current and manual checking reports up to date.');

  await reload('release', buildRelease('0.2.0'));
  await waitFor("!document.querySelector('.fork-update-btn').classList.contains('hidden')");
  await evaluate("document.querySelector('.fork-update-btn').click()");
  await waitFor("document.querySelector('.fork-update-dialog')?.textContent.includes('Download Update ZIP')");
  const updateDialog = await evaluate("({ text: document.querySelector('.fork-update-dialog').textContent, href: document.querySelector('.fork-update-download').href, checksum: document.querySelector('.fork-update-hash code').textContent })");
  assert.match(updateDialog.text, /Installed:\s*Development build \(0\.0\.0-dev\)/);
  assert.match(updateDialog.text, /Available:\s*0\.2\.0/);
  assert.match(updateDialog.href, /^https:\/\/github\.com\/ZethenZynx\/Velscour-PC\/releases\/download\//);
  assert.equal(updateDialog.checksum, sha);
  console.log('PASS: New fork release reveals the title button and opens verified release details and fork-only ZIP link.');

  await reload('offline');
  assert.equal(await evaluate("!!document.querySelector('.title-screen') && [...document.querySelectorAll('.title-menu button')].some(button => button.textContent.includes('Check for Updates'))"), true, 'game title remains usable after a failed release request');
  await evaluate("[...document.querySelectorAll('.title-menu button')].find(button => button.textContent.includes('Check for Updates')).click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.includes('Update Check Failed')");
  const browserErrors = await evaluate('window.__forkUpdaterBrowserErrors');
  assert.deepEqual(browserErrors, [], 'the running game and release updater should not emit unhandled JavaScript errors');
  console.log('PASS: Failed network check leaves the playable title screen available and reports a clear error on manual check.');
} finally {
  socket?.close();
  if (edge && edge.exitCode === null) {
    const exited = new Promise((resolve) => edge.once('exit', resolve));
    edge.kill();
    await Promise.race([exited, sleep(3000)]);
  }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* Windows may still release a browser profile shortly after exit. */ }
}
