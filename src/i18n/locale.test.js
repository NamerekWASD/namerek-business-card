// @vitest-environment jsdom
//
// The rule the switcher rests on: which language a visitor gets before they
// have touched anything. Browser first, English when the browser asks for
// something the card does not speak, and an explicit choice over both — the
// three cases that decide what a first-time visitor sees, and the one case
// (storage that throws) that would otherwise take the root down with it.

import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, chooseLocale, pick, rememberLocale, storedLocale } from './locale.js';

const store = (value) => ({
  getItem: vi.fn(() => value),
  setItem: vi.fn(),
});

const hostile = {
  getItem: () => { throw new Error('site data blocked'); },
  setItem: () => { throw new Error('site data blocked'); },
};

describe('choosing a locale', () => {
  it('speaks four languages and falls back to English', () => {
    expect(LOCALES.map((l) => l.id)).toEqual(['de', 'en', 'uk', 'ru']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(chooseLocale({ storage: null, languages: [] })).toBe('en');
  });

  it('reads the browser without caring about the region', () => {
    expect(chooseLocale({ storage: null, languages: ['de-AT'] })).toBe('de');
    expect(chooseLocale({ storage: null, languages: ['uk-UA'] })).toBe('uk');
    expect(chooseLocale({ storage: null, languages: ['RU-ru'] })).toBe('ru');
  });

  it('walks down the browser list past languages the card does not speak', () => {
    expect(chooseLocale({ storage: null, languages: ['pl', 'cs', 'de'] })).toBe('de');
    expect(chooseLocale({ storage: null, languages: ['pl', 'cs'] })).toBe('en');
  });

  it('lets a written-down choice win over the browser', () => {
    expect(chooseLocale({ storage: store('ru'), languages: ['de'] })).toBe('ru');
  });

  it('ignores a stored value that is not one of the four', () => {
    expect(storedLocale(store('klingon'))).toBe(null);
    expect(chooseLocale({ storage: store('klingon'), languages: ['de'] })).toBe('de');
  });

  it('survives storage that throws rather than storage that is empty', () => {
    expect(() => storedLocale(hostile)).not.toThrow();
    expect(chooseLocale({ storage: hostile, languages: ['de'] })).toBe('de');
    expect(() => rememberLocale('de', hostile)).not.toThrow();
  });

  it('writes a choice down, and only a real one', () => {
    const good = store(null);
    rememberLocale('uk', good);
    expect(good.setItem).toHaveBeenCalledWith('namerek:lang', 'uk');
    const bad = store(null);
    rememberLocale('klingon', bad);
    expect(bad.setItem).not.toHaveBeenCalled();
  });
});

describe('picking a value for a locale', () => {
  // The one thing `content.js` and `projects.js` needed to grow translated
  // fields without splitting into two shapes: a proper noun stays a plain
  // string, a translated fact becomes `{ de, en, uk, ru }`, and both pass
  // through the same function.
  const map = { de: 'Hallo', en: 'Hello', uk: 'Привіт', ru: 'Привет' };

  it('reads the entry for the active locale', () => {
    expect(pick(map, 'ru')).toBe('Привет');
    expect(pick(map, 'de')).toBe('Hallo');
  });

  it('passes a plain value through untouched, for facts that are not translated', () => {
    expect(pick('Duisburg', 'ru')).toBe('Duisburg');
    expect(pick(42, 'en')).toBe(42);
    expect(pick(null, 'en')).toBe(null);
  });

  it('falls back to English and then German rather than returning undefined', () => {
    expect(pick({ de: 'Hallo', en: 'Hello' }, 'ru')).toBe('Hello');
    expect(pick({ de: 'Hallo' }, 'ru')).toBe('Hallo');
  });

  it('picks inside an array-valued fact by locale, not the array itself', () => {
    const intro = { de: ['Satz eins.'], en: ['Sentence one.'] };
    expect(pick(intro, 'en')).toEqual(['Sentence one.']);
  });
});
