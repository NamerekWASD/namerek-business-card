import { useEffect, useRef, useState } from 'react';
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

const snap = [0.16, 1, 0.3, 1];

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
  cageGate: { bar: '#7f6a35', barDark: '#211c12', pitch: 40, thickness: 5, near: 0.88, far: 0.12 },
  doorLeaf: { from: '#3d3123', to: '#1c1610', tile: 'rust', scale: 280, tex: 0.26 },
  doorFrame: { from: '#4a4137', to: '#231e19', tile: 'steel', scale: 160, tex: 0.32 },
  // the small fittings — clips, shoes, rivetted plates, architrave members
  iron: { from: '#443626', to: '#241a11', tile: 'rust', scale: 70, tex: 0.3 },
  steel: { from: '#3f454a', to: '#1e2225', tile: 'steel', scale: 46, tex: 0.34 },
};

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Composites one surface. The texture is muted by washing a flat coat of the
// surface's own shadow colour back over it — a genuine scalar, where blend modes
// alone only ever give you two or three fixed strengths.
function surface(s, shade = 1) {
  const brightness = shade === 1 ? undefined : `brightness(${shade})`;
  const base = `linear-gradient(180deg, ${s.from}, ${s.to})`;
  const tile = TILES[s.tile];
  if (!tile || s.tex <= 0) return { backgroundImage: base, filter: brightness };
  const wash = rgba(s.to, 1 - s.tex);
  return {
    backgroundImage: `linear-gradient(${wash}, ${wash}), ${base}, url(${tile})`,
    backgroundSize: `auto, auto, ${s.scale}px ${s.scale}px`,
    backgroundBlendMode: 'normal, multiply, multiply',
    filter: brightness,
  };
}

// Every tab is a deck of the same shaft: switching tabs is a lift ride, so the
// decks have an order and a direction — going from Kontakt back to Start rides
// *down*, and a three-floor hop takes longer than a neighbouring one.
const DECKS = [
  { id: 'start', label: 'Start', no: '01' },
  { id: 'leistungen', label: 'Leistungen', no: '02' },
  { id: 'projekte', label: 'Projekte', no: '03' },
  { id: 'kontakt', label: 'Kontakt', no: '04' },
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
  return { deck, pos, velocity, go, moving: !!ride, scrub, setScrub, ridePhase: ride ? ride.p : null };
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

// The deck plate we are standing on. It belongs to the cage, not to any floor,
// so it never rides with the shaft — which makes it the one fixed thing at the
// bottom of the frame while everything behind it streams past. The taper runs
// narrow at the far edge and full width at the near one, so its silhouette
// meets the hazard stripe and front face without a step.
function BigGear({ style, size = 260, speed = 40, reverse }) {
  const teeth = Array.from({ length: 16 });
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ position: 'absolute', opacity: 0.08, ...style }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="100" cy="100" r="78" fill="none" stroke="var(--brass)" strokeWidth="4" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--brass)" strokeWidth="3" />
      {teeth.map((_, i) => {
        const a = (i / teeth.length) * 360;
        return <rect key={i} x="94" y="6" width="12" height="20" fill="var(--brass)" transform={`rotate(${a} 100 100)`} />;
      })}
    </motion.svg>
  );
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

