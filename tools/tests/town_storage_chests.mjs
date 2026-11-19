import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TOWN_STORAGE_CHEST_ART, townStorageChestArtFor } from '../../src/data/town-storage-chests.js';

const expected = [
  ['storage', 2, '#d8aa4b'],
  ['reliquary', 19, '#ffd070'],
  ['jewelBox', 10, '#b850ff'],
];

for (const [key, variantNumber, glow] of expected) {
  const art = TOWN_STORAGE_CHEST_ART[key];
  assert.equal(art.chestVariant, variantNumber - 1, `${key} selects chest-${String(variantNumber).padStart(2, '0')}`);
  assert.equal(art.glow, glow, `${key} keeps its matching visual glow`);

  const pair = ['closed', 'open'].map((state) => {
    const file = `assets/props/chest-variants/chest-${String(variantNumber).padStart(2, '0')}-${state}.png`;
    const png = fs.readFileSync(file);
    assert.equal(png.toString('ascii', 1, 4), 'PNG', `${file} is a PNG sprite`);
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  });
  assert(pair.every(({ width, height }) => width > 0 && height > 0), `${key} has both sprite states`);
  const widthRatio = pair[1].width / pair[0].width;
  assert(widthRatio > 0.95 && widthRatio < 1.05, `${key} open/closed pair stays on the same rendered width`);
}

assert.equal(townStorageChestArtFor({ stash: true }), TOWN_STORAGE_CHEST_ART.storage, 'Storage Chest uses its blue/gold pair');
assert.equal(townStorageChestArtFor({ stash: true, reliquary: true }), TOWN_STORAGE_CHEST_ART.reliquary, 'Reliquary uses its carved stone pair');
assert.equal(townStorageChestArtFor({ stash: true, jewelBox: true }), TOWN_STORAGE_CHEST_ART.jewelBox, 'Jewel Box uses its amethyst pair');

console.log('PASS: town storage, Reliquary, and Jewel Box use matching existing paired chest artwork.');
