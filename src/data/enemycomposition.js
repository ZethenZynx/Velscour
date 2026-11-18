// Soft role targets for ordinary dungeon packs. A region only uses roles represented by its own roster.
export const ENCOUNTER_ROLE_TARGETS = Object.freeze({ melee: 0.35, ranged: 0.25, caster: 0.2, support: 0.1, special: 0.1 });

const SPECIAL_BEHAVIORS = new Set(['charging_rush', 'underground_ambush', 'tunnel_pursuit', 'eruption_attack', 'burrow_retreat', 'unstable_death']);
const SUPPORT_BEHAVIORS = new Set(['minion_summoning', 'corpse_reanimation', 'portal_summoning', 'sacrificial_summoning', 'ally_healing', 'protective_barrier', 'battle_chant', 'emergency_resurrection']);

export function encounterRole(arch, ai, behaviors = []) {
  if (ai === 'charger' || ai === 'exploder' || behaviors.some((b) => SPECIAL_BEHAVIORS.has(b))) return 'special';
  if (ai === 'ranged' || ai === 'turret') return 'ranged';
  if (ai === 'caster' || ai === 'nova' || ai === 'beamer') {
    if (behaviors.some((b) => SUPPORT_BEHAVIORS.has(b))) return 'support';
    return 'caster';
  }
  if (ai === 'aura' || ai === 'follow' || behaviors.some((b) => SUPPORT_BEHAVIORS.has(b))) return 'support';
  return 'melee';
}

/** Choose a themed archetype from an available biome roster, favoring underrepresented roles and avoiding streaks. */
export function chooseEncounterArchetype(roster, counts, recentRoles, getInfo, rng) {
  const candidates = [...new Set(roster)].map((arch) => ({ arch, ...getInfo(arch) })).filter((x) => x.role && x.packMax > 0);
  if (!candidates.length) return roster[Math.floor(rng.next() * roster.length)];
  const available = [...new Set(candidates.map((x) => x.role))];
  const targetTotal = available.reduce((sum, role) => sum + (ENCOUNTER_ROLE_TARGETS[role] || 0), 0) || 1;
  const specialPacks = candidates.filter((x) => x.role === 'special').map((x) => x.packMax);
  const largestSpecialPack = specialPacks.length ? Math.max(...specialPacks) : 0;
  let roles = available.filter((role) => role !== 'special' || !available.some((r) => r !== 'special') ||
    counts.total === 0 || counts.special + largestSpecialPack <= (counts.total + largestSpecialPack) * 0.2);
  if (!roles.length) roles = available.filter((role) => role !== 'special');
  if (!roles.length) roles = available; // A specialist-only roster keeps its regional identity.
  const lastRole = recentRoles.at(-1), previousRole = recentRoles.at(-2);
  if (lastRole && lastRole === previousRole && roles.length > 1) roles = roles.filter((role) => role !== lastRole);
  let weights = roles.map((role) => {
    const target = (ENCOUNTER_ROLE_TARGETS[role] || 0) / targetTotal;
    const share = counts.total ? (counts[role] || 0) / counts.total : 0;
    const deficit = Math.max(0.015, target - share + 0.04);
    return deficit * (recentRoles.includes(role) && roles.length > 1 ? 0.28 : 1);
  });
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0), role = roles[roles.length - 1];
  for (let i = 0; i < roles.length; i++) { roll -= weights[i]; if (roll < 0) { role = roles[i]; break; } }
  const pool = candidates.filter((x) => x.role === role);
  return pool[Math.floor(rng.next() * pool.length)].arch;
}