function DebugScrub({ t, setT, playing, play, scrub, setScrub }) {
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
// The rail and the counterweight sit inboard far enough to clear the cage posts.
// Hard against the shaft wall they were hidden behind the gate at any ordinary
// window width and only appeared when the window was narrowed — furniture you
// can never see is furniture you did not build.
const RAIL_Z = -150;
const RAIL_X = 185;
const CW_Z = -160;
const CW_X = 190;

// Flat, near-even steel. The old version had a strong specular band down the
// middle, which is how you fake a cylinder on a single plane — exactly the
// wrong cue now that the solids are built from real faces, because it made the
// rail read as a pipe. Volume comes from the faces differing in tone (`shade`),
// not from a highlight painted inside one of them.
const steelFace = (scale = 46, shade = 1) => surface({ ...SURFACES.steel, scale }, shade);
const ironFace = (scale = 70, shade = 1) => surface({ ...SURFACES.iron, scale }, shade);

// A rivet seam running the full height of the shaft wall. Offsetting it modulo
// the pitch makes it endless: the wall can travel any distance and the seam
// never runs out or visibly restarts.
function ShaftRivets({ offset, depth, span, nearEdge }) {
  const PITCH = 46;
  const shift = ((offset % PITCH) + PITCH) % PITCH;
  const rows = Math.ceil(span / PITCH) + 2;
  return Array.from({ length: rows }).map((_, i) => (
    <span
      key={i}
      style={{
        position: 'absolute', top: i * PITCH - PITCH + shift, [nearEdge]: depth,
        width: 7, height: 7, borderRadius: '50%',
        background: 'var(--rivet)',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)',
      }}
    />
  ));
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
function LandingProp({ idx }) {
  return (
    <div style={{ position: 'absolute', right: '7%', bottom: '6%', filter: 'brightness(1.85)' }}>
      <PropBody idx={idx} />
    </div>
  );
}

function PropBody({ idx }) {
  const base = { position: 'relative' };
  if (idx === 1) {
    // a tool board
    return (
      <div style={{ ...base, width: 150, height: 108, ...ironFace(60, 0.8), boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 26, height: 4, background: 'rgba(0,0,0,0.55)' }} />
        {[14, 44, 74, 104].map((x, i) => (
          <div
            key={x}
            style={{
              position: 'absolute', left: x, top: 30, width: i % 2 ? 9 : 13, height: 44 + (i % 3) * 14,
              background: 'linear-gradient(180deg, #7b848b, #2b3034)', borderRadius: 2,
              boxShadow: '1px 2px 4px rgba(0,0,0,0.6)',
            }}
          />
        ))}
      </div>
    );
  }
  if (idx === 2) {
    // stacked crates, stencilled
    return (
      <div style={{ ...base, width: 170, height: 130 }}>
        {[{ x: 0, y: 46, w: 100, h: 84 }, { x: 92, y: 66, w: 78, h: 64 }, { x: 22, y: 0, w: 70, h: 48 }].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
              backgroundImage: `linear-gradient(170deg, #6b4f2c, #3a2914), url(${rustBrass})`,
              backgroundSize: 'auto, 90px 90px', backgroundBlendMode: 'multiply',
              boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.45), 2px 3px 7px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ position: 'absolute', left: '10%', right: '10%', top: '42%', height: 3, background: 'rgba(216,178,110,0.4)' }} />
            <div style={{ position: 'absolute', left: '10%', top: '14%', fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(216,178,110,0.5)' }}>MT</div>
          </div>
        ))}
      </div>
    );
  }
  if (idx === 3) {
    // a pneumatic mail chute
    return (
      <div style={{ ...base, width: 96, height: 190 }}>
        <div style={{ position: 'absolute', left: 26, top: 0, bottom: 34, width: 44, ...steelFace(50, 0.85), borderRadius: 4, boxShadow: 'inset -6px 0 10px rgba(0,0,0,0.5)' }} />
        {[30, 78, 126].map((y) => (
          <div key={y} style={{ position: 'absolute', left: 18, top: y, width: 60, height: 11, ...ironFace(40, 1.2), borderRadius: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.6)' }} />
        ))}
        <div style={{ position: 'absolute', left: 8, bottom: 0, width: 80, height: 34, ...ironFace(52, 1.05), borderRadius: 3 }}>
          <div style={{ position: 'absolute', inset: '9px 12px', background: 'rgba(0,0,0,0.75)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.9)' }} />
        </div>
      </div>
    );
  }
  // deck 01 — the landing's own floor plate
  return (
    <div style={{ ...base, width: 128, height: 84, ...ironFace(56, 1.15), borderRadius: 3, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.45), 0 3px 8px rgba(0,0,0,0.5)' }}>
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

// The doorway of one floor: architrave, leaves, indicator. It lives in its own
// layer in front of the content, because the content sits on the landing wall
// and doors that cannot cover it are not doors.
function Doorway({ vw, vh, top, no, closure, shake }) {
  const w = vw * DOOR_W;
  const h = vh * DOOR_H;
  const left = (vw - w) / 2;
  const face = surface(SURFACES.doorFrame);
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

      {/* the returns, bridging the frame's front back to the wall */}
      <div style={{ position: 'absolute', left, top: 0, width: FRAME_D, height: h, transformOrigin: '0% 50%', transform: `translateZ(${FRAME_D}px) rotateY(90deg)`, ...ret(true, false) }} />
      <div style={{ position: 'absolute', left: left + w - FRAME_D, top: 0, width: FRAME_D, height: h, transformOrigin: '100% 50%', transform: `translateZ(${FRAME_D}px) rotateY(-90deg)`, ...ret(false, false) }} />
      <div style={{ position: 'absolute', left, top: 0, width: w, height: FRAME_D, transformOrigin: '50% 0%', transform: `translateZ(${FRAME_D}px) rotateX(-90deg)`, ...ret(true, true) }} />
      <div style={{ position: 'absolute', left, top: h, width: w, height: FRAME_D, transformOrigin: '50% 0%', transform: 'rotateX(90deg)', ...ret(false, true) }} />

      {/* the architrave itself, standing proud of the wall */}
      {[
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
      ))}

      {/* Floor number, inside the head of the opening and in front of the leaves.
          On the architrave itself it fouled the cage roof on short windows, and
          in front of the doors it stays readable as a shut landing goes past. */}
      <div
        style={{
          position: 'absolute', left: '50%', top: 16, marginLeft: -32, width: 64, height: 26,
          transform: `translateZ(${(FRAME_D * 0.34 + 6).toFixed(1)}px)`,
          background: 'var(--screen)', borderRadius: 2,
          boxShadow: 'inset 0 1px 5px rgba(0,0,0,0.9), 0 0 0 1px rgba(96,73,44,0.55)',
          fontFamily: 'var(--mono)', fontSize: 16, lineHeight: '26px', textAlign: 'center',
          color: 'var(--glow)', textShadow: '0 0 8px rgba(255,180,84,0.7)',
        }}
      >
        {no}
      </div>
    </div>
  );
}

// The doorways, in their own camera in front of the content. Two `perspective`
// containers with identical parameters are one camera, so these line up exactly
// with the wall they stand on despite the flat content layer between them.
function Doorways({ vw, vh, pos, floorPx, closure, shake, blur }) {
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const here = Math.round(pos);
  const slots = [here - 1, here, here + 1].filter((f) => f >= 0 && f < DECKS.length);
  const filter = blur > 0.25 ? 'url(#shaftBlur)' : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', filter }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${CAM_PERSPECTIVE}px`, perspectiveOrigin: `50% ${CAM_ORIGIN_Y * 100}%` }}>
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          <div
            style={{
              position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
              transform: `translateZ(${-SHAFT_DEPTH}px)`, transformStyle: 'preserve-3d',
            }}
          >
            {slots.map((f) => (
              <Doorway
                key={f}
                vw={vw}
                vh={vh}
                top={overscan + travelY - f * floorPx + vh * CAM_ORIGIN_Y - (vh * DOOR_H) / 2}
                no={DECKS[f].no}
                closure={closure}
                shake={shake}
              />
            ))}
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
function ShaftBack({ vw, vh, pos, floorPx }) {
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const w = vw * DOOR_W;
  const h = vh * DOOR_H;
  const left = (vw - w) / 2;
  const here = Math.round(pos);
  const slots = [here - 2, here - 1, here, here + 1, here + 2];
  const doorTop = (f) => overscan + travelY - f * floorPx + vh * CAM_ORIGIN_Y - h / 2;
  const wall = { ...surface(SURFACES.backWall), backgroundPosition: `0 0, 0 0, 0 ${travelY.toFixed(1)}px` };

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
                    position: 'absolute', inset: 0, overflow: 'hidden',
                    transform: `translateZ(${-LANDING_D}px)`,
                    ...surface(SURFACES.landing),
                    // the shadow the head of the opening throws into the room
                    boxShadow: 'inset 0 70px 90px -30px rgba(0,0,0,0.85), inset 0 0 130px rgba(0,0,0,0.6)',
                  }}
                >
                  {LIGHTS.landing && (
                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse 62% 46% at 50% 6%, rgba(255,196,116,0.34) 0%, rgba(255,170,80,0.08) 46%, rgba(0,0,0,0) 78%)',
                        mixBlendMode: 'screen',
                      }}
                    />
                  )}
                  <LandingProp idx={f} />
                </div>
                {/* the reveal into the room: four faces bridging wall to landing.
                    Drawn here, behind the content, so they frame it rather than
                    crossing it. */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: LANDING_D, height: h, transformOrigin: '0% 50%', transform: 'rotateY(90deg)', ...surface(SURFACES.landing, 0.5) }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: LANDING_D, height: h, transformOrigin: '100% 50%', transform: 'rotateY(-90deg)', ...surface(SURFACES.landing, 0.5) }} />
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

