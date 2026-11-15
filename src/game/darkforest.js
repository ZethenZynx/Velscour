// The Dark Forest is a straightforward overworld dungeon: reach the guardian, defeat it, and leave through the opened portal.
import { G } from '../state.js';

export function createDarkForestRun(world, gen, biome, onSuccess = () => {}) {
  const guardian = world.boss;
  if (!guardian || guardian.rank !== 'boss') throw new Error('The Dark Forest must contain its guardian boss.');
  const runs = G.char?.darkForestRuns || (G.char && (G.char.darkForestRuns = {}));
  if (runs) { const record = runs[String(world.depth)] || (runs[String(world.depth)] = { seed: gen.seed }); record.seed ??= gen.seed; }
  const run = {
    id: 'dark_forest',
    title: 'The Forest Guardian',
    description: 'Cross the forest and defeat its guardian to open the exit.',
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

