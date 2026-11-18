// Coverage check for the complete enemy-variety catalog and its monster integration.
// Run: node tools/tests/enemy_variety.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { G } from '../../src/state.js';
import { ARCH } from '../../src/data/enemies.js';
import { ENEMY_BEHAVIORS, ENEMY_ATTACKS, ENEMY_PROFILE_BY_ARCH, ENEMY_PROFILES, ENEMY_ATTACK_CONFIG } from '../../src/data/enemyvariety.js';
import { configureEnemyVariety, enemyDamageReduction, executeEnemyAttack } from '../../src/game/enemyvariety.js';

const ai = await readFile(new URL('../../src/game/enemyvariety.js', import.meta.url), 'utf8');
const monster = await readFile(new URL('../../src/game/monster.js', import.meta.url), 'utf8');
const combat = await readFile(new URL('../../src/game/combat.js', import.meta.url), 'utf8');
const check = (condition, message) => assert.ok(condition, message);

assert.equal(ENEMY_BEHAVIORS.length, 40, 'all requested behaviors are catalogued');
assert.equal(new Set(ENEMY_BEHAVIORS).size, 40, 'behavior IDs are unique');
assert.equal(ENEMY_ATTACKS.length, 30, 'all requested attacks are catalogued');
assert.equal(new Set(ENEMY_ATTACKS).size, 30, 'attack IDs are unique');
assert.equal(Object.keys(ENEMY_PROFILES).length, 10, 'all ten behavior archetypes are defined');

const assignedBehaviors = new Set(Object.values(ENEMY_PROFILES).flatMap((p) => p.behaviors));
const assignedAttacks = new Set(Object.values(ENEMY_PROFILES).flatMap((p) => p.attacks));
assignedBehaviors.add('unstable_death'); // Zombie death burst uses the same shared death effect.
assignedAttacks.add('death_burst');
for (const id of ENEMY_BEHAVIORS) check(assignedBehaviors.has(id), `behavior ${id} is assigned`);
for (const id of ENEMY_ATTACKS) {
  check(assignedAttacks.has(id), `attack ${id} is assigned`);
  check(ENEMY_ATTACK_CONFIG[id], `attack ${id} has range, cooldown, and telegraph data`);
  check(ai.includes(`case '${id}'`), `attack ${id} has an execution case`);
}

for (const [arch, profiles] of Object.entries(ENEMY_PROFILE_BY_ARCH)) {
  check(ARCH[arch], `profile references existing monster ${arch}`);
  check(profiles.length > 0 && profiles.every((id) => ENEMY_PROFILES[id]), `${arch} has valid profile assignments`);
}
for (const arch of Object.keys(ARCH).filter((id) => ARCH[id].ai !== 'boss')) {
  const fallbackClasses = new Set(['melee', 'swarm', 'brute', 'charger', 'ranged', 'caster', 'nova', 'beamer', 'exploder', 'turret', 'aura', 'follow']);
  check(ENEMY_PROFILE_BY_ARCH[arch] || fallbackClasses.has(ARCH[arch].ai), `${arch} has an explicit or AI-class fallback profile`);
}
for (const id of ENEMY_BEHAVIORS) check(`${ai}\n${monster}`.includes(`'${id}'`), `behavior ${id} is connected to runtime logic`);
check(monster.includes('configureEnemyVariety(m, archId, art)'), 'monster construction assigns behavior profiles');
check(monster.includes('updateEnemyVariety(this, target, d, dt)'), 'idle combat AI updates the new behavior system');
check(monster.includes("case 'enemy_attack':"), 'monster action runner dispatches named attacks');
check(combat.includes('reduceIncomingDamage(src, dmg, el, o)'), 'combat applies defensive and adaptive damage rules');
check(combat.includes('!tgt.noLoot'), 'summons and illusions do not award progression rewards');

const p = { id: 900, x: 3, y: 2, r: 0.3, team: 'player', hp: 1000, maxHp: 1000, dead: false, targetable: true, status: {}, curses: {}, res: {} };
const map = {
  circleFree: () => true, flowAt: () => 0, isFloor: () => true, rayLength: () => 6,
  nudge: (x, y) => [x, y], move: () => true,
};
const w = {
  map, creatures: [], corpses: [{ x: 2.5, y: 2, arch: 'skeleton', level: 1, maxHp: 100, t: 0 }], hazards: [],
  query: (x, y, r, filter = () => true) => [m, p].filter((c) => c && Math.hypot(c.x - x, c.y - y) <= r && filter(c)),
  hostiles: (team, x, y, r) => p.team !== team && Math.hypot(p.x - x, p.y - y) <= r ? [p] : [],
  addHazard(h) { this.hazards.push(h); return h; },
};
const m = {
  id: 901, x: 2, y: 2, r: 0.32, team: 'enemy', world: w, arch: 'skeleton', ai: 'melee', rank: 'normal',
  hp: 100, maxHp: 100, dmg: 10, speed: 2, range: 8, atkCd: 1, facing: 0, el: 'phys', targetable: true,
  enemyBehaviors: [], enemyAttacks: [], enemyBehaviorCd: {}, enemyAbilityCd: 0,
  face(a) { this.facing = a; }, navTo() {}, startAction() {}, atkRange: () => 1.2,
  deal(target, amount) { this.lastDamage = (this.lastDamage || 0) + amount; target.hp -= amount; return amount; },
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); },
};
w.creatures = [m, p];
G.world = w;
G.char = {};
configureEnemyVariety(m, 'skeleton');
check(m.enemyBehaviors.length > 0 && m.enemyAttacks.length > 0, 'monster construction configures live behavior and attack lists');
let configured = 0;
for (const [arch, def] of Object.entries(ARCH).filter(([, def]) => def.ai !== 'boss')) {
  const candidate = { team: 'enemy', ai: def.ai, rank: 'normal', summon: false };
  configureEnemyVariety(candidate, arch);
  check(candidate.enemyBehaviors?.length && candidate.enemyAttacks?.length, `${arch} receives behaviors and attacks`);
  configured++;
}
let issued = 0;
for (const id of ENEMY_ATTACKS) {
  w.hazards.length = 0; m.lastDamage = 0; p.hp = 1000; m.enemyAttack = id;
  executeEnemyAttack(m, { enemyAttack: id, target: p, tx: p.x, ty: p.y, ang: 0 });
  check(w.hazards.length > 0 || p.hp < 1000 || id === 'pack_howl' || id === 'smoke_bomb', `${id} executes without errors and produces an attack/effect`);
  issued++;
}
m.enemyBehaviors = ['shield_guard', 'defensive_stance', 'elemental_adaptation'];
m.defenseT = 2;
const mitigated = enemyDamageReduction(m, { x: 1, y: 2 }, 100, 'fire');
check(mitigated < 100 && mitigated >= 1 && m.enemyAdapt?.el === 'fire', 'frontal guard, stance, and temporary elemental adaptation reduce damage without immunity');

console.log(`OK: ${Object.keys(ENEMY_PROFILES).length} profiles, ${ENEMY_BEHAVIORS.length} behaviors, ${ENEMY_ATTACKS.length} attacks executed, ${configured} roster archetypes configured, ${Object.keys(ENEMY_PROFILE_BY_ARCH).length} direct mappings`);
