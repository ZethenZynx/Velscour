import assert from 'node:assert/strict';

const styles = [], calls = [], alphas = [];
const ctx = new Proxy({}, {
  get: (_target, key) => (...args) => calls.push([key, ...args]),
  set: (_target, key, value) => { if (key === 'fillStyle') styles.push(value); if (key === 'globalAlpha') alphas.push(value); return true; },
});
globalThis.document ||= { addEventListener() {}, fonts: { check: () => true }, createElement: () => ({ getContext: () => ctx }) };
globalThis.window ||= { addEventListener() {} };
globalThis.Image ||= class { addEventListener() {} set src(_value) {} };
const { drawMinimap } = await import('../../src/game/render.js');
const { G } = await import('../../src/state.js');
const { TileMap } = await import('../../src/world/map.js');
const canvas = { width: 220, height: 160, getContext: () => ctx };
const map = {
  w: 4, h: 2, t: new Uint8Array([1, 1, 0, 0, 1, 1, 0, 0]),
  v: new Uint8Array([0, 1, 0, 0, 0, 1, 0, 0]),
  seen: new Uint8Array([1, 1, 1, 0, 0, 0, 0, 0]), seenVersion: 0, seenDirty: [], minimapTerrainVersion: 0,
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; },
};
const world = {
  kind: 'dungeon', biome: { id: 'overworld' }, map, player: { x: 0.5, y: 0.5 },
  townTiles: [{ name: 'green grass meadow' }, { name: 'packed dirt path' }],
  portals: [], chests: [], npcs: [], creatures: [], depthQuests: [],
};
G.settings.tabMapTransparency = 45;
drawMinimap(world, 0.21, canvas, true);

assert.ok(styles.includes('#536743'), 'grass cells use a muted green');
assert.ok(styles.includes('#806044'), 'path cells use a distinct brown');
assert.ok(styles.includes('#41474d'), 'seen non-walkable cells beside explored floor are drawn as walls');
assert.equal(calls.filter(([method]) => method === 'fill').length, 4, 'unseen terrain remains hidden while the player marker remains visible');
assert.ok(styles.lastIndexOf('#ffffff') > styles.lastIndexOf('#41474d'), 'the player marker is rendered over terrain');
assert.ok(alphas.includes(0.55), 'TAB map terrain uses the default 45% transparency');
const fillsAfterFirstDraw = calls.filter(([method]) => method === 'fill').length;
drawMinimap(world, 0.21, canvas, true);
assert.equal(calls.filter(([method]) => method === 'fill').length, fillsAfterFirstDraw + 1, 'static terrain is cached while dynamic markers redraw');
map.seen[3] = 1; map.seenDirty.push(3); map.seenVersion++;
const fillsBeforeReveal = calls.filter(([method]) => method === 'fill').length;
drawMinimap(world, 0.21, canvas, true);
assert.ok(calls.filter(([method]) => method === 'fill').length > fillsBeforeReveal + 1, 'newly revealed terrain updates the static cache incrementally');
G.settings.tabMapTransparency = 100;
drawMinimap(world, 0.21, canvas, true);
assert.ok(alphas.includes(0), 'fully transparent terrain does not dim the marker layer');
const explored = new TileMap(8, 8);
explored.reveal(3.5, 3.5, 1.5);
assert.ok(explored.seenVersion > 0 && explored.seenDirty.length > 0, 'newly explored cells are queued for incremental cache updates');
explored.clearSeen();
assert.equal(explored.seen.some(Boolean), false, 'clearing a reused map resets exploration');
assert.ok(explored.minimapTerrainVersion > 0, 'clearing exploration invalidates its cached map layer');

console.log('Connected terrain, explored walls, fog gating, adaptive cache, transparency, marker layering, and map invalidation passed.');
