// Dungeon encounters with the Hollow's people (and its rats). On about half of the ordinary dungeon depths one or two
// of these wait in a room: a captive held by a pack (free them once the guards are dead), a knight's last stand (fight
// beside them; alive at the end, they swear an oath that buffs you; fallen, they leave their pack), a traveling
// merchant camped by a fire (potions for the road), Zebulon the Purple testing a ward (survive his three waves for a
// blessing), Nan Bramble's cauldron (a brew: a blessing, mostly) and a Greener who jumps out at you and then leads
// you to a hidden cache. Rats scurry about on some depths and bolt from the hero.
// uses those) whose person is a world.npcs entry from game/folk.js.
import { G } from '../state.js';
import { rand, randi, pick, chance, dist, TAU } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { addEffect, Ring, Column, sparkle, floatText, addLight, burst } from '../gfx/vfx.js';
import { makeMonster } from './monster.js';
import { ambush } from './mayhem.js';
import { GroundItem, dropChest, rollGroundItem, rollGroundGem } from './loot.js';
import { rollItem, rollGem, goldScale } from '../data/items.js';
import { depthLevel } from '../data/depth.js';
import { UI } from '../ui/ui.js';
import { TOWNSFOLK, ANIMALS } from '../data/townsfolk.js';
import { makeFolk } from './folk.js';
import { townFacingFlip } from './townsfolkvisuals.js';

export const ENCOUNTER_CHANCE = 0.5;
// One event check feeds this complete pool. Legacy encounters remain in the pool, while the new
// encounters are grouped by the design's common / uncommon / rare weights below.
export const ENCOUNTERS = [
  'captive', 'laststand', 'peddler', 'wizard', 'witch', 'greener',
  'lost_adventurer', 'wounded_warrior', 'wandering_merchant', 'treasure_hunter', 'trapped_explorer',
  'cursed_wanderer', 'suspicious_stranger', 'lost_cartographer', 'injured_mage', 'relic_collector',
  'monster_hunter', 'prisoner', 'gambling_adventurer', 'mysterious_pilgrim', 'desperate_scavenger', 'fallen_knight',
];
export const ENCOUNTER_RARITY = Object.freeze({
  captive: 'uncommon', laststand: 'uncommon', peddler: 'common', wizard: 'rare', witch: 'common', greener: 'uncommon',
  lost_adventurer: 'uncommon', wounded_warrior: 'common', wandering_merchant: 'common', treasure_hunter: 'uncommon',
  trapped_explorer: 'uncommon', cursed_wanderer: 'uncommon', suspicious_stranger: 'rare', lost_cartographer: 'common',
  injured_mage: 'common', relic_collector: 'common', monster_hunter: 'uncommon', prisoner: 'uncommon',
  gambling_adventurer: 'rare', mysterious_pilgrim: 'rare', desperate_scavenger: 'common', fallen_knight: 'rare',
});
export const ENCOUNTER_RARITY_WEIGHTS = Object.freeze({ common: 60, uncommon: 30, rare: 10 });
const RAT_BODY_RADIUS = 0.24;

/** Roll this depth's encounters into `spots` (room centres; used ones are popped). `force` (tests): a kind list. */
export function addEncounters(world, spots, force = G.encounterForce) {
  if (world.npcEncounterSpawned) return world.encounters || [];
  world.npcEncounterSpawned = true;
  const claimKey = `${world.biome?.id || 'dungeon'}:${Math.max(1, world.depth | 0)}`;
  const claims = G.char?.npcEncounterDepths;
  if (!force && claims?.[claimKey]) {
    world.encounters = [];
    if (G.ratsForce || chance(0.3)) addRats(world, randi(2, 4));
    return world.encounters;
  }
  // Scenario escorts and captives already are the floor's optional NPC quest. Do not roll a
  // second encounter beside them. This preserves the old overall encounter check while enforcing
  // one optional NPC quest/encounter per generated depth.
  const scenarioHasNpcQuest = ['captives', 'escort'].includes(world.scenario?.mech);
  const kinds = force ? [].concat(force).slice(0, 1) : !scenarioHasNpcQuest && chance(ENCOUNTER_CHANCE) ? [selectNpcEncounter(world)] : [];
  const out = [];
  for (const k of kinds) {
    if (!spots.length) break;
    const at = spots.pop();
    let e = BUILD[k]?.(world, at, spots);
    if (!e && !force && at) e = BUILD.peddler(world, at, spots); // safe, simple fallback if a quest's layout cannot be built
    if (e) {
      const actual = e.encounterType || (e.quest?.id ? k : e.kind || k);
      e.encounterType = actual; out.push(e);
      if (G.char) {
        G.char.lastDepthNpcEncounter = actual;
        (G.char.npcEncounterDepths ||= {})[claimKey] = actual;
        G.game?.autosave?.();
      }
    }
  }
  if (force ? G.ratsForce : chance(0.3)) addRats(world, randi(2, 4));
  world.encounters = out;
  return out;
}

export function selectNpcEncounter(world, rng = Math.random, last = G.char?.lastDepthNpcEncounter) {
  const eligible = ENCOUNTERS.filter((id) => typeof BUILD[id] === 'function' && encounterFits(id, world));
  const fresh = eligible.filter((id) => id !== last);
  const pool = fresh.length ? fresh : eligible;
  const groups = Object.keys(ENCOUNTER_RARITY_WEIGHTS).map((rarity) => [rarity, pool.filter((id) => ENCOUNTER_RARITY[id] === rarity)]).filter(([, ids]) => ids.length);
  const total = groups.reduce((sum, [rarity]) => sum + ENCOUNTER_RARITY_WEIGHTS[rarity], 0);
  let roll = rng() * total;
  for (const [rarity, ids] of groups) { roll -= ENCOUNTER_RARITY_WEIGHTS[rarity]; if (roll < 0) return ids[Math.floor(rng() * ids.length)]; }
  return pool[Math.floor(rng() * pool.length)] || 'peddler';
}

function encounterFits(id, world) {
  const biome = world.biome?.id || '';
  if (id === 'monster_hunter') return (world.creatures || []).some((m) => !m.dead && m.team === 'enemy' && m.packLeaderType);
  if (id === 'mysterious_pilgrim') return !['molten', 'hell', 'flesh'].includes(biome);
  if (id === 'cursed_wanderer') return !['ice_temple', 'frozen'].includes(biome) || chance(0.7);
  return true;
}

