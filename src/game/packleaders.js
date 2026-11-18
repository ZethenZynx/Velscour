// Encounter-level pack leaders. Groups are the existing generated spawn records;
// scripted encounters and elite formations are deliberately not rewritten here.
import { PACK_LEADER_CHANCE, PACK_LEADERS } from '../data/packleaders.js';
import { angleTo, chance, dist, rand } from '../core/util.js';
import { addEffect, Ring, Sigil, sparkle, floatText, spawn } from '../gfx/vfx.js';

const LIVE = (m) => m && !m.dead && m.team === 'enemy';
const packMembers = (leader) => (leader.world?.creatures || []).filter((m) => LIVE(m) && m.enemyPackId === leader.enemyPackId);
const timeOf = (m) => m.world?.time || 0;
const setRunePulse = (m, duration = 0.6) => { m.packRunePulseUntil = timeOf(m) + duration; };

function leaderWeight(m, id, cfg, biome, depth) {
  let w = cfg.weight;
  const arch = String(m.arch || '').toLowerCase(), ai = String(m.ai || '').toLowerCase();
  const profiles = m.enemyProfiles || [];
  const climate = `${biome?.id || ''} ${biome?.name || ''}`.toLowerCase();
  const keys = [arch, ai, biome?.id, biome?.el, m.el, ...(profiles.includes('pack') ? ['pack'] : [])];
  if (/snow|frost|summit|ice|winter|tundra/.test(climate)) keys.push('snow', 'ice');
  if (/desert|dune|sand|arid/.test(climate)) keys.push('desert');
  if (m.undead) keys.push('undead');
  if (m.demon) keys.push('demon');
  if (['hound', 'spider', 'bat', 'scorpion', 'worm'].includes(arch)) keys.push('beast');
  for (const key of keys) w *= cfg.bias?.[key] || 1;
  if (m.undead && ['necromancer', 'death_herald', 'blood_priest'].includes(id)) w *= 1.8;
  if (m.demon && ['blood_priest', 'flame_herald', 'berserker'].includes(id)) w *= 1.35;
  if (['hound', 'spider', 'bat', 'scorpion', 'worm'].includes(arch) && id === 'beastmaster') w *= 2.2;
  if (depth < 5 && ['necromancer', 'death_herald'].includes(id)) w *= 0.45;
  if (depth > 30 && ['necromancer', 'death_herald', 'hexcaster'].includes(id)) w *= 1.25;
  return w;
}

function selectLeader(members, biome, depth) {
  const m = members[0], choices = Object.entries(PACK_LEADERS).map(([id, cfg]) => [id, leaderWeight(m, id, cfg, biome, depth)]);
  let n = Math.random() * choices.reduce((sum, x) => sum + x[1], 0);
  for (const [id, weight] of choices) { n -= weight; if (n < 0) return id; }
  return choices[choices.length - 1][0];
}

/** Apply to one ordinary generated spawn group, after its members have been created. */
export function assignPackLeader(world, members, biome = world?.biome, depth = world?.depth, spawn = {}) {
  if (!world || !Array.isArray(members) || members.length < 4 || members.length !== (spawn.n ?? members.length)) return null;
  if ((spawn.rank || 'normal') !== 'normal' || spawn.scripted || spawn.encounter || spawn.noPackLeader || spawn.unique) return null;
  if (members.some((m) => !LIVE(m) || m.rank !== 'normal' || m.summon || m.enemySummoned || m.packLeaderType)) return null;
  if (!chance(PACK_LEADER_CHANCE)) return null;
  const id = selectLeader(members, biome, depth || 1), cfg = PACK_LEADERS[id];
  world.nextEnemyPackId = (world.nextEnemyPackId || 0) + 1;
  const packId = world.nextEnemyPackId, leader = members[0];
  for (const m of members) { m.enemyPackId = packId; m.enemyPackLeaderId = leader.id; }
  world.packLeadersById ||= Object.create(null);
  world.packLeadersById[leader.id] = leader;
  leader.enemyBehaviors ||= []; leader.enemyAttacks ||= [];
  if (!leader.enemyBehaviors.includes('pack_leader')) leader.enemyBehaviors.push('pack_leader');
  leader.packLeaderType = id; leader.packLeaderName = cfg.name; leader.packLeaderRole = cfg.role;
  leader.packLeaderRuneColor = cfg.color; leader.packLeaderRuneSprite = null; // future authored sprite slot
  leader.name = `${cfg.name} ${leader.name}`;
  leader.maxHp *= 1.16; leader.hp = Math.min(leader.maxHp, leader.hp * 1.16); leader.dmg *= 1.06;
  leader.packLeaderResurrections = 0; leader.packLeaderSummons = 0; leader.packLeaderCd = 1.4 + Math.random() * 1.8;
  if (cfg.role === 'front') {
    leader.ai = 'melee'; leader.static = false; leader.range = 0; leader.packLeaderAttackRate = 1.08;
  }
  floatText(leader.x, leader.y, 62, cfg.name.toUpperCase(), cfg.color, 10, { life: 1.15 });
  return leader;
}

