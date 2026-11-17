// The 50 reusable shrine and world-object encounters. Objects use biome scatter art,
// the game's existing interaction path, player buffs, loot rules and VFX.
import { G } from '../state.js';
import { chance, dist, pick, rand, randi, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Column, burst, sparkle, addLight, glowSprite, spawn, floatText } from '../gfx/vfx.js';
import { hit } from './combat.js';
import { ambush } from './mayhem.js';
import { makeMonster } from './monster.js';
import { GroundItem, dropChest, rollGroundItem, rollGroundGem } from './loot.js';
import { goldPile, goldScale, itemName, rarityAt } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';

const RARITIES = [
  { name: 'Common', chance: 45, scale: 1, color: '#b8b8b8' },
  { name: 'Uncommon', chance: 25, scale: 1.12, color: '#6de08a' },
  { name: 'Rare', chance: 15, scale: 1.28, color: '#65b8ff' },
  { name: 'Epic', chance: 10, scale: 1.48, color: '#c080ff' },
  { name: 'Legendary', chance: 4, scale: 1.72, color: '#ffb348' },
  { name: 'Mythic', chance: 1, scale: 2, color: '#ff6d7a' },
];
const CATALOG = [
  ['might','Shrine of Might','blessing','#ff6547','altar|shrine|obelisk|statue'],
  ['fortitude','Shrine of Fortitude','blessing','#58d890','altar|shrine|obelisk|statue'],
  ['swiftness','Shrine of Swiftness','blessing','#f2d35c','altar|shrine|obelisk|statue'],
  ['sorcery','Shrine of Sorcery','blessing','#65c9ff','altar|shrine|obelisk|statue'],
  ['fortune','Shrine of Fortune','blessing','#ffd66b','altar|shrine|obelisk|statue'],
  ['precision','Shrine of Precision','blessing','#e08cff','altar|shrine|obelisk|statue'],
  ['phoenix','Shrine of the Phoenix','blessing','#ff8b42','altar|shrine|obelisk|statue'],
  ['echoes','Shrine of Echoes','blessing','#ba8aff','altar|shrine|obelisk|statue'],
  ['colossus','Shrine of the Colossus','blessing','#aab0bd','altar|shrine|obelisk|statue'],
  ['elements','Shrine of the Elements','blessing','#5ce7d0','altar|shrine|obelisk|statue'],
  ['blood','Altar of Blood','cursed','#a51e38','altar|basin|brazier'],
  ['greed','Altar of Greed','cursed','#d7a631','altar|idol|statue'],
  ['torment','Altar of Torment','cursed','#8d2244','altar|basin|brazier'],
  ['shadows','Altar of Shadows','cursed','#7957ba','altar|obelisk|statue'],
  ['chaos','Altar of Chaos','cursed','#be4fe0','altar|obelisk|brazier'],
  ['damned','Altar of the Damned','cursed','#e05040','altar|idol|statue'],
  ['decay','Altar of Decay','cursed','#7c9940','altar|basin|brazier'],
  ['corruption','Altar of Corruption','cursed','#ac50a5','altar|obelisk|shrine'],
  ['life','Fountain of Life','fountain','#ff5555','fountain|basin|well|water'],
  ['mana','Fountain of Mana','fountain','#598dff','fountain|basin|well|water'],
  ['rejuvenation','Fountain of Rejuvenation','fountain','#c35cff','fountain|basin|well|water'],
  ['purification','Fountain of Purification','fountain','#73e8d6','fountain|basin|well|water'],
  ['renewal','Fountain of Renewal','fountain','#d9ff9a','fountain|basin|well|water'],
  ['bloodspring','Bloodspring','fountain','#b82d45','fountain|basin|well|water'],
  ['unstable_fountain','Unstable Fountain','fountain','#d782ff','fountain|basin|well|water'],
  ['fortune_statue','Statue of Fortune','gambling','#e9bd5e','statue|idol|urn'],
  ['dice','Dice of Fate','gambling','#9f85ff','urn|reliquary|idol'],
  ['wheel','Wheel of Destiny','gambling','#d8aa4b','statue|idol|reliquary'],
  ['gambler','Idol of the Gambler','gambling','#f0c44c','idol|statue|urn'],
  ['trickster','Statue of the Trickster','gambling','#bb73eb','statue|idol|urn'],
  ['oracle','Oracle’s Mirror','gambling','#80d9ff','statue|reliquary|basin'],
  ['coin','Coin of the Ancients','gambling','#f4d36b','urn|reliquary|idol'],
  ['sacrifice','Stone of Sacrifice','sacrifice','#bd394c','obelisk|altar|basin'],
  ['soul_obelisk','Soul Obelisk','sacrifice','#a25cff','obelisk|altar|shrine'],
  ['offering','Offering Brazier','sacrifice','#ff9d45','brazier|altar|lantern'],
  ['fallen_ritual','Ritual of the Fallen','sacrifice','#ad3f67','altar|basin|obelisk'],
  ['transmutation','Stone of Transmutation','sacrifice','#67c9d8','obelisk|altar|statue'],
  ['power_monolith','Monolith of Power','sacrifice','#e19c53','obelisk|rune|altar'],
  ['reliquary','Ancestral Reliquary','sacrifice','#d7bd72','reliquary|urn|altar'],
  ['mysterious_monolith','Mysterious Monolith','mystery','#9474d5','obelisk|rune|statue'],
  ['skull','Whispering Skull','mystery','#b4a7c1','skull|urn|idol'],
  ['mirror','Haunted Mirror','mystery','#74c8e8','statue|reliquary|basin'],
  ['sarcophagus','Ancient Sarcophagus','mystery','#be9a60','sarcophagus|tomb|reliquary'],
  ['urn','Sealed Urn','mystery','#d1a84d','urn|amphora|reliquary'],
  ['tome','Forgotten Tome','mystery','#9670ed','lectern|reliquary|altar'],
  ['shifting_portal','Shifting Portal','mystery','#6edbdf','obelisk|shrine|altar'],
  ['living_statue','Living Statue','mystery','#9d8a75','statue|idol|angel'],
  ['pylon','Runic Pylon','environment','#53c8ef','obelisk|rune|standing_stone'],
  ['lantern','Spirit Lantern','environment','#ffe08a','lantern|brazier|torch'],
  ['war_horn','Ancient War Horn','environment','#da8058','horn|banner|reliquary'],
].map(([id,name,category,color,art]) => ({id,name,category,color,art}));

