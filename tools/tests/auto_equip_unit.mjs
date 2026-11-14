import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { emptyEquipSlot } from '../../src/game/autoequip.js';
import { SLOTS } from '../../src/data/items.js';

const emptyEquip = () => Object.fromEntries(SLOTS.map((slot) => [slot, null]));
const character = (classId = 'wizard', level = 1) => ({ classId, level, attrs: {}, equip: emptyEquip() });
const gear = (slot, extra = {}) => ({ type: 'gear', slot, req: 1, ...extra });

assert.equal(G.settings.autoEquip, true, 'auto-equip is enabled by default');

const c = character();
assert.equal(emptyEquipSlot(c, gear('ring')), 'ring1', 'ring chooses the first matching empty slot');
c.equip.ring1 = gear('ring');
assert.equal(emptyEquipSlot(c, gear('ring')), 'ring2', 'ring selects the next empty slot without replacing gear');
for (const slot of ['ring2', 'ring3', 'ring4']) c.equip[slot] = gear('ring');
assert.equal(emptyEquipSlot(c, gear('ring')), null, 'full matching slots are left unchanged');

assert.equal(emptyEquipSlot(character(), gear('head', { sealed: true })), null, 'sealed gear is not auto-equipped');
assert.equal(emptyEquipSlot(character(), gear('head', { unid: true })), null, 'unidentified gear is not auto-equipped');
assert.equal(emptyEquipSlot(character(), gear('head', { locked: true })), null, 'locked gear is not auto-equipped');
assert.equal(emptyEquipSlot(character(), { type: 'gem', slot: 'head' }), null, 'non-gear is ignored');
assert.equal(emptyEquipSlot(character('wizard', 1), gear('feet', { req: 2 })), null, 'level requirements are respected');

const barbarian = character('barbarian');
barbarian.equip.weapon = gear('weapon');
assert.equal(emptyEquipSlot(barbarian, gear('weapon')), 'offhand', 'barbarians can use a second weapon in an empty off-hand');

console.log('Auto-equip unit checks passed.');
