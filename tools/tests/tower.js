// THE SERPENTINE TOWER: enter at the upper stairhead, descend through all five variants,
// trigger the ground-floor guardian, defeat it, and confirm the exit opens at the foot.
// Usage: node tools/tests/tower.js [variants e.g. 0,2|all] (start the test server first)
const { openGame, report } = require('./harness');
const variants = process.argv[2] === 'all' || !process.argv[2] ? [0, 1, 2, 3, 4] : process.argv[2].split(',').map(Number);
const step = (page, secs = 0.2) => page.evaluate(async (secs) => {
  const { G, game } = window.VELSCOUR;
  for (let i = 0; i < secs * 30; i++) { G.dt = 1 / 30; G.time += G.dt; game.update(1 / 30); if (i % 30 === 29) await new Promise((r) => setTimeout(r, 0)); }
}, secs);

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1366, height: 820 });
  try {
    await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Tower Descent QA');
      G.char.depth = 8; G.godMode = true;
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
    });
    for (const vi of variants) {
      await page.evaluate(async (vi) => {
        const { G, game } = window.VELSCOUR, { BIOME_BY_ID } = await import('/src/data/biomes.js');
        G.towerVariant = vi;
        await game.teleportToBiome(BIOME_BY_ID.serpentine_tower);
      }, vi);
      await page.waitForFunction(() => window.VELSCOUR.G.world?.tower && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 60000 });
      await page.waitForTimeout(500);
      const start = await page.evaluate(() => {
        const { G } = window.VELSCOUR, w = G.world, run = w.overworldScenario, g = w.tower.g, p = w.player;
        return { phase: run.phase, startX: p.x, topX: g.XT, bottomX: run.bottomX, roof: w.tower.roof,
          path: w.map.findPath(run.startX, p.y, run.bottomX, p.y, 50000)?.length || 0, variant: run.variant.id };
      });
      console.log(`variant ${vi} arrival`, JSON.stringify(start));
      if (start.phase !== 'descend' || start.roof || start.startX < start.topX || start.startX > start.topX + 5 || !start.path) {
        errors.push(`[variant ${vi}] did not start at the top of a reachable descent: ${JSON.stringify(start)}`);
        continue;
      }
      await shot(`tower_${vi}_top`);
      const boss = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario;
        G.player.x = run.bottomX - 4; G.player.y = w.tower.g.YR + w.tower.g.w / 2; G.player.path = null;
        G.dt = 1 / 30; G.time += G.dt; game.update(G.dt);
        return { phase: run.phase, name: run.guardian?.name, rank: run.guardian?.rank, x: run.guardian?.x, bottomX: run.bottomX };
      });
      if (boss.phase !== 'boss' || !boss.name || boss.rank !== 'boss' || Math.abs(boss.x - boss.bottomX) > 2) {
        errors.push(`[variant ${vi}] ground-floor boss did not appear: ${JSON.stringify(boss)}`);
        continue;
      }
      await step(page, 0.3); await shot(`tower_${vi}_guardian`);
      const result = await page.evaluate(async () => {
        const { G, game } = window.VELSCOUR, w = G.world, run = w.overworldScenario, { hit } = await import('/src/game/combat.js');
        hit(null, run.guardian, run.guardian.maxHp * 20, 'phys', { force: true });
        for (let i = 0; i < 90; i++) { G.dt = 1 / 30; G.time += G.dt; game.update(G.dt); }
        const exit = w.portals.find((q) => q.type === 'exit');
        return { complete: run.completed, phase: run.phase, exit: exit && { active: exit.active, x: exit.x, y: exit.y }, bottomX: run.bottomX };
      });
      if (!result.complete || !result.exit?.active || Math.abs(result.exit.x - result.bottomX) > 2) errors.push(`[variant ${vi}] guardian defeat did not open the bottom exit: ${JSON.stringify(result)}`);
      await shot(`tower_${vi}_exit`);
    }
  } catch (e) { errors.push('[tower] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})();
