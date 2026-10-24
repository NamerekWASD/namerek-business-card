import { describe, expect, it } from 'vitest';
import { BOOT_JOBS, BOOT_LAMPS, fractionDone, litLamps } from './plan.js';
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
    // there should cost a lamp, not the whole first impression.
    expect(fractionDone(['fonts', 'nonsense'])).toBe(fractionDone(['fonts']));
  });
});

describe('the job lamps', () => {
  it('are all dark before anything reports and all lit when everything has', () => {
    expect(litLamps(0)).toBe(0);
    expect(litLamps(1)).toBe(BOOT_LAMPS);
  });

  it('never light the last lamp before the work is done', () => {
    // The last lamp is the promise that the doors are about to open.
    expect(litLamps(0.999)).toBeLessThan(BOOT_LAMPS);
  });

  it('survive the float sums the weights come out as', () => {
    // 0.1 + 0.2 + 0.1 is 0.4000000000000001 or 0.39999999999999997 depending
    // on the order the jobs reported in, and either one is two lamps.
    expect(litLamps(0.39999999999999997)).toBe(2);
    expect(litLamps(0.4000000000000001)).toBe(2);
  });

  it('stay within the row whatever they are handed', () => {
    expect(litLamps(-1)).toBe(0);
    expect(litLamps(7)).toBe(BOOT_LAMPS);
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
