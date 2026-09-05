import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NBC-69, as a guard rather than as a review note.
//
// `surfaceProps()` returns **no map**. Spread straight onto a
// `<meshStandardMaterial>` it produces a rectangle of one flat colour, and that
// is what every fitting in this scene was: the bench's legs measured a
// luminance stddev of 2.3 out of 255, the door leaves — the largest surface
// anyone ever looks at here — were one tone end to end, and the valve rack was
// seven tones of the same nothing.
//
// The failure mode is that it is completely silent. Nothing throws, nothing
// warns, the surface simply has no grain on it, and the one place it shows up
// is a screenshot somebody eventually squints at. So the rule is mechanical:
// **a fitting in these files takes its material from a hook**, either
// `useFittingMaterial` for a single tone or `useFittingShades` for several.
//
// One exemption, deliberate and stated at its call site: a plane whose picture
// is its own bake — the cage's lattice sits on a flat albedo under an alpha
// map, see `Cage` in `NearScene`.

const FILES = [
  'src/scene/r3f/LandingProps.jsx',
  'src/scene/r3f/ShaftScene.jsx',
  'src/scene/r3f/NearScene.jsx',
];

/** Any call at all — a spread, or a `const` the JSX then spreads. */
const CALL = /surfaceProps\(/g;

/** The one place a flat albedo is still correct, counted so it cannot spread. */
const ALLOWED = new Map([['src/scene/r3f/NearScene.jsx', 1]]);

describe('no fitting is left as flat colour', () => {
  for (const file of FILES) {
    it(`${file} takes its fittings' materials from a bake`, () => {
      const src = readFileSync(file, 'utf8');
      // comments say the word too, so only real calls are counted
      const code = src.replace(/^\s*(\/\/|\*).*$/gm, '');
      const found = code.match(CALL)?.length ?? 0;
      expect(found).toBe(ALLOWED.get(file) ?? 0);
    });
  }

  // The other half of it: the hook has to actually be reached for. A file that
  // dropped every `surfaceProps` spread by hand-setting hexes instead would
  // pass the clause above and fail the room.
  it('reaches for the bake rather than hand-setting the metal', () => {
    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      expect(src).toMatch(/useFitting(Material|Shades)\(/);
    }
  });
});
