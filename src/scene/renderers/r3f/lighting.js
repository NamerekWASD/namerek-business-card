// ── the lights ───────────────────────────────────────────────────────────────
// The scene is allowed a handful of physical sources and no more, and everything
// else that looks lit has to earn it some other way. This file is where that constraint is
// turned into numbers; nothing else in the R3F backend decides how bright
// anything is.
//
// The awkward part is the shaft. `lampsAt()` returns a *row* of fittings, and the
// CSS backend simply sums them — which is correct and costs nothing there,
// because its "lights" are arithmetic rather than objects. Here a row of lamps
// would be a row of `PointLight`s, so the row has to collapse to one.
//
// Picking one lamp to stand for the row was the first answer and it could not
// be made to work: a single light has to travel as the row passes, and every way
// of travelling between two fittings is visible — sharpen it and it hops, soften
// it and it drifts along beside the cage instead of belonging to a lamp. So the
// nearest few fittings each get a light of their own, standing still at their
// own position, and a ride changes only how bright each one is.

import { LAMP_RANGE } from '../../model/lighting.js';
import { CAGE_FAR, CAGE_NEAR, CAGE_FLOOR_Y } from '../../model/geometry.js';
import { SHAFT_DEPTH } from '../../model/camera.js';
import { readLight } from './tuning.js';

// Every brightness in this file comes from the bench rather than from a `const`,
// so that a drag on a slider is the same code path as a shipped default — see
// `tuning.js`. `light()` is read at call time and never captured: a value held
// in a closure is a knob that stops responding halfway through a session.
export { readLight as light };

/** @import { Lamp, Point3 } from '../../model/types.js' */

// ── which room a surface belongs to ──────────────────────────────────────────
// The shaft and a landing are two rooms with a wall between them, and that wall
// is opaque. Without shadow maps nothing enforces that: a point light in the
// shaft happily illuminates the far side of the back wall, and the landing
// stops reading as a room you are looking *into* and starts reading as a
// picture of one.
//
// Layers say it exactly and cost nothing. A three.js light only affects objects
// that share a layer with it, so putting the shaft's fittings and the landing's
// pendant on different layers *is* the wall, as far as light is concerned —
// with none of the cost or the artefacts of shadow mapping. The camera sees
// both, because it is not a light.
export const LAYER_SHAFT = 1;
export const LAYER_LANDING = 2;

/**
 * The rooms by name, which is how everything above the renderer refers to them
 * — a knob is `shaftAmbient`, not `ambient1`, and a `<Room room="landing">`
 * reads as what it is. The numbers stay because three.js counts layers; nothing
 * outside this file and `Room` should need them.
 * @type {Record<'shaft' | 'landing', number>}
 */
export const LAYER_OF = { shaft: LAYER_SHAFT, landing: LAYER_LANDING };

/**
 * How much of a lamp reaches something `d` away. This is `lightAt`'s falloff
 * term verbatim: a squared inverse-square, because a single one has a tail long
 * enough that a dozen distant lamps out-shine the one overhead.
 * @param {number} d
 */
export function lampFalloff(d) {
  const r2 = readLight().lampReach ** 2;
  const f = r2 / (r2 + d * d);
  return f * f;
}

/** How far the row of fittings reaches, in scene pixels rather than floors. */
export const lampRangePx = (floorPitch) => LAMP_RANGE * floorPitch;

/** Where the cage is, as one point, for deciding what the room is lit by. */
export const cageCentre = (vw, vh) => /** @type {Point3} */ ([
  vw / 2,
  vh * CAGE_FLOOR_Y * 0.62,
  (CAGE_NEAR + CAGE_FAR) / 2,
]);

/**
 * Smoothstep, used to close the row off at its own edge — see `keyLight`.
 * @param {number} edge0 @param {number} edge1 @param {number} x
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * A light for each of the nearest fittings — the rig that replaced the single
 * roving one.
 *
 * Each light stands exactly on its lamp and never moves; what changes as the
 * cage rides is only how bright each is, and that varies continuously with
 * distance. So there is no handover to hide and nothing to jump. Fittings
 * beyond the row's own edge are faded out before they vanish, for the same
 * reason as before: what pops in must already be contributing nothing.
 *
 * @param {Lamp[]} lamps
 * @param {Point3} at the point the rig is calibrated for — the cage
 * @param {number} [range] how far the row extends, in scene pixels
 * @returns {{ id: string, position: Point3, intensity: number, decay: number }[]}
 */
