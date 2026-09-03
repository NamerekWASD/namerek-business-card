import { describe, expect, it } from 'vitest';
import {
  BELT, beltAt, beltCount, beltTrip, boxHop, boxRise, boxYaw, combClearance, fingerXs, liftDrop,
  liftWait, minPitch, mouthClearance, pathLength, posAt, rollPitch, rollerSpin, slatPush,
  slatSwing,
} from './belt.js';

// Every clause here fails silently on the landing rather than throwing: two
// boxes standing in each other, a manifest with its letters stretched, a lift
// finger descending through a roller, a box hanging a centimetre over the run
// it is supposed to be standing on. At the size this is drawn none of them
// announce themselves; they just make the room slightly wrong.

const PATH = { lead: BELT.LEAD, out: BELT.OUT, hold: BELT.LIFT.HOLD, run: 4 };
const STATION = BELT.LEAD + BELT.OUT;

describe('the conveyor', () => {
  // A box longer than its spacing is two boxes interpenetrating, which at this
  // distance reads as one long box with a seam in it.
  it('leaves a gap between one box and the next', () => {
    expect(BELT.BOX.w).toBeLessThan(BELT.PITCH);
  });

  // The manifest is painted on a 4:3 canvas — see `artifactFace`. A face of any
  // other shape stretches every letter on it, and the letters are the whole
  // point of the box.
  it('puts the manifest on a face the shape of the canvas it is painted on', () => {
    expect(BELT.BOX.w / BELT.BOX.h).toBeCloseTo(4 / 3, 2);
  });

  it('carries a box narrower than the run', () => {
    expect(BELT.BOX.w).toBeLessThan(BELT.WIDE);
  });

  // NBC-72's first half. The old L pushed the box sideways at a junction while
  // keeping it square to the camera, which is the physics Mykolai objected to.
  // There is one direction of travel on the run now, and the only thing that
  // moves across it is the lift, which moves nothing while a box is on the run.
  it('runs one way and only one way', () => {
    expect(posAt(STATION + BELT.LIFT.HOLD + 1, PATH).x).toBeCloseTo(-1, 9);
    expect(posAt(STATION + BELT.LIFT.HOLD + 2, PATH).z).toBe(0);
  });

  // The whole point of the way out of the wall: the box has to be clear of the
  // plaster before the lift lets go of it, or it is dropped through the wall.
  it('brings the box clear of the wall before it is set down', () => {
    expect(mouthClearance(BELT.OUT)).toBeGreaterThan(0);
  });

  // The opening has to be bigger than what comes out of it in both directions,
  // or the box is born clipping its own surround.
  it('cuts an opening the box actually fits through', () => {
    expect(BELT.MOUTH.W).toBeGreaterThan(BELT.BOX.w);
    expect(BELT.MOUTH.H).toBeGreaterThan(BELT.BOX.h);
  });

  // Mykolai's own correction to his first ask — "опускать так сильно не нужно,
  // с масштабом я перегнул, пускай будет на 0.25 м ниже". The frame under the
  // rollers and the legs under that still have to fit between the roller tops
  // and the floor, and 0.68 − 1 m, which was the first figure, is below it.
  it('stands the run off the floor rather than on it', () => {
    expect(BELT.TOP).toBeGreaterThan(BELT.ROLL.D + 0.2);
  });

  // The lift's whole travel is what makes up the height the run gave away, so
  // the opening in the wall does not have to move at all.
  it('leaves the mouth where it already was', () => {
    expect(BELT.TOP + BELT.LIFT.RISE).toBeCloseTo(0.68, 6);
  });

  // A box dropped at the very end of the run is a box dropped onto nothing.
  it('carries the run past the station, upstream of it', () => {
    expect(BELT.TAIL).toBeGreaterThan(BELT.BOX.d / 2);
  });

  // Where it stops, and it is not a taste figure. The run used to be carried
  // out past the lift's wall gear so it would read as finished rather than cut
  // off; what that actually bought was a counterweight hanging through the
  // rollers. The end frame lands on the mouth surround's outer edge instead —
  // the machine is as wide as the hole that feeds it, which is the one line in
  // the picture that can justify an end.
  it('closes the run on the mouth surround rather than past the gear', () => {
    expect(BELT.TAIL + BELT.END).toBeCloseTo(BELT.MOUTH.W / 2 + BELT.MOUTH.FRAME / 2, 6);
  });

  // And the gear stands clear of it. The counterweight is the widest member on
  // the wall guide at the height of the roller line, so this is the clause that
  // keeps a cylinder of cast iron out of the run's far channel.
  it('hangs the wall gear beyond the end frame', () => {
    const nearEdge = BELT.MOUTH.W / 2 + BELT.GUIDE - BELT.LIFT.WEIGHT_R;
    expect(nearEdge).toBeGreaterThan(BELT.TAIL + BELT.END);
  });
});

