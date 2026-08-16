import { useMemo } from 'react';
import { SHAFT_DEPTH } from '../model/camera.js';

// The cable that replaced the guide rail. It runs the height of the shaft on the
// lamp side, black as tar, tied back to the wall every so often.
//
// It wanders, and that is the entire reason it works where the rail did not. A
// straight vertical bar facing the camera projects to a constant-width stripe:
// both its long edges are at the same depth, there is no convergence to be had,
// and shading is the only cue left. A line that snakes gives its own position
// away at every turn — you read the wall behind it from the wander, for free,
// and it costs one path.
//
// The wave repeats exactly, so the path is built once and the whole run is
// translated by travelY modulo one period. That keeps it to a transform per
// frame rather than a few hundred points of geometry, which matters here more
// than it looks: this thing spans the full height of the shaft.
const CABLE = {
  on: true,
  sway: 2, // how far it wanders either side of its run
  wave: 140, // one full snake
  width: 9,
  tie: 170, // between the clips holding it back
};

function ShaftCable({ vh, x, travelY }) {
  // The strip is only as wide as the cable wanders and only as tall as one
  // viewport plus a wave either side. Drawn across the full wall it was a five
  // megapixel SVG being repainted every frame, which froze the renderer outright
  // — the visible cost of forgetting that an SVG is not free just because it is
  // one element.
  const pad = 24;
  const W = CABLE.sway * 2 + pad * 2;
  const total = vh + CABLE.wave * 2;

  const { d, ties } = useMemo(() => {
    const at = (y) => CABLE.sway + pad + CABLE.sway * Math.sin((y / CABLE.wave) * Math.PI * 2);
    const pts = [];
    for (let y = 0; y <= total; y += 18) pts.push(`${at(y).toFixed(1)} ${y}`);
    const t = [];
    for (let y = CABLE.tie / 2; y <= total; y += CABLE.tie) t.push([at(y), y]);
    return { d: `M${pts.join(' L')}`, ties: t };
  }, [total]);

  if (!CABLE.on) return null;
  const shift = ((travelY % CABLE.wave) + CABLE.wave) % CABLE.wave;

  return (
    <div
      style={{
        position: 'absolute', left: x - CABLE.sway - pad, top: -CABLE.wave, width: W, height: total,
        transform: `translate3d(0, ${shift.toFixed(1)}px, ${-SHAFT_DEPTH + 3}px)`,
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    >
      <svg width={W} height={total} style={{ display: 'block' }} aria-hidden>
        {/* the cable itself, then a hair of sheen a pixel off centre — a cable is
            round and a flat black line is a crack in the wall */}
        <path d={d} fill="none" stroke="#080706" strokeWidth={CABLE.width} strokeLinecap="round" />
        <path d={d} fill="none" stroke="rgba(150,138,120,0.14)" strokeWidth={1.6} transform="translate(-2.2 -0.6)" />
        {ties.map(([tx, ty]) => (
          <g key={ty}>
            <rect x={tx - 9} y={ty - 3.5} width={18} height={7} rx={1.5} fill="#1b1712" />
            <rect x={tx - 9} y={ty - 3.5} width={18} height={1.2} fill="rgba(196,166,112,0.18)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default ShaftCable;
