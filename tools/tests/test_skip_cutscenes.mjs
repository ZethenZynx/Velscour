import assert from 'node:assert/strict';
import fs from 'node:fs';
import { G } from '../../src/state.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const screens = read('../../src/ui/screens.js');
const cinema = read('../../src/game/cinema.js');
const game = read('../../src/game/game.js');
const sea = read('../../src/game/seabattle.js');
const sky = read('../../src/game/skybattle.js');

assert.equal(G.settings.skipCutscenes, false, 'Cutscene skipping should be opt-in by default');
assert.match(screens, /data-k="skipCutscenes"/, 'Settings should expose the skip option');
assert.match(cinema, /export const CINE_SKIP = 60/, 'Skip mode should use the accelerated scene rate');
assert.match(cinema, /this\.fast = !!G\.settings\.skipCutscenes/, 'New scenes should honor the setting');
assert.match(cinema, /camera\.follow\(G\.player\.x, G\.player\.y, 0, true\)/, 'Skip mode should snap the camera back to the player');
assert.match(cinema, /this\.back = null; this\.bars = 0;/, 'Skip mode should remove cinematic bars immediately');
assert.match(game, /G\.settings\.skipCutscenes \? CINE_SKIP : CINE_FAST/, 'Game loop should apply the skip rate');
assert.match(sea, /G\.settings\.skipCutscenes \|\| \(was && !G\.settings\.noSkipCine\)/, 'Sea scenes should skip on first viewing when enabled');
assert.match(sky, /G\.settings\.skipCutscenes \|\| \(seen && !G\.settings\.noSkipCine\)/, 'Sky scenes should skip on first viewing when enabled');

console.log('Cutscene skip setting wiring checks passed.');
