// Regression coverage for hostile random-event creatures with encounter-specific teams.
// Usage: node tools/tests/event_foe_targeting.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isPlayerHostile, isPlayerTargetable } from '../../src/game/targeting.js';

assert.equal(isPlayerHostile({ team: 'enemy' }), true, 'ordinary enemies remain hostile');
assert.equal(isPlayerHostile({ team: 'omen_red', eventFoe: true }), true, 'event foes with custom factions are hostile to the player');
assert.equal(isPlayerHostile({ team: 'omen_black', eventFoe: true }), true, 'opposing event faction remains player-hostile');
assert.equal(isPlayerHostile({ team: 'player', eventFoe: true }), false, 'the event flag never makes player-side creatures hostile');
assert.equal(isPlayerHostile({ team: 'neutral' }), false, 'unmarked neutral creatures are not made hostile');
assert.equal(isPlayerHostile({ team: 'player' }), false, 'player creatures are not made hostile');

assert.equal(isPlayerTargetable({ team: 'omen_duelist_a', eventFoe: true }), true, 'live event foes can be targeted');
assert.equal(isPlayerTargetable({ team: 'omen_duelist_a', eventFoe: true, dead: true }), false, 'dead event foes cannot be targeted');
assert.equal(isPlayerTargetable({ team: 'omen_duelist_a', eventFoe: true, targetable: false }), false, 'scripted untargetable states remain respected');
assert.equal(isPlayerTargetable({ team: 'omen_duelist_a', eventFoe: true, clutter: true }), false, 'non-creature clutter remains excluded from target UI');

const [controls, creature, hud, renderer, events] = await Promise.all([
  'src/game/controls.js', 'src/game/creature.js', 'src/ui/hud.js', 'src/game/render.js', 'src/game/dungeonevents.js',
].map((path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')));
assert.match(controls, /isPlayerHostile\(G\.hover\)/, 'direct mouse attacks recognize event foes');
assert.match(creature, /isPlayerHostile\(this\).*BAR|isPlayerHostile\(this\) &&/, 'event foes use enemy overhead health bars');
assert.match(hud, /const live = isPlayerTargetable/, 'target window includes event foes and respects targetability');
assert.match(renderer, /isPlayerTargetable\(h\)/, 'hover health display includes targetable event foes');
assert.match(renderer, /isPlayerHostile\(m\) && d < 14/, 'hostile event foes retain an enemy map marker');
assert.match(events, /m\.eventFoe = true;[\s\S]*?world\.add\(m\)/, 'random event foes are explicitly identified before registration');

console.log('OK - ordinary and event enemy targeting, UI indicators, and scripted untargetability');
