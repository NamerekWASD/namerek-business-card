import RivettedPanel from '../ui/RivettedPanel.jsx';
import { WEAR_SEED } from '../ui/panelWear.js';
import { BRIEF, LOG, PERSON } from './content.js';
import { useFitToWall } from './fitToWall.js';
import { usePick } from '../i18n/LocaleContext.jsx';

// The valve rack hangs on the wall a dozen pixels inside this column's right
// edge, at every viewport (both are sized off the doorway), so nothing below
// the name may run quite to the edge — nor wider than the intro always has.
const MEASURE = 'min(340px, calc(100% - 24px))';

// The marking above each block is a German stencil in every language, like
// every other prop in the building; the rows under it are the card's copy.
// NBC-107: at 55% alpha the marking made 3.3:1 against the lit plate.
const MARK = {
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase',
  color: 'rgba(226,192,132,0.85)', textShadow: '0 1px 0 rgba(0,0,0,0.7)', margin: 0,
};

const KEY = {
  fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase',
  color: 'var(--muted)', margin: '0.4rem 0 0',
};

const VALUE = {
  fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.4, color: 'var(--glow)', margin: 0,
  textShadow: '0 0 6px rgba(255,180,84,0.35)',
};

function StartDeck() {
  const pick = usePick();
  const fitRef = useFitToWall();
  return (
    <div ref={fitRef} style={{ minWidth: 300 }}>
      <h1
        style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: 'clamp(2rem, 5.4vw, 3.2rem)', lineHeight: 1.02, margin: 0,
          letterSpacing: '-0.01em', textTransform: 'uppercase',
          textShadow: '0 2px 0 rgba(0,0,0,0.5)',
        }}
      >
        {PERSON.given}
        <br />
        {PERSON.family}
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--glow)', margin: '1rem 0 0', textShadow: '0 0 10px rgba(255,180,84,0.5)',
        }}
      >
        {pick(PERSON.role)}
      </p>
      <p className="start-intro" style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', maxWidth: MEASURE, margin: '0.8rem 0 0' }}>
        {pick(PERSON.intro).join(' ')}
      </p>

      {/* Labels above their values: at this width a label column beside them
          folds every value into three lines. */}
      <RivettedPanel seed={WEAR_SEED.start} style={{ padding: '0.75rem 1.4rem 0.8rem', marginTop: '1.1rem', maxWidth: MEASURE }}>
        <p style={MARK}>Typenschild</p>
        <dl style={{ margin: 0 }}>
          {BRIEF.map((row) => (
            <div key={row.label.en}>
              <dt style={KEY}>{pick(row.label)}</dt>
              <dd style={VALUE}>{pick(row.value)}</dd>
            </div>
          ))}
        </dl>
      </RivettedPanel>

      {/* The logbook is ruled on the wall beside the plate, not bolted to it:
          a brass rule down its edge, no panel of its own. */}
      <div style={{ marginTop: '1rem', paddingLeft: '0.9rem', borderLeft: '2px solid rgba(212,172,104,0.35)', maxWidth: MEASURE }}>
        <p style={MARK}>Betriebsbuch</p>
        <ol style={{
          display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', columnGap: '0.8rem', rowGap: '0.3rem',
          alignItems: 'baseline', listStyle: 'none', padding: 0, margin: '0.45rem 0 0',
        }}
        >
          {LOG.map((entry) => (
            <li key={entry.year} style={{ display: 'contents' }}>
              <span style={{ ...VALUE, fontSize: 11 }}>{entry.year}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--muted)' }}>{pick(entry.text)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default StartDeck;
