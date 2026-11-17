// Snapshot of every PR merged into this fork's main branch as of 2026-11-17.
// The live title-screen feed refreshes from GitHub on each visit; this complete list is its offline fallback.
export const RECENT_CHANGES = [
  {
    "date": "2026-11-17",
    "title": "Align altar collision with marked base point",
    "summary": "Move the altar collision from the front of the floor seal to the lower-center stone base."
  },
  {
    "date": "2026-11-17",
    "title": "Fix altar size and center collision at the base",
    "summary": "Shrink the altar further and move collision onto its base."
  },
  {
    "date": "2026-11-17",
    "title": "Scale down and add collision to the Heresy altar",
    "summary": "Shrink the altar and add a solid collision tile beneath its stone base."
  },
  {
    "date": "2026-11-17",
    "title": "Use the reference art for the Altar of Heresy",
    "summary": "Add a transparent, isometric pixel-art altar sprite directly adapted from the provided Gothic Demon Altar reference."
  },
  {
    "date": "2026-11-17",
    "title": "Make the Altar of Heresy more prominent",
    "summary": "Enlarge the ritual altar so its arch, horned crest, candles, and floor seal stand out in town."
  },
  {
    "date": "2026-11-17",
    "title": "Redesign the Altar of Heresy",
    "summary": "Replace the small obelisk marker with a horn-crowned ritual arch and layered stone base."
  },
  {
    "date": "2026-11-17",
    "title": "Place Dark Forest events in side clearings",
    "summary": "Place the Dark Forest's random event in one of the six recently added north/south side clearings."
  },
  {
    "date": "2026-11-17",
    "title": "Trigger random events when entering their area",
    "summary": "Remove the clickable pylon-style event marker from dungeon and special-map event setup."
  },
  {
    "date": "2026-11-17",
    "title": "Add optional Dark Forest side clearings",
    "summary": "Keep the six main-path landmarks and add six walkable side clearings, three north and three south."
  },
  {
    "date": "2026-11-17",
    "title": "Refresh title screen updates from GitHub on entry",
    "summary": "Refresh Recent Changes from GitHub whenever the title screen opens."
  },
  {
    "date": "2026-11-17",
    "title": "Add random events across dungeons and other maps",
    "summary": "Add the complete 50-event catalog with rarity weighting and interactive event logic."
  },
  {
    "date": "2026-11-17",
    "title": "Cap gambler gear tiers by depth",
    "summary": "Cap Gambler gear at the tier currently unlocked by the character’s campaign depth."
  },
  {
    "date": "2026-11-17",
    "title": "Show merged feature PRs in title feed",
    "summary": "Show merged feature PRs in the title feed and exclude open or unmerged work."
  },
  {
    "date": "2026-11-17",
    "title": "Add 50 shrine and world objects",
    "summary": "Add 50 interactive shrine and world-object types using existing biome assets and effects."
  },
  {
    "date": "2026-11-16",
    "title": "Show all major updates in recent changes",
    "summary": "Expand the title feed with feature updates from every page of merged PR history and a complete offline snapshot."
  },
  {
    "date": "2026-11-16",
    "title": "Refresh title screen recent changes from GitHub",
    "summary": "Refresh the title-screen Recent Changes list from major feature commits on the fork's main branch."
  },
  {
    "date": "2026-11-16",
    "title": "Revise campaign acts, level ranges, and finales",
    "summary": "Reshape campaign acts and depth ranges, add Sea of Sand and Tower routes, and place finale bosses at depths 96 through 500."
  },
  {
    "date": "2026-11-16",
    "title": "Clarify The Dig and place Dark Forest landmarks on route",
    "summary": "Add persistent gold circles to The Dig caches, matching the area where the player must stand; completed caches are marked in muted green."
  },
  {
    "date": "2026-11-16",
    "title": "Keep chat messages visible twice as long",
    "summary": "Double the time game chat/log messages remain visible before fading."
  },
  {
    "date": "2026-11-16",
    "title": "Add level-name teleport shortcut to Contact Velscour",
    "summary": "Let players enter any listed campaign or named special-area display name in Contact Velscour to teleport directly there, ignoring case and punctuation."
  },
  {
    "date": "2026-11-16",
    "title": "Add gameplay updates and distinct Paladin skill sounds",
    "summary": "Add four Dark Forest mazes and six landmarks, raise the middle skill row to level 15 with a one-time respec, and add distinct Paladin skill sounds."
  },
  {
    "date": "2026-11-16",
    "title": "Add optional Dark Forest labyrinths and breakable loot",
    "summary": "Restore two full-size optional labyrinth detours north and south of the Dark Forest’s main route, each with an accessible entrance and a reward chest; update the level descriptions to explai"
  },
  {
    "date": "2026-11-16",
    "title": "Add resource orbs and specialized chest rewards",
    "summary": "Add Rejuvenation and Fury Orbs with the matching potion effects and colors, and tune them to be rarer than Health and Mana Orbs."
  },
  {
    "date": "2026-11-16",
    "title": "Add Shift gear tooltip comparison",
    "summary": "Holding Shift over identified gear in the backpack, vendor stock, Storage Chest, or Reliquary opens a second tooltip for the currently equipped matching item."
  },
  {
    "date": "2026-11-16",
    "title": "Publish local Velscour gameplay updates",
    "summary": "Replace the gilded critter atlas with four cropped row sprites and use the ground/flying row layout."
  },
  {
    "date": "2026-11-16",
    "title": "Prevent neighboring art leaking into gilded fairy",
    "summary": "Add a guarded crop for the Treasure Fairy atlas cell, which sits against neighboring sprites."
  },
  {
    "date": "2026-11-16",
    "title": "Raise first gilded critter tutorial and connect it",
    "summary": "Move the first gilded critter tutorial higher above the critter."
  },
  {
    "date": "2026-11-16",
    "title": "Reduce gilded critter size and remove arrows",
    "summary": "Reduce the detailed atlas critters from 76 to 48 screen pixels, and bring the legacy rendering fallbacks down to a similar size."
  },
  {
    "date": "2026-11-16",
    "title": "Use detailed tier-tinted art for gilded critters",
    "summary": "Add a transparent 5×4 sprite atlas using the supplied grayscale critter artwork."
  },
  {
    "date": "2026-11-16",
    "title": "Show one general gilded critter tutorial per character",
    "summary": "Return the pause-and-collect tutorial to the character's first gilded critter encounter only."
  },
  {
    "date": "2026-11-16",
    "title": "Adjust first skill recommendation wording",
    "summary": "Change “we strongly recommend” to “it is strongly recommended that you pick” in the first-skill popup."
  },
  {
    "date": "2026-11-16",
    "title": "Clarify the first skill recommendation",
    "summary": "Explain the steps in order: open the Skill Tree, choose and learn a starting skill, then use it on LMB."
  },
  {
    "date": "2026-11-16",
    "title": "Improve gilded critter tutorials and markers",
    "summary": "Track which gilded critter species each character has encountered and show the pause-and-collect tutorial once for each species."
  },
  {
    "date": "2026-11-16",
    "title": "Remove the circled plus badge from gilded critters",
    "summary": "Remove the circled plus reward badge from resource-reward critters."
  },
  {
    "date": "2026-11-16",
    "title": "Allow every gilded critter tier at any depth",
    "summary": "Allow all 20 gilded critter color tiers to roll at every dungeon depth."
  },
  {
    "date": "2026-11-16",
    "title": "Expand gilded critters with 20 species and rewards",
    "summary": "Expand the gilded critter roster to 20 species with distinct movement patterns, using existing game sprites and baked critter art."
  },
  {
    "date": "2026-11-16",
    "title": "Expand dungeon affixes to 257 entries",
    "summary": "Add 99 unique affixes, expanding the catalog from 158 to 257, with matching hazards and combat effects."
  },
  {
    "date": "2026-11-16",
    "title": "Keep Mana Potions mana-only",
    "summary": "Mana Potions restore 50% Mana over 2 seconds for every class."
  },
  {
    "date": "2026-11-16",
    "title": "Improve potion resource recovery and Elixir of Fury haste",
    "summary": "Healing Potion restores 45% Life over 2 seconds; Rejuvenation restores 35% Life and Mana instantly."
  },
  {
    "date": "2026-11-16",
    "title": "Keep campaign depth after death",
    "summary": "Stop campaign deaths from resetting the hero to the start of the current five-depth block."
  },
  {
    "date": "2026-11-16",
    "title": "Widen town storage windows to remove horizontal scrollbars",
    "summary": "Widen the desktop Storage Chest and Jewel Box windows slightly so their 10-column item grids fit without overflowing."
  },
  {
    "date": "2026-11-16",
    "title": "Make Treasure Imps tougher and escape corners",
    "summary": "Increase Treasure Imp health from 9× to 15× its base health so it takes longer to kill."
  },
  {
    "date": "2026-11-16",
    "title": "Finish level entry while monster art loads",
    "summary": "Load monster art in the background so it no longer delays dungeon entry."
  },
  {
    "date": "2026-11-16",
    "title": "Pause gameplay during level loading",
    "summary": "Pause game updates, rendering, and held input while the loading overlay is active, including the hidden-page worker ticker."
  },
  {
    "date": "2026-11-16",
    "title": "Make Mountainside and Snowy Summit separate depths",
    "summary": "Keep Mountainside as a standalone Act 3 depth and open its normal exit after defeating the Summit Warden."
  },
  {
    "date": "2026-11-16",
    "title": "Make the Forsaken Wilds a boss-gated dungeon",
    "summary": "Remove the Forsaken Wilds' scenario shrine and objective workflow."
  },
  {
    "date": "2026-11-16",
    "title": "Fix macro function-key capture",
    "summary": "Capture remapped keys at the window's capture phase so key presses are handled before the game's normal input listener."
  },
  {
    "date": "2026-11-16",
    "title": "Move macro keybinds into Controls settings",
    "summary": "Move macro key assignment from the limited dropdown into Settings → Controls."
  },
  {
    "date": "2026-11-16",
    "title": "Add customizable keyboard bindings",
    "summary": "Add a Controls tab in Settings for remapping movement, skill bar slots 1–=, interface actions, and potion actions."
  },
  {
    "date": "2026-11-16",
    "title": "Expand visuals for more affix mechanics",
    "summary": "Add clearer elemental telegraphs, death effects, arrival rings, teleport effects, and enemy shield pulses."
  },
  {
    "date": "2026-11-15",
    "title": "Improve visual effects for dungeon affixes",
    "summary": "Render fire area affixes as molten pools with glowing lava, cracks, and cooled edges."
  },
  {
    "date": "2026-11-15",
    "title": "Show active affixes beside current depth",
    "summary": "Add a dedicated affix line below the current depth and biome in the top-left HUD."
  },
  {
    "date": "2026-11-15",
    "title": "Show vendor value on inventory item tooltips",
    "summary": "Treat the inventory tooltip's zero price placeholder as no purchase price, allowing the vendor value line to appear for Backpack and Gem Bag items."
  },
  {
    "date": "2026-11-15",
    "title": "Add deposit all and withdraw all to town storage",
    "summary": "Add Deposit All and Withdraw All actions to the Storage Chest, Jewel Box, and each unlocked Reliquary vault tab."
  },
  {
    "date": "2026-11-15",
    "title": "Show vendor sell value in item tooltips",
    "summary": "Show the actual vendor payout in item tooltips for sellable gear, gems, music sheets, and banner kits."
  },
  {
    "date": "2026-11-15",
    "title": "Make dungeon affixes readable on destination cards",
    "summary": "Show each affix's complete description on the post-dungeon destination cards instead of shortening it."
  },
  {
    "date": "2026-11-15",
    "title": "Make gear tier labels larger and unboxed",
    "summary": "Increase the gear tier marker from 8px to 11px."
  },
  {
    "date": "2026-11-15",
    "title": "Label gear quality as tiers 1 through 20",
    "summary": "Rename the 20 gear quality labels to Tier 1 through Tier 20 while keeping their existing quality colors, unlock depths, and balance values."
  },
  {
    "date": "2026-11-15",
    "title": "Show full affix descriptions in depth picker",
    "summary": "Show the complete affix description in the campaign depth picker instead of truncating it after a few words with an ellipsis."
  },
  {
    "date": "2026-11-15",
    "title": "Show Eternal Breach destination in depth picker",
    "summary": "Show the Eternal Breach floor as the actual destination when a campaign depth is routed through a Breach interlude."
  },
  {
    "date": "2026-11-15",
    "title": "Make dangerous affixes easier to read",
    "summary": "Add clear ground outlines for damaging affix fields, including on-death pools and boss aftershocks."
  },
  {
    "date": "2026-11-15",
    "title": "Allow dragging items between equipped slots",
    "summary": "Allow an equipped item to be dragged to another compatible equipment slot."
  },
  {
    "date": "2026-11-15",
    "title": "Keep gear quality colors off gem icons",
    "summary": "Remove gear quality border/background classes from regular and special gem icons."
  },
  {
    "date": "2026-11-15",
    "title": "Make the Altar of Heresy available from the start",
    "summary": "Allow every character to enable or disable Heresies at the Altar from the beginning."
  },
  {
    "date": "2026-11-15",
    "title": "Widen storage panels to remove horizontal scrollbars",
    "summary": "Widen the desktop Storage Chest, Reliquary, and Jewel Box panels to 500px."
  },
  {
    "date": "2026-11-15",
    "title": "Restore the original Castle route with a guardian boss",
    "summary": "Restore the original full-size Castle generator, including its real masonry walls, moat, drawbridge, gatehouses, towers, keep, and halls."
  },
  {
    "date": "2026-11-15",
    "title": "Build a walled route through the Castle",
    "summary": "Add two continuous, collision-backed battlement walls along the route."
  },
  {
    "date": "2026-11-15",
    "title": "Restore the Castle as a full-size guardian dungeon",
    "summary": "Restore the Castle map to 336 × 304 and build a broad, open route from the southwest entry to a northeast guardian."
  },
  {
    "date": "2026-11-15",
    "title": "Add 20 depth-gated gear quality tiers",
    "summary": "Replace the seven gear qualities with the requested 20 color-named qualities, unlocking at depths 1 through 456."
  },
  {
    "date": "2026-11-15",
    "title": "Restore the Dark Forest's original size and enemy population",
    "summary": "Restore the Dark Forest to its original 192×192 map size and original-scale tree density."
  },
  {
    "date": "2026-11-15",
    "title": "Fix launch-blocking Dark Forest quest syntax",
    "summary": "Correct the malformed Forest Guardian objective text in the Quest Log."
  },
  {
    "date": "2026-11-15",
    "title": "Replace Dark Forest trials and labyrinths with a boss route",
    "summary": "Removed Forest glades, trials, Heartwood objectives, and labyrinth generation."
  },
  {
    "date": "2026-11-15",
    "title": "Reduce enemy and chest density in the compact Dark Forest",
    "summary": "Limit the compact Dark Forest to at most eight regular enemy packs (32 enemies maximum), keeping one nearby guard pack for each labyrinth where available."
  },
  {
    "date": "2026-11-15",
    "title": "Compact the Dark Forest and Castle maps",
    "summary": "Shrink the Dark Forest to 48×48 tiles and the Castle to 84×76 tiles."
  },
  {
    "date": "2026-11-15",
    "title": "Make repeat dungeon ambushes rare and AFK-gated",
    "summary": "Gate repeat ambushes behind player inactivity, space attempts out, and wait for nearby enemies to clear."
  },
  {
    "date": "2026-11-15",
    "title": "Delay gilded critter tutorial until it fully appears",
    "summary": "Wait one full second after a gilded critter spawns before showing the first-time tutorial and pausing the game, so its entrance effects finish."
  },
  {
    "date": "2026-11-15",
    "title": "Polish gilded critter and first-skill tutorials",
    "summary": "Wait until the first gilded critter has been rendered before pausing, then hold it in place for the tutorial."
  },
  {
    "date": "2026-11-15",
    "title": "Add a first-time gilded critter tutorial",
    "summary": "Pause the game when a character first encounters a gilded critter and show a reward-specific popup above it."
  },
  {
    "date": "2026-11-15",
    "title": "Apply depth rarity limits to peddler gifts",
    "summary": "Route the Wandering Peddler's random gear through the existing depth-capped item roller."
  },
  {
    "date": "2026-11-15",
    "title": "Prevent movement abilities from double-casting",
    "summary": "Stop held keys and mouse buttons from repeating Blink, Dash, or Leap after cooldown."
  },
  {
    "date": "2026-11-15",
    "title": "Show experience progress on the action bar",
    "summary": "Draw the desktop XP track above the HUD artwork so its earned fill is visible."
  },
  {
    "date": "2026-11-15",
    "title": "Fix unlearned skill assignment after respec",
    "summary": "Stop respec from placing a class skill in LMB unless the character has learned it."
  },
  {
    "date": "2026-11-15",
    "title": "Add automatic cutscene and camera skip option",
    "summary": "Add an opt-in setting to automatically fast-forward cutscenes and scripted camera pans/zooms, including first-time scenes."
  },
  {
    "date": "2026-11-15",
    "title": "Charge all skills and scale their resource costs",
    "summary": "Charge mana for every non-Rage skill, including abilities marked free for skill-specific effects."
  },
  {
    "date": "2026-11-15",
    "title": "Unlock dropped item qualities by depth",
    "summary": "Gate ground gear qualities by campaign depth: Common at Depth 1, Uncommon 24, Rare 48, Epic 72, Legendary 96, Mythic 120, Abyssal 144."
  },
  {
    "date": "2026-11-15",
    "title": "Cap dropped item levels to character level",
    "summary": "Cap dropped gear, gems, and gear rewards to the character’s current level when generated."
  },
  {
    "date": "2026-11-14",
    "title": "Add automatic gear equip for empty slots",
    "summary": "Add a default-on Auto-equip gear in empty slots option under General settings."
  },
  {
    "date": "2026-11-14",
    "title": "Route campaign milestones through the Eternal Breach",
    "summary": "Remove the standalone Eternal Breach portal from Herrington Hollow and Sunscorch Oasis."
  },
  {
    "date": "2026-11-14",
    "title": "Keep Depth 1 and its starter chest on every entry",
    "summary": "Always send campaign Depth 1 to the standard Catacombs, even after a prior visit or death."
  },
  {
    "date": "2026-11-14",
    "title": "Start new characters in a standard dungeon",
    "summary": "Force a character's first campaign descent from the orange portal to the standard Catacombs dungeon."
  },
  {
    "date": "2026-11-14",
    "title": "Let players choose their first skill",
    "summary": "New characters keep one starting skill point and begin without learned skills or an ability assigned to LMB."
  },
  {
    "date": "2026-11-14",
    "title": "Show destination affixes in town portal",
    "summary": "Show the selected campaign depth’s affixes in the town portal, with a short description for each."
  },
  {
    "date": "2026-11-14",
    "title": "Replace Omens with world-effect affixes",
    "summary": "Remove the separate Omen preview and Omen gameplay roll."
  },
  {
    "date": "2026-11-14",
    "title": "Roll random affixes for every floor",
    "summary": "Roll a fresh set of random affixes for every destination floor, based on the existing depth milestones and five-affix cap."
  },
  {
    "date": "2026-11-14",
    "title": "Implement all 150 dungeon affixes",
    "summary": "Give the full 150-affix catalog gameplay effects across enemies, hazards, attacks, and bosses."
  },
  {
    "date": "2026-11-14",
    "title": "Implement depth-five enemy affixes",
    "summary": "Roll more dungeon affixes as the campaign advances, with a five-affix cap."
  },
  {
    "date": "2026-11-14",
    "title": "Add depth-based affix previews to level choices",
    "summary": "Replace the survival-time trigger with depth progression: after each five cleared depths, the upcoming destination gains one random affix (first at Depth 6)."
  },
  {
    "date": "2026-11-14",
    "title": "Add survival-based campaign dungeon affixes",
    "summary": "Add one random enemy affix for every five minutes survived in campaign dungeons, with a cap of five unique affixes."
  },
  {
    "date": "2026-11-14",
    "title": "Include Depth 500 in boss progression list",
    "summary": "Show all boss room progression depths from Depth 5 through the Depth 500 finale."
  },
  {
    "date": "2026-11-14",
    "title": "Show all boss room progression depths",
    "summary": "Show every regular boss room depth, from Depth 5 through Depth 495, from the start of a character's progression."
  },
  {
    "date": "2026-11-14",
    "title": "Remove remaining mobile gameplay paths",
    "summary": "Remove the virtual joystick, touch skill buttons, touch taps, and pinch gestures."
  },
  {
    "date": "2026-11-14",
    "title": "Remove first-person view and mobile skill-bar setting",
    "summary": "Remove first-person rendering and its related camera mode."
  },
  {
    "date": "2026-11-14",
    "title": "Add an independent ground loot label filter",
    "summary": "Add a ground-label filter with item rarity thresholds and gem grade selection, separate from auto-pickup."
  },
  {
    "date": "2026-11-13",
    "title": "Fix game launch syntax error",
    "summary": "Restore the missing method separator after portalChoice in src/game/game.js."
  },
  {
    "date": "2026-11-13",
    "title": "Remove Auto-play gameplay mode",
    "summary": "Remove the Auto-play button, P shortcut, stance controls/status, and automatic combat/progression loop from gameplay."
  },
  {
    "date": "2026-11-13",
    "title": "Make Velscour PC-only",
    "summary": "Rename the browser game to Velscour PC."
  },
  {
    "date": "2026-11-13",
    "title": "Fix Blink leaving Sky Ship boundaries",
    "summary": "Clamp Blink destinations on the Sky Ship to walkable deck tiles that can contain the player's full collision body."
  },
  {
    "date": "2026-11-13",
    "title": "Compact the action bar and experience bar",
    "summary": "Close the gap left by the removed backtick slot by shifting the remaining action slots, potions, RMB slot, and mana orb left by one slot spacing without shrinking them."
  },
  {
    "date": "2026-11-13",
    "title": "Remove backtick from the action bar",
    "summary": "Remove the backtick/tilde slot from the action bar and stop registering the Backquote key for skill use."
  },
  {
    "date": "2026-11-13",
    "title": "Remove standalone Velscour Defense game mode",
    "summary": "Remove the separate Velscour Defense app and all 84 of its tracked files."
  },
  {
    "date": "2026-11-13",
    "title": "Fix cooldown shadow clipping",
    "summary": "Keep desktop cooldown shading inside each skill icon."
  }
];
