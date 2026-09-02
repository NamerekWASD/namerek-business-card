import { describe, expect, it } from 'vitest';
import {
  BELT, bandOffset, beltAt, beltCount, beltTrip, headRun, longRun, mouthClearance, pathLength,
  posAt, slatPush, slatSwing,
} from './belt.js';

// Every clause here fails silently on the landing rather than throwing: two
// boxes standing in each other, a manifest with its letters stretched, a belt
// that reads as running the wrong way, a box turning the corner while it is
// still half inside the wall. At the size this run is drawn none of them
// announce themselves; they just make the room slightly wrong.

describe('the conveyor', () => {
  // A box longer than its spacing is two boxes interpenetrating, which at this
  // distance reads as one long box with a seam in it.
  it('leaves a gap between one box and the next', () => {
    expect(BELT.BOX.w).toBeLessThan(BELT.PITCH);
  });

  // The manifest is painted on a 4:3 canvas — see `artifactFace`. A face of any
  // other shape stretches every letter on it, and the letters are the whole
  // point of the box. Same clause the framed schematic is held to.
  it('puts the manifest on a face the shape of the canvas it is painted on', () => {
    expect(BELT.BOX.w / BELT.BOX.h).toBeCloseTo(4 / 3, 2);
  });

  // The run turns a right angle, so the box crosses *both* runs: along the head
  // it is `d` across the band and along the long run it is `w`. A single width
  // has to clear the larger of the two or the box hangs off one of them.
  it('carries a box narrower than the belt on both runs', () => {
    expect(Math.max(BELT.BOX.w, BELT.BOX.d)).toBeLessThan(BELT.WIDE);
  });

  // The box is pushed sideways at the corner rather than turned, so the face
  // with the manifest on it never leaves the camera. That only works if the box
  // is square in plan — anything else would need a rotation nobody asked for.
  it('keeps the box square in plan, so the corner needs no turn', () => {
    expect(BELT.BOX.d).toBeCloseTo(BELT.BOX.w, 6);
  });

  // The whole point of the head run: the box has to be out of the wall before
  // the transfer shoves it left, or it turns the corner inside the plaster.
  it('brings the box clear of the wall before the corner', () => {
    expect(mouthClearance(BELT.OUT)).toBeGreaterThan(0);
  });

  // The opening has to be bigger than what comes out of it in both directions,
  // or the box is born clipping its own surround.
  it('cuts an opening the box actually fits through', () => {
    expect(BELT.MOUTH.W).toBeGreaterThan(BELT.BOX.w);
    expect(BELT.MOUTH.H).toBeGreaterThan(BELT.BOX.h);
  });
});

describe('the band', () => {
  it('moves one slat of run for one slat of texture', () => {
    // A tile is four slats, so a whole tile of offset is four slats of belt.
    const oneTile = (BELT.SLAT * BELT.SLATS_PER_TILE) / BELT.SPEED;
    expect(bandOffset(oneTile * 1000)).toBeCloseTo(1, 6);
  });

  // The one failure that makes a working belt look broken: sampled slower than
  // twice its own slat rate, a scrolling pattern reads as standing still or as
  // running backwards. This is the belt's Nyquist limit and the reason `HZ`
  // and `SPEED` are written next to each other.
  it('is sampled fast enough not to appear to run backwards', () => {
    const perTick = BELT.SPEED / BELT.HZ;
    expect(perTick).toBeLessThan(BELT.SLAT / 2);
  });

  // And the other side of it, which is the fault Mykolai actually reported on
  // NBC-68 — "будто очень мало фпс". The boxes now move with the band instead
  // of standing on it, so a tick rate that was merely acceptable for a texture
  // offset is a visible step in a solid object. Two pixels of a room whose
  // metre is around 380 scene pixels.
  it('is not sampled so slowly that the belt steps', () => {
    expect(BELT.SPEED * 1000 / BELT.HZ).toBeLessThan(BELT.SLAT / 20 * 1000);
  });
});

