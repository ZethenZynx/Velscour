// The loot filter (Settings > Loot filter): which item types and rarities auto-pickup grabs. Ground labels have a
// separately saved filter, initially copied from this one to preserve existing behavior. Clicking an item always picks it up.
import { G } from '../state.js';

/** Filter rows: what each covers. Rarity rows hold the lowest rarity to keep (-1: none of them). */
export const FILTER_ROWS = [
  { k: 'weapon', name: 'Weapons', test: (it) => it.slot === 'weapon' },
  { k: 'offhand', name: 'Off-hands', test: (it) => it.slot === 'offhand' },
  { k: 'armor', name: 'Armor (head, body, hands, legs, feet)', test: (it) => it.slot !== 'weapon' && it.slot !== 'offhand' && it.slot !== 'ring' },
  { k: 'ring', name: 'Rings', test: (it) => it.slot === 'ring' },
];
export const FILTER_DEFAULT = { on: false, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: 0, upgrades: true, keep: false };

/** The filter's settings, filled with defaults (old settings have none). */
export function lootFilter() {
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  const f = G.settings.lootFilter;
  if (!f || typeof f !== 'object') return (G.settings.lootFilter = { ...FILTER_DEFAULT });
  for (const k in FILTER_DEFAULT) if (f[k] === undefined) f[k] = FILTER_DEFAULT[k];
  // Migrate legacy boolean gems to tier grade (true -> 0: all, false -> -1: none)
  if (f.gems === true) f.gems = 0;
  else if (f.gems === false) f.gems = -1;
  return f;
}
/** The filter when it's switched on, else null. */
export const activeFilter = () => { const f = lootFilter(); return f && f.on ? f : null; };

/** The ground-label filter keeps the same item categories but has its own settings. */
const LABEL_FILTER_DEFAULT = { on: false, weapon: 0, offhand: 0, armor: 0, ring: 0, gems: 0 };

/** Fill defaults for old saves; seed new label settings from the former shared filter behavior. */
export function lootLabelFilter() {
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  let f = G.settings.lootLabelFilter;
  if (!f || typeof f !== 'object') {
    const old = lootFilter();
    f = G.settings.lootLabelFilter = Object.fromEntries(Object.keys(LABEL_FILTER_DEFAULT).map((k) => [k, old[k]]));
  }
  for (const k in LABEL_FILTER_DEFAULT) if (f[k] === undefined) f[k] = LABEL_FILTER_DEFAULT[k];
  if (f.gems === true) f.gems = 0;
  else if (f.gems === false) f.gems = -1;
  return f;
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
/** Should auto-play keep this item (store it in the chest) rather than sell it? */
export const filterKeeps = (it) => { const f = activeFilter(); return !!(f && f.keep && it && !it.sealed && filterPasses(it)); };
