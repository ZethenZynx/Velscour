// Per-character loot filter migration, isolation, save shape, and autosave hook. Run: node tools/tests/lootfilter_profiles.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { initializeCharacterLootFilters, lootFilter, lootLabelFilter, saveLootFilterSettings } from '../../src/game/lootfilter.js';
import { listSaves, writeSave } from '../../src/game/save.js';

const local = new Map();
globalThis.localStorage = {
  getItem: (key) => local.get(key) ?? null,
  setItem: (key, value) => local.set(key, String(value)),
};

G.char = null;
G.settings.lootFilter = { on: true, weapon: 3, offhand: 1, armor: 2, ring: 4, gems: true, upgrades: true, keep: false };
G.settings.lootLabelFilter = { on: false, weapon: 2, offhand: 1, armor: 3, ring: 4, gems: 1 };

const first = { id: 'hero-one', classId: 'paladin' };
initializeCharacterLootFilters(first);
assert.equal(first.lootFilter.weapon, 3, 'existing shared pickup filter migrates to the first hero');
assert.equal(first.lootFilter.gems, 0, 'legacy boolean gem setting is normalized');
assert.equal(first.lootLabelFilter.weapon, 2, 'existing shared label filter migrates independently');
G.char = first;
Object.assign(lootFilter(), { on: true, weapon: 5, gems: 4 });
Object.assign(lootLabelFilter(), { on: true, armor: 6, gems: 3 });
let saved = 0;
G.game = { autosave() { saved++; } };
saveLootFilterSettings();
assert.equal(saved, 1, 'editing a character filter triggers character autosave');

const second = { id: 'hero-two', classId: 'wizard' };
initializeCharacterLootFilters(second);
assert.equal(second.lootFilter.weapon, 3, 'one hero changing filters does not change the legacy defaults for another');
assert.equal(second.lootLabelFilter.armor, 3);
Object.assign(second.lootFilter, { on: false, weapon: -1, gems: -1 });
Object.assign(second.lootLabelFilter, { on: false, weapon: 7, gems: 5 });
writeSave(first);
writeSave(second);
const savedFirst = listSaves().find((hero) => hero.id === first.id);
const savedSecond = listSaves().find((hero) => hero.id === second.id);
assert.equal(savedFirst.lootFilter.weapon, 5, 'pickup profile is written into the hero save');
assert.equal(savedFirst.lootLabelFilter.armor, 6, 'label profile is written into the hero save');
assert.equal(savedSecond.lootFilter.weapon, -1);
assert.equal(savedSecond.lootLabelFilter.weapon, 7);

G.char = first;
assert.equal(lootFilter().weapon, 5, 'switching back restores that hero’s pickup profile');
assert.equal(lootLabelFilter().armor, 6, 'switching back restores that hero’s ground-label profile');
G.char = second;
assert.equal(lootFilter().weapon, -1, 'the second hero keeps independent pickup settings');
assert.equal(lootLabelFilter().weapon, 7, 'the second hero keeps independent label settings');

const restored = JSON.parse(JSON.stringify(first));
G.char = restored;
assert.equal(lootFilter().gems, 4, 'character save data retains pickup settings');
assert.equal(lootLabelFilter().gems, 3, 'character save data retains label settings');
assert.equal(G.settings.lootFilter.weapon, 3, 'active hero edits never overwrite the old shared settings template');

G.char = null;
G.game = null;
console.log('OK: legacy migration, per-character isolation, autosave, and save round trip');
