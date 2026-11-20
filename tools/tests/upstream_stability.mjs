// Focused regression checks for compatible upstream reliability fixes.
// Run: node tools/tests/upstream_stability.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hit } from '../../src/game/combat.js';
import { Creature } from '../../src/game/creature.js';
import { Monster } from '../../src/game/monster.js';
import { activatePylon, riftTick } from '../../src/game/rifts.js';
import { PYLONS } from '../../src/data/rifts.js';
import { UI } from '../../src/ui/ui.js';
import { G } from '../../src/state.js';

// Invalid damage must be ignored without corrupting the target's health.
const target = { hp: 50, maxHp: 50, dead: false, invuln: 0, targetable: true };
assert.equal(hit(null, target, Number.NaN), 0);
assert.equal(target.hp, 50);

// Velocity is a temporary multiplier in the method, not an assignment over it.
G.char = null;
const player = new Creature({ isPlayer: true, pylonBuff: { id: 'velocity', timer: 3 } });
assert.equal(player.speedMul(), 1.8);
player.pylonBuff.timer = 0;
assert.equal(player.speedMul(), 1);

// The Conduit uses a finite attack estimate and its bolt reaches the normal damage path.
const { SKILLS } = await import('../../src/data/skills.js');
const mainSkill = Object.keys(SKILLS).find((id) => id.startsWith('paladin.'));
UI.msgEl = { innerHTML: '', classList: { toggle() {} }, style: {} };
UI.hud = null;
const hero = {
  x: 1, y: 1, isPlayer: true, classId: 'paladin', team: 'player', hp: 100, maxHp: 100,
  char: { classId: 'paladin', bar: [mainSkill], skills: {} },
  st: { critChance: 0, critDmg: 150, legendary: {} },
  skillDamage: () => [12, 20], status: {}, curses: {},
};
const victim = {
  x: 2, y: 2, team: 'enemy', isPlayer: false, dead: false, hp: 100000, maxHp: 100000,
  invuln: 0, targetable: true, res: {}, status: {}, curses: {}, buffs: [], rank: 'normal',
  r: 0.35, kbx: 0, kby: 0,
};
const run = { done: false, failed: false, tier: 1, t: 0, limit: 500, warned: {} };
Object.defineProperty(run, 'left', { get() { return this.limit - this.t; } });
const riftWorld = { player: hero, creatures: [victim], rift: run, depth: 100, dungeonAffixes: [], time: 0, hostiles: () => [] };
victim.world = riftWorld;
G.world = riftWorld;
G.char = hero.char;
activatePylon(riftWorld, PYLONS.find((pylon) => pylon.id === 'conduit'));
assert.ok(Number.isFinite(hero.pylonBuff.zap) && hero.pylonBuff.zap > 0, 'Conduit caches finite player attack damage');
const savedRandom = Math.random;
Math.random = () => 0;
try { riftTick(riftWorld, 0.1); } finally { Math.random = savedRandom; }
assert.ok(Number.isFinite(victim.hp) && victim.hp < 100000, 'Conduit deals finite damage through combat');

// Enemy raised-dead caps prevent another cast from adding minions at either cap.
G.room = null;
G.game = { isDungeonAuthority: () => true };
const summoner = Object.create(Monster.prototype);
const ownedWorld = { depth: 1, creatures: [], map: {} };
Object.assign(summoner, { world: ownedWorld, x: 0, y: 0, atkCd: 1, level: 1 });
ownedWorld.creatures.push(...Array.from({ length: 4 }, () => ({ dead: false, raisedBy: summoner, x: 1, y: 1 })));
Monster.prototype.perform.call(summoner, { kind: 'summonMinions' });
assert.equal(ownedWorld.creatures.length, 4, 'a summoner cannot exceed four living raised dead');

const nearbyWorld = { depth: 1, creatures: [], map: {} };
Object.assign(summoner, { world: nearbyWorld });
nearbyWorld.creatures.push(...Array.from({ length: 8 }, () => ({ dead: false, raisedBy: {}, x: 1, y: 1 })));
Monster.prototype.perform.call(summoner, { kind: 'summonMinions' });
assert.equal(nearbyWorld.creatures.length, 8, 'nearby raised dead cap prevents crowd growth');

// Guard key placement/gating invariants without booting the browser-only game shell.
const gameSource = await readFile(new URL('../../src/game/game.js', import.meta.url), 'utf8');
assert.match(gameSource, /r\.mx > 0 && Math\.hypot\(r\.mx - gen\.start\[0\], r\.my - gen\.start\[1\]\) > 8/);
assert.match(gameSource, /x: px, y: py, opened: false, reach: 1\.5, dot: pdef\.color, pylon: true/);
assert.doesNotMatch(gameSource, /x: pr\.cx, y: pr\.cy/);

const riftsSource = await readFile(new URL('../../src/game/rifts.js', import.meta.url), 'utf8');
assert.match(riftsSource, /heroDamage\(p\)\.atk/);
assert.match(riftsSource, /\(b\.zap \|\| 0\).*'light'/);
assert.doesNotMatch(riftsSource, /hit\(p, target, p\.st\.attack|p\.speedMul\s*=/);

const trainSource = await readFile(new URL('../../src/game/ghosttrain.js', import.meta.url), 'utf8');
assert.match(trainSource, /crowd < 10/);
const raidSource = await readFile(new URL('../../src/game/raid.js', import.meta.url), 'utf8');
assert.match(raidSource, /this\.outT > 3/);

console.log('Upstream stability checks passed.');
