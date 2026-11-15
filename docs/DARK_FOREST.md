# Dark Forest

The Dark Forest is a full-size 192 × 192 forest dungeon. A broad, open route crosses the woods from the southwest entrance to the northeast clearing.

## Level flow

- The player enters from the southwest.
- One Forest Guardian waits in the opposite corner.
- Defeating the Guardian opens the normal exit portal.
- The forest generates about 80–110 regular enemy packs (roughly 220–340 enemies total), with the exact count and composition varying by map seed.
- Two chests appear along the reachable route.
- No trial glades, Heartwood objective, maze walls, labyrinth doors, or labyrinth-only rewards are generated.
- Enemy groups and chests are placed only in the connected area accessible from the entrance.

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
