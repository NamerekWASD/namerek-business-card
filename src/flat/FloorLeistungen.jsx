import { SKILL_GROUPS } from '../decks/content.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import Dial, { DialDefs } from './Dial.jsx';

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

/**
 * NBC-64: how far each tech tag hangs off true, in degrees.
 *
 * The technologies used to be a row of words separated by nothing but a gap,
 * which is why they read as one run-on line. Each is its own small plate now,
 * and a plate screwed to a board by one person over several years is not
 * plumb. The angles are written down rather than generated: a random tilt
 * changes on every reload and reads as a glitch, and a computed one (index
 * parity, a hash of the name) puts the same tilt on the same column every
 * time. Hand-edited, like `SCREEN_SIDE` and `CONTENT_RISE` in `lift/decks.js`
 * — read across the whole board in order, not per group, so no two plates
 * beside each other lean the same way.
 *
 * Small: past about 3° a tag stops reading as hung slightly off and starts
 * reading as a design that wanted to be jaunty.
 * @type {number[]}
 */
const TILT = [-2.4, 1.6, -0.9, 2.2, -1.7, 0.8, 2.6, -2, 1.1, -1.4, 1.9, -2.6];

function FloorLeistungen() {
  // One running index across the whole board, so the tilts do not restart at
  // every group and line up in columns.
  let tag = 0;

  return (
    <Floor meta={FLOORS[1]}>
      <p className="label">1. Untergeschoss</p>
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
                  {group.tech.split('·').map((tech) => {
                    const tilt = TILT[tag++ % TILT.length];
                    return (
                      <li className="tech" key={tech} style={{ '--tilt': `${tilt}deg` }}>
                        {tech.trim().toUpperCase()}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <p className="stencil stencil--sm" style={{ marginTop: 12 }}>
        Anzeigen dienen der Beschriftung — keine Bewertung, keine Prozentwerte.
      </p>
      {/* Last, and not first: the arrival lights this floor's parts in the
          order they are stacked (NBC-63), and an invisible one at the head of
          the queue would take a step of the cascade with it. */}
      <DialDefs />
    </Floor>
  );
}

export default FloorLeistungen;
