// The Ancestral Reliquary's gem picker and equipment probabilities.
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { eligibleReliquaryGems, reliquaryEquipmentChance, rollReliquaryEquipment } from '../../src/game/worldobjects.js';
import { qualityAtDepth, tierOf } from '../../src/data/items.js';

assert.deepEqual(
  Array.from({ length: 6 }, (_, rarity) => Math.round(reliquaryEquipmentChance(rarity) * 1000) / 1000),
  [0.65, 0.728, 0.832, 0.962, 1, 1],
  'the six rarity grades should keep their intended chance, with guaranteed Legendary and Mythic equipment',
);

const gemBag = Array.from({ length: 80 }, (_, index) => ({
  type: 'gem', gem: 'ruby', tier: index % 10, count: index + 1,
  ...(index === 24 ? { locked: true } : {}),
}));
gemBag[6] = null;
gemBag[52] = { type: 'gear', name: 'not a gem' };
const eligible = eligibleReliquaryGems(gemBag);
assert.equal(eligible.length, 77, 'every unlocked gem is eligible, including gems beyond slot 18');
assert.equal(eligible.at(-1).index, 79, 'the final Gem Bag slot remains selectable');
assert.ok(!eligible.some(({ index }) => index === 24), 'locked gems are protected from offering');
assert.ok(!eligible.some(({ index }) => index === 52), 'non-gem items are not eligible');
assert.equal(eligible.find(({ index }) => index === 25).item.count, 26, 'stack data remains available when selecting one offering');

const saved = { world: G.world, char: G.char, player: G.player, random: Math.random };
try {
  G.char = { level: 20, depth: 500 };
  G.player = { st: { magicFind: 0 } };
  G.world = { depth: 500 };
  Math.random = () => 0;
  const lowQuality = rollReliquaryEquipment(G.world);
  assert.equal(lowQuality.ilvl, 20, 'the item level cannot exceed character level');
  assert.equal(lowQuality.rarity, 0, 'a guaranteed equipment drop can still roll ordinary quality');
  assert.equal(lowQuality.tier, tierOf(lowQuality.ilvl), 'equipment tier follows its capped item level');

  G.char.level = 100;
  G.world.depth = 24;
  Math.random = () => 0.999999;
  const shallowDepth = rollReliquaryEquipment(G.world);
  assert.ok(shallowDepth.rarity <= qualityAtDepth(G.world.depth), 'the floor depth still caps equipment quality');
  assert.equal(shallowDepth.tier, tierOf(shallowDepth.ilvl), 'equipment tier follows the depth-derived item level');
} finally {
  G.world = saved.world;
  G.char = saved.char;
  G.player = saved.player;
  Math.random = saved.random;
}

console.log('Ancestral Reliquary odds, Gem Bag picker, and loot progression OK');
