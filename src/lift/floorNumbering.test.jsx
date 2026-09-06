// @vitest-environment jsdom
//
// ── one building, two readings of it ─────────────────────────────────────────
// NBC-71. The four floors are the same four floors in both views, but the two
// views disagree about which way the shaft runs, and each is right about
// itself: the scene's cage climbs (a landing's world Y rises with its index —
// see the note in `decks.js`), while the flat card is a page whose rail runs
// down it. So the scene's plates read `OG` and the card's read `UG`.
//
// The two are held apart here rather than in either view's own test, because
// what breaks is the pair: the failure this guards against is the one that was
// there before — a single `no` field, one of the two views reading the other's
// number off it, and nothing anywhere saying which was meant.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LOCALES } from '../i18n/locale.js';
import { DECKS, flatNo, sceneNo } from './decks.js';
import { FLOORS } from '../flat/floors.js';
import Rail from '../flat/Rail.jsx';
import FloorSelector from '../ui/FloorSelector.jsx';

afterEach(cleanup);

const noop = () => {};

describe('floor numbering', () => {
  it('climbs in the scene', () => {
    expect(DECKS.map(sceneNo)).toEqual(['EG', '1. OG', '2. OG', '3. OG']);
  });

  it('descends on the flat card', () => {
    expect(DECKS.map(flatNo)).toEqual(['EG', '1. UG', '2. UG', '3. UG']);
  });

  it('calls the ground floor EG either way, because the street is on it', () => {
    expect(sceneNo(DECKS[0])).toBe(flatNo(DECKS[0]));
  });

  it('names every deck in all four languages — NBC-85 content, unlike the numbering above', () => {
    for (const deck of DECKS) {
      for (const { id } of LOCALES) expect(deck.label[id], `${deck.id}.${id}`).toBeTruthy();
    }
  });
});

describe('what each view actually paints', () => {
  it('reads OG on the cabin indicator, which is the plate beside the works name', () => {
    // Parked at Leistungen. The indicator rounds the position, so this is the
    // reading a rider sees standing on that landing.
    render(<FloorSelector pos={1} deck={1} moving={false} go={noop} />);
    expect(screen.getByText('1. OG')).toBeDefined();
    expect(screen.queryByText('1. UG')).toBeNull();
  });

  it('reads UG down the flat card rail', () => {
    render(<Rail
      active={0}
      progress={0}
      onSelect={noop}
      onScrubStart={noop}
      onScrub={noop}
      onScrubEnd={noop}
      onWheel={noop}
    />);
    // The rail names its links for the screen reader, and that label is the
    // one place the full number has to survive the narrow layout.
    expect(screen.getByLabelText(/^3\. UG — /)).toBeDefined();
    expect(FLOORS.map((f) => f.code)).toEqual(['EG', '1. UG', '2. UG', '3. UG']);
  });
});
