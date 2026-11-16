// Chest rarity is separate from equipment quality. Equipment still uses the normal depth-gated loot rolls.
export const CHEST_RARITIES = Object.freeze([
  { id: 0, name: 'Ordinary', weight: 83, color: '#d8ad53', gear: [1, 2], gold: [2, 4], gemChance: 0.30, sigilChance: 0.06, guaranteedGems: 0 },
  { id: 1, name: 'Uncommon', weight: 10, color: '#80c86e', gear: [1, 2], gold: [3, 5], gemChance: 0.40, sigilChance: 0.10, guaranteedGems: 0 },
  { id: 2, name: 'Rare', weight: 4, color: '#80c8ff', gear: [2, 3], gold: [2, 4], gemChance: 0.80, sigilChance: 0.25, guaranteedGems: 0 },
  { id: 3, name: 'Epic', weight: 2, color: '#c090ff', gear: [3, 4], gold: [2, 4], gemChance: 1, sigilChance: 0.40, guaranteedGems: 1 },
  { id: 4, name: 'Legendary', weight: 0.8, color: '#ffb060', gear: [4, 5], gold: [3, 5], gemChance: 1, sigilChance: 0.60, guaranteedGems: 1, extraGemChance: 0.50 },
  { id: 5, name: 'Mythic', weight: 0.2, color: '#20d8c0', gear: [5, 6], gold: [4, 6], gemChance: 1, sigilChance: 0.80, guaranteedGems: 2 },
]);

const CHEST_TYPE_TINT = Object.freeze({
  standard: null,
  gilded: '#ffd060',
  jeweled: '#70d8ff',
  explosive: '#ff6038',
  mimic: null, // Mimics stay visually disguised until opened.
});

/** Roll a type and an independent rarity for one ordinary campaign chest slot. */
export function rollTreasureChest(rng) {
  const group = rng.next() * 100;
  const chestType = group < 61 ? 'standard' : group < 83
    ? rng.pick(['gilded', 'jeweled'])
    : rng.pick(['explosive', 'mimic']);

  let roll = rng.next() * CHEST_RARITIES.reduce((sum, rarity) => sum + rarity.weight, 0);
  let rarity = CHEST_RARITIES[CHEST_RARITIES.length - 1];
  for (const candidate of CHEST_RARITIES) {
    roll -= candidate.weight;
    if (roll < 0) { rarity = candidate; break; }
  }

  return {
    chestType,
    chestRarity: rarity.id,
    rare: rarity.id >= 2,
    glow: rarity.color,
    tint: CHEST_TYPE_TINT[chestType],
    dot: rarity.color,
    label: chestType === 'standard' ? `${rarity.name} Chest` : `${rarity.name} ${chestType[0].toUpperCase()}${chestType.slice(1)} Chest`,
  };
}
