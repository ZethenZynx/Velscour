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
    window.__githubRequests = { commits: 0, releases: 0 };
    window.addEventListener('error', (event) => { if (event.error) window.__forkUpdaterBrowserErrors.push(String(event.error.stack || event.error)); });
    window.addEventListener('unhandledrejection', (event) => window.__forkUpdaterBrowserErrors.push(String(event.reason?.stack || event.reason)));
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://api.github.com/repos/ZethenZynx/Velscour-PC/commits?sha=main&per_page=100') {
        window.__githubRequests.commits++;
        if (${JSON.stringify(mode)} === 'offline') return Promise.resolve(new Response('unavailable', { status: 503 }));
        const update = ${JSON.stringify(mode)} === 'main-update';
        return Promise.resolve(new Response(JSON.stringify([{
          sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          html_url: 'https://github.com/ZethenZynx/Velscour-PC/commit/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          author: { login: 'ZethenZynx' },
          commit: { author: { name: 'Velscour Test', date: update ? '2026-11-19T12:00:00Z' : '2026-11-17T12:00:00Z' }, message: update ? 'Fix main branch update notification\\n\\nReport changes committed directly to the Velscour PC main branch.' : 'Align altar collision with marked base point\\n\\nMove the altar collision from the front of the floor seal to the lower-center stone base.' }
        }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url === 'https://api.github.com/repos/ZethenZynx/Velscour-PC/releases/latest') {
        window.__githubRequests.releases++;
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
  try { await evaluate("localStorage.removeItem('velscour_recent_commits_v1'); localStorage.removeItem('velscour_recent_commits_retry_at_v1')"); } catch (_) { /* first navigation is still about:blank */ }
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
  await waitFor("document.querySelector('.title-changes .recent-change-entry strong')?.textContent === 'Align altar collision with marked base point'");
  await evaluate("document.querySelector('.title-screen').classList.add('title-lit')");
  await waitFor("parseFloat(getComputedStyle(document.querySelector('.title-changes')).opacity) > 0.99");
  const titlePanel = await evaluate(`(() => {
    const screen = document.querySelector('.title-screen');
    const panel = document.querySelector('.title-changes'), list = panel.querySelector('.recent-changes-list');
    const menu = document.querySelector('.title-menu'), p = panel.getBoundingClientRect(), m = menu.getBoundingClientRect();
    return { hidden: panel.hidden, opacity: getComputedStyle(panel).opacity, panelLeft: p.left, panelRight: p.right,
      panelTop: p.top, panelBottom: p.bottom, menuLeft: m.left, menuRight: m.right, menuTop: m.top, menuBottom: m.bottom,
      listOverflow: getComputedStyle(list).overflowY,
      triggerInMenu: [...menu.querySelectorAll('button')].some(button => button.textContent.includes('Recent Changes')) };
  })()`);
  assert.equal(titlePanel.hidden, false, 'Recent Changes panel is present automatically');
  assert.ok(Number(titlePanel.opacity) > 0.99, 'Recent Changes panel becomes visible with the title screen');
  assert.equal(titlePanel.triggerInMenu, false, 'no Recent Changes button remains in the menu');
  assert.equal(titlePanel.listOverflow, 'auto', 'history list is scrollable');
  assert.ok(titlePanel.panelLeft < 50 && titlePanel.panelRight < 450, 'Recent Changes stays on the left');
  assert.ok(titlePanel.panelRight <= titlePanel.menuLeft || titlePanel.panelBottom <= titlePanel.menuTop || titlePanel.menuBottom <= titlePanel.panelTop,
    'Recent Changes does not overlap the main menu');
  console.log('PASS: Recent Changes loads automatically in a scrollable left panel without a menu button or menu overlap.');
  await evaluate("[...document.querySelectorAll('.title-menu button')].find(button => button.textContent.includes('Check for Updates')).click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.includes('No New Game Update Found')");
  assert.ok(await evaluate('window.__githubRequests.commits') >= 2, 'manual title check requests the main-branch commit feed');
  assert.equal(await evaluate('window.__githubRequests.releases'), 1, 'manual title check does not query the release endpoint');
  console.log('PASS: Title screen hides the release button when current and manual checking reports up to date.');
  await evaluate("document.querySelector('.dialog-box button')?.click()");
  await evaluate("import('/src/ui/screens.js').then(module => module.titleScreen())");
  await waitFor("document.querySelectorAll('.title-changes').length === 1 && document.querySelector('.title-changes .recent-change-entry strong')?.textContent === 'Align altar collision with marked base point'");
  assert.ok(await evaluate('window.__githubRequests.commits') >= 2, 'returning to the title screen reuses the successful cache instead of requesting GitHub again');
  console.log('PASS: Returning to the title screen recreates one working Recent Changes panel using the cached feed.');

  await reload('main-update', buildRelease('0.0.0-dev'));
  await waitFor("!document.querySelector('.bundled-update-btn').classList.contains('hidden')");
  const mainUpdatePosition = await evaluate(`(() => { const notices = document.querySelector('.title-update-notices').getBoundingClientRect();
    const button = document.querySelector('.bundled-update-btn'), update = button.getBoundingClientRect();
    return { right: notices.right, top: notices.top, buttonTop: update.top, width: innerWidth, text: button.textContent }; })()`);
  assert.ok(mainUpdatePosition.right >= mainUpdatePosition.width - 30 && mainUpdatePosition.top < 40 && mainUpdatePosition.buttonTop >= mainUpdatePosition.top,
    'main-branch update notice appears in the top-right corner');
  assert.equal(mainUpdatePosition.text, 'Update Available');
  await evaluate("document.querySelector('.bundled-update-btn').click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.includes('Velscour Update Available')");
  await evaluate("[...document.querySelectorAll('.dialog-box button')].find(button => button.textContent.includes('Later')).click()");
  await evaluate("[...document.querySelectorAll('.title-menu button')].find(button => button.textContent.includes('Check for Updates')).click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.includes('Velscour Update Available')");
  console.log('PASS: New main-branch commit shows the top-right notice and both notice and menu open update details.');

  await reload('release', buildRelease('0.2.0'));
  await waitFor("!document.querySelector('.fork-update-btn').classList.contains('hidden')");
  const updatePosition = await evaluate(`(() => { const notices = document.querySelector('.title-update-notices').getBoundingClientRect();
    const release = document.querySelector('.fork-update-btn').getBoundingClientRect();
    return { right: notices.right, top: notices.top, releaseTop: release.top, width: innerWidth }; })()`);
  assert.ok(updatePosition.right >= updatePosition.width - 30 && updatePosition.top < 40 && updatePosition.releaseTop >= updatePosition.top,
    'release notification is anchored in the title screen top-right corner');
  await evaluate("document.querySelector('.fork-update-btn').click()");
  await waitFor("document.querySelector('.fork-update-dialog')?.textContent.includes('Download Update ZIP')");
  const updateDialog = await evaluate("({ text: document.querySelector('.fork-update-dialog').textContent, href: document.querySelector('.fork-update-download').href, checksum: document.querySelector('.fork-update-hash code').textContent })");
  assert.match(updateDialog.text, /Installed:\s*Development build \(0\.0\.0-dev\)/);
  assert.match(updateDialog.text, /Available:\s*0\.2\.0/);
  assert.match(updateDialog.href, /^https:\/\/github\.com\/ZethenZynx\/Velscour-PC\/releases\/download\//);
  assert.equal(updateDialog.checksum, sha);
  console.log('PASS: New fork release reveals the title button and opens verified release details and fork-only ZIP link.');

  await reload('offline', buildRelease('0.0.0-dev'));
  await waitFor("document.querySelector('.title-changes .recent-change-entry strong')?.textContent === 'Align altar collision with marked base point'");
  assert.ok(await evaluate("document.querySelector('.recent-changes-status').textContent.includes('included change history')"), 'offline first visit shows bundled history with a clear status');
  assert.equal(await evaluate("!!document.querySelector('.title-screen') && [...document.querySelectorAll('.title-menu button')].some(button => button.textContent.includes('Check for Updates'))"), true, 'game title remains usable after a failed release request');
  await evaluate("[...document.querySelectorAll('.title-menu button')].find(button => button.textContent.includes('Check for Updates')).click()");
  await waitFor("document.querySelector('.dialog-box')?.textContent.includes('Update Check Failed')");
  const browserErrors = await evaluate('window.__forkUpdaterBrowserErrors');
  assert.deepEqual(browserErrors, [], 'the running game and release updater should not emit unhandled JavaScript errors');
  console.log('PASS: Failed network check leaves the playable title screen available and reports a clear error on manual check.');

  await evaluate(`(async () => {
    const { game } = window.VELSCOUR;
    await game.newChar('paladin', 'Inventory Regression');
    const { toggleInventory } = await import('/src/ui/inventory.js');
    toggleInventory();
  })()`);
  await waitFor("document.querySelector('.inventory-panel .bag:not(.gem-bag) > .bslot') && document.querySelector('.inventory-panel .gem-bag > .bslot')");
  const inventoryCounts = await evaluate(`(() => ({ backpack: document.querySelectorAll('.inventory-panel .bag:not(.gem-bag) > .bslot').length,
    gems: document.querySelectorAll('.inventory-panel .gem-bag > .bslot').length,
    error: window.__forkUpdaterBrowserErrors[0] || '' }))()`);
  assert.equal(inventoryCounts.backpack, 60, 'new character Backpack slots render in the browser');
  assert.equal(inventoryCounts.gems, 30, 'new character Gem Bag slots render in the browser');
  assert.equal(inventoryCounts.error, '', 'inventory rendering introduces no browser exception');
  console.log('PASS: A new character opens the Backpack and renders its inventory and Gem Bag in the browser.');
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
