// Find an eligible empty equipment slot for newly received gear. This is called
// only when an item is picked up or bought, so it does not need a background check.
import { SLOTS, fitsSlot, canEquipItem } from '../data/items.js';

export function emptyEquipSlot(c, item) {
  if (!c || !c.equip || !item || item.type !== 'gear' || item.unid || item.sealed || item.locked) return null;
  return SLOTS.find((slot) => !c.equip[slot] && fitsSlot(item, slot, c.classId) && canEquipItem(c, item, slot)) || null;
}
