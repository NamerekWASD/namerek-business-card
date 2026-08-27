import { describe, expect, it } from 'vitest';
import { GALLERY, fitShot, shotBox } from './gallery.js';

// The one piece of arithmetic on the picture tube that can be wrong without
// looking wrong. The canvas is stretched onto the glass, so a rect drawn square
// here does not arrive square there — and a screenshot a few per cent out of
// proportion is the sort of fault nobody can name and everybody can feel.

const CANVAS_ASPECT = GALLERY.W / GALLERY.H;

/** What a rect drawn on the canvas actually measures on a glass of `aspect`. */
const onGlass = (r, aspect) => (r.w / GALLERY.W) / ((r.h / GALLERY.H) / aspect);

describe('fitting a shot to the glass', () => {
  const box = shotBox();

  it('lands a wide shot at its own proportions on the wall', () => {
    const r = fitShot(1600, 900, box, 0.82);
    expect(onGlass(r, 0.82)).toBeCloseTo(16 / 9, 4);
  });

  it('does the same for a tall one, and for a square', () => {
    expect(onGlass(fitShot(900, 1600, box, 0.82), 0.82)).toBeCloseTo(9 / 16, 4);
    expect(onGlass(fitShot(512, 512, box, 0.78), 0.78)).toBeCloseTo(1, 4);
  });

  it('holds across the range of glass the viewport actually produces', () => {
    // measured off `frameMetrics` between a 1280×800 and a 2560×1440 viewport
    for (const aspect of [0.77, 0.8, 0.82, 0.86]) {
      expect(onGlass(fitShot(1440, 900, box, aspect), aspect)).toBeCloseTo(1.6, 4);
    }
  });

  it('contains rather than covers — nothing is cropped', () => {
    for (const [iw, ih] of [[3000, 400], [400, 3000], [1600, 900], [1, 1]]) {
      const r = fitShot(iw, ih, box, 0.82);
      expect(r.w).toBeLessThanOrEqual(box.w + 1e-6);
      expect(r.h).toBeLessThanOrEqual(box.h + 1e-6);
      // and it fills one of the two, or it is not fitted at all
      const tight = Math.abs(r.w - box.w) < 1e-6 || Math.abs(r.h - box.h) < 1e-6;
      expect(tight).toBe(true);
    }
  });

  it('centres what is left over', () => {
    const r = fitShot(1600, 900, box, 0.82);
    expect(r.x + r.w / 2).toBeCloseTo(box.x + box.w / 2, 6);
    expect(r.y + r.h / 2).toBeCloseTo(box.y + box.h / 2, 6);
  });

  it('gives back the box rather than a NaN when the image has no size', () => {
    // an <img> that has not decoded yet reports 0×0, and a rect of NaN is a
    // picture that silently never draws
    expect(fitShot(0, 0, box, 0.82)).toEqual(box);
    expect(fitShot(100, 100, box, 0)).toEqual(box);
  });

  it('is the identity correction when the canvas already matches the glass', () => {
    const r = fitShot(300, 200, box, CANVAS_ASPECT);
    expect(r.w / r.h).toBeCloseTo(1.5, 6);
  });

  it('leaves the caption strip alone', () => {
    // the picture's box stops short of the bottom — that gap is where the shot
    // says which of the project's it is
    expect(box.y + box.h).toBeLessThan(GALLERY.H - box.x);
  });
});
