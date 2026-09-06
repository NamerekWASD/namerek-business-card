// @vitest-environment jsdom
//
// The flat card's counterpart to `Dieselpunk.smoke.test.jsx`, and it exists for
// the same reason: to prove that every identifier this page reaches for at
// render time actually exists. It proves nothing about the *picture* — jsdom
// has no compositor, so the snap, the strike and the tube are all invisible to
// it.
//
// What it does assert beyond mounting is the contract `NAM-57` is built on:
// this page shows the same facts as the scene, read from the same modules. If
// a heading here stops matching `DECKS`, or a skill group stops matching
// `SKILL_GROUPS`, the two pages have started to drift and that is the failure
// worth catching early.

import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FlatCard from './FlatCard.jsx';
import { DECKS, flatNo } from '../lift/decks.js';
import { PERSON, SKILL_GROUPS } from '../decks/content.js';
import { DEFAULT_LOCALE, pick } from '../i18n/locale.js';

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
});

afterEach(cleanup);

describe('FlatCard', () => {
  it('mounts without reaching for anything that does not exist', () => {
    expect(() => render(<FlatCard />)).not.toThrow();
  });

  it('builds one floor per deck, named the way the building names them', () => {
    render(<FlatCard />);
    for (const deck of DECKS) {
      expect(screen.getByRole('region', { name: new RegExp(flatNo(deck)) })).toBeDefined();
    }
  });

  it('shows the name and the address, because that is the whole point', () => {
    render(<FlatCard />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(PERSON.family);
    const mail = screen.getByRole('link', { name: new RegExp(PERSON.email, 'i') });
    expect(mail.getAttribute('href')).toBe(`mailto:${PERSON.email}`);
  });

  it('reads its skill groups from the same file the scene reads', () => {
    // No `LocaleProvider` wraps this render, so every `usePick()` in the tree
    // falls back to `DEFAULT_LOCALE` (`en`) — the same fallback a real visitor
    // gets whose browser asks for a language the card does not speak.
    render(<FlatCard />);
    for (const group of SKILL_GROUPS) {
      expect(screen.getByText(pick(group.label, DEFAULT_LOCALE).toUpperCase())).toBeDefined();
    }
  });

  it('gives the archive a console that can be driven', () => {
    render(<FlatCard />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /next/i })).toBeDefined();
  });
});
