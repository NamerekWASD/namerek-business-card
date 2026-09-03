// What a surface will actually render as, computed instead of photographed.
//
// ── why this file exists ────────────────────────────────────────────────────
// NBC-72 spent an evening on "конструкция конвейера чёрная" and did not settle
// it. The method was the problem: change a number, reload the scene (HMR does
// not reliably reflect a three.js edit), raycast a grid of screen points, read
// the pixels back out of a screenshot, average per object. Five minutes a
// probe, one variable a probe, and a live-console probe that *lies* — `Room`
// caches `material.userData.albedo` on its first pass, so setting
// `material.color` from the console moves nothing and the albedo looks
// innocent.
//
// Three separate faults were stacked in that one black band, which is exactly
// why one-at-a-time eyeballing could not converge:
//
//   1. the shadow blur was wider than the objects casting it, so every member
//      thinner than ~20 cm read its own body as the occluder (NBC-72,
//      `shadowNormalBias`);
//   2. a vertical face in the landing gets about one per cent of its light from
//      the pendant, so its level is set by `albedo × ambient` and nothing else;
//   3. `NeutralToneMapping` subtracts a black point *taken from the minimum
//      channel*, which costs a warm ochre wall nothing and costs a cold
//      near-neutral steel almost everything.
//
// Only the third one is subtle, and it is pure arithmetic — no GPU, no browser,
// no screenshot. So it is arithmetic here, and the same question now costs a
// function call. `toneResponse.test.js` is the gate that keeps fault 3 from
// coming back; this module is what any future "why is that thing black" should
// be asked before the dev server is started.
//
// ── what it models, and what it does not ────────────────────────────────────
// It models the terms that decide whether a prop reads at all:
//
//   albedo (catalogue mid × shade)
//     × the room's own bounce  (`Room` writes emissive = albedo × ambient × bounce)
//     + the environment's diffuse irradiance (`envMapIntensity` × the painted
//       sphere's average — an envMap is an ambient light, see `roomEnv.js`)
//     → the room's tone curve at the room's exposure, then the chroma stage
//     → sRGB, 0..255
//
// It does **not** model the lamp. That is deliberate rather than lazy: the term
// this is for is the one that survives when the lamp does not reach, and the
// measurement that started all of this put the pendant's contribution to a
// vertical face at about one level out of 255. A number from here is therefore
// the *floor* a surface renders at — what it looks like where the light isn't.
// Anything the lamp rakes will read higher on screen than it reads here, and
// the thresholds in the test are calibrated in these units for that reason.
//
// Nor does it model the grain, and there it is closer to exact than it looks:
// `surfaceProps` lifts the colour by the tile's gain (1/mean) and `Room` then
// hands the same tile in as `emissiveMap` (mean), so the two cancel in the
// ambient term to within the tile's own contrast.

import { Color, SRGBColorSpace } from 'three';
import { midChannels } from './surfaceMaterial.js';
import { envTexel } from './roomEnv.js';

/** @import { Surface, Shade } from '../../model/types.js' */

/**
 * @typedef {object} RoomGrade what `roomLight()` hands back, or any subset of it
 * @property {number} ambient @property {string} bounce
 * @property {string} toneCurve @property {number} exposure @property {number} chroma
 * @property {number} [env] @property {string} [envColor]
 */

// ── the curves ──────────────────────────────────────────────────────────────
// Ported one for one from three's `tonemapping_pars_fragment` chunk — the same
// source `roomTone.js` patches at runtime. They are transcribed rather than
// imported because the originals are GLSL strings compiled into a shader, and
// there is no way to call one from JS.
//
// `roomTone.test.js` already guards that our patch still matches three's chunk.
// What guards *these* is `toneResponse.test.js`, which re-extracts the
// constants out of the chunk's source text and compares them to the numbers
// below: a three upgrade that re-tunes a curve fails there rather than quietly
// making this file a model of a renderer nobody is running.

const clamp01 = (/** @type {number} */ v) => (v < 0 ? 0 : (v > 1 ? 1 : v));

