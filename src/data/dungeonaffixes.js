// Complete 150-affix catalog. Every listed affix has an active gameplay effect.
export const MAX_AFFIX_SECTIONS = 5;
export const AFFIX_DEPTH_INTERVAL = 5;
export const DUNGEON_AFFIXES = Object.freeze(
[
  {
    "id": "fortified",
    "name": "Fortified",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies have 30% more maximum health.",
    "implemented": true
  },
  {
    "id": "tyrannical",
    "name": "Tyrannical",
    "category": "Enemy Stat Modifiers",
    "description": "Bosses have 50% more health and deal 20% more damage.",
    "implemented": true
  },
  {
    "id": "brutal",
    "name": "Brutal",
    "category": "Enemy Stat Modifiers",
    "description": "All enemies deal 25% more damage.",
    "implemented": true
  },
  {
    "id": "swift",
    "name": "Swift",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies move 30% faster.",
    "implemented": true
  },
  {
    "id": "frenzied",
    "name": "Frenzied",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies attack 35% faster.",
    "implemented": true
  },
  {
    "id": "armored",
    "name": "Armored",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies take 20% less physical damage.",
    "implemented": true
  },
  {
    "id": "resistant",
    "name": "Resistant",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies take 20% less magical damage.",
    "implemented": true
  },
  {
    "id": "regenerating",
    "name": "Regenerating",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies regenerate 1% of maximum health every second.",
    "implemented": true
  },
  {
    "id": "vampiric",
    "name": "Vampiric",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies heal for 15% of damage dealt.",
    "implemented": true
  },
  {
    "id": "colossal",
    "name": "Colossal",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies are 25% larger, with increased health and attack range.",
    "implemented": true
  },
  {
    "id": "elusive",
    "name": "Elusive",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies have a 15% chance to dodge attacks.",
    "implemented": true
  },
  {
    "id": "critical",
    "name": "Critical",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies have a 20% chance to deal double damage.",
    "implemented": true
  },
  {
    "id": "unyielding",
    "name": "Unyielding",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies cannot be stunned, slowed, or knocked back.",
    "implemented": true
  },
  {
    "id": "berserking",
    "name": "Berserking",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies gain 50% attack speed below 30% health.",
    "implemented": true
  },
  {
    "id": "empowered",
    "name": "Empowered",
    "category": "Enemy Stat Modifiers",
    "description": "Enemies gain 5% damage for each other enemy nearby, up to 50%.",
    "implemented": true
  },
  {
    "id": "volcanic_death",
    "name": "Volcanic Death",
    "category": "On-Death Effects",
    "description": "Enemies explode in fire when killed.",
    "implemented": true
  },
  {
    "id": "toxic_remains",
    "name": "Toxic Remains",
    "category": "On-Death Effects",
    "description": "Dead enemies leave poisonous gas clouds.",
    "implemented": true
  },
  {
    "id": "static_discharge",
    "name": "Static Discharge",
    "category": "On-Death Effects",
    "description": "Dead enemies release electricity in random directions.",
    "implemented": true
  },
  {
    "id": "frostburst",
    "name": "Frostburst",
    "category": "On-Death Effects",
    "description": "Enemies release freezing explosions upon death.",
    "implemented": true
  },
  {
    "id": "corpse_explosion",
    "name": "Corpse Explosion",
    "category": "On-Death Effects",
    "description": "Enemy corpses detonate after a short delay.",
    "implemented": true
  },
  {
    "id": "necrotic_remains",
    "name": "Necrotic Remains",
    "category": "On-Death Effects",
    "description": "Dead enemies leave damaging pools of dark energy.",
    "implemented": true
  },
  {
    "id": "splitting",
    "name": "Splitting",
    "category": "On-Death Effects",
    "description": "Killed enemies split into two weaker enemies.",
    "implemented": true
  },
  {
    "id": "vengeful_spirits",
    "name": "Vengeful Spirits",
    "category": "On-Death Effects",
    "description": "Dead enemies release ghosts that chase the player.",
    "implemented": true
  },
  {
    "id": "burning_ground",
    "name": "Burning Ground",
    "category": "On-Death Effects",
    "description": "Dead enemies ignite the ground beneath them.",
    "implemented": true
  },
  {
    "id": "shrapnel",
    "name": "Shrapnel",
    "category": "On-Death Effects",
    "description": "Dead enemies fire sharp projectiles outward.",
    "implemented": true
  },
  {
    "id": "healing_burst",
    "name": "Healing Burst",
    "category": "On-Death Effects",
    "description": "Dead enemies heal nearby surviving enemies.",
    "implemented": true
  },
  {
    "id": "chain_reaction",
    "name": "Chain Reaction",
    "category": "On-Death Effects",
    "description": "Enemy deaths cause nearby corpses to explode.",
    "implemented": true
  },
  {
    "id": "cursed_remains",
    "name": "Cursed Remains",
    "category": "On-Death Effects",
    "description": "Dead enemies temporarily reduce player damage.",
    "implemented": true
  },
  {
    "id": "death_nova",
    "name": "Death Nova",
    "category": "On-Death Effects",
    "description": "Dead enemies release expanding rings of magical damage.",
    "implemented": true
  },
  {
    "id": "reanimation",
    "name": "Reanimation",
    "category": "On-Death Effects",
    "description": "Enemies have a 20% chance to resurrect once after death.",
    "implemented": true
  },
  {
    "id": "wildfire",
    "name": "Wildfire",
    "category": "Elemental Hazards",
    "description": "Random patches of ground ignite periodically.",
    "implemented": true
  },
  {
    "id": "blizzard",
    "name": "Blizzard",
    "category": "Elemental Hazards",
    "description": "Ice storms periodically damage and slow players.",
    "implemented": true
  },
  {
    "id": "thunderstorm",
    "name": "Thunderstorm",
    "category": "Elemental Hazards",
    "description": "Lightning strikes random locations around the player.",
    "implemented": true
  },
  {
    "id": "acid_rain",
    "name": "Acid Rain",
    "category": "Elemental Hazards",
    "description": "Periodic acid rainfall damages players throughout the dungeon.",
    "implemented": true
  },
  {
    "id": "lava_pools",
    "name": "Lava Pools",
    "category": "Elemental Hazards",
    "description": "Temporary lava pools appear beneath players.",
    "implemented": true
  },
  {
    "id": "frozen_ground",
    "name": "Frozen Ground",
    "category": "Elemental Hazards",
    "description": "Random icy patches reduce movement control.",
    "implemented": true
  },
  {
    "id": "chain_lightning",
    "name": "Chain Lightning",
    "category": "Elemental Hazards",
    "description": "Lightning periodically jumps between nearby enemies and players.",
    "implemented": true
  },
  {
    "id": "toxic_fog",
    "name": "Toxic Fog",
    "category": "Elemental Hazards",
    "description": "Poison clouds drift slowly through the dungeon.",
    "implemented": true
  },
  {
    "id": "meteor_shower",
    "name": "Meteor Shower",
    "category": "Elemental Hazards",
    "description": "Meteors periodically strike marked locations.",
    "implemented": true
  },
  {
    "id": "arcane_storm",
    "name": "Arcane Storm",
    "category": "Elemental Hazards",
    "description": "Magical projectiles sweep across the battlefield.",
    "implemented": true
  },
  {
    "id": "electrified_ground",
    "name": "Electrified Ground",
    "category": "Elemental Hazards",
    "description": "Sections of the floor periodically become electrified.",
    "implemented": true
  },
  {
    "id": "inferno",
    "name": "Inferno",
    "category": "Elemental Hazards",
    "description": "Fire damage throughout the dungeon increases over time.",
    "implemented": true
  },
  {
    "id": "hailstorm",
    "name": "Hailstorm",
    "category": "Elemental Hazards",
    "description": "Falling ice shards randomly strike the battlefield.",
    "implemented": true
  },
  {
    "id": "elemental_chaos",
    "name": "Elemental Chaos",
    "category": "Elemental Hazards",
    "description": "Fire, frost, and lightning hazards appear in random sequences.",
    "implemented": true
  },
  {
    "id": "unstable_elements",
    "name": "Unstable Elements",
    "category": "Elemental Hazards",
    "description": "Elemental hazards occasionally trigger additional elemental effects.",
    "implemented": true
  },
  {
    "id": "explosive_attacks",
    "name": "Explosive Attacks",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks occasionally cause small explosions.",
    "implemented": true
  },
  {
    "id": "poisonous_strikes",
    "name": "Poisonous Strikes",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks apply stacking poison damage.",
    "implemented": true
  },
  {
    "id": "burning_strikes",
    "name": "Burning Strikes",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks apply damage over time from burning.",
    "implemented": true
  },
  {
    "id": "freezing_strikes",
    "name": "Freezing Strikes",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks temporarily slow movement.",
    "implemented": true
  },
  {
    "id": "shocking_strikes",
    "name": "Shocking Strikes",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks have a chance to briefly stun.",
    "implemented": true
  },
  {
    "id": "piercing_attacks",
    "name": "Piercing Attacks",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy projectiles pass through multiple targets.",
    "implemented": true
  },
  {
    "id": "ricocheting_projectiles",
    "name": "Ricocheting Projectiles",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy projectiles bounce off walls or targets.",
    "implemented": true
  },
  {
    "id": "multishot",
    "name": "Multishot",
    "category": "Enemy Attack Modifiers",
    "description": "Ranged enemies fire additional projectiles.",
    "implemented": true
  },
  {
    "id": "homing_projectiles",
    "name": "Homing Projectiles",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy projectiles gradually turn toward the player.",
    "implemented": true
  },
  {
    "id": "rapid_fire",
    "name": "Rapid Fire",
    "category": "Enemy Attack Modifiers",
    "description": "Ranged enemies occasionally unleash rapid volleys.",
    "implemented": true
  },
  {
    "id": "knockback",
    "name": "Knockback",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks push players backward.",
    "implemented": true
  },
  {
    "id": "crippling_blows",
    "name": "Crippling Blows",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks temporarily reduce movement speed.",
    "implemented": true
  },
  {
    "id": "armor_shred",
    "name": "Armor Shred",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks temporarily reduce player armor.",
    "implemented": true
  },
  {
    "id": "mana_burn",
    "name": "Mana Burn",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks drain a portion of the player's mana.",
    "implemented": true
  },
  {
    "id": "echoing_attacks",
    "name": "Echoing Attacks",
    "category": "Enemy Attack Modifiers",
    "description": "Enemy attacks repeat once after a short delay.",
    "implemented": true
  },
  {
    "id": "teleporting",
    "name": "Teleporting",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies occasionally teleport near the player.",
    "implemented": true
  },
  {
    "id": "charging",
    "name": "Charging",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies periodically rush toward the player.",
    "implemented": true
  },
  {
    "id": "leaping",
    "name": "Leaping",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies can leap over obstacles toward players.",
    "implemented": true
  },
  {
    "id": "burrowing",
    "name": "Burrowing",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies periodically disappear underground and emerge nearby.",
    "implemented": true
  },
  {
    "id": "phasing",
    "name": "Phasing",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies periodically become intangible and immune to damage.",
    "implemented": true
  },
  {
    "id": "ambushing",
    "name": "Ambushing",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies periodically spawn near the player.",
    "implemented": true
  },
  {
    "id": "pack_hunters",
    "name": "Pack Hunters",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies move faster when grouped together.",
    "implemented": true
  },
  {
    "id": "cowardly",
    "name": "Cowardly",
    "category": "Enemy Movement & Behavior",
    "description": "Injured enemies retreat and attempt to regroup.",
    "implemented": true
  },
  {
    "id": "relentless",
    "name": "Relentless",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies continuously pursue players from greater distances.",
    "implemented": true
  },
  {
    "id": "flanking",
    "name": "Flanking",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies attempt to approach from multiple directions.",
    "implemented": true
  },
  {
    "id": "blink_strike",
    "name": "Blink Strike",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies occasionally teleport directly behind the player.",
    "implemented": true
  },
  {
    "id": "evasive",
    "name": "Evasive",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies periodically dodge sideways when attacked.",
    "implemented": true
  },
  {
    "id": "swarming",
    "name": "Swarming",
    "category": "Enemy Movement & Behavior",
    "description": "Additional weak enemies periodically join combat.",
    "implemented": true
  },
  {
    "id": "enraged_pursuit",
    "name": "Enraged Pursuit",
    "category": "Enemy Movement & Behavior",
    "description": "Enemies accelerate the longer they chase a player.",
    "implemented": true
  },
  {
    "id": "coordinated_assault",
    "name": "Coordinated Assault",
    "category": "Enemy Movement & Behavior",
    "description": "Nearby enemies occasionally attack simultaneously.",
    "implemented": true
  },
  {
    "id": "frailty",
    "name": "Frailty",
    "category": "Player Debuffs & Curses",
    "description": "Players have 20% less maximum health.",
    "implemented": true
  },
  {
    "id": "exhaustion",
    "name": "Exhaustion",
    "category": "Player Debuffs & Curses",
    "description": "Players move 15% slower.",
    "implemented": true
  },
  {
    "id": "weakness",
    "name": "Weakness",
    "category": "Player Debuffs & Curses",
    "description": "Players deal 20% less damage.",
    "implemented": true
  },
  {
    "id": "mana_drought",
    "name": "Mana Drought",
    "category": "Player Debuffs & Curses",
    "description": "Mana regeneration is reduced by 50%.",
    "implemented": true
  },
  {
    "id": "healing_suppression",
    "name": "Healing Suppression",
    "category": "Player Debuffs & Curses",
    "description": "All healing received is reduced by 30%.",
    "implemented": true
  },
  {
    "id": "fragile_armor",
    "name": "Fragile Armor",
    "category": "Player Debuffs & Curses",
    "description": "Player armor is reduced by 25%.",
    "implemented": true
  },
  {
    "id": "arcane_vulnerability",
    "name": "Arcane Vulnerability",
    "category": "Player Debuffs & Curses",
    "description": "Players take 25% more magical damage.",
    "implemented": true
  },
  {
    "id": "physical_vulnerability",
    "name": "Physical Vulnerability",
    "category": "Player Debuffs & Curses",
    "description": "Players take 25% more physical damage.",
    "implemented": true
  },
  {
    "id": "cursed_blood",
    "name": "Cursed Blood",
    "category": "Player Debuffs & Curses",
    "description": "Players periodically lose a small percentage of health.",
    "implemented": true
  },
  {
    "id": "lingering_wounds",
    "name": "Lingering Wounds",
    "category": "Player Debuffs & Curses",
    "description": "Damage taken temporarily reduces maximum health.",
    "implemented": true
  },
  {
    "id": "spell_fatigue",
    "name": "Spell Fatigue",
    "category": "Player Debuffs & Curses",
    "description": "Skill cooldowns are increased by 25%.",
    "implemented": true
  },
  {
    "id": "resource_drain",
    "name": "Resource Drain",
    "category": "Player Debuffs & Curses",
    "description": "Mana or other class resources slowly drain during combat.",
    "implemented": true
  },
  {
    "id": "unstable_healing",
    "name": "Unstable Healing",
    "category": "Player Debuffs & Curses",
    "description": "Healing occasionally restores only half its normal amount.",
    "implemented": true
  },
  {
    "id": "curse_of_slowness",
    "name": "Curse of Slowness",
    "category": "Player Debuffs & Curses",
    "description": "Players are briefly slowed after using a skill.",
    "implemented": true
  },
  {
    "id": "mortal_vulnerability",
    "name": "Mortal Vulnerability",
    "category": "Player Debuffs & Curses",
    "description": "Players take 10% more damage for several seconds after receiving a critical hit.",
    "implemented": true
  },
  {
    "id": "endless_horde",
    "name": "Endless Horde",
    "category": "Summoning & Reinforcements",
    "description": "Additional enemies periodically spawn throughout the dungeon.",
    "implemented": true
  },
  {
    "id": "necromantic_ritual",
    "name": "Necromantic Ritual",
    "category": "Summoning & Reinforcements",
    "description": "Enemy necromancers periodically resurrect fallen monsters.",
    "implemented": true
  },
  {
    "id": "demonic_portals",
    "name": "Demonic Portals",
    "category": "Summoning & Reinforcements",
    "description": "Temporary portals summon waves of demons.",
    "implemented": true
  },
  {
    "id": "broodmother",
    "name": "Broodmother",
    "category": "Summoning & Reinforcements",
    "description": "Certain enemies periodically spawn smaller creatures.",
    "implemented": true
  },
  {
    "id": "elite_reinforcements",
    "name": "Elite Reinforcements",
    "category": "Summoning & Reinforcements",
    "description": "Champion enemies occasionally appear during combat.",
    "implemented": true
  },
  {
    "id": "shadow_clones",
    "name": "Shadow Clones",
    "category": "Summoning & Reinforcements",
    "description": "Enemies periodically create weaker copies of themselves.",
    "implemented": true
  },
  {
    "id": "guardian_spirits",
    "name": "Guardian Spirits",
    "category": "Summoning & Reinforcements",
    "description": "Enemies summon protective spirits that absorb damage.",
    "implemented": true
  },
  {
    "id": "summoner_s_pact",
    "name": "Summoner's Pact",
    "category": "Summoning & Reinforcements",
    "description": "Killing a summoned creature temporarily empowers its summoner.",
    "implemented": true
  },
  {
    "id": "swarm_infestation",
    "name": "Swarm Infestation",
    "category": "Summoning & Reinforcements",
    "description": "Insect swarms periodically emerge from the ground.",
    "implemented": true
  },
  {
    "id": "bone_legion",
    "name": "Bone Legion",
    "category": "Summoning & Reinforcements",
    "description": "Skeleton warriors periodically rise from nearby corpses.",
    "implemented": true
  },
  {
    "id": "infernal_invasion",
    "name": "Infernal Invasion",
    "category": "Summoning & Reinforcements",
    "description": "Demons periodically teleport into the dungeon.",
    "implemented": true
  },
  {
    "id": "elemental_convergence",
    "name": "Elemental Convergence",
    "category": "Summoning & Reinforcements",
    "description": "Enemies occasionally summon elemental creatures.",
    "implemented": true
  },
  {
    "id": "reinforced_packs",
    "name": "Reinforced Packs",
    "category": "Summoning & Reinforcements",
    "description": "Enemy groups contain additional monsters.",
    "implemented": true
  },
  {
    "id": "doppelgangers",
    "name": "Doppelgangers",
    "category": "Summoning & Reinforcements",
    "description": "Elite enemies occasionally create temporary duplicates.",
    "implemented": true
  },
  {
    "id": "unholy_resurrection",
    "name": "Unholy Resurrection",
    "category": "Summoning & Reinforcements",
    "description": "Dead elite enemies have a small chance to return as undead versions.",
    "implemented": true
  },
  {
    "id": "darkness",
    "name": "Darkness",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Visibility is significantly reduced.",
    "implemented": true
  },
  {
    "id": "dense_fog",
    "name": "Dense Fog",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Thick fog limits visibility beyond a short distance.",
    "implemented": true
  },
  {
    "id": "earthquake",
    "name": "Earthquake",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Periodic tremors damage and briefly stagger players.",
    "implemented": true
  },
  {
    "id": "falling_debris",
    "name": "Falling Debris",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Rocks and debris periodically fall from above.",
    "implemented": true
  },
  {
    "id": "collapsing_ground",
    "name": "Collapsing Ground",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Sections of the floor temporarily collapse or become hazardous.",
    "implemented": true
  },
  {
    "id": "spike_traps",
    "name": "Spike Traps",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Hidden spike traps periodically activate.",
    "implemented": true
  },
  {
    "id": "cursed_totems",
    "name": "Cursed Totems",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Destructible totems periodically damage or weaken players.",
    "implemented": true
  },
  {
    "id": "explosive_barrels",
    "name": "Explosive Barrels",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Explosive objects appear more frequently throughout the dungeon.",
    "implemented": true
  },
  {
    "id": "haunted_grounds",
    "name": "Haunted Grounds",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Ghostly enemies occasionally emerge from walls or floors.",
    "implemented": true
  },
  {
    "id": "blood_pools",
    "name": "Blood Pools",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Pools of blood slow players and periodically inflict bleeding.",
    "implemented": true
  },
  {
    "id": "unstable_rifts",
    "name": "Unstable Rifts",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Magical rifts randomly appear and release damaging energy.",
    "implemented": true
  },
  {
    "id": "gravity_wells",
    "name": "Gravity Wells",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Temporary gravitational fields pull players toward their centers.",
    "implemented": true
  },
  {
    "id": "corrupted_shrines",
    "name": "Corrupted Shrines",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Shrines provide powerful bonuses but also apply temporary curses.",
    "implemented": true
  },
  {
    "id": "arcane_mines",
    "name": "Arcane Mines",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Invisible magical mines reveal themselves shortly before exploding.",
    "implemented": true
  },
  {
    "id": "living_dungeon",
    "name": "Living Dungeon",
    "category": "Environmental & Dungeon Modifiers",
    "description": "Dungeon walls periodically release hostile creatures or magical attacks.",
    "implemented": true
  },
  {
    "id": "double_champions",
    "name": "Double Champions",
    "category": "Elite & Boss Modifiers",
    "description": "Champion enemy packs contain twice as many champions.",
    "implemented": true
  },
  {
    "id": "elite_empowerment",
    "name": "Elite Empowerment",
    "category": "Elite & Boss Modifiers",
    "description": "Elite enemies gain 30% damage and 30% health.",
    "implemented": true
  },
  {
    "id": "boss_enrage",
    "name": "Boss Enrage",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses gain increasing attack speed as their health decreases.",
    "implemented": true
  },
  {
    "id": "boss_regeneration",
    "name": "Boss Regeneration",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses slowly regenerate health while not taking damage.",
    "implemented": true
  },
  {
    "id": "guardian_shield",
    "name": "Guardian Shield",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses periodically gain temporary damage-absorbing shields.",
    "implemented": true
  },
  {
    "id": "elemental_bosses",
    "name": "Elemental Bosses",
    "category": "Elite & Boss Modifiers",
    "description": "Boss attacks gain a random elemental damage effect.",
    "implemented": true
  },
  {
    "id": "summoning_bosses",
    "name": "Summoning Bosses",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses periodically summon additional enemies.",
    "implemented": true
  },
  {
    "id": "twin_guardians",
    "name": "Twin Guardians",
    "category": "Elite & Boss Modifiers",
    "description": "Boss encounters feature two bosses instead of one.",
    "implemented": true
  },
  {
    "id": "unstable_bosses",
    "name": "Unstable Bosses",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses periodically unleash random elemental explosions.",
    "implemented": true
  },
  {
    "id": "boss_teleportation",
    "name": "Boss Teleportation",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses periodically teleport to new locations.",
    "implemented": true
  },
  {
    "id": "legendary_resistance",
    "name": "Legendary Resistance",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses take 30% less damage from critical hits.",
    "implemented": true
  },
  {
    "id": "vengeful_guardians",
    "name": "Vengeful Guardians",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses gain damage whenever one of their summoned minions dies.",
    "implemented": true
  },
  {
    "id": "boss_aftershock",
    "name": "Boss Aftershock",
    "category": "Elite & Boss Modifiers",
    "description": "Powerful boss attacks create secondary explosions.",
    "implemented": true
  },
  {
    "id": "unholy_ascension",
    "name": "Unholy Ascension",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses enter a more powerful second phase at 50% health.",
    "implemented": true
  },
  {
    "id": "final_stand",
    "name": "Final Stand",
    "category": "Elite & Boss Modifiers",
    "description": "Bosses become significantly stronger during their final 10% health.",
    "implemented": true
  },
  {
    "id": "wild_magic",
    "name": "Wild Magic",
    "category": "Chaotic & Special Mechanics",
    "description": "Random magical effects periodically occur during combat.",
    "implemented": true
  },
  {
    "id": "temporal_distortion",
    "name": "Temporal Distortion",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemies periodically speed up while players temporarily slow down.",
    "implemented": true
  },
  {
    "id": "chaos_orbs",
    "name": "Chaos Orbs",
    "category": "Chaotic & Special Mechanics",
    "description": "Floating magical orbs move around the battlefield, damaging anything nearby.",
    "implemented": true
  },
  {
    "id": "mirror_world",
    "name": "Mirror World",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemies occasionally reflect a portion of incoming damage.",
    "implemented": true
  },
  {
    "id": "blood_pact",
    "name": "Blood Pact",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemies gain damage whenever another enemy dies nearby.",
    "implemented": true
  },
  {
    "id": "soul_harvest",
    "name": "Soul Harvest",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemy deaths release souls that empower surviving monsters if collected.",
    "implemented": true
  },
  {
    "id": "arcane_overload",
    "name": "Arcane Overload",
    "category": "Chaotic & Special Mechanics",
    "description": "Repeated skill usage causes small magical explosions around players.",
    "implemented": true
  },
  {
    "id": "doom_clock",
    "name": "Doom Clock",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemy damage gradually increases the longer players remain in the dungeon.",
    "implemented": true
  },
  {
    "id": "unstable_reality",
    "name": "Unstable Reality",
    "category": "Chaotic & Special Mechanics",
    "description": "Random areas temporarily distort movement speed and projectile behavior.",
    "implemented": true
  },
  {
    "id": "death_s_pursuit",
    "name": "Death's Pursuit",
    "category": "Chaotic & Special Mechanics",
    "description": "An invulnerable spirit slowly follows players, damaging them on contact.",
    "implemented": true
  },
  {
    "id": "corruption",
    "name": "Corruption",
    "category": "Chaotic & Special Mechanics",
    "description": "Staying in one location too long causes damaging corruption to accumulate.",
    "implemented": true
  },
  {
    "id": "chaos_surge",
    "name": "Chaos Surge",
    "category": "Chaotic & Special Mechanics",
    "description": "Every 60 seconds, a random active dungeon affix becomes temporarily stronger.",
    "implemented": true
  },
  {
    "id": "elemental_roulette",
    "name": "Elemental Roulette",
    "category": "Chaotic & Special Mechanics",
    "description": "Enemies periodically change their elemental resistances and attack types.",
    "implemented": true
  },
  {
    "id": "cataclysm",
    "name": "Cataclysm",
    "category": "Chaotic & Special Mechanics",
    "description": "Large, clearly telegraphed environmental attacks periodically strike the dungeon.",
    "implemented": true
  },
  {
    "id": "velscour_s_wrath",
    "name": "Velscour's Wrath",
    "category": "Chaotic & Special Mechanics",
    "description": "Velscour periodically unleashes a random combination of fire, lightning, poison, and shadow attacks.",
    "implemented": true
  }
]
.map((affix) => Object.freeze(affix)));

