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
  map.darkForest = true; map.losBlocks = true; map.t.fill(1); map.seen.fill(0); map.kind = new Uint8Array(N);
  const start = [12.5, 179.5], boss = [179.5, 12.5], exit = [185.5, 11.5];
  const dx = boss[0] - start[0], dy = boss[1] - start[1], denom = dx * dx + dy * dy;
  const routeLength = Math.hypot(dx, dy), sideX = -dy / routeLength, sideY = dx / routeLength;
  // Keep the entrance and guardian approaches straight; seeded, eased offsets make only the
  // middle of the trail wander gently across the forest without turning it into a zigzag.
  const routeRng = new RNG((seed ^ 0x9e3779b9) >>> 0);
  const bendCount = routeRng.int(3, 5), routeBends = [{ t: 0, offset: 0 }, { t: 0.2, offset: 0 }];
  for (let i = 0; i < bendCount; i++) {
    const t = 0.28 + i * (0.44 / Math.max(1, bendCount - 1)) + routeRng.range(-0.035, 0.035);
    const choices = i === 0 || i === bendCount - 1 ? [-6, -4, 4, 6] : [-6, -4, 0, 0, 4, 6];
    routeBends.push({ t, offset: routeRng.pick(choices) });
  }
  routeBends.push({ t: 0.82, offset: 0 }, { t: 1, offset: 0 });
  routeBends.sort((a, b) => a.t - b.t);
  const routeOffset = (t) => {
    t = clamp(t, 0, 1);
    let i = 1;
    while (i < routeBends.length - 1 && routeBends[i].t < t) i++;
    const a = routeBends[i - 1], b = routeBends[i], u = clamp((t - a.t) / (b.t - a.t), 0, 1);
    const eased = (1 - Math.cos(Math.PI * u)) * 0.5;
    return a.offset + (b.offset - a.offset) * eased;
  };
  const routePoint = (t, offset = 0) => {
    const bend = routeOffset(t) + offset;
    return [start[0] + dx * t + sideX * bend, start[1] + dy * t + sideY * bend];
  };
  const distToRoute = (x, y) => {
    const t = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / denom, 0, 1);
    const [rx, ry] = routePoint(t);
    return Math.hypot(x - rx, y - ry);
  };
  const floors = new Map(tileset.floors.map((f, i) => [f.name, i]));
  const floor = (name) => floors.get(name) ?? 0;
  const forestFloors = ['pine_needles', 'black_loam', 'dead_leaves', 'damp_moss', 'dark_turf', 'root_soil', 'peat'];
  const trailFloors = ['gravel_path', 'packed_mud', 'gravel_wash'];
  // Four full-size optional mazes alternate north and south along the route, with long clear gaps between entrances.
  const mazes = [
    { id: 'north-west', side: 'north', x: 16, y: 86, size: 44, family: 'thorn_hedge', gate: [54, 129], spur: [63, 129] },
    { id: 'south-west', side: 'south', x: 86, y: 110, size: 44, family: 'tangled_roots', gate: [87, 110], spur: [85, 107] },
    { id: 'north-east', side: 'north', x: 62, y: 38, size: 44, family: 'blackwood_trunks', gate: [99, 81], spur: [108, 84] },
    { id: 'south-east', side: 'south', x: 131, y: 65, size: 44, family: 'mossy_ruins', gate: [131, 65], spur: [128, 64] },
  ];
  // Put the six decorative landmarks directly along the main route. Vary their spacing and offsets so they do not
  // appear as opposing pairs; their open clearings are pass-through and never gate the boss route.
  const landmarks = [
    { what: 'camp', t: 0.11, offset: -2.6 },
    { what: 'well', t: 0.35, offset: 2.4 },
    { what: 'shrine', t: 0.48, offset: -1.4 },
    { what: 'obelisk', t: 0.62, offset: 2.9 },
    { what: 'swamp', t: 0.84, offset: -2.2 },
    { what: 'webs', t: 0.92, offset: 1.8 },
  ].map((landmark) => {
    const [x, y] = routePoint(landmark.t, landmark.offset);
    return { ...landmark, x, y };
  });
  // Keep the six recognizable route clearings, and add optional satellite clearings
  // on both sides of the trail. Each gets a short, tree-cleared walk-in spur.
  const sideAreas = [
    { what: 'camp', t: 0.15, offset: -16, side: 'north', sideArea: true },
    { what: 'well', t: 0.23, offset: 16, side: 'south', sideArea: true },
    { what: 'shrine', t: 0.48, offset: -12, side: 'north', sideArea: true },
    { what: 'obelisk', t: 0.58, offset: 16, side: 'south', sideArea: true },
    { what: 'swamp', t: 0.89, offset: -16, side: 'north', sideArea: true },
    { what: 'webs', t: 0.84, offset: 16, side: 'south', sideArea: true },
  ].map((area) => {
    const [x, y] = routePoint(area.t, area.offset), approach = routePoint(area.t, 0);
    return { ...area, x, y, approach };
  });
  const distanceToSegment = (x, y, a, b) => {
    const vx = b[0] - a[0], vy = b[1] - a[1], n = vx * vx + vy * vy;
    const t = n ? clamp(((x - a[0]) * vx + (y - a[1]) * vy) / n, 0, 1) : 0;
    return Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy);
  };
  const inMaze = (x, y, margin = 0) => mazes.some((m) => x >= m.x - margin && y >= m.y - margin && x < m.x + m.size + margin && y < m.y + m.size + margin);
  const nearMazeSpur = (x, y, margin = 0) => mazes.some((m) => distanceToSegment(x, y, [m.gate[0] + 0.5, m.gate[1] + 0.5], [m.spur[0] + 0.5, m.spur[1] + 0.5]) < margin);
  const nearLandmark = (x, y, margin = 0) => [...landmarks, ...sideAreas].some((l) => Math.hypot(x - l.x, y - l.y) < margin);
  const nearSideSpur = (x, y, margin = 0) => sideAreas.some((area) => distanceToSegment(x, y, area.approach, [area.x, area.y]) < margin);
  for (let y = 0; y < DF_H; y++) for (let x = 0; x < DF_W; x++) {
    const d = distToRoute(x + 0.5, y + 0.5);
    const spurDist = Math.min(...mazes.map((m) => distanceToSegment(x + 0.5, y + 0.5, [m.gate[0] + 0.5, m.gate[1] + 0.5], [m.spur[0] + 0.5, m.spur[1] + 0.5])));
    map.v[map.idx(x, y)] = d < 4.8 && rng.chance(0.65) || spurDist < 2.2 || nearLandmark(x + 0.5, y + 0.5, 4.2) ? floor(rng.pick(trailFloors)) : floor(rng.pick(forestFloors));
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
    if (routeDist < 9 || bossDist < 16 || startDist < 10 || inMaze(x, y, 1) || nearMazeSpur(x + 0.5, y + 0.5, 3.5)) continue;
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
    if (inMaze(x, y) || nearMazeSpur(x, y, 3.5)) continue;
    if (spawns.some(s => Math.hypot(s.x - x, s.y - y) < 5)) continue;
    const arch = rng.pick(roster), n = rng.int(2, 4), champion = spawns.length % 9 === 0;
    spawns.push({ x, y, arch, n, rank:champion ? 'champion' : 'normal', look:looks.pick(arch) });
  }
  const bossArch = biome.roster.includes('golem') ? 'golem' : rng.pick(roster);
  spawns.push({ x:boss[0], y:boss[1], arch:bossArch, n:1, rank:'boss', look:looks.pick(bossArch), name:'Forest Guardian' });

  const chests = [];
  for (const t of [0.3, 0.68]) {
    const [x, y] = routePoint(t + 0.035);
    let best = -1, bestD = Infinity;
    for (let tries = 0; tries < 500; tries++) {
      const i = reachable[rng.int(0, reachable.length - 1)], tx = i % DF_W, ty = (i / DF_W) | 0;
      if (!map.walkableTile(tx, ty) || nearLandmark(tx + 0.5, ty + 0.5, 8)) continue;
      const d = (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2;
      if (d < bestD) { best = i; bestD = d; }
    }
    if (best < 0) throw new Error('Could not place a reachable Dark Forest chest.');
    const bx = best % DF_W + 0.5, by = ((best / DF_W) | 0) + 0.5;
    if (inMaze(bx, by) || nearMazeSpur(bx, by, 3.5)) {
      best = -1; bestD = Infinity;
      for (const i of reachable) {
        const tx = i % DF_W, ty = (i / DF_W) | 0, px = tx + 0.5, py = ty + 0.5;
        if (!map.walkableTile(tx, ty) || inMaze(px, py) || nearMazeSpur(px, py, 3.5) || nearLandmark(px, py, 8)) continue;
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < bestD) { best = i; bestD = d; }
      }
      if (best < 0) throw new Error('Could not place a reachable Dark Forest route chest outside the labyrinths.');
    }
    chests.push({ x:best % DF_W + 0.5, y:((best / DF_W) | 0) + 0.5, rare:false });
  }

  // Clear the landmarks after enemy placement so decorative collision does not alter the established encounter mix.
  const retainedTrees = trees.filter((tree) => {
    if (!nearLandmark(tree.x, tree.y, 4.6) && !nearSideSpur(tree.x, tree.y, 2.6)) return true;
    map.block[map.idx(Math.floor(tree.x), Math.floor(tree.y))] = 0;
    return false;
  });
  trees.length = 0; trees.push(...retainedTrees);
  const props = [], scatter = new Map((tileset.scatter || []).map((s) => [s.name, s]));
  const addProp = (name, x, y, options = {}) => {
    const spr = scatter.get(name);
    if (!spr) return;
    const p = { kind: 'scatter', x, y, spr, k: (tileset.k || 1) * (options.scale || 1), flip: options.flip ?? (props.length % 2 === 0), light: options.light || 0 };
    props.push(p);
    if (spr.block && spr.fp >= 0.5) map.block[map.idx(Math.floor(x), Math.floor(y))] = 1;
  };
  for (const landmark of [...landmarks, ...sideAreas]) {
    const { x: cx, y: cy } = landmark;
    // Open earthen patches make each set piece visible and safely pass-through.
    for (let y = Math.floor(cy - 4); y <= Math.ceil(cy + 4); y++) for (let x = Math.floor(cx - 4); x <= Math.ceil(cx + 4); x++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 3.8) continue;
      const i = map.idx(x, y);
      map.block[i] = 0; map.kind[i] = 0; map.v[i] = floor(trailFloors[0]);
    }
    if (landmark.sideArea) {
      const [ax, ay] = landmark.approach, length = Math.hypot(cx - ax, cy - ay), steps = Math.ceil(length * 3);
      for (let step = 0; step <= steps; step++) {
        const t = step / steps, px = ax + (cx - ax) * t, py = ay + (cy - ay) * t;
        for (let y = Math.floor(py - 2.5); y <= Math.ceil(py + 2.5); y++) for (let x = Math.floor(px - 2.5); x <= Math.ceil(px + 2.5); x++) {
          if (Math.hypot(x + 0.5 - px, y + 0.5 - py) > 2.35 || x < 0 || y < 0 || x >= DF_W || y >= DF_H) continue;
          const i = map.idx(x, y);
          map.block[i] = 0; map.kind[i] = 0; map.v[i] = floor(trailFloors[0]);
        }
      }
    }
    const put = (name, dx, dy, options) => addProp(name, cx + dx, cy + dy, options);
    if (landmark.what === 'camp') { put('campfire', 0, 0, { light: 5 }); put('bedroll', 1.3, 0.6); put('bedroll', -1.1, 1); put('firewood', 1, -1.2); put('wooden_crate', -1.6, -0.8); }
    if (landmark.what === 'well') { put('stone_well', 0, 0); put('rope_post', 1.6, 0.8); put('wooden_crate', -1.4, 1.2); }
    if (landmark.what === 'shrine') { put('ruined_shrine', 0, -0.4, { light: 3 }); put('vine_altar', 1.8, 1); put('lost_shield', -1.4, 1.1); }
    if (landmark.what === 'obelisk') { put('forest_obelisk', 0, 0, { light: 3 }); put('stone_cairn', 1.6, 1.2); put('stone_cairn', -1.6, -1); }
    if (landmark.what === 'swamp') { put('reeds', 1.5, 0.5); put('reeds', -1.4, -0.6); put('bridge_planks', 0, 0); put('hollow_log', 2.2, -1.2); }
    if (landmark.what === 'webs') { put('spider_eggs', 0.8, 0.2); put('wrapped_corpse', -1.2, 0.8); put('spider_eggs', -0.6, -1.3); put('wrapped_corpse', 1.6, -1); }
    landmark.center = [cx, cy];
  }
  // A rare pack may have rolled into a landmark patch. Nudge it outside the dressing so props cannot hide or trap it.
  for (let si = 0; si < spawns.length - 1; si++) {
    const spawn = spawns[si];
    if (!nearLandmark(spawn.x, spawn.y, 4.5) && map.walkable(spawn.x, spawn.y)) continue;
    let best = null, bestD = Infinity;
    for (const i of reachable) {
      const x = i % DF_W, y = (i / DF_W) | 0, px = x + 0.5, py = y + 0.5, d = (px - spawn.x) ** 2 + (py - spawn.y) ** 2;
      if (d >= bestD || inMaze(px, py) || nearLandmark(px, py, 4.5) || !map.walkableTile(x, y)) continue;
      if (spawns.some((other, oi) => oi !== si && Math.hypot(other.x - px, other.y - py) < 5)) continue;
      best = [px, py]; bestD = d;
    }
    if (best) [spawn.x, spawn.y] = best;
  }

  // Carve optional 10x10-cell labyrinths with broad corridors and full-height pack walls.
  // The only route through each outer wall is a three-tile opening directly facing its path spur.
  const mazeWall = new Uint8Array(N), mazeCells = [];
  for (const maze of mazes) {
    const cellsWide = 10, cellStep = 4, ox = maze.x, oy = maze.y, size = maze.size;
    const wall = (x, y) => {
      const i = y * DF_W + x;
      mazeWall[i] = 1; map.block[i] = 1; map.kind ??= new Uint8Array(N); map.kind[i] = 7;
    };
    for (let y = oy; y < oy + size; y++) for (let x = ox; x < ox + size; x++) wall(x, y);
    const open = (x, y) => {
      const i = y * DF_W + x;
      mazeWall[i] = 0; map.block[i] = 0; map.kind[i] = 0;
      map.v[i] = floor(rng.pick(trailFloors));
    };
    const visited = new Uint8Array(cellsWide * cellsWide), stack = [rng.int(0, cellsWide * cellsWide - 1)];
    const carveCell = (c) => {
      const cx = c % cellsWide, cy = (c / cellsWide) | 0, x0 = ox + 1 + cx * cellStep, y0 = oy + 1 + cy * cellStep;
      for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) open(x, y);
    };
    visited[stack[0]] = 1; carveCell(stack[0]);
    while (stack.length) {
      const c = stack[stack.length - 1], cx = c % cellsWide, cy = (c / cellsWide) | 0;
      const options = [[0,-1],[1,0],[0,1],[-1,0]].filter(([dx,dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return nx >= 0 && ny >= 0 && nx < cellsWide && ny < cellsWide && !visited[ny * cellsWide + nx];
      });
      if (!options.length) { stack.pop(); continue; }
      const [dx,dy] = rng.pick(options), nx = cx + dx, ny = cy + dy, next = ny * cellsWide + nx;
      visited[next] = 1;
      const x0 = ox + 1 + cx * cellStep, y0 = oy + 1 + cy * cellStep;
      for (let n = 0; n < 3; n++) open(x0 + (dx > 0 ? 3 : dx < 0 ? -1 : n), y0 + (dy > 0 ? 3 : dy < 0 ? -1 : n));
      carveCell(next); stack.push(next);
    }
    // Add a few loops so exploration has choices instead of a single long corridor.
    for (let cy = 0; cy < cellsWide; cy++) for (let cx = 0; cx < cellsWide; cx++) {
      if (!rng.chance(0.12)) continue;
      const x0 = ox + 1 + cx * cellStep, y0 = oy + 1 + cy * cellStep;
      if (cx + 1 < cellsWide && mazeWall[y0 * DF_W + x0 + 3]) for (let n = 0; n < 3; n++) open(x0 + 3, y0 + n);
      if (cy + 1 < cellsWide && mazeWall[(y0 + 3) * DF_W + x0]) for (let n = 0; n < 3; n++) open(x0 + n, y0 + 3);
    }
    // Face the gate toward the main route: north maze opens south, south maze opens north.
    for (let n = 0; n < 3; n++) {
      const gx = maze.gate[0] + n;
      const tunnel = maze.side === 'north' ? 4 : 1;
      for (let d = 0; d < tunnel; d++) open(gx, maze.side === 'north' ? maze.y + maze.size - 1 - d : maze.y + d);
    }
    for (let step = 0; step <= 12; step++) {
      const t = step / 12, x = Math.round(maze.gate[0] + (maze.spur[0] - maze.gate[0]) * t), y = Math.round(maze.gate[1] + (maze.spur[1] - maze.gate[1]) * t);
      for (let oy2 = -1; oy2 <= 1; oy2++) for (let ox2 = -1; ox2 <= 1; ox2++) {
        const tx = x + ox2, ty = y + oy2;
        if (tx > 0 && ty > 0 && tx < DF_W - 1 && ty < DF_H - 1) { map.block[ty * DF_W + tx] = 0; map.v[ty * DF_W + tx] = floor(rng.pick(trailFloors)); }
      }
    }
    maze.center = [ox + size / 2, oy + size / 2];
    maze.rect = [ox, oy, ox + size, oy + size];
    mazeCells.push(maze);
    // Each detour rewards exploration with its own cache, away from the gate.
    chests.push({ x: maze.center[0] + 0.5, y: maze.center[1] + 0.5, rare: rng.chance(0.25) });
  }

  map.walls = []; map.doors = []; map.segments = []; map.kind ??= new Uint8Array(N);
  const wallDirs = [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]], wallOffsets = { NE:[0,-0.25],SE:[0.25,0],SW:[0,0.25],NW:[-0.25,0] };
  for (const maze of mazeCells) {
    const family = tileset.walls[maze.family];
    for (let y = maze.y; y < maze.y + maze.size; y++) for (let x = maze.x; x < maze.x + maze.size; x++) {
      const i = y * DF_W + x;
      if (!mazeWall[i]) continue;
      let mask = 0;
      for (const [dx,dy,bit] of wallDirs) if (x + dx >= maze.x && y + dy >= maze.y && x + dx < maze.x + maze.size && y + dy < maze.y + maze.size && mazeWall[(y + dy) * DF_W + x + dx]) mask |= bit;
      const variants = family?.[mask] || family?.[0] || [];
      const pieces = variants[rng.int(0, variants.length - 1)] || [];
      for (const sl of pieces) {
        const [dx,dy] = wallOffsets[sl.arm] || [0,0];
        map.walls.push({ kind:'wall', x:x+0.5, y:y+0.5, r:sl, front:false, depth:x+y+1+dx+dy });
      }
    }
  }
  map.indexWalls();
  const cells = Array.from({ length: bw * bh }, () => []);
  for (const tree of trees) cells[Math.floor(tree.y / B) * bw + Math.floor(tree.x / B)].push(tree);
  map.treeCells = { B, bw, bh, cells };
  return { map, props, trees, buildings:[], wallHangings:[], townTiles:null, looks, spawns, chests, torches:[], labyrinths:mazeCells, landmarks, sideAreas, routeBends,
    start, boss, exit, shrine:boss, sites:[], scenarioId:0, seed, layoutSeed:seed };
}


