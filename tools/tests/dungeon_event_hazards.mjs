// Exercise the dungeon event telegraph hazard and its Crystal Bloom damage.
// Run with: node tools/tests/dungeon_event_hazards.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { G } from '../../src/state.js';
import { addPulseStrike, DUNGEON_EVENTS, dungeonEventTick, setupDungeonEvent } from '../../src/game/dungeonevents.js';
import { UI } from '../../src/ui/ui.js';

const originalRandom = Math.random;
Math.random = () => 0.5;
G.char = { madT: 0 };
G.godMode = false;
G.settings.gore = 0;
G.settings.shake = false;
G.ui = { event() {} };

function makePlayer(maxHp = 1000) {
  return { isPlayer: true, team: 'player', x: 0, y: 0, hp: maxHp, maxHp,
    st: { armor: 0, res: { cold: 0, magic: 0 }, reduce: 0, damageTakenPct: 0, block: 0, legendary: {}, procs: [], thorns: 0 },
    status: {}, curses: {}, buffs: [], dead: false, die() { this.dead = true; } };
}

try {
  const world = { depth: 12, dungeonAffixes: [], hazards: [], player: makePlayer(),
    addHazard(hazard) { this.hazards.push(hazard); } };
  G.world = world;
  const crystalBloom = DUNGEON_EVENTS.find((event) => event.id === 'crystal_bloom');
  assert.ok(crystalBloom, 'Crystal Bloom is a registered dungeon event');
  const run = { def: crystalBloom, active: true, pulseRadius: 1.4, pulseColor: '#74dfff', pulseDamage: 0.035, element: 'cold' };

  addPulseStrike(world, run, 0, 0);
  const strike = world.hazards[0];
  assert.equal(strike.r, run.pulseRadius, 'the damage area matches the visible warning ring radius');
  assert.equal(strike.update(0.84), true, 'the strike gives the player a visible reaction window');
  assert.equal(world.player.hp, 1000, 'no damage occurs before the warning resolves');
  assert.equal(strike.update(0.01), false, 'the one-time strike removes itself after impact');
  assert.equal(world.player.hp, 965, 'a player inside the crystal warning takes 3.5% max-health cold damage');

  world.player.hp = 1000;
  world.player.x = 3;
  addPulseStrike(world, run, 0, 0);
  world.hazards[1].update(0.85);
  assert.equal(world.player.hp, 1000, 'leaving the marked area avoids the strike');

  world.player.x = 0;
  world.player.maxHp = 2000;
  world.player.hp = 2000;
  addPulseStrike(world, run, 0, 0);
  world.hazards[2].update(0.85);
  assert.equal(world.player.hp, 1930, 'damage scales with player health progression');

  world.player.hp = 1000;
  const endedRun = { ...run, active: false };
  addPulseStrike(world, endedRun, 0, 0);
  assert.equal(world.hazards[3].update(0.1), false, 'pending strikes clean up as soon as the event ends');
  assert.equal(world.player.hp, 1000, 'event cleanup prevents post-event damage');

  // Exercise Crystal Bloom's real event startup and pulse scheduler as well as the strike helper.
  const eventRoom = { x: -2, y: -2, w: 4, h: 4, mx: 0, my: 0 };
  const eventWorld = { kind: 'dungeon', depth: 12, biome: { id: 'test' }, dungeonAffixes: [], rooms: [eventRoom],
    map: { walkable: () => true }, chests: [], portals: [], creatures: [], hazards: [], loot: [], player: makePlayer(),
    addHazard(hazard) { this.hazards.push(hazard); }, addLoot(item) { this.loot.push(item); }, hostiles() { return []; } };
  eventWorld.player.st.magicFind = 0;
  G.world = eventWorld;
  G.player = eventWorld.player;
  G.char = { madT: 0, dungeonEventClaims: {} };
  UI.msgEl = { innerHTML: '', style: {}, classList: { toggle() {} } };
  UI.hud = null;
  UI.logEl = null;
  setupDungeonEvent(eventWorld, eventRoom, { id: 'crystal_bloom', start: [-8, -8] });
  dungeonEventTick(eventWorld, 0.01);
  assert.equal(eventWorld.happen.event.def.id, 'crystal_bloom', 'entering the event room starts Crystal Bloom');
  assert.equal(eventWorld.happen.event.element, 'cold', 'Crystal Bloom schedules cold crystal strikes');
  dungeonEventTick(eventWorld, 1.2);
  assert.equal(eventWorld.hazards.length, 1, 'the event pulse scheduler creates a damaging strike');
  assert.equal(eventWorld.loot.length, 3, 'the existing three gem drops are preserved');

  const source = readFileSync(new URL('../../src/game/dungeonevents.js', import.meta.url), 'utf8');
  assert.match(source, /The event has begun/);
  assert.doesNotMatch(source, /A major dungeon event has begun/i, 'player notification no longer uses the generic Major designation');
  console.log('PASS: Crystal Bloom telegraph, damage interval, depth scaling, escape, cleanup, and event wording.');
} finally {
  Math.random = originalRandom;
}
