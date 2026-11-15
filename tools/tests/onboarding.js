// First-skill onboarding stays visible while the player opens the tree and leaves only after learning a skill.
//   node tools/tests/onboarding.js
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame();
  await page.evaluate(async () => {
    const { game } = window.VELSCOUR;
    await game.newChar('wizard', 'Onboarding');
  });
  await page.waitForFunction(() => document.querySelector('.first-skill-tutorial-guide'), null, { timeout: 10000 });

  const initiallyVisible = await page.evaluate(() => {
    const guide = document.querySelector('.first-skill-tutorial-guide');
    const style = getComputedStyle(guide);
    return { visible: !!guide, overflow: style.overflow, height: guide.scrollHeight, clientHeight: guide.clientHeight };
  });
  check(initiallyVisible.visible && initiallyVisible.overflow !== 'auto' && initiallyVisible.height <= initiallyVisible.clientHeight,
    `guide is visible without a scrollbar (${JSON.stringify(initiallyVisible)})`);

  await page.evaluate(async () => {
    const { toggleTree } = await import('/src/ui/skills.js');
    toggleTree();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
  });
  const staysOpen = await page.locator('.first-skill-tutorial-guide').count();
  check(staysOpen === 1, 'guide stays visible while the skill tree is opened and the player clicks elsewhere');

  await page.evaluate(async () => {
    const { G } = window.VELSCOUR;
    const { learn } = await import('/src/ui/skills.js');
    const { CLASS_SKILLS } = await import('/src/data/skills.js');
    learn(CLASS_SKILLS.wizard[0]);
    window._firstSkillLearned = (G.char.skills[CLASS_SKILLS.wizard[0].id] || 0) > 0;
  });
  check(await page.evaluate(() => window._firstSkillLearned && !document.querySelector('.first-skill-tutorial-guide')),
    'guide closes after the first skill is learned');
  report(errors);
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });

function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) process.exitCode = 1;
}

