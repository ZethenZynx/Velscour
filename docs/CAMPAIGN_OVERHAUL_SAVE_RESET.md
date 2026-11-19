# Campaign overhaul save reset

The first title-screen save read after campaign overhaul version 1 performs one reset. It copies the current gameplay records, then clears the old hero saves, shared endgame progress, shared Reliquary, and saved in-game dialogue/taunt history. The reset marker is `velscour_campaign_overhaul_reset_v1`; later launches do not repeat it. Audio, display, controls, chat layout, and other preferences use separate keys and remain intact.

Before clearing, the game stores a recovery snapshot under `velscour_campaign_overhaul_backup_v1`. The JSON has `version`, `savedAt`, `saves`, `endgame`, `reliquary`, and `extras` fields. Values contain the exact prior localStorage strings (or `null` when absent). The game will not proceed with the reset if it cannot create or validate this snapshot. An existing valid snapshot is retained rather than overwritten. A pending marker and rollback attempt protect against interruption during reset writes.

## Roll back old gameplay data

Close the game, open the browser's developer tools for the Velscour site, and use the Application/Storage panel to copy the value of `velscour_campaign_overhaul_backup_v1` to a file before changing storage. To restore the old gameplay records, parse that JSON and restore each non-null field to its original key:

- `saves` → `velscour_saves_v1`
- `endgame` → `velscour_endgame_v1`
- `reliquary` → `velscour_reliquary_v1`

Remove `velscour_campaign_overhaul_reset_v1` only if intentionally reverting to the pre-overhaul build. Restoring the old records into the new build is not supported; the old progression rules are incompatible. Keep the snapshot and the Git backup branch `backup/pre-campaign-overhaul-2026-11-19` until the new save has been confirmed.

Never paste saved data into a public issue or chat. It can contain character and inventory information.
