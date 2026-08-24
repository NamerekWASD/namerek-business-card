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
// surface's grain, the colour carries its colour, the lights carry the falloff.
//
// ── why the tiles were invisible, and what the bake is now ───────────────────
// They were invisible by arithmetic, and it took three separate mistakes
// stacked on top of each other. Worth stating all three, because each one on
// its own looks harmless.
//
// *The wash.* The bake used to draw the tile, multiply the surface's colour
// through it, and then flood `rgba(to, 1 - tex)` back over the whole canvas.
// Every wall-sized surface carries `tex` between 0.14 and 0.36 — so 64 to 86
// per cent of the result was a flat pour of the surface's own shadow tone, and
// what little grain survived was then tiled at 300-odd scene pixels across a
// whole wall.
//
// *The double multiply.* The colour went into the canvas *and* came back out
// as `material.color`, so albedo was that colour squared. A surface at 0.20
// sRGB rendered at 0.04 — a large part of why the corridor could not be lifted
// without blowing the props standing in it out.
//
// *The flat ambience.* `Room` carries what a room bounces as `emissive =
// albedo × ambient` with no map, and on most faces in this scene that term is
// the brighter of the two. A flat emissive cannot show a pattern: it floods one
// colour over the whole face and whatever the `map` was doing stops mattering.
// `Room` hands the map through as `emissiveMap` now, which is the other half of
// this fix — see the note there.
//
// So the bake produces a **neutral multiplicative grain** rather than a picture:
// white where the tile is white, darker where the tile is dark, with `tex`
// scaling how far it travels. None of the surface's colour goes into it. The
// canvas is then measured and the texture carries its own `gain` — one over the
// mean, in linear space — which the colour is multiplied by, so turning the
// grain up adds contrast without darkening the wall it is on. That is what
// makes grain a knob a person can drag without re-dialling the lighting after
// every nudge.

import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import { SURFACES, TILES, scaleChannels } from '../../model/materials.js';
import { readLight } from './tuning.js';

/** @import { Surface, Shade } from '../../model/types.js' */

const BAKE_SIZE = 256;

// ── which knob a surface's grain answers to ─────────────────────────────────
// Three families, because three different things are being judged. The big
// planes are a room's plaster and brick read across a whole wall; the metal is
// fittings and cage members read at arm's length; the cabinet is a hero prop
// with its own hand-tuned tones and is deliberately outside the scene-wide
// slider, so dialling the corridor cannot quietly restyle the machine standing
// in it.
const WALLS = new Set(['shaftWall', 'backWall', 'landing', 'landingFloor', 'paper']);
const familyOf = (key) => {
  if (key && key.startsWith('cabinet')) return 'cabinet';
  return WALLS.has(key) ? 'wall' : 'metal';
};

/** The catalogue, inverted — a `Surface` travels around by object, not by name. */
const NAME_OF = new Map(Object.entries(SURFACES).map(([k, v]) => [v, k]));

/**
 * How hard this surface's grain is drawn, and how big its tile is. Both are the
 * catalogue's own figure times the bench's multiplier for its family, so a
 * surface keeps its relative character while the whole scene moves together.
 * @param {Surface} s
 */
export function grainOf(s) {
  const tuning = readLight();
  const gain = { wall: tuning.grainWall, metal: tuning.grainMetal, cabinet: 1 };
  return {
    strength: Math.max(0, (s.tex ?? 0) * (gain[familyOf(NAME_OF.get(s))] ?? 1)),
    scale: Math.max(8, (s.scale ?? 100) * (tuning.grainScale ?? 1)),
  };
}

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
export const tileRepeat = (s, w, h) => {
  const { scale } = grainOf(s);
  // No floor under it. A clamp to one repeat would give a 27-pixel cage rail
  // the same tile a whole wall gets, which is the grain photographed through a
  // magnifying glass — the density has to stay the same across the scene, and
  // it is `scale` in the catalogue that says a fitting's grain is finer than a
  // wall's, not a rule applied here.
  return [w / scale, h / scale];
};

/** The decoded tile images, so re-baking at a new strength costs no network. */
const images = new Map();

