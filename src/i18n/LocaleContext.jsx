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
// NBC-90 splits that question in two, and the split is the whole of why both
// wrappers read `useSceneLocale()` rather than `useLocale()`: *what has been
// chosen* and *what is on screen* are not the same thing for a third of a
// second after the switch is turned. Only the switch itself reads the choice.
//
// `<html lang>` is written here too, in a layout effect rather than a plain
// one: a screen reader can query the attribute before the next paint, and a
// tag that lags a frame behind the copy it describes is wrong for exactly as
// long as it lags.

const LocaleContext = createContext(null);

// ── and the language the *scene* is showing ──────────────────────────────────
// NBC-90. One provider deeper, and only in the 3D rendering: what the visitor
// has chosen, held back until the landing doors are shut. Half of what a deck
// says is painted into a texture and repainting those in front of anyone is a
// hitch, so the swap hides behind a cycle of the doors — and once it does, the
// deck's *selectable* text has to wait with it, or the wall says one thing and
// the screen beside it says another for a third of a second. `SceneLocale.jsx`
// owns the timing; this is only the wire it arrives on.
const SceneLocaleContext = createContext(null);

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

/**
 * What the visitor has chosen. This is the switch's own reading — it moves the
 * moment the switch is turned — and it is deliberately *not* what the copy is
 * resolved against inside the scene. See `useSceneLocale`.
 * @returns {{ locale: import('./locale.js').LocaleId, setLocale: (id: string) => void }}
 */
export function useLocale() {
  return useContext(LocaleContext) ?? LOOSE;
}

/**
 * What is on screen. Inside the 3D rendering that lags the choice by one cycle
 * of the landing doors; everywhere else — the flat card, a test rendering one
 * component on its own — the two are the same value, because there is nothing
 * to hide a change behind and nothing that needs hiding.
 * @returns {import('./locale.js').LocaleId}
 */
export function useSceneLocale() {
  const shown = useContext(SceneLocaleContext);
  const { locale } = useLocale();
  return shown ?? locale;
}

export const SceneLocaleProvider = SceneLocaleContext.Provider;

/**
 * A `pick()` bound to the current locale, for a component reading one of
 * `content.js`'s or `projects.js`'s locale-keyed facts.
 * @returns {<T>(value: T | Partial<Record<import('./locale.js').LocaleId, T>>) => T}
 */
export function usePick() {
  const locale = useSceneLocale();
  return useCallback((value) => pick(value, locale), [locale]);
}

/**
 * A `t()` bound to the current locale, for the flat chrome dictionary in
 * `strings.js`.
 * @returns {(key: string, vars?: Record<string, string | number>) => string}
 */
export function useT() {
  const locale = useSceneLocale();
  return useCallback((key, vars) => translate(key, locale, vars), [locale]);
}

export default LocaleProvider;
