// Read-only checks for the complete dungeon-event catalog, rarity roll and room marker setup.
// Usage: node tools/tests/dungeonevents.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DUNGEON_EVENTS, EVENT_RARITY_CHANCES, portalChoicePositions, rollDungeonEvent, setupDungeonEvent } from '../../src/game/dungeonevents.js';
import { G } from '../../src/state.js';

assert.equal(DUNGEON_EVENTS.length,50,'all 50 proposed events are represented');
assert.equal(new Set(DUNGEON_EVENTS.map(e=>e.id)).size,50,'event ids are unique');
assert.deepEqual([...new Set(DUNGEON_EVENTS.map(e=>e.category))].sort(),['environment','legendary','monsters','portal','supernatural','treasure','world']);
for(const category of ['treasure','environment','monsters','portal','supernatural','world','legendary']) assert.ok(DUNGEON_EVENTS.some(e=>e.category===category),`category ${category} is populated`);
assert.equal(Object.values(EVENT_RARITY_CHANCES).reduce((a,b)=>a+b,0),100,'rarity weights total 100%');
for(const event of DUNGEON_EVENTS) assert.ok(EVENT_RARITY_CHANCES[event.rarity],`${event.id} has a valid rarity`);
const implementation=await readFile(new URL('../../src/game/dungeonevents.js',import.meta.url),'utf8');
for(const mode of new Set(DUNGEON_EVENTS.map(e=>e.mode))) assert.ok(implementation.includes(`case '${mode}'`),`${mode} has an implementation`);
assert.match(implementation,/world\.portals\.push\(portal\)/,'event gates are registered as portals and use portal hit geometry');
assert.doesNotMatch(implementation,/world\.chests\.push\(portal\)/,'event gates are not misclassified as chests');
const controls=await readFile(new URL('../../src/game/controls.js',import.meta.url),'utf8');
assert.ok(controls.indexOf('isDungeonEventPortal')<controls.indexOf('for (const n of w.npcs)'), 'visible event portals get click priority over nearby scene objects');

const choiceWorld={player:{x:12,y:12},map:{walkable:()=>true,circleFree:()=>true,findPath:()=>[[12,12]]}};
const choiceRoom={x:8,y:8,w:8,h:8,mx:12,my:12};
const choices=portalChoicePositions(choiceWorld,choiceRoom,3,3.1);
assert.equal(choices.length,3,'Portal Roulette can place all three options on valid terrain');
assert.ok(choices.every(([x,y])=>x>=choiceRoom.x+0.35&&x<=choiceRoom.x+choiceRoom.w-0.35&&y>=choiceRoom.y+0.35&&y<=choiceRoom.y+choiceRoom.h-0.35),'roulette choices stay within the event chamber');
assert.ok(choices.every(([x,y])=>choiceWorld.map.walkable(x,y)&&choiceWorld.map.findPath(choiceWorld.player.x,choiceWorld.player.y,x,y,12000)),'roulette choices are reachable from the player');
const obstructedWorld={player:{x:12,y:12},map:{walkable:()=>true,circleFree:()=>true,findPath:(_x,_y,x)=>x<=13?[[12,12]]:null}};
const reachableChoices=portalChoicePositions(obstructedWorld,choiceRoom,3,3.1);
assert.ok(reachableChoices.length>0&&reachableChoices.every(([x])=>x<=13),'roulette does not place a choice beyond a blocked route');

const sample=Object.fromEntries(Object.keys(EVENT_RARITY_CHANCES).map(r=>[r,0]));
for(let i=0;i<20000;i++)sample[rollDungeonEvent().rarity]++;
for(const [rarity,weight] of Object.entries(EVENT_RARITY_CHANCES)) {
  const actual=sample[rarity]/20000*100;
  assert.ok(Math.abs(actual-weight)<1.2,`${rarity} roll ${actual.toFixed(2)}% is near ${weight}%`);
}

const oldWorld=G.world;
try {
  for(const event of DUNGEON_EVENTS) {
    const room={x:8,y:9,w:8,h:8,mx:12,my:13,eventRoom:true};
    const world={kind:'dungeon',biome:{id:'test'},depth:1,map:{},rooms:[room],chests:[]};
    G.world=world;
    const marker=setupDungeonEvent(world,room,{id:event.id});
    assert.equal(marker.id,event.id,`${event.id} is selectable by its id`);
    assert.equal(world.eventRoom,room,`${event.id} retains its room activation area`);
    assert.equal(marker.triggered,false,`${event.id} waits for the player to enter its room`);
  }
  const map={w:32,h:32,walkable:()=>true,walkableTile:()=>true,findPath:()=>true};
  for(const id of ['overworld','skyship','seaship','breach','rift']) {
    const area={kind:'dungeon',biome:{id,overworld:id==='overworld'},depth:1,map,rooms:[],chests:[],portals:[]};
    G.world=area;
    const event=setupDungeonEvent(area,null,{id:'golden_rain',start:[2.5,2.5]});
    assert.ok(event,`${id} gets an event record without a room grid`);
    assert.ok(Math.hypot(area.eventRoom.mx-2.5,area.eventRoom.my-2.5)>=8,`${id} event room is away from the entrance`);
  }
} finally { G.world=oldWorld; }
console.log(`OK - ${DUNGEON_EVENTS.length} catalogued and implemented events, seven categories, rarity roll, and all event-room markers`);
