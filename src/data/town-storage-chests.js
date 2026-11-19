// Extracted, transparent closed/open pairs from the user's Fantasy RPG Chest Collection reference.
// The shared renderer keeps each closed/open pair on the same ground anchor. Dungeon chest variants are untouched.
export const TOWN_STORAGE_CHEST_ART = Object.freeze({
  storage: Object.freeze({ townStorageChest: 'storage', glow: '#d8aa4b' }), // blue panels, gold reinforcement, star emblem
  reliquary: Object.freeze({ townStorageChest: 'reliquary', glow: '#ffd070' }), // ivory stone, gold trim, guardian figures
  jewelBox: Object.freeze({ townStorageChest: 'jewel-box', glow: '#b850ff' }), // purple finish, gold filigree, gemstones
});

export function townStorageChestArtFor(npc) {
  return npc?.reliquary ? TOWN_STORAGE_CHEST_ART.reliquary
    : npc?.jewelBox ? TOWN_STORAGE_CHEST_ART.jewelBox : TOWN_STORAGE_CHEST_ART.storage;
}