export const DUNGEON_AFFIX_BY_ID = Object.fromEntries(DUNGEON_AFFIXES.map((affix) => [affix.id, affix]));
export const DUNGEON_AFFIX_CONFIG = Object.freeze(
{
  "fortified": {
    "healthMultiplier": 1.3,
    "resistanceBonus": 0.08
  },
  "tyrannical": {
    "bossHealthMultiplier": 1.5,
    "bossDamageMultiplier": 1.2
  },
  "brutal": {
    "damageMultiplier": 1.25
  },
  "swift": {
    "speedMultiplier": 1.3
  },
  "frenzied": {
    "attackSpeedMultiplier": 1.35
  },
  "armored": {
    "physicalDamageMultiplier": 0.8,
    "physicalResistanceBonus": 0.2
  },
  "resistant": {
    "magicalDamageMultiplier": 0.8,
    "magicalResistanceBonus": 0.2,
    "elements": ["fire", "cold", "light", "poison", "acid", "arcane", "holy", "shadow", "blood"]
  },
  "regenerating": {
    "healthPerSecond": 0.01
  },
  "vampiric": {
    "healFraction": 0.15
  },
  "colossal": {
    "sizeMultiplier": 1.25,
    "healthMultiplier": 1.25,
    "attackRangeMultiplier": 1.25,
    "defaultMeleeReach": 0.55
  },
  "elusive": {
    "dodgeChance": 0.15
  },
  "critical": {
    "chance": 0.2,
    "damageMultiplier": 2
  },
  "berserking": {
    "healthThreshold": 0.3,
    "attackSpeedMultiplier": 1.5
  },
  "empowered": {
    "perEnemyDamageBonus": 0.05,
    "maxDamageBonus": 0.5,
    "radius": 6
  },
  "thunderstorm": {
    "initialDelay": [
      4,
      8
    ],
    "repeatDelay": [
      8,
      12
    ],
    "warningSeconds": 0.9,
    "damageFraction": 0.06,
    "radius": 1.5
  },
  "relentless": {
    "aggroMultiplier": 1.35,
    "defaultAggroRange": 8
  },
  "weakness": {
    "playerDamageMultiplier": 0.8
  },
  "elite_reinforcements": {
    "championChance": 0.08
  },
  "darkness": {
    "darkness": 0.55
  },
  "boss_regeneration": {
    "healthPerSecond": 0.005
  },
  "teleporting": {
    "initialCooldown": [
      3,
      8
    ],
    "repeatCooldown": [
      8,
      14
    ],
    "minDistance": 5,
    "maxDistance": 22,
    "nearPlayerRadius": 3
  },
  "unyielding": {},
  "onDeath": {
    "areaRadius": 2.2,
    "damageFraction": 0.18,
    "areaDuration": 4,
    "reanimateChance": 0.2
  },
  "worldPulse": {
    "initialDelay": [
      6,
      10
    ],
    "repeatDelay": [
      12,
      20
    ],
    "warningSeconds": 0.9,
    "damageFraction": 0.06,
    "radius": 1.7
  },
  "enemyAttack": {
    "chance": 0.22,
    "damageFraction": 0.08,
    "statusDuration": 2
  },
  "enemyMovement": {
    "teleportInitial": [
      3,
      8
    ],
    "teleportRepeat": [
      8,
      14
    ],
    "minDistance": 5,
    "maxDistance": 22,
    "nearPlayerRadius": 3
  },
  "playerCurses": {
    "slowDuration": 2.5,
    "damageFraction": 0.015,
    "damageInterval": 8,
    "slowAfterSkill": 0.6
  },
  "summons": {
    "initialDelay": [
      12,
      20
    ],
    "repeatDelay": [
      20,
      35
    ],
    "maxExtraEnemies": 24,
    "spawnChance": 0.08
  },
  "environment": {
    "warningSeconds": 1,
    "damageFraction": 0.08,
    "radius": 2,
    "duration": 4
  },
  "eliteBoss": {
    "eliteHealthMultiplier": 1.3,
    "eliteDamageMultiplier": 1.3,
    "shieldFraction": 0.2,
    "shieldDuration": 4
  },
  "mirror_world": {
    "reflectChance": 0.22,
    "reflectDamageFraction": 0.2,
    "maxReflectedHealthFraction": 0.05
  },
  "chaos": {
    "initialDelay": [
      10,
      16
    ],
    "repeatDelay": [
      14,
      24
    ],
    "damageFraction": 0.07,
    "radius": 2
  }
}
);
const IMPLEMENTED = DUNGEON_AFFIXES;

