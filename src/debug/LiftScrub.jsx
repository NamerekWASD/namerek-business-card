import { btnStyle } from './btnStyle.js';

function LiftScrub({ scrub, setScrub, deckCount }) {
  const ride = scrub || { from: 0, to: deckCount - 1, p: 0 };
  const set = (patch) => setScrub({ ...ride, ...patch });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>lift ride debug</span>
        <span>{ride.from + 1} → {ride.to + 1} · {(ride.p * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.005}
        value={ride.p}
        onChange={(e) => set({ p: Number(e.target.value) })}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => set({ from: 0, to: 1 })} style={btnStyle}>1→2</button>
        <button onClick={() => set({ from: 0, to: 2 })} style={btnStyle}>1→3</button>
        <button onClick={() => set({ from: 2, to: 0 })} style={btnStyle}>3→1</button>
        <button onClick={() => set({ from: 0, to: 3 })} style={btnStyle}>1→4</button>
        <button onClick={() => set({ from: 3, to: 0 })} style={btnStyle}>4→1</button>
        <button onClick={() => setScrub(null)} style={btnStyle}>release</button>
      </div>
    </div>
  );
}

export default LiftScrub;
