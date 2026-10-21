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
import LeistungenDeck from './LeistungenDeck.jsx';
import FloorLeistungen from '../flat/FloorLeistungen.jsx';
import { BRIEF, LOG, PERSON, WRITINGS } from './content.js';
import { LOCALES, KEY, pick } from '../i18n/locale.js';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// NBC-85's own parity clause: not just one language read the same way on
// both pages, but *all four* — a translation added to `content.js` for the
// scene and forgotten on the flat card (or the reverse) is exactly the kind
// of drift NAM-57's guarantee exists to catch, and it is silent unless it is
// checked per locale rather than once against whatever `DEFAULT_LOCALE` is.
function withLocale(id, ui) {
  localStorage.setItem(KEY, id);
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

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

describe('the same language on both pages, for all four locales', () => {
  for (const { id } of LOCALES) {
    it(`speaks ${id} the same way in the role and the greeting`, () => {
      withLocale(id, <StartDeck />);
      expect(screen.getByText(pick(PERSON.role, id))).toBeDefined();
      cleanup();

      withLocale(id, <FloorStart />);
      expect(screen.getByText(pick(PERSON.role, id))).toBeDefined();
      cleanup();

      withLocale(id, <KontaktDeck />);
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(pick(PERSON.greeting, id));
      cleanup();

      withLocale(id, <FloorKontakt />);
      expect(screen.getByText(new RegExp(`${pick(PERSON.city, id)}.*${pick(PERSON.availability, id)}`, 'i'))).toBeDefined();
    });

    // NBC-106: the nameplate and the logbook are the entrance's own facts, so
    // both pages carry every row of both, in every language.
    it(`signs the same nameplate and logbook in ${id} on both pages`, () => {
      for (const Page of [StartDeck, FloorStart]) {
        withLocale(id, <Page />);
        for (const row of BRIEF) {
          expect(screen.getByText(pick(row.label, id))).toBeDefined();
          expect(screen.getByText(pick(row.value, id))).toBeDefined();
        }
        for (const entry of LOG) {
          expect(screen.getByText(entry.year)).toBeDefined();
          expect(screen.getByText(pick(entry.text, id))).toBeDefined();
        }
        cleanup();
        localStorage.clear();
      }
    });

    // NBC-108: the published texts hang under the skills on both pages, every
    // one a link to where it was published, its gist in the reader's language —
    // printed on the flat card, on the link's title in the scene, where the
    // band above the workbench holds one line.
    it(`lists the same texts in ${id} on both pages`, () => {
      for (const [Page, gistOf] of [
        [LeistungenDeck, (link) => link.getAttribute('title')],
        [FloorLeistungen, (link) => link.closest('li').textContent],
      ]) {
        withLocale(id, <Page />);
        for (const text of WRITINGS) {
          const link = screen.getByRole('link', { name: text.title });
          expect(link.getAttribute('href')).toBe(text.url);
          expect(link.getAttribute('target')).toBe('_blank');
          expect(link.getAttribute('lang')).toBe(text.lang);
          expect(gistOf(link)).toContain(pick(text.gist, id));
          expect(screen.getByText(text.date).getAttribute('datetime')).toBe(text.date);
        }
        cleanup();
        localStorage.clear();
      }
    });
  }
});