export function normalizeDungeonAffixIds(value) {
  const ids = Array.isArray(value) ? value : [];
  const result = [], used = new Set();
  for (const id of ids) {
    const affix = DUNGEON_AFFIX_BY_ID[id];
    if (!affix || used.has(affix.category)) continue;
    used.add(affix.category);
    result.push(id);
    if (result.length >= MAX_AFFIX_SECTIONS) break;
  }
  return result;
}

export function chooseDungeonAffix(currentIds = [], random = Math.random) {
  const ids = normalizeDungeonAffixIds(currentIds);
  const usedCategories = new Set(ids.map((id) => DUNGEON_AFFIX_BY_ID[id].category));
  const availableSections = [...new Set(IMPLEMENTED.filter((affix) => !usedCategories.has(affix.category)).map((affix) => affix.category))];
  if (!availableSections.length) return null;
  const section = availableSections[Math.min(availableSections.length - 1, Math.floor(random() * availableSections.length))];
  const available = IMPLEMENTED.filter((affix) => affix.category === section && !ids.includes(affix.id));
  return available[Math.min(available.length - 1, Math.floor(random() * available.length))] || null;
}

/** Affixes accumulate every five destination depths from the current run's baseline. */
export function affixesForNextDepth(currentIds, nextDepth, random = Math.random, startDepth = 1) {
  const ids = normalizeDungeonAffixIds(currentIds);
  const elapsedDepths = Math.max(0, (Number(nextDepth) || 0) - (Number(startDepth) || 1));
  const target = Math.min(MAX_AFFIX_SECTIONS, Math.floor(elapsedDepths / AFFIX_DEPTH_INTERVAL));
  while (ids.length < target) {
    const next = chooseDungeonAffix(ids, random);
    if (!next) break;
    ids.push(next.id);
  }
  return ids;
}

