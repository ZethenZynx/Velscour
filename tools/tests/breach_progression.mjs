// The campaign inserts Breach floors before the Boss Rooms at depths 10, 20, …, 500.
import assert from 'node:assert/strict';
import { breachInterludeFloor } from '../../src/data/breach.js';

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
