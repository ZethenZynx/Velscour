// Node-only contract checks for the full-size Dark Forest, on-route landmarks and optional side labyrinths.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const pack = json('assets/tiles/dark_forest/pack.json'), treeMeta = json('assets/tiles/dark_forest/trees.json');
globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('trees.json') ? treeMeta : pack });
globalThis.Image = class { set src(_) { queueMicrotask(() => this.onload?.()); } };
const imp = (p) => import(pathToFileURL(path.join(root, p)));
const { loadDarkForestTrees } = await imp('src/gfx/darkforest.js');
const { BIOME_BY_ID } = await imp('src/data/biomes.js');
const { generateDarkForest, DF_W, DF_H } = await imp('src/world/darkforest.js');
const { createDarkForestRun } = await imp('src/game/darkforest.js');
const { G } = await imp('src/state.js');
await loadDarkForestTrees();
const biome = BIOME_BY_ID.dark_forest;
const tileset = { pack: 'dark_forest', floors: pack.floors, walls: pack.walls, scatter: pack.scatter, families: Object.keys(pack.walls).map((name) => [name, 1]) };
const seeds = process.argv[2] == null ? 100 : +process.argv[2];
for (let n = 1; n <= seeds; n++) {
  const g = generateDarkForest(7, biome, tileset, n * 7717 + 3), m = g.map;
  if (m.w !== DF_W || m.h !== DF_H || DF_W !== 192 || DF_H !== 192) throw Error('incorrect map size');
  if (m.walls.length < 1000 || m.doors.length || g.glades || g.labyrinths?.length !== 4) throw Error('expected four optional walled labyrinths and no trials');
  if (g.spawns.filter((s) => s.rank === 'boss').length !== 1) throw Error('expected exactly one boss');
  const regular = g.spawns.filter((s) => !['boss', 'raid'].includes(s.rank));
  const enemies = regular.reduce((sum, s) => sum + s.n, 0);
  if (regular.length < 80 || regular.length > 110 || enemies < 220 || enemies > 340) throw Error('enemy population is outside the original forest scale at seed ' + (n * 7717 + 3) + ': ' + regular.length + ' packs, ' + enemies + ' enemies');
  if (g.chests.length !== 6) throw Error('expected two route caches and one cache in each of four optional labyrinths');
  const seen = new Uint8Array(m.w * m.h), idx = (x, y) => Math.floor(y) * m.w + Math.floor(x);
  const q = [idx(...g.start)]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % m.w, y = (i / m.w) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const X=x+dx,Y=y+dy,j=idx(X,Y);
      if(X>=0&&Y>=0&&X<m.w&&Y<m.h&&!seen[j]&&m.walkableTile(X,Y)){seen[j]=1;q.push(j);}
    }
  }
  for (const p of [g.boss,g.exit,...g.chests.map((c)=>[c.x,c.y]),...g.spawns.map((s)=>[s.x,s.y])]) if (!seen[idx(...p)]) throw Error('unreachable spawn or objective: '+p);
  if (!(g.start[0] < m.w/4 && g.start[1] > m.h*3/4 && g.boss[0] > m.w*3/4 && g.boss[1] < m.h/4)) throw Error('start and boss are not on opposite corners');
  const expectedLandmarks = ['camp', 'well', 'shrine', 'obelisk', 'swamp', 'webs'];
  if (g.landmarks?.length !== expectedLandmarks.length || expectedLandmarks.some((name) => !g.landmarks.some((landmark) => landmark.what === name)) || g.props.length < 22) throw Error('expected all six decorative landmarks and their props');
  const routeDx = g.boss[0] - g.start[0], routeDy = g.boss[1] - g.start[1], routeLen = Math.hypot(routeDx, routeDy);
  const sideX = -routeDy / routeLen, sideY = routeDx / routeLen;
  const routeT = (point) => ((point[0] - g.start[0]) * routeDx + (point[1] - g.start[1]) * routeDy) / (routeLen * routeLen);
  const offsets = [];
  let previousT = 0;
  for (const landmark of g.landmarks) {
    const [lx, ly] = landmark.center, t = routeT([lx, ly]);
    const lateral = (lx - g.start[0]) * sideX + (ly - g.start[1]) * sideY;
    if (Math.abs(lateral) > 3.5) throw Error('landmark should sit directly on or beside the main path: ' + landmark.what);
    if (t - previousT < 0.06) throw Error('landmarks should be staggered along the main path, not clustered in pairs');
    previousT = t; offsets.push(Math.round(lateral * 10) / 10);
    if (g.labyrinths.some((maze) => { const [x0,y0,x1,y1] = maze.rect; return landmark.center[0] >= x0 && landmark.center[0] < x1 && landmark.center[1] >= y0 && landmark.center[1] < y1; })) throw Error('a landmark overlaps a labyrinth');
    const reachableClearing = Array.from({ length: 81 }, (_, j) => [Math.floor(landmark.center[0]) + j % 9 - 4, Math.floor(landmark.center[1]) + ((j / 9) | 0) - 4]).some(([x,y]) => x >= 0 && y >= 0 && x < m.w && y < m.h && seen[idx(x,y)] && m.walkableTile(x,y) && Math.hypot(x + 0.5 - landmark.center[0], y + 0.5 - landmark.center[1]) <= 4);
    if (!reachableClearing) throw Error('landmark clearing is not reachable: ' + landmark.what);
  }
  if (new Set(offsets).size < 5 || Math.max(...offsets) - Math.min(...offsets) < 4) throw Error('landmarks should be offset from each other instead of forming parallel rows');
  const expectedSides = ['north', 'south', 'north', 'south'];
  for (let i = 0; i < g.labyrinths.length; i++) {
    const maze = g.labyrinths[i], [x0, y0, x1, y1] = maze.rect;
    if (maze.side !== expectedSides[i] || x1 - x0 !== 44 || y1 - y0 !== 44) throw Error('four full-sized labyrinths must alternate sides of the path');
    if (maze.side === 'north' ? x1 + y1 >= 192 : x0 + y0 <= 192) throw Error('side labyrinth crossed the main path');
    if (i) {
      const prev = g.labyrinths[i - 1], [px0, py0, px1, py1] = prev.rect;
      const gapX = Math.max(0, x0 - px1, px0 - x1), gapY = Math.max(0, y0 - py1, py0 - y1);
      if (Math.hypot(gapX, gapY) < 20 || Math.hypot(maze.gate[0] - prev.gate[0], maze.gate[1] - prev.gate[1]) < 25) throw Error('adjacent labyrinths need a clear gap along the route');
    }
    if (!g.chests.some(c => Math.hypot(c.x - maze.center[0] - 0.5, c.y - maze.center[1] - 0.5) < 2)) throw Error('each optional labyrinth must contain a reward chest');
  }
  if (g.trees.length < 14000 || g.trees.length > 15500) throw Error('tree population drifted from the full-size forest');
  if (g.trees.some((t)=>m.walkable(t.x,t.y))) throw Error('blocking tree has no collision');
}
const guardian = { rank:'boss', dead:false, x:179.5, y:12.5 }, world = { boss:guardian };
let opened = false;
const run = createDarkForestRun(world, {}, biome, () => { opened = true; });
guardian.dead = true;
run.bossDefeated(guardian);
if (!run.completed || run.active || !opened) throw Error('guardian defeat did not complete the Forest run');
console.log('PASS full-size Dark Forest: '+seeds+' seeds, connected boss route, six staggered on-route landmarks, four alternating side labyrinths with reward chests, exit callback verified');
