import { describe, expect, it } from 'vitest';
import { SURFACES } from '../../model/materials.js';
import { surfaceProps } from './surfaceMaterial.js';

// `roughnessMap` multiplies, so it can only ever make a surface shinier than
// the catalogue says it is. The bake measures its own mean and hands back the
// gain that puts it back — and getting that wrong is invisible in code review
// and obvious on screen only as "everything went glossy".

const field = (gain) => ({ userData: { gain } });

describe('a roughness field', () => {
  it('lifts the catalogue roughness by the bake own gain', () => {
    const s = SURFACES.cabinetBronze; // rough 0.38, the most headroom in the file
    expect(surfaceProps(s, 1, null, field(1.4)).roughness).toBeCloseTo(0.38 * 1.4, 5);
  });

  it('leaves roughness alone when there is no field', () => {
    const s = SURFACES.cabinetBronze;
    expect(surfaceProps(s).roughness).toBeCloseTo(s.rough, 5);
    expect(surfaceProps(s).roughnessMap).toBeUndefined();
  });

  // A wall is already at 0.92 and there is nowhere for it to go. The clamp is
  // what keeps that from arriving as a roughness of 1.3, which three does not
  // reject and does not honour either.
  it('clamps rather than reporting a roughness past one', () => {
    expect(surfaceProps(SURFACES.shaftWall, 1, null, field(2)).roughness).toBe(1);
  });

  it('carries the field through to the material', () => {
    const f = field(1.2);
    expect(surfaceProps(SURFACES.iron, 1, null, f).roughnessMap).toBe(f);
  });
});
