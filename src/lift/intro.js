// The intro is the landing doors of the ground floor opening — not a second,
// full-screen pair of doors laid over the scene. Once the shaft had real doors
// of its own, opening giant ones to reveal a lift with its own shut doors made
// no sense at all; the arrival we already animate on every ride is the arrival.

export const DOOR_HOLD_END = 420;
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

// the shudder before the leaves break apart: the gear engaging against a door
// that has been shut a long time
/**
 * @param {number} t milliseconds since the intro began
 * @returns {number} horizontal offset in pixels
 */
export function introShake(t) {
  if (t < DOOR_HOLD_END || t > DOOR_SHAKE_END) return 0;
  const local = t - DOOR_HOLD_END;
  const span = DOOR_SHAKE_END - DOOR_HOLD_END;
  return Math.sin(local / 21) * 2.4 * (1 - local / span);
}
