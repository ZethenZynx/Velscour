// Compare Castle pack counts and placement safety across every generated variant.
// Run: node tools/tests/castle_pack_density.mjs [seeds per variant]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }) }) };
const pack = read('assets/tiles/castle/pack.json'), ramparts = read('assets/tiles/castle/ramparts.json');
globalThis.fetch = async (url) => ({ ok: true, json: async () => String(url).includes('ramparts.json') ? ramparts : pack });
globalThis.Image = class { constructor() { this.width = 16384; this.height = 16384; } set src(_) { queueMicrotask(() => this.onload?.()); } };
const imp = (p) => import(pathToFileURL(path.join(root, p)));
const { loadCastlePack } = await imp('src/gfx/castle.js');
const { BIOME_BY_ID } = await imp('src/data/biomes.js');
const { generateCastle } = await imp('src/world/castleworld.js');
const { CASTLE_VARIANTS } = await imp('src/data/castles.js');
const { createCastleRun } = await imp('src/game/darkforest.js');
const { UI } = await imp('src/ui/ui.js');
await loadCastlePack();
UI.msgEl = { innerHTML: '', classList: { toggle() {} }, style: {} };
UI.logEl = null;

const seeds = Math.max(1, Number(process.argv[2]) || 2), biome = BIOME_BY_ID.castle;
let oldPacks = 0, newPacks = 0, oldEnemies = 0, newEnemies = 0, newNormalPacks = 0, championPacks = 0, elapsed = 0;
for (const variant of CASTLE_VARIANTS) for (let seed = 1; seed <= seeds; seed++) {
  const t0 = performance.now(), gen = generateCastle(30, biome, seed * 7717 + 3, variant.id), map = gen.map;
  elapsed += performance.now() - t0;
  const regular = gen.spawns.filter((s) => s.rank !== 'boss');
  const added = regular.filter((s) => s.castleDensityBonus);
  const baseline = regular.filter((s) => !s.castleDensityBonus);
  if (added.length !== 22) throw new Error(`${variant.id} seed ${seed}: expected 22 bonus packs, got ${added.length}`);
  if (added.some((s) => s.rank !== 'normal')) throw new Error(`${variant.id} seed ${seed}: density increase added an elite pack`);
  const increase = added.length / baseline.length * 100;
  if (increase < 25 || increase > 35) throw new Error(`${variant.id} seed ${seed}: pack increase ${increase.toFixed(1)}% is outside 25–35%`);
  for (const s of added) {
    if (!map.circleFree(s.x, s.y, 0.35)) throw new Error(`${variant.id} seed ${seed}: added pack is inside a wall or obstacle`);
    if (regular.some((other) => other !== s && Math.hypot(other.x - s.x, other.y - s.y) < 6.99)) throw new Error(`${variant.id} seed ${seed}: added pack overlaps another group`);
  }

  // These are the same reachability and collision checks used by the Castle generator before its gate tiles are sealed.
  const objectiveSpawns = regular.filter((s) => s.castleObjective);
  if (objectiveSpawns.length !== 2) throw new Error(`${variant.id} seed ${seed}: expected both side objectives`);
  for (const s of [...added, ...objectiveSpawns]) {
    if (!map.walkable(s.x, s.y) || !map.circleFree(s.x, s.y, 0.35)) throw new Error(`${variant.id} seed ${seed}: blocked spawn ${s.name || s.arch}`);
  }
  if (gen.spawns.filter((s) => s.rank === 'boss').length !== 1) throw new Error(`${variant.id} seed ${seed}: guardian count changed`);
  for (const completeKey of ['siege', 'graveyard']) {
    const testMap = Object.assign(Object.create(Object.getPrototypeOf(map)), map, { block: map.block.slice(), castleGateLocked: true, castleGateUnlocked: false });
    const objectiveTargets = objectiveSpawns.map((s) => ({ castleObjective: s.castleObjective, x: s.x, y: s.y, dead: false, hp: 100 }));
    const guardian = { rank: 'boss', dead: false };
    const world = { map: testMap, boss: guardian, creatures: objectiveTargets, portals: [], flowTimer: 0, castleFlow: null };
    const run = createCastleRun(world, { castleObjectives: gen.castleObjectives }, biome);
    if (!testMap.castleGateLocked || testMap.castleGateUnlocked) throw new Error(`${variant.id} seed ${seed}: gate did not start locked`);
    objectiveTargets.find((s) => s.castleObjective === completeKey).dead = true;
    run.update();
    if (testMap.castleGateLocked || !testMap.castleGateUnlocked) throw new Error(`${variant.id} seed ${seed}: completing ${completeKey} did not unlock the gate`);
    if (run.objectives.filter((o) => o.complete).length !== 1) throw new Error(`${variant.id} seed ${seed}: completing one objective incorrectly completed both`);
  }

  const before = baseline.reduce((sum, s) => sum + s.n, 0), after = regular.reduce((sum, s) => sum + s.n, 0);
  oldPacks += baseline.length; newPacks += regular.length; oldEnemies += before; newEnemies += after;
  championPacks += regular.filter((s) => s.rank === 'champion').length; newNormalPacks += added.length;
}
const layouts = CASTLE_VARIANTS.length * seeds;
console.log(`Castle density: ${layouts} layouts across ${CASTLE_VARIANTS.length} variants.`);
console.log(`Pack records average: ${ (oldPacks / layouts).toFixed(1)} before -> ${(newPacks / layouts).toFixed(1)} after (+${((newPacks / oldPacks - 1) * 100).toFixed(1)}%).`);
console.log(`Regular enemy bodies average: ${(oldEnemies / layouts).toFixed(1)} before -> ${(newEnemies / layouts).toFixed(1)} after (pack sizes unchanged; added packs are normal).`);
console.log(`Champion pack records unchanged by the addition: ${(championPacks / layouts).toFixed(1)} average; ${newNormalPacks / layouts} additional normal packs per layout.`);
console.log(`Average Castle generation time: ${(elapsed / layouts).toFixed(1)} ms per layout.`);
