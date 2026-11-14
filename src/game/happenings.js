// Happenings: the random things that keep a run worth watching for hours.
// Dungeon depths roll affixes, shrines, a treasure imp, a cursed chest, a fallen adventurer's
// remains and, now and then, Velscour's timed challenge. Kill streaks call out massacres everywhere, a new record
// depth every tenth gets fireworks, and each town visit can bring a festival, a blessing or a gift.
// Wiring: game.buildDungeon -> setupHappenings, game.update -> happeningsTick, combat kill -> world.onKill,
// game.enterTown -> townHappening, loot.dropLoot reads world.lootMul / world.goldMul. Shrines, remains and cursed
// chests live in world.chests (render.drawChest calls their draw()), so auto-play walks to them like chests.
import { G } from '../state.js';
import { rand, randi, chance, pick, TAU, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, Column, Bolt, burst, sparkle, spawn, floatText, elem, addLight, smoke, glowSprite } from '../gfx/vfx.js';
import { explosionFx } from '../gfx/shapes.js';
import { hit, aoe } from './combat.js';
import { makeMonster, makeElite, monsterBase } from './monster.js';
import { ambush } from './mayhem.js';
import { GroundItem, dropChest } from './loot.js';
import { rollItem, rollGem, potionItem, itemName, itemColor, rarityAt, goldScale } from '../data/items.js';
import { depthLevel, FINAL_DEPTH } from '../data/depth.js';
import { addToBag } from './player.js';
import { UI } from '../ui/ui.js';
import { addEncounters } from './encounters.js';
import { drawFolkPose } from './render.js';
import { TOWNSFOLK } from '../data/townsfolk.js';
import { setupScenario, scenarioTick } from './scenarios.js';
import { smiteKill } from './smite.js';
import { greedTick } from './greed.js';
import { worldHeresies } from './heresies.js';
import { DUNGEON_AFFIX_BY_ID, DUNGEON_AFFIX_CONFIG } from '../data/dungeonaffixes.js';

// ------------------------------------------------------------------------------------------------ shrines
export const SHRINES = {
  frenzy: { name: 'Shrine of Frenzy', color: '#ff7030', el: 'fire', buff: { as: 40 }, t: 40, msg: '+40% attack and cast speed' },
  fortune: { name: 'Shrine of Fortune', color: '#ffd040', el: 'holy', buff: { mf: 150, gf: 150 }, t: 60, msg: '+150% magic and gold find' },
  bulwark: { name: 'Shrine of the Bulwark', color: '#a0c0ff', el: 'cold', buff: { life: 40, reduce: 15 }, t: 60, msg: '+40% life, 15% less damage taken' },
  wisdom: { name: 'Shrine of Wisdom', color: '#60e0ff', el: 'arcane', buff: { xp: 75 }, t: 90, msg: '+75% experience' },
  wrath: { name: 'Shrine of Wrath', color: '#ff3050', el: 'blood', buff: { dmg: 50, crit: 40 }, t: 40, msg: '+50% damage, +10% critical chance' },
  storm: { name: 'Storm Shrine', color: '#b0a0ff', el: 'light', buff: {}, t: 30, msg: 'lightning lashes nearby foes', storm: true },
  renewal: { name: 'Shrine of Renewal', color: '#60ff80', el: 'poison', buff: { regen: 30 }, t: 30, msg: 'life and mana restored', heal: true },
};
const SHRINE_KEYS = Object.keys(SHRINES);

const EPITAPHS = [
  'who thought the imps were friendly', 'who skipped the potion vendor to save nine gold', 'who tried to pet the hound',
  'who said "one more depth" for the last time', 'who wore the Glass Cannon ring to a Blood Moon', 'who argued with a golem',
  'who heard Velscour laugh and laughed back', 'who blocked with their face', 'who opened the cursed chest alone',
  'who ran out of mana mid-sentence', 'who mistook a mimic for lunch', 'who never learned the boss could jump',
  'who believed the shrine was just decoration', 'who sold their shield for a nicer hat', 'who fought fair',
];
const FALLEN_NAMES = ['Brannoc', 'Ysolde', 'Tamsin', 'Garrick', 'Mirela', 'Old Hobb', 'Corwen', 'Edda', 'Faolan', 'Ingrith', 'Pell the Brave', 'Rook', 'Sabine', 'Torvald', 'Wenna'];

// ------------------------------------------------------------------------------------------------ setup
/** Floor spots the hero can walk to from the start, one per room centre (shuffled), avoiding the start room. */
function roomSpots(world, start, n) {
  const map = world.map, out = [];
  const rooms = (world.rooms || []).slice().sort(() => Math.random() - 0.5);
  for (const r of rooms) {
    if (out.length >= n) break;
    const cx = r.mx ?? r.x + r.w / 2, cy = r.my ?? r.y + r.h / 2;
    if (dist(cx, cy, start[0], start[1]) < 8) continue;
    let [x, y] = [cx + rand(-1, 1), cy + rand(-1, 1)];
    if (!map.walkable(x, y)) [x, y] = map.randomNear(cx, cy, 2);
    if (!map.walkable(x, y) || out.some((s) => dist(s[0], s[1], x, y) < 6)) continue;
    if (!map.findPath(start[0], start[1], x, y, 12000)) continue;
    out.push([x, y]);
  }
  return out;
}

