import RivettedPanel from '../ui/RivettedPanel.jsx';
import EnamelPlate from '../ui/EnamelPlate.jsx';
import DeckHeading from '../ui/DeckHeading.jsx';
import { SKILL_GROUPS } from './content.js';

// Four plates in two ranks, which is the reference's own arrangement and not an
// arbitrary one: a single column of four reads as a list, and a list of skills
// is a CV. Two by two reads as a board of instrument labels, which is what the
// room is furnished to look like.
//
// Two fixed tracks rather than `auto-fit`, and `minmax(0, 1fr)` rather than
// `1fr`: the column this sits in is 48% of the doorway aperture and narrows with
// the viewport, and an auto-fitted track has a floor it will not go under — so
// at the widths either side of that floor the tech line ran out of its own
// plate. Tracks that may collapse to nothing let the line wrap instead, which is
// the failure worth having.
function LeistungenDeck() {
  return (
    <>
      <DeckHeading>Leistungen</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
        {SKILL_GROUPS.map((g, i) => (
          <RivettedPanel key={g.label} i={i} style={{ padding: '0.9rem 0.85rem' }}>
            {/* the category is a fixed marking on a fixed panel, so it is a
                plate — the same rule the corridor props follow */}
            <EnamelPlate colour="green" size={10} style={{ letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px' }}>
              {g.label}
            </EnamelPlate>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--glow)', marginTop: 9,
              textShadow: '0 0 6px rgba(255,180,84,0.4)',
            }}
            >
              {g.tech}
            </div>
          </RivettedPanel>
        ))}
      </div>
    </>
  );
}

export default LeistungenDeck;
