// @vitest-environment jsdom
//
// The instrument board, NBC-64. jsdom cannot see a bezel or a crescent shadow,
// so what is worth asserting here is the part that is *structure* rather than
// picture: every technology is its own plate, every plate is hung at its own
// prescribed angle, and the gradients the four gauges share are declared once
// for the page rather than four times over.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import FloorLeistungen from './FloorLeistungen.jsx';
import { SKILL_GROUPS } from '../decks/content.js';

afterEach(cleanup);

const TECHS = SKILL_GROUPS.flatMap((g) => g.tech.split('·').map((t) => t.trim().toUpperCase()));

describe('FloorLeistungen', () => {
  it('gives every technology its own plate instead of one run-on line', () => {
    const { container } = render(<FloorLeistungen />);
    const plates = [...container.querySelectorAll('li.tech')];
    expect(plates.map((p) => p.textContent)).toEqual(TECHS);
  });

  it('hangs each plate at its own angle, and no two neighbours the same', () => {
    const { container } = render(<FloorLeistungen />);
    const tilts = [...container.querySelectorAll('li.tech')].map((p) =>
      parseFloat(p.style.getPropertyValue('--tilt')),
    );
    expect(tilts.every((t) => Number.isFinite(t))).toBe(true);
    // Small — past about 3° these stop reading as hung slightly off.
    expect(tilts.every((t) => Math.abs(t) > 0 && Math.abs(t) <= 3)).toBe(true);
    for (let i = 1; i < tilts.length; i += 1) expect(tilts[i]).not.toBe(tilts[i - 1]);
  });

  it('declares the gauges’ shared gradients once, not once per gauge', () => {
    const { container } = render(<FloorLeistungen />);
    expect(container.querySelectorAll('.dial-defs').length).toBe(1);
    expect(container.querySelectorAll('#dialBezel').length).toBe(1);
    expect(container.querySelectorAll('svg.dial').length).toBe(SKILL_GROUPS.length);
  });
});
