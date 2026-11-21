import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { G } from '../../src/state.js';
import { CharacterPortrait } from '../../src/ui/characterportrait.js';

const prior = G.settings.characterPortrait;
try {
  G.settings.characterPortrait = { visible: true, locked: false, size: 100, position: null };
  assert.deepEqual(CharacterPortrait.bounds(), { width: 260, height: 154 }, 'default portrait dimensions stay compact');
  G.settings.characterPortrait.size = 75;
  assert.deepEqual(CharacterPortrait.bounds(), { width: 195, height: 115.5 }, 'small size keeps both dimensions proportional');
  G.settings.characterPortrait.size = 150;
  assert.deepEqual(CharacterPortrait.bounds(), { width: 390, height: 231 }, 'large size keeps both dimensions proportional');
  const module = await readFile(new URL('../../src/ui/characterportrait.js', import.meta.url), 'utf8');
  assert.match(module, /shownEquip\(c\)/, 'portrait follows the currently shown helmet and armor');
  assert.match(module, /heroPortrait\(c\.classId, eq\?\.body, eq\?\.head/, 'portrait reuses existing class and equipment art');
  assert.match(module, /saveSettings\(\)/, 'movement and window options persist with UI settings');
  assert.match(module, /clamp\(x, 0, maxX\).*clamp\(y, 0, maxY\)/s, 'window movement clamps to visible screen bounds');
  console.log('Character portrait sizing, equipment artwork, settings persistence, and screen-bound checks passed.');
} finally {
  if (prior === undefined) delete G.settings.characterPortrait;
  else G.settings.characterPortrait = prior;
}
