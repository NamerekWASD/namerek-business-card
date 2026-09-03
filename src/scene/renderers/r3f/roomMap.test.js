import { describe, expect, it, vi } from 'vitest';
import { claimMap } from './Room.jsx';

// The component is not what this file is about, and mounting it wants a canvas.
vi.mock('@react-three/fiber', () => ({ useThree: () => null }));

// NBC-76, the half of it that is not about windows.
//
// **Assigning a texture to a material is not telling three about it.** three
// keys its shader programs on which maps a material carries and only re-reads
// that when `needsUpdate` says to; R3F writes a changed prop straight onto the
// material and never raises the flag. Every grain in this scene comes from an
// asynchronous bake and lands a commit or two after the material was made, so
// without something raising it the texture sits on the object and never reaches
// the shader.
//
// It is silent both ways round, which is why it went unnoticed through NBC-69:
// the surface simply has no grain on it, and whether it does or not comes down
// to whether the bake happened to land before the material's first draw. That
// is also where the last door hitch came from — a material born after the bakes
// wants a program its flat twin never linked, and pays for it on the frame it
// is first seen, which in this scene is the frame a door opens.
//
// Measured before the fix, live, on 2026-09-03: 42 materials across the two
// canvases carrying a `map` whose own compiled program had no `USE_MAP` in it,
// every one of them self-lit — the astragals, the pendant's stem and globe. The
// rest were being rescued by accident, by the `emissiveMap` assignment further
// down the same traverse, which raises the flag for its own reasons and only
// runs for materials that are *not* self-lit.
describe('claimMap', () => {
  /** @param {unknown} [map] */
  const material = (map) => ({ map: map ?? null, needsUpdate: false, userData: {} });

  it('raises the flag when a bake lands on a material that has already compiled', () => {
    const m = material();
    claimMap(m);
    m.needsUpdate = false;

    m.map = { grain: true };
    expect(claimMap(m)).toBe(true);
    expect(m.needsUpdate).toBe(true);
  });

  // The traverse runs on every commit, and this scene commits often. A flag
  // raised on every pass is every shader in the room relinked on every pass —
  // the failure the `emissiveMap` assignment below it already carries a guard
  // against, and the reason this one is written as a comparison rather than an
  // assignment.
  it('leaves it alone while the map is the one the shader was built with', () => {
    const grain = { grain: true };
    const m = material(grain);
    claimMap(m);
    m.needsUpdate = false;

    expect(claimMap(m)).toBe(false);
    expect(claimMap(m)).toBe(false);
    expect(m.needsUpdate).toBe(false);
  });

  // A self-lit material — a lamp's glass, the astragal, the marquee — returns
  // from the traverse before it reaches the `emissiveMap` assignment. That is
  // correct and it stays; this is why the flag is raised above the return
  // rather than beside it.
  it('does not care whether the material is self-lit', () => {
    const m = material();
    m.userData.selfLit = true;
    claimMap(m);
    m.needsUpdate = false;

    m.map = { grain: true };
    expect(claimMap(m)).toBe(true);
    expect(m.needsUpdate).toBe(true);
  });

  // A bench that re-bakes at a different grain hands back a different texture,
  // and a texture swapped for another is the same problem as one arriving from
  // nothing: same program key, different picture, and three has to be told.
  it('follows a map that is replaced rather than only one that arrives', () => {
    const m = material({ grain: 1 });
    claimMap(m);
    m.needsUpdate = false;

    m.map = { grain: 2 };
    expect(claimMap(m)).toBe(true);
    expect(m.needsUpdate).toBe(true);
  });
});