const lvlOf = (world) => depthLevel(world.depth || 1);
const near = (world, [x, y], r) => { const p = world.map.randomNear(x, y, r); return p && world.map.walkable(p[0], p[1]) ? p : [x, y]; };
const guardsAround = (e, r = 7) => e.guards.filter((m) => !m.dead && dist(m.x, m.y, e.x, e.y) < r);
const reward = (world, at, { items = 1, rare = false, gold = 1, gem = false } = {}) => {
  const lvl = lvlOf(world), p = world.player;
  for (let i = 0; i < items; i++) world.addLoot(new GroundItem(at.x + rand(-0.6, 0.6), at.y + rand(-0.6, 0.6), 'item', { item: rollGroundItem(lvl + (rare ? 3 : 1), { mf: p ? p.st.magicFind : 0, bonus: rare ? 2 : 1 }) }));
  if (gem) world.addLoot(new GroundItem(at.x + rand(-0.6, 0.6), at.y + rand(-0.6, 0.6), 'item', { item: rollGroundGem(lvl + 4) }));
  world.addLoot(new GroundItem(at.x + rand(-0.5, 0.5), at.y + rand(-0.5, 0.5), 'gold', { amount: Math.round((30 + lvl * 7) * goldScale(lvl) * gold * rand(0.8, 1.3)) }));
};
const pack = (world, at, n, rank = 'normal') => {
  const arch = pick(world.roster || ['skeleton']), out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = near(world, [at[0] + Math.cos(i / n * TAU) * 2.2, at[1] + Math.sin(i / n * TAU) * 2.2], 1.2);
    const m = makeMonster(world, arch, world.biome, lvlOf(world), i === 0 ? rank : 'normal', x, y, 0);
    world.add(m); out.push(m);
  }
  return out;
};
const site = (world, e, label, dot, use) => {
  const ch = { x: e.x, y: e.y, opened: false, reach: 1.6, far: 30, label, dot, encounter: e, draw() {}, use };
  world.chests.push(ch); e.chest = ch;
  return ch;
};
const leave = (world, n, after = 6) => {
  // walks off the way they came and fades (out of the dungeon, home)
  let t = after;
  n.onTick = (dt) => { if ((t -= dt) < 1.5) n.alpha = Math.max(0, t / 1.5); if (t <= 0) { const i = world.npcs.indexOf(n); if (i >= 0) world.npcs.splice(i, 1); n.onTick = null; } };
};
const buff = (p, id, name, el, stats, t, msg, color) => {
  if (typeof p?.addBuff === 'function') p.addBuff({ id, name, el, stats, t, max: t });
  addEffect(new Ring(p.x, p.y, 0.2, 4, 0.7, color, 6));
  floatText(p.x, p.y, 90, name.toUpperCase(), color, 16, { life: 2 });
  UI.log(`<b style="color:${color}">${name}</b>: ${msg} for ${t} s.`, color);
  sfx('levelup', 0.6);
};

