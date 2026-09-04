// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useScreenLife from './screenLife.js';

// ── the tube, for someone who cannot look at one ─────────────────────────────
// NBC-25. The roll bar is a soft band travelling down the picture and the hum
// is the whole panel breathing — a moving stimulus and a flicker, in the one
// prop a visitor stands closest to. There is a settled state for both already,
// because the screen has always had to go quiet when the doors shut; a visitor
// who has asked for stillness gets that state while standing in front of it.
// The picture stays: it is lit, it is bright, and it holds.

const stub = (matches) => {
  window.matchMedia = () => ({
    matches, addEventListener: () => {}, removeEventListener: () => {},
  });
};

afterEach(() => {
  delete window.matchMedia;
  vi.useRealTimers();
});

const rig = () => {
  const glow = [{ current: [{ emissiveIntensity: 2 }, { emissiveIntensity: 0.4 }] }];
  const bar = { offset: { y: 0.5 } };
  return { glow, bar, levels: () => glow[0].current.map((m) => m.emissiveIntensity) };
};

describe('the screen held still', () => {
  it('sits at its resting brightness with the bar parked at the top', () => {
    stub(true);
    vi.useFakeTimers();
    const { glow, bar, levels } = rig();
    renderHook(() => useScreenLife(glow, bar, true));

    expect(levels()).toEqual([2, 0.4]);
    expect(bar.offset.y).toBe(0);
    // Not a slower roll and not a shallower hum: nothing moves again.
    vi.advanceTimersByTime(30000);
    expect(levels()).toEqual([2, 0.4]);
    expect(bar.offset.y).toBe(0);
  });

  it('still runs for everyone else', () => {
    stub(false);
    vi.useFakeTimers();
    const { bar, levels } = rig();
    const { glow } = rig();
    renderHook(() => useScreenLife(glow, bar, true));
    const first = levels();
    let moved = false;
    for (let i = 0; i < 200 && !moved; i += 1) {
      vi.advanceTimersByTime(55);
      moved = bar.offset.y !== 0 || glow[0].current.some((m, k) => m.emissiveIntensity !== first[k]);
    }
    expect(moved).toBe(true);
  });
});
