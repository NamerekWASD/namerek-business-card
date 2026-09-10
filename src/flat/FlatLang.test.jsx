// @vitest-environment jsdom
//
// NBC-96. The switch used to hang open in the corner and the corner is not
// only its: the floor's own enamel tag lives there too, and on a handset the
// plate simply sat on top of it. So the strip is behind a badge now, and what
// is worth holding still is everything that badge added — a drawer that is
// really shut when it looks shut, and a focus that goes in and comes back.

import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FlatLang from './FlatLang.jsx';

afterEach(cleanup);

const badge = () => screen.getByRole('button', { name: /Sprache|Language/i });
const drawer = () => document.querySelector('.flat-lang-drawer');

describe('the corner language badge', () => {
  it('starts shut, with the strip out of reach rather than merely out of sight', () => {
    render(<FlatLang value="en" onChange={vi.fn()} />);
    expect(badge().getAttribute('aria-expanded')).toBe('false');
    expect(drawer().hasAttribute('inert')).toBe(true);
  });

  it('wears the flag of the language that is live', () => {
    const { rerender } = render(<FlatLang value="en" onChange={vi.fn()} />);
    expect(badge().dataset.flag).toBe('gb');
    rerender(<FlatLang value="uk" onChange={vi.fn()} />);
    expect(badge().dataset.flag).toBe('ua');
  });

  it('opens on a press, and lands the focus on the position the switch is on', () => {
    render(<FlatLang value="ru" onChange={vi.fn()} />);
    fireEvent.click(badge());
    expect(badge().getAttribute('aria-expanded')).toBe('true');
    expect(drawer().hasAttribute('inert')).toBe(false);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Русский');
  });

  it('shuts again on a second press', () => {
    render(<FlatLang value="en" onChange={vi.fn()} />);
    fireEvent.click(badge());
    fireEvent.click(badge());
    expect(badge().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(badge());
  });

  it('reports the language chosen and shuts behind it', () => {
    const onChange = vi.fn();
    render(<FlatLang value="en" onChange={onChange} />);
    fireEvent.click(badge());
    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(onChange).toHaveBeenCalledWith('de');
    expect(badge().getAttribute('aria-expanded')).toBe('false');
    // The badge is where the visitor was before they opened it, so it is where
    // the keyboard has to be left.
    expect(document.activeElement).toBe(badge());
  });

  it('shuts on Escape and hands the focus back', () => {
    render(<FlatLang value="en" onChange={vi.fn()} />);
    fireEvent.click(badge());
    fireEvent.keyDown(drawer(), { key: 'Escape', bubbles: true });
    expect(badge().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(badge());
  });

  it('shuts on a press anywhere else, and does not snatch the focus back doing it', () => {
    render(<FlatLang value="en" onChange={vi.fn()} />);
    const elsewhere = document.createElement('button');
    document.body.append(elsewhere);
    fireEvent.click(badge());
    fireEvent.pointerDown(elsewhere);
    expect(badge().getAttribute('aria-expanded')).toBe('false');
    // A press that landed on something else is that thing's press: pulling the
    // focus back to the badge would be the switch answering a click it never
    // received.
    expect(document.activeElement).not.toBe(badge());
    elsewhere.remove();
  });

  it('keeps Escape to itself, so the page does not act on it as well', () => {
    const page = vi.fn();
    document.addEventListener('keydown', page);
    render(<FlatLang value="en" onChange={vi.fn()} />);
    fireEvent.click(badge());
    fireEvent.keyDown(drawer(), { key: 'Escape', bubbles: true });
    document.removeEventListener('keydown', page);
    expect(page).not.toHaveBeenCalled();
  });
});
