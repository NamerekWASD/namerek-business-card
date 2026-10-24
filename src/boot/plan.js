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
// something broken. The needle needs long enough to be seen travelling.
export const BOOT_MIN_MS = 900;

// The arrival: every job has reported, the needle drops back to the ground
// floor and settles there. Nothing is being waited for any more, which is the
// point. The GPU is still finishing the uploads the compile scheduled, and half
// a second of something deliberate is a better cover for that than half a
// second of a full row of lamps doing nothing.
export const ARRIVE_MS = 520;

/** The indicator fading out, and the scene coming up behind it. */
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

/** The row of lamps under the floor indicator. */
export const BOOT_LAMPS = 5;

/**
 * How many of the lamps the reported work has earned.
 *
 * Progress is shown in whole lamps and nothing in between, because a lamp is
 * switched on from script and script only runs between the long tasks the boot
 * is made of. A step that lands late still reads as a step; a smooth bar that
 * lands late reads as a hang.
 *
 * @param {number} fraction 0–1, from `fractionDone`
 * @param {number} [count] lamps in the row
 * @returns {number} 0–count
 */
export function litLamps(fraction, count = BOOT_LAMPS) {
  const lit = Math.floor(fraction * count + 1e-9);
  return Math.min(count, Math.max(0, lit));
}
