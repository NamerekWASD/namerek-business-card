import { BRIEF, LOG, PERSON } from '../decks/content.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import Chevrons from './Chevrons.jsx';
import { usePick, useT } from '../i18n/LocaleContext.jsx';

// The entrance plaque. This is the whole card for anyone who reads no further,
// so the name is the largest thing on the page and the availability is signed
// the way a building signs its status — on enamel, not in a sentence.
//
// The pass photo is drawn only when there is one. `PERSON.portrait` is `null`
// today and an absent portrait is a layout this handles, not a broken image it
// shows.
function FloorStart() {
  const pick = usePick();
  const t = useT();
  return (
    <Floor meta={FLOORS[0]}>
      <div className="panel">
        <div className="panel-body">
          <p className="label">{t('floorStart.label')}</p>
          <div className="eg-grid" style={{ marginTop: 18 }}>
            <div>
              <h1 className="eg-name">
                {PERSON.given}
                <br />
                {PERSON.family}
              </h1>
              <p className="eg-role">{pick(PERSON.role)}</p>
              <div className="eg-intro">
                {pick(PERSON.intro).map((line) => <p key={line}>{line}</p>)}
              </div>
            </div>
            {PERSON.portrait && (
              <div>
                <div className="pass">
                  <img src={PERSON.portrait} alt={`Werksausweis-Foto von ${PERSON.given} ${PERSON.family}`} />
                </div>
                <p className="stencil stencil--sm" style={{ marginTop: 8 }}>Werksausweis No. 0001</p>
              </div>
            )}
          </div>
          <div className="eg-facts">
            <section className="eg-plate">
              <p className="stencil stencil--sm">Typenschild</p>
              <dl className="eg-rows">
                {BRIEF.map((row) => (
                  <div key={row.label.en}>
                    <dt>{pick(row.label)}</dt>
                    <dd>{pick(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="eg-log">
              <p className="stencil stencil--sm">Betriebsbuch</p>
              <ol className="eg-rows">
                {LOG.map((entry) => (
                  <li key={entry.year}>
                    <span className="eg-year">{entry.year}</span>
                    <span>{pick(entry.text)}</span>
                  </li>
                ))}
              </ol>
            </section>
            {/* Under the log, beside the plate: the log is the shorter of the
                two, so the sign takes room the floor already had. */}
            <span className="enamel enamel--lg eg-status">{pick(PERSON.availability).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <Chevrons />
    </Floor>
  );
}

export default FloorStart;
