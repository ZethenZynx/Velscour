// Node-only regression test for ambush archetype selection and environment coverage.
//   node tools/tests/ambush_roster.mjs
import assert from 'node:assert/strict';
import { ARCH } from '../../src/data/enemies.js';
import { BIOME_BY_ID } from '../../src/data/biomes.js';
import { pickMonsterArchetype, validMonsterRoster } from '../../src/game/monsterroster.js';
import { ambush } from '../../src/game/mayhem.js';

const biomes = Object.values(BIOME_BY_ID);
for (const biome of biomes) {
  const roster = validMonsterRoster({ biome });
  assert.ok(roster.length, `${biome.id}: no valid fallback roster`);
  assert.ok(roster.every((id) => ARCH[id]), `${biome.id}: fallback roster contains an unknown archetype`);
  assert.ok(ARCH[pickMonsterArchetype({ roster: [], biome }, (ids) => ids[0])], `${biome.id}: selection failed`);

  // Reproduce the failure path: scripted event waves are invoked with an empty world
  // roster, even though the environment itself has eligible monster archetypes.
  const world = {
    kind: 'dungeon', depth: 20, biome, roster: [], player: { x: 20, y: 20 }, creatures: [], dungeonAffixes: [],
    map: { circleFree: () => true, flowAt: () => 0, nudge: (x, y) => [x, y] },
    add(monster) { monster.world = this; this.creatures.push(monster); },
  };
  assert.equal(ambush(world, 'teleport', 1), 1, `${biome.id}: ambush did not spawn from biome fallback`);
  assert.equal(world.creatures.length, 1, `${biome.id}: expected exactly one ambusher`);
  assert.ok(ARCH[world.creatures[0].arch], `${biome.id}: ambush passed an invalid archetype to makeMonster`);
}

const invalidWorld = { roster: ['stale_arch', undefined], biome: { roster: ['also_stale'] } };
assert.deepEqual(validMonsterRoster(invalidWorld), ['skeleton'], 'invalid roster should safely fall back to a registered archetype');
assert.equal(ambush({ player: { x: 0, y: 0 }, map: {}, roster: [] }, 'teleport', 1), 0, 'incomplete world should fail without throwing');

console.log(`Ambush roster regression passed across ${biomes.length} registered environments.`);
