// Gilded critters: little treasures that cross the screen now and then (a gilded wisp drifting through the air, a
// starmoth, a golden scarab scuttling over the floor, now and then a prismatic wisp).
// they are the player's to tap (or click) before they get away. They aren't creatures, so nothing fights them.
// Each critter rolls a separate reward and gear tier; the species only determines its appearance and movement.
// Tier-colored sparks and a beacon ring help players spot them.
// Only a click or a tap catches one: the hero never does (they shy away from the hero, and nothing but
// catchCritterAt calls catchCritter).
// Looks: three.js models (tools/critters3d.html), baked by `node tools/critters3d_bake.js` into
// assets/sprites/critters/ (8 facings x walk/flap frames, a 12-frame idle for the wisps), each with a halo of lights.
// Wiring: game.update -> crittersTick, each critter is a 'top' effect (vfx.js) that moves and draws itself, and
// spectate.js hit-tests taps against world.critters (catchCritterAt).
import { G } from '../state.js';
import { rand, chance, pick, randi, TAU, fmtInt } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { camera, isoX, isoY } from '../core/view.js';
import { addEffect, Ring, glowSprite, sparkle, spawn, floatText, addLight } from '../gfx/vfx.js';
import { xpToNext } from './player.js';
import { goldPile, RARITY } from '../data/items.js';
import { ARCH } from '../data/enemies.js';
import { pixelSprite } from '../gfx/pixelart.js';
import { GroundItem, rollGroundGem } from './loot.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';

// fly: drifts in the air (z), else scuttles on the floor. w: spawn odds. life: seconds before it gets away.
export const CRITTERS = Object.freeze({
  // The original four species remain part of the pool; reward and tier are rolled independently.
  wisp: { name: 'Wisp', artIndex: 10, artKey: 'wisp', sprite: 'elemental', arch: 'elemental', fly: true, w: 1, life: 12, speed: 1.3, motion: 'drift', accent: 'flame' },
  moth: { name: 'Treasure Moth', artIndex: 11, artKey: 'moth', sprite: 'bat', arch: 'bat', fly: true, w: 1, life: 11, speed: 1.6, motion: 'flutter', accent: 'wings' },
  scarab: { name: 'Treasure Beetle', artIndex: 0, artKey: 'scarab', sprite: 'beetle', arch: 'beetle', fly: false, w: 1, life: 10, speed: 2.1, motion: 'scuttle', accent: 'shell' },
  prism: { name: 'Gold Sprite', artIndex: 19, artKey: 'prism', sprite: 'elemental', arch: 'elemental', fly: true, w: 1, life: 9, speed: 2, motion: 'dart', accent: 'runes' },
  crystal_scarab: { name: 'Crystal Scarab', artIndex: 1, sprite: 'knight', arch: 'knight', fly: false, w: 1, life: 10, speed: 1.8, motion: 'skitter', accent: 'crystals' },
  goldback_spider: { name: 'Goldback Spider', artIndex: 2, sprite: 'spider', arch: 'spider', fly: false, w: 1, life: 10, speed: 2.5, motion: 'skitter', accent: 'legs' },
  gem_tortoise: { name: 'Gem Tortoise', artIndex: 3, sprite: 'golem', arch: 'golem', fly: false, w: 1, life: 13, speed: 1.15, motion: 'steady', accent: 'shell' },
  coin_crab: { name: 'Coin Crab', artIndex: 4, sprite: 'abomination', arch: 'abomination', fly: false, w: 1, life: 10, speed: 1.75, motion: 'sidestep', accent: 'claws' },
  treasure_mimic: { name: 'Treasure Mimic', artIndex: 5, sprite: 'crate', fly: false, w: 1, life: 10, speed: 1.45, motion: 'hop', accent: 'mimic' },
  gilded_centipede: { name: 'Gilded Centipede', artIndex: 6, sprite: 'worm', arch: 'worm', fly: false, w: 1, life: 9, speed: 2.6, motion: 'slither', accent: 'segments' },
  rune_snail: { name: 'Rune Snail', artIndex: 7, sprite: 'slime', arch: 'slime', fly: false, w: 1, life: 12, speed: 1.1, motion: 'steady', accent: 'shell' },
  coin_rat: { name: 'Coin Rat', artIndex: 8, sprite: 'hound', arch: 'hound', fly: false, w: 1, life: 9, speed: 2.7, motion: 'dart', accent: 'ears' },
  treasure_imp: { name: 'Treasure Imp', artIndex: 9, sprite: 'imp', arch: 'imp', fly: false, w: 1, life: 9, speed: 2.4, motion: 'zigzag', accent: 'flame' },
  crystal_bat: { name: 'Crystal Bat', artIndex: 12, sprite: 'gargoyle', arch: 'gargoyle', fly: true, w: 1, life: 10, speed: 2.2, motion: 'swoop', accent: 'crystals' },
  rune_eye: { name: 'Rune Eye', artIndex: 14, sprite: 'eye', arch: 'eye', fly: true, w: 1, life: 10, speed: 1.7, motion: 'orbit', accent: 'runes' },
  spectral_jellyfish: { name: 'Spectral Jellyfish', artIndex: 15, sprite: 'cloud', fly: true, w: 1, life: 13, speed: 1.15, motion: 'bob', accent: 'ghost' },
  lantern_spirit: { name: 'Lantern Spirit', artIndex: 16, sprite: 'lantern', fly: true, w: 1, life: 12, speed: 1.3, motion: 'sway', accent: 'flame' },
  gem_dragonling: { name: 'Gem Dragonling', artIndex: 17, sprite: 'dragon', arch: 'demon', fly: true, w: 1, life: 10, speed: 2.4, motion: 'glide', accent: 'embers' },
  floating_skull: { name: 'Floating Skull', artIndex: 18, sprite: 'skeleton', arch: 'skeleton', fly: true, w: 1, life: 11, speed: 1.65, motion: 'drift', accent: 'ghost' },
  treasure_fairy: { name: 'Treasure Fairy', artIndex: 13, sprite: 'cultist', arch: 'cultist', fly: true, w: 1, life: 10, speed: 2.1, motion: 'flutter', accent: 'wings' },
});
const KEYS = Object.keys(CRITTERS);

