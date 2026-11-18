// Tactical enemy behaviors and the thirty named monster attacks. All presentation uses existing sprites and VFX.
import { ENEMY_PROFILE_BY_ARCH, ENEMY_PROFILES, ENEMY_ATTACK_CONFIG } from '../data/enemyvariety.js';
import { angleTo, dist, rand, chance, pick, TAU } from '../core/util.js';
import { addEffect, Telegraph, Ring, Slash, Bolt, burst, sparkle, spawn, smoke, elem, floatText } from '../gfx/vfx.js';
import { Projectile, Delayed, Area, Fissure, explode, lineTargets, coneTargets } from './hazards.js';
import { updatePackLeader, packLeaderAllyKilled, packLeaderKilled } from './packleaders.js';

const COOLDOWNS = {
  minion_summoning: 9, corpse_reanimation: 12, portal_summoning: 15, sacrificial_summoning: 16,
  ally_healing: 8, protective_barrier: 10, battle_chant: 12, emergency_resurrection: 18,
  shadow_stalker: 0, ceiling_ambush: 0, camouflaged_predator: 0, decoy_ambush: 16,
  short_range_teleport: 9, illusion_copies: 15, elemental_adaptation: 0, unstable_death: 0,
};
const C = (m) => m.world;
const liveEnemy = (c) => c && !c.dead && c.team === 'enemy' && !c.enemySummoned;
const hostile = (c, m) => c && !c.dead && c.team !== m.team && c.targetable !== false && !c.clutter;
const nearest = (m, r, filter = () => true) => C(m).query(m.x, m.y, r, (c) => c !== m && filter(c));
const say = (m, text, color = '#ffd060') => floatText(m.x, m.y, 55, text, color, 10, { life: 0.9 });
const warnCircle = (m, x, y, r, dur = 0.55, color = '#ff4838') => addEffect(new Telegraph({ kind: 'circle', x, y, r, dur, color }), 'ground');
const warnLine = (m, ang, len, dur = 0.6, color = '#ff6040') => addEffect(new Telegraph({ kind: 'line', x: m.x, y: m.y, ang, len, w: 0.55, dur, color }), 'ground');

export function configureEnemyVariety(m, arch, art = null) {
  if (m.team !== 'enemy' || m.enemySummoned || m.summon || m.rank === 'boss' || m.ai === 'raid') return;
  const byAi = { melee: ['pack'], swarm: ['pack', 'ambusher'], brute: ['charger', 'defender'], charger: ['charger'],
    ranged: ['sniper', 'retreat'], caster: ['summoner', 'mystic'], nova: ['support', 'mystic'], beamer: ['sniper', 'mystic'],
    exploder: ['burrower', 'charger'], turret: ['sniper'], aura: ['support'], follow: ['support'] };
  const profiles = ENEMY_PROFILE_BY_ARCH[arch] || (art?.role ? [art.role] : byAi[m.ai] || []);
  const behaviors = new Set(), attacks = new Set();
  for (const id of profiles) {
    const p = ENEMY_PROFILES[id];
    for (const b of p?.behaviors || []) behaviors.add(b);
    for (const a of p?.attacks || []) attacks.add(a);
  }
  // Zombies carry the requested unstable corpse burst without receiving the rest of the magical profile.
  if (arch === 'zombie') { behaviors.add('unstable_death'); attacks.add('death_burst'); }
  if (!behaviors.size) return;
  m.enemyProfiles = profiles.slice();
  m.enemyBehaviors = [...behaviors];
  m.enemyAttacks = [...attacks];
  m.enemyAbilityCd = 2.5 + Math.random() * 3;
  m.enemyBehaviorCd = Object.fromEntries([...behaviors].map((b) => [b, 2 + Math.random() * (COOLDOWNS[b] || 3)]));
  m.enemyAttackCd = 2.5 + Math.random() * 3;
  m.enemyAttackPick = 0;
  m.enemyCallCd = 0;
}

function tickTimers(m, dt) {
  for (const k of ['enemyAbilityCd', 'enemyAttackCd', 'enemyCallCd', 'enemyCounterCd', 'enemyChargeCd', 'tunnelPursuitCd', 'revengeT', 'rageT', 'withdrawT', 'surrenderT', 'surrenderWait', 'stealthT', 'barrierT', 'defenseT', 'stunT', 'adaptT', 'decoyCd', 'resurrectionLock']) {
    if (m[k] > 0) m[k] = Math.max(0, m[k] - dt);
  }
  if (m.enemyAdapt?.t > 0 && (m.enemyAdapt.t -= dt) <= 0) m.enemyAdapt = null;
  if (m.enemyBarrier?.t > 0 && (m.enemyBarrier.t -= dt) <= 0) m.enemyBarrier = null;
  if (m.enemyBuff?.t > 0 && (m.enemyBuff.t -= dt) <= 0) m.enemyBuff = null;
}

