import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  CHEST_APPEARANCE_PROFILES, CHEST_BIOME_PROFILES, CHEST_SUBREGION_PROFILES,
  CURSED_CHEST_VARIANT, DUNGEON_CHEST_ART, chestAppearanceProfile,
  selectDungeonChestVariant,
} from '../../src/data/chestappearances.js';
import { BIOMES, BETA_BIOMES, BREACH_BIOME, SCORPION_KING_PYRAMID_BIOME, TOWN_BIOME, ACT2_TOWN_BIOME } from '../../src/data/biomes.js';

const ordinaryIds = new Set();
for (const [name, profile] of Object.entries(CHEST_APPEARANCE_PROFILES)) {
  assert(profile.length > 0, `${name} profile has entries`);
  for (const { id, weight } of profile) {
    assert(Number.isInteger(id) && id >= 2 && id <= 20, `${name} excludes cursed design and uses a valid ID`);
    assert(Number.isInteger(weight) && weight > 0, `${name} uses positive relative weights`);
    ordinaryIds.add(id);
  }
}
assert.deepEqual([...ordinaryIds].sort((a, b) => a - b), Array.from({ length: 19 }, (_, i) => i + 2), 'every ordinary design is selectable somewhere');
assert.equal(CURSED_CHEST_VARIANT, 0, 'design 01 is dedicated to cursed chests');

for (const art of DUNGEON_CHEST_ART) {
  assert.equal(art.files.length, 2, `design ${art.id} has paired states`);
  const sizes = art.files.map((file) => {
    assert(existsSync(file), `asset exists: ${file}`);
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', `${file} is a PNG image`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    assert(width > 0 && height > 0, `${file} has valid dimensions`);
    return { width, height };
  });
  const ratio = sizes[1].width / sizes[0].width;
  assert(ratio > 0.7 && ratio < 1.4, `design ${art.id} open and closed states have compatible scale`);
}
for (const biome of [...BIOMES, ...BETA_BIOMES, BREACH_BIOME, SCORPION_KING_PYRAMID_BIOME]) {
  assert(CHEST_BIOME_PROFILES[biome.id], `level biome ${biome.id} has an appearance profile`);
}
assert(!CHEST_BIOME_PROFILES[TOWN_BIOME.id] && !CHEST_BIOME_PROFILES[ACT2_TOWN_BIOME.id], 'town fixture systems are not mapped into dungeon selection');
assert(!Object.keys(CHEST_BIOME_PROFILES).some((id) => id.includes('town-storage')), 'town storage assets are absent from the dungeon catalog');

const base = { biomeId: 'dark_forest', seed: 7919, x: 24.5, y: 18.25 };
const sameVisualContext = [
  selectDungeonChestVariant(base),
  selectDungeonChestVariant({ ...base, chestType: 'explosive', rarity: 5, loot: ['legendary'] }),
  selectDungeonChestVariant({ ...base, chestType: 'gilded', rarity: 0, rewards: 99 }),
];
assert(sameVisualContext.every((index) => index === sameVisualContext[0]), 'selection does not use chest type, rarity, or rewards');
assert.equal(selectDungeonChestVariant(base), selectDungeonChestVariant(base), 'selection is stable for the same level seed and coordinates');

const forestPool = new Set(chestAppearanceProfile('dark_forest').map((entry) => entry.id - 1));
const counts = new Map();
for (let i = 0; i < 12_000; i++) {
  const index = selectDungeonChestVariant({ biomeId: 'dark_forest', seed: 9001, x: i * 0.37, y: i * 0.83 });
  assert(forestPool.has(index), 'forest appearance is selected only from its compatible pool');
  counts.set(index, (counts.get(index) || 0) + 1);
}
assert(counts.size === forestPool.size, 'forest profile retains variety across locations');
const forestWeights = chestAppearanceProfile('dark_forest');
const totalForestWeight = forestWeights.reduce((sum, item) => sum + item.weight, 0);
for (const { id, weight } of forestWeights) {
  const expected = 12_000 * weight / totalForestWeight;
  assert(Math.abs(counts.get(id - 1) - expected) < 120, `sampled weight for design ${id} stays close to its configured ratio`);
}
for (const id of Object.keys(CHEST_SUBREGION_PROFILES)) {
  const [biomeId, variantId] = id.split(':');
  assert(chestAppearanceProfile(biomeId, variantId).length, `subregion ${id} resolves to a valid pool`);
}

console.log(`OK: ${DUNGEON_CHEST_ART.length} art pairs; ${Object.keys(CHEST_APPEARANCE_PROFILES).length} weighted profiles; ${Object.keys(CHEST_BIOME_PROFILES).length} mapped levels; appearance independent of loot.`);
