// Full-size Castle overworld: a walled route through connected courtyards to the far-corner guardian.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { rollLooks } from '../data/bestiary.js';
import { castleFloorTiles, castleKeepFloorTiles, castleObject } from '../gfx/castle.js';
import { MAT } from '../gfx/castleground.js';
import { castleVariant } from '../data/castles.js';

export const CASTLE_SIZE = Object.freeze([336, 304]);
export const CASTLE_OUTER = Object.freeze({ x0: 5, y0: 5, x1: 330, y1: 298 });
export const CASTLE_INNER = Object.freeze({ x0: 0, y0: 0, x1: 0, y1: 0 });
export const CASTLE_WALL = CASTLE_OUTER;
export const CASTLE_GATES = Object.freeze({ entry: [[20, 298]], exit: [[320, 5]] });
export { MAT };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function gridLine(a, b) {
  let x = Math.round(a[0]), y = Math.round(a[1]);
  const x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x), sx = x < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y), sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  const points = [];
  while (true) {
    points.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return points;
}

export function generateCastle(depth, biome, seed, variant = null) {
  const V = castleVariant(variant), floors = castleFloorTiles(V.look?.ground || null), keepFloors = castleKeepFloorTiles();
  if (!floors.length) throw new Error('Castle floors and moat water must load before generating the overworld.');

  const [W, H] = CASTLE_SIZE, map = new TileMap(W, H), rng = new RNG(seed), N = W * H;
  const I = (x, y) => y * W + x;
  const start = [16.5, 289.5], boss = [320.5, 15.5], exit = [326.5, 9.5];
  const dx = boss[0] - start[0], dy = boss[1] - start[1], length = Math.hypot(dx, dy);
  const denom = dx * dx + dy * dy, nx = -dy / length, ny = dx / length;
  const routeDistance = (x, y) => {
    const t = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / denom, 0, 1);
    return Math.hypot(x - start[0] - t * dx, y - start[1] - t * dy);
  };
  const routePoint = (t, offset = 0) => [start[0] + dx * t + nx * offset, start[1] + dy * t + ny * offset];

  map.t.fill(1); map.losBlocks = true;
  map.castleMat = new Uint8Array(N); map.castleMat.fill(MAT.meadow);
  map.castleGround = V.look?.ground || null;
  map.castleVariant = V.id; map.road = new Uint8Array(N);
  map.rampartDeck = new Uint8Array(N); map.rampartWall = new Uint8Array(N);
  map.castleRoomWalls = new Uint8Array(N);
  map.castleBridges = []; map.castleStairs = []; map.castleRooms = []; map.castleDoors = [];

  const props = [], trees = [], buildings = [];
  const block = (x, y) => { if (map.inb(x, y)) map.block[I(x, y)] = 1; };
  const road = (x0, y0, x1, y1, width) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let n = 0; n <= steps; n++) {
      const t = n / Math.max(1, steps), cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
      const r = Math.ceil(width);
      for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
        if (ox * ox + oy * oy > width * width) continue;
        const x = Math.round(cx + ox), y = Math.round(cy + oy);
        if (!map.inb(x, y)) continue;
        const i = I(x, y); map.block[i] = 0; map.road[i] = 1; map.castleMat[i] = MAT.road;
      }
    }
  };

  // A broad, straight-through road connects the southwest entry to the northeast guardian.
  road(start[0], start[1], boss[0], boss[1], 8);
  road(start[0], start[1], start[0] + 1, start[1] - 1, 12);
  road(boss[0], boss[1], exit[0], exit[1], 12);

  // Low outer curtain walls frame the grounds, with a wide entry and a clear passage to the exit.
  for (let x = CASTLE_OUTER.x0; x <= CASTLE_OUTER.x1; x++) {
    if (!(x >= 10 && x <= 31)) block(x, CASTLE_OUTER.y1);
    if (!(x >= 306 && x <= 330)) block(x, CASTLE_OUTER.y0);
  }
  for (let y = CASTLE_OUTER.y0; y <= CASTLE_OUTER.y1; y++) {
    block(CASTLE_OUTER.x0, y); block(CASTLE_OUTER.x1, y);
  }
  const wallA = {
    x: castleObject('wall_01_quarry_limestone_straight_NE_SW', 'walls'),
    y: castleObject('wall_01_quarry_limestone_straight_SE_NW', 'walls'),
  };
  const wallB = {
    x: castleObject('wall_02_aged_castle_brick_straight_NE_SW', 'walls'),
    y: castleObject('wall_02_aged_castle_brick_straight_SE_NW', 'walls'),
  };
  const addWall = (spr, x, y, routeWall = false) => {
    if (spr && map.inb(x, y)) props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr, k: TW / 160, flip: false, light: 0, onWall: true, castleRouteWall: routeWall });
  };
  // Repeat real masonry segments along both sides of the road. Their collision edges make a visible, continuous
  // corridor; the route remains open between them and the boss can only be approached through its courtyard gates.
  const sideWalls = [];
  for (const side of [-1, 1]) {
    const from = routePoint(0.045, side * 14), to = routePoint(0.955, side * 14), points = gridLine(from, to);
    sideWalls.push(points);
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i], next = points[i + 1] || points[i - 1] || points[i];
      const axis = next[0] !== x ? 'x' : 'y', family = Math.floor(i / 48) % 4 === 3 ? wallB : wallA;
      block(x, y); addWall(family[axis], x, y, true);
    }
  }

  // Three broad gates divide the route into open Castle courtyards. The central opening is 17 tiles wide.
  const gateArch = castleObject('gateway_01_arched_castle_gate_SE', 'gateways');
  const gateTower = castleObject('castle_landmark_08_corner_tower_cluster', 'castle_landmarks');
  for (const t of [0.27, 0.52, 0.77]) {
    const center = routePoint(t);
    for (const [x, y] of gridLine(routePoint(t, -14), routePoint(t, 14))) {
      const offset = (x + 0.5 - center[0]) * nx + (y + 0.5 - center[1]) * ny;
      if (Math.abs(offset) <= 8.5) continue;
      const axis = Math.abs(nx) > Math.abs(ny) ? 'x' : 'y';
      block(x, y); addWall(wallB[axis] || wallA[axis], x, y, true);
    }
    if (gateArch) props.push({ kind: 'scatter', x: center[0], y: center[1], spr: gateArch, k: TW / 160, flip: false, onWall: true, castleGate: true });
    if (gateTower) for (const side of [-1, 1]) {
      const [tx, ty] = routePoint(t, side * 13.5);
      props.push({ kind: 'scatter', x: tx, y: ty, spr: gateTower, k: TW / 160, flip: false, onWall: true, castleBuilding: true });
    }
  }

  // Place large Castle keeps and gatehouse sections beside the road so the player sees a built-up route,
  // not empty grounds. The footprints sit outside the clear 17-tile central lane.
  const structures = [
    ['castle_landmark_09_small_keep_complex', 0.12, -21, 9, 8],
    ['castle_landmark_02_gatehouse_wall_turn', 0.21, 21, 10, 7],
    ['castle_landmark_10_gatehouse_and_keep', 0.34, -21, 10, 9],
    ['castle_landmark_08_corner_tower_cluster', 0.44, 21, 9, 9],
    ['castle_landmark_04_curtain_wall_battlement', 0.58, -21, 10, 8],
    ['castle_landmark_09_small_keep_complex', 0.68, 21, 9, 8],
    ['castle_landmark_02_gatehouse_wall_turn', 0.82, -21, 10, 7],
    ['castle_landmark_10_gatehouse_and_keep', 0.90, 21, 10, 9],
  ];
  for (const [id, t, offset, rx, ry] of structures) {
    const [x, y] = routePoint(t, offset), spr = castleObject(id, 'castle_landmarks');
    if (!spr) continue;
    props.push({ kind: 'scatter', x, y, spr, k: TW / 160, flip: false, onWall: true, castleBuilding: true });
    for (let by = Math.floor(y - ry); by <= Math.ceil(y + ry); by++) for (let bx = Math.floor(x - rx); bx <= Math.ceil(x + rx); bx++) {
      if (routeDistance(bx + 0.5, by + 0.5) > 17 && map.inb(bx, by)) block(bx, by);
    }
  }
  // The guardian's courtyard has its own keep silhouette behind the boss.
  const bossKeep = castleObject('castle_landmark_10_gatehouse_and_keep', 'castle_landmarks');
  if (bossKeep) props.push({ kind: 'scatter', x: boss[0] - 6, y: boss[1] - 7, spr: bossKeep, k: TW / 160, flip: false, onWall: true, castleBuilding: true });

  // Restore the route and gate openings after structure footprints have been placed.
  road(start[0], start[1], boss[0], boss[1], 8);
  for (let y = 8; y <= 25; y++) for (let x = 306; x <= 330; x++) {
    map.block[I(x, y)] = 0; map.road[I(x, y)] = 1; map.castleMat[I(x, y)] = MAT.cobble;
  }
  for (let y = 278; y <= 298; y++) for (let x = 9; x <= 34; x++) {
    map.block[I(x, y)] = 0; map.road[I(x, y)] = 1; map.castleMat[I(x, y)] = MAT.cobble;
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    map.v[i] = rng.int(0, Math.max(0, floors.length - 1));
  }

  // Populate the walkable road and courtyards only; no packs are left in the broad empty outer grounds.
  const connected = new Uint8Array(N), queue = new Int32Array(N), startTile = map.tileIdx(start[0], start[1]);
  let qh = 0, qt = 0; queue[qt++] = startTile; connected[startTile] = 1;
  while (qh < qt) {
    const i = queue[qh++], x = i % W, y = (i / W) | 0;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx0 = x + ox, ny0 = y + oy;
      if (!map.walkableTile(nx0, ny0)) continue;
      const ni = I(nx0, ny0);
      if (!connected[ni]) { connected[ni] = 1; queue[qt++] = ni; }
    }
  }
  const reachable = queue.slice(0, qt).filter((i) => routeDistance(i % W + 0.5, ((i / W) | 0) + 0.5) < 12);
  const looks = rollLooks(biome, rng.fn()), spawns = [], roster = biome.roster;
  const targetEnemies = rng.int(240, 300);
  let enemyCount = 0, attempts = 0;
  const maxAttempts = targetEnemies * 120;
  while (enemyCount < targetEnemies && attempts++ < maxAttempts) {
    const i = reachable[rng.int(0, reachable.length - 1)], x = i % W + 0.5, y = ((i / W) | 0) + 0.5;
    if (Math.hypot(x - start[0], y - start[1]) < 18 || Math.hypot(x - boss[0], y - boss[1]) < 24) continue;
    if (spawns.some(s => Math.hypot(s.x - x, s.y - y) < 6)) continue;
    const n = Math.min(rng.int(2, 4), targetEnemies - enemyCount), arch = rng.pick(roster);
    const champion = spawns.length > 0 && spawns.length % 10 === 0;
    spawns.push({ x, y, arch, n, rank: champion ? 'champion' : 'normal', look: looks.pick(arch) });
    enemyCount += n;
  }
  if (enemyCount < targetEnemies) throw new Error('Could not populate the Castle route with reachable enemy packs.');
  const bossArch = biome.roster.includes('golem') ? 'golem' : rng.pick(roster);
  spawns.push({ x: boss[0], y: boss[1], arch: bossArch, n: 1, rank: 'boss', look: looks.pick(bossArch), name: 'Castle Guardian' });

  map.walls = []; map.doors = []; map.segments = [];
  return {
    map, props, buildings, trees, wallHangings: [], townTiles: [...floors, ...keepFloors],
    looks, spawns, chests: [], torches: [], start, boss, exit,
    seed, layoutSeed: seed, variant: V,
    story: null,
  };
}