function currentMembers(leader, radius = 5) {
  return packMembers(leader).filter((m) => dist(m.x, m.y, leader.x, leader.y) <= radius);
}
function pulse(leader, radius = 5, color = leader.packLeaderRuneColor) {
  setRunePulse(leader, 0.85);
  addEffect(new Ring(leader.x, leader.y, 0.35, Math.min(3.4, radius * 0.58), 0.5, color, 2));
  sparkle(leader.x, leader.y, 12, color, 10, 0.35);
}
function buff(leader, fields, duration = 3.8, radius = 5) {
  const until = timeOf(leader) + duration;
  for (const ally of currentMembers(leader, radius)) {
    ally.enemyLeaderBuff = { leaderId: leader.id, until, ...fields };
    if (fields.guard) ally.enemyLeaderGuardPool = Math.max(12, ally.maxHp * 0.18);
    addEffect(new Ring(ally.x, ally.y, 0.16, 0.9, 0.32, leader.packLeaderRuneColor, 1), 'ground');
  }
}
function injuredAlly(leader) {
  return currentMembers(leader, 5).filter((m) => m.hp < m.maxHp * 0.8)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}
function corpses(leader) {
  return (leader.world.corpses || []).filter((c) => !c.used && !c.enemyRevivedOnce && c.enemyPackId === leader.enemyPackId && dist(leader.x, leader.y, c.x, c.y) <= 5);
}
function nearestPackCorpse(leader) {
  return (leader.world.corpses || []).filter((c) => !c.used && !c.enemyRevivedOnce && c.enemyPackId === leader.enemyPackId)
    .sort((a, b) => dist(leader.x, leader.y, a.x, a.y) - dist(leader.x, leader.y, b.x, b.y))[0] || null;
}
function abilityReady(m, key, cd) {
  if ((m.packLeaderAbilityCd?.[key] || 0) > timeOf(m)) return false;
  m.packLeaderAbilityCd ||= {}; m.packLeaderAbilityCd[key] = timeOf(m) + cd;
  return true;
}
function moveTo(leader, x, y, dt, speedMul = 1) {
  const [gx, gy] = leader.world.map.nudge(x, y, leader.r || 0.3);
  if (!leader.world.map.circleFree(gx, gy, leader.r || 0.3)) return false;
  leader.navTo(gx, gy, dt, leader.speed * speedMul); leader.moving = true; return true;
}
function rolePosition(leader, target, d, dt) {
  const role = leader.packLeaderRole;
  if (!target || leader.static) return false;
  const mates = currentMembers(leader, 8).filter((m) => m !== leader);
  if (role === 'front') {
    if (d > 2.2) return moveTo(leader, target.x, target.y, dt, leader.packLeaderType === 'berserker' ? 1.2 : 1.05);
    return false;
  }
  if (role === 'rear') {
    const desired = 5.6;
    if (d >= 4.3 && d <= 7.2) return false;
    const a = angleTo(target.x, target.y, leader.x, leader.y);
    const preferred = mates.length ? mates.reduce((p, m) => ({ x: p.x + m.x / mates.length, y: p.y + m.y / mates.length }), { x: 0, y: 0 }) : { x: leader.x, y: leader.y };
    const behind = angleTo(target.x, target.y, preferred.x, preferred.y);
    const ang = d < 4.3 ? a : behind;
    return moveTo(leader, target.x + Math.cos(ang) * desired, target.y + Math.sin(ang) * desired, dt, d < 4.3 ? 1.15 : 0.95);
  }
  if (d >= 3.1 && d <= 5.8) return false;
  const ang = angleTo(target.x, target.y, leader.x, leader.y), radius = d < 3.1 ? 4.3 : 4.6;
  return moveTo(leader, target.x + Math.cos(ang) * radius, target.y + Math.sin(ang) * radius, dt, d < 3.1 ? 1.05 : 0.9);
}