// The T-section guide rail, as an actual T: the flange lies across the shaft and
// the blade stands out of it toward the cabin. Three faces at three angles —
// that, and nothing else, is what makes it read as a beam instead of a stripe.
function GuideRail({ dir, vh }) {
  const H = vh * 2.4;
  const top = -vh * 0.7;
  const FLANGE_D = 40;
  const BLADE_OUT = 20;
  const BLADE_T = 13;
  return (
    <>
      {/* flange — normal points across the shaft, so it is the face we look at */}
      <div
        style={{
          position: 'absolute', top, height: H, left: -FLANGE_D / 2, width: FLANGE_D,
          transform: `rotateY(${dir * 90}deg)`,
          ...steelFace(70, 0.42),
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.7)',
        }}
      />
      {/* blade, face-on to the camera */}
      <div
        style={{
          position: 'absolute', top, height: H, left: dir > 0 ? 0 : -BLADE_OUT, width: BLADE_OUT,
          transform: `translateZ(${BLADE_T / 2}px)`,
          ...steelFace(44, 0.78),
        }}
      />
      {/* the blade's tip, edge-on — the highlight that gives the beam a corner */}
      <div
        style={{
          position: 'absolute', top, height: H,
          left: dir > 0 ? BLADE_OUT - BLADE_T / 2 : -BLADE_OUT - BLADE_T / 2, width: BLADE_T,
          transform: `rotateY(${dir * 90}deg)`,
          ...steelFace(30, 1.15),
        }}
      />
    </>
  );
}

