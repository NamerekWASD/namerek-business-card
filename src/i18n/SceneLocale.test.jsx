// @vitest-environment jsdom
//
// NBC-90. What the canvases are painted in, and when that is allowed to change.
// The rule this pins down is the one Mykolai set: a repaint never happens in
// front of the visitor. It happens behind shut doors, or — for someone who
// asked for no motion — on the spot, because there is nothing to hide it
// behind and nothing that needs hiding.

import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useLocaleCycle } from './SceneLocale.jsx';

afterEach(cleanup);

// The lift, as this hook sees it: a closure, a moving flag, and a request.
//
// `cycle()` publishes the trip the moment it is granted — that is what the real
// ticker does, synchronously, inside the same batch — so the *next* render
// carries `moving: true` whether or not the test says so. Everything after that
// is up to the test: how many renders land inside the trip, and at what
// closures.
function bench({ granted = true } = {}) {
  const lift = {
    closure: 0,
    moving: false,
    cycle: null,
  };
  lift.cycle = vi.fn(() => {
    if (!granted) return false;
    lift.moving = true;
    return true;
  });
  return lift;
}

/** The frame the lift is in now, as a fresh props object. */
const at = (lift, frame) => ({ ...lift, ...frame });

const run = (lift, locale = 'de') => renderHook(
  ({ locale: l, lift: f }) => useLocaleCycle(l, f),
  { initialProps: { locale, lift } },
);

describe('the painted locale', () => {
  it('starts as the chosen one — the first paint is not a change', () => {
    const { result } = run(bench(), 'uk');
    expect(result.current).toBe('uk');
  });

  it('asks for a door cycle when the language changes, and does not repaint yet', () => {
    const lift = bench();
    const { result, rerender } = run(lift);

    rerender({ locale: 'ru', lift });
    expect(lift.cycle).toHaveBeenCalledTimes(1);
    // The doors have only just started shutting. Whatever is on the glass is
    // still the language it was painted in.
    rerender({ locale: 'ru', lift: at(lift, { moving: true, closure: 0.1 }) });
    expect(result.current).toBe('de');
  });

  it('repaints only once the leaves are fully shut', () => {
    const lift = bench();
    const { result, rerender } = run(lift);
    rerender({ locale: 'ru', lift });

    rerender({ locale: 'ru', lift: at(lift, { moving: true, closure: 0.6 }) });
    expect(result.current).toBe('de');
    rerender({ locale: 'ru', lift: at(lift, { moving: true, closure: 0.999 }) });
    expect(result.current).toBe('de');

    rerender({ locale: 'ru', lift: at(lift, { moving: true, closure: 1 }) });
    expect(result.current).toBe('ru');
  });

  it('changes on the spot when no cycle is granted — reduced motion', () => {
    const lift = bench({ granted: false });
    const { result, rerender } = run(lift);
    rerender({ locale: 'uk', lift });
    expect(result.current).toBe('uk');
  });

  it('waits for a trip it did not ask for rather than repainting mid-flight', () => {
    const lift = bench();
    lift.moving = true;
    lift.closure = 1;
    const { result, rerender } = run(lift);

    rerender({ locale: 'en', lift });
    expect(lift.cycle).not.toHaveBeenCalled();
    // The doors of the floor being left are shut — and this is not our cycle,
    // so that means nothing. Repainting here would redraw the landing the
    // cabin is about to arrive at.
    expect(result.current).toBe('de');

    const arrived = at(lift, { moving: false, closure: 0 });
    rerender({ locale: 'en', lift: arrived });
    expect(arrived.cycle).toHaveBeenCalledTimes(1);
  });

  it('asks for one cycle per change, not one per frame', () => {
    const lift = bench();
    const { rerender } = run(lift);
    rerender({ locale: 'ru', lift });
    for (const closure of [0.2, 0.5, 0.8]) {
      rerender({ locale: 'ru', lift: at(lift, { moving: true, closure }) });
    }
    expect(lift.cycle).toHaveBeenCalledTimes(1);
  });

  it('can be changed again after the doors have opened', () => {
    const lift = bench();
    const { result, rerender } = run(lift);

    rerender({ locale: 'ru', lift });
    rerender({ locale: 'ru', lift: at(lift, { moving: true, closure: 1 }) });
    rerender({ locale: 'ru', lift: at(lift, { moving: false, closure: 0 }) });
    expect(result.current).toBe('ru');

    lift.moving = false;
    rerender({ locale: 'uk', lift: at(lift, { moving: false, closure: 0 }) });
    expect(lift.cycle).toHaveBeenCalledTimes(2);
    rerender({ locale: 'uk', lift: at(lift, { moving: true, closure: 1 }) });
    expect(result.current).toBe('uk');
  });
});

// ── the frame that never came ───────────────────────────────────────────────
// The first build of this waited for a render to land while the doors were
// shut, and a browser that has decided nobody is looking hands out one frame a
// second: the whole 760ms cycle then passes between two renders, the swap never
// fires, the request is dropped when the trip ends and the next render asks for
// another set of doors. Measured in a throttled tab as a lift cycling its doors
// for ever with the language switch dead for as long as it did.
describe('when no render lands while the doors are shut', () => {
  it('repaints when the cycle ends rather than waiting for a closure that has been and gone', () => {
    const lift = bench();
    const { result, rerender } = run(lift);

    rerender({ locale: 'uk', lift });
    // one render at the top of the trip, and the next one after it is over
    rerender({ locale: 'uk', lift: at(lift, { moving: true, closure: 0 }) });
    rerender({ locale: 'uk', lift: at(lift, { moving: false, closure: 0 }) });

    expect(result.current).toBe('uk');
    expect(lift.cycle).toHaveBeenCalledTimes(1);
  });

  it('never asks for a second set of doors for one change', () => {
    const lift = bench();
    const { rerender } = run(lift);
    rerender({ locale: 'uk', lift });
    for (const frame of [{ moving: true, closure: 0 }, { moving: false, closure: 0 }, { moving: false, closure: 0 }]) {
      rerender({ locale: 'uk', lift: at(lift, frame) });
    }
    expect(lift.cycle).toHaveBeenCalledTimes(1);
  });
});
