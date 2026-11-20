// MOUNTAINSIDE (docs/MOUNTAINSIDE.md): a standalone switchback-climb depth in the regular overworld rotation.
import { registerRegion } from '../regions.js';
import { loadBiomeArt, biomeTileSet } from '../../core/assets.js';
import { BIOME_BY_ID } from '../../data/biomes.js';
import { loadDarkForestTrees, darkForestTreesReady } from '../../gfx/darkforest.js';
import { loadAlpine3D, alpine3dReady } from '../../gfx/alpine3d.js';
import { generateMountain } from '../../world/mountain.js';
import { createMountainRun, mountainQuest } from '../mountain.js';

registerRegion({
  id: 'mountainside',
  words: ['mountain', 'mountainside', 'mountains', 'climb'],
  portal: 'Climb the switchback trail to the summit and defeat its Warden to open the exit. Ledges a hop high can be climbed; cliffs cannot.',
  townLine: 'The Mountainside lies beyond: climb the switchback trail and defeat its Warden to open the exit.',
  // the mountain floors (town + Dark Forest packs), its pines, the Snowy Summit pack for the top bands, three.js
  load: () => Promise.all([loadBiomeArt(BIOME_BY_ID.dark_forest), loadDarkForestTrees(), loadBiomeArt(BIOME_BY_ID.snowy_summit), loadAlpine3D()]),
  ready: () => alpine3dReady() && darkForestTreesReady() && biomeTileSet(BIOME_BY_ID.snowy_summit).pack === 'snowy_summit',
  kept: (c, depth) => c.mountainRuns && c.mountainRuns[depth],   // a town trip comes back to the same mountain, at the highest camp reached
  generate: (depth, biome, seed) => generateMountain(depth, biome, seed),
  createRun: (world, gen, biome, depth, win) => createMountainRun(world, gen, biome, depth, win),
  intro: () => 'The trail switchbacks up the cliffs to the summit, and things hold it all the way. A ledge a hop high can be climbed; the cliffs cannot.',
  quest: mountainQuest,
  amb: 'mountainside',
});
