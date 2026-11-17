// One major event is housed in a separate authored chamber on each campaign dungeon floor.
// Events begin when the player enters their room or map area; encounters reuse existing systems and art.
import { G } from '../state.js';
import { chance, pick, rand, randi, TAU } from '../core/util.js';
import { isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Column, sparkle, spawn, glowSprite, addLight, floatText } from '../gfx/vfx.js';
import { sfx } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { makeMonster, makeElite } from './monster.js';
import { hit } from './combat.js';
import { GroundItem, rollGroundItem, rollGroundGem } from './loot.js';
import { depthLevel } from '../data/depth.js';
import { addCache, spawnImp } from './happenings.js';

const ROWS = [
  ['treasure_goblin_invasion','Treasure Goblin Invasion','treasure','common','#ffd45c','goblin'],
  ['golden_rain','Golden Rain','treasure','common','#ffce52','gold'],
  ['treasure_caravan','Treasure Caravan','treasure','uncommon','#e9ad54','caravan'],
  ['buried_treasure','Buried Treasure','treasure','common','#e4b96c','buried'],
  ['gemstone_eruption','Gemstone Eruption','treasure','uncommon','#72ddff','gems'],
  ['looting_frenzy','Looting Frenzy','treasure','rare','#ff8c3b','frenzy'],
  ['cursed_treasure_shower','Cursed Treasure Shower','treasure','rare','#c15bce','cursed'],
  ['treasure_vault_breach','Treasure Vault Breach','treasure','epic','#ffd45c','vault'],
  ['collapsing_chamber','Collapsing Chamber','environment','common','#c7b89a','rockfall'],
  ['cursed_storm','Cursed Storm','environment','uncommon','#a66aff','storm'],
  ['lava_breakthrough','Lava Breakthrough','environment','uncommon','#ff7138','lava'],
  ['toxic_gas_leak','Toxic Gas Leak','environment','common','#8fd64e','gas'],
  ['frozen_catastrophe','Frozen Catastrophe','environment','common','#89dfff','frost'],
  ['earthquake','Earthquake','environment','uncommon','#c4aa7b','quake'],
  ['blood_flood','Blood Flood','environment','rare','#c52648','blood'],
  ['arcane_instability','Arcane Instability','environment','rare','#7e8aff','arcane'],
  ['wandering_boss','Wandering Boss','monsters','epic','#ff6855','boss'],
  ['monster_civil_war','Monster Civil War','monsters','rare','#da7f56','civilwar'],
  ['undead_uprising','Undead Uprising','monsters','common','#b8d68a','undead'],
  ['demon_incursion','Demon Incursion','monsters','uncommon','#ed5548','demons'],
  ['elite_hunting_party','Elite Hunting Party','monsters','uncommon','#f2aa59','hunters'],
  ['predator_unleashed','Predator Unleashed','monsters','rare','#9bd354','predator'],
  ['monster_stampede','Monster Stampede','monsters','common','#d7bc8d','stampede'],
  ['rival_champions','Rival Champions','monsters','epic','#f38e59','duel'],
  ['infested_chamber','Infested Chamber','monsters','common','#a7cf4d','infestation'],
  ['necromancers_ritual','Necromancer’s Ritual','monsters','rare','#9f69d7','ritual'],
  ['temporary_treasure_portal','Temporary Treasure Portal','portal','rare','#57ddff','treasure_portal'],
  ['abyssal_rift','Abyssal Rift','portal','epic','#a647d8','rift'],
  ['mirror_dimension','Mirror Dimension','portal','epic','#8ed8ff','mirror'],
  ['portal_roulette','Portal Roulette','portal','uncommon','#c277ed','roulette'],
  ['temporal_distortion','Temporal Distortion','portal','rare','#65d5dc','temporal'],
  ['dimensional_collision','Dimensional Collision','portal','uncommon','#db78ff','collision'],
  ['lost_adventurers_gateway','Lost Adventurer’s Gateway','portal','common','#b4d8dd','camp'],
  ['ghostly_procession','Ghostly Procession','supernatural','uncommon','#a9d8e8','ghosts'],
  ['blood_moon','Blood Moon','supernatural','rare','#cf3551','bloodmoon'],
  ['curse_of_silence','Curse of Silence','supernatural','common','#a18acb','silence'],
  ['haunted_whispers','Haunted Whispers','supernatural','common','#b4a0e8','whispers'],
  ['soul_harvest','Soul Harvest','supernatural','uncommon','#6fdacb','souls'],
  ['shadow_doppelganger','Shadow Doppelgänger','supernatural','epic','#6a4b86','shadow'],
  ['ritual_awakening','Ritual Awakening','supernatural','uncommon','#cf71c8','awakening'],
  ['secret_passage_revealed','Secret Passage Revealed','world','common','#eacb82','passage'],
  ['shifting_labyrinth','Shifting Labyrinth','world','rare','#91c9cf','labyrinth'],
  ['crystal_bloom','Crystal Bloom','world','common','#74dfff','crystal'],
  ['fungal_overgrowth','Fungal Overgrowth','world','common','#79cd72','fungus'],
  ['ancient_machinery_awakens','Ancient Machinery Awakens','world','uncommon','#dfa75d','machinery'],
  ['forgotten_sanctuary','Forgotten Sanctuary','world','rare','#f2dc9c','sanctuary'],
  ['dragons_passing','Dragon’s Passing','legendary','legendary','#ff7044','dragon'],
  ['celestial_intervention','Celestial Intervention','legendary','legendary','#ffe59a','celestial'],
  ['watchers_gaze','The Watcher’s Gaze','legendary','mythic','#bc6bff','watcher'],
  ['forgotten_king','The Forgotten King','legendary','epic','#d1bb8a','king'],
];