export const WORLD_OBJECTS = Object.freeze(CATALOG.map(o => Object.freeze(o)));

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rar = (n) => RARITIES[n] || RARITIES[0];
function rollRarity() {
  let n = Math.random() * 100;
  for (let i=0;i<RARITIES.length;i++) { n -= RARITIES[i].chance; if (n < 0) return i; }
  return 0;
}
function makeClaimKey(world) {
  const area = world.breach ? `breach-${world.breach.floor}` : world.rift ? `rift-${world.rift.tier}` : world.unboundExploration ? `unbound-${world.unboundExploration.floor}` : G.unboundExplorationFloor ? `unbound-${G.unboundExplorationFloor}` : `depth-${world.depth || 1}`;
  return `${world.biome?.id || 'special'}:${area}`;
}
function rewardScale(o) { return rar(o.rarity).scale; }
function level(world) { return depthLevel(world.depth || G.char?.depth || 1); }
function addBuff(p, o, name, color, stats, duration = 180, extra = {}) {
  const s = rewardScale(o), scaled = Object.fromEntries(Object.entries(stats).map(([k,v]) => [k, v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a,n]) => [a, Math.round(n*s*10)/10])) : Math.round(v*s*10)/10]));
  const buff = { id: `world_${o.id}`, name, el: 'arcane', color, stats: scaled, t: duration, max: duration, floorOnly: true, worldObject: true, ...extra };
  p.addBuff(buff);
  return buff;
}
function rewardChest(world, o, count = 1, rarity = null) {
  const p = G.player, depth = world.depth || G.char?.depth || 1;
  for (let i=0;i<count;i++) dropChest(world,{x:o.x+rand(-.35,.35),y:o.y+rand(-.35,.35),rare:true,chestRarity:rarity},depth);
  if (chance(0.16*rewardScale(o))) world.addLoot(new GroundItem(o.x,o.y+0.3,'item',{item:rollGroundItem(level(world)+2,{rarity:rarityAt(level(world)+2,rar(o.rarity).name==='Mythic'?5:rar(o.rarity).name==='Legendary'?4:3),mf:G.player?.st.magicFind||0})}));
}
function goldReward(world,o,mult=1) {
  const d=level(world), amount=Math.max(1,Math.round(goldPile(d)*goldScale(d)*mult*rewardScale(o)));
  world.addLoot(new GroundItem(o.x,o.y+.3,'gold',{amount}));
}
function healing(p,hp,mp) {
  if(hp) p.heal(hp);
  if(mp) p.mana=Math.min(p.maxMana,p.mana+mp);
}
function vfx(world,o,good=true) {
  const col=good?o.color:'#e84050';
  addEffect(new Column(o.x,o.y,col,.65,24,260));
  addEffect(new Ring(o.x,o.y,.2,3.2,.65,col,5));
  burst(o.x,o.y,22,good?'arcane':'blood',22,3.5,{up:1.4});
  sparkle(o.x,o.y,24,col,12,.55);
  sfx(good?'levelup':'roar',.45);
}
function used(world,o) {
  o.opened=true; o.used=true; o.dot='#68606a';
  const claims=G.char && (G.char.worldObjectClaims ||= {});
  if(claims) claims[o.claimKey]=true;
  G.game?.autosave?.();
  vfx(world,o,true);
}
function ask(world,o,title,body,accept) {
  return UI.confirm(title,body,()=>{ if(G.world!==world||o.opened)return; if(accept()===false)return; used(world,o); },'Accept','Leave');
}
function randomEnemy(world,x,y,rank='normal',hp=1) {
  const arch=pick(world.roster?.length?world.roster:world.biome?.roster||['skeleton']);
  if(!arch)return null;
  const [mx,my]=world.map.randomNear(x,y,1.3), m=makeMonster(world,arch,world.biome,level(world),rank,mx,my,0);
  if(m){m.maxHp*=hp;m.hp=m.maxHp;m.awake=true;world.add(m);} return m;
}
function beginWaves(world,o,count,rewardCount=1) {
  o.waveRun={left:count,wait:.45,foes:[],rewardCount};
  (world.worldObjectsActive ||= []).push(o);
  UI.centerMsg(o.name.toUpperCase(),`Survive ${count} wave${count===1?'':'s'} to claim the reward`,2.6);
}
function choose(world,o,title,body,choices) {
  UI.dialog({title,html:`<p>${body}</p>`,buttons:[...choices.map(c=>({label:c.label,cls:c.cls||'',fn:()=>{if(G.world===world&&!o.opened){used(world,o);c.run();}}})),{label:'Leave'}]});
}
function safeCost(p,cost) { if(p.char.gold<cost){UI.log('You do not have enough gold for the offering.','#ff8080');return false;} p.char.gold-=cost;return true; }

