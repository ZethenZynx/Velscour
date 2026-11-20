// The Dark Forest is a straightforward overworld dungeon: reach the guardian, defeat it, and leave through the opened portal.
import { G } from '../state.js';
import { UI } from '../ui/ui.js';
import { sfx } from '../core/audio.js';

export function createDarkForestRun(world, gen, biome, onSuccess = () => {}) {
  const guardian = world.boss;
  if (!guardian || guardian.rank !== 'boss') throw new Error('The Dark Forest must contain its guardian boss.');
  const runs = G.char?.darkForestRuns || (G.char && (G.char.darkForestRuns = {}));
  if (runs) { const record = runs[String(world.depth)] || (runs[String(world.depth)] = { seed: gen.seed }); record.seed ??= gen.seed; }
  const run = {
    id: 'dark_forest',
    title: 'The Forest Guardian',
    description: 'Follow the forest path to its guardian. Optional labyrinths north and south of the path hide bonus treasure; defeat the guardian to open the exit.',
    type: 'forest',
    completed: false,
    failed: false,
    active: true,
    guardian,
    get target() { return guardian.dead ? null : guardian; },
    get shrine() { return guardian; },
    get markers() { return []; },
    get route() { return []; },
    get stage() { return guardian.dead ? 1 : 0; },
    get escort() { return null; },
    get routeIndex() { return 0; },
    get objective() { return guardian.dead ? undefined : guardian; },
    get hud() { return { title: 'Forest Guardian', beat: guardian.dead ? 1 : 0, total: 1, timer: '', progress: guardian.dead ? 'The exit is open' : 'Defeat the guardian to open the exit' }; },
    update() {},
    bossDefeated() {
      if (run.completed || !guardian.dead || world.creatures?.some((enemy) => enemy.team === 'enemy' && enemy.rank === 'boss' && !enemy.dead)) return;
      run.completed = true;
      run.active = false;
      onSuccess?.(run);
    },
  };
  return run;
}

export function createCastleRun(world, gen, biome, onSuccess = () => {}) {
  const guardian = world.boss;
  if (!guardian || guardian.rank !== 'boss') throw new Error('The Castle must contain its guardian boss.');
  const objectives = (gen.castleObjectives || []).map((site) => {
    const target = world.creatures.find((m) => m.castleObjective === site.key && !m.dead);
    if (!target) throw new Error(`The Castle ${site.key} objective did not spawn.`);
    const marker = {
      x: target.x, y: target.y, type: 'objective', active: true,
      color: site.key === 'graveyard' ? '#b98aff' : '#ffb45e',
      label: site.label, castleObjective: site.key,
    };
    world.portals.push(marker);
    return { ...site, target, marker, complete: false };
  });
  if (objectives.length !== 2) throw new Error('Every Castle must contain both outside objectives.');
  const unlockGate = () => {
    const map = world.map;
    if (map.castleGateUnlocked) return;
    map.castleGateUnlocked = true; map.castleGateLocked = false;
    for (const i of map.castlePosternTiles || []) map.block[i] = 0;
    map.touchMinimapTerrain?.();
    map._stepMask = null; map._terr = null; map.flowFrom = [-999, -999]; world.flowTimer = 0; world.castleFlow = null;
    UI.centerMsg('CASTLE GATE OPEN', 'The outer gate and postern are unsealed. The second side objective is optional.', 3.2);
    UI.log('The Castle Gate opens. You may enter the keep; the other outside objective remains optional.', '#ffd080');
    sfx('gate');
  };
  const run = {
    id: 'castle',
    title: 'Castle Gate',
    description: 'Complete either the siege camp or graveyard objective to open the castle gate. The second objective is optional.',
    type: 'castle',
    completed: false,
    failed: false,
    active: true,
    guardian,
    objectives,
    get target() { return guardian.dead ? null : guardian; },
    get shrine() { return objectives.find((o) => !o.complete)?.target || guardian; },
    get markers() { return objectives.filter((o) => !o.complete).map((o) => o.marker); },
    get route() { return []; },
    get stage() { return world.map.castleGateUnlocked ? 1 : 0; },
    get escort() { return null; },
    get routeIndex() { return 0; },
    get objective() { const o = objectives.find((q) => !q.complete); return o ? { x: o.target.x, y: o.target.y, reach: 2 } : guardian.dead ? undefined : guardian; },
    get hud() {
      const done = objectives.filter((o) => o.complete).length;
      const status = objectives.map((o) => `${o.label}: ${o.complete ? 'complete' : 'open'}`).join(' · ');
      return {
        title: 'Castle Gate',
        beat: world.map.castleGateUnlocked ? 1 : 0,
        total: 1,
        timer: '',
        progress: world.map.castleGateUnlocked ? `The gate is open · ${status}` : `${status} · complete either objective to open the gate`,
      };
    },
    update() {
      for (const o of objectives) if (!o.complete && (o.target.dead || o.target.hp <= 0)) {
        o.complete = true;
        world.portals = world.portals.filter((p) => p !== o.marker);
        UI.centerMsg(`${o.label} DEFEATED`, world.map.castleGateUnlocked ? 'The other outside objective remains optional.' : 'The Castle Gate is opening.', 2.6);
        if (!world.map.castleGateUnlocked) unlockGate();
      }
    },
    bossDefeated() {
      if (run.completed || !guardian.dead || world.creatures?.some((enemy) => enemy.team === 'enemy' && enemy.rank === 'boss' && !enemy.dead)) return;
      run.completed = true;
      run.active = false;
      onSuccess?.(run);
    },
  };
  return run;
}
