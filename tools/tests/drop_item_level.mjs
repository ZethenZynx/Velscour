// Ground gear and gem drops cannot exceed the current character's level.
//   node tools/tests/drop_item_level.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { rollItem } from '../../src/data/items.js';
import { groundDropRarityCap, rollGroundGem, rollGroundItem } from '../../src/game/loot.js';

G.char = { level: 3 };
const gear = rollGroundItem(12, { slot: 'ring', rarity: 0 });
assert.equal(gear.ilvl, 3);
assert.equal(gear.req, 3);
assert.equal(gear.slot, 'ring');

const gem = rollGroundGem(12);
assert.ok(gem.ilvl <= G.char.level, `gem level ${gem.ilvl} exceeds character level ${G.char.level}`);

const rarityThresholds = [[1, 0], [23, 0], [24, 1], [47, 1], [48, 2], [72, 3], [96, 4], [120, 5], [144, 6]];
for (const [depth, expected] of rarityThresholds) {
  G.world = { depth };
  assert.equal(groundDropRarityCap(depth), expected, `depth ${depth} rarity cap`);
  const capped = rollGroundItem(12, { rarity: 6 });
  assert.equal(capped.rarity, expected, `depth ${depth} explicit rarity cap`);
  for (let i = 0; i < 20; i++) assert.ok(rollGroundItem(12).rarity <= expected, `random rarity exceeded cap at depth ${depth}`);
}

assert.equal(rollItem(12, { rarity: 6 }).rarity, 6, 'non-ground item rolls remain outside the depth gate');

G.char = null;
G.world = null;
assert.equal(rollGroundItem(12, { rarity: 0 }).ilvl, 12, 'non-game reward rolls retain their requested level');
console.log('Ground drop item level tests passed.');
