// Every tab is a deck of the same shaft: switching tabs is a lift ride, so the
// decks have an order and a direction — going from Kontakt back to Start rides
// *down*, and a three-floor hop takes longer than a neighbouring one.
// Named the way the building names them, not the way an array indexes them: the
// ground floor plate already reads EG, so 01..04 alongside it was the site
// inventing a second numbering for the same four floors. `tick` is the short
// form for the dial, where a full "1. OG" would not fit between the marks.
//
// ── NBC-71: the two views do not agree about which way this lift goes ────────
// NAM-59 gave every floor a `UG` (Untergeschoss, basement) on the reading that
// the visitor *descends* from EG into the shaft. That is the flat card's model
// and it still holds there: the card is a page and its rail runs down it.
//
// The scene's cage does the opposite, and it is not a matter of taste — it is
// in the geometry. A landing's opening sits at `openingTop(vh, pitch, floor) =
// … − floor · pitch`, and `worldY` negates, so the world Y of a floor *rises*
// with its index: Kontakt is the top of the building, not the bottom of a hole.
// A cage that climbs past plates reading `3. UG` is a lift with the numbers
// painted upside down, so in the scene the floors off the ground are `OG`
// (Obergeschoss).
//
// So the number is no longer one field. `level` is the floor, which both views
// agree on; the suffix is the view's own reading of the shaft, and each asks
// for its own below. Nothing is baked into a texture — every plate and reading
// in either view is drawn from this file.

/**
 * @typedef {{ id: string, label: Partial<Record<import('../i18n/locale.js').LocaleId, string>>, level: number, tick: string }} Deck
 */

// `label` is content (NBC-85) and translates; `tick` and the numbering below
// are the building's own signage (EG/OG/UG) and do not — see the note above.
/** @type {Deck[]} */
export const DECKS = [
  { id: 'start', label: { de: 'Start', en: 'Home', uk: 'Головна', ru: 'Главная' }, level: 0, tick: 'EG' },
  { id: 'leistungen', label: { de: 'Leistungen', en: 'Services', uk: 'Послуги', ru: 'Услуги' }, level: 1, tick: '1' },
  { id: 'projekte', label: { de: 'Projekte', en: 'Projects', uk: 'Проєкти', ru: 'Проекты' }, level: 2, tick: '2' },
  { id: 'kontakt', label: { de: 'Kontakt', en: 'Contact', uk: 'Контакти', ru: 'Контакты' }, level: 3, tick: '3' },
];

// The ground floor is `EG` either way: it is the floor the street is on, and
// neither suffix applies to it.
const numbered = (level, suffix) => (level === 0 ? 'EG' : `${level}. ${suffix}`);

/**
 * What a plate in the scene reads — the cabin's indicator, and anything else
 * the shaft paints a number on. The cage climbs, so these are `OG`.
 * @param {Deck} deck @returns {string}
 */
export const sceneNo = (deck) => numbered(deck.level, 'OG');

/**
 * What the flat card's rail reads. No cage, no shaft: the reader goes down the
 * page, which is the descent NAM-59 named, so these stay `UG`.
 * @param {Deck} deck @returns {string}
 */
export const flatNo = (deck) => numbered(deck.level, 'UG');

/**
 * Which half of the landing's back wall the wall screen stands on, floor by
 * floor — alternated so a rider does not see the same layout twice in a row.
 * The page content takes the opposite half; see `Dieselpunk.jsx` and
 * `LandingScreen.jsx`, which both index this the same way `DECKS` is
 * indexed. A plain array rather than a computed parity, so the pattern can be
 * hand-edited floor by floor without reading the rule that produced it.
 * @type {Array<'left' | 'right'>}
 */
export const SCREEN_SIDE = ['right', 'left', 'right', 'left'];

/**
 * How far each deck's column is lifted off the middle of the opening, as a
 * fraction of the opening's own height. Positive is up.
 *
 * It exists because the landing is furnished now, and a floor's prop and its
 * text are laid out by two different things that cannot see each other: the
 * props are scene geometry sized in metres off the room's own ceiling height,
 * the column is DOM centred in the doorway aperture. Where the two happen to
 * want the same band of screen, the text wins — it is drawn over the canvas —
 * and the prop ends up as a pair of legs under a paragraph.
 *
 * A prop cannot give way without going back to being a toy, so the column
 * moves. Which one needs to is a per-floor fact rather than a rule: it depends
 * on how tall that deck's own content is and how tall the thing standing under
 * it is, so this is a hand-edited array like `SCREEN_SIDE` above rather than
 * something computed.
 *
 * - **EG** — the patch bay is on the wall in the gutter, clear of the column.
 * - **1. OG** — the workbench. This is the one that needed it: a bench at its
 *   proper 0.92 m reaches about a tenth of the opening higher than this deck's
 *   four plates leave room for, and lifting the column is what puts the text
 *   *above* the bench instead of across it.
 * - **2. OG** — the crates clip the lowest plate a little; left where it is.
 * - **3. OG** — the post box stands beside the column rather than under it.
 *
 * @type {number[]}
 */
export const CONTENT_RISE = [0, 0.12, 0, 0];
