// Read-only checks for the complete dungeon-event catalog, rarity roll and room marker setup.
// Usage: node tools/tests/dungeonevents.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DUNGEON_EVENTS, EVENT_RARITY_CHANCES, rollDungeonEvent, setupDungeonEvent } from '../../src/game/dungeonevents.js';
import { G } from '../../src/state.js';

assert.equal(DUNGEON_EVENTS.length,50,'all 50 proposed events are represented');
assert.equal(new Set(DUNGEON_EVENTS.map(e=>e.id)).size,50,'event ids are unique');
assert.deepEqual([...new Set(DUNGEON_EVENTS.map(e=>e.category))].sort(),['environment','legendary','monsters','portal','supernatural','treasure','world']);
for(const category of ['treasure','environment','monsters','portal','supernatural','world','legendary']) assert.ok(DUNGEON_EVENTS.some(e=>e.category===category),`category ${category} is populated`);
assert.equal(Object.values(EVENT_RARITY_CHANCES).reduce((a,b)=>a+b,0),100,'rarity weights total 100%');
for(const event of DUNGEON_EVENTS) assert.ok(EVENT_RARITY_CHANCES[event.rarity],`${event.id} has a valid rarity`);
const implementation=await readFile(new URL('../../src/game/dungeonevents.js',import.meta.url),'utf8');
for(const mode of new Set(DUNGEON_EVENTS.map(e=>e.mode))) assert.ok(implementation.includes(`case '${mode}'`),`${mode} has an implementation`);

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
    assert.equal(marker.event.id,event.id,`${event.id} is selectable by its id`);
    assert.ok(marker.label.includes(event.name),`${event.id} is visibly named`);
    assert.equal(world.chests.length,1,`${event.id} creates one room interaction`);
    assert.equal(marker.isDungeonEvent,true,`${event.id} is marked as an event, not a shrine`);
  }
  const map={w:32,h:32,walkable:()=>true,walkableTile:()=>true,findPath:()=>true};
  for(const id of ['overworld','skyship','seaship','breach','rift']) {
    const area={kind:'dungeon',biome:{id,overworld:id==='overworld'},depth:1,map,rooms:[],chests:[],portals:[]};
    G.world=area;
    const marker=setupDungeonEvent(area,null,{id:'golden_rain',start:[2.5,2.5]});
    assert.ok(marker,`${id} gets an event marker without a room grid`);
    assert.ok(Math.hypot(marker.x-2.5,marker.y-2.5)>=8,`${id} event marker is away from the entrance`);
  }
} finally { G.world=oldWorld; }
console.log(`OK - ${DUNGEON_EVENTS.length} catalogued and implemented events, seven categories, rarity roll, and all event-room markers`);
