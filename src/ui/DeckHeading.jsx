// A floor's own name, stencilled on the wall above whatever is standing on it.
//
// The rule beside it is the part worth stating. In the reference it is not a
// divider between two things — there is nothing on its far side — it is the
// remainder of a line the heading is set on, fading as it runs out into the
// unlit end of the corridor. So it is a gradient rather than a flat hairline,
// and it starts at the cream the letters are in rather than at the panel line
// colour, which is what made it read as a table border.
//
// The letters get the warm bleed everything else lit by the pendant gets, over
// the hard black offset that keeps them legible against plaster of nearly their
// own value.
function DeckHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.4rem' }}>
      <h2
        style={{
          fontFamily: 'var(--display)', fontWeight: 400, fontSize: 26,
          letterSpacing: 3, textTransform: 'uppercase',
          margin: 0, color: 'var(--ink)',
          textShadow: '0 2px 0 rgba(0,0,0,0.6), 0 0 18px rgba(255,190,110,0.16)',
        }}
      >
        {children}
      </h2>
      <span
        style={{
          flex: 1, height: 1, marginTop: 2,
          background: 'linear-gradient(90deg, rgba(236,225,200,0.5) 0%, rgba(236,225,200,0.18) 45%, rgba(236,225,200,0) 100%)',
        }}
      />
    </div>
  );
}

export default DeckHeading;
