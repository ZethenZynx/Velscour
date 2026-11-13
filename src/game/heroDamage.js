// Estimate the equipped skill bar's sheet damage for the HUD.
import { SKILLS, CLASS_SKILLS, manaCost, rageCost, cooldown, useTime, buffAmount, curseAmount, skillDuration, effLevel, ricochetCount } from '../data/skills.js';
import { SUMMONS } from '../data/summons.js';
import { skillMorphFor, applySkillMorph } from '../data/talents.js';
import { BAR_SIZE } from '../data/bar.js';

const OFFENSIVE = new Set(['melee', 'proj', 'nova', 'aoe', 'beam', 'chain', 'wall', 'zone', 'orbit', 'cyclone', 'whirl', 'leap', 'dash', 'trap', 'rain', 'strike', 'fissure', 'corpse']);
const DAMAGE_ROLES = new Set(['main', 'alt', 'cd', 'summon']);
const CROWD = 2.2;
const avg = (d) => (d[0] + d[1]) / 2;
const critMul = (p) => 1 + (p.st.critChance / 100) * (p.st.critDmg / 100);
const summonMax = (sk) => sk.m.max || sk.m.n || 1;
const cdOf = (p, sk) => {
  const morph = skillMorphFor(p, sk);
  return cooldown(sk) * (1 - p.st.cdr / 100) * (1 + (morph ? morph.cdPct || 0 : 0) / 100);
};

function hitsPerCast(sk, crowd, L = 1) {
  const m = sk.m, n = m.n || 1, extra = Math.max(0, crowd - 1);
  if (m.ricochet) return Math.min(ricochetCount(sk, L), crowd) + 0.75 * Math.min(crowd, 2.2);
  switch (sk.kind) {
    case 'melee': return n * ((m.arc ?? (m.cleave ? 170 : sk.fx === 'spin' ? 360 : 115)) >= 170 ? Math.min(crowd, 2.4) : 1.1) * (m.exp ? 1 + extra * 0.4 : 1) * (m.chain ? 1 + Math.min(m.chain, extra + 1) * 0.4 : 1);
    case 'proj': {
      let h = m.ring ? Math.max(1, n * 0.18 * crowd) : n > 1 ? 1 + (Math.min(n, crowd * 1.5) - 1) * 0.5 : 1;
      if (m.pierce) h *= 1 + extra * 0.35;
      if (m.exp) h *= 1 + extra * 0.45;
      if (m.bounce) h *= 1 + Math.min(m.bounce, extra + 1) * 0.5;
      if (m.chain) h *= 1 + Math.min(m.chain, extra + 1) * 0.5;
      if (m.split) h *= 1.25;
      if (m.ret) h *= 1.4;
      return h;
    }
    case 'nova': return (m.n || 1) * crowd * 0.9;
    case 'aoe': return m.barrage ? crowd * (m.barrage === 3 ? 1.6 : 1) : m.n && m.dur ? m.n * 0.5 * crowd * 0.8 : m.dur ? (m.dur / 0.3) * 0.4 * crowd * 0.7 : crowd;
    case 'beam': return m.dur ? (m.dur / 0.13) * 0.32 * Math.min(crowd, 1.6) : 1 + extra * 0.4;
    case 'chain': return 1 + Math.min(m.n || 4, extra + 2) * 0.6;
    case 'wall': return m.block ? 0.4 : m.ring ? 2 * crowd : 1.2 * crowd;
    case 'zone': return (Math.min(m.dur || 5, 3) / 0.5) * (m.follow ? 0.45 : 0.35) * crowd;
    case 'orbit': return (m.n || 3) * (m.dur || 4) * 0.35 * Math.min(crowd, 2);
    case 'cyclone': return n * ((m.dur || 3.5) / 0.25) * 0.12 * crowd;
    case 'whirl': return ((m.dur || 2) / 0.22) * 0.6 * Math.min(crowd, 2.5);
    case 'leap': return crowd;
    case 'dash': return n * Math.min(crowd, 2);
    case 'blink': return m.nova ? crowd * 0.8 : 0;
    case 'trap': return n * Math.min(crowd, 2) * 0.6;
    case 'rain': return n * 0.3 * Math.min(crowd, 2.5);
    case 'strike': return n * 0.9;
    case 'fissure': return n * 1.1 * Math.min(crowd, 2);
    case 'corpse': return (m.n || 3) * 0.8;
    default: return 0;
  }
}

function castTime(p, sk) {
  const speed = sk.attack ? p.st.atkSpeed : p.st.castSpeed;
  let time = useTime(sk) / (1 + speed / 100);
  if ((sk.kind === 'beam' && sk.m.dur) || sk.kind === 'whirl') time = Math.max(time, sk.m.dur || 2);
  return time;
}

function skillDps(p, sk, level, crowd = CROWD) {
  const morph = skillMorphFor(p, sk), effective = morph ? applySkillMorph(sk, morph) : sk;
  const damage = avg(p.skillDamage(sk, level)) * hitsPerCast(effective, crowd, level) * critMul(p);
  const period = Math.max(castTime(p, effective), cdOf(p, sk), 0.05);
  const cost = manaCost(sk, level), rage = rageCost(sk), supply = p.st.manaRegen + p.maxMana / 40;
  const sustain = cost ? Math.min(1, supply / (cost / period)) : rage ? Math.min(1, 12 / (rage / period)) : 1;
  return { dps: damage / period, sustain };
}

