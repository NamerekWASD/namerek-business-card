import { DECKS } from '../lift/decks.js';

// The floor indicator on the boot screen: a half-round dial like the one over
// an old lift's doors, with a needle that rides from floor to floor while the
// scene loads behind it.
//
// The needle is a CSS animation on purpose. The boot is the stretch of time in
// which the main thread is busiest — shader links, image decodes, the warm draw
// — and the gears this replaced were turned from `requestAnimationFrame`, so
// they stood still for exactly as long as they were needed. A `transform`
// keyframe runs on the compositor and keeps moving while script is blocked.

/** The artwork's own coordinates, and the needle's pivot inside them. */
export const VIEW_W = 400;
export const VIEW_H = 330;
export const PX = 200;
export const PY = 214;

/** Signal lamps along the foot of the plate, one per share of the work. */
export const LAMP_Y = 280;
export const LENS_R = 10.5;
const LAMP_PITCH = 46;

/** Centre of lamp `i` in a row of `count`, centred under the pivot. */
export function lampX(i, count) {
  return PX + (i - (count - 1) / 2) * LAMP_PITCH;
}

/** Degrees either side of straight up that the floor marks span. */
const HALF_SWEEP = 60;

/** One mark per floor, ground floor on the left, in the building's own order. */
export const STOPS = DECKS.map((deck, i) => ({
  tick: deck.tick,
  deg: -HALF_SWEEP + (2 * HALF_SWEEP * i) / (DECKS.length - 1),
}));

/** Where the needle rests: the ground floor, which is where the doors open. */
export const HOME_DEG = STOPS[0].deg;

/** One full round trip of the needle. */
export const RIDE_MS = 5600;

// The shape of a round trip, in relative time: up a floor at a time with a stop
// at each, then express back down. The stops are what make it a lift and not a
// metronome.
const DWELL = 0.08;
const STEP = 0.12;
const EXPRESS = 0.22;

// A travel that runs a hair past the mark and swings back: a needle on a
// spring, not a pointer drawn on a screen.
const TRAVEL_EASE = 'cubic-bezier(0.5, 0, 0.25, 1.22)';

/**
 * The needle's round trip as a `@keyframes` block.
 *
 * @param {string} name the animation name
 * @returns {string}
 */
export function needleKeyframes(name) {
  /** @type {{ deg: number, span: number, ease: string }[]} */
  const legs = [];
  STOPS.forEach((stop, i) => {
    legs.push({ deg: stop.deg, span: DWELL, ease: 'linear' });
    const last = i === STOPS.length - 1;
    legs.push({ deg: stop.deg, span: last ? EXPRESS : STEP, ease: last ? 'ease-in-out' : TRAVEL_EASE });
  });
  const total = legs.reduce((a, l) => a + l.span, 0);

  let at = 0;
  const frames = legs.map((leg) => {
    const pct = (at / total) * 100;
    at += leg.span;
    return `${+pct.toFixed(3)}% { transform: rotate(${leg.deg}deg); animation-timing-function: ${leg.ease}; }`;
  });
  frames.push(`100% { transform: rotate(${HOME_DEG}deg); }`);
  return `@keyframes ${name} {\n  ${frames.join('\n  ')}\n}`;
}
