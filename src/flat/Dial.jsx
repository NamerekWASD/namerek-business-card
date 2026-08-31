import { rivetURL } from '../ui/rivet.js';

// A panel instrument. **The needle indicates nothing measurable and must never
// be read as one** — no percentage, no proficiency score. It sits at a
// plausible working position and the instrument is a frame for the label, the
// way a real panel meter labels a circuit rather than grading it. The caption
// under the board says so in as many words, because a dial invites exactly the
// reading it must not be given.
//
// ── NBC-64: why this stopped being a square ──────────────────────────────────
// What was here was a square plate filled with a top-to-bottom gradient, a
// second square of flat colour inside it, and a third square of white gradient
// laid over the whole face as "sheen". Three flat rectangles cannot describe a
// recessed instrument no matter what colours they are given, and the diagonal
// wash over the glass was the part that read worst: a gauge's glass reflects
// the room in one place, not everywhere at once.
//
// A panel instrument of this period is round and it is *stepped*, and the steps
// are what carry the volume — there is no 3D here and none is wanted:
//
// 1. the **flange** bolted to the board, with its own arris catching the lamp
//    along the upper left and going dark along the lower right;
// 2. a **step down** to the brass bezel ring, which is the brightest thing on
//    the instrument because it is the part that faces up;
// 3. the **face**, sunk below both, wearing the crescent shadow the bezel casts
//    across its top. That crescent is the single strongest depth cue on the
//    whole gauge — it is what says the face is *behind* something;
// 4. the **glass**, one raking highlight across the upper left and nothing
//    else, and the needle floating on its own shadow above the face.
//
// The bolts are the same asset as every other bolt in the building
// (`ui/rivet.js`), on a bolt circle round the flange.

const RIVET = rivetURL();

// Every dial on the board is drawn with identical gradients, so they are
// declared once for the page rather than four times over with four copies of
// the same ids — which is what the old file did, and duplicate ids in one
// document resolve to whichever came first. The board renders this; a `Dial`
// standing anywhere else has to render it too.
export function DialDefs() {
  return (
    <svg className="dial-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dialFlange" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#3d2e1d" />
          <stop offset="0.5" stopColor="#251b12" />
          <stop offset="1" stopColor="#140e08" />
        </linearGradient>
        <linearGradient id="dialBezel" x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#d8b06a" />
          <stop offset="0.42" stopColor="#8e6a2e" />
          <stop offset="1" stopColor="#3a2a12" />
        </linearGradient>
        {/* The face is not one flat black: it lifts very slightly toward the
            lamp, which is what keeps it from reading as a hole punched in the
            plate. */}
        <radialGradient id="dialFace" cx="0.4" cy="0.34" r="0.78">
          <stop offset="0" stopColor="#1d1a12" />
          <stop offset="1" stopColor="#0a0906" />
        </radialGradient>
        {/* The shadow the bezel throws inward. Its centre sits *below* the
            middle of the face, so the crescent is heaviest along the top rim
            — where the overhang actually is. */}
        <radialGradient id="dialShade" cx="0.5" cy="0.68" r="0.66">
          <stop offset="0.52" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.8" />
        </radialGradient>
        <radialGradient id="dialGlass" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6e0" stopOpacity="0.15" />
          <stop offset="1" stopColor="#fff6e0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dialHub" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#c49a55" />
          <stop offset="0.55" stopColor="#6b4f22" />
          <stop offset="1" stopColor="#191106" />
        </radialGradient>
        <clipPath id="dialFaceClip">
          <circle cx="100" cy="100" r="72" />
        </clipPath>
      </defs>
    </svg>
  );
}

// The bolt circle on the flange. Eight small ones rather than four large: at
// four, each bolt is a landmark competing with the needle for the eye, and the
// gauge stops reading as an instrument and starts reading as a plate with a
// hole in it. Eight of half the size is a flange — you read the ring, not the
// bolts. Offset off the axes so none of them sits directly over a major tick.
const BOLT = 11;
const BOLTS = Array.from({ length: 8 }, (_, i) => {
  const rad = ((22.5 + i * 45) * Math.PI) / 180;
  return { x: 100 + Math.cos(rad) * 88.5, y: 100 + Math.sin(rad) * 88.5 };
});

