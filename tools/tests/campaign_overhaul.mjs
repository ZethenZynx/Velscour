// Isolated regression checks for campaign progression, endgame scaling, gear eligibility, and the one-time save reset.
import assert from 'node:assert/strict';
import { ACTS, FINAL_DEPTH, MAX_DEPTH, MAX_LEVEL, SUPERBOSS_DEPTHS, endgameScaling } from '../../src/data/depth.js';
import { RAID_BOSSES } from '../../src/game/raid.js';
import { RARITY, TIER_20_MIN_DEPTH, qualityAtDepth, sigilCap, RARITY_TIER_20 } from '../../src/data/items.js';
import { affixCountForStreak, rollDungeonAffixesForStreak } from '../../src/data/dungeonaffixes.js';
import { makeCovenant } from '../../src/data/relics.js';

assert.equal(FINAL_DEPTH, 100);
assert.equal(MAX_LEVEL, 100);
assert.equal(MAX_DEPTH, Number.MAX_SAFE_INTEGER);
assert.deepEqual(ACTS.map((a) => [a.start, a.end]), [[1, 25], [26, 50], [51, 75], [76, 100]]);
assert.equal(Object.keys(SUPERBOSS_DEPTHS).length, 20);
for (const [depth, id] of Object.entries(SUPERBOSS_DEPTHS)) {
  assert.equal(Number(depth) % 5, 0, `boss milestone ${depth} is not every five campaign depths`);
  if (id !== 'velscour') assert.ok(RAID_BOSSES.some((boss) => boss.id === id), `missing assigned campaign boss ${id}`);
}
assert.deepEqual([25, 50, 75, 100].map((depth) => SUPERBOSS_DEPTHS[depth]), ['colossus', 'sekhmun', 'hollowmere', 'velscour']);
for (let tier = 0; tier < RARITY.length; tier++) {
  const depth = 1 + tier * 25;
  assert.equal(RARITY[tier].minDepth, depth);
  assert.equal(qualityAtDepth(depth), tier);
  assert.equal(sigilCap(depth), tier);
  if (tier) assert.equal(qualityAtDepth(depth - 1), tier - 1);
}
assert.equal(TIER_20_MIN_DEPTH, 476);
assert.equal(makeCovenant(100, { depth: 100 }), null);
const setPiece = makeCovenant(476, { depth: 476 });
assert.equal(setPiece?.rarity, RARITY_TIER_20);
assert.ok(setPiece?.cset, 'endgame Set gear keeps its distinct set identity');
for (const [streak, count] of [[0, 0], [4, 0], [5, 1], [9, 1], [10, 2], [15, 3], [20, 4], [25, 5], [500, 5]]) {
  assert.equal(affixCountForStreak(streak), count);
  assert.equal(rollDungeonAffixesForStreak(streak, () => 0.25, [], true).length, count);
}
for (const d of [101, 125, 500, 10000, MAX_DEPTH]) {
  const s = endgameScaling(d);
  assert.ok(Number.isFinite(s.health) && s.health >= 1 && s.health <= 1e100);
  assert.ok(Number.isFinite(s.damage) && s.damage >= 1 && s.damage <= 1e20);
}
assert.ok(endgameScaling(500).health > endgameScaling(500).damage);
assert.ok(endgameScaling(MAX_DEPTH).health > endgameScaling(500).health);

class MemoryStorage {
  data = new Map();
  failKey = null;
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { if (this.failKey === key) { this.failKey = null; throw new Error('simulated storage failure'); } this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  key(index) { return [...this.data.keys()][index] ?? null; }
  get length() { return this.data.size; }
}
globalThis.localStorage = new MemoryStorage();
globalThis.dispatchEvent = () => true;
const { applyCampaignOverhaulReset, campaignOverhaulBackup, listSaves } = await import('../../src/game/save.js?campaign-overhaul-test');
const storage = globalThis.localStorage;
storage.setItem('velscour_saves_v1', '[{"id":"old"}]');
storage.setItem('velscour_endgame_v1', '{"unlocked":1}');
storage.setItem('velscour_reliquary_v1', '{"items":[1]}');
storage.setItem('velscour_bard_heard', '["song"]');
storage.setItem('velscour_taunts_v1', '{"seen":1}');
storage.setItem('velscour_settings_v1', '{"volume":0.4}');
assert.equal(applyCampaignOverhaulReset(), true);
assert.deepEqual(listSaves(), []);
assert.equal(storage.getItem('velscour_endgame_v1'), null);
assert.equal(storage.getItem('velscour_reliquary_v1'), null);
assert.equal(storage.getItem('velscour_bard_heard'), null);
assert.equal(storage.getItem('velscour_taunts_v1'), null);
assert.equal(storage.getItem('velscour_settings_v1'), '{"volume":0.4}');
assert.equal(campaignOverhaulBackup().saves, '[{"id":"old"}]');
storage.setItem('velscour_saves_v1', '[{"id":"new"}]');
assert.equal(applyCampaignOverhaulReset(), true);
assert.equal(storage.getItem('velscour_saves_v1'), '[{"id":"new"}]', 'successful reset runs only once');

// A separate module instance and storage simulate a failure during clearing; the snapshot must be restored.
globalThis.localStorage = new MemoryStorage();
const rollbackStore = globalThis.localStorage;
rollbackStore.setItem('velscour_saves_v1', '[{"id":"keep"}]');
rollbackStore.failKey = 'velscour_saves_v1';
const resetModule = await import('../../src/game/save.js?campaign-overhaul-rollback-test');
assert.equal(resetModule.applyCampaignOverhaulReset(), false);
assert.equal(rollbackStore.getItem('velscour_saves_v1'), '[{"id":"keep"}]');
assert.equal(rollbackStore.getItem('velscour_campaign_overhaul_reset_v1'), null);

console.log('100-depth progression, 20-tier eligibility, affix streaks, safe scaling, and isolated one-time reset checks OK');