function addResistance(monster, element, amount) {
  monster.res ||= {};
  monster.res[element] = (monster.res[element] || 0) + amount;
}

/** Assign the selected affix to each enemy and immediately apply its base stat changes. */
export function applyDungeonAffix(monster, id) {
  const affix = DUNGEON_AFFIX_BY_ID[id];
  if (!monster || monster.team !== 'enemy' || monster.dead || !affix) return false;
  monster.dungeonAffixIds ||= [];
  if (monster.dungeonAffixIds.includes(id)) return false;
  monster.dungeonAffixIds.push(id);
  monster.affixes ||= [];
  const cfg = DUNGEON_AFFIX_CONFIG;
  switch (id) {
    case 'fortified':
      monster.maxHp *= cfg.fortified.healthMultiplier;
      monster.hp = Math.min(monster.maxHp, monster.hp * cfg.fortified.healthMultiplier);
      for (const e of ['phys', 'fire', 'cold', 'light', 'poison']) addResistance(monster, e, cfg.fortified.resistanceBonus);
      break;
    case 'tyrannical':
      if (monster.rank === 'boss') {
        monster.maxHp *= cfg.tyrannical.bossHealthMultiplier;
        monster.hp = Math.min(monster.maxHp, monster.hp * cfg.tyrannical.bossHealthMultiplier);
        monster.dmg *= cfg.tyrannical.bossDamageMultiplier;
      }
      break;
    case 'brutal': monster.dmg *= cfg.brutal.damageMultiplier; break;
    case 'swift': monster.speed *= cfg.swift.speedMultiplier; break;
    case 'frenzied': monster.atkCd /= cfg.frenzied.attackSpeedMultiplier; break;
    case 'armored': addResistance(monster, 'phys', cfg.armored.physicalResistanceBonus); break;
    case 'resistant': for (const e of cfg.resistant.elements) addResistance(monster, e, cfg.resistant.magicalResistanceBonus); break;
    case 'regenerating': if (!monster.affixes.includes('regen')) monster.affixes.push('regen'); break;
    case 'vampiric': if (!monster.affixes.includes('vampiric')) monster.affixes.push('vampiric'); break;
    case 'colossal':
      monster.scale = (monster.scale || 1) * cfg.colossal.sizeMultiplier;
      monster.r = (monster.r || 0.33) * cfg.colossal.sizeMultiplier;
      monster.maxHp *= cfg.colossal.healthMultiplier;
      monster.hp = Math.min(monster.maxHp, monster.hp * cfg.colossal.healthMultiplier);
      monster.range = (monster.range || 0) * cfg.colossal.attackRangeMultiplier;
      monster.atkReach = (monster.atkReach || cfg.colossal.defaultMeleeReach) * cfg.colossal.attackRangeMultiplier;
      break;
    case 'volcanic_death': if (!monster.affixes.includes('fiery')) monster.affixes.push('fiery'); break;
    case 'multishot': if (!monster.affixes.includes('multishot')) monster.affixes.push('multishot'); break;
    case 'relentless': monster.aggroRange = (monster.aggroRange || 8) * cfg.relentless.aggroMultiplier; break;
    case 'boss_regeneration': if (!monster.affixes.includes('regen')) monster.affixes.push('regen'); break;
    case 'elite_empowerment':
      if (['champion', 'unique', 'elite'].includes(monster.rank)) {
        monster.maxHp *= cfg.eliteBoss.eliteHealthMultiplier;
        monster.hp = Math.min(monster.maxHp, monster.hp * cfg.eliteBoss.eliteHealthMultiplier);
        monster.dmg *= cfg.eliteBoss.eliteDamageMultiplier;
      }
      break;
    case 'splitting': monster.split = true; break;
  }
  return true;
}
