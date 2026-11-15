import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { rollLooks } from '../data/bestiary.js';
import { darkForestTree, darkTreeK, darkForestTreesReady } from '../gfx/darkforest.js';

export const DF_W = 192, DF_H = 192;
const TREE_TYPES = [
  'spire_pine', 'hanging_moss_fir', 'cathedral_redwood', 'thornbound_cypress',
  'ancient_black_oak', 'twisted_yew', 'hollow_ash', 'fungal_beech', 'blighted_chestnut',
  'dead_crowned_elm', 'bone_white_birch', 'weeping_willow', 'root_fused_twins',
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function generateDarkForest(depth, biome, tileset, seed) {
  if (tileset.pack !== 'dark_forest' || !darkForestTreesReady()) throw new Error('The Dark Forest art must load before generating it.');
  const rng = new RNG(seed >>> 0), map = new TileMap(DF_W, DF_H), N = DF_W * DF_H;
  map.darkForest = true; map.losBlocks = true; map.t.fill(1); map.seen.fill(0);
  const start = [12.5, 179.5], boss = [179.5, 12.5], exit = [185.5, 11.5];
  const dx = boss[0] - start[0], dy = boss[1] - start[1], denom = dx * dx + dy * dy;
  const distToRoute = (x, y) => {
    const t = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / denom, 0, 1);
    return Math.hypot(x - start[0] - t * dx, y - start[1] - t * dy);
  };
  const floors = new Map(tileset.floors.map((f, i) => [f.name, i]));
  const floor = (name) => floors.get(name) ?? 0;
  const forestFloors = ['pine_needles', 'black_loam', 'dead_leaves', 'damp_moss', 'dark_turf', 'root_soil', 'peat'];
  const trailFloors = ['gravel_path', 'packed_mud', 'gravel_wash'];
  for (let y = 0; y < DF_H; y++) for (let x = 0; x < DF_W; x++) {
    const d = distToRoute(x + 0.5, y + 0.5);
    map.v[map.idx(x, y)] = d < 4.8 && rng.chance(0.65) ? floor(rng.pick(trailFloors)) : floor(rng.pick(forestFloors));
  }

  // Tall trees fill the forest at the original map scale, with a clear corridor to the boss.
  const trees = [], treeGrid = new Uint8Array(N), B = 8, bw = DF_W / B, bh = DF_H / B;
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const i of order) {
    if (trees.length >= 15500) break;
    const x = i % DF_W, y = (i / DF_W) | 0;
    if (x < 1 || y < 1 || x >= DF_W - 1 || y >= DF_H - 1) continue;
    const routeDist = distToRoute(x + 0.5, y + 0.5);
    const bossDist = Math.hypot(x + 0.5 - boss[0], y + 0.5 - boss[1]);
    const startDist = Math.hypot(x + 0.5 - start[0], y + 0.5 - start[1]);
    if (routeDist < 9 || bossDist < 16 || startDist < 10) continue;
    const nearTrail = routeDist < 20, spacing = nearTrail ? 2.6 : 1.55;
    const px = x + 0.5 + rng.range(-0.22, 0.22), py = y + 0.5 + rng.range(-0.22, 0.22);
    let free = true, radius = Math.ceil(spacing);
    for (let oy = -radius; oy <= radius && free; oy++) for (let ox = -radius; ox <= radius && free; ox++) {
      const tx = x + ox, ty = y + oy;
      if (tx < 0 || ty < 0 || tx >= DF_W || ty >= DF_H) continue;
      const j = ty * DF_W + tx, prev = treeGrid[j];
      if (prev && Math.hypot(trees[prev - 1].x - px, trees[prev - 1].y - py) < spacing) free = false;
    }
    if (!free) continue;
    const spr = darkForestTree(rng.pick(TREE_TYPES));
    if (!spr) continue;
    const p = { kind: 'scatter', x: px, y: py, spr, k: darkTreeK(nearTrail ? rng.range(0.60, 0.72) : rng.range(0.70, 0.86)), flip: rng.chance(0.5), tree: true };
    trees.push(p); treeGrid[i] = trees.length; map.block[i] = 1;
  }

  // Only populate the area a player can reach from the entrance. Dense trees create small enclosed pockets;
  // leaving enemies or loot in those pockets would make the restored population unfair and unreachable.
  const connected = new Uint8Array(N), queue = new Int32Array(N), startTile = map.tileIdx(...start);
  let qh = 0, qt = 0; queue[qt++] = startTile; connected[startTile] = 1;
  while (qh < qt) {
    const i = queue[qh++], x = i % DF_W, y = (i / DF_W) | 0;
    for (const [ox, oy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + ox, ny = y + oy;
      if (!map.walkableTile(nx, ny)) continue;
      const ni = ny * DF_W + nx;
      if (!connected[ni]) { connected[ni] = 1; queue[qt++] = ni; }
    }
  }
  const reachable = queue.slice(0, qt), looks = rollLooks(biome, rng.fn()), spawns = [], roster = biome.roster;
  const targetPacks = rng.int(81, 109), maxAttempts = targetPacks * 80;
  for (let tries = 0; spawns.length < targetPacks && tries < maxAttempts; tries++) {
    const i = reachable[rng.int(0, reachable.length - 1)], x = i % DF_W + 0.5, y = ((i / DF_W) | 0) + 0.5;
    if (Math.hypot(x - start[0], y - start[1]) < 18 || Math.hypot(x - boss[0], y - boss[1]) < 24) continue;
    if (spawns.some(s => Math.hypot(s.x - x, s.y - y) < 5)) continue;
    const arch = rng.pick(roster), n = rng.int(2, 4), champion = spawns.length % 9 === 0;
    spawns.push({ x, y, arch, n, rank:champion ? 'champion' : 'normal', look:looks.pick(arch) });
  }
  const bossArch = biome.roster.includes('golem') ? 'golem' : rng.pick(roster);
  spawns.push({ x:boss[0], y:boss[1], arch:bossArch, n:1, rank:'boss', look:looks.pick(bossArch), name:'Forest Guardian' });

  const chests = [];
  for (const t of [0.3, 0.68]) {
    const x = start[0] + dx * t + 6, y = start[1] + dy * t - 6;
    let best = -1, bestD = Infinity;
    for (let tries = 0; tries < 500; tries++) {
      const i = reachable[rng.int(0, reachable.length - 1)], tx = i % DF_W, ty = (i / DF_W) | 0;
      const d = (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2;
      if (d < bestD) { best = i; bestD = d; }
    }
    if (best < 0) throw new Error('Could not place a reachable Dark Forest chest.');
    chests.push({ x:best % DF_W + 0.5, y:((best / DF_W) | 0) + 0.5, rare:false });
  }

  map.walls = []; map.doors = []; map.segments = []; map.kind = new Uint8Array(N);
  const cells = Array.from({ length: bw * bh }, () => []);
  for (const tree of trees) cells[Math.floor(tree.y / B) * bw + Math.floor(tree.x / B)].push(tree);
  map.treeCells = { B, bw, bh, cells };
  return { map, props:[], trees, buildings:[], wallHangings:[], townTiles:null, looks, spawns, chests, torches:[],
    start, boss, exit, shrine:boss, sites:[], landmarks:[], scenarioId:0, seed, layoutSeed:seed };
}


