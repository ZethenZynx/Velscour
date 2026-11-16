# Campaign Biome Depth Ranges

The campaign portal chooses from the special destination and dungeon pools configured for the selected depth in
`src/data/biomes.js`. Both ends of each range are included, so a shared boundary can draw from either adjacent band.
The normal portal still offers up to three destinations, and its existing milestone boss rooms remain in effect.

| Depths | Special destination | Dungeon pool |
|---|---|---|
| 1–24 | The Forsaken Wilds | Skull-Lined Catacombs, Moonlit Necropolis, Plague Sewers, The Fetid Sewers, Haunted Library, Sunken Crypt |
| 24–48 | The Dark Forest | same as 1–96 |
| 48–72 | Castle | same as 1–96 |
| 72–96 | Castle Keep | same as 1–96 |
| 96–120 | Sea of Sand | Temple of the Sunless Dynasty, Bone Desert Tombs, Gilded Tomb, Amber Wastes |
| 120–144 | The Great Hunt | same as 96–192 |
| 144–168 | The Serpentine Tower | same as 96–192 |
| 168–192 | The Pyramid of the Scorpion King | same as 96–192 |
| 192–216 | Mountainside | Palace of the Everfrost, Frozen Ossuary, Crystal Caverns |
| 216–240 | Depth's Edge Caverns | same as 192–288 |
| 240–264 | The Snowy Summit | same as 192–288 |
| 264–288 | The Endless Siege | same as 192–288 |
| 288–336 | The Pirate Seas | The Empyrean Citadel, The Celestial Expanse, Storm Spire, Shattered Citadel, Desecrated Cathedral |
| 336–360 | The Sky Lanes | same as 288–360 |
| 360–408 | The Iron Express | Molten Depths, The Infernal Dominion, Infernal Forge, Abyssal Chasm, Obsidian Vault, Halls of Blood, Flesh Pits, Void Sanctum |
| 408–456 | The Deep Rail Mines | same as 360–456 |
| 456–499 | Velscour's Throne, with a regular guardian | none |
| 500 | Velscour's Throne and Velscour | none |

The destination schedule preserves each level's existing completion flow. The Throne is the exception with depth-based
boss selection: Depth 456 is the Act 5 finale against Kragmaul, depths 457-499 end with a regular guardian, and
Velscour appears in the campaign only at Depth 500.
The separate skull practice command can still summon Velscour at another depth.

## Acts and finale bosses

Act boundaries belong to the act that begins at that depth. The finale boss is fought at the boundary depth, so it
appears on the first depth assigned to the next act.

| Act | Depths assigned to act | Finale boss depth | Finale boss |
|---|---:|---:|---|
| 1 — The Fallen Realms | 1–95 | 96 | Ossuarch, the Bone Colossus |
| 2 — The Scorched Wastes | 96–191 | 192 | Pharaoh Sekhmun, the Exchanged King |
| 3 — The Frozen Peaks | 192–287 | 288 | Hollowmere, the Necrolyte of Rime |
| 4 — The Empyrean Heights | 288–359 | 360 | Aurion, the Throne-Seraph |
| 5 — The Infernal Dominion | 360–455 | 456 | Kragmaul |
| 6 — Velscour's Throne | 456–500 | 500 | Velscour |

The existing mid-act superbosses remain at Depths 50, 150, 250, and 350.
