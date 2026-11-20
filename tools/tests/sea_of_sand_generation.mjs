// Node-only seeded reachability check for Sea of Sand's outdoor map generator.
//   node tools/tests/sea_of_sand_generation.mjs
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'assets/tiles/sea_of_sand/pack.json'),'utf8'));
globalThis.fetch=async()=>({ok:true,json:async()=>pack});
globalThis.Image=class { set src(_) { queueMicrotask(()=>this.onload?.()); } };
const {loadSeaOfSandPack,seaOfSandFrames}=await import(pathToFileURL(path.join(root,'src/gfx/seaofsand.js')));
const {BIOME_BY_ID}=await import(pathToFileURL(path.join(root,'src/data/biomes.js')));
const {generateOverworld,SEA_OF_SAND_OBJECTIVE_COUNT}=await import(pathToFileURL(path.join(root,'src/world/overworld.js')));
const {SAND_SCATTER,SAND_TREES,SAND_CREATURES,SAND_BOSSES}=await import(pathToFileURL(path.join(root,'src/data/seaofsand.js')));
const {rollSandScenarioRewards}=await import(pathToFileURL(path.join(root,'src/game/sandrewards.js')));
await loadSeaOfSandPack();
const expected={floor:60,scatter:40,tree:18,monster:60,boss:10,cliff:216};
for(const [category,count] of Object.entries(expected))if(seaOfSandFrames(category).length!==count)throw Error(`${category}: expected ${count}`);
for(const [category,names] of [['scatter',SAND_SCATTER],['tree',SAND_TREES]])
  for(const name of names)if(!seaOfSandFrames(category).some(f=>f.name.endsWith('_'+name)))throw Error(`missing ${category} frame ${name}`);
if(SAND_CREATURES.length!==60||SAND_BOSSES.length!==10)throw Error('bestiary roster size mismatch');
const first=rollSandScenarioRewards(0,70,()=>.99),second=rollSandScenarioRewards(1,70,()=>.99),last=rollSandScenarioRewards(4,70,()=>.05),plain=rollSandScenarioRewards(4,70,()=>.5),early=rollSandScenarioRewards(4,10,()=>.05);
if(first.items.length!==1||first.items[0].rarity!==3||first.items[0].slot!=='weapon')throw Error('first beat weapon reward mismatch');
if(second.items.length!==1||second.items[0].rarity!==3||second.items[0].slot!=='offhand'||second.items[0].base!=='shield')throw Error('second beat shield reward mismatch');
if(last.items.length!==2||last.items[0].rarity!==4||last.items[1].rarity!==5||Math.abs(last.mythicChance-.1)>1e-9)throw Error('five-beat reward roll mismatch');
if(plain.items.length!==1||plain.items[0].rarity!==3)throw Error('five-beat plain reward mismatch');
if(early.items.length!==1||early.items[0].rarity!==2||early.mythicChance!==0)throw Error('item level 10 reward should step down to a Rare, no Mythic');
const biome=BIOME_BY_ID.sea_of_sand,counts=new Set(),scenarioIds=new Set(),routeShapes=new Set();let minCliffs=Infinity,minFree=Infinity;
if(SEA_OF_SAND_OBJECTIVE_COUNT!==3)throw Error(`Sea of Sand objective count constant must be 3, got ${SEA_OF_SAND_OBJECTIVE_COUNT}`);
for(let n=1;n<=100;n++){
  const gen=generateOverworld(13,biome,n*32+1),m=gen.map,I=(x,y)=>y*m.w+x;
  counts.add(gen.scenarioCount);
  scenarioIds.add(gen.scenarioId);
  if(gen.scenarioCount!==3||gen.scenarioSites.length!==3)throw Error(`seed ${n} generated ${gen.scenarioCount} required objectives`);
  if(n<=12)routeShapes.add(Array.from(m.v,(v,i)=>v===15?i:null).filter(i=>i!==null).join(','));
  minCliffs=Math.min(minCliffs,gen.props.filter(p=>p.spr.cliff).length);
  minFree=Math.min(minFree,m.block.reduce((sum,v)=>sum+!v,0));
  const seen=new Uint8Array(m.w*m.h),q=[I(Math.floor(gen.start[0]),Math.floor(gen.start[1]))];seen[q[0]]=1;
  for(let a=0;a<q.length;a++){const i=q[a],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=I(nx,ny);if(m.walkableTile(nx,ny)&&!seen[j]){seen[j]=1;q.push(j);}}}
  for(const [x,y] of [gen.exit,...gen.scenarioSites])if(!seen[I(Math.floor(x),Math.floor(y))])throw Error(`unreachable seed ${n} at ${x},${y}`);
}
if(counts.size!==1||!counts.has(3))throw Error(`expected exactly three scenario areas for every seed, got ${[...counts]}`);
if(scenarioIds.size<2)throw Error('repeated visits should vary the selected scenario objectives');
if(minCliffs<100)throw Error(`cliff maze too sparse (${minCliffs})`);
if(minFree<1800)throw Error(`not enough open combat area (${minFree})`);
const {G}=await import(pathToFileURL(path.join(root,'src/state.js')));
const {createSeaOfSandScenario}=await import(pathToFileURL(path.join(root,'src/game/seaofsand.js')));
G.char={seaOfSandRuns:{'13':{seed:1,completed:2,rewarded:2}}};
const resumeGen=generateOverworld(13,biome,0x71c03),resumeWorld={depth:13,biome,map:resumeGen.map,player:null,portals:[],props:[],npcs:[],chests:[],creatures:[],add(){},addLoot(){}};
const resumed=createSeaOfSandScenario(resumeWorld,resumeGen,biome);
if(resumed.total!==3||resumed.beat!==2||resumed.phase!=='areas')throw Error(`an existing two-area save must resume at the third of three (${resumed.beat}/${resumed.total}, ${resumed.phase})`);
console.log('Sea of Sand generation OK',JSON.stringify({seeds:100,requiredObjectives:SEA_OF_SAND_OBJECTIVE_COUNT,areaCounts:[...counts].sort(),scenarioVariants:scenarioIds.size,resumedVisit:`${resumed.beat+1}/${resumed.total}`,minCliffs,minFree,frames:expected}));
