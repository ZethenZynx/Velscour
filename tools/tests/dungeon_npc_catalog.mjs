import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { addEncounters, ENCOUNTER_CHANCE, ENCOUNTERS, ENCOUNTER_RARITY, ENCOUNTER_RARITY_WEIGHTS, NPC_ENCOUNTER_CATALOG, selectNpcEncounter } from '../../src/game/encounters.js';
import { migrate, newCharData } from '../../src/game/save.js';

assert.equal(ENCOUNTER_CHANCE, 0.5, 'the existing encounter roll remains 50%');
assert.equal(ENCOUNTERS.length, 22, 'six established and sixteen new encounter types');
assert.equal(NPC_ENCOUNTER_CATALOG.length, ENCOUNTERS.length);
assert.ok(NPC_ENCOUNTER_CATALOG.every((entry) => entry.implemented), 'every catalog entry has a builder');
assert.deepEqual(Object.keys(ENCOUNTER_RARITY_WEIGHTS), ['common', 'uncommon', 'rare']);
assert.equal(Object.values(ENCOUNTER_RARITY_WEIGHTS).reduce((a, b) => a + b, 0), 100);
assert.ok(ENCOUNTERS.every((id) => ['common', 'uncommon', 'rare'].includes(ENCOUNTER_RARITY[id])));
for (const biome of ['catacombs', 'frozen', 'hell']) {
  for (let i = 0; i < 100; i++) assert.ok(ENCOUNTERS.includes(selectNpcEncounter({ biome: { id: biome } }, Math.random, 'peddler')));
}

// Exercise the real picker repeatedly with deterministic randomness; rarity class selection is 60/30/10.
let seed = 0x2f891;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const counts = { common: 0, uncommon: 0, rare: 0 };
for (let i = 0; i < 100_000; i++) counts[ENCOUNTER_RARITY[selectNpcEncounter({ biome: { id: 'catacombs' } }, random, null)]]++;
assert.ok(Math.abs(counts.common / 100_000 - 0.6) < 0.01, `common weighting: ${counts.common / 100_000}`);
assert.ok(Math.abs(counts.uncommon / 100_000 - 0.3) < 0.01, `uncommon weighting: ${counts.uncommon / 100_000}`);
assert.ok(Math.abs(counts.rare / 100_000 - 0.1) < 0.01, `rare weighting: ${counts.rare / 100_000}`);

// Re-running the depth setup cannot add a second optional encounter. Forced lists are capped too.
const world = { depth: 5, biome: { id: 'catacombs' }, encounters: [] };
assert.deepEqual(addEncounters(world, [[1, 1]], ['missing-test-kind', 'second-kind']), []);
assert.deepEqual(addEncounters(world, [[2, 2]], ['missing-test-kind']), []);
assert.equal(world.npcEncounterSpawned, true);

// Build one real legacy encounter from a forced list, then regenerate the same depth.
globalThis.Image ||= class { complete = true; naturalWidth = 1; addEventListener() {} set src(_value) {} };
G.char = newCharData('paladin', 'Encounter Test');
const generated = { depth: 6, biome: { id: 'catacombs' }, npcs: [], props: [], chests: [] };
assert.equal(addEncounters(generated, [[8, 8], [10, 10]], ['peddler', 'greener']).length, 1);
assert.equal(generated.encounters[0].kind, 'peddler');
assert.equal(Object.keys(G.char.npcEncounterDepths).length, 1);
const regenerated = { depth: 6, biome: { id: 'catacombs' }, npcs: [], props: [], chests: [] };
assert.deepEqual(addEncounters(regenerated, [[8, 8], [10, 10]]), [], 'a claimed depth cannot spawn another optional NPC encounter');

const fresh = newCharData('paladin', 'Encounter Test');
assert.deepEqual(fresh.npcEncounterDepths, {});
fresh.npcEncounterDepths = []; // legacy or malformed save data is normalized without discarding the character
migrate(fresh);
assert.deepEqual(fresh.npcEncounterDepths, {});

console.log('Dungeon NPC catalog, rarity weights, one-encounter guard, and save migration passed:', counts);
