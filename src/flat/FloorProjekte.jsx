import { useState } from 'react';
import { PROJECT_STATS } from '../decks/content.js';
import { SLIDES } from '../decks/projects.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import Viewer from './Viewer.jsx';

// The archive, on a picture tube. It pages the same flat run of shots the
// console in the scene pages — `SLIDES`, not `PROJECTS` — for the same reason:
// one project is often several pictures, and a counter that sits on the same
// number through three presses of NEXT is a counter that looks stuck.
//
// What keeps three pictures of one job from reading as three different jobs is
// the project's name on its own plate, standing still while the pictures change
// under it.
function FloorProjekte() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const slide = SLIDES[index];
  const step = (delta) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta)));

  return (
    <Floor meta={FLOORS[2]}>
      <p className="label">2. Obergeschoss</p>
      <h2 style={{ fontSize: 'clamp(26px, 4.6vw, 54px)', marginTop: 8 }}>Projekte</h2>

      <div className="panel" style={{ marginTop: 'clamp(12px, 2vh, 24px)' }}>
        <div className="panel-body crt-grid">
          <div>
            <button
              type="button"
              className="crt"
              onClick={() => setOpen(true)}
              disabled={!slide}
              aria-label={slide ? `${slide.title} in Vollbild ansehen` : 'Archiv leer'}
            >
              {slide && (
                <img src={slide.src} alt={`Bildschirmfoto: ${slide.title}`} loading="lazy" />
              )}
              <span className="crt-scan" />
              <span className="crt-roll" />
              <span className="crt-glass" />
            </button>
            <div className="console">
              <button
                type="button"
                className="lamp-btn"
                onClick={() => step(-1)}
                disabled={index === 0}
                aria-label="Vorherige Aufnahme"
              >
                ‹ Prev
              </button>
              <span className="counter" aria-live="polite">
                {String(Math.min(index + 1, SLIDES.length)).padStart(2, '0')}
                {' / '}
                {String(SLIDES.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                className="lamp-btn"
                onClick={() => step(1)}
                disabled={index >= SLIDES.length - 1}
                aria-label="Nächste Aufnahme"
              >
                Next ›
              </button>
            </div>
          </div>

          <div>
            <span className="enamel">{slide ? slide.title : 'Kein Bestand'}</span>
            {slide?.caption && (
              <h3 style={{ fontSize: 'clamp(18px, 2.4vw, 30px)', marginTop: 12 }}>{slide.caption}</h3>
            )}
            {slide && (
              <p className="stencil" style={{ marginTop: 8 }}>
                {`Aufnahme ${slide.shot} von ${slide.shots}`}
              </p>
            )}
            {slide?.url && (
              <p style={{ marginTop: 14 }}>
                <a className="field-value" href={slide.url} target="_blank" rel="noreferrer noopener">
                  Quelltext ansehen
                </a>
              </p>
            )}
            <div className="stat-row">
              {PROJECT_STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="stat-val">{stat.value}</p>
                  <p className="stencil stencil--sm">{stat.label.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {open && slide && (
        <Viewer
          slide={slide}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onClose={() => setOpen(false)}
        />
      )}
    </Floor>
  );
}

export default FloorProjekte;
