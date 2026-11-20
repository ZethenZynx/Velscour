import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ACTIVE_CLASS_IDS, CLASSES } from '../../src/wiki/wiki-data.js';
import { SKILLS } from '../../src/data/skills.js';
import { TALENTS, CLASS_TALENTS, canLearnTalent } from '../../src/data/talents.js';
import { ACTS, FINAL_DEPTH, ENDGAME_START_DEPTH } from '../../src/data/depth.js';
import { BESTIARY } from '../../src/data/bestiary.js';
import { DUNGEON_EVENTS } from '../../src/game/dungeonevents.js';
import { searchWikiIndex, WIKI_SECTIONS } from '../../src/wiki/wiki-shell.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pages = ['wiki.html', 'classes.html', 'skills.html', 'talents.html', 'gear.html', 'world.html', 'bestiary.html', 'lore.html'];
for (const page of pages) {
  const html = await readFile(path.join(root, page), 'utf8');
  assert.match(html, /src="src\/wiki\/wiki-boot\.js"/, `${page} mounts the shared Wiki header`);
  assert.match(html, /src\/wiki\/wiki-shell\.js/, `${page} loads shared search and navigation`);
  assert.match(html, /css\/wiki\.css/, `${page} uses the shared Wiki theme`);
  assert.doesNotMatch(html, /velscour-online-v2|velscour\.dagyr\.me|velscour\.com/i, `${page} has no upstream or multiplayer links`);
  for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|#|data:|javascript:|mailto:)/i.test(reference) || reference.includes('${')) continue;
    const localPath = reference.split(/[?#]/, 1)[0];
    if (localPath) await access(path.join(root, localPath));
  }
}

const titleScreen = await readFile(path.join(root, 'src/ui/screens.js'), 'utf8');
assert.match(titleScreen, /id = 'title-wiki-btn'/);
assert.match(titleScreen, /new URL\('wiki\.html', window\.location\.href\)/);
assert.match(titleScreen, /target = '_blank'/);
assert.match(titleScreen, /book|wiki/i);
assert.equal(ACTIVE_CLASS_IDS.length, Object.keys(CLASSES).length);
assert.equal(WIKI_SECTIONS.length, 8);
assert.equal(ACTS.length, 4);
assert.equal(FINAL_DEPTH, 100);
assert.equal(ENDGAME_START_DEPTH, 101);
assert.equal(Object.keys(SKILLS).length, 684);
assert.equal(Object.keys(TALENTS).length, 456);
assert.equal(BESTIARY.length, 1090);
assert.ok(DUNGEON_EVENTS.some((event) => event.name === 'Crystal Bloom'));

// The calculator uses the live talent tree data and enforces its first-rank unlock path.
const paladinTree = CLASS_TALENTS.paladin[0];
const firstTalent = paladinTree.nodes.find((node) => node.row === 0);
const secondTier = paladinTree.nodes.find((node) => node.row === 1);
const calculatorHero = { classId: 'paladin', level: 100, talentPoints: 20, talents: {} };
assert.ok(canLearnTalent(calculatorHero, firstTalent));
assert.equal(canLearnTalent(calculatorHero, secondTier), false);
calculatorHero.talents[firstTalent.id] = 1;
assert.ok(canLearnTalent(calculatorHero, secondTier));

for (const term of ['Rogue', 'Crystal Bloom', 'Sea of Sand', 'Tier 20', 'Infernal Marks', 'Crown of the Demon Lord']) {
  const matches = await searchWikiIndex(term, 8);
  assert.ok(matches.length, `global search returns a result for ${term}`);
  assert.ok(matches.every((item) => !/^https?:\/\//i.test(item.href)), `${term} results stay within the PC Wiki`);
}

console.log(`Wiki smoke checks passed: ${pages.length} pages, ${ACTIVE_CLASS_IDS.length} classes, ${Object.keys(SKILLS).length} skills, ${Object.keys(TALENTS).length} talents, and local-data global search.`);
