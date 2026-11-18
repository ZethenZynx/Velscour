// Browser integration test for the PC game's offline interactive message window.
// Usage: node tools/tests/chat_window_browser.mjs [path-to-Edge-or-Chromium]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browserPath = process.argv[2] || process.env.CHROMIUM_PATH || (process.platform === 'win32'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '/usr/bin/chromium');
assert.ok(fs.existsSync(browserPath), `Browser executable not found: ${browserPath}`);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end('Not found');
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

let edge, socket, commandId = 0;
const replies = new Map();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'velscour-chat-browser-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function send(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { replies.delete(id); reject(new Error(`Timed out waiting for ${method}`)); }, 15000);
    replies.set(id, (message) => { clearTimeout(timer); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser expression failed');
  return result.result?.value;
}
async function waitFor(expression) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { try { if (await evaluate(expression)) return; } catch (_) { /* page still loading */ } await sleep(200); }
  throw new Error(`Browser condition timed out: ${expression}`);
}
async function flushChat() { await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); }
async function mouse(x, y, type, button = 'left', held = false) {
  await send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mousePressed' || held ? 1 : 0, clickCount: 1 });
}

try {
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve()));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  edge = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100 && !fs.existsSync(portFile); attempt++) await sleep(100);
  assert.ok(fs.existsSync(portFile), 'Headless browser did not start');
  const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (message.id && replies.has(message.id)) replies.get(message.id)(message); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.VELSCOUR_TEST_MENU=true; window.__chatErrors=[]; addEventListener('error',e=>__chatErrors.push(String(e.error?.stack||e.message))); addEventListener('unhandledrejection',e=>__chatErrors.push(String(e.reason?.stack||e.reason)));` });
  await send('Page.navigate', { url: `${baseUrl}/index.html` });
  await waitFor("window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden')");
  const startGame = "(async()=>{const {game}=await import('/src/game/game.js');const S=await import('/src/game/save.js');game.startChar(S.newCharData('paladin','ChatBrowserTest'),false)})()";
  await evaluate(startGame);
  await waitFor("document.querySelector('#game-chat') && !document.querySelector('#game-chat').classList.contains('hidden')");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-tab').length"), 7, 'offline mode exposes supported gameplay tabs while hiding Debug by default');
  assert.equal(await evaluate("document.querySelector('.gc-footnote').textContent.includes('unavailable offline')"), true, 'offline multiplayer availability is explicit');
  const priorRows = await evaluate("document.querySelectorAll('#game-chat .gc-message').length");
  const priorLogRows = await evaluate("document.querySelector('#log').children.length");
  await evaluate("(async()=>{(await import('/src/ui/ui.js')).UI.log('Browser test system message', '#ffe2a0')})()");
  await flushChat();
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length"), priorRows + 1, 'existing UI.log messages appear once in chat');
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message span').length"), priorRows + 1, 'every chat row has one message body');
  assert.equal(await evaluate("document.querySelector('#log').children.length"), Math.min(6, priorLogRows + 1), 'original transient log remains intact and keeps its six-message cap');
  assert.equal(await evaluate("document.body.classList.contains('game-chat-enabled') && getComputedStyle(document.querySelector('#log')).display === 'none'"), true, 'legacy log stays permanently hidden while chat is enabled');

  const initial = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()");
  const drag = await evaluate("(()=>{const r=document.querySelector('.gc-drag-handle').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await mouse(drag.x, drag.y, 'mouseMoved'); await mouse(drag.x, drag.y, 'mousePressed'); await mouse(drag.x + 75, drag.y + 42, 'mouseMoved', 'left', true); await mouse(drag.x + 75, drag.y + 42, 'mouseReleased');
  const moved = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}})()");
  assert.ok(moved.left > initial.left + 50 && moved.top > initial.top + 20, 'window drags from its header');
  const corner = await evaluate("(()=>{const r=document.querySelector('#gc-resize-handle').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await mouse(corner.x, corner.y, 'mouseMoved'); await mouse(corner.x, corner.y, 'mousePressed'); await mouse(corner.x + 65, corner.y + 35, 'mouseMoved', 'left', true); await mouse(corner.x + 65, corner.y + 35, 'mouseReleased');
  const resized = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return {width:r.width,height:r.height}})()");
  assert.ok(resized.width > moved.width + 30 && resized.height > moved.height + 15, 'bottom-right handle resizes window');
  const dragAgain = await evaluate("(()=>{const r=document.querySelector('.gc-drag-handle').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await mouse(dragAgain.x, dragAgain.y, 'mouseMoved'); await mouse(dragAgain.x, dragAgain.y, 'mousePressed'); await mouse(dragAgain.x + 4000, dragAgain.y + 4000, 'mouseMoved', 'left', true); await mouse(dragAgain.x + 4000, dragAgain.y + 4000, 'mouseReleased');
  assert.equal(await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})()"), true, 'window cannot be dragged outside the visible game area');

  await evaluate("document.querySelector('.gc-pin').click()");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).pinned"), true, 'pin state persists');
  const savedGeometry = await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1'))");
  await send('Page.navigate', { url: `${baseUrl}/index.html` });
  await waitFor("window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden')");
  await evaluate(startGame);
  await waitFor("document.querySelector('#game-chat') && !document.querySelector('#game-chat').classList.contains('hidden')");
  const restoredGeometry = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();const p=JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1'));return {left:r.left,top:r.top,width:r.width,height:r.height,pinned:p.pinned}})()");
  for (const key of ['left', 'top', 'width', 'height']) assert.ok(Math.abs(restoredGeometry[key] - savedGeometry[key]) < 2, `saved ${key} restores after reload`);
  assert.equal(restoredGeometry.pinned, true, 'pin state restores after reload');
  await evaluate("document.querySelector('.gc-filter-toggle').click()");
  const rowsBeforeFilter = await evaluate("document.querySelectorAll('#game-chat .gc-message').length");
  await evaluate("document.querySelector('[data-category=\"system.notification\"]').click()");
  assert.equal(await evaluate("![...document.querySelectorAll('#game-chat .gc-message span')].some(x=>x.textContent.includes('Browser test system message'))"), true, 'structured per-category filter hides its messages while preserving other categories');
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).filters.all['system.notification']"), false, 'filter preference persists independently');
  await evaluate("document.querySelector('[data-category=\"system.notification\"]').click()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length>0 && JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).filters.all['system.notification']===true"), true, 'restored category filter shows matching system history and persists');
  await evaluate("document.querySelector('.gc-settings').click()");
  assert.equal(await evaluate("!document.querySelector('.gc-settings-panel').classList.contains('hidden')"), true, 'settings dialog opens');
  await evaluate("document.querySelector('[data-pref=opacity]').value=55;document.querySelector('[data-pref=opacity]').dispatchEvent(new Event('change',{bubbles:true}))");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).opacity"), 55, 'appearance setting persists');
  await evaluate("document.querySelector('[data-action=both]').click()");
  assert.equal(await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return Math.abs(r.width-370)<1&&Math.abs(r.height-310)<1&&Math.abs(r.left-14)<1})()"), true, 'reset position and size restores actual defaults');
  await evaluate("document.querySelector('[data-close]').click()");
  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');UI.event({category:'combat.damageDealt',text:'You hit Skeleton for 17 fire damage.',meta:{data:{amount:17,type:'fire'}}});UI.event({category:'combat.enemyDeath',text:'Skeleton was slain.'})})()");
  await flushChat();
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length>0"), true, 'structured combat events enter the shared history');
  assert.equal(await evaluate("document.querySelector('.gc-stat-values').textContent.includes('Damage dealt 17') && document.querySelector('.gc-stat-values').textContent.includes('kills 1')"), true, 'combat totals reflect the event amounts and kill count');
  await evaluate("document.querySelector('[data-tab=combat]').click()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length>=2"), true, 'Combat tab shows categorized combat events');
  await evaluate("document.querySelector('.gc-search').value='Skeleton was slain';document.querySelector('.gc-search').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length"), 1, 'history search filters the current tab');
  await evaluate("document.querySelector('.gc-search').value='';document.querySelector('.gc-search').dispatchEvent(new Event('input',{bubbles:true}))");
  await evaluate("document.querySelector('.gc-settings').click();document.querySelector('[data-action=tabs]').click();document.querySelector('.gc-custom-name').value='Boss Encounters';document.querySelector('.gc-custom-add').click()");
  assert.equal(await evaluate("[...document.querySelectorAll('.gc-tab')].some(x=>x.textContent==='Boss Encounters')"), true, 'custom tab creation adds a filtered view');
  assert.equal(await evaluate("document.querySelectorAll('.gc-custom-cats input').length>0"), true, 'custom tabs can select supported message categories');
  await evaluate("document.querySelector('.gc-settings-back').click();document.querySelector('[data-close]').click()");
  await evaluate("document.querySelector('.gc-settings').click();document.querySelector('[data-pref=grouping]').checked=true;document.querySelector('[data-pref=grouping]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-close]').click()");
  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');UI.event({category:'system.notification',text:'Grouped notification'});UI.event({category:'system.notification',text:'Grouped notification'})})()");
  await flushChat();
  await evaluate("document.querySelector('[data-tab=all]').click();document.querySelector('.gc-preset').value='All Messages';document.querySelector('.gc-preset').dispatchEvent(new Event('change',{bubbles:true}))");
  assert.equal(await evaluate("[...document.querySelectorAll('.gc-message span')].some(x=>x.textContent.includes('Grouped notification ×2'))"), true, 'exact duplicate notifications group without merging distinct damage');
  await evaluate("window.__exportCapture=null;const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.__exportCapture={name:this.download,href:this.href};};document.querySelector('.gc-export').click();HTMLAnchorElement.prototype.click=old");
  assert.equal(await evaluate("window.__exportCapture?.name==='velscour-game-log.txt'&&window.__exportCapture.href.startsWith('blob:')"), true, 'history export creates a text download');
  await evaluate("document.querySelector('.gc-search').value='Grouped notification';document.querySelector('.gc-search').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.gc-clear').click()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length===0"), true, 'clear view removes the currently visible history records');
  await evaluate("document.querySelector('.gc-search').value='';document.querySelector('.gc-search').dispatchEvent(new Event('input',{bubbles:true}))");

  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');for(let i=0;i<45;i++)UI.log('History item '+i)})()");
  await flushChat();
  await flushChat();
  await evaluate("document.querySelector('.gc-message-list').scrollTop=0");
  await flushChat();
  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');UI.log('Unread marker item')})()");
  await flushChat();
  assert.equal(await evaluate("!document.querySelector('.gc-unread').classList.contains('hidden')"), true, 'new arrivals show an unread indicator when reading older messages');
  await evaluate("document.querySelector('.gc-unread').click()");
  assert.equal(await evaluate("document.querySelector('.gc-unread').classList.contains('hidden')"), true, 'unread indicator jumps to newest messages');

  await evaluate("document.querySelector('.gc-pin').click()");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).pinned"), false, 'window can be unpinned');
  await evaluate("document.activeElement.blur()");
  await mouse(960, 40, 'mouseMoved');
  await sleep(7200);
  const fadeDebug = await evaluate("(()=>({classes:document.querySelector('#game-chat').className,active:document.activeElement?.className,hover:document.querySelector('#game-chat').matches(':hover'),prefs:JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1'))}))()");
  assert.equal(await evaluate("document.querySelector('#game-chat').classList.contains('gc-faded')"), true, `un-pinned inactive window fades away: ${JSON.stringify(fadeDebug)}`);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#log')).display === 'none'"), true, 'legacy log stays hidden after chat fades');
  await evaluate("document.querySelector('.gc-pin').click()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('gc-faded')"), true, 'Enter reopens faded chat');
  await sleep(5800);
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('gc-faded')"), true, 'pinned window stays visible');

  await evaluate("document.querySelector('.gc-minimize').click()");
  assert.equal(await evaluate("document.querySelector('#game-chat').classList.contains('hidden') && !document.querySelector('#game-chat-launcher').classList.contains('hidden') && getComputedStyle(document.querySelector('#log')).display === 'none'"), true, 'minimize preserves the old-log suppression and exposes a reopen button');
  await evaluate("document.querySelector('#game-chat-launcher').click()");
  await evaluate("document.activeElement.blur()");
  const chatCenter = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await mouse(chatCenter.x, chatCenter.y, 'mouseMoved');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  assert.equal(await evaluate("(async()=> (await import('/src/core/input.js')).input.down('KeyW'))()"), false, 'movement key over chat does not enter gameplay input');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('hidden') && getComputedStyle(document.querySelector('#log')).display === 'none'"), true, 'Escape leaves chat visible while reaching normal game menu handling');
  await evaluate("document.activeElement.blur()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('hidden') && document.activeElement===document.querySelector('.gc-message-list')"), true, 'Enter opens the log and focuses its keyboard-accessible history');

  await send('Page.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('#game-chat-launcher').click()");
  const bounds = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})()");
  assert.equal(bounds, true, 'window remains within a second desktop resolution');
  assert.deepEqual(await evaluate('window.__chatErrors'), [], 'running game has no uncaught JavaScript errors');
  console.log('PASS: offline chat window displays the existing log, filters, scrolls, marks unread messages, drags, resizes, remembers settings, fades, pins, minimizes, and stays out of gameplay input.');
} finally {
  socket?.close();
  if (edge && edge.exitCode === null) { const exited = new Promise((resolve) => edge.once('exit', resolve)); edge.kill(); await Promise.race([exited, sleep(3000)]); }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* browser may still be releasing its profile */ }
}
