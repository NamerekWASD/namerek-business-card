import { describe, expect, it } from 'vitest';
import { SURFACES, scaleChannels, shadedRgb, shadedRgba } from '../scene/model/materials.js';
import { ironFace, surfaceStyle } from './surfaceStyle.js';

describe('colour maths', () => {
  it('scales each channel and clamps to a byte', () => {
    expect(scaleChannels('#443626', 1)).toEqual([0x44, 0x36, 0x26]);
    expect(scaleChannels('#443626', 0)).toEqual([0, 0, 0]);
    expect(scaleChannels('#ffffff', 4)).toEqual([255, 255, 255]);
  });

  it('formats as CSS a browser and a 3D renderer both accept', () => {
    expect(shadedRgb('#443626')).toBe('rgb(68, 54, 38)');
    expect(shadedRgba('#443626', 0.5)).toBe('rgba(68, 54, 38, 0.5)');
  });
});

describe('surfaceStyle', () => {
  // Golden strings. These are the cheapest possible proof that a refactor which
  // only moved code really only moved code: if the picture is going to change,
  // it changes here first, because every large plane in the scene is painted
  // through this one function.
  it('paints the iron fittings exactly as before the split', () => {
    const style = surfaceStyle(SURFACES.iron, 1);
    // The tile resolves to a different URL in dev, in a build and under the test
    // runner, so the asset path is the one part that is checked by shape rather
    // than by value. Everything else is pinned.
    expect(style.backgroundImage).toBe(
      'linear-gradient(rgba(42, 28, 16, 0.7), rgba(42, 28, 16, 0.7)), '
      + 'linear-gradient(180deg, rgb(85, 57, 32), rgb(42, 28, 16)), '
      + `url(${SURFACES.iron.tile && style.backgroundImage.match(/url\((.*)\)$/)[1]})`,
    );
    expect(style.backgroundImage).toMatch(/url\(.*rust-brass.*\)$/);
    expect(style.backgroundSize).toBe('auto, auto, 70px 70px');
    expect(style.backgroundBlendMode).toBe('normal, multiply, multiply');
  });

  it('washes the tile back by exactly (1 - tex)', () => {
    // `tex` is a real scalar — 1 is the raw tile, 0 is flat colour — and it is
    // implemented as a flat coat of the surface's own shadow colour laid back
    // over the texture. Blend modes alone only ever give two or three fixed
    // strengths, so this arithmetic is the whole feature.
    const style = surfaceStyle({ from: '#ffffff', to: '#000000', tile: 'rust', scale: 10, tex: 0.25 });
    expect(style.backgroundImage).toContain('rgba(0, 0, 0, 0.75)');
  });

  it('folds the shade into the colour stops rather than filtering the element', () => {
    // Not a preference. A `filter` puts its element in its own rasterisation
    // buffer and forces transform-style to flat — which is the trap that
    // quietly flattened the counterweight and the landing props for weeks.
    const lit = surfaceStyle(SURFACES.iron, 1.5);
    const dark = surfaceStyle(SURFACES.iron, 0.5);
    expect(lit.backgroundImage).not.toBe(dark.backgroundImage);
    expect(lit.filter).toBeUndefined();
    expect(dark.filter).toBeUndefined();
    expect(lit.backgroundImage).toContain('rgb(128, 86, 48)'); // 0x55,0x39,0x20 × 1.5
  });

  it('drops to a plain gradient when a surface carries no texture', () => {
    const flat = surfaceStyle({ from: '#ffffff', to: '#000000', tile: 'none', scale: 10, tex: 0 });
    expect(flat).toEqual({ backgroundImage: 'linear-gradient(180deg, rgb(255, 255, 255), rgb(0, 0, 0))' });
    expect(flat.backgroundBlendMode).toBeUndefined();
  });

  it('lets the tile scale be overridden without touching the catalogue', () => {
    expect(ironFace(40).backgroundSize).toBe('auto, auto, 40px 40px');
    expect(SURFACES.iron.scale).toBe(70);
  });
});