function applyBlessing(world,o) {
  const p=G.player, scale=rewardScale(o), duration=Math.round((o.id==='phoenix'||o.id==='echoes'||o.id==='colossus'?105:210)*Math.min(1.4,scale));
  const defs={
    might:['Might', {dmg:24}], fortitude:['Fortitude',{life:22,armor:18,reduce:8}],
    swiftness:['Swiftness',{as:22,speed:20}], sorcery:['Sorcery',{dmg:16,regen:24}],
    fortune:['Fortune',{gf:45,mf:35}], precision:['Precision',{crit:20,critDmg:24}],
    phoenix:['the Phoenix',{}], echoes:['Echoes',{echoChance:18}],
    colossus:['the Colossus',{dmg:22,areaPct:18}], elements:['the Elements',{}],
  };
  let [title,stats]=defs[o.id];
  const extra={};
  if(o.id==='phoenix')extra.phoenixCharges=1;
  if(o.id==='colossus')extra.transform=true;
  if(o.id==='elements'){
    const element=pick(['fire','cold','light','poison','arcane']); stats={elemental:{[element]:28}}; title=`the Elements (${element})`;
  }
  used(world,o); addBuff(p,o,`Shrine of ${title}`,o.color,stats,duration,extra);
  if(o.id==='fortitude')p.heal(p.maxHp*.12);
  UI.log(`<b style="color:${o.color}">${esc(o.name)}</b> grants ${esc(title)} for ${duration} seconds.`,o.color);
}

