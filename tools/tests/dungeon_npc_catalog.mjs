import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { addEncounters, ENCOUNTER_CHANCE, ENCOUNTERS, ENCOUNTER_RARITY, ENCOUNTER_RARITY_WEIGHTS, NPC_ENCOUNTER_CATALOG, selectNpcEncounter } from '../../src/game/encounters.js';
import { migrate, newCharData } from '../../src/game/save.js';
import { UI } from '../../src/ui/ui.js';

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
assert.notEqual(selectNpcEncounter({ biome: { id: 'catacombs' }, creatures: [] }, Math.random, null), 'monster_hunter', 'a Pack Leader Hunt is not eligible without a generated leader');
const leaderWorld = { biome: { id: 'catacombs' }, creatures: [{ team: 'enemy', dead: false, packLeaderType: 'war_shaman' }] };
let sawHunt = false;
for (let i = 0; i < 2_000 && !sawHunt; i++) sawHunt = selectNpcEncounter(leaderWorld, Math.random, null) === 'monster_hunter';
assert.ok(sawHunt, 'a real generated leader makes the hunt encounter eligible');

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
const { addWanderers } = await import('../../src/game/wanderers.js');
const frightenedWorld = {
  depth: 1, biome: { id: 'dark_forest' }, npcs: [], creatures: [{ team: 'enemy', awake: true, dead: false, x: 5, y: 5 }],
  player: { x: 5, y: 5 }, map: { randomNear: (x, y) => [x, y], walkable: () => true },
};
addWanderers(frightenedWorld, [[5, 5]], 1);
const frightenedPerson = frightenedWorld.npcs[0];
frightenedPerson.scanT = 0;
frightenedPerson.update(0.1);
assert.doesNotMatch(frightenedPerson.talkText, /help|save me|save us/i, 'frightened non-quest wanderers use atmospheric warnings, not a false help request');
const generated = { depth: 6, biome: { id: 'catacombs' }, npcs: [], props: [], chests: [] };
assert.equal(addEncounters(generated, [[8, 8], [10, 10]], ['peddler', 'greener']).length, 1);
assert.equal(generated.encounters[0].kind, 'peddler');
assert.equal(Object.keys(G.char.npcEncounterDepths).length, 1);
const regenerated = { depth: 6, biome: { id: 'catacombs' }, npcs: [], props: [], chests: [] };
assert.deepEqual(addEncounters(regenerated, [[8, 8], [10, 10]]), [], 'a claimed depth cannot spawn another optional NPC encounter');

const scenarioDepth = { depth: 7, biome: { id: 'catacombs' }, scenario: { mech: 'escort' }, npcs: [], props: [], chests: [] };
assert.deepEqual(addEncounters(scenarioDepth, [[8, 8], [10, 10]]), [], 'NPC rescue/escort set pieces share the one optional encounter slot');

// The Pack Leader Hunt binds only to the real generated leader, follows it after acceptance,
// changes to the return NPC after its death, and grants its reward once.
const realLeader = { id: 'leader-1', team: 'enemy', dead: false, awake: false, packLeaderType: 'war_shaman', packLeaderName: 'War Shaman', name: 'War Shaman Skeleton', x: 16, y: 12 };
const huntWorld = {
  depth: 12, biome: { id: 'catacombs' }, creatures: [realLeader], npcs: [], props: [], chests: [], rooms: [],
  map: { findPath: () => [[1, 1]], walkable: () => true, randomNear: (x, y) => [x, y] },
  loot: [], addLoot(item) { this.loot.push(item); }, add() {}, remove() {},
};
const originalDialog = UI.dialog, originalLog = UI.log, originalRefresh = UI.refresh;
let lastDialog = null;
UI.dialog = (dialog) => { lastDialog = dialog; };
UI.log = () => {};
UI.refresh = () => {};
try {
  const [hunt] = addEncounters(huntWorld, [[2, 2], [5, 5]], ['monster_hunter']);
  assert.equal(hunt.target, realLeader, 'the quest does not spawn or substitute a champion');
  assert.match(realLeader.name, /^Pack Leader:/);
  assert.equal(realLeader.depthBountyMark, undefined, 'inactive hunt does not show an active objective marker');
  hunt.n.use();
  lastDialog.buttons.find((button) => button.label === 'Accept').fn();
  assert.equal(realLeader.awake, true);
  assert.equal(realLeader.depthBountyMark, true);
  assert.equal(realLeader.depthQuestNameplate, true);
  assert.equal(hunt.quest.objectiveTarget, realLeader, 'the active marker follows the pack leader');
  realLeader.x = 18;
  assert.equal(hunt.quest.objectiveTarget.x, 18, 'the marker target remains the moving enemy object');
  realLeader.dead = true;
  hunt.n.onTick();
  assert.equal(hunt.quest.state, 'objective-complete');
  assert.equal(hunt.quest.objectiveTarget, hunt.n, 'the objective changes to the return NPC');
  hunt.n.use();
  lastDialog.buttons.find((button) => button.label === 'Claim bounty').fn();
  const rewards = huntWorld.loot.length;
  assert.equal(hunt.quest.state, 'rewarded');
  hunt.n.use();
  assert.equal(huntWorld.loot.length, rewards, 'turning in again does not duplicate rewards');
} finally {
  UI.dialog = originalDialog; UI.log = originalLog; UI.refresh = originalRefresh;
}

