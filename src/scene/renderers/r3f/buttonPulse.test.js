// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useButtonPulse, { GLOW, rest, wave } from './buttonPulse.js';

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

// ── a dead control has to look dead ──────────────────────────────────────────
// The row's invitation already skips a control that has nothing to offer, but
// skipping it only meant leaving it at `idle` — the very level every live lamp
// spends most of its cycle at. So PREV on the first picture and NEXT on the
// last were, in a still frame, indistinguishable from the two beside them:
// same legend, same reveal, and the only signal was the cursor. In this panel's
// own idiom a lamp in a socket either glows or it does not, so a control that
// will do nothing is carried below the floor a live one never drops under.

describe('a control with nothing to offer', () => {
  const lamps = () => [{ emissiveIntensity: -1 }, { emissiveIntensity: -1 }];
  const mount = (live) => {
    const legends = { current: [lamps(), lamps(), lamps()] };
    const hot = { current: [false, false, false] };
    const specs = [null, { period: 1700, phase: 0.38 }, { period: 2900, phase: 0.62 }];
    const view = renderHook(() => useButtonPulse(legends, hot, specs, live));
    return { legends, view };
  };

  it('rests under the level a live lamp never drops below', () => {
    expect(GLOW.dead).toBeLessThan(GLOW.idle);
  });

  it('is written dark by the driver, and stays there through a whole cycle', () => {
    vi.useFakeTimers();
    try {
      const { legends } = mount(true);
      let lit = 0;
      for (let t = 0; t < 6000; t += 60) {
        vi.advanceTimersByTime(60);
        for (const material of legends.current[0]) {
          expect(material.emissiveIntensity).toBe(GLOW.dead);
        }
        if (legends.current[1][0].emissiveIntensity > GLOW.idle) lit += 1;
      }
      // and the neighbour it is being told apart from really did light
      expect(lit).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('is dark behind shut doors too, where a live one only falls to idle', () => {
    const { legends } = mount(false);
    expect(legends.current[0][0].emissiveIntensity).toBe(GLOW.dead);
    expect(legends.current[1][0].emissiveIntensity).toBe(GLOW.idle);
  });
});

describe('the resting level', () => {
  it('is idle for a control that will act and dark for one that will not', () => {
    expect(rest(true)).toBe(GLOW.idle);
    expect(rest(false)).toBe(GLOW.dead);
  });
});
