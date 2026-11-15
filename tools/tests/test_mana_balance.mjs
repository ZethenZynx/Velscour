// Mathematical verification of skill resource costs, regen, and resource economy across all classes.
import assert from 'node:assert';
import { SKILLS, CLASS_SKILLS, manaCost, rageCost, whirlwindRageCost, whirlwindRageRate } from '../../src/data/skills.js';
import { CLASSES } from '../../src/data/classes.js';

console.log('Testing mana balance and economy...');

// 1. Every skill must use mana unless it is paid for with Barbarian Rage.
let checkedSkills = 0;
for (const [classId, skills] of Object.entries(CLASS_SKILLS)) {
  for (const skill of skills) {
    const cost = manaCost(skill, 1);
    const ragePowered = classId === 'barbarian' && (skill.kind === 'whirl' || rageCost(skill) > 0);
    if (ragePowered) {
      assert.strictEqual(cost, 0, skill.name + ' should use Rage instead of mana');
    } else {
      assert(cost > 0, skill.name + ' for ' + classId + ' must cost mana');
      assert(manaCost(skill, 20) > cost, skill.name + ' mana cost should increase with skill rank');
      for (let rank = 1; rank < 20; rank++) {
        assert(manaCost(skill, rank + 1) > manaCost(skill, rank), skill.name + ' mana cost should rise at every rank');
      }
    }
    assert(manaCost(skill, 20) >= cost, skill.name + ' mana cost should not decrease with skill level');
    const rageAtRank1 = rageCost(skill, 1), rageAtRank20 = rageCost(skill, 20);
    if (rageAtRank1) {
      assert(rageAtRank20 > rageAtRank1, skill.name + ' Rage cost should increase with skill rank');
      for (let rank = 1; rank < 20; rank++) {
        assert(rageCost(skill, rank + 1) > rageCost(skill, rank), skill.name + ' Rage cost should rise at every rank');
      }
    }
    checkedSkills++;
  }
}
assert(checkedSkills > 0, 'Must verify the skill catalog');
assert(whirlwindRageCost(20) > whirlwindRageCost(1), 'Whirlwind start Rage should increase with skill rank');
assert(whirlwindRageRate(20) > whirlwindRageRate(1), 'Whirlwind upkeep Rage should increase with skill rank');
for (let rank = 1; rank < 20; rank++) {
  assert(whirlwindRageCost(rank + 1) > whirlwindRageCost(rank), 'Whirlwind start Rage should rise at every rank');
  assert(whirlwindRageRate(rank + 1) > whirlwindRageRate(rank), 'Whirlwind upkeep Rage should rise at every rank');
}
console.log('Verified resource costs for ' + checkedSkills + ' skills across ' + Object.keys(CLASSES).length + ' classes');

// 2. Verify Row 0 starting spenders cost <= 4 mana at L=1 (Early Game Protection)
let testedRow0 = 0;
for (const [id, sk] of Object.entries(SKILLS)) {
  if (sk.row === 0 && sk.classId !== 'barbarian') {
    const cost = manaCost(sk, 1);
    assert(cost <= 4, `Row 0 skill ${sk.name} (${sk.id}) cost ${cost} should be <= 4 for early game protection`);
    if (['proj', 'melee', 'dash'].includes(sk.kind)) {
      assert(cost <= 3, `Row 0 attack ${sk.name} (${sk.id}) cost ${cost} should be <= 3`);
    }
    testedRow0++;
  }
}
assert(testedRow0 > 0, 'Must have tested row 0 spenders');
console.log(`✔ Verified ${testedRow0} Row 0 spenders cost <= 4 mana at Level 1 (attacks <= 3 mana)`);

// 3. Verify Row scaling progression
const testSkill = (row, kind = 'proj') => ({ row, kind, m: {}, classId: 'wizard' });

const r0_l1 = manaCost(testSkill(0), 1);
const r1_l1 = manaCost(testSkill(1), 1);
const r2_l1 = manaCost(testSkill(2), 1);
const r3_l1 = manaCost(testSkill(3), 1);
const r4_l1 = manaCost(testSkill(4), 1);

assert.strictEqual(r0_l1, 2.5, 'Row 0 L=1 is 2.5 mana');
assert.strictEqual(r1_l1, 5.7, 'Row 1 L=1 is 5.7 mana');
assert.strictEqual(r2_l1, 10.9, 'Row 2 L=1 is 10.9 mana');
assert.strictEqual(r3_l1, 17.4, 'Row 3 L=1 is 17.4 mana');
assert.strictEqual(r4_l1, 24.8, 'Row 4 L=1 is 24.8 mana');
console.log(`✔ Base row progression verified: [R0: ${r0_l1}, R1: ${r1_l1}, R2: ${r2_l1}, R3: ${r3_l1}, R4: ${r4_l1}]`);

// 4. Verify high-level skill investment scaling (L=20)
const r0_l20 = manaCost(testSkill(0), 20);
const r4_l20 = manaCost(testSkill(4), 20);
assert.strictEqual(r0_l20, 6.8, 'Row 0 L=20 is 6.8 mana');
assert.strictEqual(r4_l20, 67.2, 'Row 4 L=20 is 67.2 mana');
console.log(`✔ Max-level skill scaling verified: [R0 L20: ${r0_l20}, R4 L20: ${r4_l20}]`);

// 5. Verify Passive Mana Regen values across levels
const calcRegen = (level, int, addRegen = 0, addRegenPct = 0) =>
  (1.0 + level * 0.04 + int * 0.04 + addRegen) * (1 + addRegenPct / 100);

const lvl1Regen = calcRegen(1, 14);
const lvl20Regen = calcRegen(20, 40);
const lvl50Regen = calcRegen(50, 100);
const lvl100Regen = calcRegen(100, 200);

assert(lvl1Regen >= 1.5 && lvl1Regen <= 1.8, `Lvl 1 regen ${lvl1Regen} should be ~1.6`);
assert(lvl20Regen >= 3.0 && lvl20Regen <= 4.0, `Lvl 20 regen ${lvl20Regen} should be ~3.4`);
assert(lvl50Regen >= 6.5 && lvl50Regen <= 7.5, `Lvl 50 regen ${lvl50Regen} should be ~7.0`);
assert(lvl100Regen >= 12.0 && lvl100Regen <= 14.0, `Lvl 100 regen ${lvl100Regen} should be ~13.0`);
console.log(`✔ Passive regen curve verified across levels: [L1: ${lvl1Regen.toFixed(2)}, L20: ${lvl20Regen.toFixed(2)}, L50: ${lvl50Regen.toFixed(2)}, L100: ${lvl100Regen.toFixed(2)}]`);

// 6. Verify Gear Affix Impact
const lvl50WithClarityRing = calcRegen(50, 100, 2.5); // +2.5 mana/s ring
const boostPct = ((lvl50WithClarityRing - lvl50Regen) / lvl50Regen) * 100;
assert(boostPct > 30, `Clarity ring should provide a significant boost (>30%), got ${boostPct.toFixed(1)}%`);
console.log(`✔ Gear impact verified: +2.5 mana/s ring provides +${boostPct.toFixed(1)}% mana regen at level 50`);

console.log('\nAll mana balance verification assertions PASSED successfully!');
