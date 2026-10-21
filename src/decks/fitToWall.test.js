import { describe, expect, it } from 'vitest';
import { fitScale, MIN_FIT } from './fitToWall.js';

describe('fitScale', () => {
  it('leaves a column that fits its wall at full size', () => {
    expect(fitScale(600, 500)).toBe(1);
    expect(fitScale(500, 500)).toBe(1);
  });

  it('shrinks a column taller than its wall to exactly the wall', () => {
    expect(fitScale(450, 500)).toBeCloseTo(0.9);
  });

  it('never shrinks past the floor where the copy stops being legible', () => {
    expect(fitScale(100, 500)).toBe(MIN_FIT);
  });

  it('treats a column not laid out yet as fitting', () => {
    expect(fitScale(0, 0)).toBe(1);
    expect(fitScale(400, 0)).toBe(1);
    expect(fitScale(0, 400)).toBe(1);
  });
});
