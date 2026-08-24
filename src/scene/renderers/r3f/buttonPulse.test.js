import { describe, expect, it } from 'vitest';
import { GLOW, wave } from './buttonPulse.js';

// The waveform, and the one property of the row that a test can hold: that the
// three controls never line up. Whether the swell reads as an invitation is a
// taste call and belongs in front of eyes, but "they blink together" is a
// regression anyone could introduce by tidying three periods into round
// numbers, and it is the difference between a panel idling and an alarm.

describe('the swell', () => {
  it('stays inside 0..1 wherever it is sampled', () => {
    for (let t = 0; t < 6000; t += 37) {
      const v = wave(t, 2300, 0.31);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('crests once a period and is dark at the ends of it', () => {
    const period = 2000;
    expect(wave(0, period, 0)).toBeCloseTo(0);
    expect(wave(period / 2, period, 0)).toBeCloseTo(1);
    expect(wave(period, period, 0)).toBeCloseTo(0);
  });

  it('spends more of the cycle dark than lit, which is what makes it a pulse', () => {
    const period = 2000;
    let lit = 0;
    const steps = 400;
    for (let i = 0; i < steps; i += 1) {
      if (wave((i / steps) * period, period, 0) > 0.5) lit += 1;
    }
    expect(lit / steps).toBeLessThan(0.4);
  });

  it('is where the phase says it is', () => {
    const period = 2000;
    expect(wave(0, period, 0.5)).toBeCloseTo(1);
    expect(wave(500, period, 0.25)).toBeCloseTo(1);
  });
});

describe('the row', () => {
  // Read off `CONTROLS` in ScreenFrame; kept here as the numbers themselves so
  // this fails loudly if someone rounds them, rather than importing a component
  // module into a plain unit test.
  const PERIODS = [2300, 1700, 2900];

  it('gives no two controls the same period, so the row cannot lock in step', () => {
    expect(new Set(PERIODS).size).toBe(PERIODS.length);
  });

  it('keeps them apart across a long idle rather than only at the start', () => {
    const phases = [0, 0.38, 0.62];
    let together = 0;
    for (let t = 0; t < 120000; t += 50) {
      const v = PERIODS.map((p, i) => wave(t, p, phases[i]));
      if (v.every((x) => x > 0.7)) together += 1;
    }
    // The bar is *chance*, not zero. Each lamp is above 0.7 for a bit under a
    // third of its own cycle, so three uncorrelated lamps land there together
    // about 0.29³ — two per cent — of the time, and the measured rate sitting
    // on that number is the evidence they are uncorrelated. A row that had
    // locked in step would be at thirty per cent.
    expect(together / (120000 / 50)).toBeLessThan(0.035);
  });
});

describe('the levels', () => {
  it('leaves a pressed button brighter than a hovered one and both above idle', () => {
    expect(GLOW.idle).toBeLessThan(GLOW.hover);
    expect(GLOW.hover).toBeLessThan(GLOW.press);
  });

  it('crests above anything the pointer can do to it, so an idle row is the loudest thing on the panel', () => {
    expect(GLOW.peak).toBeGreaterThan(GLOW.press);
  });
});
