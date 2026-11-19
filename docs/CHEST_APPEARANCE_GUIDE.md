# Dungeon chest appearance guide

This file documents the 20 paired dungeon chest designs in `assets/props/chest-variants/` and the environment-only selector in `src/data/chestappearances.js`. Asset numbers are one-based; runtime indices are zero-based. “Open” and “closed” states use the same number and are selected as a pair.

The separate town fixtures in `assets/props/town-storage-chests/` (Storage Chest, Reliquary, Jewel Box) are excluded. `drawChest` keeps those assets on the town-only branch before it resolves any dungeon appearance.

## Art catalog

| ID / paired assets | Visual description and materials | Tags | Primary environments | Secondary environments | Cursed only? |
|---|---|---|---|---|---|
| 01 `chest-01-{closed,open}.png` | Blackened iron and dark red panels, horned skull, glowing corruption marks | cursed, skull, corrupted, red runes | Cursed chests | — | Yes |
| 02 `chest-02-{closed,open}.png` | Blue panels, warm gold bands, bright sun medallion | royal, sun, blue, gold | Gilded Tomb, Bone Desert Tombs | Sea of Sand | No |
| 03 `chest-03-{closed,open}.png` | Weathered stone and wood reclaimed by moss, leaves, mushrooms | overgrown, forest, mushrooms | Fungal Grotto, Thornwood Barrow, Dark Forest | Plague Sewers | No |
| 04 `chest-04-{closed,open}.png` | Riveted dark steel with blue crystals and sapphire lock | crystal, arcane, blue | Crystal Caverns, Void Sanctum | Abyssal Chasm | No |
| 05 `chest-05-{closed,open}.png` | Blue-black wood, gold frame, winged crest and jewel | royal, winged, ornate | Castle Keep, Desecrated Cathedral | Gilded Tomb | No |
| 06 `chest-06-{closed,open}.png` | Spiked black iron, molten red seams, fiery gem and occult marks | demonic, fire, spikes, runes | Molten Depths, Infernal Forge, Hell | Halls of Blood | No |
| 07 `chest-07-{closed,open}.png` | Dark timber wrapped in ribs and bone, skull on lid | bone, skull, undead | Catacombs, Necropolis | Frozen Ossuary, Bone Desert Tombs | No |
| 08 `chest-08-{closed,open}.png` | Riveted iron chest with a large lock plate | iron, utilitarian, fortress | Castle Keep, Deep Rail Mines | Catacombs, Iron Express | No |
| 09 `chest-09-{closed,open}.png` | Brown travel chest with red and blue potion bottles | practical, alchemical, travel | Haunted Library, Iron Express | Dark Forest, Great Hunt | No |
| 10 `chest-10-{closed,open}.png` | Deep-purple panels, luminous arcane tracery and violet gem | arcane, purple, runes | Void Sanctum, Shadow Labyrinth, Haunted Library | Halls of Blood | No |
| 11 `chest-11-{closed,open}.png` | Weathered timber and blue steel under frost and icicles | frost, ice, blue | Frozen Ossuary, Palace of the Everfrost, Snowy Summit | Depth's Edge | No |
| 12 `chest-12-{closed,open}.png` | Charred volcanic rock split by orange lava seams | volcanic, lava, fire | Molten Depths, Ashen Wastes, Infernal Forge | Obsidian Coil Tower | No |
| 13 `chest-13-{closed,open}.png` | Pale steel with cyan sigils, turquoise inlays and glowing rune | arcane, cyan runes, crystal | Crystal Caverns, Storm Spire | Astral Plane, Sunken Crypt | No |
| 14 `chest-14-{closed,open}.png` | Gold-framed chest draped in purple ceremonial cloth | ceremonial, royal, purple | Gilded Tomb, Cathedral, Heavenly Citadel | Castle Keep | No |
| 15 `chest-15-{closed,open}.png` | Rich brown-and-gold coffer overflowing with coins, gems and jewelry | wealth, treasure, ornate | Gilded Tomb, Desert | Castle, Sea of Sand | No |
| 16 `chest-16-{closed,open}.png` | Green wooden chest with foliage, branching antlers and green gem | forest, nature, antlers | Dark Forest, Great Hunt, Thornwood Barrow | Fungal Grotto | No |
| 17 `chest-17-{closed,open}.png` | Dark blue-black metal gripped by purple tentacles around an eye | abyssal, tentacles, eye, purple | Abyssal Chasm, Sunken Crypt | Flesh Pits, Plague Sewers | No |
| 18 `chest-18-{closed,open}.png` | Carved golden stone, red bindings and Egyptian-style solar emblem | desert, dynastic, sun | Bone Desert Tombs, Gilded Tomb, Sunless Dynasty | Catacombs | No |
| 19 `chest-19-{closed,open}.png` | Pale carved stone, guardian figure, feathered wings and metalwork | sacred, angelic, ivory | Desecrated Cathedral, Heavenly Citadel | Catacombs, Gilded Tomb | No |
| 20 `chest-20-{closed,open}.png` | Black-violet metal and fractured purple stone around a luminous gem | void, arcane, purple | Void Sanctum, Astral Plane, Obsidian Vault | Shadow Labyrinth | No |