function Dial({ needle, unit }) {
  const deg = needle * 240;
  const ticks = Array.from({ length: 11 }, (_, i) => -120 + i * 24);

  return (
    <svg className="dial" viewBox="0 0 200 200" role="img" aria-hidden="true" focusable="false">
      {/* the flange, and the arris round it */}
      <circle cx="100" cy="100" r="96" fill="url(#dialFlange)" />
      <path d="M 32 168 A 96 96 0 0 1 168 32" fill="none" stroke="#9b7739" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M 168 32 A 96 96 0 0 1 32 168" fill="none" stroke="#080503" strokeOpacity="0.8" strokeWidth="2" />

      {/* the step down to the bezel: a shoulder, dark at the top where the
          flange overhangs it */}
      <circle cx="100" cy="100" r="83" fill="#1a130c" />
      <path d="M 41 159 A 83 83 0 0 1 159 41" fill="none" stroke="#000000" strokeOpacity="0.75" strokeWidth="3" />

      {/* the bezel ring — the part that faces up, so the brightest thing here */}
      <circle cx="100" cy="100" r="77.5" fill="none" stroke="url(#dialBezel)" strokeWidth="9" />
      <circle cx="100" cy="100" r="82" fill="none" stroke="#0b0704" strokeOpacity="0.8" strokeWidth="1" />
      <circle cx="100" cy="100" r="73" fill="none" stroke="#0b0704" strokeOpacity="0.9" strokeWidth="1.5" />

      {/* the face, sunk under both, and the crescent the bezel casts on it */}
      <circle cx="100" cy="100" r="72" fill="url(#dialFace)" />
      <circle cx="100" cy="100" r="72" fill="url(#dialShade)" />

      {ticks.map((t, i) => (
        <line
          key={t}
          x1="100"
          y1="38"
          x2="100"
          y2={i % 5 === 0 ? 50 : 46}
          stroke="#d0b895"
          strokeOpacity={i % 5 === 0 ? 0.9 : 0.45}
          strokeWidth={i % 5 === 0 ? 2 : 1}
          transform={`rotate(${t} 100 100)`}
        />
      ))}
      {/* The scale arc runs between the outermost ticks — all 240° of it, not
          the top half. A scale that stops short of its own end marks is the
          kind of detail that reads as wrong long before anyone works out why. */}
      <path d="M 52.4 127.5 A 55 55 0 1 1 147.6 127.5" fill="none" stroke="#c2903f" strokeOpacity="0.5" strokeWidth="1.5" />

      <text x="100" y="136" textAnchor="middle" fill="#d0b895" fontFamily="Space Mono, monospace" fontSize="11" letterSpacing="2">
        {unit}
      </text>

      {/* the needle, on its own shadow — the shadow is what lifts it off the
          face, and it is drawn inside the rotating group so it stays with it */}
      <g className="needle" style={{ '--needle-deg': `${deg}deg` }}>
        <line x1="102" y1="103" x2="102" y2="45" stroke="#000000" strokeOpacity="0.5" strokeWidth="4" />
        <line x1="100" y1="100" x2="100" y2="42" stroke="#ffb454" strokeWidth="3" />
        <line x1="100" y1="100" x2="100" y2="114" stroke="#8b5e22" strokeWidth="3" />
      </g>
      <circle cx="100" cy="100" r="7.5" fill="url(#dialHub)" stroke="#0f0a06" strokeWidth="1.5" />

      {/* the glass: one reflection, in one place */}
      <ellipse
        cx="74"
        cy="62"
        rx="60"
        ry="34"
        transform="rotate(-30 74 62)"
        fill="url(#dialGlass)"
        clipPath="url(#dialFaceClip)"
      />

      {BOLTS.map((b) => (
        <image
          key={`${b.x}-${b.y}`}
          href={RIVET}
          x={b.x - BOLT / 2}
          y={b.y - BOLT / 2}
          width={BOLT}
          height={BOLT}
        />
      ))}
    </svg>
  );
}

export default Dial;
