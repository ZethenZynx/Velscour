/**
 * Environment-only appearance rules for the 20 painted dungeon chest designs.
 * IDs are the one-based chest-01..chest-20 asset numbers. Chest #1 is reserved
 * for cursed chests; it is deliberately absent from every ordinary profile.
 * Weights are relative selection weights, not loot weights.
 */
export const CURSED_CHEST_VARIANT = 0;

export const DUNGEON_CHEST_ART = Object.freeze([
  { id: 1, name: 'Cursed Reliquary', files: ['assets/props/chest-variants/chest-01-closed.png', 'assets/props/chest-variants/chest-01-open.png'], description: 'Blackened iron and dark red panels, a horned skull, and glowing corruption marks.', materials: ['black iron', 'dark wood'], tags: ['cursed', 'skull', 'corrupted', 'red runes'], environments: ['Reserved for cursed chests; excluded from ordinary pools.'] },
  { id: 2, name: 'Sunburst Coffer', files: ['assets/props/chest-variants/chest-02-closed.png', 'assets/props/chest-variants/chest-02-open.png'], description: 'Blue panels with warm gold bands and a bright sun medallion.', materials: ['blue wood', 'gold'], tags: ['royal', 'sun', 'blue', 'gold'], environments: ['Gilded Tomb', 'Bone Desert Tombs', 'Sunless Dynasty'] },
  { id: 3, name: 'Mossbound Cache', files: ['assets/props/chest-variants/chest-03-closed.png', 'assets/props/chest-variants/chest-03-open.png'], description: 'A weathered stone-and-wood chest reclaimed by moss, leaves, and small mushrooms.', materials: ['stone', 'wood', 'moss'], tags: ['overgrown', 'forest', 'mushrooms'], environments: ['Fungal Grotto', 'Thornwood Barrow', 'Dark Forest'] },
  { id: 4, name: 'Sapphire Shard Chest', files: ['assets/props/chest-variants/chest-04-closed.png', 'assets/props/chest-variants/chest-04-open.png'], description: 'Riveted dark steel with vivid blue crystals and a sapphire lock.', materials: ['dark steel', 'blue crystal'], tags: ['crystal', 'arcane', 'blue'], environments: ['Crystal Caverns', 'Void Sanctum', 'Abyssal Chasm'] },
  { id: 5, name: 'Gilded Wing Coffer', files: ['assets/props/chest-variants/chest-05-closed.png', 'assets/props/chest-variants/chest-05-open.png'], description: 'Blue-black wood framed in gold, with a prominent winged crest and jewel.', materials: ['blue wood', 'gold'], tags: ['royal', 'winged', 'ornate'], environments: ['Castle Keep', 'Desecrated Cathedral', 'Gilded Tomb'] },
  { id: 6, name: 'Demonfire Chest', files: ['assets/props/chest-variants/chest-06-closed.png', 'assets/props/chest-variants/chest-06-open.png'], description: 'Spiked black iron with molten red seams, a fiery gem, and occult marks.', materials: ['black iron', 'molten stone'], tags: ['demonic', 'fire', 'spikes', 'runes'], environments: ['Molten Depths', 'Infernal Forge', 'Hell'] },
  { id: 7, name: 'Bonebound Chest', files: ['assets/props/chest-variants/chest-07-closed.png', 'assets/props/chest-variants/chest-07-open.png'], description: 'Dark timber wrapped in ribs and bone, with a skull set into the lid.', materials: ['dark wood', 'bone'], tags: ['bone', 'skull', 'undead'], environments: ['Catacombs', 'Necropolis', 'Bone Desert Tombs'] },
  { id: 8, name: 'Ironbound Strongbox', files: ['assets/props/chest-variants/chest-08-closed.png', 'assets/props/chest-variants/chest-08-open.png'], description: 'A restrained, heavily riveted iron chest with a large central lock plate.', materials: ['iron', 'dark wood'], tags: ['iron', 'utilitarian', 'fortress'], environments: ['Castle Keep', 'Deep Rail Mines', 'Serpentine Tower'] },
  { id: 9, name: 'Alchemist’s Chest', files: ['assets/props/chest-variants/chest-09-closed.png', 'assets/props/chest-variants/chest-09-open.png'], description: 'Practical banded brown wood with red and blue potion bottles attached.', materials: ['brown wood', 'iron', 'glass'], tags: ['practical', 'alchemical', 'travel'], environments: ['Haunted Library', 'Iron Express', 'Dark Forest'] },
  { id: 10, name: 'Eldritch Web Chest', files: ['assets/props/chest-variants/chest-10-closed.png', 'assets/props/chest-variants/chest-10-open.png'], description: 'Deep purple panels covered in luminous arcane tracery and a central violet gem.', materials: ['dark metal', 'violet crystal'], tags: ['arcane', 'purple', 'runes'], environments: ['Void Sanctum', 'Shadow Labyrinth', 'Haunted Library'] },
  { id: 11, name: 'Rime-Crusted Chest', files: ['assets/props/chest-variants/chest-11-closed.png', 'assets/props/chest-variants/chest-11-open.png'], description: 'Weathered timber and blue steel buried beneath frost, icicles, and a blue crystal.', materials: ['wood', 'blue steel', 'ice'], tags: ['frost', 'ice', 'blue'], environments: ['Frozen Ossuary', 'Palace of the Everfrost', 'Snowy Summit'] },
  { id: 12, name: 'Lava-Cleft Chest', files: ['assets/props/chest-variants/chest-12-closed.png', 'assets/props/chest-variants/chest-12-open.png'], description: 'Charred volcanic rock split by bright orange lava seams.', materials: ['volcanic rock', 'black iron'], tags: ['volcanic', 'lava', 'fire'], environments: ['Molten Depths', 'Ashen Wastes', 'Infernal Forge'] },
  { id: 13, name: 'Runesteel Chest', files: ['assets/props/chest-variants/chest-13-closed.png', 'assets/props/chest-variants/chest-13-open.png'], description: 'Pale steel with cyan sigils, turquoise inlays, and a glowing circular rune.', materials: ['pale steel', 'turquoise crystal'], tags: ['arcane', 'cyan runes', 'crystal'], environments: ['Crystal Caverns', 'Storm Spire', 'Astral Plane'] },
  { id: 14, name: 'Ceremonial Coffer', files: ['assets/props/chest-variants/chest-14-closed.png', 'assets/props/chest-variants/chest-14-open.png'], description: 'Gold-framed chest draped in purple ceremonial cloth with a fine emblem.', materials: ['gold', 'purple cloth', 'wood'], tags: ['ceremonial', 'royal', 'purple'], environments: ['Gilded Tomb', 'Cathedral', 'Heavenly Citadel'] },
  { id: 15, name: 'Treasure Hoard Chest', files: ['assets/props/chest-variants/chest-15-closed.png', 'assets/props/chest-variants/chest-15-open.png'], description: 'A richly decorated brown-and-gold coffer overflowing with coins, gems, and jewelry.', materials: ['wood', 'gold', 'gems'], tags: ['wealth', 'treasure', 'ornate'], environments: ['Gilded Tomb', 'Desert', 'Castle'] },
  { id: 16, name: 'Antlerwood Chest', files: ['assets/props/chest-variants/chest-16-closed.png', 'assets/props/chest-variants/chest-16-open.png'], description: 'A green, leaf-covered wooden chest crowned with branching antlers and a green gem.', materials: ['wood', 'leaves', 'antler'], tags: ['forest', 'nature', 'antlers'], environments: ['Dark Forest', 'Great Hunt', 'Thornwood Barrow'] },
  { id: 17, name: 'Abyssal Eye Chest', files: ['assets/props/chest-variants/chest-17-closed.png', 'assets/props/chest-variants/chest-17-open.png'], description: 'Dark blue-black metal gripped by purple tentacles around a staring eye.', materials: ['dark metal', 'tentacle'], tags: ['abyssal', 'tentacles', 'eye', 'purple'], environments: ['Abyssal Chasm', 'Sunken Crypt', 'Flesh Pits'] },
  { id: 18, name: 'Dynastic Reliquary', files: ['assets/props/chest-variants/chest-18-closed.png', 'assets/props/chest-variants/chest-18-open.png'], description: 'Carved golden stone with red bindings and an Egyptian-style solar emblem.', materials: ['gold', 'sandstone', 'red cloth'], tags: ['desert', 'dynastic', 'sun'], environments: ['Bone Desert Tombs', 'Gilded Tomb', 'Sunless Dynasty'] },
  { id: 19, name: 'Angel’s Reliquary', files: ['assets/props/chest-variants/chest-19-closed.png', 'assets/props/chest-variants/chest-19-open.png'], description: 'Pale carved stone with a guardian figure, feathered wings, and restrained metalwork.', materials: ['ivory stone', 'silver'], tags: ['sacred', 'angelic', 'ivory'], environments: ['Desecrated Cathedral', 'Heavenly Citadel', 'Catacombs'] },
  { id: 20, name: 'Voidheart Chest', files: ['assets/props/chest-variants/chest-20-closed.png', 'assets/props/chest-variants/chest-20-open.png'], description: 'Black-violet metal and fractured purple stone surrounding a luminous void gem.', materials: ['dark metal', 'violet crystal'], tags: ['void', 'arcane', 'purple'], environments: ['Void Sanctum', 'Astral Plane', 'Obsidian Vault'] },
]);

