// Deterministic ordinary-encounter distribution soak across regions and depths.
// Run from the repository root: node tools/tests/enemy_composition.mjs
import assert from 'node:assert/strict';
import { generateDungeon } from '../../src/world/dungeon.js';
import { BIOMES } from '../../src/data/biomes.js';
import { ARCH } from '../../src/data/enemies.js';
import { ENEMY_PROFILE_BY_ARCH, ENEMY_PROFILES } from '../../src/data/enemyvariety.js';
import { chooseEncounterArchetype, encounterRole } from '../../src/data/enemycomposition.js';
import { RNG } from '../../src/core/util.js';

const regions = ['catacombs', 'castle_keep', 'molten', 'fungal', 'frozen', 'desert', 'void', 'sewers', 'storm'];
const depths = [5, 25, 60, 120];
const seeds = 25;
const directions = ['NE', 'SE', 'SW', 'NW'];
const masks = {};
for (let mask = 0; mask < 16; mask++) masks[mask] = [directions.filter((_, bit) => mask & (1 << bit)).map((arm) => ({ arm, ox: 0, oy: 0 }))];
const tileset = {
  floors: [{ name: 'base', lum: 0.2 }, { name: 'base2', lum: 0.2 }, { name: 'feature', lum: 0.2 }],
  bases: [0, 1], features: [2], walls: { mock: masks }, families: ['mock'], arches: {}, doors: {}, scatter: [],
};
const totals = Object.fromEntries(['melee', 'ranged', 'caster', 'support', 'special'].map((r) => [r, 0]));
const byRegion = Object.fromEntries(regions.map((r) => [r, Object.fromEntries(['melee', 'ranged', 'caster', 'support', 'special', 'total'].map((x) => [x, 0]))]));
let longestSameRoleStreak = 0;
const getBiome = (id) => BIOMES.find((b) => b.id === id);

for (const region of regions) {
  const biome = getBiome(region);
  assert.ok(biome?.roster?.length, `Missing themed roster for ${region}`);
  for (const depth of depths) for (let seed = 1; seed <= seeds; seed++) {
    const result = generateDungeon(depth, biome, tileset, `${region}-${depth}-${seed}`);
    const rng = new RNG(`${region}-${depth}-${seed}-effects`);
    const ordinary = result.spawns.filter((s) => s.rank === 'normal');
    let previousRole = null, sameRoleStreak = 0;
    for (const spawn of ordinary) {
      assert.ok(biome.roster.includes(spawn.arch), `${region} spawned out-of-theme ${spawn.arch}`);
      const A = ARCH[spawn.arch];
      const profileIds = ENEMY_PROFILE_BY_ARCH[spawn.arch] || [];
      const behaviors = profileIds.flatMap((p) => ENEMY_PROFILES[p]?.behaviors || []);
      if (A.ai === 'charger') {
        const idx = behaviors.indexOf('charging_rush');
        if (idx >= 0) behaviors.splice(idx, 1);
      }
      const groupRole = encounterRole(spawn.arch, A.ai, behaviors);
      if (groupRole === previousRole) sameRoleStreak++;
      else { previousRole = groupRole; sameRoleStreak = 1; }
      longestSameRoleStreak = Math.max(longestSameRoleStreak, sameRoleStreak);
      for (let i = 0; i < spawn.n; i++) {
        const memberBehaviors = behaviors.slice();
        if (spawn.arch === 'zombie' && rng.next() < 0.2) memberBehaviors.push('unstable_death');
        const role = encounterRole(spawn.arch, A.ai, memberBehaviors);
        totals[role]++;
        byRegion[region][role]++;
        totals.total = (totals.total || 0) + 1;
        byRegion[region].total++;
      }
    }
  }
}

const pct = (part, whole) => `${(part * 100 / whole).toFixed(1)}%`;
console.log(`Ordinary enemy composition (generated dungeon packs; ${regions.length} regions × ${depths.length} depths × ${seeds} seeds)`);
for (const [region, v] of Object.entries(byRegion)) {
  console.log(`${region.padEnd(10)} melee ${pct(v.melee, v.total)} ranged ${pct(v.ranged, v.total)} caster ${pct(v.caster, v.total)} support ${pct(v.support, v.total)} special ${pct(v.special, v.total)} (${v.total})`);
}
console.log(`ALL        melee ${pct(totals.melee, totals.total)} ranged ${pct(totals.ranged, totals.total)} caster ${pct(totals.caster, totals.total)} support ${pct(totals.support, totals.total)} special ${pct(totals.special, totals.total)} (${totals.total})`);
console.log(`Longest same-role run across ordinary spawn groups: ${longestSameRoleStreak}`);

assert.ok(pct(totals.special, totals.total) !== 'NaN', 'No generated ordinary enemies were measured');
assert.ok(totals.special / totals.total <= 0.30, 'Special attackers should remain occasional rather than dominate encounters');
assert.ok(longestSameRoleStreak <= 3, 'Repeated same-role groups are too common');
for (const region of regions) {
  const roster = getBiome(region).roster;
  const hasRanged = roster.some((id) => ['ranged', 'turret'].includes(ARCH[id]?.ai));
  const hasCaster = roster.some((id) => ['caster', 'nova', 'beamer'].includes(ARCH[id]?.ai));
  if (hasRanged) assert.ok(byRegion[region].ranged > 0, `${region} has ranged archetypes but generated none`);
  if (hasCaster) assert.ok(byRegion[region].caster + byRegion[region].support > 0, `${region} has caster/support archetypes but generated none`);
  assert.ok(byRegion[region].special / byRegion[region].total <= 0.30, `${region} is dominated by special attackers`);
}
const stillEligible = chooseEncounterArchetype(['skeleton', 'hound'], { total: 100, melee: 50, special: 50 }, [],
  (arch) => ({ role: arch === 'hound' ? 'special' : 'melee', packMax: 3 }),
  { next: () => 0.999999 });
assert.equal(stillEligible, 'hound', 'special families remain selectable above their preferred share');
