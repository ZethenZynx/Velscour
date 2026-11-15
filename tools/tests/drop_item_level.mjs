// Ground gear and gem drops cannot exceed the current character's level.
//   node tools/tests/drop_item_level.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { rollGroundGem, rollGroundItem } from '../../src/game/loot.js';

G.char = { level: 3 };
const gear = rollGroundItem(12, { slot: 'ring', rarity: 0 });
assert.equal(gear.ilvl, 3);
assert.equal(gear.req, 3);
assert.equal(gear.slot, 'ring');

const gem = rollGroundGem(12);
assert.ok(gem.ilvl <= G.char.level, `gem level ${gem.ilvl} exceeds character level ${G.char.level}`);

G.char = null;
assert.equal(rollGroundItem(12, { rarity: 0 }).ilvl, 12, 'non-game reward rolls retain their requested level');
console.log('Ground drop item level tests passed.');