/** @param {string} url @returns {Promise<HTMLImageElement | null>} */
function tileImage(url) {
  const hit = images.get(url);
  if (hit) return hit;
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  images.set(url, job);
  return job;
}

/** Baked grain, keyed by what actually went into it. */
const baked = new Map();

/**
 * The tile as a neutral multiplicative grain — white where the tile is white,
 * darker where it is dark, `strength` deciding how far. Resolves to `null`
 * where there is nothing to bake: no tile, no strength, or no 2D canvas (which
 * is every test run).
 * @param {Surface} s
 * @returns {Promise<CanvasTexture | null>}
 */
export function bakeSurface(s) {
  const { strength } = grainOf(s);
  // Quantised, so dragging a slider re-uses one of forty bakes rather than
  // making a fresh canvas on every animation frame it passes through.
  const step = Math.round(strength * 40) / 40;
  const key = `${s.tile}|${step}`;
  const hit = baked.get(key);
  if (hit) return hit;

  const url = TILES[s.tile];
  const job = !url || step <= 0 || typeof document === 'undefined'
    ? Promise.resolve(null)
    : tileImage(url).then((img) => (img ? draw(img, step) : null));
  baked.set(key, job);
  return job;
}

/**
 * Starts every shared surface bake at once. The intro uses this as its loading
 * barrier so the first door movement cannot coincide with an image decode and
 * material update for a wall or the cage.
 */
export const preloadSurfaceTextures = () => Promise.all(Object.values(SURFACES).map(bakeSurface));

/** sRGB byte to linear, three's own transfer function. */
const toLinear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * @param {HTMLImageElement} img @param {number} strength
 * @returns {CanvasTexture | null}
 */
function draw(img, strength) {
  const canvas = document.createElement('canvas');
  canvas.width = BAKE_SIZE;
  canvas.height = BAKE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, BAKE_SIZE, BAKE_SIZE);
  const frame = ctx.getImageData(0, 0, BAKE_SIZE, BAKE_SIZE);
  const px = frame.data;

  // The grain, per channel so the tile's own hue survives in its dark spots,
  // pulled toward white by `strength`. Past 1 it travels further than the tile
  // itself and clamps at black, which is what makes the slider's top end worth
  // having on a wall whose catalogue figure is 0.14.
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = 255 * (1 - strength * (1 - px[i + c] / 255));
      px[i + c] = v < 0 ? 0 : v;
    }
    sum += 0.2126 * toLinear(px[i]) + 0.7152 * toLinear(px[i + 1]) + 0.0722 * toLinear(px[i + 2]);
  }
  ctx.putImageData(frame, 0, 0);

  const mean = sum / (px.length / 4);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  // Generous, and it is the floor that asks for it: a plane seen almost edge-on
  // picks a coarse mip along its compressed axis and hands back the tile's own
  // mean, which is a flat wash however hard the grain was drawn. Anisotropic
  // filtering is exactly the fix for that, and at a 256px tile it is cheap.
  tex.anisotropy = 16;
  // One over the mean, in linear space: what the colour has to be lifted by so
  // that turning the grain up adds contrast rather than darkness. Clamped, so a
  // pathological tile cannot blow a wall out.
  tex.userData.gain = Math.min(4, Math.max(1, mean > 0.01 ? 1 / mean : 1));
  return tex;
}

/**
 * Everything a `meshStandardMaterial` needs for this surface.
 *
 * A call site that has a map **must** hand it in here rather than spreading it
 * on afterwards: the colour has to be lifted by that grain's own gain or the
 * surface comes out darker than the catalogue says it is, and this is the one
 * place that knows to do it. `useSurfaceMaterial` is the usual way in; the
 * third argument is for the handful of meshes that already hold their texture.
 *
 * @param {Surface} s @param {Shade} [shade]
 * @param {import('three').Texture | null} [map]
 */
export const surfaceProps = (s, shade = 1, map = null) => {
  const color = surfaceColor(s, shade);
  if (map) color.multiplyScalar(map.userData?.gain ?? 1);
  return {
    color,
    roughness: s.rough ?? 0.85,
    metalness: s.metal ?? 0.1,
    ...(map ? { map } : {}),
  };
};

export { SURFACES };
