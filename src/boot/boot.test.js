import { describe, expect, it } from 'vitest';
import { BOOT_JOBS, chase, fractionDone, idleCreep } from './plan.js';
import {
  DRIVER_TEETH, IDLER_PHASE, IDLER_TEETH, TEETH_OVER_BOOT,
  gearPath, idlerAngle, ratchetAngle, spinAngle, takeUp,
} from './gears.js';
import { introDim } from '../lift/intro.js';

// The boot screen is the first thing anybody sees and the one part of this app
// nobody can watch fail on their own machine — it is over in a second and a
// half, and if it is wrong on a cold profile on someone else's laptop there is
// no bug report, only a closed tab. So the arithmetic under it is pinned down
// here rather than judged by eye.

describe('the progress figure', () => {
  it('is nought before anything reports and one when everything has', () => {
    expect(fractionDone([])).toBe(0);
    expect(fractionDone(Object.keys(BOOT_JOBS))).toBe(1);
  });

  it('weighs the shader compiles above the downloads', () => {
    // The whole point of the register: the two canvases are most of the wait,
    // and a bar that treats them as two jobs out of five sits at 60% through
    // the expensive half.
    const compiles = fractionDone(['shaft', 'near']);
    const downloads = fractionDone(['fonts', 'tiles', 'mark']);
    expect(compiles).toBeGreaterThan(downloads);
  });

  it('ignores a name it does not know rather than throwing', () => {
    // `settle` is called from inside two canvases and a warm-up, and a typo
    // there should cost a step on a gear, not the whole first impression.
    expect(fractionDone(['fonts', 'nonsense'])).toBe(fractionDone(['fonts']));
  });

  it('never lets the creep finish the job on its own', () => {
    // A progress bar that can reach the end without the work being done is the
    // exact lie this screen exists to stop telling.
    expect(idleCreep(0)).toBe(0);
    expect(idleCreep(60_000)).toBeLessThan(0.56);
    expect(idleCreep(1000)).toBeGreaterThan(idleCreep(500));
  });
});

describe('the needle chasing the work', () => {
  it('closes half the gap in one half-life, whatever the frame rate', () => {
    // Two 8ms frames on a fast machine must land in the same place as one 16ms
    // frame on a slow one, or the gear is a different animation per machine.
    const oneStep = chase(0, 1, 16, 220);
    const twoSteps = chase(chase(0, 1, 8, 220), 1, 8, 220);
    expect(twoSteps).toBeCloseTo(oneStep, 6);
  });

  it('never runs backwards when the target does not move', () => {
    expect(chase(0.8, 0.5, 16)).toBe(0.8);
  });
});

describe('the gears', () => {
  it('advances tooth over tooth without ever giving one back', () => {
    // The property is *not* a monotonic angle — the ring-down after each strike
    // is a genuine backward flick, and that flick is the whole character of the
    // thing. What must never happen is a tooth being surrendered: whatever the
    // wobble does inside an interval, the next interval starts further on than
    // the last one did.
    const tooth = (i) => ratchetAngle(i / TEETH_OVER_BOOT);
    for (let i = 1; i <= TEETH_OVER_BOOT; i += 1) {
      expect(tooth(i)).toBeGreaterThan(tooth(i - 1));
    }
  });

  it('keeps the flick small enough to read as a mechanism, not a stutter', () => {
    // A wobble approaching a whole tooth stops looking like a ratchet settling
    // and starts looking like the animation skipping.
    const step = (Math.PI * 2) / DRIVER_TEETH;
    let peak = 0;
    let back = 0;
    for (let s = 0; s <= 1; s += 1 / 2048) {
      const a = ratchetAngle(s);
      back = Math.max(back, peak - a);
      peak = Math.max(peak, a);
    }
    expect(back).toBeGreaterThan(0); // there is a flick at all
    expect(back).toBeLessThan(step * 0.25);
  });

  it('walks the whole way round more than once over a load', () => {
    expect(ratchetAngle(1)).toBeCloseTo((TEETH_OVER_BOOT * Math.PI * 2) / DRIVER_TEETH, 5);
    expect(ratchetAngle(1)).toBeGreaterThan(Math.PI * 2);
  });

  it('takes a tooth up fast and then settles', () => {
    expect(takeUp(0)).toBe(0);
    // most of the travel is done a third of the way through the interval
    expect(takeUp(0.32)).toBeGreaterThan(0.9);
    expect(takeUp(1)).toBeCloseTo(1, 5);
  });

  it('meshes: the idler turns the other way, faster by the tooth ratio', () => {
    // The phase offset is a constant, so it cancels out of any *difference* —
    // which is the right thing to assert here. The ratio is what keeps the two
    // wheels meshed once they start meshed; the phase is only what makes the
    // start position the right one.
    const a = idlerAngle(1.0);
    const b = idlerAngle(2.0);
    expect(b - a).toBeCloseTo(-(DRIVER_TEETH / IDLER_TEETH), 6);
    expect(b).toBeLessThan(a); // driver forwards means idler backwards
  });

  it('starts the idler a fraction of a tooth off, so the two do not collide', () => {
    // Nought here draws two wheels sunk into each other. It has to be some
    // fraction of the idler's own pitch, and never a whole one.
    expect(IDLER_PHASE).toBeGreaterThan(0);
    expect(IDLER_PHASE).toBeLessThan((Math.PI * 2) / IDLER_TEETH);
  });

  it('spools the free spin up rather than starting at full speed', () => {
    const early = spinAngle(100, 520) - spinAngle(0, 520);
    const late = spinAngle(520, 520) - spinAngle(420, 520);
    expect(late).toBeGreaterThan(early);
    expect(spinAngle(0, 520)).toBe(0);
  });

  it('draws four points per tooth and closes the path', () => {
    const d = gearPath(12, 54, 43);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.split('L')).toHaveLength(12 * 4);
  });
});

describe('the lamps striking', () => {
  it('starts dark and settles fully up', () => {
    expect(introDim(0)).toBe(0);
    expect(introDim(300)).toBe(1);
    expect(introDim(5000)).toBe(1);
  });

  it('actually falls back at least once instead of just ramping', () => {
    // A monotonic rise is a dimmer being turned up. The whole point is a supply
    // hunting before it holds, so somewhere in here a later sample has to be
    // darker than an earlier one.
    const samples = Array.from({ length: 60 }, (_, i) => introDim(i * 5));
    const fellBack = samples.some((v, i) => i > 0 && v < samples[i - 1]);
    expect(fellBack).toBe(true);
  });

  it('is over before the leaves start to shudder', () => {
    // Two mechanical events at once read as one confused one — see DOOR_HOLD_END.
    expect(introDim(420)).toBe(1);
  });

  it('stays within nought and one throughout', () => {
    for (let t = 0; t < 600; t += 3) {
      expect(introDim(t)).toBeGreaterThanOrEqual(0);
      expect(introDim(t)).toBeLessThanOrEqual(1);
    }
  });
});
