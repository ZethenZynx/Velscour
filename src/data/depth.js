// Shared campaign and endgame progression rules.
export const FINAL_DEPTH = 100;
export const ENDGAME_START_DEPTH = FINAL_DEPTH + 1;
export const MAX_DEPTH = Number.MAX_SAFE_INTEGER;
export const MAX_LEVEL = 100;

export const ACTS = [
  { act: 1, name: 'The Forsaken Wilds', start: 1, end: 25, finaleDepth: 25, finaleBoss: 'colossus' },
  { act: 2, name: 'The Scorched Wastes', start: 26, end: 50, finaleDepth: 50, finaleBoss: 'sekhmun' },
  { act: 3, name: 'The Frozen Peaks', start: 51, end: 75, finaleDepth: 75, finaleBoss: 'hollowmere' },
  { act: 4, name: "Velscour's Throne", start: 76, end: 100, finaleDepth: 100, finaleBoss: 'velscour' },
];
export const getActForDepth = (d) => ACTS.find((a) => d >= a.start && d <= a.end) || ACTS[0];
export const isActFinaleDepth = (d) => ACTS.some((a) => a.finaleDepth === d);

// Each campaign boss milestone is an existing raid encounter; act finales use the requested identities.
export const SUPERBOSS_DEPTHS = {
  5: 'valdric', 10: 'pyre', 15: 'maws', 20: 'pontiff', 25: 'colossus',
  30: 'ambrecoil', 35: 'hydra', 40: 'scarab', 45: 'kaela', 50: 'sekhmun',
  55: 'rimehydra', 60: 'bastion', 65: 'thessaly', 70: 'phoenix', 75: 'hollowmere',
  80: 'ophaniel', 85: 'aurion', 90: 'kragmaul', 95: 'organ', 100: 'velscour',
};
export const isSuperbossDepth = (d) => !!SUPERBOSS_DEPTHS[d];
export const superbossForDepth = (d) => SUPERBOSS_DEPTHS[d] || null;
export const isCampaignDepth = (d) => Number.isFinite(Number(d)) && Number(d) >= 1 && Number(d) <= FINAL_DEPTH;
export const isEndgameDepth = (d) => Number(d) >= ENDGAME_START_DEPTH;
// Five-depth boss cadence belongs to the fixed campaign. Infinite dungeons use their
// existing guardian/exit mechanics and do not grow a second every-five-depth boss rule.
export const isRaidDepth = (d) => Number.isSafeInteger(Number(d)) && Number(d) > 0 && Number(d) < FINAL_DEPTH && Number(d) % 5 === 0;
export const blockStart = (d) => Math.floor((Math.max(1, Number(d) || 1) - 1) / 5) * 5 + 1;

// Character level tops out at 100. Endgame monster levels grow slowly and stay finite; a separate
// multiplier (endgameScaling) supplies the continuing Greater-Rift-style pressure.
export const depthLevel = (depth) => {
  const d = Math.max(1, Number.isFinite(Number(depth)) ? Number(depth) : 1);
  if (d <= 30) return Math.round(d);
  if (d <= FINAL_DEPTH) return Math.min(MAX_LEVEL, Math.round(30 + 70 * Math.pow((d - 30) / 70, 0.85)));
  return Math.min(300, MAX_LEVEL + Math.floor(Math.log1p((d - FINAL_DEPTH) / 100) * 10));
};

// About +17% health and +2.3% damage per 25 depths, compounded. Log space prevents overflow
// even if a save reaches the largest safely representable JavaScript depth.
const MAX_SCALE_LOG = Math.log(1e100);
export function endgameScaling(depth) {
  const steps = Math.max(0, (Number(depth) - FINAL_DEPTH) / 25 || 0);
  const hpLog = Math.min(MAX_SCALE_LOG, steps * Math.log(1.17));
  const dmgCapLog = Math.log(1e20), dmgLog = Math.min(dmgCapLog, steps * Math.log(1.023));
  return { health: Math.min(1e100, Math.exp(hpLog)), damage: Math.min(1e20, Math.exp(dmgLog)) };
}

export const armorDiv = (lvl) => Math.round(40 + lvl * 14 + 0.12 * lvl * lvl);
export const fortitude = (_level) => 1;
export function logCurve(T, x) {
  if (x <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (x <= T[i][0]) {
    const [x0, a] = T[i - 1], [x1, b] = T[i];
    return a * Math.pow(b / a, (x - x0) / (x1 - x0));
  }
  return T[T.length - 1][1];
}
export const toughness = (lvl) => (lvl <= 10 ? 1 : 1 + Math.pow((lvl - 10) / 90, 1.5) * 6.5);
export const riftHold = (_lvl) => 1;
export const danger = (lvl) => (lvl <= 10 ? 1 : 1 + Math.pow((lvl - 10) / 90, 1.4) * 2.2);
export const density = (d) => 1 + Math.min(d, 120) * 0.006;
const OLD_DENSITY = (d) => 1.1 + Math.min(d, 120) * 0.013;
export const densityXp = (lvl) => { const d = lvl <= 40 ? lvl : 40 + (lvl - 40) * 4; return OLD_DENSITY(d) / density(d); };
export const dmgScale = (_lvl) => 1;
export const shownDmg = (raw, _lvl) => raw;
export const weaponRef = (lvl) => 6 + lvl * 1.8 + 0.022 * lvl * lvl;
export const shownWeapon = (raw, _lvl) => raw;
export const heroDmgLevel = (c) => depthLevel((c && c.depth) || 1);
