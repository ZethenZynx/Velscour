// All 20 closed/open chest pairs load and render through the live game renderer.
//   node tools/tests/chest_variants.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors, shot } = await openGame({ width: 1360, height: 850 });
  const startupErrorCount = errors.length;
  const fails = [];
  const ok = (condition, message) => { if (!condition) fails.push(message); console.log((condition ? 'ok   ' : 'FAIL ') + message); };

  const result = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { A } = await import('/src/core/assets.js');
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    const { chestAppearanceProfile, selectDungeonChestVariant } = await import('/src/data/chestappearances.js');
    await game.newChar('paladin', 'Chest Art Test');
    game.buildDungeon(34, BIOME_BY_ID.catacombs);
    const world = G.world;
    const chest = world.chests[0];
    chest.chestType = 'standard'; chest.chestRarity = 0;
    const before = world.loot.length;
    chest.use();
    const interaction = { opened: chest.opened, lootAdded: world.loot.length > before, label: chest.label };

    game.buildDungeon(34, BIOME_BY_ID.catacombs);
    const w = G.world, p = G.player;
    const { camera } = await import('/src/core/view.js');
    const room = w.rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (room) { p.x = room.mx; p.y = room.my; camera.follow(p.x, p.y, 0, true); }
    document.querySelectorAll('#center-msg').forEach((element) => element.remove());
    w.map.seen.fill(1);
    w.creatures = [];
    const standardProbe = Array.from({ length: 100 }, (_, i) => ({
      x: p.x + (i % 10) * 0.61,
      y: p.y + Math.floor(i / 10) * 0.53,
      chestType: 'standard', chestRarity: i % 6,
    }));
    w.chests = standardProbe;
    game.render();
    const selections = standardProbe.map((c) => c.chestVariant);
    game.render();
    const stableSelections = standardProbe.every((c, i) => c.chestVariant === selections[i]);
    const variantsCovered = new Set(selections).size;
    const allowed = new Set(chestAppearanceProfile(w.biome.id).map((entry) => entry.id - 1));
    const typeProbe = ['standard', 'gilded', 'jeweled', 'explosive', 'mimic'].flatMap((type) => Array.from({ length: 6 }, (_, i) => ({
      x: p.x + i * 0.04, y: p.y + type.length * 0.03, chestType: type, chestRarity: i % 6, rare: i % 2 === 1,
    })));
    // Identical coordinates and context with different loot classifications must
    // resolve to the same art; move them onto one exact ground anchor.
    for (const chest of typeProbe) { chest.x = p.x + 1.2; chest.y = p.y - 0.7; }
    w.chests = typeProbe; game.render();
    const typeIndependent = typeProbe.every((c) => c.chestVariant === selectDungeonChestVariant({ biomeId: w.biome.id, variantId: w.chestEnvironmentVariant || '', seed: w.chestSeed ?? 0, x: c.x, y: c.y }));
    const appearanceIndependent = typeProbe.every((c) => c.chestVariant === typeProbe[0].chestVariant);

    w.chests = Array.from({ length: 20 }, (_, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      return {
        x: p.x + (col - 2) * 1.55,
        y: p.y + (row - 1.5) * 1.55,
        opened: i % 2 === 1,
        chestVariant: i,
        chestArtPreview: true,
        chestType: i === 0 ? 'cursed' : 'standard',
        label: `Variant ${String(i + 1).padStart(2, '0')}`,
        glow: '#d5a951',
      };
    });
    game.render();

    const loaded = A.chestVariants.map(({ closed, open }) => ({
      closed: { w: closed.img.naturalWidth, h: closed.img.naturalHeight, loaded: closed.img.complete, alpha: transparentCorners(closed.img) },
      open: { w: open.img.naturalWidth, h: open.img.naturalHeight, loaded: open.img.complete, alpha: transparentCorners(open.img) },
    }));
    return {
      loaded, chestCount: w.chests.length,
      labels: w.chests.filter((c) => c.label).length,
      variants: new Set(w.chests.map((c) => c.chestVariant)).size,
      variantsCovered, stableSelections, typePoolsRespected: typeProbe.every((c) => allowed.has(c.chestVariant)), typeIndependent, appearanceIndependent,
      interaction,
    };

    function transparentCorners(img) {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return [data[3], data[(width - 1) * 4 + 3], data[((height - 1) * width) * 4 + 3], data[((height * width) - 1) * 4 + 3]].every((a) => a === 0);
    }
  });

  ok(result.loaded.length === 20, `loaded ${result.loaded.length}/20 chest pairs`);
  ok(result.loaded.every((pair) => pair.closed.w > 0 && pair.closed.h > 0 && pair.closed.loaded && pair.closed.alpha && pair.open.w > 0 && pair.open.h > 0 && pair.open.loaded && pair.open.alpha), 'every closed/open PNG loads with preserved transparency');
  ok(result.loaded.every((pair) => pair.open.w / pair.closed.w > 0.7 && pair.open.w / pair.closed.w < 1.4), 'opened sprites stay paired at a consistent rendered scale');
  ok(result.chestCount === 20 && result.variants === 20, 'live scene rendered all 20 unique variants');
  ok(result.variantsCovered > 1 && result.stableSelections, 'the biome-compatible chest pool varies and stays stable between frames');
  ok(result.typePoolsRespected, 'ordinary chest art stays inside the environment-compatible pool');
  ok(result.typeIndependent && result.appearanceIndependent, 'chest art is independent of type, rarity, and reward classification');
  ok(result.labels === 20, 'existing chest label data remains attached');
  ok(result.interaction.opened && result.interaction.lootAdded && !!result.interaction.label, 'standard chest still opens, drops loot, and keeps its label');
  await shot('chest_variants');
  if (startupErrorCount) console.log(`baseline startup console errors before the chest scene: ${startupErrorCount}`);
  report(errors.slice(startupErrorCount));
  if (fails.length) { console.error(fails.join('\n')); process.exitCode = 1; }
  await browser.close();
})();
