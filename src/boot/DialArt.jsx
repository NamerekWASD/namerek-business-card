import {
  LAMP_Y, LENS_R, PX, PY, STOPS, VIEW_H, VIEW_W, lampX,
} from './dial.js';

// The floor indicator's artwork, in three static layers: the instrument under
// the needle, the needle itself, and the glass over it. None of them is ever
// redrawn — the needle's layer is turned whole by the compositor, which is the
// only reason the filters and gradients in here cost nothing while it moves.

const FACE_R = 146;
const BEZEL_R = 162;
const PLATE_R = 178;

const INK = '#1d140c';
const RED = '#8c2f26';
const IRON = '#120d08';

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [PX + r * Math.sin(a), PY - r * Math.cos(a)];
};

const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' };

/** A slotted screw head; the slot angle is fixed so it never shimmers. */
function Screw({ x, y, r = 5, slot = 30 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r + 1} fill={IRON} opacity="0.7" />
      <circle r={r} fill="url(#bootScrew)" />
      <line
        x1={-r * 0.8} y1="0" x2={r * 0.8} y2="0" transform={`rotate(${slot})`}
        stroke={IRON} strokeWidth="1.3" strokeLinecap="round"
      />
    </g>
  );
}

/** A lamp's brass bezel and its dark lens; the lit glass is an HTML layer. */
function LampSeat({ x }) {
  return (
    <g transform={`translate(${x} ${LAMP_Y})`}>
      <circle r={LENS_R + 6} fill={IRON} opacity="0.8" />
      <circle r={LENS_R + 5} fill="url(#bootBrass)" />
      <circle r={LENS_R + 1.5} fill={IRON} />
      <circle r={LENS_R} fill="url(#bootLensOff)" />
      <ellipse cx={-3.5} cy={-4} rx="3.2" ry="2" fill="#fff" opacity="0.28" transform="rotate(-30 -3.5 -4)" />
    </g>
  );
}

