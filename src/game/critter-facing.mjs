// Facing is derived from committed movement, not the critter's steering intent. The
// threshold filters sub-pixel drift so idle critters keep their last useful direction.
export const CRITTER_FACING_SPEED_THRESHOLD = 0.15;

export function updateCritterFacing(critter, fromX, fromY, toX, toY, dt) {
  if (!(dt > 0)) return false;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.hypot(dx, dy) / dt < CRITTER_FACING_SPEED_THRESHOLD) return false;

  critter.facingAngle = Math.atan2(dy, dx);
  if (Math.abs(dx) / dt >= CRITTER_FACING_SPEED_THRESHOLD) critter.facingRight = dx > 0;
  return true;
}

export function shouldFlipCritterSprite(facingRight, artworkFacesRight) {
  return facingRight !== artworkFacesRight;
}
