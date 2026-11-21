import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const values = new Map();
let blocked = false;
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { if (blocked) throw new Error('storage unavailable'); values.set(key, String(value)); },
  removeItem: (key) => values.delete(key),
};

const { saveEndgame } = await import('../../src/game/endgame.js');
const { saveMarkXp } = await import('../../src/game/marks.js');
assert.equal(saveEndgame(true), true, 'endgame state reports a successful write');
assert.ok(values.has('velscour_endgame_v1'), 'endgame state was persisted');
assert.equal(saveMarkXp(), true, 'a clean mark-XP state is already safely saved');
blocked = true;
const warn = console.warn;
console.warn = () => {};
try { assert.equal(saveEndgame(true), false, 'failed writes are reported so exit can be aborted'); }
finally { console.warn = warn; }

const screens = await readFile(new URL('../../src/ui/screens.js', import.meta.url), 'utf8');
const game = await readFile(new URL('../../src/game/game.js', import.meta.url), 'utf8');
assert.match(screens, /Are you sure you want to save and quit\?/);
assert.match(screens, /label: 'Cancel'/);
assert.match(screens, /label: 'Save and Quit'/);
assert.match(screens, /pauseDialog\.close\(\)/, 'cancel closes the pause screen so play resumes');
assert.match(game, /if \(!this\.autosave\(\)\) return false;/, 'the title transition is guarded by save success');
console.log('Save-and-quit persistence and exit-guard checks passed.');
