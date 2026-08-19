import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { projectToScreen, CAM_PERSPECTIVE, SHAFT_DEPTH } from '../../model/camera.js';
import { CAGE_NEAR, LANDING_SETBACK } from '../../model/geometry.js';
import { cameraProps, toWorld } from './camera.js';

// The gate for the whole migration. `projectToScreen` is the CSS camera's own
// perspective divide, written by hand and already trusted by the haze; if the
// three.js camera puts the same scene point on a different pixel then every
// object placed afterwards is being nudged to cover for it, and the scene will
// never converge. So this compares the two projections directly, at the depths
// the scene actually uses, before any geometry exists to argue about.

/** Where three.js lands a scene point, in screen pixels. */
function projectWithThree(p, vw, vh) {
  const c = cameraProps(vw, vh);
  const cam = new PerspectiveCamera(c.fov, c.aspect, c.near, c.far);
  cam.position.set(...c.position);
  cam.updateMatrixWorld(true);
  const ndc = new Vector3(...toWorld(p)).project(cam);
  return { x: (ndc.x * 0.5 + 0.5) * vw, y: (1 - (ndc.y * 0.5 + 0.5)) * vh };
}

const VIEWPORTS = [
  { vw: 2560, vh: 1225 },
  { vw: 1440, vh: 900 },
  { vw: 720, vh: 1280 },
];

// Every depth the scene puts something at: the cage in front of us, the plane
// the model is measured on, the far wall, and the landing behind it.
const DEPTHS = [CAGE_NEAR, 0, -SHAFT_DEPTH, -SHAFT_DEPTH - LANDING_SETBACK];

describe('the R3F camera is the CSS camera', () => {
  for (const { vw, vh } of VIEWPORTS) {
    for (const z of DEPTHS) {
      it(`agrees at ${vw}x${vh}, z = ${z}`, () => {
        for (const [x, y] of [[0, 0], [vw, vh], [vw / 2, vh / 2], [vw * 0.13, vh * 0.87]]) {
          const css = projectToScreen([x, y, z], vw, vh);
          const three = projectWithThree([x, y, z], vw, vh);
          expect(three.x).toBeCloseTo(css.x, 6);
          expect(three.y).toBeCloseTo(css.y, 6);
        }
      });
    }
  }

  it('puts the z = 0 plane exactly on the viewport', () => {
    const { vw, vh } = VIEWPORTS[0];
    const topLeft = projectWithThree([0, 0, 0], vw, vh);
    const bottomRight = projectWithThree([vw, vh, 0], vw, vh);
    expect(topLeft.x).toBeCloseTo(0, 6);
    expect(topLeft.y).toBeCloseTo(0, 6);
    expect(bottomRight.x).toBeCloseTo(vw, 6);
    expect(bottomRight.y).toBeCloseTo(vh, 6);
  });

  it('clears the whole scene between its near and far planes', () => {
    const c = cameraProps(1440, 900);
    // the nearest surface is the cage front, the deepest is the landing
    expect(CAM_PERSPECTIVE - CAGE_NEAR).toBeGreaterThan(c.near);
    expect(CAM_PERSPECTIVE + SHAFT_DEPTH + LANDING_SETBACK).toBeLessThan(c.far);
  });
});
