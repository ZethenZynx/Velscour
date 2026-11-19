// Load the actual town scene and verify its three custom chest pairs are present in the renderer.
// node tools/tests/town_storage_chests_ui.js
const assert = require('node:assert/strict');
const { openGame } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1600, height: 900 });
  try {
    const scene = await page.evaluate(async () => {
      const { G, game } = window.VELSCOUR;
      await game.newChar('paladin', 'Chest Art Review');
      await new Promise((resolve) => setTimeout(resolve, 650));
      const { A } = await import('/src/core/assets.js');
      const { townStorageChestArtFor } = await import('/src/data/town-storage-chests.js');
      const npcs = G.world.npcs.filter((npc) => npc.stash);
      const keys = { storage: 'storage', reliquary: 'reliquary', jewelBox: 'jewel-box' };
      const containers = Object.fromEntries(Object.entries(keys).map(([kind, key]) => {
        const npc = kind === 'storage' ? npcs.find((n) => !n.reliquary && !n.jewelBox)
          : kind === 'reliquary' ? npcs.find((n) => n.reliquary) : npcs.find((n) => n.jewelBox);
        const pair = A.townStorageChests[key];
        return [kind, {
          exists: !!npc,
          named: townStorageChestArtFor(npc || {})?.townStorageChest === key,
          closedLoaded: !!pair?.closed?.img?.complete && pair.closed.img.naturalWidth > 0,
          openLoaded: !!pair?.open?.img?.complete && pair.open.img.naturalWidth > 0,
          widthRatio: pair ? pair.open.w / pair.closed.w : 0,
          x: npc?.x, y: npc?.y,
        }];
      }));
      const points = Object.values(containers);
      G.player.x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      G.player.y = points.reduce((sum, p) => sum + p.y, 0) / points.length + 1;
      G.settings.zoom = 1.7;
      const { camera } = await import('/src/core/view.js');
      camera.computeZoom();
      camera.follow(G.player.x, G.player.y, 0, true);
      const { showFirstSkillTutorial } = await import('/src/ui/skills.js');
      G.char.skillTutorialSeen = true;
      showFirstSkillTutorial();
      return { kind: G.world.kind, containers };
    });
    console.log(JSON.stringify(scene));
    assert.equal(scene.kind, 'town', 'the screenshot is captured in Herrington Hollow');
    for (const [kind, chest] of Object.entries(scene.containers)) {
      assert(chest.exists, `${kind} town object exists`);
      assert(chest.named, `${kind} references its dedicated reference artwork`);
      assert(chest.closedLoaded && chest.openLoaded, `${kind} closed and open sprites loaded`);
      assert(chest.widthRatio > 0.95 && chest.widthRatio < 1.05, `${kind} open/closed pair remains anchored at a consistent width`);
    }
    await page.waitForTimeout(3900);
    const visual = { x: 620, y: 190, width: 500, height: 480 };
    await page.screenshot({ path: 'tools/tests/out/town-storage-chests-closed.png', clip: visual });
    const interactions = await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { UI } = await import('/src/ui/ui.js');
      const kinds = [
        ['storage', (n) => n.stash && !n.reliquary && !n.jewelBox, () => G.ui.stash.active],
        ['reliquary', (n) => n.reliquary, () => G.ui.reliquary.active],
        ['jewelBox', (n) => n.jewelBox, () => G.ui.jewelBox.active],
      ];
      const result = {};
      for (const [kind, matches, active] of kinds) {
        G.world.npcs.find(matches).use();
        result[kind] = active();
        UI.closeAll();
      }
      G.ui.stash.active = G.ui.reliquary.active = G.ui.jewelBox.active = true;
      for (const npc of G.world.npcs) if (!npc.stash) npc.hidden = true;
      G.player.hidden = true;
      return result;
    });
    assert(Object.values(interactions).every(Boolean), 'each town object opens its correct storage interface');
    await page.addStyleTag({ content: '#panels{display:none!important}' });
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'tools/tests/out/town-storage-chests-open.png', clip: visual });
    const unexpectedErrors = errors.filter((error) => !error.includes('Failed to load resource: the server responded with a status of 404'));
    assert.equal(unexpectedErrors.length, 0, unexpectedErrors.join('\n'));
    console.log('PASS: all three town chest pairs load and render in the live game. Existing latest-release 404 ignored.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