function nearbyAllies(m, r = 5) { return nearest(m, r, (c) => liveEnemy(c)); }
function applyPackTactics(m, target, d, dt, allies) {
  const leaderFlank = m.enemyLeaderBuff?.until > (C(m).time || 0) && m.enemyLeaderBuff.flank;
  if (!m.enemyBehaviors.includes('pack_leader') && !leaderFlank && !m.enemyBehaviors.includes('coordinated_flanking')) return false;
  if (!target || m.static || (!leaderFlank && !m.enemyBehaviors.includes('coordinated_flanking'))) return false;
  const range = m.atkRange(target);
  if (d <= range + 0.35) return false;
  const flankers = allies.filter((c) => c.enemyBehaviors?.includes('coordinated_flanking') || (c.enemyLeaderBuff?.until > (C(m).time || 0) && c.enemyLeaderBuff.flank));
  const i = Math.max(0, flankers.findIndex((c) => c.id === m.id));
  const n = Math.max(1, flankers.length);
  const base = angleTo(target.x, target.y, m.x, m.y);
  const angle = base + (i / n) * TAU + m.strafe * 0.28;
  const radius = Math.max(1.15, range - 0.1);
  const gx = target.x + Math.cos(angle) * radius, gy = target.y + Math.sin(angle) * radius;
  if (C(m).map.circleFree(gx, gy, m.r + 0.04)) {
    m.navTo(gx, gy, dt, m.speed * (m.revengeT > 0 ? 1.12 : 1), false);
    m.moving = true;
    return true;
  }
  return false;
}

function flee(m, target, dt, distance = 5) {
  if (!target) return false;
  const a = angleTo(target.x, target.y, m.x, m.y);
  const map = C(m).map;
  const [x, y] = map.nudge(m.x + Math.cos(a) * distance, m.y + Math.sin(a) * distance, m.r || 0.3);
  m.navTo(x, y, dt, Math.max(m.speed * 1.15, 3.2));
  m.moving = true;
  return true;
}

function supportTick(m, allies, dt) {
  const bs = m.enemyBehaviors, w = C(m);
  if (!bs.some((b) => ['ally_healing', 'protective_barrier', 'battle_chant', 'emergency_resurrection'].includes(b))) return false;
  const cd = m.enemyBehaviorCd || (m.enemyBehaviorCd = {});
  const wounded = allies.filter((a) => a.hp < a.maxHp * 0.72).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const corpse = w.corpses?.find((a) => !a.used && !a.enemyRevivedOnce && dist(m.x, m.y, a.x, a.y) <= 4.5);
  if (bs.includes('emergency_resurrection') && corpse && (cd.emergency_resurrection || 0) <= 0) {
    cd.emergency_resurrection = 19;
    const revived = m.spawnEnemyMinion?.(corpse.arch || 'skeleton', false, false, corpse.x, corpse.y);
    if (revived) {
      corpse.used = true; corpse.enemyRevivedOnce = true;
      revived.maxHp = corpse.maxHp * 0.26; revived.hp = revived.maxHp; revived.enemyRevivedOnce = true; revived.level = corpse.level || revived.level;
      sparkle(corpse.x, corpse.y, 28, '#a070ff', 18, 0.55); addEffect(new Ring(corpse.x, corpse.y, 0.2, 1.7, 0.5, '#bd86ff', 4));
    }
    say(m, 'RETURN, SERVANT', '#c39aff'); return true;
  }
  if (bs.includes('ally_healing') && wounded && (cd.ally_healing || 0) <= 0) {
    cd.ally_healing = 8; warnCircle(m, wounded.x, wounded.y, 1.2, 0.45, '#73e85a');
    wounded.heal(Math.min(wounded.maxHp * 0.22, wounded.maxHp - wounded.hp));
    sparkle(wounded.x, wounded.y, 18, '#86e84f', 12, 0.5); say(m, 'MEND', '#91ed62'); return true;
  }
  if (bs.includes('protective_barrier') && allies.some((a) => !a.enemyBarrier) && (cd.protective_barrier || 0) <= 0) {
    cd.protective_barrier = 11;
    for (const a of [m, ...allies]) a.enemyBarrier = { t: 4, amount: 0.22 };
    addEffect(new Ring(m.x, m.y, 0.5, 3.4, 0.45, '#76caff', 3)); sparkle(m.x, m.y, 18, '#76caff', 14, 0.45); say(m, 'WARD', '#8bd7ff'); return true;
  }
  if (bs.includes('battle_chant') && allies.length && (cd.battle_chant || 0) <= 0) {
    cd.battle_chant = 13;
    for (const a of [m, ...allies]) a.enemyBuff = { t: 5, damage: 0.09, speed: 0.12 };
    addEffect(new Ring(m.x, m.y, 0.3, 2.8, 0.42, '#f4d76c', 3)); say(m, 'WAR CHANT', '#f5d970'); return true;
  }
  return false;
}

