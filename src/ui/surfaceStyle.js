// The CSS half of a material: this is where a `Surface` from the model becomes
// something a browser can paint.
//
// Nothing above this file may know that a surface is a gradient. Nothing in
// `scene/model/` may import it.

import { SURFACES, TILES, shadedRgb, shadedRgba } from '../scene/model/materials.js';

/** @import { Surface, Shade } from '../scene/model/types.js' */

// Composites one surface. The texture is muted by washing a flat coat of the
// surface's own shadow colour back over it — a genuine scalar, where blend modes
// alone only ever give you two or three fixed strengths.
//
// `shade` is folded into the colours rather than applied as
// `filter: brightness()`, and that is not a stylistic preference. A filter puts
// its element into a rasterisation buffer of its own — it also forces the used
// value of transform-style to flat, which is the trap that quietly flattened
// the counterweight, the old guide rail and the landing props for weeks, back
// when this scene still had CSS-3D solids to flatten. Multiplying the stops
// costs nothing and cannot do either.
//
// The tile follows along for free: it sits under the gradient in multiply, so
// scaling the gradient scales the product.
/**
 * @param {Surface} s
 * @param {Shade} [shade]
 * @returns {object} a React style object
 */
export function surfaceStyle(s, shade = 1) {
  const base = `linear-gradient(180deg, ${shadedRgb(s.from, shade)}, ${shadedRgb(s.to, shade)})`;
  const tile = TILES[s.tile];
  if (!tile || s.tex <= 0) return { backgroundImage: base };
  const wash = shadedRgba(s.to, 1 - s.tex, shade);
  return {
    backgroundImage: `linear-gradient(${wash}, ${wash}), ${base}, url(${tile})`,
    backgroundSize: `auto, auto, ${s.scale}px ${s.scale}px`,
    backgroundBlendMode: 'normal, multiply, multiply',
  };
}

/** @param {number} [scale] @param {Shade} [shade] */
export const ironFace = (scale = 70, shade = 1) => surfaceStyle({ ...SURFACES.iron, scale }, shade);
