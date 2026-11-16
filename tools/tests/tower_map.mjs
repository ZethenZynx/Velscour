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
  }
}
console.log('Tower route generation OK: 5 variants x 20 seeds, reachable top start and bottom landing');
