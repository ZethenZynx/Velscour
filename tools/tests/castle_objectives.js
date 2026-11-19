// Castle side objectives and sealed-crossing regression (all 11 layouts).
// Start a repo-root server, then run: node tools/tests/castle_objectives.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1000, height: 640 });
  try {
    const rows = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { CASTLE_VARIANTS } = await import('/src/data/castles.js');
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { SKILLS } = await import('/src/data/skills.js');
      const { castSkill } = await import('/src/game/skillrun.js');
      const { Leap } = await import('/src/game/hazards.js');
      const { castle3dTick } = await import('/src/game/castle3d.js');
      await game.newChar('wizard', 'Castle Objective QA');
      document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
      const { xpToNext } = await import('/src/game/player.js');
      G.char.level = 30; G.char.xp = Math.round(xpToNext(30) * 0.2);
      await (await import('/src/gfx/castle.js')).loadCastlePack();
      const blink = Object.values(SKILLS).find((sk) => sk.classId === 'wizard' && sk.kind === 'blink');
      const out = [];
      const reachable = (map, from, goal) => {
        const W = map.w, H = map.h, I = (x, y) => y * W + x, start = I(Math.floor(from[0]), Math.floor(from[1]));
        const seen = new Uint8Array(W * H), q = [start]; seen[start] = 1;
        for (let a = 0; a < q.length; a++) {
          const i = q[a], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = x + dx, Y = y + dy, j = I(X, Y);
            if (!map.inb(X, Y) || seen[j] || !map.walkableTile(X, Y) || !map.stepOk(i, j)) continue;
            seen[j] = 1; q.push(j);
          }
        }
        return seen[I(Math.floor(goal[0]), Math.floor(goal[1]))] === 1;
      };
      for (let v = 0; v < CASTLE_VARIANTS.length; v++) {
        const id = CASTLE_VARIANTS[v].id;
        await (await import('/src/gfx/castle3dart.js')).loadCastle3D(id);
        G.castleVariant = id; G.char.depth = 12; G.godMode = true;
        game.buildDungeon(12, BIOME_BY_ID.castle); G.castleVariant = undefined;
        const w = G.world, map = w.map, p = G.player, run = w.overworldScenario, D = map.drawbridge;
        if (!run || run.objectives?.length !== 2) throw new Error(`${id}: both outside objectives were not created`);
        for (const o of run.objectives) if (!reachable(map, [p.x, p.y], [o.x, o.y])) throw new Error(`${id}: ${o.key} cannot be reached before opening the gate`);
        if (!D.tiles.length || D.tiles.some((i) => !map.block[i])) throw new Error(`${id}: main drawbridge does not start sealed`);
        if (!map.castlePosternTiles.length || map.castlePosternTiles.some((i) => !map.block[i])) throw new Error(`${id}: postern bypass is not sealed`);

        // The alternate postern is also a moat crossing: a long ghost step must not bypass it.
        const postern = map.castleBridges.find((b) => b.kind === 'postern');
        const posternYs = map.castlePosternTiles.map((i) => (i / map.w) | 0);
        const posternMinY = Math.min(...posternYs), posternMaxY = Math.max(...posternYs);
        let posternApproach;
        for (let x = postern.x0; x <= postern.x1 && !posternApproach; x++) {
          for (let y = posternMinY - 3; y < posternMinY && !posternApproach; y += 0.25) {
            if (map.circleFree(x + 0.5, y, 0.3)) posternApproach = [x + 0.5, y];
          }
        }
        if (!postern || !posternApproach) throw new Error(`${id}: no valid postern approach point`);
        p.x = posternApproach[0]; p.y = posternApproach[1];
        const posternMove = map.move(p, 0, posternMaxY + 1 - p.y, true);
        if (posternMove || p.y !== posternApproach[1]) throw new Error(`${id}: ghost movement bypassed the locked postern`);

        // Try a long collision-bypassing movement update through the main gate while it is locked.
        const gx = D.x0 + 0.5, gy = D.hinge - 1.1;
        if (!map.circleFree(gx, gy, 0.3)) throw new Error(`${id}: no valid approach point before the drawbridge`);
        p.x = gx; p.y = gy;
        const old = [p.x, p.y];
        if (map.move(p, 0, D.y1 - p.y + 1, true) || p.x !== old[0] || p.y !== old[1]) throw new Error(`${id}: long/ghost movement bypassed the locked drawbridge`);

        // Test the two targeted movement paths that can otherwise land beyond blocked floor.
        const innerY = D.y1 + 0.8;
        castSkill(p, blink, 1, gx, innerY);
        if (D.tiles.includes(map.tileIdx(p.x, p.y))) throw new Error(`${id}: Blink landed on the sealed drawbridge`);
        p.x = gx; p.y = gy;
        const leap = new Leap({ world: w, src: p, tx: gx, ty: innerY, dmg: [1, 1], el: 'phys' });
        if (D.tiles.includes(map.tileIdx(leap.tx, leap.ty))) throw new Error(`${id}: Leap landed on the sealed drawbridge`);

        // Alternate the completion branch across all variants to verify each objective alone unlocks it.
        const completed = run.objectives[v % 2];
        const optional = run.objectives[(v + 1) % 2];
        completed.target.dead = true; completed.target.hp = 0; run.update(0);
        if (!map.castleGateUnlocked || map.castleGateLocked) throw new Error(`${id}: ${completed.key} did not unlock the gate`);
        if (!optional.target.dead || !run.objectives.includes(optional)) throw new Error(`${id}: the second objective was not left optional`);
        if (map.castlePosternTiles.some((i) => map.block[i])) throw new Error(`${id}: unlocked postern remains blocked`);
        castle3dTick(w, 3);
        if (!D.down || D.tiles.some((i) => map.block[i])) throw new Error(`${id}: drawbridge did not visibly open after objective completion`);
        out.push({ id, objectives: run.objectives.map((o) => o.key), openedBy: completed.key, gateOpen: D.down });
      }
      return out;
    });
    for (const row of rows) console.log(JSON.stringify(row));
  } catch (e) { errors.push('[castle objectives] ' + (e.stack || e)); }
  report(errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exitCode = 1; });
