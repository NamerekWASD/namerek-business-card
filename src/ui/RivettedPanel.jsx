import CornerRivets from './CornerRivets.jsx';

// `lag` is the deck's inertia: while the cabin accelerates, the plates trail
// behind the motion and only settle a beat after the ride stops, which is what
// gives them apparent mass. `i` staggers that lag so they don't move as a block.
function RivettedPanel({ children, style, lag = 0, i = 0 }) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(160deg, #342515, #241a10)',
        border: '1px solid var(--line)',
        borderRadius: 4,
        boxShadow: '0 10px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        transform: `translateY(${(lag * (1 + i * 0.24)).toFixed(2)}px)`,
        ...style,
      }}
    >
      <CornerRivets />
      {children}
    </div>
  );
}

export default RivettedPanel;
