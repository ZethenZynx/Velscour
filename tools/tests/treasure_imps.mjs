import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TREASURE_IMPS, IMP_BY_ID, IMP_SPRITE_PATH, IMP_MOVEMENT_PATTERNS, IMP_MAX_FOREGROUND_PIXELS, TREASURE_IMP_SPAWN_DELAY_MIN, TREASURE_IMP_SPAWN_DELAY_MAX, TREASURE_IMP_TRAIL_INTERVAL_MIN, TREASURE_IMP_TRAIL_INTERVAL_MAX, advanceTreasureImpSpawnTimer, hasTreasureImpArea, selectImpMovementPattern, selectPrismaticRewards, selectTreasureImp, treasureImpAreaKey, treasureImpEligible, treasureImpPayoutMultiplier, treasureImpSpawnDelay, treasureImpSpriteScale, treasureImpTrailInterval, treasureImpTrailType } from '../../src/data/treasureimps.js';
import { canEarnInfernalMarks } from '../../src/game/endgame.js';
import { newCharData, migrate } from '../../src/game/save.js';
import { itemValue, itemSellValue } from '../../src/data/items.js';
import { riftWeight } from '../../src/data/rifts.js';

globalThis.localStorage ||= { getItem: () => null, setItem: () => {} };

assert.equal(TREASURE_IMPS.length, 20, 'the registry contains all 20 supplied variants');
assert.equal(new Set(TREASURE_IMPS.map(({ id }) => id)).size, 20, 'variant IDs are unique');
assert.equal(new Set(TREASURE_IMPS.map(({ name }) => name)).size, 20, 'variant names are unique');
for (const imp of TREASURE_IMPS) {
  assert.ok(imp.weight > 0, `${imp.id} has a positive relative spawn weight`);
  assert.ok(imp.reward && imp.effect, `${imp.id} has reward and visual-effect registry keys`);
  assert.equal(IMP_BY_ID[imp.id], imp);
  assert.ok(IMP_SPRITE_PATH(imp.id).endsWith(`/${imp.id}.png`));
  assert.ok(['gold', 'gems', 'highGems', 'mixed'].includes(treasureImpTrailType(imp.id)), `${imp.id} has a supported trail reward`);
}
assert.equal(TREASURE_IMP_TRAIL_INTERVAL_MIN, 0.25, 'trail drops can be as frequent as four per second');
assert.equal(TREASURE_IMP_TRAIL_INTERVAL_MAX, 0.5, 'trail drops remain randomized up to twice per second');
assert.equal(treasureImpTrailInterval(() => 0), TREASURE_IMP_TRAIL_INTERVAL_MIN);
assert.equal(treasureImpTrailInterval(() => 1), TREASURE_IMP_TRAIL_INTERVAL_MAX);
assert.ok(treasureImpTrailInterval(() => 0.5) > TREASURE_IMP_TRAIL_INTERVAL_MIN && treasureImpTrailInterval(() => 0.5) < TREASURE_IMP_TRAIL_INTERVAL_MAX);
for (const imp of TREASURE_IMPS) {
  const expected = imp.id === 'jewel' ? 'gems' : imp.id === 'mystic' ? 'highGems' : ['jackpot', 'hoarder', 'prismatic'].includes(imp.id) ? 'mixed' : 'gold';
  assert.equal(treasureImpTrailType(imp.id), expected, `${imp.name} receives its intended recurring trail reward`);
}
const impRuntime = readFileSync(new URL('../../src/game/happenings.js', import.meta.url), 'utf8');
assert.match(impRuntime, /treasureImpTrailInterval\(\)/, 'runtime uses the tested randomized trail interval');
assert.doesNotMatch(impRuntime, /TREASURE_IMP_TRAIL_DROP_LIMIT|impTrailDrops|impTrailGemDrops/, 'runtime has no per-imp trail reward cap');
const trailDropFunction = impRuntime.match(/function dropImpTrailLoot\(world, m, dt\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(trailDropFunction.includes('m.impDiscovered') && trailDropFunction.includes('m.moving') && trailDropFunction.includes('m.status?.fear?.t'), 'drops require an actively fleeing, discovered imp');
assert.doesNotMatch(trailDropFunction, /nearestHostile/, 'trail rewards continue regardless of player distance until flight ends');
assert.equal(treasureImpTrailType('treasure'), 'gold');
assert.equal(treasureImpTrailType('jewel'), 'gems');
assert.equal(treasureImpTrailType('mystic'), 'highGems');
for (const id of ['jackpot', 'hoarder', 'prismatic']) assert.equal(treasureImpTrailType(id), 'mixed', `${id} can leave modest gold and occasional gems`);
assert.equal(treasureImpPayoutMultiplier(IMP_BY_ID.treasure, () => 0), 1, 'the lowest death payout is still the full baseline');
assert.ok(treasureImpPayoutMultiplier(IMP_BY_ID.treasure, () => 0.99) > 1, 'generous payout tier increases death rewards');
assert.ok(treasureImpPayoutMultiplier(IMP_BY_ID.jackpot, () => 0.5) > treasureImpPayoutMultiplier(IMP_BY_ID.treasure, () => 0.5), 'Jackpot payout has a rarity premium');
assert.ok(treasureImpPayoutMultiplier(IMP_BY_ID.prismatic, () => 0.5) > treasureImpPayoutMultiplier(IMP_BY_ID.treasure, () => 0.5), 'Prismatic payout has a rarity premium');
assert.ok(treasureImpPayoutMultiplier(IMP_BY_ID.jackpot, () => 0.99) <= 2.4, 'death payout multiplier remains capped');
assert.equal(IMP_MOVEMENT_PATTERNS.length, 5, 'multiple movement patterns are available');
assert.equal(selectImpMovementPattern(() => 0).id, 'steady');
assert.equal(selectImpMovementPattern(() => 0.999999).id, 'erratic');
assert.ok(IMP_MOVEMENT_PATTERNS.find(({ id }) => id === 'erratic').turnMax < IMP_MOVEMENT_PATTERNS.find(({ id }) => id === 'steady').turnMin,
  'the erratic pattern changes direction more often than the steady pattern');
assert.equal(treasureImpSpriteScale(14, 0.9) * IMP_MAX_FOREGROUND_PIXELS * 0.9, 14,
  'extracted art scale matches the original imp sprite height');

const forestArea = treasureImpAreaKey({ biome: { id: 'dark_forest' }, depth: 24 });
const castleArea = treasureImpAreaKey({ biome: { id: 'castle' }, depth: 24 });
assert.notEqual(forestArea, castleArea, 'separate environments at the same depth have separate guarantees');
assert.equal(treasureImpAreaKey({ biome: { id: 'dark_forest' }, depth: 24 }), forestArea, 'returning to the same environment retains its stable guarantee key');
assert.notEqual(treasureImpAreaKey({ rift: { tier: 2 }, biome: { id: 'catacombs' } }), treasureImpAreaKey({ rift: { tier: 3 }, biome: { id: 'catacombs' } }), 'each endgame rift tier has its own stable guarantee key');
assert.equal(hasTreasureImpArea(forestArea, [forestArea]), true);
assert.equal(hasTreasureImpArea(castleArea, [forestArea]), false);
assert.equal(treasureImpSpawnDelay(() => 0), TREASURE_IMP_SPAWN_DELAY_MIN, 'new environment timers start at the 30-second minimum');
assert.ok(treasureImpSpawnDelay(() => 1) <= TREASURE_IMP_SPAWN_DELAY_MAX, 'new environment timers never exceed 120 seconds');
assert.equal(advanceTreasureImpSpawnTimer(45, 10, true), 45, 'paused gameplay does not consume an imp spawn timer');
assert.equal(advanceTreasureImpSpawnTimer(45, 10, false), 35, 'active gameplay advances an imp spawn timer');
assert.equal(advanceTreasureImpSpawnTimer(3, 10, false), 0, 'an elapsed imp spawn timer clamps at zero');
assert.equal(riftWeight({ goblin: true, rank: 'unique' }), 0, 'a guaranteed imp does not count toward a Rift Guardian quota');

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
assert.deepEqual(fresh.treasureImpGuaranteedAreas, []);
assert.deepEqual(fresh.treasureImpRandomAreas, []);
assert.deepEqual(fresh.treasureImpGuaranteedPending, {});
assert.deepEqual(fresh.treasureImpRandomCheckedAreas, []);
assert.deepEqual(fresh.treasureImpRandomPending, {});
assert.equal(fresh.treasureImpTutorialShown, false);
const legacy = { ...fresh };
delete legacy.treasureImpDepths;
delete legacy.treasureImpGuaranteedAreas;
delete legacy.treasureImpRandomAreas;
delete legacy.treasureImpGuaranteedPending;
delete legacy.treasureImpRandomCheckedAreas;
delete legacy.treasureImpRandomPending;
delete legacy.treasureImpTutorialShown;
legacy.treasureImpGuaranteedPending = { [forestArea]: 42, broken: 'invalid', negative: -1, tooLong: 180 };
migrate(legacy);
assert.deepEqual(legacy.treasureImpDepths, [], 'legacy save migration adds encounter tracking without touching other progression');
assert.deepEqual(legacy.treasureImpGuaranteedAreas, [], 'legacy saves gain one-time guarantee tracking');
assert.deepEqual(legacy.treasureImpRandomAreas, [], 'legacy saves gain independent random-encounter tracking');
assert.deepEqual(legacy.treasureImpGuaranteedPending, { [forestArea]: 42, tooLong: 120 }, 'save migration preserves valid pending timers and clamps malformed values');
assert.deepEqual(legacy.treasureImpRandomCheckedAreas, [], 'legacy saves gain one-time additional-imp chance tracking');
assert.deepEqual(legacy.treasureImpRandomPending, {}, 'legacy saves gain safe optional-spawn timer storage');
assert.equal(legacy.treasureImpTutorialShown, false);
const item = { type: 'weapon', rarity: 0, ilvl: 1, affixes: [], sockets: 0, upg: 0 };
const merchantValue = itemValue({ ...item, vendorValueMult: 2.5 });
assert.ok(merchantValue > itemValue(item) * 2.4, 'merchant equipment has substantially higher vendor value');
assert.equal(itemSellValue({ ...item, vendorValueMult: 2.5 }), Math.max(1, Math.floor(merchantValue / 4)), 'vendor value and actual sell payout use the same calculation');

console.log('Treasure Imp registry, frequent uncapped trail rewards, varied death payouts, delayed spawn timing, pause handling, progression gates, movement patterns, sprite scale, Prismatic rewards, save migration, and merchant value checks passed.');
