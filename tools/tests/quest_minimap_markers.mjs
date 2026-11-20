import assert from 'node:assert/strict';

globalThis.document ||= { addEventListener() {}, fonts: { check: () => true }, createElement: () => ({ getContext: () => ({}) }) };
globalThis.window ||= { addEventListener() {} };
globalThis.Image ||= class { addEventListener() {} set src(_value) {} };
const { drawMinimap } = await import('../../src/game/render.js');
const { G } = await import('../../src/state.js');
const { setupScenario } = await import('../../src/game/scenarios.js');

function makeCanvas() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_target, key) => (...args) => calls.push([key, ...args]),
    set: (_target, _key, _value) => true,
  });
  return { width: 220, height: 160, calls, getContext: () => ctx };
}
function makeWorld(extra = {}) {
  return {
    kind: 'dungeon', player: { x: 12, y: 12 }, map: { w: 30, h: 30, t: new Uint8Array(900), seen: new Uint8Array(900) },
    portals: [], chests: [], npcs: [], creatures: [], depthQuests: [], ...extra,
  };
}
function markerCanvasPosition(world, canvas, target) {
  const map = world.map, s = Math.max(2, Math.min(canvas.width / (map.w + map.h), canvas.height / ((map.w + map.h) / 2)) * 0.95);
  const sx = canvas.width / 2 + (target.x - target.y) * s - ((map.w - map.h) * s) / 2;
  const sy = canvas.height / 2 - ((map.w + map.h) / 4) * s + ((target.x + target.y) * s) / 2 + s * 0.3;
  return [sx, sy];
}

// Available quest givers are marked even where map fog has not revealed their tile.
const giver = { x: 21, y: 9, questIndicator: '!' };
const available = { state: 'available', npc: giver, objectiveTarget: null };
giver.depthQuest = available;
const giverCanvas = makeCanvas();
drawMinimap(makeWorld({ npcs: [giver], depthQuests: [available] }), 0.21, giverCanvas, true);
assert.ok(giverCanvas.calls.some(([method, text]) => method === 'fillText' && text === '!'), 'available giver gets a visible gold exclamation glyph');

// Accepted objectives use the distinctive target/crosshair marker; moving targets are resolved at their current location.
const leader = { x: 16, y: 10, name: 'Pack Leader: War Shaman' };
const active = { state: 'accepted', title: 'Pack Leader Hunt', objectiveTarget: leader };
const activeCanvas = makeCanvas();
const activeWorld = makeWorld({ depthQuests: [active] });
drawMinimap(activeWorld, 0.21, activeCanvas, true);
assert.ok(activeCanvas.calls.some(([method, text]) => method === 'strokeText' && text === leader.name), 'active target receives its identification label');
const [targetSx, targetSy] = markerCanvasPosition(activeWorld, activeCanvas, leader);
assert.ok(activeCanvas.calls.some(([method, x, y]) => method === 'translate' && Math.abs(x - targetSx) < 0.01 && Math.abs(y - targetSy) < 0.01), 'target marker is placed at the live enemy position');
leader.x = 19;
const movedCanvas = makeCanvas();
const movedWorld = makeWorld({ depthQuests: [active] });
drawMinimap(movedWorld, 0.21, movedCanvas, true);
const [movedSx, movedSy] = markerCanvasPosition(movedWorld, movedCanvas, leader);
assert.ok(movedCanvas.calls.some(([method, x, y]) => method === 'translate' && Math.abs(x - movedSx) < 0.01 && Math.abs(y - movedSy) < 0.01), 'marker follows the moving enemy');

// Objective-complete return quests target the NPC, while terminal states remove the marker.
const returnNpc = { x: 8, y: 17, name: 'Monster Hunter' };
active.state = 'objective-complete'; active.objectiveTarget = returnNpc;
const returnCanvas = makeCanvas();
drawMinimap(makeWorld({ depthQuests: [active] }), 0.21, returnCanvas, true);
assert.ok(returnCanvas.calls.some(([method, text]) => method === 'strokeText' && text === returnNpc.name), 'return objective points to the quest giver');
active.state = 'rewarded';
const doneCanvas = makeCanvas();
drawMinimap(makeWorld({ depthQuests: [active] }), 0.21, doneCanvas, true);
assert.ok(!doneCanvas.calls.some(([method, text]) => method === 'strokeText' && text === returnNpc.name), 'rewarded quest has no stale objective marker');

// Scenario captives share their existing marker action with direct NPC interaction.
G.char = {};
G.world = null;
const rooms = Array.from({ length: 18 }, (_, i) => ({ x: i * 8 + 5, y: 6, w: 5, h: 5, mx: i * 8 + 7, my: 8 }));
const scenarioWorld = {
  kind: 'dungeon', depth: 10, raid: false, player: { x: 1, y: 1 }, biome: { id: 'catacombs', overworld: false, roster: ['skeleton'] }, roster: ['skeleton'],
  map: { w: 200, h: 60, t: new Uint8Array(12_000).fill(1), seen: new Uint8Array(12_000), walkable: () => true, randomNear: (x, y) => [x, y], findPath: () => [[1, 1]] },
  rooms, portals: [], npcs: [], creatures: [], chests: [], props: [], add(monster) { this.creatures.push(monster); }, addLoot() {},
};
setupScenario(scenarioWorld, [1, 1], 1); // Catacombs' captive set piece.
const scenarioGiver = scenarioWorld.scenario.questNpcs[0];
const scenarioGiverCanvas = makeCanvas();
drawMinimap(scenarioWorld, 0.21, scenarioGiverCanvas, true);
assert.ok(scenarioGiverCanvas.calls.some(([method, text]) => method === 'fillText' && text === '!'), 'scenario quest giver is marked before discovery');
scenarioGiver.use();
assert.equal(scenarioWorld.scenario.depthQuest.state, 'accepted');
assert.equal(scenarioWorld.scenario.got, 1, 'speaking to a scenario captive performs its existing rescue action');
assert.equal(scenarioWorld.scenario.questObjectives[0].opened, true);
const scenarioObjectiveCanvas = makeCanvas();
drawMinimap(scenarioWorld, 0.21, scenarioObjectiveCanvas, true);
assert.ok(scenarioObjectiveCanvas.calls.filter(([method]) => method === 'arc').length > 0, 'remaining scenario objectives render after rescue begins');

console.log('Quest giver and active objective minimap markers passed.');


