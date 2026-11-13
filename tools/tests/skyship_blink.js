// Regression check: Blink must not place the player on the Sky Ship's hull or outside its walkable deck.
// Run with the game served from the repository root and Edge selected through CHROMIUM_PATH:
//   node tools/tests/skyship_blink.js
const assert = require('assert');
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  try {
    const result = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      const { BIOME_BY_ID } = await import('/src/data/biomes.js');
      const { SKILLS } = await import('/src/data/skills.js');
      const { OX, OY, LANDING } = await import('/src/world/skyship.js');
      const { bodyR } = await import('/src/world/map.js');
      const { castSkill } = await import('/src/game/skillrun.js');

      await game.newChar('wizard', 'Blink Boundary Test');
      G.godMode = true;
      await game.teleportToBiome(BIOME_BY_ID.skyship);

      const p = G.player, w = G.world;
      const blink = Object.values(SKILLS).find((sk) => sk.classId === 'wizard' && sk.kind === 'blink');
      if (!blink) throw new Error('Wizard Blink skill not found');
      p.x = OX + LANDING[0] + 0.5;
      p.y = OY + LANDING[1];
      p.path = null;
      p.moveTarget = null;
      const start = [p.x, p.y];
      castSkill(p, blink, 1, p.x + 40, p.y);
      return {
        start,
        end: [p.x, p.y],
        walkable: w.map.walkable(p.x, p.y),
        bodyFits: w.map.circleFree(p.x, p.y, bodyR(p)),
        distance: Math.hypot(p.x - start[0], p.y - start[1]),
      };
    });

    assert(result.walkable, `Blink landed on a non-walkable tile: ${JSON.stringify(result)}`);
    assert(result.bodyFits, `Player body extends outside walkable deck: ${JSON.stringify(result)}`);
    assert(result.distance <= 6.5 + 1e-6, `Blink exceeded its normal range: ${JSON.stringify(result)}`);
    assert(result.distance > 0, `Blink did not move toward the requested destination: ${JSON.stringify(result)}`);
    console.log('PASS: Sky Ship Blink stays within the walkable deck and normal range.');
    report(errors);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

