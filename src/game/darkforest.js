// Linear boss-run state shared by the outdoor forest and Castle dungeons.
import { G } from '../state.js';

function createGuardianRun(world, gen, biome, config, onSuccess = () => {}) {
  const guardian = world.boss;
  if (!guardian || guardian.rank !== 'boss') throw new Error('The ' + config.title + ' must contain its guardian boss.');
  const run = {
    id: config.id,
    title: config.title,
    description: config.description,
    type: 'guardian',
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
    get hud() {
      return {
        title: config.title,
        beat: guardian.dead ? 1 : 0,
        total: 1,
        timer: '',
        progress: guardian.dead ? 'The exit is open' : 'Defeat the guardian to open the exit',
      };
    },
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

export function createDarkForestRun(world, gen, biome, onSuccess) {
  const runs = G.char?.darkForestRuns || (G.char && (G.char.darkForestRuns = {}));
  if (runs) {
    const record = runs[String(world.depth)] || (runs[String(world.depth)] = { seed: gen.seed });
    record.seed ??= gen.seed;
  }
  return createGuardianRun(world, gen, biome, {
    id: 'dark_forest',
    title: 'Forest Guardian',
    description: 'Cross the forest and defeat its guardian to open the exit.',
  }, onSuccess);
}

export function createCastleRun(world, gen, biome, onSuccess) {
  return createGuardianRun(world, gen, biome, {
    id: 'castle',
    title: 'Castle Guardian',
    description: 'Cross the castle grounds and defeat its guardian to open the exit.',
  }, onSuccess);
}
