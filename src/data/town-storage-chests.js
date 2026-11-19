// Existing paired artwork from assets/props/chest-variants (zero-based indices).
// The shared renderer keeps each closed/open pair on the same ground anchor.
export const TOWN_STORAGE_CHEST_ART = Object.freeze({
  storage: Object.freeze({ chestVariant: 1, chestType: 'standard', glow: '#d8aa4b' }), // chest-02: blue and gold
  reliquary: Object.freeze({ chestVariant: 18, chestType: 'jeweled', glow: '#ffd070' }), // chest-19: carved stone guardian
  jewelBox: Object.freeze({ chestVariant: 9, chestType: 'jeweled', glow: '#b850ff' }), // chest-10: amethyst and gold
});

export function townStorageChestArtFor(npc) {
  return npc?.reliquary ? TOWN_STORAGE_CHEST_ART.reliquary
    : npc?.jewelBox ? TOWN_STORAGE_CHEST_ART.jewelBox : TOWN_STORAGE_CHEST_ART.storage;
}
