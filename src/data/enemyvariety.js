// Enemy variety expansion: named behaviors and attacks are assigned by archetype, not by stat inflation.
// Any missing required entry is caught by tools/tests/enemy_variety.mjs.
export const ENEMY_BEHAVIORS = [
  'coordinated_flanking', 'pack_leader', 'surround_strike', 'revenge_frenzy',
  'minion_summoning', 'corpse_reanimation', 'portal_summoning', 'sacrificial_summoning',
  'underground_ambush', 'tunnel_pursuit', 'eruption_attack', 'burrow_retreat',
  'charging_rush', 'wall_collision', 'berserker_rage', 'ground_slam',
  'ally_healing', 'protective_barrier', 'battle_chant', 'emergency_resurrection',
  'charged_precision_shot', 'predictive_shot', 'repositioning', 'suppressive_volley',
  'panic_retreat', 'call_for_help', 'tactical_withdrawal', 'false_surrender',
  'shadow_stalker', 'ceiling_ambush', 'camouflaged_predator', 'decoy_ambush',
  'shield_guard', 'counterattack', 'defensive_stance', 'shield_bash',
  'short_range_teleport', 'illusion_copies', 'elemental_adaptation', 'unstable_death',
];

export const ENEMY_ATTACKS = [
  'shield_bash', 'overhead_strike', 'spinning_slash',
  'triple_arrow', 'piercing_arrow', 'retreating_shot',
  'lunging_grab', 'poisonous_vomit', 'death_burst',
  'web_projectile', 'venom_spray', 'leaping_attack',
  'throwing_knives', 'smoke_bomb', 'coordinated_rush',
  'flame_wave', 'teleport_strike', 'fire_eruption',
  'spectral_dash', 'life_drain', 'haunting_projectile',
  'ground_slam', 'rock_throw', 'shockwave',
  'leaping_bite', 'pack_howl', 'rapid_claws',
  'bone_spear', 'corpse_explosion', 'soul_drain',
];

export const ENEMY_PROFILE_BY_ARCH = {
  skeleton: ['defender'], archer: ['sniper'], zombie: ['pack'], ghoul: ['ambusher'],
  imp: ['mystic'], demon: ['charger'], spider: ['ambusher'], bat: ['pack'],
  slime: ['ambusher'], wraith: ['mystic'], golem: ['defender'], cultist: ['summoner'],
  hound: ['pack'], eye: ['sniper'], knight: ['defender'], worm: ['sniper'],
  shroom: ['support'], elemental: ['support'], scorpion: ['ambusher'], gargoyle: ['defender'],
  beetle: ['ambusher'], abomination: ['defender'],
};

export const ENEMY_PROFILES = {
  pack: {
    behaviors: ['coordinated_flanking', 'pack_leader', 'surround_strike', 'revenge_frenzy'],
    attacks: ['coordinated_rush', 'pack_howl', 'rapid_claws'],
  },
  summoner: {
    behaviors: ['minion_summoning', 'corpse_reanimation', 'portal_summoning', 'sacrificial_summoning'],
    attacks: ['bone_spear', 'corpse_explosion', 'soul_drain'],
  },
  burrower: {
    behaviors: ['underground_ambush', 'tunnel_pursuit', 'eruption_attack', 'burrow_retreat'],
    attacks: ['poisonous_vomit', 'fire_eruption'],
  },
  charger: {
    behaviors: ['charging_rush', 'wall_collision'],
    attacks: ['overhead_strike'],
  },
  support: {
    behaviors: ['ally_healing', 'protective_barrier', 'battle_chant', 'emergency_resurrection'],
    attacks: ['soul_drain', 'pack_howl'],
  },
  sniper: {
    behaviors: ['charged_precision_shot', 'predictive_shot', 'repositioning', 'suppressive_volley'],
    attacks: ['triple_arrow', 'piercing_arrow', 'bone_spear'],
  },
  retreat: {
    behaviors: ['panic_retreat', 'call_for_help', 'tactical_withdrawal', 'false_surrender'],
    attacks: ['retreating_shot', 'throwing_knives', 'smoke_bomb'],
  },
  ambusher: {
    behaviors: ['shadow_stalker', 'ceiling_ambush', 'camouflaged_predator', 'decoy_ambush'],
    attacks: ['lunging_grab', 'web_projectile', 'venom_spray', 'leaping_attack'],
  },
  defender: {
    behaviors: ['shield_guard', 'counterattack', 'defensive_stance', 'shield_bash'],
    attacks: ['shield_bash', 'overhead_strike', 'spinning_slash', 'shockwave'],
  },
  mystic: {
    behaviors: ['short_range_teleport', 'illusion_copies', 'elemental_adaptation'],
    attacks: ['flame_wave', 'teleport_strike', 'spectral_dash', 'life_drain', 'haunting_projectile', 'rock_throw'],
  },
};

export const ENEMY_ATTACK_CONFIG = {
  shield_bash: { range: 1.8, cd: 7, windup: 0.65 }, overhead_strike: { range: 1.8, cd: 6, windup: 0.8 }, spinning_slash: { range: 2.5, cd: 8, windup: 0.55 },
  triple_arrow: { range: 9, cd: 5, windup: 0.55 }, piercing_arrow: { range: 12, cd: 7, windup: 0.9 }, retreating_shot: { range: 8, cd: 6, windup: 0.45 },
  lunging_grab: { range: 4.5, cd: 7, windup: 0.55 }, poisonous_vomit: { range: 4.2, cd: 8, windup: 0.7 }, death_burst: { range: 2.2, cd: 0, windup: 0 },
  web_projectile: { range: 7, cd: 7, windup: 0.4 }, venom_spray: { range: 3.8, cd: 8, windup: 0.65 }, leaping_attack: { range: 5, cd: 6, windup: 0.5 },
  throwing_knives: { range: 7, cd: 5, windup: 0.35 }, smoke_bomb: { range: 2.8, cd: 9, windup: 0.45 }, coordinated_rush: { range: 7, cd: 8, windup: 0.75 },
  flame_wave: { range: 7, cd: 7, windup: 0.75 }, teleport_strike: { range: 6, cd: 9, windup: 0.6 }, fire_eruption: { range: 7, cd: 8, windup: 0.65 },
  spectral_dash: { range: 5, cd: 7, windup: 0.5 }, life_drain: { range: 6, cd: 8, windup: 0.7 }, haunting_projectile: { range: 9, cd: 5, windup: 0.45 },
  ground_slam: { range: 2.8, cd: 7, windup: 0.75 }, rock_throw: { range: 8, cd: 7, windup: 0.7 }, shockwave: { range: 3.5, cd: 8, windup: 0.8 },
  leaping_bite: { range: 5, cd: 6, windup: 0.45 }, pack_howl: { range: 6, cd: 11, windup: 0.65 }, rapid_claws: { range: 1.8, cd: 5, windup: 0.4 },
  bone_spear: { range: 10, cd: 7, windup: 0.75 }, corpse_explosion: { range: 5.5, cd: 9, windup: 0.7 }, soul_drain: { range: 6, cd: 9, windup: 0.65 },
};
