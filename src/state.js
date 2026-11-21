// Global game state singleton. Modules import G and read fields at runtime.
export const G = {
  canvas: null,
  ctx: null,
  W: 0, // css pixels
  H: 0,
  dpr: 1,
  touch: false,
  assets: null,
  world: null,
  player: null,
  char: null, // persistent character record (saved)
  mode: 'loading', // loading | title | game
  paused: false, // simulation paused (menus on desktop keep running in town)
  critterTutorial: null, // the first gilded critter is held still until the player collects it
  time: 0,
  dt: 0,
  frame: 0,
  hitStop: 0,
  settings: {
    sfx: 0.6,
    music: 0.35,
    amb: 0.5,
    gore: 2, // 0 off, 1 normal, 2 extreme
    dmgNumbers: true,
    shake: true,
    reduceFlashing: false, // reduce full-screen flashes, flashbangs, and rapid hit strobing
    zoom: 1,
    tabMapTransparency: 45, // percentage: map terrain opacity is the inverse; markers remain fully visible
    hideItemNames: false, // no item name labels on the ground (hover still shows one)
    allItemNames: false, // every drop nearby named, with no budget (game/loot.js drawLootLabels)
    outlines: true, // see-through rims round the hero, monsters and pets, over spells, walls and darkness
    minionCounts: true, // tiles in the buff row: how many of each summon are out
    lifeBars: true, // a life bar over every enemy, bosses too (off: only over a monster just hit)
    wallLines: false, // a line along the foot of the dungeon's walls, over the spells
    heldGear: true, // the hero holds his weapon and off-hand (src/gfx/heldart.js)
    heldFx: true, // their glows and particles, gem sparks and rarity sparkles on armor (with held gear on)
    autoSummon: true, // re-raise pets, totems and turrets on the skill bar the moment one is missing (Player.autoSummon)
    autoEquip: true, // equip received gear when a matching equipment slot is empty
    dkBlade: 'sprite', // the Death Knight's flying sword: 'sprite' (his sword as a 2D object), 'model' (live three.js), 'runeblade'
    noSkipCine: false, // Keep previously seen cutscenes at normal speed
    skipCutscenes: false, // Automatically fast-forward scripted cutscenes and camera transitions
    fpsCap: 0, // frame rate cap: 0 none, 30 (phones run cooler over a long session)
    showHeroStats: true, // show/hide the #hero-stats div
    showTargetBox: true, // show/hide the #target-box div
    showTargetSprite: true, // choose if target-box shows the target sprite or not
    keybinds: {}, // player-configured keyboard actions; absent actions use the PC defaults
    mouseCursor: {
      color: 'default', customColor: '#d8b26a', size: 100,
      outline: false, outlineColor: '#170d07', outlineThickness: 2,
      glow: false, glowColor: '#ffd77a', glowIntensity: 35, transparency: 100,
      pulsatingGlow: false, highlightCircle: false,
      trailStyle: 'none', trailColor: '#e5bd72', customTrailColor: '#e5bd72', matchCursorColor: true,
      rainbowTrail: false, trailLength: 450, trailWidth: 3, particleSize: 5, particleDensity: 45,
      fadeSpeed: 1, trailGlow: 25, trailOpacity: 75,
      locatorEnabled: false, shakeLocator: false, locatorKey: 'AltLeft', locatorRings: true, locatorSize: 54, locatorColor: '#ffe08a',
    },
  },
};

export const SETTINGS_KEY = 'velscour_settings_v1';

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    Object.assign(G.settings, s);
    for (const key of ['lockSkillBar', 'mobileSkillBar', 'mobileHudV2', 'firstPerson']) delete G.settings[key];
  } catch (e) { /* ignore */ }
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) { /* ignore */ }
}
