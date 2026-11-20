// Surface Sea of Sand variants now end at a plaza guardian. The Scorpion King pyramid is tested
// separately: it starts in its tomb, retains the room sequence, and opens its own final portal.
// Usage: node tools/tests/dunes.js [ids|all] [mobile] [auto] [noflow] (start the test server first)
const { openGame, report } = require('./harness');
const arg = process.argv[2] || 'all', mobile = process.argv.includes('mobile'), AUTO = process.argv.includes('auto'), FLOW = !process.argv.includes('noflow');
(async () => {
  const { browser, page, errors, shot } = await openGame(mobile ? { width: 844, height: 390, mobile: true } : { width: 1280, height: 720 });
  try {
    const ids = await page.evaluate(async (arg) => {
      const { DUNE_VARIANTS } = await import('/src/data/dunes.js');
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Dune QA');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      return arg === 'all' ? DUNE_VARIANTS.map((v) => v.id) : arg.split(',');
    }, arg);
    const pre = mobile ? 'dunes_mobile_' : 'dunes_';
    const step = (secs) => page.evaluate(async (secs) => {
      const { G, game } = window.VELSCOUR;
      for (let i = 0; i < secs * 30; i++) { G.dt = 1 / 30; G.time += G.dt; G.frame++; game.update(1 / 30); if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0)); }
    }, secs);
    const view = (x, y, zoom) => page.evaluate(async ([x, y, zoom]) => {
      const { G } = window.VELSCOUR, { camera } = await import('/src/core/view.js');
      G.player.x = x; G.player.y = y; G.player.path = null;
      if (zoom) { G.settings.zoom = 1; camera.computeZoom(); G.settings.zoom = zoom / camera.zoom; camera.computeZoom(); }
      camera.follow(x, y, 0, true);
    }, [x, y, zoom]);

    if (FLOW) for (const id of ids) {
      const info = await page.evaluate(async (id) => {
        const { G, game } = window.VELSCOUR, { DUNE_VARIANTS } = await import('/src/data/dunes.js'), { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.char.depth = 12; G.godMode = true; G.settings.zoom = 1;
        G.sandVariant = 1 + DUNE_VARIANTS.findIndex((v) => v.id === id);
        await game.teleportToBiome(BIOME_BY_ID.sea_of_sand); G.sandVariant = undefined;
        const { dunesScene } = await import('/src/gfx/dunes3d.js');
        for (let t = 0; t < 200 && !dunesScene(); t++) await new Promise((r) => setTimeout(r, 50));
        const w = G.world, run = w.overworldScenario, dv = w.cave?.dv;
        w.creatures = w.creatures.filter((c) => c === G.player || c.team === 'player'); w.rebuildGrid();
        const { isoX, isoY } = await import('/src/core/view.js'), p = G.player, pk = w.cave.pick(isoX(p.x, p.y), isoY(p.x, p.y));
        const waystoneProgress = [];
        for (let won = 0; won <= 3; won++) {
          run.camps.forEach((camp, i) => { camp.state = i < won ? 'done' : 'idle'; });
          waystoneProgress.push(run.hud.progress);
        }
        run.camps.forEach((camp) => { camp.state = 'idle'; });
        return { built: dv?.v.id, scene: !!dunesScene(), camps: run.camps.length, waystoneProgress, pickErr: +Math.hypot(pk[0] - p.x, pk[1] - p.y).toFixed(2), camp: [run.camps[0].x, run.camps[0].y], plaza: dv.pyramid.plazaC, start: dv.start };
      }, id);
      if (info.built !== id || !info.scene || info.pickErr > 0.6) { errors.push(`[dunes ${id}] map/scene/picking failed: ${JSON.stringify(info)}`); continue; }
      if (info.camps !== 3 || JSON.stringify(info.waystoneProgress) !== JSON.stringify(['Waystones 0/3', 'Waystones 1/3', 'Waystones 2/3', 'Waystones 3/3'])) errors.push(`[dunes ${id}] waystone count/tracker mismatch: ${JSON.stringify(info)}`);
      await view(info.start[0], info.start[1], 0.9); await page.waitForTimeout(400); await shot(pre + id + '_arrive');
      await view(info.camp[0], info.camp[1] + 2); await step(2);
      const camp = await page.evaluate(() => { const r = window.VELSCOUR.G.world.overworldScenario; return { state: r.camps[0].state, foes: r.camps[0].foes.length + r.camps[0].objs.length + r.camps[0].marks.length }; });
      if (camp.state !== 'active') errors.push(`[dunes ${id}] the first waystone did not start: ${JSON.stringify(camp)}`);
      await page.waitForTimeout(300); await shot(pre + id + '_waystone');
      await view(info.plaza[0], info.plaza[1] + 8, 0.55); await page.waitForTimeout(400); await shot(pre + id + '_plaza');
      await page.evaluate(() => { const { G } = window.VELSCOUR, r = G.world.overworldScenario; G.world.creatures = G.world.creatures.filter((c) => c === G.player || c.team === 'player'); G.world.rebuildGrid(); for (const e of r.camps) e.state = 'done'; });
      await step(3);
      const result = await page.evaluate(async () => {
        const { G } = window.VELSCOUR, w = G.world, r = w.overworldScenario, { hit } = await import('/src/game/combat.js');
        const boss = r.surfaceBoss, phase = r.phase;
        if (boss) { boss.targetable = true; boss.entering = null; hit(null, boss, boss.maxHp * 20, 'phys', { force: true }); }
        for (let i = 0; i < 30 * 5; i++) { G.dt = 1 / 30; G.time += 1 / 30; w.update(1 / 30); r.update(1 / 30); }
        const exit = w.portals.find((p) => p.type === 'exit');
        return { phase, boss: boss?.name || null, completed: r.completed, exit: exit ? [exit.active, w.map.walkable(exit.x, exit.y), exit.x, exit.y] : null };
      });
      if (result.phase !== 'surface_boss' || !result.boss || !result.completed || !result.exit?.[0] || !result.exit?.[1]) errors.push(`[dunes ${id}] surface boss/exit failed: ${JSON.stringify(result)}`);
      await view(info.plaza[0], info.plaza[1] + 7, 0.65); await page.waitForTimeout(400); await shot(pre + id + '_surface_exit');
    }

    if (FLOW) {
      const pyramid = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js'), { hit } = await import('/src/game/combat.js');
        G.char.depth = 12; G.godMode = true;
        await game.teleportToBiome(BIOME_BY_ID.scorpion_king_pyramid);
        const w = G.world, run = w.overworldScenario, dv = w.cave.dv;
        const result = { biome: w.biome.id, variant: dv.v.id, phase: run.phase, inside: w.cave.inside, campsDone: run.campsDone, entranceOpen: dv.seals.find((s) => s.k === 0).tiles.every((i) => !w.map.block[i]) };
        for (const e of run.rooms) { e.state = 'done'; for (const m of [...e.foes, ...e.objs]) m.dead = true; }
        for (const s of dv.seals) for (const i of s.tiles) w.map.block[i] = 0;
        G.player.x = dv.chamber.cx + 0.5; G.player.y = dv.chamber.cy + 6;
        for (let i = 0; i < 30 * 5; i++) { G.dt = 1 / 30; G.time += G.dt; w.update(1 / 30); run.update(1 / 30); }
        const boss = run.top?.boss; result.boss = boss?.name || null;
        if (boss) { boss.targetable = true; boss.entering = null; hit(null, boss, boss.maxHp * 20, 'phys', { force: true }); }
        for (let i = 0; i < 30 * 5; i++) { G.dt = 1 / 30; G.time += G.dt; w.update(1 / 30); run.update(1 / 30); }
        const exit = w.portals.find((p) => p.type === 'exit');
        result.completed = run.completed; result.exit = exit ? [exit.active, w.map.walkable(exit.x, exit.y)] : null;
        return result;
      });
      console.log('Scorpion King pyramid', JSON.stringify(pyramid));
      if (pyramid.biome !== 'scorpion_king_pyramid' || pyramid.variant !== 'red' || pyramid.phase !== 'tomb' || !pyramid.inside || pyramid.campsDone < 1 || !pyramid.entranceOpen) errors.push(`[pyramid] it did not start inside the tomb: ${JSON.stringify(pyramid)}`);
      if (!pyramid.boss || !pyramid.completed || !pyramid.exit?.[0] || !pyramid.exit?.[1]) errors.push(`[pyramid] final boss/exit failed: ${JSON.stringify(pyramid)}`);
    }

    if (AUTO) {
      const res = await page.evaluate(async (id) => {
        const { G, game } = window.VELSCOUR, { DUNE_VARIANTS } = await import('/src/data/dunes.js'), { BIOME_BY_ID } = await import('/src/data/biomes.js'), { Auto } = await import('/tools/tests/auto_player.js');
        await game.newChar('paladin', 'Dune Walker'); document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        G.char.depth = 3; G.godMode = true; G.sandVariant = 1 + DUNE_VARIANTS.findIndex((v) => v.id === id);
        await game.teleportToBiome(BIOME_BY_ID.sea_of_sand); G.sandVariant = undefined;
        const w = G.world, run = w.overworldScenario; Auto.toggle(true);
        for (let s = 0; s < 60 * 90 && G.world === w && !run.completed; s++) {
          for (let i = 0; i < 60; i++) { G.time += 1 / 60; game.update(1 / 60); }
          if (s % 30 === 29) await new Promise((r) => setTimeout(r, 0));
        }
        Auto.toggle(false); return { done: run.completed, phase: run.phase, status: Auto.status };
      }, ids[0]);
      if (!res.done) errors.push(`[dunes auto-play] did not finish ${ids[0]}: ${JSON.stringify(res)}`);
    }
  } catch (e) { errors.push('[dunes] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})();
