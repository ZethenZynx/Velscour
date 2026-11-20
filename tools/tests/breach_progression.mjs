// The campaign inserts Breach floors before the Boss Rooms at depths 10, 20, …, 500.
import assert from 'node:assert/strict';
import { breachInterludeFloor, breachObjectiveCount, breachIslandPlan, breachMapSpan } from '../../src/data/breach.js';

const cases = [
  [9, 0, 0],
  [10, 0, 1],
  [10, 1, 0],
  [20, 0, 1], // legacy save: catch up one floor at a time
  [20, 1, 2],
  [20, 2, 0],
  [500, 49, 50],
  [500, 50, 0],
  [15, 0, 0],
  [505, 49, 0],
];
for (const [depth, best, expected] of cases) {
  assert.equal(breachInterludeFloor(depth, best), expected, `Depth ${depth}, best Breach floor ${best}`);
}
console.log(`Passed ${cases.length} Breach campaign progression cases.`);

const tiers = [[1, 1], [5, 1], [6, 2], [10, 2], [11, 3], [15, 3], [16, 4], [20, 4], [21, 5], [50, 5]];
for (const [floor, expected] of tiers) {
  assert.equal(breachObjectiveCount(floor), expected, `Floor ${floor} objective count`);
  const plan = breachIslandPlan(floor);
  assert.equal(plan.objectives, expected);
  assert.equal(plan.medium + plan.large - 1, expected, `Floor ${floor} generated shrine count`);
  assert.equal(plan.small, expected, `Floor ${floor} island count progression`);
}
assert.ok(breachMapSpan(1) < breachMapSpan(21), 'early floors have a smaller placement area');
assert.equal(breachMapSpan(21), breachMapSpan(50), 'advanced floors retain the maximum map size');
console.log(`Passed ${tiers.length} objective-count and map-scaling cases.`);