const DEPTH_QUEST_KINDS = new Set(['captive', 'laststand', 'greener', 'lost_adventurer', 'treasure_hunter', 'trapped_explorer', 'cursed_wanderer', 'monster_hunter', 'prisoner', 'fallen_knight']);
const NPC_LOOKS = {
  default: (v) => !v.child && !v.royal && !v.courtier && !v.animal,
  merchant: (v) => v.merchant || v.role === 'ferryman',
  forest: (v) => v.role === 'border scout' || v.role === 'shepherd' || v.role === 'hedge witch' || v.role === 'retired veteran',
  castle: (v) => v.knight || v.guard || v.courtier || v.role === 'friar',
  desert: (v) => v.merchant || v.role === 'ferryman' || v.role === 'bookseller',
  frozen: (v) => v.knight || v.old || v.worker || v.role === 'shepherd',
  cavern: (v) => v.worker || v.old || v.role === 'bookseller' || v.role === 'retired veteran',
  infernal: (v) => v.knight || v.caster || v.old || v.role === 'friar',
  celestial: (v) => v.caster || v.role === 'friar' || v.role === 'priest' || v.old,
  mechanical: (v) => v.worker || v.merchant || v.role === 'retired veteran',
};
function folkAppearance(world, role = 'default') {
  const id = world.biome?.id || '';
  const theme = /forest|fungal|thorn/.test(id) ? 'forest' : /castle|keep/.test(id) ? 'castle'
    : /desert|sand|amber|gilded/.test(id) ? 'desert' : /frozen|ice|summit/.test(id) ? 'frozen'
      : /cave|mine|cavern|sewer|sunken/.test(id) ? 'cavern' : /hell|molten|blood|flesh|forge|abyss|void/.test(id) ? 'infernal'
        : /heaven|astral|cathedral|temple|throne/.test(id) ? 'celestial' : /mechan|rail|train|tower/.test(id) ? 'mechanical' : 'default';
  const filter = role === 'default' ? NPC_LOOKS[theme] : (NPC_LOOKS[role] || NPC_LOOKS[theme]);
  const matches = TOWNSFOLK.filter((v) => !v.child && !v.royal && !v.courtier && filter(v));
  return pick(matches.length ? matches : TOWNSFOLK.filter(NPC_LOOKS.default));
}
function questNpc(world, at, name, title, objective, look = 'default') {
  const n = makeFolk(world, folkAppearance(world, look), at[0], at[1], { calm: true, still: true, name });
  const quest = trackQuest(world, n, title, objective);
  world.npcs.push(n);
  const e = { kind: quest.id, x: at[0], y: at[1], n, guards: [], quest, world };
  world.encounters ||= []; // finalized by addEncounters after BUILD returns
  return e;
}
function trackQuest(world, n, title, objective) {
  const quest = { id: `depth-npc:${world.depth}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, title, state: 'available', objective, rewardClaimed: false, npc: n, objectiveTarget: null };
  n.depthQuest = quest; n.questIndicator = '!';
  world.depthQuests ||= []; world.depthQuests.push(quest);
  return quest;
}
function questState(e, state, objective) {
  if (!e?.quest) return;
  e.quest.state = state;
  if (objective) e.quest.objective = objective;
  if (state === 'objective-complete') e.quest.objectiveTarget = e.n || null;
  else if (['rewarded', 'failed', 'declined'].includes(state)) e.quest.objectiveTarget = null;
  if (e.n) e.n.questIndicator = state === 'available' ? '!' : ['completed', 'rewarded', 'failed', 'declined'].includes(state) ? null : '?';
  UI.refresh();
}
function choices(n, title, text, options) {
  UI.dialog({ title, html: `<p>${text}</p>`, buttons: [...options.map((o) => ({ label: o.label, cls: o.cls || '', fn: o.run })), { label: 'Leave' }] });
}
function rewardQuest(world, e, opts = {}) {
  if (!completeQuest(e, 'Quest complete. Your reward is waiting nearby.')) return false;
  reward(world, e.n || { x: e.x, y: e.y }, { items: opts.items ?? 1, gold: opts.gold ?? 1, rare: !!opts.rare, gem: !!opts.gem });
  return true;
}
function completeQuest(e, objective = 'Quest complete.') {
  if (!e?.quest || e.quest.rewardClaimed || e.quest.state === 'rewarded') return false;
  e.quest.rewardClaimed = true; questState(e, 'rewarded', objective);
  UI.log(`<b>${e.quest.title}</b> complete.`, '#ffe080'); sfx('gold');
  return true;
}
function returnQuestNpc(e, start, fallback) {
  const n = e.n;
  n.use = () => {
    if (e.quest.rewardClaimed) { n.say('You have my thanks, again.', 2.5); return; }
    if (e.quest.state !== 'objective-complete') { n.say(fallback || 'The work is not finished yet.', 3); return; }
    choices(n, e.quest.title, start, [{ label: 'Turn it in', run: () => rewardQuest(e.world, e) }]);
  };
}
function markAvailable(n, title, text, accept) {
  n.use = () => {
    if (n.depthQuest?.state !== 'available') return;
    choices(n, title, text, [{ label: 'Accept', run: accept }]);
  };
}
function questMarker(world, e, label, color = '#ffe080', use) {
  const ch = site(world, e, label, color, use);
  ch.questObjective = true;
  return ch;
}

const BUILD = {
  lost_adventurer(world, at, spots) {
    const destination = spots.find((s) => dist(s[0], s[1], at[0], at[1]) > 8);
    if (!destination || !world.map.findPath(at[0], at[1], destination[0], destination[1], 20000)) return null;
    const e = questNpc(world, at, 'Lost Adventurer', 'A Safe Road', 'Escort the adventurer to the marked safe room.');
    const n = e.n; e.destination = destination;
    markAvailable(n, e.quest.title, 'I lost the way back to my company. Walk with me to the marked safe room?', () => {
      questState(e, 'accepted', 'Escort the adventurer to the marked safe room.'); e.quest.objectiveTarget = { x: destination[0], y: destination[1], label: 'Safe Room' }; n.followingEscort = true; n.say('Stay close. I will keep up.', 3);
      e.marker = questMarker(world, e, 'Safe Room', '#a0e0ff', () => n.say('I need to reach the safe room first.', 2.5));
      n.onTick = (dt) => {
        if (!n.followingEscort || n.escortDone) return;
        const p = world.player, goal = e.destination;
        if (!p) return;
        if (dist(p.x, p.y, goal[0], goal[1]) < 2.2 && dist(n.x, n.y, goal[0], goal[1]) < 1.8) {
          n.followingEscort = false; n.escortDone = true; questState(e, 'objective-complete', 'Return to the adventurer at the safe room.');
          n.x = goal[0]; n.y = goal[1]; n.say('We made it. Speak with me before you go.', 3);
          returnQuestNpc(e, 'You brought me safely through the dark. Please take this for your trouble.', 'I need to reach the safe room first.');
        } else walk(world, n, dist(p.x, p.y, goal[0], goal[1]) < 2.2 ? goal : [p.x, p.y], 1.8, dt);
      };
    });
    n.use = ((old) => () => {
      if (!n.escortDone && e.quest.state !== 'available') { n.say('Stay close while I find the safe room.', 2.5); return; }
      old();
    })(n.use);
    return e;
  },

  wounded_warrior(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, still: true, name: 'Wounded Warrior', hp: 35 });
    n.feel('worried', 1e9); n.chatter = ['I can still fight...']; world.npcs.push(n);
    const e = { kind: 'wounded_warrior', x: at[0], y: at[1], n, guards: [], used: false };
    n.use = () => {
      if (e.used) { n.say('The salve is holding. Thank you.', 2.5); return; }
      choices(n, 'Wounded Warrior', 'A healing potion would get me back on my feet. You may also leave me to recover.', [
        { label: 'Give healing potion', run: () => { const c = G.char; if (!c || !(c.potions?.hp > 0)) { n.say('You have no healing potion to spare.', 2.5); return; } c.potions.hp--; e.used = true; n.hp = 100; n.feel('proud', 3); buff(world.player, 'wounded_warrior', 'Warrior’s Resolve', 'phys', { dmg: 12, reduce: 5 }, 60, '+12% damage and +5% damage reduction', '#d8a46b'); reward(world, n, { gold: 0.6 }); UI.refresh(); } },
      ]);
    };
    return e;
  },

  wandering_merchant(world, at) {
    const n = makeFolk(world, folkAppearance(world, 'merchant'), at[0], at[1], { calm: true, name: 'Wandering Merchant' });
    world.npcs.push(n); world.props.push({ x: at[0] + 0.8, y: at[1] + 0.4, kind: 'campfire', light: 3 });
    const e = { kind: 'wandering_merchant', x: at[0], y: at[1], n, guards: [], stock: { hp: 2, mp: 2, gem: 1 } };
    const prices = { hp: Math.round(25 + lvlOf(world) * 3), mp: Math.round(25 + lvlOf(world) * 3), gem: Math.round(140 + lvlOf(world) * 18) };
    const openShop = () => {
      const c = G.char;
      if (!c) return;
      UI.dialog({ title: 'Wandering Merchant', html: '<p>A few road supplies, while my stock lasts.</p>', buttons: [
        ...['hp', 'mp', 'gem'].filter((id) => e.stock[id] > 0).map((id) => ({ label: id === 'hp' ? `Healing Potion · ${prices[id]}g` : id === 'mp' ? `Mana Potion · ${prices[id]}g` : `Depth Gem · ${prices[id]}g`, fn: () => {
          if (G.char !== c || c.gold < prices[id] || e.stock[id] <= 0) { sfx('error'); return; }
          if (id !== 'gem' && (c.potions[id] || 0) >= 30) { UI.log('Your potion belt is full.', '#ff8080'); return; }
          c.gold -= prices[id]; e.stock[id]--;
          if (id === 'gem') world.addLoot(new GroundItem(n.x + 0.4, n.y, 'item', { item: rollGroundGem(lvlOf(world) + 2) }));
          else c.potions[id] = (c.potions[id] || 0) + 1;
          UI.refresh(); sfx('gold');
        } })), { label: 'Leave' },
      ] });
    };
    n.use = openShop;
    return e;
  },

  treasure_hunter(world, at, spots) {
    const siteAt = spots.find((s) => dist(s[0], s[1], at[0], at[1]) > 6);
    if (!siteAt || !world.map.walkable(siteAt[0], siteAt[1]) || !world.map.findPath(at[0], at[1], siteAt[0], siteAt[1], 16000)) return null;
    const e = questNpc(world, at, 'Treasure Hunter', 'The Hidden Stash', 'Find and open the marked stash.');
    markAvailable(e.n, e.quest.title, 'I found a sealed cache nearby. Help me reach it, and the contents are yours.', () => {
      questState(e, 'accepted', 'Find and open the marked stash.');
      e.cache = { x: siteAt[0], y: siteAt[1], opened: false, rare: true, reach: 1.4, far: 30, label: 'Hunter\'s Stash', dot: '#ffd060', encounter: e,
        use() { if (this.opened) return; this.opened = true; questState(e, 'objective-complete', 'Return to the hunter to complete the quest.'); dropChest(world, this, world.depth); sparkle(this.x, this.y, 18, '#ffd060', 22, 0.5); e.n.say('A clean find. The stash is yours; I only ask that you tell me how it went.', 3); } };
      e.quest.objectiveTarget = e.cache;
      world.chests.push(e.cache);
      e.n.use = () => {
        if (e.quest.rewardClaimed) { e.n.say('A fine haul. Safe travels.', 2.5); return; }
        if (e.quest.state !== 'objective-complete') { e.n.say('The stash is still waiting at its marked location.', 2.5); return; }
        choices(e.n, e.quest.title, 'The cache was worth the risk. The treasure is yours; thank you for sharing the tale.', [{ label: 'Complete quest', run: () => completeQuest(e, 'The hidden stash is yours.') }]);
      };
    });
    return e;
  },

  trapped_explorer(world, at) {
    const e = questNpc(world, at, 'Trapped Explorer', 'A Way Out', 'Clear the guards, then return to the explorer.');
    e.guards = pack(world, at, randi(2, 3), 'normal'); e.guards.forEach((m) => { m.awake = false; });
    markAvailable(e.n, e.quest.title, 'These creatures have me pinned down. Drive them off and come back for me.', () => {
      questState(e, 'accepted', 'Defeat the creatures holding the explorer.'); e.quest.objectiveTarget = () => e.guards.find((m) => !m.dead && world.creatures.includes(m)) || e.n; for (const m of e.guards) m.awake = true;
      e.n.say('I will stay here until it is safe.', 2.5);
      e.n.use = () => {
        if (e.quest.state === 'objective-complete') return choices(e.n, e.quest.title, 'The way is clear. I can get out now. Please take this for helping me.', [{ label: 'Rescue and claim reward', run: () => rewardQuest(world, e) }]);
        e.n.say(guardsAround(e).length ? 'They are still here. Please help!' : 'I am checking the passage.', 2.5);
      };
      e.n.onTick = () => { if (e.quest.state === 'accepted' && !guardsAround(e).length) { questState(e, 'objective-complete', 'Return to the explorer and help them escape.'); e.n.feel('relieved', 3); e.n.say('The path is clear! Come back and help me out.', 3); } };
    });
    return e;
  },

  cursed_wanderer(world, at) {
    const e = questNpc(world, at, 'Cursed Wanderer', 'The Bound Soul', 'Choose whether to break the curse or leave.');
    e.n.feel('scared', 1e9);
    e.n.use = () => {
      if (e.quest.state !== 'available') { e.n.say(e.quest.state === 'failed' ? 'The curse has claimed what remains of me.' : 'The chains are gone. You have my thanks.', 2.5); return; }
      choices(e.n, e.quest.title, 'A curse is eating at me. A rejuvenation draught might break it, but the binding could lash out.', [
      { label: 'Spend a rejuvenation potion', run: () => { const c = G.char; if (!c || !(c.potions?.rejuv > 0)) { e.n.say('You carry no rejuvenation draught.', 2.5); return; } c.potions.rejuv--; questState(e, 'rewarded', 'The curse is lifted.'); e.quest.rewardClaimed = true; e.n.use = () => e.n.say('The chains are gone. You have my thanks.', 2.5); e.n.feel('relieved', 4); e.n.say('The chains are gone. You have my thanks.', 3); reward(world, e.n, { gold: 0.75 }); buff(world.player, 'cursebreaker', 'Cursebreaker’s Grace', 'holy', { res: 12 }, 50, '+12 all resistances', '#b8e8ff'); UI.refresh(); } },
      { label: 'Refuse', run: () => { e.n.say('Then the curse will choose for me!', 2); e.n.feel('angry', 2); const m = pack(world, [e.x, e.y], 1, 'champion')[0]; if (m) { m.name = 'The Cursed Wanderer'; m.awake = true; m.maxHp *= 1.4; m.hp = m.maxHp; } world.npcs.splice(world.npcs.indexOf(e.n), 1); questState(e, 'failed', 'The curse took hold; the wanderer is lost.'); } },
      ]);
    };
    return e;
  },

  suspicious_stranger(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, still: true, name: 'Suspicious Stranger' });
    world.npcs.push(n); const e = { kind: 'suspicious_stranger', x: at[0], y: at[1], n, guards: [], used: false };
    n.use = () => {
      if (e.used) { n.say('Our business is finished.', 2.5); return; }
      choices(n, 'A Convenient Offer', '“A map to a hidden cache, for a little trust.” The stranger insists the bargain is fair.', [{ label: 'Take the bargain', run: () => {
        e.used = true;
        const roll = Math.random();
        if (roll < 0.55) { reward(world, n, { items: 1, gold: 1.2, gem: chance(0.18) }); n.say('See? A bargain kept.', 2.5); }
        else if (roll < 0.82) { const amount = Math.round((25 + lvlOf(world) * 8) * goldScale(lvlOf(world))); world.addLoot(new GroundItem(n.x, n.y, 'gold', { amount })); n.say('The map was genuine. The treasure is close.', 2.5); }
        else { n.say('You were supposed to look the other way.', 2); ambush(world, 'drop', randi(2, 4)); }
      } }]);
    };
    return e;
  },

  lost_cartographer(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, name: 'Lost Cartographer' });
    world.npcs.push(n); const e = { kind: 'lost_cartographer', x: at[0], y: at[1], n, guards: [], used: false };
    n.use = () => {
      if (e.used) { n.say('That is all the safe ground I could chart.', 2.5); return; }
      choices(n, 'Lost Cartographer', 'I can mark a safe stretch of this floor on your map.', [{ label: 'Reveal nearby rooms', run: () => {
        e.used = true; const map = world.map, radius = 15, cx = Math.floor(n.x), cy = Math.floor(n.y);
        if (map.seen) for (let y = Math.max(0, cy - radius); y <= Math.min(map.h - 1, cy + radius); y++) for (let x = Math.max(0, cx - radius); x <= Math.min(map.w - 1, cx + radius); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) map.markSeen ? map.markSeen(x, y) : map.seen[y * map.w + x] = 1;
        sparkle(n.x, n.y, 12, '#80d8ff', 20, 0.5); n.say('There. Mind the blank spaces beyond it.', 3); UI.log('<b>Cartographer</b> marks nearby rooms on your map.', '#80d8ff'); UI.refresh();
      } }]);
    };
    return e;
  },

  injured_mage(world, at) {
    const n = makeFolk(world, (v) => v.caster || v.role === 'hedge witch', at[0], at[1], { calm: true, name: 'Injured Mage' });
    world.npcs.push(n); const e = { kind: 'injured_mage', x: at[0], y: at[1], n, guards: [], used: false };
    n.use = () => {
      if (e.used) { n.say('The ward will hold for a while.', 2.5); return; }
      choices(n, 'Injured Mage', 'Help me stabilize this spell and I can lend you one of its effects.', [
        { label: 'Arcane force', run: () => { e.used = true; buff(world.player, 'mage_aid', 'Mage’s Force', 'arcane', { elemental: { arcane: 18 }, dmg: 8 }, 60, '+18% Arcane damage and +8% damage', '#c890ff'); n.say('Let the current carry you.', 2.5); } },
        { label: 'Steady ward', run: () => { e.used = true; buff(world.player, 'mage_mana', 'Mage’s Reserve', 'arcane', { res: 8, cdr: 8 }, 60, '+8 all resistances and +8% cooldown reduction', '#80d8ff'); n.say('A steadier rhythm. That should help.', 2.5); } },
      ]);
    };
    return e;
  },

  relic_collector(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, name: 'Relic Collector' });
    world.npcs.push(n); const e = { kind: 'relic_collector', x: at[0], y: at[1], n, guards: [], sold: false };
    const price = Math.round((90 + lvlOf(world) * 14) * goldScale(lvlOf(world)));
    n.use = () => {
      if (e.sold) { n.say('My case is empty now.', 2.5); return; }
      choices(n, 'Relic Collector', `One sealed relic recovered from this depth. Price: ${price.toLocaleString()} gold.`, [{ label: `Buy relic · ${price.toLocaleString()} gold`, run: () => {
        const c = G.char; if (!c || c.gold < price || e.sold) { UI.log('You cannot afford that relic.', '#ff8080'); sfx('error'); return; }
        c.gold -= price; e.sold = true; world.addLoot(new GroundItem(n.x + 0.5, n.y, 'item', { item: rollGroundItem(lvlOf(world) + 2, { mf: world.player?.st.magicFind || 0, bonus: 1 }) })); n.say('A fair exchange. Keep it safe.', 2.5); UI.refresh(); sfx('gold');
      } }]);
    };
    return e;
  },

  monster_hunter(world, at) {
    // A Pack Leader Hunt is only selected when a real ordinary pack leader was generated.
    // Never manufacture a substitute champion: that would misrepresent both the quest and leader system.
    const target = world.creatures.find((m) => !m.dead && m.team === 'enemy' && m !== world.boss
      && m.packLeaderType && world.map.findPath(at[0], at[1], m.x, m.y, 20000));
    if (!target) return null;
    const displayName = target.packLeaderName || target.name;
    const e = questNpc(world, at, 'Monster Hunter', 'Pack Leader Hunt', `Find and defeat the Pack Leader: ${displayName}.`);
    target.depthQuestTarget = true; target.name = `Pack Leader: ${target.name}`; e.target = target;
    markAvailable(e.n, e.quest.title, `A Pack Leader is hunting this depth. Find and defeat ${displayName}, then return to me for your reward.`, () => {
      questState(e, 'accepted', `Find and defeat the Pack Leader: ${displayName}.`); e.quest.objectiveTarget = target; target.depthBountyMark = true; target.depthQuestNameplate = true; target.awake = true;
      UI.log(`<b>Pack Leader Hunt:</b> Find and defeat ${displayName}. Its gold target is marked on your dungeon map.`, '#ffe080');
      if (target.dead) {
        questState(e, 'objective-complete', 'Return to the hunter and claim the bounty.');
        UI.log('<b>Pack Leader already defeated.</b> Return to the Monster Hunter for your reward.', '#ffe080');
      }
      e.n.use = () => {
        if (e.quest.rewardClaimed || e.quest.state === 'rewarded') { e.n.say('The mark is paid. You have my thanks.', 2.5); return; }
        if (target.dead && e.quest.state === 'accepted') questState(e, 'objective-complete', 'Return to the hunter and claim the bounty.');
        if (e.quest.state === 'objective-complete') return choices(e.n, e.quest.title, 'That is the mark. Here is your bounty.', [{ label: 'Claim bounty', run: () => rewardQuest(world, e, { gold: 1.5, items: 1, rare: true }) }]);
        e.n.say(`The Pack Leader, ${displayName}, is still out there. Its gold target is marked on your dungeon map.`, 3);
      };
    });
    e.n.onTick = () => { if (e.quest.state === 'accepted' && target.dead) { questState(e, 'objective-complete', 'Return to the hunter and claim the bounty.'); UI.log('<b>Pack Leader defeated.</b> Return to the Monster Hunter for your reward.', '#ffe080'); } };
    return e;
  },

  prisoner(world, at) {
    const e = questNpc(world, at, 'Prisoner', 'The Unlocked Cell', 'Defeat the jailers, then speak to the prisoner.');
    e.guards = pack(world, at, randi(2, 4), 'normal'); e.guards.forEach((m) => { m.awake = false; });
    markAvailable(e.n, e.quest.title, 'The lock is weak, but my jailers are close. Clear them and I can get out.', () => {
      questState(e, 'accepted', 'Defeat the jailers.'); e.quest.objectiveTarget = () => e.guards.find((m) => !m.dead && world.creatures.includes(m)) || e.n; e.guards.forEach((m) => { m.awake = true; });
      e.n.use = () => {
        if (guardsAround(e).length) { e.n.say('They are still guarding the cell!', 2.5); return; }
        if (e.quest.state === 'accepted') questState(e, 'objective-complete', 'Speak to the prisoner now that the jailers are gone.');
        if (e.quest.state !== 'objective-complete') return;
        if (!e.outcome) e.outcome = Math.random() < 0.2 ? 'betrayal' : 'thanks';
        if (e.outcome === 'betrayal') { questState(e, 'failed', 'The prisoner betrayed you.'); e.n.say('You were a fool to trust me!', 2); const m = pack(world, [e.x, e.y], 1, 'champion')[0]; if (m) { m.name = 'The Treacherous Prisoner'; m.awake = true; } world.npcs.splice(world.npcs.indexOf(e.n), 1); }
        else choices(e.n, e.quest.title, 'The prisoner is free and offers a small cache for the risk.', [{ label: 'Accept the reward', run: () => rewardQuest(world, e) }]);
      };
      e.n.onTick = () => {
        if (e.quest.state === 'accepted' && !guardsAround(e).length) {
          questState(e, 'objective-complete', 'The jailers are gone. Speak to the prisoner to claim your reward.');
          e.n.say('The way is clear. Speak to me and I will make good on my promise.', 3);
          UI.log('<b>Prisoner rescued.</b> Return to the prisoner to claim the reward.', '#ffe080');
        }
      };
    });
    return e;
  },

  gambling_adventurer(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, name: 'Gambling Adventurer' });
    world.npcs.push(n); const e = { kind: 'gambling_adventurer', x: at[0], y: at[1], n, guards: [], used: false };
    const wager = Math.max(25, Math.round((45 + lvlOf(world) * 9) * goldScale(lvlOf(world))));
    n.use = () => {
      if (e.used) { n.say('One roll was enough for both of us.', 2.5); return; }
      choices(n, 'Gambling Adventurer', `Care to test your luck? The wager is ${wager.toLocaleString()} gold. Win and I double it; lose and it is mine.`, [{ label: `Wager ${wager.toLocaleString()} gold`, run: () => {
        const c = G.char; if (!c || c.gold < wager || e.used) { sfx('error'); return; }
        e.used = true; c.gold -= wager;
        const won = chance(0.45);
        if (won) { c.gold += wager * 2; n.say('Fortune favors the bold!', 2.5); }
        else n.say('The house wins this time.', 2.5);
        UI.refresh(); sfx(won ? 'gold' : 'error');
      } }]);
    };
    return e;
  },

  mysterious_pilgrim(world, at) {
    const e = questNpc(world, at, 'Mysterious Pilgrim', 'A Pilgrim’s Choice', 'Choose one temporary blessing and its burden.');
    e.n.use = () => {
      if (e.quest.state !== 'available') { e.n.say('The blessing is already yours.', 2.5); return; }
      choices(e.n, e.quest.title, 'Every blessing carries a burden. Choose one; the effect lasts 60 seconds.', [
        { label: 'Might · defense reduced', run: () => { questState(e, 'rewarded', 'Might’s blessing is active for 60 seconds.'); buff(world.player, 'pilgrim_might', 'Pilgrim’s Might', 'holy', { dmg: 24, reduce: -12 }, 60, '+24% damage, -12% damage reduction', '#ffe080'); } },
        { label: 'Fleetness · maximum life reduced', run: () => { questState(e, 'rewarded', 'Fleetness is active for 60 seconds.'); buff(world.player, 'pilgrim_fleet', 'Pilgrim’s Fleetness', 'holy', { speed: 25, life: -10 }, 60, '+15% movement speed, -10% maximum life', '#a0e0ff'); } },
        { label: 'Clarity · resistance reduced', run: () => { questState(e, 'rewarded', 'Clarity is active for 60 seconds.'); buff(world.player, 'pilgrim_clarity', 'Pilgrim’s Clarity', 'holy', { cdr: 20, res: -8 }, 60, '+20% cooldown reduction, -8 all resistances', '#d0a0ff'); } },
      ]);
    };
    return e;
  },

  desperate_scavenger(world, at) {
    const n = makeFolk(world, folkAppearance(world), at[0], at[1], { calm: true, name: 'Desperate Scavenger' });
    world.npcs.push(n); const e = { kind: 'desperate_scavenger', x: at[0], y: at[1], n, guards: [], traded: false };
    n.use = () => {
      if (e.traded) { n.say('That was my last usable thing.', 2.5); return; }
      choices(n, 'Desperate Scavenger', 'I can trade a sealed gem I found for some gold. No haggling.', [{ label: `Buy a gem · ${Math.round(60 + lvlOf(world) * 10)} gold`, run: () => {
        const c = G.char, cost = Math.round(60 + lvlOf(world) * 10); if (!c || c.gold < cost || e.traded) { sfx('error'); return; }
        c.gold -= cost; e.traded = true; world.addLoot(new GroundItem(n.x + 0.5, n.y, 'item', { item: rollGroundGem(lvlOf(world) + 1) })); UI.refresh(); sfx('gold');
      } }]);
    };
    return e;
  },

  fallen_knight(world, at) {
    const target = pack(world, [at[0] + 4, at[1]], 1, 'champion')[0];
    if (!target || !world.map.findPath(at[0], at[1], target.x, target.y, 20000)) { if (target) world.remove(target); return null; }
    const e = questNpc(world, at, 'Fallen Knight', "The Knight's Challenge", 'Defeat the knight in an optional duel, then return.');
    e.target = target;
    e.target.name = 'The Fallen Knight'; e.target.depthBountyMark = true; e.target.awake = false; e.target.maxHp *= 1.35; e.target.hp = e.target.maxHp; e.target.dmg *= 0.85;
    e.n.use = () => {
      if (e.quest.state === 'available') return choices(e.n, e.quest.title, 'I will test your mettle, if you choose. A victory earns my last treasure; refusal carries no shame.', [
        { label: 'Accept duel', run: () => { questState(e, 'accepted', 'Defeat the Fallen Knight and return.'); e.quest.objectiveTarget = e.target; e.target.awake = true; } },
        { label: 'Refuse duel', run: () => { questState(e, 'declined', 'You declined the optional duel.'); world.remove(e.target); e.target = null; e.n.say('Then go in peace. No shame in choosing your battles.', 3); } },
      ]);
      if (e.quest.rewardClaimed || e.quest.state === 'rewarded') { e.n.say('The duel is settled. You have my thanks.', 2.5); return; }
      if (e.target?.dead && e.quest.state === 'accepted') questState(e, 'objective-complete', 'Return to the challenger.');
      if (e.quest.state === 'objective-complete') return choices(e.n, e.quest.title, 'You fought with honor. Take the knight\'s reward.', [{ label: 'Claim reward', run: () => rewardQuest(world, e, { items: 1, rare: true, gem: true }) }]);
      e.n.say('The challenge is yours if you wish to begin.', 2.5);
    };
    e.n.onTick = () => { if (e.quest.state === 'accepted' && e.target?.dead) questState(e, 'objective-complete', 'Return to the challenger.'); };
    return e;
  },

  // Existing encounters follow. Their identities and mechanics stay intact; quest states are
  // surfaced in the common tracker and one-per-floor selection now governs them too.
  // a captive held by a pack: kill the guards, then cut them loose
  captive(world, at) {
    const royal = chance(0.12);
    const who = royal ? pick(TOWNSFOLK.filter((v) => v.courtier || v.role === 'princess' || v.role === 'prince'))
      : folkAppearance(world);
    const n = makeFolk(world, who, at[0], at[1], { calm: true, still: true });
    n.feel('worried', 1e9);
    n.chatter = ['Help me! Please!', 'Are they gone?', 'Untie me, quick!'];
    world.npcs.push(n);
    const e = { kind: 'captive', x: at[0], y: at[1], n, guards: pack(world, at, randi(3, 5), 'champion') };
    e.world = world; e.quest = trackQuest(world, n, 'Free the Captive', 'Defeat the guards and speak to the captive.');
    const rescue = () => {
      if (e.quest.rewardClaimed) { n.say('You already freed me. I will never forget it.', 2.5); return; }
      if (e.quest.state === 'available') {
        return choices(n, 'Free the Captive', 'The guards have me trapped. Defeat them, then speak to me again to finish the rescue.', [{ label: 'Accept and help', run: () => {
          questState(e, 'accepted', 'Defeat the guards threatening the captive.');
          e.quest.objectiveTarget = () => e.guards.find((m) => !m.dead && world.creatures.includes(m)) || n;
          for (const m of e.guards) m.awake = true;
          n.say('Please hurry. They are still here!', 2.5);
        } }]);
      }
      if (e.quest.state === 'accepted' && guardsAround(e).length) { if (!n.talkT) n.say(pick(['Behind you!', 'They\'re still here!', 'Watch out!']), 1.6); n.feel('scared', 1.5); return; }
      if (e.quest.state === 'accepted') questState(e, 'objective-complete', 'The guards are defeated. Speak to the captive to complete the rescue.');
      if (e.quest.state !== 'objective-complete') return;
      marker.opened = true;
      n.calm = false; n.feel('relieved', 2.5); n.face(world.player.x, world.player.y);
      n.say(royal ? 'You... you saved me! The crown will hear of this!' : pick(['Free! Bless you, hero!', 'I thought I was done for!', 'Take this. Take all of it!']), 3);
      n.after(2, () => n.feel('cheer', 3));
      sparkle(n.x, n.y, 20, '#ffd890', 30, 0.6); sfx('gold');
      e.quest.rewardClaimed = true; questState(e, 'rewarded', 'The captive is free.');
      reward(world, n, royal ? { items: 2, rare: true, gold: 3, gem: true } : { items: 1, gold: 1.5 });
      UI.log(`You freed <b>${n.name}</b>${royal ? ' — a royal ransom is yours' : ''}.`, '#ffd890');
      leave(world, n, 7);
    };
    n.use = rescue;
    const marker = site(world, e, `Free ${n.name}`, '#ffd890', rescue);
    e.quest.objectiveTarget = null;
    n.onTick = () => {
      if (e.quest.state === 'accepted' && !guardsAround(e).length) {
        questState(e, 'objective-complete', 'The guards are defeated. Speak to the captive to complete the rescue.');
        n.feel('relieved', 3); n.say('The guards are gone! Speak to me to complete the rescue.', 3);
        UI.log('<b>The captive is safe.</b> Speak to them to claim your rescue reward.', '#ffe080');
      }
    };
    marker.use = rescue;
    return e;
  },

  // a knight holding out against a pack; fight beside them
  laststand(world, at) {
    const k = makeFolk(world, (v) => v.knight, at[0], at[1], { calm: true, still: true });
    k.hp = 160; k.feel('fight', 1e9, false);
    world.npcs.push(k);
    const e = { kind: 'laststand', x: at[0], y: at[1], n: k, guards: pack(world, at, randi(4, 6), 'champion'), started: false, swingT: 0 };
    e.world = world; e.quest = trackQuest(world, k, 'A Knight’s Last Stand', 'Help the knight survive the champion pack.');
    const ch = site(world, e, `${k.name}'s Last Stand`, '#a0c0ff', function () { if (!e.started) { e.started = true; k.say('To me! Hold the line!', 2.5); } });
    k.onTick = (dt) => {
      if (ch.opened) return;
      const p = world.player;
      if (!e.started && p && dist(p.x, p.y, k.x, k.y) < 10) { e.started = true; questState(e, 'accepted', 'Help the knight survive the champion pack.'); e.quest.objectiveTarget = k; k.say(pick(['Hero! To me!', 'Help! I can\'t hold them!', 'Steel and faith - with me!']), 2.5); }
      if (!e.started) return;
      if (!e.woke) { e.woke = true; for (const m of e.guards) m.awake = true; }
      const foes = guardsAround(e, 3);
      if (foes.length) {
        k.hp -= dt * foes.length * (p && dist(p.x, p.y, k.x, k.y) < 8 ? 1.1 : 3);
        if ((e.swingT -= dt) <= 0) { e.swingT = 1.2; const m = foes[0]; k.face(m.x, m.y); k.townAttackT = 0.45; m.hp -= m.maxHp * 0.1; if (m.hp <= 0 && !m.dead) m.hp = 1; }
      }
      if (k.hp <= 0) {
        ch.opened = true; k.feel('dead', 1e9, false); k.name += ' (fallen)';
        questState(e, 'failed', 'The knight fell during the stand.');
        UI.log(`<b>${k.name}</b> has fallen. Their pack is yours.`, '#c0c8d8');
        dropChest(world, { x: k.x + 0.6, y: k.y + 0.4, rare: true }, world.depth);
      } else if (!guardsAround(e, 12).length) {
        ch.opened = true; k.feel('proud', 5); k.say('We held! I swear my oath to you, hero.', 3.5);
        e.quest.rewardClaimed = true; questState(e, 'rewarded', 'The knight’s oath is yours.');
        if (p) buff(p, 'oath', 'Knight\'s Oath', 'holy', { dmg: 35, reduce: 10 }, 90, '+35% damage, 10% less damage taken', '#a0c0ff');
        reward(world, k, { items: 1, gold: 1 });
        k.after(3.5, () => k.feel('cheer', 3));
        leave(world, k, 9);
      }
    };
    return e;
  },

  // a traveling merchant camped by a fire: potions for the road, once
  peddler(world, at) {
    const n = makeFolk(world, (v) => v.merchant, at[0], at[1], { calm: true });
    n.feel('happy', 4);
    n.chatter = ['Mind the dark, friend.', 'Business is slow down here.', 'Don\'t tell the guardian I\'m here.'];
    world.npcs.push(n);
    world.props.push({ x: at[0] + 1.1, y: at[1] + 0.5, kind: 'campfire', light: 4 });
    const e = { kind: 'peddler', x: at[0], y: at[1], n, guards: [] };
    site(world, e, `${n.name}'s Camp`, '#ffb060', function () {
      if (this.opened) return;
      this.opened = true;
      const c = G.char;
      n.face(world.player.x, world.player.y); n.feel('excited', 3);
      n.say(pick(['A hero! Potions for the road, on the house!', 'You look half dead. Here!', 'Free samples! Tell your friends!']), 3);
      if (c?.potions) { c.potions.hp = (c.potions.hp || 0) + 2; c.potions.mp = (c.potions.mp || 0) + 1; }
      floatText(n.x, n.y, 70, '+2 HEALING, +1 MANA', '#ff9080', 13, { life: 2 });
      if (chance(0.5)) reward(world, n, { items: 1, gold: 0.5 });
      UI.log(`<b>${n.name}</b> shares potions from their pack.`, '#ffb060');
      sfx('gold');
    });
    return e;
  },

  // Zebulon the Purple tests a ward: three waves; survive them for a blessing
  wizard(world, at) {
    const z = makeFolk(world, 'wandering wizard', at[0], at[1], { calm: true, still: true });
    z.feel('thinking', 1e9);
    world.npcs.push(z);
    const e = { kind: 'wizard', x: at[0], y: at[1], n: z, guards: [], wave: 0, state: 'wait' };
    const ch = site(world, e, 'Zebulon the Purple', '#c890ff', function () {
      if (e.state !== 'wait') return;
      e.state = 'waves'; z.feel('fight', 1e9, false);
      z.say('Splendid! Stand there. This may summon... things.', 3);
    });
    z.onTick = (dt) => {
      if (e.state === 'waves') {
        if ((e.glowT = (e.glowT || 0) - dt) <= 0) { e.glowT = 0.4; sparkle(z.x, z.y, 3, '#c890ff', 30, 0.4); addLight(z.x, z.y, 3, 0.5, 20, '#c890ff'); }
        if (!guardsAround(e, 14).length) {
          if (e.wave >= 3) {
            e.state = 'done'; ch.opened = true; z.feel('cheer', 4); z.say('It works! You have my thanks — and my blessing.', 3.5);
            const p = world.player;
            if (p) buff(p, 'zebulon', 'Purple Blessing', 'arcane', { xp: 60, cdr: 20 }, 120, '+60% experience, 20% faster cooldowns', '#c890ff');
            addEffect(new Column(z.x, z.y, '#c890ff', 0.8, 30, 260));
            reward(world, z, { items: 1, gold: 1, gem: true });
            leave(world, z, 10);
          } else {
            e.wave++;
            addEffect(new Ring(z.x, z.y, 0.3, 5, 0.6, '#c890ff', 5));
            e.guards.push(...pack(world, [z.x + rand(-4, 4), z.y + rand(-4, 4)], 2 + e.wave * 2, e.wave === 3 ? 'champion' : 'normal'));
            for (const m of e.guards) m.awake = true;
            if (e.wave > 1) z.say(pick(['More of them! Fascinating!', 'Hold! The ward is nearly stable!', 'Oh dear. Oh dear oh dear.']), 2.2);
          }
        }
      }
    };
    return e;
  },

  // Nan Bramble's cauldron: drink and see
  witch(world, at) {
    const w = makeFolk(world, 'hedge witch', at[0], at[1], { calm: true });
    w.feel('thinking', 1e9);
    world.npcs.push(w);
    world.props.push({ x: at[0] + 1, y: at[1] + 0.4, kind: 'campfire', light: 3.5 });
    const e = { kind: 'witch', x: at[0], y: at[1], n: w, guards: [] };
    site(world, e, 'Nan Bramble\'s Cauldron', '#80ff90', function () {
      if (this.opened) return;
      this.opened = true;
      const p = world.player;
      w.face(p.x, p.y);
      burst(w.x + 1, w.y + 0.4, 20, 'poison', 30, 4, { up: 2 });
      if (chance(0.72)) {
        w.feel('proud', 4); w.say(pick(['Drink up, dearie. Good for what ails you.', 'Nettle and moonmoss. You\'ll feel ten feet tall.', 'Only a little frog in it.']), 3.5);
        p.hp = p.maxHp; p.mana = p.maxMana;
        buff(p, 'bramble', 'Bramble Brew', 'poison', pick([{ life: 30, regen: 20 }, { as: 30 }, { mf: 120, gf: 120 }, { dmg: 30 }]), 90, 'a witch\'s blessing', '#80ff90');
      } else {
        w.feel('embarrassed', 4); w.say('Ah. That was the OTHER cauldron. Run, dearie!', 3);
        ambush(world, 'drop', randi(3, 5));
      }
    });
    return e;
  },

  // a Greener jumps out at you, then runs to the treasure they found and waits there, pointing
  greener(world, at, spots) {
    const g = makeFolk(world, (v) => v.familyId === 'greener', at[0], at[1], { calm: true });
    g.feel('suspicious', 1e9); g.hidden = false;
    world.npcs.push(g);
    const loot = spots.length ? spots.pop() : near(world, at, 8);
    const e = { kind: 'greener', x: at[0], y: at[1], n: g, guards: [], state: 'lurk', loot };
    e.world = world; e.quest = trackQuest(world, g, 'The Greener’s Hidden Cache', 'Follow the Greener to its cache and open it.');
    const cache = { x: loot[0], y: loot[1], opened: false, reach: 1.3, rare: true, far: 30, hidden: true,
      use() { if (this.opened || this.hidden) return; this.opened = true; sfx('chest'); sfx('gold'); dropChest(world, this, world.depth); e.quest.rewardClaimed = true; questState(e, 'rewarded', 'The cache is yours.'); sparkle(this.x, this.y, 20, '#ffd060', 20, 0.5); g.feel('cheer', 4); g.say('Told you! Half is mine. ...Fine, all yours.', 3); leave(world, g, 5); } };
    const ch = site(world, e, `${g.name}?`, '#a0ff80', function () { if (e.state === 'lurk') g.use(); });
    const spring = () => {
      if (e.state !== 'lurk') return;
      e.state = 'lead'; ch.opened = true;
      questState(e, 'accepted', 'Follow the Greener to its hidden cache.');
      e.quest.objectiveTarget = g;
      UI.log('<b>The Greener\'s Hidden Cache:</b> Follow the Greener to the hidden chest.', '#ffe080');
      g.feel('spooky', 1.8); g.say(pick(['BOO!', 'RAAAH! Got you!', 'Woooo, a dungeon ghost!']), 1.8);
      g.after(1.8, () => { g.feel('laugh', 2.5); g.say('Ha! Your face! Come on, I found treasure!', 2.5); });
      g.after(3.8, () => { e.state = 'run'; });
    };
    g.use = () => {
      if (e.state === 'lurk') choices(g, 'The Greener', '“I found a treasure chest! Follow me and it is yours.” The little goblin grins too widely.', [{ label: 'Follow the Greener', run: spring }]);
      else if (e.state === 'wait') g.say('The cache is right there. All yours!', 2.5);
      else g.say('Keep up!', 2.5);
    };
    g.onTick = (dt) => {
      const p = world.player;
      if (e.state === 'run') {
        const d = dist(g.x, g.y, loot[0], loot[1]);
        if (d < 1.4) { e.state = 'wait'; cache.hidden = false; world.chests.push(cache); e.quest.objective = 'Open the hidden chest.'; e.quest.objectiveTarget = cache; UI.refresh(); UI.log('<b>The Greener found the cache.</b> Open the marked chest.', '#ffe080'); g.feel('point', 1e9); g.face(loot[0] + 1, loot[1]); g.say('Here! HERE!', 2); }
        else {
          // run ahead, but wait up for the hero
          if (p && dist(p.x, p.y, g.x, g.y) > 9) { g.face(p.x, p.y); if (!g.talkT && chance(dt * 0.4)) g.say('Keep up!', 1.4); g.feel('impatient', 0.5, false); return; }
          walk(world, g, loot, 3.4, dt);
        }
      }
    };
    return e;
  },
};

