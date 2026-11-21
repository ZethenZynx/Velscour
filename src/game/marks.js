// Account-wide Infernal Marks progression and cached, data-driven upgrade effects.
import { G } from '../state.js';
import { endgame, saveEndgame, MARK_CATS, canEarnInfernalMarks } from './endgame.js';
import { INFERNAL_UPGRADES, INFERNAL_UPGRADE_BY_ID, MARK_CATEGORIES, bonusFor, purchaseCost, maxPurchasable } from '../data/infernalupgrades.js';
import { xpToNext, MAX_LEVEL } from './player.js';
import { sfx } from '../core/audio.js';
import { floatText, addEffect, Ring } from '../gfx/vfx.js';

export {
  INFERNAL_UPGRADES, INFERNAL_UPGRADE_BY_ID, MARK_CATEGORIES,
  bonusFor, purchaseCost, maxPurchasable,
};
export const CATS = Object.freeze(Object.fromEntries(INFERNAL_UPGRADES.map((u) => [u.id, {
  name: u.name, per: u.per, unit: u.unit, maxRank: u.maxRank, baseCost: u.baseCost,
  color: ({ offensive: '#ff765c', defensive: '#65baff', resources: '#65dcce', loot: '#e7c552', utility: '#b999ff', endgame: '#e87dff' })[u.category],
  desc: u.description, icon: u.icon,
}])));
export const markXp = () => xpToNext(MAX_LEVEL);
export const eff = (n) => 140 * (Math.sqrt(1 + Math.max(0, n) / 100) - 1);
export const worthNext = (n) => 1 / Math.sqrt(1 + Math.max(0, n) / 100);
export const bonusAt = (k, n) => bonusFor(k, n);
export const alsoAt = () => 0;

let bonusCache = null, bonusCacheKey = '';
export function markBonuses() {
  const m = endgame().marks, spent = m.spent;
  const key = MARK_CATS.map((id) => `${id}:${spent[id] || 0}`).join('|') + `|legacy:${m.legacyFerocity || 0}`;
  if (bonusCache && key === bonusCacheKey) return bonusCache;
  const b = {};
  for (const id of MARK_CATS) b[id] = bonusFor(id, spent[id] || 0);
  b.critDmg = b.ferocity + (m.legacyFerocity || 0);
  b.damage = b.might;
  b.castSpeed = b.haste;
  b.penetration = b.penetration;
  b.execution = b.execution;
  b.eliteDamage = b.slayer;
  b.bossDamage = b.godslayer;
  b.fullHealthDamage = b.overwhelming;
  b.area = b.expanse;
  b.dotDuration = b.duration;
  b.cdr = b.swiftness;
  b.reduce = b.fortitude;
  b.regen = b.regeneration;
  b.dotReduce = b.resilience;
  b.ccReduce = b.tenacity;
  b.evasion = b.evasion;
  b.lifeSteal = b.vampirism;
  b.healing = b.recovery;
  b.bossReduce = b.bulwark;
  b.lowHpReduce = b.defiance;
  b.mana = b.intellect;
  b.manaRegen = b.meditation;
  b.manaCost = b.efficiency;
  b.manaOnKill = b.siphon;
  b.orbMana = b.replenishment;
  b.orbHeal = b.restoration;
  b.gold = b.greed;
  b.drops = b.abundance;
  b.gemChance = b.gemHunter;
  b.gemTier = b.gemMastery;
  b.sigilChance = b.sigilHunter;
  b.collector = b.collector;
  b.impSpawn = b.impHunter;
  b.impReward = b.impFortune;
  b.chestSpawn = b.treasureHunter;
  b.discount = b.bargaining;
  b.sell = b.merchant;
  b.moveSpeed = b.agility;
  b.pickupRadius = b.magnetism;
  b.shrineDuration = b.blessing;
  b.potionDuration = b.alchemy;
  b.impDamage = b.pursuit;
  b.bounty = b.bounty;
  b.riftRewards = b.riftHunter;
  b.riftDamage = b.riftSlayer;
  b.breachRewards = b.breachMastery;
  b.heretic = b.heretic;
  b.affixReduce = b.affixMastery;
  b.unboundDamage = b.unboundSlayer;
  b.rift = 0; // compatibility alias: Haste no longer modifies Rift time
  bonusCache = Object.freeze(b); bonusCacheKey = key;
  return bonusCache;
}

export const marksTotal = () => endgame().marks.pts;
export const marksSpent = () => endgame().marks.spentValue || 0;
export const marksFree = () => Math.max(0, marksTotal() - marksSpent());
export const marksIn = (k) => endgame().marks.spent[k] || 0;
export const canAffordMarks = (cost) => marksFree() >= cost;

function changed() {
  bonusCache = null; bonusCacheKey = '';
  saveEndgame();
  if (G.player) G.player.recompute();
  if (G.ui && G.ui.refresh) G.ui.refresh();
}