function useAbility(leader, target) {
  const id = leader.packLeaderType, mates = currentMembers(leader, 5), player = leader.world.player;
  switch (id) {
    case 'war_shaman':
      if (abilityReady(leader, 'chant', 8.5)) { buff(leader, { damage: 0.14 }, 4.2); pulse(leader); floatText(leader.x, leader.y, 56, 'WAR RITE', '#ef5962', 9); return true; } break;
    case 'healer': {
      const ally = injuredAlly(leader);
      if (ally && abilityReady(leader, 'heal', 6.4)) { ally.heal(Math.min(ally.maxHp * 0.23, ally.maxHp - ally.hp)); sparkle(ally.x, ally.y, 16, '#24C966', 12, 0.45); addEffect(new Ring(ally.x, ally.y, 0.18, 1.35, 0.35, '#24C966', 2)); setRunePulse(leader); return true; }
      break;
    }
    case 'necromancer': {
      const c = corpses(leader)[0];
      if (c && leader.packLeaderResurrections < 2 && abilityReady(leader, 'raise', 13)) {
        const revived = leader.spawnEnemyMinion?.(c.arch || 'skeleton', false, false, c.x, c.y);
        if (revived) { c.used = true; c.enemyRevivedOnce = true; leader.packLeaderResurrections++;
          revived.enemyPackId = leader.enemyPackId; revived.enemyPackLeaderId = leader.id;
          revived.maxHp = Math.max(1, c.maxHp * 0.28); revived.hp = revived.maxHp; revived.dmg *= 0.75;
          sparkle(c.x, c.y, 20, '#AD4DFF', 18, 0.55); addEffect(new Ring(c.x, c.y, 0.15, 1.7, 0.45, '#AD4DFF', 3)); setRunePulse(leader); return true; }
      }
      break;
    }
    case 'summoner': {
      const active = leader.world.creatures.filter((m) => LIVE(m) && m.enemySummoned && m.enemySummoner === leader).length;
      if (active < 2 && (leader.packLeaderSummons < 4) && abilityReady(leader, 'summon', 10.5)) {
        const minion = leader.spawnEnemyMinion?.(leader.undead ? 'skeleton' : 'ghoul');
        if (minion) { minion.enemyPackId = leader.enemyPackId; minion.enemyPackLeaderId = leader.id; leader.packLeaderSummons++; pulse(leader, 3.4, '#F28A19'); return true; }
      }
      break;
    }
    case 'berserker':
      if (leader.hp < leader.maxHp * 0.7 && abilityReady(leader, 'rage', 8)) { leader.packLeaderRageUntil = timeOf(leader) + 5; buff(leader, { damage: 0.12, speed: 0.12, attackRate: 1.12 }, 5, 4.6); pulse(leader); floatText(leader.x, leader.y, 55, 'BLOOD RAGE', '#FF3B66', 9); return true; }
      break;
    case 'war_captain':
      if (abilityReady(leader, 'guard', 8.5)) { buff(leader, { damageReduction: 0.15, resist: 0.1 }, 4.5); pulse(leader); floatText(leader.x, leader.y, 55, 'HOLD FAST', '#78aaff', 9); return true; }
      break;
    case 'battle_drummer':
      if (abilityReady(leader, 'drum', 8)) { buff(leader, { speed: 0.13, attackRate: 1.12 }, 5); pulse(leader, 5.2, '#E8B522'); floatText(leader.x, leader.y, 55, 'WAR BEAT', '#f4d052', 9); return true; }
      break;
    case 'hexcaster':
      if (target?.isPlayer && dist(leader.x, leader.y, target.x, target.y) < 8 && abilityReady(leader, 'hex', 8.2)) {
        target.status.chill = { t: 2.6, amt: 0.18, src: leader };
        target.packLeaderDamageDownUntil = timeOf(leader) + 2.6; target.packLeaderDamageSource = leader;
        addEffect(new Ring(target.x, target.y, 0.25, 1.8, 0.42, '#25C9CE', 3)); sparkle(target.x, target.y, 14, '#25C9CE', 10, 0.45); pulse(leader); floatText(target.x, target.y, 62, 'HEXED', '#25C9CE', 9); return true;
      }
      break;
    case 'shieldbearer':
      if (abilityReady(leader, 'shield', 7.5)) { buff(leader, { damageReduction: 0.22, guard: true }, 4.2, 4.6); pulse(leader, 4.6, '#9eafc2'); floatText(leader.x, leader.y, 55, 'SHIELD WALL', '#aabbd1', 9); return true; }
      break;
    case 'blood_priest': {
      const sacrifice = mates.filter((m) => m.rank === 'normal' && m.hp > m.maxHp * 0.4).sort((a, b) => b.hp - a.hp)[0];
      if (sacrifice && abilityReady(leader, 'blood_rite', 9)) {
        sacrifice.hp = Math.max(1, sacrifice.hp - sacrifice.maxHp * 0.12);
        buff(leader, { damage: 0.16 }, 4.5, 5);
        spawn({ type: 'glow', x: sacrifice.x, y: sacrifice.y, z: 10, life: 0.45, size: 4, size1: 0, color: '#9C1E45', add: true });
        pulse(leader, 4.5, '#9C1E45'); floatText(leader.x, leader.y, 55, 'BLOOD TITHE', '#bd4267', 9); return true;
      }
      break;
    }
    case 'beastmaster':
      if (abilityReady(leader, 'hunt', 8)) {
        const beasts = mates.filter((m) => ['hound', 'spider', 'bat', 'scorpion', 'worm'].includes(m.arch));
        for (const beast of beasts) beast.enemyLeaderBuff = { leaderId: leader.id, until: timeOf(leader) + 5, damage: 0.1, speed: 0.12, flank: true };
        if (beasts.length) { pulse(leader, 5, '#77C747'); floatText(leader.x, leader.y, 55, 'FLANK THEM', '#97dd66', 9); return true; }
      }
      break;
    case 'frost_shaman':
      if (abilityReady(leader, 'frost', 8.5)) { buff(leader, { damage: 0.08, element: 'cold', status: 'slow' }, 5); pulse(leader, 5, '#77DAFA'); floatText(leader.x, leader.y, 55, 'FROST VEIL', '#93e6ff', 9); return true; }
      break;
    case 'flame_herald':
      if (abilityReady(leader, 'flame', 8.5)) { buff(leader, { damage: 0.08, element: 'fire', status: 'burn' }, 5); pulse(leader, 5, '#FF6628'); floatText(leader.x, leader.y, 55, 'EMBER OATH', '#ff8b55', 9); return true; }
      break;
    case 'banner_bearer':
      if (abilityReady(leader, 'banner', 8.5)) { buff(leader, { ccResist: 0.55 }, 5); pulse(leader, 4.8, '#D8B85A'); floatText(leader.x, leader.y, 55, 'RALLY', '#e5cb80', 9); return true; }
      break;
    case 'death_herald': break; // reaction lives in packLeaderAllyKilled; never invent a procced death.
    default: break;
  }
  return false;
}

