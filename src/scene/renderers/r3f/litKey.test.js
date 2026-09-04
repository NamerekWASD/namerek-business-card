import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { litKey } from './Room.jsx';
import { MASK_KEYS } from './roomLights.js';

// Which lamps reach a surface, as arithmetic. It is three lines inside a
// traverse and it has been wrong twice, both times silently: an unbound mask is
// zeros and renders black, and a mask that says `both` where it meant one room
// renders a wash. Neither throws.
//
// NBC-74's last piece is the third case. The cage's floor deck stands in the
// shaft and is lit by the landing — genuinely only by the landing, because the
// shaft's fittings are bulkhead lamps in reflectors bolted to a wall behind it
// and a bare point light standing in for one puts its brightest patch in the
// corner nearest that wall, which is the opposite of what a lift standing at a
// lit landing looks like. Measured across the floor, left to right: the pendant
// alone lays 7/9/20/34/42/22/8, a pool centred on the doorway; with the shaft
// lamps on top it is 29/55/48/44/46/36/17, monotonic and brightest at the far
// left corner.

describe('which lamps reach a surface', () => {
  it('is the room it stands in, by default', () => {
    expect(litKey('shaft', undefined, undefined)).toBe('shaft');
    expect(litKey('landing', undefined, undefined)).toBe('landing');
  });

  it('is both, for a thing standing in the doorway', () => {
    expect(litKey('shaft', 'landing', undefined)).toBe('both');
    expect(litKey('landing', 'shaft', undefined)).toBe('both');
  });

  it('is one room, for a surface a wrapper hands to the other', () => {
    expect(litKey('shaft', undefined, 'landing')).toBe('landing');
    // and it wins over `alsoLit`, which the same subtree carries — the cage
    // floor is inside the cage's own `AlsoLit`
    expect(litKey('shaft', 'landing', 'landing')).toBe('landing');
  });

  it('ignores a room that is not one', () => {
    expect(litKey('shaft', 'kitchen', undefined)).toBe('shaft');
    expect(litKey('shaft', undefined, 'kitchen')).toBe('shaft');
  });

  it('only ever answers with a key the mask actually holds', () => {
    for (const room of ['shaft', 'landing']) {
      for (const also of [undefined, 'shaft', 'landing', 'kitchen']) {
        for (const only of [undefined, 'shaft', 'landing', 'kitchen']) {
          expect(MASK_KEYS).toContain(litKey(room, also, only));
        }
      }
    }
  });

  // The wrapper is the only way to say it. Said at a mesh instead it gets said
  // at fifteen call sites and forgotten at the sixteenth, which is the whole
  // reason `Room` works by traverse — see the note there.
  it('is asked for by a wrapper, in the one place that needs it', () => {
    expect(readFileSync('src/scene/r3f/NearScene.jsx', 'utf8')).toMatch(/<LitBy room="landing">/);
  });
});
