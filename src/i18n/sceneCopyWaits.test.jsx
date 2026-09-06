// @vitest-environment jsdom
//
// ── one wall, one clock ─────────────────────────────────────────────────────
// NBC-90's second half. The screens on a landing wall are textures and cannot
// be repainted in front of anyone, so a language change waits for the doors to
// shut. The text *beside* them on the same wall is DOM and could change on the
// spot — and that is precisely what must not happen: Mykolai watched the
// heading change language while the screen a hand's width away sat waiting, and
// what it looks like is the room coming apart, not a fast interface.
//
// So everything a visitor reads inside the scene resolves against
// `useSceneLocale`. The one exception is the switch itself: its carriage moves
// on the click, because that is the click being answered.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SceneLocaleProvider } from './LocaleContext.jsx';
import { DECKS } from '../lift/decks.js';
import { PERSON } from '../decks/content.js';
import StartDeck from '../decks/StartDeck.jsx';
import FloorSelector from '../ui/FloorSelector.jsx';

afterEach(cleanup);

const noop = () => {};

// The scene is showing German while the visitor has just asked for Ukrainian:
// the state the pair is in for the length of one door cycle. Nothing here
// provides `LocaleContext`, so the choice reads as the default (`en`) — what is
// being pinned is that the copy follows the *scene*, whatever the choice is.
const showing = (ui, locale) => render(
  <SceneLocaleProvider value={locale}>{ui}</SceneLocaleProvider>,
);

describe('what a deck says while the doors are still shutting', () => {
  it('is the language the scene is showing, not the one just chosen', () => {
    showing(<StartDeck />, 'de');
    expect(screen.getByText(PERSON.role.de)).toBeDefined();
    expect(screen.queryByText(PERSON.role.uk)).toBeNull();
  });

  it('changes with the scene, once', () => {
    const { rerender } = showing(<StartDeck />, 'de');
    rerender(<SceneLocaleProvider value="uk"><StartDeck /></SceneLocaleProvider>);
    expect(screen.getByText(PERSON.role.uk)).toBeDefined();
  });

  it('holds the floor buttons to the same clock — they are on the same wall', () => {
    showing(<FloorSelector pos={0} deck={0} moving={false} go={noop} />, 'de');
    for (const deck of DECKS) {
      expect(screen.getByText(deck.label.de), deck.id).toBeDefined();
    }
  });

  it('leaves the switch itself on the choice, which is what answers the click', () => {
    // The carriage is the acknowledgement: a control that stays put until the
    // doors have finished is a control that looks like it missed the press.
    showing(<FloorSelector pos={0} deck={0} moving go={noop} />, 'de');
    const live = screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(live).toHaveLength(1);
    expect(live[0].getAttribute('aria-label')).toBe('English');
  });
});
