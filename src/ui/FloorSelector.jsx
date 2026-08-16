import { DECKS } from '../lift/decks.js';

// The cabin's floor selector. Lamps light by proximity to the current position,
// so during a ride they flare one by one as each deck is passed — the readout
// counts up or down on its own instead of just swapping at the end.
function FloorSelector({ pos, deck, moving, go }) {
  const dir = moving ? Math.sign(pos - deck) : 0;
  const reading = DECKS[Math.max(0, Math.min(DECKS.length - 1, Math.round(pos)))].no;
  return (
    <nav
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '1.1rem 0 0.9rem', borderBottom: '1px solid var(--line)',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--muted)' }}>No. 001 / N</span>
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
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: dir ? 'var(--glow)' : 'var(--line)', textShadow: dir ? '0 0 8px rgba(255,180,84,0.8)' : 'none' }}>
          {dir > 0 ? '▲' : dir < 0 ? '▼' : '—'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.9rem' }}>
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
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
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
    </nav>
  );
}

export default FloorSelector;
