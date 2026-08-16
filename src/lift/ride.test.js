import { describe, expect, it } from 'vitest';
import {
  ACCEL_PHASE, CRUISE_PHASE, DECEL_PHASE, SETTLE_OVERSHOOT,
  doorClosure, doorClosureAt, liftDuration, liftEase,
} from './ride.js';

describe('liftEase', () => {
  it('starts at the departing floor and finishes exactly at the arriving one', () => {
    expect(liftEase(0)).toBe(0);
    expect(liftEase(1)).toBe(1);
  });

  it('clamps outside the trip rather than extrapolating', () => {
    expect(liftEase(-0.5)).toBe(0);
    expect(liftEase(1.5)).toBe(1);
  });

  it('is continuous across the phase joins', () => {
    // The curve is defined piecewise, and a step at a join is a visible jolt in
    // the cabin. Sampled either side of each boundary rather than at it.
    for (const joint of [ACCEL_PHASE, ACCEL_PHASE + CRUISE_PHASE]) {
      const before = liftEase(joint - 1e-6);
      const after = liftEase(joint + 1e-6);
      expect(Math.abs(after - before)).toBeLessThan(1e-4);
    }
  });

  it('cruises at a genuinely constant speed in the middle', () => {
    // This is the whole reason the curve exists rather than an ease-out: the
    // middle of the trip must not be decelerating.
    const at = (p) => liftEase(p);
    const step = 0.02;
    const mid = ACCEL_PHASE + CRUISE_PHASE / 2;
    const v1 = at(mid) - at(mid - step);
    const v2 = at(mid + step) - at(mid);
    expect(Math.abs(v2 - v1)).toBeLessThan(1e-6);
  });

  it('overshoots the floor on the brakes, then settles back onto it', () => {
    // A lift arriving dead-on reads as a tween. The overshoot is deliberate —
    // but it has to stay small and it has to come back.
    let peak = 0;
    for (let p = 0.78; p <= 1; p += 0.001) peak = Math.max(peak, liftEase(p));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1 + SETTLE_OVERSHOOT * 1.05);
  });
});

describe('liftDuration', () => {
  it('charges nothing extra for the first floor and more for each after', () => {
    expect(liftDuration(1)).toBe(760);
    expect(liftDuration(0)).toBe(liftDuration(1));
    expect(liftDuration(3)).toBeGreaterThan(liftDuration(2));
    expect(liftDuration(3) - liftDuration(2)).toBe(liftDuration(2) - liftDuration(1));
  });
});

describe('doorClosureAt', () => {
  const ride = (from, to, p) => ({ from, to, p });

  it('leaves only the departing and arriving floors with anything to do', () => {
    // The bug this pins down: riding the ground floor to the third used to open
    // the doors of every landing it passed. A lift going past a floor does not
    // open at it, and no amount of eyeballing a 1.6s animation reliably catches
    // a door that opens a crack halfway up the shaft.
    for (let p = 0; p <= 1; p += 0.01) {
      for (const passed of [1, 2]) {
        expect(doorClosureAt(passed, ride(0, 3, p), 0)).toBe(1);
      }
    }
  });

  it('shuts the floor being left over the acceleration and no later', () => {
    expect(doorClosureAt(0, ride(0, 3, 0), 0)).toBeCloseTo(0);
    expect(doorClosureAt(0, ride(0, 3, ACCEL_PHASE), 0)).toBe(1);
    expect(doorClosureAt(0, ride(0, 3, 0.9), 0)).toBe(1);
  });

  it('opens the floor being arrived at over the braking, and only then', () => {
    const openFrom = ACCEL_PHASE + CRUISE_PHASE;
    expect(doorClosureAt(3, ride(0, 3, openFrom - 0.01), 0)).toBe(1);
    expect(doorClosureAt(3, ride(0, 3, openFrom), 0)).toBe(1);
    expect(doorClosureAt(3, ride(0, 3, 1), 0)).toBeCloseTo(0);
  });

  it('at rest leaves the current floor open and every other shut', () => {
    expect(doorClosureAt(2, null, 2)).toBe(0);
    for (const other of [0, 1, 3]) expect(doorClosureAt(other, null, 2)).toBe(1);
  });

  it('rides down as symmetrically as it rides up', () => {
    expect(doorClosureAt(3, ride(3, 0, 0), 3)).toBeCloseTo(0);
    expect(doorClosureAt(0, ride(3, 0, 1), 3)).toBeCloseTo(0);
    for (let p = 0; p <= 1; p += 0.05) {
      expect(doorClosureAt(1, ride(3, 0, p), 3)).toBe(1);
    }
  });
});

describe('doorClosure', () => {
  it('is fully open at rest', () => {
    expect(doorClosure(null)).toBe(0);
  });

  it('agrees with doorClosureAt about the floor being left', () => {
    // Two implementations of one curve. They are allowed to stay separate, but
    // not to disagree.
    for (let p = 0; p < ACCEL_PHASE; p += 0.01) {
      expect(doorClosure(p)).toBeCloseTo(doorClosureAt(0, { from: 0, to: 3, p }, 0));
    }
  });

  it('is shut for the whole cruise', () => {
    expect(doorClosure(ACCEL_PHASE + CRUISE_PHASE / 2)).toBe(1);
  });

  it('spends the three phases it says it does', () => {
    expect(ACCEL_PHASE + CRUISE_PHASE + DECEL_PHASE).toBeCloseTo(1);
  });
});
