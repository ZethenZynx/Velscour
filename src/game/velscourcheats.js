// Name matching for the Contact Velscour testing shortcuts.
export function normalizeLevelCheatName(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^the /, '');
}

/** Return the matching biome for a typed display name, including the standalone Breach biome. */
export function resolveLevelCheatName(value, biomes, breachBiome) {
  let name = normalizeLevelCheatName(value);
  if (name.endsWith(' depth 500')) name = name.slice(0, -' depth 500'.length).trim();
  const named = [...Object.values(biomes || {}), breachBiome]
    .filter(Boolean)
    .find((biome) => normalizeLevelCheatName(biome.name) === name);
  if (named) return named;
  const subtitleAliases = {
    'celestial expanse': 'astral_plane',
    'empyrean citadel': 'heavenly',
    'infernal dominion': 'hell',
  };
  return biomes?.[subtitleAliases[name]] || null;
}
