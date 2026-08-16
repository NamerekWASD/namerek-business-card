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
