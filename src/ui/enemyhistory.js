export const ENEMY_HISTORY_STORAGE_KEY = 'velscour_enemy_history_v1';
export const ENEMY_HISTORY_LIMIT = 100;

/** Keep only plain, bounded snapshots so enemy history never retains live world objects. */
export function normalizeEnemyHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === 'object' && typeof entry.key === 'string' && typeof entry.name === 'string')
    .slice(-ENEMY_HISTORY_LIMIT).map((entry) => ({
      key: entry.key,
      name: entry.name.slice(0, 120),
      arch: typeof entry.arch === 'string' ? entry.arch : '',
      art: typeof entry.art === 'string' ? entry.art : '',
      swap: entry.swap && typeof entry.swap === 'object' ? entry.swap : null,
      sprite: typeof entry.sprite === 'string' ? entry.sprite : '',
      pal: entry.pal && typeof entry.pal === 'object' ? entry.pal : null,
      rank: typeof entry.rank === 'string' ? entry.rank : 'normal',
      level: finite(entry.level), hp: finite(entry.hp), maxHp: finite(entry.maxHp),
      dmg: finite(entry.dmg), speed: finite(entry.speed), element: typeof entry.el === 'string' ? entry.el : '',
      res: entry.res && typeof entry.res === 'object' ? entry.res : {},
      affixes: Array.isArray(entry.affixes) ? entry.affixes.filter((x) => typeof x === 'string').slice(0, 16) : [],
      dungeonAffixes: Array.isArray(entry.dungeonAffixes) ? entry.dungeonAffixes.filter((x) => typeof x === 'string').slice(0, 24) : [],
      depth: finite(entry.depth), area: typeof entry.area === 'string' ? entry.area.slice(0, 100) : '',
      dead: !!entry.dead,
      thumbnail: typeof entry.thumbnail === 'string' && entry.thumbnail.startsWith('data:image/') && entry.thumbnail.length < 30000 ? entry.thumbnail : '',
    }));
}

function finite(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

export function loadEnemyHistory(storage = globalThis.localStorage) {
  try { return normalizeEnemyHistory(JSON.parse(storage?.getItem(ENEMY_HISTORY_STORAGE_KEY) || '[]')); }
  catch { return []; }
}

export function saveEnemyHistory(history, storage = globalThis.localStorage) {
  try { storage?.setItem(ENEMY_HISTORY_STORAGE_KEY, JSON.stringify(normalizeEnemyHistory(history))); return !!storage; }
  catch { return false; }
}

/** Adds each encountered creature once, retaining the latest 100 records. */
export function appendEnemyHistory(history, snapshot) {
  if (!snapshot?.key || history.some((entry) => entry.key === snapshot.key)) return { added: false, removedOldest: false };
  history.push(snapshot);
  const removedOldest = history.length > ENEMY_HISTORY_LIMIT;
  if (removedOldest) history.splice(0, history.length - ENEMY_HISTORY_LIMIT);
  return { added: true, removedOldest };
}
