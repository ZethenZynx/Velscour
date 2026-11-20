// Wiki-only adapters. Keep pages aligned with this fork's active class registry
// without adding presentation-only exports to gameplay modules.
import { CLASSES, ATTRS, DMG_TUNE, DMG_TUNE_AT } from '../data/classes.js';
import { CLASS_IDS } from '../core/assets.js';

export { CLASSES, ATTRS, DMG_TUNE, DMG_TUNE_AT };
export const ACTIVE_CLASS_IDS = CLASS_IDS.filter((id) => Object.hasOwn(CLASSES, id));
