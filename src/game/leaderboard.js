// The Abyssal Rifts' honour board (docs/ENDGAME.md): one Firestore document per player and class,
// boards/{classId}/entries/{uid}, publicly read by the board dialog (ui/rifts.js). New posts are disabled; personal
// bests are stored in this browser's local Endgame record.
import { G } from '../state.js';
import { readHonourBoard } from './leaderboard-cloud.js';

/** Whether a hero has the local Velscour's gift flag. */
export const barred = (c) => !!(c && c.cheated);

/** A board entry's time stamp as milliseconds: the real SDK hands back a Timestamp, the tests' fake a number. */
export const atMs = (at) => (at && typeof at.toMillis === 'function' ? at.toMillis() : Number(at) || 0);

export const Board = {
  /** Online posting is disabled; personal runs remain in the local Endgame record. */
  async submit(c) { return barred(c) ? { barred: true } : false; },
  /** The top n publicly listed entries. `at` comes back a number (the SDK stores a Timestamp). */
  async top(cls, n = 50) {
    const all = await readHonourBoard(cls);
    return all.filter((e) => e && Number.isFinite(e.tier) && Number.isFinite(e.time)).map((e) => ({ ...e, at: atMs(e.at) }))
      .sort((a, b) => b.tier - a.tier || a.time - b.time || a.at - b.at).slice(0, n);
  },
};
export { G };
