// Storage expansions:
// - Hero's Bag and Gem Bag keep their existing progressive gold schedules.
// - Town vault expansions use separate endgame-only gold curves.
import { reliquary, saveReliquary } from '../game/reliquary.js';
import { campaignVictoryRecorded } from '../game/endgame.js';

// --- BAG (HERO'S INVENTORY) ---
export const BAG_COLS = 10, BAG_ROWS = 6;
export const BAG_ROW_COST = [5000, 10000, 20000, 40000, 80000, 160000]; // rows 7..12
export const BAG_MAX_ROWS = BAG_ROWS + BAG_ROW_COST.length;

export function bagRows(c) {
  if (!c || !Array.isArray(c.bag)) return BAG_ROWS;
  return Math.max(BAG_ROWS, Math.ceil(c.bag.length / BAG_COLS));
}

/** Gold for the next row, or 0 when the bag is as big as it gets. */
export function nextRowCost(c) {
  return BAG_ROW_COST[bagRows(c) - BAG_ROWS] || 0;
}

/** Buy the next row if there is one and the gold is there. */
export function buyBagRow(c) {
  if (!c || !Array.isArray(c.bag)) return false;
  const cost = nextRowCost(c);
  if (!cost || c.gold < cost) return false;
  c.gold -= cost;
  for (let i = 0; i < BAG_COLS; i++) c.bag.push(null);
  return true;
}

/** Saves: a full grid of at least 6 rows, never more than 12 (empty slots past that are dropped). */
export function fixBag(c) {
  if (!c) return;
  if (!Array.isArray(c.bag)) c.bag = [];
  while (c.bag.length < BAG_COLS * BAG_ROWS || c.bag.length % BAG_COLS) c.bag.push(null);
  while (c.bag.length > BAG_COLS * BAG_MAX_ROWS && c.bag[c.bag.length - 1] === null) c.bag.pop();
}

export const BAG_ROW_MARK_COST = 10;
export function nextBagRowCost(c) { return nextRowCost(c); }
export function canBuyBagRow(c) { return !!c && nextRowCost(c) > 0 && c.gold >= nextRowCost(c); }

// --- GEM BAG (HERO'S GEM CARRIER) ---
export const GEM_BAG_COLS = 10, GEM_BAG_BASE_ROWS = 3, GEM_BAG_MAX_ROWS = 8;
// Each Gem Bag row costs one quarter of the matching Backpack expansion price.
// Derive from the unchanged Backpack schedule so this never compounds a prior Gem Bag discount.
export const GEM_BAG_ROW_GOLD_COST = BAG_ROW_COST
  .slice(0, GEM_BAG_MAX_ROWS - GEM_BAG_BASE_ROWS)
  .map((cost) => Math.ceil(cost * 0.25));

export function gemBagRows(c) {
  if (!c || !Array.isArray(c.gemBag)) return GEM_BAG_BASE_ROWS;
  return Math.max(GEM_BAG_BASE_ROWS, Math.ceil(c.gemBag.length / GEM_BAG_COLS));
}

export function nextGemBagRowCost(c) {
  return GEM_BAG_ROW_GOLD_COST[gemBagRows(c) - GEM_BAG_BASE_ROWS] || 0;
}

export function canBuyGemBagRow(c) {
  const cost = nextGemBagRowCost(c);
  return !!c && cost > 0 && Number.isFinite(Number(c.gold)) && Number(c.gold) >= cost;
}

export function buyGemBagRow(c) {
  if (!c) return false;
  const cost = nextGemBagRowCost(c);
  if (!cost || !canBuyGemBagRow(c)) return false;
  if (!Array.isArray(c.gemBag)) c.gemBag = Array(GEM_BAG_COLS * GEM_BAG_BASE_ROWS).fill(null);
  c.gold = Number(c.gold) - cost;
  for (let i = 0; i < GEM_BAG_COLS; i++) c.gemBag.push(null);
  return true;
}

