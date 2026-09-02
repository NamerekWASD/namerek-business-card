import { describe, expect, it } from 'vitest';
import { SURFACES } from '../../model/materials.js';
import { surfaceColor, surfaceProps } from './surfaceMaterial.js';
import { shadeProps } from './useSurfaceMaterial.js';

// NBC-69. Every fitting in the landing was a raw `surfaceProps()` spread — no
// map, no roughness field, a flat rectangle of one colour. The fix is one bake
// per surface per component and the tint applied over it, and the only thing
// that can go silently wrong is the tint: `surfaceProps` multiplies the
// catalogue colour by `shade` *and* by the grain's own gain, and re-deriving
// that by hand is how a re-shaded fitting ends up a different colour from the
// one it replaced.

describe('shading a fitting that already carries its grain', () => {
  const s = SURFACES.iron;

  it('is exactly what surfaceProps would have produced, untextured', () => {
    const base = surfaceProps(s, 1);
    for (const shade of [0.4, 0.85, 1, 1.55]) {
      const want = surfaceProps(s, shade);
      const got = shadeProps(base, shade);
      expect(got.color.r).toBeCloseTo(want.color.r, 6);
      expect(got.color.g).toBeCloseTo(want.color.g, 6);
      expect(got.color.b).toBeCloseTo(want.color.b, 6);
    }
  });

  // The gain is what stops a grain darkening the surface it is on, and it is
  // applied to the base colour once. Shading must scale the *lifted* colour,
  // not the catalogue's.
  it('keeps the grain gain the base colour was lifted by', () => {
    const map = { userData: { gain: 1.6 } };
    const base = surfaceProps(s, 1, /** @type {never} */ (map));
    const got = shadeProps(base, 0.5);
    expect(got.color.r).toBeCloseTo(surfaceColor(s, 0.5).r * 1.6, 6);
    expect(got.map).toBe(map);
  });

  it('hands the same object back at full shade rather than cloning for nothing', () => {
    const base = surfaceProps(s, 1);
    expect(shadeProps(base, 1)).toBe(base);
  });

  it('never writes through to the material it was shaded from', () => {
    const base = surfaceProps(s, 1);
    const before = base.color.r;
    shadeProps(base, 0.2);
    shadeProps(base, 1.9);
    expect(base.color.r).toBe(before);
  });

  it('carries the roughness field and its lifted roughness across unchanged', () => {
    const rough = { userData: { gain: 1.4 } };
    const base = surfaceProps(s, 1, null, /** @type {never} */ (rough));
    const got = shadeProps(base, 0.6);
    expect(got.roughnessMap).toBe(rough);
    expect(got.roughness).toBe(base.roughness);
    expect(got.metalness).toBe(base.metalness);
  });
});
