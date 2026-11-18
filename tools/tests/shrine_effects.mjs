// Exercises the real combat hit pipeline with deterministic damage rolls.
// Run with: node tools/tests/shrine_effects.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';
import { hit } from '../../src/game/combat.js';
import { LEGACY_SHRINE_DESCRIPTIONS, shrineBuffDescription } from '../../src/game/shrineeffects.js';
import { SHRINES } from '../../src/game/happenings.js';

const world = { dungeonAffixes: [], time: 0, affixSurgeUntil: 0, creatures: [], hostiles: () => [], query: () => [] };
const events = [];
G.world = world; G.char = { madT: 0 }; G.godMode = false;
G.settings.gore = 0; G.settings.shake = false;
G.ui = { event: (event) => events.push(event) };
const originalRandom = Math.random;
Math.random = () => 0.5;

function enemy(shadowRes = 0) {
  return { x: 1, y: 1, hp: 100000, maxHp: 100000, team: 'enemy', rank: 'normal', world,
    res: { phys: 0, shadow: shadowRes }, dmgReduce: 0, curses: {}, status: {} };
}

try {
  const hero = { isPlayer: true, team: 'player', buffs: [{ id: 'world_shadows', worldObject: true, t: 150,
    stats: { addedDamage: { shadow: 8 }, damageTakenPct: 12 } }],
    st: { critChance: 0, critDmg: 0, bossDmg: 0, legendary: {}, lifeSteal: 0, manaSteal: 0, procs: [], addedDamage: { shadow: 8 } } };

  const resistant = enemy(0.5);
  assert.equal(hit(hero, resistant, 100, 'phys', { crit: false }), 104,
    'the direct physical hit receives an 8% Shadow hit, mitigated by 50% Shadow resistance');
  assert.equal(100000 - resistant.hp, 104, 'both damage types reduce target health exactly once');
  assert.deepEqual(events.splice(0).map((event) => event.meta?.data?.type), ['phys', 'shadow'],
    'the combat log reports one base hit and one distinct elemental hit');

  const dot = enemy();
  hit(hero, dot, 100, 'phys', { dot: true, crit: false });
  assert.equal(100000 - dot.hp, 100, 'damage-over-time ticks do not repeat the altar bonus');
  assert.equal(events.length, 1, 'a DoT tick emits no duplicate bonus event');
  events.length = 0;

  hero.buffs[0].t = 0;
  hero.st.addedDamage = {};
  const expired = enemy();
  assert.equal(hit(hero, expired, 100, 'phys', { crit: false }), 100, 'an expired buff adds no damage');
  assert.equal(100000 - expired.hp, 100, 'an expired buff does not affect target health');

  hero.buffs = [20, 20].map((value, i) => ({ id: `test_${i}`, worldObject: true, t: 20, stats: { addedDamage: { shadow: value } } }));
  hero.st.addedDamage = { shadow: 40 };
  const capped = enemy();
  assert.equal(hit(hero, capped, 100, 'phys', { crit: false }), 130, 'same-element altar bonuses have a 30% cap');

  const player = { isPlayer: true, team: 'player', x: 0, y: 0, hp: 100000, maxHp: 100000,
    st: { armor: 0, res: { magic: 0 }, reduce: 0, damageTakenPct: 0, block: 0, legendary: {}, procs: [] },
    status: {}, buffs: [], curses: {} };
  const attacker = { team: 'enemy', rank: 'normal', level: 1, x: 1, y: 0, curses: {} };
  hit(attacker, player, 100, 'phys', { crit: false });
  const incomingBase = 100000 - player.hp;
  player.hp = 100000; player.st.damageTakenPct = 12;
  hit(attacker, player, 100, 'phys', { crit: false });
  assert.equal((100000 - player.hp) / incomingBase, 1.12, 'the altar penalty increases incoming damage by its exact 12% value');

  assert.deepEqual(Object.keys(SHRINES).filter((key) => !LEGACY_SHRINE_DESCRIPTIONS[key]), [],
    'every original shrine has a player-facing description');
  const phoenix = shrineBuffDescription({ t: 30, phoenixCharges: 1 }, 'phoenix');
  assert.match(phoenix, /35% of maximum health.*1\.5 seconds of invulnerability/i,
    'Phoenix text matches its implemented single-charge resurrection');
  assert.match(shrineBuffDescription({ t: 30, stats: { elemental: { fire: 28 } } }, 'elements'),
    /Fire.*does not convert/i, 'Elements explains it strengthens existing fire attacks instead of converting damage');
  assert.match(shrineBuffDescription({ t: 150, stats: { addedDamage: { shadow: 16 }, damageTakenPct: 24 } }, 'shadows'),
    /direct attack hit.*16%.*take 24% more damage/i, 'Shadow Pact explains its actual scaled bonus and penalty');

  console.log('PASS: added elemental damage, resistance, DoT exclusion, expiry, cap, damage-taken penalty, and shrine descriptions.');
} finally {
  Math.random = originalRandom;
}
