// Regression checks for the six-act campaign schedule and relocated finale bosses.
import { ACTS, FINAL_DEPTH, SUPERBOSS_DEPTHS, getActForDepth, isActFinaleDepth, isRaidDepth, superbossForDepth } from '../../src/data/depth.js';

const expected = [
  [1, 'The Fallen Realms', 1, 95, 96, 'colossus'],
  [2, 'The Scorched Wastes', 96, 191, 192, 'sekhmun'],
  [3, 'The Frozen Peaks', 192, 287, 288, 'hollowmere'],
  [4, 'The Empyrean Heights', 288, 359, 360, 'aurion'],
  [5, 'The Infernal Dominion', 360, 455, 456, 'kragmaul'],
  [6, "Velscour's Throne", 456, 500, 500, 'velscour'],
];
if (ACTS.length !== expected.length) throw new Error(`Expected ${expected.length} acts, found ${ACTS.length}`);
for (const [i, [act, name, start, end, finaleDepth, boss]] of expected.entries()) {
  const actual = ACTS[i];
  if (actual.act !== act || actual.name !== name || actual.start !== start || actual.end !== end || actual.finaleDepth !== finaleDepth || actual.finaleBoss !== boss) {
    throw new Error(`Act ${act} has an unexpected range or finale`);
  }
  if (getActForDepth(start).act !== act || getActForDepth(end).act !== act) throw new Error(`Act ${act} does not own its endpoints`);
  if (!isActFinaleDepth(finaleDepth) || superbossForDepth(finaleDepth) !== boss) throw new Error(`Act ${act} finale boss is not scheduled at Depth ${finaleDepth}`);
  if (finaleDepth !== FINAL_DEPTH && !isRaidDepth(finaleDepth)) throw new Error(`Act finale Depth ${finaleDepth} does not open a boss room`);
}
for (const [depth, act] of [[96, 2], [192, 3], [288, 4], [360, 5], [456, 6]]) {
  if (getActForDepth(depth).act !== act) throw new Error(`Boundary Depth ${depth} should belong to Act ${act}`);
}
for (const [depth, boss] of [[50, 'valdric'], [150, 'ambrecoil'], [250, 'kaela'], [350, 'ophaniel']]) {
  if (SUPERBOSS_DEPTHS[depth] !== boss) throw new Error(`Mid-act superboss at Depth ${depth} unexpectedly changed`);
}
console.log('Six-act campaign schedule and finale boss depths OK');
