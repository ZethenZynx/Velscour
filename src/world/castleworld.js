// Full-size Castle overworld: a clear route through open courtyards to the far-corner guardian.
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

export function generateCastle(depth, biome, seed, variant = null) {
  const V = castleVariant(variant), floors = castleFloorTiles(V.look?.ground || null), keepFloors = castleKeepFloorTiles();
  if (!floors.length) throw new Error('Castle floors and moat water must load before generating the overworld.');

  const [W, H] = CASTLE_SIZE, map = new TileMap(W, H), rng = new RNG(seed), N = W * H;
  const I = (x, y) => y * W + x;
  const start = [16.5, 289.5], boss = [320.5, 15.5], exit = [326.5, 9.5];
  const dx = boss[0] - start[0], dy = boss[1] - start[1], denom = dx * dx + dy * dy;
  const routeDistance = (x, y) => {
    const t = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / denom, 0, 1);
    return Math.hypot(x - start[0] - t * dx, y - start[1] - t * dy);
  };

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

  // A broad, open diagonal road connects the entry courtyard to the guardian's corner.
  road(start[0], start[1], boss[0], boss[1], 8);
  road(start[0], start[1], start[0] + 1, start[1] - 1, 12);
  road(boss[0], boss[1], exit[0], exit[1], 12);

  // Low outer curtain walls frame the castle grounds. Wide gate openings align with the start and exit.
  for (let x = CASTLE_OUTER.x0; x <= CASTLE_OUTER.x1; x++) {
    if (!(x >= 10 && x <= 31)) block(x, CASTLE_OUTER.y1);
    if (!(x >= 306 && x <= 330)) block(x, CASTLE_OUTER.y0);
  }
  for (let y = CASTLE_OUTER.y0; y <= CASTLE_OUTER.y1; y++) {
    block(CASTLE_OUTER.x0, y); block(CASTLE_OUTER.x1, y);
  }
  const wallX = castleObject('wall_01_quarry_limestone_straight_NE_SW', 'walls');
  const wallY = castleObject('wall_01_quarry_limestone_straight_SE_NW', 'walls');
  const addWall = (spr, x, y, flip = false) => {
    if (spr) props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr, k: TW / 160, flip, light: 0, onWall: true });
  };
  if (wallX && wallY) {
    for (let x = CASTLE_OUTER.x0; x < CASTLE_OUTER.x1; x += 2) {
      if (!(x >= 10 && x <= 31)) addWall(wallX, x, CASTLE_OUTER.y1 - 1, true);
      if (!(x >= 306 && x <= 330)) addWall(wallX, x, CASTLE_OUTER.y0);
    }
    for (let y = CASTLE_OUTER.y0 + 1; y < CASTLE_OUTER.y1; y += 2) {
      addWall(wallY, CASTLE_OUTER.x0, y, true);
      addWall(wallY, CASTLE_OUTER.x1 - 1, y);
    }
  }

  // Castle keeps and gatehouse ruins dress the edges of the open route without creating maze corridors.
  const landmarks = [
    ['castle_landmark_09_small_keep_complex', 74, 72, 8, 7],
    ['castle_landmark_08_corner_tower_cluster', 48, 151, 7, 7],
    ['castle_landmark_10_gatehouse_and_keep', 254, 238, 10, 8],
    ['castle_landmark_02_gatehouse_wall_turn', 276, 146, 7, 6],
  ];
  for (const [id, x, y, rx, ry] of landmarks) {
    const spr = castleObject(id, 'castle_landmarks');
    if (!spr) continue;
    props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr, k: TW / 160, flip: false, onWall: true, castleBuilding: true });
    // Keep building footprints solid while leaving a broad approach between them.
    for (let by = y - ry; by <= y + ry; by++) for (let bx = x - rx; bx <= x + rx; bx++) {
      if (routeDistance(bx + 0.5, by + 0.5) > 18 && map.inb(bx, by)) block(bx, by);
    }
  }

  // Keep the road, entry and boss arena open after scenery footprints are placed.
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

  // Fill only reachable ground, so no combat pack is stranded behind a wall or building.
  const connected = new Uint8Array(N), queue = new Int32Array(N), startTile = map.tileIdx(start[0], start[1]);
  let qh = 0, qt = 0; queue[qt++] = startTile; connected[startTile] = 1;
  while (qh < qt) {
    const i = queue[qh++], x = i % W, y = (i / W) | 0;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ox, ny = y + oy;
      if (!map.walkableTile(nx, ny)) continue;
      const ni = I(nx, ny);
      if (!connected[ni]) { connected[ni] = 1; queue[qt++] = ni; }
    }
  }
  const reachable = queue.slice(0, qt), looks = rollLooks(biome, rng.fn()), spawns = [];
  const roster = biome.roster, targetEnemies = rng.int(240, 300);
  let enemyCount = 0, attempts = 0;
  const maxAttempts = targetEnemies * 90;
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
