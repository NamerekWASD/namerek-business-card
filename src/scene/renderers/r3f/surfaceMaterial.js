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
//
// ── the exception: a tile painted here rather than photographed ──────────────
// `brick.js` draws the shaft's masonry instead of loading a picture of it, and
// a picture is exactly what it is: bond, joints, chipped arrises, the lot. So
// for those the bake keeps the painting and reads `tex` as *contrast* about its
// own mean rather than as how far to pull it toward white — see `draw`. The
// rest of the contract is unchanged, and deliberately so: it is still a
// multiplier, still normalised to a mean of one, and the wall's pigment still
// lives in `SURFACES` where every other surface keeps it. The painting carries
// only as much hue as a brick has *against its own mortar*; the red is the
// catalogue's.

import { CanvasTexture, Color, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';
import { SURFACES, TILES, scaleChannels } from '../../model/materials.js';
import { brickCanvas } from './brick.js';
import { plateCanvas } from './plate.js';
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

/**
 * The tiles this renderer paints for itself, by the name the catalogue calls
 * them. Looked at before `TILES`, so a `Surface` says `tile: 'brick'` exactly
 * the way it says `tile: 'pour'` and nothing above the renderer has to know
 * which of the two it got.
 */
const PAINTED_TILES = { brick: brickCanvas, plate: plateCanvas };

/**
 * Whatever this surface's `tile` names, ready to be drawn into a bake — a
 * decoded photograph, or a canvas this renderer painted itself.
 *
 * The catalogue names its tiles and says nothing about where they come from,
 * and the choice between a JPEG and a painter is made here, once, on behalf of
 * both bakes.
 *
 * @param {Surface} s
 * @returns {Promise<CanvasImageSource | null>}
 */
function tileSource(s) {
  const painter = PAINTED_TILES[s.tile];
  if (painter) return Promise.resolve(painter());
  const url = TILES[s.tile];
  return url ? tileImage(url) : Promise.resolve(null);
}

/** Whether this surface's tile is painted here rather than photographed. */
const isPainted = (s) => Boolean(PAINTED_TILES[s.tile]);

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

  const painted = isPainted(s);
  const job = step <= 0 || typeof document === 'undefined'
    ? Promise.resolve(null)
    : tileSource(s).then((img) => (img ? draw(img, step, painted) : null));
  baked.set(key, job);
  return job;
}


// ── the roughness half ──────────────────────────────────────────────────────
// An environment map on its own gives a metal a uniform sheen: the same
// reflection everywhere, which reads as clean plastic rather than as worn iron.
// What makes it read as *wear* is roughness that varies across the surface, and
// the tile already in hand is a perfectly good field to vary it by.
//
// `roughnessMap` multiplies, and a multiplier can only ever make a surface
// shinier. So the mean is measured and handed back as a gain the material's own
// roughness is lifted by — the same normalisation the grain bake does for
// colour, and for the same reason: the slider should add variation without also
// moving the average, or every nudge costs a re-dial of everything else.
//
// The knob is signed. Positive reads the tile's dark incident as polish — oil, a
// handled edge, a rubbed corner — and negative reads it as pitting. Both are
// real and this scene has both, so it is a judgement rather than a fact and it
// belongs on the bench.

/** @type {Map<string, Promise<CanvasTexture | null>>} */
const roughs = new Map();

/**
 * The tile as a roughness field. `null` where there is nothing to make one
 * from, and where the knob is at zero — which is also what turns the second
 * texture off entirely.
 * @param {Surface} s
 * @returns {Promise<CanvasTexture | null>}
 */
export function bakeRoughness(s) {
  const k = Math.round((readLight().roughGrain ?? 0) * 40) / 40;
  const key = `${s.tile}|${k}`;
  const hit = roughs.get(key);
  if (hit) return hit;

  const job = k === 0 || typeof document === 'undefined'
    ? Promise.resolve(null)
    : tileSource(s).then((img) => (img ? drawRoughness(img, k) : null));
  roughs.set(key, job);
  return job;
}

/**
 * @param {CanvasImageSource} img @param {number} k signed, -1..1
 * @returns {CanvasTexture | null}
 */