export function deductMarks(cost) {
  cost = Math.max(0, Math.floor(cost));
  if (!cost) return true;
  if (marksFree() < cost) return false;
  endgame().marks.pts -= cost;
  changed();
  const p = G.player;
  if (p && G.world) { floatText(p.x, p.y, 96, `-${cost} INFERNAL MARK${cost > 1 ? 'S' : ''}`, '#ffd860', 18, { life: 2.6, vz: 22 }); sfx('levelup', 0.6); }
  G.ui?.log?.(`<b style="color:#ffd860">-${cost} Infernal Mark${cost > 1 ? 's' : ''}</b> <span class="dim">(${marksFree()} free marks remain)</span>`, '#ffd860');
  return true;
}

export function purchaseUpgrade(id, count = 1) {
  const def = INFERNAL_UPGRADE_BY_ID[id], m = endgame().marks;
  if (!def || !Number.isFinite(count) || count < 1) return 0;
  count = Math.floor(count);
  const possible = maxPurchasable(id, m.spent[id] || 0, marksFree(), count);
  if (possible !== count) return 0;
  const cost = purchaseCost(id, m.spent[id] || 0, count);
  if (cost > marksFree()) return 0;
  m.spent[id] = (m.spent[id] || 0) + count;
  m.spentValue = (m.spentValue || 0) + cost;
  changed();
  return count;
}
/** Compatibility call: rank purchases now use the registry's escalating price formula. */
export function spendMark(k, n = 1) { return purchaseUpgrade(k, n); }

export function resetMarks() {
  const m = endgame().marks;
  for (const id of MARK_CATS) m.spent[id] = 0;
  m.spentValue = 0;
  m.legacyFerocity = 0;
  changed();
}
export function autoSpend() {
  let count = 0;
  while (true) {
    const m = endgame().marks, free = marksFree();
    let choice = null, best = 0;
    for (const u of INFERNAL_UPGRADES) {
      const rank = m.spent[u.id] || 0;
      const n = maxPurchasable(u.id, rank, free, 1);
      if (!n) continue;
      const delta = bonusFor(u.id, rank + 1) - bonusFor(u.id, rank);
      const value = delta / u.cost(rank);
      if (value > best) { best = value; choice = u.id; }
    }
    if (!choice || !purchaseUpgrade(choice, 1)) break;
    count++;
  }
  return count;
}

export const riftMarks = (tier) => Math.max(1, Math.ceil(tier / 10));
let xpDirty = false, xpSaved = 0;
export function gainMarkXp(xp, world = G.world) {
  if (!canEarnInfernalMarks(world)) return 0;
  const m = endgame().marks;
  m.xp += Math.max(0, xp || 0);
  let n = 0; const cost = markXp();
  while (m.xp >= cost) { m.xp -= cost; m.pts++; n++; }
  if (n) { xpDirty = false; xpSaved = Date.now(); changed(); announce(n, 'from the abyss', true); }
  else if (xp > 0) { xpDirty = true; if (Date.now() - xpSaved > 5000) saveMarkXp(); }
  return n;
}
export function saveMarkXp() { if (!xpDirty) return; xpDirty = false; xpSaved = Date.now(); saveEndgame(true); }
export const capXp = (c = G.char) => c && c.level >= MAX_LEVEL ? { xp: endgame().marks.xp, need: markXp() } : null;

export function grantMarks(n, why = '', world = G.world) {
  n = Math.max(0, Math.floor(n));
  if (!n || !canEarnInfernalMarks(world)) return 0;
  endgame().marks.pts += n; changed(); announce(n, why); return n;
}
/** Bonus Mark payout with fractional carry so small Heresy awards retain their long-run value. */
export function grantMarksWithBonus(n, why = '', world = G.world, bonusPct = 0) {
  n = Math.max(0, Math.floor(n));
  if (!n || !canEarnInfernalMarks(world)) return 0;
  const m = endgame().marks;
  const total = n * (1 + Math.max(0, bonusPct) / 100) + (m.rewardRemainder || 0);
  const paid = Math.floor(total);
  m.rewardRemainder = total - paid;
  if (!paid) { saveEndgame(); return 0; }
  m.pts += paid; changed(); announce(paid, why); return paid;
}
function announce(n, why, fx) {
  const p = G.player;
  if (p && G.world) {
    floatText(p.x, p.y, 96, `+${n} INFERNAL MARK${n > 1 ? 'S' : ''}`, '#ff9050', 18, { life: 2.6, vz: 22 });
    if (fx) { addEffect(new Ring(p.x, p.y, 0.3, 2.6, 0.9, '#ff6a20', 4)); sfx('levelup', 0.5); }
  }
  G.ui?.log?.(`<b style="color:#ff9050">+${n} Infernal Mark${n > 1 ? 's' : ''}</b>${why ? ` ${why}` : ''} <span class="dim">(${marksFree()} to spend)</span>`, '#ffc0a0');
}
export function marksText() {
  const b = markBonuses();
  return `${marksTotal()} (${marksFree()} free) · +${b.vitality}% health · +${b.crit}% crit · +${b.critDmg}% critical damage · +${b.haste}% cast speed`;
}