describe('the rollers', () => {
  // The pitch is a roller and a gap, and the gap is not decoration: it is what
  // the lift's fingers come down through.
  it('spaces them a roller and a gap apart', () => {
    expect(rollPitch()).toBeCloseTo(BELT.ROLL.D + BELT.ROLL.GAP, 6);
    expect(BELT.ROLL.GAP).toBeGreaterThan(BELT.LIFT.FINGER_W);
  });

  // A roller turning at any other rate is a box being dragged along on top of
  // it, which is the fault the scrolling band had in the other direction.
  it('turns at the speed of what stands on it', () => {
    const oneSecond = rollerSpin(1000);
    expect(oneSecond * (BELT.ROLL.D / 2)).toBeCloseTo(BELT.SPEED, 6);
  });

  // The rollers' own Nyquist limit, and the reason `FACETS` is a number in this
  // file rather than a guess in the JSX. A faceted tube sampled slower than
  // twice its facet rate reads as standing still or as turning backwards —
  // exactly the fault the band was held to, now that what moves is geometry.
  it('is sampled fast enough not to appear to turn backwards', () => {
    const perTick = rollerSpin(1000 / BELT.HZ);
    expect(perTick).toBeLessThan(Math.PI / BELT.ROLL.FACETS);
  });

  // And the other side of it, which is the fault Mykolai actually reported on
  // NBC-68 — "будто очень мало фпс". A box moves with the run now, so a tick
  // rate merely acceptable for a texture offset is a visible step in a solid.
  it('is not sampled so slowly that the run steps', () => {
    expect(BELT.SPEED / BELT.HZ).toBeLessThan(rollPitch() / 10);
  });
});

