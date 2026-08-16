import { LAYERS } from '../scene/layers.js';
import { DOOR_TOTAL_MS } from '../lift/intro.js';
import { DECKS } from '../lift/decks.js';
import FpsMeter from './FpsMeter.jsx';
import LiftScrub from './LiftScrub.jsx';
import { btnStyle } from './btnStyle.js';

function DebugPanel({ t, setT, playing, play, scrub, setScrub, blurEnabled }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: LAYERS.debug,
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: 300,
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        color: '#fff',
      }}
    >
      <FpsMeter blurEnabled={blurEnabled} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>door intro debug</span>
        <span>{Math.round(t)}ms / {DOOR_TOTAL_MS}ms</span>
      </div>
      <input
        type="range"
        min={0}
        max={DOOR_TOTAL_MS}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setT(0)} style={btnStyle}>0</button>
        <button onClick={() => setT(Math.min(DOOR_TOTAL_MS, t + 50))} style={btnStyle}>+50ms</button>
        <button onClick={() => setT(Math.min(DOOR_TOTAL_MS, t + 100))} style={btnStyle}>+100ms</button>
        <button onClick={() => setT(Math.min(DOOR_TOTAL_MS, t + 200))} style={btnStyle}>+200ms</button>
        <button onClick={() => setT(Math.min(DOOR_TOTAL_MS, t + 300))} style={btnStyle}>+300ms</button>
        <button onClick={() => play(0)} style={btnStyle}>{playing ? '▶ playing…' : '▶ play'}</button>
      </div>
      <LiftScrub scrub={scrub} setScrub={setScrub} deckCount={DECKS.length} />
    </div>
  );
}

export default DebugPanel;
