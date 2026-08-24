// ── wear for a plate that is a DOM element ───────────────────────────────────
// `scene/renderers/r3f/wear.js` is the generator: it knows how a metal surface
// records what happened to it — pitting, rust blooms, directional scratches,
// burnish, weeping, grime — and it draws all of it onto a 2D canvas. Nothing in
// it is about WebGL. This file is the other end of that same pipe: it takes a
// canvas the generator has painted and hands it to CSS as a background layer,
// so the plates in the decks are made of the same article as the props standing
// under them instead of being a gradient that happens to be the right colour.
//
// ── what does what ──────────────────────────────────────────────────────────
// Three things decide how one plate looks, and they are deliberately separate:
//
// **The variant** — *what kind of use this plate has had.* A named recipe in
// `VARIANTS` below. It is the field (where the wear is: edges, bottom, round
// the bolts, a hand's landing spot) plus the paint (how much of each kind of
// damage there is). This is the part you pick by what the plate is *for*.
//
// **The seed** — *which plate this is.* Two plates with the same variant and
// different seeds are two different objects, worn in the same places but not in
// the same pattern. Two with the same seed are the same object, which is what
// makes this cacheable and what makes two machines see the same site. It is the
// one thing a call site has to supply, and `RivettedPanel` derives it from the
// index the deck's `.map()` already hands it — so a row of plates comes out as
// a row of different plates without the deck saying anything at all.
//
// **The size** — the panel's own box, measured. The field is written in
// fractions so a description survives any size, but the canvas is baked at the
// box's own pixels: baked at one size and stretched to another, every pit comes
// out an oval and the whole thing reads as a photograph of wear rather than as
// wear.
//
// ── how to prescribe it at a call site ──────────────────────────────────────
//     <RivettedPanel i={i} />                    // the default: `plate`
//     <RivettedPanel i={i} wear="weathered" />   // this one is near the shaft
//     <RivettedPanel i={i} seed={40} />          // pin one plate's identity
//
// The seed matters between decks rather than within one. `i` separates the
// plates on a deck; `WEAR_SEED` below separates the decks from each other, so
// Leistungen's second plate and Projekte's second plate are not one object seen
// twice during a ride that has both of them on screen.
//
// ── and why the bolts are in here ───────────────────────────────────────────
// The four corner bolts are drawn by `CornerRivets` as DOM and the corrosion
// around them is drawn here onto a canvas — two files describing one fact. So
// the positions come *from* that component rather than being written out again:
// move a bolt and its rust moves with it.

import { FIELD, metalWear, mix } from '../scene/renderers/r3f/wear.js';
import { RIVET_INSET, RIVET_SIZE } from './CornerRivets.jsx';

/**
 * One base seed per place plates are used, so no two decks are wearing the same
 * objects. Spaced out rather than consecutive: a deck that grows a fifth plate
 * must not start borrowing the next deck's.
 */
export const WEAR_SEED = {
  leistungen: 100,
  projekte: 200,
};

/** How far a bolt's corrosion creeps out from its head, in CSS pixels. */
const BOLT_REACH = 26;

/**
 * The wear around the four corner bolts. Water gets in at a fastening before it
 * gets in anywhere else on a flat plate, which is why all three recipes below
 * bloom at the corners and not in the middle.
 *
 * @param {number} k @param {number} w @param {number} h
 */
const bolts = (k, w, h) => {
  const cx = (RIVET_INSET + RIVET_SIZE / 2) / w;
  const cy = (RIVET_INSET + RIVET_SIZE / 2) / h;
  const r = BOLT_REACH / Math.min(w, h);
  return [
    FIELD.around(k, cx, cy, r), FIELD.around(k, 1 - cx, cy, r),
    FIELD.around(k, cx, 1 - cy, r), FIELD.around(k, 1 - cx, 1 - cy, r),
  ];
};

/**
 * The palette every recipe shares, and it is dark on purpose: the plate's own
 * field runs from #302518 to #1b140c, and wear painted at the value bare steel
 * has in daylight would be the brightest thing on the deck. What shows through
 * here is what shows through under a tungsten pendant.
 */