/** @param {number[]} c @param {number} exposure */
const linear = (c, exposure) => c.map((v) => clamp01(v * exposure));

/** @param {number[]} c @param {number} exposure */
const reinhard = (c, exposure) => c.map((v) => clamp01((v * exposure) / (1 + v * exposure)));

/** @param {number[]} c @param {number} exposure */
const cineon = (c, exposure) => c.map((v) => {
  const x = Math.max(0, v * exposure - 0.004);
  return ((x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06)) ** 2.2;
});

/**
 * Column-major, the way GLSL writes a `mat3` — so this reads exactly like the
 * chunk it came from and can be diffed against it by eye.
 * @param {number[][]} m @param {number[]} v
 */
const mul3 = (m, v) => [0, 1, 2].map((r) => m[0][r] * v[0] + m[1][r] * v[1] + m[2][r] * v[2]);

const ACES_IN = [
  [0.59719, 0.07600, 0.02840],
  [0.35458, 0.90834, 0.13383],
  [0.04823, 0.01566, 0.83777],
];
const ACES_OUT = [
  [1.60475, -0.10208, -0.00327],
  [-0.53108, 1.10813, -0.07276],
  [-0.07367, -0.00605, 1.07602],
];

/** @param {number[]} c @param {number} exposure */
const aces = (c, exposure) => {
  const v = mul3(ACES_IN, c.map((x) => (x * exposure) / 0.6));
  const fit = v.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.432951) + 0.238081));
  return mul3(ACES_OUT, fit).map(clamp01);
};

const SRGB_TO_REC2020 = [
  [0.6274, 0.0691, 0.0164],
  [0.3293, 0.9195, 0.0880],
  [0.0433, 0.0113, 0.8956],
];
const REC2020_TO_SRGB = [
  [1.6605, -0.1246, -0.0182],
  [-0.5876, 1.1329, -0.1006],
  [-0.0728, -0.0083, 1.1187],
];
const AGX_IN = [
  [0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859],
];
const AGX_OUT = [
  [1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405],
];
export const AGX_MIN_EV = -12.47393;
export const AGX_MAX_EV = 4.026069;

/** The sigmoid three uses in place of AgX's real contrast curve. */
const agxContrast = (/** @type {number} */ x) => {
  const x2 = x * x;
  const x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4
    - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
};

/** @param {number[]} c @param {number} exposure */
const agx = (c, exposure) => {
  let v = mul3(AGX_IN, mul3(SRGB_TO_REC2020, c.map((x) => x * exposure)));
  // Log2 encoding. The domain opens 12.47 stops below middle grey, which is the
  // whole reason a deep shadow comes out of AgX as a mid grey rather than as
  // black — and the reason a curve swap moves a dark prop far more than it
  // moves a lit wall.
  v = v.map((x) => clamp01((Math.log2(Math.max(x, 1e-10)) - AGX_MIN_EV) / (AGX_MAX_EV - AGX_MIN_EV)));
  v = v.map(agxContrast);
  v = mul3(AGX_OUT, v).map((x) => Math.max(0, x) ** 2.2);
  return mul3(REC2020_TO_SRGB, v).map(clamp01);
};

/**
 * Where Neutral stops taking the whole of the minimum channel away and starts
 * taking a flat 0.04. Exported because it is the tripwire, not a detail: a
 * surface whose darkest channel lands under this is a surface this curve can
 * erase, and `toeFraction` is the check.
 */
export const NEUTRAL_TOE = 0.08;

/** @param {number[]} c @param {number} exposure */
const neutral = (c, exposure) => {
  const v = c.map((x) => x * exposure);
  // The black point, and the whole of NBC-72's third fault. It is taken from
  // the *minimum* channel, so what it removes is the pixel's achromatic floor:
  // a warm ochre's minimum is its blue and near zero, a cold near-grey's
  // minimum is its own brightness. Below the toe the survivor is 6.25x².
  const x = Math.min(...v);
  const offset = x < NEUTRAL_TOE ? x - 6.25 * x * x : 0.04;
  const shifted = v.map((ch) => ch - offset);

  const start = 0.8 - 0.04;
  const peak = Math.max(...shifted);
  if (peak < start) return shifted;

  const d = 1 - start;
  const newPeak = 1 - (d * d) / (peak + d - start);
  const scaled = shifted.map((ch) => (ch * newPeak) / peak);
  const g = 1 - 1 / (0.15 * (peak - newPeak) + 1);
  return scaled.map((ch) => ch * (1 - g) + newPeak * g);
};

