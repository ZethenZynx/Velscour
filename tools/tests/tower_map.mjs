// Generator contract for the Serpentine Tower's top-to-bottom route. No browser required.
import { readFileSync } from 'node:fs';
import { generateTower } from '../../src/world/tower.js';
import { BIOME_BY_ID } from '../../src/data/biomes.js';

const biome = BIOME_BY_ID.serpentine_tower;
const renderSource = readFileSync(new URL('../../src/gfx/tower3d.js', import.meta.url), 'utf8');
for (const [label, pattern] of [
  ['arena backing bypasses the tower cut planes', /arenaFloorMaterial\.clippingPlanes\s*=\s*\[\]/],
  ['arena backing uses the same ground radius as the arena geometry', /CircleGeometry\(arenaFloorR,\s*96\).*arenaFloorMaterial/s],
  ['ground-level upper cut is horizontal', /tw\.arena\s*\?\s*UPN\.set\(0,\s*-1,\s*0\)/],
  ['arena backing visibility follows the player floor state', /S\.arenaFloor\.visible\s*=\s*!!tw\.arena/],
]) if (!pattern.test(renderSource)) throw new Error(`Tower render contract missing: ${label}`);

for (let variant = 0; variant < 5; variant++) {
  for (let seed = 1; seed <= 40; seed++) {
    const gen = generateTower(12, biome, seed * 7919, variant), g = gen.tower, map = gen.map;
    if (!map.walkable(...gen.start)) throw new Error(`${gen.variant.id}/${seed}: top start is not walkable`);
    if (!map.walkable(...gen.exit)) throw new Error(`${gen.variant.id}/${seed}: bottom exit is not walkable`);
    if (gen.start[0] < g.XT || gen.start[0] > g.XT + 5) throw new Error(`${gen.variant.id}/${seed}: start is not at the stairhead`);
    if (gen.exit[0] < g.XB - 5 || gen.exit[0] > g.XB) throw new Error(`${gen.variant.id}/${seed}: exit is not at the ground-floor landing`);
    if (gen.start[0] >= gen.exit[0]) throw new Error(`${gen.variant.id}/${seed}: route does not descend toward increasing stair position`);
    if (!map.findPath(...gen.start, ...gen.exit, 50000)) throw new Error(`${gen.variant.id}/${seed}: the stair does not connect the start to the guardian`);
    if (!map.walkable(g.arenaX, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena center is not walkable`);
    const approach = map.findPath(...gen.exit, g.arenaX, g.arenaY, 50000, 0.42);
    if (!approach) throw new Error(`${gen.variant.id}/${seed}: stair landing does not connect to the arena for a boss-sized mover`);
    if (map.walkable(g.arenaX + g.arenaWalkR + 1, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena boundary allows escape`);
    for (let y = Math.floor(g.arenaY - g.arenaWalkR + 1); y <= Math.ceil(g.arenaY + g.arenaWalkR - 1); y++) {
      for (let x = Math.floor(g.arenaX - g.arenaWalkR + 1); x <= Math.ceil(g.arenaX + g.arenaWalkR - 1); x++) {
        if ((x + 0.5 - g.arenaX) ** 2 + (y + 0.5 - g.arenaY) ** 2 <= (g.arenaWalkR - 0.8) ** 2 && !map.walkable(x + 0.5, y + 0.5)) {
          throw new Error(`${gen.variant.id}/${seed}: arena floor has an interior collision gap at ${x},${y}`);
        }
      }
    }
    for (let y = 0; y < g.GH; y++) for (let x = Math.floor(g.arenaStart); x < g.GW; x++) {
      if (!map.walkable(x + 0.5, y + 0.5)) continue;
      const [wx, wy, z] = g.point(x + 0.5, y + 0.5);
      if (!Number.isFinite(wx) || !Number.isFinite(wy) || z !== 0 || Math.hypot(wx, wy) > g.arenaFloorR + 0.05) {
        throw new Error(`${gen.variant.id}/${seed}: a walkable arena tile does not project onto the rendered floor`);
      }
    }
    // Follow the smoothed click-to-move route using the same collision-aware movement routine.
    const walker = { x: gen.exit[0], y: gen.exit[1], r: 0.525 };
    for (const [tx, ty] of approach) {
      let remaining = Math.hypot(tx - walker.x, ty - walker.y), guard = 0;
      while (remaining > 0.05 && guard++ < 2000) {
        const step = Math.min(0.08, remaining), dx = (tx - walker.x) / remaining * step, dy = (ty - walker.y) / remaining * step;
        if (!map.move(walker, dx, dy)) throw new Error(`${gen.variant.id}/${seed}: direct movement blocked on click route at ${walker.x.toFixed(2)},${walker.y.toFixed(2)}`);
        remaining = Math.hypot(tx - walker.x, ty - walker.y);
      }
      if (guard >= 2000) throw new Error(`${gen.variant.id}/${seed}: click route did not converge`);
    }
    if (Math.hypot(walker.x - g.arenaX, walker.y - g.arenaY) > 0.5) throw new Error(`${gen.variant.id}/${seed}: click-to-move did not reach the boss arena center`);
    if (!map.circleFree(g.arenaX, g.arenaY, 0.42)) throw new Error(`${gen.variant.id}/${seed}: boss-sized collision body does not fit at the center`);
    const seamA = g.point(g.arenaStart - 0.01, g.arenaY), seamB = g.point(g.arenaStart + 0.01, g.arenaY);
    if (Math.hypot(seamA[0] - seamB[0], seamA[1] - seamB[1]) > 0.1) throw new Error(`${gen.variant.id}/${seed}: staircase-to-arena rendering seam is discontinuous`);
    const boss = g.point(g.arenaX, g.arenaY);
    if (Math.hypot(boss[0], boss[1]) > 0.01) throw new Error(`${gen.variant.id}/${seed}: boss anchor is not at arena center`);
  }
}
console.log('Tower generation OK: 5 variants x 40 seeds, boss-sized pathfinding, direct movement, arena collision coverage, sealed boundary, centered boss anchor');