export const NPC_ENCOUNTER_CATALOG = Object.freeze(ENCOUNTERS.map((id) => Object.freeze({ id, rarity: ENCOUNTER_RARITY[id], implemented: typeof BUILD[id] === 'function' })));

function walk(world, n, target, speed, dt) {
  const map = world.map;
  if (!n.path || (n.repath = (n.repath || 0) - dt) <= 0) { n.path = map.findPath(n.x, n.y, target[0], target[1], 30000, 0.3) || []; n.repath = 1; }
  while (n.path.length > 1 && Math.hypot(n.x - n.path[0][0], n.y - n.path[0][1]) < 0.35) n.path.shift();
  if (!n.path.length) { n.repath = 1; return; }
  const [tx, ty] = n.path[0], d = Math.hypot(tx - n.x, ty - n.y), k = Math.min(1, dt * speed / Math.max(d, 1e-3));
  const nx = n.x + (tx - n.x) * k, ny = n.y + (ty - n.y) * k;
  if (map.walkable(nx, ny)) { n.flip = townFacingFlip(nx - n.x, ny - n.y, n.flip); n.walking = true; n.running = true; n.walkT += dt; n.x = nx; n.y = ny; } else n.path = null;
}

/** Rats are harmless NPCs rather than Creatures, so move them through the map's body collision explicitly. */
export function walkRat(world, rat, target, speed, dt) {
  const map = world.map;
  if (!map.circleFree(rat.x, rat.y, RAT_BODY_RADIUS)) return false;
  if (!rat.path || (rat.repath = (rat.repath || 0) - dt) <= 0) {
    rat.path = map.findPath(rat.x, rat.y, target[0], target[1], 30000, RAT_BODY_RADIUS + 0.06) || [];
    rat.repath = 0.8;
  }
  if (!rat.path.length) return false;

  let remaining = Math.min(Math.max(0, dt) * speed, 0.75);
  let moved = false;
  while (remaining > 1e-4 && rat.path.length) {
    while (rat.path.length > 1 && Math.hypot(rat.x - rat.path[0][0], rat.y - rat.path[0][1]) < 0.35) rat.path.shift();
    const [tx, ty] = rat.path[0], dx = tx - rat.x, dy = ty - rat.y, d = Math.hypot(dx, dy);
    if (d < 1e-4) { rat.path.shift(); continue; }
    const step = Math.min(remaining, 0.12, d);
    const ox = rat.x, oy = rat.y;
    map.move(rat, dx / d * step, dy / d * step, false);
    const actual = Math.hypot(rat.x - ox, rat.y - oy);
    if (actual < 1e-5) { rat.path = null; break; }
    rat.flip = townFacingFlip(rat.x - ox, rat.y - oy, rat.flip);
    rat.walking = true; rat.walkT += dt; moved = true;
    remaining -= actual;
  }
  return moved;
}

