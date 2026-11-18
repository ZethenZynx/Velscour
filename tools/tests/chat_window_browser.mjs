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
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-tab').length"), 2, 'offline mode exposes only All and System channels');
  assert.equal(await evaluate("document.querySelector('#game-chat .gc-offline-note').textContent.includes('unavailable offline')"), true, 'multiplayer availability is explicit');
  const priorRows = await evaluate("document.querySelectorAll('#game-chat .gc-message').length");
  const priorLogRows = await evaluate("document.querySelector('#log').children.length");
  await evaluate("(async()=>{(await import('/src/ui/ui.js')).UI.log('Browser test system message', '#ffe2a0')})()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length"), priorRows + 1, 'existing UI.log messages appear once in chat');
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message span').length"), priorRows + 1, 'every chat row has one message body');
  assert.equal(await evaluate("document.querySelector('#log').children.length"), Math.min(6, priorLogRows + 1), 'original transient log remains intact and keeps its six-message cap');
  assert.equal(await evaluate("document.body.classList.contains('game-chat-expanded') && getComputedStyle(document.querySelector('#log')).visibility === 'hidden'"), true, 'expanded chat avoids visually duplicating the transient log');

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
  await evaluate("document.querySelector('.gc-system-filter').click()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length"), 0, 'System filter hides logged messages');
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).includeSystem"), false, 'filter preference persists');
  await evaluate("document.querySelector('.gc-system-filter').click()");
  assert.equal(await evaluate("document.querySelectorAll('#game-chat .gc-message').length"), 1, 'System filter restores messages');

  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');for(let i=0;i<45;i++)UI.log('History item '+i)})()");
  await evaluate("document.querySelector('.gc-message-list').scrollTop=0");
  await evaluate("(async()=>{const {UI}=await import('/src/ui/ui.js');UI.log('Unread marker item')})()");
  assert.equal(await evaluate("!document.querySelector('.gc-unread').classList.contains('hidden')"), true, 'new arrivals show an unread indicator when reading older messages');
  await evaluate("document.querySelector('.gc-unread').click()");
  assert.equal(await evaluate("document.querySelector('.gc-unread').classList.contains('hidden')"), true, 'unread indicator jumps to newest messages');

  await evaluate("document.querySelector('.gc-pin').click()");
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('velscour.pc.chat-window.v1')).pinned"), false, 'window can be unpinned');
  await mouse(960, 40, 'mouseMoved');
  await sleep(6100);
  assert.equal(await evaluate("document.querySelector('#game-chat').classList.contains('gc-faded')"), true, 'un-pinned inactive window fades away');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#log')).visibility === 'visible'"), true, 'transient log returns after the chat fades');
  await evaluate("document.querySelector('.gc-pin').click()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('gc-faded')"), true, 'Enter reopens faded chat');
  await sleep(5800);
  assert.equal(await evaluate("!document.querySelector('#game-chat').classList.contains('gc-faded')"), true, 'pinned window stays visible');

  await evaluate("document.querySelector('.gc-minimize').click()");
  assert.equal(await evaluate("document.querySelector('#game-chat').classList.contains('hidden') && !document.querySelector('#game-chat-launcher').classList.contains('hidden') && getComputedStyle(document.querySelector('#log')).visibility === 'visible'"), true, 'minimize returns control to the original log and exposes a reopen button');
  await evaluate("document.querySelector('#game-chat-launcher').click()");
  await evaluate("document.activeElement.blur()");
  const chatCenter = await evaluate("(()=>{const r=document.querySelector('#game-chat').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
  await mouse(chatCenter.x, chatCenter.y, 'mouseMoved');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  assert.equal(await evaluate("(async()=> (await import('/src/core/input.js')).input.down('KeyW'))()"), false, 'movement key over chat does not enter gameplay input');
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate("document.querySelector('#game-chat').classList.contains('hidden')"), true, 'Escape minimizes/unfocuses chat without reaching gameplay');
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
