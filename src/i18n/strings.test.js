// The interface chrome that is not "the card's own copy" — `content.js` and
// `projects.js` own that — but still text a visitor reads: rail labels, the
// dispatch-desk form, the archive's empty state. Two things break silently
// here: a key present in German and quietly missing in one of the other
// three (NBC-85's "Готово когда: все четыре языка полны"), and a template
// whose `{placeholder}` survives into what a visitor actually sees because a
// variable was never passed.

import { describe, expect, it } from 'vitest';
import { LOCALES } from './locale.js';
import { STRINGS, t } from './strings.js';

describe('dictionary completeness', () => {
  it('gives every key a non-empty string for all four locales', () => {
    const locales = LOCALES.map((l) => l.id);
    for (const [key, entry] of Object.entries(STRINGS)) {
      for (const locale of locales) {
        expect(entry[locale], `${key}.${locale}`).toBeTruthy();
        expect(typeof entry[locale], `${key}.${locale}`).toBe('string');
      }
    }
  });
});

describe('t()', () => {
  it('resolves a key for the active locale', () => {
    expect(t('rail.title', 'de')).toBe(STRINGS['rail.title'].de);
    expect(t('rail.title', 'ru')).toBe(STRINGS['rail.title'].ru);
  });

  it('fills a template from the vars it is given', () => {
    expect(t('floorProjekte.shotOf', 'en', { shot: 2, shots: 5 }))
      .toBe('Shot 2 of 5');
  });

  it('leaves an unfilled placeholder visible rather than throwing', () => {
    expect(t('floorProjekte.shotOf', 'en')).toContain('{shot}');
  });
});
