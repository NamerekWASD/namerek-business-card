import { memo } from 'react';
import { LAMPS, lightAt } from '../model/lighting.js';
import { ironFace, steelFace } from '../renderers/css3d/surfaceStyle.js';

// The shaft's bulkhead lamp, built rather than drawn: a cast base bolted to
// the wall, a cylindrical body, a ribbed glass and the guard over it. It is
// the only light source in the shaft, seen close and often mid-frame, which
// is what earns it real geometry — the corridor's own fitting is a different,
// much flatter fixture (`CorridorFixture.jsx`) for exactly the opposite
// reason.
//
// The body is a genuine cylinder — ten quads stood on end around the axis,
// each one shaded from its own normal by the same `lightAt` the rest of the
// scene uses. That is most of the reason for modelling it at all. Everywhere
// else the shading is a claim I cannot check; here we know exactly where the
// light is, so the roundness either comes out of the arithmetic or the
// arithmetic is wrong. Ten rather than sixteen: past a few segments more
// roundness is not legible at this size, but every one is its own compositor
// layer, and a shaft with three or four of these lit at once was carrying
// dozens of layers for a smoothness nobody could see.
//
// Split into three pieces because they change at three different rates. The
// glass, guard and halo never depend on where the light is — they are the
// same seven elements every time — so they are memoized on geometry alone and
// never re-render after the first frame. The ten body quads depend on
// shading that moves every ride tick but is quantised, so the quantised value
// is what they are memoized on: most ticks, ten elements' worth of
// transforms and colours are skipped rather than recomputed for a browser
// that would have painted the same pixels anyway. Only the wrapper (this
// lamp's position in the shaft) and the base plate (one element) are cheap
// enough to just re-render every time.
function shadesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

const LampFixed = memo(function LampFixed({ radius, depth }) {
  const bars = [0, 45, 90, 135];
  return (
    <>
      {/* the pool it throws on the wall behind it. The far wall is parallel to
          the image plane, so this lands where it should with no correction. */}
      <div
        style={{
          position: 'absolute', left: -radius * 4.6, top: -radius * 4.6, width: radius * 9.2, height: radius * 9.2,
          transform: `translateZ(${-depth + 1}px)`,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,206,140,0.5) 0%, rgba(255,170,84,0.2) 26%, rgba(190,110,40,0.06) 58%, rgba(0,0,0,0) 78%)',
          mixBlendMode: 'screen',
        }}
      />
      {/* the glass. Concentric ribs, because that is what the pressed prismatic
          lens in one of these actually is, and they give the disc a centre. */}
      <div
        style={{
          position: 'absolute', left: -radius * 0.8, top: -radius * 0.8, width: radius * 1.6, height: radius * 1.6,
          transform: 'translateZ(-3px)', borderRadius: '50%',
          backgroundImage: [
            'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0 2px, rgba(90,50,10,0.24) 2px 7px)',
            'radial-gradient(circle at 50% 40%, #fff6dd 0%, #ffd28a 20%, #e79b34 48%, #8a5615 84%)',
          ].join(', '),
          backgroundBlendMode: 'overlay, normal',
          boxShadow: '0 0 34px 10px rgba(255,190,104,0.75), inset 0 0 14px rgba(120,64,10,0.5)',
        }}
      />
      {/* the guard: a ring and four bars across it, dark against the glass */}
      <div
        style={{
          position: 'absolute', left: -radius * 0.86, top: -radius * 0.86, width: radius * 1.72, height: radius * 1.72,
          transform: 'translateZ(8px)', borderRadius: '50%',
          border: '4px solid #2a231a',
          boxShadow: 'inset 0 1px 0 rgba(255,214,150,0.35), 0 1px 0 rgba(0,0,0,0.6)',
        }}
      />
      {bars.map((deg) => (
        <div
          key={deg}
          style={{
            position: 'absolute', left: -radius * 0.9, top: -2.5, width: radius * 1.8, height: 5,
            transform: `translateZ(9px) rotate(${deg}deg)`,
            background: 'linear-gradient(180deg, #4b4033, #1a150f)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.7)',
          }}
        />
      ))}
      {/* the halo. Not a light — the glass is small and very bright, and a bright
          small thing bleeds in any real lens as well as in this one. */}
      <div
        style={{
          position: 'absolute', left: -radius * 2.2, top: -radius * 2.2, width: radius * 4.4, height: radius * 4.4,
          transform: 'translateZ(12px)', borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,224,170,0.7) 0%, rgba(255,178,88,0.28) 30%, rgba(255,150,50,0.07) 60%, rgba(0,0,0,0) 76%)',
          mixBlendMode: 'screen',
        }}
      />
    </>
  );
}, (prev, next) => prev.radius === next.radius && prev.depth === next.depth);

const LampBody = memo(function LampBody({ radius, depth, segWidth, shades }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translateZ(${-depth / 2}px)` }}>
      {shades.map((shade, k) => (
        <div
          key={k}
          style={{
            position: 'absolute', left: -segWidth / 2, top: -depth / 2, width: segWidth, height: depth,
            transform: `rotate(${((k / shades.length) * 360).toFixed(2)}deg) translateY(${-radius}px) rotateX(90deg)`,
            ...steelFace(28, shade),
          }}
        />
      ))}
    </div>
  );
}, (prev, next) => prev.radius === next.radius && prev.depth === next.depth && prev.segWidth === next.segWidth && shadesEqual(prev.shades, next.shades));

function Lamp({ p, lamps, size = LAMPS.size }) {
  const radius = size / 2;
  const SEGMENTS = 10;
  const depth = LAMPS.proud * (size / LAMPS.size);
  // a hair wider than the arc, so the quads meet instead of showing seams
  const segWidth = (2 * Math.PI * radius) / SEGMENTS + 2;

  const baseShade = Math.min(1.6, lightAt([p.x, p.y, p.z - depth], [0, 0, 1], lamps, p));

  const shades = [];
  for (let k = 0; k < SEGMENTS; k += 1) {
    const a = (k / SEGMENTS) * Math.PI * 2;
    const nx = Math.sin(a);
    const ny = -Math.cos(a);
    const shade = lightAt([p.x + radius * nx, p.y + radius * ny, p.z - depth / 2], [nx, ny, 0], lamps, p);
    shades.push(Math.min(1.7, shade * 0.72));
  }

  return (
    <div
      style={{
        position: 'absolute', left: p.x, top: p.y, width: 0, height: 0,
        transformStyle: 'preserve-3d', transform: `translateZ(${p.z}px)`,
      }}
    >
      <LampFixed radius={radius} depth={depth} />

      {/* the base plate */}
      <div
        style={{
          position: 'absolute', left: -radius * 1.05, top: -radius * 1.05, width: radius * 2.1, height: radius * 2.1,
          transform: `translateZ(${-depth}px)`, borderRadius: '50%',
          ...ironFace(46, baseShade),
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5)',
        }}
      />

      <LampBody radius={radius} depth={depth} segWidth={segWidth} shades={shades} />
    </div>
  );
}

export default Lamp;
