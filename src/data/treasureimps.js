// The Treasure Imp family shares one encounter and reward pipeline. Weights are relative (not spawn chances),
// so an encounter keeps the same overall frequency when a progression-locked variant is removed from the pool.
const TREASURE_IMP_DATA = [
  { id: 'treasure', name: 'Treasure Imp', color: '#ff403b', rarity: 'common', weight: 100, reward: 'gold', summary: 'A shower of gold, with a chance of equipment and gems.' },
  { id: 'blood', name: 'Blood Imp', color: '#d73a5d', rarity: 'uncommon', weight: 35, reward: 'blood', summary: 'A timed combat blessing for damage, attack speed, critical chance, and movement.' },
  { id: 'relic', name: 'Relic Imp', color: '#f07b28', rarity: 'uncommon', weight: 35, reward: 'relic', summary: 'Several equipment drops rolled within the current depth and rarity limits.' },
  { id: 'merchant', name: 'Merchant Imp', color: '#c98953', rarity: 'uncommon', weight: 30, reward: 'merchant', summary: 'Equipment with elevated vendor value, plus extra gold.' },
  { id: 'hoarder', name: 'Hoarder Imp', color: '#9b744e', rarity: 'common', weight: 85, reward: 'hoarder', summary: 'A mixed cache of gold, gems, and eligible equipment.' },
  { id: 'jackpot', name: 'Jackpot Imp', color: '#ffd331', rarity: 'extremely rare', weight: 1, reward: 'jackpot', summary: 'A very rare large payout of gold, gems, and eligible equipment.' },
  { id: 'jewel', name: 'Jewel Imp', color: '#f3d82e', rarity: 'uncommon', weight: 35, reward: 'jewel', summary: 'Several gems within the character’s current drop eligibility.' },
  { id: 'alchemist', name: 'Alchemist Imp', color: '#a9df36', rarity: 'uncommon', weight: 30, reward: 'alchemist', summary: 'Existing potions and a short health-regeneration blessing.' },
  { id: 'vitality', name: 'Vitality Imp', color: '#59c848', rarity: 'common', weight: 85, reward: 'vitality', summary: 'Health orbs and a temporary regeneration and maximum-health blessing.' },
  { id: 'prosperity', name: 'Prosperity Imp', color: '#35c9b1', rarity: 'rare', weight: 12, reward: 'prosperity', summary: 'A timed gold-find and magic-find blessing, with some gold.' },
  { id: 'sigil', name: 'Sigil Imp', color: '#35d8e5', rarity: 'rare', weight: 12, reward: 'sigil', summary: 'Existing Sigil Stones, limited by the current dungeon depth.' },
  { id: 'arcane', name: 'Arcane Imp', color: '#477ce6', rarity: 'common', weight: 85, reward: 'arcane', summary: 'Mana orbs and a temporary mana-regeneration blessing.' },
  { id: 'set', name: 'Set Imp', color: '#6768bd', rarity: 'very rare', weight: 4, reward: 'set', summary: 'One eligible Covenant Set piece; available only after endgame unlock at Tier 20 depth.', endgameOnly: true, minDepth: 456 },
  { id: 'enchanted', name: 'Enchanted Imp', color: '#ad49dd', rarity: 'rare', weight: 12, reward: 'enchanted', summary: 'Equipment rolled with better eligible rarity and affix odds.' },
  { id: 'mystic', name: 'Mystic Imp', color: '#c69be9', rarity: 'rare', weight: 12, reward: 'mystic', summary: 'Higher-tier eligible gems, favoring the character’s current level.' },
  { id: 'fortune', name: 'Fortune Imp', color: '#ec6fb9', rarity: 'rare', weight: 12, reward: 'fortune', summary: 'High-rarity eligible equipment, without bypassing rarity or set restrictions.' },
  { id: 'celestial', name: 'Celestial Imp', color: '#fff1cf', rarity: 'rare', weight: 12, reward: 'celestial', summary: 'A random existing shrine blessing, with a small chance of a second blessing.' },
  // Sigil Stones and gems are existing socketing/fusion resources; no new crafting currency is introduced.
  { id: 'artisan', name: 'Artisan Imp', color: '#c4cbd2', rarity: 'rare', weight: 12, reward: 'artisan', summary: 'Sigil Stones and a gem, using existing socketing and fusion resources.' },
  { id: 'abyssal', name: 'Abyssal Imp', color: '#d93431', rarity: 'very rare', weight: 4, reward: 'abyssal', summary: 'An Infernal Mark from an eligible unlocked endgame activity.', endgameOnly: true, minDepth: 101 },
  { id: 'prismatic', name: 'Prismatic Imp', color: '#eaa5fa', rarity: 'extremely rare', weight: 0.65, reward: 'prismatic', summary: 'A rare bundle that combines three to five eligible reward families.' },
];

const IMP_EFFECTS = Object.freeze({
  treasure: 'goldfall', blood: 'blood', relic: 'metal', merchant: 'copper', hoarder: 'loot', jackpot: 'goldfall',
  jewel: 'crystal', alchemist: 'potion', vitality: 'leaf', prosperity: 'fortune', sigil: 'sigil', arcane: 'mana',
  set: 'armor', enchanted: 'arcane', mystic: 'crystal', fortune: 'lucky', celestial: 'holy', artisan: 'metal',
  abyssal: 'shadow', prismatic: 'prismatic',
});
export const TREASURE_IMPS = Object.freeze(TREASURE_IMP_DATA.map((imp) => Object.freeze({ ...imp, effect: IMP_EFFECTS[imp.id] })));

