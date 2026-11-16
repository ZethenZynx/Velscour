// The loot filter (Settings > Loot filter): which item types and rarities auto-pickup grabs. Ground labels have a
// separately saved filter, initially copied from this one to preserve existing behavior. Clicking an item always picks it up.
import { G, saveSettings } from '../state.js';

/** Filter rows: what each covers. Rarity rows hold the lowest rarity to keep (-1: none of them). */
export const FILTER_ROWS = [
  { k: 'weapon', name: 'Weapons', test: (it) => it.slot === 'weapon' },
  { k: 'offhand', name: 'Off-hands', test: (it) => it.slot === 'offhand' },
  { k: 'armor', name: 'Armor (head, body, hands, legs, feet)', test: (it) => it.slot !== 'weapon' && it.slot !== 'offhand' && it.slot !== 'ring' },
  { k: 'ring', name: 'Rings', test: (it) => it.slot === 'ring' },
];
export const FILTER_DEFAULT = { on: false, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: 0, upgrades: true, keep: false };

const LABEL_FILTER_DEFAULT = { on: false, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: 0 };

function normalizedFilter(target, key, defaults, fallback) {
  let f = target[key];
  if (!f || typeof f !== 'object') f = target[key] = { ...(fallback || defaults) };
  for (const k in defaults) if (f[k] === undefined) f[k] = defaults[k];
  if (f.gems === true) f.gems = 0;
  else if (f.gems === false) f.gems = -1;
  return f;
}

/** Copy the former shared settings into a character the first time it is loaded. */
export function initializeCharacterLootFilters(char) {
  if (!char || typeof char !== 'object') return;
  const legacyLoot = G.settings && G.settings.lootFilter;
  const legacyLabels = G.settings && G.settings.lootLabelFilter;
  normalizedFilter(char, 'lootFilter', FILTER_DEFAULT, legacyLoot);
  const labelFallback = legacyLabels && typeof legacyLabels === 'object'
    ? legacyLabels
    : Object.fromEntries(Object.keys(LABEL_FILTER_DEFAULT).map((k) => [k, char.lootFilter[k]]));
  normalizedFilter(char, 'lootLabelFilter', LABEL_FILTER_DEFAULT, labelFallback);
}

/** Persist filter edits to the active hero; title-screen edits remain shared for characters without saved profiles. */
export function saveLootFilterSettings() {
  if (G.char) {
    if (G.game && typeof G.game.autosave === 'function') G.game.autosave();
  } else saveSettings();
}

/** The filter's settings, filled with defaults (old settings have none). */
export function lootFilter() {
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  const target = G.char || G.settings;
  if (G.char && (!G.char.lootFilter || typeof G.char.lootFilter !== 'object')) initializeCharacterLootFilters(G.char);
  return normalizedFilter(target, 'lootFilter', FILTER_DEFAULT, null);
}
/** The filter when it's switched on, else null. */
export const activeFilter = () => { const f = lootFilter(); return f && f.on ? f : null; };

/** The ground-label filter keeps the same item categories but has its own character settings. */
export function lootLabelFilter() {
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  const target = G.char || G.settings;
  if (G.char && (!G.char.lootLabelFilter || typeof G.char.lootLabelFilter !== 'object')) initializeCharacterLootFilters(G.char);
  return normalizedFilter(target, 'lootLabelFilter', LABEL_FILTER_DEFAULT, null);
}
/** The label filter when it is switched on, else null. */
export const activeLabelFilter = () => { const f = lootLabelFilter(); return f && f.on ? f : null; };

function passesFilter(it, f) {
  if (!f || !it) return true;
  if (it.type === 'gem') {
    const minTier = f.gems === true ? 0 : f.gems === false ? -1 : (typeof f.gems === 'number' ? f.gems : 0);
    if (minTier < 0) return false;
    // Sigil stones always pass when gems are enabled.
    if (it.gem === 'sig') return true;
    return (it.tier ?? 0) >= minTier;
  }
  if (it.type !== 'gear' || it.sealed) return true;
  const row = (FILTER_ROWS || []).find((r) => r.test && r.test(it));
  const min = row ? (f[row.k] ?? 0) : 0;
  return min >= 0 && (it.rarity || 0) >= min;
}

/** Does item `it` pass the auto-pickup filter? (Everything passes while it is off.) */
export function filterPasses(it) {
  return passesFilter(it, activeFilter());
}

/** Does item `it` get an unprompted ground label? */
export function labelFilterPasses(it) {
  return passesFilter(it, activeLabelFilter());
}
export const filterKeeps = (it) => { const f = activeFilter(); return !!(f && f.keep && it && !it.sealed && filterPasses(it)); };
