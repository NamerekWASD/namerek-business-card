import RivettedPanel from '../ui/RivettedPanel.jsx';
import EnamelPlate from '../ui/EnamelPlate.jsx';
import DeckHeading from '../ui/DeckHeading.jsx';
import { SKILL_GROUPS } from './content.js';

function LeistungenDeck({ lag }) {
  return (
    <>
      <DeckHeading>Leistungen</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {SKILL_GROUPS.map((g, i) => (
          <RivettedPanel key={g.label} i={i} lag={lag} style={{ padding: '1rem 1.1rem' }}>
            {/* the category is a fixed marking on a fixed panel, so it is a
                plate — the same rule the corridor props follow */}
            <EnamelPlate colour="green" size={10} style={{ letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px' }}>
              {g.label}
            </EnamelPlate>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--glow)', marginTop: 8, textShadow: '0 0 6px rgba(255,180,84,0.4)' }}>
              {g.tech}
            </div>
          </RivettedPanel>
        ))}
      </div>
    </>
  );
}

export default LeistungenDeck;
