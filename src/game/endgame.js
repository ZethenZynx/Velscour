// The Endgame's shared record (docs/ENDGAME.md): what every hero on this browser shares once any of them has slain
// Velscour for real: the unlock, the Infernal Marks (game/marks.js), the best Abyssal Rift per class, counters. It lives in
// its own localStorage key beside the heroes' saves and the Reliquary.
import { G } from '../state.js';
import { FINAL_DEPTH } from '../data/depth.js';
import { INFERNAL_UPGRADES } from '../data/infernalupgrades.js';

const KEY = 'velscour_endgame_v1';
const MARKS_RESET_VERSION = 2;
export const MARK_CATS = INFERNAL_UPGRADES.map((u) => u.id);
let E = null;

function blank() { return { v: 1, marksResetVersion: MARKS_RESET_VERSION, unlocked: 0, marks: { pts: 0, xp: 0, spentValue: 0, rewardRemainder: 0, legacyFerocity: 0, spent: Object.fromEntries(MARK_CATS.map((id) => [id, 0])) }, storageRefundV1: { heroes: {}, reliquary: false }, bests: {}, keysFound: 0, unboundWins: 0 }; }
/** A record with every field present and sane (a damaged one keeps what it can). */
export function fixEndgame(r) {
  const o = blank();
  if (!r || typeof r !== 'object') return o;
  const version = Number(r.marksResetVersion) || 0;
  const resetLegacyMarks = version < 1;
  o.marksResetVersion = MARKS_RESET_VERSION;
  o.unlocked = Number(r.unlocked) > 0 ? Number(r.unlocked) : 0;
  const m = r.marks && typeof r.marks === 'object' ? r.marks : {};
  // The historical v1 reset removed campaign-era points. Keep that policy for v0 data;
  // the v1 -> v2 upgrade below preserves valid progression and refunds removed Fortune.
  o.marks.pts = resetLegacyMarks ? 0 : Math.max(0, Math.floor(Number(m.pts) || 0));
  o.marks.xp = resetLegacyMarks ? 0 : Math.max(0, Number(m.xp) || 0);
  if (!resetLegacyMarks && version < 2) {
    const old = m.spent && typeof m.spent === 'object' ? m.spent : {};
    const oldLife = Math.max(0, Math.floor(Number(old.life) || 0));
    const oldCrit = Math.max(0, Math.floor(Number(old.crit) || 0));
    const oldHaste = Math.max(0, Math.floor(Number(old.rift) || 0));
    o.marks.spent.vitality = oldLife;
    // Keep purchased ranks intact even when they exceed the new cap. The registry
    // caps their effect, while the rank record remains available for migration/UI.
    o.marks.spent.crit = oldCrit;
    const legacyCritDamage = oldCrit > 0 ? 0.5 * (140 * (Math.sqrt(1 + oldCrit / 100) - 1)) : 0;
    o.marks.spent.ferocity = Math.min(50, Math.floor(legacyCritDamage / 2));
    o.marks.spent.haste = oldHaste;
    // Precision's former critical-damage component moves to Ferocity without
    // consuming a second rank or duplicating the bonus on Crit.
    o.marks.legacyFerocity = Math.round((legacyCritDamage - o.marks.spent.ferocity * 2) * 100) / 100;
    // Removed Fortune is fully refunded. Haste keeps its ranks, now affecting
    // casting only; old Crit damage is moved to Ferocity without duplicate ranks.
    // Marks.pts is the lifetime wallet (external purchases decrement it); removing
    // these ranks from spentValue below makes the removed ranks available again.
    o.marks.spentValue = oldLife + oldCrit + oldHaste;
    o.marks.rewardRemainder = 0;
  } else if (!resetLegacyMarks) {
    for (const id of MARK_CATS) o.marks.spent[id] = Math.max(0, Math.floor(Number(m.spent?.[id]) || 0));
    o.marks.spentValue = Math.max(0, Math.floor(Number(m.spentValue) || 0));
    o.marks.rewardRemainder = Math.max(0, Math.min(0.999999, Number(m.rewardRemainder) || 0));
    o.marks.legacyFerocity = Math.max(0, Number(m.legacyFerocity) || 0);
  }
  if (resetLegacyMarks) { o.marks.pts = 0; o.marks.xp = 0; o.marks.spentValue = 0; }
  const sumRanks = MARK_CATS.reduce((sum, id) => sum + o.marks.spent[id], 0);
  // A v2 record missing spentValue is repaired using legacy one-Mark-per-rank accounting.
  if (o.marks.spentValue === 0 && sumRanks > 0 && version >= 2) o.marks.spentValue = sumRanks;
  if (o.marks.spentValue > o.marks.pts) o.marks.spentValue = o.marks.pts;
  // Keep purchased rank history intact. Legacy purchases used one Mark per rank;
  // v2 purchases use escalating costs, so rank counts are not a reliable wallet check.
  if (r.bests && typeof r.bests === 'object') for (const [cls, b] of Object.entries(r.bests)) if (b && Number(b.tier) > 0) o.bests[cls] = { tier: Math.floor(Number(b.tier)), time: Math.max(0, Number(b.time) || 0), at: Number(b.at) || 0 };
  o.keysFound = Math.max(0, Math.floor(Number(r.keysFound) || 0));
  o.unboundWins = Math.max(0, Math.floor(Number(r.unboundWins) || 0));
  const refunds = r.storageRefundV1 && typeof r.storageRefundV1 === 'object' ? r.storageRefundV1 : {};
  o.storageRefundV1 = {
    heroes: refunds.heroes && typeof refunds.heroes === 'object' && !Array.isArray(refunds.heroes) ? refunds.heroes : {},
    reliquary: !!refunds.reliquary,
  };
  return o;
}
/** The shared record (loaded once). */
export function endgame() {
  if (E) return E;
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { r = null; }
  const resetLegacyMarks = !!r && (Number(r.marksResetVersion) || 0) < MARKS_RESET_VERSION;
  E = fixEndgame(r);
  if (resetLegacyMarks) saveEndgame(true);
  return E;
}
/** Write the record; quiet is retained for existing call sites. */
export function saveEndgame(quiet) {
  try { localStorage.setItem(KEY, JSON.stringify(endgame())); } catch (e) { /* storage full or blocked: it lives on for this visit */ }
}
/** One-time refund for storage rows bought with Marks. The ledger and wallet are saved together. */
export function refundStorageMarks({ heroId, heroMarks = 0, reliquaryMarks = 0 } = {}) {
  const r = endgame(), ledger = r.storageRefundV1;
  let refund = 0;
  if (heroId && !ledger.heroes[heroId]) {
    ledger.heroes[heroId] = true;
    refund += Math.max(0, Math.floor(Number(heroMarks) || 0));
  }
  if (!ledger.reliquary) {
    ledger.reliquary = true;
    refund += Math.max(0, Math.floor(Number(reliquaryMarks) || 0));
  }
  if (refund > 0) r.marks.pts += refund;
  saveEndgame();
  return refund;
}
/** Tests: forget the cached copy (the next call reads localStorage again). */
export function resetEndgameCache() { E = null; }
if (typeof addEventListener === 'function') addEventListener('velscour-overhaul-reset-complete', resetEndgameCache);

/** Has the Endgame opened: a hero on this browser defeated Velscour at the campaign finale. */
export function endgameUnlocked(c = G.char) { return !!(endgame().unlocked || (c && c.cleared && c.cleared[FINAL_DEPTH])); }
/** Authoritative campaign victory record; unlike cleared[FINAL_DEPTH], this is only written by Velscour's real defeat. */
export function campaignVictoryRecorded() { return Number(endgame().unlocked) > 0; }
/** Marks only come from an unlocked endgame activity, never campaign replay or town systems. */
export function canEarnInfernalMarks(world = G.world, c = G.char) {
  if (!endgameUnlocked(c) || !world) return false;
  return !!(world.rift || world.unbound || world.unboundExploration || (world.kind === 'dungeon' && Number(world.depth) > FINAL_DEPTH));
}
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
