// The standalone Velscour Defense game and its main-game entry points have been removed.
//   node tools/tests/no_defense.js   (start the server first)
const assert = require('node:assert/strict');
const { openGame, report, BASE_URL } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame({ width: 1366, height: 860 });
  try {
    const title = await page.locator('.title-menu').innerText();
    assert.doesNotMatch(title, /VELSCOUR DEFENSE|Riftgate/i, 'title screen still links to Defense');

    await page.evaluate(() => window.VELSCOUR.game.newChar('paladin', 'No Defense Test'));
    const portals = await page.evaluate(() => window.VELSCOUR.G.world.portals.map((p) => String(p.label || '')));
    assert(portals.some((label) => label.startsWith('Portal')), 'main dungeon portal is missing');
    assert(!portals.some((label) => /VELSCOUR DEFENSE|Riftgate/i.test(label)), 'town still exposes the Defense portal');

    const defensePage = await page.request.get(`${BASE_URL}/defense/index.html`);
    assert.equal(defensePage.status(), 404, 'standalone Defense page is still present');
    report(errors);
    console.log('No Defense title link or town portal; main portal remains; /defense/index.html returns 404.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
