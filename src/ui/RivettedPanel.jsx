import CornerRivets from './CornerRivets.jsx';
import { deckLag } from './deckLag.js';

// A bolted plate hung on the landing wall — the DOM half of the same article
// the corridor props are built from, and drawn to the same reference as the
// bench standing under it (`.temp/workbench and data blocks reference.png`).
//
// What that reference shows, and what this had to grow, is a plate with a
// *profile*: a dark field sunk inside a brass-lit arris, vignetted toward its
// own corners, sitting off the wall on its shadow. The flat rounded rectangle
// with a 1px border that was here read as a card on a web page — right colours,
// no thickness — and thickness is the whole grammar of the styling system these
// belong to.
//
// Three layers do it, and none of them is an image:
//
// *The arris.* An inset highlight along the top edge and an inset shadow along
// the bottom, which is what a pressed steel plate does under a lamp above it.
// *The vignette.* A wide inset shadow all round, so the field is lit in the
// middle and dies into its own edges rather than being one flat value.
// *The stand-off.* A real drop shadow, offset down, because the plate is bolted
// proud of the plaster and not printed on it.
//
// `i` staggers the deck's inertia so a row of plates does not move as a block;
// the amount itself comes from `--deck-lag`, see `deckLag`.
function RivettedPanel({ children, style, i = 0 }) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(163deg, #302518 0%, #241b11 46%, #1b140c 100%)',
        border: '1px solid #4a3821',
        borderRadius: 3,
        boxShadow: [
          'inset 0 1px 0 rgba(212,172,104,0.18)',
          'inset 0 -1px 0 rgba(0,0,0,0.6)',
          'inset 0 0 30px rgba(0,0,0,0.55)',
          '0 9px 20px rgba(0,0,0,0.55)',
        ].join(', '),
        transform: deckLag(1 + i * 0.24),
        ...style,
      }}
    >
      <CornerRivets />
      {children}
    </div>
  );
}

export default RivettedPanel;