export const DUNGEON_EVENTS = Object.freeze(ROWS.map(([id,name,category,rarity,color,mode]) => Object.freeze({id,name,category,rarity,color,mode})));
export const EVENT_RARITY_CHANCES = Object.freeze({ common:45, uncommon:25, rare:15, epic:10, legendary:4, mythic:1 });
const EVENT_BY_ID = new Map(DUNGEON_EVENTS.map(e => [e.id,e]));

export function rollDungeonEvent() {
  let n = Math.random() * 100, rarity = 'common';
  for (const [key, weight] of Object.entries(EVENT_RARITY_CHANCES)) { n -= weight; if (n < 0) { rarity = key; break; } }
  const choices = DUNGEON_EVENTS.filter(e => e.rarity === rarity);
  return pick(choices.length ? choices : DUNGEON_EVENTS);
}

function positions(world, room, count, spread = 2.2) {
  const out = [], cx = room.mx ?? room.x + room.w / 2, cy = room.my ?? room.y + room.h / 2;
  for (let i = 0; i < count * 8 && out.length < count; i++) {
    const a = rand(TAU), r = rand(0.8, spread), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (world.map.walkable(x,y) && out.every(p => Math.hypot(p[0]-x,p[1]-y) > 0.8)) out.push([x,y]);
  }
  if (!out.length && world.map.walkable(cx,cy)) out.push([cx,cy]);
  return out;
}

function reachableEventRoom(world, start, avoid = []) {
  const map = world.map, origin = start || [world.player?.x ?? 0, world.player?.y ?? 0];
  const safe = (x, y, verifyPath = true) => map.walkable(x, y) && Math.hypot(x-origin[0], y-origin[1]) >= 8 &&
    avoid.every(o => Math.hypot(x-o.x, y-o.y) >= 5) &&
    (world.portals || []).every(o => Math.hypot(x-o.x, y-o.y) >= 5) &&
    (!verifyPath || map.findPath(origin[0], origin[1], x, y, 12000));
  const rooms = (world.rooms || []).filter(r => r !== world.bossRoom && !r.shrineRoom && !r.eventRoom &&
    (!world.boss || Math.hypot((r.mx ?? r.x+r.w/2)-world.boss.x, (r.my ?? r.y+r.h/2)-world.boss.y) >= 8));
  const room = rooms.filter(r => safe(r.mx ?? r.x+r.w/2, r.my ?? r.y+r.h/2))
    .sort((a,b) => Math.hypot((b.mx ?? b.x+b.w/2)-origin[0], (b.my ?? b.y+b.h/2)-origin[1]) - Math.hypot((a.mx ?? a.x+a.w/2)-origin[0], (a.my ?? a.y+a.h/2)-origin[1]))[0];
  if (room) return room;

  // Overworld and special-area generators have no room records. Sample reachable walkable
  // floor and choose a distant, clear tile so the event does not land by the entrance.
  const W=map.w,H=map.h,N=W*H,seen=new Uint8Array(N),queue=new Int32Array(N),sx=Math.floor(origin[0]),sy=Math.floor(origin[1]);
  if(sx<0||sy<0||sx>=W||sy>=H||!map.walkableTile(sx,sy))return null;
  let head=0,tail=0,first=sy*W+sx;queue[tail++]=first;seen[first]=1;
  while(head<tail){const i=queue[head++],x=i%W,y=(i/W)|0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
      if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
      const j=ny*W+nx;if(seen[j]||!map.walkableTile(nx,ny))continue;
      if(ox&&oy&&(!map.walkableTile(x+ox,y)||!map.walkableTile(x,y+oy)))continue;
      if(map.hgt&&!map.stepsOk(x,y,ox,oy))continue;seen[j]=1;queue[tail++]=j;
    }
  }
  const candidates=[];
  for(let tries=0;tries<Math.min(tail,900);tries++){
    const i=queue[randi(0,tail-1)],x=i%W+.5,y=Math.floor(i/W)+.5;
    if(safe(x,y,false))candidates.push({x,y,d:Math.hypot(x-origin[0],y-origin[1])});
  }
  candidates.sort((a,b)=>b.d-a.d);
  const at=candidates[0];
  return at?{x:at.x-3,y:at.y-3,w:6,h:6,mx:at.x,my:at.y,eventRoom:true}:null;
}

