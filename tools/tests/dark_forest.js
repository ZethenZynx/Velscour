// DARK FOREST smoke test: seeded map connectivity, a direct guardian encounter, and the opened exit.
const { openGame, report } = require('./harness');
const SHOTS = process.argv[2] !== 'noshots';
(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 860 });
  try {
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { generateDarkForest } = await import('/src/world/darkforest.js');
      const biome = BIOME_BY_ID.dark_forest;
      await game.loadLevelArt(biome);
      const { biomeTileSet } = await import('/src/core/assets.js');
      const tileset = biomeTileSet(biome), problems = [];
      for (let n = 1; n <= 40; n++) {
        const seed = n * 7717 + 3, g = generateDarkForest(7, biome, tileset, seed), m = g.map;
        if (m.w !== 192 || m.h !== 192) problems.push('wrong map size for seed ' + seed);
        if (m.walls.length || m.doors.length || g.glades || g.labyrinths) problems.push('legacy maze or trial data for seed ' + seed);
        if (g.spawns.filter((s) => s.rank === 'boss').length !== 1) problems.push('missing guardian for seed ' + seed);
        const packs = g.spawns.filter((s) => !['boss', 'raid'].includes(s.rank));
        const enemies = packs.reduce((sum, s) => sum + s.n, 0);
        if (packs.length < 80 || packs.length > 110 || enemies < 220 || enemies > 340) problems.push('wrong ambient population for seed ' + seed);
        const seen = new Uint8Array(m.w * m.h), I = (x,y) => Math.floor(y) * m.w + Math.floor(x), q=[I(...g.start)]; seen[q[0]]=1;
        for(let h=0;h<q.length;h++){const i=q[h],x=i%m.w,y=(i/m.w)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,j=I(X,Y);if(X>=0&&Y>=0&&X<m.w&&Y<m.h&&!seen[j]&&m.walkableTile(X,Y)){seen[j]=1;q.push(j);}}}
        for(const p of [g.boss,g.exit,...g.chests.map(c=>[c.x,c.y]),...g.spawns.map(s=>[s.x,s.y])])if(!seen[I(...p)])problems.push('unreachable route content for seed '+seed);
      }
      G.char.depth = 13; G.char.darkForestRuns = {};
      game.buildDungeon(13, biome);
      const w = G.world, boss = w.boss;
      if (!boss || boss.rank !== 'boss' || !w.overworldScenario) problems.push('guardian scenario was not built');
      else {
        for (const m of w.creatures) if (m.team === 'enemy' && m.rank === 'boss') m.dead = true;
        w.onBossKilled(boss);
        if (!w.overworldScenario.completed) problems.push('guardian kill did not complete the scenario');
        if (!w.portals.some((p) => p.type === 'exit' && p.active)) problems.push('guardian kill did not open the exit');
      }
      window.__darkForest = { start: w.overworldScenario?.guardian, exit: w.portals.find((p)=>p.type==='exit') };
      return { problems, trees: w.map.treeCells?.cells.flat().length || 0, enemies: w.creatures.filter((m)=>m.team==='enemy'&&!m.dead).length };
    });
    console.log('Dark Forest', JSON.stringify(result));
    for (const problem of result.problems) errors.push('[dark_forest] ' + problem);
    if (SHOTS && !result.problems.length) {
      await shot('dark_forest_guardian_route');
    }
  } catch (e) { errors.push('[dark_forest] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
