import ArcadeCabinet from '../ui/ArcadeCabinet.jsx';
import FloorDial from '../ui/FloorDial.jsx';
import { useIsR3F } from '../scene/renderers/active.js';

function StartDeck({ lag, pos }) {
  const r3f = useIsR3F();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 300 }}>
      <h1
        style={{
          fontFamily: 'var(--display)', fontWeight: 400,
          fontSize: 'clamp(2rem, 5.4vw, 3.2rem)', lineHeight: 1.02, margin: '1.2rem 0 0',
          letterSpacing: '-0.01em', textTransform: 'uppercase',
          textShadow: '0 2px 0 rgba(0,0,0,0.5)',
          transform: `translateY(${(lag * 0.8).toFixed(2)}px)`,
        }}
      >
        Mykolai
        <br />
        Tymchenko
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--glow)', margin: '1rem 0 0', textShadow: '0 0 10px rgba(255,180,84,0.5)',
          transform: `translateY(${(lag * 1.1).toFixed(2)}px)`,
        }}
      >
        .NET / C# &mdash; Backend &amp; Fullstack
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 340, margin: '1rem 0 0', transform: `translateY(${(lag * 1.35).toFixed(2)}px)` }}>
        Baue Systeme, die tragen &mdash; von der Datenbank bis zur Oberfl&auml;che.
        Offen f&uuml;r neue Aufgaben im Ruhrgebiet / NRW.
      </p>
      </div>
      {/* <div style={{ transform: `translateY(${(lag * 0.5).toFixed(2)}px)`, flex: '0 1 260px', display: 'flex', justifyContent: 'center' }}>
        <FloorDial pos={pos} />
      </div> */}

      {/* Under the WebGL backend the cabinet is a real object standing on the
          landing rather than a picture of one laid out in the deck's flow, so
          the deck stands its own copy down. It is the one piece of this scene
          that moved *out* of the DOM on purpose: everything else that left was
          structure, this is the object the mark lives on. */}
      {!r3f && (
        <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center', transform: `translateY(${(lag * 0.7).toFixed(2)}px)` }}>
          <ArcadeCabinet pitch={-2} />
        </div>
      )}
    </div>
  );
}

export default StartDeck;
