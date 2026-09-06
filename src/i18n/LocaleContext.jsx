import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, chooseLocale, pick, rememberLocale } from './locale.js';
import { t as translate } from './strings.js';

// Where the chosen language lives while the tab is open.
//
// One provider above both renderings, for the same reason `view/choice.js` is
// read once in `App`: the answer is a property of the visitor, not of the card
// they happen to be looking at, and someone who picks Ukrainian in the scene
// and then falls back to the flat card has not asked to be spoken to in
// English again.
//
// NBC-85 lands the two things this file deliberately did not have before:
// `useT()`, over the flat chrome dictionary in `strings.js`, and `usePick()`,
// over the locale-keyed facts `content.js` and `projects.js` now carry
// directly on their fields. Both are thin wrappers — the lookup logic lives
// in `strings.js` and `locale.js` — so this file stays the one place a
// component asks "what language is it" without also becoming the one place
// that decides what every string says.
//
// `<html lang>` is written here too, in a layout effect rather than a plain
// one: a screen reader can query the attribute before the next paint, and a
// tag that lags a frame behind the copy it describes is wrong for exactly as
// long as it lags.

const LocaleContext = createContext(null);

// A component rendered outside the provider — in a test, or in a rendering
// that has not been wrapped yet — gets the default rather than a crash. The
// setter is deliberately inert: a switch that is not plugged into anything
// should turn and change nothing, not throw.
const LOOSE = { locale: DEFAULT_LOCALE, setLocale: () => {} };

const storage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function LocaleProvider({ children }) {
  // Chosen once, at mount, from the two things that cannot change while the
  // tab is open: what was written down last time and what the browser asks
  // for. Recomputing it on every render would let a stale storage read
  // overwrite a choice made a second ago.
  const [locale, setLocale] = useState(() => chooseLocale({
    storage: storage(),
    languages: typeof navigator === 'undefined' ? [] : navigator.languages,
  }));

  const choose = useCallback((id) => {
    rememberLocale(id, storage());
    setLocale(id);
  }, []);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale: choose }), [locale, choose]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** @returns {{ locale: import('./locale.js').LocaleId, setLocale: (id: string) => void }} */
export function useLocale() {
  return useContext(LocaleContext) ?? LOOSE;
}

/**
 * A `pick()` bound to the current locale, for a component reading one of
 * `content.js`'s or `projects.js`'s locale-keyed facts.
 * @returns {<T>(value: T | Partial<Record<import('./locale.js').LocaleId, T>>) => T}
 */
export function usePick() {
  const { locale } = useLocale();
  return useCallback((value) => pick(value, locale), [locale]);
}

/**
 * A `t()` bound to the current locale, for the flat chrome dictionary in
 * `strings.js`.
 * @returns {(key: string, vars?: Record<string, string | number>) => string}
 */
export function useT() {
  const { locale } = useLocale();
  return useCallback((key, vars) => translate(key, locale, vars), [locale]);
}

export default LocaleProvider;
