// Focused save migration test for the level-15 middle skill row free respec.
// Run: node tools/tests/skill_respec_migration.mjs
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { newCharData, migrate } = await import('../../src/game/save.js');

const hero = newCharData('wizard', 'FreeSkillRefund');
delete hero.skillRespecV2; // Simulate a save created before this update.
hero.skillPoints = 3;
hero.skills = { 'wizard.0.0': 4, 'wizard.0.3': 6, 'wizard.1.1': 2 };
hero.granted = { 'wizard.0.0': true }; // The first rank was granted for free.
hero.bar[0] = 'wizard.0.0';
hero.bar[1] = 'wizard.0.3';
hero.mastery = { 'wizard.0.0': [53, 17] };

migrate(hero);
assert.deepEqual(hero.skills, {}, 'The free respec clears old learned ranks');
assert.deepEqual(hero.granted, {}, 'The free respec clears old grant markers');
assert.equal(hero.skillPoints, 14, 'Unspent points remain and paid ranks are refunded');
assert(hero.bar.every((id) => !id), 'Old bar assignments to unlearned skills are cleared');
assert.deepEqual(hero.mastery['wizard.0.0'], [53, 17], 'Skill mastery is preserved');

migrate(hero);
assert.equal(hero.skillPoints, 14, 'The refund is issued only once');
console.log('Skill respec migration: refund, mastery preservation, bar cleanup, and one-time guard passed.');