function summonTick(m, allies) {
  const bs = m.enemyBehaviors, cd = m.enemyBehaviorCd || (m.enemyBehaviorCd = {});
  if (!bs.some((b) => ['minion_summoning', 'corpse_reanimation', 'portal_summoning', 'sacrificial_summoning'].includes(b))) return false;
  const w = C(m), roster = ['skeleton', 'ghoul', 'bat'];
  const spawnOne = (strong = false) => m.spawnEnemyMinion?.(pick(roster), strong);
  const corpses = (w.corpses || []).filter((c) => !c.used && !c.enemyRevivedOnce && dist(m.x, m.y, c.x, c.y) <= 5);
  if (bs.includes('corpse_reanimation') && corpses.length && (cd.corpse_reanimation || 0) <= 0) {
    cd.corpse_reanimation = 13; const c = pick(corpses);
    const revived = m.spawnEnemyMinion?.(c.arch || 'skeleton', false, false, c.x, c.y);
    if (revived) {
      c.used = true; c.enemyRevivedOnce = true;
      revived.maxHp = c.maxHp * 0.24; revived.hp = revived.maxHp; revived.enemyRevivedOnce = true; revived.level = c.level || revived.level;
      sparkle(c.x, c.y, 24, '#89a8ff', 18, 0.55); addEffect(new Ring(c.x, c.y, 0.2, 1.6, 0.45, '#8caaff', 4)); say(m, 'RISE AGAIN', '#a7baff'); return true;
    }
  }
  const owned = w.creatures.filter((c) => !c.dead && c.enemySummoned && c.enemySummoner === m).length;
  if (owned >= 3) return false;
  if (bs.includes('sacrificial_summoning') && allies.length && owned < 2 && w.creatures.filter((c) => !c.dead && c.enemySummoned).length < 24 && (cd.sacrificial_summoning || 0) <= 0) {
    const sacrifice = allies.filter((a) => a.rank === 'normal').sort((a, b) => a.hp - b.hp)[0];
    if (sacrifice) {
      cd.sacrificial_summoning = 17; sacrifice.dead = true; sacrifice.hp = 0;
      const summoned = spawnOne(true); if (summoned) { say(m, 'OFFERING ACCEPTED', '#ff8c58'); return true; }
    }
  }
  if (bs.includes('portal_summoning') && (cd.portal_summoning || 0) <= 0) {
    cd.portal_summoning = 16; const x = m.x, y = m.y; warnCircle(m, x, y, 1.25, 0.9, '#bf65ff');
    w.addHazard({ t: 0, dead: false, update(dt) { this.t += dt; if (this.t >= 0.95) { this.dead = true; spawnOne(false); spawnOne(false); sparkle(x, y, 24, '#bd68ff', 20, 0.55); return false; } return true; }, draw() {} });
    addEffect(new Ring(x, y, 0.4, 1.8, 0.85, '#b650ff', 4)); say(m, 'PORTAL OPEN', '#c78cff'); return true;
  }
  if (bs.includes('minion_summoning') && (cd.minion_summoning || 0) <= 0) {
    cd.minion_summoning = 10; spawnOne(false); sparkle(m.x, m.y, 18, '#b040ff', 14, 0.45); say(m, 'SUMMON', '#ca9aff'); return true;
  }
  return false;
}

