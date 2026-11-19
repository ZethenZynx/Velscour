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

const qualityDepths = Array.from({ length: 20 }, (_, i) => 1 + i * 25);
assert.deepEqual(RARITY.map((r) => r.minDepth), qualityDepths, 'all gear quality depth unlocks match the design');
assert.deepEqual(RARITY.map((r) => r.name), Array.from({ length: 20 }, (_, i) => `Tier ${i + 1}`));
const rarityThresholds = Array.from({ length: 20 }, (_, tier) => {
  const depth = 1 + tier * 25;
  return [[depth, tier], ...(tier ? [[depth - 1, tier - 1]] : [])];
}).flat().sort((a, b) => a[0] - b[0]);
for (const [depth, expected] of rarityThresholds) {
  G.world = { depth };
  assert.equal(groundDropRarityCap(depth), expected, `depth ${depth} rarity cap`);
  const capped = rollGroundItem(12, { rarity: 19 });
  assert.equal(capped.rarity, expected, `depth ${depth} explicit rarity cap`);
  for (let i = 0; i < 20; i++) assert.ok(rollGroundItem(12).rarity <= expected, `random rarity exceeded cap at depth ${depth}`);
}

G.char = { level: 100, depth: 25 };
G.world = { kind: 'town', depth: 0 };
assert.equal(rollGroundItem(100, { rarity: 19 }).rarity, 0, 'town rewards use the saved campaign depth below depth 26');
G.char.depth = 26;
assert.equal(rollGroundItem(100, { rarity: 19 }).rarity, 1, 'town rewards unlock Light Blue at depth 26');

assert.equal(rollItem(12, { rarity: 19 }).rarity, 19, 'non-ground item rolls remain outside the depth gate');

G.char = null;
G.world = null;
assert.equal(rollGroundItem(12, { rarity: 0 }).ilvl, 12, 'non-game reward rolls retain their requested level');
console.log('Ground drop item level tests passed.');
