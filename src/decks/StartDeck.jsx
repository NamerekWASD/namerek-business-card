import { PERSON } from './content.js';

function StartDeck() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 300 }}>
      <h1
        style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: 'clamp(2rem, 5.4vw, 3.2rem)', lineHeight: 1.02, margin: '1.2rem 0 0',
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
        {PERSON.role}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 340, margin: '1rem 0 0' }}>
        {PERSON.intro.join(' ')}
      </p>
      </div>
    </div>
  );
}

export default StartDeck;