/** Build the non-affix happenings for a floor after its selected affixes are applied. */
export function setupHappenings(world, start, gen) {
  const depth = world.depth || 1;
  world.onKill = onKill;
  world.happen = { t: 0, starT: rand(3, 6), streak: 0, streakT: 0, best: 0 };
  world.scenario = null;
  const affixes = new Set(Array.isArray(world.dungeonAffixes) ? world.dungeonAffixes : []);
  const affixCascade = worldHeresies(world).includes('omens');
  const torment = affixCascade && depth > FINAL_DEPTH;
  if (world.kind !== 'dungeon' || world.raid || gen.raid || world.biome.overworld) return;

  // These former level-wide effects now run only when their matching affix was selected.
  if (affixes.has('vault')) {
    const caches = roomSpots(world, start, DUNGEON_AFFIX_CONFIG.vault.extraCaches + 2);
    for (let i = 0; i < DUNGEON_AFFIX_CONFIG.vault.extraCaches && caches.length; i++) addCache(world, caches.pop());
  }
  if (affixes.has('horde')) {
    const extra = roomSpots(world, start, DUNGEON_AFFIX_CONFIG.horde.packLocations);
    const lvl = depthLevel(depth);
    for (const [x, y] of extra) {
      const arch = pick(world.roster || ['skeleton']);
      const [minSize, maxSize] = DUNGEON_AFFIX_CONFIG.horde.packSize;
      for (let i = 0; i < randi(minSize, maxSize); i++) {
        const [mx, my] = i ? world.map.randomNear(x, y, 1.6) : [x, y];
        world.add(makeMonster(world, arch, world.biome, lvl, 'normal', mx, my, 0));
      }
    }
  }
  if (affixes.has('champions')) {
    for (const m of world.creatures) if (m.team === 'enemy' && m.rank === 'normal' && chance(DUNGEON_AFFIX_CONFIG.champions.spawnChance)) makeElite(m, 'champion', depth, world);
  }

  const H = world.happen;
  if (torment) {
    const c = G.char, spots = roomSpots(world, start, 1);
    if (c && c.nemesis && spots.length) spawnNemesis(world, spots.pop(), c.nemesis);
    return;
  }
  if (depth >= FINAL_DEPTH) return;
  setupScenario(world, start); // biome set pieces remain independent of affixes
  const want = 1 + (chance(0.6) ? 1 : 0) + (chance(0.35) ? 1 : 0);
  const spots = roomSpots(world, start, want + 3);
  const c = G.char, nemSpot = c && c.nemesis && (depth >= c.nemesis.depth - 5 || affixCascade) ? spots.pop() : null;
  const nShrines = chance(0.7) ? (chance(0.35) ? 2 : 1) : 0;
  for (let i = 0; i < nShrines && spots.length; i++) addShrine(world, spots.pop(), pick(SHRINE_KEYS));
  if (spots.length && chance(0.35)) addRemains(world, spots.pop());
  if (spots.length && chance(0.22 + Math.min(0.15, depth * 0.002))) addCursed(world, spots.pop());
  addEncounters(world, roomSpots(world, start, 4));
  if (chance(0.3)) H.impT = rand(25, 70);
  if (chance(0.3)) H.challengeAt = randi(12, 30);
  if (nemSpot) spawnNemesis(world, nemSpot, c.nemesis);
  if (torment) return;
}

/** Announce the selected dungeon affixes and apply the floor-only Arcane Surge buff. */
export function announceDungeonAffixes(world) {
  const p = G.player;
  clearDungeonAffixBuff();
  const affixes = (world.dungeonAffixes || []).map((id) => DUNGEON_AFFIX_BY_ID[id]).filter(Boolean);
  if (affixes.some((affix) => affix.id === 'surge') && p && typeof p.addBuff === 'function') {
    p.addBuff({ id: 'dungeon_affix_surge', name: 'Arcane Surge', el: 'arcane', stats: DUNGEON_AFFIX_CONFIG.surge.playerStats, t: 1e6, max: 1e6, aura: true });
  }
  if (!affixes.length) return;
  const names = affixes.map((affix) => affix.name);
  setTimeout(() => {
    if (G.world !== world) return;
    UI.centerMsg(names.length === 1 ? names[0].toUpperCase() : 'AFFIXES ACTIVE', names.join(' · '), 3);
    UI.log(`Affixes active: <b>${names.map((name) => name.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join(' · ')}</b>`, '#ffb060');
  }, 2600);
}
// ------------------------------------------------------------------------------------------------ interactables
export function obelisk(ctx, x, y, col, lit, h = 34) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x, y, 15, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a3640'; ctx.beginPath(); ctx.moveTo(x - 13, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x + 13, y - 2); ctx.lineTo(x, y - 8); ctx.fill();
  ctx.fillStyle = '#56505e'; ctx.beginPath(); ctx.moveTo(x - 7, y - 4); ctx.lineTo(x - 4, y - h); ctx.lineTo(x, y - h - 6); ctx.lineTo(x, y); ctx.fill();
  ctx.fillStyle = '#403a48'; ctx.beginPath(); ctx.moveTo(x + 7, y - 4); ctx.lineTo(x + 4, y - h); ctx.lineTo(x, y - h - 6); ctx.lineTo(x, y); ctx.fill();
  const pulse = 0.55 + Math.sin(G.time * 3 + x) * 0.25;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = lit ? pulse : 0.15;
  ctx.drawImage(glowSprite(col), x - 22, y - h - 18, 44, 44);
  ctx.fillStyle = col; ctx.fillRect(x - 1.5, y - h + 4, 3, h - 14);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

