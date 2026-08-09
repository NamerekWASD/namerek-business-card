import { motion } from 'framer-motion';
import Grain from './shared/Grain';
import useScrollY from './shared/useScrollY';

const vars = {
  '--bg': '#0a3660',
  '--bg-2': '#0f4c80',
  '--ink': '#eaf4ff',
  '--muted': '#89b3d4',
  '--line': 'rgba(234,244,255,0.16)',
  '--line-soft': 'rgba(234,244,255,0.07)',
  '--accent': '#5fd4ff',
  '--marker': '#ff7a4d',
  '--display': "'Space Grotesk', sans-serif",
};

const snap = [0.16, 1, 0.3, 1];

function GridLayer({ scrollY }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: '-10% -10%',
        transform: `translateY(${scrollY * 0.12}px)`,
        backgroundImage:
          'repeating-linear-gradient(0deg, var(--line-soft) 0, var(--line-soft) 1px, transparent 1px, transparent 22px),' +
          'repeating-linear-gradient(90deg, var(--line-soft) 0, var(--line-soft) 1px, transparent 1px, transparent 22px),' +
          'repeating-linear-gradient(0deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 110px),' +
          'repeating-linear-gradient(90deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 110px)',
      }}
    />
  );
}

function CompassLogo() {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none" style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }}>
      <motion.circle
        cx="38" cy="38" r="32"
        stroke="var(--accent)" strokeWidth="1.2"
        pathLength="1" strokeDasharray="1 1"
        initial={{ strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.9, ease: snap }}
      />
      <motion.line
        x1="38" y1="4" x2="38" y2="72" stroke="var(--line)" strokeWidth="1"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ transformOrigin: '38px 38px' }}
      />
      <motion.line
        x1="4" y1="38" x2="72" y2="38" stroke="var(--line)" strokeWidth="1"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{ transformOrigin: '38px 38px' }}
      />
      <motion.circle
        cx="38" cy="38" r="3.5" fill="var(--marker)"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      />
    </svg>
  );
}

function DimensionLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0.6rem 0 1.1rem' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: -4, width: 1, height: 9, background: 'var(--line)' }} />
        <span style={{ position: 'absolute', right: 0, top: -4, width: 1, height: 9, background: 'var(--line)' }} />
      </div>
      <span style={{ fontFamily: 'var(--display)', fontSize: 10, letterSpacing: 1, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        MASSSTAB 1:1
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: 0, top: -4, width: 1, height: 9, background: 'var(--line)' }} />
        <span style={{ position: 'absolute', right: 0, top: -4, width: 1, height: 9, background: 'var(--line)' }} />
      </div>
    </div>
  );
}

const details = [
  { tag: 'A', value: '6', label: 'Entwickler geführt' },
  { tag: 'B', value: '40%', label: 'Performance' },
  { tag: 'C', value: '20%', label: 'Tempo' },
  { tag: 'D', value: '3', label: 'Releases' },
];

function DetailCircle({ d, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, delay, ease: snap }}
      style={{ textAlign: 'center' }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          margin: '0 auto 10px',
          borderRadius: '50%',
          border: '1px solid var(--line)',
          background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(0,0,0,0.15))',
          boxShadow: '0 6px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--marker)',
            color: '#2a0f04',
            fontSize: 11,
            fontFamily: 'var(--display)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {d.tag}
        </span>
        <span style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>
          {d.value}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.3 }}>{d.label}</div>
    </motion.div>
  );
}

const parts = [
  { pos: '01', name: 'Backend', spec: 'ASP.NET Core, EF Core' },
  { pos: '02', name: 'Frontend', spec: 'React, TypeScript' },
  { pos: '03', name: 'Daten', spec: 'MSSQL, MongoDB' },
  { pos: '04', name: 'Architektur', spec: 'N-Tier, DDD, REST' },
];

export default function Blueprint() {
  const scrollY = useScrollY();

  return (
    <div style={{ ...vars, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <Grain opacity={0.045} />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 20%, var(--bg-2) 0%, var(--bg) 70%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.35), transparent 60%)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <GridLayer scrollY={scrollY} />
      </div>

      <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '0 1.5rem' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.6rem 0', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)' }}>
            PROJEKT MT-01
          </span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Start', 'Leistungen', 'Projekte', 'Kontakt'].map((l, i) => (
              <span
                key={l}
                title={i > 0 ? 'bald verfügbar' : undefined}
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: i === 0 ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </nav>

        <section style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 0' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: snap }}>
            <CompassLogo />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: snap }}
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 700,
              fontSize: 'clamp(2.4rem, 7vw, 3.8rem)',
              lineHeight: 1.05,
              margin: '1.2rem 0 0',
            }}
          >
            Mykolai Tymchenko
          </motion.h1>

          <DimensionLine />

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 1, color: 'var(--marker)', margin: 0, textTransform: 'uppercase' }}
          >
            .NET / C# — Backend &amp; Fullstack
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 440, margin: '1rem 0 0' }}
          >
            Baue Systeme, die tragen — von der Datenbank bis zur Oberfläche.
            Offen für neue Aufgaben im Ruhrgebiet / NRW.
          </motion.p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.4rem', padding: '2rem 0' }}>
          {details.map((d, i) => (
            <DetailCircle key={d.tag} d={d} delay={i * 0.08} />
          ))}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          style={{ padding: '1rem 0 2.5rem' }}
        >
          <div style={{ fontFamily: 'var(--display)', fontSize: 11, letterSpacing: 1.5, color: 'var(--muted)', marginBottom: 10 }}>
            STÜCKLISTE
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.3)' }}>
            {parts.map((p, i) => (
              <div
                key={p.pos}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '0.8rem 1rem',
                  background: i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderTop: i > 0 ? '1px solid var(--line-soft)' : 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--display)', fontSize: 11, color: 'var(--muted)', width: 20 }}>{p.pos}</span>
                <span
                  style={{
                    width: 10, height: 10, borderRadius: 2, background: 'var(--accent)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(0,0,0,0.25)',
                  }}
                />
                <span style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 700, minWidth: 100 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.spec}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          style={{ padding: '0 0 3rem' }}
        >
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 2,
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
            }}
          >
            {[
              ['GEZEICHNET', 'M. Tymchenko'],
              ['MASSSTAB', '1 : 1'],
              ['DATUM', '2026'],
              ['BLATT', '1 / 1'],
            ].map(([k, v], i) => (
              <div key={k} style={{ padding: '0.8rem 1rem', borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>{k}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 13, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginTop: '1.8rem', flexWrap: 'wrap' }}>
            <a
              href="mailto:nykolai.tymchenko@gmail.com"
              style={{ fontFamily: 'var(--display)', fontSize: 12, border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.7rem 1.2rem', textDecoration: 'none' }}
            >
              nykolai.tymchenko@gmail.com
            </a>
            <a
              href="https://linkedin.com/in/mykolai-tymchenko"
              target="_blank" rel="noreferrer"
              style={{ fontFamily: 'var(--display)', fontSize: 12, border: '1px solid var(--line)', color: 'var(--muted)', padding: '0.7rem 1.2rem', textDecoration: 'none' }}
            >
              LinkedIn
            </a>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