const PALETTE = { dark: '#0c0805', rust: '#5c3315', light: '#8a7247' };

/**
 * The recipes. Each is a `field(w, h, seed)` — where this kind of plate has
 * been used — and a `paint`, in `metalWear`'s own options: how much of each
 * kind of damage that use left behind.
 */
export const VARIANTS = {
  /**
   * The default. A plate bolted to plaster, wiped down now and then, rusting
   * quietly at its fastenings — which is every plate on this site unless it has
   * a reason to be something else.
   */
  plate: {
    field: (w, h, seed) => mix(
      FIELD.edges(0.85, 0.13),
      FIELD.bottom(0.38, 2.8),
      ...bolts(0.5, w, h),
      FIELD.blotches(0.28, 6, seed),
    ),
    paint: {
      pit: 1.4, bloom: 2, scratch: 11, scratchAngle: 0.05, scratchSpread: 0.5,
      polish: 3, grime: 0.28, streaks: 2,
    },
  },

  /**
   * A plate somebody touches — one with a control on it, or one at the height a
   * hand rests. The hot spot is low and central, where a hand actually lands,
   * and the burnish is turned up: use makes metal *brighter*, and a worn
   * surface carrying only the dark half of that is the commonest way a plate
   * still reads as new.
   */
  handled: {
    field: (w, h, seed) => mix(
      FIELD.edges(0.7, 0.12),
      FIELD.around(0.85, 0.5, 0.66, 0.34),
      ...bolts(0.45, w, h),
      FIELD.blotches(0.22, 5, seed),
    ),
    paint: {
      pit: 1.1, bloom: 1, scratch: 16, scratchAngle: 0.1, scratchSpread: 0.7,
      polish: 7, grime: 0.2, streaks: 1,
    },
  },

  /**
   * A plate on the shaft side of a landing, where the draught carries grit and
   * the damp comes off the wall. Heavier toward the bottom, and it weeps. The
   * scratches run vertically here rather than across, because what marks this
   * one is water running down it and not a cloth going over it.
   */
  weathered: {
    field: (w, h, seed) => mix(
      FIELD.edges(1, 0.18),
      FIELD.bottom(0.7, 2),
      ...bolts(0.7, w, h),
      FIELD.blotches(0.45, 8, seed),
    ),
    paint: {
      pit: 2.4, bloom: 5, scratch: 9, scratchAngle: 1.5, scratchSpread: 0.35,
      polish: 2, grime: 0.55, streaks: 6,
    },
  },
};

/** @type {Map<string, string | null>} */
const cache = new Map();

/**
 * A plate's wear, as a `data:` URL ready to go into `background-image`.
 *
 * Cached by everything that decides the picture, because the encode is the
 * expensive half — `toDataURL` on a 300×140 canvas is worth a couple of
 * milliseconds — and a resize that lands back on a size already baked should
 * cost nothing at all.
 *
 * Returns `null` where there is no canvas to draw on: the test runner, which
 * has no 2D context, and anything rendering this on a server. The caller leaves
 * the layer out and the plate is its gradient, which is what it was before any
 * of this existed.
 *
 * @param {number} w @param {number} h
 * @param {{ seed?: number, variant?: keyof typeof VARIANTS }} [options]
 * @returns {string | null}
 */
export function panelWearURL(w, h, { seed = 0, variant = 'plate' } = {}) {
  const key = `${variant}|${seed}|${w}x${h}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return null;

  const recipe = VARIANTS[variant] ?? VARIANTS.plate;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Painted onto a *transparent* canvas rather than over the plate's own
  // colour: this ends up as a layer above the gradient in CSS, so the gradient
  // is the colour and this is only what happened to it. Every stroke
  // `metalWear` makes is alpha-blended, so it composites identically either
  // side of that split — which is why the generator could be reused unchanged
  // rather than forked for the DOM.
  metalWear(ctx, w, h, { seed, field: recipe.field(w, h, seed), ...PALETTE, ...recipe.paint });

  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export default panelWearURL;
