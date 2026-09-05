import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, chooseLocale, rememberLocale } from './locale.js';

// Where the chosen language lives while the tab is open.
//
// One provider above both renderings, for the same reason `view/choice.js` is
// read once in `App`: the answer is a property of the visitor, not of the card
// they happen to be looking at, and someone who picks Ukrainian in the scene
// and then falls back to the flat card has not asked to be spoken to in
// English again.
//
// It is deliberately thin. There is no `t()` here and there must not be one
// until NBC-85 lands the dictionaries — a translation function with nothing
// behind it invites callers to start wrapping strings that have no
// translations, and then the missing half of the work is spread over forty
// files instead of waiting in one.
//
// The `<html lang>` attribute is not written from here yet, and that is on
// purpose: every string on the card is still German, so tagging the document
// `en` on a first visit would tell a screen reader to pronounce German copy
// with English phonetics. The tag becomes true in the same change that moves
// the copy.

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

  const value = useMemo(() => ({ locale, setLocale: choose }), [locale, choose]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** @returns {{ locale: import('./locale.js').LocaleId, setLocale: (id: string) => void }} */
export function useLocale() {
  return useContext(LocaleContext) ?? LOOSE;
}

export default LocaleProvider;
