// Cursed Chest reuses the updated paired red rune chest art without changing its interaction system.
// Run: node tools/tests/cursed_chest_art.mjs
import { readFile } from 'node:fs/promises';
import { addCursed } from '../../src/game/happenings.js';
import { CURSED_CHEST_VARIANT } from '../../src/data/chestappearances.js';

const world = { depth: 12, chests: [] };
addCursed(world, [4.5, 6.5]);
const chest = world.chests[0];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(chest, 'addCursed should still create a chest');
assert(chest.label === 'Cursed Chest', 'cursed chest identity should be preserved');
assert(chest.chestType === 'cursed' && chest.chestVariant === CURSED_CHEST_VARIANT, 'should reserve the skull-marked red chest design for cursed chests');
assert(chest.glow === '#ff2050' && chest.tint === '#e32e45' && chest.glowWhileOpen, 'curse glow should remain red and persist while the event is active');
assert(typeof chest.draw !== 'function' && typeof chest.drawOverlay === 'function', 'shared chest artwork should render with a separate curse overlay');

for (const state of ['closed', 'open']) {
  const assetId = String(CURSED_CHEST_VARIANT + 1).padStart(2, '0');
  const bytes = await readFile(new URL(`../../assets/props/chest-variants/chest-${assetId}-${state}.png`, import.meta.url));
  assert(bytes.subarray(1, 4).toString() === 'PNG', `cursed chest ${state} artwork should be a PNG`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert(width > 0 && height > 0, `cursed chest ${state} artwork should have valid dimensions`);
}

console.log('PASS: Cursed Chest selects reserved design 01, both artwork states are available, and its curse glow/overlay remain configured.');
