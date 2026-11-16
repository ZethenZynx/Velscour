// Campaign biome schedule regression: every destination is drawn only in its requested depth band.
import { DEPTH_BIOME_RANGES, DEPTH_DUNGEON_RANGES, BIOME_BY_ID, biomesForDepth, drawBiome, biomeChoices } from '../../src/data/biomes.js';

const fail = (message) => { throw new Error(message); };
const ranges = [...DEPTH_BIOME_RANGES, ...DEPTH_DUNGEON_RANGES];
for (const range of ranges) {
  for (const id of range.ids) {
    if (!BIOME_BY_ID[id]) fail(`Unknown biome in schedule: ${id}`);
    for (const depth of new Set([range.start, Math.floor((range.start + range.end) / 2), range.end])) {
      if (!biomesForDepth(depth).includes(id)) fail(`${id} missing from configured Depth ${depth}`);
    }
  }
}
for (let depth = 1; depth <= 500; depth++) {
  const eligible = biomesForDepth(depth);
  if (!eligible.length) fail(`No eligible destination at Depth ${depth}`);
  for (const id of [drawBiome({ biomeBag: [], lastBiome: null, overworldMisses: 0 }, depth), ...biomeChoices({ biomeBag: [], lastBiome: null, overworldMisses: 0 }, depth)]) {
    if (!eligible.includes(id)) fail(`Ineligible ${id} offered at Depth ${depth}`);
  }
}
for (const [depth, ids] of [
  [24, ['overworld', 'dark_forest']],
  [96, ['castle_keep', 'sea_of_sand', 'catacombs', 'desert_temple']],
  [192, ['scorpion_king_pyramid', 'mountainside', 'amber', 'ice_temple']],
  [288, ['endless_siege', 'pirate_seas', 'frozen', 'heavenly']],
  [360, ['skyship', 'ghost_train', 'cathedral', 'molten']],
  [456, ['deep_mines', 'throne', 'void']],
]) for (const id of ids) if (!biomesForDepth(depth).includes(id)) fail(`Shared endpoint Depth ${depth} should include ${id}`);
if (biomesForDepth(457).join() !== 'throne' || biomesForDepth(499).join() !== 'throne' || biomesForDepth(500).join() !== 'throne') {
  fail('Velscour’s Throne must be the only campaign destination from Depth 457 through 500');
}
console.log('Campaign biome depth schedule OK: 500 depths, inclusive shared endpoints, and final Throne range');
