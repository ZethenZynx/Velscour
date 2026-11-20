// Generator contract for the Serpentine Tower's top-to-bottom route. No browser required.
import { generateTower } from '../../src/world/tower.js';
import { BIOME_BY_ID } from '../../src/data/biomes.js';

const biome = BIOME_BY_ID.serpentine_tower;
for (let variant = 0; variant < 5; variant++) {
  for (let seed = 1; seed <= 20; seed++) {
    const gen = generateTower(12, biome, seed * 7919, variant), g = gen.tower, map = gen.map;
    if (!map.walkable(...gen.start)) throw new Error(`${gen.variant.id}/${seed}: top start is not walkable`);
    if (!map.walkable(...gen.exit)) throw new Error(`${gen.variant.id}/${seed}: bottom exit is not walkable`);
    if (gen.start[0] < g.XT || gen.start[0] > g.XT + 5) throw new Error(`${gen.variant.id}/${seed}: start is not at the stairhead`);
    if (gen.exit[0] < g.XB - 5 || gen.exit[0] > g.XB) throw new Error(`${gen.variant.id}/${seed}: exit is not at the ground-floor landing`);
    if (gen.start[0] >= gen.exit[0]) throw new Error(`${gen.variant.id}/${seed}: route does not descend toward increasing stair position`);
    if (!map.findPath(...gen.start, ...gen.exit, 50000)) throw new Error(`${gen.variant.id}/${seed}: the stair does not connect the start to the guardian`);
    if (!map.walkable(g.arenaX, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena center is not walkable`);
    if (!map.findPath(...gen.exit, g.arenaX, g.arenaY, 50000)) throw new Error(`${gen.variant.id}/${seed}: stair landing does not connect to the arena`);
    if (map.walkable(g.arenaX + g.arenaR + 1, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena boundary allows escape`);
    for (let y = Math.floor(g.arenaY - g.arenaR + 1); y <= Math.ceil(g.arenaY + g.arenaR - 1); y++) {
      for (let x = Math.floor(g.arenaX - g.arenaR + 1); x <= Math.ceil(g.arenaX + g.arenaR - 1); x++) {
        if ((x + 0.5 - g.arenaX) ** 2 + (y + 0.5 - g.arenaY) ** 2 <= (g.arenaR - 1) ** 2 && !map.walkable(x + 0.5, y + 0.5)) {
          throw new Error(`${gen.variant.id}/${seed}: arena floor has an interior collision gap at ${x},${y}`);
        }
      }
    }
    const seamA = g.point(g.arenaStart - 0.01, g.arenaY), seamB = g.point(g.arenaStart + 0.01, g.arenaY);
    if (Math.hypot(seamA[0] - seamB[0], seamA[1] - seamB[1]) > 0.1) throw new Error(`${gen.variant.id}/${seed}: staircase-to-arena rendering seam is discontinuous`);
    const boss = g.point(g.arenaX, g.arenaY);
    if (Math.hypot(boss[0], boss[1]) > 0.01) throw new Error(`${gen.variant.id}/${seed}: boss anchor is not at arena center`);
  }
}
console.log('Tower generation OK: 5 variants x 20 seeds, connected stair and arena, sealed boundary, centered boss anchor');
