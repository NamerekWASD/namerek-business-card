// @vitest-environment jsdom
//
// ── NBC-109: the crate's release stamp speaks the scene's language ───────────
// The stamp on the boxes on 2. OG's belt was printed in German whatever the
// visitor chose, so a language change left every box that came out of the wall
// afterwards saying `AUSGELIEFERT 2023`. The name and the stack on the crate
// are product names and stay as they are; the stamp is a sentence and follows
// the locale the scene is *painted* in, which is the one the screens on the
// same wall swap to behind the doors.
//
// jsdom has no 2d context, so this reads what the box was asked to paint
// rather than the paint: `artifactFace` is spied on and its `when` collected.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as propArt from '../renderers/r3f/propArt.js';
import LandingProps from './LandingProps.jsx';
import { DECKS } from '../../lift/decks.js';
import { PROJECTS, SLIDES, releaseStamp } from '../../decks/projects.js';
import { SceneLocaleProvider } from '../../i18n/LocaleContext.jsx';
import { lendObject3D } from './landingMount.testkit.js';

vi.mock('../renderers/r3f/propArt.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, artifactFace: vi.fn(real.artifactFace) };
});

beforeAll(lendObject3D);

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  propArt.artifactFace.mockClear();
});

afterEach(() => {
  cleanup();
});

/** Every release stamp the 2. OG crates were asked to carry. */
function stampsIn(locale) {
  const idx = DECKS.findIndex((d) => d.id === 'projekte');
  render(
    <SceneLocaleProvider value={locale}>
      <LandingProps idx={idx} vw={1620} vh={900} top={0} live />
    </SceneLocaleProvider>,
  );
  return new Set(propArt.artifactFace.mock.calls
    .filter(([, , labelled]) => labelled)
    .map(([, , , when]) => when));
}

describe('the crates on the belt', () => {
  it.each(['de', 'en', 'uk', 'ru'])('stamp their release in %s when the scene is painted in it', (locale) => {
    // the run is stamped with whatever the console shows first
    const first = PROJECTS.find((p) => p.id === SLIDES[0].project);
    const expected = releaseStamp(first.release, locale);
    expect(stampsIn(locale)).toEqual(new Set([expected]));
  });
});