function useObject(world,o) {
  const p=G.player,d=level(world),s=rewardScale(o), cost=Math.max(1,Math.round(goldPile(d)*s*1.5));
  if(o.category==='blessing'){applyBlessing(world,o);return;}
  switch(o.id){
    case 'blood': return ask(world,o,o.name,'Sacrifice 20% of your current health for a strong damage blessing and a depth-scaled treasure cache?',()=>{p.hp=Math.max(1,p.hp-p.hp*.2);addBuff(p,o,'Blood Price','#e85060',{dmg:42},150);rewardChest(world,o,1);});
    case 'greed': return ask(world,o,o.name,'Strengthen nearby enemies for better treasure? The choice cannot be undone this floor.',()=>{for(const m of world.creatures)if(m.team==='enemy'&&!m.dead&&dist(m.x,m.y,o.x,o.y)<9){m.maxHp*=1.35;m.hp=m.maxHp;m.dmg*=1.18;}rewardChest(world,o,2);});
    case 'torment': return ask(world,o,o.name,'Accept a 90-second weakening curse for a depth-appropriate equipment reward?',()=>{addBuff(p,o,'Torment','#a72848',{speed:-18,dmg:-12},90,{curse:true});rewardChest(world,o,1);});
    case 'shadows': return ask(world,o,o.name,'Trade defense for increased shadow damage for 150 seconds?',()=>addBuff(p,o,'Shadow Pact','#8d61c9',{elemental:{shadow:32},reduce:-12},150));
    case 'chaos': return ask(world,o,o.name,'Accept a randomized blessing and curse?',()=>{const a=pick([{good:{dmg:28},bad:{reduce:-10}},{good:{as:26},bad:{speed:-14}},{good:{mf:55},bad:{armor:-18}}]);addBuff(p,o,'Chaotic Boon',o.color,a.good,150);addBuff(p,{...o,id:'chaos_curse'},'Chaotic Price','#b44adc',a.bad,150,{curse:true});});
    case 'damned': return ask(world,o,o.name,'Summon a dangerous champion. Defeat it for a bonus hoard?',()=>{const m=randomEnemy(world,o.x,o.y,'champion',2.5);if(m){m.name='Warden of the Damned';m.onDeath=()=>rewardChest(world,o,2);}else rewardChest(world,o,1);});
    case 'decay': return ask(world,o,o.name,'Lose a small amount of health over time for increased attack power?',()=>{addBuff(p,o,'Decaying Might','#92a343',{dmg:38},120,{curse:true,selfDrain:.015});});
    case 'corruption': return ask(world,o,o.name,'Make this floor’s enemies stronger in exchange for a major reward?',()=>{for(const m of world.creatures)if(m.team==='enemy'&&!m.dead){m.maxHp*=1.16;m.hp=m.maxHp;m.dmg*=1.12;}rewardChest(world,o,2);});
    case 'life': used(world,o);healing(p,p.maxHp*.55,0);break;
    case 'mana': used(world,o);healing(p,0,p.maxMana*.65);break;
    case 'rejuvenation': used(world,o);p.applyRejuvenation();break;
    case 'purification': used(world,o);p.status={};p.curses={};for(let i=p.buffs.length-1;i>=0;i--)if(p.buffs[i].curse)p.buffs.splice(i,1);p.recompute();break;
    case 'renewal': used(world,o);healing(p,p.maxHp*.4,p.maxMana*.4);for(const k in p.cooldowns)p.cooldowns[k]=Math.max(0,p.cooldowns[k]-8);break;
    case 'bloodspring': return ask(world,o,o.name,`Pay ${cost.toLocaleString()} gold to restore 70% health?`,()=>{if(!safeCost(p,cost))return false;healing(p,p.maxHp*.7,0);});
    case 'unstable_fountain': return choose(world,o,o.name,'The water shifts between three unstable currents. Choose one.',[
      {label:'Restore',run:()=>healing(p,p.maxHp*.45,p.maxMana*.45)},{label:'Blessing',run:()=>addBuff(p,o,'Unstable Boon',o.color,{dmg:18,speed:14},120)},{label:'Drink Deep',run:()=>{healing(p,p.maxHp*.75,p.maxMana*.75);if(chance(.25)){p.hp=Math.max(1,p.hp-p.maxHp*.18);}}},
    ]);
    case 'fortune_statue': case 'dice': case 'wheel': case 'gambler': case 'trickster': case 'oracle': case 'coin': return useGamble(world,o,cost);
    case 'sacrifice': return ask(world,o,o.name,'Give up one quarter of your current health for a depth-scaled reward?',()=>{p.hp=Math.max(1,p.hp-p.hp*.25);rewardChest(world,o,1);});
    case 'soul_obelisk': return ask(world,o,o.name,'Awaken the obelisk’s guardians. Their defeat will charge it and release a reward.',()=>{beginWaves(world,o,1,2);});
    case 'offering': return ask(world,o,o.name,`Offer ${cost.toLocaleString()} gold for a temporary blessing?`,()=>{if(!safeCost(p,cost))return false;addBuff(p,o,'Offering’s Favor',o.color,{dmg:20,as:14},150);});
    case 'fallen_ritual': return choose(world,o,o.name,'Choose how many waves to call. Later waves pay more.',[1,2,3].map(n=>({label:`${n} wave${n===1?'':'s'}`,run:()=>beginWaves(world,o,n,n)})));
    case 'transmutation': return sacrificeEquipment(world,o);
    case 'power_monolith': return ask(world,o,o.name,'Gain tremendous power, but suffer reduced defenses for 120 seconds?',()=>{addBuff(p,o,'Monolith’s Might',o.color,{dmg:48,reduce:-18},120);});
    case 'reliquary': return sacrificeGem(world,o,cost);
    case 'mysterious_monolith': return ask(world,o,o.name,'Wake the monolith and accept one of its uncertain effects?',()=>resolveMystery(world,o));
    case 'skull': return choose(world,o,o.name,'The skull offers a reward, but its promise is uncertain.',[
      {label:'Hear the boon',run:()=>resolveMystery(world,o)},{label:'Silence it',run:()=>rewardChest(world,o,1)},
    ]);
    case 'mirror': return ask(world,o,o.name,'Let the mirror shape a hostile reflection of you?',()=>{const m=randomEnemy(world,o.x,o.y,'champion',2.1);if(m){m.name=`${p.char.name || 'Hero'}’s Reflection`;m.aura='#8adfff';m.dmg=Math.max(m.dmg,Math.round((p.st.weapon?.[1]||10)*.8));m.onDeath=()=>rewardChest(world,o,2);}});
    case 'sarcophagus': return ask(world,o,o.name,'Open the sarcophagus? It may hold treasure, guardians, or a curse.',()=>resolveMystery(world,o));
    case 'urn': return ask(world,o,o.name,'Break the seal? The urn may release treasure, spirits, or a harmful cloud.',()=>resolveMystery(world,o));
    case 'tome': return choose(world,o,o.name,'Read the forbidden text for a temporary skill boon, or leave it sealed.',[
      {label:'Read',run:()=>{if(chance(.25))beginWaves(world,o,1,1);else addBuff(p,o,'Forbidden Insight',o.color,{dmg:20,cdr:18},150);}},
    ]);
    case 'shifting_portal': return ask(world,o,o.name,'Step through? It leads to a nearby reachable place and may carry a surprise.',()=>{resolvePortal(world,o);});
    case 'living_statue': return ask(world,o,o.name,'Approach the statue and risk awakening it?',()=>resolveMystery(world,o));
    case 'pylon': return ask(world,o,o.name,'Activate its field? The runes will burn nearby enemies and bolster you for a short time.',()=>{o.fieldT=20;o.fieldTick=.1;(world.worldObjectsActive ||= []).push(o);addBuff(p,o,'Runic Field',o.color,{res:16,reduce:8},20);});
    case 'lantern': used(world,o);revealNearby(world,o);break;
    case 'war_horn': return choose(world,o,o.name,'Choose how many enemy waves to summon. More waves bring a larger hoard.',[1,2,3].map(n=>({label:`${n} wave${n===1?'':'s'}`,cls:'red',run:()=>beginWaves(world,o,n,n)})));
    default: used(world,o);rewardChest(world,o,1);
  }
  if(o.opened)UI.log(`<b style="color:${o.color}">${esc(o.name)}</b> is spent.`,o.color);
}

