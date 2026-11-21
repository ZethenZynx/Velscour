import { ARCH } from '../data/enemies.js';

/** Return a spawn roster containing only registered monster archetypes. */
export function validMonsterRoster(world) {
  const from = (ids) => [...new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && ARCH[id]) : [])];
  const current = from(world?.roster);
  if (current.length) return current;
  const biome = from(world?.biome?.roster);
  if (biome.length) return biome;
  return ARCH.skeleton ? ['skeleton'] : Object.keys(ARCH).slice(0, 1);
}

/** Select a registered archetype; callers can provide a seeded picker for tests. */
export function pickMonsterArchetype(world, picker = (ids) => ids[Math.floor(Math.random() * ids.length)]) {
  const roster = validMonsterRoster(world);
  return roster.length ? picker(roster) : null;
}
