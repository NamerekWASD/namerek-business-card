import { describe, expect, it } from 'vitest';
import { PLATING } from './plate.js';
import { BOND } from './brick.js';
import { LIGHT_SETUP } from './lightSetup.js';
import { SURFACES } from '../../model/materials.js';
import { pxPerM } from '../../model/geometry.js';

// Same job as `brick.test.js`, for the shaft's other material: the painting
// cannot be checked without a canvas, but the arithmetic that decides how big a
// plate ends up in the room can, and it is the half that goes wrong silently.

const vh = 900;
const tilePx = (s) => s.scale * LIGHT_SETUP.grainScale;

describe('the plating', () => {
  // An unbroken vertical joint through a whole wall is a hinge, not a wall — so
  // the courses stagger, and a stagger closes after two. An odd count puts two
  // identically-offset courses against each other across the tile's own seam.
  it('staggers, and the stagger closes', () => {
    expect(PLATING.ROWS % 2).toBe(0);
  });

  // A plate is something two people carried up a shaft. 1.2 × 0.6 m is that; a
  // wall of 4 m sheets is a different building and a different century.
  it('lays a plate a person could have lifted', () => {
    const m = pxPerM(vh);
    const wide = tilePx(SURFACES.shaftWall) / m;
    expect(wide).toBeCloseTo(PLATING.TILE_M, 1);
    expect(wide / PLATING.ROWS).toBeCloseTo(0.6, 1);
  });

  it('is the plated one', () => {
    expect(SURFACES.shaftWall.tile).toBe('plate');
  });

  // The corridor walls and the wall they run into are different materials on
  // purpose — steel lining inside a brick building — but they are in the *same
  // room*, and a seam and a course measured against two different metres is the
  // sort of thing nobody consciously notices and everybody feels.
  it('is authored to the same metre as the brick it runs into', () => {
    expect(SURFACES.shaftWall.scale).toBe(SURFACES.backWall.scale);
    expect(PLATING.TILE_M).toBe(BOND.TILE_M);
  });

  // Painted tile, so `tex` is contrast about the picture's own mean and the
  // bench multiplies a wall's by `grainWall`. Under one the rivets go soft,
  // which is the whole reason the wall is steel.
  it('carries the painting at about the strength it was painted', () => {
    const strength = SURFACES.shaftWall.tex * LIGHT_SETUP.grainWall;
    expect(strength).toBeGreaterThan(0.8);
    expect(strength).toBeLessThan(1.2);
  });

  // Steel, not masonry: it has to have something to reflect or the environment
  // map has nothing to do and the wall goes back to being a flat rectangle.
  it('is metal enough to catch the room', () => {
    expect(SURFACES.shaftWall.metal).toBeGreaterThan(SURFACES.backWall.metal);
    expect(SURFACES.shaftWall.rough).toBeLessThan(SURFACES.backWall.rough);
  });
});
