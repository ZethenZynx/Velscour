// Auto-equip only fills eligible, matching slots left empty by the player.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1280, height: 720 });
  await page.click('text=Heroes');
  await page.click('.class-card[data-id="wizard"]');
  await page.click('text=Begin');
  await page.waitForTimeout(900);

  const result = await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { Vendor } = await import('/src/ui/vendor.js');
    const { SLOTS, rollItem } = await import('/src/data/items.js');
    const { settingsDialog } = await import('/src/ui/screens.js');
    const c = G.char;
    const checks = {};
    const emptyEquipment = () => Object.fromEntries(SLOTS.map((slot) => [slot, null]));
    const pickup = (item) => G.player.pickup({ kind: 'item', item, label: item.name || item.slot, color: '#fff', warned: false });

    checks.defaultOn = G.settings.autoEquip !== false;
    c.equip = emptyEquipment();
    c.bag = Array(c.bag.length).fill(null);
    G.player.recompute();
    G.settings.autoEquip = true;

    const firstRing = rollItem(1, { slot: 'ring', rarity: 0, generic: true });
    pickup(firstRing);
    checks.dropEquippedToEmptyRing = c.equip.ring1 === firstRing && c.bag.every((item) => !item);

    const secondRing = rollItem(1, { slot: 'ring', rarity: 0, generic: true });
    pickup(secondRing);
    checks.ringUsesNextEmptySlot = c.equip.ring2 === secondRing;

    for (const slot of ['ring3', 'ring4']) c.equip[slot] = rollItem(1, { slot: 'ring', rarity: 0, generic: true });
    const fullSlotRing = rollItem(1, { slot: 'ring', rarity: 0, generic: true });
    pickup(fullSlotRing);
    checks.fullSlotsDoNotReplace = c.equip.ring1 === firstRing && c.bag.includes(fullSlotRing);

    G.settings.autoEquip = false;
    const disabledHead = rollItem(1, { slot: 'head', rarity: 0, generic: true });
    pickup(disabledHead);
    checks.settingOffKeepsGearInBag = !c.equip.head && c.bag.includes(disabledHead);

    G.settings.autoEquip = true;
    const vendorItem = rollItem(1, { slot: 'feet', rarity: 0, generic: true });
    c.gold = 100000;
    const goldBefore = c.gold;
    const stock = [vendorItem];
    checks.vendorPurchaseSucceeds = Vendor.buy({ list: stock, i: 0 });
    checks.vendorGearEquipped = c.equip.feet === vendorItem;
    checks.vendorPurchaseCharged = c.gold < goldBefore;

    const tooHighLevel = rollItem(1, { slot: 'body', rarity: 0, generic: true });
    tooHighLevel.req = c.level + 10;
    pickup(tooHighLevel);
    checks.levelRequirementKeptInBag = !c.equip.body && c.bag.includes(tooHighLevel);

    const explicitBagItem = rollItem(1, { slot: 'head', rarity: 0, generic: true });
    const explicitStock = [explicitBagItem];
    checks.explicitVendorBagPlacement = Vendor.buy({ list: explicitStock, i: 0 }, 0) && !c.equip.head && c.bag[0] === explicitBagItem;

    settingsDialog();
    const input = document.querySelector('.settings-dialog [data-k="autoEquip"]');
    checks.settingAppearsChecked = !!input && input.checked;
    if (input) {
      input.checked = false;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const saved = JSON.parse(localStorage.getItem('velscour_settings_v1') || '{}');
    checks.settingSaves = saved.autoEquip === false;
    return checks;
  });

  let failures = 0;
  for (const [name, passed] of Object.entries(result)) {
    console.log(`${passed ? 'ok   ' : 'FAIL '} ${name}`);
    if (!passed) failures++;
  }
  report(errors);
  await browser.close();
  process.exit(failures || errors.length ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
