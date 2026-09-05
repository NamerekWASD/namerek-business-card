import { describe, expect, it } from 'vitest';
import {
  ASTRAGAL_W_FRAC, DOORWAY_H_FRAC, LANDING_CEILING_CLEARANCE, LEAF_PARK_FRAC, PENDANT_DROP,
  PENDANT_HEAD_RISE, PENDANT_LINKS, PENDANT_LINK_PITCH, PENDANT_SCALE, doorwaySlots,
  landingCeilingY, landingReveal, masonrySlots, pendantAnchorY, pendantChainTopY, revealSpan,
} from './geometry.js';
import { BACK_WALL_SCALE } from './camera.js';

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

describe('the stretch of masonry that gets built', () => {
  // It used to be a window of five slots around wherever the cage was, slid as
  // the cage moved — and sliding it *mounts* a panel, which means a material
  // made and a program linked on a frame somebody is riding through. Measured
  // 2026-09-03: three fresh materials and two program links on the first EG →
  // 2. UG trip, 229 ms of one frame, and nothing at all on the second trip.
  // A lift with four floors can only ever look at eight slots, so all eight are
  // built once and the window stops moving.
  it('covers every slot the old window could ever have reached', () => {
    const slots = masonrySlots(4);
    for (let here = 0; here < 4; here += 1) {
      for (const f of [here - 2, here - 1, here, here + 1, here + 2]) {
        expect(slots).toContain(f);
      }
    }
  });

  it('does not build a floor no window could reach', () => {
    // Cheap is not free: every slot is masonry drawn in the shadow pass of every
    // fitting near it.
    expect(masonrySlots(4)).toHaveLength(8);
    expect(Math.min(...masonrySlots(4))).toBe(-2);
    expect(Math.max(...masonrySlots(4))).toBe(5);
  });

  it('is the same list every time it is asked, so nothing remounts', () => {
    expect(masonrySlots(4)).toEqual(masonrySlots(4));
  });
});

describe('the doorways that get built', () => {
  // The same lesson one layer in front of the masonry, and it cost more: a
  // doorway that mounts on the approach builds two leaves and makes their
  // materials while somebody is riding towards it, and a leaf's material made
  // after the bakes have landed carries a grain the ones made at boot do not —
  // so it wants a shader program nothing has linked and links it on the frame
  // its own leaves are parting. Measured 2026-09-03 as the one program link
  // left on a first arrival, on every floor reached by riding rather than by
  // booting into it.
  it('builds one for every deck, wherever the cage happens to be', () => {
    for (let floors = 1; floors <= 6; floors += 1) {
      const slots = doorwaySlots(floors);
      expect(slots).toHaveLength(floors);
      for (let f = 0; f < floors; f += 1) expect(slots).toContain(f);
    }
  });

  it('is the same list every time it is asked, so nothing remounts', () => {
    expect(doorwaySlots(4)).toEqual(doorwaySlots(4));
  });

  // The masonry runs two slots past either end of the building — dead shaft
  // above the top floor and below the bottom one — and a doorway into dead
  // shaft is a doorway into nothing.
  it('does not open a doorway where the shaft has no floor', () => {
    expect(Math.min(...doorwaySlots(4))).toBe(0);
    expect(Math.max(...doorwaySlots(4))).toBe(3);
  });
});

// ── a floor seen through its own doorway ─────────────────────────────────────
// NBC-78. The text on a landing is behind the hole it is looked at through, and
// the two are a room apart, so they cannot travel together on screen. Getting
// this backwards is not a subtle mistake to look at: it puts a heading on the
// brick between two floors.
describe('a landing and the opening it is seen through', () => {
  const floorPitch = vh * 1.4; // `DECK_GAP`, the pitch `Dieselpunk` works in

  it('moves the opening faster than the wall behind it', () => {
    const { hole, wall } = landingReveal(floorPitch, 1);
    expect(hole).toBeGreaterThan(wall);
    // and both in the same direction — a landing above stays above
    expect(landingReveal(floorPitch, -1)).toEqual({ hole: -hole, wall: -wall });
  });

  it('has the brick over the text while the text is still inside the cage s opening', () => {
    // This is the bug, in numbers. Half a doorway of masonry has slid across the
    // opening — so half of that landing is behind brick — and yet the text has
    // not travelled far enough to leave the cage's opening, which is all that
    // used to clip it. Whatever hides it has to be the hole, not the cage.
    const doorway = vh * DOORWAY_H_FRAC * BACK_WALL_SCALE;
    const away = revealSpan(vh, floorPitch) / 2;
    const { hole, wall } = landingReveal(floorPitch, away);

    expect(hole).toBeCloseTo(doorway / 2);
    expect(wall).toBeLessThan(doorway / 2);
  });

  it('closes over a landing entirely one span away, whatever the pitch', () => {
    for (const pitch of [vh, vh * 1.4, vh * 2]) {
      const doorway = vh * DOORWAY_H_FRAC * BACK_WALL_SCALE;
      expect(landingReveal(pitch, revealSpan(vh, pitch)).hole).toBeCloseTo(doorway);
    }
  });
});
