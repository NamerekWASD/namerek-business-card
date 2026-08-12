import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Grain from './shared/Grain';
import rustBrass from '../assets/textures/rust-brass.jpg';
import bronzeWorn from '../assets/textures/bronze-worn.jpg';
import brushedSteel from '../assets/textures/brushed-steel.jpg';

const vars = {
  '--bg': '#1a120e',
  '--bg-2': '#2a1a10',
  '--panel': '#2c2015',
  '--screen': '#100f0a',
  '--ink': '#ECE1C8',
  '--muted': '#a3906d',
  '--line': '#5c4530',
  '--brass': '#c2903f',
  '--brass-deep': '#8b5e22',
  '--glow': '#ffb454',
  '--rivet': '#4a3623',
  '--serif': "'Bitter', serif",
  '--mono': "'Space Mono', monospace",
};

// ── surfaces ─────────────────────────────────────────────────────────────────
// Every large plane in the scene is described here rather than inline, so the
// look can be dialled without going near the geometry. The textures were chosen
// back when they covered a few small fittings; spread over every surface at full
// strength they fight each other and the text, so `tex` is now a real scalar:
// 1 is the raw tile, 0 is flat colour, and the sensible range is 0.1–0.4.
const TILES = { rust: rustBrass, bronze: bronzeWorn, steel: brushedSteel, none: null };

const SURFACES = {
  // the corridor either side of us — furthest from the lamp, so the flattest
  shaftWall: { from: '#2b2521', to: '#14110e', tile: 'rust', scale: 320, tex: 0.22 },
  // the blind wall at the far end, between the landings
  backWall: { from: '#2e2822', to: '#171310', tile: 'rust', scale: 360, tex: 0.16 },
  // inside the landing: another room, so its own colour and its own light
  landing: { from: '#463a2c', to: '#221a12', tile: 'rust', scale: 300, tex: 0.14 },
  // the cage we are standing in — nearest, so it may carry the most grain
  cageRoof: { from: '#242019', to: '#12100d', tile: 'steel', scale: 190, tex: 0.3 },
  cageFloor: { from: '#3c342a', to: '#201b15', tile: 'steel', scale: 210, tex: 0.34 },
  cageSteel: { from: '#3b352d', to: '#1e1a15', tile: 'steel', scale: 130, tex: 0.36 },
  // the gate: painted mild steel, the one saturated thing in the frame
  // the two ends used to carry hand-set darkness values here; the lamps decide
  // that now, so all that is left is what the gate is made of
  cageGate: { bar: '#7f6a35', barDark: '#211c12', pitch: 40, thickness: 5 },
  doorLeaf: { from: '#3d3123', to: '#1c1610', tile: 'rust', scale: 280, tex: 0.26 },
  doorFrame: { from: '#4a4137', to: '#231e19', tile: 'steel', scale: 160, tex: 0.32 },
  // the small fittings — clips, shoes, rivetted plates, architrave members
  iron: { from: '#443626', to: '#241a11', tile: 'rust', scale: 70, tex: 0.3 },
  steel: { from: '#3f454a', to: '#1e2225', tile: 'steel', scale: 46, tex: 0.34 },
};

function channels(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

const rgb = (hex, k = 1) => `rgb(${channels(hex, k).join(', ')})`;
const rgba = (hex, a, k = 1) => `rgba(${channels(hex, k).join(', ')}, ${a})`;

// Composites one surface. The texture is muted by washing a flat coat of the
// surface's own shadow colour back over it — a genuine scalar, where blend modes
// alone only ever give you two or three fixed strengths.
//
// `shade` is folded into the colours rather than applied as
// `filter: brightness()`, and that is not a stylistic preference. A filter puts
// its element into a rasterisation buffer of its own; there were a hundred and
// seventy-six of them standing in this scene at rest, every one re-rastered on
// every frame of a ride. It also forces the used value of transform-style to
// flat, which is the trap that quietly flattened the counterweight, the old
// guide rail and the landing props for weeks. Multiplying the stops costs
// nothing and cannot do either.
//
// The tile follows along for free: it sits under the gradient in multiply, so
// scaling the gradient scales the product.
function surface(s, shade = 1) {
  const base = `linear-gradient(180deg, ${rgb(s.from, shade)}, ${rgb(s.to, shade)})`;
  const tile = TILES[s.tile];
  if (!tile || s.tex <= 0) return { backgroundImage: base };
  const wash = rgba(s.to, 1 - s.tex, shade);
  return {
    backgroundImage: `linear-gradient(${wash}, ${wash}), ${base}, url(${tile})`,
    backgroundSize: `auto, auto, ${s.scale}px ${s.scale}px`,
    backgroundBlendMode: 'normal, multiply, multiply',
  };
}

// Every tab is a deck of the same shaft: switching tabs is a lift ride, so the
// decks have an order and a direction — going from Kontakt back to Start rides
// *down*, and a three-floor hop takes longer than a neighbouring one.
// Named the way the building names them, not the way an array indexes them: the
// ground floor plate already reads EG, so 01..04 alongside it was the site
// inventing a second numbering for the same four floors. `tick` is the short
// form for the dial, where a full "1. OG" would not fit between the marks.
const DECKS = [
  { id: 'start', label: 'Start', no: 'EG', tick: 'EG' },
  { id: 'leistungen', label: 'Leistungen', no: '1. OG', tick: '1' },
  { id: 'projekte', label: 'Projekte', no: '2. OG', tick: '2' },
  { id: 'kontakt', label: 'Kontakt', no: '3. OG', tick: '3' },
];

// The three depth planes travel at different rates, which is what sells "the
// camera moved" instead of "a div slid": the side walls are nearest so they
// sweep past fastest, the content plane is the reference, the backdrop drifts.
const WALL_PARALLAX = 1.28;
const BG_PARALLAX = 0.42;

// Dead shaft between two decks, as a fraction of the viewport. The decks used
// to butt up against each other, which put a seam light exactly on the viewport
// edge at rest — so the settling overshoot flashed it in and out on every
// arrival. The buffer parks the seam safely off-screen instead; the ride gets
// slightly longer, which is a fair price.
const DECK_GAP = 0.4;

const LIFT_BASE_MS = 760;
const LIFT_PER_FLOOR_MS = 300;

function liftDuration(dist) {
  return LIFT_BASE_MS + LIFT_PER_FLOOR_MS * (Math.max(1, dist) - 1);
}

// A lift has three phases, not one curve: it pulls away, holds a cruising
// speed, then brakes. A plain ease-out spends the whole ride decelerating and
// covers ~90% of the distance in the first half, which reads as a tween.
// This integrates an explicit velocity profile instead.
const ACCEL = 0.18;
const DECEL = 0.44;
const CRUISE = 1 - ACCEL - DECEL;
const DIST_TOTAL = 0.4 * ACCEL + CRUISE + DECEL / 3;

function liftEase(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let s;
  if (p < ACCEL) {
    s = 0.4 * ACCEL * Math.pow(p / ACCEL, 2.5);
  } else if (p < ACCEL + CRUISE) {
    s = 0.4 * ACCEL + (p - ACCEL);
  } else {
    const u = (p - ACCEL - CRUISE) / DECEL;
    s = 0.4 * ACCEL + CRUISE + (DECEL / 3) * (1 - Math.pow(1 - u, 3));
  }
  const base = s / DIST_TOTAL;
  // hydraulic overshoot as the brakes bite, damped out over the last stretch —
  // the arrival is what makes it read as machinery rather than a tween
  const settleFrom = 0.78;
  if (p <= settleFrom) return base;
  const k = (p - settleFrom) / (1 - settleFrom);
  return base + Math.sin(k * Math.PI * 2) * 0.04 * (1 - k);
}

function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window === 'undefined' ? 1920 : window.innerWidth,
    vh: typeof window === 'undefined' ? 1080 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function useLift() {
  const [deck, setDeck] = useState(0);
  const [travel, setTravel] = useState(null);
  // a hand-driven stand-in for `travel`, so the ride can be frozen and dragged
  // frame by frame while tuning the easing — same trick the door intro uses
  const [scrub, setScrub] = useState(null);
  const rafRef = useRef(null);

  const go = (to) => {
    if (to === deck || travel) return;
    const from = deck;
    const dur = liftDuration(Math.abs(to - from));
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      if (p >= 1) {
        setTravel(null);
        setDeck(to);
        return;
      }
      setTravel({ from, to, p, dur });
      rafRef.current = requestAnimationFrame(tick);
    };
    setTravel({ from, to, p: 0, dur });
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const ride = scrub || travel;
  const pos = ride ? ride.from + (ride.to - ride.from) * liftEase(ride.p) : deck;
  // signed floors/second, sampled off the easing curve rather than off frame
  // deltas so it stays stable when a frame is dropped
  let velocity = 0;
  if (ride) {
    const d = 0.01;
    const a = liftEase(Math.max(0, ride.p - d));
    const b = liftEase(Math.min(1, ride.p + d));
    const dur = ride.dur || liftDuration(Math.abs(ride.to - ride.from));
    velocity = (ride.to - ride.from) * ((b - a) / (2 * d)) / (dur / 1000);
  }

  // raw (un-eased) ride progress, which is what the doors key off: they need to
  // track the phases of the trip, not the distance covered
  return { deck, pos, velocity, go, moving: !!ride, scrub, setScrub, ride, ridePhase: ride ? ride.p : null };
}

// Landing doors, folded into the ride rather than added to it. Closing runs over
// the acceleration phase and opening over the braking phase, so the trip gains
// no time at all — deliberately lengthening a transition to fit an animation in
// is how a transition starts to feel like a toll.
function doorClosure(phase) {
  if (phase == null) return 0;
  if (phase < ACCEL) return phase / ACCEL;
  const openFrom = ACCEL + CRUISE;
  if (phase < openFrom) return 1;
  return 1 - (phase - openFrom) / DECEL;
}

// …and which floor's doors those phases belong to. Exactly two floors have
// anything to do in a ride: the one being left, which shuts over the
// acceleration, and the one being arrived at, which opens over the braking.
// Every floor in between is one the lift is going past, and a lift going past a
// landing does not open its doors at it — riding one to four used to open three
// of them.
function doorClosureAt(f, ride, deck) {
  if (!ride) return f === deck ? 0 : 1;
  if (f === ride.from) return ride.p < ACCEL ? ride.p / ACCEL : 1;
  if (f === ride.to) {
    const openFrom = ACCEL + CRUISE;
    return ride.p < openFrom ? 1 : 1 - (ride.p - openFrom) / DECEL;
  }
  return 1;
}

function Rivets() {
  const pos = [{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }];
  return pos.map((p, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', width: 6, height: 6, borderRadius: '50%',
        background: 'var(--rivet)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)',
        ...p,
      }}
    />
  ));
}

function ScreenValue({ value, glow = true }) {
  return (
    <div
      style={{
        background: 'var(--screen)',
        borderRadius: 2,
        padding: '0.6rem 0',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 22,
          color: 'var(--glow)',
          textShadow: glow ? '0 0 8px rgba(255,180,84,0.7), 0 0 2px rgba(255,180,84,0.9)' : 'none',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function GaugeLogo() {
  return (
    <div style={{ position: 'relative', width: 96, height: 96, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.5))' }}>
      <motion.svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0 }} animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--brass)" strokeWidth="2" />
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * 360;
          return <rect key={i} x="45.5" y="4" width="5" height="10" fill="var(--brass)" transform={`rotate(${a} 48 48)`} />;
        })}
      </motion.svg>
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="48" cy="48" r="27" fill="var(--screen)" stroke="var(--brass-deep)" strokeWidth="2" />
      </svg>
      <motion.svg
        width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', inset: 0 }}
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.3, 1, 0.6, 1] }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <text x="48" y="55" textAnchor="middle" fontFamily="var(--mono)" fontSize="17" fill="var(--glow)" style={{ filter: 'drop-shadow(0 0 4px rgba(255,180,84,0.8))' }}>
          MT
        </text>
      </motion.svg>
    </div>
  );
}


