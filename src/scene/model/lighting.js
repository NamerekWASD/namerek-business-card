// ── light ────────────────────────────────────────────────────────────────────
// Nothing in this scene used to be lit. Every face carried a `shade` I picked by
// eye, and the switch called LIGHTS.cage was a vignette — a black ellipse laid
// over the whole frame — which is exactly why turning it *off* made the picture
// brighter. It was named for a lamp and behaved like a lens.
//
// The lamps are objects with positions now, and brightness is computed from
// them: Lambert's cosine law for the angle a face is held at, inverse square for
// how far away it is. No shadows, no bounce, so this is not a renderer. But the
// cosine term is the whole of what makes a solid read as solid, and it is
// precisely the term that was being guessed.
//
// Scene coordinates: x and y are screen pixels on the z = 0 plane, z is world
// pixels, and -z runs away from the camera.

import { CAM_ORIGIN_Y, SHAFT_DEPTH } from './camera.js';

/** @import { Point3, Normal3, Lamp, Shade } from './types.js' */

export const LAMPS = {
  on: true,
  // One pair per landing, and this is the setting that matters most. At every
  // half floor there was always a fixture close by, so nothing ever brightened
  // or dimmed — a shaft lit like a corridor ceiling. One per floor means the
  // light genuinely falls away between landings, which is the thing the black
  // overlay used to be faking.
  every: 1,
  // |x| from the centre of the shaft, as a fraction of its width. Left wall
  // only: the right-hand side of the shaft belongs to the counterweight, and two
  // symmetric lamps light the cage from both sides at once, which is the one
  // arrangement guaranteed to produce no modelling at all.
  side: 0.464,
  rise: 0.14, // how far above the landing it is bolted, in floors
  proud: 26, // how far the glass stands off the wall it is bolted to
  size: 92, // across the guard ring
  power: 2.6, // brightness at the glass itself
  reach: 640, // the cage is most of a thousand pixels from the far wall, so a
  // short reach leaves it on ambient alone and nothing in it responds
  haze: 0.3, // how much of it hangs in the air instead of landing on something
};

// How far either way the fittings are built at all, in floors. Beyond this they
// contribute a fraction of a percent and are not worth the elements.
//
// It is exported because it is a *seam*: a renderer that reduces this row to one
// physical light has to know where the row stops, so that it can fade a lamp out
// before it vanishes rather than after. Hard-coded in two places, that is a
// silent brightness jump waiting for someone to change one of them.
export const LAMP_RANGE = 1.7;

// What the shaft bounces back, so an unlit face goes dim rather than absent.
export const LIGHT_AMBIENT = 0.26;
// A lamp in a reflector is not a point source, so the terminator is soft: a face
// turned a little past ninety degrees still catches some of it.
export const LIGHT_WRAP = 0.42;

// Where the fixtures are, in scene coordinates, for the shaft's current
// position. `u` is the floor coordinate, so the lamp at u = 1.5 is bolted to the
// wall halfway between the first and second landings.
/**
 * @param {number} vw
 * @param {number} vh
 * @param {number} floorPos fractional floor coordinate of the car
 * @param {number} floorPitch one floor, in screen pixels
 * @returns {Lamp[]}
 */
export function lampsAt(vw, vh, floorPos, floorPitch) {
  if (!LAMPS.on) return [];
  const out = [];
  const z = -SHAFT_DEPTH + LAMPS.proud;
  const first = Math.ceil((floorPos - LAMP_RANGE) / LAMPS.every) * LAMPS.every;
  for (let u = first; u <= floorPos + LAMP_RANGE; u += LAMPS.every) {
    const y = (floorPos - u - LAMPS.rise) * floorPitch + vh * CAM_ORIGIN_Y;
    out.push({ id: `${u}L`, x: vw * (0.5 - LAMPS.side), y, z });
  }
  return out;
}

// The multiplier a face at `point` with outward normal `normal` should be drawn
// at. `excludeLamp` drops a lamp from the shading of its own fixture, where the
// distance is a few pixels and an inverse square would simply blow up.
/**
 * @param {Point3} point
 * @param {Normal3} normal
 * @param {Lamp[]} lamps
 * @param {Lamp} [excludeLamp]
 * @returns {Shade}
 */
export function lightAt(point, normal, lamps, excludeLamp) {
  let sum = 0;
  for (const L of lamps) {
    if (L === excludeLamp) continue;
    const dx = L.x - point[0];
    const dy = L.y - point[1];
    const dz = L.z - point[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const d = Math.sqrt(d2) || 1;
    const cos = (dx * normal[0] + dy * normal[1] + dz * normal[2]) / d;
    const lam = Math.max(0, (cos + LIGHT_WRAP) / (1 + LIGHT_WRAP));
    // Squared, not plain, inverse square. A single 1/(1+d²/r²) has such a long
    // tail that a dozen lamps two floors away still sum to more light than the
    // one overhead — the first cut came out at brightness(2.7) on every deck,
    // which is a scene with no lamps in it, only a general glow.
    const fall = (LAMPS.reach * LAMPS.reach) / (LAMPS.reach * LAMPS.reach + d2);
    sum += LAMPS.power * lam * fall * fall;
  }
  // Quantised, and this is a rendering decision rather than a lighting one. A
  // shade ends up as a colour, and a new colour is a repaint — so a brightness
  // sliding continuously repainted every lit face in the scene on every frame,
  // for differences far below anything an eye resolves on surfaces this dark.
  // In fiftieths, most frames come out byte-identical and the browser is spared
  // the whole thing.
  return Math.round((LIGHT_AMBIENT + sum) * 50) / 50;
}

// The corridor has its own fitting overhead, so its contents are lit from above
// and a little in front — not from the shaft lamps, which are on the other side
// of a wall. One fixed direction is enough here: these objects do not move, and
// what they need is not a changing light but three faces that disagree.
/** @type {Normal3} */
export const ROOM_LIGHT = [0.18, -0.88, 0.44];

// The range is wide on purpose. The corridor props used to carry
// brightness(1.85) on the wrapper above them, which is what made them visible at
// all; that had to go because a filter flattens everything under it, so the
// whole of it lives here now — spread across the faces instead of applied to the
// object.
/**
 * @param {Normal3} normal
 * @returns {Shade}
 */
export function roomLightAt(normal) {
  const c = normal[0] * ROOM_LIGHT[0] + normal[1] * ROOM_LIGHT[1] + normal[2] * ROOM_LIGHT[2];
  return 0.6 + 1.55 * Math.max(0, (c + 0.3) / 1.3);
}

// `roomLightAt` runs from 0.6 in the dark to about 2.15 held flat to the
// corridor light; a face square to the wall sits at 1.48. The enamel colours are
// authored as they should look on that face, so a caller's shade is measured
// against it — which is what lets a plate darken with the thing it is bolted to
// instead of glowing off it. Flat UI passes nothing and gets the colours as
// written.
export const ENAMEL_REFERENCE_LIGHT = 1.48;
