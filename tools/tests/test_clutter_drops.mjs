import assert from 'node:assert/strict';
import { CLUTTER_DROP_CHANCES, dropClutterLoot } from '../../src/game/loot.js';
import { breakClutter } from '../../src/game/clutter.js';
import { G } from '../../src/state.js';

const hero = { level: 20, depth: 10, heresy: { on: [] } };
const player = { char: hero, st: { goldFind: 0 } };
const world = {
  kind: 'dungeon', depth: 10, loot: [],
  addLoot(item) { this.loot.push(item); },
};
G.char = hero;
G.player = player;
G.world = world;

// A repeatable random stream makes the rate checks stable across runs.
let seed = 918273;
const originalRandom = Math.random;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const trials = 20000;
const counts = { gold: 0, orb_hp: 0, orb_mp: 0, orb_rejuv: 0, orb_fury: 0, gem: 0 };
try {
  for (let i = 0; i < trials; i++) {
    world.loot.length = 0;
    const result = dropClutterLoot(world, 5.5, 6.5);
    assert.deepEqual(result, world.loot, 'the helper should return exactly the rewards it placed');
    assert.ok(result.every((item) => item.kind === 'gold' || item.kind.startsWith('orb_') || (item.kind === 'item' && item.item?.type === 'gem')),
      'breakables must never drop gear, potions, or other item categories');
    assert.ok(result.filter((item) => item.kind.startsWith('orb_')).length <= 1, 'a breakable can drop at most one orb');
    for (const item of result) {
      if (item.kind === 'gold') counts.gold++;
      else if (item.kind.startsWith('orb_')) counts[item.kind]++;
      else counts.gem++;
    }
  }
} finally {
  Math.random = originalRandom;
}

for (const [kind, chance] of Object.entries({
  gold: CLUTTER_DROP_CHANCES.gold,
  orb_hp: CLUTTER_DROP_CHANCES.orbHp,
  orb_mp: CLUTTER_DROP_CHANCES.orbMp,
  orb_rejuv: CLUTTER_DROP_CHANCES.orbRejuv,
  orb_fury: CLUTTER_DROP_CHANCES.orbFury,
  gem: CLUTTER_DROP_CHANCES.gem,
})) {
  const observed = counts[kind] / trials;
  assert.ok(Math.abs(observed - chance) < 0.012, `${kind} chance was ${(observed * 100).toFixed(2)}%, expected ${chance * 100}%`);
}
assert.ok(CLUTTER_DROP_CHANCES.gem < Math.min(...Object.values(CLUTTER_DROP_CHANCES).filter((_, i) => i < 5)), 'gems must be the rarest breakable reward');

world.loot.length = 0;
world.kind = 'town';
assert.deepEqual(dropClutterLoot(world, 5.5, 6.5), [], 'town props must not use dungeon clutter drops');
assert.equal(world.loot.length, 0);

world.kind = 'dungeon';
world.heresy = { ids: ['hunger'], rank: 1 };
world.loot.length = 0;
dropClutterLoot(world, 5.5, 6.5);
assert.ok(world.loot.every((item) => !item.kind.startsWith('orb_')), 'Hunger of the Abyss must block clutter orbs');

world.heresy = null;
world.kind = 'dungeon';
world.loot.length = 0;
const prop = { x: 5.5, y: 6.5 };
world.props = [prop];
world.map = { w: 20, block: new Uint8Array(400).fill(1), clutter: new Uint8Array(400).fill(1), flowFrom: [1, 1], blockKey: 0 };
world.creatures = [];
const clutter = { world, prop, x: prop.x, y: prop.y, tx: 5, ty: 6 };
world.creatures.push(clutter);
G.world = world;
Math.random = () => 0;
try {
  breakClutter(clutter);
  const afterBreak = world.loot.length;
  assert.ok(afterBreak > 0, 'breaking clutter should roll and place its rewards');
  breakClutter(clutter);
  assert.equal(world.loot.length, afterBreak, 'the same clutter cannot roll rewards twice');
} finally {
  Math.random = originalRandom;
}

console.log(`PASS: breakable rewards stay limited and low (${Object.entries(counts).map(([kind, count]) => `${kind} ${(100 * count / trials).toFixed(2)}%`).join(', ')}).`);
