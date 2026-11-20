// Headless browser integration test for the title release updater. No Playwright dependency.
// Usage: node tools/tests/fork_release_browser.mjs [path-to-Edge-or-Chromium]
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
    window.__githubRequests = { commits: 0, manifests: 0 };
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
      if (url.startsWith('https://zethenzynx.github.io/Velscour-PC/version.json?')) {
        window.__githubRequests.manifests++;
        if (${JSON.stringify(mode)} === 'offline') return Promise.resolve(new Response('unavailable', { status: 503 }));
        return Promise.resolve(new Response(JSON.stringify(${payload}), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' }
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

const fixtureBytes = Buffer.from('A verified Velscour PC update package fixture.');
const sha = crypto.createHash('sha256').update(fixtureBytes).digest('hex');
const buildRelease = (version) => ({
  schema: 1,
  version,
  buildId: 'a'.repeat(40),
  downloadUrl: version === '0.0.0-dev' ? null : `https://github.com/ZethenZynx/Velscour-PC/releases/download/v${version}/velscour-pc-v${version}.zip`,
  sha256: version === '0.0.0-dev' ? null : sha,
  packageSize: version === '0.0.0-dev' ? null : fixtureBytes.length,
  checksumUrl: version === '0.0.0-dev' ? null : `https://github.com/ZethenZynx/Velscour-PC/releases/download/v${version}/velscour-pc-v${version}.zip.sha256`,
  releaseNotesUrl: `https://github.com/ZethenZynx/Velscour-PC/releases/tag/v${version}`,
  publishedAt: '2026-11-18T00:00:00Z',
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
  assert.equal(await evaluate('window.__githubRequests.manifests'), 1, 'manual title check does not query another manifest during the cache window');
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
  assert.match(updateDialog.text, /Installed:\s*0\.0\.0-dev/);
  assert.match(updateDialog.text, /Available:\s*0\.2\.0/);
  assert.match(updateDialog.href, /^https:\/\/github\.com\/ZethenZynx\/Velscour-PC\/releases\/download\//);
  assert.equal(updateDialog.checksum, sha);
  const verifyLocalFile = async (bytes) => evaluate("(()=>{const input=document.querySelector('.fork-update-file-input'), transfer=new DataTransfer(); transfer.items.add(new File([new Uint8Array(" + JSON.stringify(bytes) + ")], 'velscour-update.zip', {type:'application/zip'})); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); return true;})()");
  await verifyLocalFile([...fixtureBytes]);
  await waitFor("document.querySelector('.fork-update-verify-status')?.classList.contains('verified')");
  assert.match(await evaluate("document.querySelector('.fork-update-verify-status').textContent"), /safe to extract/i);
  await verifyLocalFile([...fixtureBytes].map((byte, i) => i === 0 ? byte ^ 1 : byte));
  await waitFor("document.querySelector('.fork-update-verify-status')?.classList.contains('verification-failed')");
  assert.match(await evaluate("document.querySelector('.fork-update-verify-status').textContent"), /Do not extract/i);
  assert.equal(await evaluate('window.__githubRequests.manifests'), 1, 'the updater does not query the GitHub API');
  console.log('PASS: Static fork manifest offers a direct package link and only a verified local ZIP is approved for extraction.');

  await reload('no-release', buildRelease('0.0.0-dev'));
  await waitFor("document.querySelector('.title-changes .recent-change-entry strong')?.textContent === 'Align altar collision with marked base point'");
  assert.equal(await evaluate("document.querySelector('.fork-update-btn').classList.contains('hidden')"), true, 'empty release list keeps the update notice hidden');
  assert.equal(await evaluate('window.__githubRequests.manifests'), 1, 'the current manifest is fetched once');
  await evaluate("import('/src/ui/screens.js').then(module => module.titleScreen())");
  await waitFor("document.querySelectorAll('.title-changes').length === 1");
  assert.equal(await evaluate('window.__githubRequests.manifests'), 1, 'reopening title screen reuses the cached current-version result');
  console.log('PASS: A current static manifest hides the update notice without release/API lookups.');

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

  const endgameTown = await evaluate(`(async () => {
    const { game } = window.VELSCOUR;
    const [{ G }, { campaignVictoryRecorded, unlockEndgame, resetEndgameCache }, { Heresies }, { Vendor }] = await Promise.all([
      import('/src/state.js'), import('/src/game/endgame.js'), import('/src/ui/heresies.js'), import('/src/ui/vendor.js')
    ]);
    const character = G.char;
    character.depth = 101; character.level = 100; character.cleared ||= {}; character.cleared[100] = true;
    await game.enterTown();
    const before = {
      unlocked: campaignVictoryRecorded(),
      altarVisible: G.world.npcs.some((n) => n.altar),
      merchantVisible: G.world.npcs.some((n) => n.vendor?.id === 'infernal'),
      altarOpened: Heresies.open(),
      merchantOpened: Vendor.open('infernal'),
    };
    before.altarPanel = !!document.querySelector('.heresy-panel');
    before.merchantPanel = !!document.querySelector('.vendor-panel');
    await game.enterAct2Town();
    before.act2AltarVisible = G.world.npcs.some((n) => n.altar);
    before.act2MerchantVisible = G.world.npcs.some((n) => n.vendor?.id === 'infernal');
    unlockEndgame();
    resetEndgameCache();
    const persisted = campaignVictoryRecorded();
    await game.enterAct2Town();
    const act2After = {
      altarVisible: G.world.npcs.some((n) => n.altar),
      merchantVisible: G.world.npcs.some((n) => n.vendor?.id === 'infernal'),
    };
    await game.enterTown();
    const after = {
      persisted,
      altarVisible: G.world.npcs.some((n) => n.altar),
      merchantVisible: G.world.npcs.some((n) => n.vendor?.id === 'infernal'),
      otherVendors: G.world.npcs.filter((n) => n.vendor && n.vendor.id !== 'infernal').length,
      altarOpened: Heresies.open(),
      altarPanel: !!document.querySelector('.heresy-panel'),
    };
    Heresies.close();
    after.merchantOpened = Vendor.open('infernal');
    after.merchantPanel = !!document.querySelector('.vendor-panel');
    return { before, after, act2After };
  })()`);
  assert.equal(endgameTown.before.unlocked, false, 'level 100 and depth 100 do not unlock campaign-gated town features');
  assert.equal(endgameTown.before.altarVisible, false, 'Altar of Heresy is absent from town before the campaign clear');
  assert.equal(endgameTown.before.merchantVisible, false, 'Malakor is absent from town before the campaign clear');
  assert.equal(endgameTown.before.altarOpened, false, 'alternate Altar of Heresy UI path is blocked before the campaign clear');
  assert.equal(endgameTown.before.merchantOpened, false, 'direct Malakor vendor opening is blocked before the campaign clear');
  assert.equal(endgameTown.before.altarPanel, false, 'Altar of Heresy panel remains closed while locked');
  assert.equal(endgameTown.before.merchantPanel, false, 'merchant panel remains closed while locked');
  assert.equal(endgameTown.before.act2AltarVisible, false, 'Altar of Heresy is hidden in Act II before the campaign clear');
  assert.equal(endgameTown.before.act2MerchantVisible, false, 'Malakor is hidden in Act II before the campaign clear');
  assert.equal(endgameTown.after.persisted, true, 'the existing campaign-clear flag persists after reloading its cached state');
  assert.equal(endgameTown.after.altarVisible, true, 'the Altar of Heresy appears after the campaign clear');
  assert.equal(endgameTown.after.merchantVisible, true, 'Malakor appears after the campaign clear');
  assert.equal(endgameTown.act2After.altarVisible, true, 'Altar of Heresy appears in Act II after the campaign clear');
  assert.equal(endgameTown.act2After.merchantVisible, true, 'Malakor appears in Act II after the campaign clear');
  assert.ok(endgameTown.after.otherVendors > 0, 'other town vendors remain available');
  assert.equal(endgameTown.after.altarOpened, true, 'the unlocked Altar of Heresy still opens');
  assert.equal(endgameTown.after.altarPanel, true, 'the unlocked Altar of Heresy panel renders');
  assert.equal(endgameTown.after.merchantOpened, true, 'the unlocked Malakor vendor still opens');
  assert.equal(endgameTown.after.merchantPanel, true, 'Malakor trading panel renders after unlock');
  console.log('PASS: Altar and Malakor remain hidden and inaccessible at level/depth 100 until the saved Velscour defeat flag is set.');

  const breachState = await evaluate(`(async () => {
    const { G, game } = window.VELSCOUR;
    const errorsBefore = window.__forkUpdaterBrowserErrors.length;
    await game.newChar('paladin', 'Breach Floor One Regression');
    const floors = [];
    for (const [index, floor] of [1, 6, 11, 16, 21].entries()) {
      game.buildBreach(floor, 481516 + index * 7919);
      const w = G.world, run = w?.overworldScenario;
      floors.push({ floor: w?.breach?.floor, objectiveCount: run?.hud?.total, islandCount: w?.breachBridges ? w?.map?.breach?.own && new Set(w.map.breach.own.filter((id) => id >= 0)).size : 0 });
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await game.enterTown();
    game.buildBreach(1, 819855);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const finalWorld = G.world;
    return { floors, reentered: finalWorld?.breach?.floor === 1, errors: window.__forkUpdaterBrowserErrors.slice(errorsBefore) };
  })()`);
  assert.deepEqual(breachState.floors.map(({ floor, objectiveCount }) => [floor, objectiveCount]), [[1, 1], [6, 2], [11, 3], [16, 4], [21, 5]],
    'live Eternal Breach runs expose the expected progressive objective counts');
  assert.equal(breachState.reentered, true, 'returning to town and entering the zero-ward early Breach floor again succeeds');
  assert.deepEqual(breachState.errors, [], 'live world updates across Breach tiers produce no null-reference exceptions');
  console.log('PASS: Live Breach world updates run across all objective tiers and after town re-entry without browser errors.');

  const breachSave = await evaluate(`(async () => {
    const { G, game } = window.VELSCOUR;
    game.autosave();
    const { listSaves } = await import('/src/game/save.js');
    const id = G.char.id, saved = listSaves().find((entry) => entry.id === id);
    if (!saved) return { found: false };
    await game.loadChar(saved);
    const loaded = G.char?.id === id;
    game.buildBreach(1, 1357911);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { found: true, loaded, floor: G.world?.breach?.floor, errors: window.__forkUpdaterBrowserErrors };
  })()`);
  assert.equal(breachSave.found, true, 'the Breach test character was written to browser save storage');
  assert.equal(breachSave.loaded, true, 'a saved character reloads before re-entering the Breach');
  assert.equal(breachSave.floor, 1, 'the reloaded character can enter the zero-ward early Breach floor');
  assert.deepEqual(breachSave.errors, [], 'save/load and re-entry produce no browser exceptions');
  console.log('PASS: Character save/load and Eternal Breach re-entry preserve stable runtime state.');
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