// The captive's plea is a real interaction now: accept through the NPC, defeat the guards,
// return to that NPC, and receive the existing rescue reward once.
const captiveWorld = {
  depth: 14, biome: { id: 'catacombs' }, creatures: [], npcs: [], props: [], chests: [], rooms: [], loot: [],
  player: { x: 5, y: 5, st: { magicFind: 0 } },
  map: { findPath: () => [[1, 1]], walkable: () => true, randomNear: (x, y) => [x, y] },
  add(creature) { this.creatures.push(creature); }, remove(creature) { this.creatures = this.creatures.filter((entry) => entry !== creature); },
  addLoot(item) { this.loot.push(item); },
};
lastDialog = null;
UI.dialog = (dialog) => { lastDialog = dialog; };
UI.log = () => {};
UI.refresh = () => {};
try {
  const [captive] = addEncounters(captiveWorld, [[2, 2], [5, 5]], ['captive']);
  captive.n.use();
  assert.equal(lastDialog.title, 'Free the Captive', 'the captive responds directly with its rescue interaction');
  lastDialog.buttons.find((button) => button.label === 'Accept and help').fn();
  assert.equal(captive.quest.state, 'accepted');
  assert.ok(captive.guards.every((guard) => guard.awake), 'accepting the plea activates the existing guards');
  for (const guard of captive.guards) guard.dead = true;
  captive.n.onTick();
  assert.equal(captive.quest.state, 'objective-complete');
  assert.equal(captive.quest.objectiveTarget, captive.n, 'clearing the guards points the objective back to the captive');
  captive.n.use();
  assert.equal(captive.quest.state, 'rewarded');
  assert.equal(captive.quest.rewardClaimed, true);
  const rescueRewards = captiveWorld.loot.length;
  captive.n.use();
  assert.equal(captiveWorld.loot.length, rescueRewards, 'the captive cannot grant a duplicate reward');
} finally {
  UI.dialog = originalDialog; UI.log = originalLog; UI.refresh = originalRefresh;
}

// A selected hunt safely yields no encounter instead of manufacturing a substitute target.
const noLeaderWorld = {
  depth: 13, biome: { id: 'catacombs' }, creatures: [], npcs: [], props: [], chests: [], rooms: [],
  map: { findPath: () => [[1, 1]], walkable: () => true, randomNear: (x, y) => [x, y] },
};
assert.deepEqual(addEncounters(noLeaderWorld, [[2, 2], [5, 5]], ['monster_hunter']), []);
assert.equal(noLeaderWorld.creatures.length, 0, 'an invalid hunt does not add a champion or enemy');

const fresh = newCharData('paladin', 'Encounter Test');
assert.deepEqual(fresh.npcEncounterDepths, {});
fresh.npcEncounterDepths = []; // legacy or malformed save data is normalized without discarding the character
migrate(fresh);
assert.deepEqual(fresh.npcEncounterDepths, {});

console.log('Dungeon NPC catalog, rarity weights, one-encounter guard, and save migration passed:', counts);