// Profile entries are [asset ID, relative weight]. The same curated set may be
// reused by several environments; unlisted designs cannot appear there.
const P = (entries) => Object.freeze(entries.map(([id, weight]) => Object.freeze({ id, weight })));
export const CHEST_APPEARANCE_PROFILES = Object.freeze({
  neutral: P([[8,4],[9,3],[2,2],[15,2],[5,1],[7,1]]),
  crypt: P([[7,4],[8,3],[19,2],[18,2],[10,1],[14,1],[20,1]]),
  frost: P([[11,4],[4,2],[8,2],[7,1],[20,1],[19,1]]),
  infernal: P([[12,4],[6,3],[7,2],[8,1],[18,1],[17,1]]),
  forest: P([[16,4],[3,3],[9,2],[7,1],[17,1],[15,1]]),
  drowned: P([[17,4],[13,3],[4,2],[10,2],[8,1],[3,1]]),
  blood: P([[7,3],[18,2],[10,2],[17,2],[6,1],[8,1]]),
  arcane: P([[10,4],[13,3],[4,2],[20,2],[2,1],[14,1]]),
  gilded: P([[18,4],[15,3],[5,2],[14,2],[19,1],[2,1]]),
  plague: P([[3,3],[7,2],[9,2],[17,2],[8,1],[16,1]]),
  desert: P([[18,4],[2,3],[5,2],[15,2],[19,1],[7,1]]),
  shadow: P([[20,4],[10,3],[17,2],[13,2],[8,1],[4,1]]),
  fortress: P([[8,4],[5,3],[7,2],[18,2],[9,1],[14,1]]),
  ship: P([[9,3],[8,3],[15,2],[17,2],[2,1],[13,1]]),
  tower: P([[8,3],[10,2],[13,2],[5,2],[19,1],[14,1]]),
  cave: P([[4,3],[13,3],[3,2],[11,2],[8,1],[17,1]]),
  holy: P([[19,4],[5,3],[14,2],[2,2],[18,1],[13,1]]),
  industrial: P([[8,4],[9,3],[5,2],[12,1],[15,1]]),
  cosmic: P([[20,4],[13,3],[10,3],[4,2],[14,1],[19,1]]),
});

