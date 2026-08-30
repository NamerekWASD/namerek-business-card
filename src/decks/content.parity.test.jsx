// @vitest-environment jsdom
//
// NAM-57's guarantee, made mechanical: the scene and the flat card are two
// renderings of one business card, and the only thing keeping them from
// drifting apart is that both read their facts from `content.js`. This does
// not render either page whole — `Dieselpunk` keeps the ground floor's name
// off-screen until the intro finishes, and driving that clock here would test
// the intro, not the content — so it renders the deck body each page uses for
// EG and Kontakt directly, and checks the same fact reads the same way on
// both.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import StartDeck from './StartDeck.jsx';
import KontaktDeck from './KontaktDeck.jsx';
import FloorStart from '../flat/FloorStart.jsx';
import FloorKontakt from '../flat/FloorKontakt.jsx';
import { PERSON } from './content.js';

afterEach(cleanup);

describe('one PERSON, two pages', () => {
  it('signs the entrance with the same name on the scene and the flat card', () => {
    // The family name sits after a `<br/>` on both pages, so it is not one
    // contiguous text node — the heading's own `textContent` is what has to
    // match, not a text-node query.
    render(<StartDeck />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(PERSON.family);
    cleanup();
    render(<FloorStart />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(PERSON.family);
  });

  it('offers the same mailto link on the scene and the flat card', () => {
    render(<KontaktDeck />);
    expect(screen.getByRole('link', { name: PERSON.email }).getAttribute('href')).toBe(`mailto:${PERSON.email}`);
    cleanup();
    render(<FloorKontakt />);
    expect(screen.getByRole('link', { name: PERSON.email }).getAttribute('href')).toBe(`mailto:${PERSON.email}`);
  });
});
