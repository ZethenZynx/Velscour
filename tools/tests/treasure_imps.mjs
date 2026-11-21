import assert from 'node:assert/strict';
import { TREASURE_IMPS, IMP_BY_ID, IMP_SPRITE_PATH, selectPrismaticRewards, selectTreasureImp, treasureImpEligible } from '../../src/data/treasureimps.js';
import { canEarnInfernalMarks } from '../../src/game/endgame.js';
import { newCharData, migrate } from '../../src/game/save.js';
import { itemValue, itemSellValue } from '../../src/data/items.js';

assert.equal(TREASURE_IMPS.length, 20, 'the registry contains all 20 supplied variants');
assert.equal(new Set(TREASURE_IMPS.map(({ id }) => id)).size, 20, 'variant IDs are unique');
assert.equal(new Set(TREASURE_IMPS.map(({ name }) => name)).size, 20, 'variant names are unique');
for (const imp of TREASURE_IMPS) {
  assert.ok(imp.weight > 0, `${imp.id} has a positive relative spawn weight`);
  assert.ok(imp.reward && imp.effect, `${imp.id} has reward and visual-effect registry keys`);
  assert.equal(IMP_BY_ID[imp.id], imp);
  assert.ok(IMP_SPRITE_PATH(imp.id).endsWith(`/${imp.id}.png`));
}

for (const depth of [1, 25, 100]) {
  assert.equal(treasureImpEligible(IMP_BY_ID.set, { depth, endgameUnlocked: true, canEarnMarks: true }), false, `Set Imp is locked at campaign depth ${depth}`);
  assert.equal(treasureImpEligible(IMP_BY_ID.abyssal, { depth, endgameUnlocked: true, canEarnMarks: true }), false, `Abyssal Imp is locked at campaign depth ${depth}`);
}
assert.equal(treasureImpEligible(IMP_BY_ID.set, { depth: 456, endgameUnlocked: false }), false);
assert.equal(treasureImpEligible(IMP_BY_ID.set, { depth: 455, endgameUnlocked: true }), false);
assert.equal(treasureImpEligible(IMP_BY_ID.set, { depth: 456, endgameUnlocked: true }), true);
assert.equal(treasureImpEligible(IMP_BY_ID.abyssal, { depth: 101, endgameUnlocked: true, canEarnMarks: false }), false);
assert.equal(treasureImpEligible(IMP_BY_ID.abyssal, { depth: 101, endgameUnlocked: true, canEarnMarks: true }), true);
assert.equal(selectTreasureImp({ depth: 100, endgameUnlocked: true, canEarnMarks: true }, () => 0).id, 'treasure');
assert.equal(canEarnInfernalMarks({ kind: 'dungeon', depth: 100 }, { cleared: { 100: 1 } }), false, 'campaign-depth clears cannot award marks');
assert.equal(canEarnInfernalMarks({ kind: 'dungeon', depth: 101 }, { cleared: { 100: 1 } }), true, 'eligible post-campaign depths can award marks');
assert.equal(canEarnInfernalMarks({ kind: 'dungeon', depth: 101 }, { cleared: {} }), false, 'post-campaign depth alone does not unlock marks');

for (const random of [0, 0.34, 0.67, 0.999999]) {
  const picks = selectPrismaticRewards({ depth: 100, endgameUnlocked: false, canEarnMarks: false }, () => random);
  assert.ok(picks.length >= 3 && picks.length <= 5);
  assert.equal(new Set(picks.map(({ id }) => id)).size, picks.length, 'Prismatic rewards are distinct');
  assert.ok(picks.every(({ id }) => !['set', 'abyssal', 'prismatic'].includes(id)), 'locked and recursive reward variants are excluded');
}

const fresh = newCharData('paladin', 'Imp Test');
assert.deepEqual(fresh.treasureImpDepths, []);
assert.equal(fresh.treasureImpTutorialShown, false);
const legacy = { ...fresh };
delete legacy.treasureImpDepths;
delete legacy.treasureImpTutorialShown;
migrate(legacy);
assert.deepEqual(legacy.treasureImpDepths, [], 'legacy save migration adds encounter tracking without touching other progression');
assert.equal(legacy.treasureImpTutorialShown, false);
const item = { type: 'weapon', rarity: 0, ilvl: 1, affixes: [], sockets: 0, upg: 0 };
const merchantValue = itemValue({ ...item, vendorValueMult: 2.5 });
assert.ok(merchantValue > itemValue(item) * 2.4, 'merchant equipment has substantially higher vendor value');
assert.equal(itemSellValue({ ...item, vendorValueMult: 2.5 }), Math.max(1, Math.floor(merchantValue / 4)), 'vendor value and actual sell payout use the same calculation');

console.log('Treasure Imp registry, progression gates, Prismatic rewards, save migration, and merchant value checks passed.');
