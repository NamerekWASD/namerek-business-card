// Which language the card speaks, and how a visitor changes it.
//
// The card is a business card for the German market written by someone who
// also works in English, Ukrainian and Russian, so it is four cards. Which one
// a visitor lands on is not a matter of taste: a recruiter in Duisburg whose
// browser asks for German gets German without touching anything, and everyone
// whose browser asks for something the card does not speak gets **English** —
// not German, because English is the language a stranger to all four is most
// likely to have. That is the whole rule, and it is the reason `DEFAULT_LOCALE`
// below is not the language every string in the repo is currently written in.
//
// Modelled on `view/choice.js`, deliberately: it is the same shape of decision
// — a capability-free preference read once at mount, written down when stated,
// honoured on the next visit — and two files that answer "what does this
// visitor get" should not answer it in two different idioms.
//
// The dictionaries are not here and this file must not grow them. This is the
// switch; NBC-85 is the wiring behind it.

export const KEY = 'namerek:lang';

/**
 * @typedef {'de' | 'en' | 'uk' | 'ru'} LocaleId
 * @typedef {{ id: LocaleId, code: string, endonym: string, flag: string }} Locale
 */

/**
 * The four, in the order the switch presents them — left to right along its
 * arc, and not alphabetical: German first because it is the market the card is
 * for, English second because it is where everyone else lands.
 *
 * `id` is the BCP 47 tag and goes into `<html lang>`; `code` is what is
 * stencilled on the plate and is **not** always the same string — Ukrainian is
 * `uk` to a browser and `UA` to a reader, and writing `UK` under a Union Jack
 * would be the one label capable of naming the wrong language *and* the wrong
 * country at once. `flag` names a country, which is exactly why the code is
 * printed next to it rather than instead of it.
 * @type {Locale[]}
 */
export const LOCALES = [
  { id: 'de', code: 'DE', endonym: 'Deutsch', flag: 'de' },
  { id: 'en', code: 'EN', endonym: 'English', flag: 'gb' },
  { id: 'uk', code: 'UA', endonym: 'Українська', flag: 'ua' },
  { id: 'ru', code: 'RU', endonym: 'Русский', flag: 'ru' },
];

/** @type {LocaleId} */
export const DEFAULT_LOCALE = 'en';

const IDS = LOCALES.map((l) => l.id);

/** @param {unknown} id @returns {id is LocaleId} */
export const isLocale = (id) => typeof id === 'string' && IDS.includes(id);

// Same guard, same reason as `view/choice.js`: `localStorage` in a private
// window or with site data blocked does not read as empty, it *throws*, and an
// uncaught throw in here happens before either rendering has drawn anything.
function safely(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** @returns {LocaleId | null} */
export function storedLocale(storage) {
  const raw = safely(() => storage?.getItem(KEY) ?? null);
  return isLocale(raw) ? raw : null;
}

/** @param {LocaleId} id */
export function rememberLocale(id, storage) {
  if (!isLocale(id)) return;
  safely(() => storage?.setItem(KEY, id));
}

/**
 * The first language the browser asks for that the card actually speaks.
 *
 * Region is dropped — `de-AT` is German, `ru-UA` is Russian — and the list is
 * walked rather than sampled at its head, because a browser set to Polish
 * first and German second is asking for German out of the four on offer, not
 * for the fallback.
 * @param {readonly string[] | undefined} languages
 * @returns {LocaleId | null}
 */
export function fromBrowser(languages) {
  for (const tag of languages ?? []) {
    if (typeof tag !== 'string') continue;
    const primary = tag.split('-')[0].toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return null;
}

/**
 * @param {{ storage?: Storage | null, languages?: readonly string[] }} input
 * @returns {LocaleId}
 */
export function chooseLocale({ storage, languages }) {
  return storedLocale(storage) ?? fromBrowser(languages) ?? DEFAULT_LOCALE;
}

/**
 * Resolve a fact that may or may not vary by locale. A proper noun (a name, a
 * URL, a tech stencil) is a plain value and passes through unchanged; a
 * translated one is `{ de, en, uk, ru }` and this reads the active language
 * out of it — falling back to English and then German rather than `undefined`,
 * so a locale still missing an entry degrades to a real sentence instead of a
 * blank. `content.js` and `projects.js` lean on this to hold both shapes of
 * field without a second accessor per field.
 * @template T
 * @param {T | Partial<Record<LocaleId, T>>} value
 * @param {LocaleId} locale
 * @returns {T}
 */
export function pick(value, locale) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  return value[locale] ?? value.en ?? value.de;
}
