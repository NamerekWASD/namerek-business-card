// ── what a metal in this room can see ────────────────────────────────────────
// A `meshStandardMaterial` with `metalness` above zero has no diffuse term to
// speak of: almost everything it shows is a reflection. With no `envMap` there
// is nothing to reflect, so every metallic figure in `SURFACES` — up to 0.78 on
// `cabinetBronze` — was paying its cost and returning black.
//
// The environment is painted rather than downloaded. This is a business card
// whose whole subject is one dim corridor; an HDR file would be network weight
// for three colours and a lamp. So: a small equirectangular gradient in linear
// half-float, with one hot spot standing in for the fitting that lights the
// room, run through `PMREMGenerator` to get the roughness-blurred mip chain
// three samples.
//
// Two things here are not obvious.
//
// **A render target belongs to the renderer that made it.** This scene has two
// canvases, so it needs two of everything below — hence the cache keyed by `gl`.
//
// **`envMap` is in three's program cache key**, so a new texture object relinks
// every shader in the room. `fromEquirectangular` accepts a target to render
// *into*, and reusing it keeps the texture's identity stable — which is what
// lets the colour be a knob you drag rather than a constant you reload for.

import {
  Color, DataTexture, DataUtils, EquirectangularReflectionMapping,
  HalfFloatType, LinearFilter, PMREMGenerator, RGBAFormat,
} from 'three';

const W = 256;
const H = 128;

// Where the room's own fitting hangs, in equirect coordinates, and how hard it
// burns. Not knobs: this is a fact about the two lamps — a bulkhead reflector
// bolted to a wall a little above head height, and a pendant hanging over the
// middle of a corridor — and the bench already carries how bright each is.
const LAMPS = {
  shaft: { u: 0.2, v: 0.44, radius: 0.085, gain: 13 },
  landing: { u: 0.62, v: 0.3, radius: 0.11, gain: 10 },
};

// The vertical gradient, as fractions of the room's own light: dark ceiling,
// the lit band at eye level, a floor that gives back least of all.
const SKY = 0.22;
const GROUND = 0.05;

// ── why the walls of the painted room are nearly black ──────────────────────
// three's `envMap` is not only a mirror. A `meshStandardMaterial` takes *both*
// terms from it — the specular reflection and a diffuse irradiance — so an
// environment is also an ambient light, and its brightness is its average over
// the whole sphere rather than its peak.
//
// The first cut had the lit band at 1.0 and measured accordingly: median
// luminance over the frame went 35 to 61 and the histogram's stddev fell from
// 30.2 to 26.5. That is not a reflection; that is a floodlight, and it undoes
// the whole chroma pass — a picture lit from everywhere at once has no shadows
// left to be coloured.
//
// So the gradient is scaled down by this and the lamp is not. The average over
// the sphere drops by the same factor, while the one small bright thing stays
// bright — which is exactly the asymmetry a dark corridor with a single fitting
// in it actually has, and the only way to get a narrow specular run without
// paying for it in ambience.
const BAND = 0.13;

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * One texel of the environment, in linear light. Exported because it is the
 * whole of the design decision and the only part that can be checked without a
 * GPU.
 *
 * @param {'shaft' | 'landing'} room
 * @param {Color} light the room's own colour, already linear
 * @param {number} u 0..1 around @param {number} v 0..1 top to bottom
 * @returns {[number, number, number]}
 */
export function envTexel(room, light, u, v) {
  const band = BAND * (v < 0.5
    ? SKY + (1 - SKY) * smooth(v / 0.5)
    : 1 + (GROUND - 1) * smooth((v - 0.5) / 0.5));

  const lamp = LAMPS[room] ?? LAMPS.shaft;
  const phi = (0.5 - v) * Math.PI;
  const wrap = Math.abs(u - lamp.u);
  // longitudes converge at the poles, so a disc drawn in uv is a smear unless
  // the horizontal distance is scaled by the latitude it sits at
  const dx = Math.min(wrap, 1 - wrap) * 2 * Math.PI * Math.cos(phi);
  const dy = (v - lamp.v) * Math.PI;
  const d = Math.sqrt(dx * dx + dy * dy) / lamp.radius;
  const spot = lamp.gain * Math.exp(-d * d);

  const k = band + spot;
  return [light.r * k, light.g * k, light.b * k];
}

/**
 * The painted sphere as a texture three can convolve.
 * @param {'shaft' | 'landing'} room @param {string} colour
 */
function equirect(room, colour) {
  const light = new Color(colour);
  const data = new Uint16Array(W * H * 4);
  for (let y = 0; y < H; y += 1) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x += 1) {
      const rgb = envTexel(room, light, (x + 0.5) / W, v);
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c += 1) data[i + c] = DataUtils.toHalfFloat(rgb[c]);
      data[i + 3] = DataUtils.toHalfFloat(1);
    }
  }
  const tex = new DataTexture(data, W, H, RGBAFormat, HalfFloatType);
  tex.mapping = EquirectangularReflectionMapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** @type {WeakMap<object, { pmrem: PMREMGenerator, rooms: Map<string, { colour: string, target: any }> }>} */
const perRenderer = new WeakMap();

/**
 * The room's environment for this renderer, generated on first ask and
 * re-rendered into the same target whenever the colour moves.
 *
 * @param {import('three').WebGLRenderer} gl
 * @param {'shaft' | 'landing'} room
 * @param {string} colour
 * @returns {import('three').Texture}
 */
export function roomEnvMap(gl, room, colour) {
  let rec = perRenderer.get(gl);
  if (!rec) {
    rec = { pmrem: new PMREMGenerator(gl), rooms: new Map() };
    perRenderer.set(gl, rec);
  }

  const slot = rec.rooms.get(room);
  if (slot && slot.colour === colour) return slot.target.texture;

  const source = equirect(room, colour);
  const target = rec.pmrem.fromEquirectangular(source, slot?.target ?? null);
  // the source is a staging texture; the convolved cube is what gets sampled
  source.dispose();
  rec.rooms.set(room, { colour, target });
  return target.texture;
}

// No disposal path, deliberately. The cache is keyed by the renderer, so a
// canvas that unmounts takes its context — and everything in it — with it, and
// the record is then unreachable. A `dispose()` here would only ever run on a
// context that has already gone.
