// Save/load regression for the overworld wanderer's heirloom bounty.
// Run: node tools/tests/wanderer_heirloom_quest.mjs
import assert from 'node:assert/strict';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.Image = class { complete = true; naturalWidth = 1; set src(_value) {} addEventListener() {} };
const { newCharData, migrate, writeSave, listSaves } = await import('../../src/game/save.js');
const { G } = await import('../../src/state.js');
const { UI } = await import('../../src/ui/ui.js');
const { addWanderers } = await import('../../src/game/wanderers.js');

const oldRandom = Math.random;
Math.random = () => 0.99; // choose the heirloom bounty and keep the map fixture deterministic
try {
  const hero = newCharData('wizard', 'HeirloomTest');
  migrate(hero);
  const autosaves = { count: 0 };
  const log = [];
  G.char = hero;
  G.player = { x: 8, y: 8, st: { magicFind: 0 }, gainXp() {} };
  G.game = { autosave() { autosaves.count++; } };
  UI.log = (message) => log.push(message);
  UI.refresh = () => {};

  const makeWorld = () => ({
    kind: 'dungeon', depth: 7, biome: { id: 'overworld', name: 'Forsaken Wilds' },
    map: {
      randomNear(x, y) { return [x, y]; },
      walkable() { return true; },
      findPath() { return [{ x: 1, y: 1 }]; },
    },
    player: G.player, npcs: [], portals: [], loot: [], creatures: [], kills: 0,
    addLoot(item) { this.loot.push(item); },
  });
  const spots = [[20, 20], [25, 25]];
  let world = makeWorld();
  addWanderers(world, spots, 1);
  const owner = world.npcs[0];
  assert.equal(owner.bounty.kind, 'relic', 'the fixture generates an heirloom bounty');
  owner.use();
  assert.equal(owner.bounty.state, 'active', 'talking accepts the bounty');
  assert.equal(Object.values(hero.wandererBounties)[0].recovered, false, 'accepted state is saved');
  const ownerName = owner.name;

  const otherArea = makeWorld();
  otherArea.depth = 8;
  addWanderers(otherArea, spots, 1);
  assert.notEqual(otherArea.npcs[0].bounty?.kind, 'relic', 'a second heirloom cannot be started while one is active elsewhere');

  const reload = () => {
    writeSave(G.char);
    const savedHero = listSaves().find((c) => c.id === G.char.id);
    assert(savedHero, 'the hero save exists before reload');
    G.char = migrate(JSON.parse(JSON.stringify(savedHero)));
    G.player.char = G.char;
    const rebuilt = makeWorld();
    addWanderers(rebuilt, spots, 1);
    return rebuilt;
  };
  world = reload();
  assert.equal(world.npcs[0].name, ownerName, 'the original owner is restored after loading');
  assert(world.portals.some((p) => p.label === 'Heirloom'), 'the unrecovered heirloom marker returns after loading');

  const heirloom = world.portals.find((p) => p.label === 'Heirloom');
  heirloom.use();
  assert.equal(world.npcs[0].bounty.state, 'active', 'recovering the heirloom does not complete the quest');
  assert.equal(world.npcs[0].bounty.found, true, 'the heirloom is marked recovered');
  assert.equal(Object.values(G.char.wandererBounties)[0].recovered, true, 'recovered state is saved');
  assert.match(log.at(-1), /Return it to its owner/, 'recovery directs the player back to the owner');
  world.npcs[0].update(0.1);
  assert.equal(world.npcs[0].bounty.state, 'active', 'world updates do not auto-complete a recovered heirloom bounty');

  world = reload();
  assert.equal(world.npcs[0].bounty.found, true, 'recovered state survives loading');
  assert(!world.portals.some((p) => p.label === 'Heirloom'), 'a recovered heirloom is not spawned again');
  world.npcs[0].use();
  assert.equal(world.npcs[0].bounty.state, 'paid', 'speaking to the owner completes the bounty');
  assert.equal(world.loot.length, 2, 'the original item and gold rewards are granted once');
  assert.match(log.at(-1), /Heirloom returned/, 'the owner acknowledges the returned heirloom');

  world = reload();
  assert.equal(world.npcs[0].bounty.state, 'paid', 'completed state persists after loading');
  assert.equal(world.portals.filter((p) => p.label === 'Heirloom').length, 0, 'completed quest cannot respawn the heirloom');
  assert.equal(world.npcs[0].bounty.kind, 'relic', 'the same owner remains attached to the completed quest');
  const paidLoot = world.loot.length;
  world.npcs[0].use();
  assert.equal(world.loot.length, paidLoot, 'talking to the owner again cannot duplicate rewards');
  assert(autosaves.count >= 3, 'acceptance, recovery, and delivery autosave quest progress');
  console.log('Wanderer heirloom quest: accept, save/load, recover, return, one-time reward, and completion persistence passed.');
} finally {
  Math.random = oldRandom;
}
