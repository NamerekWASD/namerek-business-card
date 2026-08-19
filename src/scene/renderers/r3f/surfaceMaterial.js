// The WebGL half of a material — `css3d/surfaceStyle.js`'s opposite number,
// reading the very same `SURFACES` catalogue and returning something three.js
// can draw instead of something a browser can paint.
//
// The one real decision in here is what happens to the vertical gradient. In
// CSS, `from` → `to` down a plane *is* the lighting: there are no lights, so a
// wall is drawn darker at the bottom because that is where the light isn't.
// In WebGL there are real lights, and baking that gradient into the albedo as
// well would darken every surface twice — the classic sign of a scene ported by
// eye. So the gradient is dropped and its midpoint kept: the map carries the
// surface's colour and grain, the lights carry the falloff.
//
// The grain itself is baked rather than sampled at full strength. `tex` is a
// scalar in the catalogue (0.22 for the shaft wall — barely there), and there is
// no "texture strength" on a `MeshStandardMaterial`; the honest way to get one
// without patching shaders is to composite the tile exactly as the CSS does —
// tile in multiply under the colour, then a flat wash of the surface's shadow
// tone back over it — into one small tiling canvas, once, and hand three.js the
// result.

import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import { SURFACES, TILES, scaleChannels } from '../../model/materials.js';

/** @import { Surface, Shade } from '../../model/types.js' */

const BAKE_SIZE = 256;

/** The tile is baked once per surface, however many meshes ask for it. */
const baked = new Map();

/**
 * The surface's colour with the gradient collapsed to its midpoint.
 * @param {Surface} s
 * @returns {[number, number, number]} 0–255 per channel
 */
export function midChannels(s) {
  const a = scaleChannels(s.from, 1);
  const b = scaleChannels(s.to, 1);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/**
 * The albedo a surface should be drawn at before any light reaches it.
 * @param {Surface} s
 * @param {Shade} [shade] the tier/tint multiplier the CSS backend would apply
 */
export function surfaceColor(s, shade = 1) {
  const [r, g, b] = midChannels(s);
  // setRGB in sRGB space, so this is the same number the CSS backend writes
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace).multiplyScalar(shade);
}

/**
 * How many times a surface's tile repeats across a plane of this size. The
 * catalogue states `scale` in scene pixels and the scene is modelled in scene
 * pixels, so this is a plain division — no unit to get wrong.
 * @param {Surface} s @param {number} w @param {number} h
 * @returns {[number, number]}
 */
export const tileRepeat = (s, w, h) => [w / s.scale, h / s.scale];

/**
 * The tile, composited the way `surfaceStyle` composites it, as a repeating
 * texture. Resolves to `null` where there is nothing to bake — no tile, no
 * strength, or no 2D canvas (which is every test run).
 * @param {Surface} s
 * @returns {Promise<CanvasTexture | null>}
 */
export function bakeSurface(s) {
  const key = `${s.tile}|${s.tex}|${s.from}|${s.to}`;
  const hit = baked.get(key);
  if (hit) return hit;

  const url = TILES[s.tile];
  const job = !url || s.tex <= 0 || typeof document === 'undefined'
    ? Promise.resolve(null)
    : new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(draw(img, s));
      img.onerror = () => resolve(null);
      img.src = url;
    });
  baked.set(key, job);
  return job;
}

/**
 * Starts every shared surface bake at once.  The intro uses this as its loading
 * barrier so the first door movement cannot coincide with an image decode and
 * material update for a wall or the cage.
 */
export const preloadSurfaceTextures = () => Promise.all(Object.values(SURFACES).map(bakeSurface));

/**
 * @param {HTMLImageElement} img @param {Surface} s
 * @returns {CanvasTexture | null}
 */
function draw(img, s) {
  const canvas = document.createElement('canvas');
  canvas.width = BAKE_SIZE;
  canvas.height = BAKE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const [r, g, b] = midChannels(s);
  ctx.drawImage(img, 0, 0, BAKE_SIZE, BAKE_SIZE);
  // the colour, multiplied through the grain — the same order CSS uses, where
  // the tile sits under the gradient in multiply
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, BAKE_SIZE, BAKE_SIZE);
  // and the wash back over it: `tex` of the grain survives, the rest is flooded
  // with the surface's own shadow tone
  ctx.globalCompositeOperation = 'source-over';
  const [wr, wg, wb] = scaleChannels(s.to, 1);
  ctx.fillStyle = `rgba(${wr}, ${wg}, ${wb}, ${1 - s.tex})`;
  ctx.fillRect(0, 0, BAKE_SIZE, BAKE_SIZE);

  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Everything a `meshStandardMaterial` needs for this surface, bar the map.
 * @param {Surface} s @param {Shade} [shade]
 */
export const surfaceProps = (s, shade = 1) => ({
  color: surfaceColor(s, shade),
  roughness: s.rough ?? 0.85,
  metalness: s.metal ?? 0.1,
});

export { SURFACES };