export function shaftLights(lamps, at, range = Infinity) {
  const tuning = readLight();
  return lamps
    .map((L) => {
      const d = Math.hypot(L.x - at[0], L.y - at[1], L.z - at[2]) || 1;
      const reach = lampFalloff(d) * (1 - smoothstep(range * 0.55, range, d));
      return { lamp: L, d, reach };
    })
    .filter((entry) => entry.reach > 0)
    .sort((a, b) => b.reach - a.reach)
    .slice(0, tuning.shaftLights)
    .map(({ lamp, d, reach }) => ({
      id: lamp.id,
      position: /** @type {Point3} */ ([lamp.x, lamp.y, lamp.z]),
      // stated as candela so three.js's own inverse square takes over from
      // here; calibrated so that what arrives at the cage is what the CSS
      // model would have delivered from this fitting alone
      intensity: tuning.lampPower * reach * d * d * tuning.keyGain,
      decay: 2,
      colour: tuning.shaftColor,
    }));
}

/**
 * Where the landing's own fitting hangs. The pendant mesh and the light that
 * stands for it read this, so the light cannot end up coming from somewhere the
 * fixture is not — which is the same mistake the shaft light was making, one
 * room over.
 * @param {number} vw @param {number} vh @param {number} openingTopY
 * @returns {Point3}
 */
export const pendantAt = (vw, vh, openingTopY) => [vw / 2, openingTopY + vh * 0.16, -SHAFT_DEPTH - 34];

/**
 * The landing's own fitting: a spot in the depth of the active floor, aimed back
 * out through the opening. It dies with the doors, because a room you cannot see
 * into contributes nothing and a light left burning behind a shut door is two
 * sources' worth of budget spent on nothing.
 *
 * @param {number} vw @param {number} vh
 * @param {number} openingTopY where this floor's opening sits right now
 * @param {number} closure 0 open, 1 shut
 */
export function landingLight(vw, vh, openingTopY, closure) {
  const open = Math.max(0, 1 - closure);
  if (open <= 0.02) return null;
  const tuning = readLight();
  return {
    // exactly where the pendant hangs — a light that comes from anywhere else
    // is the fixture floating in its own glow
    position: pendantAt(vw, vh, openingTopY),
    // A point, not a spot. A spot lays a hard-edged cone on the wall behind it,
    // which is what a stage lamp does and not what a shaded pendant does: the
    // shade sends light down and sideways and the room fills. The cone was the
    // single most artificial thing in the frame.
    intensity: tuning.landingIntensity * open * 1e5,
    decay: tuning.landingDecay,
    colour: tuning.landingColor,
  };
}

/**
 * The whole rig, as data: at most two entries, ever.
 *
 * This exists so the scene's central constraint is something a test can hold
 * rather than something a reviewer has to count in a scene graph. The component
 * that renders lights maps over this and adds nothing of its own, so "there are
 * never more than two physical sources" is checkable without a browser, a
 * canvas or a GPU — see `lighting.test.js`.
 *
 * @returns {{ kind: 'key' | 'landing', [k: string]: unknown }[]}
 */
export function lightRig({ vw, vh, lamps, floorPitch, deckTop, closure }) {
  const rig = shaftLights(lamps, cageCentre(vw, vh), lampRangePx(floorPitch))
    .map((light) => ({ kind: /** @type {const} */ ('shaft'), ...light }));
  const landing = landingLight(vw, vh, deckTop, closure);
  if (landing) rig.push({ kind: /** @type {const} */ ('landing'), id: 'landing', ...landing });
  return rig;
}

/**
 * The most sources this scene will ever ask for: the fittings, and the room.
 *
 * A function rather than a constant now that the count is a knob. It was a
 * constant compared against a rig built from the same constant, which is a test
 * that cannot fail; asked for the live number it is a test again.
 */
export const maxLights = () => readLight().shaftLights + 1;

// The ambience used to live here, as `ambientOf`, and to be applied by whoever
// remembered to. It is `Room`'s now — one traverse, every mesh in the room, and
// a value that belongs to that room rather than to the scene. See `Room.jsx`.
