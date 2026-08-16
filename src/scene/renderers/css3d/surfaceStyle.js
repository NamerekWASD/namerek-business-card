// The CSS half of a material: this is where a `Surface` from the model becomes
// something a browser can paint. It is the first piece of the renderer seam —
// an R3F backend would have a `surfaceMaterial.js` sitting beside this one,
// reading the very same `SURFACES` catalogue and returning a
// `MeshStandardMaterial` instead of a style object.
//
// Nothing above this file may know that a surface is a gradient. Nothing in
// `scene/model/` may import it.

import { SURFACES, TILES, shadedRgb, shadedRgba } from '../../model/materials.js';

/** @import { Surface, Shade } from '../../model/types.js' */

// Composites one surface. The texture is muted by washing a flat coat of the
// surface's own shadow colour back over it — a genuine scalar, where blend modes
// alone only ever give you two or three fixed strengths.
//
// `shade` is folded into the colours rather than applied as
// `filter: brightness()`, and that is not a stylistic preference. A filter puts
// its element into a rasterisation buffer of its own; there were a hundred and
// seventy-six of them standing in this scene at rest, every one re-rastered on
// every frame of a ride. It also forces the used value of transform-style to
// flat, which is the trap that quietly flattened the counterweight, the old
// guide rail and the landing props for weeks. Multiplying the stops costs
// nothing and cannot do either.
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

// Flat, near-even steel. The old version had a strong specular band down the
// middle, which is how you fake a cylinder on a single plane — exactly the
// wrong cue now that the solids are built from real faces, because it made the
// rail read as a pipe. Volume comes from the faces differing in tone (`shade`),
// not from a highlight painted inside one of them.
/** @param {number} [scale] @param {Shade} [shade] */
export const steelFace = (scale = 46, shade = 1) => surfaceStyle({ ...SURFACES.steel, scale }, shade);

/** @param {number} [scale] @param {Shade} [shade] */
export const ironFace = (scale = 70, shade = 1) => surfaceStyle({ ...SURFACES.iron, scale }, shade);