// The intro is the landing doors of floor 01 opening — not a second, full-screen
// pair of doors laid over the scene. Once the shaft had real doors of its own,
// opening giant ones to reveal a lift with its own shut doors made no sense at
// all; the arrival we already animate on every ride is the arrival.
const DOOR_HOLD_END = 420;
const DOOR_SHAKE_END = 660;
const DOOR_TOTAL_MS = 2200;
const INTRO_OPEN_END = 1720;

function introClosure(t) {
  if (t <= DOOR_SHAKE_END) return 1;
  if (t >= INTRO_OPEN_END) return 0;
  const p = (t - DOOR_SHAKE_END) / (INTRO_OPEN_END - DOOR_SHAKE_END);
  // fast off the mark and easing into the stop, the way a heavy leaf actually
  // travels once the gear takes up
  return 1 - Math.pow(p, 0.55);
}

// the shudder before the leaves break apart: the gear engaging against a door
// that has been shut a long time
function introShake(t) {
  if (t < DOOR_HOLD_END || t > DOOR_SHAKE_END) return 0;
  const local = t - DOOR_HOLD_END;
  const span = DOOR_SHAKE_END - DOOR_HOLD_END;
  return Math.sin(local / 21) * 2.4 * (1 - local / span);
}

function useScrub(totalMs) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  const play = (from = 0) => {
    stop();
    setPlaying(true);
    setT(from);
    startRef.current = performance.now() - from;
    const tick = (now) => {
      const elapsed = now - startRef.current;
      if (elapsed >= totalMs) {
        setT(totalMs);
        setPlaying(false);
        return;
      }
      setT(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    play(0);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { t, setT: (v) => { stop(); setT(v); }, playing, play, stop };
}



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
        <button onClick={() => set({ from: 0, to: 3 })} style={btnStyle}>1→4</button>
        <button onClick={() => set({ from: 3, to: 0 })} style={btnStyle}>4→1</button>
        <button onClick={() => setScrub(null)} style={btnStyle}>release</button>
      </div>
    </div>
  );
}