// Bolted joints between rail sections. The rail is uniform, so without these the
// shaft could be moving at any speed or none.
function RailClips({ offset, dir, vh }) {
  const PITCH = 210;
  const shift = ((offset % PITCH) + PITCH) % PITCH;
  const rows = Math.ceil((vh * 1.4) / PITCH) + 2;
  const W = 46;
  const D = 26;
  const Hc = 17;
  return Array.from({ length: rows }).map((_, i) => {
    const top = i * PITCH - PITCH + shift - vh * 0.2;
    return (
      <div key={i} style={{ position: 'absolute', top, left: 0, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
        <div style={{ position: 'absolute', top: 0, left: dir > 0 ? -8 : -W + 8, width: W, height: Hc, transform: `translateZ(${D / 2}px)`, ...ironFace(50, 1.5), borderRadius: 2, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)' }} />
        <div style={{ position: 'absolute', top: 0, left: dir > 0 ? W - 8 - D / 2 : -W + 8 - D / 2, width: D, height: Hc, transform: `rotateY(${dir * 90}deg)`, ...ironFace(40, 0.95) }} />
        <div style={{ position: 'absolute', top: -D / 2, left: dir > 0 ? -8 : -W + 8, width: W, height: D, transform: `translateY(${Hc / 2}px) rotateX(90deg)`, ...ironFace(50, 1.9) }} />
      </div>
    );
  });
}

// The roller guides are bolted to the cabin, not the shaft, so they are the one
// piece of hardware that stays nailed to the screen while everything else
// streams past. Built as a box: front, inboard side, underside.
function RollerShoe({ top, dir }) {
  const W = 46;
  const D = 34;
  const H = 56;
  return (
    <div style={{ position: 'absolute', top, left: 0, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', top: 0, left: dir > 0 ? -10 : -W + 10, width: W, height: H, transform: `translateZ(${D / 2}px)`, ...ironFace(64, 1.45), borderRadius: 3, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}>
        {[0.3, 0.7].map((fy) => (
          <span key={fy} style={{ position: 'absolute', top: fy * H - 11, left: dir > 0 ? 26 : 6, width: 14, height: 22, borderRadius: 7, background: 'linear-gradient(90deg, #191c1f, #7d878f 45%, #191c1f)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.7)' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: dir > 0 ? W - 10 - D / 2 : -W + 10 - D / 2, width: D, height: H, transform: `rotateY(${dir * 90}deg)`, ...ironFace(46, 0.9) }} />
      <div style={{ position: 'absolute', top: H - D / 2, left: dir > 0 ? -10 : -W + 10, width: W, height: D, transform: `rotateX(-90deg)`, transformOrigin: '50% 0%', ...ironFace(50, 0.55) }} />
    </div>
  );
}

// The counterweight hangs on the other end of the ropes, so it runs opposite the
// cabin: on screen that is twice the shaft's rate, in the same direction the
// shaft appears to move. Anchored to hang into the top of the frame while the
// cabin rests on deck 02 — at ride speed it is smeared past recognition, so it
// needs one resting place where you can see what it is. A box, again: face,
// inboard side, and the underside you actually look up at.
function Counterweight({ y, height, dir }) {
  const W = 62;
  const D = 42;
  const plates = 'repeating-linear-gradient(180deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 18px)';
  return (
    <div style={{ position: 'absolute', top: y, left: 0, width: 0, height: 0, transformStyle: 'preserve-3d' }}>
      <div style={{ position: 'absolute', top: 0, left: -W / 2, width: W, height, transform: `translateZ(${D / 2}px)`, ...steelFace(58, 0.85) }}>
        <div style={{ position: 'absolute', inset: '16px 6px 6px', backgroundImage: plates }} />
      </div>
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? W / 2 : -W / 2) - D / 2, width: D, height, transform: `rotateY(${dir * 90}deg)`, ...steelFace(46, 0.5) }}>
        <div style={{ position: 'absolute', inset: '16px 4px 6px', backgroundImage: plates }} />
      </div>
      <div style={{ position: 'absolute', top: height - D / 2, left: -W / 2, width: W, height: D, transform: 'rotateX(-90deg)', transformOrigin: '50% 0%', ...steelFace(40, 0.3) }} />
      {/* crosshead the ropes terminate in */}
      <div style={{ position: 'absolute', top: -16, left: -W / 2 - 8, width: W + 16, height: 17, transform: `translateZ(${D / 2 + 3}px)`, ...steelFace(38, 1.1), borderRadius: 2, boxShadow: '0 3px 7px rgba(0,0,0,0.75)' }} />
    </div>
  );
}

// Ropes run from the sheave at the top of the shaft down to the crosshead and
// stop there — drawn past it they read as the block dangling from below.
function HoistRopes({ bottom }) {
  const TOP = -6000;
  const height = Math.max(0, bottom - TOP);
  if (height <= 0) return null;
  return [-16, 0, 16].map((dx) => (
    <div
      key={dx}
      style={{
        position: 'absolute', top: TOP, height, left: dx - 2, width: 4,
        transform: 'translateZ(22px)',
        background: 'linear-gradient(90deg, #14171a, #98a3ab 50%, #14171a)',
      }}
    />
  ));
}

// Everything that lives in the shaft, under one camera. The blur sits on the
// wrapper *outside* the perspective element on purpose: `filter` flattens the
// 3D rendering context of the element it is applied to, so putting it any
// deeper would collapse the whole scene back into decals.
function Shaft({ vw, vh, pos, floorPx, backFloorPx, blur }) {
  const travelY = pos * floorPx;
  // the rail and the counterweight are shaft furniture, not the subject. Pushed
  // behind the cage bars and knocked back, they read as texture instead of
  // demanding the attention a face-on vertical bar can never repay.
  const dim = 0.62;
  const cwHeight = vh * 1.15;
  const cwY = 132 - cwHeight + 2 * (pos - 1) * floorPx;
  const wallFilter = blur > 0.25 ? `url(#shaftBlur) brightness(${(1 - Math.min(0.2, blur * 0.02)).toFixed(3)})` : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', filter: wallFilter }}>
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
          <ShaftBack vw={vw} vh={vh} pos={pos} floorPx={backFloorPx} />
          <ShaftWall side="left" vh={vh} pos={pos} floorPx={floorPx} />
          <ShaftWall side="right" vh={vh} pos={pos} floorPx={floorPx} />

          {/* the rail and its shoes, standing in the shaft clear of the wall */}
          <div
            id="instrument"
            style={{
              position: 'absolute', top: 0, left: RAIL_X, width: 0, height: 0,
              transformStyle: 'preserve-3d', transform: `translateZ(${RAIL_Z}px)`,
              filter: `brightness(${dim.toFixed(2)})`,
            }}
          >
            <GuideRail dir={1} vh={vh} />
            <RailClips offset={travelY} dir={1} vh={vh} />
            <RollerShoe top={vh * 0.28} dir={1} />
            <RollerShoe top={vh * 0.72} dir={1} />
          </div>

          {/* the counterweight runs in its own guides on the far side */}
          <div
            style={{
              position: 'absolute', top: 0, left: vw - CW_X, width: 0, height: 0,
              transformStyle: 'preserve-3d', transform: `translateZ(${CW_Z}px)`,
              filter: `brightness(${dim.toFixed(2)})`,
            }}
          >
            <HoistRopes bottom={cwY - 15} />
            <Counterweight y={cwY} height={cwHeight} dir={-1} />
          </div>
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
function CageDeck({ y, vw, kind }) {
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
        ...surface(isRoof ? SURFACES.cageRoof : SURFACES.cageFloor),
        boxShadow: isRoof
          ? 'inset 0 0 80px rgba(0,0,0,0.8)'
          : 'inset 0 0 80px rgba(0,0,0,0.55)',
      }}
    >
      {/* cross members: evenly spaced in depth, so on screen they bunch up toward
          the far end. Nothing else in the scene shows recession this plainly. */}
      {ribs.map((r) => (
        <div
          key={r}
          style={{
            position: 'absolute', left: 0, right: 0, top: `${r * 100}%`, height: 9,
            ...ironFace(40, isRoof ? 0.92 : 1.35),
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        />
      ))}
      {!isRoof && (
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
      )}
    </div>
  );
}

// A corner post. Two faces: the one pointing at the camera and the inboard side,
// which is the one that actually varies as the post moves along the depth.
function CagePost({ z, x, top, height, dir }) {
  const W = 15;
  const D = 20;
  return (
    <div
      style={{
        position: 'absolute', top, left: x, width: 0, height: 0,
        transformStyle: 'preserve-3d', transform: `translateZ(${z}px)`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: -W / 2, width: W, height, transform: `translateZ(${D / 2}px)`, ...ironFace(58, 1.3) }} />
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? W / 2 : -W / 2) - D / 2, width: D, height, transform: `rotateY(${dir * 90}deg)`, ...ironFace(44, 0.55) }} />
    </div>
  );
}

// The scissor gate. A lattice beats a row of uprights for the same reason the
// guide rail never worked: a vertical bar facing the viewer has no convergence
// available to it, while a diamond has its corners at four different points and
// the whole mesh compresses toward the far end. Painted into a plane that runs
// along the depth, that compression is the projection's own doing — nothing here
// is hand-tuned. It also stops the cage reading as a cell.
function CageGate({ x, top, height, dir }) {
  const g = SURFACES.cageGate;
  const mesh = (deg, colour, t) =>
    `repeating-linear-gradient(${deg}deg, ${colour} 0 ${t}px, rgba(0,0,0,0) ${t}px ${g.pitch}px)`;
  return (
    <div
      style={{
        position: 'absolute', top, height,
        left: dir > 0 ? x : x - CAGE_DEPTH,
        width: CAGE_DEPTH,
        transformOrigin: dir > 0 ? '0% 50%' : '100% 50%',
        transform: `translateZ(${CAGE_NEAR}px) rotateY(${dir * 90}deg)`,
        backgroundImage: [
          // the gate runs away from us, so the end nearest the eye is the end
          // furthest from the lamp — without this it is the brightest thing in
          // the frame and the shaft disappears behind it
          `linear-gradient(90deg, rgba(6,4,2,${dir > 0 ? g.near : g.far}), rgba(6,4,2,${dir > 0 ? g.far : g.near}))`,
          mesh(58, g.bar, g.thickness),
          mesh(-58, g.bar, g.thickness),
          // a darker pass offset behind, so the flats have some body
          mesh(58, g.barDark, g.thickness + 3),
          mesh(-58, g.barDark, g.thickness + 3),
        ].join(', '),
        backgroundPosition: '0 0, 0 0, 0 0, 2px 2px, 2px 2px',
      }}
    />
  );
}

// A hand rail running the length of the cage. Built the same way as a shaft wall:
// a plane hinged at the near end and swung 90°, so its CSS width is depth.
function CageRail({ x, y, dir, h = 13 }) {
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
          ...ironFace(48, 0.9),
        }}
      />
      {/* the rail sits below eye level, so the face we look at is its top */}
      <div
        style={{
          position: 'absolute', top: y, left: x - D / 2, width: D, height: CAGE_DEPTH,
          transformOrigin: '50% 0%',
          transform: `translateZ(${CAGE_FAR}px) rotateX(90deg)`,
          ...ironFace(38, 1.5),
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
function CageFront({ vw, vh }) {
  const floorY = vh * CAGE_FLOOR_Y;
  const postH = floorY - CAGE_ROOF_Y;
  const inset = cageInset(vw);
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
          <CageDeck kind="roof" y={CAGE_ROOF_Y} vw={vw} />
          <CageDeck kind="floor" y={floorY} vw={vw} />
          {POST_Z.map((z) => (
            <CagePost key={`l${z}`} z={z} x={inset} top={CAGE_ROOF_Y} height={postH} dir={1} />
          ))}
          {POST_Z.map((z) => (
            <CagePost key={`r${z}`} z={z} x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1} />
          ))}
          <CageGate x={inset} top={CAGE_ROOF_Y} height={postH} dir={1} />
          <CageGate x={vw - inset} top={CAGE_ROOF_Y} height={postH} dir={-1} />
          <CageRail x={inset} y={floorY - 300} dir={1} />
          <CageRail x={vw - inset} y={floorY - 300} dir={-1} />
        </div>
      </div>
    </div>
  );
}

// Two sources, each switchable on its own so they can be judged apart.
const LIGHTS = { cage: true, landing: true };
// How a departing deck leaves the opening: 'clip' streams it on behind the
// closing leaves, 'fade' dims it out where it stands.
const CONTENT_EXIT = 'clip';

// The cage lamp is bolted to the cage, and the cage does not move relative to the
// camera — so its falloff is static in screen space and costs one gradient rather
// than a per-object calculation. It is also what finally gives the guide rail a
// vertical gradient: the rail can't converge, so brightness varying along its
// length is the only volume it will ever get.
//
// The landing light spills out of the doorway and therefore only exists while
// the doors are open, which makes arrival read as arrival.
function Lighting({ ap, closure }) {
  const spill = 1 - closure;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
      {LIGHTS.cage && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 94% 86% at 50% ${(CAM_ORIGIN_Y * 100).toFixed(0)}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 62%, rgba(6,4,2,0.8) 100%)`,
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
        <filter id="shaftBlur" x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation={`0 ${amount.toFixed(2)}`} />
        </filter>
        <filter id="deckBlur" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation={`0 ${contentAmount.toFixed(2)}`} />
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
            padding: '2px 8px', borderRadius: 2, minWidth: 34, textAlign: 'center',
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

// Light strips bolted into the shaft between decks. They sweep across the
// content as you pass them, which is what makes the ride feel like it happens
// in a space rather than to a layer.
function PassingLights({ pos, vh, step, gap }) {
  return DECKS.slice(0, -1).map((_, f) => {
    // centre of the dead shaft between deck f and deck f+1, in screen space —
    // at rest this sits a full half-gap outside the viewport on either side
    const y = (pos - f) * step - gap / 2;
    if (y < -140 || y > vh + 140) return null;
    return (
      <div
        key={f}
        style={{
          position: 'absolute', left: 0, right: 0, top: y, height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(255,190,110,0.85), transparent)',
          boxShadow: '0 0 40px 14px rgba(255,170,70,0.28)',
          mixBlendMode: 'screen',
          zIndex: 4, pointerEvents: 'none',
        }}
      />
    );
  });
}

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
                {d.no}
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
  const { pos, deck, moving, velocity, go, scrub, setScrub, ridePhase } = useLift();
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
  const blurAmount = Math.min(16, speed * 5.5);
  // between two decks the shaft is unlit, so the content genuinely goes dark
  // mid-ride instead of sliding past in full view
  const frac = pos - Math.floor(pos);
  const darkness = moving ? Math.sin(frac * Math.PI) * 0.32 : 0;
  // the decks get a touch of the same vertical smear — razor-sharp text flying
  // past at speed is the giveaway that nothing is really moving
  const contentSmear = Math.min(3.2, speed * 1.1);
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
      <BigGear style={{ top: -60 + pos * vh * 0.06, left: -90 }} size={260} speed={50} />
      <BigGear style={{ bottom: -100 - pos * vh * 0.04, right: -110 }} size={320} speed={65} reverse />

      <Shaft
        vw={winW} vh={vh} pos={pos}
        floorPx={floorPxWall} backFloorPx={step}
        blur={blurAmount}
      />

      <div style={{ pointerEvents: 'auto' }}>
        <DebugScrub t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} />
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
          {DECKS.map((d, i) => {
            if (Math.abs(i - pos) > 1.2) return null;
            const Body = DECK_BODIES[i];
            return (
              <div
                key={d.id}
                style={{
                  position: 'absolute', left: 0, right: 0, top: -i * contentStep, height: ap.height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '1.4rem 1.8rem',
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
        closure={closure} shake={shake} blur={blurAmount}
      />

      <PassingLights pos={pos} vh={vh} step={step} gap={gap} />

      {/* the shaft is unlit between decks */}
      <div style={{ position: 'absolute', inset: 0, background: '#0b0705', opacity: darkness.toFixed(3), pointerEvents: 'none', zIndex: 3 }} />

      {/* the cage rides with us, not with the shaft, and draws in front of the
          content because it is nearer than the landing the content sits on */}
      <CageFront vw={winW} vh={vh} />

      <Lighting ap={ap} closure={closure} />

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