export function addShrine(world, [x, y], key) {
  const S = SHRINES[key];
  world.chests.push({
    x, y, opened: false, reach: 1.5, far: 40, shrine: key, label: S.name, dot: S.color,
    draw(ctx, sx, sy) { obelisk(ctx, sx, sy, S.color, !this.opened); if (!this.opened) addLight(this.x, this.y, 2.4, 0.7, 30, S.color); },
    use() {
      if (this.opened) return;
      this.opened = true;
      const p = G.player;
      addEffect(new Column(x, y, S.color, 0.8, 30, 320));
      addEffect(new Ring(p.x, p.y, 0.2, 4, 0.7, S.color, 6));
      burst(p.x, p.y, 30, S.el, 30, 5, { up: 2 });
      sfx('levelup', 0.6);
      if (S.heal) { p.hp = p.maxHp; p.mana = p.maxMana; }
      if (typeof p?.addBuff === 'function') p.addBuff({ id: 'shrine_' + key, name: S.name, el: S.el, stats: S.buff, t: S.t, max: S.t, storm: S.storm });
      floatText(p.x, p.y, 90, S.name.toUpperCase(), S.color, 16, { life: 2 });
      UI.log(`<b style="color:${S.color}">${S.name}</b>: ${S.msg} for ${S.t} s.`, S.color);
    },
  });
}

// the fallen are painted adventurers of the Hollow's sort (knights, wardens, scouts, the odd wizard), lying where they fell
const FALLEN_LOOKS = () => TOWNSFOLK.filter((v) => v.knight || v.guard || v.caster).map((v) => v.spriteId);
export function addRemains(world, [x, y]) {
  const who = pick(FALLEN_NAMES), why = pick(EPITAPHS), depth = world.depth, look = pick(FALLEN_LOOKS()), flip = chance(0.5);
  world.chests.push({
    x, y, opened: false, reach: 1.4, far: 22, label: `Remains of ${who}`, dot: '#e8dcc0',
    draw(ctx, sx, sy) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 20, 7, 0, 0, TAU); ctx.fill();
      if (drawFolkPose(ctx, look, 'dead', sx, sy + 2, flip, this.opened ? 0.85 : 1)) {
        if (!this.opened) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(G.time * 2.5) * 0.12; ctx.drawImage(glowSprite('#e8dcc0'), sx - 22, sy - 24, 44, 32); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        return;
      }
      ctx.fillStyle = '#d8ccb0';
      ctx.fillRect(sx - 9, sy - 3, 14, 3); ctx.fillRect(sx - 5, sy - 6, 2, 9); ctx.fillRect(sx + 1, sy - 5, 2, 8);
      ctx.beginPath(); ctx.arc(sx + 8, sy - 4, 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9aa0a8'; ctx.save(); ctx.translate(sx - 2, sy - 2); ctx.rotate(-0.5); ctx.fillRect(-1, -16, 2, 18); ctx.fillRect(-4, -2, 8, 2); ctx.restore();
      if (!this.opened) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(G.time * 2.5) * 0.12; ctx.drawImage(glowSprite('#e8dcc0'), sx - 18, sy - 22, 36, 30); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    },
    use() {
      if (this.opened) return;
      this.opened = true;
      sfx('bones'); sparkle(x, y, 10, '#e8dcc0', 12, 0.5);
      dropChest(world, { x, y, rare: chance(0.3) }, depth);
      UI.log(`Here lies <b>${who}</b>, ${why}. Their pack is yours now.`, '#d8ccb0');
    },
  });
}

export function addCache(world, [x, y]) {
  const depth = world.depth;
  world.chests.push({
    x, y, opened: false, reach: 1.3, rare: true, far: 30,
    use() { if (this.opened) return; this.opened = true; sfx('chest'); sfx('gold'); dropChest(world, this, depth); sparkle(x, y, 20, '#ffd060', 20, 0.5); },
  });
}

