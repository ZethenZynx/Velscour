# The Serpentine Tower

The Serpentine Tower is a three-dimensional spiral stair played through the normal 2D game view. The hero now enters
at the stairhead and works downward through the tower. Enemies wait along the route, with some dropping onto the steps
from above. A guardian appears at the ground-floor landing; defeating it opens the exit portal there.

All five tower variants use the same route and encounter rules. Their different stone, metal, lighting, banners, and
stair proportions remain intact. The stairhead roof remains part of the tower's 3D model, but the playable route ends
at the ground-floor guardian instead of continuing into a rooftop boss sequence.

| File | Responsibility |
|---|---|
| `src/world/tower.js` | Five tower variants, spiral geometry, map, upper start, lower exit, enemies and chests |
| `src/game/tower.js` | Camera/geometry warp, descending progress, enemy arrivals, ground-floor guardian and portal |
| `src/gfx/tower3d.js` | Live three.js tower, stair, roof, cutaway and lighting |
| `src/ui/quest.js` | Tower progress and guardian objective |
| `tools/tests/tower_map.mjs` | Generator route checks across all variants and seeds (no browser) |
| `tools/tests/tower.js` | Live browser check of arrival, boss spawn, defeat and exit |

## Route and coordinates

The game grid unrolls the spiral into a walkable strip. Increasing tile `x` runs down the stair; `y` spans its width.
`generateTower` starts the player near `g.XT` at the upper stairhead and places the lower landing near `g.XB`. The
guardian and the inactive exit share that lower landing. `createTowerRun` hides the exit until the guardian falls.

The tower warp maps the strip onto a helix and turns the camera with the hero. The minimap tracks the descent, and the
normal loot, combat, character progression, and exit systems remain in use.

## Validation

Run the generator check from the repository root:

```text
node tools/tests/tower_map.mjs
```

For the live check, start the local web server and run:

```text
node tools/tests/tower.js all
```
