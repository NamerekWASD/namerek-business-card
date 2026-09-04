// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import usePilotLamps, { LAMP_DARK, LAMP_LIT } from './pilotLamps.js';

// ── a board that states its condition instead of performing it ───────────────
// NBC-25. What makes this board read as *working* is that its lamps are not in
// step with each other — and a field of lights blinking out of step is, for a
// visitor who has asked for reduced motion, exactly the thing they asked to be
// spared. There is no half-measure available here (a slower blink is still a
// blink), so the board states the same fact without the flicker: a circuit
// with a cord in it is lit, one without is dark, and nothing changes again.
// That is what the board looks like in any single frame anyway.

const stub = (matches) => {
  window.matchMedia = () => ({
    matches, addEventListener: () => {}, removeEventListener: () => {},
  });
};

afterEach(() => {
  delete window.matchMedia;
  vi.useRealTimers();
});

const board = (patched) => ({ current: patched.map(() => ({ emissiveIntensity: -1 })) });
const levels = (materials) => materials.current.map((m) => m.emissiveIntensity);

describe('the board held still', () => {
  const PATCHED = [true, false, true, false, false];

  it('lights the patched circuits, darkens the rest, and stops there', () => {
    stub(true);
    vi.useFakeTimers();
    const materials = board(PATCHED);
    renderHook(() => usePilotLamps(materials, PATCHED, true));

    const want = PATCHED.map((busy) => (busy ? LAMP_LIT : LAMP_DARK));
    expect(levels(materials)).toEqual(want);
    // The blink is not slowed down, it is gone: nothing on this board changes
    // again for as long as anyone stands in front of it.
    vi.advanceTimersByTime(60000);
    expect(levels(materials)).toEqual(want);
  });

  it('leaves a board nobody can see alone, exactly as before', () => {
    stub(true);
    const materials = board(PATCHED);
    renderHook(() => usePilotLamps(materials, PATCHED, false));
    expect(levels(materials)).toEqual(PATCHED.map(() => -1));
  });

  it('still blinks for everyone else', () => {
    stub(false);
    vi.useFakeTimers();
    const materials = board(PATCHED);
    renderHook(() => usePilotLamps(materials, PATCHED, true));
    const first = levels(materials);
    let changed = false;
    for (let i = 0; i < 200 && !changed; i += 1) {
      vi.advanceTimersByTime(200);
      changed = levels(materials).some((v, k) => v !== first[k]);
    }
    expect(changed).toBe(true);
  });
});