/** Opening it calls three ambush waves; outlive them and it spills a hoard. */
export function addCursed(world, [x, y]) {
  const depth = world.depth;
  const ch = {
    x, y, opened: false, reach: 1.4, far: 30, label: 'Cursed Chest', dot: '#ff3060', waves: 0, waveT: 0, done: false,
    draw(ctx, sx, sy) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(sx, sy, 17, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a1020'; ctx.beginPath(); ctx.moveTo(sx - 15, sy - 4); ctx.lineTo(sx, sy + 3); ctx.lineTo(sx + 15, sy - 4); ctx.lineTo(sx + 15, sy - 17); ctx.lineTo(sx, sy - 24); ctx.lineTo(sx - 15, sy - 17); ctx.fill();
      ctx.strokeStyle = '#ff4070'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 15, sy - 11); ctx.lineTo(sx, sy - 4); ctx.lineTo(sx + 15, sy - 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy + 3); ctx.lineTo(sx, sy - 10); ctx.stroke();
      if (!this.done) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(G.time * 4) * 0.2;
        ctx.drawImage(glowSprite('#ff2050'), sx - 30, sy - 46, 60, 52);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (chance(0.15)) spawn({ type: 'glow', x: this.x + rand(-0.4, 0.4), y: this.y + rand(-0.4, 0.4), z: rand(10, 30), vz: rand(20, 50), life: 0.6, size: 3, size1: 0, color: '#ff3060', add: true });
      }
    },
    use() {
      if (this.opened) return;
      this.opened = true;
      this.waves = 3; this.waveT = 0.6;
      camera.shake(6); sfx('roar', 0.8);
      addEffect(new Ring(x, y, 0.2, 6, 0.8, '#ff2050', 8));
      UI.centerMsg('THE CHEST IS CURSED', 'Survive three waves to claim the hoard', 2.6);
      world.happen.cursed = this;
    },
    tick(dt) {
      // the next wave comes on its timer, or at once when the last one is down: the hero never waits on the curse
      if (this.waves > 0 && this.mobs && !this.mobs.some((m) => !m.dead)) this.waveT = Math.min(this.waveT, 0.5);
      if (this.waves > 0 && (this.waveT -= dt) <= 0) {
        const n0 = world.creatures.length;
        ambush(world, undefined, randi(4, 7));
        (this.mobs || (this.mobs = [])).push(...world.creatures.slice(n0).filter((m) => m.team === 'enemy'));
        this.waves--; this.waveT = 7;
      }
      if (!this.waves && !this.done) {
        const p = world.player;
        // every wave monster dead (or a minute gone: some wandered off or fell in a hole)
        if (!(this.mobs || []).some((m) => !m.dead) || (this.waveT -= dt) < -60) {
          this.done = true;
          dropChest(world, { x, y, rare: true }, depth);
          dropChest(world, { x, y, rare: true }, depth);
          if (chance(0.5)) world.addLoot(new GroundItem(x, y + 0.3, 'item', { item: rollItem(depthLevel(depth) + 2, { rarity: rarityAt(depthLevel(depth) + 2, chance(0.03) ? 5 : chance(0.3) ? 4 : 3), mf: p.st.magicFind }) }));
          explosionFx(x, y, 2, 'holy', 'eruption');
          sfx('gate'); UI.centerMsg('CURSE BROKEN', 'The hoard is yours', 2.2);
          world.happen.cursed = null;
        }
      }
    },
  };
  world.chests.push(ch);
}

// ------------------------------------------------------------------------------------------------ nemesis
const SLAYER = ['the Hero-Slayer', 'Who Killed You', 'the Gloating', 'Bane of Heroes', 'the Unforgiven', 'Grave-Maker'];

/** Remember the monster that killed the hero (game.onPlayerDeath): it comes back as a unique. */
export function markNemesis(c, src, depth) {
  const k = src && src.owner && !src.isPlayer ? src.owner : src;
  if (!k || k.isPlayer || k.team !== 'enemy' || !k.arch || k.isRaid || k.isVelscour || k.goblin || k.rank === 'boss') return;
  const base = (k.name || '').replace(/^(Champion |Hunting |Hulking |Hexfire |Phasing |Burrowing )+/, '');
  c.nemesis = { arch: k.arch, art: k.art || null, swap: k.swap || null, name: base.split(' the ')[0] || base, title: pick(SLAYER), depth, kills: (c.nemesis && c.nemesis.arch === k.arch ? c.nemesis.kills : 0) + 1 };
}