function useGamble(world,o,cost) {
  const p=G.player;
  const wager=Math.max(cost,Math.round(goldPile(level(world))*rewardScale(o)*3));
  const titles={fortune_statue:'Spend gold for a randomized depth-scaled reward?',dice:'Roll for treasure or a dangerous result?',wheel:'Spin for a possible jackpot?',gambler:'Wager gold to multiply it?',trickster:'Risk a trickster’s wager?',oracle:'Pay to choose one of three revealed rewards?',coin:'Flip for doubled treasure or nothing?'};
  const button= o.id==='oracle'?'Reveal choices':o.id==='coin'?'Flip':o.id==='gambler'?'Wager':o.id==='wheel'?'Spin':o.id==='dice'?'Roll':o.id==='trickster'?'Accept the wager':'Play';
  return UI.confirm(o.name,`${titles[o.id]} Wager: ${wager.toLocaleString()} gold.`,()=>{
    if(G.world!==world||o.opened||!safeCost(p,wager))return;used(world,o);
    if(o.id==='oracle'){const opts=[()=>rewardChest(world,o,1),()=>goldReward(world,o,5),()=>world.addLoot(new GroundItem(o.x,o.y+.3,'item',{item:rollGroundGem(level(world)+4)}))];UI.dialog({title:'Choose your fate',html:'<p>Only one reward can be claimed.</p>',buttons:opts.map((fn,i)=>({label:['Cache','Gold','Gem'][i],fn}))});return;}
    const win=chance(o.id==='gambler'?.45:o.id==='trickster'?.5:.55);
    if(win){if(o.id==='gambler'||o.id==='coin')goldReward(world,o,6);else if(o.id==='wheel')rewardChest(world,o,2);else rewardChest(world,o,1);}
    else if(o.id==='trickster'||o.id==='dice')beginWaves(world,o,1,1);else UI.log('The wager is lost.','#ff9090');
  },button,'Leave');
}

