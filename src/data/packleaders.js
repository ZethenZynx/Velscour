// Pack leaders use the existing enemy AI and Sigil visual language. Rune colors are
// intentionally centralized so later sprite artwork can replace the temporary circles.
export const PACK_LEADER_CHANCE = 0.75;

export const PACK_LEADERS = Object.freeze({
  war_shaman:       { name: 'War Shaman',       color: '#E32E35', role: 'rear', weight: 1,  bias: { caster: 2, cultist: 2 } },
  healer:            { name: 'Healer',            color: '#24C966', role: 'rear', weight: 1.1, bias: { support: 2, shroom: 1.5 } },
  necromancer:       { name: 'Necromancer',       color: '#AD4DFF', role: 'rear', weight: 0.8, bias: { undead: 3, catacombs: 2, skeleton: 1.5, zombie: 1.5 } },
  summoner:          { name: 'Summoner',          color: '#F28A19', role: 'rear', weight: 1,  bias: { summoner: 2, cultist: 1.6 } },
  berserker:         { name: 'Berserker',         color: '#FF3B66', role: 'front', weight: 1,  bias: { melee: 1.5, brute: 1.5, hound: 1.3, ghoul: 1.3 } },
  war_captain:       { name: 'War Captain',       color: '#378DF5', role: 'front', weight: 1,  bias: { knight: 2, defender: 1.5, golem: 1.3 } },
  battle_drummer:    { name: 'Battle Drummer',    color: '#E8B522', role: 'mid', weight: 0.9, bias: { melee: 1.2, hound: 1.2, pack: 1.3 } },
  hexcaster:         { name: 'Hexcaster',         color: '#25C9CE', role: 'rear', weight: 0.9, bias: { caster: 1.5, wraith: 1.5, eye: 1.3 } },
  shieldbearer:      { name: 'Shieldbearer',      color: '#7286A0', role: 'front', weight: 0.9, bias: { defender: 2, knight: 1.6, skeleton: 1.2 } },
  blood_priest:      { name: 'Blood Priest',      color: '#9C1E45', role: 'mid', weight: 0.85, bias: { demon: 1.4, cultist: 1.6, blood: 2 } },
  beastmaster:       { name: 'Beastmaster',       color: '#77C747', role: 'mid', weight: 0.9, bias: { beast: 3, hound: 2, spider: 1.2, bat: 1.2, scorpion: 1.2 } },
  frost_shaman:      { name: 'Frost Shaman',      color: '#77DAFA', role: 'rear', weight: 0.9, bias: { cold: 2, snow: 2, ice: 2, elemental: 1.5 } },
  flame_herald:      { name: 'Flame Herald',      color: '#FF6628', role: 'mid', weight: 0.9, bias: { fire: 2, desert: 1.7, demon: 1.3, elemental: 1.5 } },
  banner_bearer:     { name: 'Banner Bearer',     color: '#D8B85A', role: 'mid', weight: 0.9, bias: { knight: 1.3, defender: 1.3, human: 1.2 } },
  death_herald:      { name: 'Death Herald',      color: '#A5A8B5', role: 'mid', weight: 0.8, bias: { undead: 2, shadow: 1.5, catacombs: 1.5, wraith: 1.3 } },
});

export const PACK_LEADER_IDS = Object.freeze(Object.keys(PACK_LEADERS));
