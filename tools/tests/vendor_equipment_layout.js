// Vendor, character equipment and backpack windows must stay ordered and usable together.
//   node tools/tests/vendor_equipment_layout.js
const { openGame, report } = require('./harness');

const inspectLayout = (page) => page.evaluate(() => {
  const rect = (name) => {
    const r = document.querySelector(`#panels > [data-panel="${name}"]`).getBoundingClientRect();
    return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height };
  };
  const square = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { width:r.width, height:r.height };
  };
  const host = document.querySelector('#panels');
  return {
    uniform: host.classList.contains('vendor-trio-uniform'),
    vendor: rect('vendor'), character: rect('character'), inventory: rect('inventory'),
    viewport: { width:innerWidth, height:innerHeight },
    slots: {
      stock:square('.vendor-panel .shop-grid .bslot'),
      equipped:square('.character-panel .eslot'),
      inventory:square('.inventory-panel .bag .bslot'),
    },
    service: !!document.querySelector('.vendor-panel .service-box'),
  };
});

function assertLayout(vendor, layout, expectedScale = null) {
  if (!layout.uniform) throw new Error(`${vendor}: uniform sizing mode was not applied`);
  if (layout.vendor.right > layout.character.x + 1 || layout.character.right > layout.inventory.x + 1) {
    throw new Error(`${vendor}: windows overlap or are out of order: ${JSON.stringify(layout)}`);
  }
  if (layout.vendor.x < -1 || layout.inventory.right > layout.viewport.width + 1 || layout.inventory.bottom > layout.viewport.height + 1) {
    throw new Error(`${vendor}: window group extends beyond the screen: ${JSON.stringify(layout)}`);
  }
  const scales = [layout.vendor.width / 460, layout.character.width / 580, layout.inventory.width / 496];
  if (Math.max(...scales) - Math.min(...scales) > 0.005 || scales.some((s) => s > 1.005)) {
    throw new Error(`${vendor}: windows are not using one non-enlarging scale: ${JSON.stringify(scales)}`);
  }
  if (expectedScale !== null && scales.some((s) => Math.abs(s - expectedScale) > 0.01)) {
    throw new Error(`${vendor}: expected common scale ${expectedScale}, got ${JSON.stringify(scales)}`);
  }
  for (const [name, slot] of Object.entries(layout.slots)) {
    if (slot && Math.abs(slot.width - slot.height) > 0.5) throw new Error(`${vendor}: ${name} slot is distorted: ${JSON.stringify(slot)}`);
  }
  return scales[0];
}