function triggerNonCombatBehavior(m, target, allies, d, dt) {
  const b = m.enemyBehaviors || [], cd = m.enemyBehaviorCd || (m.enemyBehaviorCd = {}), w = C(m);
  if (b.includes('berserker_rage') && m.hp < m.maxHp * 0.35 && !m.enemyRaged) {
    m.enemyRaged = true; m.rageT = 7; m.aura = m.aura || '#ff5030'; say(m, 'BERSERK', '#ff6945');
    addEffect(new Ring(m.x, m.y, 0.35, 1.8, 0.35, '#ff4838', 3));
  }
  if ((b.includes('shadow_stalker') || b.includes('camouflaged_predator')) && !m.awake) {
    m.alpha = Math.min(m.alpha ?? 1, 0.28);
    m.stealthT = (m.stealthT || 0) + dt;
  } else if (target && m.alpha < 1) {
    m.alpha = undefined; m.targetable = true;
    if (b.includes('shadow_stalker') || b.includes('camouflaged_predator')) { sparkle(m.x, m.y, 14, '#9271bf', 9, 0.35); say(m, 'STALKER', '#c1a7e8'); }
  }
  if (b.includes('ceiling_ambush') && target && m.awake && !m.ceilingAmbushDone) {
    m.ceilingAmbushDone = true; m.z = 50; m.targetable = false; m.alpha = 0.25; m.ceilingFall = 0.55;
    warnCircle(m, m.x, m.y, 1.4, 0.55, '#d7a3ff'); return true;
  }
  if (m.ceilingFall > 0) {
    m.ceilingFall -= dt;
    if (m.ceilingFall <= 0) { m.z = 0; m.alpha = undefined; m.targetable = true; explode(w, m, m.x, m.y, 1.15, m.dmg * 0.75, 'phys', { melee: true, knock: 0.45 }, 'eruption'); }
    return true;
  }
  if (b.includes('decoy_ambush') && target && m.awake && (cd.decoy_ambush || 0) <= 0 && !m.decoyMade && m.spawnEnemyMinion) {
    cd.decoy_ambush = 18; m.decoyMade = true;
    const decoy = m.spawnEnemyMinion(m.arch, false, true);
    if (decoy) { decoy.decoy = true; decoy.maxHp = decoy.hp = Math.max(1, m.maxHp * 0.08); decoy.dmg = 0; decoy.xp = 0; say(m, 'FALSE TRAIL', '#bda1dd'); }
  }
  if (b.includes('elemental_adaptation') && m.enemyAdapt && m.enemyAdapt.t > 0 && Math.random() < dt * 3) {
    addEffect(new Ring(m.x, m.y, 0.5, 1.3, 0.25, elem(m.enemyAdapt.el).glow, 2));
  }
  if (b.includes('panic_retreat') && target && m.hp < m.maxHp * 0.2 && !m.static && !m.enemyPanicked) {
    m.enemyPanicked = true; m.revengeT = 0; m.retreatT = 3.2; say(m, 'FLEE!', '#f0d060');
    if (b.includes('call_for_help')) {
      for (const a of allies) { a.awake = true; a.aggro = target; }
      m.enemyCallCd = 8;
    }
  }
  if (m.retreatT > 0 && target) { m.retreatT -= dt; return flee(m, target, dt, 5); }
  if (b.includes('false_surrender') && target && m.hp < m.maxHp * 0.48 && !m.surrenderUsed) {
    m.surrenderUsed = true; m.surrenderT = 1.2; m.surrenderWait = 1.6; m.alpha = 0.35; m.targetable = false; m.moving = false;
    say(m, 'WITHDRAWING…', '#d6c28e'); return true;
  }
  if (m.surrenderT > 0) { m.surrenderT -= dt; m.moving = false; return true; }
  if (m.surrenderWait > 0) {
    m.surrenderWait -= dt;
    if (!m.surrenderWait) { m.alpha = undefined; m.targetable = true; m.enemyAttackCd = 0; sparkle(m.x, m.y, 20, '#ff8a55', 14, 0.4); }
    return true;
  }
  if (b.includes('tactical_withdrawal') && target && m.hp < m.maxHp * 0.58 && !m.static && (m.withdrawT || 0) <= 0 && dist(m.x, m.y, target.x, target.y) < 3.5) {
    m.withdrawT = 3.5; m.withdrawTimer = 1.1; flee(m, target, dt, 3.5); return true;
  }
  if (m.withdrawTimer > 0) { m.withdrawTimer -= dt; return flee(m, target, dt, 2.8); }
  if (b.includes('repositioning') && target && m.range && dist(m.x, m.y, target.x, target.y) < 3.4 && !m.static) return flee(m, target, dt, 2.6);
  if (b.includes('short_range_teleport') && target && dist(m.x, m.y, target.x, target.y) < 3.1 && (cd.short_range_teleport || 0) <= 0) {
    cd.short_range_teleport = 10;
    for (let i = 0; i < 10; i++) {
      const a = rand(TAU), x = target.x + Math.cos(a) * rand(3, 4.5), y = target.y + Math.sin(a) * rand(3, 4.5);
      if (!w.map.circleFree(x, y, m.r + 0.05) || w.map.flowAt(x, y) < 0) continue;
      sparkle(m.x, m.y, 16, '#b575ff', 12, 0.35); m.x = x; m.y = y; m.nav = null; sparkle(x, y, 16, '#b575ff', 12, 0.35); say(m, 'PHASE SHIFT', '#c49aff'); return true;
    }
  }
  if (b.includes('illusion_copies') && target && (cd.illusion_copies || 0) <= 0 && !m.illusionUsed && m.spawnEnemyMinion) {
    cd.illusion_copies = 18; m.illusionUsed = true;
    for (let i = 0; i < 2; i++) { const c = m.spawnEnemyMinion(m.arch, false, true); if (c) { c.decoy = true; c.maxHp = c.hp = Math.max(1, m.maxHp * 0.14); c.dmg *= 0.35; c.xp = 0; } }
    sparkle(m.x, m.y, 24, '#a878ff', 18, 0.45); say(m, 'MIRROR IMAGE', '#c39aff');
  }
  if (b.includes('burrow_retreat') && target && m.hp < m.maxHp * 0.25 && !m.enemyBurrowRetreated && !m.fly && m.beginMove && m.beginMove('burrow', target, dist(m.x, m.y, target.x, target.y))) { m.enemyBurrowRetreated = true; return true; }
  if (b.includes('defensive_stance') && target && m.hp < m.maxHp * 0.62 && !(m.defenseT > 0) && (cd.defensive_stance || 0) <= 0) {
    cd.defensive_stance = 7; m.defenseT = 2.2; m.moving = false; addEffect(new Ring(m.x, m.y, 0.35, 1.35, 0.3, '#c7c0ae', 3)); say(m, 'GUARD', '#d4cdbd'); return true;
  }
  if (b.includes('underground_ambush') && target && !m.fly && !m.enemyBurrowedStart) {
    m.enemyBurrowedStart = true; m.alpha = 0.08; m.z = -12; m.targetable = false; m.burrowAmbushT = 0.65;
    warnCircle(m, m.x, m.y, 1.3, 0.65, '#b39575'); return true;
  }
  if (m.burrowAmbushT > 0) {
    m.burrowAmbushT -= dt; m.moving = false;
    if (m.burrowAmbushT <= 0) {
      m.alpha = undefined; m.z = 0; m.targetable = true;
      const eruption = b.includes('eruption_attack');
      explode(w, m, m.x, m.y, eruption ? 1.5 : 1.2, m.dmg * (eruption ? 1 : 0.75), 'phys', { melee: true }, 'eruption');
    }
    return true;
  }
  if (b.includes('tunnel_pursuit') && target && !m.fly && d > 3.5 && !w.map.losWide(m.x, m.y, target.x, target.y, m.r + 0.04) && (m.tunnelPursuitCd || 0) <= 0) {
    m.tunnelPursuitCd = 10;
    if (m.beginMove?.('burrow', target, d)) { say(m, 'TUNNELING', '#c4ae8e'); return true; }
  }
  return false;
}