export const CHEST_BIOME_PROFILES = Object.freeze({
  catacombs:'crypt', castle_keep:'fortress', frozen:'frost', ice_temple:'frost', molten:'infernal', fungal:'forest', sunken:'drowned',
  blood:'blood', ashen:'infernal', void:'shadow', gilded:'gilded', plague:'plague', crystal:'arcane', desert:'desert', shadow:'shadow',
  forge:'infernal', abyss:'drowned', thorn:'forest', storm:'arcane', obsidian:'shadow', flesh:'blood', serpent:'desert', shattered:'fortress',
  library:'arcane', sewers:'plague', necropolis:'crypt', cathedral:'holy', amber:'gilded', overworld:'forest', castle:'fortress', sea_of_sand:'desert',
  dark_forest:'forest', skyship:'ship', pirate_seas:'ship', serpentine_tower:'tower', depths_edge:'cave', mountainside:'frost', desert_temple:'gilded',
  hell:'infernal', astral_plane:'cosmic', heavenly:'holy', throne:'infernal', snowy_summit:'frost', ghost_train:'industrial', endless_siege:'fortress',
  deep_mines:'industrial', great_hunt:'forest', eternal_breach:'cosmic', scorpion_king_pyramid:'desert',
});

// Explicit visual subregions already supplied by generators (not every map
// has a themed variant). These override only the profile, never chest rewards.
export const CHEST_SUBREGION_PROFILES = Object.freeze({
  'sea_of_sand:golden':'gilded', 'sea_of_sand:red':'desert', 'sea_of_sand:gypsum':'holy', 'sea_of_sand:obsidian':'infernal',
  'sea_of_sand:moonlit':'shadow', 'sea_of_sand:saltflats':'desert', 'sea_of_sand:copper':'gilded', 'sea_of_sand:bone':'crypt',
  'sea_of_sand:emerald':'forest', 'sea_of_sand:storm':'arcane',
  'scorpion_king_pyramid:golden':'gilded', 'scorpion_king_pyramid:red':'desert', 'scorpion_king_pyramid:gypsum':'holy',
  'scorpion_king_pyramid:obsidian':'infernal', 'scorpion_king_pyramid:moonlit':'shadow', 'scorpion_king_pyramid:saltflats':'desert',
  'scorpion_king_pyramid:copper':'gilded', 'scorpion_king_pyramid:bone':'crypt', 'scorpion_king_pyramid:emerald':'forest', 'scorpion_king_pyramid:storm':'arcane',
  'great_hunt:wood':'forest', 'great_hunt:tundra':'frost', 'great_hunt:fen':'plague', 'great_hunt:badlands':'desert', 'great_hunt:crags':'cave',
  'endless_siege:keep':'fortress', 'endless_siege:frost':'frost', 'endless_siege:river':'drowned', 'endless_siege:pass':'cave', 'endless_siege:mire':'plague',
  'depths_edge:chalk':'cave', 'depths_edge:moonwell':'arcane', 'depths_edge:rustvein':'industrial', 'depths_edge:verdigris':'drowned',
  'depths_edge:amethyst':'arcane', 'depths_edge:rimebone':'frost',
  'serpentine_tower:serpentine':'forest', 'serpentine_tower:obsidian':'shadow', 'serpentine_tower:bloodstone':'blood',
  'serpentine_tower:rimeglass':'frost', 'serpentine_tower:sunken_bell':'gilded',
  'castle:ironcrown':'fortress', 'castle:blackfen':'plague', 'castle:solenne':'holy', 'castle:sunscar':'desert',
  'castle:hoarfrost':'frost', 'castle:cinderhold':'infernal', 'castle:mourncross':'crypt', 'castle:goldspire':'gilded',
  'castle:bloodmoat':'blood', 'castle:hexenmere':'shadow', 'castle:thornwick':'forest',
});

export function chestAppearanceProfile(biomeId, variantId) {
  return CHEST_APPEARANCE_PROFILES[CHEST_SUBREGION_PROFILES[`${biomeId}:${variantId}`] || CHEST_BIOME_PROFILES[biomeId] || 'neutral'];
}

/** Stable weighted selection based only on environment, world seed, and chest location. */
export function selectDungeonChestVariant({ biomeId, variantId = '', seed = 0, x = 0, y = 0 } = {}) {
  const pool = chestAppearanceProfile(biomeId, variantId);
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  const source = `${biomeId || 'unknown'}|${variantId || ''}|${seed >>> 0}|${x}|${y}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  let roll = (hash >>> 0) % total;
  for (const item of pool) { if (roll < item.weight) return item.id - 1; roll -= item.weight; }
  return pool[0].id - 1;
}
