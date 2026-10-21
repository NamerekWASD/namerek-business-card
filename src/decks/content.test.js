// The card's own copy, checked for the one thing hand-edited translations
// fail at silently: a locale missing from a fact that has some of the other
// three. `pick()` degrades a hole like that to English or German rather than
// `undefined`, which is exactly why a hole would otherwise go unnoticed.

import { describe, expect, it } from 'vitest';
import { LOCALES } from '../i18n/locale.js';
import { BRIEF, LOG, PERSON, SKILL_GROUPS } from './content.js';

const ids = LOCALES.map((l) => l.id);

function expectFullLocale(value, label) {
  for (const id of ids) {
    expect(value[id], `${label}.${id}`).toBeTruthy();
  }
}

describe('PERSON, in all four languages', () => {
  it('translates role, greeting, availability and city', () => {
    expectFullLocale(PERSON.role, 'role');
    expectFullLocale(PERSON.greeting, 'greeting');
    expectFullLocale(PERSON.availability, 'availability');
    expectFullLocale(PERSON.city, 'city');
  });

  it('translates the intro, line for line, in every locale', () => {
    for (const id of ids) {
      expect(PERSON.intro[id]?.length, `intro.${id}`).toBe(PERSON.intro.de.length);
    }
  });

  it('leaves the proper nouns and addresses untouched — not locale objects', () => {
    expect(typeof PERSON.given).toBe('string');
    expect(typeof PERSON.family).toBe('string');
    expect(typeof PERSON.email).toBe('string');
    expect(typeof PERSON.linkedin).toBe('string');
    expect(typeof PERSON.github).toBe('string');
  });
});

describe('the nameplate and the logbook, in all four languages', () => {
  it('translates every BRIEF row, label and value', () => {
    expect(BRIEF.length).toBeGreaterThan(0);
    for (const row of BRIEF) {
      expectFullLocale(row.label, `brief ${row.label.en}`);
      expectFullLocale(row.value, `brief ${row.label.en} value`);
    }
  });

  it('translates every LOG entry and stamps it with a plain year', () => {
    expect(LOG.length).toBeGreaterThan(0);
    for (const entry of LOG) {
      expect(entry.year).toMatch(/^\d{4}$/);
      expectFullLocale(entry.text, `log ${entry.year}`);
    }
  });

  it('keeps the logbook in order, oldest first', () => {
    const years = LOG.map((e) => Number(e.year));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe('SKILL_GROUPS labels', () => {
  it('translate every skill group label, and leave the tech line alone', () => {
    for (const group of SKILL_GROUPS) {
      expectFullLocale(group.label, `group ${group.tech}`);
      expect(typeof group.tech).toBe('string');
    }
  });
});