function buildPower(p, only, crowd = 1) {
  const learned = CLASS_SKILLS[p.char.classId].filter((sk) => (p.char.skills[sk.id] || 0) > 0 && (!only || only.has(sk.id)));
  const spam = [], parts = [];
  for (const sk of learned) {
    if (!OFFENSIVE.has(sk.kind) || sk.kind === 'corpse') continue;
    const level = effLevel(p, sk), result = skillDps(p, sk, level, crowd);
    if (cooldown(sk) >= 1.2) parts.push({ sk, v: result.dps * result.sustain * 0.85, role: 'cd' });
    else spam.push({ sk, v: result.dps, sustain: result.sustain });
  }
  spam.sort((a, b) => b.v * b.sustain - a.v * a.sustain);
  let base = 0;
  if (spam.length) {
    const best = spam[0], free = spam.filter((s) => !manaCost(s.sk, 1)).sort((a, b) => b.v - a.v)[0];
    base = best.v * best.sustain + (best.sustain < 1 && free && free !== best ? (1 - best.sustain) * free.v : 0);
    parts.push({ sk: best.sk, v: base, role: 'main' });
    if (spam[1]) parts.push({ sk: spam[1].sk, v: spam[1].v * spam[1].sustain * 0.15, role: 'alt' });
    if (best.sustain < 1 && free && free !== best && free !== spam[1]) parts.push({ sk: free.sk, v: 0.01, role: 'filler' });
  }
  const reference = Math.max(base, 1);
  for (const sk of learned) {
    const morph = skillMorphFor(p, sk), effective = morph ? applySkillMorph(sk, morph) : sk;
    const level = effLevel(p, sk), m = effective.m;
    if (sk.kind === 'corpse') parts.push({ sk, v: skillDps(p, sk, level, crowd).dps * 0.35, role: 'cd' });
    else if (sk.kind === 'summon') {
      const def = SUMMONS[m.sum] || { dmg: 1, atk: { cd: 1 } };
      const count = m.sum === 'revive' ? (m.n || 1) * 0.5 : summonMax(effective);
      const uptime = m.dur ? Math.min(1, m.dur / Math.max(m.dur, cdOf(p, sk), 1)) : 1;
      const summonMult = (1 + (p.st.summonPct || 0) / 100) * (1 + (morph ? morph.summonDmgPct || 0 : 0) / 100);
      const one = avg(p.skillDamage(sk, level)) * (def.dmg || 1) * summonMult / ((def.atk && def.atk.cd) || 1);
      parts.push({ sk, v: (one * count * uptime * 0.55 + reference * 0.05), role: 'summon' });
    } else if (sk.kind === 'buff') {
      const amount = buffAmount(sk, level) / 100, duration = skillDuration(effective, level);
      const uptime = Math.min(1, duration / Math.max(duration, cdOf(p, sk)));
      let value = 0;
      for (const b of m.buff || ['dmg']) value += (b === 'dmg' || b === 'as') ? amount : b === 'crit' ? amount * 0.15 : amount * 0.25;
      if (m.pulse) value += avg(p.skillDamage(sk, level)) * crowd / reference;
      parts.push({ sk, v: reference * value * uptime * (m.party ? 1.1 : 1), role: 'buff' });
    } else if (sk.kind === 'curse') {
      const amount = curseAmount(sk, level) / 100;
      let value = 0;
      for (const k of m.curse || ['amp']) value += k === 'amp' || k === 'mark' ? amount * 0.6 : ['decay', 'bomb', 'doom'].includes(k) ? avg(p.skillDamage(sk, level)) * crowd * 0.15 / reference : 0.06;
      parts.push({ sk, v: reference * value, role: 'curse' });
    } else if (sk.kind === 'heal') parts.push({ sk, v: reference * 0.12 * ((m.amt || 20) / 20) * (1 + 0.04 * (level - 1)), role: 'heal' });
    else if (sk.kind === 'blink') parts.push({ sk, v: reference * 0.04 + (m.nova ? skillDps(p, sk, level, 1).dps * 0.3 : 0), role: 'move' });
  }
  parts.sort((a, b) => b.v - a.v);
  const kept = parts.slice(0, BAR_SIZE);
  return { total: kept.reduce((sum, part) => sum + part.v, 0), parts: kept };
}

/** Sheet attack and DPS values for the player's currently equipped skill bar. */
export function heroDamage(p) {
  const bar = p.char.bar.filter((id) => id && SKILLS[id]);
  const { parts } = buildPower(p, new Set(bar), 1);
  const dps = parts.reduce((sum, part) => sum + (DAMAGE_ROLES.has(part.role) ? part.v : 0), 0);
  const lmb = SKILLS[p.char.bar[0]];
  const main = lmb && OFFENSIVE.has(lmb.kind) ? lmb : (parts.find((part) => part.role === 'main') || {}).sk || SKILLS[`${p.classId}.0.0`];
  const atk = main ? avg(p.skillDamage(main, Math.max(1, effLevel(p, main)))) * critMul(p) : 0;
  return { dps, atk };
}