function chooseAttack(m, target, d) {
  if (!m.enemyAttacks?.length || m.enemyAttackCd > 0 || m.state !== 'idle' || m.static || m.enemySummoned) return false;
  const candidates = m.enemyAttacks.filter((id) => {
    const c = ENEMY_ATTACK_CONFIG[id];
    const hasCorpse = id !== 'corpse_explosion' || C(m).corpses?.some((corpse) => !corpse.used && dist(corpse.x, corpse.y, m.x, m.y) <= 5);
    return c && hasCorpse && d <= c.range + (m.r || 0.3) && (id === 'death_burst' ? false : true);
  });
  if (!candidates.length) return false;
  // Rotate through the full assigned list to keep attacks from disappearing behind random repeats.
  const volley = m.enemyBehaviors.includes('suppressive_volley') && d > 3
    ? candidates.find((id) => id === 'triple_arrow' || id === 'throwing_knives') : null;
  let attack = volley;
  if (volley) m.enemyAttackPick = m.enemyAttacks.indexOf(volley);
  else {
    m.enemyAttackPick = (m.enemyAttackPick + 1) % m.enemyAttacks.length;
    attack = candidates.includes(m.enemyAttacks[m.enemyAttackPick]) ? m.enemyAttacks[m.enemyAttackPick] : pick(candidates);
  }
  const cfg = ENEMY_ATTACK_CONFIG[attack];
  let aim = target ? angleTo(m.x, m.y, target.x, target.y) : m.facing;
  if (target && m.enemyBehaviors.includes('predictive_shot') && m.leadAng) aim = m.leadAng(target, m.proj?.speed || 8);
  if (cfg.windup > 0) {
    if (attack.includes('arrow') || attack.includes('spear') || attack.includes('shot') || attack.includes('projectile') || attack.includes('drain') || attack.includes('knives') || attack === 'rock_throw') warnLine(m, aim, cfg.range, cfg.windup, '#ffc85a');
    else warnCircle(m, attack === 'fire_eruption' || attack === 'corpse_explosion' ? target.x : m.x, attack === 'fire_eruption' || attack === 'corpse_explosion' ? target.y : m.y, attack.includes('wave') || attack.includes('shockwave') || attack.includes('slash') ? 2.3 : 1.35, cfg.windup, '#ff6948');
  }
  m.enemyAttackCd = cfg.cd * (m.rank === 'normal' ? 1.25 : 0.9) * rand(0.9, 1.12);
  m.startAction('enemy_attack', cfg.windup, { enemyAttack: attack, target, tx: target?.x, ty: target?.y, ang: aim });
  return true;
}

export function updateEnemyVariety(m, target, distance, dt) {
  const leaderFlank = m.enemyLeaderBuff?.until > (C(m).time || 0) && m.enemyLeaderBuff.flank;
  if ((!m.enemyBehaviors?.length && !m.packLeaderType && !leaderFlank) || m.enemySummoned) return false;
  m.enemyBehaviors ||= [];
  tickTimers(m, dt);
  const allies = nearbyAllies(m, 5);
  if (updatePackLeader(m, target, distance, dt)) return true;
  if (!m.packLeaderType) { supportTick(m, allies, dt); summonTick(m, allies); }
  if (triggerNonCombatBehavior(m, target, allies, distance, dt)) return true;
  if (m.stunT > 0) { m.moving = false; return true; }
  if (target && m.enemyBehaviors.includes('charging_rush') && distance > 2.4 && distance < 7.5 && (m.enemyChargeCd || 0) <= 0 && C(m).map.los(m.x, m.y, target.x, target.y)) {
    const ang = angleTo(m.x, m.y, target.x, target.y), len = Math.min(7.5, distance + 1);
    m.enemyChargeCd = 6.5; m.face(ang); m.startAction('charge', 0.65, { ang, len });
    warnLine(m, ang, len, 0.65, '#ff9b4a');
    return true;
  }
  if (applyPackTactics(m, target, distance, dt, allies)) return true;
  if (m.enemyBehaviors.includes('surround_strike') && target && distance > m.atkRange(target) && distance < 4.5) {
    const space = allies.filter((a) => dist(a.x, a.y, target.x, target.y) < 2.2).length;
    if (space < 4 && !m.enemyBehaviors.includes('coordinated_flanking')) {
      const ang = angleTo(target.x, target.y, m.x, m.y) + ((m.id % 5) - 2) * 0.36;
      const radius = Math.max(1.15, m.atkRange(target) - 0.1), x = target.x + Math.cos(ang) * radius, y = target.y + Math.sin(ang) * radius;
      if (C(m).map.circleFree(x, y, m.r + 0.03)) { m.navTo(x, y, dt); return true; }
    }
  }
  if (target && m.enemyBehaviors.includes('charged_precision_shot') && m.enemyAttackCd <= 0 && m.enemyAttacks?.some((a) => ['piercing_arrow', 'bone_spear'].includes(a))) {
    if (chooseAttack(m, target, distance)) return true;
  }
  if (chooseAttack(m, target, distance)) return true;
  return false;
}