/** Run a leader's action and formation controller. Returns true when it takes over movement. */
export function updatePackLeader(leader, target, distance, dt) {
  if (!leader.packLeaderType || !LIVE(leader)) return false;
  const members = currentMembers(leader, 5);
  leader.packLeaderIsolated = members.filter((m) => m !== leader && !m.enemySummoned).length === 0;
  leader.packLeaderCd = Math.max(0, (leader.packLeaderCd || 0) - dt);
  if (leader.packLeaderCd <= 0) {
    leader.packLeaderCd = 0.25;
    if (useAbility(leader, target)) return true;
  }
  if (leader.packLeaderType === 'necromancer' && leader.packLeaderResurrections < 2 &&
      (leader.packLeaderAbilityCd?.raise || 0) <= timeOf(leader) && !corpses(leader).length) {
    const corpse = nearestPackCorpse(leader);
    if (corpse && dist(leader.x, leader.y, corpse.x, corpse.y) > 2.2) return moveTo(leader, corpse.x, corpse.y, dt, 0.9);
  }
  if (!target) return false;
  return rolePosition(leader, target, distance, dt);
}

export function packLeaderAllyKilled(dead) {
  if (!dead?.enemyPackLeaderId || dead.packLeaderType) return;
  const leader = dead.world?.packLeadersById?.[dead.enemyPackLeaderId];
  if (!LIVE(leader) || leader.packLeaderType !== 'death_herald') return;
  leader.packLeaderLastDeath = timeOf(leader);
  const until = timeOf(leader) + 3.2;
  for (const ally of packMembers(leader)) if (ally !== leader) ally.enemyLeaderBuff = { leaderId: leader.id, until, damage: 0.16, speed: 0.12 };
  setRunePulse(leader, 1); sparkle(dead.x, dead.y, 12, '#A5A8B5', 12, 0.5);
}

export function packLeaderKilled(leader) {
  if (!leader?.packLeaderType) return;
  for (const ally of leader.world?.creatures || []) {
    if (ally.enemyLeaderBuff?.leaderId === leader.id) { ally.enemyLeaderBuff = null; ally.enemyLeaderGuardPool = 0; }
    if (ally.enemyPackLeaderId === leader.id) ally.enemyPackLeaderId = null;
  }
  const player = leader.world?.player;
  if (player?.status?.chill?.src === leader) player.status.chill = null;
  if (player?.packLeaderDamageSource === leader) { player.packLeaderDamageDownUntil = 0; player.packLeaderDamageSource = null; }
  if (leader.world?.packLeadersById) delete leader.world.packLeadersById[leader.id];
  addEffect(new Sigil(leader.x, leader.y, 0.43, 0.55, leader.packLeaderRuneColor, '#eee9d9'), 'ground');
}
