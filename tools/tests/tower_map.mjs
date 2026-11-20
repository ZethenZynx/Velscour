// Generator contract for the Serpentine Tower's top-to-bottom route. No browser required.
import { readFileSync } from 'node:fs';
import { VZ, generateTower } from '../../src/world/tower.js';
import { BIOME_BY_ID } from '../../src/data/biomes.js';
import { HW, HH, screenDirToTile, setWarp } from '../../src/core/view.js';

const biome = BIOME_BY_ID.serpentine_tower;
const renderSource = readFileSync(new URL('../../src/gfx/tower3d.js', import.meta.url), 'utf8');
const towerSource = readFileSync(new URL('../../src/game/tower.js', import.meta.url), 'utf8');
const viewSource = readFileSync(new URL('../../src/core/view.js', import.meta.url), 'utf8');
for (const [label, pattern] of [
  ['arena deck materials bypass the tower cut planes', /arenaMaterials\[key\]\.clippingPlanes\s*=\s*\[\]/],
  ['arena deck matches the roof disk paving layout', /ground-floor arena: the same filled disk and concentric paving layout as the roof[\s\S]*CircleGeometry\(arenaFloorR,\s*128\)/],
  ['arena reuses the roof paving material', /arenaMaterials\s*=\s*\{\}[\s\S]*\['floor',\s*'paving',\s*'mosaic'\][\s\S]*arenaDeck\.quad\('paving'/],
  ['ground-level upper cut is horizontal', /tw\.arena\s*\?\s*UPN\.set\(0,\s*-1,\s*0\)/],
  ['arena deck visibility follows the player floor state', /S\.arena\.visible\s*=\s*!!tw\.arena/],
  ['arena cutaway caps are disabled on the open deck', /S\.caps\.visible\s*=\s*S\.cap\.visible\s*=\s*S\.upCap\.visible\s*=\s*!tw\.roof\s*&&\s*!tw\.arena/],
]) if (!pattern.test(renderSource)) throw new Error(`Tower render contract missing: ${label}`);
if (!/setWarp\(tw \? tw\.warp : null, tw \? tw\.pick : null, tw \? tw\.directionWarp : null\)/.test(towerSource)) throw new Error('Tower movement warp is not registered with the view system');
if (!/directionWarp:\s*\(x,\s*y,\s*out\)\s*=>\s*tw\.raw\(x,\s*y,\s*out,\s*false\)/.test(towerSource)) throw new Error('Tower controls do not have an unclipped coordinate warp');
if (!/const directionWarp = WARP_DIRECTION \|\| WARP[\s\S]*directionWarp\(x \+ WARP_EPS, y, wdx\)/.test(viewSource)) throw new Error('Input direction conversion does not use the uncut warp Jacobian');

for (let variant = 0; variant < 5; variant++) {
  for (let seed = 1; seed <= 40; seed++) {
    const gen = generateTower(12, biome, seed * 7919, variant), g = gen.tower, map = gen.map;
    if (!map.walkable(...gen.start)) throw new Error(`${gen.variant.id}/${seed}: top start is not walkable`);
    if (!map.walkable(...gen.exit)) throw new Error(`${gen.variant.id}/${seed}: bottom exit is not walkable`);
    if (gen.start[0] < g.XT || gen.start[0] > g.XT + 5) throw new Error(`${gen.variant.id}/${seed}: start is not at the stairhead`);
    if (gen.exit[0] < g.XB - 5 || gen.exit[0] > g.XB) throw new Error(`${gen.variant.id}/${seed}: exit is not at the ground-floor landing`);
    if (gen.start[0] >= gen.exit[0]) throw new Error(`${gen.variant.id}/${seed}: route does not descend toward increasing stair position`);
    if (!map.findPath(...gen.start, ...gen.exit, 50000)) throw new Error(`${gen.variant.id}/${seed}: the stair does not connect the start to the guardian`);
    if (!map.walkable(g.arenaX, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena center is not walkable`);
    const approach = map.findPath(...gen.exit, g.arenaX, g.arenaY, 50000, 0.42);
    if (!approach) throw new Error(`${gen.variant.id}/${seed}: stair landing does not connect to the arena for a boss-sized mover`);
    if (map.walkable(g.arenaX + g.arenaWalkR + 1, g.arenaY)) throw new Error(`${gen.variant.id}/${seed}: arena boundary allows escape`);
    for (let y = Math.floor(g.arenaY - g.arenaWalkR + 1); y <= Math.ceil(g.arenaY + g.arenaWalkR - 1); y++) {
      for (let x = Math.floor(g.arenaX - g.arenaWalkR + 1); x <= Math.ceil(g.arenaX + g.arenaWalkR - 1); x++) {
        if (x + 0.5 >= g.arenaStart && (x + 0.5 - g.arenaX) ** 2 + (y + 0.5 - g.arenaY) ** 2 <= (g.arenaWalkR - 0.8) ** 2 && !map.walkable(x + 0.5, y + 0.5)) {
          throw new Error(`${gen.variant.id}/${seed}: arena floor has an interior collision gap at ${x},${y}`);
        }
      }
    }
    for (let y = 0; y < g.GH; y++) for (let x = Math.floor(g.arenaStart); x < g.GW; x++) {
      if (x + 0.5 < g.arenaStart) continue;
      if (!map.walkable(x + 0.5, y + 0.5)) continue;
      const [wx, wy, z] = g.point(x + 0.5, y + 0.5);
      if (!Number.isFinite(wx) || !Number.isFinite(wy) || Math.abs(z) > 1e-8 || Math.hypot(wx, wy) > g.arenaFloorR + 0.05) {
        throw new Error(`${gen.variant.id}/${seed}: a walkable arena tile does not project onto the rendered floor`);
      }
    }
    for (let y = g.YR; y < g.YR + g.w; y++) for (let x = Math.floor(g.X1); x < Math.ceil(g.arenaStart); x++) {
      if (x + 0.5 < g.X1 || x + 0.5 >= g.arenaStart || !map.walkable(x + 0.5, y + 0.5)) continue;
      const [wx, wy, z] = g.point(x + 0.5, y + 0.5);
      if (Math.abs(z - g.z(g.s(x + 0.5))) > 1e-8 || Math.hypot(wx, wy) > g.arenaFloorR + 0.05) throw new Error(`${gen.variant.id}/${seed}: the compressed landing is outside the floor mesh or at the wrong elevation`);
    }
    // Follow the smoothed click-to-move route using the same collision-aware movement routine.
    const walker = { x: gen.exit[0], y: gen.exit[1], r: 0.525 };
    for (const [tx, ty] of approach) {
      let remaining = Math.hypot(tx - walker.x, ty - walker.y), guard = 0;
      while (remaining > 0.05 && guard++ < 2000) {
        const step = Math.min(0.08, remaining), dx = (tx - walker.x) / remaining * step, dy = (ty - walker.y) / remaining * step;
        if (!map.move(walker, dx, dy)) throw new Error(`${gen.variant.id}/${seed}: direct movement blocked on click route at ${walker.x.toFixed(2)},${walker.y.toFixed(2)}`);
        remaining = Math.hypot(tx - walker.x, ty - walker.y);
      }
      if (guard >= 2000) throw new Error(`${gen.variant.id}/${seed}: click route did not converge`);
    }
    if (Math.hypot(walker.x - g.arenaX, walker.y - g.arenaY) > 0.5) throw new Error(`${gen.variant.id}/${seed}: click-to-move did not reach the boss arena center`);
    if (!map.circleFree(g.arenaX, g.arenaY, 0.42)) throw new Error(`${gen.variant.id}/${seed}: boss-sized collision body does not fit at the center`);
    const seamA = g.point(g.arenaStart - 0.01, g.arenaY), seamB = g.point(g.arenaStart + 0.01, g.arenaY);
    if (Math.hypot(seamA[0] - seamB[0], seamA[1] - seamB[1]) > 0.1) throw new Error(`${gen.variant.id}/${seed}: staircase-to-arena rendering seam is discontinuous`);
    const boss = g.point(g.arenaX, g.arenaY);
    if (Math.hypot(boss[0], boss[1]) > 0.01) throw new Error(`${gen.variant.id}/${seed}: boss anchor is not at arena center`);

    // Keyboard directions must invert the same local tile-to-screen transform used by the
    // tower warp. Exercise the stair landing, transition, arena center, and outer walkable area.
    const alpha = g.theta(g.s(g.arenaStart)) + Math.PI / 2;
    const project = (x, y, out = [0, 0]) => {
      let cx, cy;
      if (x >= g.arenaStart) [cx, cy] = g.arenaPoint(x, y, alpha);
      else {
        const s = g.s(x), a = g.theta(s) - alpha, r = x >= g.X1 ? g.landingRadius(x, y) : g.r(y);
        cx = r * Math.cos(a); cy = r * Math.sin(a);
      }
      const z = x >= g.arenaStart ? 0 : g.z(g.s(x));
      out[0] = (cx - cy) * HW; out[1] = (cx + cy) * HH - z * VZ;
      return out;
    };
    const cutawayWarp = (x, y, out) => {
      if (x < g.arenaStart + 0.1) { out[0] = out[1] = 1e7; return out; }
      return project(x, y, out);
    };
    // The visual warp may hide geometry behind the tower cut plane. Input must still use its
    // unclipped direction surface so the derivative does not collapse to the clipping sentinel.
    setWarp(cutawayWarp, null, (x, y, out) => project(x, y, out));
    try {
      const points = [
        [g.arenaStart - 0.15, g.arenaY],
        [g.arenaStart + 0.2, g.arenaY],
        [g.arenaStart + 2.2, g.arenaY + 0.4],
        [g.arenaX, g.arenaY],
        [g.arenaX + g.arenaWalkR * 0.65, g.arenaY],
      ];
      for (const [x, y] of points) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const [tx, ty] = screenDirToTile(dx, dy, x, y), origin = project(x, y), moved = project(x + tx * 0.02, y + ty * 0.02);
        const dot = (moved[0] - origin[0]) * dx + (moved[1] - origin[1]) * dy;
        if (!(dot > 1e-5)) throw new Error(`${gen.variant.id}/${seed}: screen direction ${dx},${dy} reversed at ${x.toFixed(2)},${y.toFixed(2)}`);
      }
      // Match the tower's six-step Newton click inverse on nearby positions, including both
      // sides of the landing blend. This catches coordinate inversion that can strand click paths.
      const pickNear = (wx, wy, startX, startY) => {
        let x = startX, y = startY;
        const a = [0, 0], b = [0, 0], c = [0, 0];
        project(x, y, a);
        const dx = wx - a[0], dy = wy - a[1];
        x += (dx / HW + dy / HH) / 2; y += (dy / HH - dx / HW) / 2;
        for (let i = 0; i < 6; i++) {
          project(x, y, a);
          const fx = a[0] - wx, fy = a[1] - wy;
          if (fx * fx + fy * fy < 0.04) break;
          project(x + 0.05, y, b); project(x, y + 0.05, c);
          const j11 = (b[0] - a[0]) / 0.05, j12 = (c[0] - a[0]) / 0.05;
          const j21 = (b[1] - a[1]) / 0.05, j22 = (c[1] - a[1]) / 0.05, det = j11 * j22 - j12 * j21;
          if (Math.abs(det) < 1e-6) break;
          let sx = (j22 * fx - j12 * fy) / det, sy = (j11 * fy - j21 * fx) / det;
          const length = Math.hypot(sx, sy); if (length > 6) { sx *= 6 / length; sy *= 6 / length; }
          x -= sx; y -= sy;
        }
        return [x, y];
      };
      for (const [x, y] of points.slice(1)) {
        const [wx, wy] = project(x, y), [px, py] = pickNear(wx, wy, x + 2, y - 1);
        if (Math.hypot(px - x, py - y) > 0.03) throw new Error(`${gen.variant.id}/${seed}: click target inverse drifted near ${x.toFixed(2)},${y.toFixed(2)}`);
      }
    } finally { setWarp(null, null); }
  }
}
console.log('Tower generation OK: 5 variants x 40 seeds, boss pathfinding, click-to-move inverse, direct movement, arena collision/floor coverage, sealed boundary, centered boss, and keyboard directions');
