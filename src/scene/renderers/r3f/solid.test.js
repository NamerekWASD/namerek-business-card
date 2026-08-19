import { describe, expect, it } from 'vitest';
import { Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { projectToScreen, SHAFT_DEPTH } from '../../model/camera.js';
import {
  ARCHITRAVE_DEPTH, ARCHITRAVE_MEMBER_W, DOORWAY_W_FRAC, FRAME_TIERS, openingTop,
} from '../../model/geometry.js';
import { cameraProps } from './camera.js';

// The other half of the step-1 gate. `camera.test.js` proves the two cameras
// agree about where a *point* lands; this proves the transform chain `Box`
// builds puts its corners on the points the CSS backend puts them on.
//
// It rebuilds that chain out of bare three.js objects rather than rendering the
// component, because the thing under test is arithmetic — a renderer, a canvas
// and a WebGL context would only be in the way of finding out whether a number
// is wrong.

const vw = 2048;
const vh = 962;

/** The world position of a box corner, built the way `Box` builds it. */
function boxCorners({ left, top, w, h, d, z = 0, yaw = 0 }) {
  const rad = (yaw * Math.PI) / 180;
  const group = new Group();
  group.position.set(left, -top, z + w * Math.abs(Math.sin(rad)));
  group.rotation.set(0, rad, 0);
  const mesh = new Mesh();
  mesh.position.set(w / 2, -h / 2, d / 2);
  group.add(mesh);
  group.updateMatrixWorld(true);

  const out = [];
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) {
        out.push(new Vector3(w * sx, h * sy, d * sz).applyMatrix4(mesh.matrixWorld));
      }
    }
  }
  return out;
}

function toScreen(v) {
  const c = cameraProps(vw, vh);
  const cam = new PerspectiveCamera(c.fov, c.aspect, c.near, c.far);
  cam.position.set(...c.position);
  cam.updateMatrixWorld(true);
  const ndc = v.clone().project(cam);
  return { x: (ndc.x * 0.5 + 0.5) * vw, y: (1 - (ndc.y * 0.5 + 0.5)) * vh };
}

describe('a Box stands where the CSS Solid stands', () => {
  it('puts an unturned box on its stated rectangle', () => {
    const spec = { left: 200, top: 100, w: 400, h: 60, d: 40, z: -SHAFT_DEPTH };
    const corners = boxCorners(spec);
    // the front face, in scene coordinates, is the rectangle the caller asked for
    const front = corners.filter((v) => Math.abs(v.z - (spec.z + spec.d)) < 1e-6);
    expect(front).toHaveLength(4);
    const xs = front.map((v) => v.x);
    const ys = front.map((v) => -v.y);
    expect(Math.min(...xs)).toBeCloseTo(spec.left, 6);
    expect(Math.max(...xs)).toBeCloseTo(spec.left + spec.w, 6);
    expect(Math.min(...ys)).toBeCloseTo(spec.top, 6);
    expect(Math.max(...ys)).toBeCloseTo(spec.top + spec.h, 6);
  });

  it('lands its front face where the CSS backend projects the same rectangle', () => {
    const spec = { left: 200, top: 100, w: 400, h: 60, d: 40, z: -SHAFT_DEPTH };
    const zFront = spec.z + spec.d;
    const css = projectToScreen([spec.left, spec.top, zFront], vw, vh);
    const three = toScreen(new Vector3(spec.left, -spec.top, zFront));
    expect(three.x).toBeCloseTo(css.x, 6);
    expect(three.y).toBeCloseTo(css.y, 6);
  });

  // The architrave is the first real assembly built out of boxes, and the one
  // whose numbers are least obvious by eye — so it gets checked as a whole:
  // every tier's head must sit above the opening, span it, and stand proud of
  // the wall by its own step and no more.
  describe('the architrave', () => {
    const w = vw * DOORWAY_W_FRAC;
    const left = (vw - w) / 2;
    const top = openingTop(vh, 0, 0);

    for (const [ti, tier] of FRAME_TIERS.entries()) {
      it(`tier ${ti} frames the opening`, () => {
        const m = ARCHITRAVE_MEMBER_W * tier.m;
        const d = ARCHITRAVE_DEPTH * tier.z;
        const head = boxCorners({ left: left - m, top: top - m, w: w + m * 2, h: m, d, z: -SHAFT_DEPTH });
        const xs = head.map((v) => v.x);
        const ys = head.map((v) => -v.y);
        const zs = head.map((v) => v.z);

        // it overhangs the opening by one member either side
        expect(Math.min(...xs)).toBeCloseTo(left - m, 6);
        expect(Math.max(...xs)).toBeCloseTo(left + w + m, 6);
        // it sits directly on top of the opening, not in it
        expect(Math.max(...ys)).toBeCloseTo(top, 6);
        // and stands proud of the wall by its own step
        expect(Math.min(...zs)).toBeCloseTo(-SHAFT_DEPTH, 6);
        expect(Math.max(...zs)).toBeCloseTo(-SHAFT_DEPTH + d, 6);
      });
    }

    it('steps out toward the opening, each tier narrower and prouder', () => {
      const ms = FRAME_TIERS.map((t) => ARCHITRAVE_MEMBER_W * t.m);
      const ds = FRAME_TIERS.map((t) => ARCHITRAVE_DEPTH * t.z);
      for (let i = 1; i < FRAME_TIERS.length; i += 1) {
        expect(ms[i]).toBeLessThan(ms[i - 1]);
        expect(ds[i]).toBeGreaterThan(ds[i - 1]);
      }
    });
  });
});