/**
 * By the name the panel shows, which is the name `LIGHT_SETUP` stores. `none`
 * is three's `NoToneMapping`: no curve *and* no exposure, the same as the
 * dispatcher in `roomTone.js`.
 * @type {Record<string, (c: number[], exposure: number) => number[]>}
 */
export const CURVES = {
  none: (c) => c,
  linear,
  reinhard,
  cineon,
  aces,
  agx,
  neutral,
};

const LUMA = [0.2126, 0.7152, 0.0722];

/**
 * The curve and the chroma stage, exactly as `roomTone.js` runs them: the grade
 * is put back after the curve took it away, clamped at zero because a negative
 * channel reaching the sRGB encode comes out NaN.
 *
 * @param {number[]} rgb linear @param {RoomGrade} grade @returns {number[]} linear
 */
export function gradeRGB(rgb, grade) {
  const curve = CURVES[grade.toneCurve] ?? CURVES.none;
  const mapped = curve(rgb, grade.exposure ?? 1);
  const grey = LUMA[0] * mapped[0] + LUMA[1] * mapped[1] + LUMA[2] * mapped[2];
  const chroma = grade.chroma ?? 1;
  return mapped.map((v) => Math.max(0, grey + (v - grey) * chroma));
}

// ── the environment, as the ambient light it also is ────────────────────────
// `roomEnv.js` says it outright: a `meshStandardMaterial` takes a diffuse
// irradiance from an envMap as well as a reflection, so the painted sphere is a
// lamp whose brightness is its *average*, not its peak. That average is
// computable — `envTexel` is pure — so it is computed rather than guessed at.
//
// Solid-angle weighted (a row of texels at the pole covers less sphere than a
// row at the equator) and taken over the whole sphere rather than over the
// hemisphere a particular face sees. The second one is an approximation and the
// direction of its error is known: a face looking away from the lamp gets less
// than this, a face looking at it more. It is a floor model; that is the right
// side to be wrong on.

const ENV_ROWS = 64;
const ENV_COLS = 128;

/** @type {Map<string, number[]>} */
const envMeans = new Map();

/**
 * The painted environment's mean radiance, in linear light.
 * @param {'shaft' | 'landing'} room @param {string} colour
 * @returns {number[]}
 */
export function envMean(room, colour) {
  const key = `${room}|${colour}`;
  const hit = envMeans.get(key);
  if (hit) return hit;

  const light = new Color(colour);
  const sum = [0, 0, 0];
  let weight = 0;
  for (let y = 0; y < ENV_ROWS; y += 1) {
    const v = (y + 0.5) / ENV_ROWS;
    const w = Math.sin(v * Math.PI);
    for (let x = 0; x < ENV_COLS; x += 1) {
      const texel = envTexel(room, light, (x + 0.5) / ENV_COLS, v);
      for (let c = 0; c < 3; c += 1) sum[c] += texel[c] * w;
    }
    weight += w * ENV_COLS;
  }
  const mean = sum.map((s) => s / weight);
  envMeans.set(key, mean);
  return mean;
}

/**
 * A surface's albedo in linear light, the way `surfaceColor` builds it.
 * @param {Surface} s @param {Shade} [shade]
 */
export function albedoOf(s, shade = 1) {
  const [r, g, b] = midChannels(s);
  const c = new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace).multiplyScalar(shade);
  return [c.r, c.g, c.b];
}

/**
 * What reaches the tone curve: the room's bounce plus the environment's
 * irradiance, both at the surface's own albedo. Linear.
 *
 * @param {Surface} s @param {Shade} shade @param {RoomGrade} light
 * @param {'shaft' | 'landing'} [room]
 */
