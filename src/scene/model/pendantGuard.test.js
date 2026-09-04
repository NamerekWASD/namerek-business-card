import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAM_ORIGIN_Y } from './camera.js';
import {
  CAGE_FAR, CAGE_FLOOR_Y, CAGE_NEAR, DOORWAY_H_FRAC, PENDANT_GUARD,
  cageInset, guardCrossing,
} from './geometry.js';
import { pendantAt } from '../renderers/r3f/lighting.js';

// ── NBC-74 ───────────────────────────────────────────────────────────────────
// What lands on the lift floor is not a wash, it is the pendant's own guard,
// projected. The claim this file holds is the one the fix rests on: from the
// lamp, *every* point of the lift floor is seen through the wall of the wire
// basket — so the basket is what shapes the light there, and a canvas that
// holds the lamp's light without its guard cannot draw that floor correctly.

const vw = 1600;
const vh = 900;
// the opening of the floor the cage is standing at — `openingTop` with the
// floor's own pitch cancelled out, which is what standing at it means
const deckTop = vh * CAM_ORIGIN_Y - (vh * DOORWAY_H_FRAC) / 2;
const [lampX, lampY, lampZ] = pendantAt(vw, vh, deckTop);
const floorY = vh * CAGE_FLOOR_Y;

/** Every corner and the middle of the lift floor, as an angle below horizontal. */
function sightLines() {
  const inset = cageInset(vw);
  const out = [];
  for (const x of [inset, vw / 2, vw - inset]) {
    for (const z of [CAGE_FAR, (CAGE_FAR + CAGE_NEAR) / 2, CAGE_NEAR]) {
      const run = Math.hypot(x - lampX, z - lampZ);
      out.push({ x, z, depression: Math.atan2(floorY - lampY, run) });
    }
  }
  return out;
}

describe('the pendant guard is what shapes the lift floor', () => {
  it('every point of that floor looks back at the lamp through the basket wall', () => {
    for (const line of sightLines()) {
      const h = guardCrossing(line.depression);
      expect(h, `x=${line.x} z=${line.z}`).not.toBeNull();
      expect(h).toBeGreaterThanOrEqual(PENDANT_GUARD.top);
      expect(h).toBeLessThanOrEqual(PENDANT_GUARD.bot);
    }
  });

  // The two ends of the same function, which is what says it is measuring the
  // basket rather than returning a number that happens to fit.
  it('a horizontal ray leaves above the top ring, and a vertical one below the last', () => {
    expect(guardCrossing(0)).toBeNull();
    expect(guardCrossing(Math.PI / 2)).toBeNull();
  });

  // The guard belongs to the lamp, not to a canvas. Both scenes build it from
  // the one component, so the shadow the near canvas throws is the shadow the
  // fixture you can see would have thrown.
  it('both canvases build it from the one component', () => {
    for (const file of ['src/scene/r3f/ShaftScene.jsx', 'src/scene/r3f/NearScene.jsx']) {
      expect(readFileSync(file, 'utf8')).toMatch(/PendantCage/);
    }
  });
});