export function executeEnemyAttack(m, a) {
  const w = C(m), target = hostile(a.target, m) ? a.target : null, el = m.el || 'phys', d = m.dmg, ang = target ? angleTo(m.x, m.y, target.x, target.y) : a.ang || m.facing;
  const attackMul = 1 + (m.enemyBuff?.t > 0 ? m.enemyBuff.damage || 0 : 0) + (m.revengeT > 0 ? 0.12 : 0) + (m.rageT > 0 ? 0.12 : 0);
  const shot = (angle, opts = {}) => w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, ang: angle, speed: opts.speed || m.proj?.speed || 8, range: opts.range || m.range || 9, fx: opts.fx || m.proj?.fx || ({ fire: 'fireball', cold: 'shard', light: 'spark', poison: 'blob', shadow: 'skull', arcane: 'orb', phys: 'rock' }[el] || 'orb'), el: opts.el || el, dmg: [d * (opts.low || 0.55) * attackMul, d * (opts.high || 0.8) * attackMul], pierce: opts.pierce || 0, o: opts.o || {} }));
  const hurt = (t, amount = 1, opts = {}) => { if (t && !t.dead) m.deal(t, d * amount, opts.el || el, opts); };
  m.face(ang); m.attackAnimT = 0.35;
  switch (a.enemyAttack) {
    case 'shield_bash': {
      const hits = coneTargets(w, m.team, m.x, m.y, ang, 2, 0.9); for (const t of hits) hurt(t, 0.9, { stun: true, knock: 1.1, melee: true, ang });
      addEffect(new Slash(m.x, m.y, ang, 2, 1.3, 0.2, '#d8c99c', { width: 9 })); break;
    }
    case 'overhead_strike': hurt(target, 1.75, { melee: true, stun: chance(0.2), ang }); addEffect(new Slash(m.x, m.y, ang, 1.9, 1.35, 0.22, '#e2d3b6', { width: 10 })); break;
    case 'spinning_slash': explode(w, m, m.x, m.y, 2.35, d * 0.9, el, { melee: true, knock: 0.45 }, 'eruption'); addEffect(new Slash(m.x, m.y, ang, 2.4, 1.7, 0.25, '#d7d0bd', { width: 8 })); break;
    case 'triple_arrow': for (const off of [-0.24, 0, 0.24]) shot(ang + off, { fx: 'arrow', speed: 10, range: 10, low: 0.4, high: 0.58 }); break;
    case 'piercing_arrow': shot(ang, { fx: 'arrow', speed: 13, range: 13, low: 1.05, high: 1.3, pierce: 3 }); break;
    case 'retreating_shot': flee(m, target, 0.3, 2.1); shot(ang, { fx: 'arrow', speed: 10, low: 0.7, high: 0.9 }); break;
    case 'lunging_grab': case 'leaping_attack': case 'leaping_bite': case 'spectral_dash': {
      const len = Math.min(3.8, target ? Math.max(0.6, dist(m.x, m.y, target.x, target.y) - 0.65) : 2);
      const mx = Math.cos(ang) * len, my = Math.sin(ang) * len;
      w.map.move(m, mx, my, m.ghost); m.z = 12; m.lunge = 1;
      const reach = target && dist(m.x, m.y, target.x, target.y) <= m.atkRange(target) + 0.9;
      if (reach) hurt(target, a.enemyAttack === 'lunging_grab' ? 1.0 : 1.2, { melee: true, slow: a.enemyAttack === 'lunging_grab', knock: 0.45, ang });
      m.z = 0; burst(m.x, m.y, 8, a.enemyAttack === 'spectral_dash' ? 'shadow' : 'phys', 7, 1.2); break;
    }
    case 'poisonous_vomit': case 'venom_spray': {
      const half = a.enemyAttack === 'venom_spray' ? 0.72 : 0.48;
      for (const t of coneTargets(w, m.team, m.x, m.y, ang, a.enemyAttack === 'venom_spray' ? 4 : 3.5, half)) hurt(t, 0.65, { poison: true, slow: a.enemyAttack === 'venom_spray', ang });
      smoke(m.x + Math.cos(ang) * 1.8, m.y + Math.sin(ang) * 1.8, 10, '#71a447', 7, 10); break;
    }
    case 'web_projectile': shot(ang, { fx: 'blob', el: 'poison', o: { slow: true }, low: 0.4, high: 0.6 }); break;
    case 'throwing_knives': for (const off of [-0.18, 0, 0.18]) shot(ang + off, { fx: 'spike', speed: 11, range: 8, low: 0.35, high: 0.55 }); break;
    case 'smoke_bomb': {
      smoke(m.x, m.y, 22, '#756577', 10, 15); addEffect(new Ring(m.x, m.y, 0.2, 2.4, 0.4, '#887b90', 3));
      for (const t of w.hostiles(m.team, m.x, m.y, 2.8)) hurt(t, 0.25, { slow: true });
      m.alpha = 0.32; m.stealthT = 1.6; break;
    }
    case 'coordinated_rush': {
      const allies = nearbyAllies(m, 5); let n = 0;
      for (const c of allies) { const a2 = angleTo(c.x, c.y, target?.x ?? m.x, target?.y ?? m.y); if (target && dist(c.x, c.y, target.x, target.y) > 1.3) w.map.move(c, Math.cos(a2) * Math.min(2.5, dist(c.x, c.y, target.x, target.y) - 0.8), Math.sin(a2) * Math.min(2.5, dist(c.x, c.y, target.x, target.y) - 0.8), c.ghost); if (++n >= 4) break; }
      if (target && dist(m.x, m.y, target.x, target.y) < 2.2) hurt(target, 1.15, { melee: true, knock: 0.5 }); break;
    }
    case 'flame_wave': {
      const L = w.map.rayLength(m.x, m.y, ang, 6), ex = m.x + Math.cos(ang) * L, ey = m.y + Math.sin(ang) * L;
      w.addHazard(new Fissure({ world: w, src: m, x: m.x, y: m.y, ang, len: L, dmg: [d * 0.7, d], el: 'fire', fx: 'fire' }));
      addEffect(new Bolt(m.x, m.y, 28, ex, ey, 12, elem('fire').glow, 0.28, 4)); break;
    }
    case 'teleport_strike': {
      if (target) { let moved = false; for (let i = 0; i < 10; i++) { const a2 = rand(TAU), x = target.x + Math.cos(a2) * rand(1.1, 1.7), y = target.y + Math.sin(a2) * rand(1.1, 1.7); if (w.map.circleFree(x, y, m.r + 0.03) && w.map.flowAt(x, y) >= 0) { sparkle(m.x, m.y, 15, '#b86aff', 14, 0.35); m.x = x; m.y = y; m.nav = null; moved = true; break; } } if (moved) hurt(target, 1.15, { melee: true, knock: 0.55 }); } break;
    }
    case 'fire_eruption': case 'corpse_explosion': {
      const corpse = a.enemyAttack === 'corpse_explosion' ? w.corpses?.find((c) => !c.used && dist(c.x, c.y, m.x, m.y) <= 5) : null;
      const x = corpse?.x ?? target?.x ?? a.tx ?? m.x;
      const y = corpse?.y ?? target?.y ?? a.ty ?? m.y;
      if (corpse) corpse.used = true;
      w.addHazard(new Delayed({ world: w, src: m, x, y, r: 1.5, delay: 0.7, fx: 'explosion', el: a.enemyAttack === 'corpse_explosion' ? 'shadow' : 'fire', dmg: [d * 0.9, d * 1.2] })); warnCircle(m, x, y, 1.5, 0.7, '#ff6a36'); break;
    }
    case 'life_drain': case 'soul_drain': {
      if (target) { const amount = d * (a.enemyAttack === 'life_drain' ? 0.7 : 0.65); hurt(target, a.enemyAttack === 'soul_drain' ? 0.8 : 0.7, { el: 'shadow' }); m.heal(amount * 0.45); w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, ang, speed: 10, range: 7, fx: 'skull', el: 'shadow', dmg: [amount * 0.7, amount], heal: true })); } break;
    }
    case 'haunting_projectile': shot(ang, { fx: 'skull', el: 'shadow', speed: 7, low: 0.85, high: 1.1 }); break;
    case 'ground_slam': case 'shockwave': {
      explode(w, m, m.x, m.y, a.enemyAttack === 'shockwave' ? 3.3 : 2.5, d * 1.0, el, { knock: 0.75, melee: true }, 'eruption');
      addEffect(new Ring(m.x, m.y, 0.4, a.enemyAttack === 'shockwave' ? 3.5 : 2.8, 0.35, elem(el).glow, 3)); break;
    }
    case 'rock_throw': {
      if (target) w.addHazard(new Projectile({ world: w, src: m, x: m.x, y: m.y, lob: true, tx: target.x, ty: target.y, range: 9, fx: 'rock', el: 'phys', dmg: [d, d * 1.3], exp: 1.2, size: 1.3 })); break;
    }
    case 'pack_howl': {
      for (const c of [m, ...nearbyAllies(m, 6)]) c.enemyBuff = { t: 6, damage: 0.14, speed: 0.16 };
      addEffect(new Ring(m.x, m.y, 0.4, 3.1, 0.55, '#e49c50', 3)); say(m, 'PACK HOWL', '#f4bb67'); break;
    }
    case 'rapid_claws': {
      if (target && dist(m.x, m.y, target.x, target.y) <= m.atkRange(target) + 0.5) for (let i = 0; i < 3; i++) hurt(target, 0.42, { melee: true, bleed: i === 2, ang });
      for (let i = 0; i < 3; i++) addEffect(new Slash(m.x, m.y, ang + (i - 1) * 0.22, 1.7, 1.1, 0.16, '#eacfc2', { width: 6 })); break;
    }
    case 'bone_spear': shot(ang, { fx: 'spike', el: 'shadow', speed: 11, range: 11, low: 0.95, high: 1.2, pierce: 4 }); break;
    case 'death_burst': explode(w, m, m.x, m.y, 2.1, d * 0.7, el, { dot: true }, 'explosion'); break;
    default: break;
  }
  m.cd = Math.max(m.cd || 0, m.atkCd || 1.1);
}

