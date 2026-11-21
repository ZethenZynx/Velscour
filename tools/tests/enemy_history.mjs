import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  appendEnemyHistory, ENEMY_HISTORY_LIMIT, ENEMY_HISTORY_STORAGE_KEY,
  loadEnemyHistory, normalizeEnemyHistory, saveEnemyHistory,
} from '../../src/ui/enemyhistory.js';

const history = [];
for (let i = 0; i < 105; i++) appendEnemyHistory(history, {
  key: `enemy-${i}`, name: `Enemy ${i}`, art: `art-${i}`, level: i + 1,
  maxHp: 100 + i, hp: 75 + i, dmg: 12 + i, affixes: ['strong'],
  dungeonAffixes: ['fortified'], res: { fire: 0.4 }, thumbnail: 'data:image/png;base64,abc',
});
assert.equal(history.length, ENEMY_HISTORY_LIMIT, 'history retains no more than 100 encounters');
assert.equal(history[0].key, 'enemy-5', 'oldest encounter is discarded first');
assert.equal(history.at(-1).key, 'enemy-104', 'newest encounter remains last');
assert.equal(appendEnemyHistory(history, { key: 'enemy-104', name: 'Repeated target' }).added, false, 'the same enemy cannot create duplicate history entries');

const stored = new Map();
const storage = { getItem: (key) => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) };
assert.equal(saveEnemyHistory(history, storage), true, 'history persists to local storage');
const restored = loadEnemyHistory(storage);
assert.equal(restored.length, 100, 'saved history restores with its bound');
assert.equal(restored[4].art, 'art-9', 'artwork reference survives saving');
assert.equal(restored[4].maxHp, 109, 'enemy statistics survive saving');
assert.deepEqual(restored[4].affixes, ['strong'], 'elite affixes survive saving');
assert.deepEqual(restored[4].dungeonAffixes, ['fortified'], 'dungeon affixes survive saving');
assert.deepEqual(restored[4].res, { fire: 0.4 }, 'resistances survive saving');
assert.equal(restored[4].thumbnail, 'data:image/png;base64,abc', 'recorded artwork thumbnail survives saving');
assert.equal(stored.has(ENEMY_HISTORY_STORAGE_KEY), true);
assert.deepEqual(normalizeEnemyHistory('invalid'), [], 'invalid stored data safely falls back to empty history');

const hud = await readFile(new URL('../../src/ui/hud.js', import.meta.url), 'utf8');
assert.match(hud, /if \(cur\) this\.recordEnemy\(cur\)/, 'encounters are recorded during target updates');
assert.match(hud, /if \(cur && !this\.enemyHistoryReviewing\) this\.tb = cur/, 'new targets do not interrupt history review');
assert.match(hud, /tb-history-position/, 'history position is displayed');
console.log('Enemy history retention, deduplication, persistence, data fidelity, and review checks passed.');
