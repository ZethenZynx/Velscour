import assert from 'node:assert/strict';
import { PACK_LEADER_CHANCE, PACK_LEADERS, PACK_LEADER_IDS } from '../../src/data/packleaders.js';
import { assignPackLeader, updatePackLeader, packLeaderAllyKilled, packLeaderKilled } from '../../src/game/packleaders.js';

assert.equal(PACK_LEADER_CHANCE, 0.75);
assert.equal(PACK_LEADER_IDS.length, 15, 'the system defines all fifteen leader roles');
assert.deepEqual(PACK_LEADER_IDS.map((id) => PACK_LEADERS[id].color), [
  '#E32E35', '#24C966', '#AD4DFF', '#F28A19', '#FF3B66', '#378DF5', '#E8B522', '#25C9CE',
  '#7286A0', '#9C1E45', '#77C747', '#77DAFA', '#FF6628', '#D8B85A', '#A5A8B5',
]);

const makePack = (id = 'war_shaman') => {
  const world = { time: 100, corpses: [], creatures: [], packLeadersById: Object.create(null), map: {
    nudge: (x, y) => [x, y], circleFree: () => true,
  } };
  const player = { isPlayer: true, x: 7, y: 0, status: {}, affixDamageDownT: 0 };
  world.player = player;
  const leader = { id: 1, name: 'Skeleton', arch: 'skeleton', ai: 'melee', undead: true, team: 'enemy', rank: 'normal',
    packLeaderType: id, packLeaderRole: PACK_LEADERS[id].role, packLeaderRuneColor: PACK_LEADERS[id].color,
    enemyPackId: 9, enemyPackLeaderId: 1, packLeaderCd: 0.01, packLeaderResurrections: 0, packLeaderSummons: 0, maxHp: 100, hp: 100, dmg: 10, speed: 1, r: 0.3,
    x: 0, y: 0, world, enemyBehaviors: [], enemyAttacks: [], navTo(x, y) { this.lastNav = [x, y]; },
    spawnEnemyMinion(arch, strong, decoy, x = 1, y = 1) {
      const m = { id: 20 + world.creatures.length, arch, x, y, maxHp: 40, hp: 40, dmg: 3, team: 'enemy', enemySummoned: true,
        enemySummoner: this, enemyPackId: this.enemyPackId, noLoot: true, xp: 0, dead: false };
      world.creatures.push(m); return m;
    } };
  leader.world.packLeadersById[leader.id] = leader;
  const allies = Array.from({ length: 3 }, (_, i) => ({ id: i + 2, arch: i === 0 ? 'hound' : 'skeleton', name: 'Skeleton',
    team: 'enemy', rank: 'normal', enemyPackId: 9, enemyPackLeaderId: 1, x: 0.8 + i * 0.2, y: 0.3,
    maxHp: 100, hp: i === 0 ? 55 : 100, dmg: 10, speed: 1, r: 0.3, dead: false, world,
    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); } }));
  world.creatures.push(leader, ...allies);
  return { world, leader, allies, player };
};

