import assert from 'node:assert/strict';
import { updateCritterFacing, shouldFlipCritterSprite } from '../../src/game/critter-facing.mjs';

const critter = { facingRight: true, facingAngle: 0 };

assert.equal(updateCritterFacing(critter, 0, 0, 1, 0, 1), true);
assert.equal(critter.facingRight, true, 'rightward movement faces right');
assert.equal(critter.facingAngle, 0, 'rightward movement updates the eight-way facing angle');

assert.equal(updateCritterFacing(critter, 1, 0, 0, 0, 1), true);
assert.equal(critter.facingRight, false, 'leftward movement faces left');
assert.equal(shouldFlipCritterSprite(critter.facingRight, true), true, 'right-facing artwork flips to face left');
assert.equal(shouldFlipCritterSprite(true, false), true, 'left-facing artwork flips to face right');
assert.equal(shouldFlipCritterSprite(false, false), false, 'left-facing artwork stays unflipped when moving left');

const beforeAngle = critter.facingAngle;
assert.equal(updateCritterFacing(critter, 0, 0, 0.001, 0, 1), false, 'tiny drift does not change facing');
assert.equal(critter.facingRight, false, 'tiny drift preserves the last horizontal facing');
assert.equal(critter.facingAngle, beforeAngle, 'tiny drift preserves the last directional animation');
assert.equal(updateCritterFacing(critter, 0, 0, 0, 0, 0), false, 'zero-time update is ignored');

assert.equal(updateCritterFacing(critter, 0, 0, 0, 1, 1), true, 'vertical movement updates directional animation');
assert.equal(critter.facingRight, false, 'vertical movement preserves the last horizontal facing');
assert.equal(critter.facingAngle, Math.PI / 2);

console.log('gilded critter facing checks passed');
