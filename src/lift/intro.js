// The intro is the landing doors of the ground floor opening — not a second,
// full-screen pair of doors laid over the scene. Once the shaft had real doors
// of its own, opening giant ones to reveal a lift with its own shut doors made
// no sense at all; the arrival we already animate on every ride is the arrival.

export const DOOR_SHAKE_END = 660;
export const DOOR_TOTAL_MS = 2200;
export const INTRO_OPEN_END = 1720;

/**
 * @param {number} t milliseconds since the intro began
 * @returns {number} 0 fully open, 1 fully shut
 */
export function introClosure(t) {
  if (t <= DOOR_SHAKE_END) return 1;
  if (t >= INTRO_OPEN_END) return 0;
  const p = (t - DOOR_SHAKE_END) / (INTRO_OPEN_END - DOOR_SHAKE_END);
  // fast off the mark and easing into the stop, the way a heavy leaf actually
  // travels once the gear takes up
  return 1 - Math.pow(p, 0.55);
}

// The shaft coming on, once the boot screen has let go.
//
// This is the join between the two halves of the arrival, and it exists because
// a fade from black straight into a fully, evenly lit shaft is the one moment
// that gives away that the lighting was never switched on — it was always on,
// behind a black rectangle. A supply that hunts before it holds says the
// opposite: the lamps were off, and something just closed a contactor.
//
// Deliberately front-loaded: the strikes are over well before the doors start
// to move, so the light has already settled by the time the leaves do.
const STRIKES = [
  // [ms, how far it gets before falling back]
  [0, 0.0], [60, 0.75], [95, 0.08], [150, 0.95], [205, 0.22], [250, 0.6], [300, 1.0],
];

/**
 * How brightly the shaft is lit, as a fraction of its settled value.
 *
 * @param {number} t milliseconds since the intro began
 * @returns {number} 0 dark, 1 fully up
 */
export function introDim(t) {
  const last = STRIKES[STRIKES.length - 1];
  if (t >= last[0]) return 1;
  for (let i = STRIKES.length - 1; i >= 0; i -= 1) {
    if (t < STRIKES[i][0]) continue;
    const [at, level] = STRIKES[i];
    const [nextAt, nextLevel] = STRIKES[i + 1];
    // Linear between strikes on purpose. A filament has no easing worth
    // modelling at this timescale, and a smoothed flicker reads as a dimmer
    // being turned rather than a circuit making and breaking.
    const p = (t - at) / (nextAt - at);
    return level + (nextLevel - level) * p;
  }
  return 0;
}
