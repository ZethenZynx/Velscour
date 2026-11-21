import assert from 'node:assert/strict';
import {
  INFERNAL_UPGRADES, INFERNAL_UPGRADE_BY_ID, MARK_CATEGORIES,
  bonusFor, maxPurchasable, purchaseCost, rankCost,
} from '../../src/data/infernalupgrades.js';
import { fixEndgame } from '../../src/game/endgame.js';
import { G } from '../../src/state.js';
import { addMarkBonusChest } from '../../src/game/markchests.js';

assert.equal(INFERNAL_UPGRADES.length, 51);
assert.equal(new Set(INFERNAL_UPGRADES.map((u) => u.id)).size, 51, 'upgrade IDs are unique');
assert.ok(INFERNAL_UPGRADES.every((u) => u.name && u.description && u.per > 0 && u.baseCost > 0 && u.growth > 1), 'every upgrade has gameplay data and a rising cost');
assert.ok(!INFERNAL_UPGRADES.some((u) => ['fortune', 'accumulation'].includes(u.id)), 'removed Fortune families are not reintroduced');
assert.deepEqual(MARK_CATEGORIES.map((c) => c.id), ['offensive', 'defensive', 'resources', 'loot', 'utility', 'endgame']);
assert.deepEqual(MARK_CATEGORIES.map((c) => INFERNAL_UPGRADES.filter((u) => u.category === c.id).length), [12, 10, 6, 11, 6, 6]);

const expectedCaps = { ferocity: 50, execution: 25, slayer: 25, godslayer: 25, overwhelming: 25, pursuit: 20, riftSlayer: 30, unboundSlayer: 30 };
for (const [id, cap] of Object.entries(expectedCaps)) assert.equal(INFERNAL_UPGRADE_BY_ID[id].maxRank, cap, `${id} cap`);
assert.equal(bonusFor('haste', 25), 25, 'Haste grants cast speed only up to its cap');
assert.equal(bonusFor('crit', 20), 7, 'Crit grants chance only up to its cap');
assert.equal(bonusFor('ferocity', 50), 100, 'Ferocity rank bonus uses updated cap');
assert.equal(bonusFor('ferocity', 70), 100, 'Ferocity bonus is capped at the updated maximum');
assert.ok(rankCost('might', 1) > rankCost('might', 0), 'rank costs escalate');
assert.equal(maxPurchasable('pursuit', 20, 1), 0, 'capped upgrade cannot exceed max rank');
assert.equal(maxPurchasable('might', 0, purchaseCost('might', 0, 3)), 3, 'bulk affordability matches escalating total');

const migrated = fixEndgame({
  marksResetVersion: 1, unlocked: 1,
  marks: { pts: 200, xp: 12, spent: { life: 20, crit: 20, mf: 30, rift: 20 } },
});
assert.equal(migrated.marksResetVersion, 2);
assert.equal(migrated.marks.pts, 200, 'wallet is preserved');
assert.equal(migrated.marks.spent.vitality, 20, 'Vitality ranks are preserved');
assert.equal(migrated.marks.spent.crit, 20, 'Precision ranks are preserved as Crit');
assert.equal(migrated.marks.spent.haste, 20, 'Haste ranks are preserved');
assert.equal(migrated.marks.spent.might, 0);
assert.equal(migrated.marks.spent.ferocity, 3, 'former Precision damage is converted to Ferocity ranks');
assert.ok(migrated.marks.legacyFerocity > 0 && migrated.marks.legacyFerocity < 2, 'fractional remaining Precision damage is retained exactly');
assert.equal(migrated.marks.spentValue, 60, 'removed Fortune ranks are refunded without charging converted Ferocity twice');
assert.equal(migrated.marks.pts - migrated.marks.spentValue, 140, 'refunded Fortune ranks return to the free balance');

const store = new Map();
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)) };
store.set('velscour_endgame_v1', JSON.stringify({ marksResetVersion: 2, unlocked: 0, marks: { pts: 100, xp: 0, spentValue: 0, spent: {} } }));
const eg = await import('../../src/game/endgame.js');
eg.resetEndgameCache();
const marks = await import('../../src/game/marks.js');
G.world = { kind: 'dungeon', depth: 100 };
assert.equal(marks.grantMarks(1, 'test', G.world), 0, 'campaign depth cannot grant Marks');
eg.unlockEndgame();
assert.equal(marks.grantMarks(1, 'campaign replay', G.world), 0, 'campaign replay remains ineligible after unlock');
assert.equal(marks.marksFree(), 100, 'existing Mark balance remains available');
assert.equal(marks.purchaseUpgrade('haste', 2), 2, 'bulk rank purchase succeeds');
assert.equal(marks.marksIn('haste'), 2);
assert.equal(marks.markBonuses().haste, 2, 'Haste ranks affect cast speed only');
assert.equal(marks.markBonuses().crit, 0, 'unbought Crit is zero');
assert.equal(marks.purchaseUpgrade('crit', 1), 1);
assert.equal(marks.markBonuses().crit, 0.35, 'Crit ranks add critical chance and no direct critical-damage stat');
assert.equal(marks.marksFree(), 92, 'escalating cost is deducted exactly');
assert.equal(marks.purchaseUpgrade('pursuit', 21), 0, 'purchase cannot exceed rank cap');
assert.equal(marks.deductMarks(5), true, 'external Mark purchase can spend available balance');
assert.equal(marks.marksFree(), 87, 'external spending preserves rank costs');
G.world = { kind: 'dungeon', depth: 101 };
assert.equal(marks.grantMarksWithBonus(1, 'test', G.world, 50), 1, 'fractional reward carry preserves the base Mark');
assert.equal(marks.grantMarksWithBonus(1, 'test', G.world, 50), 2, 'fractional reward carry pays full long-run bonus');
assert.equal(marks.marksFree(), 90, 'eligible endgame Mark rewards are credited');

const makeChestMap = () => ({
  map: { w: 30, h: 30, walkable: (x, y) => x > 0 && y > 0 && x < 29 && y < 29 },
  start: [15, 15], exit: [27, 27], chests: [{ x: 2, y: 2 }],
});
assert.equal(addMarkBonusChest(makeChestMap(), 44, 0), false, 'no chest is added without Treasure Hunter bonus');
let chestSeed = 0, expectedChest = null;
for (; chestSeed < 10000; chestSeed++) {
  const a = makeChestMap();
  if (addMarkBonusChest(a, chestSeed, 5)) { expectedChest = a.chests.at(-1); break; }
}
assert.ok(expectedChest, 'the maximum Treasure Hunter bonus can produce an extra chest');
const repeatChestMap = makeChestMap();
assert.equal(addMarkBonusChest(repeatChestMap, chestSeed, 5), true, 'same procedural seed repeats its successful roll');
assert.deepEqual(repeatChestMap.chests.at(-1), expectedChest, 'extra chest position is reproducible and map-safe');

console.log('Infernal Marks registry and save migration checks passed.');
