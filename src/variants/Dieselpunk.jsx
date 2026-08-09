import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Grain from './shared/Grain';
import useScrollY from './shared/useScrollY';
import rustBrass from '../assets/textures/rust-brass.jpg';

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

function Platform() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: snap, delay: 2.2 }}
      style={{ position: 'relative', marginTop: '2.4rem', height: 76 }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 26,
          backgroundImage: `linear-gradient(180deg, #8a683d, #4a3520), url(${rustBrass})`,
          backgroundSize: 'auto, 180px 180px',
          backgroundBlendMode: 'multiply',
          clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: 24, left: 0, right: 0, height: 6,
          backgroundImage: 'repeating-linear-gradient(45deg, #d9a531 0px, #d9a531 10px, #241a10 10px, #241a10 20px)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.6)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: 30, left: 0, right: 0, bottom: 0, borderRadius: '0 0 3px 3px', overflow: 'hidden',
          backgroundImage: `linear-gradient(180deg, #2e2013, #1c130b), url(${rustBrass})`,
          backgroundSize: 'auto, 220px 220px',
          backgroundBlendMode: 'multiply',
          boxShadow: '0 30px 44px -8px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <Rivets />
      </div>
    </motion.div>
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

const DOOR_HOLD_END = 1000;
const DOOR_SHAKE_END = 1350;
const DOOR_TOTAL_MS = 2800;
const DOOR_FADE_START = 2300;

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
    mag = Math.sin(local / 26) * 3.5 * decay;
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
  const peak = DOOR_SHAKE_END + 130;
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
        position: 'fixed',
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
        position: 'fixed',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 3 + intensity * 5,
        marginLeft: -(3 + intensity * 5) / 2,
        background: 'var(--glow)',
        opacity: intensity * 0.9,
        boxShadow: `0 0 ${20 * intensity}px ${8 * intensity}px rgba(255,180,84,${0.5 * intensity})`,
        zIndex: 6,
      }}
    />
  );
}

function DebugScrub({ t, setT, playing, play }) {
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

function PressIntro() {
  const { t, setT, playing, play } = useScrub(DOOR_TOTAL_MS);

  return (
    <>
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
      <div style={{ pointerEvents: 'auto' }}>
        <DebugScrub t={t} setT={setT} playing={playing} play={play} />
      </div>
    </>
  );
}

function Plate({ children, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, ease: snap, delay }}
      style={{
        position: 'relative',
        background: 'linear-gradient(160deg, #342515, #241a10)',
        border: '1px solid var(--line)',
        borderRadius: 4,
        boxShadow: '0 10px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      <Rivets />
      {children}
    </motion.div>
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

export default function Dieselpunk() {
  const scrollY = useScrollY();

  return (
    <div style={{ ...vars, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <PressIntro />
      <Grain opacity={0.06} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, var(--bg-2) 0%, var(--bg) 65%)' }} />
      <BigGear style={{ top: -60 - scrollY * 0.08, left: -90 }} size={260} speed={50} />
      <BigGear style={{ bottom: -100 + scrollY * 0.05, right: -110 }} size={320} speed={65} reverse />

      <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '0 1.5rem' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.6rem 0', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--muted)' }}>No. 001 / MT</span>
          <div style={{ display: 'flex', gap: '1.4rem' }}>
            {['Start', 'Leistungen', 'Projekte', 'Kontakt'].map((l, i) => (
              <span
                key={l}
                title={i > 0 ? 'bald verfügbar' : undefined}
                style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: i === 0 ? 'var(--glow)' : 'var(--muted)' }}
              >
                {l}
              </span>
            ))}
          </div>
        </nav>

        <section style={{ position: 'relative', minHeight: '78vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.4rem', padding: '2rem 0' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: snap, delay: 1.6 }}>
            <GaugeLogo />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: snap, delay: 1.75 }}
            style={{
              fontFamily: 'var(--serif)', fontWeight: 700,
              fontSize: 'clamp(2.4rem, 7vw, 4rem)', lineHeight: 1.05, margin: 0,
              textShadow: '0 2px 0 rgba(0,0,0,0.5)',
            }}
          >
            Mykolai
            <br />
            Tymchenko
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: snap, delay: 1.9 }}
            style={{
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
              color: 'var(--glow)', margin: 0, textShadow: '0 0 10px rgba(255,180,84,0.5)',
            }}
          >
            .NET / C# — Backend &amp; Fullstack
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: snap, delay: 2.05 }}
            style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 440, margin: 0 }}
          >
            Baue Systeme, die tragen — von der Datenbank bis zur Oberfläche.
            Offen für neue Aufgaben im Ruhrgebiet / NRW.
          </motion.p>

          <Platform />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', padding: '2rem 0' }}>
          {stats.map((s, i) => (
            <Plate key={s.label} delay={i * 0.07} style={{ padding: '1rem 0.9rem' }}>
              <ScreenValue value={s.value} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                {s.label}
              </div>
            </Plate>
          ))}
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingBottom: '2.5rem' }}>
          {skills.map((g, i) => (
            <Plate key={g.label} delay={i * 0.07} style={{ padding: '1rem 1.1rem' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--brass)' }}>
                {g.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--glow)', marginTop: 8,
                  textShadow: '0 0 6px rgba(255,180,84,0.4)',
                }}
              >
                {g.tech}
              </div>
            </Plate>
          ))}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: snap }}
          style={{ borderTop: '1px solid var(--line)', padding: '2.6rem 0 3rem', textAlign: 'center' }}
        >
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', margin: 0 }}>Lust auf ein Gespräch?</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
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
            DUISBURG — VERFÜGBAR AB SOFORT
          </p>
        </motion.section>
      </div>
    </div>
  );
}
