// Campaign biome schedule regression: fixed bands, exclusive Throne finale, open endgame pool.
import { DEPTH_BIOME_RANGES, DEPTH_DUNGEON_RANGES, BIOME_BY_ID, biomesForDepth, drawBiome, biomeChoices } from '../../src/data/biomes.js';
import { FINAL_DEPTH } from '../../src/data/depth.js';

const fail = (message) => { throw new Error(message); };
const expected = [
  [1, 6, 'overworld'], [7, 12, 'dark_forest'], [13, 18, 'castle'], [19, 24, 'castle_keep'],
  [25, 30, 'sea_of_sand'], [31, 36, 'great_hunt'], [37, 42, 'serpentine_tower'], [43, 48, 'scorpion_king_pyramid'],
  [49, 54, 'mountainside'], [55, 60, 'depths_edge'], [61, 66, 'snowy_summit'], [67, 72, 'endless_siege'],
  [73, 79, 'pirate_seas'], [80, 84, 'skyship'], [85, 92, 'ghost_train'], [93, 99, 'deep_mines'], [100, 100, 'throne'],
];
if (DEPTH_BIOME_RANGES.length !== expected.length) fail(`Expected ${expected.length} campaign environment bands`);
for (const [i, [start, end, id]] of expected.entries()) {
  const range = DEPTH_BIOME_RANGES[i];
  if (range.start !== start || range.end !== end || range.ids.length !== 1 || range.ids[0] !== id) fail(`Campaign environment band ${start}-${end} is incorrect`);
  if (!BIOME_BY_ID[id]) fail(`Unknown campaign environment ${id}`);
  for (const d of [start, Math.floor((start + end) / 2), end]) if (biomesForDepth(d).join() !== id) fail(`Depth ${d} must use only ${id}`);
}
if (biomesForDepth(99).join() !== 'deep_mines' || biomesForDepth(FINAL_DEPTH).join() !== 'throne') fail('Final campaign environment schedule is incorrect');
const scheduled = new Set(DEPTH_BIOME_RANGES.flatMap((range) => range.ids));
const endgame = new Set(DEPTH_DUNGEON_RANGES[0].ids);
if (!endgame.size || endgame.has('throne') || [...scheduled].some((id) => endgame.has(id))) fail('Campaign environments leaked into the infinite endgame pool');
for (const d of [101, 102, 125, 500, 501, Number.MAX_SAFE_INTEGER]) {
  const eligible = biomesForDepth(d);
  if (!eligible.length) fail(`No eligible destination at Depth ${d}`);
  if (eligible.some((id) => !endgame.has(id))) fail(`Unexpected environment in endgame pool at Depth ${d}`);
  for (const id of [drawBiome({ biomeBag: [], lastBiome: null }, d), ...biomeChoices({ biomeBag: [], lastBiome: null }, d)]) if (!eligible.includes(id)) fail(`Ineligible ${id} offered at Depth ${d}`);
}
for (let d = 1; d <= FINAL_DEPTH; d++) if (biomesForDepth(d).length !== 1) fail(`Campaign Depth ${d} has more than one selectable environment`);
console.log('Approved 100-depth environment schedule and infinite dungeon pool OK');