function addEventFoes(world, run, { count = 4, rank = 'normal', arch = null, team = 'enemy', hp = 1, damage = 1 } = {}) {
  const lvl = depthLevel(world.depth || 1), roster = world.roster?.length ? world.roster : world.biome?.roster || ['skeleton'];
  const spots = positions(world, run.room, Math.min(7,count), 2.8);
  for (let i = 0; i < Math.min(count,7); i++) {
    const at = spots[i % spots.length], a = arch || pick(roster) || 'skeleton';
    const m = makeMonster(world, a, world.biome, lvl + (rank === 'normal' ? 0 : 2), rank === 'boss' ? 'unique' : rank, at[0], at[1], 0);
    if (!m) continue;
    if (rank === 'boss') { makeElite(m, 'unique', world.depth, world); m.name = `Omen ${m.name}`; m.scale = Math.max(m.scale || 1, 1.35); }
    if (rank === 'champion' || rank === 'unique') makeElite(m, rank, world.depth, world);
    m.team = team; m.hp = m.maxHp = Math.max(m.maxHp, m.maxHp * hp); m.dmg *= damage;
    const death = m.onDeath;
    m.onDeath = (...args) => { if (typeof death === 'function') death.apply(m,args); run.kills = (run.kills || 0) + 1; if (run.def.mode === 'souls') { run.souls = (run.souls || 0) + 1; } };
    m.eventFoe = true; (run.foes ||= []).push(m); world.add(m);
  }
}

function trackEventImps(run, imps) {
  for (const m of imps) {
    m.dungeonEventImp = true;
    const death = m.onDeath;
    m.onDeath = (...args) => { if (typeof death === 'function') death.apply(m,args); run.kills = (run.kills || 0) + 1; };
  }
}

function portalDestination(world, sourceRoom) {
  const rooms=(world.rooms||[]).filter(r=>r!==sourceRoom&&!r.shrineRoom&&!r.guardian&&r.w>=3&&r.h>=3&&
    !(world.boss&&Math.hypot((r.mx??r.x+r.w/2)-world.boss.x,(r.my??r.y+r.h/2)-world.boss.y)<6));
  rooms.sort((a,b)=>Math.hypot((a.mx??a.x+a.w/2)-sourceRoom.mx,(a.my??a.y+a.h/2)-sourceRoom.my)-Math.hypot((b.mx??b.x+b.w/2)-sourceRoom.mx,(b.my??b.y+b.h/2)-sourceRoom.my));
  const found=rooms.find(r=>world.map.walkable(r.mx??r.x+r.w/2,r.my??r.y+r.h/2));
  if(found)return found;
  const from=[sourceRoom.mx??sourceRoom.x+sourceRoom.w/2,sourceRoom.my??sourceRoom.y+sourceRoom.h/2];
  return reachableEventRoom(world,from,[sourceRoom]);
}

