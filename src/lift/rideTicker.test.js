// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRideTicker } from './rideTicker.js';

// ── the cut ──────────────────────────────────────────────────────────────────
// NBC-25. A visitor who has asked for reduced motion still gets to change
// floors; what they do not get is the trip. `setInstant` is the whole of that
// on this side: no rAF is scheduled, no `ride` is ever published, and the one
// notification the subscribers receive already carries the destination.
//
// This is deliberately at the *ticker* rather than at the components it drives.
// The ride is one number and everything in the scene reads it — the shaft, the
// doors, the content column, the motion blur, the fittings' shading — so a
// half-measure that stilled the walls and left the doors folding through their
// phases would be two clocks again, which is the defect `rideMotion.test.jsx`
// exists to keep out.

describe('a ride with the motion taken out', () => {
  it('arrives on the frame it is asked, with no trip published', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    const ticker = createRideTicker();
    ticker.setInstant(true);

    const seen = [];
    ticker.subscribe((s) => seen.push(s));
    raf.mockClear();

    expect(ticker.startRide(3)).toBe(true);

    const now = ticker.getSnapshot();
    expect(now.deckIndex).toBe(3);
    expect(now.floorPos).toBe(3);
    expect(now.ride).toBe(null);
    expect(now.moving).toBe(false);
    expect(now.velocity).toBe(0);
    // Nothing that reads the ride ever sees a trip in progress, so nothing that
    // keys off one — the doors, the blur — has anything to play.
    expect(seen.some((s) => s.ride !== null)).toBe(false);
    expect(raf).not.toHaveBeenCalled();

    raf.mockRestore();
  });

  it('still tells its subscribers, so the scene is redrawn on the new floor', () => {
    const ticker = createRideTicker();
    ticker.setInstant(true);
    const seen = [];
    ticker.subscribe((s) => seen.push(s.deckIndex));
    ticker.startRide(2);
    expect(seen.at(-1)).toBe(2);
  });

  it('refuses a ride to the floor it is already on, exactly as a real one does', () => {
    const ticker = createRideTicker();
    ticker.setInstant(true);
    expect(ticker.startRide(0)).toBe(false);
  });

  it('gives the trip back when the preference is turned off again', () => {
    const ticker = createRideTicker();
    ticker.setInstant(true);
    ticker.startRide(1);
    ticker.setInstant(false);
    expect(ticker.startRide(3)).toBe(true);
    expect(ticker.getSnapshot().moving).toBe(true);
    ticker.dispose();
  });
});
