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
import { LocaleProvider, useLocale, usePick, useT } from './LocaleContext.jsx';
import { KEY } from './locale.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = '';
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

describe('<html lang>', () => {
  // A screen reader reads the document's own `lang` to choose how to
  // pronounce what is on it. Left on the static `de` index.html ships with,
  // it would tell one running on VoiceOver to read Ukrainian copy with German
  // phonetics — wrong in the one case translating the copy exists to fix.
  it('is set from the chosen locale on mount', () => {
    speaks('uk');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(document.documentElement.lang).toBe('uk');
  });

  it('follows a locale change made after mount', () => {
    speaks('de');
    render(<LocaleProvider><Probe /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.lang).toBe('ru');
  });
});

describe('usePick', () => {
  function PickProbe({ value }) {
    const pick = usePick();
    return <span>{pick(value)}</span>;
  }

  it('resolves a locale-keyed fact against the provider\'s own locale', () => {
    localStorage.setItem(KEY, 'uk');
    render(<LocaleProvider><PickProbe value={{ de: 'Hallo', en: 'Hello', uk: 'Привіт' }} /></LocaleProvider>);
    expect(screen.getByText('Привіт')).toBeDefined();
  });

  it('passes a plain fact through untouched', () => {
    render(<LocaleProvider><PickProbe value="Duisburg" /></LocaleProvider>);
    expect(screen.getByText('Duisburg')).toBeDefined();
  });
});

describe('useT', () => {
  function TProbe() {
    const t = useT();
    return <span>{t('rail.title')}</span>;
  }

  it('resolves a chrome string against the provider\'s own locale', () => {
    localStorage.setItem(KEY, 'ru');
    render(<LocaleProvider><TProbe /></LocaleProvider>);
    expect(screen.getByText('Лифт')).toBeDefined();
  });
});
