import { describe, expect, it } from 'vitest';
import {
  BACK_WALL_SCALE, CAM_ORIGIN_Y, CAM_PERSPECTIVE, SHAFT_DEPTH, fovFor, projectToScreen,
} from './camera.js';

const VW = 1600;
const VH = 900;

describe('projectToScreen', () => {
  it('leaves the z = 0 plane exactly where it is', () => {
    // This is what lets the flat content layer stay crisp DOM and still sit
    // convincingly inside the opening: at z = 0 the projection is the identity.
    const q = projectToScreen([400, 250, 0], VW, VH);
    expect(q.x).toBeCloseTo(400);
    expect(q.y).toBeCloseTo(250);
    expect(q.s).toBeCloseTo(1);
  });

  it('shrinks things toward the vanishing point as they recede', () => {
    const near = projectToScreen([VW, VH, 0], VW, VH);
    const far = projectToScreen([VW, VH, -SHAFT_DEPTH], VW, VH);
    expect(far.s).toBeLessThan(near.s);
    expect(Math.abs(far.x - VW / 2)).toBeLessThan(Math.abs(near.x - VW / 2));
    expect(Math.abs(far.y - VH * CAM_ORIGIN_Y)).toBeLessThan(Math.abs(near.y - VH * CAM_ORIGIN_Y));
  });

  it('holds the vanishing point still at any depth', () => {
    const centre = [VW / 2, VH * CAM_ORIGIN_Y];
    for (const z of [0, -100, -SHAFT_DEPTH, -1000]) {
      const q = projectToScreen([centre[0], centre[1], z], VW, VH);
      expect(q.x).toBeCloseTo(centre[0]);
      expect(q.y).toBeCloseTo(centre[1]);
    }
  });

  it('agrees with BACK_WALL_SCALE about the far wall', () => {
    // The doorway's on-screen size is computed analytically from
    // BACK_WALL_SCALE rather than measured, so the two must not drift apart —
    // if they do, the content layer stops lining up with the opening it is
    // supposed to be sitting inside.
    const q = projectToScreen([0, 0, -SHAFT_DEPTH], VW, VH);
    expect(q.s).toBeCloseTo(BACK_WALL_SCALE);
  });
});

describe('fovFor', () => {
  it('describes the same pinhole the CSS perspective does', () => {
    // A future three.js backend adopts this camera instead of tuning one to
    // match by eye. Round-tripping the fov back to a perspective distance must
    // land on the value CSS is given.
    const fov = fovFor(VH);
    const backToPerspective = VH / 2 / Math.tan((fov / 2) * (Math.PI / 180));
    expect(backToPerspective).toBeCloseTo(CAM_PERSPECTIVE);
  });

  it('widens as the window gets taller', () => {
    expect(fovFor(1200)).toBeGreaterThan(fovFor(600));
  });
});
