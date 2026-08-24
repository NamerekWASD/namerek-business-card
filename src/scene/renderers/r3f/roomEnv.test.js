import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { envTexel } from './roomEnv.js';

// The painted environment is the only thing a metal in this scene has to
// reflect, so what it looks like *is* what every metallic surface looks like.
// None of that needs a GPU: the convolution is three's, and the picture being
// convolved is this function.

const WHITE = new Color('#ffffff');
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// far side of the sphere from either lamp, so these read the gradient alone
const AWAY = { shaft: 0.7, landing: 0.12 };

describe('the gradient', () => {
  for (const room of ['shaft', 'landing']) {
    it(`gives ${room} a lit band between a dark ceiling and a darker floor`, () => {
      const u = AWAY[room];
      const ceiling = luma(envTexel(room, WHITE, u, 0.02));
      const band = luma(envTexel(room, WHITE, u, 0.5));
      const floor = luma(envTexel(room, WHITE, u, 0.98));
      expect(band).toBeGreaterThan(ceiling);
      expect(ceiling).toBeGreaterThan(floor);
    });
  }

  // The whole point of the map is a *narrow bright run* along an edge, which is
  // what the reference render's bronze is made of. A gradient alone gives a
  // wash; the run needs something small and much brighter than everything else.
  it('puts a hot spot well above the band it sits in', () => {
    const spot = luma(envTexel('shaft', WHITE, 0.2, 0.44));
    const band = luma(envTexel('shaft', WHITE, 0.7, 0.44));
    expect(spot).toBeGreaterThan(band * 4);
  });

  it('hangs the two rooms lamps in different places', () => {
    const here = luma(envTexel('shaft', WHITE, 0.2, 0.44));
    const there = luma(envTexel('landing', WHITE, 0.2, 0.44));
    expect(here).toBeGreaterThan(there * 3);
  });

  // Longitudes converge at the poles, so a disc drawn in plain uv comes out as
  // a horizontal smear — and a smeared highlight is exactly what a reflection
  // must not look like. This is the check that the latitude correction is in.
  it('draws a lamp that is round on the sphere rather than in the texture', () => {
    const { r, u, v } = { r: 0.09, u: 0.2, v: 0.44 };
    const phi = (0.5 - v) * Math.PI;
    // the gradient underneath is not the same at two different heights, so
    // each sample has its own band subtracted and only the lamp is compared
    const spot = (du, dv) => luma(envTexel('shaft', WHITE, u + du, v + dv))
      - luma(envTexel('shaft', WHITE, u + 0.5, v + dv));
    const across = spot(r / (2 * Math.PI * Math.cos(phi)), 0);
    const down = spot(0, r / Math.PI);
    expect(across).toBeCloseTo(down, 5);
  });

  // The knob is a colour, and it has to behave like one: the room's light
  // scales the whole sphere and never bends its hue.
  it('tints the whole sphere by the room colour and nothing else', () => {
    const warm = new Color('#ffc286');
    for (const v of [0.1, 0.44, 0.5, 0.9]) {
      const [r, g, b] = envTexel('shaft', warm, 0.2, v);
      const white = envTexel('shaft', WHITE, 0.2, v);
      expect(r / white[0]).toBeCloseTo(warm.r, 5);
      expect(g / white[1]).toBeCloseTo(warm.g, 5);
      expect(b / white[2]).toBeCloseTo(warm.b, 5);
    }
  });

  it('never goes negative anywhere on the sphere', () => {
    for (let i = 0; i <= 40; i += 1) {
      for (let j = 0; j <= 40; j += 1) {
        const t = envTexel('landing', WHITE, i / 40, j / 40);
        expect(Math.min(...t)).toBeGreaterThan(0);
      }
    }
  });
});
