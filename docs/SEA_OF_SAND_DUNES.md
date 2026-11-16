# The Sea of Sand's dunes and pyramids

Ten surface variants of the Sea of Sand are built as live three.js height fields, like the Depth's Edge Caverns
([DEPTHS_EDGE.md](DEPTHS_EDGE.md)). Each is a square of rolling dunes, 168 to 188 tiles a side (the classic desert
is 72), smoothed into barchans along the wind with ridges you can't cross. A caravan trail zig-zags past six to nine
**waystones**, each with its own encounter. Win them all and a surface guardian rises in the plaza; defeat it to open
a normal exit portal across the dunes. The surface route no longer enters its pyramid.

The **Pyramid of the Scorpion King** is now a separate level, available for testing by typing its name into Contact
Velscour. It uses the Red Erg's existing tomb, starts inside the entrance hall, and retains its sealed room sequence,
tomb guardian, burial-chamber master and final portal. It is intentionally excluded from normal depth selection until
its future access point is designed.

The classic flat Sea of Sand ([SEA_OF_SAND.md](SEA_OF_SAND.md)) stays in the rotation alongside the ten dune surfaces.
It keeps its one-to-five scenario areas and now ends with a guardian and normal exit portal. Entering Sea of Sand picks
one of the eleven surface maps at random, never the one seen last
(`c.lastSand`). A kept run (`c.seaOfSandRuns[depth]`) rebuilds the same variant. Velscour's skull goes straight to a
random dune variant: send `pyramid`, `pyramids`, `dunes` or `tomb`. `G.sandVariant = 1..10` forces one (tests).

| File | What |
|---|---|
| `src/data/dunes.js` | `DUNE_VARIANTS` (10): sand floors and palette, sky and sun, dune shape and size, waystone count, the pyramid, monster swap/tint, roster, bosses, names, intro |
| `src/world/dunes.js` | `generateDunes`: the plan (pyramid, plaza, start, camps, route), the dune heights, ridges, oases, the tomb's ring of rooms and corridors, seals, the vertex field, props, torches, spawns, chests, reachability |
| `src/gfx/dunes3d.js` | the two three.js scenes (outside, inside), sand and masonry textures, the terrain shader, the skirt past the map's edges, the pyramid, water, torches, seals, baked props |
| `src/game/dunes.js` | the run: `ENCOUNTERS`, `useDunes` (picking, horizon and props by region), surface waystone and guardian fights, pyramid room fights, tomb boss, burial chamber, portals and objective HUD |
| `src/game/game.js` | the variant pick (`loadLevelArt`), `buildDungeon`'s branch, the skull words |
| `src/ui/quest.js` | the Quest Log's dunes page |
| `tools/tests/dunes_map.mjs` | node: every variant over seeds, reachability, climb steps, depth, counts, map images |
| `tools/tests/dunes.js` | browser: every surface variant, picking, waystone, plaza guardian and exit; separate pyramid entry, chamber master and exit |

## The ten variants

| id | Name | Pyramid | Tiles | Waystones | Final boss / tomb boss |
|---|---|---|---|---|---|
| golden | The Golden Expanse | The Great Pyramid of Khepra | 176 | 7 | Sandstone Scarab Emperor / The Salt Pharaoh |
| red | The Red Erg | The Pyramid of the Scorpion King | 184 | 8 | Queen of the Red Scorpions / Ravenous Centipede King |
| gypsum | The White Gypsum Sea | The Alabaster Pyramid | 168 | 6 | Bonewhite Crypt Dragon / Bone Colossus |
| obsidian | The Black Glass Desert | The Obsidian Pyramid | 180 | 7 | Obsidian Crown Hydra / Basalt Anvil Guardian |
| moonlit | The Moonlit Barrens (night) | The Pyramid of the Moon | 172 | 7 | Lich King / Pale Empress of Worms |
| saltflats | The Salt Flats of Ur | The Salt Pyramid of Ur | 188 | 8 | The Salt Pharaoh / The Buried Colossus |
| copper | The Copper Dunes | The Ziggurat of the Sun (7 tiers) | 184 | 8 | Golden Sunscale / Sun-Eater Djinn |
| bone | The Bone Wastes | The Ossuary Pyramid (5 tiers) | 176 | 7 | Bone Leviathan / Ossuary Golem |
| emerald | The Emerald Mirage | The Pyramid of the Serpent | 180 | 7 | The Amber Hydra / Oracle of the Dry Sea |
| storm | The Storm Sands | The Pyramid of the Djinn | 188 | 9 | Velscour's Dune Herald / Glassstorm Roc |

The monsters are hand-picked from the painted bestiary for each variant (`roster`, built from shared desert lists:
scarabs, scorpions, mummies, sand worms, djinn, golems, cultists), every one palette-swapped and tinted in the
variant's sand colours (`swap`, `tint`), so the same art reads differently in red sand and in black glass. The
bosses are raid bosses (`makeRaidBoss`) on plain raid templates (those before `valdric`, without signature casts)
wearing the chosen art, in the same swap. The breakable things (obelisks, egg sacs, canopic jars) are static
monsters with art `va_crystal`, `eb_m105` and `gold_chalice`, added to the level's looks.

