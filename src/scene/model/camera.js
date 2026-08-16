// ── the camera ───────────────────────────────────────────────────────────────
// The shaft is a single 3D scene.
//
// Everything used to carry its own `transform: perspective(...)`, which gives
// each element a vanishing point at its own transform-origin — four objects,
// four vanishing points, a scene that never resolved. And a rotated <div> is
// still one plane: a decal, not a solid. So the shaft is now one camera (the
// `perspective` *property*, one shared `perspective-origin`) and every solid is
// built from faces at different angles inside `preserve-3d`.
//
// Depth values are world pixels at z = 0; -z runs away from the viewer.

/** @import { Point3 } from './types.js' */

export const CAM_PERSPECTIVE = 1400;
export const CAM_ORIGIN_Y = 0.50;

// how far the shaft walls run back. Deeper means the corridor eats more of the
// screen: a wall's far edge lands at (viewportWidth / 2) * DEPTH / (P + DEPTH).
export const SHAFT_DEPTH = 340;

// Everything at the far end scales by this, so the aperture's position on screen
// is known analytically and the flat content layer can be clipped to it exactly.
export const BACK_WALL_SCALE = CAM_PERSPECTIVE / (CAM_PERSPECTIVE + SHAFT_DEPTH);

// The perspective divide, done by hand — needed to hang haze on the sight line
// to a lamp, which is the one thing the browser's own camera cannot tell us.
/**
 * @param {Point3} p
 * @param {number} vw
 * @param {number} vh
 * @returns {{ x: number, y: number, s: number }} screen position and the scale
 *   the perspective divide applied there
 */
export function projectToScreen(p, vw, vh) {
  const s = CAM_PERSPECTIVE / (CAM_PERSPECTIVE - p[2]);
  return {
    x: vw / 2 + (p[0] - vw / 2) * s,
    y: vh * CAM_ORIGIN_Y + (p[1] - vh * CAM_ORIGIN_Y) * s,
    s,
  };
}

// The same camera expressed the way a real 3D renderer wants it. CSS states a
// perspective as the viewer's distance from the z = 0 plane in pixels; three.js
// states it as a vertical field of view in degrees. They describe the same
// pinhole, so a future R3F backend can adopt this camera exactly rather than
// having one tuned to match by eye — which is the difference between porting
// the scene and rebuilding it.
/**
 * @param {number} vh viewport height in pixels
 * @returns {number} vertical field of view, in degrees
 */
export function fovFor(vh) {
  return (2 * Math.atan(vh / 2 / CAM_PERSPECTIVE) * 180) / Math.PI;
}
