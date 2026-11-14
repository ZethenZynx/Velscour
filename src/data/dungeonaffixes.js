// Campaign dungeon affixes: one is gained for every five minutes survived, up to five.
export const DUNGEON_AFFIX_INTERVAL = 5 * 60;
export const MAX_DUNGEON_AFFIXES = 5;

export const DUNGEON_AFFIXES = Object.freeze([
  { id: 'strong', name: 'Extra Strong', description: 'Enemies deal 20% more damage.' },
  { id: 'fast', name: 'Extra Fast', description: 'Enemies move faster and attack more often.' },
  { id: 'tough', name: 'Stone Skin', description: 'Enemies have more health and resist damage.' },
  { id: 'fiery', name: 'Fire Enchanted', description: 'Enemies burn you with melee attacks and explode when slain.' },
  { id: 'frozen', name: 'Cold Aura', description: 'Enemies chill nearby heroes and resist cold damage.' },
  { id: 'shocking', name: 'Lightning Enchanted', description: 'Enemies discharge lightning when struck.' },
  { id: 'vampiric', name: 'Vampiric', description: 'Enemies heal when they damage you.' },
  { id: 'multishot', name: 'Multishot', description: 'Ranged and caster enemies fire additional projectiles.' },
  { id: 'thorns', name: 'Thorns', description: 'Enemies reflect some damage when hit.' },
  { id: 'regen', name: 'Regenerating', description: 'Enemies recover health while out of combat.' },
]);
const AFFIX_BY_ID = new Map(DUNGEON_AFFIXES.map((affix) => [affix.id, affix]));
export const DUNGEON_AFFIX_BY_ID = Object.fromEntries(AFFIX_BY_ID);

export function dungeonAffixCount(seconds) {
  return Math.min(MAX_DUNGEON_AFFIXES, Math.floor(Math.max(0, Number(seconds) || 0) / DUNGEON_AFFIX_INTERVAL));
}

export function chooseDungeonAffix(currentIds = [], random = Math.random) {
  if (currentIds.length >= MAX_DUNGEON_AFFIXES) return null;
  const used = new Set(currentIds);
  const available = DUNGEON_AFFIXES.filter((affix) => !used.has(affix.id));
  if (!available.length) return null;
  const index = Math.min(available.length - 1, Math.floor(random() * available.length));
  return available[index];
}

export function normalizeDungeonAffixRun(value) {
  const source = value && typeof value === 'object' ? value : {};
  const affixes = [...new Set(Array.isArray(source.affixes) ? source.affixes.filter((id) => AFFIX_BY_ID.has(id)) : [])]
    .slice(0, MAX_DUNGEON_AFFIXES);
  const rawSeconds = Number(source.seconds);
  const seconds = Number.isFinite(rawSeconds) ? Math.max(0, rawSeconds) : 0;
  return {
    seconds: Math.min(DUNGEON_AFFIX_INTERVAL * MAX_DUNGEON_AFFIXES, Math.max(seconds, affixes.length * DUNGEON_AFFIX_INTERVAL)),
    affixes,
  };
}

function addResistance(monster, element, amount) {
  monster.res ||= {};
  monster.res[element] = (monster.res[element] || 0) + amount;
}

/** Attach a campaign affix to one enemy, applying its stat changes only once. */
export function applyDungeonAffix(monster, id) {
  if (!monster || monster.team !== 'enemy' || monster.dead || !AFFIX_BY_ID.has(id)) return false;
  if (id === 'multishot' && !['ranged', 'caster'].includes(monster.ai)) return false;
  monster.dungeonAffixIds ||= [];
  if (monster.dungeonAffixIds.includes(id)) return false;
  monster.dungeonAffixIds.push(id);
  monster.affixes ||= [];
  // Elite affixes have already applied their stat changes in makeElite().
  if (monster.affixes.includes(id)) return true;
  monster.affixes.push(id);
  switch (id) {
    case 'strong': monster.dmg *= 1.2; break;
    case 'fast':
      monster.speed *= 1.15;
      monster.atkCd *= 0.9;
      break;
    case 'tough':
      monster.maxHp *= 1.3;
      monster.hp = Math.min(monster.maxHp, monster.hp * 1.3);
      for (const element of ['phys', 'fire', 'cold', 'light', 'poison']) addResistance(monster, element, 0.08);
      break;
    case 'fiery': addResistance(monster, 'fire', 0.15); break;
    case 'frozen': addResistance(monster, 'cold', 0.15); break;
  }
  return true;
}