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

  return { deck, pos, velocity, go, moving: !!ride, scrub, setScrub };
}

// The deck plate we are standing on. It belongs to the cage, not to any floor,
// so it never rides with the shaft — which makes it the one fixed thing at the
// bottom of the frame while everything behind it streams past. The taper runs
// narrow at the far edge and full width at the near one, so its silhouette
// meets the hazard stripe and front face without a step.
function CabinFloor() {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 30,
          backgroundImage: `linear-gradient(180deg, #8a683d, #4a3520), url(${rustBrass})`,
          backgroundSize: 'auto, 180px 180px',
          backgroundBlendMode: 'multiply',
          clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: 28, left: 0, right: 0, height: 7,
          backgroundImage: 'repeating-linear-gradient(45deg, #d9a531 0px, #d9a531 10px, #241a10 10px, #241a10 20px)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.6)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: 35, left: 0, right: 0, bottom: 0, overflow: 'hidden',
          backgroundImage: `linear-gradient(180deg, #2e2013, #150e08), url(${rustBrass})`,
          backgroundSize: 'auto, 220px 220px',
          backgroundBlendMode: 'multiply',
          boxShadow: '0 -22px 34px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', top: 10, left: `${(i + 0.5) * 2.5}%`, width: 6, height: 6, borderRadius: '50%',
              background: 'var(--rivet)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

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

function EmbossedMT() {
  return (
    <span
      style={{
        fontFamily: 'var(--serif)',
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 1,
        color: 'var(--brass)',
        textShadow: '1px 1px 1px rgba(0,0,0,0.65), -1px -1px 1px rgba(255,255,255,0.08)',
      }}
    >
      MT
    </span>
  );
}

function GaugeGlyph() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="15" stroke="var(--brass)" strokeWidth="1.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1="18" y1="4" x2="18" y2="7"
          stroke="var(--brass)" strokeWidth="1"
          transform={`rotate(${a} 18 18)`}
        />
      ))}
      <motion.line
        x1="18" y1="18" x2="18" y2="8"
        stroke="var(--glow)" strokeWidth="1.4"
        style={{ transformOrigin: '18px 18px', filter: 'drop-shadow(0 0 3px rgba(255,180,84,0.8))' }}
        initial={{ rotate: -140 }}
        animate={{ rotate: 40 }}
        transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

const DOOR_HOLD_END = 500;
const DOOR_SHAKE_END = 750;
const DOOR_FADE_START = 1600;
const DOOR_TOTAL_MS = 2000;

function sharpKick(p) {
  return Math.pow(p, 0.4);
}

function computeDoor(t, isLeft) {
  const sign = isLeft ? -1 : 1;
  let mag = 0;
  if (t < DOOR_HOLD_END) {
    mag = 0;
  } else if (t < DOOR_SHAKE_END) {
    const local = t - DOOR_HOLD_END;
    const span = DOOR_SHAKE_END - DOOR_HOLD_END;
    const decay = 1 - local / span;
    mag = Math.sin(local / 26) * 1.7 * decay;
  } else {
    const p = Math.min(1, (t - DOOR_SHAKE_END) / (DOOR_TOTAL_MS - DOOR_SHAKE_END));
    mag = sharpKick(p) * 112;
  }
  let opacity = 1;
  if (t > DOOR_FADE_START) {
    opacity = 1 - Math.min(1, (t - DOOR_FADE_START) / (DOOR_TOTAL_MS - DOOR_FADE_START));
  }
  return { x: sign * mag, opacity };
}