export function unlitRGB(s, shade, light, room = 'landing') {
  const albedo = albedoOf(s, shade);
  const bounce = new Color(light.bounce ?? '#ffffff');
  const env = light.env ? envMean(room, light.envColor ?? '#ffffff') : [0, 0, 0];
  const b = [bounce.r, bounce.g, bounce.b];
  return albedo.map((a, i) => a * light.ambient * b[i] + a * (light.env ?? 0) * env[i]);
}

const encode = (/** @type {number} */ v) => {
  const c = clamp01(v);
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
};

/**
 * The pixel, 0..255 per channel, where the lamp does not reach.
 *
 * @param {Surface} s @param {Shade} shade @param {RoomGrade} light
 * @param {'shaft' | 'landing'} [room]
 */
export function renderedRGB(s, shade, light, room = 'landing') {
  return gradeRGB(unlitRGB(s, shade, light, room), light).map(encode);
}

/**
 * The same thing as one number — the luminance a legibility threshold is
 * stated against.
 *
 * @param {Surface} s @param {Shade} shade @param {RoomGrade} light
 * @param {'shaft' | 'landing'} [room]
 */
export function renderedLevel(s, shade, light, room = 'landing') {
  const lit = gradeRGB(unlitRGB(s, shade, light, room), light);
  return encode(LUMA[0] * lit[0] + LUMA[1] * lit[1] + LUMA[2] * lit[2]);
}

/**
 * How much of this surface's darkest channel `neutral`'s black point removes,
 * 0..1. The mechanical form of NBC-72's fault, with no taste in it: at 1 the
 * curve takes the entire achromatic floor of the pixel away, which is what
 * happened to `SURFACES.steel` and cannot happen to a warm surface.
 *
 * Meaningful whatever curve the room is actually set to — it is asking whether
 * this surface is *exposed* to that curve, which is what a gate wants to know
 * before someone changes the grade.
 *
 * @param {Surface} s @param {Shade} shade @param {RoomGrade} light
 * @param {'shaft' | 'landing'} [room]
 */
export function toeFraction(s, shade, light, room = 'landing') {
  const v = unlitRGB(s, shade, light, room).map((c) => c * (light.exposure ?? 1));
  const x = Math.min(...v);
  if (x <= 0) return 1;
  const offset = x < NEUTRAL_TOE ? x - 6.25 * x * x : 0.04;
  return Math.min(1, offset / x);
}

/**
 * Every named surface and shade in one table, darkest first, with its level
 * under every curve the panel offers. This is the thing to run instead of
 * starting the dev server.
 *
 * @param {{ name: string, surface: Surface, shade: Shade }[]} props
 * @param {RoomGrade} light @param {'shaft' | 'landing'} [room]
 */
export function sweep(props, light, room = 'landing') {
  return props
    .map(({ name, surface, shade }) => ({
      name,
      shade,
      level: renderedLevel(surface, shade, light, room),
      toe: toeFraction(surface, shade, light, room),
      /** @type {Record<string, number>} */
      byCurve: Object.fromEntries(Object.keys(CURVES).map(
        (toneCurve) => [toneCurve, renderedLevel(surface, shade, { ...light, toneCurve }, room)],
      )),
    }))
    .sort((a, b) => a.level - b.level);
}

/** `sweep`'s rows as something readable in a terminal. */
export function formatSweep(/** @type {ReturnType<typeof sweep>} */ rows) {
  const curves = Object.keys(CURVES);
  const head = ['prop'.padEnd(26), 'shade'.padStart(6), 'toe'.padStart(5), ...curves.map((c) => c.padStart(8))];
  const body = rows.map((r) => [
    r.name.padEnd(26),
    String(r.shade).padStart(6),
    r.toe.toFixed(2).padStart(5),
    ...curves.map((c) => String(r.byCurve[c]).padStart(8)),
  ].join(' '));
  return [head.join(' '), ...body].join('\n');
}
