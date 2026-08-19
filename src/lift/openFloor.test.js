import { describe, expect, it } from 'vitest';
import { ACCEL_PHASE, CRUISE_PHASE, openFloor } from './ride.js';

// Which floor is open decides what gets lit, what gets furnished, and where the
// landing lamp points. Reading the settled deck index instead lit the floor we
// were leaving while we arrived somewhere dark — and it looked like a lighting
// bug rather than a bookkeeping one, which is why this is worth pinning down.
describe('the floor that is open to us', () => {
  it('is the one we are standing at, at rest', () => {
    expect(openFloor(null, 2)).toEqual({ floor: 2, closure: 0 });
  });

  it('is the floor we are leaving while its doors still are', () => {
    const early = openFloor({ from: 0, to: 3, p: ACCEL_PHASE / 2 }, 0);
    expect(early.floor).toBe(0);
    expect(early.closure).toBeGreaterThan(0);
    expect(early.closure).toBeLessThan(1);
  });

  it('is the floor we are arriving at once its doors start to open', () => {
    const late = openFloor({ from: 0, to: 3, p: ACCEL_PHASE + CRUISE_PHASE + 0.2 }, 0);
    expect(late.floor).toBe(3);
    expect(late.closure).toBeLessThan(1);
  });

  it('never reports a floor more open than it is', () => {
    for (let p = 0; p <= 1; p += 1 / 64) {
      const open = openFloor({ from: 1, to: 2, p }, 1);
      expect(open.closure).toBeGreaterThanOrEqual(0);
      expect(open.closure).toBeLessThanOrEqual(1);
      expect([1, 2]).toContain(open.floor);
    }
  });

  // mid-cruise both doors are shut, and it does not matter which is named as
  // long as the closure says "shut" — a light aimed at a sealed room is off
  it('reports everything shut through the cruise', () => {
    expect(openFloor({ from: 0, to: 3, p: ACCEL_PHASE + CRUISE_PHASE / 2 }, 0).closure).toBe(1);
  });
});
