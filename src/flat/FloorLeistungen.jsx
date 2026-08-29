import { SKILL_GROUPS } from '../decks/content.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import Dial from './Dial.jsx';

// The instrument board — where the workbench stands in the scene.
//
// The needle positions and the units are *presentation*, not content, so they
// live here and not in `decks/content.js`: they say nothing about the skill and
// changing one changes nothing a reader learns. Indexed against `SKILL_GROUPS`
// in its own order; a group added there and not here simply gets the last
// instrument's face, which is the failure worth having.
const INSTRUMENTS = [
  { needle: 0.72, unit: 'BAR' },
  { needle: 0.54, unit: 'KPA' },
  { needle: 0.66, unit: 'R/S' },
  { needle: 0.44, unit: 'IDX' },
];

const FALLBACK = { needle: 0.5, unit: '—' };

function FloorLeistungen() {
  return (
    <Floor meta={FLOORS[1]}>
      <p className="label">1. Obergeschoss</p>
      <h2 style={{ fontSize: 'clamp(26px, 4.6vw, 54px)', marginTop: 8 }}>Leistungen</h2>
      <div className="panel" style={{ marginTop: 'clamp(14px, 2.4vh, 28px)' }}>
        <div className="panel-body instrument-board">
          {SKILL_GROUPS.map((group, i) => {
            const face = INSTRUMENTS[i] ?? FALLBACK;
            return (
              <div className="instrument" key={group.label}>
                <Dial needle={face.needle} unit={face.unit} />
                <h3 style={{ margin: 0 }}>
                  <span className="enamel">{group.label.toUpperCase()}</span>
                </h3>
                <ul className="tech-list">
                  {group.tech.split('·').map((tech) => (
                    <li className="stencil stencil--brass" key={tech}>{tech.trim().toUpperCase()}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <p className="stencil stencil--sm" style={{ marginTop: 12 }}>
        Anzeigen dienen der Beschriftung — keine Bewertung, keine Prozentwerte.
      </p>
    </Floor>
  );
}

export default FloorLeistungen;