const savedRandom = Math.random;
try {
  Math.random = () => 0;
  const eligible = makePack();
  eligible.leader.packLeaderType = null; eligible.leader.packLeaderRole = null;
  assert.equal(assignPackLeader(eligible.world, eligible.world.creatures, null, 20, { n: 4, rank: 'normal' }), eligible.leader);
  assert.equal(eligible.world.creatures.filter((m) => m.packLeaderType).length, 1, 'eligible pack gets one leader');
  assert.equal(eligible.leader.packLeaderType, 'war_shaman');
  assert.equal(assignPackLeader(eligible.world, eligible.world.creatures.slice(0, 3), null, 20, { n: 3 }), null, 'small packs are skipped');
  assert.equal(assignPackLeader(eligible.world, eligible.world.creatures, null, 20, { n: 4, rank: 'champion' }), null, 'elite/scripted groups are preserved');
  Math.random = () => 0.76;
  const rollMiss = makePack();
  rollMiss.leader.packLeaderType = null; rollMiss.leader.packLeaderRole = null;
  assert.equal(assignPackLeader(rollMiss.world, rollMiss.world.creatures, null, 20, { n: 4 }), null, 'a roll outside the 75% chance leaves the group unchanged');
  Math.random = () => 0;

  const cases = {
    war_shaman: (p) => assert.ok(p.allies.some((m) => m.enemyLeaderBuff?.damage > 0)),
    healer: (p) => assert.ok(p.allies[0].hp > 55, 'healer prioritizes the most injured ally'),
    necromancer: (p) => assert.ok(p.world.creatures.some((m) => m.enemySummoned && m.noLoot && m.xp === 0)),
    summoner: (p) => assert.ok(p.world.creatures.some((m) => m.enemySummoned && m.noLoot && m.xp === 0)),
    berserker: (p) => assert.ok(p.leader.packLeaderRageUntil > p.world.time),
    war_captain: (p) => assert.ok(p.allies[0].enemyLeaderBuff?.resist),
    battle_drummer: (p) => assert.ok(p.allies[0].enemyLeaderBuff?.attackRate),
    hexcaster: (p) => assert.equal(p.player.status.chill?.src, p.leader),
    shieldbearer: (p) => { assert.ok(p.allies[0].enemyLeaderBuff?.guard); assert.equal(p.allies[0].enemyLeaderGuardPool, 18, 'shield protection has a finite absorb pool'); },
    blood_priest: (p) => assert.ok(p.allies.some((m) => m.hp < 100) && p.allies[1].enemyLeaderBuff?.damage),
    beastmaster: (p) => assert.ok(p.allies[0].enemyLeaderBuff?.flank),
    frost_shaman: (p) => assert.equal(p.allies[0].enemyLeaderBuff?.element, 'cold'),
    flame_herald: (p) => assert.equal(p.allies[0].enemyLeaderBuff?.element, 'fire'),
    banner_bearer: (p) => assert.ok(p.allies[0].enemyLeaderBuff?.ccResist),
  };
  for (const [id, check] of Object.entries(cases)) {
    const pack = makePack(id);
    if (id === 'necromancer') pack.world.corpses.push({ x: 0.3, y: 0.2, arch: 'skeleton', maxHp: 60, level: 12, enemyPackId: 9 });
    pack.leader.hp = id === 'berserker' ? 60 : 100;
    assert.equal(updatePackLeader(pack.leader, pack.player, 7, 0.02), true, `${id} should activate its ability`);
    check(pack);
    if (id !== 'healer') assert.equal(pack.leader.packLeaderRuneColor, PACK_LEADERS[id].color);
  }

  const herald = makePack('death_herald');
  herald.allies[0].dead = true;
  packLeaderAllyKilled(herald.allies[0]);
  assert.ok(herald.allies[1].enemyLeaderBuff?.damage, 'Death Herald reacts to an ally death');
  herald.player.status.chill = { src: herald.leader };
  herald.player.packLeaderDamageDownUntil = 102.6;
  herald.player.packLeaderDamageSource = herald.leader;
  packLeaderKilled(herald.leader);
  assert.equal(herald.allies[1].enemyLeaderBuff, null, 'leader death immediately clears group buffs');
  assert.equal(herald.player.status.chill, null, 'leader death clears its debuff');
  assert.equal(herald.player.packLeaderDamageDownUntil, 0);
  const shield = makePack('shieldbearer');
  updatePackLeader(shield.leader, shield.player, 7, 0.02);
  packLeaderKilled(shield.leader);
  assert.equal(shield.allies[0].enemyLeaderGuardPool, 0, 'leader death clears the shield pool');
} finally { Math.random = savedRandom; }

console.log('Pack leader spawn eligibility, all fifteen rune colors, abilities, and leader death cleanup OK');