function computeSeamLight(t) {
  const start = DOOR_SHAKE_END;
  const peak = DOOR_SHAKE_END + 20;
  const end = DOOR_SHAKE_END + 420;
  if (t < start || t > end) return 0;
  if (t < peak) return (t - start) / (peak - start);
  return 1 - (t - peak) / (end - peak);
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

function DoorPlate({ side, t, children }) {
  const isLeft = side === 'left';
  const inner = isLeft ? 'right' : 'left';
  const { x, opacity } = computeDoor(t, isLeft);
  return (
    <div
      style={{
        // absolute, not fixed: a fixed element escapes its wrapper's
        // overflow:hidden, and the doors' 112% travel then pushes the document
        // sideways and drags the whole shaft off-centre
        position: 'absolute',
        top: 0,
        bottom: 0,
        [isLeft ? 'left' : 'right']: -50,
        width: '55vw',
        transform: `translateX(${x}%)`,
        opacity,
        overflow: 'hidden',
        [isLeft ? 'borderRight' : 'borderLeft']: '2px solid var(--brass)',
        boxShadow: isLeft
          ? 'inset -6px 0 12px rgba(0,0,0,0.4), 10px 0 24px rgba(0,0,0,0.5)'
          : 'inset 6px 0 12px rgba(0,0,0,0.4), -10px 0 24px rgba(0,0,0,0.5)',
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'radial-gradient(ellipse 30vw 40vh at ' + (isLeft ? '25% 30%' : '75% 30%') + ', rgba(130,64,20,0.35), transparent 70%),' +
            'radial-gradient(ellipse 22vw 30vh at ' + (isLeft ? '70% 75%' : '30% 75%') + ', rgba(110,55,18,0.3), transparent 70%),' +
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 13px),' +
            'repeating-linear-gradient(24deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 19px),' +
            `linear-gradient(160deg, #3a2a18, #241a10), url(${rustBrass})`,
          backgroundSize: 'auto, auto, auto, auto, auto, 340px 340px',
          backgroundBlendMode: 'normal, normal, normal, normal, multiply, normal',
        }}
      />

      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 22,
          backgroundImage: `linear-gradient(180deg, #1c130b, #100b06), url(${rustBrass})`,
          backgroundSize: 'auto, 200px 200px',
          backgroundBlendMode: 'multiply',
          boxShadow: '0 1px 0 rgba(194,144,63,0.2), 0 2px 6px rgba(0,0,0,0.6)',
        }}
      />

      <div
        style={{
          position: 'absolute', top: '44%', left: 0, right: 0, height: 18,
          backgroundImage: 'repeating-linear-gradient(45deg, #d9a531 0px, #d9a531 10px, #241a10 10px, #241a10 20px)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.6), 0 -1px 0 rgba(0,0,0,0.6)',
        }}
      />

      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%',
          backgroundImage: `linear-gradient(180deg, #4a3a28, #2c2015), url(${rustBrass})`,
          backgroundSize: 'auto, 260px 260px',
          backgroundBlendMode: 'multiply',
          boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.5)',
        }}
      />

      <div
        style={{
          position: 'absolute', top: 'calc(44% + 18px)', [inner]: 0,
          width: 32, height: 44,
          background: 'linear-gradient(180deg, #8b6432, #4a3520)',
          [isLeft ? 'borderTopLeftRadius' : 'borderTopRightRadius']: 4,
          [isLeft ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: 4,
          boxShadow: '0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ position: 'absolute', top: 6, [inner]: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--rivet)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7)' }} />
        <span style={{ position: 'absolute', bottom: 6, [inner]: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--rivet)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7)' }} />
      </div>

      <Rivets />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function SeamLight({ t }) {
  const intensity = computeSeamLight(t);
  if (intensity <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 3 + intensity * 5,
        marginLeft: -(3 + intensity * 5) / 2,
        background: 'var(--glow)',
        opacity: intensity * 0.9,
        boxShadow: `0 0 ${100 * intensity}px ${40 * intensity}px rgba(255,180,84,${0.5 * intensity})`,
        zIndex: 6,
      }}
    />
  );
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

