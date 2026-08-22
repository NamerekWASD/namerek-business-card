// The two gears in the corner of the boot screen, as arithmetic.
//
// Same split as `lift/intro.js`: the shape of the motion lives here as pure
// functions of the clock and the progress, and the component below just draws
// what they say. That is what lets the whole thing be tuned — and tested —
// without a browser, and it is why the ratchet could be checked for the one
// property that matters (it never runs backwards) rather than watched for it.
//
// The gears are a *progress bar*, not a spinner. While the scene loads, the
// driver advances one tooth per slice of the work — so the thing on screen
// stands for something rather than turning at a constant rate to say "wait".
// That is also why it jerks: a tooth is a discrete amount of progress, and a
// mechanism taking up a tooth at a time is what that looks like.

/** The driver, and the smaller wheel it turns. */
export const DRIVER_TEETH = 12;
export const IDLER_TEETH = 8;

/**
 * How many teeth the driver walks over the whole load. More than one turn, so
 * the gear is plainly going somewhere; not so many that a single job reporting
 * in sends it spinning.
 */
export const TEETH_OVER_BOOT = 17;

const TAU = Math.PI * 2;

/**
 * One tooth being taken up: most of the travel in the first third of the
 * interval, then a ring-down as the mechanism settles against the stop.
 *
 * The wobble is the "поддёргивание" — and it is damped by `(1 - p)` so it dies
 * out before the next tooth rather than beating against it.
 *
 * @param {number} f 0–1 through this tooth's interval
 * @returns {number} 0–1ish, the fraction of the tooth travelled
 */
export function takeUp(f) {
  const p = Math.min(1, Math.max(0, f) / 0.32);
  const travel = 1 - Math.pow(1 - p, 3);
  const wobble = Math.sin(p * Math.PI * 3) * 0.07 * (1 - p);
  return travel + wobble;
}

/**
 * The driver's angle while the scene is loading.
 *
 * A pure function of the displayed progress and nothing else — no clock. That
 * is deliberate: the gear cannot drift away from what the loader is actually
 * doing, because there is nothing for it to drift *with*. `plan.js`'s `chase`
 * and `idleCreep` are what keep the input moving smoothly.
 *
 * @param {number} shown 0–1
 * @returns {number} radians
 */
export function ratchetAngle(shown) {
  const s = Math.max(0, shown) * TEETH_OVER_BOOT;
  const tooth = Math.floor(s);
  return ((tooth + takeUp(s - tooth)) * TAU) / DRIVER_TEETH;
}

/**
 * The free spin, once every job has reported: the ratchet drops out and the
 * train runs away. Eased *in* rather than out — it spools up and is cut off at
 * its fastest by the fade, which reads as the mechanism being taken off load
 * rather than winding down and stopping.
 *
 * @param {number} ms since the spin began
 * @param {number} spinMs how long the spin lasts
 * @returns {number} radians, on top of wherever the ratchet left off
 */
export function spinAngle(ms, spinMs) {
  const p = Math.min(1, Math.max(0, ms) / spinMs);
  return TAU * 2.1 * Math.pow(p, 1.7);
}

/**
 * How far the idler is turned before the ratio is applied, so that a gap of its
 * faces a tooth of the driver's along the line between their centres.
 *
 * The ratio alone is not enough. It guarantees the two wheels *stay* in whatever
 * relationship they start in — so if they start with tooth against tooth they
 * stay that way for ever, and what is drawn is two wheels sunk into each other
 * rather than a gear train. This is the phase that makes the start position the
 * right one; everything after it follows.
 *
 * @see IDLER_AT in `BootScreen`, which is the direction this is measured along
 */
export const IDLER_PHASE = (7.5 * Math.PI) / 180;

/**
 * The idler's angle, from the driver's.
 *
 * Opposite sense, and faster in proportion to the tooth counts — which is not a
 * flourish, it is the only ratio at which the teeth stay meshed. Get it wrong
 * and the two wheels visibly slip against each other, which is the sort of
 * thing nobody can name and everybody notices.
 *
 * @param {number} driver radians
 * @returns {number} radians
 */
export function idlerAngle(driver) {
  return IDLER_PHASE - driver * (DRIVER_TEETH / IDLER_TEETH);
}

/**
 * A gear as an SVG path, centred on the origin.
 *
 * Trapezoidal teeth rather than a real involute profile: at ninety pixels on a
 * black screen the difference is invisible, and the flat-topped tooth is what
 * a cast iron gear reads as anyway.
 *
 * @param {number} teeth
 * @param {number} rTip radius at the tip of a tooth
 * @param {number} rRoot radius at the root between them
 * @returns {string}
 */
export function gearPath(teeth, rTip, rRoot) {
  const step = TAU / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step;
    // A tooth is 44% of the pitch at its root and 26% at its tip, so it is
    // both narrower than its gap and tapered — the clearance is what lets the
    // two wheels turn through each other's teeth instead of colliding at the
    // line of centres, and the taper is what a cast tooth actually looks like.
    for (const [r, off] of [[rRoot, -0.22], [rTip, -0.13], [rTip, 0.13], [rRoot, 0.22]]) {
      pts.push([r * Math.cos(a + step * off), r * Math.sin(a + step * off)]);
    }
  }
  return `M${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`;
}
