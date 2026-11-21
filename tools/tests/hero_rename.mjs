import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCharName } from '../../src/core/profanity.js';

assert.equal(validateCharName('  Aster   Vale  ').name, 'Aster Vale', 'rename uses creation whitespace normalization');
assert.equal(validateCharName('Aster Vale').valid, true, 'valid names remain accepted');
assert.equal(validateCharName('X').valid, false, 'creation minimum length is reused');
assert.equal(validateCharName('A'.repeat(19)).valid, false, 'creation maximum length is reused');
assert.equal(validateCharName('Bad/Name').valid, false, 'creation character restrictions are reused');

const screens = await readFile(new URL('../../src/ui/screens.js', import.meta.url), 'utf8');
assert.match(screens, /const renameBtn = el\('button', 'btn', 'Rename'\)/, 'hero selection has a Rename button');
assert.match(screens, /renameBtn\.disabled = !h \|\| delMode/, 'Rename is enabled only for a selected saved hero');
assert.match(screens, /renameBtn\.onclick = \(\) => \{\s+const h = heroes\[sel\]/, 'rename updates the selected hero used by the current screen');
assert.match(screens, /validateCharName\(field\.value\)/, 'rename validates with character creation rules');
assert.match(screens, /writeSave\(\{ \.\.\.h, name: val\.name \}\)/, 'rename persists only the updated hero record');
assert.match(screens, /G\.char\?\.id === h\.id\) G\.char\.name = val\.name/, 'the active hero portrait name updates immediately');
assert.match(screens, /row\.append\(backBtn, renameBtn, delBtn, name, go\)/, 'Rename sits with the existing hero actions');
console.log('Hero rename validation, save flow, selection state, and active-name checks passed.');
