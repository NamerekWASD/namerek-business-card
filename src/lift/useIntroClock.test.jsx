// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import useIntroClock from './useIntroClock.js';
import { DOOR_TOTAL_MS, introClosure, introDim } from './intro.js';

// ── the arrival, for someone who cannot watch it ─────────────────────────────
// NBC-25. The intro is two pieces of motion at once: the leaves shudder and
// part, and the supply strikes and hunts before it holds. Both are exactly what
// `prefers-reduced-motion` names — an unasked-for movement and a flicker — and
// both are driven from this one clock, so stopping the clock at its end is the
// whole of the fix. The scene that results is the settled one: doors open,
// lamps up.

describe('the intro clock, held still', () => {
  const seen = [];
  function Probe({ instant }) {
    seen.push(useIntroClock(DOOR_TOTAL_MS, true, instant).t);
    return null;
  }

  it('lands on the settled scene without ever asking for a frame', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    seen.length = 0;
    render(<Probe instant />);
    expect(seen.at(-1)).toBe(DOOR_TOTAL_MS);
    // the leaves are open and the shaft is lit, which is where the intro ends
    expect(introClosure(seen.at(-1))).toBe(0);
    expect(introDim(seen.at(-1))).toBe(1);
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });

  it('still plays the whole thing for everyone else', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(1);
    seen.length = 0;
    render(<Probe instant={false} />);
    expect(seen.at(-1)).toBe(0);
    expect(raf).toHaveBeenCalled();
    raf.mockRestore();
  });
});
