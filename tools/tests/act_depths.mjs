// Campaign schedule and infinite-depth progression regression checks.
import { ACTS, FINAL_DEPTH, MAX_DEPTH, SUPERBOSS_DEPTHS, endgameScaling, getActForDepth, isActFinaleDepth, isRaidDepth, superbossForDepth } from '../../src/data/depth.js';

const expectedActs = [
  [1, 'The Forsaken Wilds', 1, 25, 25, 'colossus'],
  [2, 'The Scorched Wastes', 26, 50, 50, 'sekhmun'],
  [3, 'The Frozen Peaks', 51, 75, 75, 'hollowmere'],
  [4, "Velscour's Throne", 76, 100, 100, 'velscour'],
];
if (FINAL_DEPTH !== 100 || MAX_DEPTH !== Number.MAX_SAFE_INTEGER) throw new Error('Campaign/endgame depth boundaries are incorrect');
if (ACTS.length !== expectedActs.length) throw new Error(`Expected ${expectedActs.length} acts, found ${ACTS.length}`);
for (const [i, [act, name, start, end, finaleDepth, boss]] of expectedActs.entries()) {
  const actual = ACTS[i];
  if (actual.act !== act || actual.name !== name || actual.start !== start || actual.end !== end || actual.finaleDepth !== finaleDepth || actual.finaleBoss !== boss) throw new Error(`Act ${act} has an unexpected range or finale`);
  if (getActForDepth(start).act !== act || getActForDepth(end).act !== act) throw new Error(`Act ${act} does not own its endpoints`);
  if (!isActFinaleDepth(finaleDepth) || superbossForDepth(finaleDepth) !== boss) throw new Error(`Act ${act} finale boss is not scheduled at Depth ${finaleDepth}`);
}
const bosses = ['valdric', 'pyre', 'maws', 'pontiff', 'colossus', 'ambrecoil', 'hydra', 'scarab', 'kaela', 'sekhmun', 'rimehydra', 'bastion', 'thessaly', 'phoenix', 'hollowmere', 'ophaniel', 'aurion', 'kragmaul', 'organ', 'velscour'];
for (let d = 5; d <= FINAL_DEPTH; d += 5) {
  if (!isRaidDepth(d) && d !== FINAL_DEPTH) throw new Error(`Campaign milestone ${d} is missing its boss marker`);
  if (superbossForDepth(d) !== bosses[d / 5 - 1]) throw new Error(`Unexpected boss assignment at campaign depth ${d}`);
}
if (isRaidDepth(101) || isRaidDepth(105)) throw new Error('Infinite endgame acquired the campaign every-five-depth boss schedule');
const low = endgameScaling(101), milestone = endgameScaling(125), beyond = endgameScaling(501), extreme = endgameScaling(MAX_DEPTH);
if (!(low.health > 1 && low.damage > 1 && milestone.health / low.health > 1.16 && milestone.damage / low.damage > 1.02)) throw new Error('Infinite scaling does not start and compound as expected');
if (!(beyond.health > milestone.health && beyond.damage > milestone.damage)) throw new Error('Infinite scaling stopped after the old depth-500 boundary');
for (const value of Object.values(extreme)) if (!Number.isFinite(value) || value <= 0) throw new Error('Extreme-depth scaling produced an invalid number');
console.log('Four-act campaign, 20 boss milestones, and safe infinite-depth scaling OK');
