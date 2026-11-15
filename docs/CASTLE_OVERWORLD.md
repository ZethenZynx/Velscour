# CASTLE overworld biome

The current playable Castle is a full-size **336 x 304** overworld dungeon. It has a broad route from the southwest entry to a guardian in the northeast corner, Castle walls and keep structures around open courtyards, regular monster packs, and no shrine or side objectives. The exit unlocks after the Castle Guardian is defeated.

> **October 28, 2026:** the Castle is now eleven castles: the concentric one below (Ironcrown) and ten variants with their
> own layouts, materials, palettes and stories. Everything that used fixed coordinates here now reads the variant's
> layout and plan (`src/data/castles.js`). See [CASTLE_VARIANTS.md](CASTLE_VARIANTS.md).

> **October 21, 2026:** the curtains, towers, gates, stairs, keep and halls are now one baked 3D model on a height
> map: walk the walls, explore the keep and its throne room, watch the drawbridge come down. See
> [CASTLE_3D.md](CASTLE_3D.md); the sprite walls, towers and keep art described below are gone.

CASTLE is the third playable overworld beside the Forsaken Wilds and Sea of Sand. Its runtime atlases preserve the 160x80 floor grid, pivots, frame IDs, wall masks, orientation, and topology. The keep has its own six-frame floor atlas and three complete 20-piece interior wall families.

## Game integration

- `src/data/biomes.js` registers Castle as an overworld with its own monster roster.
- `src/gfx/castle.js` loads the Castle atlases and exposes the floor, wall, landmark and prop art.
- `src/world/castleworld.js` generates a 336 x 304 board with an open southwest-to-northeast route, perimeter curtain walls, scattered keep and gatehouse structures, and reachable enemy packs.
- `src/game/darkforest.js` supplies the linear guardian-run state used by the Castle and the Dark Forest. There is no shrine scenario, required objective, or Castle story encounter.
- `src/game/game.js` creates the Castle Guardian run and opens the ordinary exit when the guardian dies.
- Contract checks for dimensions, connectivity, population, assets and the boss gate are in `tools/tests/castle_boss_run.mjs`.
- The remaining layout and scenario material below records earlier Castle designs and should be read as design history, not current gameplay.

## Castle layout (October 2026 overhaul: a concentric castle)

