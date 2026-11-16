import assert from 'assert';
import { Player } from '../../src/game/player.js';
import { dropLoot, dropChest, GroundItem, rollOrbKind } from '../../src/game/loot.js';
import { heresyWorld } from '../../src/game/heresies.js';
import { G } from '../../src/state.js';

console.log('Testing life regen and health orb mechanics...');

// Setup minimal player and world
const char = {
  name: 'Tester',
  classId: 'paladin',
  level: 50,
  attrs: { str: 10, dex: 10, vit: 10, int: 10 },
  potions: { hp: 5, mp: 5, rejuv: 1, fury: 1 },
  inv: [],
  equip: {},
  skills: {},
  perks: {},
  keys: {},
  sigils: {}
};

G.char = char;

const townWorld = {
  kind: 'town',
  depth: 0,
  biome: { name: 'town' },
  map: Array(50).fill(null).map(() => Array(50).fill(1)),
  creatures: [],
  hazards: [],
  projectiles: [],
  loot: [],
  addLoot(it) { this.loot.push(it); }
};

const dungeonWorld = {
  kind: 'dungeon',
  depth: 10,
  biome: { name: 'crypt' },
  map: Array(50).fill(null).map(() => Array(50).fill(1)),
  creatures: [],
  hazards: [],
  projectiles: [],
  loot: [],
  addLoot(it) { this.loot.push(it); }
};

const p = new Player(char);
p.x = 25; p.y = 25;

// Test 1: Town vs Dungeon regen
p.world = townWorld;
p.recompute();
assert.ok(p.st.naturalLifeRegen > 0, `Expected naturalLifeRegen > 0, got ${p.st.naturalLifeRegen}`);
assert.strictEqual(p.st.lifeRegen, p.st.naturalLifeRegen, `Expected in town lifeRegen to equal naturalLifeRegen`);

p.world = dungeonWorld;
p.recompute();
assert.ok(p.st.naturalLifeRegen > 0, `naturalLifeRegen should still be calculated as stat baseline`);
assert.strictEqual(p.st.lifeRegen, 0, `In dungeon without gear, lifeRegen should be 0, got ${p.st.lifeRegen}`);

// Test 2: Orb HP pickup restore amount (20% of maxHp)
p.maxHp = 1000;
p.hp = 100;
p.char.class = 'warrior';
p.pickup({ kind: 'orb_hp', data: {} });
assert.strictEqual(p.hp, 300, `Expected 100 + 0.2*1000 = 300, got ${p.hp}`);

// Test 3: Bonus orb effects and colors match their potion counterparts.
p.maxHp = 1000; p.hp = 100; p.maxMana = 400; p.mana = 50;
p.pickup({ kind: 'orb_rejuv' });
assert.strictEqual(p.hp, 450, 'Rejuvenation Orb must restore 35% max life');
assert.strictEqual(p.mana, 190, 'Rejuvenation Orb must restore 35% max mana');
const rejuvOrb = new GroundItem(0, 0, 'orb_rejuv');
const furyOrb = new GroundItem(0, 0, 'orb_fury');
assert.strictEqual(rejuvOrb.color, '#c040ff', 'Rejuvenation Orb uses potion purple');
assert.strictEqual(furyOrb.color, '#ffa020', 'Fury Orb uses Elixir orange');
p.buffs = [];
p.pickup(furyOrb);
const fury = p.buffs.find((b) => b.id === 'fury');
assert.ok(fury, 'Fury Orb applies the Elixir of Fury buff');
assert.strictEqual(fury.t, 15, 'Fury Orb buff lasts as long as the elixir');
assert.deepStrictEqual(fury.stats, { as: 30, speed: 30, cdr: 30 }, 'Fury Orb shares the elixir stats');

const hungerWorld = { kind: 'dungeon', heresy: { ids: ['hunger'], rank: 2 }, loot: [], addLoot(it) { this.loot.push(it); } };
heresyWorld(hungerWorld, char);
for (const kind of ['orb_hp', 'orb_mp', 'orb_rejuv', 'orb_fury']) hungerWorld.addLoot(new GroundItem(0, 0, kind));
assert.strictEqual(hungerWorld.loot.length, 0, 'Hunger of the Abyss blocks every orb type');

const savedRandom = Math.random;
try {
  Math.random = () => 0.0005;
  assert.strictEqual(rollOrbKind(0.01, 0.001), 'orb_fury', 'Fury is the rarest rolled orb');
  Math.random = () => 0.005;
  assert.strictEqual(rollOrbKind(0.01, 0.001), 'orb_rejuv', 'Rejuvenation is rarer than ordinary orbs');
  Math.random = () => 0.1;
  assert.strictEqual(rollOrbKind(0.01, 0.001), 'orb_hp');
  Math.random = () => 0.9;
  assert.strictEqual(rollOrbKind(0.01, 0.001), 'orb_mp');
} finally {
  Math.random = savedRandom;
}

