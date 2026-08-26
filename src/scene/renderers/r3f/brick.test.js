import { describe, expect, it } from 'vitest';
import { BOND } from './brick.js';
import { LIGHT_SETUP } from './lightSetup.js';
import { SURFACES } from '../../model/materials.js';
import { DOORWAY_H_FRAC, LANDING_CEILING_RISE_FRAC, pxPerM } from '../../model/geometry.js';

// The painting itself cannot be tested here — there is no 2D canvas under
// jsdom, which is exactly why `brickCanvas()` hands back `null` there. What can
// be tested is the thing that actually goes wrong: the arithmetic that decides
// how big a brick ends up in the room. It is spread across three files (the
// bond here, `scale` in the catalogue, `grainScale` on the bench) and any one of
// them moving on its own turns the wall into a wall of tiles.
//
// The brick dresses `backWall` — the blind wall at the end of the shaft, which
// is the building itself. The two corridor walls are its steel lining; see
// `plate.test.js`.

const vh = 900;

/** The tile's size in scene pixels, as the material pipeline computes it. */
const tilePx = (s) => s.scale * LIGHT_SETUP.grainScale;

describe('the bond', () => {
  // Two courses is the whole period of a stretcher bond. An odd count puts two
  // identically-offset courses against each other across the tile's own seam,
  // and the wall visibly comes apart along a horizontal line every tile.
  it('closes on itself vertically', () => {
    expect(BOND.ROWS % 2).toBe(0);
  });

  // The unit is deliberately a third over life size — see the note at the top
  // of `brick.js` — but its *proportion* is a brick's, and that is the half the
  // eye actually checks. 215 × 65 mm is a brick; a square is a tile and a 2:1 is
  // a block, and nobody has to be told which they are looking at.
  it('lays a brick, not a block', () => {
    const length = BOND.TILE / BOND.COLS - BOND.JOINT;
    const height = BOND.TILE / BOND.ROWS - BOND.JOINT;
    expect(length / height).toBeCloseTo(215 / 65, 1);
  });
});

describe('the wall at the end of the shaft', () => {
  it('is the brick one', () => {
    expect(SURFACES.backWall.tile).toBe('brick');
  });

  // The one that matters. `scale` is stated in scene pixels, the bench scales
  // it, and the room's own metre comes off the doorway — so this is the only
  // place the three meet and the only place a wrong one shows up as a number
  // rather than as "the brick looks a bit big".
  it('lands its tile on 1.2 m, so a course is a course', () => {
    const m = pxPerM(vh);
    expect(tilePx(SURFACES.backWall) / m).toBeCloseTo(BOND.TILE_M, 1);
    expect(tilePx(SURFACES.backWall) / BOND.ROWS / m).toBeCloseTo(0.1, 2);
    expect(tilePx(SURFACES.backWall) / BOND.COLS / m).toBeCloseTo(0.3, 2);
  });

  // For a painted tile `tex` is contrast about the picture's own mean, and the
  // bench multiplies a wall's by `grainWall` — so the product is what says "the
  // brick as authored". Well under one is a wall going out of focus; well over
  // is mortar crushed to black.
  it('carries the painting at about the strength it was painted', () => {
    const strength = SURFACES.backWall.tex * LIGHT_SETUP.grainWall;
    expect(strength).toBeGreaterThan(0.8);
    expect(strength).toBeLessThan(1.2);
  });

  // He asked for the red to come down, and "less saturated at the same
  // luminance" is a thing that is easy to say and easy to undo by eye later.
  // The map is a multiplier normalised to a neutral mean, so this hex is the
  // whole of the wall's colour.
  it('is brick red rather than a fire engine', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(SURFACES.backWall.from.slice(i, i + 2), 16));
    expect(g / r).toBeGreaterThan(0.55); // below this it stops being masonry
    expect(g / r).toBeLessThan(0.75);    // above it, it stops being red
    expect(b).toBeLessThan(g);           // warm, like every other hex in the file
  });

  // `pxPerM` is derived from the doorway, so a change to the opening moves the
  // brick. Stated here so the failure names the cause.
  it('takes its metre from the opening', () => {
    expect(pxPerM(vh)).toBeCloseTo((vh * (DOORWAY_H_FRAC + LANDING_CEILING_RISE_FRAC)) / 3.05, 5);
  });
});