Modelled on the concentric castles of [Beaumaris and Harlech](https://en.wikipedia.org/wiki/Concentric_castle): one castle
nested inside another, the lower outer curtain covered by the higher inner one, the gatehouses offset so attackers can't
charge straight through both. The board (south at the bottom of the screen's left, as the hero arrives):

- **Approach** (south): the road from the start runs through a village (eight town-pack houses at 4x4, a green with a
  well and a market stall, fenced kitchen gardens, haystacks, chimney smoke) to the moat. Fields with furrows, fences and
  a scarecrow, and an orchard, lie to the south-west; the enemy's **siege lines** to the south-east (a palisade of
  wicker, stakes and sandbags facing the walls, four siege engines with their ammunition, eight procedural tents round
  smoking camp fires, cages, stores).
- **Moat and river**: a river comes down the west side, feeds the 8-tile moat, and leaves by the east. The moat's far
  banks show as faces dropping to the water.
- **Bridges**: three stone bridges at ground level over the sunken water (main, postern, the east road's over the
  outflow), arched on the side the camera sees; the main one ends in the drawbridge's planks (see below).
- **Outer curtain** (`CASTLE_OUTER`, cells 48..120 x 34..100, 6 tiles thick): square towers on the corners and
  between, the twin-towered gatehouse mid-south, a postern between two small towers north-east; a wall-walk on top
  reached by stairs from the outer ward (see below).
- **Outer ward**: the south bailey (practice yard with targets and dummies, banners, the smithy and armoury), the west
  ward (stables, a mud paddock behind timber rails), the north ward (tilled kitchen garden, orchard, dovecote, the
  postern road), the east ward (barracks, and a mason's yard repairing the curtain: scaffolds, a hoist, dressed stone).
- **Inner curtain** (`CASTLE_INNER`, 14 cells inside, 5 tiles thick, its walk 8 levels higher than the outer's):
  square towers on its corners and sides; the inner gate is offset east of the gatehouse, a second inner gate opens
  north-west towards the postern.
- **Inner ward**: the great keep (`landmark_09` at 1.6x, cut into 32 px columns sorted from its footprint's front edge,
  so walkers beside it sort right); the **throne hall** (carpeted nave, colonnades, the dais, chandeliers, banners,
  armour), the **cathedral** (carpeted nave between pews, side aisles behind pillars, pulpit, lancet windows) and the
  **great hall** (high table, two long feasting tables on a timber floor, the hearth, the kitchen corner) as enterable
  roofless rooms; a walled garden (four hedged lawns, gravel walks, the fountain statue, ivy arches); the well and
  kitchen stores by the inner gate.
- **Edge**: a forest of the Dark Forest's towering trees (`loadDarkForestTrees`, in `map.treeCells` buckets) with the
  castle pack's trees on its fringe; a graveyard and a ruined chapel wall west of the moat, a ruined watchtower in the
  north-east woods; the exit at the end of the north road.

Scenario sites follow the scenario (`plan` in `castleworld.js`): siege engines to sabotage stand in the siege lines,
prisoners wait by its cages, the dead rise in the village and the graveyard, the crossing to hold is the main bridge,
the escort leaves through the postern, rifts and relics are in the inner ward, rampart fights are on the lane, keep
fights in the halls; each cluster is a short walk across.

Art notes: several atlas names don't describe their art. Floors are chosen by look (`F` in `castleworld.js`; e.g.
`floor_35` granite setts for courtyards, `floor_15` light cobbles for the ward roads, `floor_56` planks), and scatter
frames whose names drifted from their art are aliased by what they show (`SCATTER_ART`: frame 34 is a siege engine,
116 the fountain statue, 120 a wheelbarrow, ...). Prop heights are set in world px for the 60 px hero (`PROP_H`).
The carpet runner and the tents are procedural (`castleCarpetTiles`, `castleTent` in `gfx/castle.js`), drawn on first
use so generation stays canvas-free under Node.

```sh
node tools/tests/castle_overworld.mjs [seeds]   # 100 seeds: both curtains solid and sealed with their gates shut (no
                                                # hop over them), walks/towers/stairs reached, bridges over sunken water
                                                # with parapets and arches, hall walls and doors, all 35 scenarios, caps
node tools/tests/castle_walls.js [views]        # the height-mapped walls in play, with shots (castlewall_*.png)
node tools/tests/castle_visual.js [views] [--grid]   # screenshots of every area; --grid tints blocked tiles red
```
Look at the screenshots (`tools/tests/out/castle_*.png`): layering mistakes don't throw.

## Walls, towers, stairs and bridges (height map)

Built in `src/world/castleworld.js` (the `curtain walls` and `bridges` sections), drawn by `src/gfx/terrain.js` with
the masonry painter `src/gfx/castlewalls.js`.

- **Levels** (`LV`, HS = 4 world px each): ground 0, water -11, outer wall-walk 24 (96 px, ~1.6 heroes), inner
  wall-walk 32, hall walls 18. Merlons stand `MERLON` 9 over a walk, crenels (the gaps) `SILL` 3; both are blocked.
- **Curtains**: the outer ring is 6 tiles thick (a 5-tile walk behind its battlement), the inner 5 (4-tile walk); the
  battlement runs along the outside edge, merlon and crenel alternating. Wall-walk tiles are `map.rampartDeck`, every
  wall tile `map.rampartWall`.
- **Towers** (`map.castleTowers`, 31): square, a tile out onto the berm (so they stand on the same ground as the
  curtain and every wall foot meets the moat's revetment on one line); their floor is `TOWER_UP` 8 levels over the
  walk (the gatehouse's two `GATE_UP` 12), stepped up one STEP a tile wherever the walk comes in, battlements round
  the rest of the edge, a corbel band under them and arrow slits on their faces (`map.faceBand`).
- **Gates**: each passage goes straight through the wall (and on between its two towers) at ground level, paved.
  Over both mouths an arched lintel (`castleSpan`, sliced into 32 px columns so walkers in the passage sort under it);
  the main gate and the inner gate's outer mouth show a raised portcullis, the main gate a battlement.
- **Stairs** (`map.castleStairs`, 11): flights two tiles wide against a wall's inside face, one STEP (4 levels) a tile,
  ending on a landing level with the walk: two per side of the outer curtain, three for the inner one (one per half
  between its gates). `map.walkStep` = 4: walkers climb them without the terrain's hop.
- **Bridges** (`map.castleBridges`): the main bridge over the south moat (its last three rows before the gate are the
  drawbridge's planks, `castlePlankTile`), the postern bridge over the north moat, the east road's over the outflow:
  a deck at ground level between low blocked parapets, the side the camera sees opening in arches down to the water
  (`map.faceArch`: the artwork's arch piece, one arch per ~4 tiles). `map.bridgeWater` keeps the water flowing under.
- **Halls**: the throne hall, cathedral and great hall have masonry walls in the keep's limestone (`FACE.warm`), so
  each doorway is a clean opening through a solid wall with an arched lintel and two oak leaves swung back flat against
  the face the camera sees (`castleLeaf`; the leaves are cut from the face-on oak door, the pack's other doors are
  drawn at an angle).
- **Banners** (`castlePanel`): the pack's hangings are all painted face on (their SE/SW/NW/NE frames are the same
  picture), so they are sheared flat onto the wall face they hang on: every 8 tiles along the curtains (inside the
  wards, and outside toward the moat), one under the corbels of each visible tower face, every 6 tiles round the halls
  and at their old spots inside; never over a door, window, sign or torch.
- **Keep**: `landmark_09` is mirrored (`castleFlipped`) so its gate and steps face south over the courtyard to the
  inner gate.
- **Roads** (`map.road`): after the sites are known, a trail runs from every house's door, every scenario site (the
  shrine first), chest and stair foot and the exit to the nearest road, lane, paving or hall floor, round props and
  trees; then every stretch the props and walls cut off is joined to the network the hero arrives on. On a map with
  `map.road` auto-play's distance field (`Auto.buildRoadNav`) is the cheapest way, not the shortest (a road step 2,
  open ground 5), and its corners are cut only where the cut keeps to the same ground, so the hero keeps to the roads.
- **Packs on the walls**: 12 monster packs hold the wall-walks and tower tops (`spawns[].rampart`); they come down the
  stairs at the hero. The rampart scenarios muster on the south and east walks (`map.rampartPosts`).

**Drawing.** Columns are baked into the floor chunks back to front. Faces with a `map.faceArt` style are painted by
`drawCastleFace`: the unsheared masonry sheared back onto each face and anchored to the ground plane (each course at a
fixed height, so courses run on from tile to tile, round corners and from a merlon down the wall under it; SE faces
darker), a string course at walk level, corbels and slits on towers, a battered plinth at the
foot, rain streaks and moss, a wet green waterline on the moat's stone revetment; the river's banks are earth
(`FACE.earth`, terrain.js's own banks). Tops are the artwork's flagstone slabs, one slab to a tile in eight turns,
so tile joints fall on the slabs' own edges and the grout runs on along the iso axes (`castleRampartTops`, tinted for
the halls). Because the walls stand far taller than a tile (`map.tallOcclusion`):
- every column whose top could hide something behind it is an occluder (terrain.js `terrainOf`), redrawn in the sorted
  pass over creatures, props, trees, buildings, chests, loot and portals behind it, clipped to them (`occludersFor`,
  `occludersOfRect`);
- the hero hidden behind a wall is drawn again over it as a faint silhouette; walls stay solid;
- corpses, decals, ground particles and the water's ripples behind a wall or under a bridge are skipped
  (`hiddenBehind`), and a wall top's back edge, where it drops out of sight, gets a dark rim.

**Art.** `tools/castleramparts.py` cuts the user's `assets/source/biomes/VELSCOUR_Castle_Artwork_Complete.zip` into
`assets/tiles/castle/ramparts.webp` + `ramparts.json` (face, warm, corbel, plinth, slit, arch, top_0..7): each painted
face is unsheared (its columns slid half a pixel per pixel so the courses run level), cropped and made to tile.
The pieces are small and drawn at their own scale, so they are used as textures, not placed whole.

```sh
python tools/castleramparts.py                      # rebuild ramparts.webp/json from the zip
node tools/tests/castle_walls.js [views] [--noshots] # walk/towers/stairs reachable, no drops off the walls,
                                                     # monsters path down; 30 shots with the hero (castlewall_*.png)
```

## Rebuild runtime atlases

The runtime art is generated from the full source pack and can be rebuilt with:

```bash
python tools/castlepack.py path/to/CASTLE_Biome_Pack
```

The generated atlases and index live in `assets/tiles/castle/`. WebP atlases are lossless. The full individual PNG pack and authoring documentation remain the source of truth for pixel editing.

## Verification

```bash
node tools/tests/castle_overworld.mjs
node tools/tests/overworld.js
node tools/tests/sea_of_sand_generation.mjs
```

The Castle check covers the documented tile dimensions, the threefold board area, dedicated keep atlas contracts, 100 seeded maps, all 35 scenarios, a closed curtain wall, the gate and postern crossings, the wall-walk lane, interior doors and combat rooms, objective reachability, and three-dungeon rotation among all overworlds. The Sea of Sand check covers 100 seeded maps and all route-anchor reachability. `python tools/build_townsfolk_pack.py` rebuilds the civilian sheets and ZIP from the included original generated art.