function PressIntro({ t }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99, pointerEvents: 'none', overflow: 'hidden' }}>
      <DoorPlate side="left" t={t}>
        <EmbossedMT />
        <span style={{ width: 20, height: 1, background: 'var(--line)' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>Nr.001</span>
      </DoorPlate>
      <DoorPlate side="right" t={t}>
        <GaugeGlyph />
        <span style={{ width: 20, height: 1, background: 'var(--line)' }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>OK</span>
      </DoorPlate>
      <SeamLight t={t} />
    </div>
  );
}

const ROOM_CONVERGE_START = 1500;
const ROOM_CONVERGE_END = 2000;

function computeRoomProgress(t) {
  if (t <= ROOM_CONVERGE_START) return 0;
  const p = Math.min(1, (t - ROOM_CONVERGE_START) / (ROOM_CONVERGE_END - ROOM_CONVERGE_START));
  return 1 - Math.pow(1 - p, 3);
}

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
const CAM_ORIGIN_Y = 0.45;
// how far the shaft walls run back. Deeper means the corridor eats more of the
// screen: a wall's far edge lands at (viewportWidth / 2) * DEPTH / (P + DEPTH).
const SHAFT_DEPTH = 340;
const RAIL_Z = -150;
const RAIL_X = 52;
const CW_Z = -160;
const CW_X = 44;

// Flat, near-even steel. The old version had a strong specular band down the
// middle, which is how you fake a cylinder on a single plane — exactly the
// wrong cue now that the solids are built from real faces, because it made the
// rail read as a pipe. Volume comes from the faces differing in tone (`shade`),
// not from a highlight painted inside one of them.
const steelFace = (scale = 46, shade = 1) => ({
  backgroundImage:
    `linear-gradient(92deg, #1b1f22 0%, #6b747b 35%, #7d868d 70%, #22272a 100%), url(${brushedSteel})`,
  backgroundSize: `auto, ${scale}px ${scale}px`,
  backgroundBlendMode: 'multiply',
  filter: shade === 1 ? undefined : `brightness(${shade})`,
});

const ironFace = (scale = 70, shade = 1) => ({
  backgroundImage: `linear-gradient(180deg, #4a3b28, #241a11), url(${rustBrass})`,
  backgroundSize: `auto, ${scale}px ${scale}px`,
  backgroundBlendMode: 'multiply',
  filter: shade === 1 ? undefined : `brightness(${shade})`,
});

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

// The shaft-side landing door at each deck: what makes one stretch of shaft
// distinguishable from the next as it goes by. Drawn flat on the wall plane, so
// the camera foreshortens it for free — no hand-tuned squash.
function LandingDoor({ top, height, depth, width, no, nearEdge }) {
  return (
    <div style={{ position: 'absolute', top, height, [nearEdge]: depth, width }}>
      <div style={{ position: 'absolute', left: -4, right: -4, top: -8, height: 8, ...ironFace(60, 1.5), boxShadow: '0 2px 5px rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'absolute', left: -4, right: -4, bottom: -8, height: 8, ...ironFace(60, 1.25), boxShadow: '0 -2px 5px rgba(0,0,0,0.7)' }} />
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(180deg, #3d2e1e, #261c11), url(${rustBrass})`,
          backgroundSize: 'auto, 150px 150px',
          backgroundBlendMode: 'multiply',
          boxShadow: 'inset 0 0 14px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(150,113,63,0.5)',
        }}
      />
      <div style={{ position: 'absolute', top: 10, bottom: 26, left: '50%', width: 2, marginLeft: -1, background: 'rgba(0,0,0,0.8)', boxShadow: '1px 0 0 rgba(194,144,63,0.18)' }} />
      <div
        style={{
          position: 'absolute', left: 5, right: 5, bottom: 8, height: 9,
          backgroundImage: 'repeating-linear-gradient(45deg, #b8862a 0px, #b8862a 7px, #241a10 7px, #241a10 14px)',
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: 'absolute', top: -30, left: '50%', marginLeft: -19, width: 38, height: 19,
          background: 'var(--screen)', borderRadius: 2,
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.9), 0 0 0 1px rgba(96,73,44,0.55)',
          fontFamily: 'var(--mono)', fontSize: 11, lineHeight: '19px', textAlign: 'center',
          color: 'var(--glow)', textShadow: '0 0 6px rgba(255,180,84,0.7)',
        }}
      >
        {no}
      </div>
    </div>
  );
}

// One wall of the corridor: a plane hinged at the screen edge and swung a full
// 90° so it genuinely runs away from the viewer. Its CSS width is depth, not
// screen width — the camera decides how much of the screen it covers.
function ShaftWall({ side, vw, vh, pos, floorPx, roomP }) {
  const isLeft = side === 'left';
  const travelY = pos * floorPx;
  const overscan = vh * 0.34;
  const span = vh + overscan * 2;
  const nearFloors = DECKS.map((_, f) => f).filter((f) => Math.abs(f - pos) < 1.7);
  // local y = 0 is the top of the overscanned plane, so deck coordinates (which
  // are measured against the viewport) shift down by the overscan
  const deckTop = (f) => overscan + travelY - f * floorPx;
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
        backgroundImage:
          `linear-gradient(${isLeft ? '270deg' : '90deg'}, rgba(8,5,3,0.8), rgba(8,5,3,0) 60%),` +
          `linear-gradient(0deg, rgba(20,13,8,0.55), rgba(20,13,8,0.55)), url(${rustBrass})`,
        backgroundSize: `auto, auto, 260px 260px`,
        backgroundPosition: `0 0, 0 0, 0 ${travelY.toFixed(1)}px`,
        backgroundBlendMode: 'normal, multiply, multiply',
        // the far end of the corridor falls away into the dark
        boxShadow: `inset ${isLeft ? '-' : ''}120px 0 140px -40px rgba(0,0,0,0.9)`,
      }}
    >
      {/* everything on the wall is measured from its near (viewer-facing) edge.
          Mirroring the whole layer instead would flip the numerals with it. */}
      {nearFloors.map((f) => (
        <LandingDoor
          key={`door-${f}`}
          top={deckTop(f) + vh * 0.33}
          height={vh * 0.48}
          depth={96}
          width={150}
          no={DECKS[f].no}
          nearEdge={nearEdge}
        />
      ))}

      {nearFloors.map((f) => (
        <div
          key={`no-${f}`}
          style={{
            position: 'absolute', top: deckTop(f) + floorPx * 0.46, [nearEdge]: 108, width: 130,
            textAlign: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 54, lineHeight: 1, letterSpacing: 2,
            color: 'rgba(0,0,0,0.5)', textShadow: '0 1px 0 rgba(194,144,63,0.2)',
            transform: 'scaleY(1.3)',
          }}
        >
          {DECKS[f].no}
        </div>
      ))}

      <div style={{ position: 'absolute', top: 0, bottom: 0, [nearEdge]: 66, width: 3, background: 'var(--brass)', opacity: 0.35 }} />
      <ShaftRivets offset={travelY} depth={50} span={span} nearEdge={nearEdge} />
      <ShaftRivets offset={travelY + 23} depth={76} span={span} nearEdge={nearEdge} />
      <ShaftRivets offset={travelY + 11} depth={272} span={span} nearEdge={nearEdge} />

      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: (0.62 * (1 - roomP)).toFixed(2) }} />
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
function Shaft({ vw, vh, pos, floorPx, roomP, blur }) {
  const travelY = pos * floorPx;
  const dim = 0.35 + 0.65 * roomP;
  // the intro rides the camera forward and lets it settle back, instead of
  // animating a wall's width and hoping it reads as approach
  const sceneZ = 260 * (1 - roomP);
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
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${sceneZ.toFixed(1)}px)` }}>
          <ShaftWall side="left" vw={vw} vh={vh} pos={pos} floorPx={floorPx} roomP={roomP} />
          <ShaftWall side="right" vw={vw} vh={vh} pos={pos} floorPx={floorPx} roomP={roomP} />

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
  const { pos, deck, moving, velocity, go, scrub, setScrub } = useLift();
  const { vw: winW, vh } = useViewport();
  const roomP = computeRoomProgress(t);
  const contentScale = 0.7 + 0.3 * roomP;
  const contentBlur = 4 * (1 - roomP);

  const gap = vh * DECK_GAP;
  const step = vh + gap;
  const floorPxWall = step * WALL_PARALLAX;
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
      <PressIntro t={t} />
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

      <Shaft vw={winW} vh={vh} pos={pos} floorPx={floorPxWall} roomP={roomP} blur={blurAmount} />

      <div style={{ pointerEvents: 'auto' }}>
        <DebugScrub t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} />
      </div>

      {/* the decks: one shaft-tall column that the camera travels along */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          transform: `scale(${contentScale})`,
          transformOrigin: '50% 45%',
          filter: [
            contentBlur > 0.05 ? `blur(${contentBlur.toFixed(2)}px)` : '',
            contentSmear > 0.2 ? 'url(#deckBlur)' : '',
          ].filter(Boolean).join(' ') || 'none',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(pos * step).toFixed(1)}px)` }}>
          {DECKS.map((d, i) => {
            if (Math.abs(i - pos) > 1.4) return null;
            const Body = DECK_BODIES[i];
            return (
              <div
                key={d.id}
                style={{
                  position: 'absolute', left: 0, right: 0, top: -i * step, height: vh,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  // bottom clears the cage floor so no deck sits on top of it
                  padding: '5.5rem 1.5rem 7.5rem',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
                  <Body lag={lag} pos={pos} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PassingLights pos={pos} vh={vh} step={step} gap={gap} />

      {/* the shaft is unlit between decks */}
      <div style={{ position: 'absolute', inset: 0, background: '#0b0705', opacity: darkness.toFixed(3), pointerEvents: 'none', zIndex: 3 }} />

      {/* the cabin's own opening — decks slide away behind these edges rather
          than off a bare viewport boundary */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90, background: 'linear-gradient(180deg, rgba(8,5,3,0.92), transparent)', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'linear-gradient(0deg, rgba(8,5,3,0.95), transparent)', pointerEvents: 'none', zIndex: 3 }} />

      {/* the cage floor rides with us, not with the shaft */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none' }}>
        <CabinFloor />
      </div>

      {/* the selector rides with the cabin, not with the floor */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 6,
          transform: `scale(${contentScale})`, transformOrigin: '50% 0%',
          filter: contentBlur > 0.05 ? `blur(${contentBlur.toFixed(2)}px)` : 'none',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 1.5rem' }}>
          <FloorSelector pos={pos} deck={deck} moving={moving} go={go} />
        </div>
      </div>
    </div>
  );
}
