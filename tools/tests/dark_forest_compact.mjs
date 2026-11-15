// Node-only contract checks for the simplified Dark Forest.
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
const tileset = { pack: 'dark_forest', floors: pack.floors };
const seeds = process.argv[2] == null ? 100 : +process.argv[2];
for (let n = 1; n <= seeds; n++) {
  const g = generateDarkForest(7, biome, tileset, n * 7717 + 3), m = g.map;
  if (m.w !== DF_W || m.h !== DF_H || DF_W !== 192 || DF_H !== 192) throw Error('incorrect map size');
  if (m.walls.length || m.doors.length || g.glades || g.labyrinths) throw Error('legacy trials or labyrinth structures remain');
  if (g.spawns.filter((s) => s.rank === 'boss').length !== 1) throw Error('expected exactly one boss');
  const regular = g.spawns.filter((s) => !['boss', 'raid'].includes(s.rank));
  const enemies = regular.reduce((sum, s) => sum + s.n, 0);
  if (regular.length < 80 || regular.length > 110 || enemies < 220 || enemies > 340) throw Error('enemy population is outside the original forest scale');
  if (g.chests.length !== 2) throw Error('expected two chests');
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
  if (g.trees.length < 14000 || g.trees.length > 15500) throw Error('tree population drifted from the full-size forest');
  if (g.trees.some((t)=>m.walkable(t.x,t.y))) throw Error('blocking tree has no collision');
}
const guardian = { rank:'boss', dead:false, x:179.5, y:12.5 }, world = { boss:guardian };
let opened = false;
const run = createDarkForestRun(world, {}, biome, () => { opened = true; });
run.bossDefeated(guardian);
if (!run.completed || run.active || !opened) throw Error('guardian defeat did not complete the Forest run');
console.log('PASS full-size Dark Forest: '+seeds+' seeds, connected boss route, no trials or mazes, exit callback verified');