export function spawnNemesis(world, [x, y], N) {
  const lvl = depthLevel(world.depth);
  const m = makeMonster(world, N.arch, world.biome, lvl + 2, 'unique', x, y, 1, N.art ? { art: N.art, swap: N.swap } : undefined);
  makeElite(m, 'unique', world.depth, world);
  m.name = `${N.name} ${N.title}`;
  m.maxHp *= 1.3 + 0.15 * Math.min(4, N.kills - 1); m.hp = m.maxHp; m.dmg *= 1.1; m.xp *= 3; m.scale = 1.45; m.aura = '#ff2a2a';
  m.nemesis = true;
  m.onDeath = () => {
    const c = G.char, p = G.player;
    c.nemesis = null;
    UI.centerMsg('REVENGE!', `${m.name} is slain`, 3);
    UI.log(`<b style="color:#ff4a3a">Revenge!</b> ${m.name} will not gloat again.`, '#ff8070');
    addEffect(new Column(m.x, m.y, '#ff4030', 1, 40, 420)); camera.shake(6); sfx('gate');
    for (let i = 0; i < 4; i++) world.addLoot(new GroundItem(m.x, m.y, 'item', { item: rollItem(lvl + 3, { mf: p.st.magicFind, bonus: 1.5 }) }));
    for (let i = 0; i < 8; i++) world.addLoot(new GroundItem(m.x, m.y, 'gold', { amount: Math.round((20 + lvl * 5) * goldScale(lvl) * rand(0.7, 1.4)) }));
  };
  world.add(m);
  world.happen.nemesis = m;
  setTimeout(() => { if (G.world === world && !m.dead) UI.log(`<b style="color:#ff4a3a">${m.name}</b> stalks this depth. It killed you once.`, '#ff8070'); }, 5200);
}

// ------------------------------------------------------------------------------------------------ treasure imp
/** A Treasure Imp's coins: `base` on the old line, kept up with prices (goldScale), gold find and the Greed lever. */
const impGold = (world, lvl, base) => Math.round(base * goldScale(lvl) * rand(0.7, 1.5) * (1 + ((G.player && G.player.st.goldFind) || 0) / 100) * (world.goldMul || 1));
export function spawnImp(world) {
  const p = world.player, map = world.map;
  let at = null;
  for (let i = 0; i < 30 && !at; i++) {
    const a = rand(TAU), r = rand(6, 9), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (map.circleFree(x, y, 0.35) && map.flowAt(x, y) >= 0 && (i > 20 || map.los(p.x, p.y, x, y))) at = [x, y];
  }
  if (!at) return;
  const lvl = depthLevel(world.depth);
  const m = makeMonster(world, 'imp', world.biome, lvl + 1, 'normal', at[0], at[1], 0, null);
  Object.assign(m, { name: 'Treasure Imp', goblin: true, aura: '#ffd040', scale: 0.9, dmg: 0, xp: m.xp * 8, awake: true, rank: 'unique', affixes: [] });
  m.maxHp *= 9; m.hp = m.maxHp; m.speed = 3.5; // the hero runs 4.2: it can be caught m.res = { phys: 0.1 };
  m.moves = null; m.summoner = false; m.proj = null; m.aoeCaster = false;
  const base = m.onDamaged.bind(m);
  m.onDamaged = (src, d) => {
    base(src, d);
    if (chance(0.45)) world.addLoot(new GroundItem(m.x, m.y, 'gold', { amount: impGold(world, lvl, 10 + lvl * 3) }));
  };
  m.onDeath = () => {
    sfx('gold'); sfx('chest'); camera.shake(5);
    explosionFx(m.x, m.y, 1.6, 'holy', 'eruption');
    for (let i = 0; i < 24; i++) world.addLoot(new GroundItem(m.x + rand(-0.6, 0.6), m.y + rand(-0.6, 0.6), 'gold', { amount: impGold(world, lvl, 25 + lvl * 6) }));
    for (let i = 0; i < randi(3, 5); i++) world.addLoot(new GroundItem(m.x, m.y, 'item', { item: rollItem(lvl + 2, { mf: G.player.st.magicFind, bonus: 1.3 }) }));
    if (chance(0.5)) world.addLoot(new GroundItem(m.x, m.y, 'item', { item: rollGem(lvl + 6) }));
    UI.centerMsg('TREASURE IMP SLAIN', 'It burst like a piÃ±ata', 2);
    world.happen.imp = null;
  };
  world.add(m);
  world.happen.imp = m; world.happen.impLeft = 32;
  addEffect(new Ring(m.x, m.y, 0.2, 2, 0.5, '#ffd040', 4));
  floatText(m.x, m.y, 70, 'Treasure Imp!', '#ffd040', 16, { life: 2 });
  UI.log('<b style="color:#ffd040">A Treasure Imp</b> scurries past, dripping gold. Catch it before it escapes!', '#ffd040');
  sfx('gold', 0.8);
}

function impTick(world, dt) {
  const H = world.happen, m = H.imp;
  if (!m) return;
  if (m.dead) { H.imp = null; return; }
  m.status.fear = { t: 1 }; // it always runs from the hero
  if (chance(dt * 8)) sparkle(m.x, m.y, 20, '#ffd040', 1, 0.3);
  if (chance(dt * 1.2)) world.addLoot(new GroundItem(m.x, m.y, 'gold', { amount: impGold(world, depthLevel(world.depth), 5 + depthLevel(world.depth) * 1.5) }));
  if ((H.impLeft -= dt) <= 0) {
    addEffect(new Ring(m.x, m.y, 2, 0.1, 0.5, '#ffd040', 4)); addEffect(new Column(m.x, m.y, '#ffd040', 0.5, 20, 240));
    floatText(m.x, m.y, 70, 'Escaped!', '#ffd040', 14, { life: 1.6 });
    UI.log('The Treasure Imp escaped through a rift, cackling.', '#c0a060');
    m.dead = true; H.imp = null; sfx('portal', 0.5);
  }
}