/** The plate, the bezel, the enamel and the scale. */
export function DialFace({ lamps }) {
  const minor = [];
  const lo = STOPS[0].deg - 5;
  const hi = STOPS[STOPS.length - 1].deg + 5;
  for (let d = lo; d <= hi + 1e-6; d += 2.5) minor.push(d);
  const arc = (r) => {
    const [ax, ay] = polar(r, lo);
    const [bx, by] = polar(r, hi);
    return `M${ax} ${ay} A${r} ${r} 0 0 1 ${bx} ${by}`;
  };

  // Stepped shoulders, the way the era framed everything it bolted to a wall.
  const plate = [
    `M${PX - PLATE_R} ${PY + 4}`,
    `A${PLATE_R} ${PLATE_R} 0 0 1 ${PX + PLATE_R} ${PY + 4}`,
    `L${PX + PLATE_R} ${PY + 22} L${PX + PLATE_R + 10} ${PY + 22}`,
    `L${PX + PLATE_R + 10} ${VIEW_H - 8} L${PX - PLATE_R - 10} ${VIEW_H - 8}`,
    `L${PX - PLATE_R - 10} ${PY + 22} L${PX - PLATE_R} ${PY + 22} Z`,
  ].join(' ');
  const bezel = `M${PX - BEZEL_R} ${PY + 16} L${PX - BEZEL_R} ${PY} A${BEZEL_R} ${BEZEL_R} 0 0 1 ${PX + BEZEL_R} ${PY} L${PX + BEZEL_R} ${PY + 16} Z`;
  const face = `M${PX - FACE_R} ${PY + 8} L${PX - FACE_R} ${PY} A${FACE_R} ${FACE_R} 0 0 1 ${PX + FACE_R} ${PY} L${PX + FACE_R} ${PY + 8} Z`;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={fill}>
      <defs>
        <linearGradient id="bootBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5a3c17" />
          <stop offset="20%" stopColor="#d9aa58" />
          <stop offset="34%" stopColor="#8b5e22" />
          <stop offset="56%" stopColor="#ecc77f" />
          <stop offset="76%" stopColor="#9c6c2c" />
          <stop offset="100%" stopColor="#4a3112" />
        </linearGradient>
        <radialGradient id="bootScrew" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#e6c07a" />
          <stop offset="60%" stopColor="#8b5e22" />
          <stop offset="100%" stopColor="#3d2a10" />
        </radialGradient>
        <linearGradient id="bootPlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33271c" />
          <stop offset="100%" stopColor="#140f0a" />
        </linearGradient>
        <radialGradient id="bootEnamel" cx={PX} cy={PY - 40} r={FACE_R * 1.1} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f6ecd2" />
          <stop offset="70%" stopColor="#e6d8b6" />
          <stop offset="100%" stopColor="#c4ad84" />
        </radialGradient>
        {/* the bezel's shadow falling in on the enamel */}
        <radialGradient id="bootRimShade" cx={PX} cy={PY} r={FACE_R} gradientUnits="userSpaceOnUse">
          <stop offset="84%" stopColor="#2a1a0a" stopOpacity="0" />
          <stop offset="100%" stopColor="#2a1a0a" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="bootLensOff" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#6b3510" />
          <stop offset="70%" stopColor="#2a1206" />
          <stop offset="100%" stopColor="#120703" />
        </radialGradient>
        <filter id="bootGrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.22  0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0.5 -0.12" />
        </filter>
        <filter id="bootWear" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.9 -0.42" />
        </filter>
        <clipPath id="bootFaceClip"><path d={face} /></clipPath>
        <clipPath id="bootPlateClip"><path d={plate} /></clipPath>
      </defs>

      <path d={plate} fill="url(#bootPlate)" stroke={IRON} strokeWidth="3" />
      <rect width={VIEW_W} height={VIEW_H} filter="url(#bootGrain)" clipPath="url(#bootPlateClip)" opacity="0.9" />
      <path d={plate} fill="none" stroke="#e8c8a0" strokeOpacity="0.14" strokeWidth="1.2" transform="translate(0 1.2)" />

      <path d={bezel} fill={IRON} transform="translate(0 3)" opacity="0.6" />
      <path d={bezel} fill="url(#bootBrass)" stroke={IRON} strokeWidth="1.5" />
      <path d={`M${PX - BEZEL_R + 5} ${PY} A${BEZEL_R - 5} ${BEZEL_R - 5} 0 0 1 ${PX + BEZEL_R - 5} ${PY}`} fill="none" stroke="#fff1c9" strokeOpacity="0.35" strokeWidth="1" />

      <path d={face} fill="url(#bootEnamel)" stroke={IRON} strokeWidth="1.5" />
      <g clipPath="url(#bootFaceClip)">
        <rect width={VIEW_W} height={VIEW_H} filter="url(#bootWear)" opacity="0.5" />
        <rect width={VIEW_W} height={VIEW_H} filter="url(#bootGrain)" opacity="0.7" />
        <path d={face} fill="url(#bootRimShade)" />
      </g>

      <path d={arc(134)} fill="none" stroke={INK} strokeWidth="1.6" />
      <path d={arc(130)} fill="none" stroke={INK} strokeWidth="0.6" />
      {minor.map((d) => {
        const half = Math.abs(((d - STOPS[0].deg) / ((STOPS[1].deg - STOPS[0].deg) / 2)) % 1) < 1e-6;
        const [x1, y1] = polar(half ? 120 : 125, d);
        const [x2, y2] = polar(130, d);
        return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={half ? 1.4 : 0.8} />;
      })}
      {STOPS.map((s, i) => {
        const colour = i === 0 ? RED : INK;
        const [a1x, a1y] = polar(134, s.deg - 1.6);
        const [a2x, a2y] = polar(134, s.deg + 1.6);
        const [tipx, tipy] = polar(108, s.deg);
        const [tx, ty] = polar(86, s.deg);
        const wide = s.tick.length > 1;
        return (
          <g key={s.tick}>
            <path d={`M${a1x} ${a1y} L${a2x} ${a2y} L${tipx} ${tipy} Z`} fill={colour} />
            <text
              x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fill={colour}
              style={{
                fontFamily: "var(--display, 'Archivo Black', sans-serif)",
                fontSize: wide ? 22 : 30,
                letterSpacing: wide ? 1 : 0,
              }}
            >
              {s.tick}
            </text>
          </g>
        );
      })}
      <text
        x={PX} y={PY - 28} textAnchor="middle" fill={INK} opacity="0.62"
        style={{ fontFamily: "var(--mono, 'Space Mono', monospace)", fontSize: 9, letterSpacing: 3.5 }}
      >
        STOCKWERK
      </text>

      <Screw x={PX - PLATE_R} y={PY + 52} slot={20} />
      <Screw x={PX + PLATE_R} y={PY + 52} slot={-35} />
      <Screw x={PX - PLATE_R} y={VIEW_H - 28} slot={70} />
      <Screw x={PX + PLATE_R} y={VIEW_H - 28} slot={-10} />
      <Screw x={PX} y={PY - BEZEL_R - 8} r={4} slot={45} />

      {Array.from({ length: lamps }, (_, i) => <LampSeat key={i} x={lampX(i, lamps)} />)}
    </svg>
  );
}