describe('the lift, and its comb', () => {
  // NBC-72 point 4, in one number: "САМОЕ ГЛАВНОЕ: ролики подъёмника не должны
  // соприкасаться с роликами конвейера". Two dark metal things in the same
  // millimetres do not announce themselves; they flicker per pixel as the
  // camera moves and read as a rendering fault.
  it('leaves air between a finger and the roller either side of it', () => {
    expect(combClearance()).toBeGreaterThan(0);
  });

  it('drops every finger dead between two rollers', () => {
    for (const x of fingerXs()) {
      // the nearest roller centre, on a grid anchored at the station
      const nearest = Math.round(x / rollPitch()) * rollPitch();
      expect(Math.abs(x - nearest)).toBeCloseTo(rollPitch() / 2, 6);
    }
  });

  // A comb the box cannot sit on is not a transfer. The fingers have to reach
  // under most of the box's width, or it is balanced on a knife.
  it('spreads the fingers under the box rather than under its middle', () => {
    const xs = fingerXs();
    expect(Math.max(...xs)).toBeLessThan(BELT.BOX.w / 2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(BELT.BOX.w / 2);
  });

  it('hangs them symmetrically about the run', () => {
    const xs = fingerXs();
    expect(xs.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
  });

  // The section has to end up *below* the roller tops or the box never leaves
  // it, and it has to be below by more than the bars it carries stand proud.
  it('goes further down than it lets the box down', () => {
    expect(BELT.LIFT.CLEAR).toBeGreaterThan(0);
    expect(BELT.LIFT.RISE + BELT.LIFT.CLEAR).toBeGreaterThan(BELT.LIFT.RISE);
  });

  it('is up before the box arrives and up again once it has gone', () => {
    expect(liftDrop(0, PATH)).toBe(0);
    expect(liftDrop(STATION - 0.01, PATH)).toBe(0);
    expect(liftDrop(STATION + BELT.LIFT.HOLD + liftWait() + BELT.LIFT.RETURN, PATH)).toBe(0);
  });

  // Mykolai, on the first cut: "нужно чтобы коробка уехала и только после этого
  // подьемник вернулся вверх". A lift that starts back up the moment it has let
  // go puts four steel fingers up through a plywood case still standing over
  // them, and it is not subtle.
  it('stays at the bottom while the box it set down is still over it', () => {
    for (let q = BELT.LIFT.HOLD; q < BELT.LIFT.HOLD + liftWait(); q += 0.01) {
      expect(liftDrop(STATION + q, PATH)).toBe(1);
    }
  });

  it('waits exactly as long as the box takes to run clear of the fingers', () => {
    const clear = BELT.BOX.w / 2 + Math.max(...fingerXs()) + BELT.LIFT.FINGER_W / 2;
    expect(liftWait()).toBeGreaterThan(clear);
    expect(liftWait()).toBeLessThan(clear + 0.1);
  });

  it('is at the bottom of its travel by the end of the station', () => {
    expect(liftDrop(STATION + BELT.LIFT.HOLD * 0.999, PATH)).toBeCloseTo(1, 2);
  });

  // The whole cycle has to fit between two boxes, or the fingers are still
  // coming up when the next one arrives on them. This is what sets `PITCH`,
  // which is why that number stopped being a taste call on NBC-72.
  it('fits its whole cycle between one box and the next', () => {
    expect(BELT.PITCH).toBeGreaterThan(minPitch());
  });

  // The clause that would have caught the fault Mykolai reported, swept over a
  // whole cycle rather than argued at the boundaries: at no travel at all may a
  // finger standing above the roller line share any of its width with a box
  // that is standing on the rollers.
  it('never has a finger inside a box, at any travel', () => {
    const n = beltCount(pathLength(PATH), BELT.PITCH);
    const reach = Math.max(...fingerXs()) + BELT.LIFT.FINGER_W / 2;
    for (let s = 0; s < n * BELT.PITCH; s += 0.01) {
      let drop = 0;
      for (let i = 0; i < n; i += 1) drop = Math.max(drop, liftDrop(beltAt(s, i, n, BELT.PITCH), PATH));
      const top = (1 - drop) * (BELT.LIFT.RISE + BELT.LIFT.CLEAR) - BELT.LIFT.CLEAR;
      if (top <= 0) continue;
      for (let i = 0; i < n; i += 1) {
        const d = beltAt(s, i, n, BELT.PITCH);
        if (d >= pathLength(PATH)) continue;
        const { x } = posAt(d, PATH);
        const y = boxRise(d, PATH) * BELT.LIFT.RISE;
        // a box up on the lift is *carried* by the fingers, not pierced by them
        if (y > top - 1e-9) continue;
        const overlap = Math.abs(x) < reach + BELT.BOX.w / 2 - 1e-9;
        expect(overlap).toBe(false);
      }
    }
  });

  // A fall that eases out is a lift setting a box down. Mykolai asked for the
  // other thing: "опускают коробку быстро, будто с рывком". So the second half
  // of the fall has to cover more ground than the first.
  it('falls faster the further it has fallen', () => {
    const at = (f) => liftDrop(STATION + BELT.LIFT.HOLD * (BELT.LIFT.PAUSE
      + (1 - BELT.LIFT.PAUSE) * f), PATH);
    expect(at(0.5)).toBeLessThan(0.5);
    expect(at(1) - at(0.5)).toBeGreaterThan(at(0.5) - at(0));
  });

  // No step anywhere in a whole cycle. A lift that jumps is a glitch, not a
  // machine.
  it('never jumps, over a whole cycle', () => {
    let last = liftDrop(0, PATH);
    for (let d = 0; d < STATION + BELT.PITCH; d += 0.002) {
      const now = liftDrop(d, PATH);
      expect(Math.abs(now - last)).toBeLessThan(0.1);
      last = now;
    }
  });
});

describe('the box, being set down', () => {
  it('rides the lift out of the wall, not the run', () => {
    expect(boxRise(0, PATH)).toBeCloseTo(1, 6);
    expect(boxRise(STATION, PATH)).toBeCloseTo(1, 6);
  });

  it('is standing on the run by the time it starts moving again', () => {
    expect(boxRise(STATION + BELT.LIFT.HOLD + BELT.LIFT.BOUNCE, PATH)).toBeCloseTo(0, 6);
    expect(boxRise(STATION + BELT.PITCH, PATH)).toBe(0);
  });

  // The clause the whole phase split exists for: the box must never be left
  // hanging over the run with nothing under it, and it must never be below it.
  // A gap of one centimetre at this scale is a box floating.
  it('is never in the air between one phase and the next', () => {
    for (let d = 0; d < STATION + BELT.PITCH; d += 0.002) {
      const y = boxRise(d, PATH) * BELT.LIFT.RISE;
      const lift = (1 - liftDrop(d, PATH)) * (BELT.LIFT.RISE + BELT.LIFT.CLEAR) - BELT.LIFT.CLEAR;
      const supported = Math.abs(y - Math.max(0, lift)) < 0.004 || y <= BELT.LIFT.HOP + 1e-9;
      expect(supported).toBe(true);
      expect(y).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('does not step on the way down', () => {
    let last = boxRise(0, PATH);
    for (let d = 0; d < STATION + BELT.PITCH; d += 0.002) {
      const now = boxRise(d, PATH);
      expect(Math.abs(now - last)).toBeLessThan(0.09);
      last = now;
    }
  });

  // One hop, in centimetres and not decimetres, and it is over before the box
  // has gone a fifth of the way to the next one.
  it('hops once, and small', () => {
    expect(boxHop(STATION, PATH)).toBe(0);
    const peak = Math.max(...Array.from(
      { length: 200 },
      (_, i) => boxHop(STATION + BELT.LIFT.HOLD + (i / 200) * BELT.LIFT.BOUNCE, PATH),
    )) * BELT.LIFT.RISE;
    expect(peak).toBeGreaterThan(0.005);
    expect(peak).toBeLessThan(0.04);
    expect(BELT.LIFT.BOUNCE).toBeLessThan(BELT.PITCH / 5);
  });

  it('does not hop before it has been let go of', () => {
    expect(boxHop(STATION + BELT.LIFT.HOLD * BELT.LIFT.PAUSE * 0.5, PATH)).toBe(0);
  });
});

describe('the twist a landing puts on a box', () => {
  it('is nothing at all until the box has landed', () => {
    expect(boxYaw(0, 0, PATH)).toBe(0);
    expect(boxYaw(0, STATION, PATH)).toBe(0);
  });

  // The bound is the manifest. The face with the lettering on it is turned at
  // the camera, and a box far enough round is a box whose whole point cannot be
  // read — the constraint Mykolai attached to the ask himself.
  it('never turns the manifest far enough off the camera to lose it', () => {
    for (let i = 0; i < 24; i += 1) {
      const y = boxYaw(i, STATION + BELT.PITCH, PATH);
      expect(Math.abs(y)).toBeLessThanOrEqual(BELT.LIFT.YAW);
      expect(Math.abs(y)).toBeGreaterThan(0.02);
    }
    expect(BELT.LIFT.YAW).toBeLessThan(0.14);
  });

  // Deterministic per box, so a box does not shiver each time it comes round.
  it('gives the same box the same twist every trip', () => {
    expect(boxYaw(3, STATION + 1, PATH)).toBe(boxYaw(3, STATION + 2.5, PATH));
  });

  // And the fault the first hash had: the low bit of a multiple of an odd
  // constant alternates, so every box got the opposite twist to its neighbour
  // and the run read as a row of metronomes.
  it('does not simply alternate down the run', () => {
    const signs = Array.from({ length: 8 }, (_, i) => Math.sign(boxYaw(i, STATION + 1, PATH)));
    const alternating = signs.every((s, i) => i === 0 || s !== signs[i - 1]);
    expect(alternating).toBe(false);
  });

  // Never straightened out again. Correcting it is the "идеализированность"
  // the whole of this was opened against.
  it('is kept for the rest of the trip', () => {
    const settled = boxYaw(2, STATION + BELT.LIFT.HOLD + BELT.LIFT.BOUNCE, PATH);
    expect(boxYaw(2, STATION + 3, PATH)).toBeCloseTo(settled, 9);
  });
});

describe('the path, as one line with a stop in it', () => {
  const path = { out: 1, hold: 0.1, run: 4 };

  it('is the way out of the wall, the station, and the run', () => {
    expect(pathLength(path)).toBeCloseTo(5.1, 9);
  });

  it('starts in the mouth and travels out of the wall', () => {
    expect(posAt(0, path)).toEqual({ x: 0, z: -1 });
    expect(posAt(0.5, path)).toEqual({ x: 0, z: -0.5 });
  });

  it('stands still at the station while the lift lets it down', () => {
    expect(posAt(1, path)).toEqual({ x: 0, z: 0 });
    expect(posAt(1.05, path)).toEqual({ x: 0, z: 0 });
    expect(posAt(1.1, path).x).toBeCloseTo(0, 9);
    expect(posAt(1.1, path).z).toBe(0);
  });

  // Left, and only left. A run going the other way is a delivery *in* — the one
  // thing the direction of this is there to say.
  it('leaves to the left, along the wall', () => {
    expect(posAt(3.1, path).x).toBeCloseTo(-2, 9);
    expect(posAt(pathLength(path), path).x).toBeCloseTo(-4, 9);
    expect(posAt(pathLength(path), path).z).toBe(0);
  });

  it('does not walk off the end of the run when a tick lands late', () => {
    expect(posAt(pathLength(path) * 2, path).x).toBeCloseTo(-4, 9);
  });

  it('never runs a box backwards along it', () => {
    let last = -Infinity;
    for (let d = 0; d <= pathLength(path); d += 0.01) {
      const at = posAt(d, path);
      const along = at.z < 0 ? at.z : -at.x;
      expect(along).toBeGreaterThanOrEqual(last - 1e-9);
      last = along;
    }
  });
});

describe('the boxes, without end', () => {
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
  // or a box changes its manifest in full view.
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
    expect(beltTrip(cycle - 4.5, 3, n, 1.5)).toBe(1);
    expect(beltTrip(cycle - 4.5, 0, n, 1.5)).toBe(0);
  });

  it('is legal on a path shorter than one pitch', () => {
    expect(beltCount(0.5, 1.5)).toBeGreaterThanOrEqual(1);
    expect(beltAt(0, 0, 1, 1.5)).toBe(0);
  });
});

describe('the lead-in, behind the wall', () => {
  // The fault this exists for: a box switched on standing in the plane of the
  // wall is half a box appearing between one tick and the next — "ящики просто
  // спаунятся из ничего". A box has to have somewhere to come *from*.
  it('starts the box further back than the box is long', () => {
    expect(BELT.LEAD).toBeGreaterThan(BELT.BOX.d);
  });

  it('counts the hidden stretch as part of the path', () => {
    expect(pathLength(PATH)).toBeCloseTo(BELT.LEAD + BELT.OUT + BELT.LIFT.HOLD + 4, 6);
  });

  it('holds the box inside the wall until the lift pulls it out', () => {
    expect(posAt(0, PATH).z).toBeCloseTo(-BELT.LEAD - BELT.OUT, 6);
    expect(posAt(BELT.LEAD, PATH).z).toBeCloseTo(-BELT.OUT, 6);
  });

  it('is optional', () => {
    expect(posAt(0, { out: 1, run: 4 })).toEqual({ x: 0, z: -1 });
    expect(liftDrop(1, { out: 1, run: 4 })).toBe(0);
    expect(boxHop(1, { out: 1, run: 4 })).toBe(0);
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

  it('never jumps over a whole pass', () => {
    let last = slatPush(-1, 0, half);
    for (let dz = -1; dz < 1.5; dz += 0.01) {
      const now = slatPush(dz, 0, half);
      expect(Math.abs(now - last)).toBeLessThan(0.12);
      last = now;
    }
  });
});
