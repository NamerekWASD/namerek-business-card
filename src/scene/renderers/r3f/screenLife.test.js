import { describe, expect, it } from 'vitest';
import { ROLL_MS, screenLife } from './screenLife.js';

// The waveform, not the wiring. Everything below is a clause that fails
// *silently* on the wall: a bar that jumps at the seam, a hum deep enough to
// read as a fault, a stumble that lands on a beat. None of them throws, none of
// them shows up in a screenshot, and all of them are the difference between a
// screen that is running and a screen with something wrong with it.

describe('the screen’s own life', () => {
  it('rolls once per pass and wraps without a jump', () => {
    expect(screenLife(0).roll).toBeCloseTo(0, 6);
    expect(screenLife(ROLL_MS / 2).roll).toBeCloseTo(0.5, 6);
    // Approaching the seam from below lands just under 1, and a hair past it
    // starts again at just over 0 — a bar that stepped from 0.9 to 0.1 would
    // read as the picture tearing rather than as the bar leaving the bottom.
    expect(screenLife(ROLL_MS - 1).roll).toBeGreaterThan(0.999);
    expect(screenLife(ROLL_MS + 1).roll).toBeLessThan(0.001);
  });

  // The hum is mains ripple, not a dimmer. Past a few per cent it stops being
  // a tube and starts being a lamp with a loose connection.
  it('hums within a few per cent of rest', () => {
    let low = Infinity;
    let high = -Infinity;
    for (let t = 0; t < 40000; t += 7) {
      const { level } = screenLife(t);
      // the stumbles are tested separately; they are the only excursion allowed
      // to be deep, and they are brief
      if (level < 0.9) continue;
      low = Math.min(low, level);
      high = Math.max(high, level);
    }
    expect(low).toBeGreaterThan(0.9);
    expect(high).toBeLessThan(1.1);
  });

  // A dropped field has to happen, has to be short, and — the part that is
  // actually easy to get wrong — must not land at the same place in every beat.
  // A stumble on a rhythm is a blinking light, which is a fault indicator.
  it('drops a field now and then, never on a beat', () => {
    const at = [];
    let inside = false;
    for (let t = 0; t < 60000; t += 5) {
      const dark = screenLife(t).level < 0.85;
      if (dark && !inside) at.push(t);
      inside = dark;
    }
    expect(at.length).toBeGreaterThan(6);
    const gaps = at.slice(1).map((t, i) => t - at[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const spread = Math.max(...gaps) - Math.min(...gaps);
    // a metronome would have every gap identical; this wants them scattered
    // across a decent part of their own average
    expect(spread).toBeGreaterThan(mean * 0.5);
  });

  it('is the same screen twice, given the same clock', () => {
    // Two landings furnished at once during a ride must not drift apart, which
    // is why the stumble is hashed rather than drawn from `Math.random`.
    for (const t of [0, 137, 4021, 19999]) {
      expect(screenLife(t)).toEqual(screenLife(t));
    }
  });
});
