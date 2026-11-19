// Contact Velscour accepts every campaign and named special-area display name as a testing shortcut.
import { BIOME_BY_ID, BREACH_BIOME } from '../../src/data/biomes.js';
import { normalizeLevelCheatName, resolveLevelCheatName } from '../../src/game/velscourcheats.js';

const campaignAreas = [
  'Skull-Lined Catacombs', 'The Dark Forest', 'Castle', 'Castle Keep', 'The Forsaken Wilds',
  'Moonlit Necropolis', 'Plague Sewers', 'The Fetid Sewers', 'Haunted Library', 'Sunken Crypt',
  'Sea of Sand', 'Temple of the Sunless Dynasty', 'Bone Desert Tombs', 'Gilded Tomb', 'Amber Wastes', 'The Serpentine Tower',
  'Mountainside', 'The Snowy Summit', 'Palace of the Everfrost', 'Frozen Ossuary', 'Crystal Caverns',
  'HEAVENLY — The Empyrean Citadel', 'ASTRAL PLANE — The Celestial Expanse', 'The Sky Lanes', 'Storm Spire', 'Shattered Citadel', 'Desecrated Cathedral',
  'Molten Depths', 'HELL — The Infernal Dominion', 'Infernal Forge', 'Abyssal Chasm', 'Obsidian Vault', 'Halls of Blood', 'Flesh Pits', 'Void Sanctum',
];
const specialAreas = [
  'The Iron Express', 'The Endless Siege', 'The Deep Rail Mines', 'The Great Hunt',
  "Depth's Edge Caverns", 'The Pirate Seas', 'The Pyramid of the Scorpion King',
];

for (const name of [...campaignAreas, ...specialAreas]) {
  const biome = resolveLevelCheatName(name, BIOME_BY_ID, BREACH_BIOME);
  if (!biome) throw new Error(`No level-name shortcut resolves for: ${name}`);
}
if (resolveLevelCheatName('The Eternal Breach', BIOME_BY_ID, BREACH_BIOME)?.id !== 'eternal_breach') throw new Error('Eternal Breach shortcut did not resolve.');
if (resolveLevelCheatName("Velscour's Throne - Depth 100", BIOME_BY_ID, BREACH_BIOME)?.id !== 'throne') throw new Error('Depth 100 throne shortcut did not resolve.');
if (resolveLevelCheatName('  tHe fOrSaKeN wIlDs  ', BIOME_BY_ID, BREACH_BIOME)?.id !== 'overworld') throw new Error('Case and whitespace should not affect name matching.');
if (resolveLevelCheatName('The Celestial Expanse', BIOME_BY_ID, BREACH_BIOME)?.id !== 'astral_plane') throw new Error('Celestial Expanse shortcut did not resolve.');
if (resolveLevelCheatName('Empyrean Citadel', BIOME_BY_ID, BREACH_BIOME)?.id !== 'heavenly') throw new Error('Empyrean Citadel shortcut did not resolve.');
if (resolveLevelCheatName('Infernal Dominion', BIOME_BY_ID, BREACH_BIOME)?.id !== 'hell') throw new Error('Infernal Dominion shortcut did not resolve.');
if (normalizeLevelCheatName('Skull-Lined Catacombs') !== 'skull lined catacombs') throw new Error('Punctuation normalization failed.');
if (resolveLevelCheatName('not a level', BIOME_BY_ID, BREACH_BIOME)) throw new Error('Unknown text should not resolve to a level.');

console.log(`PASS: ${campaignAreas.length} campaign areas, ${specialAreas.length + 2} special destinations, case-insensitive matching, and unknown text.`);
