import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { rollLooks } from '../data/bestiary.js';
import { darkForestTree, darkTreeK, darkForestTreesReady } from '../gfx/darkforest.js';

export const DF_W = 48, DF_H = 48;
const TREE_TYPES = [
  'spire_pine', 'hanging_moss_fir', 'cathedral_redwood', 'thornbound_cypress',
  'ancient_black_oak', 'twisted_yew', 'hollow_ash', 'fungal_beech', 'blighted_chestnut',
  'dead_crowned_elm', 'bone_white_birch', 'weeping_willow', 'root_fused_twins',
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function generateDarkForest(depth, biome, tileset, seed) {
  if (tileset.pack !== 'dark_forest' || !darkForestTreesReady()) throw new Error('The Dark Forest art must load before generating it.');
  const rng = new RNG(seed >>> 0), map = new TileMap(DF_W, DF_H);
  map.darkForest = true; map.losBlocks = true; map.t.fill(1); map.seen.fill(0);
  const floorCount = Math.max(1, tileset.floors.length);
  for (let i = 0; i < map.v.length; i++) map.v[i] = rng.int(0, floorCount - 1);

  // A broad open forest floor with one clear diagonal trail from the southwest entrance
  // to the northeast guardian clearing. Scattered trees add cover without forming walls.
  const start = [3.5, 43.5], boss = [43.5, 4.5], exit = [45.2, 3.8];
  const distToRoute = (x, y) => {
    const dx = boss[0] - start[0], dy = boss[1] - start[1];
    const t = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(x - start[0] - t * dx, y - start[1] - t * dy);
  };

  const placed = [], props = [];
  const bucketSize = 8, bw = Math.ceil(DF_W / bucketSize), bh = Math.ceil(DF_H / bucketSize);
  const cells = Array.from({ length: bw * bh }, () => []);
  const addTree = (x, y, name, scale) => {
    const spr = darkForestTree(name);
    if (!spr) return;
    const tree = { kind: 'scatter', x, y, spr, k: darkTreeK(scale), flip: rng.chance(0.5), tree: true };
    placed.push(tree); cells[Math.floor(y / bucketSize) * bw + Math.floor(x / bucketSize)].push(tree);
    const tx = Math.floor(x), ty = Math.floor(y);
    if (distToRoute(tx + 0.5, ty + 0.5) > 3.6 && Math.hypot(tx + 0.5 - boss[0], ty + 0.5 - boss[1]) > 7) map.block[map.idx(tx, ty)] = 1;
  };
  // A loose tree border preserves the enclosed forest feel, but leaves all four corners open.
  for (let y = 1; y < DF_H - 1; y++) for (let x = 1; x < DF_W - 1; x++) {
    const edge = Math.min(x, y, DF_W - 1 - x, DF_H - 1 - y);
    const nearRoute = distToRoute(x + 0.5, y + 0.5) < 4.3;
    const bossClear = Math.hypot(x + 0.5 - boss[0], y + 0.5 - boss[1]) < 8;
    const odds = edge < 3 ? 0.72 : edge < 5 ? 0.27 : 0.035;
    if (!nearRoute && !bossClear && rng.chance(odds)) {
      const name = rng.pick(TREE_TYPES);
      addTree(x + rng.range(0.15, 0.85), y + rng.range(0.15, 0.85), name, edge < 3 ? rng.range(0.8, 1) : rng.range(0.65, 0.85));
    }
  }

  // Keep collisions from narrowing the path: clear a generous corridor after tree placement.
  for (let y = 1; y < DF_H - 1; y++) for (let x = 1; x < DF_W - 1; x++) {
    if (distToRoute(x + 0.5, y + 0.5) < 3.8 || Math.hypot(x + 0.5 - boss[0], y + 0.5 - boss[1]) < 7.5 || Math.hypot(x + 0.5 - start[0], y + 0.5 - start[1]) < 4) map.block[map.idx(x, y)] = 0;
  }

  const looks = rollLooks(biome, rng.fn()), spawns = [];
  const normalArchs = biome.roster.filter((id) => id !== 'golem');
  for (let n = 0; n < 6; n++) {
    const t = (n + 1) / 7, x = start[0] + (boss[0] - start[0]) * t, y = start[1] + (boss[1] - start[1]) * t;
    const p = map.randomNear(x, y, 2.4, rng.fn()), arch = rng.pick(normalArchs.length ? normalArchs : biome.roster);
    spawns.push({ x: p[0], y: p[1], arch, n: rng.int(2, 3), rank: n === 4 ? 'champion' : 'normal', look: looks.pick(arch) });
  }
  const bossArch = biome.roster.includes('golem') ? 'golem' : rng.pick(biome.roster);
  spawns.push({ x: boss[0], y: boss[1], arch: bossArch, n: 1, rank: 'boss', look: looks.pick(bossArch), name: 'Forest Guardian' });

  const chests = [];
  for (const t of [0.3, 0.68]) {
    const x = start[0] + (boss[0] - start[0]) * t, y = start[1] + (boss[1] - start[1]) * t;
    const p = map.randomNear(x + 2.8, y - 2.8, 2, rng.fn());
    chests.push({ x: p[0], y: p[1], rare: false });
  }

  map.walls = []; map.doors = []; map.segments = []; map.kind = new Uint8Array(DF_W * DF_H);
  map.treeCells = { B: bucketSize, bw, bh, cells };
  return {
    map, props, trees: placed, buildings: [], wallHangings: [], townTiles: null, looks, spawns, chests, torches: [],
    start, boss, exit, shrine: boss, sites: [], landmarks: [], scenarioId: 0, seed, layoutSeed: seed,
  };
}

