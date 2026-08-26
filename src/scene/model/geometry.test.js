import { describe, expect, it } from 'vitest';
import {
  ASTRAGAL_W_FRAC, LANDING_CEILING_CLEARANCE, LEAF_PARK_FRAC, PENDANT_DROP, PENDANT_HEAD_RISE,
  PENDANT_LINKS, PENDANT_LINK_PITCH, PENDANT_SCALE, landingCeilingY, pendantAnchorY,
  pendantChainTopY,
} from './geometry.js';

const vh = 962;
const top = 30;

describe('the landing pendant', () => {
  // The chain used to be the fixed end and the ceiling the derived one, which
  // meant shortening the chain pulled the ceiling down with it and left the
  // lamp exactly where it was. Backwards: a lamp hangs from a ceiling.
  it('hangs off the ceiling, so fewer links raises the lamp', () => {
    const ceiling = landingCeilingY(vh, top);
    const anchor = pendantAnchorY(vh, top);
    const shorter = ceiling + LANDING_CEILING_CLEARANCE
      + (PENDANT_LINKS - 4) * PENDANT_LINK_PITCH + PENDANT_HEAD_RISE;

    expect(shorter).toBeLessThan(anchor);
    expect(anchor - shorter).toBeCloseTo(4 * PENDANT_LINK_PITCH);
  });

  // The chain stops short of the plaster on purpose — the canopy and stem fill
  // that gap. If the two numbers ever drift the chain either floats below its
  // own mount or grows through the ceiling.
  it('stops one mount short of the ceiling', () => {
    expect(pendantChainTopY(vh, top) - landingCeilingY(vh, top))
      .toBeCloseTo(LANDING_CEILING_CLEARANCE);
    expect(pendantAnchorY(vh, top) - pendantChainTopY(vh, top))
      .toBeCloseTo(PENDANT_DROP + PENDANT_HEAD_RISE);
  });

  // How far the yoke sits above the lamp's centre is a fact about the casting
  // the yoke sits on. Resizing the shade without it is what unstuck the body
  // from the chain and left it hanging in mid-air.
  it('carries the yoke at the shade\'s own scale', () => {
    expect(PENDANT_HEAD_RISE / PENDANT_SCALE).toBeCloseTo(51);
    expect(PENDANT_LINK_PITCH / PENDANT_SCALE).toBeCloseTo(2 * (7 + 2) * 1.45 * 0.6);
  });
});

describe('a leaf parked open', () => {
  // The whole point of the reveal: a leaf that travels its own full width ends
  // up inside the pocket behind the architrave, and the open doorway is then a
  // clean hole with no evidence a door was ever in it.
  it('stops short of its own width', () => {
    expect(LEAF_PARK_FRAC).toBeGreaterThan(0);
    expect(1 - LEAF_PARK_FRAC).toBeLessThan(1);
  });

  // What stands in the reveal is the astragal — frame ironwork, standing proud
  // of a plate in shadow, which is what makes the parked edge read at all. If it
  // ever grows wider than the reveal it is the *only* thing standing there, and
  // the door reads as a pillar with nothing behind it.
  it('shows its astragal and a sliver of plate behind it', () => {
    expect(ASTRAGAL_W_FRAC).toBeLessThan(LEAF_PARK_FRAC);
    expect(LEAF_PARK_FRAC - ASTRAGAL_W_FRAC).toBeGreaterThan(0.01);
  });

  // And it has to stay a reveal rather than a door that never really opens. The
  // opening loses twice this, and the landing screen behind it is already
  // running under the frame on its outer side.
  it('does not eat the opening', () => {
    expect(LEAF_PARK_FRAC).toBeLessThan(0.08);
  });
});
