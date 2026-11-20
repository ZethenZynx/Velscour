import assert from 'node:assert/strict';

globalThis.document ||= { addEventListener() {}, fonts: { check: () => true }, createElement: () => ({ getContext: () => ({}) }) };
globalThis.window ||= { addEventListener() {} };
globalThis.Image ||= class { addEventListener() {} set src(_value) {} };
const { drawMinimap } = await import('../../src/game/render.js');

const styles = [], calls = [];
const ctx = new Proxy({}, {
  get: (_target, key) => (...args) => calls.push([key, ...args]),
  set: (_target, key, value) => { if (key === 'fillStyle') styles.push(value); return true; },
});
const canvas = { width: 220, height: 160, getContext: () => ctx };
const map = {
  w: 4, h: 2, t: new Uint8Array([1, 1, 0, 0, 1, 1, 0, 0]),
  v: new Uint8Array([0, 1, 0, 0, 0, 1, 0, 0]),
  seen: new Uint8Array([1, 1, 1, 0, 0, 0, 0, 0]),
};
const world = {
  kind: 'dungeon', biome: { id: 'overworld' }, map, player: { x: 0.5, y: 0.5 },
  townTiles: [{ name: 'green grass meadow' }, { name: 'packed dirt path' }],
  portals: [], chests: [], npcs: [], creatures: [], depthQuests: [],
};
drawMinimap(world, 0.21, canvas, true);

assert.ok(styles.includes('#536743'), 'grass cells use a muted green');
assert.ok(styles.includes('#806044'), 'path cells use a distinct brown');
assert.ok(styles.includes('#41474d'), 'seen non-walkable cells beside explored floor are drawn as walls');
assert.equal(calls.filter(([method]) => method === 'fill').length, 4, 'unseen terrain remains hidden while the player marker remains visible');
assert.ok(styles.lastIndexOf('#ffffff') > styles.lastIndexOf('#41474d'), 'the player marker is rendered over terrain');

console.log('Terrain colors, explored wall cells, fog gating, and marker layering passed.');
