// Ordinary rat movement stays within radius-aware map collision through walls, obstacles, and frame spikes.
// Run: node tools/tests/rat_boundaries.mjs
import { TileMap } from '../../src/world/map.js';
import { walkRat } from '../../src/game/encounters.js';

const radius = 0.24;
const failures = [];
const makeMap = () => {
  const map = new TileMap(26, 18);
  for (let y = 1; y < 17; y++) for (let x = 1; x < 25; x++) map.t[y * map.w + x] = 1;
  return map;
};
const ratAt = (x, y, id = 0) => ({ x, y, r: 0.3, id, path: null, repath: 0, walking: false, walkT: 0, flip: false });
const assertOnFloor = (map, rat, scenario, step) => {
  if (!map.circleFree(rat.x, rat.y, radius)) failures.push(`${scenario}: rat ${rat.id} overlapped a wall or boundary at step ${step}`);
};

const map = makeMap();
// A solid divider with one opening exercises routed movement, wall collision, and corners.
for (let y = 1; y < 17; y++) if (y !== 8) map.t[y * map.w + 12] = 0;
map.block[6 * map.w + 6] = 1;
const obstacleRoute = ratAt(3.5, 6.5);
for (let i = 0; i < 240; i++) {
  walkRat({ map }, obstacleRoute, [9.5, 6.5], 1.4, 1 / 30);
  assertOnFloor(map, obstacleRoute, 'obstacle avoidance', i);
}
if (Math.hypot(obstacleRoute.x - 9.5, obstacleRoute.y - 6.5) > 0.35) failures.push('obstacle avoidance: rat did not route around blocked tile');

const crossing = ratAt(3.5, 8.5);
let crossed = false;
for (let i = 0; i < 900; i++) {
  walkRat({ map }, crossing, [21.5, 8.5], 3.6, 1 / 30);
  assertOnFloor(map, crossing, 'corridor and wall routing', i);
  if (crossing.x > 12.5) crossed = true;
}
if (!crossed) failures.push('corridor and wall routing: rat did not pass through the valid opening');

// Fleeing uses the same rat movement path, with its destination beyond a wall.
const fleeing = ratAt(8.5, 5.5);
for (let i = 0; i < 180; i++) {
  const oldX = fleeing.x;
  walkRat({ map }, fleeing, [20.5, 5.5], 3.6, 1 / 30);
  assertOnFloor(map, fleeing, 'fleeing', i);
  if (oldX < 12 && fleeing.x > 13 && Math.floor(fleeing.y) !== 8) failures.push('fleeing: rat crossed the solid divider');
}

// Large frame-time spikes cannot tunnel through the map edge.
const spike = ratAt(23.45, 4.5);
walkRat({ map }, spike, [1.5, 4.5], 3.6, 5);
assertOnFloor(map, spike, 'large frame-time spike', 0);
if (Math.hypot(spike.x - 23.45, spike.y - 4.5) > 0.76) failures.push('large frame-time spike: movement was not bounded');

// A fully sealed wall leaves the rat in place; missing paths must never snap it to a goal.
const sealed = makeMap();
for (let y = 1; y < 17; y++) sealed.t[y * sealed.w + 12] = 0;
const trapped = ratAt(3.5, 4.5), start = [trapped.x, trapped.y];
walkRat({ map: sealed }, trapped, [21.5, 4.5], 3.6, 2);
if (Math.hypot(trapped.x - start[0], trapped.y - start[1]) > 0.01) failures.push('unreachable destination: rat snapped to goal');

// A group of rats moves at ordinary and fleeing speeds around the same geometry.
const crowd = Array.from({ length: 10 }, (_, i) => ratAt(3.5 + i * 0.35, 12.5, i));
for (let i = 0; i < 90; i++) for (const rat of crowd) {
  walkRat({ map }, rat, [21.5, 12.5], i % 2 ? 1.4 : 3.6, i % 17 === 0 ? 0.4 : 1 / 30);
  assertOnFloor(map, rat, 'group movement', i);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: rats route through openings, respect collision radius and obstacles, stay in bounds during frame spikes, wait when no path exists, and remain safe in groups.');
  console.log('Final positions:', [obstacleRoute, crossing, fleeing, spike, ...crowd].map((r) => `${r.id}@${r.x.toFixed(2)},${r.y.toFixed(2)}`).join(' | '));
}
