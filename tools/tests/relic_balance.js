// Heirlooms and Covenant Tier 20 baselines. Covenant pieces are checked against the actual T20 damage, armor and affix
// formulas; a full set's bonuses are also compared with five ordinary T20 items using the game's equipment score.
//   node tools/tests/relic_balance.js [classes] [samples]     # default paladin,wizard,ranger 16
const { openGame, report } = require('./harness');
const classes = (process.argv[2] || 'paladin,wizard,ranger').split(',');
const samples = +(process.argv[3] || 16);

(async () => {
  const { browser, page, errors } = await openGame();
  let fail = 0;
  const bad = (m) => { fail++; console.log('FAIL ' + m); };
  const rows = [];
  for (const cls of classes) {
    const res = await page.evaluate(async ({ cls, samples }) => {
      const { G, game } = window.VELSCOUR;
      const { Auto, charScore } = await import('/tools/tests/auto_player.js');
      const { rollItem, RING_SLOTS } = await import('/src/data/items.js');
      const R = await import('/src/data/relics.js');
      const { CLASSES } = await import('/src/data/classes.js');
      if (Auto.on) Auto.toggle(false);
      let c, p;
      const C = CLASSES[cls];
      const slots = ['weapon', ...(C.offhand ? ['offhand'] : []), 'head', 'body', 'hands', 'legs', 'feet', ...RING_SLOTS];
      const setLevel = async (lvl) => {
        await game.newChar(cls, 'Relics');
        document.querySelectorAll('.screen').forEach((s) => s.remove()); G.ui.modalCount = 0; G.ui.closeAll();
        c = G.char; p = G.player;
        c.level = lvl; c.depth = lvl; c.statPoints = (lvl - 1) * 5; c.skillPoints = lvl * 2;
        Auto.spendStats(); Auto.spendSkills(); Auto.arrangeBar();
      };
      const slotOf = (s) => (s.startsWith('ring') ? 'ring' : s);
      const roll = (slot, ilvl, kind) => {
        const sl = slotOf(slot);
        if (kind === 'heir') return R.makeHeirloom(ilvl, { slot: sl }) || rollItem(ilvl, { slot: sl, rarity: 4 });
        return rollItem(ilvl, { slot: sl, rarity: kind, base: slot === 'weapon' ? C.weapon : slot === 'offhand' ? C.offhand : undefined });
      };
      const realRandom = Math.random;
      const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const score = (ilvl, kind, H, only = null) => {
        let t = 0, k = 0;
        const rb = seeded(1234), ri = seeded(98765);
        try {
          for (let i = 0; i < samples; i++) {
            Math.random = rb;
            const base = {}; for (const s of slots) base[s] = roll(s, H, 0);
            for (const s of only || slots) {
              for (const x of slots) c.equip[x] = base[x];
              Math.random = ri;
              c.equip[s] = roll(s, ilvl, kind);
              Math.random = realRandom;
              p.recompute(); t += charScore(p); k++;
            }
          }
        } finally { Math.random = realRandom; }
        return t / k;
      };
      // a whole set worn over the Commons, per set: score of the set vs the same five slots holding Epics / Mythics
      const setScore = (H, kind) => {
        let t = 0, k = 0;
        const rb = seeded(555), ri = seeded(777);
        try {
          for (const S of R.COVENANTS) {
            for (let i = 0; i < Math.max(4, samples / 4); i++) {
              Math.random = rb;
              for (const x of slots) c.equip[x] = roll(x, H, 0);
              Math.random = ri;
              const used = new Set();
              for (const q of S.pieces) {
                const slot = q.slot === 'ring' ? RING_SLOTS.find((r) => !used.has(r)) : q.slot;
                used.add(slot);
                if (!slots.includes(slot) && q.slot !== 'ring') continue;
                c.equip[slot] = kind === 'set' ? R.makeCovenant(H, { pieceId: q.id, preview: true }) : rollItem(H, { slot: q.slot, rarity: kind, base: q.base });
              }
              Math.random = realRandom;
              p.recompute(); t += charScore(p); k++;
            }
          }
        } finally { Math.random = realRandom; }
        return t / k;
      };
      const worth = (curve, s) => {
        for (let i = 1; i < curve.length; i++) if (curve[i][1] >= s) { const [l0, s0] = curve[i - 1], [l1, s1] = curve[i]; return l0 + (l1 - l0) * (s - s0) / Math.max(1e-9, s1 - s0); }
        return Infinity;
      };
      const out = {};
      const quality = { checked: 0, issues: [] };
      for (const S of R.COVENANTS) for (const piece of S.pieces) {
        const it = R.makeCovenant(70, { pieceId: piece.id, preview: true });
        if (!it || it.rarity !== 19 || it.relic !== 'cov' || it.rid !== piece.id) quality.issues.push(piece.id + ': category/quality');
        if (piece.slot === 'weapon') {
          const W = (await import('/src/data/items.js')).WEAPONS[piece.base];
          const pl = (await import('/src/data/items.js')).powerLevel(70, 19), avg = (6 + pl * 1.8 + 0.022 * pl * pl) * W.dmg;
          if (!it?.dmg || it.dmg[0] !== Math.max(1, Math.round(avg * 0.8)) || it.dmg[1] !== Math.max(2, Math.round(avg * 1.2))) quality.issues.push(piece.id + ': weapon damage');
        } else if (piece.slot !== 'ring') {
          const I = await import('/src/data/items.js'), mult = piece.slot === 'offhand' ? (I.OFFHANDS[piece.base] || I.OFFHANDS.shield).armor : I.ARMORS[piece.slot].armor;
          const expected = 8 + (I.powerLevel(70, 19) * 2.4) + 0.025 * I.powerLevel(70, 19) ** 2;
          if (!it?.armor || it.armor < Math.round(expected * mult * 0.9) || it.armor > Math.round(expected * mult * 1.1)) quality.issues.push(piece.id + ': T20 armor range');
        }
        for (const [stat, k] of piece.lines) {
          const I = await import('/src/data/items.js'), expected = R.lineValue(stat, 70, k * R.TUNE.cov, I.RARITY_TIER_20);
          if (it?.affixes.find((a) => a.s === stat && a.relic)?.v !== expected) quality.issues.push(piece.id + ': ' + stat + ' T20 affix scale');
        }
        quality.checked++;
      }
      for (const H of [60, 120]) {
        await setLevel(H + 4);
        const curve = []; for (let l = H - 10; l <= H + 60; l += 2) curve.push([l, score(l, 0, H)]);
        out[H] = { epic: +(worth(curve, score(H, 3, H)) - H).toFixed(1), legendary: +(worth(curve, score(H, 4, H)) - H).toFixed(1),
          mythic: +(worth(curve, score(H, 5, H)) - H).toFixed(1), tier20: +(worth(curve, score(H, 19, H)) - H).toFixed(1), heir: +(worth(curve, score(H, 'heir', H)) - H).toFixed(1),
          set: +(setScore(H, 'set') - setScore(H, 3)).toFixed(3), setVsT20: +(setScore(H, 'set') - setScore(H, 19)).toFixed(3) };
      }
      return { out, quality };
    }, { cls, samples });
    console.log(`\n${cls}: set comparison versus ordinary T20 (set bonuses across five slots); T20 baseline checks ${res.quality.checked} Covenant pieces`);
    if (res.quality.issues.length) bad(`${cls}: T20 baseline issues ${res.quality.issues.join(', ')}`);
    for (const [H, r] of Object.entries(res.out)) { console.log(`  H ${String(H).padEnd(4)} ${JSON.stringify(r)}`); rows.push(r); }
  }
  const avg = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
  const A = { set: avg('set'), setVsT20: avg('setVsT20') };
  console.log('\naverage', JSON.stringify(Object.fromEntries(Object.entries(A).map(([k, v]) => [k, +v.toFixed(2)]))));
  if (!(A.set > 0)) bad('a full set should beat five Epics');
  if (!(A.setVsT20 < 0.25)) bad(`a full set should not beat five Tier 20 items by much (${A.setVsT20.toFixed(3)})`);
  report(errors);
  if (fail) process.exitCode = 1;
  await browser.close();
})();
