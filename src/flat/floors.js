import { DECKS, flatNo } from '../lift/decks.js';

// The flat page's floors are the scene's decks, in the scene's order, under the
// building's own numbering — `lift/decks.js` stays the only register of what
// this building's floors are called. All this adds is the shape the flat
// components want to read them in.
export const FLOORS = DECKS.map((deck, index) => ({
  id: deck.id,
  // `flatNo`, not the scene's: the card has no cage, and its rail runs down
  // the page. See the note on the split in `lift/decks.js`.
  code: flatNo(deck),
  // The short form, for where a full "1. UG" does not fit — the narrow rail,
  // the same job it does on the scene's dial. `lift/decks.js` owns both.
  tick: deck.tick,
  // Still the locale-keyed fact from `decks.js`, not a resolved string: this
  // file has no locale of its own to resolve it against, so that is left to
  // whichever component reads `.label` with its own `usePick()`. The upper
  // case it used to be forced into here comes from `.rail-mark-name`'s own
  // `text-transform` in `flat.css` instead.
  label: deck.label,
  index,
}));
