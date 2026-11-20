// Campaign biome schedule regression: sequential act rotations, boss overrides, and open endgame pool.
import { CAMPAIGN_BOSS_ENVIRONMENTS, CAMPAIGN_ENVIRONMENT_ROTATIONS, DEPTH_BIOME_RANGES, DEPTH_DUNGEON_RANGES, BIOME_BY_ID, biomesForDepth, drawBiome, biomeChoices } from '../../src/data/biomes.js';
import { ACTS, FINAL_DEPTH } from '../../src/data/depth.js';

const fail = (message) => { throw new Error(message); };
if (DEPTH_BIOME_RANGES.length !== FINAL_DEPTH) fail(`Expected one deterministic environment assignment for each of ${FINAL_DEPTH} campaign depths`);
for (let depth = 1; depth <= FINAL_DEPTH; depth++) {
  const act = ACTS.find((entry) => depth >= entry.start && depth <= entry.end);
  const rotation = CAMPAIGN_ENVIRONMENT_ROTATIONS[act.act];
  const expected = CAMPAIGN_BOSS_ENVIRONMENTS[depth] || rotation[(depth - act.start) % rotation.length];
  const range = DEPTH_BIOME_RANGES[depth - 1];
  if (range.start !== depth || range.end !== depth || range.ids.length !== 1 || range.ids[0] !== expected) fail(`Depth ${depth} must use only ${expected}`);
  if (!BIOME_BY_ID[expected]) fail(`Unknown campaign environment ${expected} at depth ${depth}`);
  if (biomesForDepth(depth).join() !== expected) fail(`Depth ${depth} resolved to an environment outside its schedule`);
  if (drawBiome({ biomeBag: ['throne'], lastBiome: 'throne' }, depth) !== expected) fail(`Campaign depth ${depth} draw was not deterministic`);
  if (biomeChoices({ biomeBag: [], lastBiome: null }, depth).join() !== expected) fail(`Campaign depth ${depth} portal choice did not match its schedule`);
}
for (const [depth, id] of Object.entries(CAMPAIGN_BOSS_ENVIRONMENTS)) if (biomesForDepth(Number(depth)).join() !== id) fail(`Boss environment override at depth ${depth} is incorrect`);
for (const act of ACTS) {
  const rotation = CAMPAIGN_ENVIRONMENT_ROTATIONS[act.act];
  if (rotation.length !== 4 || new Set(rotation).size !== rotation.length) fail(`Act ${act.act} must have four distinct environments`);
  for (let i = 0; i < rotation.length; i++) if (biomesForDepth(act.start + i).join() !== rotation[i]) fail(`Act ${act.act} rotation does not restart correctly`);
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
console.log('Sequential 100-depth act rotations, boss overrides, and infinite dungeon pool OK');
