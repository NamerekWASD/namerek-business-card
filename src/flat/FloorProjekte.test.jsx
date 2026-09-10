// @vitest-environment jsdom
//
// NBC-99. The archive floor is the tightest floor in the building: a picture, a
// console, and six blocks of text under them. Two of those blocks answer the
// same question — which shot of this project you are looking at — and on a
// handset each one costs a line the notice needs.
//
// jsdom cannot say whether the floor fits. What it can hold is the structure
// that makes it fit: the shot number rides the caption's own line instead of
// claiming one of its own, and the floor's identity line is marked as such so
// the stylesheet can drop it where there is no room. See `floorFit.test.js`.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import FloorProjekte from './FloorProjekte.jsx';
import { SLIDES } from '../decks/projects.js';

afterEach(cleanup);

describe('FloorProjekte', () => {
  it('puts the shot number on the caption’s line rather than a line of its own', () => {
    const { container } = render(<FloorProjekte />);
    const line = container.querySelector('.shot-line');
    expect(line, 'the caption and its shot number are not on one line').toBeTruthy();
    expect(line.querySelector('h3')).toBeTruthy();
    const shot = line.querySelector('.stencil');
    expect(shot).toBeTruthy();
    expect(shot.textContent).toContain(String(SLIDES[0].shots));
  });

  it('offers the source as a control, not a run of text', () => {
    // NBC-100: it was a `.field-value` inside a paragraph — the same treatment
    // the page gives plain copy — and a visitor read straight past it. The
    // panel already has a vocabulary for a secondary control: `.link-btn`, the
    // dark plate the despatch desk uses for its own addresses.
    const { container } = render(<FloorProjekte />);
    const link = container.querySelector('.crt-grid a[href^="http"]');
    expect(link, 'the source link is gone').toBeTruthy();
    expect(link.classList.contains('link-btn')).toBe(true);
    expect(link.classList.contains('field-value')).toBe(false);
    // It leaves the site, and says so before it is pressed.
    expect(link.querySelector('svg')).toBeTruthy();
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('marks the floor’s own identity line so a short screen can drop it', () => {
    const { container } = render(<FloorProjekte />);
    const label = container.querySelector('.floor-inner > .label');
    expect(label, 'the identity line is not the floor’s own child any more').toBeTruthy();
    expect(label.classList.contains('floor-label')).toBe(true);
  });
});
