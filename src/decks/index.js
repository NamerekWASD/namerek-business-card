import StartDeck from './StartDeck.jsx';
import LeistungenDeck from './LeistungenDeck.jsx';
import ProjekteDeck from './ProjekteDeck.jsx';
import KontaktDeck from './KontaktDeck.jsx';

export { StartDeck, LeistungenDeck, ProjekteDeck, KontaktDeck };

// Indexed the same way as `DECKS` in `lift/decks.js`, so `DECK_BODIES[deckIndex]`
// is always the body for that floor.
export const DECK_BODIES = [StartDeck, LeistungenDeck, ProjekteDeck, KontaktDeck];
