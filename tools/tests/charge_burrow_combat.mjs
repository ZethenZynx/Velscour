// Exercise the real charger/burrow controllers and measure eligible spawns.
// Run: node tools/tests/charge_burrow_combat.mjs
import assert from 'node:assert/strict';
import { generateDungeon } from '../../src/world/dungeon.js';
import { BIOMES } from '../../src/data/biomes.js';
import { ARCH, ARCH_MOVES } from '../../src/data/enemies.js';
import { rollMoves, Monster } from '../../src/game/monster.js';
import { configureEnemyVariety, updateEnemyVariety } from '../../src/game/enemyvariety.js';
import { G } from '../../src/state.js';
import { RNG, hashStr } from '../../src/core/util.js';

const regions = ['catacombs', 'castle_keep', 'molten', 'fungal', 'frozen', 'desert', 'void', 'sewers', 'storm'];
const depths = [5, 25, 60, 120], seeds = 25, directions = ['NE', 'SE', 'SW', 'NW'];
const masks = {};
for (let mask = 0; mask < 16; mask++) masks[mask] = [directions.filter((_, bit) => mask & (1 << bit)).map((arm) => ({ arm, ox: 0, oy: 0 }))];
const tileset = { floors: [{ name: 'base', lum: 0.2 }, { name: 'base2', lum: 0.2 }, { name: 'feature', lum: 0.2 }], bases: [0, 1], features: [2], walls: { mock: masks }, families: ['mock'], arches: {}, doors: {}, scatter: [] };
const summary = Object.fromEntries(regions.map((id) => [id, { total: 0, charger: 0, exploder: 0, burrowEligible: 0, burrowAssigned: 0 }]));
const biomeById = (id) => BIOMES.find((b) => b.id === id);
for (const region of regions) for (const depth of depths) for (let seed = 1; seed <= seeds; seed++) {
  const result = generateDungeon(depth, biomeById(region), tileset, `${region}-${depth}-${seed}`);
  const rng = new RNG(hashStr(`${region}-${depth}-${seed}-special-moves`));
  for (const s of result.spawns.filter((x) => x.rank === 'normal')) {
    const n = s.n || 1, A = ARCH[s.arch];
    if (!A) continue;
    summary[region].total += n;
    if (A.ai === 'charger') summary[region].charger += n;
    if (A.ai === 'exploder') summary[region].exploder += n;
    if ((ARCH_MOVES[s.arch] || []).includes('burrow') && !A.fly) {
      summary[region].burrowEligible += n;
      for (let i = 0; i < n; i++) if (rollMoves(s.arch, 'normal', 0, depth, () => rng.next())?.includes('burrow')) summary[region].burrowAssigned++;
    }
  }
}

const eligibleBurrowers = Object.keys(ARCH_MOVES).filter((id) => ARCH[id]?.ai !== 'boss' && ARCH_MOVES[id]?.includes('burrow') && !ARCH[id]?.fly);
assert.ok(eligibleBurrowers.length >= 3, 'at least three grounded stock archetypes can roll burrow');
const moveRates = {};
for (const arch of eligibleBurrowers) {
  let assigned = 0, samples = 0;
  const A = ARCH[arch];
  for (const depth of depths) for (let seed = 1; seed <= 250; seed++) {
    const rng = new RNG(hashStr(`${arch}-${depth}-${seed}`));
    const moves = rollMoves(arch, 'normal', 0, depth, () => rng.next());
    samples++;
    if (moves?.includes('burrow')) assigned++;
  }
  moveRates[arch] = { assigned, samples };
  assert.ok(assigned > 0 && assigned < samples, `${arch} burrow assignment is occasional, not absent or universal`);
}

// Real pack-profile update must not consume a charger tick before aiCharger can run.
const player = { id: 8001, x: 6, y: 2, r: 0.3, team: 'player', dead: false, targetable: true, hp: 10000, maxHp: 10000, res: {}, status: {}, curses: {} };
const world = {
  time: 0, map: { los: () => true, circleFree: () => true, move(actor, dx, dy) { actor.x += dx; actor.y += dy; return true; } },
  query: () => [], creatures: [], hostiles(team, x, y, radius) { return player.team !== team && Math.hypot(player.x - x, player.y - y) <= radius ? [player] : []; }, addHazard() {}, kills: 0,
};
G.world = world;
G.player = player;
const charger = Object.create(Monster.prototype);
Object.assign(charger, {
  id: 8002, x: 2, y: 2, r: 0.35, team: 'enemy', world, arch: 'hound', ai: 'charger', rank: 'normal',
  hp: 100, maxHp: 100, dmg: 10, speed: 4, atkCd: 1, cd: 0, moveCd: 999, scale: 1,
  targetable: true, state: 'idle', enemyAttackCd: 999, facing: 0, moving: false, strafe: 1,
  face(a) { this.facing = a; }, startAction(kind, windup, data) { this.state = 'windup'; this.action = { kind, windup, ...data }; },
  atkRange: () => 1.2, aiMelee() {}, deal(target, amount) { target.hp -= amount; this.chargeHits = (this.chargeHits || 0) + 1; },
});
configureEnemyVariety(charger, 'hound');
charger.enemyAttackCd = 999;
let chargeStarts = 0;
const savedRandom = Math.random;
Math.random = () => 0.1; // deterministic successful roll on each available cooldown
for (let i = 0; i < 80 * 60; i++) {
  world.time = i / 60;
  if (charger.state !== 'idle') {
    Monster.prototype.runAction.call(charger, 1 / 60);
    if (charger.state === 'idle') charger.x = 2;
  } else {
    charger.cd = Math.max(0, charger.cd - 1 / 60);
    const handled = updateEnemyVariety(charger, player, 4, 1 / 60);
    if (!handled) Monster.prototype.aiCharger.call(charger, 1 / 60, player, 4);
    if (charger.action?.kind === 'charge' && charger._countedAction !== charger.action) {
      charger._countedAction = charger.action; chargeStarts++;
    }
  }
}
Math.random = savedRandom;
assert.ok(chargeStarts >= 8 && chargeStarts <= 12, `charger activates about once per 8s (${chargeStarts} in 80s)`);
assert.ok(charger.chargeHits >= 8, `charger rushes reach the player during the attack (${charger.chargeHits} hits)`);

