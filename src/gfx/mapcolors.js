// Muted, deliberately separated map colors. These colors describe game terrain, not the floor art's lighting.
export const MAP_TERRAIN_COLORS = Object.freeze({
  grass: '#536743', vegetation: '#304a34', dirt: '#806044', mud: '#594536',
  sand: '#b7a06f', water: '#426f82', deepWater: '#293f60', stone: '#777a7a',
  wall: '#41474d', wood: '#775a40', snow: '#c5cbd0', ice: '#7fa8bb',
  lava: '#a84d32', blood: '#713b40', swamp: '#626744', void: '#171a21',
  bridge: '#75664e', rail: '#4c4c51', crystal: '#638995', fungal: '#69724a',
});

const RULES = [
  ['deepWater', /deep\s*water|abyss(?:al)?\s*(?:water|pool)|ocean|open\s*sea|void\s*water/],
  ['lava', /lava|magma|molten|volcanic|fire\s*river/],
  ['blood', /blood|gore|flesh|sanguine/],
  ['ice', /ice|frost|glacier|rime/],
  ['snow', /snow|powder|windpacked/],
  ['rail', /rail(?:way)?|track|sleeper|iron\s*line/],
  ['bridge', /bridge|drawbridge|trestle|gangway/],
  ['swamp', /swamp|marsh|bog|fen|mire|sewer|sludge|sewage/],
  ['water', /water|moat|pond|river|stream|lake|pool|oasis|wetland/],
  ['sand', /sand|dune|desert|wadi|salt\s*flat|beach/],
  ['vegetation', /forest|tree|canopy|root|thicket|undergrowth|briar|vine|dense\s*vegetation/],
  ['grass', /moss|reed|meadow|lawn|clover|wildflower|grass|turf|verdant|herb/],
  ['dirt', /gravel\s*path|gravel\s*wash|packed\s*ground/],
  ['fungal', /fung|mushroom|mycel|spore/],
  ['crystal', /crystal|quartz|gem|amethyst|shard/],
  ['wood', /wood|plank|board|timber/],
  ['wall', /wall|rampart|battlement|parapet|masonry|brickwork|fortification|cliff|ledge/],
  ['stone', /stone|rock|granite|slate|limestone|flagstone|marble|basalt|cobble|gravel|grit|ore|ore|rubble|pav(?:e|ing)|brick|shale|bedrock/],
  ['mud', /mud|clay|earth|loam|silt|soil|rut|peat/],
  ['dirt', /dirt|trail|path|road|gravel\s*wash|packed\s*ground/],
];

const BIOME_DEFAULTS = Object.freeze({
  dark_forest: 'vegetation', overworld: 'grass', castle: 'grass', sea_of_sand: 'sand',
  snowy_summit: 'snow', mountainside: 'stone', depths_edge: 'stone', pirate_seas: 'deepWater',
  skyship: 'void', ghost_train: 'rail', deep_mines: 'stone', endless_siege: 'stone', eternal_breach: 'void',
  catacombs: 'stone', castle_keep: 'wall', frozen: 'ice', ice_temple: 'ice', molten: 'lava',
  fungal: 'fungal', sunken: 'water', blood: 'blood', ashen: 'stone', void: 'void', gilded: 'stone',
  plague: 'swamp', crystal: 'crystal', desert: 'sand', shadow: 'void', forge: 'lava', abyss: 'void',
  thorn: 'vegetation', storm: 'stone', obsidian: 'stone', flesh: 'blood', serpent: 'stone',
  shattered: 'stone', library: 'wood', sewers: 'swamp', necropolis: 'stone', cathedral: 'stone',
  amber: 'sand', desert_temple: 'sand', hell: 'lava', astral_plane: 'void', heavenly: 'stone', throne: 'lava',
});

export function terrainKindFromName(name) {
  const text = String(name || '').toLowerCase().replace(/[_-]+/g, ' ');
  for (const [kind, pattern] of RULES) if (pattern.test(text)) return kind;
  return null;
}

export function terrainColor(kind, biomeId = '') {
  const resolved = kind || BIOME_DEFAULTS[biomeId] || 'stone';
  return MAP_TERRAIN_COLORS[resolved] || MAP_TERRAIN_COLORS.stone;
}