function portalObject(world, run, { x, y, label, color, use, dot = color }) {
  const portal={x,y,opened:false,reach:1.7,far:45,label,dot,isDungeonEvent:true,
    draw(ctx,sx,sy){const pulse=.7+.3*Math.sin(G.time*4);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3*pulse;ctx.drawImage(glowSprite(color),sx-38,sy-62,76,76);ctx.globalAlpha=.9;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(sx,sy-24,16,28,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.ellipse(sx,sy-24,9,20,0,0,TAU);ctx.stroke();ctx.restore();addLight(x,y,3,.65,44,color);},
    use(){if(this.opened||!run.active||G.world!==world)return;this.opened=true;use(portal);}
  };
  world.chests.push(portal);return portal;
}

function beginPortalTrip(world,run,{label='Return Through the Gate',reward=null,foes=0,arch=null,color=run.def.color}={}) {
  const p=world.player, target=portalDestination(world,run.room);
  if(!target){run.kind='timer';run.remaining=12;run.reward=reward||{gold:4};return;}
  const origin=[p.x,p.y],tx=target.mx??target.x+target.w/2,ty=target.my??target.y+target.h/2;
  run.kind='portalPending';run.remaining=40;run.reward=reward;
  run.portal=portalObject(world,run,{x:run.x,y:run.y,label:run.def.name,color,use:()=>{
    p.x=tx;p.y=ty;addEffect(new Ring(tx,ty,.2,3,1,color,5,{fill:true}));sparkle(tx,ty,18,color,20,.65);
    run.room=target;run.x=tx;run.y=ty;run.kind='portalReturn';run.remaining=45;run.foes=[];
    if(foes)addEventFoes(world,run,{count:foes,rank:'normal',arch,hp:.9});
    const ret=portalObject(world,run,{x:tx,y:ty,label,color:'#9eeaff',use:()=>{p.x=origin[0];p.y=origin[1];ret.opened=true;finish(world,run,true);}});
    run.returnPortal=ret;UI.centerMsg(run.def.name.toUpperCase(),'Find the return gate before this pocket collapses',2.8);
  }});
}

function loot(world, x, y, { gold = 0, gear = 0, gems = 0, quality = 2 } = {}) {
  const p = world.player, lvl = depthLevel(world.depth || 1);
  for (let i = 0; i < Math.min(12, gold); i++) world.addLoot(new GroundItem(x + rand(-1.7,1.7), y + rand(-1.7,1.7), 'gold', { amount: Math.round((14 + lvl * 2.5) * (0.7 + Math.random()*0.6)) }));
  for (let i = 0; i < Math.min(3, gear); i++) world.addLoot(new GroundItem(x + rand(-0.7,0.7), y + rand(-0.7,0.7), 'item', { item: rollGroundItem(lvl + 1, { rarity: quality, mf: p?.st?.magicFind || 0 }) }));
  for (let i = 0; i < Math.min(4, gems); i++) world.addLoot(new GroundItem(x + rand(-1.1,1.1), y + rand(-1.1,1.1), 'item', { item: rollGroundGem(lvl + 1) }));
}

function pulse(world, run, { element = 'arcane', color = run.def.color, duration = 18, damage = 0.045, radius = 1.6 } = {}) {
  run.remaining = duration; run.pulseT = 1.2; run.element = element; run.pulseDamage = damage; run.pulseRadius = radius; run.pulseColor = color;
  addEffect(new Ring(run.x, run.y, 0.3, 4.4, 1.1, color, 5, { fill: true }));
  UI.centerMsg(run.def.name.toUpperCase(), 'Avoid the marked bursts until the disturbance passes', 2.8);
}

function addPulseStrike(world, run, x, y) {
  const R = run.pulseRadius, col = run.pulseColor, p = world.player;
  addEffect(new Ring(x, y, 0.25, R, 0.75, col, 4, { fill: true }));
  // The impact happens after a clear telegraph and only hurts the hero if still in its small marked area.
  world.addHazard({ t: 0, update(dt) { this.t += dt; if (this.t < 0.85) return true;
    if (p && !p.dead && Math.hypot(p.x-x,p.y-y) < R) hit({ team:'enemy', world, level:depthLevel(world.depth||1), dmg:p.maxHp * run.pulseDamage }, p, p.maxHp * run.pulseDamage, run.element, { dot:true });
    addEffect(new Column(x,y,col,0.25,10,220)); sparkle(x,y,9,col,12,0.45); return false; }, draw() {} });
}

function eventClaimKey(world) {
  const area = world.breach ? `breach-${world.breach.floor}` : world.rift ? `rift-${world.rift.tier}` :
    world.unboundExploration ? `unbound-${world.unboundExploration.floor}` : world.sky ? `sky-${world.sky.v?.id || world.depth}` :
    world.seaRun ? `sea-${world.seaRun.variant?.id || world.depth}` : `depth-${world.depth || 1}`;
  return `${world.biome?.id || 'map'}:${area}`;
}

function startRun(world, def, room) {
  const cx = room.mx ?? room.x + room.w / 2, cy = room.my ?? room.y + room.h / 2;
  world.happen ||= {};
  const claims=G.char && (G.char.dungeonEventClaims ||= {}), claimKey=eventClaimKey(world);
  if(claims)claims[claimKey]=true; // A floor's event is one attempt; leaving and rebuilding cannot farm it.
  const run = world.happen.event = { def, room, x:cx, y:cy, t:0, active:true, paid:false, claimed:false, claimKey, foes:[] };
  const p = world.player, col = def.color;
  addEffect(new Column(cx,cy,col,1,38,360)); addEffect(new Ring(cx,cy,0.3,5,1.2,col,6,{fill:true}));
  sfx('gate',0.7); UI.centerMsg(def.name.toUpperCase(), 'A major dungeon event has begun', 2.8);
  UI.log(`<b style="color:${col}">${def.name}</b> begins as you enter the event area.`, col);

  switch(def.mode) {
    case 'goblin': {
      const before = world.creatures.length;
      for(let i=0;i<3;i++) spawnImp(world);
      run.foes = world.creatures.slice(before).filter(m=>m.goblin&&!m.dead);
      trackEventImps(run, run.foes);
      run.kind='kill'; run.reward={gold:5,gear:1}; break;
    }
    case 'gold': loot(world,cx,cy,{gold:10}); run.kind='timer'; run.remaining=20; run.reward={gold:2}; break;
    case 'caravan': addEventFoes(world,run,{count:3,rank:'normal',hp:1.35}); {const n=world.creatures.length;spawnImp(world);spawnImp(world);const imps=world.creatures.slice(n).filter(m=>m.goblin);trackEventImps(run,imps);run.foes.push(...imps);} run.kind='kill'; run.reward={gold:8,gear:1}; break;
    case 'buried': addEffect(new Column(cx,cy,'#e7b764',0.5,25,270)); run.cache=addCache(world,[cx,cy]); run.kind='interact'; run.reward=null; break;
    case 'gems': loot(world,cx,cy,{gems:3}); for(let i=0;i<6;i++)spawn({type:'glow',x:cx+rand(-2,2),y:cy+rand(-2,2),z:rand(5,30),vz:20,life:1,size:4,size1:0,color:'#76e7ff',add:true}); run.kind='timer'; run.remaining=12; run.reward={gems:1}; break;
    case 'frenzy': loot(world,cx,cy,{gold:4}); addEventFoes(world,run,{count:5,rank:'champion',hp:1.15}); run.kind='kill'; run.reward={gold:4,gear:1}; break;
    case 'cursed': loot(world,cx,cy,{gold:3}); addEventFoes(world,run,{count:4,rank:'normal',damage:1.2}); run.kind='kill'; run.reward={gold:6,gear:1}; run.curse=true; break;
    case 'vault': addEventFoes(world,run,{count:6,rank:'champion',hp:1.25}); run.kind='kill'; run.reward={gold:8,gear:2,quality:3}; break;
    case 'rockfall': pulse(world,run,{element:'phys',color:'#c6b89f',duration:18,damage:.035,radius:1.5}); run.reward={gold:2}; break;
    case 'storm': pulse(world,run,{element:'shadow',color:'#a461e7',duration:22,damage:.04,radius:1.45}); run.reward={gear:1}; break;
    case 'lava': pulse(world,run,{element:'fire',color:'#ff6b32',duration:18,damage:.045,radius:1.4}); run.reward={gold:3}; break;
    case 'gas': pulse(world,run,{element:'poison',color:'#8ed44a',duration:20,damage:.035,radius:1.7}); run.reward={gems:1}; break;
    case 'frost': pulse(world,run,{element:'cold',color:'#81dfff',duration:19,damage:.035,radius:1.5}); run.reward={gear:1}; break;
    case 'quake': pulse(world,run,{element:'phys',color:'#c6a67c',duration:16,damage:.04,radius:1.55}); run.reward={gold:3}; break;
    case 'blood': pulse(world,run,{element:'blood',color:'#c51f43',duration:22,damage:.035,radius:1.6}); run.reward={gear:1}; break;
    case 'arcane': pulse(world,run,{element:'arcane',color:'#8588ff',duration:20,damage:.04,radius:1.45}); run.reward={gems:1}; break;
    case 'boss': addEventFoes(world,run,{count:1,rank:'boss',hp:2.4,damage:1.3}); run.kind='kill'; run.reward={gold:8,gear:2,quality:3}; break;
    case 'civilwar': addEventFoes(world,run,{count:3,team:'omen_red',rank:'normal',hp:1.25}); addEventFoes(world,run,{count:3,team:'omen_black',rank:'normal',hp:1.25}); run.kind='kill'; run.reward={gold:5,gear:1}; break;
    case 'undead': addEventFoes(world,run,{count:6,arch:'skeleton',rank:'normal',hp:1.2}); run.kind='kill'; run.reward={gold:3,gear:1}; break;
    case 'demons': addEventFoes(world,run,{count:5,arch:'imp',rank:'champion',hp:1.3,damage:1.15}); run.kind='kill'; run.reward={gold:5,gear:1}; break;
    case 'hunters': addEventFoes(world,run,{count:4,rank:'champion',hp:1.4,damage:1.25}); run.kind='kill'; run.reward={gear:1,quality:3}; break;
    case 'predator': addEventFoes(world,run,{count:1,rank:'unique',hp:2,damage:1.3}); run.kind='kill'; run.reward={gold:5,gear:1}; break;
    case 'stampede': addEventFoes(world,run,{count:7,rank:'normal',hp:0.9}); run.kind='kill'; run.reward={gold:4}; break;
    case 'duel': addEventFoes(world,run,{count:1,team:'omen_duelist_a',rank:'champion',hp:1.65}); addEventFoes(world,run,{count:1,team:'omen_duelist_b',rank:'champion',hp:1.65}); run.kind='kill'; run.reward={gold:6,gear:1}; break;
    case 'infestation': addEventFoes(world,run,{count:7,rank:'normal',hp:0.75}); run.kind='kill'; run.reward={gold:3,gems:1}; break;
    case 'ritual': addEventFoes(world,run,{count:4,rank:'normal'}); run.kind='kill'; run.reward={gear:1,quality:3}; break;
    case 'treasure_portal': beginPortalTrip(world,run,{label:'Enter Treasure Pocket',reward:{gold:9,gear:1},color:'#52e4ff'}); break;
    case 'camp': beginPortalTrip(world,run,{label:'Return from Adventurer Camp',reward:{gold:5,gems:1},color:'#b4d8dd'}); run.remaining=45; break;
    case 'passage':
      run.kind='choice'; run.remaining=24; run.reward={gold:5,gear:1};
      run.cache=addCache(world,[cx,cy]);run.kind='interact';run.reward=null;break;
    case 'sanctuary':
      p.hp=p.maxHp;p.mana=p.maxMana;if(p.addBuff)p.addBuff({id:'event_sanctuary',name:'Sanctuary Grace',el:'holy',stats:{reduce:8,dmg:8},t:45,max:45,floorOnly:true});run.kind='timer';run.remaining=8;run.reward={gear:1};break;
    case 'roulette': {
      run.kind='choice';run.remaining=35;run.reward=null;run.choices=3;
      const spots=positions(world,room,3,3.1);
      const choices=spots.map((at,i)=>portalObject(world,run,{x:at[0],y:at[1],label:`Portal ${['I','II','III'][i]}`,color:['#58ddff','#bd70ef','#ffb55b'][i],use:()=>{
        for(const option of choices)option.opened=true;
        run.choices=0;const bad=i===1;
        if(bad){addEventFoes(world,run,{count:4,rank:'champion',hp:1.2});run.kind='kill';run.reward={gold:3};}
        else {const dest=portalDestination(world,room);if(dest)beginPortalTrip(world,run,{reward:{gold:6,gear:1},color:at[0]<cx?'#58ddff':'#ffb55b'});else{run.kind='timer';run.remaining=8;run.reward={gold:6,gear:1};}}
        UI.centerMsg(bad?'PORTAL TRAP':'PORTAL CHOSEN',bad?'Defeat the ambush':'The way opens to a hidden cache',2.2);
      }}));
      break;
    }
    case 'rift': addEventFoes(world,run,{count:6,rank:'champion',hp:1.25}); run.kind='kill'; run.reward={gear:2,quality:3}; break;
    case 'mirror': addEventFoes(world,run,{count:3,rank:'unique',hp:1.05}); run.kind='kill'; run.reward={gear:1,gems:1,quality:3}; break;
    case 'temporal': pulse(world,run,{element:'light',color:'#64d8dc',duration:18,damage:.035,radius:1.4}); run.reward={gems:1}; if(p.addBuff)p.addBuff({id:'event_temporal',name:'Temporal Haste',el:'light',stats:{as:12},t:30,max:30,floorOnly:true}); break;
    case 'collision': addEventFoes(world,run,{count:5,rank:'normal',hp:1.1}); run.kind='kill'; run.reward={gold:3,gear:1}; break;
    case 'ghosts': addEventFoes(world,run,{count:4,arch:'wraith',rank:'unique',hp:.8,damage:.8}); run.kind='kill'; run.reward={gems:1}; break;
    case 'bloodmoon': pulse(world,run,{element:'blood',color:'#d83653',duration:20,damage:.025,radius:1.5}); addEventFoes(world,run,{count:3,rank:'normal',hp:1.1}); run.reward={gear:1}; break;
    case 'silence': pulse(world,run,{element:'shadow',color:'#9981bf',duration:16,damage:.02,radius:1.7}); run.reward={gold:3}; if(p.addBuff)p.addBuff({id:'event_silence',name:'Muted Casting',el:'shadow',stats:{as:-8},t:16,max:16,floorOnly:true}); break;
    case 'whispers': {const at=positions(world,room,1,2.5)[0]||[cx,cy];addEffect(new Ring(at[0],at[1],.2,3,.8,'#b39aff',4));loot(world,at[0],at[1],{gold:5,gems:1});run.kind='timer';run.remaining=10;run.reward={gold:2};break;}
    case 'souls': run.kind='kill';run.reward={gold:4,gear:1};addEventFoes(world,run,{count:5,rank:'normal'});break;
    case 'shadow': addEventFoes(world,run,{count:1,rank:'unique',hp:2.2,damage:1.1});run.kind='kill';run.reward={gear:2,quality:3};break;
    case 'awakening': addEventFoes(world,run,{count:5,rank:'normal',hp:1.15});run.kind='kill';run.reward={gear:1};break;
    case 'labyrinth': {const dest=positions(world,room,1,4)[0];if(dest){addEffect(new Ring(cx,cy,.2,3,1,col,4));run.dest=dest;}run.kind='timer';run.remaining=12;run.reward={gold:4,gear:1};break;}
    case 'crystal': loot(world,cx,cy,{gems:3});run.kind='timer';run.remaining=14;run.reward={gems:1};break;
    case 'fungus': pulse(world,run,{element:'poison',color:'#77d17a',duration:17,damage:.025,radius:1.7});run.reward={gems:1};break;
    case 'machinery': pulse(world,run,{element:'phys',color:'#d49a58',duration:16,damage:.035,radius:1.35});run.reward={gold:4};break;
    case 'dragon': addEventFoes(world,run,{count:1,rank:'boss',hp:2.8,damage:1.4});run.kind='kill';run.reward={gold:10,gear:2,quality:4};break;
    case 'celestial': addEffect(new Column(cx,cy,'#ffe6a2',1.4,55,500));p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);p.mana=Math.min(p.maxMana,p.mana+p.maxMana*.25);run.kind='timer';run.remaining=8;run.reward={gear:2,quality:3};break;
    case 'watcher': pulse(world,run,{element:'shadow',color:'#bd6aff',duration:22,damage:.035,radius:1.55});addEventFoes(world,run,{count:4,rank:'champion',hp:1.4});run.reward={gold:8,gear:2,quality:4};break;
    case 'king': addEventFoes(world,run,{count:1,rank:'boss',hp:2.7,damage:1.4});run.kind='kill';run.reward={gold:8,gear:2,quality:4};break;
  }
  if(!run.kind) run.kind='timer';
  return run;
}

