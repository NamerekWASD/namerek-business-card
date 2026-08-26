// The mark, cut in half down the middle and inlaid into the two door leaves.
//
// ── why the doors ────────────────────────────────────────────────────────────
// The mark used to draw itself onto the ground-floor wall screen. Everything
// about that was an animation *of* an entrance rather than an entrance: it ran
// on one floor out of four, it needed a hundred and twenty rasterisations of an
// SVG to play, and it replayed in full every time the lift came back.
//
// On the leaves it is not an animation at all. The mark is whole while the doors
// are shut — which is the literal first frame of the site, because the intro
// holds them shut and parts them — and the reveal is the two halves travelling
// away from each other with the workshop behind them. Nothing plays it, nothing
// times it, and it cannot get out of step with the doors because it *is* the
// doors. What runs it is `doorClosureAt`, the same function that has always run
// them.
//
// The astragals meet over the middle of it, so the seam is a stile standing in
// front of the mark rather than a join in a picture — about a tenth of the mark
// is behind them and that is the point. See `ASTRAGAL_W_FRAC`.
//
// ── one pair of canvases for every doorway ───────────────────────────────────
// Three floors are in frame at once, so there are six leaves, and every one of
// them wants the same two pictures at the same canvas resolution — the plane is
// stretched to the leaf, not the canvas. So the halves are baked once at module
// scope and shared, the way `patterns.js` shares its tiles. The difference is
// that this one cannot be baked synchronously: the mark arrives as a decoded
// SVG (see `settledMark`), so the canvas is created empty, handed out, and
// painted when the image lands.
//
// In practice it has landed long before anyone sees it — `SceneWarmup` holds the
// boot screen up until `settledMark` resolves — but the invalidate below is what
// makes that a fact rather than a hope, because both canvases are on demand.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { settledMark } from './screenMark.js';
import { invalidateScene } from './frames.js';

/** The mark's own square, in canvas pixels. One leaf gets half of it. */
const SIZE = 576;

// The mark is drawn for paper: near-white strokes meant to be read on a page.
// On a leaf it is neither painted nor printed — it is cast into the plate, the
// same ironwork the astragal and the architrave are, so it is struck twice: a
// dark groove offset downward, and the lit face of the cut above it. That pair
// is the whole of why an engraving reads as cut rather than drawn, and it is the
// same trick the patch bay's mimic diagram used before it.
const GROOVE = '#0d0a06';
const FACE = '#c9a468';
const GROOVE_DROP = 3;

/** @type {Map<0 | 1, { canvas: HTMLCanvasElement, texture: CanvasTexture }>} */
const surfaces = new Map();

/**
 * The image, recoloured whole, as its own canvas.
 *
 * `source-in` over a filled rectangle is the only way to restrike a decoded
 * image in another colour — the alpha of the artwork is kept and everything
 * under it is replaced. It has to happen on a canvas of its own: run on the
 * leaf's canvas it would take out everything already drawn there, groove
 * included.
 *
 * @param {HTMLImageElement} img @param {string} colour
 */
function struck(img, colour) {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return c;
}

/**
 * Paint one half of the mark onto its leaf's canvas.
 *
 * @param {HTMLCanvasElement} canvas @param {HTMLImageElement} img @param {0 | 1} side
 */
function paintHalf(canvas, img, side) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const half = SIZE / 2;
  ctx.clearRect(0, 0, half, SIZE);
  // `side` 0 is the left leaf and takes the mark's left half, so the whole
  // square is drawn shifted left by nothing; side 1 shifts it by a half so its
  // own right half lands at x = 0. Both are the same square, windowed.
  const dx = side ? -half : 0;
  ctx.drawImage(struck(img, GROOVE), dx, GROOVE_DROP);
  ctx.drawImage(struck(img, FACE), dx, 0);

  // The leaf's own grading, so a mark near the sill is not as bright as one at
  // eye height. `doorLeafFace` grades the plate under this the same way, and two
  // surfaces on one door disagreeing about where the light is is the sort of
  // thing nobody names and everybody sees.
  const fade = ctx.createLinearGradient(0, 0, 0, SIZE);
  fade.addColorStop(0, 'rgba(0,0,0,0.82)');
  fade.addColorStop(0.42, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, half, SIZE);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The texture for one leaf's half of the mark, shared across every doorway.
 *
 * Comes back empty and fills itself in. `null` where there is no canvas at all,
 * which is every test run — the call sites treat that the way they treat a
 * missing pattern.
 *
 * @param {0 | 1} side 0 is the left leaf, 1 the right
 */
export function leafMark(side) {
  if (surfaces.has(side)) return surfaces.get(side).texture;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE / 2;
  canvas.height = SIZE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  surfaces.set(side, { canvas, texture });

  settledMark().then((img) => {
    if (!img) return;
    paintHalf(canvas, img, side);
    texture.needsUpdate = true;
    // Both canvases are `frameloop="demand"`. Without this the mark would be on
    // the texture and off the screen until something else asked for a frame.
    invalidateScene();
  });

  return texture;
}

/** How wide the whole mark is on a shut doorway, as a fraction of the opening. */
export const MARK_SPAN = 0.44;
/** Where its centre sits down the opening, as a fraction of the height. */
export const MARK_RISE = 0.44;