describe('the path, as an L', () => {
  const path = { out: 1, run: 4 };
  const len = pathLength(path);

  it('is the head run plus the long run', () => {
    expect(len).toBe(5);
  });

  it('starts in the mouth and travels out of the wall', () => {
    expect(posAt(0, path)).toEqual({ x: 0, z: -1 });
    expect(posAt(0.5, path)).toEqual({ x: 0, z: -0.5 });
  });

  it('turns the corner at the end of the head run', () => {
    expect(posAt(1, path)).toEqual({ x: 0, z: 0 });
  });

  // Left, and only left. A belt running the other way is a delivery *in* — the
  // one thing the direction of this run is there to say.
  it('leaves to the left, along the wall', () => {
    expect(posAt(3, path)).toEqual({ x: -2, z: 0 });
    expect(posAt(len, path)).toEqual({ x: -4, z: 0 });
  });

  it('does not walk off the end of the run when a tick lands late', () => {
    expect(posAt(len * 2, path)).toEqual({ x: -4, z: 0 });
  });
});

describe('the boxes, without end', () => {
  // Enough of them that one is always coming out of the mouth before the one
  // ahead has left, which is the picture NBC-68 asked for in so many words.
  it('holds enough boxes to fill the run and one more behind', () => {
    expect(beltCount(5, 1.5)).toBe(5);
    expect(beltCount(3, 1.5)).toBe(3);
  });

  it('spaces them one pitch apart along the path', () => {
    const n = beltCount(5, 1.5);
    const at = (i) => beltAt(0, i, n, 1.5);
    expect(at(1) - at(0)).toBeCloseTo(1.5, 6);
    expect(at(2) - at(1)).toBeCloseTo(1.5, 6);
  });

  // The recycle, which is the whole memory argument: a box that has left is the
  // *same* box coming back round, so nothing is ever built or thrown away while
  // anyone stands on this floor.
  it('sends a box that has run out back to the mouth', () => {
    const n = 4;
    const cycle = n * 1.5;
    expect(beltAt(cycle, 0, n, 1.5)).toBeCloseTo(0, 6);
    expect(beltAt(cycle + 0.4, 0, n, 1.5)).toBeCloseTo(0.4, 6);
  });

  it('never runs a box backwards, whatever the travel', () => {
    const n = 4;
    let last = beltAt(0, 0, n, 1.5);
    for (let s = 0.05; s < n * 1.5; s += 0.05) {
      const d = beltAt(s, 0, n, 1.5);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
  });

  // What tells a box to go and ask which project is on the glass. It has to
  // change *exactly* when the box is back at the mouth and at no other moment,
  // or a box changes its manifest in full view — which is the teleport Mykolai
  // reported.
  it('counts one trip per box, changing only at the mouth', () => {
    const n = 4;
    const cycle = n * 1.5;
    expect(beltTrip(0, 0, n, 1.5)).toBe(0);
    expect(beltTrip(cycle - 0.001, 0, n, 1.5)).toBe(0);
    expect(beltTrip(cycle, 0, n, 1.5)).toBe(1);
    expect(beltTrip(cycle * 2, 0, n, 1.5)).toBe(2);
  });

  it('gives each box its own trip counter', () => {
    const n = 4;
    const cycle = n * 1.5;
    // box 3 starts 4.5 m along, so it reaches the mouth 4.5 m of travel early
    expect(beltTrip(cycle - 4.5, 3, n, 1.5)).toBe(1);
    expect(beltTrip(cycle - 4.5, 0, n, 1.5)).toBe(0);
  });

  it('is legal on a path shorter than one pitch', () => {
    expect(beltCount(0.5, 1.5)).toBeGreaterThanOrEqual(1);
    expect(beltAt(0, 0, 1, 1.5)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NBC-70 — the corner, and where a box comes from
// ─────────────────────────────────────────────────────────────────────────────

describe('the lead-in, behind the wall', () => {
  const path = { lead: BELT.LEAD, out: 1, run: 4 };

  // The fault this exists for: a box switched on standing in the plane of the
  // wall is half a box appearing between one tick and the next — "ящики просто
  // спаунятся из ничего". A box has to have somewhere to come *from*.
  it('starts the box further back than the box is long', () => {
    expect(BELT.LEAD).toBeGreaterThan(BELT.BOX.d);
  });

  it('counts the hidden stretch as part of the path', () => {
    expect(pathLength(path)).toBeCloseTo(BELT.LEAD + 5, 6);
  });

  it('holds the box inside the wall until the belt pushes it out', () => {
    expect(posAt(0, path).z).toBeCloseTo(-BELT.LEAD - 1, 6);
    expect(posAt(BELT.LEAD, path).z).toBeCloseTo(-1, 6);
  });

  // Nothing downstream of the mouth moves: the corner is where it always was,
  // and so is the end of the run.
  it('leaves the corner and the discharge where they were', () => {
    expect(posAt(BELT.LEAD + 1, path).x).toBeCloseTo(0, 9);
    expect(posAt(BELT.LEAD + 1, path).z).toBeCloseTo(0, 9);
    expect(posAt(pathLength(path), path).x).toBeCloseTo(-4, 9);
    expect(posAt(pathLength(path), path).z).toBeCloseTo(0, 9);
  });

  // A path with no lead is the old one, unchanged — which is what keeps every
  // clause above this line honest.
  it('is optional', () => {
    expect(posAt(0, { out: 1, run: 4 })).toEqual({ x: 0, z: -1 });
  });
});

describe('the corner, as a butt joint', () => {
  // Both runs used to be drawn full length, which laid two bands and two pans
  // in the same plane over the square at the corner. Coincident polygons are a
  // coin toss per pixel, and the coin is tossed again every time the camera
  // moves. They butt now.
  it('stops the head run at the far edge of the long one', () => {
    expect(headRun(BELT.OUT) + BELT.WIDE / 2).toBeCloseTo(BELT.OUT, 6);
  });

  it('carries the long run past the corner to meet it', () => {
    expect(longRun(4) - 4).toBeCloseTo(BELT.WIDE / 2, 6);
  });

  it('leaves a head run there is still something to see of', () => {
    expect(headRun(BELT.OUT)).toBeGreaterThan(BELT.BOX.d / 2);
  });

  it('measures both in the room it is drawn in', () => {
    expect(headRun(BELT.OUT * 10, 10)).toBeCloseTo(headRun(BELT.OUT) * 10, 6);
    expect(longRun(4 * 10, 10)).toBeCloseTo(longRun(4) * 10, 6);
  });
});

describe('the strip curtain', () => {
  const half = 0.07;

  it('hangs low enough that a box has to push it', () => {
    const foot = (BELT.CURTAIN.HANG - BELT.CURTAIN.DROP) * BELT.MOUTH.H
      + BELT.MOUTH.H / 2 - BELT.MOUTH.SILL;
    expect(foot).toBeLessThan(BELT.BOX.h);
  });

  it('swings over the box rather than through it', () => {
    expect(slatSwing()).toBeGreaterThan(0);
    expect(slatSwing()).toBeLessThan(Math.PI / 2);
  });

  it('hangs still until the box reaches it', () => {
    expect(slatPush(-BELT.BOX.d, 0, half)).toBe(0);
  });

  it('is fully aside while the box is going through', () => {
    expect(slatPush(0, 0, half)).toBeCloseTo(1, 6);
  });

  it('falls shut once the box has gone by', () => {
    expect(slatPush(BELT.BOX.d / 2 + BELT.CURTAIN.FALL, 0, half)).toBeCloseTo(0, 9);
    expect(slatPush(BELT.BOX.d, 0, half)).toBeLessThan(1);
  });

  // The slats outside the box's own width are the ones that say the box has a
  // width at all. A curtain that opens all the way across is a door.
  it('leaves the slats wider than the box alone', () => {
    expect(slatPush(0, BELT.MOUTH.W / 2 - half, half)).toBe(0);
    expect(slatPush(0, 0, half)).toBeGreaterThan(slatPush(0, BELT.BOX.w / 2, half));
  });

  // No step anywhere in a whole pass: a slat that jumps reads as a glitch, not
  // as rubber.
  it('never jumps over a whole pass', () => {
    let last = slatPush(-1, 0, half);
    for (let dz = -1; dz < 1.5; dz += 0.01) {
      const now = slatPush(dz, 0, half);
      expect(Math.abs(now - last)).toBeLessThan(0.12);
      last = now;
    }
  });
});