Descriptions are based on the supplied sprite artwork, not just the asset names. “Primary” and “secondary” summarize profiles and variant overrides below; an environment profile may include several designs for variety.

## Selection weights

Each environment profile chooses among only its listed designs. A larger weight makes a design more common relative to the other entries. These are visual weights only. Design 01 is deliberately excluded from all ordinary profiles.

| Profile | Relative weights (design ID:weight) |
|---|---|
| Neutral fallback | 08:4, 09:3, 02:2, 15:2, 05:1, 07:1 |
| Crypt | 07:4, 08:3, 19:2, 18:2, 10:1, 14:1, 20:1 |
| Frost | 11:4, 04:2, 08:2, 07:1, 20:1, 19:1 |
| Infernal | 12:4, 06:3, 07:2, 08:1, 18:1, 17:1 |
| Forest | 16:4, 03:3, 09:2, 07:1, 17:1, 15:1 |
| Drowned | 17:4, 13:3, 04:2, 10:2, 08:1, 03:1 |
| Blood | 07:3, 18:2, 10:2, 17:2, 06:1, 08:1 |
| Arcane | 10:4, 13:3, 04:2, 20:2, 02:1, 14:1 |
| Gilded | 18:4, 15:3, 05:2, 14:2, 19:1, 02:1 |
| Plague | 03:3, 07:2, 09:2, 17:2, 08:1, 16:1 |
| Desert | 18:4, 02:3, 05:2, 15:2, 19:1, 07:1 |
| Shadow | 20:4, 10:3, 17:2, 13:2, 08:1, 04:1 |
| Fortress | 08:4, 05:3, 07:2, 18:2, 09:1, 14:1 |
| Ship | 09:3, 08:3, 15:2, 17:2, 02:1, 13:1 |
| Tower | 08:3, 10:2, 13:2, 05:2, 19:1, 14:1 |
| Cave | 04:3, 13:3, 03:2, 11:2, 08:1, 17:1 |
| Holy | 19:4, 05:3, 14:2, 02:2, 18:1, 13:1 |
| Industrial | 08:4, 09:3, 05:2, 12:1, 15:1 |
| Cosmic | 20:4, 13:3, 10:3, 04:2, 14:1, 19:1 |

## Environment profiles

| Level or environment | Base profile |
|---|---|
| Catacombs; Necropolis | Crypt |
| Castle Keep; Shattered Citadel; Castle | Fortress |
| Frozen Ossuary; Palace of the Everfrost; Mountainside; Snowy Summit | Frost |
| Molten Depths; Ashen Wastes; Infernal Forge; Hell; Velscour's Throne | Infernal |
| Fungal Grotto; Thornwood Barrow; Dark Forest; Forsaken Wilds; Great Hunt | Forest |
| Sunken Crypt; Abyssal Chasm | Drowned |
| Halls of Blood; Flesh Pits | Blood |
| Void Sanctum; Shadow Labyrinth; Obsidian Vault | Shadow |
| Gilded Tomb; Amber Wastes | Gilded |
| Plague Sewers; Fetid Sewers | Plague |
| Crystal Caverns; Storm Spire | Arcane |
| Bone Desert Tombs; Serpent Sepulcher; Sea of Sand; Scorpion King Pyramid | Desert |
| Desecrated Cathedral; Heavenly Citadel | Holy |
| Haunted Library | Arcane |
| Astral Plane | Cosmic |
| The Sky Lanes; Pirate Seas | Ship |
| Serpentine Tower | Tower |
| Depth's Edge Caverns | Cave |
| The Iron Express; Deep Rail Mines | Industrial |
| The Endless Siege | Fortress |

More specific generated subregions override the base profile where the generator exposes a stable variant ID:

| Level | Variant IDs and profile |
|---|---|
| Sea of Sand / Scorpion King Pyramid | golden -> Gilded; red -> Desert; gypsum -> Holy; obsidian -> Infernal; moonlit -> Shadow; saltflats -> Desert; copper -> Gilded; bone -> Crypt; emerald -> Forest; storm -> Arcane |
| Great Hunt | wood -> Forest; tundra -> Frost; fen -> Plague; badlands -> Desert; crags -> Cave |
| Endless Siege | keep -> Fortress; frost -> Frost; river -> Drowned; pass -> Cave; mire -> Plague |
| Depth's Edge | chalk -> Cave; moonwell -> Arcane; rustvein -> Industrial; verdigris -> Drowned; amethyst -> Arcane; rimebone -> Frost |
| Serpentine Tower | serpentine -> Forest; obsidian -> Shadow; bloodstone -> Blood; rimeglass -> Frost; sunken_bell -> Gilded |
| Castle | ironcrown -> Fortress; blackfen -> Plague; solenne -> Holy; sunscar -> Desert; hoarfrost -> Frost; cinderhold -> Infernal; mourncross -> Crypt; goldspire -> Gilded; bloodmoat -> Blood; hexenmere -> Shadow; thornwick -> Forest |

Selection is stable for a chest at a given level seed and coordinates, and varies across seeds/locations. It reads biome/variant identity, seed and position only. It does not read chest type, rarity, tier, reward, or contents. Cursed chests explicitly use design 01 in both states and retain their existing glow, wave, and reward behavior. No additional artwork is generated.