export const CRITTER_REWARDS = Object.freeze([
  { id: 'xp', weight: 65, label: 'bonus experience', color: '#a8c8ff' },
  { id: 'gold', weight: 18, label: 'gold', color: '#ffd040' },
  { id: 'resource', weight: 7, label: 'health and mana orbs', color: '#ff6070' },
  { id: 'gem', weight: 5, label: 'upgrade gems', color: '#c080ff' },
  { id: 'jackpot', weight: 3, label: 'a gold jackpot', color: '#ffcf40' },
  { id: 'shrine', weight: 2, label: 'a temporary shrine blessing', color: '#70e8c0' },
]);
const TIER_COLORS = RARITY.map((r) => r.color);
const TINT = { canvas: null, ctx: null };
const SPRITE_CACHE = new Map();

function weightedChoice(list) {
  let r = rand(list.reduce((sum, item) => sum + item.weight, 0));
  for (const item of list) if ((r -= item.weight) <= 0) return item;
  return list[list.length - 1];
}
function rollCritterTier() {
  // Every critter tier is available at every depth. Keep T6's existing first-unlock odds,
  // then make each higher color progressively rarer.
  const tiers = RARITY.map((r) => ({
    weight: r.dropGroup === 'mythic' ? 0.012 * Math.pow(0.9, r.id - 5) : r.weight,
    id: r.id,
  }));
  let roll = rand(tiers.reduce((sum, t) => sum + t.weight, 0));
  for (const tier of tiers) if ((roll -= tier.weight) <= 0) return tier.id;
  return 0;
}
function critterReward(key) { return weightedChoice(CRITTER_REWARDS).id; }
function rewardLabel(id) { return CRITTER_REWARDS.find((r) => r.id === id)?.label || 'a reward'; }
function ensureTintCanvas() {
  if (!TINT.canvas) {
    TINT.canvas = document.createElement('canvas');
    TINT.canvas.width = TINT.canvas.height = 128;
    TINT.ctx = TINT.canvas.getContext('2d', { willReadFrequently: false });
  }
  return TINT;
}
function drawTinted(color, drawSource, tintAlpha = 0.58) {
  const { canvas, ctx } = ensureTintCanvas();
  ctx.clearRect(0, 0, 128, 128);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  drawSource(ctx);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = tintAlpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  return canvas;
}
function critterSprite(key, K) {
  if (!SPRITE_CACHE.has(key)) {
    const palette = K.arch && ARCH[K.arch] ? ARCH[K.arch].pal : { a: '#b08040', A: '#4a3020', b: '#6a3a20', c: '#d0a040', e: '#fff080', w: '#e8dcc0', k: '#100808' };
    SPRITE_CACHE.set(key, pixelSprite(K.sprite, palette, 4));
  }
  return SPRITE_CACHE.get(key);
}