// ------------------------------------------------------------------------------------------------ challenge
export function startChallenge(world) {
  const depth = world.depth, need = Math.min(24, 10 + Math.floor(depth / 15)), time = 45; // monsters take a few seconds each
  world.happen.ch = { need, got: 0, left: time, shown: 0 };
  UI.centerMsg("VELSCOUR'S CHALLENGE", `Slay ${need} foes in ${time} seconds`, 2.6);
  UI.log(`<b style="color:#ff6030">Velscour's Challenge</b>: slay ${need} foes in ${time} seconds for a reward.`, '#ff8060');
  sfx('boss', 0.5);
  ambush(world, undefined, 5); // something to start on
}

function challengeTick(world, dt) {
  const C = world.happen.ch, p = world.player;
  if (!C) return;
  C.left -= dt;
  // nothing left to slay close by: Velscour sends more within a second, so the clock is never spent waiting
  const near = world.creatures.some((m) => m.team === 'enemy' && !m.dead && (m.targetable !== false || m.entering) && dist(m.x, m.y, p.x, p.y) < 10);
  C.quiet = near ? 0 : (C.quiet || 0) + dt;
  if (C.quiet > 0.6 && C.left > 2) { C.quiet = 0; ambush(world, undefined, randi(4, 6)); }
  if ((C.shown -= dt) <= 0) { C.shown = 1; floatText(p.x, p.y, 110, `${C.got}/${C.need} Â· ${Math.ceil(C.left)}s`, '#ff8060', 13, { life: 0.95, vz: 0 }); }
  if (C.got >= C.need) {
    world.happen.ch = null;
    const lvl = depthLevel(world.depth);
    UI.centerMsg('CHALLENGE MET', 'Velscour grudgingly pays up', 2.2);
    addEffect(new Column(p.x, p.y, '#ffd040', 0.9, 30, 360));
    for (let i = 0; i < 3; i++) world.addLoot(new GroundItem(p.x, p.y, 'item', { item: rollItem(lvl + 2, { mf: p.st.magicFind, bonus: 1 }) }));
    for (let i = 0; i < 6; i++) world.addLoot(new GroundItem(p.x, p.y, 'gold', { amount: Math.round((20 + lvl * 5) * goldScale(lvl) * rand(0.7, 1.3)) }));
    world.addLoot(new GroundItem(p.x, p.y, 'potion', { item: potionItem(pick(['rejuv', 'fury'])) }));
    sfx('gate');
  } else if (C.left <= 0) {
    world.happen.ch = null;
    UI.centerMsg('CHALLENGE FAILED', pick(['Velscour yawns.', '"Pathetic," echoes from below.', 'The abyss chuckles.']), 2);
    sfx('error');
  }
}

// ------------------------------------------------------------------------------------------------ kills, streaks
const STREAKS = [[10, 'KILLING SPREE'], [20, 'MASSACRE'], [35, 'BLOODBATH'], [50, 'CARNAGE'], [75, 'ANNIHILATION'], [100, 'GODLIKE'], [150, 'VELSCOUR TREMBLES']];

export function onKill(m) {
  const w = m.world || G.world, H = w && w.happen;
  if (!H || m.team !== 'enemy') return;
  smiteKill(m); // the Divine Smite meter (game/smite.js)
  H.kills = (H.kills || 0) + 1;
  if (H.ch) H.ch.got++;
  if (H.challengeAt && H.kills >= H.challengeAt) { H.challengeAt = 0; startChallenge(w); }
  if (w.dungeonAffixes && w.dungeonAffixes.includes('frenzy') && chance(DUNGEON_AFFIX_CONFIG.frenzy.orbChance)) w.addLoot(new GroundItem(m.x, m.y, chance(DUNGEON_AFFIX_CONFIG.frenzy.healthOrbChance) ? 'orb_hp' : 'orb_mp', {}));
  H.streak = H.streakT > 0 ? H.streak + 1 : 1;
  H.streakT = 4; // a few seconds a kill: the next one in time keeps the streak
  const s = STREAKS.find(([n]) => n === H.streak);
  if (s) {
    const p = G.player;
    floatText(p.x, p.y, 120, `${s[1]} Ã—${s[0]}`, H.streak >= 50 ? '#ff4030' : '#ffb040', 14 + Math.min(10, H.streak / 10), { life: 1.8, vz: 20 });
    addEffect(new Ring(p.x, p.y, 0.2, 3 + H.streak / 25, 0.5, '#ffb040', 5));
    sfx(H.streak >= 50 ? 'roar' : 'levelup', 0.45);
    p.gainXp(Math.round((m.xp || 0) * s[0] * 0.25));
    if (H.streak >= 35) w.addLoot(new GroundItem(p.x, p.y, 'potion', { item: potionItem(pick(['hp', 'rejuv'])) }));
    if (H.streak > (H.best || 0)) H.best = H.streak;
    if (G.char && H.streak > (G.char.bestStreak || 0)) G.char.bestStreak = H.streak;
  }
}

