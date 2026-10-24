import { describe, expect, it } from 'vitest';
import { DECKS } from '../lift/decks.js';
import { HOME_DEG, STOPS, needleKeyframes } from './dial.js';

// The floor indicator's needle is driven by a CSS animation, not by script: the
// boot is exactly when the main thread is busy compiling the scene, and a
// needle moved from `requestAnimationFrame` froze for the whole of it. What is
// pinned here is the stylesheet that animation is built from.

/** Every `NN% { transform: rotate(Xdeg) }` in a keyframes block, in order. */
function frames(css) {
  return [...css.matchAll(/([\d.]+)%\s*\{\s*transform:\s*rotate\((-?[\d.]+)deg\)/g)]
    .map(([, pct, deg]) => ({ pct: Number(pct), deg: Number(deg) }));
}

describe('the dial', () => {
  it('marks every floor of the building, ground floor first', () => {
    expect(STOPS.map((s) => s.tick)).toEqual(DECKS.map((d) => d.tick));
    expect(HOME_DEG).toBe(STOPS[0].deg);
  });

  it('spreads the floors evenly and symmetrically about the top', () => {
    const gaps = STOPS.slice(1).map((s, i) => s.deg - STOPS[i].deg);
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6);
    expect(STOPS[0].deg).toBeCloseTo(-STOPS[STOPS.length - 1].deg, 6);
  });
});

describe('the needle keyframes', () => {
  const css = needleKeyframes('n');
  const f = frames(css);

  it('is one named keyframes block', () => {
    expect(css).toMatch(/^@keyframes n\s*\{/);
  });

  it('starts and ends on the ground floor, so the loop has no seam', () => {
    expect(f[0]).toEqual({ pct: 0, deg: HOME_DEG });
    expect(f[f.length - 1]).toEqual({ pct: 100, deg: HOME_DEG });
  });

  it('only ever rests on a floor, and rests on every one of them', () => {
    // A lift stops at floors. Two consecutive frames with the same angle are a
    // dwell, and every dwell has to be on a mark.
    const marks = new Set(STOPS.map((s) => s.deg));
    const dwells = f.filter((x, i) => i > 0 && x.deg === f[i - 1].deg).map((x) => x.deg);
    for (const d of dwells) expect(marks.has(d)).toBe(true);
    expect(new Set(dwells)).toEqual(marks);
  });

  it('runs forward in time', () => {
    for (let i = 1; i < f.length; i += 1) expect(f[i].pct).toBeGreaterThan(f[i - 1].pct);
  });
});
