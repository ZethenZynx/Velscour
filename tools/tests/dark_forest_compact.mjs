// Node-only contract checks for the compressed Dark Forest map.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const pack=json('assets/tiles/dark_forest/pack.json'),treeMeta=json('assets/tiles/dark_forest/trees.json');
globalThis.fetch=async(url)=>({ok:true,json:async()=>String(url).includes('trees.json')?treeMeta:pack});
globalThis.Image=class{set src(_) {queueMicrotask(()=>this.onload?.());}};
const imp=(p)=>import(pathToFileURL(path.join(root,p)));
const {loadDarkForestTrees}=await imp('src/gfx/darkforest.js');
const {BIOME_BY_ID}=await imp('src/data/biomes.js');
const {generateDarkForest,DF_W,DF_H}=await imp('src/world/darkforest.js');
await loadDarkForestTrees();
const dirs=['SE','SW','NE','NW'];
const slice=(arm='c')=>({arm,ox:0,oy:0,a:0,du:0,dv:0});
const walls=Object.fromEntries(Object.keys(pack.walls).map(f=>[f,Object.fromEntries(Array.from({length:16},(_,i)=>[i,[[slice()]]]))]));
const arches=Object.fromEntries(Object.keys(pack.arches).map(d=>[d,Object.fromEntries(dirs.map(dir=>[dir,[slice()]]))]));
const doors=Object.fromEntries(Object.keys(pack.doors).map(d=>[d,Object.fromEntries(dirs.map(dir=>[dir,{closed:[slice('L'),slice('R')],open:[slice('L'),slice('R'),slice('leaf')]}]))]));
const names=new Set(pack.floors.map(f=>f.name));
for(const n of ['ancient_paving','gravel_wash','broken_path_stones','mossy_cobbles','stepping_stones','gravel_path','shale_chips','packed_mud','cart_ruts','deer_tracks','sunken_rune','marsh_reeds','dark_puddle','wet_clay','damp_moss','spider_silk','beetle_shells','black_fungi','old_camp_ash','bark_fragments','thorn_litter','torn_roots','ancient_bones','skeletal_remains','stone_cairn_base','pale_mushrooms','white_petals','blue_spores','tangled_twigs','wolf_tracks','claw_gouges','feather_scatter','charred_patch','burnt_roots','ritual_spiral','green_lichen','poison_moss','crushed_berries','scattered_acorns','hoof_marks','arrow_debris'])names.add(n);
const tileset={pack:'dark_forest',k:1,floors:[...names].map(name=>({name})),scatter:pack.scatter.map(s=>({name:s.name,block:s.block})),families:Object.keys(walls),walls,arches,doors};
const biome=BIOME_BY_ID.dark_forest;
const seeds=process.argv[2]!=null?+process.argv[2]:12;
for(let n=1;n<=seeds;n++){
 const g=generateDarkForest(7,biome,tileset,n*7717+3),m=g.map;
 if(m.w!==DF_W||m.h!==DF_H||m.w!==48||m.h!==48)throw Error('incorrect map size '+m.w+'x'+m.h);
 const seen=new Uint8Array(m.w*m.h),I=(x,y)=>Math.floor(y)*m.w+Math.floor(x),q=[I(...g.start)];seen[q[0]]=1;
 for(let h=0;h<q.length;h++){const i=q[h],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,j=I(X,Y);if(X>=0&&Y>=0&&X<m.w&&Y<m.h&&!seen[j]&&m.walkableTile(X,Y)){seen[j]=1;q.push(j);}}}
 const objectives=[g.exit,...g.glades.flatMap(v=>[v.center,v.shrine,...v.sites]),g.heart.center,g.heart.shrine,...g.heart.sites,...g.chests.map(c=>[c.x,c.y])];
 for(const p of objectives)if(!seen[I(...p)])throw Error('unreachable point in seed '+n+': '+p);
 if(g.trees.some(t=>m.walkable(t.x,t.y)))throw Error('tree on a walkable tile in seed '+n);
 if(g.glades.length!==5||g.labyrinths.length<3)throw Error('missing forest objectives in seed '+n);
}
console.log('PASS compact Dark Forest: '+seeds+' seeds, '+DF_W+'x'+DF_H+', all objectives connected');

