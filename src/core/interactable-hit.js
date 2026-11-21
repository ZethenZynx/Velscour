// Screen-space hit areas for world interactables. Kept independent of input state so
// the geometry can be validated without launching the game or a browser.
export function chestSpriteHit(c, sx, sy, zoom, tileToScreen) {
  const [cx, cy] = tileToScreen(c.x, c.y);
  const baseY = cy + 12 * zoom;
  return sx >= cx - 29 * zoom && sx <= cx + 29 * zoom &&
    sy >= baseY - 56 * zoom && sy <= baseY + 5 * zoom;
}

export function portalSpriteHit(p, sx, sy, zoom, tileToScreen) {
  const [px, py] = tileToScreen(p.x, p.y);
  return sx >= px - 34 * zoom && sx <= px + 34 * zoom &&
    sy >= py - 105 * zoom && sy <= py + 14 * zoom;
}

export function findNearbyInteractableSpot(x, y, isValid, maxRadius = 5, step = 0.25) {
  for (let radius = step; radius <= maxRadius; radius += step) {
    let best = null, bestDistance = Infinity;
    for (let dy = -radius; dy <= radius + 1e-6; dy += step) for (let dx = -radius; dx <= radius + 1e-6; dx += step) {
      if (Math.abs(Math.hypot(dx, dy) - radius) > step * 0.72) continue;
      const distance = dx * dx + dy * dy;
      if (distance >= bestDistance || !isValid(x + dx, y + dy)) continue;
      best = [x + dx, y + dy]; bestDistance = distance;
    }
    if (best) return best;
  }
  return null;
}