function sacrificeEquipment(world,o) {
  const c=G.char, gear=(c.bag||[]).map((item,index)=>({item,index})).filter(v=>v.item&&v.item.type!=='gem');
  if(!gear.length){UI.log('The stone finds no equipment in your backpack to transmute.','#c8d8e0');return;}
  UI.dialog({title:o.name,html:'<p>Select one backpack item to sacrifice for a depth-appropriate replacement. Equipped gear is protected.</p>',buttons:[...gear.slice(0,18).map(({item,index})=>({label:itemName(item),fn:()=>{
    if(o.opened||!c.bag[index])return;
    UI.confirm('Confirm sacrifice',`Destroy ${itemName(item)} and receive a randomized replacement?`,()=>{
      if(G.world!==world||o.opened||!c.bag[index])return;c.bag[index]=null;used(world,o);
      const replacement=rollGroundItem(level(world)+2,{rarity:rarityAt(level(world)+2,rar(o.rarity).name==='Mythic'?5:rar(o.rarity).name==='Legendary'?4:3),mf:G.player.st.magicFind});
      world.addLoot(new GroundItem(o.x,o.y+.3,'item',{item:replacement}));UI.log(`The stone consumes the offering and shapes ${itemName(replacement)}.`,o.color);
    },'Sacrifice','Keep item');
  }})),{label:'Leave'}]});
}
function sacrificeGem(world,o,cost) {
  const c=G.char, gems=(c.gemBag||[]).map((item,index)=>({item,index})).filter(v=>v.item&&v.item.type==='gem');
  if(!gems.length){UI.log('The reliquary requires a gem offering.','#d8c080');return;}
  UI.dialog({title:o.name,html:'<p>Choose one gem to offer. Its reward obeys current depth and character-level limits.</p>',buttons:[...gems.slice(0,18).map(({item,index})=>({label:itemName(item),fn:()=>{
    if(o.opened||!c.gemBag[index])return;
    UI.confirm('Confirm offering',`Offer ${itemName(item)} for a chance at depth-appropriate equipment?`,()=>{
      if(G.world!==world||o.opened||!c.gemBag[index])return;c.gemBag[index]=null;used(world,o);
      if(chance(.65*rewardScale(o)))world.addLoot(new GroundItem(o.x,o.y+.3,'item',{item:rollGroundItem(level(world)+3,{rarity:rarityAt(level(world)+3,Math.min(19,4+o.rarity)),mf:G.player.st.magicFind})}));
      else goldReward(world,o,2);
    },'Offer gem','Keep gem');
  }})),{label:'Leave'}]});
}
function resolveMystery(world,o) {
  const p=G.player, out=randi(0,4);
  if(out===0){rewardChest(world,o,chance(.3)?2:1);}
  else if(out===1){goldReward(world,o,3);}
  else if(out===2){addBuff(p,o,'Whispered Boon',o.color,{dmg:20,as:14},120);}
  else if(out===3){beginWaves(world,o,1,1);}
  else {p.hp=Math.max(1,p.hp-p.maxHp*.12);addBuff(p,{...o,id:o.id+'_hex'},'Whispered Hex','#aa5065',{speed:-12},75,{curse:true});}
}
function resolvePortal(world,o) {
  const p=G.player,map=world.map, rooms=(world.rooms||[]).filter(r=>r.w&&r.h);
  let dest=null;
  for(const r of rooms.sort(()=>Math.random()-.5)){
    const x=r.mx??r.x+r.w/2,y=r.my??r.y+r.h/2;
    if(dist(x,y,p.x,p.y)>7&&map.walkable(x,y)&&map.findPath(p.x,p.y,x,y,12000)){dest=[x,y];break;}
  }
  if(!dest){const x=map.randomNear(p.x,p.y,6);if(map.walkable(x[0],x[1]))dest=x;}
  if(dest){p.x=dest[0];p.y=dest[1];p.path=null;p.moveTarget=null;p.interact=null;map.reveal(p.x,p.y,6);}
  resolveMystery(world,o);
}
function revealNearby(world,o) {
  world.map.reveal(o.x,o.y,14);
  for(const chest of world.chests)if(!chest.opened&&dist(chest.x,chest.y,o.x,o.y)<14){
    const x=Math.floor(chest.x),y=Math.floor(chest.y);world.map.reveal(x,y,2);chest.revealedUntil=(world.time||0)+12;
  }
  UI.log('The lantern’s spirit light reveals nearby chambers and hidden finds.','#ffe8a0');
}