// seconds between critters, now on a clock that doesn't wait for the last one to go: twice as many as the old 12-25 s
// gap after each critter's 9-12 s life (one every ~30 s); at most CRITTER_MAX at once
export const CRITTER_GAP = [10, 19];
export const CRITTER_MAX = 3;
// Let the entrance animation and spawn sparks finish before showing the first-time tutorial.
const CRITTER_TUTORIAL_SPAWN_DELAY = 1;
const CRITTER_TUTORIAL_POPUP = { root: null, title: null, reward: null, action: null, connector: null, connectorOutline: null, connectorLine: null, connectorTip: null };
function showCritterTutorialPopup(cr) {
  if (typeof document === 'undefined' || !document.body) return;
  const popup = CRITTER_TUTORIAL_POPUP;
  if (!popup.root) {
    const connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    connector.setAttribute('aria-hidden', 'true');
    connector.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483646;overflow:visible;pointer-events:none;display:none;';
    const connectorOutline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectorOutline.setAttribute('stroke', '#160e08');
    connectorOutline.setAttribute('stroke-width', '5');
    connectorOutline.setAttribute('stroke-linecap', 'round');
    const connectorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectorLine.setAttribute('stroke', '#d8ad53');
    connectorLine.setAttribute('stroke-width', '1.7');
    connectorLine.setAttribute('stroke-linecap', 'round');
    const connectorTip = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    connectorTip.setAttribute('r', '3');
    connectorTip.setAttribute('fill', '#e7c778');
    connectorTip.setAttribute('stroke', '#160e08');
    connectorTip.setAttribute('stroke-width', '1.5');
    connector.append(connectorOutline, connectorLine, connectorTip);
    document.body.appendChild(connector);

    const root = document.createElement('div');
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.style.cssText = 'position:fixed;z-index:2147483647;display:none;box-sizing:border-box;width:min(250px,calc(100vw - 16px));min-height:68px;padding:0 10px 7px;border:1px solid #5c4424;border-radius:5px;background:linear-gradient(180deg,rgba(37,23,15,.98),rgba(14,9,7,.98));box-shadow:0 5px 18px #000c,inset 0 1px rgba(255,225,165,.06);color:#e9dcc4;text-align:center;pointer-events:none;user-select:none;font-family:"Alegreya Sans","Segoe UI",sans-serif;';
    const title = document.createElement('div');
    title.style.cssText = 'height:27px;margin:0 -9px 6px;border-bottom:1px solid #5c4424;background:linear-gradient(#2a1a10,#140c08);color:#e7c778;font:700 13px/27px Cinzel,Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    const reward = document.createElement('div');
    reward.style.cssText = 'font:13px/17px "Alegreya Sans","Segoe UI",sans-serif;';
    const action = document.createElement('div');
    action.style.cssText = 'margin-top:2px;color:#d8ad53;font:700 12px/16px Cinzel,Georgia,serif;';
    action.textContent = 'Click it to collect the reward!';
    root.append(title, reward, action);
    document.body.appendChild(root);
    Object.assign(popup, { root, title, reward, action, connector, connectorOutline, connectorLine, connectorTip });
  }
  const title = cr.K.name.toLocaleUpperCase(), reward = 'Critters can offer different rewards, including experience, gold, health/mana orbs, gems, jackpots, and temporary blessings.';
  if (popup.title.textContent !== title) popup.title.textContent = title;
  if (popup.reward.textContent !== reward) popup.reward.textContent = reward;
  popup.root.style.display = 'block';
  const [sx, sy] = cr.screen(), rect = popup.root.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, sx - rect.width / 2));
  const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, sy - rect.height - 50));
  popup.root.style.left = `${left}px`;
  popup.root.style.top = `${top}px`;
  popup.connector.style.display = 'block';
  const x1 = left + rect.width / 2, y1 = top + rect.height, x2 = sx, y2 = sy;
  for (const line of [popup.connectorOutline, popup.connectorLine]) {
    line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2));
  }
  popup.connectorTip.setAttribute('cx', String(x2));
  popup.connectorTip.setAttribute('cy', String(y2));
}
function hideCritterTutorialPopup() {
  const popup = CRITTER_TUTORIAL_POPUP;
  if (popup.root) popup.root.style.display = 'none';
  if (popup.connector) popup.connector.style.display = 'none';
}