export function enemyDamageReduction(m, src, damage, el) {
  if (!m.enemyBehaviors?.length && !m.packLeaderType) return damage;
  src ||= { x: m.x, y: m.y };
  const original = damage;
  const facing = Math.cos(m.facing) * (src.x - m.x) + Math.sin(m.facing) * (src.y - m.y);
  if (m.enemyBehaviors.includes('shield_guard') && facing < 0.15) damage *= 0.68;
  if (m.enemyBehaviors.includes('defensive_stance') && m.defenseT > 0) damage *= 0.74;
  if (m.enemyBarrier?.t > 0) damage *= 1 - Math.min(0.35, m.enemyBarrier.amount || 0.2);
  if (m.enemyBuff?.t > 0 && m.enemyBuff.guard) damage *= 0.9;
  const leaderBuff = m.enemyLeaderBuff?.until > (m.world?.time || 0) ? m.enemyLeaderBuff : null;
  if (leaderBuff) {
    if (leaderBuff.guard) {
      const absorbed = Math.min(damage * 0.18, m.enemyLeaderGuardPool || 0);
      damage -= absorbed; m.enemyLeaderGuardPool = Math.max(0, (m.enemyLeaderGuardPool || 0) - absorbed);
    }
    if (leaderBuff.damageReduction) damage *= 1 - Math.min(0.3, leaderBuff.damageReduction);
    if (leaderBuff.resist && el && el !== 'phys') damage *= 1 - Math.min(0.2, leaderBuff.resist);
  }
  if (m.packLeaderIsolated) damage *= 1.2;
  if (m.enemyBehaviors.includes('elemental_adaptation') && el && el !== 'phys') {
    if (m.enemyAdapt?.el === el && m.enemyAdapt.t > 0) damage *= 0.72;
    else { m.enemyAdapt = { el, t: 3.2 }; say(m, `${String(el).toUpperCase()} ADAPT`, elem(el).glow); }
  }
  if (damage < original) m.enemyBlockedHit = true;
  return Math.max(1, damage);
}

