import { memo } from 'react';

// A rivet seam running the full height of the shaft wall. Offsetting it modulo
// the pitch makes it endless: the wall can travel any distance and the seam
// never runs out or visibly restarts.
const RIVET_PITCH = 46;

// The spans themselves, built once. Their props only change when the window
// resizes, so between resizes React does not walk them at all.
const RivetSeam = memo(function RivetSeam({ depth, span, nearEdge }) {
  const rows = Math.ceil(span / RIVET_PITCH) + 2;
  return Array.from({ length: rows }).map((_, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', top: i * RIVET_PITCH - RIVET_PITCH, [nearEdge]: depth,
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--rivet)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)',
      }}
    />
  ));
});

// The rivets hold still and the seam they are on slides, so the movement is one
// transform on the group. The memo above is the other half of that, and it is
// the half that mattered: writing a new `top` to each span was cheap next to
// *creating* thirty style objects per seam, six seams a wall, on every frame,
// only for React to conclude that nothing had changed.
function ShaftRivets({ offset, depth, span, nearEdge }) {
  const shift = ((offset % RIVET_PITCH) + RIVET_PITCH) % RIVET_PITCH;
  return (
    <div style={{ position: 'absolute', inset: 0, transform: `translateY(${shift.toFixed(1)}px)` }}>
      <RivetSeam depth={depth} span={span} nearEdge={nearEdge} />
    </div>
  );
}

export default ShaftRivets;
