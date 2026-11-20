// Ground equipment should not emit rarity lights, particles, or light beams.
//   node tools/tests/dropped_item_glow.mjs
import assert from 'node:assert/strict';
import { GroundItem } from '../../src/game/loot.js';
import { RARITY, RARITY_RARE } from '../../src/data/items.js';
import { clearVfx, lights, particles } from '../../src/gfx/vfx.js';

const world = {
  player: { x: 100, y: 100, dead: false },
  map: { walkable: () => true },
};
const ctxCalls = { linearGradients: 0, lighter: 0 };
const ctx = {
  globalCompositeOperation: 'source-over',
  beginPath() {}, ellipse() {}, fill() {}, save() {}, restore() {}, translate() {}, rotate() {},
  drawImage() {},
  createLinearGradient() { ctxCalls.linearGradients++; throw new Error('Dropped loot should not draw a light beam'); },
  set fillStyle(value) { if (this.globalCompositeOperation === 'lighter') ctxCalls.lighter++; this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
};

clearVfx();
for (let rarity = 0; rarity < RARITY.length; rarity++) {
  const dropped = new GroundItem(4, 5, 'item', { item: { type: 'gear', rarity, sealed: false } });
  dropped.z = 0;
  dropped.vz = 0;
  dropped.t = 1;
  const lightsBefore = lights.length;
  const particlesBefore = particles.length;
  assert.equal(dropped.update(1 / 60, world), true, `rarity ${rarity} item remains on the ground`);
  assert.equal(lights.length, lightsBefore, `rarity ${rarity} item adds no ground light`);
  assert.equal(particles.length, particlesBefore, `rarity ${rarity} item emits no glow particles`);
  dropped.icon = () => ({ width: 48, height: 48 });
  dropped.draw(ctx);
}
assert.equal(ctxCalls.linearGradients, 0, 'no rarity draws a light beam');
assert.equal(ctxCalls.lighter, 0, 'no rarity draws an additive halo');

const orb = new GroundItem(4, 5, 'orb_hp');
orb.z = 0;
orb.vz = 0;
orb.t = 1;
orb.update(1 / 60, world);
assert.equal(lights.length, 1, 'health orb glow remains enabled');

const key = new GroundItem(4, 5, 'key');
key.z = 0;
key.vz = 0;
key.t = 1;
const keyParticlesBefore = particles.length;
key.update(1 / 60, world);
assert.equal(lights.length, 1, 'ground keys do not add loot glow lights');
assert.equal(particles.length, keyParticlesBefore, 'ground keys do not emit loot glow particles');

clearVfx();
console.log(`Dropped-item glow checks passed for all ${RARITY.length} gear rarities; health-orb light preserved.`);
