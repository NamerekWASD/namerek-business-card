import { describe, expect, it } from 'vitest';
import { fitFont, stencil } from './canvasText.js';
import { STRINGS } from '../../../i18n/strings.js';

const FONT = (size) => `${size}px monospace`;

// jsdom has no 2D context at all (no `canvas` package in this project — see the
// other painter tests, which all check arithmetic rather than pixels), so the
// measurement is stubbed: half a unit of width per character per point of size,
// which is close enough to a monospace face for the arithmetic below and exact
// enough to assert on.
const ctx = () => ({
  font: '',
  measureText(text) {
    const size = parseFloat(this.font) || 0;
    return { width: text.length * size * 0.5 };
  },
});

describe('fitFont', () => {
  it('leaves a string that already fits at the size it was designed at', () => {
    const c = ctx();
    expect(fitFont(c, 'AB', 10_000, 40, FONT)).toBe(40);
  });

  it('comes down until the string fits', () => {
    const c = ctx();
    const wide = 'X'.repeat(20);
    const size = fitFont(c, wide, 120, 40, FONT, 1);
    expect(c.measureText(wide).width).toBeLessThanOrEqual(120);
    expect(size).toBe(12);
  });

  it('stops at the floor rather than shrinking into a smudge', () => {
    const c = ctx();
    expect(fitFont(c, 'X'.repeat(400), 4, 40, FONT, 30)).toBe(30);
  });
});

describe('stencil', () => {
  it('passes a product name through untranslated', () => {
    expect(stencil('EF CORE', 'uk')).toBe('EF CORE');
  });

  it('resolves a key into the language asked for', () => {
    expect(stencil({ key: 'screen.flow.database' }, 'ru'))
      .toBe(STRINGS['screen.flow.database'].ru);
  });
});
