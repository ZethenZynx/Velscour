import assert from 'node:assert/strict';
import { chestSpriteHit, portalSpriteHit, findNearbyInteractableSpot } from '../../src/core/interactable-hit.js';

const project = (x, y) => [x * 10, y * 10];
const chest = { x: 4, y: 7 };
assert.equal(chestSpriteHit(chest, 40, 40, 1, project), true, 'chest artwork above its ground anchor is clickable');
assert.equal(chestSpriteHit(chest, 70, 40, 1, project), false, 'chest hit area stays bounded');
assert.equal(chestSpriteHit(chest, 40, 40, 2, project), true, 'hit area scales with zoom');
const portal = { x: 3, y: 2 };
assert.equal(portalSpriteHit(portal, 30, -50, 1, project), true, 'portal artwork can be clicked above its ground anchor');
assert.equal(portalSpriteHit(portal, 100, -50, 1, project), false, 'portal hit area stays bounded');

const relocated = findNearbyInteractableSpot(0, 0, (x, y) => x >= 0.5 && x <= 1 && Math.abs(y) < 0.3, 2, 0.25);
assert.ok(relocated, 'blocked interactable finds nearby clear terrain');
assert.ok(relocated[0] >= 0.5 && relocated[0] <= 1 && Math.abs(relocated[1]) < 0.3, 'relocation obeys its terrain validator');
assert.equal(findNearbyInteractableSpot(0, 0, () => false, 1, 0.25), null, 'unrelocatable object is reported instead of silently left blocked');
console.log('Interactable hit geometry and safe-placement checks passed.');