// A frame meter, so the cost of a change is a number rather than an impression.
// It keeps its own state and updates twice a second, which is the whole point:
// it must not be able to re-render the scene it is measuring.
function FpsMeter({ blur }) {
  const [read, setRead] = useState({ fps: 0, worst: 0 });
  useEffect(() => {
    let id;
    let last = 0;
    let n = 0;
    let sum = 0;
    let worst = 0;
    let since = performance.now();
    const tick = (now) => {
      if (last) {
        const dt = now - last;
        n += 1;
        sum += dt;
        if (dt > worst) worst = dt;
      }
      last = now;
      if (now - since > 500 && n) {
        setRead({ fps: Math.round(1000 / (sum / n)), worst: Math.round(worst) });
        n = 0; sum = 0; worst = 0; since = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const bad = read.fps > 0 && read.fps < 45;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: bad ? '#ff9d5c' : '#8de08d' }}>
      {/* whether the blur is currently on is stated, not implied — when the
          frame rate suddenly changes, the first thing worth knowing is whether
          the auto-downgrade did it */}
      <span>frame · blur {blur ? 'on' : 'off'}</span>
      <span>{read.fps} fps · worst {read.worst}ms</span>
    </div>
  );
}

function DebugScrub({ t, setT, playing, play, scrub, setScrub, blur }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 200,
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
      <FpsMeter blur={blur} />
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

const btnStyle = {
  fontSize: 10,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
};

// `lag` is the deck's inertia: while the cabin accelerates, the plates trail
// behind the motion and only settle a beat after the ride stops, which is what
// gives them apparent mass. `i` staggers that lag so they don't move as a block.
function Plate({ children, style, lag = 0, i = 0 }) {
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
      <Rivets />
      {children}
    </div>
  );
}

const stats = [
  { value: '06', label: 'Entwickler' },
  { value: '40%', label: 'Performance' },
  { value: '20%', label: 'Tempo' },
  { value: '03', label: 'Releases' },
];

const skills = [
  { label: 'Backend', tech: 'ASP.NET Core · EF Core' },
  { label: 'Frontend', tech: 'React · TypeScript' },
  { label: 'Daten', tech: 'MSSQL · MongoDB' },
  { label: 'Architektur', tech: 'N-Tier · DDD · REST' },
];

// ---------------------------------------------------------------------------
// The shaft is a single 3D scene.
//
// Everything used to carry its own `transform: perspective(...)`, which gives
// each element a vanishing point at its own transform-origin — four objects,
// four vanishing points, a scene that never resolved. And a rotated <div> is
// still one plane: a decal, not a solid. So the shaft is now one camera (the
// `perspective` *property*, one shared `perspective-origin`) and every solid is
// built from faces at different angles inside `preserve-3d`.
//
// Depth values below are world pixels at z = 0; -z runs away from the viewer.
// ---------------------------------------------------------------------------

const CAM_PERSPECTIVE = 1400;
const CAM_ORIGIN_Y = 0.50;
// how far the shaft walls run back. Deeper means the corridor eats more of the
// screen: a wall's far edge lands at (viewportWidth / 2) * DEPTH / (P + DEPTH).
const SHAFT_DEPTH = 340;
// The counterweight sits inboard far enough to clear the cage posts. Hard
// against the shaft wall it was hidden behind the gate at any ordinary window
// width and only appeared when the window was narrowed — furniture you can never
// see is furniture you did not build.
//
// The guide rail used to live here too, and it is gone. It was the reason this
// rebuild started and it never came good at any of it: a vertical beam facing
// the camera has no convergence available to it, so shading had to carry the
// whole of the volume, and the shading of a straight bar is a straight bar. Then
// the lamps needed the only sixty pixels of shaft you can see at all. What runs
// down that wall now is a cable, which has the one property the rail could never
// be given — it is not straight.
const CW_Z = -160;
const CW_X = 190;

// Flat, near-even steel. The old version had a strong specular band down the
// middle, which is how you fake a cylinder on a single plane — exactly the
// wrong cue now that the solids are built from real faces, because it made the
// rail read as a pipe. Volume comes from the faces differing in tone (`shade`),
// not from a highlight painted inside one of them.
const steelFace = (scale = 46, shade = 1) => surface({ ...SURFACES.steel, scale }, shade);
const ironFace = (scale = 70, shade = 1) => surface({ ...SURFACES.iron, scale }, shade);

// ── light ────────────────────────────────────────────────────────────────────
// Nothing in this scene used to be lit. Every face carried a `shade` I picked by
// eye, and the switch called LIGHTS.cage was a vignette — a black ellipse laid
// over the whole frame — which is exactly why turning it *off* made the picture
// brighter. It was named for a lamp and behaved like a lens.
//
// The lamps are objects with positions now, and brightness is computed from
// them: Lambert's cosine law for the angle a face is held at, inverse square for
// how far away it is. No shadows, no bounce, so this is not a renderer. But the
// cosine term is the whole of what makes a solid read as solid, and it is
// precisely the term that was being guessed.
//
// Scene coordinates: x and y are screen pixels on the z = 0 plane, z is world
// pixels, and -z runs away from the camera.
const LAMPS = {
  on: true,
  // One pair per landing, and this is the setting that matters most. At every
  // half floor there was always a fixture close by, so nothing ever brightened
  // or dimmed — a shaft lit like a corridor ceiling. One per floor means the
  // light genuinely falls away between landings, which is the thing the black
  // overlay used to be faking.
  every: 1,
  // |x| from the centre of the shaft, as a fraction of its width. Left wall
  // only: the right-hand side of the shaft belongs to the counterweight, and two
  // symmetric lamps light the cage from both sides at once, which is the one
  // arrangement guaranteed to produce no modelling at all.
  side: 0.464,
  rise: 0.14, // how far above the landing it is bolted, in floors
  proud: 26, // how far the glass stands off the wall it is bolted to
  size: 92, // across the guard ring
  power: 2.6, // brightness at the glass itself
  reach: 640, // the cage is most of a thousand pixels from the far wall, so a
  // short reach leaves it on ambient alone and nothing in it responds
  haze: 0.3, // how much of it hangs in the air instead of landing on something
};

// What the shaft bounces back, so an unlit face goes dim rather than absent.
const LIGHT_AMBIENT = 0.26;
// A lamp in a reflector is not a point source, so the terminator is soft: a face
// turned a little past ninety degrees still catches some of it.
const LIGHT_WRAP = 0.42;

// Where the fixtures are, in scene coordinates, for the shaft's current
// position. `u` is the floor coordinate, so the lamp at u = 1.5 is bolted to the
// wall halfway between the first and second landings.
function lampsAt(vw, vh, pos, step) {
  if (!LAMPS.on) return [];
  const out = [];
  const z = -SHAFT_DEPTH + LAMPS.proud;
  const first = Math.ceil((pos - 1.7) / LAMPS.every) * LAMPS.every;
  for (let u = first; u <= pos + 1.7; u += LAMPS.every) {
    const y = (pos - u - LAMPS.rise) * step + vh * CAM_ORIGIN_Y;
    out.push({ id: `${u}L`, x: vw * (0.5 - LAMPS.side), y, z });
  }
  return out;
}

// The multiplier a face at `p` with outward normal `n` should be drawn at.
// `skip` drops a lamp from the shading of its own fixture, where the distance is
// a few pixels and an inverse square would simply blow up.
function lit(p, n, lamps, skip) {
  let sum = 0;
  for (const L of lamps) {
    if (L === skip) continue;
    const dx = L.x - p[0];
    const dy = L.y - p[1];
    const dz = L.z - p[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    const d = Math.sqrt(d2) || 1;
    const cos = (dx * n[0] + dy * n[1] + dz * n[2]) / d;
    const lam = Math.max(0, (cos + LIGHT_WRAP) / (1 + LIGHT_WRAP));
    // Squared, not plain, inverse square. A single 1/(1+d²/r²) has such a long
    // tail that a dozen lamps two floors away still sum to more light than the
    // one overhead — the first cut came out at brightness(2.7) on every deck,
    // which is a scene with no lamps in it, only a general glow.
    const fall = (LAMPS.reach * LAMPS.reach) / (LAMPS.reach * LAMPS.reach + d2);
    sum += LAMPS.power * lam * fall * fall;
  }
  return LIGHT_AMBIENT + sum;
}

// The perspective divide, done by hand — needed to hang haze on the sight line
// to a lamp, which is the one thing the browser's own camera cannot tell us.
function project(p, vw, vh) {
  const s = CAM_PERSPECTIVE / (CAM_PERSPECTIVE - p[2]);
  return {
    x: vw / 2 + (p[0] - vw / 2) * s,
    y: vh * CAM_ORIGIN_Y + (p[1] - vh * CAM_ORIGIN_Y) * s,
    s,
  };
}

// A bulkhead lamp, built rather than drawn: a cast base bolted to the wall, a
// cylindrical body, a ribbed glass and the guard over it.
//
// The body is a genuine cylinder — sixteen quads stood on end around the axis,
// each one shaded from its own normal by the same `lit` the rest of the scene
// uses. That is most of the reason for modelling it at all. Everywhere else the
// shading is a claim I cannot check; here we know exactly where the light is,
// so the roundness either comes out of the arithmetic or the arithmetic is
// wrong. Nothing is painted across it.
// `fixed`, when given, lights the fitting from the room instead of from the
// lamp list — for the one inside the corridor, which is in another room and
// cannot be lit by the shaft it is behind a wall from.
function Lamp({ p, lamps, size = LAMPS.size, fixed }) {
  const R = size / 2;
  const N = 16;
  const D = LAMPS.proud * (size / LAMPS.size);
  // a hair wider than the arc, so the quads meet instead of showing seams
  const seg = (2 * Math.PI * R) / N + 2;
  const bars = [0, 45, 90, 135];

  return (
    <div
      style={{
        position: 'absolute', left: p.x, top: p.y, width: 0, height: 0,
        transformStyle: 'preserve-3d', transform: `translateZ(${p.z}px)`,
      }}
    >
      {/* the pool it throws on the wall behind it. The far wall is parallel to
          the image plane, so this lands where it should with no correction. */}
      <div
        style={{
          position: 'absolute', left: -R * 4.6, top: -R * 4.6, width: R * 9.2, height: R * 9.2,
          transform: `translateZ(${-D + 1}px)`,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,206,140,0.5) 0%, rgba(255,170,84,0.2) 26%, rgba(190,110,40,0.06) 58%, rgba(0,0,0,0) 78%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* the base plate */}
      <div
        style={{
          position: 'absolute', left: -R * 1.05, top: -R * 1.05, width: R * 2.1, height: R * 2.1,
          transform: `translateZ(${-D}px)`, borderRadius: '50%',
          ...ironFace(46, fixed != null ? roomLit([0, 0, 1]) * fixed * 0.5 : Math.min(1.6, lit([p.x, p.y, p.z - D], [0, 0, 1], lamps, p))),
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5)',
        }}
      />

      {/* the body: a ring of quads, each held at its own angle to the light */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `translateZ(${-D / 2}px)` }}>
        {Array.from({ length: N }).map((_, k) => {
          const a = (k / N) * Math.PI * 2;
          const nx = Math.sin(a);
          const ny = -Math.cos(a);
          const shade = fixed != null
            ? roomLit([nx, ny, 0]) * fixed
            : lit([p.x + R * nx, p.y + R * ny, p.z - D / 2], [nx, ny, 0], lamps, p);
          return (
            <div
              key={k}
              style={{
                position: 'absolute', left: -seg / 2, top: -D / 2, width: seg, height: D,
                transform: `rotate(${((a * 180) / Math.PI).toFixed(2)}deg) translateY(${-R}px) rotateX(90deg)`,
                ...steelFace(28, Math.min(1.7, shade * 0.72)),
              }}
            />
          );
        })}
      </div>

      {/* the glass. Concentric ribs, because that is what the pressed prismatic
          lens in one of these actually is, and they give the disc a centre. */}
      <div
        style={{
          position: 'absolute', left: -R * 0.8, top: -R * 0.8, width: R * 1.6, height: R * 1.6,
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
          position: 'absolute', left: -R * 0.86, top: -R * 0.86, width: R * 1.72, height: R * 1.72,
          transform: 'translateZ(8px)', borderRadius: '50%',
          border: '4px solid #2a231a',
          boxShadow: 'inset 0 1px 0 rgba(255,214,150,0.35), 0 1px 0 rgba(0,0,0,0.6)',
        }}
      />
      {bars.map((deg) => (
        <div
          key={deg}
          style={{
            position: 'absolute', left: -R * 0.9, top: -2.5, width: R * 1.8, height: 5,
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
          position: 'absolute', left: -R * 2.2, top: -R * 2.2, width: R * 4.4, height: R * 4.4,
          transform: 'translateZ(12px)', borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,224,170,0.7) 0%, rgba(255,178,88,0.28) 30%, rgba(255,150,50,0.07) 60%, rgba(0,0,0,0) 76%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}

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

// ── the back of the shaft ────────────────────────────────────────────────────
// Everything at the far end scales by this, so the aperture's position on screen
// is known analytically and the flat content layer can be clipped to it exactly.
const BACK_SCALE = CAM_PERSPECTIVE / (CAM_PERSPECTIVE + SHAFT_DEPTH);
const DOOR_W = 0.78; // fraction of the shaft's width
const DOOR_H = 0.94; // fraction of its height

// One identifying object per landing, so a floor is somewhere rather than a
// number. Parked low and to one side, clear of the centred content.
// Parked low and to one side, clear of the centred content, and lit well above
// the wall around it — a prop the eye can't find is not a landmark. The
// brightness lives on this wrapper because `ironFace` sets `filter` itself, and
// spreading it over the base style silently ate the value.
// The corridor has its own fitting overhead, so its contents are lit from above
// and a little in front — not from the shaft lamps, which are on the other side
// of a wall. One fixed direction is enough here: these objects do not move, and
// what they need is not a changing light but three faces that disagree.
const ROOM_LIGHT = [0.18, -0.88, 0.44];

// How far each landing's object is turned on its own axis, in degrees, EG first.
// This is the lever for "is it facing me or looking off sideways", and it is
// worth knowing exactly what it trades.
//
// The corridor sits about four hundred pixels behind a camera fourteen hundred
// out, so the projection there is very nearly orthographic: a box square to the
// wall converges by around three percent, which is a side face a few pixels
// wide. Yaw buys that corner back, and the arithmetic is simple — the side face
// is `d · sin(yaw)` across. On a 56-deep box that is 28px at 30°, 9px at 9°, and
// nothing worth having below about 5°.
//
// So the pairing to remember: **shallow yaw wants more depth**. If you want
// something squarer to the camera, drop its yaw and raise its `d` rather than
// turning it further — that keeps the corner without making the object look like
// it is addressing the wall. A negative yaw turns it the other way and the
// visible side swaps over on its own.
const PROP_YAW = [0, 0, 15, 3];

// The range is wide on purpose. These props used to carry brightness(1.85) on
// the wrapper above them, which is what made them visible at all; that had to go
// because a filter flattens everything under it, so the whole of it lives here
// now — spread across the faces instead of applied to the object.
function roomLit(n) {
  const c = n[0] * ROOM_LIGHT[0] + n[1] * ROOM_LIGHT[1] + n[2] * ROOM_LIGHT[2];
  return 0.6 + 1.55 * Math.max(0, (c + 0.3) / 1.3);
}

// A box with three faces showing: the one facing us, the top, and the side
// turned toward the middle of the corridor.
//
// It is turned on its axis, and that is the load-bearing part. Built square to
// the camera these came out as flat rectangles, and the reason is worth writing
// down: the corridor is about four hundred pixels behind a camera a thousand
// four hundred out, so the projection there is very nearly orthographic. A box
// square to the wall converges by three percent — its side face works out at
// seven pixels and its top at two. The geometry was right and the picture was
// unchanged. Convergence is not available at that distance, so what makes a
// distant solid read is the *corner*: two faces at a real angle, in two
// different tones. Yaw supplies the angle, `roomLit` supplies the tones, and
// perspective contributes nothing either way.
function Box({ left, top, w, h, d, yaw = 14, tex = ironFace, scale = 50, tint = 1, children, extras }) {
  const r = (yaw * Math.PI) / 180;
  const s = Math.sin(r);
  const c = Math.cos(r);
  const f = (n) => tex(scale, roomLit(n) * tint);
  // Every face is built and the browser decides which ones you see, via
  // backface-visibility — which is just back-face culling under another name.
  //
  // Picking the visible side by hand was wrong and could not be made right. It
  // was chosen from the sign of the yaw, but which side shows depends just as
  // much on which side of the camera axis the object stands: an object left of
  // centre is looked at from its right, however it is turned. Move a prop across
  // the corridor and the hand-picked side becomes the hidden one, leaving an
  // open corner. The GPU already knows the answer to this.
  const cull = { backfaceVisibility: 'hidden' };
  const side = (which) => ({
    position: 'absolute', left: (which > 0 ? w : 0) - d / 2, top: 0, width: d, height: h,
    transform: `translateZ(${d / 2}px) rotateY(${which * 90}deg)`,
    ...f([which * c, 0, -which * s]),
    ...cull,
  });
  return (
    // Stood off the wall by exactly how far the yaw swings its far corner back.
    // Without this a turned box sinks into the wall behind it: the corner goes to
    // z = d - w·sin(yaw), and for anything wide and shallow that is well past
    // zero, so the wall occludes most of its own front face. The EG plate lost
    // three quarters of its width that way and still measured full size, because
    // getBoundingClientRect reports the projected box and knows nothing about
    // what is drawn over it — the DOM said 75px and the screen said 20.
    <div
      style={{
        position: 'absolute', left, top, width: 0, height: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${(w * Math.abs(s)).toFixed(1)}px) rotateY(${yaw}deg)`,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translateZ(${d}px)`, ...f([s, 0, c]), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.45)' }}>
        {children}
      </div>
      {/* the top. Not culled and no underside built to match: every one of these
          stands below the camera, so the underside is a face nobody can reach.
          Raise a prop above eye level and it will want one. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: d, transformOrigin: '50% 0%', transform: 'rotateX(90deg)', ...f([0, -1, 0]) }} />
      <div style={side(-1)} />
      <div style={side(1)} />
      {/* Anything bolted to this box rather than standing near it. It goes inside
          the yawed wrapper on purpose, so it inherits the turn and the stand-off
          and cannot drift away from the thing it belongs to when either changes. */}
      {extras}
    </div>
  );
}

// The corridor's fitting, taking numbers rather than an object so it can be
// memoized at all. It is lit from the room and never from the lamp list, so
// nothing about it changes between frames — but `p={{…}}` is a fresh object
// every render, and a fresh object defeats every memo there is. Three of these
// were being rebuilt per frame, twenty-five nodes each.
const NO_LAMPS = [];
const CorridorLamp = memo(function CorridorLamp({ x, y }) {
  return <Lamp p={{ x, y, z: 18 }} lamps={NO_LAMPS} size={64} fixed={1.15} />;
});

// Memoized on the floor number, which is the only thing it depends on. These are
// static objects standing in a static room; they were being rebuilt at sixty
// hertz because their parent was.
const LandingProp = memo(function LandingProp({ idx }) {
  return (
    // no `filter` on this wrapper any more: it flattens the 3D context of
    // everything below it, which would quietly turn every box back into the
    // decal it used to be. The brightness lives in each face's own shade.
    <div style={{ position: 'absolute',
        left: idx === 0 ?  '80%' : '10%',
        bottom: idx === 0 ? '20%' : '10%',
        transformStyle: 'preserve-3d' }}>
      <PropBody idx={idx} />
    </div>
  );
});

// The stencil every one of these carries, so the landings belong to the same
// building rather than each being a separate still life.
function Stencil({ children, size = 11, style }) {
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: 'var(--mono)', fontSize: size, letterSpacing: 1.5,
        color: 'rgba(226,192,132,0.5)', textShadow: '0 1px 0 rgba(0,0,0,0.7)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PropBody({ idx }) {
  const yaw = PROP_YAW[idx] ?? 0;

  // A workbench, and the one deliberately held square to the camera. Its yaw is
  // small, so the corner it would otherwise get from turning has to come from
  // depth instead — hence the deep carcass and the slab overhanging it by a long
  // way. The slab is the piece doing the work: a horizontal surface is the only
  // thing in this corridor the eye can measure the room against.
  if (idx === 1) {
    return (
      <div style={{ position: 'relative', width: 172, height: 128, transformStyle: 'preserve-3d' }}>
        {/* the board on the wall, and what hangs off it */}
        <div style={{ position: 'absolute', left: 18, top: -76, width: 124, height: 52, ...ironFace(50, roomLit([0, 0, 1]) * 0.8), boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5)' }}>
          {[12, 40, 66, 96].map((x, i) => (
            <div
              key={x}
              style={{
                position: 'absolute', left: x, top: 12, width: i % 2 ? 6 : 9, height: 26 + (i % 3) * 8,
                background: 'linear-gradient(180deg, #8b949b, #2b3034)', borderRadius: 2,
                boxShadow: '1px 2px 4px rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </div>
        <Box left={0} top={26} w={172} h={82} d={116} yaw={yaw} scale={52} />
        {/* the top slab, overhanging the carcass on every side */}
        <Box left={-6} top={16} w={184} h={12} d={130} yaw={yaw} tex={steelFace} scale={40} tint={1.05} />
        <Stencil style={{ left: 14, top: 44 }}>WERKBANK II</Stencil>
      </div>
    );
  }

  // Crates. Three boxes at three depths, which is the cheapest legible object
  // there is: the moment two of them overlap with their tops lit, the stack has
  // an order and the corridor has a floor.
  if (idx === 2) {
    return (
      <div style={{ position: 'relative', width: 190, height: 150, transformStyle: 'preserve-3d' }}>
        <Box left={0} top={62} w={104} h={88} d={80} yaw={yaw} scale={64} tint={0.92}>
          <Stencil style={{ left: 10, top: 12 }}>MT / 04</Stencil>
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: '52%', height: 3, background: 'rgba(216,178,110,0.35)' }} />
        </Box>
        <Box left={104} top={86} w={82} h={64} d={60} yaw={yaw} scale={54} tint={0.8}>
          <Stencil style={{ left: 8, top: 9 }} size={10}>MT / 11</Stencil>
        </Box>
        <Box left={20} top={0} w={74} h={56} d={62} yaw={yaw} scale={48} tint={1.08}>
          <Stencil style={{ left: 8, top: 8 }} size={10}>MT / 02</Stencil>
        </Box>
      </div>
    );
  }

  // A post box on a pedestal. It replaced a pneumatic chute, which was a pipe
  // with three rings round it — legible only if you already knew what it was
  // meant to be. A slot at hand height and a hood over it is not ambiguous.
  if (idx === 3) {
    return (
      <div style={{ position: 'relative', width: 116, height: 200, transformStyle: 'preserve-3d' }}>
        <Box
          left={316} top={-94} w={125} h={136} d={78} yaw={yaw} tex={steelFace} scale={50} tint={0.95}
          extras={
            // The hood, hinged just above the slot and tipped out so it hangs
            // over it — which is the whole point of a hood and what the reference
            // shows. It rides *inside* the box rather than beside it: as a
            // sibling it carried its own hand-set translateZ and yaw, so every
            // time either changed on the box it drifted off somewhere on its own.
            // Bolted on here it cannot.
            <div
              style={{
                position: 'absolute', left: 8, top: 16, width: 104, height: 26,
                transformOrigin: '50% 0%',
                transform: 'translateZ(79px) rotateX(-34deg)',
                ...steelFace(34, roomLit([0, -0.82, 0.57]) * 1.1),
                borderRadius: '2px 2px 0 0',
                boxShadow: '0 4px 9px rgba(0,0,0,0.7)',
              }}
            />
          }
        >
          <div
            style={{
              position: 'absolute', left: '14%', right: '14%', top: '30%', height: 13,
              background: 'rgba(0,0,0,0.86)',
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.9), 0 1px 0 rgba(232,196,132,0.28)',
            }}
          />
          <Stencil style={{ left: '16%', bottom: 12 }} size={10}>POST</Stencil>
        </Box>
      </div>
    );
  }

  // EG — the floor plate. This one already read, so it keeps its face and only
  // gains the thickness it always implied.
  //
  // The wrapper is not decoration. Every other prop has one; without it this
  // branch returned a bare absolutely-positioned box, and since the anchor above
  // shrinks to fit and an abspos child contributes nothing to that, the plate
  // hung off the anchor point rightwards and spent most of its width inside the
  // corridor's dark end. All that showed was the sliver that missed it.
  return (
    <div style={{ position: 'relative', width: 132, height: 88, transformStyle: 'preserve-3d' }}>
      {/* No yaw on this one. It is a plate bolted flat to the wall, so turning
          it would be wrong even where it helps — and it does not help: a sign
          reads by its face, not by its corner. */}
      <Box left={0} top={0} w={132} h={88} d={14} yaw={PROP_YAW[0]} scale={56} tint={1.1}>
        <div style={{ position: 'absolute', inset: 8, border: '2px solid rgba(216,178,110,0.35)' }} />
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 700, letterSpacing: 3,
            color: 'rgba(216,178,110,0.55)', textShadow: '0 1px 0 rgba(0,0,0,0.7)',
          }}
        >
          EG
        </div>
      </Box>
    </div>
  );
}

// How far the architrave stands proud of the wall. The frame replaced a recessed
// niche: recessing the landing made the opening read as a window across a gap,
// and the dark piers flanking it were the gap. One continuous wall with the
// doorway standing out of it puts the far end of the shaft within reach.
const FRAME_D = 58;
const FRAME_M = 34; // width of an architrave member
const BACK_OVERSCAN = 0.7;

// The architrave, standing proud of the wall. It is a separate memoized piece
// because it is the heaviest static thing in the scene and it was being rebuilt
// on every frame for nothing: four members carrying forty-four bolts, three
// doorways in view, a hundred and thirty-two elements and their style objects
// created per frame so that React could compare them and find them identical.
// Its geometry depends on the viewport and nothing else — the `top` that moves
// belongs to the container above it.
const Architrave = memo(function Architrave({ vw, vh }) {
  const w = vw * DOOR_W;
  const h = vh * DOOR_H;
  const left = (vw - w) / 2;
  const face = surface(SURFACES.doorFrame);
  return [
    { l: left - FRAME_M, t: -FRAME_M, w: w + FRAME_M * 2, h: FRAME_M },
    { l: left - FRAME_M, t: h, w: w + FRAME_M * 2, h: FRAME_M },
    { l: left - FRAME_M, t: 0, w: FRAME_M, h },
    { l: left + w, t: 0, w: FRAME_M, h },
  ].map((b, i) => (
    <div
      key={i}
      style={{
        position: 'absolute', left: b.l, top: b.t, width: b.w, height: b.h,
        transform: `translateZ(${FRAME_D}px)`,
        ...face,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(0,0,0,0.5), 0 6px 22px rgba(0,0,0,0.75)',
      }}
    >
      {/* bolts down the member, spaced along whichever way it runs */}
      {Array.from({ length: b.w > b.h ? 14 : 8 }).map((_, k, arr) => (
        <span
          key={k}
          style={{
            position: 'absolute',
            left: b.w > b.h ? `${((k + 0.5) / arr.length) * 100}%` : '50%',
            top: b.w > b.h ? '50%' : `${((k + 0.5) / arr.length) * 100}%`,
            width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: '50%',
            background: 'var(--rivet)',
            boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  ));
});

// The doorway of one floor: architrave, leaves, indicator. It lives in its own
// layer in front of the content, because the content sits on the landing wall
// and doors that cannot cover it are not doors.
function Doorway({ vw, vh, top, closure, shake }) {
  const w = vw * DOOR_W;
  const h = vh * DOOR_H;
  const left = (vw - w) / 2;
  // The returns are graded along their own depth — bright at the front edge
  // where the cage lamp reaches them, dark where they meet the wall. This is the
  // one lighting cue a flat face can carry honestly, because here the gradient
  // really does run along the z axis.
  const ret = (nearFirst, horiz) => ({
    backgroundImage:
      `linear-gradient(${horiz ? '180deg' : '90deg'}, ${nearFirst ? '#c99a5c, #2a1d10' : '#2a1d10, #c99a5c'}), url(${rustBrass})`,
    backgroundSize: 'auto, 70px 70px',
    backgroundBlendMode: 'soft-light',
  });

  return (
    <div style={{ position: 'absolute', left: 0, top, width: vw, height: h, transformStyle: 'preserve-3d' }}>
      {/* the leaves, set back inside the frame */}
      <div style={{ position: 'absolute', left, top: 0, width: w, height: h, overflow: 'hidden', transform: `translateZ(${FRAME_D * 0.34}px)` }}>
        {[0, 1].map((s) => (
          <div
            key={s}
            style={{
              position: 'absolute', top: 0, height: '100%', width: '50%',
              left: s ? '50%' : 0,
              transform: `translateX(calc(${((s ? 1 - closure : closure - 1) * 100).toFixed(2)}% + ${((s ? 1 : -1) * shake).toFixed(2)}px))`,
              ...surface(SURFACES.doorLeaf),
              boxShadow: `inset 0 0 30px rgba(0,0,0,0.75), ${s ? '-' : ''}4px 0 16px rgba(0,0,0,0.85)`,
            }}
          >
            <div style={{ position: 'absolute', top: '7%', bottom: '7%', [s ? 'left' : 'right']: 10, width: 3, background: 'rgba(0,0,0,0.6)' }} />
            <div
              style={{
                position: 'absolute', left: '8%', right: '8%', bottom: '7%', height: 13,
                backgroundImage: 'repeating-linear-gradient(45deg, #b8862a 0px, #b8862a 9px, #241a10 9px, #241a10 18px)',
                opacity: 0.7,
              }}
            />
            {/* the mark that used to live on the intro's own doors — it belongs
                on the real ones, where it is legible every time they close */}
            <div
              style={{
                position: 'absolute', top: '42%', [s ? 'left' : 'right']: '14%',
                fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: 3,
                color: 'rgba(196,150,86,0.34)', textShadow: '0 1px 0 rgba(0,0,0,0.7)',
              }}
            >
              {s ? 'Nr. 001' : 'MT'}
            </div>
          </div>
        ))}
      </div>

      {/* The returns, bridging the frame's front back to the wall — head and
          sill only. The two upright ones are gone: they were the last vertical
          wall surface left at the sides of the opening, and a lit panel standing
          exactly where the corridor is supposed to run out is a wall, whatever
          it is called in the code. Now the cut is clean and the passage carries
          on past both edges. */}
      <div style={{ position: 'absolute', left, top: 0, width: w, height: FRAME_D, transformOrigin: '50% 0%', transform: `translateZ(${FRAME_D}px) rotateX(-90deg)`, ...ret(true, true) }} />
      <div style={{ position: 'absolute', left, top: h, width: w, height: FRAME_D, transformOrigin: '50% 0%', transform: 'rotateX(90deg)', ...ret(false, true) }} />

      <Architrave vw={vw} vh={vh} />
    </div>
  );
}

// The doorways, in their own camera in front of the content. Two `perspective`
// containers with identical parameters are one camera, so these line up exactly
// with the wall they stand on despite the flat content layer between them.
function Doorways({ vw, vh, pos, floorPx, ride, deck, intro, shake, blur }) {
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const here = Math.round(pos);
  const slots = [here - 1, here, here + 1].filter((f) => f >= 0 && f < DECKS.length);
  const filter = blur > 0.25 ? 'url(#shaftBlur)' : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden', filter }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${CAM_PERSPECTIVE}px`, perspectiveOrigin: `50% ${CAM_ORIGIN_Y * 100}%` }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          <div
            style={{
              position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
              transform: `translateZ(${-SHAFT_DEPTH}px)`, transformStyle: 'preserve-3d',
            }}
          >
            {slots.map((f) => {
              // The intro concerns only the floor we are standing at, and only
              // while standing: mid-ride `deck` is still the floor we left, so
              // folding the intro in unconditionally would hold the destination
              // shut all the way to it.
              const shut = doorClosureAt(f, ride, deck);
              return (
                <Doorway
                  key={f}
                  vw={vw}
                  vh={vh}
                  top={overscan + travelY - f * floorPx + vh * CAM_ORIGIN_Y - (vh * DOOR_H) / 2}
                  closure={!ride && f === deck ? Math.max(shut, intro) : shut}
                  shake={shake}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// How much deeper the landing sits than the shaft wall. It is a different room,
// so it gets its own depth, its own colour and its own light — sharing all three
// with the shaft is what made the far end read as one flat backdrop.
const LANDING_D = 78;

// The far end of the shaft. The blind wall is cut into piers and spandrels rather
// than drawn as one plane, because the landing is genuinely behind it and a solid
// plane would simply occlude it. Both are now the same family of surface, so the
// cut is invisible — which is the whole trick: a continuous wall to the eye, an
// actual hole to the compositor.
function ShaftBack({ vw, vh, pos, floorPx, ride, deck, intro }) {
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const w = vw * DOOR_W;
  const h = vh * DOOR_H;
  const left = (vw - w) / 2;
  const here = Math.round(pos);
  const slots = [here - 2, here - 1, here, here + 1, here + 2];
  const doorTop = (f) => overscan + travelY - f * floorPx + vh * CAM_ORIGIN_Y - h / 2;
  // The far wall's texture used to scroll with the shaft. Changing
  // background-position repaints the whole surface, and this style is on nine
  // large blend-mode elements — nine full repaints a frame to move a grain you
  // cannot see at four hundred pixels of depth behind a doorway. The side walls
  // keep their scroll, because that is where the sense of speed actually lives.
  const wall = surface(SURFACES.backWall);

  return (
    <div
      style={{
        position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
        transform: `translateZ(${-SHAFT_DEPTH}px)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* the piers, running the full height either side of every opening */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: left, height: '100%', ...wall, boxShadow: 'inset -50px 0 70px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', left: left + w, top: 0, width: vw - left - w, height: '100%', ...wall, boxShadow: 'inset 50px 0 70px rgba(0,0,0,0.6)' }} />

      {slots.map((f) => {
        const isDeck = f >= 0 && f < DECKS.length;
        // The masonry runs two floors either way so nothing pops in at speed.
        // The furniture does not: a corridor is only ever seen through an open
        // door, so a shut one is a wall and everything behind it is work done
        // for nobody. Mid-ride that is every floor at once, which is exactly the
        // stretch that could least afford it.
        const shut = ride ? doorClosureAt(f, ride, deck) : Math.max(doorClosureAt(f, null, deck), f === deck ? intro : 1);
        const furnished = Math.abs(f - pos) < 1.25 && shut < 0.985;
        const top = doorTop(f);
        return (
          <div key={f} style={{ transformStyle: 'preserve-3d' }}>
            {/* the spandrel between this opening and the one above it */}
            <div style={{ position: 'absolute', left, top: top + h, width: w, height: floorPx - h, ...wall, boxShadow: 'inset 0 40px 60px rgba(0,0,0,0.55)' }} />
            {isDeck ? (
              <div style={{ position: 'absolute', left, top, width: w, height: h, transformStyle: 'preserve-3d' }}>
                {/* the landing, set back and lit on its own terms */}
                <div
                  style={{
                    // preserve-3d rather than overflow:hidden. The clip was
                    // flattening everything in the corridor into the wall, so
                    // nothing standing on that floor could have a side to it.
                    position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
                    transform: `translateZ(${-LANDING_D}px)`,
                    ...surface(SURFACES.landing),
                    // the shadow the head of the opening throws into the room
                    boxShadow: 'inset 0 70px 90px -30px rgba(0,0,0,0.85), inset 0 0 130px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* the skirting, running out of sight both ways — one straight
                      line at a known height is what tells you the floor keeps
                      going after the light stops */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: '13%', height: 9, ...surface(SURFACES.landing, 1.5), boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }} />
                  {/* The corridor's own fitting. It used to be a bare radial
                      pinned to the corner where the ceiling meets the back wall,
                      which is nowhere a lamp goes — light with no source, and it
                      showed. Same fixture as the shaft, smaller, lit from the
                      room instead of from the lamps it cannot see, and its own
                      pool on the wall is now the light in here. */}
                  {LIGHTS.landing && furnished && <CorridorLamp x={w * 0.5} y={h * 0.14} />}
                  {furnished && <LandingProp idx={f} />}
                  {/* the two branches. There is no wall at either end, so the
                      corridor simply runs out of light — which is the only thing
                      that ever tells you a passage continues rather than stops. */}
                  <div
                    style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background:
                        'linear-gradient(90deg, rgba(4,3,2,0.97) 0%, rgba(4,3,2,0.8) 6%, rgba(4,3,2,0) 24%, rgba(4,3,2,0) 80%, rgba(4,3,2,0.8) 95%, rgba(4,3,2,0.97) 100%)',
                    }}
                  />
                </div>
                {/* The reveal into the corridor: head and floor only. The jambs
                    are gone on purpose — with all four faces this was a room the
                    size of a doorway, and a lift that opens into a cupboard has
                    nowhere to go. */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: LANDING_D, transformOrigin: '50% 0%', transform: 'rotateX(-90deg)', ...surface(SURFACES.landing, 0.3) }} />
                <div style={{ position: 'absolute', left: 0, top: h, width: w, height: LANDING_D, transformOrigin: '50% 0%', transform: 'rotateX(-90deg)', ...surface(SURFACES.landing, 0.85) }} />
              </div>
            ) : (
              // dead shaft above the top floor and below the bottom one
              <div style={{ position: 'absolute', left, top, width: w, height: h, ...wall }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// One wall of the corridor: a plane hinged at the screen edge and swung a full
// 90° so it genuinely runs away from the viewer. Its CSS width is depth, not
// screen width — the camera decides how much of the screen it covers.
function ShaftWall({ side, vh, pos, floorPx }) {
  const isLeft = side === 'left';
  const travelY = pos * floorPx;
  const overscan = vh * 0.34;
  const span = vh + overscan * 2;
  // the hinge is the screen edge, so for the left wall local x grows with depth
  // and for the right wall it shrinks — measure everything from the hinge side
  const nearEdge = isLeft ? 'left' : 'right';

  return (
    <div
      style={{
        position: 'absolute',
        [isLeft ? 'left' : 'right']: 0,
        top: -overscan,
        width: SHAFT_DEPTH,
        height: span,
        transformOrigin: isLeft ? '0% 50%' : '100% 50%',
        transform: `rotateY(${isLeft ? 90 : -90}deg)`,
        overflow: 'hidden',
        ...surface(SURFACES.shaftWall),
        backgroundPosition: `0 0, 0 0, 0 ${travelY.toFixed(1)}px`,
        // the far end of the corridor falls away into the dark
        boxShadow: `inset ${isLeft ? '-' : ''}120px 0 140px -40px rgba(0,0,0,0.9)`,
      }}
    >
      {/* the doors used to live here. They mark floors, and a floor is a place
          you arrive at, which is straight ahead — not something sliding past your
          shoulder. The side walls are now just wall: rust, seams, and the sense
          of speed that comes from them streaming. */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, [nearEdge]: 66, width: 3, background: 'var(--brass)', opacity: 0.35 }} />
      <ShaftRivets offset={travelY} depth={50} span={span} nearEdge={nearEdge} />
      <ShaftRivets offset={travelY + 23} depth={76} span={span} nearEdge={nearEdge} />
      <ShaftRivets offset={travelY + 11} depth={272} span={span} nearEdge={nearEdge} />

    </div>
  );
}

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

// The counterweight hangs on the other end of the ropes, so it runs opposite the
// cabin: on screen that is twice the shaft's rate, in the same direction the
// shaft appears to move. Anchored to hang into the top of the frame while the
// cabin rests on deck 02 — at ride speed it is smeared past recognition, so it
// needs one resting place where you can see what it is. A box, again: face,
// inboard side, and the underside you actually look up at.
function Counterweight({ y, height, dir, shade }) {
  const W = 62;
  const D = 42;
  const PITCH = 34;
  // Only the bottom of the block is ever in frame — it hangs down into the top
  // of the picture — so the plates are built where they can be seen and the rest
  // of the column stays a plain face.
  const SHOWN = 460;
  const plates = Math.floor(SHOWN / PITCH);
  return (
    <div style={{ position: 'absolute', top: y, left: 0, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', top: 0, left: -W / 2, width: W, height, transform: `translateZ(${D / 2}px)`, ...steelFace(58, 0.85 * shade.front) }} />
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? W / 2 : -W / 2) - D / 2, width: D, height, transform: `rotateY(${dir * 90}deg)`, ...steelFace(46, 0.5 * shade.side) }} />
      <div style={{ position: 'absolute', top: height - D / 2, left: -W / 2, width: W, height: D, transform: 'rotateX(-90deg)', transformOrigin: '50% 0%', ...steelFace(40, 0.3 * shade.under) }} />

      {/* The joints between the plates, as actual ledges rather than a hairline
          in a repeating gradient. A stack of iron is only legible as a stack if
          the top of each plate catches something the face of it does not, and a
          1px white line inside one flat plane can never do that. */}
      {Array.from({ length: plates }).map((_, k) => (
        <div
          key={k}
          style={{
            position: 'absolute', top: height - SHOWN + k * PITCH, left: -W / 2 + 5, width: W - 10, height: 5,
            transformOrigin: '50% 100%',
            transform: `translateZ(${D / 2}px) rotateX(64deg)`,
            ...steelFace(26, 1.55 * shade.top),
            boxShadow: '0 2px 4px rgba(0,0,0,0.7)',
          }}
        />
      ))}

      {/* crosshead the ropes terminate in */}
      <div style={{ position: 'absolute', top: -16, left: -W / 2 - 8, width: W + 16, height: 17, transform: `translateZ(${D / 2 + 3}px)`, ...steelFace(38, 1.1 * shade.front), borderRadius: 2, boxShadow: '0 3px 7px rgba(0,0,0,0.75)' }} />
    </div>
  );
}

// Ropes run from the sheave at the top of the shaft down to the crosshead and
// stop there — drawn past it they read as the block dangling from below.
function HoistRopes({ bottom, vh, dim = 1 }) {
  // Bounded to a little either side of the viewport. These were eight thousand
  // pixels tall and their height was rewritten every frame — and they sit inside
  // the subtree the motion blur filters, so that height is not just a big
  // element, it is the size of the texture the blur has to rasterise before it
  // can convolve anything. A rope you cannot see is still a rope the compositor
  // has to draw.
  const TOP = -320;
  const end = Math.min(bottom, vh + 240);
  const height = Math.max(0, end - TOP);
  if (height <= 0) return null;
  const k = (c) => Math.round(c * dim);
  return [-16, 0, 16].map((dx) => (
    <div
      key={dx}
      style={{
        position: 'absolute', top: TOP, height, left: dx - 2, width: 4,
        transform: 'translateZ(22px)',
        // A rope is the one thing here that is genuinely a line, so it keeps its
        // painted highlight — there is no third face on a 4px cable to find.
        background: `linear-gradient(90deg, rgb(${k(20)},${k(23)},${k(26)}), rgb(${k(152)},${k(163)},${k(171)}) 50%, rgb(${k(20)},${k(23)},${k(26)}))`,
      }}
    />
  ));
}

// Everything that lives in the shaft, under one camera. The blur sits on the
// wrapper *outside* the perspective element on purpose: `filter` flattens the
// 3D rendering context of the element it is applied to, so putting it any
// deeper would collapse the whole scene back into decals.
function Shaft({ vw, vh, pos, floorPx, backFloorPx, blur, lamps, ride, deck, intro }) {
  // the counterweight is shaft furniture, not the subject. Knocked back, it
  // reads as texture instead of demanding attention it cannot repay.
  const dim = 0.62;
  const cwHeight = vh * 1.15;
  const cwY = 132 - cwHeight + 2 * (pos - 1) * floorPx;
  const wallFilter = blur > 0.25 ? `url(#shaftBlur) brightness(${(1 - Math.min(0.2, blur * 0.02)).toFixed(3)})` : 'none';

  // This is where `dim` used to be applied — as a `filter` on the group holding
  // the object. That was the bug underneath the counterweight and the old rail
  // both. A filter forces the used value of transform-style to flat, so those
  // groups rendered with their 3D collapsed: every face was being drawn into a
  // single plane, which is why neither ever read as a solid however the tones
  // were tuned. It has to travel with the faces instead.
  const shadeAt = (at, dir) => ({
    front: (lit(at, [0, 0, 1], lamps) / 0.8) * dim,
    side: (lit(at, [dir, 0, 0], lamps) / 0.8) * dim,
    top: (lit(at, [0, -1, 0], lamps) / 0.8) * dim,
    under: (lit(at, [0, 1, 0], lamps) / 0.8) * dim,
  });
  const cwShade = shadeAt([vw - CW_X, Math.max(0, cwY + cwHeight - 200), CW_Z], -1);

  return (
    // `overflow: hidden` is here for the filter, not for the layout. A CSS
    // filter has to rasterise the element's rendered content before it can
    // convolve it, and that content is not the screen — it is everything the
    // subtree paints, including a back wall overscanned to 2.4 viewports and the
    // hoist ropes. Clipping first means the blur works on a screen-sized texture
    // instead of whatever the scene happens to sprawl to. Safe on this element
    // because it carries neither a transform nor preserve-3d; the camera is on
    // the child.
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden', filter: wallFilter }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          perspective: `${CAM_PERSPECTIVE}px`,
          perspectiveOrigin: `50% ${CAM_ORIGIN_Y * 100}%`,
        }}
      >
        {/* no camera move on the intro: we are already standing in the cage, so
            riding forward into it was describing an approach that never happens */}
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          <ShaftBack vw={vw} vh={vh} pos={pos} floorPx={backFloorPx} ride={ride} deck={deck} intro={intro} />
          <ShaftWall side="left" vh={vh} pos={pos} floorPx={floorPx} />
          <ShaftWall side="right" vh={vh} pos={pos} floorPx={floorPx} />

          {/* the cable, running down past the lamps it feeds. It is drawn before
              them so it disappears behind each fitting and comes out below,
              which is the only part of a wiring run anyone ever notices. */}
          <ShaftCable vh={vh} x={vw * (0.5 - LAMPS.side)} travelY={backFloorPx * pos} />

          {/* the counterweight runs in its own guides on the far side */}
          <div
            style={{
              position: 'absolute', top: 0, left: vw - CW_X, width: 0, height: 0,
              transformStyle: 'preserve-3d', transform: `translateZ(${CW_Z}px)`,
            }}
          >
            <HoistRopes bottom={cwY - 15} vh={vh} dim={dim} />
            <Counterweight y={cwY} height={cwHeight} dir={-1} shade={cwShade} />
          </div>

          {/* the lamps, bolted to the far wall either side of every doorway.
              They are the only light in here, so they are also the only reason
              anything else in the shaft is visible at all. */}
          {lamps.map((L) => (
            <Lamp key={L.id} p={L} lamps={lamps} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── the cage ─────────────────────────────────────────────────────────────────
// An open goods-lift cage riding inside the shaft, so it is narrower than the
// shaft and the walls stream past outside its posts.
//
// Its roof and floor are the point of the exercise: they are the first genuinely
// horizontal surfaces in this camera. A vertical bar facing the viewer has no
// convergence available to it and can only ever be shaded, which is why the
// guide rail reads flat. A horizontal plane seen at a grazing angle converges
// hard and reads as depth for nothing.
const CAGE_NEAR = 300; // z of the cage's front, behind the camera
const CAGE_FAR = -40; // z of the rear opening we look out through
const CAGE_DEPTH = CAGE_NEAR - CAGE_FAR;
// How far the cage runs clear of the shaft wall, so the wall stays visible past
// its posts. Proportional, not fixed: a constant 190px is a tenth of a wide
// window and a fifth of a narrow one, which strangles the opening on laptops.
const cageInset = (vw) => Math.max(84, Math.min(190, vw * 0.12));
const CAGE_ROOF_Y = 84;
const CAGE_FLOOR_Y = 0.91; // fraction of vh
// only the two end posts are solid now; the scissor gate fills between them
const POST_Z = [CAGE_FAR, CAGE_NEAR];

// A horizontal deck — roof or floor. Hinged at one end and swung 90°, so its CSS
// height becomes depth and its local y axis reads as distance from the viewer.
function CageDeck({ y, vw, kind, shade, pool }) {
  const isRoof = kind === 'roof';
  const ribs = [0.16, 0.38, 0.6, 0.82];
  const inset = cageInset(vw);
  return (
    <div
      style={{
        position: 'absolute',
        top: y, left: inset, width: vw - inset * 2, height: CAGE_DEPTH,
        transformOrigin: '50% 0%',
        // the roof hangs from its near edge and runs back; the floor is hinged at
        // its far edge and runs toward us, so each one faces the viewer
        transform: isRoof
          ? `translateZ(${CAGE_NEAR}px) rotateX(-90deg)`
          : `translateZ(${CAGE_FAR}px) rotateX(90deg)`,
        ...surface(isRoof ? SURFACES.cageRoof : SURFACES.cageFloor, shade),
        boxShadow: isRoof
          ? 'inset 0 0 80px rgba(0,0,0,0.8)'
          : 'inset 0 0 80px rgba(0,0,0,0.55)',
      }}
    >
      {/* the pool the lamps lay on this deck, drawn under the ironwork so the
          ribs sit in it rather than on top of it */}
      {pool && <div style={{ position: 'absolute', inset: 0, ...pool }} />}
      {/* cross members: evenly spaced in depth, so on screen they bunch up toward
          the far end. Nothing else in the scene shows recession this plainly. */}
      {ribs.map((r) => (
        <div
          key={r}
          style={{
            position: 'absolute', left: 0, right: 0, top: `${r * 100}%`, height: 9,
            // multiplied by the deck's own shade explicitly. It used to come for
            // free because a filter on the parent applies to its descendants;
            // now that the shade is in the colours, nothing is inherited.
            ...ironFace(40, (isRoof ? 0.92 : 1.35) * shade),
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        />
      ))}
      {!isRoof && <DeckPlating />}
    </div>
  );
}

// The hazard lip and the rivet rows on the cage floor. Forty-five elements that
// have never once changed — the cage rides with us, so nothing about it moves —
// and were being rebuilt on every frame regardless. It takes no props at all,
// which is the cheapest possible memo.
const DeckPlating = memo(function DeckPlating() {
  return (
    <>
      {/* the lip of the floor, at the far edge where you'd step off */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 11,
          backgroundImage: 'repeating-linear-gradient(45deg, #d9a531 0px, #d9a531 12px, #241a10 12px, #241a10 24px)',
          opacity: 0.85,
        }}
      />
      {[0.26, 0.7].map((r) => (
        <div key={r} style={{ position: 'absolute', left: 0, right: 0, top: `${r * 100}%`, height: 7 }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute', left: `${(i + 0.5) * 4.55}%`, top: 0, width: 7, height: 7,
                borderRadius: '50%', background: 'var(--rivet)',
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.07)',
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
});

// A corner post. Two faces: the one pointing at the camera and the inboard side,
// which is the one that actually varies as the post moves along the depth.
function CagePost({ z, x, top, height, dir, shade }) {
  const W = 15;
  const D = 20;
  return (
    <div
      style={{
        position: 'absolute', top, left: x, width: 0, height: 0,
        transformStyle: 'preserve-3d', transform: `translateZ(${z}px)`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: -W / 2, width: W, height, transform: `translateZ(${D / 2}px)`, ...ironFace(58, shade.front) }} />
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? W / 2 : -W / 2) - D / 2, width: D, height, transform: `rotateY(${dir * 90}deg)`, ...ironFace(44, shade.side * 0.92) }} />
    </div>
  );
}

// The scissor gate. A lattice beats a row of uprights for the same reason the
// guide rail never worked: a vertical bar facing the viewer has no convergence
// available to it, while a diamond has its corners at four different points and
// the whole mesh compresses toward the far end. Painted into a plane that runs
// along the depth, that compression is the projection's own doing — nothing here
// is hand-tuned. It also stops the cage reading as a cell.
function CageGate({ x, top, height, dir, nearShade, farShade }) {
  const g = SURFACES.cageGate;
  const mesh = (deg, colour, t) =>
    `repeating-linear-gradient(${deg}deg, ${colour} 0 ${t}px, rgba(0,0,0,0) ${t}px ${g.pitch}px)`;
  // The two ends used to carry hand-set darkness. Now the overall level rides on
  // a brightness filter and the gradient carries only the *ratio* between the
  // ends — otherwise the two would be counting the same light twice, and the
  // gate would go black the moment it moved away from a lamp.
  const hi = Math.max(nearShade, farShade, 0.001);
  const drop = Math.max(0, Math.min(0.92, 1 - Math.min(nearShade, farShade) / hi));
  const veil = (s) => (s < hi ? drop : 0).toFixed(3);
  return (
    <div
      style={{
        position: 'absolute', top, height,
        left: dir > 0 ? x : x - CAGE_DEPTH,
        width: CAGE_DEPTH,
        transformOrigin: dir > 0 ? '0% 50%' : '100% 50%',
        transform: `translateZ(${CAGE_NEAR}px) rotateY(${dir * 90}deg)`,
        backgroundImage: [
          // local +x runs away from us on the left gate and toward us on the
          // right one, which is why the ends are ordered by `dir`
          `linear-gradient(90deg, rgba(6,4,2,${veil(dir > 0 ? nearShade : farShade)}), rgba(6,4,2,${veil(dir > 0 ? farShade : nearShade)}))`,
          mesh(58, g.bar, g.thickness),
          mesh(-58, g.bar, g.thickness),
          // a darker pass offset behind, so the flats have some body
          mesh(58, g.barDark, g.thickness + 3),
          mesh(-58, g.barDark, g.thickness + 3),
        ].join(', '),
        backgroundPosition: '0 0, 0 0, 0 0, 2px 2px, 2px 2px',
        filter: `brightness(${Math.min(1.35, hi).toFixed(3)})`,
      }}
    />
  );
}

// A hand rail running the length of the cage. Built the same way as a shaft wall:
// a plane hinged at the near end and swung 90°, so its CSS width is depth.
function CageRail({ x, y, dir, h = 13, shade }) {
  const D = 18;
  const hinge = dir > 0 ? '0% 50%' : '100% 50%';
  return (
    <>
      <div
        style={{
          position: 'absolute', top: y, left: dir > 0 ? x : x - CAGE_DEPTH,
          width: CAGE_DEPTH, height: h,
          transformOrigin: hinge,
          transform: `translateZ(${CAGE_NEAR}px) rotateY(${dir * 90}deg)`,
          ...ironFace(48, shade.side),
        }}
      />
      {/* the rail sits below eye level, so the face we look at is its top */}
      <div
        style={{
          position: 'absolute', top: y, left: x - D / 2, width: D, height: CAGE_DEPTH,
          transformOrigin: '50% 0%',
          transform: `translateZ(${CAGE_FAR}px) rotateX(90deg)`,
          ...ironFace(38, shade.top),
        }}
      />
    </>
  );
}

// The cage draws in its own camera, in front of the content layer. Two
// `perspective` containers with identical parameters are the same camera, so the
// cage and the shaft line up exactly despite the flat content sandwiched between
// them. It carries no motion blur on purpose: the cage rides with us, so it
// staying sharp while the shaft smears is what sells the fact that we're in it.
function CageFront({ vw, vh, lamps }) {
  const floorY = vh * CAGE_FLOOR_Y;
  const postH = floorY - CAGE_ROOF_Y;
  const inset = cageInset(vw);
  const midZ = (CAGE_NEAR + CAGE_FAR) / 2;
  const midY = CAGE_ROOF_Y + postH / 2;
  const railY = floorY - 300;

  // Every face of the cage now asks the lamps how bright it should be. The
  // numbers these replace (1.3 for a front face, 0.55 for an inboard one) were
  // the right *idea* — the inboard face is turned away — but they were frozen,
  // so nothing in the cage ever changed as the shaft moved past it. These do.
  const face = (p, n) => lit(p, n, lamps);
  const post = (x, z, dir) => ({
    front: face([x, midY, z], [0, 0, 1]),
    side: face([x, midY, z], [dir, 0, 0]),
  });

  // Where the light gathers on a horizontal deck. This is not a projection: the
  // bright spot of a point source on a plane is the foot of the perpendicular,
  // and for a lamp out at the far wall that foot lands well past the deck's own
  // far edge. So what reaches the floor is the shoulder of the falloff, pooled
  // along the lip you would step off — which is where light from a doorway
  // belongs, and is not somewhere I would have thought to paint it.
  const pool = (deckY, isRoof) => {
    if (!lamps.length) return null;
    const n = isRoof ? [0, 1, 0] : [0, -1, 0];
    const near = [...lamps].sort((a, b) => Math.abs(a.y - deckY) - Math.abs(b.y - deckY)).slice(0, 2);
    const layers = near.map((L) => {
      const lx = ((L.x - inset) / (vw - inset * 2)) * 100;
      const ly = (((isRoof ? CAGE_NEAR - L.z : L.z - CAGE_FAR) / CAGE_DEPTH) * 100);
      const i = Math.min(0.62, Math.max(0, lit([L.x, deckY, L.z], n, [L]) - LIGHT_AMBIENT) * 0.3);
      return `radial-gradient(circle ${Math.round(CAGE_DEPTH * 2.1)}px at ${lx.toFixed(1)}% ${ly.toFixed(1)}%, rgba(255,208,146,${i.toFixed(3)}) 0%, rgba(255,168,80,${(i * 0.34).toFixed(3)}) 40%, rgba(0,0,0,0) 74%)`;
    });
    return { backgroundImage: layers.join(', '), backgroundBlendMode: 'screen', mixBlendMode: 'screen' };
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          perspective: `${CAM_PERSPECTIVE}px`,
          perspectiveOrigin: `50% ${CAM_ORIGIN_Y * 100}%`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          <CageDeck kind="roof" y={CAGE_ROOF_Y} vw={vw} shade={face([vw / 2, CAGE_ROOF_Y, midZ], [0, 1, 0])} pool={pool(CAGE_ROOF_Y, true)} />
          <CageDeck kind="floor" y={floorY} vw={vw} shade={face([vw / 2, floorY, midZ], [0, -1, 0])} pool={pool(floorY, false)} />
          {POST_Z.map((z) => (
            <CagePost key={`l${z}`} z={z} x={inset} top={CAGE_ROOF_Y} height={postH} dir={1} shade={post(inset, z, 1)} />
          ))}
          {POST_Z.map((z) => (
            <CagePost key={`r${z}`} z={z} x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1} shade={post(vw - inset, z, -1)} />
          ))}
          <CageGate
            x={inset} top={CAGE_ROOF_Y} height={postH} dir={1}
            nearShade={face([inset, midY, CAGE_NEAR], [1, 0, 0])}
            farShade={face([inset, midY, CAGE_FAR], [1, 0, 0])}
          />
          <CageGate
            x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1}
            nearShade={face([vw - inset, midY, CAGE_NEAR], [-1, 0, 0])}
            farShade={face([vw - inset, midY, CAGE_FAR], [-1, 0, 0])}
          />
          <CageRail x={inset} y={railY} dir={1} shade={{ side: face([inset, railY, midZ], [1, 0, 0]), top: face([inset, railY, midZ], [0, -1, 0]) }} />
          <CageRail x={vw - inset} y={railY} dir={-1} shade={{ side: face([vw - inset, railY, midZ], [-1, 0, 0]), top: face([vw - inset, railY, midZ], [0, -1, 0]) }} />
        </div>
      </div>
    </div>
  );
}

// Quality. The vertical motion blur is an SVG filter over a full-viewport 3D
// subtree, which is far and away the most expensive thing in this scene, and it
// is also the only one that is pure garnish — nothing is unreadable without it.
// So it is the first thing to give up. 'auto' measures and decides; true and
// false override.
const QUALITY = { blur: 'off' };

// Frames longer than this are under 25fps and you can see it.
const SLOW_FRAME_MS = 40;

// Watches what frames actually cost while the lift is moving, and gives the blur
// up for good once the machine has shown it cannot afford it. Measured rather
// than guessed from the user agent, because the thing that matters is this
// machine drawing this scene, not what it says it is.
function useBlurBudget(moving) {
  const [afford, setAfford] = useState(true);
  const slow = useRef(0);
  useEffect(() => {
    if (QUALITY.blur !== 'auto' || !moving || !afford) return undefined;
    let id;
    let last = 0;
    const tick = (t) => {
      // the first sample spans the gap since the ride began, so it is not a frame
      const dt = last ? t - last : 0;
      if (dt > SLOW_FRAME_MS) slow.current += 1;
      last = t;
      // Four slow frames, or one frame so long it is a visible hitch on its own.
      // The old threshold of six needed several rides to trip, which meant the
      // machines that needed this most spent the longest not getting it.
      if (slow.current >= 4 || dt > 80) {
        setAfford(false);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [moving, afford]);
  return QUALITY.blur === 'auto' ? afford : QUALITY.blur;
}

// The remaining switches. `cage` is gone: it was never a light. It was a black
// ellipse over the whole frame, which is why switching it off made the picture
// brighter — a vignette wearing a lamp's name. It is called what it is now, and
// the cage is lit by the shaft lamps, from LAMPS above.
const LIGHTS = { landing: true, vignette: true };
// How a departing deck leaves the opening: 'clip' streams it on behind the
// closing leaves, 'fade' dims it out where it stands.
const CONTENT_EXIT = 'clip';

// The things in front of everything that are not surfaces.
//
// The haze is as close to volumetric as this gets. Real volume means integrating
// the light along the ray, which means a renderer. What this does instead is
// stand one soft disc per lamp on the sight line to that lamp, in front of the
// cage, so the glow washes over the ironwork instead of stopping behind it.
// That buys the one thing volume is actually for here: you can tell there is
// air in the shaft, and a lamp going past sweeps through it.
//
// The landing light spills out of the doorway and therefore only exists while
// the doors are open, which makes arrival read as arrival.
function Lighting({ ap, closure, lamps, vw, vh }) {
  const spill = 1 - closure;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
      {LAMPS.haze > 0 && lamps.map((L) => {
        const q = project([L.x, L.y, L.z], vw, vh);
        if (q.y < -vh * 0.5 || q.y > vh * 1.5) return null;
        const r = LAMPS.size * 2.4 * q.s;
        const a = LAMPS.haze * 0.3;
        return (
          <div
            key={L.id}
            style={{
              position: 'absolute', left: q.x - r, top: q.y - r, width: r * 2, height: r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 50%, rgba(255,208,150,${a.toFixed(3)}) 0%, rgba(255,160,70,${(a * 0.3).toFixed(3)}) 38%, rgba(0,0,0,0) 72%)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
      {LIGHTS.vignette && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 96% 90% at 50% ${(CAM_ORIGIN_Y * 100).toFixed(0)}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.14) 66%, rgba(6,4,2,0.6) 100%)`,
          }}
        />
      )}
      {LIGHTS.landing && spill > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: ap.left - ap.width * 0.3, top: ap.top - ap.height * 0.25,
            width: ap.width * 1.6, height: ap.height * 1.5,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,186,104,0.20) 0%, rgba(255,170,80,0.07) 45%, rgba(0,0,0,0) 72%)',
            mixBlendMode: 'screen',
            opacity: spill.toFixed(3),
          }}
        />
      )}
    </div>
  );
}

// Directional (vertical-only) blur. A plain CSS blur smears sideways too and
// instantly reads as "out of focus" rather than "moving fast", so the shaft
// gets an SVG filter with the horizontal deviation pinned to zero.
function MotionBlurDef({ amount, contentAmount }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
      <defs>
        {/* The regions were 120%×160% and 110%×140% of the filtered subtree —
            nearly twice the viewport rastered and convolved per frame for a
            smear that never reaches past a few dozen pixels. A vertical-only
            blur needs no horizontal margin at all. */}
        <filter id="shaftBlur" x="0%" y="-6%" width="100%" height="112%">
          <feGaussianBlur stdDeviation={`0 ${amount}`} />
        </filter>
        <filter id="deckBlur" x="0%" y="-4%" width="100%" height="108%">
          <feGaussianBlur stdDeviation={`0 ${contentAmount}`} />
        </filter>
      </defs>
    </svg>
  );
}

// The cabin's floor selector. Lamps light by proximity to the current position,
// so during a ride they flare one by one as each deck is passed — the readout
// counts up or down on its own instead of just swapping at the end.
function FloorSelector({ pos, deck, moving, go }) {
  const dir = moving ? Math.sign(pos - deck) : 0;
  const reading = DECKS[Math.max(0, Math.min(DECKS.length - 1, Math.round(pos)))].no;
  return (
    <nav
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '1.1rem 0 0.9rem', borderBottom: '1px solid var(--line)',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--muted)' }}>No. 001 / MT</span>
        <span
          style={{
            fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: 1,
            background: 'var(--screen)', color: 'var(--glow)',
            padding: '2px 8px', borderRadius: 2, minWidth: 54, textAlign: 'center',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.85)',
            textShadow: '0 0 8px rgba(255,180,84,0.75)',
          }}
        >
          {reading}
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: dir ? 'var(--glow)' : 'var(--line)', textShadow: dir ? '0 0 8px rgba(255,180,84,0.8)' : 'none' }}>
          {dir > 0 ? '▲' : dir < 0 ? '▼' : '—'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.9rem' }}>
        {DECKS.map((d, i) => {
          const lamp = Math.max(0, 1 - Math.abs(pos - i));
          const selected = i === deck && !moving;
          return (
            <button
              key={d.id}
              onClick={() => go(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 0, padding: '4px 2px',
                cursor: moving ? 'default' : 'pointer',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                color: selected ? 'var(--glow)' : 'var(--muted)',
                borderBottom: `2px solid ${selected ? 'var(--brass)' : 'transparent'}`,
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: `rgba(255,180,84,${(0.12 + 0.88 * lamp).toFixed(2)})`,
                  boxShadow: lamp > 0.05 ? `0 0 ${(9 * lamp).toFixed(1)}px rgba(255,180,84,${(0.9 * lamp).toFixed(2)})` : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                }}
              />
              {d.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// The glowing strips that used to mark the shaft between decks lived here. They
// were a stand-in for fixtures that did not exist — a light with no lamp, drawn
// in screen space in front of everything. The lamps at the half-floor levels do
// the same job now, from inside the scene and at the right depth.

function DeckHeading({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '1.4rem' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 30, margin: 0, textShadow: '0 2px 0 rgba(0,0,0,0.5)' }}>{children}</h2>
      <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

// The half-round indicator that sits over the doors of every old lift. It is
// the one place an analogue dial earns its keep here: big enough for the
// texture to actually read, and it does a job — the needle sweeps continuously
// with the cabin instead of decorating the wall.
function FloorDial({ pos, size = 260 }) {
  const SPAN = 68;
  const angle = -SPAN + (pos / (DECKS.length - 1)) * SPAN * 2;
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.5 + 34 }}>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: size * 0.5 + 14,
          borderRadius: `${size / 2}px ${size / 2}px 4px 4px`,
          backgroundImage: `linear-gradient(160deg, rgba(176,138,86,0.72), rgba(88,60,26,0.85)), url(${bronzeWorn})`,
          backgroundSize: `auto, ${Math.round(size * 0.8)}px ${Math.round(size * 0.8)}px`,
          backgroundBlendMode: 'soft-light',
          boxShadow: '0 14px 26px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.16)',
        }}
      />
      <div
        style={{
          position: 'absolute', left: 12, right: 12, top: 12, height: size * 0.5 - 8,
          borderRadius: `${size / 2}px ${size / 2}px 2px 2px`,
          backgroundImage: `linear-gradient(180deg, rgba(26,21,16,0.92), rgba(9,7,5,0.95)), url(${bronzeWorn})`,
          backgroundSize: `auto, ${Math.round(size * 0.45)}px ${Math.round(size * 0.45)}px`,
          backgroundBlendMode: 'multiply',
          boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.9), inset 0 0 0 1px var(--brass-deep)',
        }}
      />
      <svg
        viewBox="0 0 200 108"
        style={{ position: 'absolute', left: 12, right: 12, top: 12, width: size - 24, height: (size - 24) * 0.54 }}
      >
        {DECKS.map((d, i) => {
          const a = -SPAN + (i / (DECKS.length - 1)) * SPAN * 2;
          const lit = Math.max(0, 1 - Math.abs(pos - i) * 1.6);
          return (
            <g key={d.id}>
              {/* numerals sit outside the ticks, clear of the needle's sweep —
                  inside, the needle parked on a floor covered its own label */}
              <line
                x1={100 + 78 * Math.cos(rad(a))} y1={100 + 78 * Math.sin(rad(a))}
                x2={100 + 66 * Math.cos(rad(a))} y2={100 + 66 * Math.sin(rad(a))}
                stroke="var(--brass)" strokeWidth="2.2"
              />
              <text
                x={100 + 91 * Math.cos(rad(a))} y={100 + 91 * Math.sin(rad(a)) + 4.5}
                textAnchor="middle" fontFamily="var(--mono)" fontSize="13"
                fill={lit > 0.05 ? 'var(--glow)' : 'var(--muted)'}
                opacity={0.45 + 0.55 * lit}
                style={lit > 0.05 ? { filter: `drop-shadow(0 0 ${4 * lit}px rgba(255,180,84,0.9))` } : undefined}
              >
                {d.tick}
              </text>
            </g>
          );
        })}
        <line
          x1="100" y1="100"
          x2={100 + 61 * Math.cos(rad(angle))} y2={100 + 61 * Math.sin(rad(angle))}
          stroke="var(--glow)" strokeWidth="3" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 5px rgba(255,180,84,0.9))' }}
        />
        <circle cx="100" cy="100" r="7" fill="var(--brass)" stroke="var(--brass-deep)" strokeWidth="1.5" />
      </svg>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: 'var(--muted)',
        }}
      >
        FAHRKORB I
      </div>
    </div>
  );
}

function StartDeck({ lag, pos }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 340px', minWidth: 300 }}>
      <div style={{ transform: `translateY(${(lag * 0.5).toFixed(2)}px)` }}>
        <GaugeLogo />
      </div>
      <h1
        style={{
          fontFamily: 'var(--serif)', fontWeight: 700,
          fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', lineHeight: 1.05, margin: '1.2rem 0 0',
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
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 440, margin: '1rem 0 0', transform: `translateY(${(lag * 1.35).toFixed(2)}px)` }}>
        Baue Systeme, die tragen &mdash; von der Datenbank bis zur Oberfl&auml;che.
        Offen f&uuml;r neue Aufgaben im Ruhrgebiet / NRW.
      </p>
      </div>

      <div style={{ flex: '0 1 260px', display: 'flex', justifyContent: 'center', transform: `translateY(${(lag * 0.7).toFixed(2)}px)` }}>
        <FloorDial pos={pos} />
      </div>
    </div>
  );
}

function LeistungenDeck({ lag }) {
  return (
    <>
      <DeckHeading>Leistungen</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {skills.map((g, i) => (
          <Plate key={g.label} i={i} lag={lag} style={{ padding: '1rem 1.1rem' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--brass)' }}>
              {g.label}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--glow)', marginTop: 8, textShadow: '0 0 6px rgba(255,180,84,0.4)' }}>
              {g.tech}
            </div>
          </Plate>
        ))}
      </div>
    </>
  );
}

function ProjekteDeck({ lag }) {
  return (
    <>
      <DeckHeading>Projekte</DeckHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
        {stats.map((s, i) => (
          <Plate key={s.label} i={i} lag={lag} style={{ padding: '1rem 0.9rem' }}>
            <ScreenValue value={s.value} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
              {s.label}
            </div>
          </Plate>
        ))}
      </div>
      <Plate i={4} lag={lag} style={{ padding: '1.2rem', marginTop: '1rem' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--brass)' }}>
          Referenzen
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted)', margin: '8px 0 0' }}>
          Ausgew&auml;hlte Projekte sind in Vorbereitung &mdash; Details gerne direkt im Gespr&auml;ch.
        </p>
      </Plate>
    </>
  );
}

function KontaktDeck({ lag }) {
  return (
    <div style={{ textAlign: 'center', transform: `translateY(${(lag * 0.9).toFixed(2)}px)` }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>Lust auf ein Gespr&auml;ch?</h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '1.6rem', flexWrap: 'wrap' }}>
        <a
          href="mailto:nykolai.tymchenko@gmail.com"
          style={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--brass)', color: 'var(--glow)', borderRadius: 2, padding: '0.7rem 1.2rem', textDecoration: 'none' }}
        >
          nykolai.tymchenko@gmail.com
        </a>
        <a
          href="https://linkedin.com/in/mykolai-tymchenko"
          target="_blank" rel="noreferrer"
          style={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--line)', color: 'var(--muted)', borderRadius: 2, padding: '0.7rem 1.2rem', textDecoration: 'none' }}
        >
          LinkedIn
        </a>
      </div>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: '2rem', letterSpacing: 1 }}>
        DUISBURG &mdash; VERF&Uuml;GBAR AB SOFORT
      </p>
    </div>
  );
}

const DECK_BODIES = [StartDeck, LeistungenDeck, ProjekteDeck, KontaktDeck];

export default function Dieselpunk() {
  const { t, setT, playing, play } = useScrub(DOOR_TOTAL_MS);
  const { pos, deck, moving, velocity, go, scrub, setScrub, ride, ridePhase } = useLift();
  const { vw: winW, vh } = useViewport();
  // No approach and no zoom on the intro. Now that the intro is just the landing
  // doors opening, scaling the room up meant the cage grew around us while we
  // stood still in it — we were never outside it to walk in.
  const contentScale = 1;
  const contentBlur = 0;

  const gap = vh * DECK_GAP;
  const step = vh + gap;
  const floorPxWall = step * WALL_PARALLAX;
  // the intro and a ride drive the same leaves, so whichever wants them more
  // shut wins — that also makes the very first frame a shut door rather than a
  // scene that has to be covered up by something else
  const closure = Math.max(doorClosure(ridePhase), introClosure(t));
  const shake = introShake(t);

  // Where the doorway lands on screen. A plane square to the camera is only a
  // uniform scale, so this is exact — which is what lets the content stay a flat,
  // crisp DOM layer and still sit convincingly inside the opening.
  const apW = winW * DOOR_W * BACK_SCALE;
  const apH = vh * DOOR_H * BACK_SCALE;
  const ap = { left: (winW - apW) / 2, top: vh * CAM_ORIGIN_Y - apH / 2, width: apW, height: apH };
  // the content travels at the doorway's on-screen rate, so a deck stays welded
  // to the door that frames it
  const contentStep = step * BACK_SCALE;
  // the cage's rear frame, where the selector is mounted
  const headInset = winW / 2 + (cageInset(winW) - winW / 2) * (CAM_PERSPECTIVE / (CAM_PERSPECTIVE - CAGE_FAR));
  const speed = Math.abs(velocity);
  // Quantised into steps. Every distinct stdDeviation is a different filter as
  // far as the compositor is concerned, so a continuously varying one threw away
  // the cached result on every single frame; nine buckets look identical in
  // motion and let it be reused.
  const blurAllowed = useBlurBudget(moving);
  const blurAmount = blurAllowed ? Math.round(Math.min(16, speed * 5.5) / 2) * 2 : 0;
  // The lamps, for this position of the shaft. Everything that gets lit is
  // handed this same list, so the cage, the fixtures and the haze cannot
  // disagree about where the light is coming from — which is the entire reason
  // for computing it once rather than painting it three times.
  const lamps = lampsAt(winW, vh, pos, step);
  // the decks get a touch of the same vertical smear — razor-sharp text flying
  // past at speed is the giveaway that nothing is really moving
  const contentSmear = blurAllowed ? Math.round(Math.min(3.2, speed * 1.1)) : 0;
  // loose objects trail the cabin's motion and settle a beat after it stops
  const lag = Math.max(-17, Math.min(17, -velocity * 4.6));

  // the decks are one screen each and the shaft owns the vertical axis, so the
  // document itself must never scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      style={{
        ...vars, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif",
        position: 'fixed', inset: 0, overflow: 'hidden',
      }}
    >
      <MotionBlurDef amount={blurAmount} contentAmount={contentSmear} />
      <Grain opacity={0.06} />

      {/* backdrop — the deepest plane, so it drifts slowest */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: '-60%', bottom: '-60%',
          background: 'radial-gradient(ellipse at 50% 30%, var(--bg-2) 0%, var(--bg) 62%)',
          transform: `translateY(${(pos * step * BG_PARALLAX).toFixed(1)}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,205,150,0.07) 0%, transparent 65%, transparent 75%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      <Shaft
        vw={winW} vh={vh} pos={pos}
        floorPx={floorPxWall} backFloorPx={step}
        blur={blurAmount}
        lamps={lamps}
        ride={ride} deck={deck} intro={introClosure(t)}
      />

      <div style={{ pointerEvents: 'auto' }}>
        <DebugScrub t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} blur={blurAllowed} />
      </div>

      {/* The decks, clipped to the doorway and streaming behind it. Keeping the
          column moving rather than cross-fading is what makes a departing floor
          read as leaving: text escaping through a narrowing gap is a floor going
          away, where a fade is just a layer switching off. */}
      <div
        style={{
          position: 'absolute',
          left: ap.left, top: ap.top, width: ap.width, height: ap.height,
          overflow: 'hidden', zIndex: 2,
          // 'clip' lets the deck stream on behind the closing leaves and escape
          // through the narrowing gap; 'fade' simply dims it out
          opacity: CONTENT_EXIT === 'fade' ? (1 - closure).toFixed(3) : 1,
          filter: [
            contentBlur > 0.05 ? `blur(${contentBlur.toFixed(2)}px)` : '',
            contentSmear > 0.2 ? 'url(#deckBlur)' : '',
          ].filter(Boolean).join(' ') || 'none',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(pos * contentStep).toFixed(1)}px)` }}>
          {/* Behind a shut door there is nothing to see, so there is nothing to
              build. The leaves are opaque and they cover the whole aperture, so
              the deck underneath is not dimmed or clipped — it is invisible, and
              at 0.985 it has been invisible for a few frames already. */}
          {closure < 0.985 && DECKS.map((d, i) => {
            if (Math.abs(i - pos) > 1.2) return null;
            const Body = DECK_BODIES[i];
            return (
              <div
                key={d.id}
                style={{
                  position: 'absolute', left: 0, right: 0, top: -i * contentStep, height: ap.height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '1.4rem 5.8rem',
                  boxSizing: 'border-box',
                  transform: `scale(${contentScale})`,
                }}
              >
                <div style={{ width: '100%' }}>
                  <Body lag={lag} pos={pos} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the doors, in front of the content: the content sits on the landing,
          so leaves that cannot cover it are not doors */}
      <Doorways
        vw={winW} vh={vh} pos={pos} floorPx={step}
        ride={ride} deck={deck} intro={introClosure(t)}
        shake={shake} blur={blurAmount}
      />

      {/* The blanket of black that used to be laid over everything mid-ride has
          gone. It was there because the shaft had no lights, so "between floors
          is dark" had to be asserted; with fixtures at the half-floor levels the
          scene darkens and brightens on its own, and painting over it would only
          hide the thing we just built. */}

      {/* the cage rides with us, not with the shaft, and draws in front of the
          content because it is nearer than the landing the content sits on */}
      <CageFront vw={winW} vh={vh} lamps={lamps} />

      <Lighting ap={ap} closure={closure} lamps={lamps} vw={winW} vh={vh} />

      {/* The selector is mounted on the cage, not above the landing door. A lift's
          floor buttons live in the cabin — and had they gone on the shaft wall
          they would have ridden away with the floor you were trying to leave. */}
      <div
        style={{
          position: 'absolute', top: 0, left: headInset, width: winW - headInset * 2, zIndex: 6,
          transform: `scale(${contentScale})`, transformOrigin: '50% 0%',
          filter: contentBlur > 0.05 ? `blur(${contentBlur.toFixed(2)}px)` : 'none',
        }}
      >
        <div
          style={{
            padding: '0 1.1rem',
            ...ironFace(70, 0.95),
            boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.09), 0 5px 14px rgba(0,0,0,0.6)',
          }}
        >
          <FloorSelector pos={pos} deck={deck} moving={moving} go={go} />
        </div>
      </div>
    </div>
  );
}