// ------------------------------------------------------------------------------------------------ rats
/** A few rats that scurry about the rooms and bolt from the hero (harmless, not monsters). */
export function addRats(world, n) {
  const v = ANIMALS.find((a) => a.species === 'rat'), map = world.map, rooms = world.rooms || [];
  if (!v || !rooms.length) return;
  for (let i = 0; i < n; i++) {
    const r = pick(rooms), cx = r.mx ?? r.x + r.w / 2, cy = r.my ?? r.y + r.h / 2;
    let [x, y] = near(world, [cx, cy], 3);
    if (!map.circleFree(x, y, RAT_BODY_RADIUS)) {
      const candidate = map.randomNear(cx, cy, 3);
      if (!candidate || !map.circleFree(candidate[0], candidate[1], RAT_BODY_RADIUS)) continue;
      [x, y] = candidate;
    }
    const rat = makeFolk(world, v, x, y, { calm: true, animal: true, species: 'rat', idleH: v.h, name: 'Rat', reach: 1 });
    rat.r = RAT_BODY_RADIUS / 0.8;
    rat.townsfolkSpriteId = v.spriteId; rat.frameCount = v.frame.count;
    rat.onTick = (dt) => {
      const p = world.player;
      if (p && dist(p.x, p.y, rat.x, rat.y) < 3.5 && !rat.fleeT) {
        rat.fleeT = 2.5; rat.feel('scared', 0.5);
        const a = Math.atan2(rat.y - p.y, rat.x - p.x) + rand(-0.6, 0.6);
        rat.goal = map.randomNear(rat.x + Math.cos(a) * 7, rat.y + Math.sin(a) * 7, 2); rat.path = null;
      }
      if (rat.fleeT) rat.fleeT = Math.max(0, rat.fleeT - dt);
      if (!rat.goal && (rat.waitT = (rat.waitT || rand(1, 4)) - dt) <= 0) { rat.waitT = rand(2, 6); rat.goal = map.randomNear(rat.x + rand(-5, 5), rat.y + rand(-5, 5), 2); rat.path = null; if (chance(0.3)) rat.feel('curious', 2); }
      if (rat.goal) {
        walkRat(world, rat, rat.goal, rat.fleeT ? 3.6 : 1.4, dt);
        rat.running = !!rat.fleeT;
        if (Math.hypot(rat.x - rat.goal[0], rat.y - rat.goal[1]) < 0.3) rat.goal = null;
      }
    };
    world.npcs.push(rat);
  }
}
