// Cursed Chest reuses the updated paired red rune chest art without changing its interaction system.
// Run: node tools/tests/cursed_chest_art.mjs
import { readFile } from 'node:fs/promises';
import { addCursed } from '../../src/game/happenings.js';

const world = { depth: 12, chests: [] };
addCursed(world, [4.5, 6.5]);
const chest = world.chests[0];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(chest, 'addCursed should still create a chest');
assert(chest.label === 'Cursed Chest', 'cursed chest identity should be preserved');
assert(chest.chestType === 'cursed' && chest.chestVariant === 5, 'should select red rune chest variant 06');
assert(chest.glow === '#ff2050' && chest.tint === '#e32e45' && chest.glowWhileOpen, 'curse glow should remain red and persist while the event is active');
assert(typeof chest.draw !== 'function' && typeof chest.drawOverlay === 'function', 'shared chest artwork should render with a separate curse overlay');

for (const state of ['closed', 'open']) {
  const bytes = await readFile(new URL(`../../assets/props/chest-variants/chest-06-${state}.png`, import.meta.url));
  assert(bytes.subarray(1, 4).toString() === 'PNG', `chest 06 ${state} artwork should be a PNG`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert(width > 0 && height > 0, `chest 06 ${state} artwork should have valid dimensions`);
}

console.log('PASS: Cursed Chest selects existing chest 06, both artwork states are available, and its curse glow/overlay remain configured.');
