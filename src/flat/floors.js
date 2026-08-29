import { DECKS } from '../lift/decks.js';

// The flat page's floors are the scene's decks, in the scene's order, under the
// building's own numbering — `lift/decks.js` stays the only register of what
// this building's floors are called. All this adds is the shape the flat
// components want to read them in.
export const FLOORS = DECKS.map((deck, index) => ({
  id: deck.id,
  code: deck.no,
  label: deck.label.toUpperCase(),
  index,
}));