// the baked models; until they load (or if they fail) the hand-drawn critters below stand in
const ART = { img: null, meta: null };
const CRITTER_SHEET = { img: null };
function loadArt() {
  if (!ART.img) {
    ART.img = new Image(); ART.img.src = 'assets/sprites/critters/critters.webp';
    fetch('assets/sprites/critters/critters.json').then((r) => r.json()).then((m) => { ART.meta = m; }).catch(() => {});
  }
  if (!CRITTER_SHEET.img) {
    CRITTER_SHEET.img = new Image();
    CRITTER_SHEET.img.src = 'assets/sprites/critters/gilded-critters.png';
  }
}
const artReady = () => ART.meta && ART.img.complete && ART.img.naturalWidth > 0;
const critterSheetReady = () => CRITTER_SHEET.img?.complete && CRITTER_SHEET.img.naturalWidth > 0;
const LIGHT2 = { wisp: '#ff9a20', moth: '#b080ff', scarab: '#40ffe8', prism: '#60d8ff' };

class Critter {
  constructor(world, key, x, y) {
    const tier = rollCritterTier();
    const K = { ...CRITTERS[key], tier, color: TIER_COLORS[tier] || TIER_COLORS[0] };
    Object.assign(this, { world, key, K, tier, reward: critterReward(key), x, y, originX: x, originY: y,
      z: K.fly ? rand(38, 58) : 0, t: 0, life: K.life, a: rand(TAU), turn: 0, ph: rand(TAU),
      caught: false, gone: false, tutorial: false, tutorialRendered: false, layer: 'top' });
  }
  get alive() { return !this.caught && !this.gone && this.t < this.life; }
  update(dt) {
    if (G.world !== this.world || this.caught) return false;
    this.t += dt;
    const K = this.K, m = this.world.map;
    if (this.t >= this.life) { // away it goes: up into the dark, or into a crack in the floor
      if (!this.gone) { this.gone = true; this.t0 = this.t; }
      const k = this.t - this.t0;
      if (K.fly) this.z += dt * 160; else this.sink = Math.min(1, k * 2.5);
      if (chance(dt * 20)) sparkle(this.x, this.y, this.z, K.color, 1, 0.1);
      return k < 0.6;
    }
    // Species share the same safe movement/collision pipeline but use distinct steering rhythms.
    const p = this.world.player, motion = K.motion;
    const hd = p ? Math.hypot(p.x - this.x, p.y - this.y) : 0;
    const turnEvery = { steady: [1, 2.2], skitter: [0.18, 0.42], dart: [0.25, 0.65], zigzag: [0.3, 0.55], slither: [0.45, 0.85], flutter: [0.35, 0.8], swoop: [0.7, 1.3], orbit: [0.9, 1.6], sidestep: [0.5, 1], hop: [0.45, 0.9], sway: [0.8, 1.4], glide: [0.9, 1.8], bob: [0.7, 1.4], scuttle: [0.3, 0.65], drift: [0.65, 1.4] }[motion] || [0.4, 1];
    if ((this.turn -= dt) <= 0) {
      this.turn = rand(...turnEvery);
      this.da = rand(-2.2, 2.2);
      if (motion === 'steady') this.da *= 0.5;
      if (motion === 'skitter' || motion === 'dart' || motion === 'zigzag') this.da *= 1.5;
    }
    this.a += this.da * dt;
    if (motion === 'slither') this.a += Math.sin(this.t * 9 + this.ph) * dt * 0.9;
    if (motion === 'sway') this.a += Math.sin(this.t * 2.4 + this.ph) * dt * 0.5;
    if (motion === 'zigzag') this.a += Math.sin(this.t * 13 + this.ph) * dt * 1.4;
    if (motion === 'sidestep' && p) this.a = Math.atan2(this.y - p.y, this.x - p.x) + Math.sin(this.t * 5 + this.ph) * 1.1;
    if (motion === 'orbit' && p) {
      const around = Math.atan2(this.y - p.y, this.x - p.x) + Math.PI / 2;
      this.a = around + Math.sin(this.t * 2 + this.ph) * 0.55;
    }
    if (hd > 9 && p) this.a = Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.6, 0.6);
    else if (p && hd < 2.2 && !((this.bump -= dt) > 0)) {
      this.a = Math.atan2(this.y - p.y, this.x - p.x) + rand(-0.4, 0.4);
      this.turn = 0.4; this.bump = 0.5;
    }
    let burst = 1;
    if (motion === 'dart' || motion === 'zigzag') burst = Math.sin(this.t * 3.3 + this.ph) > 0.35 ? 1.7 : 0.55;
    if (motion === 'skitter' || motion === 'scuttle') burst = Math.sin(this.t * 11 + this.ph) > 0 ? 1.45 : 0.72;
    const s = K.speed * burst * (K.fly ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(this.t * 7)));
    const nx = this.x + Math.cos(this.a) * s * dt, ny = this.y + Math.sin(this.a) * s * dt;
    if (m.walkable(nx, ny)) { this.x = nx; this.y = ny; }
    else { this.a += Math.PI * rand(0.6, 1.4); this.turn = 0.3; this.bump = 0.5; }
    if (K.fly) {
      const bob = motion === 'swoop' ? Math.sin(this.t * 2.2 + this.ph) * 27 :
        motion === 'flutter' ? Math.sin(this.t * 5.5 + this.ph) * 18 : Math.sin(this.t * 3 + this.ph) * 12;
      this.z = Math.max(18, Math.min(75, this.z + bob * dt));
    } else if (motion === 'hop' || motion === 'sidestep') {
      this.z = Math.max(0, Math.sin(this.t * (motion === 'hop' ? 7 : 4) + this.ph) * 6);
    }
    // its lights: a wide one in its colour, a second that breathes in its accent colour, and a plain one that lights
    // the floor round it without washing its colours out
    addLight(this.x, this.y, 2.6, 0.8, this.z, K.color);
    addLight(this.x, this.y, 1.8, 0.35 + 0.25 * Math.sin(this.t * 4 + this.ph), this.z + 10, LIGHT2[this.key]);
    addLight(this.x, this.y, 2, 0.6, 4);
    // a stream of sparks rising from it, so it reads as something to tap even in a busy fight
    for (let n = Math.floor(dt * (8 + Math.min(8, this.tier * 0.35)) + Math.random()); n > 0; n--) {
      const a = rand(TAU), r = rand(0.05, 0.3);
      spawn({ type: 'glow', x: this.x + Math.cos(a) * r, y: this.y + Math.sin(a) * r, z: this.z + rand(-4, 6), vz: rand(45, 85), drag: 0.6, life: rand(0.7, 1.3), size: rand(1.2, 2.6), size1: 0, color: chance(0.25) ? '#ffffff' : this.key === 'prism' ? pick(['#ff80e0', '#80e0ff', '#ffe060', '#90ff90']) : K.color, add: true });
    }
    return true;
  }
  draw(ctx) {
    const K = this.K, px = isoX(this.x, this.y), py = isoY(this.x, this.y), t = this.t;
    const fade = this.gone ? Math.max(0, 1 - (t - this.t0) / 0.6) : Math.min(1, t * 3);
    const tutorialReady = this.tutorial && G.critterTutorial === this && this.t >= CRITTER_TUTORIAL_SPAWN_DELAY;
    // a soft beacon ring on the floor so it reads as something to tap, brighter in its last seconds
    const late = !this.gone && this.life - t < 3;
    ctx.globalAlpha = fade * (0.35 + 0.25 * Math.sin(t * (late ? 14 : 5)));
    ctx.strokeStyle = K.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px, py, 16, 8, 0, 0, TAU); ctx.stroke();
    if (tutorialReady) showCritterTutorialPopup(this);
    if (Number.isInteger(K.artIndex) && critterSheetReady()) this.drawSheetSprite(ctx, px, py, fade);
    else if (K.artKey && artReady() && ART.meta.sets[K.artKey]) this.drawModel(ctx, px, py, fade);
    else this.drawSpeciesSprite(ctx, px, py, fade);
    if (tutorialReady) this.tutorialRendered = true;
    ctx.globalAlpha = 1;
  }
  drawSheetSprite(ctx, px, py, fade) {
    const K = this.K, img = CRITTER_SHEET.img;
    const cellW = img.naturalWidth / 5, cellH = img.naturalHeight / 4;
    const sx = (K.artIndex % 5) * cellW, sy = Math.floor(K.artIndex / 5) * cellH;
    const size = 48, y = K.fly ? py - this.z : py - 5;
    // The fairy cell sits close to neighboring bat, rune-eye, and skull art. Crop only the nearby edges,
    // then preserve the original scale inside the canvas so the neighboring silhouettes cannot leak through.
    const inset = K.artIndex === 13 ? { left: 18, top: 6, right: 12, bottom: 8 } : { left: 0, top: 0, right: 0, bottom: 0 };
    const sourceW = cellW - inset.left - inset.right, sourceH = cellH - inset.top - inset.bottom;
    const dx = 128 * inset.left / cellW, dy = 128 * inset.top / cellH;
    const dw = 128 * sourceW / cellW, dh = 128 * sourceH / cellH;
    const tinted = drawTinted(K.color, (c) => {
      c.imageSmoothingEnabled = true;
      c.drawImage(img, sx + inset.left, sy + inset.top, sourceW, sourceH, dx, dy, dw, dh);
    }, 0.4);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.imageSmoothingEnabled = true;
    if (K.fly) {
      ctx.globalAlpha = fade * 0.22;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath(); ctx.ellipse(px, py, size * 0.23, size * 0.09, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = fade;
    ctx.drawImage(tinted, px - size / 2, y - size / 2, size, size);
    ctx.restore();
  }
  drawSpeciesSprite(ctx, px, py, fade) {
    const K = this.K, y = K.fly ? py - this.z : py - 5;
    const source = critterSprite(this.key, K);
    const tinted = drawTinted(K.color, (c) => {
      const max = Math.max(source.width, source.height) || 1;
      const w = 82 * source.width / max, h = 82 * source.height / max;
      c.drawImage(source, (128 - w) / 2, (128 - h) / 2, w, h);
    });
    ctx.save();
    ctx.globalAlpha = fade;
    // Species cues sit behind or over their reused creature sprites; all remain small pixel silhouettes.
    if (K.accent === 'wings') {
      ctx.globalAlpha = fade * (0.45 + 0.25 * Math.abs(Math.sin(this.t * 15)));
      ctx.fillStyle = K.color;
      for (const sign of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(px + sign * 13, y - 1, 12, 5, sign * 0.45, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = fade;
    }
    ctx.drawImage(tinted, px - 24, y - 24, 48, 48);
    if (K.accent === 'crystals') {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = K.color; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        const x = px + i * 9, h = 7 + (i === 0 ? 4 : 0);
        ctx.beginPath(); ctx.moveTo(x - 3, y - 9); ctx.lineTo(x, y - 9 - h); ctx.lineTo(x + 3, y - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if (K.accent === 'shell') {
      ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, y - 1, 11, Math.PI, TAU); ctx.stroke();
    } else if (K.accent === 'runes') {
      ctx.strokeStyle = K.color; ctx.lineWidth = 1; ctx.globalAlpha = fade * 0.8;
      ctx.save(); ctx.translate(px, y); ctx.rotate(this.t * 0.5);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, rx = Math.cos(a) * 25, ry = Math.sin(a) * 17;
        ctx.strokeRect(rx - 2.2, ry - 2.2, 4.4, 4.4);
      }
      ctx.restore();
    } else if (K.accent === 'mimic') {
      ctx.strokeStyle = '#f5d27a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - 11, y - 8); ctx.lineTo(px, y - 14 - Math.abs(Math.sin(this.t * 3)) * 3); ctx.lineTo(px + 11, y - 8); ctx.stroke();
    } else if (K.accent === 'segments') {
      ctx.strokeStyle = '#e9c57a'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(px + i * 5, y + Math.sin(this.t * 8 + i) * 2, 6, -0.8, 0.8); ctx.stroke(); }
    } else if (K.accent === 'claws') {
      ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 2;
      for (const sign of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px + sign * 10, y + 5); ctx.lineTo(px + sign * 18, y + 1); ctx.lineTo(px + sign * 21, y + 5); ctx.stroke(); }
    } else if (K.accent === 'ears') {
      ctx.fillStyle = K.color;
      for (const sign of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px + sign * 6, y - 10); ctx.lineTo(px + sign * 13, y - 22); ctx.lineTo(px + sign * 15, y - 8); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  }
  /** The existing baked models tinted to the critter's actual gear-tier colour. */
  drawModel(ctx, px, py, fade) {
    const K = this.K, M = ART.meta, s = M.sets[K.artKey], t = this.t, cs = M.cell, w = cs / M.S * 0.8;
    const d = s.dirs > 1 ? ((Math.round(this.a / (TAU / s.dirs)) % s.dirs) + s.dirs) % s.dirs : 0;
    const i = s.at + d * s.frames + Math.floor(t * (K.artKey === 'moth' ? 16 : K.artKey === 'scarab' ? 14 : 10) + this.ph * 3) % s.frames;
    const cy = K.fly ? py - this.z : py - 6;
    if (K.fly) { ctx.globalAlpha = fade * 0.3; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(px, py, 9, 4.5, 0, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    const b = 18 + Math.min(7, this.tier * 0.3) + Math.sin(t * 5) * 2;
    ctx.globalAlpha = fade * 0.4; ctx.drawImage(glowSprite(K.color), px - b, cy - b, b * 2, b * 2);
    ctx.globalAlpha = fade * 0.2; ctx.drawImage(glowSprite(LIGHT2[this.key] || K.color), px - b * 1.5, cy - b * 1.5, b * 3, b * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    if (this.sink) { ctx.save(); ctx.beginPath(); ctx.rect(px - w, py - w * 2, w * 2, w * 2 + 2); ctx.clip(); }
    const tinted = drawTinted(K.color, (c) => c.drawImage(ART.img, (i % M.cols) * cs, Math.floor(i / M.cols) * cs, cs, cs, 0, 0, 128, 128));
    ctx.drawImage(tinted, px - w / 2, (K.fly ? py - this.z : py + 4) - w / 2 + (this.sink || 0) * 16, w, w);
    if (this.sink) ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    if (K.fly) { ctx.globalAlpha = fade * (0.15 + 0.1 * Math.sin(t * 7 + this.ph)); ctx.drawImage(glowSprite('#ffffff'), px - 7, cy - 7, 14, 14); }
    for (let k = 0; k < 3; k++) {
      const a = t * 2.2 + k * TAU / 3 + this.ph, r = 24 + this.tier * 0.18 + 3 * Math.sin(t * 3 + k);
      const lx = px + Math.cos(a) * r, ly = cy + Math.sin(a) * r * 0.45 - (K.fly ? 0 : 4), fr = Math.sin(a) > 0 ? 1 : 0.55;
      ctx.globalAlpha = fade * 0.85 * fr; ctx.drawImage(glowSprite(k ? K.color : '#ffffff'), lx - 4.5, ly - 4.5, 9, 9);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  /** Screen position (css px) of its body, for taps. */
  screen() { return camera.tileToScreen(this.x, this.y, this.z + (this.K.fly ? 0 : 4)); }
}

/** Is there room for a critter in this world? Dungeons and overworlds, never town or a sealed BOSS ROOM fight. */
const allowed = (w) => w && w.kind === 'dungeon' && !(w.raid && w.raid.sealed);

/** A critter appears a few tiles from the hero, on screen. */
export function spawnCritter(world, key = null) {
  const p = world.player;
  if (!p || p.dead) return null;
  loadArt();
  key = key || weighted();
  for (let i = 0; i < 30; i++) {
    const a = rand(TAU), r = rand(3.5, 7), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (!world.map.walkable(x, y)) continue;
    const [sx, sy] = camera.tileToScreen(x, y, 40);
    if (sx < 60 || sy < 70 || sx > G.W - 60 || sy > G.H * 0.72) continue;
    const c = new Critter(world, key, x, y);
    (world.critters ||= []).push(c);
    addEffect(c, 'top');
    addEffect(new Ring(x, y, 0.1, 1.2, 0.5, c.K.color, 3, { z: c.z }));
    sparkle(x, y, c.z, c.K.color, 10, 0.4);
    sfx('pickup', 0.5);
    const ch = G.char;
    if (ch) {
      ch.tips ||= {};
      if (!ch.critterTutorialSeen && !ch.tips.critter && !G.critterTutorial) {
        // The first critter tutorial explains that rewards can vary between critters.
        ch.critterTutorialSeen = true;
        ch.tips.critter = true; // retain the legacy first-critter tip flag
        c.tutorial = true;
        G.critterTutorial = c;
        G.game?.autosave?.();
      } else {
        ch.critterTutorialSeen = true;
      }
    }
    return c;
  }
  return null;
}
function weighted() {
  let r = rand(KEYS.reduce((a, k) => a + CRITTERS[k].w, 0));
  for (const k of KEYS) if ((r -= CRITTERS[k].w) <= 0) return k;
  return 'wisp';
}

/** Spawning clock (per level). */
export function crittersTick(world, dt) {
  if (G.critterTutorial && G.critterTutorial.world !== world) G.critterTutorial = null;
  if (!G.critterTutorial) hideCritterTutorialPopup();
  if (!allowed(world)) return;
  if (world.critters) world.critters = world.critters.filter((c) => c.alive || (c.gone && G.world === world && c.t - c.t0 < 0.6));
  if (world.critterT === undefined) { world.critterT = rand(2, 6); loadArt(); }
  if ((world.critterT -= dt) > 0) return;
  world.critterT = rand(...CRITTER_GAP);
  if (!world.critters || world.critters.filter((c) => c.alive).length < CRITTER_MAX) spawnCritter(world);
}

/** A tap/click at screen point (sx, sy): catch the critter under it. Returns true when one was caught. */
export function catchCritterAt(sx, sy) {
  const w = G.world;
  if (!w || !w.critters) return false;
  const reach = (G.touch ? 42 : 32);
  let best = null, bd = reach;
  for (const c of w.critters) {
    if (G.critterTutorial && c !== G.critterTutorial) continue;
    if (!c.alive) continue;
    const [x, y] = c.screen(), d = Math.hypot(x - sx, y - sy);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return false;
  catchCritter(best);
  return true;
}

/** Apply one independently rolled critter reward. Dropped rewards use the normal pickup pipeline. */
export function catchCritter(cr) {
  const p = G.player, c = G.char, K = cr.K, world = cr.world;
  if (!p || !c || !cr.alive) return;
  cr.caught = true;
  if (G.critterTutorial === cr) { G.critterTutorial = null; hideCritterTutorialPopup(); }
  const tierScale = 1 + cr.tier * 0.075;
  let summary = rewardLabel(cr.reward), textColor = CRITTER_REWARDS.find((r) => r.id === cr.reward)?.color || K.color;

  if (cr.reward === 'xp') {
    const amount = Math.max(5, Math.round(xpToNext(c.level) * 0.052 * tierScale * rand(0.9, 1.1)));
    p.gainXp(amount, true);
    floatText(cr.x, cr.y, cr.z + 24, `+${fmtInt(amount)} XP`, textColor, 16, { life: 1.8 });
    summary = `${fmtInt(amount)} bonus experience`;
  } else if (cr.reward === 'gold') {
    const amount = Math.max(1, Math.round(goldPile(c.level) * tierScale * rand(0.9, 1.1) * (1 + (p.st.goldFind || 0) / 100)));
    world.addLoot(new GroundItem(cr.x, cr.y, 'gold', { amount }));
    summary = 'gold dropped nearby';
  } else if (cr.reward === 'resource') {
    const count = 2 + Math.floor(cr.tier / 4);
    for (let i = 0; i < count; i++) {
      const kind = chance(0.5) ? 'orb_hp' : 'orb_mp';
      world.addLoot(new GroundItem(cr.x + rand(-0.25, 0.25), cr.y + rand(-0.25, 0.25), kind));
    }
    summary = `${count} health and mana orbs`;
  } else if (cr.reward === 'gem') {
    const count = 1 + Math.floor(cr.tier / 10);
    for (let i = 0; i < count; i++) {
      const item = rollGroundGem(depthLevel(world.depth || 1) + cr.tier);
      world.addLoot(new GroundItem(cr.x + rand(-0.25, 0.25), cr.y + rand(-0.25, 0.25), 'item', { item }));
    }
    summary = count === 1 ? 'an upgrade gem dropped nearby' : `${count} upgrade gems dropped nearby`;
  } else if (cr.reward === 'jackpot') {
    const count = 3 + Math.floor(cr.tier / 4);
    for (let i = 0; i < count; i++) {
      const amount = Math.max(1, Math.round(goldPile(c.level) * tierScale * rand(0.85, 1.15) * (1 + (p.st.goldFind || 0) / 100)));
      world.addLoot(new GroundItem(cr.x + rand(-0.3, 0.3), cr.y + rand(-0.3, 0.3), 'gold', { amount }));
    }
    summary = `a jackpot of ${count} gold piles`;
  } else if (cr.reward === 'shrine') {
    const blessings = [
      { name: 'Quickening Blessing', el: 'light', stats: { as: 18, speed: 14, cdr: 10 } },
      { name: 'Guardian Blessing', el: 'holy', stats: { armor: 18, regen: 20 } },
      { name: 'Warrior Blessing', el: 'fire', stats: { dmg: 14, crit: 4 } },
      { name: 'Vitality Blessing', el: 'poison', stats: { regen: 35, armor: 8 } },
      { name: 'Arcane Blessing', el: 'arcane', stats: { cdr: 16, dmg: 8 } },
    ];
    const blessing = pick(blessings), blessingScale = 1 + cr.tier * 0.045, duration = 20 + Math.floor(cr.tier / 4);
    const stats = Object.fromEntries(Object.entries(blessing.stats).map(([stat, value]) => [stat, Math.round(value * blessingScale * 10) / 10]));
    p.addBuff({ id: 'critter_shrine', name: blessing.name, el: blessing.el, color: CRITTER_REWARDS.find((r) => r.id === 'shrine').color, stats, t: duration, max: duration });
    floatText(cr.x, cr.y, cr.z + 24, blessing.name, textColor, 14, { life: 1.8 });
    summary = `${blessing.name} (${duration} seconds)`;
  }

  addEffect(new Ring(cr.x, cr.y, 0.1, 1.6, 0.45, K.color, 4, { z: cr.z }));
  sparkle(cr.x, cr.y, cr.z, K.color, 24, 0.5);
  sparkle(cr.x, cr.y, cr.z, '#ffffff', 8, 0.3);
  sfx(cr.reward === 'gold' || cr.reward === 'jackpot' ? 'gold' : 'levelup', 0.35);
  c.critters = (c.critters || 0) + 1;
  UI.log(`Caught a <b style="color:${K.color}">${K.name}</b>: ${summary}.`, '#ffe2a0');
  UI.refresh();
}
