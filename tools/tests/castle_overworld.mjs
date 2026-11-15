// Compact Castle contract and navigation checks across variants.
// Run: node tools/tests/castle_overworld.mjs [seeds]
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pack=json('assets/tiles/castle/pack.json'),trees=json('assets/tiles/dark_forest/trees.json'),ramparts=json('assets/tiles/castle/ramparts.json');
globalThis.fetch=async(url)=>({ok:true,json:async()=>String(url).includes('dark_forest')?trees:String(url).includes('ramparts')?ramparts:pack});
globalThis.Image=class{set src(_) {queueMicrotask(()=>this.onload?.());}};
const imp=(p)=>import(pathToFileURL(path.join(root,p)));
const {loadCastlePack}=await imp('src/gfx/castle.js');
const {loadDarkForestTrees}=await imp('src/gfx/darkforest.js');
const {A}=await imp('src/core/assets.js');
const {BIOME_BY_ID}=await imp('src/data/biomes.js');
const {generateOverworld}=await imp('src/world/overworld.js');
const {CASTLE_SIZE}=await imp('src/world/castleworld.js');
const {CASTLE_VARIANTS}=await imp('src/data/castles.js');
await loadCastlePack();await loadDarkForestTrees();
A.town={meta:json('assets/tiles/town/town.json'),objects:{},ground:{}};
const I=(m,x,y)=>Math.floor(y)*m.w+Math.floor(x);
const flood=(m,start)=>{const seen=new Uint8Array(m.w*m.h),q=[I(m,start[0],start[1])];seen[q[0]]=1;
 for(let j=0;j<q.length;j++){const i=q[j],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=I(m,nx,ny);
  if(nx>=0&&ny>=0&&nx<m.w&&ny<m.h&&!seen[k]&&m.walkableTile(nx,ny)){seen[k]=1;q.push(k);}}}return seen;};
const seeds=process.argv[2]!=null?+process.argv[2]:4;
let runs=0;
for(const V of CASTLE_VARIANTS){
 for(let k=0;k<seeds;k++){
  const gen=generateOverworld(19,BIOME_BY_ID.castle,k*1777+V.id.length*131+31,V.id),m=gen.map,tag=V.id+' seed '+k;
  if(m.w!==CASTLE_SIZE[0]||m.h!==CASTLE_SIZE[1]||m.w!==84||m.h!==76)throw Error(tag+': expected 84x76 compact board, got '+m.w+'x'+m.h);
  if(!gen.variant?.id||gen.scenarioId<0||gen.scenarioId>=20)throw Error(tag+': missing compact Castle metadata');
  if(!m.walkable(...gen.start)||!m.walkable(...gen.exit))throw Error(tag+': blocked start or exit');
  const seen=flood(m,gen.start);
  for(const [x,y] of [gen.exit,...gen.sites])if(!seen[I(m,x,y)])throw Error(tag+': unreachable objective at '+x+','+y);
  if(!gen.props.length||!m.road?.some(Boolean))throw Error(tag+': compact castle dressing or approach road missing');
  runs++;
 }
}
console.log('PASS compact Castle: '+runs+' maps across '+CASTLE_VARIANTS.length+' variants ('+CASTLE_SIZE.join('x')+' tiles)');

