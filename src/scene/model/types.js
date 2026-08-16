// The nouns this scene is built out of, written down once so an editor can
// check them and a reader can find them. There is no TypeScript here on
// purpose: these shapes are passed between plain functions and plain props, and
// a `@typedef` buys the autocomplete and the typo-catching without putting a
// compile step between the source and the browser.
//
// Everything in `scene/model/` speaks in these and nothing else. In particular
// none of it knows what CSS is — that translation happens in
// `scene/renderers/`, which is the whole point of the split.

/**
 * A point in scene coordinates: `x` and `y` are screen pixels on the z = 0
 * plane, `z` is world pixels, and -z runs away from the camera.
 * @typedef {[number, number, number]} Point3
 */

/**
 * An outward-facing unit normal, same axes as {@link Point3}. A face's normal
 * is what decides how much of a lamp it catches, via Lambert's cosine law.
 * @typedef {[number, number, number]} Normal3
 */

/**
 * A bulkhead lamp bolted to the far wall of the shaft, in scene coordinates.
 * `id` is stable across frames so React can keep the fitting it belongs to.
 * @typedef {{ id: string, x: number, y: number, z: number }} Lamp
 */

/**
 * One large plane's material. `tile` names an entry in `TILES`; `tex` is a real
 * scalar, where 1 is the raw tile and 0 is flat colour, and the sensible range
 * is 0.1–0.4. `scale` is the tile's size in pixels.
 * @typedef {{ from: string, to: string, tile: string, scale: number, tex: number }} Surface
 */

/**
 * How bright a face should be drawn, as a multiplier on its own colours. 1 is
 * the colour as authored. Produced by `lightAt` or `roomLightAt`, never picked
 * by hand — that was the thing this scene got wrong for a long time.
 * @typedef {number} Shade
 */

/**
 * The four faces of a solid that are ever visible at once, each with its own
 * {@link Shade}. A solid reads as solid because these disagree.
 * @typedef {{ front: Shade, side: Shade, top: Shade, under: Shade }} BoxShade
 */

export {};