export function enemyDamaged(m, src, dealt) {
  if (!m.enemyBehaviors?.length || !src || src.team === m.team) return;
  if (m.enemyBehaviors.includes('counterattack') && m.enemyBlockedHit && (m.enemyCounterCd || 0) <= 0) {
    m.enemyCounterCd = 2.5; const ang = angleTo(m.x, m.y, src.x, src.y); warnLine(m, ang, 2.2, 0.25, '#d9d0b9');
    if (dist(m.x, m.y, src.x, src.y) <= 2.3) {
      const target = src, x = m.x, y = m.y, world = C(m);
      world.addHazard({ t: 0, update(dt) { this.t += dt; if (this.t >= 0.25) { this.dead = true; if (!target.dead && dist(x, y, target.x, target.y) <= 2.4) { m.deal(target, m.dmg * 0.8, 'phys', { melee: true, stun: true, knock: 0.45 }); addEffect(new Slash(x, y, ang, 2, 1.2, 0.18, '#e0d3ba', { width: 8 })); } return false; } return true; }, draw() {} });
    }
    m.enemyBlockedHit = false;
  }
  if (m.enemyBehaviors.includes('shield_guard') && Math.random() < 0.02) sparkle(m.x, m.y, 6, '#d4c7a9', 5, 0.2);
  if (m.enemyBehaviors.includes('short_range_teleport') && dealt > m.maxHp * 0.18 && (m.enemyBehaviorCd?.short_range_teleport || 0) <= 0) m.enemyBehaviorCd.short_range_teleport = 1;
}

export function enemyAllyKilled(dead) {
  const w = dead.world;
  if (!w) return;
  packLeaderAllyKilled(dead);
  for (const ally of w.query(dead.x, dead.y, 6, (c) => liveEnemy(c) && c !== dead && c.enemyBehaviors?.includes('revenge_frenzy'))) {
    ally.revengeT = Math.max(ally.revengeT || 0, 7); ally.aura = ally.aura || '#ff6038';
    if (Math.random() < 0.45) say(ally, 'VENGEANCE', '#ff6b46');
  }
}

export function enemyKilled(m) {
  packLeaderKilled(m);
  if (!m.enemyBehaviors?.includes('unstable_death') || m.enemyUnstableDeath || m.enemySummoned || m.noLoot) return;
  m.enemyUnstableDeath = true;
  warnCircle(m, m.x, m.y, 2.4, 0.65, '#b960ff');
  const w = C(m), x = m.x, y = m.y;
  w.addHazard({ t: 0, update(dt) { this.t += dt; if (this.t >= 0.65) { this.dead = true; explode(w, m, x, y, 2.4, m.dmg * 0.9, m.el || 'arcane', {}, 'explosion'); return false; } return true; }, draw() {} });
}

