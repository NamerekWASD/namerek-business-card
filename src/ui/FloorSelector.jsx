import { DECKS, sceneNo } from '../lift/decks.js';
import RivettedPanel from './RivettedPanel.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { WEAR_SEED } from './panelWear.js';

// The cabin's floor selector. Lamps light by proximity to the current position,
// so during a ride they flare one by one as each deck is passed — the readout
// counts up or down on its own instead of just swapping at the end.
function FloorSelector({ pos, deck, moving, go }) {
  const { locale, setLocale } = useLocale();
  const dir = moving ? Math.sign(pos - deck) : 0;
  const reading = sceneNo(DECKS[Math.max(0, Math.min(DECKS.length - 1, Math.round(pos)))]);
  return (
    <nav
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '1.1rem 0 0.9rem', borderBottom: '1px solid var(--line)',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* The machine says who built it. Every lift of this period carries the
            works' plate by the controls, and it is the one place on the site
            where the name is stamped on the hardware rather than printed in the
            copy — so it gets the same riveted plate the deck text gets, worn
            `handled` because this is the panel a hand is on. */}
        <RivettedPanel
          seed={WEAR_SEED.console}
          wear="handled"
          style={{ padding: '8px 19px', borderRadius: 2, lineHeight: 1.35 }}
        >
          <div style={{ fontFamily: 'var(--display)', fontSize: 10, letterSpacing: 2.4, color: 'var(--brass)' }}>
            NAMEREK RECHENWERKE
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.6, color: 'var(--muted)' }}>
            AUFZUGBAU · MASCH. No. 001
          </div>
        </RivettedPanel>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2.6, color: 'var(--muted)' }}>NAMEREK</span>
          <span
            style={{
              fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: 1,
              background: 'var(--screen)', color: 'var(--glow)',
              padding: '2px 8px', borderRadius: 2, minWidth: 54, textAlign: 'center',
              boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.85)',
              textShadow: '0 0 8px rgba(255,180,84,0.75)',
            }}
          >
            {reading}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: dir ? 'var(--glow)' : 'var(--line)', textShadow: dir ? '0 0 8px rgba(255,180,84,0.8)' : 'none' }}>
          {dir > 0 ? '▲' : dir < 0 ? '▼' : '—'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.9rem', alignSelf: 'center' }}>
        {DECKS.map((d, i) => {
          const lamp = Math.max(0, 1 - Math.abs(pos - i));
          const selected = i === deck && !moving;
          return (
            <button
              key={d.id}
              onClick={() => go(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 0, padding: '4px 2px',
                cursor: moving ? 'default' : 'pointer',
                fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase',
                color: selected ? 'var(--glow)' : 'var(--muted)',
                borderBottom: `2px solid ${selected ? 'var(--brass)' : 'transparent'}`,
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: `rgba(255,180,84,${(0.12 + 0.88 * lamp).toFixed(2)})`,
                  boxShadow: lamp > 0.05 ? `0 0 ${(9 * lamp).toFixed(1)}px rgba(255,180,84,${(0.9 * lamp).toFixed(2)})` : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              />
              {d.label}
            </button>
          );
        })}
      </div>

      {/* The language rotary goes on the cabin's panel for the same reason the
          floor buttons do: it is a control, and a control belongs where the
          hand is. On the shaft wall it would ride away with the floor being
          left. */}
      <LanguageSelector
        value={locale}
        onChange={setLocale}
        compact
        style={{ width: 128, flex: '0 0 auto', alignSelf: 'center' }}
      />
    </nav>
  );
}

export default FloorSelector;