export const IMP_BY_ID = Object.freeze(Object.fromEntries(TREASURE_IMPS.map((imp) => [imp.id, imp])));
export const IMP_SPRITE_PATH = (id) => `assets/sprites/treasure-imps/${id}.png`;
export const IMP_MAX_FOREGROUND_PIXELS = 70;
export const TREASURE_IMP_SPAWN_DELAY_MIN = 30;
export const TREASURE_IMP_SPAWN_DELAY_MAX = 120;
export const TREASURE_IMP_SPAWN_RETRY_DELAY = 5;

/** A pause-aware countdown shared by guaranteed and chance-based imp spawns. */
export function advanceTreasureImpSpawnTimer(remaining, dt, paused = false) {
  const time = Number(remaining);
  if (!Number.isFinite(time) || time <= 0 || paused) return Math.max(0, Number.isFinite(time) ? time : 0);
  return Math.max(0, time - Math.max(0, Number(dt) || 0));
}

/** Convert a unit random value into the inclusive delay range used for new environments. */
export function treasureImpSpawnDelay(random = Math.random) {
  const unit = Math.max(0, Math.min(1 - Number.EPSILON, Number(random()) || 0));
  return TREASURE_IMP_SPAWN_DELAY_MIN + unit * (TREASURE_IMP_SPAWN_DELAY_MAX - TREASURE_IMP_SPAWN_DELAY_MIN);
}

/** Stable per-environment key: different biomes at the same depth remain independent. */
export function treasureImpAreaKey(world = {}) {
  if (world.impAreaKey) return String(world.impAreaKey);
  const biome = world.biome?.id || 'dungeon';
  if (world.breach) return `breach:${world.breach.floor}`;
  if (world.rift) return `rift:${world.rift.tier}:${biome}`;
  if (world.unboundExploration) return `unbound:${world.unboundExploration.floor}`;
  return `${biome}:${Math.max(1, Math.floor(Number(world.depth) || 1))}`;
}

export function hasTreasureImpArea(areaKey, savedAreas) {
  return typeof areaKey === 'string' && Array.isArray(savedAreas) && savedAreas.includes(areaKey);
}

export function treasureImpSpriteScale(originalSpriteHeight, creatureScale = 1) {
  const h = Math.max(1, Number(originalSpriteHeight) || 1);
  const s = Math.max(0.01, Number(creatureScale) || 1);
  return h / (IMP_MAX_FOREGROUND_PIXELS * s);
}

export const IMP_MOVEMENT_PATTERNS = Object.freeze([
  Object.freeze({ id: 'steady', weight: 35, turnMin: 1.2, turnMax: 1.9, spread: 0.2, side: 0.05, speed: 1.0 }),
  Object.freeze({ id: 'zigzag', weight: 25, turnMin: 0.55, turnMax: 0.9, spread: 0.28, side: 0.72, speed: 1.04 }),
  Object.freeze({ id: 'darting', weight: 17, turnMin: 0.35, turnMax: 0.65, spread: 0.62, side: 0.3, speed: 1.32 }),
  Object.freeze({ id: 'feinting', weight: 15, turnMin: 0.65, turnMax: 1.05, spread: 0.92, side: 0.48, speed: 1.12 }),
  Object.freeze({ id: 'erratic', weight: 8, turnMin: 0.18, turnMax: 0.36, spread: 1.35, side: 0.45, speed: 1.06 }),
]);
export function selectImpMovementPattern(random = Math.random) {
  const total = IMP_MOVEMENT_PATTERNS.reduce((sum, pattern) => sum + pattern.weight, 0);
  let roll = Math.max(0, Math.min(0.999999999999, Number(random()) || 0)) * total;
  return IMP_MOVEMENT_PATTERNS.find((pattern) => (roll -= pattern.weight) < 0) || IMP_MOVEMENT_PATTERNS.at(-1);
}

export function treasureImpEligible(imp, { depth = 1, endgameUnlocked = false, canEarnMarks = false } = {}) {
  if (!imp || !Number.isFinite(Number(depth))) return false;
  if (imp.endgameOnly && !endgameUnlocked) return false;
  if (imp.minDepth && Number(depth) < imp.minDepth) return false;
  if (imp.id === 'abyssal' && !canEarnMarks) return false;
  return true;
}

/** Select from eligible variants only; locked weights are thereby redistributed among the available entries. */
export function selectTreasureImp(context, random = Math.random) {
  const pool = TREASURE_IMPS.filter((imp) => treasureImpEligible(imp, context));
  if (!pool.length) return IMP_BY_ID.treasure;
  const total = pool.reduce((sum, imp) => sum + imp.weight, 0);
  let roll = Math.max(0, Math.min(0.999999999999, Number(random()) || 0)) * total;
  for (const imp of pool) if ((roll -= imp.weight) < 0) return imp;
  return pool[pool.length - 1];
}

/** A Prismatic Imp chooses distinct, currently eligible reward families and cannot recursively choose itself. */
export function selectPrismaticRewards(context, random = Math.random) {
  const pool = TREASURE_IMPS.filter((imp) => imp.id !== 'prismatic' && treasureImpEligible(imp, context));
  const count = Math.min(pool.length, 3 + Math.floor(Math.max(0, Math.min(0.999999999999, Number(random()) || 0)) * 3));
  const picked = [];
  while (picked.length < count && pool.length) {
    const total = pool.reduce((sum, imp) => sum + imp.weight, 0);
    let roll = Math.max(0, Math.min(0.999999999999, Number(random()) || 0)) * total;
    const at = pool.findIndex((imp) => (roll -= imp.weight) < 0);
    picked.push(pool.splice(at < 0 ? pool.length - 1 : at, 1)[0]);
  }
  return picked;
}