export function fixGemBag(c) {
  if (!c) return;
  if (!Array.isArray(c.gemBag)) c.gemBag = [];
  while (c.gemBag.length < GEM_BAG_COLS * GEM_BAG_BASE_ROWS || c.gemBag.length % GEM_BAG_COLS) c.gemBag.push(null);
  while (c.gemBag.length > GEM_BAG_COLS * GEM_BAG_MAX_ROWS && c.gemBag[c.gemBag.length - 1] === null) c.gemBag.pop();
}

// --- STASH (TOWN STORAGE CHEST) ---
export const STASH_COLS = 10, STASH_BASE_ROWS = 30, STASH_MAX_ROWS = 60;
export const STASH_ROW_GOLD_BASE = 100000, STASH_ROW_GOLD_GROWTH = 1.20;

export function storageExpansionUnlocked() { return campaignVictoryRecorded(); }
const goldCanPay = (c, cost) => !!c && Number.isFinite(Number(c.gold)) && Number(c.gold) >= cost;
// Keep Math.ceil faithful to the stated decimal curves when binary floating point
// leaves an exact whole-gold result a fraction above its integer.
const ceilGoldCost = (value) => Math.ceil(value - Number.EPSILON * Math.max(1, Math.abs(value)) * 4);

export function stashRows(c) {
  if (!c || !Array.isArray(c.stash)) return STASH_BASE_ROWS;
  return Math.max(STASH_BASE_ROWS, Math.ceil(c.stash.length / STASH_COLS));
}

export function nextStashRowCost(c) {
  const row = stashRows(c) - STASH_BASE_ROWS;
  return row >= 0 && row < STASH_MAX_ROWS - STASH_BASE_ROWS
    ? ceilGoldCost(STASH_ROW_GOLD_BASE * Math.pow(STASH_ROW_GOLD_GROWTH, row)) : 0;
}

export function canBuyStashRow(c) {
  const cost = nextStashRowCost(c);
  return storageExpansionUnlocked() && cost > 0 && goldCanPay(c, cost);
}

export function buyStashRow(c, expectedCost = null) {
  if (!c) return false;
  const cost = nextStashRowCost(c);
  if (!storageExpansionUnlocked() || !cost || (expectedCost !== null && Number(expectedCost) !== cost) || !goldCanPay(c, cost)) return false;
  if (!Array.isArray(c.stash)) c.stash = Array(STASH_COLS * STASH_BASE_ROWS).fill(null);
  c.gold = Number(c.gold) - cost;
  for (let i = 0; i < STASH_COLS; i++) c.stash.push(null);
  return true;
}

export function fixStash(c) {
  if (!c) return;
  if (!Array.isArray(c.stash)) c.stash = [];
  while (c.stash.length < STASH_COLS * STASH_BASE_ROWS || c.stash.length % STASH_COLS) c.stash.push(null);
  while (c.stash.length > STASH_COLS * STASH_MAX_ROWS && c.stash[c.stash.length - 1] === null) c.stash.pop();
}

// --- JEWEL BOX (TOWN GEM & RUNES VAULT) ---
export const JEWEL_BOX_COLS = 10, JEWEL_BOX_BASE_ROWS = 30, JEWEL_BOX_MAX_ROWS = 60;
export const JEWEL_BOX_ROW_GOLD_BASE = 150000, JEWEL_BOX_ROW_GOLD_GROWTH = 1.22;

export function jewelBoxRows(c) {
  if (!c || !Array.isArray(c.jewelBox)) return JEWEL_BOX_BASE_ROWS;
  return Math.max(JEWEL_BOX_BASE_ROWS, Math.ceil(c.jewelBox.length / JEWEL_BOX_COLS));
}