function finish(world, run, success) {
  if(!run.active)return;
  run.active=false;run.paid=true;
  if(success&&run.reward)loot(world,run.x,run.y,run.reward);
  addEffect(new Column(run.x,run.y,success?'#ffd66b':'#765c70',0.75,30,320));
  UI.centerMsg(success?'EVENT COMPLETE':'EVENT ENDED',success?'The event area yields its reward':'The disturbance fades',2.2);
  UI.log(success?`The ${run.def.name} event is complete.`:`The ${run.def.name} event has ended.`,success?'#ffd66b':'#a99aaa');
  sfx(success?'levelup':'gate',0.55);
}

export function setupDungeonEvent(world, room, { id = null, start = null } = {}) {
  if(!world?.map||world.kind==='town'||world.raid||world.biome?.id==='throne'||world.practice||world.unbound)return null;
  room ||= reachableEventRoom(world,start,world.chests||[]);
  if(!room)return null;
  const def=(id&&EVENT_BY_ID.get(id))||rollDungeonEvent(),cx=room.mx??room.x+room.w/2,cy=room.my??room.y+room.h/2;
  const claimed=!!G.char?.dungeonEventClaims?.[eventClaimKey(world)];
  world.eventRoom=room;
  world.dungeonEvent={id:def.id,rarity:def.rarity,triggered:claimed};
  return world.dungeonEvent;
}

