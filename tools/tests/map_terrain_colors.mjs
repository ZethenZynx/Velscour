import assert from 'node:assert/strict';
import { MAP_TERRAIN_COLORS, terrainColor, terrainKindFromName } from '../../src/gfx/mapcolors.js';

const cases = [
  ['floor_09_gravel_path', 'dirt'], ['packed_mud', 'mud'], ['sea_of_sand_dune', 'sand'],
  ['deep_water_pool', 'deepWater'], ['frozen_ice', 'ice'], ['windpacked_snow', 'snow'],
  ['stone_wall_rampart', 'wall'], ['oak_planks_bridge', 'bridge'], ['iron_rail_tracks', 'rail'],
  ['blood_pooled_flagstone', 'blood'], ['molten_lava', 'lava'], ['fungal_spore_floor', 'fungal'],
  ['crystal_shard_floor', 'crystal'], ['forest_root_ground', 'vegetation'],
];
for (const [name, expected] of cases) assert.equal(terrainKindFromName(name), expected, `${name} maps to ${expected}`);

assert.equal(terrainColor(null, 'sea_of_sand'), MAP_TERRAIN_COLORS.sand);
assert.equal(terrainColor(null, 'pirate_seas'), MAP_TERRAIN_COLORS.deepWater);
assert.equal(terrainColor(null, 'ghost_train'), MAP_TERRAIN_COLORS.rail);
assert.equal(terrainColor(null, 'snowy_summit'), MAP_TERRAIN_COLORS.snow);
assert.notEqual(MAP_TERRAIN_COLORS.wall, MAP_TERRAIN_COLORS.stone);
assert.notEqual(MAP_TERRAIN_COLORS.water, MAP_TERRAIN_COLORS.deepWater);

console.log(`Terrain color classification passed (${cases.length} named terrain cases plus environment fallbacks).`);
