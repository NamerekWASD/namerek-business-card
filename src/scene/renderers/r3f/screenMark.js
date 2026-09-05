// The mark, decoded from its own animated SVG.
//
// The obvious thing — point a texture at `logo-namerek-animated.svg` — produces
// a blank screen, and it is worth writing down why, because nothing warns you.
// The animation lives in CSS keyframes inside the file, and a browser will not
// advance an SVG's own timeline for an image being used as a canvas or WebGL
// source: it rasterises whatever the document looks like at time zero. This
// particular file uses `both` fill on every declaration, so at time zero every
// element is still holding its `from` state — invisible. Measured in Chrome:
// zero non-transparent pixels at t=0, t=1.2s and t=2.7s alike, while the static
// file draws the same 5153 pixels every time.
//
// What does work is asking for a specific moment. CSS accepts a *negative*
// animation-delay, which starts an animation already partway through, so
// rewriting every delay in the file to `delay − t` and rasterising that gives
// the frame at t — deterministically, with the stagger between elements intact.
// Measured across the sequence: 0, 547, 956, 1267, 4663, 5087, 5087 ink pixels,
// settling at 2.0s on the same mark the static file draws.

import markUrl from '../../../assets/logo-namerek-animated.svg';

/** How long the authored animation runs before it settles, in seconds. */
export const SPAN = 2.05;

// `animation:<name> <duration>s <easing> <delay>s <fill>`. The easing carries
// commas and parentheses but never a space, so the five fields split cleanly.
// `animation:none !important` has no delay to shift and is left alone.
const DECL = /animation:([\w-]+)\s+([\d.]+)s\s+(\S+)\s+(-?[\d.]+)s\s+(\w+)/g;

const shift = (svg, t) => svg.replace(
  DECL,
  (_m, name, dur, ease, delay, fill) => `animation:${name} ${dur}s ${ease} ${(parseFloat(delay) - t).toFixed(4)}s ${fill}`,
);

/**
 * Decode one moment of the reveal.
 * @param {string} svg @param {number} t
 * @returns {Promise<HTMLImageElement | null>}
 */
async function still(svg, t) {
  const url = URL.createObjectURL(new Blob([shift(svg, t)], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    // the decoded bitmap outlives the blob, and holding thirty object URLs open
    // for the life of the page is thirty leaks
    URL.revokeObjectURL(url);
  }
}

/** @type {Promise<HTMLImageElement | null> | null} */
let settled = null;

/**
 * The mark as it ends up: one still, decoded once, shared by everything that
 * wants it.
 *
 * There used to be a `markStrip` beside this that decoded all hundred and twenty
 * frames. Nothing plays the reveal any more — it moved onto the doors, where it
 * is not an animation at all: the leaves carry two halves of the mark and
 * parting them is the reveal.
 *
 * It still has to go through `shift`: the file's own declarations all carry
 * `both` fill, so at time zero every element is holding its `from` state and a
 * plain rasterisation of it is blank. See the note at the top of this file.
 */
export function settledMark() {
  if (settled) return settled;
  settled = (async () => {
    if (typeof document === 'undefined') return null;
    const svg = await (await fetch(markUrl)).text();
    return still(svg, SPAN);
  })();
  return settled;
}