function drawRoughness(img, k) {
  const canvas = document.createElement('canvas');
  canvas.width = BAKE_SIZE;
  canvas.height = BAKE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, BAKE_SIZE, BAKE_SIZE);
  const frame = ctx.getImageData(0, 0, BAKE_SIZE, BAKE_SIZE);
  const px = frame.data;

  const amount = Math.abs(k);
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    // the tile's own luminance, as stored — this texture is sampled linearly,
    // so no transfer function belongs anywhere in here
    const g = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    // k > 0: dark spots go shiny. k < 0: bright spots do, which leaves the dark
    // ones as the rough side once the mean is put back.
    const v = 1 - amount * (k > 0 ? 1 - g : g);
    const byte = v < 0 ? 0 : Math.round(v * 255);
    px[i] = byte;
    px[i + 1] = byte;
    px[i + 2] = byte;
    px[i + 3] = 255;
    sum += byte / 255;
  }
  ctx.putImageData(frame, 0, 0);

  const mean = sum / (px.length / 4);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  // Not sRGB, and this is the one place it matters: three uploads an sRGB
  // texture in a hardware-decoding format, so tagging this one the way the
  // colour map is tagged would silently darken every roughness it reports.
  tex.colorSpace = NoColorSpace;
  tex.anisotropy = 16;
  tex.userData.gain = Math.min(2, mean > 0.05 ? 1 / mean : 1);
  return tex;
}

/**
 * Starts every shared surface bake at once. The intro uses this as its loading
 * barrier so the first door movement cannot coincide with an image decode and
 * material update for a wall or the cage.
 */
export const preloadSurfaceTextures = () => Promise.all(
  Object.values(SURFACES).flatMap((s) => [bakeSurface(s), bakeRoughness(s)]),
);

/** sRGB byte to linear, three's own transfer function. */
const toLinear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * @param {CanvasImageSource} img @param {number} strength
 * @param {boolean} [painted] whether the source is one this renderer drew
 * @returns {CanvasTexture | null}
 */
function draw(img, strength, painted = false) {
  // A painted tile keeps its own resolution. It is authored at the size it is
  // meant to be read at — a brick tile is four bricks by twelve courses, and
  // squeezed into 256px a course is twenty-one pixels tall with an eight-pixel
  // joint inside it, which mips down to a smear. A photograph has no such
  // structure to lose and 256 is plenty for it.
  const size = painted ? Number(/** @type {HTMLCanvasElement} */ (img).width) || BAKE_SIZE : BAKE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  const frame = ctx.getImageData(0, 0, size, size);
  const px = frame.data;

  // ── what `strength` means, and why it is not the same thing twice ──────────
  // For a photograph it is *how much grain*: the tile is pulled toward white by
  // it, per channel so the tile's own hue survives in its dark spots. Past 1 it
  // travels further than the tile itself and clamps at black, which is what
  // makes the slider's top end worth having on a wall whose catalogue figure is
  // 0.14.
  //
  // For a painted tile that is the wrong operation. A brick wall pulled toward
  // white is a brick wall with the mortar bleached out of it — the picture is
  // the point, not a modulation of it — so there `strength` is *contrast*: each
  // pixel is blended toward the tile's own mean, which leaves the mean where it
  // was. 0 is a flat wall, 1 is the painting as authored, past 1 is harder. The
  // mean staying put is what keeps the bake's `gain` — and so the wall's
  // brightness — constant while that knob is dragged.
  const centre = [0, 0, 0];
  if (painted) {
    for (let i = 0; i < px.length; i += 4) {
      for (let c = 0; c < 3; c += 1) centre[c] += px[i + c];
    }
    for (let c = 0; c < 3; c += 1) centre[c] /= px.length / 4;
  }

  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = painted
        ? centre[c] + (px[i + c] - centre[c]) * strength
        : 255 * (1 - strength * (1 - px[i + c] / 255));
      px[i + c] = v < 0 ? 0 : (v > 255 ? 255 : v);
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
 * The same applies to a roughness field: it multiplies, so the catalogue's own
 * roughness has to be lifted by that bake's gain or every surface carrying one
 * comes out shinier than it is meant to be.
 *
 * @param {Surface} s @param {Shade} [shade]
 * @param {import('three').Texture | null} [map]
 * @param {import('three').Texture | null} [roughMap]
 */
export const surfaceProps = (s, shade = 1, map = null, roughMap = null) => {
  const color = surfaceColor(s, shade);
  if (map) color.multiplyScalar(map.userData?.gain ?? 1);
  const rough = (s.rough ?? 0.85) * (roughMap ? roughMap.userData?.gain ?? 1 : 1);
  return {
    color,
    roughness: Math.min(1, rough),
    metalness: s.metal ?? 0.1,
    ...(map ? { map } : {}),
    ...(roughMap ? { roughnessMap: roughMap } : {}),
  };
};

export { SURFACES };
