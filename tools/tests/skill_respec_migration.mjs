// Focused save migration test for level-only skill points and the one-time free respec.
// Run: node tools/tests/skill_respec_migration.mjs
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { newCharData, migrate } = await import('../../src/game/save.js');

const migrationKey = 'skillPointLevelResetV1';
const hero = newCharData('wizard', 'FreeSkillRefund');
delete hero[migrationKey]; // Simulate an existing character predating this migration.
hero.level = 15;
hero.xp = 4321;
hero.skillPoints = 26; // includes first-clear boss bonuses
hero.skills = { 'wizard.0.0': 4, 'wizard.0.3': 6, 'wizard.1.1': 2 };
hero.granted = { 'wizard.0.0': true };
hero.bar[0] = 'wizard.0.0';
hero.bar[1] = 'wizard.0.3';
hero.mastery = { 'wizard.0.0': [53, 17] };
hero.gold = 9876;
hero.cleared = { 5: true, 10: true };
const inventoryBefore = JSON.stringify({ equip: hero.equip, bag: hero.bag, stash: hero.stash, gold: hero.gold, xp: hero.xp, cleared: hero.cleared });

migrate(hero);
assert.deepEqual(hero.skills, {}, 'The one-time free reset refunds all allocated skill ranks');
assert.deepEqual(hero.granted, {}, 'Old free-grant bookkeeping is cleared with the reset');
assert.equal(hero.skillPoints, 15, 'Available points are recalculated from level alone (including the original level-one point)');
assert(hero.bar.every((id) => !id), 'Skill bar assignments to refunded skills are cleared');
assert.deepEqual(hero.mastery['wizard.0.0'], [53, 17], 'Skill mastery is preserved');
assert.equal(JSON.stringify({ equip: hero.equip, bag: hero.bag, stash: hero.stash, gold: hero.gold, xp: hero.xp, cleared: hero.cleared }), inventoryBefore,
  'Equipment, inventory, currency, XP, and achievements are untouched');

hero.skillPoints = 3;
hero.skills['wizard.0.0'] = 2; // later play must not cause another reset
migrate(hero);
assert.equal(hero.skillPoints, 3, 'Saving/loading later does not repeat the free reset');
assert.equal(hero.skills['wizard.0.0'], 2, 'Skills learned after migration are preserved');

const level1 = newCharData('wizard', 'LevelOne');
delete level1[migrationKey]; migrate(level1);
assert.equal(level1.skillPoints, 1, 'Level-one characters retain the existing starting point');
const level100 = newCharData('wizard', 'LevelOneHundred');
delete level100[migrationKey]; level100.level = 100; level100.skillPoints = 180; migrate(level100);
assert.equal(level100.skillPoints, 100, 'Level-100 characters are capped at the 100 legitimate points');
assert.equal(level100.level, 100, 'The migration preserves the character level cap');

const fresh = newCharData('wizard', 'Fresh');
migrate(fresh);
assert.equal(fresh.skillPoints, 1, 'New characters retain the corrected starting progression');
assert.equal(fresh[migrationKey], true, 'New characters do not need the existing-character reset');
console.log('Skill point migration: level formula, free reset, one-time guard, save preservation, and level cap passed.');
