// Vendor, character equipment and backpack windows must stay ordered and usable together.
//   node tools/tests/vendor_equipment_layout.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1440, height: 810 });
  try {
    await page.click('text=Heroes');
    await page.click('.class-card[data-id="paladin"]');
    await page.click('text=Begin');
    await page.waitForFunction(() => window.VELSCOUR.G.char && window.VELSCOUR.G.world);

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
          addToBag(G.char, rollItem(10, { slot: 'weapon' }));
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
      const panels = await page.evaluate(() => {
        const rect = (name) => {
          const el = document.querySelector(`#panels > [data-panel="${name}"]`);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          trio: document.querySelector('#panels').classList.contains('vendor-trio'),
          stacked: document.querySelector('#panels').classList.contains('vendor-trio-stacked'),
          vendor: rect('vendor'), character: rect('character'), inventory: rect('inventory'),
          service: !!document.querySelector('.vendor-panel .service-box'),
        };
      });
      if (!panels.trio || !panels.vendor || !panels.character || !panels.inventory) throw new Error(`${vendor} did not open all three panels`);
      if (['upgrade', 'enchant', 'socket'].includes(vendor) && !panels.service) throw new Error(`${vendor} service controls are missing`);
      if (vendor === 'upgrade') {
        await page.getByRole('button', { name: /Upgrade to \+1/ }).click();
        const upgraded = await page.evaluate(() => window.VELSCOUR.G.char.bag.find((item) => item && item.type === 'gear').upg === 1);
        if (!upgraded) throw new Error('Blacksmith upgrade did not work with all three windows open');
      }
      if (vendor === 'gems') {
        await page.getByRole('button', { name: /Fuse 3.*Sapphire/ }).click();
        const fused = await page.evaluate(() => window.VELSCOUR.G.char.gemBag.some((gem) => gem && gem.gem === 'sapphire' && gem.tier === 1));
        if (!fused) throw new Error('Gem Merchant fusion did not work with all three windows open');
      }

      if (!panels.stacked) {
        if (panels.vendor.right > panels.character.x + 1 || panels.character.right > panels.inventory.x + 1) {
          throw new Error(`${vendor} windows overlap or are out of order: ${JSON.stringify(panels)}`);
        }
        if (panels.vendor.x < -1 || panels.inventory.right > await page.evaluate(() => innerWidth) + 1) {
          throw new Error(`${vendor} window group extends beyond the screen`);
        }
      } else if (panels.vendor.bottom > panels.character.y + 1 || panels.character.bottom > panels.inventory.y + 1) {
        throw new Error(`${vendor} stacked windows overlap or are out of order: ${JSON.stringify(panels)}`);
      }

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(120);
      const medium = await page.evaluate(() => {
        const get = (name) => { const r = document.querySelector(`#panels > [data-panel="${name}"]`).getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height }; };
        return { stacked: document.querySelector('#panels').classList.contains('vendor-trio-stacked'), vendor:get('vendor'), character:get('character'), inventory:get('inventory') };
      });
      if (!medium.stacked && (medium.vendor.right > medium.character.x + 1 || medium.character.right > medium.inventory.x + 1 || medium.inventory.right > 1025)) {
        throw new Error(`${vendor} windows do not fit at 1024px: ${JSON.stringify(medium)}`);
      }

      await page.setViewportSize({ width: 800, height: 720 });
      await page.waitForTimeout(120);
      const compact = await page.evaluate(() => {
        const host = document.querySelector('#panels');
        const get = (name) => { const r = document.querySelector(`#panels > [data-panel="${name}"]`).getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height }; };
        return { stacked: host.classList.contains('vendor-trio-stacked'), scrollable: getComputedStyle(host).overflowY === 'auto', needsScroll: host.scrollHeight > host.clientHeight, vendor:get('vendor'), character:get('character'), inventory:get('inventory') };
      });
      if (!compact.stacked || !compact.scrollable || !compact.needsScroll) throw new Error(`${vendor} compact layout is not an accessible scrollable stack`);
      if (compact.stacked && (compact.vendor.bottom > compact.character.y + 1 || compact.character.bottom > compact.inventory.y + 1)) {
        throw new Error(`${vendor} stacked windows overlap at 800px: ${JSON.stringify(compact)}`);
      }

      await page.setViewportSize({ width: 600, height: 900 });
      await page.waitForTimeout(120);
      const portrait = await page.evaluate(() => {
        const get = (name) => { const r = document.querySelector(`#panels > [data-panel="${name}"]`).getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height }; };
        return { vendor:get('vendor'), character:get('character'), inventory:get('inventory') };
      });
      if (portrait.vendor.bottom > portrait.character.y + 1 || portrait.character.bottom > portrait.inventory.y + 1 || portrait.inventory.bottom > 901) {
        throw new Error(`${vendor} portrait windows overlap or do not fit: ${JSON.stringify(portrait)}`);
      }
      console.log(`${vendor}: desktop, compact, and portrait layouts passed`);

      await page.evaluate(() => window.VELSCOUR.G.ui.closePanel('vendor'));
      if (await page.locator('#panels > [data-panel="character"], #panels > [data-panel="inventory"]').count()) {
        throw new Error(`Closing ${vendor} did not restore the normal panel state`);
      }
      if (await page.locator('#panels.vendor-trio, #panels.vendor-trio-stacked').count()) {
        throw new Error(`Closing ${vendor} left vendor layout styling active`);
      }
      await page.setViewportSize({ width: 1440, height: 810 });
    }
    report(errors);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
