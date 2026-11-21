import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { compareEquipmentForStorage } from '../../src/data/items.js';
import { UI } from '../../src/ui/ui.js';
import { sortBag } from '../../src/ui/inventory.js';
import { sortStash } from '../../src/ui/stash.js';

function gear(id, values = {}) {
  return { id, type: 'gear', slot: 'body', base: 'body', rarity: 0, ilvl: 1, affixes: [], gems: [], sockets: 0, upg: 0, ...values };
}

const rareLowLevel = gear('rarity-first', { rarity: 4, slot: 'body', ilvl: 1, armor: 1 });
const epicBow = gear('bow', { rarity: 3, slot: 'weapon', base: 'bow', ilvl: 2 });
const epicSwordHigh = gear('sword-high', { rarity: 3, slot: 'weapon', base: 'sword', ilvl: 20 });
const epicSwordLow = gear('sword-low', { rarity: 3, slot: 'weapon', base: 'sword', ilvl: 10 });
const sameArmorLowValue = gear('low-price', { rarity: 3, ilvl: 8, armor: 100, vendorValueMult: 1 });
const sameArmorHighValue = gear('high-price', { rarity: 3, ilvl: 8, armor: 100, vendorValueMult: 2 });
const lowerArmor = gear('lower-armor', { rarity: 3, ilvl: 8, armor: 50, vendorValueMult: 10 });
const noArmor = gear('no-armor', { rarity: 3, ilvl: 8, armor: undefined });
const commonTopLevel = gear('common', { rarity: 0, slot: 'weapon', base: 'sword', ilvl: 999 });
const expectedGear = [rareLowLevel, epicBow, epicSwordHigh, epicSwordLow, sameArmorHighValue, sameArmorLowValue, lowerArmor, noArmor, commonTopLevel];

const originalRefresh = UI.refresh;
UI.refresh = () => {};
try {
  const nonEquipmentGem = { id: 'gem', type: 'gem', gem: 'ruby', tier: 1 };
  const nonEquipmentOther = { id: 'other', type: 'potion', rarity: 2, slot: 'z' };
  G.char = { bag: [commonTopLevel, null, sameArmorLowValue, nonEquipmentOther, epicSwordLow, nonEquipmentGem, rareLowLevel, epicSwordHigh, lowerArmor, epicBow, sameArmorHighValue, noArmor] };
  const beforeBag = G.char.bag.filter(Boolean);
  sortBag();
  const bagItems = G.char.bag.filter(Boolean);
  assert.deepEqual(bagItems.slice(0, expectedGear.length), expectedGear, 'Backpack gear follows rarity, type, item level, armor, and sell value priorities');
  assert.deepEqual(bagItems.slice(expectedGear.length), [nonEquipmentGem, nonEquipmentOther], 'Backpack non-equipment ordering is preserved');
  assert.equal(G.char.bag.length, 60, 'sorting compacts into the available Backpack slots');
  assert.equal(new Set(bagItems).size, beforeBag.length, 'sorting does not duplicate object references');
  assert.equal(beforeBag.every((item) => bagItems.filter((candidate) => candidate === item).length === 1), true, 'sorting retains every original item exactly once');
  assert.ok(G.char.bag.slice(bagItems.length).every((item) => item === null), 'remaining Backpack slots are empty, without gaps');

  const stashCommon = gear('stash-common', { rarity: 0, slot: 'weapon', base: 'sword', ilvl: 50 });
  const stashRare = gear('stash-rare', { rarity: 4, slot: 'body', ilvl: 1, armor: 1 });
  const stashGear = [stashCommon, stashRare, ...expectedGear.slice(1, -1)];
  const gem = { id: 'stash-gem', type: 'gem', gem: 'ruby', tier: 1 };
  const token = { id: 'stash-token', type: 'token', rarity: 2, slot: 'z' };
  const originalStashItems = [...stashGear, gem, token];
  for (const by of ['type', 'rarity']) {
    G.char.stash = Array(24).fill(null);
    for (const [i, item] of originalStashItems.entries()) G.char.stash[(i * 2) % G.char.stash.length] = item;
    sortStash(G.char, by);
    const stored = G.char.stash.filter(Boolean);
    const sortedGear = stored.filter((item) => item.type === 'gear');
    assert.deepEqual(sortedGear, [...stashGear].sort(compareEquipmentForStorage), `Storage Chest ${by} sort uses the same equipment order`);
    assert.equal(stored.length, originalStashItems.length, `Storage Chest ${by} sort retains all items`);
    assert.equal(new Set(stored).size, originalStashItems.length, `Storage Chest ${by} sort does not duplicate items`);
    assert.ok(G.char.stash.slice(stored.length).every((item) => item === null), `Storage Chest ${by} sort compacts occupied slots`);
    assert.deepEqual(stored.filter((item) => item.type !== 'gear').map((item) => item.id), by === 'type' ? ['stash-gem', 'stash-token'] : ['stash-token', 'stash-gem'], `Storage Chest ${by} sort preserves its non-equipment ordering`);
  }
} finally {
  UI.refresh = originalRefresh;
}

console.log('Backpack and Storage Chest equipment sorting, compacting, item retention, and non-equipment ordering checks passed.');