## The fights
Waystones (the eight kinds shuffled, so no kind repeats until the Storm Sands' ninth): **Buried Ambush** (three waves out of the
sand), **Raiders' Camp** (raiders and their captain), **The Singing Obelisks** (break three obelisks that heal the
dead), **Sandstorm** (hold out in a blinding storm, then kill what rides it), **The Dig** (stand on three buried
caches while the sands fight back), **Scarab Nest** (burst the egg sacs), **Champion of the Sands** (a champion and
its guard), **Hold the Oasis** (kill sixteen). A won waystone leaves a chest and a pillar of light.

Tomb rooms: **Hall of Guardians** (statues wake two by two), **The Sealed Gallery** (the slab drops behind you,
three waves), **Sandfall** (the ceiling pours sand, telegraphed), **The Canopic Vault** (each jar raises mummies
until broken), **Scarab Tide** (scarabs out of the walls all at once), **Priests of the Dead**. The seventh room on
the ring is the tomb boss (`v.bosses[1]`). A room's fight starts a tile inside it and locks the corridor behind it
(anyone of the party still on those tiles is moved in); winning it sinks the slab ahead. A room's foes always arrive
inside the room (`foe` re-picks any spot outside it, since a spawn radius can reach past the slab into the next
landing), and `tickEnc` puts back any that get out, so a room can't be left with a foe nobody can reach. A treasury
off one landing holds chests and its guards.

## How it's built
- **The grid.** One `TileMap` holds both regions: the dunes in `x < E`, a 26-tile gap, then the 112-tile tomb
  (`OXI = E + 26`). `dv.inside(x)` says which region a tile is in. The pyramid stands at the far corner (top of the
  screen), with open ground only in front of its two visible faces, so it never hides anything walkable. The
  door's step (`doorStep`) and the plaza are in front of its south face.
- **Heights.** As in the caverns: heights in tiles (one three.js unit), `CAVE_S = 2` vertices a tile edge,
  `map.hgt` in levels for the climb rules. A dune is a barchan profile (a gentle windward slope, a short slip face)
  plus an fbm swell. Ridges are rock with a target height `RH`, gapped wherever the trail, a camp or the plaza needs
  through. The far edges are tall rock (6.5 to 10.5 tiles), the near ones low (1.6 to 2.6), so nothing walkable is
  hidden behind them. A climb-limit relaxation keeps every step between walkable neighbours within the climb.
- **The tomb.** A ring of 12 cells round the burial chamber (30x30). Rooms 0, 2, 4, 6, 8, 10 and 11 are chambers,
  the rest landings; each cell steps down 1.55 tiles. Corridors are 3 wide, ramped and dog-legged. The walls are
  near-vertical masonry; the caverns' cap rule (no masonry may hide the floor behind it on screen) applies to the
  tomb only. The cut oval opens the masonry round the hero.
- **Two scenes.** `drawDunes3D` draws the scene of the hero's region: outside (sun or moon, hemisphere light, the
  pyramid, oases, braziers) or inside (dark, torch pools of light, seals). `world.cave` answers picking, the horizon
  and prop drawing for the hero's region only; creatures in the other region aren't drawn. The 2D light map uses
  `world.biome.dark` 0.06 outside by day (0.42 at night) and `darkK` 0.7 inside.
- **The sand** is the Sea of Sand pack's own floor tiles, unprojected from their 160x80 diamonds into seamless
  squares (`sandSquare`), recoloured per variant (`core/util.js recolor`), tiled every two tiles, with ripples
  across the wind and a bump from the texture's luminance (`sky.bump`, lower on the white sands). Past the map's
  edges a low-poly **skirt** of rolling dunes carries the edge's height and sand outward 60 tiles, so the camera never
  looks off the end of the world; it stays low past the near edges.
- **Masonry** is procedural (`masonry`): staggered courses or flagstones, glyph bands every fourth course, in the
  pyramid's stone colours. Obelisks, columns, urns and the sarcophagus are 3D models baked to sprites (`bakeProps`),
  drawn in the depth-sorted pass by `world.cave.drawProp` so they hide whoever walks behind them. The jars along a
  room's walls and its columns keep 2 tiles clear of every corridor's mouth (`nearWay`): a row of jars across the way
  in looked like a wall, and the one gap it left was easily plugged by a pet or a foe.

## Auto-play
`run.objective` points to the next waystone during the surface route and to the surface guardian after the last
waystone. In the separate pyramid, it points to the next tomb room and then the burial-chamber master. During a fight,
`run.duty` directs the hero to the next dig cache (`hold`), relic, or back inside the encounter area when kiting has
drawn them out.

## Tests
- `node tools/tests/dunes_map.mjs [ids|all] [seeds]`: no browser. The trail joins the start, every waystone and the
  plaza; the standalone pyramid starts inside the Red Erg tomb and joins its entrance to the burial chamber; at most 20 steps over the climb limit;
  the chamber at least 12 tiles under the entrance; every corridor's mouth open its full width two tiles into its room,
  no jar within 2 tiles of one; counts of spawns and props. Writes `out/dunes_map_<id>.png`.
- `node tools/tests/dunes.js [ids|all] [mobile] [auto] [noflow]`: the live game. It checks each surface route's plaza
  guardian and portal, then the standalone pyramid's burial-chamber master and portal. `auto` tests a surface clear.
