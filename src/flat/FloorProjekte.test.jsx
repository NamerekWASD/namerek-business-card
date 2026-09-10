// @vitest-environment jsdom
//
// NBC-101. The archive floor is the only floor whose content changes without
// the page changing, and until this ticket every block on it was sized by
// whatever slide happened to be loaded: a two-line caption, a longer project
// name, a blurb of a different length. The tube yields height (NBC-99), so all
// of that arrived at the console — the row of buttons moved under the thumb
// pressing it, measured across three shots at 471px as 410 / 396 / 364px.
//
// The floor's rule now is that **nothing moves between shots**. jsdom cannot
// measure that, but it can hold the structure that makes it true: every block
// whose text varies sits inside a reserved window (`Crawl`), and every control
// sits in one place instead of being scattered down the panel.
//
// See `floorFit.test.js` for the reserved heights themselves, which are a fact
// of the stylesheet rather than of the tree.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import FloorProjekte from './FloorProjekte.jsx';
import { SLIDES, localized } from '../decks/projects.js';
import { DEFAULT_LOCALE } from '../i18n/locale.js';

afterEach(cleanup);

describe('FloorProjekte', () => {
  it('shows the shot’s caption and its number on one small screen under the glass', () => {
    // The 3D room says which shot this is on a legend under its own glass, and
    // this is that legend. One line, a fixed height, and a name too long for it
    // walks the window rather than taking a second line off the floor.
    const { container } = render(<FloorProjekte />);
    expect(container.querySelector('.shot-line'), 'the old two-line caption row is back').toBeFalsy();
    const screen = container.querySelector('.shot-screen');
    expect(screen, 'the caption has no screen to stand on').toBeTruthy();
    expect(screen.querySelector('.crawl'), 'the caption is not in a reserved window').toBeTruthy();
    expect(screen.textContent).toContain(String(SLIDES[0].shots));
  });

  it('keeps every control of the floor in one place', () => {
    // Prev, the counter, next — and the source link, which used to sit six
    // blocks further down the panel with the text between them re-sizing on
    // every press.
    const { container } = render(<FloorProjekte />);
    const console_ = container.querySelector('.console');
    expect(console_.querySelectorAll('button').length).toBe(2);
    expect(console_.querySelector('.counter')).toBeTruthy();
    const link = console_.querySelector('a[href^="http"]');
    expect(link, 'the source link is not in the control rail').toBeTruthy();
    // And nowhere else in the panel: one control, one place.
    expect(container.querySelectorAll('.panel a[href^="http"]').length).toBe(1);
  });

  it('offers the source as a control, not a run of text', () => {
    // NBC-100: it was a `.field-value` inside a paragraph — the same treatment
    // the page gives plain copy — and a visitor read straight past it. It stays
    // the dark plate the despatch desk uses for its own addresses, which is
    // also what keeps it from reading as a third pager key beside NEXT.
    const { container } = render(<FloorProjekte />);
    const link = container.querySelector('.console a[href^="http"]');
    expect(link.classList.contains('link-btn')).toBe(true);
    expect(link.classList.contains('field-value')).toBe(false);
    // It leaves the site, and says so before it is pressed.
    expect(link.querySelector('svg')).toBeTruthy();
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('gives the works notice a window of its own, scrolled by hand', () => {
    // A reserved box, and inside it a paragraph the visitor reads at their own
    // pace. It walked its own window for one build, which is exactly what a
    // paragraph must not do — so it is a scroll region, and one a keyboard can
    // reach.
    const { container } = render(<FloorProjekte />);
    const slot = container.querySelector('.notice-slot');
    expect(slot, 'the notice is not in a reserved window').toBeTruthy();
    expect(slot.classList.contains('crawl'), 'the notice moves by itself again').toBe(false);
    expect(slot.getAttribute('tabindex'), 'the notice cannot be scrolled from a keyboard').toBe('0');
    expect(slot.textContent).toContain(localized(SLIDES[0].blurb, SLIDES[0].blurbI18n, DEFAULT_LOCALE).slice(0, 24));
  });

  it('sprays the stack on one batten and never wraps it', () => {
    const { container } = render(<FloorProjekte />);
    const batten = container.querySelector('.stack-batten');
    expect(batten, 'the stack has no batten to sit on').toBeTruthy();
    expect(batten.querySelector('.crawl'), 'a long stack would wrap instead of walking').toBeTruthy();
    expect(batten.textContent).toContain(SLIDES[0].stack);
  });

  it('marks the floor’s own identity line so a short screen can drop it', () => {
    const { container } = render(<FloorProjekte />);
    const label = container.querySelector('.floor-inner > .label');
    expect(label, 'the identity line is not the floor’s own child any more').toBeTruthy();
    expect(label.classList.contains('floor-label')).toBe(true);
  });
});