// Test 4: Loot orb drop distributions
G.player = p;
const runs = 1000;

// Normal monster (healthy player)
p.maxHp = 1000;
p.hp = 1000; // 100% HP
let normalOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'normal', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  normalOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const normalRate = normalOrbs / runs;
console.log(`Normal monster orb drop rate (healthy): ${(normalRate * 100).toFixed(1)}% (expected ~30%)`);
assert.ok(normalRate >= 0.25 && normalRate <= 0.35, `Normal orb rate ${normalRate} out of expected ~30%`);

// Rejuvenation and Fury drops are independent and much rarer than the existing healing orbs.
let rejuvDrops = 0, furyDrops = 0;
for (let i = 0; i < 5000; i++) {
  dungeonWorld.loot = [];
  dropLoot(dungeonWorld, { rank: 'normal', level: 10, x: 25, y: 25 });
  rejuvDrops += dungeonWorld.loot.filter((l) => l.kind === 'orb_rejuv').length;
  furyDrops += dungeonWorld.loot.filter((l) => l.kind === 'orb_fury').length;
}
const rejuvRate = rejuvDrops / 5000, furyRate = furyDrops / 5000;
console.log(`Rare orb drop rates: Rejuvenation ${(rejuvRate * 100).toFixed(2)}%, Fury ${(furyRate * 100).toFixed(2)}% (expected 1.8% / 0.3%)`);
assert.ok(rejuvRate >= 0.012 && rejuvRate <= 0.024, `Rejuvenation orb rate ${rejuvRate} outside expected range`);
assert.ok(furyRate >= 0.001 && furyRate <= 0.006, `Fury orb rate ${furyRate} outside expected range`);

// Normal monster (wounded player < 50% HP)
p.hp = 300; // 30% HP
let woundedOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'normal', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  woundedOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const woundedRate = woundedOrbs / runs;
console.log(`Normal monster orb drop rate (wounded): ${(woundedRate * 100).toFixed(1)}% (expected ~50%)`);
assert.ok(woundedRate >= 0.44 && woundedRate <= 0.56, `Wounded orb rate ${woundedRate} out of expected ~50%`);

// Champion monster (1 guaranteed + 50% chance for 2nd -> average 1.5)
let champOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'champion', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  const count = dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
  assert.ok(count >= 1, 'Champion must drop at least 1 orb');
  champOrbs += count;
}
const champAvg = champOrbs / runs;
console.log(`Champion average orbs: ${champAvg.toFixed(2)} (expected ~1.50)`);
assert.ok(champAvg >= 1.4 && champAvg <= 1.6, `Champion average ${champAvg} out of expected ~1.50`);

// Boss monster (2-4 orbs)
let bossOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const m = { rank: 'boss', level: 10, x: 25, y: 25 };
  dropLoot(dungeonWorld, m);
  const count = dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
  assert.ok(count >= 2 && count <= 4, `Boss dropped ${count} orbs, expected 2-4`);
  bossOrbs += count;
}
console.log(`Boss average orbs: ${(bossOrbs / runs).toFixed(2)} (expected ~3.0)`);

// Chest (75% chance)
let chestOrbs = 0;
for (let i = 0; i < runs; i++) {
  dungeonWorld.loot = [];
  const chest = { x: 25, y: 25, rare: false };
  dropChest(dungeonWorld, chest, 10);
  chestOrbs += dungeonWorld.loot.filter(l => l.kind === 'orb_hp').length;
}
const chestRate = chestOrbs / runs;
console.log(`Chest orb drop rate: ${(chestRate * 100).toFixed(1)}% (expected ~75%)`);
assert.ok(chestRate >= 0.70 && chestRate <= 0.80, `Chest orb rate ${chestRate} out of expected ~75%`);

// Type-specific campaign chests pay only their matching loot category.
for (const rarity of [0, 3, 5]) {
  dungeonWorld.loot = [];
  dropChest(dungeonWorld, { x: 25, y: 25, chestType: 'gilded', chestRarity: rarity }, 10);
  assert.ok(dungeonWorld.loot.length > 0, 'Gilded chest must produce gold');
  assert.ok(dungeonWorld.loot.every((loot) => loot.kind === 'gold'), 'Gilded chest must drop only gold');

  dungeonWorld.loot = [];
  dropChest(dungeonWorld, { x: 25, y: 25, chestType: 'jeweled', chestRarity: rarity }, 10);
  assert.ok(dungeonWorld.loot.length > 0, 'Jeweled chest must produce gems');
  assert.ok(dungeonWorld.loot.every((loot) => loot.kind === 'item' && loot.item?.type === 'gem'), 'Jeweled chest must drop only gems');
}

console.log('ALL REGEN AND ORB TESTS PASSED!');