export function nextJewelBoxRowCost(c) {
  const row = jewelBoxRows(c) - JEWEL_BOX_BASE_ROWS;
  return row >= 0 && row < JEWEL_BOX_MAX_ROWS - JEWEL_BOX_BASE_ROWS
    ? ceilGoldCost(JEWEL_BOX_ROW_GOLD_BASE * Math.pow(JEWEL_BOX_ROW_GOLD_GROWTH, row)) : 0;
}

export function canBuyJewelBoxRow(c) {
  const cost = nextJewelBoxRowCost(c);
  return storageExpansionUnlocked() && cost > 0 && goldCanPay(c, cost);
}

export function buyJewelBoxRow(c, expectedCost = null) {
  if (!c) return false;
  const cost = nextJewelBoxRowCost(c);
  if (!storageExpansionUnlocked() || !cost || (expectedCost !== null && Number(expectedCost) !== cost) || !goldCanPay(c, cost)) return false;
  if (!Array.isArray(c.jewelBox)) c.jewelBox = Array(JEWEL_BOX_COLS * JEWEL_BOX_BASE_ROWS).fill(null);
  c.gold = Number(c.gold) - cost;
  for (let i = 0; i < JEWEL_BOX_COLS; i++) c.jewelBox.push(null);
  return true;
}

export function fixJewelBox(c) {
  if (!c) return;
  if (!Array.isArray(c.jewelBox)) c.jewelBox = [];
  while (c.jewelBox.length < JEWEL_BOX_COLS * JEWEL_BOX_BASE_ROWS || c.jewelBox.length % JEWEL_BOX_COLS) c.jewelBox.push(null);
  while (c.jewelBox.length > JEWEL_BOX_COLS * JEWEL_BOX_MAX_ROWS && c.jewelBox[c.jewelBox.length - 1] === null) c.jewelBox.pop();
}

// --- RELIQUARY (ACCOUNT-WIDE VAULT) ---
export const RELIQUARY_COLS = 12, RELIQUARY_BASE_ROWS = 8, RELIQUARY_MAX_ROWS = 16;
export const RELIQUARY_ROW_GOLD_BASE = 250000, RELIQUARY_ROW_GOLD_GROWTH = 1.30;

export function reliquaryTabRows(tabIdx) {
  const r = reliquary();
  const t = r.tabs[tabIdx] || [];
  return Math.max(RELIQUARY_BASE_ROWS, Math.ceil(t.length / RELIQUARY_COLS));
}

export function nextReliquaryRowCost(tabIdx) {
  const row = reliquaryTabRows(tabIdx) - RELIQUARY_BASE_ROWS;
  return row >= 0 && row < RELIQUARY_MAX_ROWS - RELIQUARY_BASE_ROWS
    ? ceilGoldCost(RELIQUARY_ROW_GOLD_BASE * Math.pow(RELIQUARY_ROW_GOLD_GROWTH, row)) : 0;
}

export function canBuyReliquaryRow(tabIdx, c) {
  const cost = nextReliquaryRowCost(tabIdx);
  return storageExpansionUnlocked() && cost > 0 && goldCanPay(c, cost);
}

export function buyReliquaryRow(tabIdx, c, expectedCost = null) {
  const r = reliquary();
  if (!r.tabs[tabIdx]) return false;
  const cost = nextReliquaryRowCost(tabIdx);
  if (!storageExpansionUnlocked() || !cost || (expectedCost !== null && Number(expectedCost) !== cost) || !goldCanPay(c, cost)) return false;
  c.gold = Number(c.gold) - cost;
  for (let i = 0; i < RELIQUARY_COLS; i++) r.tabs[tabIdx].push(null);
  saveReliquary();
  return true;
}

export function fixReliquary(r) {
  if (!r || !Array.isArray(r.tabs)) return;
  for (const t of r.tabs) {
    while (t.length < RELIQUARY_COLS * RELIQUARY_BASE_ROWS || t.length % RELIQUARY_COLS) t.push(null);
    while (t.length > RELIQUARY_COLS * RELIQUARY_MAX_ROWS && t[t.length - 1] === null) t.pop();
  }
}