// ------------------------------------------------------------------------------------------------ the tick
export function happeningsTick(world, dt) {
  const H = world.happen, p = world.player;
  if (!H || !p || p.dead) return;
  H.t += dt;
  greedTick(world, dt); // the Greed lever's tougher monsters (game/greed.js)
  if (H.streakT > 0) H.streakT -= dt;
  const affixes = new Set(world.dungeonAffixes || []);
  if (affixes.has('starfall') && (H.starT -= dt) <= 0) {
    H.starT = rand(...DUNGEON_AFFIX_CONFIG.starfall.repeatDelay);
    starfall(world);
  }
  if (affixes.has('bloodmoon') && chance(dt * 4)) spawn({ type: 'glow', x: p.x + rand(-8, 8), y: p.y + rand(-8, 8), z: rand(40, 160), vz: -20, life: 1.4, size: rand(1.5, 3), size1: 0, color: '#ff2030', add: true });
  // storm shrine aura
  if (p.buffs.some((b) => b.storm) && (H.zapT = (H.zapT || 0) - dt) <= 0) {
    H.zapT = 0.6;
    const foes = world.hostiles('player', p.x, p.y, 6).filter((m) => m.team === 'enemy' && !m.dead).slice(0, 2);
    for (const m of foes) { addEffect(new Bolt(p.x, p.y, 40, m.x, m.y, 20, '#c0b0ff', 0.25, 3)); hit(p, m, Math.max(heroHit(p) * 1.4, normalLife(m) * 0.08), 'light', { noArc: true }); }
    if (foes.length) sfx('light', 0.3);
  }
  for (const ch of world.chests) if (ch.tick && ch.opened) ch.tick(dt);
  if (H.impT !== undefined && H.impT > 0 && (H.impT -= dt) <= 0 && !(world.boss && world.boss.awake && !world.boss.dead)) spawnImp(world);
  impTick(world, dt);
  challengeTick(world, dt);
  scenarioTick(world, dt);
}

/** A plain normal monster's life at m's level: monsters are sized to hero damage (data/depth.js toughness), weapons aren't. */
const normalLife = (m) => monsterBase(m.level || 1).hp;
/** About one of the hero's main-skill hits (for falling stars and shrine lightning). */
function heroHit(p) {
  const w = p.st.weapon;
  return Math.max(10, ((w[0] + w[1]) / 2) * (1 + (p.st.dmgPct + p.st.primary) / 100) * 1.5);
}

function starfall(world) {
  const p = world.player;
  const foes = world.hostiles('player', p.x, p.y, 11).filter((m) => m.team === 'enemy' && !m.dead && m.targetable !== false);
  const t = foes.length ? pick(foes) : null;
  const x = t ? t.x : p.x + rand(-7, 7), y = t ? t.y : p.y + rand(-7, 7);
  if (!world.map.walkable(x, y)) return;
  addEffect(new Column(x, y, '#c0e0ff', 0.45, 14, 420));
  setTimeout(() => {
    if (G.world !== world) return;
    explosionFx(x, y, 1.4, 'arcane', 'explosion', { sound: false });
    addEffect(new Ring(x, y, 0.2, 1.8, 0.4, '#e0f0ff', 4));
    for (const m of world.hostiles('player', x, y, 1.8)) if (m.team === 'enemy') hit(p, m, Math.max(heroHit(p) * 4, normalLife(m) * 0.5), 'arcane', { noArc: true, knock: 0.5 });
    sparkle(x, y, 20, '#ffffff', 10, 0.8); sfx('explode', 0.35); camera.shake(2);
  }, 380);
}

// ------------------------------------------------------------------------------------------------ milestones
/** First clear of a depth: every tenth is a new record worth fireworks (and a little gift). */
export function recordDepth(world, depth) {
  if (depth % 10 !== 0) return;
  const p = G.player;
  UI.centerMsg(`DEPTH ${depth} CONQUERED`, 'A new record descent', 3);
  for (let i = 0; i < 6; i++) setTimeout(() => { if (G.world === world && p) firework(p.x + rand(-4, 4), p.y + rand(-4, 4)); }, i * 260);
  world.addLoot(new GroundItem(p.x, p.y, 'item', { item: rollItem(depthLevel(depth) + 2, { rarity: rarityAt(depthLevel(depth) + 2, chance(0.12) ? 4 : 3), mf: p.st.magicFind }) }));
}

