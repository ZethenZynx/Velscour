/** True for normal enemies and event creatures explicitly marked hostile to the player. */
export function isPlayerHostile(creature) {
  return !!creature && creature.team !== 'player' && (creature.team === 'enemy' || creature.eventFoe === true);
}

/** A living, visible target the player can select. Scripted untargetable states remain respected. */
export function isPlayerTargetable(creature) {
  return isPlayerHostile(creature) && !creature.dead && !creature.clutter && creature.targetable !== false;
}
