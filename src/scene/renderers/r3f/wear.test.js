import { describe, expect, it } from 'vitest';
import { FIELD, metalWear, mix, seeded } from './wear.js';

// The three properties this module has to hold, and nothing about how any
// particular plate looks — that is a taste call and belongs in front of eyes.
//
// What a test can pin down is that the *description* a call site writes means
// what it says: the field puts wear where the caller asked, mixing two reasons
// cannot run off the end of the scale, and the same seed is the same object
// twice. The third is the one that would fail silently and expensively — a bake
// is cached by key, so a generator that drifted would give two viewers of this
// site two different benches and nobody would find out from a screenshot.

const at = (field, fx, fy, w = 100, h = 100) => field(fx * w, fy * h, w, h);

describe('a wear field', () => {
  it('puts edge wear at the edges and none in the middle', () => {
    const f = FIELD.edges(1);
    expect(at(f, 0.5, 0.5)).toBe(0);
    expect(at(f, 0.01, 0.5)).toBeGreaterThan(0.9);
    expect(at(f, 0.5, 0.99)).toBeGreaterThan(0.9);
  });

  it('reads in fractions, so a bake can be re-authored at any size', () => {
    const f = FIELD.edges(1);
    expect(at(f, 0.06, 0.5, 100, 100)).toBeCloseTo(at(f, 0.06, 0.5, 400, 400));
  });

  it('gathers toward the bottom, and the exponent decides how fast', () => {
    const soft = FIELD.bottom(1, 1);
    const hard = FIELD.bottom(1, 4);
    expect(at(soft, 0.5, 1)).toBeCloseTo(1);
    expect(at(hard, 0.5, 1)).toBeCloseTo(1);
    // halfway down, a hard falloff has barely started where a soft one is half
    expect(at(hard, 0.5, 0.5)).toBeLessThan(at(soft, 0.5, 0.5));
  });

  it('puts a hot spot where the caller said the hand lands', () => {
    const f = FIELD.around(1, 0.5, 0.62, 0.2);
    expect(at(f, 0.5, 0.62)).toBeCloseTo(1);
    expect(at(f, 0.5, 0.1)).toBe(0);
  });

  it('gives one surface its own blotches and another surface different ones', () => {
    const a = FIELD.blotches(1, 6, 1);
    const b = FIELD.blotches(1, 6, 2);
    const sample = (f) => Array.from({ length: 40 }, (_, i) => at(f, (i % 8) / 8, Math.floor(i / 8) / 5));
    expect(sample(a)).not.toEqual(sample(b));
    expect(sample(a)).toEqual(sample(FIELD.blotches(1, 6, 1)));
  });
});

describe('mixing reasons to be worn', () => {
  it('adds them, so a corner that is both is worse than either', () => {
    const f = mix(FIELD.even(0.3), FIELD.even(0.4));
    expect(at(f, 0.5, 0.5)).toBeCloseTo(0.7);
  });

  it('clamps, so no amount of piling on can run off the scale', () => {
    const f = mix(FIELD.even(0.8), FIELD.even(0.8), FIELD.even(0.8));
    expect(at(f, 0.5, 0.5)).toBe(1);
  });

  it('is nothing at all when handed nothing', () => {
    expect(at(mix(), 0.5, 0.5)).toBe(0);
  });
});

describe('the generator', () => {
  it('repeats exactly for a seed, and differs between seeds', () => {
    const run = (s) => { const r = seeded(s); return [r(), r(), r(), r()]; };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('stays inside 0..1', () => {
    const r = seeded(0xbeef);
    for (let i = 0; i < 500; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('painting a surface', () => {
  // jsdom's canvas has no 2D context, so the calls are recorded rather than
  // rasterised. That is enough for what is being asserted: *that the field is
  // consulted*, and that the same description twice draws the same picture.
  const spyCtx = () => {
    const calls = [];
    const record = (name) => (...args) => { calls.push([name, ...args]); };
    const gradient = { addColorStop: () => {} };
    // A gradient is recorded by name, not by object: two runs build two
    // distinct ones and comparing them by identity would fail the determinism
    // test for a reason that has nothing to do with the generator.
    const paintStyle = (v) => (typeof v === 'string' ? v : 'gradient');
    return {
      calls,
      ctx: /** @type {any} */ ({
        globalAlpha: 1,
        lineWidth: 1,
        set fillStyle(v) { calls.push(['fillStyle', paintStyle(v)]); },
        get fillStyle() { return '#000'; },
        set strokeStyle(v) { calls.push(['strokeStyle', paintStyle(v)]); },
        get strokeStyle() { return '#000'; },
        beginPath: record('beginPath'),
        arc: record('arc'),
        fill: record('fill'),
        moveTo: record('moveTo'),
        lineTo: record('lineTo'),
        stroke: record('stroke'),
        fillRect: record('fillRect'),
        createRadialGradient: () => gradient,
        createLinearGradient: () => gradient,
      }),
    };
  };

  const paint = (options) => {
    const { calls, ctx } = spyCtx();
    metalWear(ctx, 256, 64, { seed: 42, ...options });
    return calls;
  };

  it('draws nothing where the field says the surface is untouched', () => {
    const arcs = paint({ field: () => 0, pit: 8, bloom: 20, polish: 20, streaks: 20 })
      .filter(([name]) => name === 'arc');
    expect(arcs).toHaveLength(0);
  });

  it('draws pitting where the field says it has been used', () => {
    const arcs = paint({ field: () => 1, pit: 8 }).filter(([name]) => name === 'arc');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('gives the same description the same picture every time', () => {
    const options = { field: FIELD.edges(1), pit: 4, bloom: 6, scratch: 8, polish: 4 };
    expect(paint(options)).toEqual(paint(options));
  });

  it('gives two objects with different seeds different pictures', () => {
    const options = { field: FIELD.even(1), pit: 6 };
    expect(paint({ ...options, seed: 1 })).not.toEqual(paint({ ...options, seed: 2 }));
  });

  it('lays grime down as a wash rather than as specks', () => {
    const withGrime = paint({ field: () => 0, grime: 1 });
    expect(withGrime.filter(([name]) => name === 'fillRect')).toHaveLength(1);
    expect(paint({ field: () => 0, grime: 0 })).toHaveLength(0);
  });
});
