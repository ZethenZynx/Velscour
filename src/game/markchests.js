import { RNG } from '../core/util.js';

/** Add one reproducible extra chest roll to a procedural map, if the Mark roll succeeds. */
export function addMarkBonusChest(gen, seed, chancePct) {
  if (!(chancePct > 0) || !gen?.map || !Array.isArray(gen.chests) || gen.chests.length >= 40) return false;
  const rng = new RNG((seed ^ 0x4d41524b) >>> 0);
  if (!rng.chance(Math.min(1, chancePct / 100))) return false;
  for (let attempt = 0; attempt < 180; attempt++) {
    const x = rng.int(1, gen.map.w - 2), y = rng.int(1, gen.map.h - 2);
    if (!gen.map.walkable(x, y) || Math.hypot(x - gen.start[0], y - gen.start[1]) < 5) continue;
    if (gen.exit && Math.hypot(x - gen.exit[0], y - gen.exit[1]) < 3) continue;
    if (gen.chests.some((ch) => Math.hypot(ch.x - x, ch.y - y) < 4)) continue;
    gen.chests.push({ x, y, rare: false, markBonusChest: true });
    return true;
  }
  return false;
}
