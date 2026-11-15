// Movement skills fire once while an input stays held and never receive cast echoes.
const { openGame, report } = require('./harness');

(async () => {
  const { browser, page, errors } = await openGame();
  const result = await page.evaluate(async () => {
    const { G, game } = window.VELSCOUR;
    const { SKILLS } = await import('/src/data/skills.js');
    const skill = Object.values(SKILLS).find((sk) => sk.kind === 'blink');
    if (!skill) throw new Error('No Blink skill was found');

    await game.newChar(skill.classId, 'Movement test');
    document.querySelectorAll('.screen').forEach((screen) => screen.remove());
    G.ui.modalCount = 0;
    const { BIOME_BY_ID } = await import('/src/data/biomes.js');
    game.buildDungeon(8, BIOME_BY_ID.catacombs);

    const p = G.player;
    G.char.skills[skill.id] = 1;
    G.char.bar[0] = skill.id;
    G.char.bar[1] = skill.id;
    G.char.bar[13] = skill.id;
    p.recompute();
    p.mana = p.maxMana;
    p.st.echoChance = 500;
    p.castLock = 0;
    p.cooldowns = {};

    const { controls } = await import('/src/game/controls.js');
    const { input } = await import('/src/core/input.js');
    const { Timer } = await import('/src/game/skillrun.js');
    let calls = 0;
    const originalTryUseSkill = p.tryUseSkill;
    p.tryUseSkill = function (...args) { calls++; return originalTryUseSkill.apply(this, args); };

    input.reset();
    input.lastPointerType = 'mouse';
    input.mouse.inside = false;
    input.keys.add('Digit1');
    input.pressed.add('Digit1');
    controls.update(1 / 60);
    const keyboardFirstPress = calls;
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    controls.update(1 / 60);
    const keyboardHeldRepeat = calls - keyboardFirstPress;
    input.keys.delete('Digit1');
    controls.update(1 / 60);
    const beforeKeyboardPressAgain = calls;
    input.keys.add('Digit1'); input.pressed.add('Digit1');
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    controls.update(1 / 60);
    const keyboardNewPress = calls - beforeKeyboardPressAgain;

    input.reset();
    input.lastPointerType = 'mouse';
    input.mouse.inside = false;
    input.keys.add('ShiftLeft');
    input.mouse.left = true;
    input.mouse.leftPressed = true;
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    const beforeLmbPress = calls;
    controls.update(1 / 60);
    const lmbFirstPress = calls - beforeLmbPress;
    const afterLmbPress = calls;
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    controls.update(1 / 60);
    const lmbHeldRepeat = calls - afterLmbPress;

    input.reset();
    input.lastPointerType = 'mouse';
    input.mouse.inside = false;
    input.mouse.right = true;
    input.mouse.rightPressed = true;
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    const beforeRmbPress = calls;
    controls.update(1 / 60);
    const rmbFirstPress = calls - beforeRmbPress;
    const afterRmbPress = calls;
    p.castLock = 0; p.cooldowns[skill.id] = 0;
    controls.update(1 / 60);
    const rmbHeldRepeat = calls - afterRmbPress;

    const timersBefore = G.world.hazards.filter((hazard) => hazard instanceof Timer).length;
    p.castLock = 0; p.cooldowns[skill.id] = 0; p.mana = p.maxMana;
    const echoTestCast = p.tryUseSkill(skill, p.x + 1, p.y);
    const timersAfter = G.world.hazards.filter((hazard) => hazard instanceof Timer).length;
    p.tryUseSkill = originalTryUseSkill;
    return {
      skill: skill.name, keyboardFirstPress, keyboardHeldRepeat, keyboardNewPress,
      lmbFirstPress, lmbHeldRepeat, rmbFirstPress, rmbHeldRepeat,
      echoTestCast, echoTimers: timersAfter - timersBefore,
    };
  });

  console.log(result);
  if (result.keyboardFirstPress !== 1 || result.keyboardHeldRepeat || result.keyboardNewPress !== 1 ||
      result.lmbFirstPress !== 1 || result.lmbHeldRepeat || result.rmbFirstPress !== 1 ||
      result.rmbHeldRepeat || !result.echoTestCast || result.echoTimers) {
    console.error('FAIL movement skill repeated while held or created an echo');
    process.exitCode = 1;
  } else console.log('PASS movement skill only fires once per input and cannot echo');
  report(errors);
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
