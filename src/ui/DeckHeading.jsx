function DeckHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.4rem' }}>
      <h2
        style={{
          fontFamily: 'var(--display)', fontWeight: 400, fontSize: 26,
          letterSpacing: 2, textTransform: 'uppercase',
          margin: 0, textShadow: '0 2px 0 rgba(0,0,0,0.5)',
        }}
      >
        {children}
      </h2>
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

export default DeckHeading;
