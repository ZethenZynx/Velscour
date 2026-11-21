// Infernal Marks upgrade registry. Balance values are deliberately centralized so the UI,
// stat panel and gameplay calculations all read the same rank limits and formulas.
const rows = [
  // id, name, category, per-rank, unit, max, first cost, cost growth, description, icon skill
  ['might','Might','offensive',1,'% damage dealt',0,2,1.075,'Increases damage from every damage type.','barbarian.0.0'],
  ['haste','Haste','offensive',1,'% cast speed',25,2,1.09,'Increases casting speed only. Does not affect movement, critical chance, cooldowns, or Rift time.','wizard.0.0'],
  ['crit','Crit','offensive',0.35,'percentage points critical chance',20,3,1.11,'Increases critical-hit chance, subject to the normal 75% cap.','ranger.0.0'],
  ['ferocity','Ferocity','offensive',2,'% critical damage',50,3,1.1,'Increases critical-hit damage. Includes the migrated critical-damage bonus from legacy Precision ranks.','barbarian.0.1'],
  ['penetration','Penetration','offensive',0.5,'percentage points resistance ignored',30,4,1.12,'Ignores a portion of enemy elemental and physical resistance.','wizard.0.1'],
  ['execution','Execution','offensive',1,'% damage below 30% health',25,4,1.12,'Increases damage against enemies below 30% health.','ranger.0.1'],
  ['slayer','Slayer','offensive',1,'% damage to elites',25,4,1.12,'Increases damage against elite, champion, and unique enemies.','paladin.0.0'],
  ['godslayer','Godslayer','offensive',1,'% damage to bosses',25,5,1.13,'Increases damage against bosses.','paladin.0.1'],
  ['overwhelming','Overwhelming Force','offensive',0.8,'% damage to full-health enemies',25,4,1.12,'Increases damage against enemies at full health.','barbarian.0.2'],
  ['expanse','Expanse','offensive',0.7,'% area of effect',25,3,1.1,'Increases the area of eligible spells and attacks.','wizard.0.2'],
  ['duration','Duration','offensive',1,'% damage-over-time duration',20,3,1.1,'Extends eligible damage-over-time effects.','necromancer.0.0'],
  ['swiftness','Swiftness','offensive',0.5,'% cooldown recovery',30,4,1.11,'Reduces ability cooldowns, respecting the 60% cooldown-reduction cap.','wizard.0.3'],

  ['vitality','Vitality','defensive',0.4,'% maximum health',0,2,1.075,'Multiplies maximum health after existing gear and Fortitude calculations.','paladin.0.2'],
  ['fortitude','Fortitude','defensive',0.35,'% damage reduction',30,3,1.1,'Reduces incoming damage, respecting the existing damage-reduction cap.','paladin.0.3'],
  ['regeneration','Regeneration','defensive',0.35,'% passive health regeneration',0,2,1.075,'Increases passive health regeneration where regeneration is allowed.','monk.0.0'],
  ['resilience','Resilience','defensive',1,'% damage-over-time reduction',25,3,1.1,'Reduces damage from burns, poison, and other periodic damage.','monk.0.1'],
  ['tenacity','Tenacity','defensive',1,'% crowd-control duration reduction',30,3,1.1,'Shortens crowd-control effects applied to you.','monk.0.2'],
  ['evasion','Evasion','defensive',0.25,'% direct-hit avoidance',20,4,1.12,'Chance to avoid a direct incoming hit entirely. Does not avoid damage-over-time or persistent ground hazards.','ninja.0.0'],
  ['vampirism','Vampirism','defensive',0.2,'% damage returned as healing',20,4,1.12,'Recovers a small share of damage dealt, without recursively triggering combat effects.','necromancer.0.1'],
  ['recovery','Recovery','defensive',1,'% healing received',25,3,1.1,'Increases healing received from all valid sources.','monk.0.3'],
  ['bulwark','Bulwark','defensive',0.6,'% damage reduction from bosses',25,4,1.12,'Further reduces damage dealt by bosses; it cannot grant immunity.','paladin.0.1'],
  ['defiance','Defiance','defensive',0.8,'% damage reduction below 35% health',20,4,1.12,'Reduces incoming damage while below 35% health.','paladin.0.0'],

  ['intellect','Intellect','resources',0.35,'% maximum mana',0,2,1.075,'Increases maximum mana.','wizard.0.4'],
  ['meditation','Meditation','resources',0.6,'% mana regeneration',0,2,1.075,'Increases passive mana regeneration.','monk.0.4'],
  ['efficiency','Efficiency','resources',0.5,'% mana cost reduction',30,3,1.1,'Reduces spell mana costs without reducing them below one mana.','wizard.0.5'],
  ['siphon','Siphon','resources',0.5,'% maximum mana on kill',20,3,1.1,'Restores mana when you defeat an eligible enemy.','necromancer.0.2'],
  ['replenishment','Replenishment','resources',1.5,'% mana orb recovery',20,3,1.1,'Increases mana restored by mana orbs.','wizard.0.6'],
  ['restoration','Restoration','resources',1.5,'% health orb recovery',20,3,1.1,'Increases health restored by health orbs.','monk.0.5'],

  ['greed','Greed','loot',0.8,'% gold dropped',0,2,1.075,'Increases gold pile amounts.','barbarian.0.3'],
  ['abundance','Abundance','loot',0.5,'% additional equipment quantity chance',30,4,1.12,'Adds a separate chance for one additional equipment roll from eligible enemy and chest rewards.','ranger.0.2'],
  ['gemHunter','Gem Hunter','loot',0.6,'% gem drop chance',30,3,1.1,'Increases eligible gem-drop chances without bypassing depth or level restrictions.','wizard.0.7'],
  ['gemMastery','Gem Mastery','loot',0.4,'% higher eligible gem tier chance',25,4,1.12,'Improves the chance to roll a higher gem tier that is already eligible at your level.','wizard.0.8'],
  ['sigilHunter','Sigil Hunter','loot',0.5,'% Sigil Stone drop chance',25,4,1.12,'Increases Sigil Stone drop chances without changing their eligibility.','necromancer.0.3'],
  ['collector','Collector','loot',0.35,'% Covenant set chance',25,5,1.13,'Increases the chance for eligible Covenant set equipment to appear.','paladin.0.4'],
  ['impHunter','Imp Hunter','loot',0.25,'percentage points additional Imp spawn chance',20,4,1.12,'Adds a chance for an optional extra Treasure Imp. The guaranteed per-area Imp remains unchanged.','ranger.0.3'],
  ['impFortune','Imp Fortune','loot',0.35,'% Imp reward quantity',25,4,1.12,'Increases eligible Treasure Imp reward quantities, including Abyssal Imp Mark rewards.','treasure_imp'],
  ['treasureHunter','Treasure Hunter','loot',0.25,'percentage points procedural chest spawn chance',20,4,1.12,'Adds a separate chance to place one extra chest during procedural dungeon generation.','treasure_imp'],
  ['bargaining','Bargaining','loot',0.4,'% vendor purchase discount',25,4,1.12,'Reduces eligible vendor purchase prices.','bard.0.0'],
  ['merchant','Merchant','loot',0.5,'% vendor sell value',25,4,1.12,'Increases gold received when selling items.','bard.0.1'],

  ['agility','Agility','utility',0.3,'% movement speed',20,3,1.1,'Increases movement speed, respecting the existing speed cap.','ninja.0.1'],
  ['magnetism','Magnetism','utility',0.08,'tiles pickup radius',20,3,1.1,'Extends the pickup and attraction radius for loot and resource orbs.','wizard.0.9'],
  ['blessing','Blessing','utility',0.5,'% shrine effect duration',20,3,1.1,'Extends temporary shrine effects.','paladin.0.5'],
  ['alchemy','Alchemy','utility',0.5,'% potion effect duration',20,3,1.1,'Extends eligible potion and elixir durations.','wizard.0.4'],
  ['pursuit','Pursuit','utility',1,'% damage to Treasure Imps',20,4,1.12,'Increases damage against Treasure Imps only.','ranger.0.4'],
  ['bounty','Bounty','utility',0.5,'% optional objective rewards',25,4,1.12,'Increases eligible optional dungeon objective gold and item rewards.','paladin.0.6'],

  ['riftHunter','Rift Hunter','endgame',0.5,'% Abyssal Rift rewards',25,5,1.13,'Improves eligible Abyssal Rift reward quantities, including Marks.','wizard.0.10'],
  ['riftSlayer','Rift Slayer','endgame',0.5,'% damage to Abyssal Rift enemies',30,4,1.12,'Increases damage against enemies in Abyssal Rifts.','wizard.0.11'],
  ['breachMastery','Breach Mastery','endgame',0.5,'% Eternal Breach rewards',25,5,1.13,'Improves eligible Eternal Breach reward quantities.','wizard.0.12'],
  ['heretic','Heretic','endgame',0.35,'% Infernal Marks from Heresy clears',25,5,1.13,'Increases Infernal Mark rewards from eligible Heresy content.','necromancer.0.4'],
  ['affixMastery','Affix Mastery','endgame',0.4,'% dungeon affix hazard damage reduction',25,4,1.12,'Reduces damage from dungeon-affix-created hazards only.','monk.0.6'],
  ['unboundSlayer','Unbound Slayer','endgame',0.5,'% damage to Velscour Unbound',30,5,1.13,'Increases damage against Velscour Unbound.','paladin.0.7'],
];

