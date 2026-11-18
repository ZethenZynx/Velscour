// Player-facing explanations for shrine and altar buffs. Keep these next to
// the mechanics so the Adventurer's Log and active-buff tooltip stay aligned.
const pct = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const titleCase = (s) => String(s || '').replace(/(^|[-_ ])\w/g, (m) => m.toUpperCase()).replaceAll('_', ' ');
const elementName = (s) => s === 'light' ? 'Lightning' : titleCase(s);

export const LEGACY_SHRINE_DESCRIPTIONS = Object.freeze({
  frenzy: '+40% attack speed and cast speed.',
  fortune: '+150% Magic Find and Gold Find.',
  bulwark: '+40% maximum health and +15% damage reduction.',
  wisdom: '+75% experience gained.',
  wrath: '+50 damage power (about +17.5% skill damage before skill-specific multipliers) and +10% critical-hit chance.',
  storm: 'Every 0.6 seconds, lightning hits up to two enemies within 6 tiles for 1.4 times your normal hit or 8% of their normal health, whichever is higher.',
  renewal: 'Restores health and mana to full, then grants health regeneration equal to 3% of maximum health per second.',
});

/** Explain the actual, rarity-scaled values stored on a shrine/altar buff. */
export function shrineBuffDescription(buff, objectId = '') {
  const s = buff?.stats || {}, duration = Math.max(0, Math.round(buff?.t || 0));
  const seconds = duration ? ` Lasts ${duration} seconds or until you leave the floor.` : '';
  switch (objectId || buff?.worldObjectId) {
    case 'might': return `Skill damage power +${pct((s.dmg || 0) * 0.35)} (from +${pct(s.dmg)} damage power).${seconds}`;
    case 'fortitude': return `Maximum health +${pct(s.life)}, armor +${pct(s.armor)}, and damage reduction +${pct(s.reduce)}. Also restores 12% of maximum health when granted.${seconds}`;
    case 'swiftness': return `Attack speed and cast speed +${pct(s.as)}; movement speed +${pct((s.speed || 0) * 0.6)}.${seconds}`;
    case 'sorcery': return `Skill damage power +${pct((s.dmg || 0) * 0.35)} (from +${pct(s.dmg)} damage power); health regeneration +${pct((s.regen || 0) / 10)} of maximum health per second.${seconds}`;
    case 'fortune': return `Magic Find +${pct(s.mf)} and Gold Find +${pct(s.gf)}.${seconds}`;
    case 'precision': return `Critical-hit chance +${pct((s.crit || 0) / 4)} and critical damage +${pct(s.critDmg)}.${seconds}`;
    case 'phoenix': return `One charge prevents a fatal blow, restores 35% of maximum health, and grants 1.5 seconds of invulnerability. The charge is consumed when it triggers. An equipped Phoenix effect triggers first if its cooldown is ready.${seconds}`;
    case 'echoes': return `Skills that are not movement, summon, or buff skills have a ${pct(s.echoChance)} chance to be cast a second time for free.${seconds}`;
    case 'colossus': return `Skill damage power +${pct((s.dmg || 0) * 0.35)} (from +${pct(s.dmg)} damage power), area of effect +${pct(s.areaPct)}, and your character appears 22% larger.${seconds}`;
    case 'elements': {
      const [element, value] = Object.entries(s.elemental || {})[0] || ['elemental', 0];
      const label = elementName(element);
      return `Your ${label} skill damage power increases by +${pct(value)} (about +${pct(value * 0.25)} skill damage before skill-specific multipliers). This strengthens attacks that already deal ${label} damage; it does not convert other damage types.${seconds}`;
    }
    case 'shadows': {
      const value = s.addedDamage?.shadow || 0, penalty = s.damageTakenPct || 0;
      return `Bonus: each direct attack hit deals additional Shadow damage equal to ${pct(value)} of that hit, after Shadow resistance is applied. Damage-over-time ticks do not repeat this bonus. Penalty: you take ${pct(penalty)} more damage from all sources.${seconds}`;
    }
    default: {
      const parts = [];
      if (s.dmg) parts.push(`damage power +${pct(s.dmg)}`);
      if (s.as) parts.push(`attack/cast speed +${pct(s.as)}`);
      if (s.speed) parts.push(`movement speed +${pct(s.speed)}`);
      if (s.armor) parts.push(`armor +${pct(s.armor)}`);
      if (s.reduce) parts.push(`damage reduction ${s.reduce > 0 ? '+' : ''}${pct(s.reduce)}`);
      if (s.damageTakenPct) parts.push(`damage taken +${pct(s.damageTakenPct)}`);
      if (s.elemental) for (const [el, n] of Object.entries(s.elemental)) parts.push(`${elementName(el)} skill damage power +${pct(n)}`);
      if (!parts.length && buff?.phoenixCharges) parts.push('one Phoenix charge prevents a fatal blow, restores 35% maximum health, and grants 1.5 seconds of invulnerability');
      return `${parts.length ? parts.join('; ') + '.' : (buff?.name || 'A temporary effect is active.')}${seconds}`;
    }
  }
}
