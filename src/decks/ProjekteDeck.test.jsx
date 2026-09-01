// @vitest-environment jsdom
//
// NBC-22: the left half of 2. UG used to be a header and four badges, and
// removing them left a hole — a visitor looking at a screenshot of a Paperless
// config with nothing anywhere to say what it is or why. What fills it is the
// current project's own description, and the three things worth holding still
// are all about *which* description and *how many times a fact is said*:
//
//   - the notice follows the picture on the glass, and it follows it by
//     project, not by frame: six shots of one job are one job;
//   - it is real, selectable DOM text, which is why the 3D-text option was
//     turned down (see `project_deck_text_stays_dom`);
//   - it does not name the project. The console's own plate does that a metre
//     to the right, and the crate under it will do it a second time — NBC-28.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ProjekteDeck from './ProjekteDeck.jsx';
import { SLIDES } from './projects.js';
import { FullscreenImageProvider } from '../scene/r3f/fullscreenImage.js';

afterEach(cleanup);

/** The deck reads the console's page number through the same context the modal does. */
const at = (page) => render(
  <FullscreenImageProvider value={{ page, step: () => {}, openFullscreenImage: () => {} }}>
    <ProjekteDeck />
  </FullscreenImageProvider>,
);

describe('the works notice on 2. UG', () => {
  it('describes the project whose picture is on the glass', () => {
    at(0);
    expect(screen.getByText(SLIDES[0].blurb)).toBeTruthy();
  });

  it('stands still across the shots of one project', () => {
    // The counter moves on every press of NEXT; the notice must not, or three
    // pictures of one job read as three different jobs.
    const first = SLIDES.findIndex((s) => s.project === SLIDES[0].project && s.shot === 2);
    expect(first).toBeGreaterThan(0);
    at(first);
    expect(screen.getByText(SLIDES[0].blurb)).toBeTruthy();
  });

  it('changes when the picture crosses into the next project', () => {
    const next = SLIDES.findIndex((s) => s.project !== SLIDES[0].project);
    expect(next).toBeGreaterThan(0);
    at(next);
    expect(screen.getByText(SLIDES[next].blurb)).toBeTruthy();
    expect(screen.queryByText(SLIDES[0].blurb)).toBeNull();
  });

  it('never says the project\'s name — the console plate and the crate do', () => {
    at(0);
    expect(screen.queryByText(SLIDES[0].title)).toBeNull();
  });

  it('says nothing at all rather than something empty when the archive is', () => {
    // `SLIDES` is derived from a hand-edited file and the empty archive is a
    // painted state, not a crash — see `projects.js`.
    const { container } = at(SLIDES.length + 5);
    expect(container.textContent.trim()).toBe('');
  });
});
