// Running-game check for labeled minimap event objects and their state changes.
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
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'velscour-event-labels-'));
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
  const until = Date.now() + 20000;
  while (Date.now() < until) { try { if (await evaluate(expression)) return; } catch (_) { /* page still loading */ } await sleep(200); }
  throw new Error(`Browser condition timed out: ${expression}`);
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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.VELSCOUR_TEST_MENU=true;window.__eventLabelErrors=[];addEventListener("error",e=>__eventLabelErrors.push(String(e.error?.stack||e.message)));addEventListener("unhandledrejection",e=>__eventLabelErrors.push(String(e.reason?.stack||e.reason)));' });
  await send('Page.navigate', { url: `${baseUrl}/index.html` });
  await waitFor("window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden')");
  await evaluate("(async()=>{const {game}=await import('/src/game/game.js');const S=await import('/src/game/save.js');game.startChar(S.newCharData('paladin','EventLabelTest'),false)})()");
  await waitFor("window.VELSCOUR && document.querySelector('#game-chat')");

  await evaluate(`(()=>{
    window.__eventLabelText=[];window.__eventLabelDraws=new Map();
    const fill=CanvasRenderingContext2D.prototype.fillText,draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(String(text).startsWith('TEST EVENT')||String(text)==='Treasure Cache'){window.__eventLabelText.push(String(text));this.canvas.__eventLabel=String(text)}return fill.call(this,text,...args)};
    CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLCanvasElement&&source.__eventLabel){window.__eventLabelDraws.set(source.__eventLabel,(window.__eventLabelDraws.get(source.__eventLabel)||0)+1)}return draw.call(this,source,...args)};
    return true;
  })()`);
  // Place one seen interactive event chest and one undiscovered one in view; these are test objects only.
  await evaluate(`(async()=>{
    const {G}=await import('/src/state.js');window.__eventTestWorld=G.world;
    const w=G.world,p=G.player,map=w.map;
    const x=p.x+1.5,y=p.y+1.5,idx=Math.floor(y)*map.w+Math.floor(x),cacheX=x+1.5,cacheY=y+0.5;
    const reveal=map.reveal;map.reveal=()=>{};
    const hidden={x:x+1,y:y+1,opened:false,hidden:true,dot:'#cf8fff',label:'TEST EVENT HIDDEN',use(){},draw(){}};
    const obj={x,y,opened:false,reach:1.5,dot:'#cf8fff',label:'TEST EVENT NAME',use(){},draw(){}};
    map.seen[idx]=0;map.seen[Math.floor(hidden.y)*map.w+Math.floor(hidden.x)]=0;
    const {addCache}=await import('/src/game/happenings.js');const cache=addCache(w,[cacheX,cacheY]);
    map.seen[Math.floor(cacheY)*map.w+Math.floor(cacheX)]=1;
    w.chests.push(hidden,obj);window.__eventTestChest=obj;window.__eventTestHidden=hidden;window.__eventTestCache=cache;window.__eventTestReveal=reveal;
  })()`);
  await sleep(600);
  assert.equal(await evaluate("window.__eventLabelText.includes('TEST EVENT NAME')"), false, 'unseen event markers do not reveal their labels');
  await waitFor("window.__eventLabelDraws.get('Treasure Cache')>0");
  const cacheDrawn = await evaluate("window.__eventLabelDraws.get('Treasure Cache')");
  await evaluate("window.__eventTestCache.opened=true"); await sleep(400);
  assert.equal(await evaluate("window.__eventLabelDraws.get('Treasure Cache')"), cacheDrawn, 'dynamically spawned treasure cache labels disappear when used');
  await evaluate(`(()=>{const w=window.__eventTestWorld,o=window.__eventTestChest;w.map.seen[Math.floor(o.y)*w.map.w+Math.floor(o.x)]=1})()`);
  await waitFor("window.__eventLabelDraws.get('TEST EVENT NAME')>0");
  assert.equal(await evaluate("window.__eventLabelText.includes('TEST EVENT HIDDEN')"), false, 'hidden event objects stay unlabeled');
  const drawn = await evaluate("window.__eventLabelDraws.get('TEST EVENT NAME')");
  await evaluate("window.__eventTestChest.opened=true"); await sleep(500);
  assert.equal(await evaluate("window.__eventLabelDraws.get('TEST EVENT NAME')"), drawn, 'label stops drawing immediately after the event object is consumed');

  await evaluate(`(()=>{let name='TEST EVENT PORTAL A';const portal={x:window.__eventTestWorld.player.x+2,y:window.__eventTestWorld.player.y,type:'objective',active:true,get label(){return name},use(){}};window.__eventTestPortal=portal;window.__setEventPortalName=(next)=>{name=next};window.__eventTestWorld.portals.push(portal)})()`);
  await waitFor("window.__eventLabelText.includes('TEST EVENT PORTAL A')");
  await evaluate("window.__setEventPortalName('TEST EVENT PORTAL B')");
  await waitFor("window.__eventLabelText.includes('TEST EVENT PORTAL B')");
  assert.deepEqual(await evaluate('window.__eventLabelErrors'), [], 'no running-game JavaScript errors');
  console.log('PASS: running game labels a discovered interactive event object, withholds hidden/unseen labels, removes consumed labels, and refreshes dynamic portal names.');
} finally {
  socket?.close();
  if (edge && edge.exitCode === null) { const exited = new Promise((resolve) => edge.once('exit', resolve)); edge.kill(); await Promise.race([exited, sleep(3000)]); }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* browser may still be releasing its profile */ }
}
