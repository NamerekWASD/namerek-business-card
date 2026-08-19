// ── the camera, restated for three.js ────────────────────────────────────────
// The CSS scene and the WebGL scene must be the same pinhole, or every object
// placed afterwards is compensating for a camera that is wrong — which is the
// one failure this migration cannot recover from by nudging things.
//
// `model/camera.js` already says what the camera is: a viewer `CAM_PERSPECTIVE`
// pixels out from the z = 0 plane, its axis through `perspective-origin`. All
// this file does is restate that in the terms three.js asks for, and fix the one
// genuine difference between the two coordinate systems.
//
// **That difference is the sign of y.** CSS measures y downward from the top of
// the stage; three.js measures it upward. Every other axis agrees — x runs
// right, z runs toward the viewer, and a CSS `rotateY(θ)` is a three.js
// `rotation.y = θ` because the rotation matrix for both is written the same way
// and neither touches y. So the whole conversion is a negated y, applied in one
// place (`toWorld`) rather than remembered at every call site.

import { CAM_ORIGIN_Y, CAM_PERSPECTIVE, SHAFT_DEPTH, fovFor } from '../../model/camera.js';
import { LANDING_SETBACK } from '../../model/geometry.js';

/** @import { Point3 } from '../../model/types.js' */

// The nearest thing in the scene is the cage front at z = 300, a good eleven
// hundred pixels from the camera, so the near plane can stand well off zero and
// buy depth precision with it. The far plane clears the deepest surface — the
// landing behind the back wall — with room for whatever gets stood in it.
export const CAM_NEAR = 100;
export const CAM_FAR = CAM_PERSPECTIVE + SHAFT_DEPTH + LANDING_SETBACK + 600;

/**
 * The scene's camera, as three.js wants it stated.
 * @param {number} vw @param {number} vh
 */
export function cameraProps(vw, vh) {
  return {
    fov: fovFor(vh),
    aspect: vw / vh,
    near: CAM_NEAR,
    far: CAM_FAR,
    // The camera sits on the axis through the perspective origin. At z = 0 that
    // makes the visible half-height exactly vh/2 and the half-width vw/2, so a
    // plane spanning the viewport in scene pixels spans the viewport on screen —
    // which is what keeps the whole model in CSS pixels at 1:1.
    position: /** @type {[number, number, number]} */ ([vw / 2, -vh * CAM_ORIGIN_Y, CAM_PERSPECTIVE]),
  };
}

/**
 * A point in scene coordinates (x right, y **down**, z toward the viewer), as a
 * three.js world position.
 * @param {Point3} p
 * @returns {[number, number, number]}
 */
export const toWorld = ([x, y, z]) => [x, -y, z];

/**
 * The same, for a length measured down the screen.
 * @param {number} y
 */
export const worldY = (y) => -y;
