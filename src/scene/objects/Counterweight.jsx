import { steelFace } from '../renderers/css3d/surfaceStyle.js';

// The counterweight hangs on the other end of the ropes, so it runs opposite the
// cabin: on screen that is twice the shaft's rate, in the same direction the
// shaft appears to move. Anchored to hang into the top of the frame while the
// cabin rests on deck 02 — at ride speed it is smeared past recognition, so it
// needs one resting place where you can see what it is. A box, again: face,
// inboard side, and the underside you actually look up at.
function Counterweight({ y, height, dir, shade }) {
  const WIDTH = 62;
  const DEPTH = 42;
  const PLATE_PITCH = 34;
  // Only the bottom of the block is ever in frame — it hangs down into the top
  // of the picture — so the plates are built where they can be seen and the rest
  // of the column stays a plain face.
  const VISIBLE_RUN = 460;
  const plates = Math.floor(VISIBLE_RUN / PLATE_PITCH);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translate3d(0, ${y.toFixed(1)}px, 0)` }}>
      <div style={{ position: 'absolute', top: 0, left: -WIDTH / 2, width: WIDTH, height, transform: `translateZ(${DEPTH / 2}px)`, ...steelFace(58, 0.85 * shade.front) }} />
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? WIDTH / 2 : -WIDTH / 2) - DEPTH / 2, width: DEPTH, height, transform: `rotateY(${dir * 90}deg)`, ...steelFace(46, 0.5 * shade.side) }} />
      <div style={{ position: 'absolute', top: height - DEPTH / 2, left: -WIDTH / 2, width: WIDTH, height: DEPTH, transform: 'rotateX(-90deg)', transformOrigin: '50% 0%', ...steelFace(40, 0.3 * shade.under) }} />

      {/* The joints between the plates, as actual ledges rather than a hairline
          in a repeating gradient. A stack of iron is only legible as a stack if
          the top of each plate catches something the face of it does not, and a
          1px white line inside one flat plane can never do that. */}
      {Array.from({ length: plates }).map((_, k) => (
        <div
          key={k}
          style={{
            position: 'absolute', top: height - VISIBLE_RUN + k * PLATE_PITCH, left: -WIDTH / 2 + 5, width: WIDTH - 10, height: 5,
            transformOrigin: '50% 100%',
            transform: `translateZ(${DEPTH / 2}px) rotateX(64deg)`,
            ...steelFace(26, 1.55 * shade.top),
            boxShadow: '0 2px 4px rgba(0,0,0,0.7)',
          }}
        />
      ))}

      {/* crosshead the ropes terminate in */}
      <div style={{ position: 'absolute', top: -16, left: -WIDTH / 2 - 8, width: WIDTH + 16, height: 17, transform: `translateZ(${DEPTH / 2 + 3}px)`, ...steelFace(38, 1.1 * shade.front), borderRadius: 2, boxShadow: '0 3px 7px rgba(0,0,0,0.75)' }} />
    </div>
  );
}

export default Counterweight;
