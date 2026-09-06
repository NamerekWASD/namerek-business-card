import { PERSON } from '../decks/content.js';
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
          <div className="hairline" style={{ margin: '22px 0 18px' }} />
          <span className="enamel enamel--lg">{pick(PERSON.availability).toUpperCase()}</span>
        </div>
      </div>
      <Chevrons />
    </Floor>
  );
}

export default FloorStart;