export function dungeonEventTick(world,dt) {
  if(!world)return;
  let run=world.happen?.event;
  if(!run?.active){
    const event=world.dungeonEvent,room=world.eventRoom,p=world.player;
    if(!event||event.triggered||!room||!p)return;
    const inside=p.x>=room.x&&p.x<room.x+room.w&&p.y>=room.y&&p.y<room.y+room.h;
    if(!inside)return;
    event.triggered=true;
    const def=EVENT_BY_ID.get(event.id);
    if(def)startRun(world,def,room);
    run=world.happen?.event;
    if(!run?.active)return;
  }
  const p=world.player;run.t+=dt;
  if(run.kind==='kill'){
    run.foes=run.foes.filter(m=>m&&!m.dead&&world.creatures.includes(m));
    if(!run.foes.length){
      if(run.def.mode==='goblin'&&!run.kills){finish(world,run,false);return;}
      finish(world,run,true);return;
    }
    if(run.t>70){finish(world,run,false);return;}
  }
  if(run.kind==='portalReturn'){
    run.foes=run.foes.filter(m=>m&&!m.dead&&world.creatures.includes(m));
    run.remaining-=dt;
    if(run.remaining<=0){const ret=run.returnPortal,p=world.player;if(ret&&!ret.opened){ret.opened=true;p.x=run.room.mx??run.room.x+run.room.w/2;p.y=run.room.my??run.room.y+run.room.h/2;}finish(world,run,false);return;}
  }
  if(run.kind==='portalPending'&&(run.remaining-=dt)<=0){if(run.portal)run.portal.opened=true;finish(world,run,false);return;}
  if(run.pulseT!==undefined){
    run.pulseT-=dt;
    if(run.pulseT<=0){run.pulseT=rand(1.45,2.4);const at=positions(world,run.room,1,Math.min(3,Math.max(1,run.room.w/2-1)))[0];if(at)addPulseStrike(world,run,at[0],at[1]);}
    run.remaining-=dt;
    if(run.remaining<=0){finish(world,run,true);return;}
  }else if(run.remaining!==undefined&&run.kind==='timer'){
    run.remaining-=dt;
    if(run.remaining<=0){finish(world,run,true);return;}
  }else if(run.kind==='interact'){
    if(run.cache?.opened){finish(world,run,true);return;}
    if(run.t>90){finish(world,run,false);return;}
  }else if(run.kind==='choice'){
    if(run.remaining<=0){finish(world,run,false);return;}run.remaining-=dt;
  }
  // Souls rise from defeated event foes and grant a small temporary, floor-bound damage blessing.
  if(run.def.mode==='souls'&&run.souls>0){run.souls=0;if(p?.addBuff)p.addBuff({id:`event_soul_${Math.floor(run.t)}`,name:'Harvested Soul',el:'shadow',stats:{dmg:2},t:20,max:20,floorOnly:true});}
}
