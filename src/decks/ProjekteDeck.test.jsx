// @vitest-environment jsdom
//
// NBC-22 put a works notice here — the current project's description, as real
// selectable DOM text on an enamel plate. NBC-68 moved it into the scene as a
// screen of its own, because the one thing it had to do was be *seen* changing
// and a plate cannot go dark and come back. The reasoning, and Mykolai's own
// argument for giving up the selectable text, is in `ProjekteDeck.jsx`.
//
// So what is left to hold is the boundary rather than the content: this floor's
// DOM column is empty, and it is empty *by rendering nothing* rather than by
// being removed from `DECK_BODIES`, which every floor is indexed through.
// `notice.test.js` holds the screen that took the job.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import ProjekteDeck from './ProjekteDeck.jsx';
import { DECK_BODIES } from './index.js';
import { SLIDES } from './projects.js';
import { FullscreenImageProvider } from '../scene/r3f/fullscreenImage.js';

afterEach(cleanup);

const at = (page) => render(
  <FullscreenImageProvider value={{ page, step: () => {}, openFullscreenImage: () => {} }}>
    <ProjekteDeck />
  </FullscreenImageProvider>,
);

describe('the 2. UG column, after the notice moved into the scene', () => {
  it('puts nothing on the wall at all', () => {
    const { container } = at(0);
    expect(container.textContent.trim()).toBe('');
  });

  // The blurb belongs to the screen now. If it ever came back here it would be
  // said twice in one room — the fault "one surface, one question" exists to
  // prevent. See the table at the top of `projects.js`.
  it('does not print the description a second time', () => {
    const { container } = at(0);
    expect(container.textContent).not.toContain(SLIDES[0].blurb);
  });

  it('stays empty wherever the console is paged, including off the end', () => {
    for (const page of [0, 1, SLIDES.length - 1, SLIDES.length + 5]) {
      const { container } = at(page);
      expect(container.textContent.trim()).toBe('');
      cleanup();
    }
  });

  // Not deleted, and this is the clause that says why: `Dieselpunk` renders
  // `DECK_BODIES[i]` for every floor within a landing of the one being stood
  // on, and a hole in that array is a crash rather than an empty column.
  it('is still a component every floor can be indexed through', () => {
    expect(DECK_BODIES).toHaveLength(4);
    expect(DECK_BODIES[2]).toBe(ProjekteDeck);
    expect(DECK_BODIES.every((B) => typeof B === 'function')).toBe(true);
  });
});
