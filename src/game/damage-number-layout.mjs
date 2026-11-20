/** Place damage text above an enemy's life bar without changing the bar or combat values. */
export function damageNumberAboveBarZ(baseZ, {
  spriteHeight, scale = 1, creatureZ = 0, barHeight = 4, barScale = 1,
  textHeight = 24, zoom = 1, labelHeight = 0, margin = 6,
}) {
  const safeZoom = Math.max(0.1, Number(zoom) || 1);
  const barTop = Math.max(0, Number(spriteHeight) || 40) * (Number(scale) || 1)
    + (Number(creatureZ) || 0) + 4 + 4 * (Number(barScale) || 1) + (Number(barHeight) || 4);
  // Damage numbers have a small -4px spawn jitter; include it so that jitter cannot put
  // the lower edge back over the bar. `textHeight` and `labelHeight` are screen pixels.
  const clearBarZ = barTop + (Math.max(0, textHeight) / 2 + margin + labelHeight) / safeZoom + 4;
  return Math.max(Number(baseZ) || 0, clearBarZ);
}
