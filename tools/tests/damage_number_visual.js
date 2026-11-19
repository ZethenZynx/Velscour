// Smoke test for elemental damage-number colors, critical styling, and DoT separation.
//   node tools/tests/damage_number_visual.mjs
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame();
  const result = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { hit } = await import('/src/game/combat.js');
    const { damageText, elem, texts } = await import('/src/gfx/vfx.js');
    const { makeMonster } = await import('/src/game/monster.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    await game.newChar('wizard', 'Damage numbers');
    document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
    G.char.depth = 1;
    game.buildDungeon(1, BIOME_BY_ID.catacombs);
    G.godMode = false;
    const p = G.player, world = G.world;
    p.recompute(); p.st.critChance = 0;
    const m = makeMonster(world, 'skeleton', world.biome, 1, 'normal', p.x + 1, p.y);
    m.maxHp = m.hp = 1e9; world.add(m);
    const elements = ['phys', 'fire', 'cold', 'light', 'poison', 'acid', 'blood', 'holy', 'shadow', 'arcane', 'astral'];
    const colors = [];
    for (const type of elements) {
      m.hp = m.maxHp;
      hit(p, m, 100, type, { crit: false });
      const text = texts.at(-1);
      colors.push({ type, expected: elem(type).glow, actual: text?.color, style: text?.style });
    }
    m.hp = m.maxHp; p.st.critChance = 100;
    hit(p, m, 100, 'fire', {});
    const critical = texts.at(-1);
    m.hp = m.maxHp;
    hit(p, m, 100, 'poison', { dot: true, crit: false });
    const dot = texts.at(-1);
    m.hp = m.maxHp;
    hit(m, p, 100, 'cold', {});
    const received = texts.at(-1);
    // Draw a compact gallery in the actual game renderer for visual inspection.
    texts.length = 0;
    elements.slice(0, 7).forEach((type, i) => damageText(p.x + (i - 3) * 0.45, p.y, 105 + (i % 2) * 14, 1234 + i * 37, 'hit', elem(type).glow));
    damageText(p.x - 0.6, p.y - 0.45, 142, 9876, 'crit', elem('fire').glow);
    damageText(p.x + 0.6, p.y - 0.45, 142, 4321, 'crit', elem('cold').glow);
    damageText(p.x, p.y + 0.48, 132, 56, 'dot', elem('poison').glow);
    return {
      colors,
      critical: { style: critical?.style, color: critical?.color, sparks: critical?.sparks },
      dot: { style: dot?.style, color: dot?.color },
      received: { style: received?.style, color: received?.color },
    };
  });
  console.log('Element colors: ' + result.colors.map((c) => `${c.type}=${c.actual}`).join(', '));
  if (result.colors.some((c) => c.actual !== c.expected || c.style !== 'hit')) { console.log('FAIL: an ordinary hit lost its damage-type color'); process.exitCode = 1; }
  if (result.critical.style !== 'crit' || result.critical.color !== '#ff7a10' || !(result.critical.sparks > 0)) { console.log('FAIL: critical hit is missing its type color or pixel burst'); process.exitCode = 1; }
  if (result.dot.style !== 'dot' || result.dot.color !== '#70e020') { console.log('FAIL: damage-over-time number was not kept small/poison-colored'); process.exitCode = 1; }
  if (result.received.style !== 'hurt' || result.received.color !== '#60c8ff') { console.log('FAIL: player damage number lost its incoming damage type'); process.exitCode = 1; }
  await shot('damage_number_visual');
  // This fork currently has no published GitHub release, so its existing latest-release request returns a
  // known 404 while the game still loads normally. Keep the visual test focused on unexpected console errors.
  const expectedRelease404 = errors.filter((e) => e.includes('Failed to load resource') && e.includes('404'));
  if (expectedRelease404.length) console.log(`Known title-screen latest-release 404 observed (${expectedRelease404.length}); game and visual checks continued.`);
  report(errors.filter((e) => !expectedRelease404.includes(e)), 20);
  await browser.close();
})();
