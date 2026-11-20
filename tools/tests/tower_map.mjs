// Non-browser regression checks for the restored ascending Serpentine Tower.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BIOME_BY_ID } from '../../src/data/biomes.js';
import { VZ, generateTower, TOWER_VARIANTS } from '../../src/world/tower.js';
import { HH, HW, screenDirToTile } from '../../src/core/view.js';

const gameTower = readFileSync(new URL('../../src/game/tower.js', import.meta.url), 'utf8');
const renderTower = readFileSync(new URL('../../src/gfx/tower3d.js', import.meta.url), 'utf8');
const worldTower = readFileSync(new URL('../../src/world/tower.js', import.meta.url), 'utf8');
const biome = BIOME_BY_ID.serpentine_tower;
assert.ok(biome, 'Serpentine Tower biome is registered');
assert.equal(TOWER_VARIANTS.length, 5, 'all shared tower variants remain available');
assert.match(gameTower, /phase: 'climb'/, 'the encounter starts in the ascent phase');
assert.match(gameTower, /p\.x < g\.XT \+ 2\.8[\s\S]*toRoof\(\)/, 'reaching the stairhead transitions to the roof');
assert.match(gameTower, /function startRoof\(/, 'the roof encounter is initialized');
assert.match(gameTower, /function spawnWave\(/, 'roof waves remain part of the encounter');
assert.match(gameTower, /function win\(/, 'the historical roof victory path remains');
assert.match(gameTower, /run\.phase\s*=\s*'top'/, 'the encounter enters its top-floor phase');
assert.match(gameTower, /camera\.leadX = -G\.W \/ camera\.zoom/, 'the original staircase camera offset is restored');
assert.match(gameTower, /const zk = tw\.roof \? 0\.82 : 1/, 'the original pulled-back roof zoom is restored');
assert.match(gameTower, /camera\.follow\(p\.x, p\.y, 0, true\)/, 'camera snaps to the player on the roof transition');
assert.match(renderTower, /roof\.visible\s*=\s*tw\.roof/, 'the historical top arena is shown after ascent');
assert.doesNotMatch(gameTower + worldTower + renderTower, /arenaStart|arenaWalkR|ground-floor guardian|phase: 'descend'/, 'the failed bottom-arena route is absent');

let checked = 0;
for (let variant = 0; variant < TOWER_VARIANTS.length; variant++) {
  for (let seed = 1; seed <= 40; seed++) {
    const gen = generateTower(36, biome, seed * 7919, variant);
    const { map, tower: g } = gen;
    const stairhead = [g.XT + 2.5, g.YR + g.w / 2];

    assert.ok(map.walkable(...gen.start), `${gen.variant.id}/${seed}: bottom stair start is walkable`);
    assert.ok(map.walkable(...stairhead), `${gen.variant.id}/${seed}: stairhead transition is walkable`);
    assert.ok(gen.start[0] > stairhead[0], `${gen.variant.id}/${seed}: player starts at the bottom and ascends toward decreasing x`);
    assert.ok(gen.start[0] <= g.XB, `${gen.variant.id}/${seed}: start lies within the lower stair`);
    assert.ok(map.findPath(...gen.start, ...stairhead, 50000), `${gen.variant.id}/${seed}: continuous staircase reaches the roof door`);

    // The original camera turn keeps local screen directions aligned with the wrapped stair.
    const project = (x, y, alpha) => {
      const s = g.s(x), a = g.theta0 - s / g.rc - alpha, r = g.r(y), z = g.z(s);
      const cx = r * Math.cos(a), cy = r * Math.sin(a);
      return [(cx - cy) * HW, (cx + cy) * HH - z * VZ];
    };
    for (const x of [gen.start[0], (gen.start[0] + g.XT) / 2, g.XT + 3]) {
      const y = g.YR + g.w / 2, alpha = g.theta(g.s(x)) + Math.PI / 2, origin = project(x, y, alpha);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const [tx, ty] = screenDirToTile(dx, dy), moved = project(x + tx * 0.02, y + ty * 0.02, alpha);
        assert.ok((moved[0] - origin[0]) * dx + (moved[1] - origin[1]) * dy > 0, `${gen.variant.id}/${seed}: keyboard direction ${dx},${dy} is not reversed`);
      }
    }

    // Reproduce the runtime's Newton inverse used for click-to-move picking along the spiral.
    const warp = (x, y, alpha) => {
      if (x < g.XR) {
        const cx = x - g.AX, cy = y - g.AY;
        return [(cx - cy) * HW, (cx + cy) * HH - g.roofZ * VZ];
      }
      return project(x, y, alpha);
    };
    const pick = (wx, wy, px, py, alpha) => {
      let x = px, y = py; const a = [0, 0], b = [0, 0], c = [0, 0];
      const put = (u, v, out) => { const q = warp(u, v, alpha); out[0] = q[0]; out[1] = q[1]; };
      put(x, y, a); const dx = wx - a[0], dy = wy - a[1];
      x += (dx / HW + dy / HH) / 2; y += (dy / HH - dx / HW) / 2;
      for (let i = 0; i < 6; i++) {
        put(x, y, a); const fx = a[0] - wx, fy = a[1] - wy;
        if (fx * fx + fy * fy < 0.04) break;
        put(x + 0.05, y, b); put(x, y + 0.05, c);
        const j11 = (b[0] - a[0]) / 0.05, j12 = (c[0] - a[0]) / 0.05;
        const j21 = (b[1] - a[1]) / 0.05, j22 = (c[1] - a[1]) / 0.05, det = j11 * j22 - j12 * j21;
        if (Math.abs(det) < 1e-6) break;
        let sx = (j22 * fx - j12 * fy) / det, sy = (j11 * fy - j21 * fx) / det;
        const length = Math.hypot(sx, sy); if (length > 6) { sx *= 6 / length; sy *= 6 / length; }
        x -= sx; y -= sy;
      }
      return [x, y];
    };
    for (const x of [gen.start[0], (gen.start[0] + g.XT) / 2, g.XT + 3]) {
      const y = g.YR + g.w / 2, px = Math.min(gen.start[0], x + 0.7), alpha = g.theta(g.s(px)) + Math.PI / 2, target = warp(x, y, alpha);
      const result = pick(...target, px, y, alpha);
      assert.ok(Math.hypot(result[0] - x, result[1] - y) < 0.05, `${gen.variant.id}/${seed}: click-to-move inversion misses the stair target`);
    }

    assert.deepEqual(gen.exit, [g.AX, g.AY], `${gen.variant.id}/${seed}: exit remains at the roof arena`);
    assert.ok(map.walkable(...g.roofDoor), `${gen.variant.id}/${seed}: roof landing is walkable`);
    assert.ok(map.walkable(g.AX, g.AY), `${gen.variant.id}/${seed}: roof boss arena center is walkable`);
    assert.ok(map.findPath(...g.roofDoor, g.AX, g.AY, 50000, 0.42), `${gen.variant.id}/${seed}: roof landing connects to boss arena`);

    for (const spawn of gen.spawns) {
      assert.ok(map.walkable(spawn.x, spawn.y), `${gen.variant.id}/${seed}: stair encounter spawn is on walkable terrain`);
    }
    for (const chest of gen.chests) {
      assert.ok(map.walkable(chest.x, chest.y), `${gen.variant.id}/${seed}: chest is placed on walkable terrain`);
    }
    checked++;
  }
}

console.log(`Ascending tower generation OK: ${TOWER_VARIANTS.length} variants x 40 seeds (${checked} layouts); bottom start, stairhead path, roof landing, boss arena path, and encounter/chest placement verified.`);