/** Pointing straight up. The layer it is drawn on is what turns. */
export function DialNeedle() {
  // Drawn about the pivot, then moved onto it.
  const blade = 'M-2.6 0 L-1.1 -100 L-5.2 -110 L0 -128 L5.2 -110 L1.1 -100 L2.6 0 L2.4 10 L-2.4 10 Z';
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={fill}>
      <defs>
        <filter id="bootNeedleShadow" x="-50%" y="-20%" width="200%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <linearGradient id="bootBlued" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2c2a36" />
          <stop offset="50%" stopColor="#4b4a5e" />
          <stop offset="51%" stopColor="#16151d" />
          <stop offset="100%" stopColor="#0c0b10" />
        </linearGradient>
        <radialGradient id="bootCap" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fbe3a6" />
          <stop offset="45%" stopColor="#c2903f" />
          <stop offset="100%" stopColor="#4a3112" />
        </radialGradient>
      </defs>
      <g transform={`translate(${PX + 1.5} ${PY + 3})`} opacity="0.45" filter="url(#bootNeedleShadow)">
        <path d={blade} fill="#000" />
      </g>
      <g transform={`translate(${PX} ${PY})`}>
        <path d={blade} fill="url(#bootBlued)" stroke="#07060a" strokeWidth="0.6" strokeLinejoin="round" />
        <circle r="15" fill="#07060a" opacity="0.5" transform="translate(0 2)" />
        <circle r="14" fill="url(#bootCap)" stroke="#2a1c0a" strokeWidth="1" />
        <circle r="6" fill="url(#bootCap)" stroke="#2a1c0a" strokeWidth="0.8" />
        <circle cx="-2" cy="-2" r="1.6" fill="#fff" opacity="0.55" />
      </g>
    </svg>
  );
}

/** The glass over the dial: a reflection, and nothing to look at but that. */
export function DialGlass() {
  const face = `M${PX - FACE_R} ${PY + 8} L${PX - FACE_R} ${PY} A${FACE_R} ${FACE_R} 0 0 1 ${PX + FACE_R} ${PY} L${PX + FACE_R} ${PY + 8} Z`;
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={fill}>
      <defs>
        <linearGradient id="bootSheen" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bootGlassClip"><path d={face} /></clipPath>
      </defs>
      <g clipPath="url(#bootGlassClip)">
        <ellipse cx={PX - 52} cy={PY - 112} rx="150" ry="46" transform={`rotate(-24 ${PX - 52} ${PY - 112})`} fill="url(#bootSheen)" />
        <path
          d={`M${PX + 96} ${PY - 104} A${FACE_R - 10} ${FACE_R - 10} 0 0 1 ${PX + 132} ${PY - 40}`}
          fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
