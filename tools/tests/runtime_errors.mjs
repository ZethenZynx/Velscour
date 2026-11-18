// Regression coverage for the two browser-console errors reported on Nov 18.
// Run: node tools/tests/runtime_errors.mjs
import assert from 'node:assert/strict';
import { G } from '../../src/state.js';

globalThis.location = { href: 'http://localhost/' };
const requestedImages = [];
globalThis.Image = class FakeImage {
  set src(value) { requestedImages.push(value); this.onerror?.(new Error('not present in the test')); }
};

const { preloadSkillSheets } = await import('../../src/ui/icons.js');
await preloadSkillSheets('dragon_knight');
assert.deepEqual(requestedImages, [], 'classes without shipped atlases use procedural icons without network requests');

const { game } = await import('../../src/game/game.js');
const player = { x: 2, y: 2, dead: false, maxHp: 100, status: {} };
const world = {
  kind: 'dungeon', dungeonAffixes: ['unstable_reality'], creatures: [], hazards: [],
  map: { randomNear: () => [2, 2], isFloor: () => true }, addHazard(hazard) { this.hazards.push(hazard); },
};
G.player = player;
const previousRandom = Math.random;
Math.random = () => 0; // guarantee the rare unstable-reality proc in one update
try {
  game.tickDungeonAffixWorld(world, 1 / 60);
} finally {
  Math.random = previousRandom;
}
assert.equal(player.status.slow?.amt, 0.2, 'unstable-reality tick runs without an undefined chance reference');

const elementalWorld = {
  kind: 'dungeon', dungeonAffixes: ['unstable_elements'], creatures: [], hazards: [],
  affixTimers: { unstable_elements: 0 }, map: world.map,
  addHazard(hazard) { this.hazards.push(hazard); },
};
Math.random = () => 0;
try {
  game.tickDungeonAffixWorld(elementalWorld, 1 / 60);
} finally {
  Math.random = previousRandom;
}
assert.equal(elementalWorld.hazards.length, 2, 'unstable-elements pulse and its secondary roll both execute');
console.log('Missing optional skill atlases are skipped; unstable-reality and unstable-elements affix ticks execute successfully.');
