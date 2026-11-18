# Enemy variety and advanced AI

Enemy behavior is layered on the existing Monster AI, pathfinding, action wind-ups, projectile and hazard systems. Normal enemies receive a role profile at construction; multiple profiles are combined for mixed-role monsters. Sea of Sand variants inherit a compatible profile from their underlying AI class. Bosses and player summons retain their existing behavior.

## Role profiles

| Profile | Behaviors | Typical attacks |
| --- | --- | --- |
| Pack hunters | Coordinated flanking, pack leader, surround and strike, revenge frenzy | Coordinated rush, pack howl, rapid claws |
| Summoners | Minion summoning, corpse reanimation, portal summoning, sacrificial summoning | Bone spear, corpse explosion, soul drain |
| Burrowers | Underground ambush, tunnel pursuit, eruption attack, burrow retreat | Poisonous vomit, fire eruption |
| Chargers | Charging rush, wall collision, berserker rage, ground slam | Overhead strike, ground slam, leaping bite |
| Support | Ally healing, protective barrier, battle chant, emergency resurrection | Soul drain, pack howl |
| Snipers | Charged precision shot, predictive shot, repositioning, suppressive volley | Triple arrow, piercing arrow, bone spear |
| Retreaters | Panic retreat, call for help, tactical withdrawal, false surrender | Retreating shot, throwing knives, smoke bomb |
| Ambushers | Shadow stalker, ceiling ambush, camouflaged predator, decoy ambush | Lunging grab, web projectile, venom spray, leaping attack |
| Defenders | Shield guard, counterattack, defensive stance, shield bash | Shield bash, overhead strike, spinning slash, shockwave |
| Mystics | Short-range teleport, illusion copies, elemental adaptation, unstable death | Flame wave, teleport strike, fire eruption, spectral dash, life drain, haunting projectile, rock throw, shockwave, death burst |

## Existing roster assignments

- Skeletons combine pack and defender roles; archers use sniper and retreat roles.
- Zombies use the burrower role and release a death burst. Ghouls and bats favor ambushes; spiders combine ambush and burrow roles.
- Imps, demons, wraiths, eyes and elementals use magical or ranged roles. Demons combine charger and mystic roles.
- Golems, knights, gargoyles, hounds, worms, scorpions, beetles, shrooms and abominations receive compatible combinations based on their existing AI and theme.
- Cultists combine summoning and support. Missing goblin, wolf, necromancer, shaman and assassin creature IDs map to the closest existing roster equivalents rather than adding new base sprites.

## Safety and progression

- New attacks use visible wind-up telegraphs before their damage resolves. Teleport destinations are checked against walkable map space; charges use the existing collision-backed movement.
- Summons are weaker, capped at three per summoner and 24 globally. They grant no XP, loot, kill credit, or challenge progress, and cannot summon or inherit advanced profiles.
- Reanimated corpses use the world's persistent corpse records, are consumed once, and return as weak no-reward summons. A corpse can only be used once; resurrection has a cooldown.
- Defensive reductions are partial. Adaptive resistance is temporary and applies only to the most recently received non-physical element. Rage and ally buffs expire automatically.
- Ambush attacks telegraph their landing area. Retreating monsters use map navigation and bounded goals. New AI effects are visualized with existing rings, particles, smoke, slashes, projectiles, and telegraphs; no artwork was generated.

## Verification

`node tools/tests/enemy_variety.mjs` checks the complete behavior and attack catalogs, profile assignments, existing-roster references, runtime dispatch wiring, and reward suppression for summoned enemies. Run `node --check` on the changed modules and use the browser test harness for in-game combat/visual verification.
