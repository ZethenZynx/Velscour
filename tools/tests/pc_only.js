// Verifies desktop browsers boot the game while touch-first devices are shown the PC-only notice.
// Run with the game files served locally and CHROMIUM_PATH pointing to Edge if desired:
//   node tools/tests/pc_only.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8123';
const root = path.resolve(__dirname, '../..');
const executablePath = process.env.CHROMIUM_PATH;

async function serveCheckout(page) {
  const base = new URL(BASE_URL);
  await page.route(base.origin + '/**', async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return route.fulfill({ status: 404, body: 'Not found' });
    }
    const mime = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
    return route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
}

(async () => {
  const launchOptions = executablePath ? { executablePath } : {};
  const browser = await chromium.launch(launchOptions);
  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await serveCheckout(desktop);
    await desktop.goto(BASE_URL + '/index.html');
    await desktop.waitForFunction(() => window.VELSCOUR && document.querySelector('#loading').classList.contains('hidden'));
    assert.strictEqual(await desktop.title(), 'Velscour PC');
    assert.strictEqual(await desktop.locator('#pc-only-notice').isVisible(), false);
    assert.strictEqual(await desktop.locator('link[rel="manifest"], meta[name="apple-mobile-web-app-capable"]').count(), 0);
    console.log('PASS: Desktop browser starts Velscour PC.');

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage();
    await serveCheckout(mobile);
    await mobile.goto(BASE_URL + '/index.html');
    await mobile.waitForFunction(() => document.documentElement.classList.contains('pc-only-blocked'));
    assert.strictEqual(await mobile.locator('#pc-only-notice').isVisible(), true);
    assert.match(await mobile.locator('#pc-only-notice').innerText(), /mouse and keyboard/i);
    assert.strictEqual(await mobile.evaluate(() => window.VELSCOUR), undefined);
    await mobileContext.close();
    console.log('PASS: Touch-first browser receives the PC-only notice without starting game code.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

