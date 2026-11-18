// Compare the synchronous work on the production UI.event -> Adventurer's Log path.
// Uses the same 1,500 structured hit events for each mode and records blocking time/long tasks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const browserPath=process.argv[2]||process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'/usr/bin/chromium');
assert.ok(fs.existsSync(browserPath),`Browser executable not found: ${browserPath}`);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,`.${name}`);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end('Not found');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
let edge,socket,seq=0;const pending=new Map(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'velscour-aoe-profile-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){const id=++seq;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out: ${method}`));},60000);pending.set(id,m=>{clearTimeout(timer);m.error?reject(new Error(m.error.message)):resolve(m.result);});});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'Browser evaluation failed');return r.result?.value;}
async function waitFor(expression){const until=Date.now()+30000;while(Date.now()<until){try{if(await evaluate(expression))return;}catch{}await sleep(200);}throw new Error(`Timed out waiting for ${expression}`);}

try{
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
 const base=`http://127.0.0.1:${server.address().port}`;
 edge=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
 const portPath=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(portPath);i++)await sleep(100);assert.ok(fs.existsSync(portPath),'Headless browser did not start');
 const port=Number(fs.readFileSync(portPath,'utf8').split(/\r?\n/)[0]),target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id))pending.get(m.id)(m);});
 await send('Page.enable');await send('Runtime.enable');await send('Page.navigate',{url:`${base}/index.html`});await waitFor("window.VELSCOUR&&document.querySelector('#loading').classList.contains('hidden')");
 const start="(async()=>{const {game}=await import('/src/game/game.js');const S=await import('/src/game/save.js');game.startChar(S.newCharData('paladin','AoEProfile'),false);game.update=()=>{}})()";await evaluate(start);await waitFor("document.querySelector('#game-chat') && !document.querySelector('#game-chat').classList.contains('hidden')");await evaluate("(async()=>{const {GameChat}=await import('/src/ui/chat.js');GameChat.unsubscribe?.()})()");await sleep(4000);
 await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Profiler.start');
 const results=await evaluate(`(async()=>{
   const {UI}=await import('/src/ui/ui.js');
   const {GameChat}=await import('/src/ui/chat.js');
   const events=Array.from({length:1500},(_,i)=>({category:'combat.damageDealt',text:'You hit target '+i+' for 174 fire damage.',meta:{data:{amount:174,type:'fire'}}}));
   const rows=[];
   async function run(name,prepare){
     GameChat.unsubscribe?.();GameChat.unsubscribe=UI.onLog((text,color,meta)=>GameChat.addMessage(text,color,meta));
     GameChat.addMessage=(GameChat.__originalAdd||GameChat.addMessage).bind(GameChat);GameChat.__originalAdd ||= GameChat.addMessage;
     GameChat.root.classList.remove('hidden','gc-faded','gc-fading');GameChat.prefs.pinned=true;GameChat.activeTab='all';GameChat.prefs.visible.combat=true;GameChat.paintTabs();GameChat.renderFilters();
     prepare?.();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     GameChat.messages=[];GameChat.pendingRows=[];GameChat.pendingUnread=0;GameChat.pendingNeedsStats=false;GameChat.pendingFollowTail=false;GameChat.flushFrame=0;GameChat.followingTail=true;GameChat.unread=0;GameChat.stats={dealt:0,received:0,healing:0,kills:0,crits:0,byType:{}};GameChat.list.replaceChildren();GameChat.renderStats();
     const longTasks=[];const observer=PerformanceObserver.supportedEntryTypes.includes('longtask')?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(x=>x.duration))):null;observer?.observe({type:'longtask'});
     const start=performance.now();for(const event of events)UI.event(event);
     const syncMs=performance.now()-start;let prior=performance.now(),maxFrameGap=0;while(GameChat.pendingRows.length||GameChat.flushFrame){const tick=await new Promise(resolve=>requestAnimationFrame(resolve));maxFrameGap=Math.max(maxFrameGap,tick-prior);prior=tick;}const finalTick=await new Promise(resolve=>requestAnimationFrame(resolve));maxFrameGap=Math.max(maxFrameGap,finalTick-prior);const done=performance.now();await new Promise(resolve=>setTimeout(resolve,0));observer?.disconnect();
     const visible=[...GameChat.list.querySelectorAll('.gc-message')],ids=new Set(GameChat.messages.map(m=>String(m.id))),rowIds=visible.map(row=>row.dataset.messageId);rows.push({mode:name,events:events.length,syncMs:+syncMs.toFixed(2),blockingFrameMs:+(done-start).toFixed(2),maxFrameGapMs:+maxFrameGap.toFixed(2),longTaskCount:longTasks.length,longTaskMaxMs:+(Math.max(0,...longTasks)).toFixed(2),retainedMessages:GameChat.messages.length,renderedRows:visible.length,duplicateRows:rowIds.length-new Set(rowIds).size,untrackedRows:rowIds.filter(id=>!ids.has(id)).length});
   }
   await run('log_enabled_all_tab');
   await run('combat_tab_hidden_logging_active',()=>{GameChat.prefs.visible.combat=false;GameChat.activeTab='all';GameChat.paintTabs();});
   await run('combat_collection_and_render_disabled',()=>{const original=GameChat.__originalAdd;GameChat.addMessage=function(raw,color,meta){if(meta?.category?.startsWith('combat.'))return;return original.call(this,raw,color,meta);};});
   await run('adventurers_log_processing_disabled',()=>GameChat.unsubscribe?.());
   return rows;
 })()`);
 assert.equal(results[0].retainedMessages,1000,'enabled log retains the configured message history');assert.equal(results[0].duplicateRows,0,'enabled log does not render duplicate rows');assert.ok(results[0].maxFrameGapMs<50,'batched rendering does not introduce a severe frame stall');assert.equal(results[0].longTaskCount,0,'batched rendering produces no browser long tasks');
 const cpuProfile=(await send('Profiler.stop')).profile;const names=new Map(cpuProfile.nodes.map(n=>[n.id,n.callFrame.functionName||'(anonymous)'])),samples=new Map();for(const id of cpuProfile.samples||[])samples.set(names.get(id),(samples.get(names.get(id))||0)+1);const top=[...samples].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([functionName,samples])=>({functionName,sampledMs:samples}));
 console.log(JSON.stringify({results,profileTopSamples:top},null,2));
}finally{
 socket?.close();if(edge&&edge.exitCode===null){const exited=new Promise(resolve=>edge.once('exit',resolve));edge.kill();await Promise.race([exited,sleep(3000)]);}await new Promise(resolve=>server.close(resolve));try{fs.rmSync(profile,{recursive:true,force:true});}catch{}
}
