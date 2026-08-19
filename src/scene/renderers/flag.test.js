import { describe, expect, it } from 'vitest';
import { rendererFrom } from './flag.js';

// The flag is one line of parsing, and it is worth a test for exactly one
// reason: it decides which of two whole scenes a visitor gets, and the failure
// mode of getting it wrong is a blank frame rather than an error. Anything it
// does not explicitly recognise has to come out as the CSS backend.
describe('the renderer flag', () => {
  it('only says r3f when asked precisely', () => {
    expect(rendererFrom('?renderer=r3f')).toBe('r3f');
    expect(rendererFrom('?debug&renderer=r3f')).toBe('r3f');
  });

  it('falls back to css for everything else', () => {
    for (const q of ['', '?', '?renderer=', '?renderer=css3d', '?renderer=R3F', '?renderer=webgl', '?render=r3f']) {
      expect(rendererFrom(q)).toBe('css3d');
    }
  });
});
