// The mark on the arcade cabinet's screen, including the way it draws itself in.
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
//
// So the animation is decoded once as a strip of stills and played back onto one
// canvas. It is a two-second reveal that then holds, not a loop, so nothing here
// runs after the intro finishes.

import { CanvasTexture, SRGBColorSpace } from 'three';
import markUrl from '../../../assets/logo-namerek-animated.svg';

/** How many stills the reveal is cut into. */
export const FRAMES = 120;
/** How long the authored animation runs before it settles, in seconds. */
export const SPAN = 2.05;
/** Side of the canvas the mark is drawn onto. The mark is square. */
const SIZE = 512;

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

/** @type {Promise<HTMLImageElement[]> | null} */
let strip = null;

/**
 * Every frame of the reveal, decoded once and shared.
 *
 * The last entry is the settled mark, which is also what a caller should draw if
 * it does not want to play the reveal at all.
 */
export function markStrip() {
  if (strip) return strip;
  strip = (async () => {
    if (typeof document === 'undefined') return [];
    const svg = await (await fetch(markUrl)).text();
    const times = Array.from({ length: FRAMES }, (_, i) => (i / (FRAMES - 1)) * SPAN);
    const all = await Promise.all(times.map((t) => still(svg, t)));
    return /** @type {HTMLImageElement[]} */ (all.filter(Boolean));
  })();
  return strip;
}

/**
 * A canvas and the texture over it, for a caller to paint frames into.
 *
 * One texture for the whole reveal rather than thirty: a still is uploaded over
 * the same canvas each time, so the GPU holds one 512² surface however long the
 * animation is.
 */
export function markSurface() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}

/**
 * Wipe the mark back to nothing, leaving the canvas — and therefore the texture,
 * the material and its compiled program — exactly where they were.
 *
 * This is what "the mark goes away when the doors shut" has to mean. Unmounting
 * the mesh instead is the same thing to look at and a different thing entirely
 * to the driver: the last reference to a linked program goes with it, and the
 * next arrival pays for a fresh compile on the exact frame the leaves finish
 * parting. See `LogoMark`.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function clearMark(canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Paint one still, lit the way the CSS backend lights it.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} frame
 */
export function paintMark(canvas, frame) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = canvas.width;
  ctx.clearRect(0, 0, S, S);

  // Two passes of halo, wide then tight — the same pair of drop-shadows the CSS
  // cabinet uses. The wide one is phosphor bleeding into the glass around the
  // mark, the tight one is the edge of the stroke itself alight.
  const pad = S * 0.06;
  const box = S - pad * 2;
  for (const [colour, blur] of [['rgba(255,178,94,0.55)', S * 0.055], ['rgba(255,214,160,0.5)', S * 0.014]]) {
    ctx.shadowColor = /** @type {string} */ (colour);
    ctx.shadowBlur = /** @type {number} */ (blur);
    ctx.drawImage(frame, pad, pad, box, box);
  }
  ctx.shadowBlur = 0;

  // Warm it into the room. The mark is drawn for paper — near-white fills over
  // near-black strokes — and pure white on a lamp-lit amber screen is the one
  // thing in this scene that would read as a web page rather than as a cabinet.
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,196,122,0.34)';
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
}
