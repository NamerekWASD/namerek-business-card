import RivettedPanel from '../ui/RivettedPanel.jsx';
import EnamelPlate from '../ui/EnamelPlate.jsx';
import ScreenValue from '../ui/ScreenValue.jsx';
import DeckHeading from '../ui/DeckHeading.jsx';
import { PROJECT_STATS } from './content.js';

function ProjekteDeck() {
  return (
    <>
      <DeckHeading>Projekte</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
        {PROJECT_STATS.map((s, i) => (
          <RivettedPanel key={s.label} i={i} style={{ padding: '0.9rem 0.8rem' }}>
            <ScreenValue value={s.value} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
              {s.label}
            </div>
          </RivettedPanel>
        ))}
      </div>
      <RivettedPanel i={4} style={{ padding: '1.1rem', marginTop: '0.9rem' }}>
        <EnamelPlate colour="red" size={10} style={{ letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px' }}>
          Referenzen
        </EnamelPlate>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', margin: '8px 0 0' }}>
          Ausgew&auml;hlte Projekte sind in Vorbereitung &mdash; Details gerne direkt im Gespr&auml;ch.
        </p>
      </RivettedPanel>
    </>
  );
}

export default ProjekteDeck;