function findSprite(world,o) {
  const list=world.tileset?.scatter||[], re=new RegExp(o.art,'i');
  return list.find(s=>re.test(s.name||''))||list.find(s=>/altar|idol|obelisk|statue|urn|basin|lantern/i.test(s.name||''))||null;
}
function findShrineSprite(world,o) {
  const list=world.tileset?.scatter||[];
  const preferred=[/shrine|blessing_shrine|altar_flame|sun_disk_dais|convergence_dais|nebula_shrine|aurora_shrine/i,/altar|font|reliquary|idol|obelisk/i,/statue/i];
  for(const re of preferred){
    const matches=list.filter(s=>re.test(s.name||''));
    if(matches.length)return matches.sort((a,b)=>(b.w*b.h)-(a.w*a.h))[0];
  }
  return findSprite(world,o);
}
function drawObject(world,o,ctx,sx,sy) {
  const shrine=!!o.isDungeonShrine,pulse=.8+.2*Math.sin(G.time*2.6+o.x);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(sx,sy,shrine?26:18,shrine?11:7,0,0,TAU);ctx.fill();
  if(shrine){
    // Inlaid altar circle: a screen-space echo of the matching floor sigil, visible even in busy fights.
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.34*pulse;ctx.strokeStyle=o.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(sx,sy+1,31,13,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=.2*pulse;ctx.beginPath();ctx.ellipse(sx,sy+1,22,9,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=.14*pulse;ctx.beginPath();ctx.moveTo(sx-36,sy+1);ctx.lineTo(sx+36,sy+1);ctx.moveTo(sx,sy-13);ctx.lineTo(sx,sy+15);ctx.stroke();
    ctx.restore();
  }
  const spr=o.spr,baseK=world.tileset?.k||.4,k=shrine&&spr?Math.max(baseK,Math.min(baseK*1.7,64/Math.max(spr.w,spr.h))):baseK;
  let top=sy-46;
  if(spr){top=sy+spr.oy*k;ctx.drawImage(spr.img,spr.sx,spr.sy,spr.w,spr.h,sx+spr.ox*k,top,spr.w*k,spr.h*k);}
  else{
    ctx.fillStyle='#39313c';ctx.beginPath();ctx.moveTo(sx-15,sy-4);ctx.lineTo(sx,sy+3);ctx.lineTo(sx+15,sy-4);ctx.lineTo(sx+12,sy-36);ctx.lineTo(sx,sy-46);ctx.lineTo(sx-12,sy-36);ctx.fill();
    ctx.strokeStyle=o.color;ctx.lineWidth=2;ctx.stroke();
  }
  if(!o.opened){
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=shrine?.36*pulse:.26+Math.sin(G.time*3+o.x)*.14;
    const glowSize=shrine?100:48;ctx.drawImage(glowSprite(o.color),sx-glowSize/2,top-glowSize*.68,glowSize,glowSize);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';addLight(o.x,o.y,shrine?5:2.2,shrine?.9:.65,shrine?42:28,o.color,shrine);
  }
  if(shrine&&G.player&&Math.hypot(o.x-G.player.x,o.y-G.player.y)<14){
    const labelY=top-10;ctx.save();ctx.font='700 11px Cinzel, Georgia, serif';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.lineWidth=3;ctx.strokeStyle='rgba(12,8,5,.95)';ctx.strokeText('SHRINE',sx,labelY);
    ctx.fillStyle='#ffe6a0';ctx.fillText('SHRINE',sx,labelY);ctx.restore();
  }
  if(o.fieldT>0){ctx.globalAlpha=.28;ctx.strokeStyle=o.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,52,22,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
  if(o.revealedUntil>(world.time||0)){ctx.strokeStyle=o.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,24,10,0,0,TAU);ctx.stroke();}
}

function roomSpots(world,start,count,special) {
  const map=world.map,out=[],rooms=(world.rooms||[]).filter(r=>r.w||r.h).sort(()=>Math.random()-.5);
  for(const r of rooms){if(out.length>=count)break;
    const cx=r.mx??r.cx??r.x+(r.w||1)/2,cy=r.my??r.cy??r.y+(r.h||1)/2;
    if(dist(cx,cy,start[0],start[1])<(special?6:8))continue;
    let [x,y]=[cx+rand(-1,1),cy+rand(-1,1)];if(!map.walkable(x,y))[x,y]=map.randomNear(cx,cy,2);
    if(!map.walkable(x,y)||out.some(q=>dist(q[0],q[1],x,y)<5)||world.chests.some(c=>dist(c.x,c.y,x,y)<3)||(world.portals||[]).some(p=>dist(p.x,p.y,x,y)<5))continue;
    if(!map.findPath(start[0],start[1],x,y,12000))continue;
    out.push([x,y]);
  }
  if(out.length>=count)return out;
  // Non-dungeon maps have no room records. Flood-fill reachable floor once instead of
  // repeatedly running A* across large overworlds, then sample a few distant tiles.
  const W=map.w,H=map.h,N=W*H,seen=new Uint8Array(N),queue=new Int32Array(N),sx=Math.floor(start[0]),sy=Math.floor(start[1]);
  if(sx>=0&&sy>=0&&sx<W&&sy<H&&map.walkableTile(sx,sy)){
    let head=0,tail=0;const first=sy*W+sx;queue[tail++]=first;seen[first]=1;
    while(head<tail){const i=queue[head++],x=i%W,y=(i/W)|0;
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const j=ny*W+nx;if(seen[j]||!map.walkableTile(nx,ny))continue;
        if(ox&&oy&&(!map.walkableTile(x+ox,y)||!map.walkableTile(x,y+oy)))continue;
        if(map.hgt&&!map.stepsOk(x,y,ox,oy))continue;seen[j]=1;queue[tail++]=j;
      }
    }
    let available=tail;
    for(let tries=0;tries<Math.min(tail,160)&&out.length<count;tries++){
      const qi=randi(0,available-1),i=queue[qi];queue[qi]=queue[--available];const x=i%W+.5,y=Math.floor(i/W)+.5;
      if(dist(x,y,start[0],start[1])<(special?6:8)||out.some(q=>dist(q[0],q[1],x,y)<5)||world.chests.some(c=>dist(c.x,c.y,x,y)<3)||(world.portals||[]).some(p=>dist(p.x,p.y,x,y)<5))continue;
      if(!map.findPath(start[0],start[1],x,y,4000))continue;out.push([x,y]);
    }
  }
  return out;
}

/** Add one single-use object to a floor, in its reserved shrine room when the dungeon has one. */
export function setupWorldObjects(world,start,{special=false}={}) {
  if(!world?.map||!world.tileset||world.kind==='town'||!start)return 0;
  world.chests ||= [];
  const claimKey=makeClaimKey(world),claims=G.char?.worldObjectClaims||{};
  if(claims[claimKey])return 0;
  // Every ordinary dungeon reserves one authored shrine chamber for exactly one new object.
  // Special areas keep their separate placement because many have no room grid.
  const shrineRoom=!special?(world.rooms||[]).find(r=>r.shrineRoom):null;
  const spots=[];
  if(shrineRoom){
    const cx=shrineRoom.mx??shrineRoom.x+(shrineRoom.w||1)/2,cy=shrineRoom.my??shrineRoom.y+(shrineRoom.h||1)/2;
    let x=Math.floor(cx)+.5,y=Math.floor(cy)+.5;
    if(!world.map.walkable(x,y))[x,y]=world.map.randomNear(cx,cy,2);
    if(world.map.walkable(x,y)&&world.map.findPath(start[0],start[1],x,y,12000))spots.push([x,y]);
  }
  if(!spots.length)spots.push(...roomSpots(world,start,1,special));
  let made=0;
  for(const [x,y] of spots){
    const def=pick(CATALOG),isDungeonShrine=!!shrineRoom&&!special,o={...def,x,y,opened:false,reach:1.55,far:34,label:def.name,dot:def.color,rarity:rollRarity(),claimKey,spr:null,isDungeonShrine};
    o.label=`${rar(o.rarity).name} ${o.name}`;o.spr=isDungeonShrine?findShrineSprite(world,o):findSprite(world,o);
    o.draw=(ctx,sx,sy)=>drawObject(world,o,ctx,sx,sy);
    o.use=()=>{if(o.opened||G.world!==world)return;useObject(world,o);};
    world.chests.push(o);made++;
  }
  return made;
}

/** Tick continuing rituals, charged stones and pylon fields on every world type. */
export function worldObjectsTick(world,dt) {
  if(!world?.worldObjectsActive)return;
  const p=world.player;
  for(const o of world.worldObjectsActive){
    if(o.waveRun){
      const run=o.waveRun;
      run.foes=run.foes.filter(m=>!m.dead);
      if(!run.foes.length&&run.left>0&&(run.wait-=dt)<=0){
        const before=world.creatures.length;ambush(world,undefined,randi(3,5));
        run.foes.push(...world.creatures.slice(before).filter(m=>m.team==='enemy'));
        if(run.foes.length){run.left--;run.wait=6;} else {run.left=0;}
      }else if(run.left===0&&!run.foes.length){rewardChest(world,o,run.rewardCount);o.waveRun=null;UI.centerMsg(o.name.toUpperCase(),'The reward is yours',2);}
    }
    if(o.fieldT>0){
      o.fieldT-=dt;o.fieldTick-=dt;
      if(o.fieldTick<=0){o.fieldTick=.8;
        for(const m of world.hostiles('player',o.x,o.y,3.4))if(m.team==='enemy'&&!m.dead)hit(p,m,Math.max(8,(p?.st?.weapon?.[1]||10)*.4),'light',{noArc:true});
        addEffect(new Ring(o.x,o.y,.3,3.3,.55,o.color,3));
      }
      if(o.fieldT<=0)o.opened=true;
    }
  }
  world.worldObjectsActive=world.worldObjectsActive.filter(o=>o.waveRun||o.fieldT>0);
}

// Once a world-object effect has made a reward, its floor claim persists in the hero save.
export function clearWorldObjectBuffs(player) {
  if(!player?.buffs)return;
  const n=player.buffs.length;
  player.buffs=player.buffs.filter(b=>!b.worldObject);
  if(player.buffs.length!==n)player.recompute();
}
