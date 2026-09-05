// What the boot screen is actually waiting for, and how that becomes a number
// between nought and one.
//
// The thing this replaces was a single promise that resolved when a large
// model and the shared surface bakes were in, and it did not work —
// not because the timing was wrong but because it was waiting for the wrong
// half. The visible cost of a first visit is not the download; it is the
// browser decoding images, three baking canvases, and above all the renderer
// compiling a program for every distinct material the first time it draws one.
// None of that was waited for, so the doors opened and the scene assembled
// itself in front of the visitor a material at a time.
//
// So: a small register of named jobs, each weighted by roughly what it costs,
// and a screen that stays up until every one of them has reported in. The
// weights do not have to be right to the millisecond. They have to be right
// enough that the bar does not sit at 90% through the expensive half.

/**
 * The jobs, and what each is worth. `shaft` and `near` are the two canvases'
 * shader compiles and they dominate — on a cold profile they are most of the
 * wait, which is exactly the part the old barrier did not cover.
 *
 * `fonts` is here because `Archivo Black` reflowing the floor selector one beat
 * after the doors open is the same failure as a texture popping in, just in the
 * DOM. It is cheap and it is usually already done.
 */
export const BOOT_JOBS = {
  fonts: 1,
  tiles: 2,
  mark: 1,
  shaft: 3,
  near: 3,
};

// How long the screen is guaranteed to be up. A warm reload finishes every job
// in under a tenth of a second, and a black screen that appears and vanishes
// inside two frames does not read as a loading screen — it reads as a flash of
// something broken. The gears need long enough to be seen turning.
export const BOOT_MIN_MS = 900;

// The victory lap: the gears drop the ratchet and spin freely. Nothing is being
// waited for here — every job has reported — which is the point. The GPU is
// still finishing the uploads the compile scheduled, and half a second of
// something deliberate is a better cover for that than half a second of a bar
// sitting at 100%.
export const SPIN_MS = 520;

/** The gears fading out, and the scene coming up behind them. */
export const FADE_MS = 420;

/**
 * The fraction of the work that has reported in.
 *
 * @param {Iterable<string>} settled names that have reported
 * @param {Record<string, number>} [jobs] the register to weigh them against
 * @returns {number} 0–1
 */
export function fractionDone(settled, jobs = BOOT_JOBS) {
  const total = Object.values(jobs).reduce((a, b) => a + b, 0);
  if (total <= 0) return 1;
  let done = 0;
  for (const name of settled) done += jobs[name] ?? 0;
  return Math.min(1, done / total);
}

/**
 * A floor under the displayed progress that rises on its own.
 *
 * Five jobs means five steps, and five steps over a two-second wait is a gear
 * that stands still for four hundred milliseconds at a time — indistinguishable,
 * to the person watching, from a page that has hung. This creeps underneath the
 * real figure so there is always motion.
 *
 * It tops out at 0.55 and approaches it asymptotically, so it can never claim
 * more than half the work on its own and can never reach the end by itself.
 * That is the whole difference between a progress bar with a bit of give in it
 * and one that lies: this one cannot finish, only the jobs can.
 *
 * @param {number} elapsed milliseconds since boot began
 * @returns {number} 0–0.55
 */
export function idleCreep(elapsed) {
  return 0.55 * (1 - Math.pow(2, -elapsed / 1400));
}

/**
 * One frame of an exponential approach — the displayed figure chasing the real
 * one rather than snapping to it.
 *
 * Framed as a half-life rather than a per-frame fraction on purpose: a plain
 * `shown += (target - shown) * 0.1` is a different speed at 30fps and at 144,
 * and the machines that most need this screen are the ones running it slowest.
 *
 * @param {number} shown where the needle is
 * @param {number} target where the work says it should be
 * @param {number} dt milliseconds since the last frame
 * @param {number} [halfLife] milliseconds to close half the remaining gap
 * @returns {number}
 */
export function chase(shown, target, dt, halfLife = 220) {
  if (target <= shown) return shown; // monotonic: a job cannot un-finish
  const k = 1 - Math.pow(2, -dt / halfLife);
  return shown + (target - shown) * k;
}
