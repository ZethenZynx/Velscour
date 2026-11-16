// The Endgame's shared record (docs/ENDGAME.md): what every hero on this browser shares once any of them has slain
// Velscour for real: the unlock, the Infernal Marks (game/marks.js), the best Abyssal Rift per class, counters. It lives in
// its own localStorage key beside the heroes' saves and the Reliquary.
import { G } from '../state.js';
import { FINAL_DEPTH } from '../data/depth.js';

const KEY = 'velscour_endgame_v1';
export const MARK_CATS = ['life', 'crit', 'mf', 'rift'];
let E = null;

function blank() { return { v: 1, unlocked: 0, marks: { pts: 0, xp: 0, spent: { life: 0, crit: 0, mf: 0, rift: 0 } }, bests: {}, keysFound: 0, unboundWins: 0 }; }
/** A record with every field present and sane (a damaged one keeps what it can). */
export function fixEndgame(r) {
  const o = blank();
  if (!r || typeof r !== 'object') return o;
  o.unlocked = Number(r.unlocked) > 0 ? Number(r.unlocked) : 0;
  const m = r.marks && typeof r.marks === 'object' ? r.marks : {};
  o.marks.pts = Math.max(0, Math.floor(Number(m.pts) || 0));
  o.marks.xp = Math.max(0, Number(m.xp) || 0);
  for (const k of MARK_CATS) o.marks.spent[k] = Math.max(0, Math.floor(Number(m.spent && m.spent[k]) || 0));
  let sum = MARK_CATS.reduce((s, k) => s + o.marks.spent[k], 0);
  for (const k of MARK_CATS) if (sum > o.marks.pts) { const cut = Math.min(o.marks.spent[k], sum - o.marks.pts); o.marks.spent[k] -= cut; sum -= cut; }
  if (r.bests && typeof r.bests === 'object') for (const [cls, b] of Object.entries(r.bests)) if (b && Number(b.tier) > 0) o.bests[cls] = { tier: Math.floor(Number(b.tier)), time: Math.max(0, Number(b.time) || 0), at: Number(b.at) || 0 };
  o.keysFound = Math.max(0, Math.floor(Number(r.keysFound) || 0));
  o.unboundWins = Math.max(0, Math.floor(Number(r.unboundWins) || 0));
  return o;
}
/** The shared record (loaded once). */
export function endgame() {
  if (E) return E;
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { r = null; }
  E = fixEndgame(r);
  return E;
}
/** Write the record; quiet is retained for existing call sites. */
export function saveEndgame(quiet) {
  try { localStorage.setItem(KEY, JSON.stringify(endgame())); } catch (e) { /* storage full or blocked: it lives on for this visit */ }
}
/** Tests: forget the cached copy (the next call reads localStorage again). */
export function resetEndgameCache() { E = null; }

/** Has the Endgame opened: any hero on this browser slew Velscour, or this hero cleared depth 500. */
export function endgameUnlocked(c = G.char) { return !!(endgame().unlocked || (c && c.cleared && c.cleared[FINAL_DEPTH])); }
/** Velscour slain for real: the altar and the rift gate open for every hero. */
export function unlockEndgame() {
  const r = endgame();
  if (r.unlocked) return false;
  r.unlocked = Date.now();
  saveEndgame();
  return true;
}
/** A better rift than the account's best for this class? Higher tier, or the same tier faster. */
export const betterRift = (a, b) => !!b && (!a || b.tier > a.tier || (b.tier === a.tier && b.time < a.time));
export function noteRiftBest(cls, tier, time) {
  const r = endgame(), b = { tier, time: Math.round(time * 10) / 10, at: Date.now() };
  if (!betterRift(r.bests[cls], b)) return false;
  r.bests[cls] = b;
  saveEndgame();
  return true;
}
