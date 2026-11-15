// Ground gear and gem drops cannot exceed the current character's level.
//   node tools/tests/drop_item_level.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { rollItem, RARITY } from '../../src/data/items.js';
import { groundDropRarityCap, rollGroundGem, rollGroundItem } from '../../src/game/loot.js';

G.char = { level: 3 };
const gear = rollGroundItem(12, { slot: 'ring', rarity: 0 });
assert.equal(gear.ilvl, 3);
assert.equal(gear.req, 3);
assert.equal(gear.slot, 'ring');

const gem = rollGroundGem(12);
assert.ok(gem.ilvl <= G.char.level, `gem level ${gem.ilvl} exceeds character level ${G.char.level}`);

const qualityDepths = [1, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336, 360, 384, 408, 432, 456];
assert.deepEqual(RARITY.map((r) => r.minDepth), qualityDepths, 'all gear quality depth unlocks match the design');
assert.deepEqual(RARITY.map((r) => r.name), ['Orange', 'Light Blue', 'Yellow', 'Green', 'Ivory', 'Vermilion', 'Brown', 'Amber', 'Purple', 'White', 'Dandelion', 'Pale Yellow', 'Plum', 'Blue', 'Red', 'Cyan', 'Salmon', 'Gold', 'Cream', 'Sunflower Yellow']);
const rarityThresholds = [[1, 0], [23, 0], [24, 1], [47, 1], [48, 2], [71, 2], [72, 3], [95, 3], [96, 4], [119, 4], [120, 5], [143, 5], [144, 6], [167, 6], [168, 7], [191, 7], [192, 8], [215, 8], [216, 9], [239, 9], [240, 10], [263, 10], [264, 11], [287, 11], [288, 12], [311, 12], [312, 13], [335, 13], [336, 14], [359, 14], [360, 15], [383, 15], [384, 16], [407, 16], [408, 17], [431, 17], [432, 18], [455, 18], [456, 19]];
for (const [depth, expected] of rarityThresholds) {
  G.world = { depth };
  assert.equal(groundDropRarityCap(depth), expected, `depth ${depth} rarity cap`);
  const capped = rollGroundItem(12, { rarity: 19 });
  assert.equal(capped.rarity, expected, `depth ${depth} explicit rarity cap`);
  for (let i = 0; i < 20; i++) assert.ok(rollGroundItem(12).rarity <= expected, `random rarity exceeded cap at depth ${depth}`);
}

G.char = { level: 100, depth: 23 };
G.world = { kind: 'town', depth: 0 };
assert.equal(rollGroundItem(100, { rarity: 19 }).rarity, 0, 'town rewards use the saved campaign depth below depth 24');
G.char.depth = 24;
assert.equal(rollGroundItem(100, { rarity: 19 }).rarity, 1, 'town rewards unlock Light Blue at depth 24');

assert.equal(rollItem(12, { rarity: 19 }).rarity, 19, 'non-ground item rolls remain outside the depth gate');

G.char = null;
G.world = null;
assert.equal(rollGroundItem(12, { rarity: 0 }).ilvl, 12, 'non-game reward rolls retain their requested level');
console.log('Ground drop item level tests passed.');