export const MARK_CATEGORIES = Object.freeze([
  { id: 'offensive', name: 'Offensive', icon: '⚔' },
  { id: 'defensive', name: 'Defensive', icon: '🛡' },
  { id: 'resources', name: 'Resources', icon: '✦' },
  { id: 'loot', name: 'Loot & Economy', icon: '◆' },
  { id: 'utility', name: 'Utility', icon: '⌖' },
  { id: 'endgame', name: 'Endgame', icon: '◈' },
]);

export const INFERNAL_UPGRADES = Object.freeze(rows.map(([id, name, category, per, unit, maxRank, baseCost, growth, description, icon]) => Object.freeze({
  id, name, category, per, unit, maxRank, baseCost, growth, description, icon,
  cost(rank) { return Math.max(1, Math.ceil(baseCost * Math.pow(growth, Math.max(0, rank)))); },
  total(rank) {
    const n = Math.max(0, maxRank ? Math.min(rank, maxRank) : rank);
    return maxRank ? n * per : per * (140 * (Math.sqrt(1 + n / 100) - 1));
  },
})));
export const INFERNAL_UPGRADE_BY_ID = Object.freeze(Object.fromEntries(INFERNAL_UPGRADES.map((u) => [u.id, u])));
export const INFERNAL_UPGRADES_BY_CATEGORY = Object.freeze(Object.fromEntries(MARK_CATEGORIES.map((c) => [c.id, INFERNAL_UPGRADES.filter((u) => u.category === c.id)])));

export function rankCost(id, rank) { const u = INFERNAL_UPGRADE_BY_ID[id]; return u ? u.cost(rank) : Infinity; }
export function purchaseCost(id, rank, count) {
  const u = INFERNAL_UPGRADE_BY_ID[id]; if (!u) return Infinity;
  let sum = 0;
  for (let i = 0; i < count; i++) sum += u.cost(rank + i);
  return sum;
}
export function bonusFor(id, rank) { const u = INFERNAL_UPGRADE_BY_ID[id]; return u ? u.total(rank) : 0; }
export function maxPurchasable(id, rank, free, wanted = Infinity) {
  const u = INFERNAL_UPGRADE_BY_ID[id]; if (!u) return 0;
  const cap = u.maxRank ? Math.max(0, u.maxRank - rank) : Infinity;
  const limit = Math.min(cap, wanted); let n = 0, cost = 0;
  while (n < limit) { const next = u.cost(rank + n); if (cost + next > free) break; cost += next; n++; }
  return n;
}
