// Node-only contract checks for the full-size Castle guardian route.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const pack = readJson('assets/tiles/castle/pack.json');
const ramparts = readJson('assets/tiles/castle/ramparts.json');

globalThis.fetch = async (url) => ({
  ok: true,
  json: async () => String(url).includes('ramparts.json') ? ramparts : pack,
});
globalThis.Image = class {
  constructor() { this.width = 16384; this.height = 16384; }
  set src(_) { queueMicrotask(() => this.onload?.()); }
};
const imp = (p) => import(pathToFileURL(path.join(root, p)));

const { loadCastlePack } = await imp('src/gfx/castle.js');
const { BIOME_BY_ID } = await imp('src/data/biomes.js');
const { generateCastle, CASTLE_SIZE } = await imp('src/world/castleworld.js');
const { createCastleRun, createDarkForestRun } = await imp('src/game/darkforest.js');
await loadCastlePack();

const count = process.argv[2] == null ? 10 : +process.argv[2];
const biome = BIOME_BY_ID.castle;
for (let seed = 1; seed <= count; seed++) {
  const g = generateCastle(30, biome, seed * 7717 + 3, 0), m = g.map;
  if (m.w !== CASTLE_SIZE[0] || m.h !== CASTLE_SIZE[1] || m.w !== 336 || m.h !== 304) throw Error('Castle size is not 336 x 304');
  if (g.spawns.filter((s) => s.rank === 'boss').length !== 1) throw Error('expected exactly one guardian');
  if (g.shrine || g.scenarioId !== undefined || g.sites || g.chests.length) throw Error('legacy objectives or extra loot remain');
  const regular = g.spawns.filter((s) => s.rank !== 'boss');
  const enemies = regular.reduce((sum, s) => sum + s.n, 0);
  if (enemies < 240 || enemies > 300) throw Error('regular monster population drifted');
  const routeWalls = g.props.filter((p) => p.castleRouteWall).length;
  const buildings = g.props.filter((p) => p.castleBuilding).length;
  const gates = g.props.filter((p) => p.castleGate).length;
  if (routeWalls < 500 || buildings < 10 || gates !== 3) throw Error('the route needs continuous walls, buildings and three gates');
  const dx = g.boss[0] - g.start[0], dy = g.boss[1] - g.start[1], denom = dx * dx + dy * dy;
  for (const s of regular) {
    const t = Math.max(0, Math.min(1, ((s.x - g.start[0]) * dx + (s.y - g.start[1]) * dy) / denom));
    const distance = Math.hypot(s.x - g.start[0] - t * dx, s.y - g.start[1] - t * dy);
    if (distance >= 12) throw Error('a regular monster pack spawned outside the Castle route');
  }

  const seen = new Uint8Array(m.w * m.h), idx = (x, y) => Math.floor(y) * m.w + Math.floor(x);
  const q = [idx(...g.start)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % m.w, y = (i / m.w) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const X = x + dx, Y = y + dy, j = idx(X, Y);
      if (X >= 0 && Y >= 0 && X < m.w && Y < m.h && !seen[j] && m.walkableTile(X, Y)) { seen[j] = 1; q.push(j); }
    }
  }
  for (const p of [g.boss, g.exit, ...g.spawns.map((s) => [s.x, s.y])]) if (!seen[idx(...p)]) throw Error('unreachable spawn or route endpoint: ' + p);
  if (!(g.start[0] < m.w / 4 && g.start[1] > m.h * 3 / 4 && g.boss[0] > m.w * 3 / 4 && g.boss[1] < m.h / 4)) throw Error('entry and boss are not opposite corners');
}
const forestGuardian = { rank: 'boss', team: 'enemy', dead: false };
if (createDarkForestRun({ boss: forestGuardian }, { seed: 1 }, biome).type !== 'forest') throw Error('Dark Forest run behavior changed');
const guardian = { rank: 'boss', team: 'enemy', dead: false, x: 320.5, y: 15.5 };
const world = { boss: guardian, creatures: [guardian] };
let opened = false;
const run = createCastleRun(world, { seed: 1 }, biome, () => { opened = true; });
guardian.dead = true;
run.bossDefeated(guardian);
if (!run.completed || run.active || !opened) throw Error('guardian defeat did not complete the Castle run');
console.log('PASS Castle guardian route: ' + count + ' seeds, connected full-size map, no objectives, exit callback verified');