// Run the actual burrow special from its trigger through underground travel and surfacing.
const burrower = Object.create(Monster.prototype);
Object.assign(burrower, {
  id: 8003, x: 1, y: 2, r: 0.3, team: 'enemy', world, arch: 'spider', ai: 'melee', rank: 'normal',
  hp: 100, maxHp: 100, dmg: 10, speed: 3, atkCd: 1, cd: 0, moveCd: 0, scale: 1, el: 'phys',
  targetable: true, state: 'idle', moves: ['burrow'], facing: 0, face(a) { this.facing = a; },
});
player.x = 5; player.y = 2; player.dead = false;
let burrowStarts = 0, buriedSeen = false, burrowSurfaces = 0;
for (let i = 0; i < 60 * 60; i++) {
  const dt = 1 / 60;
  if (burrower.state === 'act') {
    Monster.prototype.runAction.call(burrower, dt);
    if (burrower.targetable === false) buriedSeen = true;
    if (burrower.state === 'idle' && burrowStarts > burrowSurfaces) { burrowSurfaces++; player.x = burrower.x + 4; player.y = burrower.y; }
  } else if ((burrower.moveCd -= dt) <= 0) {
    const d = Math.hypot(player.x - burrower.x, player.y - burrower.y);
    if (Monster.prototype.trySpecial.call(burrower, player, d)) burrowStarts++;
  }
}
assert.ok(burrowStarts >= 4 && burrowStarts <= 8, `burrow activates occasionally on its cooldown (${burrowStarts} starts in 60s)`);
assert.ok(buriedSeen, 'burrow makes the enemy untargetable underground');
assert.ok(burrowSurfaces >= 4 && burrowStarts - burrowSurfaces <= 1, 'burrow cycles resurface targetable (at most one can be in progress at the sample end)');

// The beetle's optional profile attacks no longer swallow its primary explosive AI.
const exploder = Object.create(Monster.prototype);
Object.assign(exploder, { id: 8004, x: 2, y: 2, r: 0.3, team: 'enemy', world, arch: 'beetle', ai: 'exploder', rank: 'normal', hp: 50, maxHp: 50, dmg: 10, speed: 4, atkCd: 1, scale: 1, enemyAttackCd: 999, enemyAbilityCd: 999, enemyBehaviorCd: {}, face() {}, startAction(kind, windup) { this.state = 'windup'; this.action = { kind, windup }; } });
configureEnemyVariety(exploder, 'beetle'); exploder.enemyAttackCd = 999;
assert.equal(updateEnemyVariety(exploder, player, 0.8, 1 / 60), false, 'profile controller yields to the exploder AI');
Monster.prototype.aiExploder.call(exploder, 1 / 60, player, 0.8);
assert.equal(exploder.action?.kind, 'explode', 'exploder enters its telegraphed detonation');
exploder.runAction(1);
assert.equal(exploder.dead, true, 'exploder executes its detonation after the warning');

console.log(`Eligible burrowing stock enemies: ${eligibleBurrowers.join(', ')}`);
console.log('Burrow move assignment by archetype (samples across depths 5, 25, 60, 120):');
for (const [arch, r] of Object.entries(moveRates)) console.log(`  ${arch}: ${(100 * r.assigned / r.samples).toFixed(1)}% assigned (${r.assigned}/${r.samples})`);
console.log('Generated ordinary spawns across 9 regions x 4 depths x 25 seeds:');
for (const [region, r] of Object.entries(summary)) {
  const pct = (n) => (100 * n / r.total).toFixed(1);
  console.log(`  ${region}: charger ${pct(r.charger)}%, burrow-capable ${pct(r.burrowEligible)}% (${r.burrowEligible ? (100 * r.burrowAssigned / r.burrowEligible).toFixed(1) : '0.0'}% of eligible assigned), exploder ${pct(r.exploder)}% (${r.total} enemies)`);
}
console.log(`Real combat controller activation: charger rushes/hits ${chargeStarts}/${charger.chargeHits} / 80s; burrow starts/completions ${burrowStarts}/${burrowSurfaces} / 60s; exploder telegraph/detonation executed.`);
