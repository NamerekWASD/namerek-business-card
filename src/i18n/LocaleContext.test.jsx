// @vitest-environment jsdom
//
// The wiring between the rule in `locale.js` and the switch on the plate. Two
// things break silently here: a provider that reads the browser but never
// writes the visitor's answer down (the switch works, and forgets), and a
// component rendered outside the provider throwing on a missing context —
// which, since the provider sits above *both* renderings, would be a white
// page rather than a missing switch.

import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider, useLocale } from './LocaleContext.jsx';
import { KEY } from './locale.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function Probe() {
  const { locale, setLocale } = useLocale();
  return (
    <button type="button" onClick={() => setLocale('ru')}>{locale}</button>
  );
}

const speaks = (...tags) => vi.stubGlobal('navigator', { ...navigator, languages: tags });

describe('the locale a visitor arrives on', () => {
  it('comes from the browser', () => {
    speaks('de-DE', 'en');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByRole('button').textContent).toBe('de');
  });

  it('falls back to English, not to the language the card is written in', () => {
    speaks('pl-PL');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByRole('button').textContent).toBe('en');
  });

  it('remembers a choice for the next visit', () => {
    speaks('de');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('ru');
    expect(localStorage.getItem(KEY)).toBe('ru');
  });

  it('honours that choice over the browser next time', () => {
    localStorage.setItem(KEY, 'uk');
    speaks('de');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByRole('button').textContent).toBe('uk');
  });

  it('does not throw outside the provider', () => {
    expect(() => render(<Probe />)).not.toThrow();
    expect(screen.getByRole('button').textContent).toBe('en');
    // And the inert setter is inert: a switch with nothing behind it turns and
    // changes nothing rather than taking the page down.
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});
