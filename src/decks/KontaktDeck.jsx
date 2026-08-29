import { PERSON } from './content.js';

function KontaktDeck() {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--display)', fontWeight: 400, fontSize: 24, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>{PERSON.greeting}</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '1.6rem', flexWrap: 'wrap' }}>
        <a
          href={`mailto:${PERSON.email}`}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--brass)', color: 'var(--glow)', borderRadius: 2, padding: '0.7rem 1.2rem', textDecoration: 'none' }}
        >
          {PERSON.email}
        </a>
        <a
          href={PERSON.linkedin}
          target="_blank" rel="noreferrer"
          style={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--line)', color: 'var(--muted)', borderRadius: 2, padding: '0.7rem 1.2rem', textDecoration: 'none' }}
        >
          LinkedIn
        </a>
      </div>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: '2rem', letterSpacing: 1 }}>
        {`${PERSON.city} — ${PERSON.availability}`.toUpperCase()}
      </p>
    </div>
  );
}

export default KontaktDeck;