function firework(x, y) {
  const col = pick(['#ff4060', '#40c0ff', '#ffd040', '#60ff80', '#c060ff', '#ffffff']);
  for (let i = 0; i < 26; i++) {
    const a = rand(TAU), s = rand(2, 4.5);
    spawn({ type: 'glow', x, y, z: rand(150, 210), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(-30, 40), g: 60, life: rand(0.8, 1.4), size: rand(2, 4), size1: 0, color: col, add: true });
  }
  addLight(x, y, 4, 1, 180, col);
  sfx('explode', 0.25);
}

// ------------------------------------------------------------------------------------------------ town
export const TOWN_EVENTS = {
  festival: { name: 'Harvest Festival', color: '#ffb040', text: 'The Hollow celebrates! Free potions for the hero.', fn: (c) => { c.potions.hp += 3; c.potions.mp += 3; c.potions.rejuv += 1; return 'Received 3 healing, 3 mana and 1 rejuvenation potion.'; }, fireworks: true },
  priestess: { name: "The Priestess's Blessing", color: '#ffe080', text: 'Blessed for the next 3 depths: +15% damage, +15% life.', bless: { dmg: 15, life: 15 } },
  oracle: { name: 'The Fortune Teller', color: '#d080ff', text: 'Your stars align for 3 depths: +60% magic and gold find.', bless: { mf: 60, gf: 60 } },
  scholar: { name: 'A Travelling Scholar', color: '#60e0ff', text: 'Lessons in monster lore: +30% experience for 3 depths.', bless: { xp: 30 } },
  warden: { name: "The Watch Captain's Drill", color: '#a0c0ff', text: 'Drilled in the yard: 10% less damage taken for 3 depths.', bless: { reduce: 10 } },
  apprentice: { name: "The Blacksmith's Apprentice", color: '#ff9050', text: 'Practises on your gear for free.', fn: (c) => {
    const list = Object.values(c.equip).filter((it) => it && it.type === 'gear' && (it.upg || 0) < 10);
    if (!list.length) return 'Nothing left to improve.';
    const it = pick(list); it.upg = (it.upg || 0) + 1; return `${itemName(it)} is now +${it.upg}.`;
  } },
  peddler: { name: 'A Wandering Peddler', color: '#ff9a2a', text: 'Gifts you a treasure from the deep roads, made for your level.', fn: (c) => {
    const it = rollItem(c.level, { rarity: rarityAt(c.level, chance(0.02) ? 5 : chance(0.15) ? 4 : chance(0.6) ? 3 : 2) });
    return addToBag(c, it) ? `Received <span style="color:${itemColor(it)}">${itemName(it)}</span>.` : 'Your bag was full, so the peddler shrugged and left.';
  } },
  lottery: { name: 'The Town Lottery', color: '#ffd040', text: 'Your ticket wins!', fn: (c) => { const g = Math.round(randi(30, 90) * (5 + depthLevel(c.depth || 1)) * (1 + Math.max(0, c.level - 60) * 0.04)); c.gold += g; return `Won ${g} gold.`; } },
  gemfair: { name: 'The Gem Fair', color: '#c8f0ff', text: 'A jeweller hands out samples.', fn: (c) => { const g = rollGem(depthLevel(c.depth || 1) + 4); return addToBag(c, g) ? 'Received a gem.' : 'Your bag was full.'; } },
};
const TOWN_KEYS = Object.keys(TOWN_EVENTS);

/** Each town visit after the first may bring a happening. */
function clearDungeonAffixBuff() {
  const p = G.player;
  if (!p || !Array.isArray(p.buffs)) return;
  const oldLength = p.buffs.length;
  p.buffs = p.buffs.filter((buff) => buff.id !== 'omen' && buff.id !== 'dungeon_affix_surge');
  if (p.buffs.length !== oldLength) p.recompute();
}

export function townHappening(world) {
  const c = G.char;
  clearDungeonAffixBuff();
  if (!c || (c.townVisitCount || 0) < 2 || !chance(0.65)) return;
  const key = pick(TOWN_KEYS.filter((k) => k !== c.lastTownEvent));
  c.lastTownEvent = key;
  const E = TOWN_EVENTS[key];
  let extra = '';
  if (E.bless) c.blessing = { name: E.name, left: 3, stats: E.bless };
  if (E.fn) extra = E.fn(c);
  if (G.player) G.player.recompute();
  setTimeout(() => {
    if (G.world !== world) return;
    UI.centerMsg(E.name.toUpperCase(), E.text, 3);
    UI.log(`<b style="color:${E.color}">${E.name}</b>: ${E.text}${extra ? ' ' + extra : ''}`, E.color);
    sfx('gate', 0.5);
    UI.refresh();
  }, 1800);
  if (E.fireworks || chance(0.3)) world.happen = { t: 0, fireT: 2, fireLeft: 24 };
}

/** Town tick: fireworks over the square during a festival. */
export function townTick(world, dt) {
  const H = world.happen, p = world.player;
  if (!H || !H.fireLeft || !p) return;
  H.fireLeft -= dt;
  if ((H.fireT -= dt) <= 0) { H.fireT = rand(0.5, 1.4); firework(p.x + rand(-7, 7), p.y + rand(-7, 7)); }
}
