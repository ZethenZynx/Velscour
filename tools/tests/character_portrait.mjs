import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { G } from '../../src/state.js';
import { CharacterPortrait } from '../../src/ui/characterportrait.js';

const prior = G.settings.characterPortrait;
const oldWidth = globalThis.innerWidth, oldHeight = globalThis.innerHeight;
try {
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 720;
  G.settings.characterPortrait = { visible: true, locked: false, size: 100, position: null };
  assert.deepEqual(CharacterPortrait.bounds(), { width: 190, height: 112 }, 'compact portrait keeps its target proportions');
  assert.deepEqual(CharacterPortrait.ensurePosition(), [16, 16], 'default and reset position is inset from the upper-left corner');
  G.settings.characterPortrait.size = 75;
  assert.deepEqual(CharacterPortrait.bounds(), { width: 142.5, height: 84 }, 'small size keeps both dimensions proportional');
  G.settings.characterPortrait.size = 150;
  assert.deepEqual(CharacterPortrait.bounds(), { width: 285, height: 168 }, 'large size keeps both dimensions proportional');
  const module = await readFile(new URL('../../src/ui/characterportrait.js', import.meta.url), 'utf8');
  assert.match(module, /shownEquip\(c\)/, 'portrait follows the currently shown helmet and armor');
  assert.match(module, /heroPortrait\(c\.classId, eq\?\.body, eq\?\.head/, 'portrait reuses existing class and equipment art');
  assert.match(module, /saveSettings\(\)/, 'movement and window options persist with UI settings');
  assert.match(module, /clamp\(x, 0, maxX\).*clamp\(y, 0, maxY\)/s, 'window movement clamps to visible screen bounds');
  assert.match(module, /document\.addEventListener\('pointerup', end\)/, 'portrait drag ends on pointer release');
  assert.match(module, /lostpointercapture', end/, 'portrait drag ends when pointer capture is lost');
  assert.match(module, /window\.addEventListener\('blur', end\)/, 'portrait drag cancels when the game loses focus');
  const ui = await readFile(new URL('../../src/ui/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /p\.head\.addEventListener\('lostpointercapture', end\)/, 'other draggable game panels release their moving state');
  assert.match(ui, /window\.addEventListener\('blur', end\)/, 'other draggable game panels cancel on focus loss');
  console.log('Character portrait sizing, equipment artwork, settings persistence, and screen-bound checks passed.');
} finally {
  if (prior === undefined) delete G.settings.characterPortrait;
  else G.settings.characterPortrait = prior;
  if (oldWidth === undefined) delete globalThis.innerWidth; else globalThis.innerWidth = oldWidth;
  if (oldHeight === undefined) delete globalThis.innerHeight; else globalThis.innerHeight = oldHeight;
}
