// Compact Castle overworld. Retains the Castle pack's floor art, variants, and story dialogue on an 84x76 map.
import { TileMap } from './map.js';
import { RNG } from '../core/util.js';
import { TW } from '../core/view.js';
import { rollLooks } from '../data/bestiary.js';
import { castleFloorTiles, castleKeepFloorTiles, castleObject } from '../gfx/castle.js';
import { MAT } from '../gfx/castleground.js';
import { castleVariant } from '../data/castles.js';

export const CASTLE_SIZE = Object.freeze([84, 76]);
export const CASTLE_OUTER = Object.freeze({ x0: 7, y0: 8, x1: 76, y1: 68 });
export const CASTLE_INNER = Object.freeze({ x0: 25, y0: 25, x1: 58, y1: 52 });
export const CASTLE_WALL = CASTLE_OUTER;
export const CASTLE_GATES = Object.freeze({ outer: [[41, 68]], inner: [[41, 52]], north: [[41, 8]] });
export { MAT };

export function generateCastle(depth, biome, seed, variant = null) {
  const V = castleVariant(variant), floors = castleFloorTiles(V.look?.ground || null), keepFloors = castleKeepFloorTiles();
  if (!floors.length) throw new Error('Castle floors and moat water must load before generating the overworld.');

  const [W, H] = CASTLE_SIZE, map = new TileMap(W, H), rng = new RNG(seed), N = W * H, I = (x, y) => y * W + x;
  map.t.fill(1); map.losBlocks = true; map.castleMat = new Uint8Array(N); map.castleGround = V.look?.ground || null;
  map.castleVariant = V.id; map.road = new Uint8Array(N); map.rampartDeck = new Uint8Array(N);
  map.rampartWall = new Uint8Array(N); map.castleRoomWalls = new Uint8Array(N);
  map.castleBridges = []; map.castleStairs = []; map.castleRooms = []; map.castleDoors = [];

  const props = [], trees = [], buildings = [];
  const block = (x, y) => { if (map.inb(x, y)) map.block[I(x, y)] = 1; };
  const road = (x0, y0, x1, y1) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let n = 0; n <= steps; n++) {
      const t = n / Math.max(1, steps), x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
      if (!map.inb(x, y)) continue;
      const i = I(x, y); map.block[i] = 0; map.road[i] = 1; map.castleMat[i] = MAT.road;
    }
  };

  // A compact curtain wall and keep courtyard with clear south gates.
  for (let x = 7; x <= 76; x++) if (x < 39 || x > 43) { block(x, 8); block(x, 68); }
  for (let y = 8; y <= 68; y++) { block(7, y); block(76, y); }
  for (let x = 25; x <= 58; x++) if (x < 39 || x > 43) { block(x, 25); block(x, 52); }
  for (let y = 25; y <= 52; y++) { block(25, y); block(58, y); }
  road(41, 73, 41, 9);
  for (let y = 9; y < 68; y++) for (let x = 8; x < 76; x++)
    if (!map.block[I(x, y)]) map.castleMat[I(x, y)] = MAT.meadow;
  for (let i = 0; i < N; i++) if (map.road[i]) map.castleMat[i] = MAT.road;

  // Reuse Castle wall art for the compact perimeter and courtyard.
  const wallX = castleObject('wall_01_quarry_limestone_straight_NE_SW', 'walls');
  const wallY = castleObject('wall_01_quarry_limestone_straight_SE_NW', 'walls');
  if (wallX && wallY) {
    const addWall = (spr, x, y, flip = false) => props.push({ kind: 'scatter', x: x + 0.5, y: y + 0.5, spr, k: TW / 160, flip, light: 0, onWall: true });
    for (let x = 8; x < 76; x += 2) if (x < 39 || x > 43) { addWall(wallX, x, 8); addWall(wallX, x, 67, true); }
    for (let y = 10; y < 68; y += 2) { addWall(wallY, 8, y, true); addWall(wallY, 75, y); }
    for (let x = 26; x < 58; x += 2) if (x < 39 || x > 43) { addWall(wallX, x, 25); addWall(wallX, x, 51, true); }
    for (let y = 27; y < 52; y += 2) { addWall(wallY, 26, y, true); addWall(wallY, 57, y); }
  }

  const start = [41.5, 72.5], exit = [41.5, 5.5];
  const sites = [[41.5, 60], [18.5, 40], [64.5, 40], [41.5, 18], [20.5, 18], [63.5, 60], [32.5, 35], [50.5, 35]];
  const scenarioId = (((seed >>> 0) ^ depth) >>> 0) % 20;
  for (let i = 0; i < N; i++) map.v[i] = rng.int(0, Math.max(0, floors.length - 1));

  return {
    map, props, buildings, trees, wallHangings: [], townTiles: [...floors, ...keepFloors],
    looks: rollLooks(biome, rng.fn()), spawns: [], chests: [], torches: [],
    start, exit, shrine: sites[0], sites, scenarioId, seed, engines: [], tents: [], variant: V,
    story: { herald: [40.5, 68.5], lord: [41.5, 40.5] },
  };
}