(async () => {
  const { browser, page, errors } = await openGame({ width: 1440, height: 810 });
  try {
    await page.click('text=Heroes');
    await page.click('.class-card[data-id="paladin"]');
    await page.click('text=Begin');
    await page.waitForFunction(() => window.VELSCOUR.G.char && window.VELSCOUR.G.world);

    // Capture the unscaled standalone sizes that the vendor row must preserve.
    await page.setViewportSize({ width: 1700, height: 900 });
    await page.evaluate(async () => {
      const { G } = window.VELSCOUR;
      const { renderCharacter, renderInventory } = await import('/src/ui/inventory.js');
      G.ui.openPanel('character', 'Character & Stats', renderCharacter, { cls: 'character-panel', order: 'first' });
      G.ui.openPanel('inventory', 'Backpack', renderInventory, { cls: 'inventory-panel' });
    });
    const standalone = await page.evaluate(() => Object.fromEntries(['character', 'inventory'].map((name) => {
      const r = document.querySelector(`#panels > [data-panel="${name}"]`).getBoundingClientRect();
      return [name, r.width];
    })));
    if (Math.abs(standalone.character - 580) > 1 || Math.abs(standalone.inventory - 496) > 1) {
      throw new Error(`Standalone panels lost their original widths: ${JSON.stringify(standalone)}`);
    }
    await page.evaluate(() => window.VELSCOUR.G.ui.closeAll());
    await page.setViewportSize({ width: 1440, height: 810 });

    for (const vendor of ['upgrade', 'enchant', 'socket', 'weapons', 'armor', 'gems', 'alchemist', 'gamble', 'infernal']) {
      if (vendor === 'infernal') {
        // This browser context uses an isolated save; simulate the real campaign unlock.
        await page.evaluate(async () => {
          localStorage.setItem('velscour_endgame_v1', JSON.stringify({ unlocked: 1 }));
          (await import('/src/game/endgame.js')).resetEndgameCache();
        });
      }
      if (vendor === 'upgrade') {
        await page.evaluate(async () => {
          const { G } = window.VELSCOUR;
          const { rollItem } = await import('/src/data/items.js');
          const { addToBag } = await import('/src/game/player.js');
          G.char.gold = 1000000;
          addToBag(G.char, rollItem(1, { slot: 'weapon', rarity: 0 }));
          G.ui.selected = { where: 'bag', idx: G.char.bag.findIndex((item) => !!item) };
        });
      }
      if (vendor === 'gems') {
        await page.evaluate(async () => {
          const { G } = window.VELSCOUR;
          const { makeGem } = await import('/src/data/items.js');
          const { addToBag } = await import('/src/game/player.js');
          G.char.gold = 1000000;
          const gem = makeGem('sapphire', 0); gem.count = 3; addToBag(G.char, gem);
        });
      }
      const opened = await page.evaluate((id) => window.VELSCOUR.G.ui.vendor.open(id), vendor);
      if (!opened) throw new Error(`Could not open ${vendor} vendor`);
      const panels = await inspectLayout(page);
      if (['upgrade', 'enchant', 'socket'].includes(vendor) && !panels.service) throw new Error(`${vendor} service controls are missing`);
      assertLayout(vendor, panels);
      if (vendor === 'upgrade') {
        await page.getByRole('button', { name: /Upgrade to \+1/ }).click();
        const upgraded = await page.evaluate(() => window.VELSCOUR.G.char.bag.find((item) => item && item.type === 'gear').upg === 1);
        if (!upgraded) throw new Error('Blacksmith upgrade did not work with all three windows open');
        const drag = await page.evaluate(() => {
          const { G } = window.VELSCOUR;
          const idx = G.char.bag.findIndex((item) => item && item.type === 'gear');
          const source = document.querySelectorAll('.inventory-panel .bag .bslot')[idx].getBoundingClientRect();
          const target = [...document.querySelectorAll('.character-panel .eslot')].find((slot) => slot.style.gridColumn === '1' && slot.style.gridRow === '2').getBoundingClientRect();
          return { idx, uid:G.char.bag[idx].uid, from:{ x:source.x+source.width/2, y:source.y+source.height/2 }, to:{ x:target.x+target.width/2, y:target.y+target.height/2 } };
        });
        await page.mouse.move(drag.from.x, drag.from.y);
        await page.evaluate(() => window.VELSCOUR.G.ui.hideTip());
        await page.mouse.down();
        await page.mouse.move(drag.from.x + 10, drag.from.y + 10, { steps: 2 });
        await page.mouse.move(drag.to.x, drag.to.y, { steps: 12 });
        await page.mouse.up();
        const equipped = await page.evaluate((uid) => window.VELSCOUR.G.char.equip.weapon?.uid === uid, drag.uid);
        if (!equipped) throw new Error('Scaled item drag did not equip the dragged item');
      }
      if (vendor === 'gems') {
        await page.getByRole('button', { name: /Fuse 3.*Sapphire/ }).click();
        const fused = await page.evaluate(() => window.VELSCOUR.G.char.gemBag.some((gem) => gem && gem.gem === 'sapphire' && gem.tier === 1));
        if (!fused) throw new Error('Gem Merchant fusion did not work with all three windows open');
      }

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(120);
      assertLayout(vendor, await inspectLayout(page));

      await page.setViewportSize({ width: 800, height: 720 });
      await page.waitForTimeout(120);
      assertLayout(vendor, await inspectLayout(page));

      await page.setViewportSize({ width: 600, height: 900 });
      await page.waitForTimeout(120);
      assertLayout(vendor, await inspectLayout(page));

      await page.setViewportSize({ width: 1700, height: 900 });
      await page.waitForTimeout(120);
      assertLayout(vendor, await inspectLayout(page), 1);
      console.log(`${vendor}: original scale and proportional layouts passed`);

      await page.evaluate(() => window.VELSCOUR.G.ui.closePanel('vendor'));
      if (await page.locator('#panels > [data-panel="character"], #panels > [data-panel="inventory"]').count()) {
        throw new Error(`Closing ${vendor} did not restore the normal panel state`);
      }
      if (await page.locator('#panels.vendor-trio, #panels.vendor-trio-uniform').count()) {
        throw new Error(`Closing ${vendor} left vendor layout styling active`);
      }
      await page.evaluate(async () => {
        const { G } = window.VELSCOUR;
        const { renderCharacter, renderInventory } = await import('/src/ui/inventory.js');
        G.ui.openPanel('character', 'Character & Stats', renderCharacter, { cls: 'character-panel', order: 'first' });
        G.ui.openPanel('inventory', 'Backpack', renderInventory, { cls: 'inventory-panel' });
      });
      const restored = await page.evaluate(() => ['character', 'inventory'].map((name) => {
        const panel = document.querySelector(`#panels > [data-panel="${name}"]`), r = panel.getBoundingClientRect();
        return { name, width:r.width, transform:getComputedStyle(panel).transform };
      }));
      if (Math.abs(restored[0].width - 580) > 1 || Math.abs(restored[1].width - 496) > 1 || restored.some((panel) => panel.transform !== 'none')) {
        throw new Error(`Closing ${vendor} did not restore original window scale: ${JSON.stringify(restored)}`);
      }
      await page.evaluate(() => window.VELSCOUR.G.ui.closeAll());
      await page.setViewportSize({ width: 1440, height: 810 });
    }
    report(errors);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
