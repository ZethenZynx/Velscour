# Dark Forest

The Dark Forest remains a forest-themed overworld dungeon. Its map is compact (48 × 48 tiles) and uses a broad, open floor with scattered trees and a clear route between opposite corners.

## Level flow

- The player enters from the southwest side.
- One Forest Guardian waits in a clearing at the northeast corner.
- Defeating the Guardian opens the normal exit portal. The depth then uses the regular dungeon clear and reward flow.
- Six small enemy packs and two chests provide encounters and loot along the route.
- No trial glades, glade objectives, Heartwood objective, maze walls, labyrinth doors, or labyrinth-only rewards are generated.

The map seed remains saved per depth in `darkForestRuns`, so returning from town restores the same layout. Existing character save data is retained; legacy Dark Forest trial records are ignored.

## Checks

Run the lightweight generator contract checks with:

```sh
node tools/tests/dark_forest_compact.mjs
```

The browser smoke test also checks that defeating the generated Guardian completes the scenario and opens the exit:

```sh
node tools/tests/dark_forest.js
```
