// Every tab is a deck of the same shaft: switching tabs is a lift ride, so the
// decks have an order and a direction — going from Kontakt back to Start rides
// *down*, and a three-floor hop takes longer than a neighbouring one.
// Named the way the building names them, not the way an array indexes them: the
// ground floor plate already reads EG, so 01..04 alongside it was the site
// inventing a second numbering for the same four floors. `tick` is the short
// form for the dial, where a full "1. OG" would not fit between the marks.

/**
 * @typedef {{ id: string, label: string, no: string, tick: string }} Deck
 */

/** @type {Deck[]} */
export const DECKS = [
  { id: 'start', label: 'Start', no: 'EG', tick: 'EG' },
  { id: 'leistungen', label: 'Leistungen', no: '1. OG', tick: '1' },
  { id: 'projekte', label: 'Projekte', no: '2. OG', tick: '2' },
  { id: 'kontakt', label: 'Kontakt', no: '3. OG', tick: '3' },
];

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
