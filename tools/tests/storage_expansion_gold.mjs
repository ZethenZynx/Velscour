import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(String(k), String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
globalThis.window = globalThis;
globalThis.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };
globalThis.dispatchEvent = () => true;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
const mockEl = (tag = 'div') => ({
  tagName: tag.toUpperCase(), style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [],
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  appendChild(ch) { this.children.push(ch); return ch; }, append(...chs) { this.children.push(...chs); },
  setAttribute() {}, removeAttribute() {}, remove() {}, addEventListener() {}, removeEventListener() {},
  querySelector() { return mockEl(); }, querySelectorAll() { return []; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; },
  getContext() { return { drawImage() {}, clearRect() {}, fillRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; }, putImageData() {} }; },
});
globalThis.document = {
  body: mockEl('body'), documentElement: mockEl('html'), createElement: (tag) => mockEl(tag),
  getElementById: () => mockEl(), querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
};
globalThis.Image = class Image { constructor() { this.style = {}; this.draggable = false; } set src(_v) { if (this.onload) setTimeout(() => this.onload(), 0); } };

const { G } = await import('../../src/state.js');
const { A } = await import('../../src/core/assets.js');
A.town = { ground: mockEl('canvas'), objects: mockEl('canvas'), meta: JSON.parse(fs.readFileSync(new URL('../../assets/tiles/town/town.json', import.meta.url), 'utf8')) };
const bag = await import('../../src/data/bag.js');
const endgameMod = await import('../../src/game/endgame.js');
const reliquaryMod = await import('../../src/game/reliquary.js');
const { newCharData, migrate } = await import('../../src/game/save.js');

store.clear();
store.set('velscour_endgame_v1', JSON.stringify({ marksResetVersion: 2, unlocked: 0, marks: { pts: 17, xp: 0, spentValue: 0, spent: {} } }));
endgameMod.resetEndgameCache();
const c = { gold: 1000000, stash: Array(300).fill(null), jewelBox: Array(300).fill(null) };

assert.equal(bag.nextStashRowCost(c), 100000);
assert.equal(bag.nextJewelBoxRowCost(c), 150000);
assert.equal(bag.nextReliquaryRowCost(0), 250000);
assert.equal(bag.buyStashRow(c), false, 'locked expansion cannot be purchased before Velscour is defeated');
assert.equal(c.gold, 1000000);

endgameMod.endgame().unlocked = Date.now();
endgameMod.saveEndgame();
const firstStashCost = bag.nextStashRowCost(c);
assert.equal(bag.buyStashRow(c, firstStashCost), true);
assert.equal(bag.buyStashRow(c, firstStashCost), false, 'stale duplicate confirmation cannot buy a second row');
assert.equal(c.gold, 900000);
assert.equal(c.stash.length, 310);
assert.equal(bag.nextStashRowCost(c), 120000);
const firstJewelCost = bag.nextJewelBoxRowCost(c);
assert.equal(bag.buyJewelBoxRow(c, firstJewelCost), true);
assert.equal(bag.buyJewelBoxRow(c, firstJewelCost), false, 'stale duplicate confirmation cannot buy a second Jewel Box row');
assert.equal(c.gold, 750000);
assert.equal(c.jewelBox.length, 310);
assert.equal(bag.nextJewelBoxRowCost(c), 183000);
c.gold = 100000;
assert.equal(bag.buyJewelBoxRow(c), false, 'insufficient funds do not create a negative balance');
c.gold = 750000;

const vaultState = { tabs: Array.from({ length: 6 }, () => Array(96).fill(null)), codex: {}, lines: 0 };
vaultState.tabs[0] = Array(120).fill(null);
store.set('velscour_reliquary_v1', JSON.stringify(vaultState));
reliquaryMod.resetReliquaryCache();
assert.equal(bag.reliquaryTabRows(0), 10);
assert.equal(bag.nextReliquaryRowCost(0), 422500);
const firstReliquaryCost = bag.nextReliquaryRowCost(0);
assert.equal(bag.buyReliquaryRow(0, c, firstReliquaryCost), true);
assert.equal(bag.buyReliquaryRow(0, c, firstReliquaryCost), false, 'stale duplicate confirmation cannot buy another Reliquary row');
assert.equal(c.gold, 327500);
assert.equal(reliquaryMod.reliquary().tabs[0].length, 132);
assert.equal(bag.nextReliquaryRowCost(0), 549250);

const capped = { gold: 1e15, stash: Array(600).fill(null), jewelBox: Array(600).fill(null) };
assert.equal(bag.nextStashRowCost(capped), 0);
assert.equal(bag.buyStashRow(capped), false);
assert.equal(bag.nextJewelBoxRowCost(capped), 0);
assert.equal(bag.buyJewelBoxRow(capped), false);
vaultState.tabs[0] = Array(192).fill(null);
store.set('velscour_reliquary_v1', JSON.stringify(vaultState));
reliquaryMod.resetReliquaryCache();
assert.equal(bag.nextReliquaryRowCost(0), 0);
assert.equal(bag.buyReliquaryRow(0, capped), false);

// An old save with 2 chest rows, 1 Jewel Box row, and 2 account-wide Reliquary
// rows receives 45 Marks exactly once, without changing storage or its contents.
vaultState.tabs[0] = Array(120).fill(null);
store.set('velscour_reliquary_v1', JSON.stringify(vaultState));
reliquaryMod.resetReliquaryCache();
store.set('velscour_endgame_v1', JSON.stringify({ marksResetVersion: 2, unlocked: 1, marks: { pts: 17, xp: 0, spentValue: 0, spent: {} } }));
endgameMod.resetEndgameCache();
const legacy = newCharData('paladin', 'Legacy Storage');
legacy.id = 'legacy-storage-refund-test';
delete legacy.storageMarkRefundV1;
legacy.stash = Array(320).fill(null); legacy.stash[300] = { type: 'gear', name: 'kept' };
legacy.jewelBox = Array(310).fill(null); legacy.jewelBox[300] = { type: 'gem', gem: 'ruby', tier: 1 };
const migrated = migrate(legacy);
assert.equal(endgameMod.endgame().marks.pts, 62, 'legacy storage refunds 20 + 5 + 20 Marks');
assert.equal(migrated.stash.length, 320);
assert.equal(migrated.stash[300].name, 'kept');
assert.equal(migrated.jewelBox.length, 310);
assert.equal(migrated.jewelBox[300].gem, 'ruby');
migrate(JSON.parse(JSON.stringify(migrated)));
assert.equal(endgameMod.endgame().marks.pts, 62, 'reloading the same save cannot repeat the refund');
const anotherHero = newCharData('paladin', 'Another Hero');
anotherHero.id = 'second-storage-refund-test';
delete anotherHero.storageMarkRefundV1;
migrate(anotherHero);
assert.equal(endgameMod.endgame().marks.pts, 62, 'the shared Reliquary refund is account-wide and one-time');
const newHero = newCharData('paladin', 'New Hero');
newHero.id = 'new-storage-gold-test';
newHero.stash = Array(310).fill(null); // a newly bought gold row must not be mistaken for a legacy Mark purchase
const afterLegacyRefund = endgameMod.endgame().marks.pts;
migrate(newHero);
assert.equal(endgameMod.endgame().marks.pts, afterLegacyRefund, 'newly created heroes are excluded from the legacy Mark refund');

console.log('storage_expansion_gold.mjs: ALL CHECKS PASSED');
