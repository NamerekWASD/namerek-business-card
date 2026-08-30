import { useEffect, useMemo, useState } from 'react';
import { PERSON } from '../decks/content.js';
import { webglAvailable } from '../scene/renderers/flag.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';

// The despatch desk — the only floor with a job beyond being read. Every
// address is a real, copyable link: a recruiter copying an email out of a
// picture is a recruiter who moves on. There is no contact form, because there
// is no backend, and a form that silently does nothing is worse than none.
function FloorKontakt() {
  const [copied, setCopied] = useState(false);
  // This floor is the natural home for the link back to the scene — NAM-54 —
  // but only when the machine reading it could in fact have run the scene.
  // The flat card is also reached by a capable visitor who typed `?flat`
  // themselves, so this is a fresh probe, not an inherited "why am I here".
  const canRunScene = useMemo(() => webglAvailable(), []);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Floor meta={FLOORS[3]}>
      <p className="label">3. Untergeschoss</p>
      <h2 style={{ fontSize: 'clamp(26px, 4.6vw, 54px)', marginTop: 8 }}>Kontakt</h2>

      <div className="panel" style={{ marginTop: 'clamp(12px, 2vh, 24px)' }}>
        <div className="panel-body">
          <div className="form-head">
            <div>
              <p className="stencil">Werks-Depeschenformular</p>
              <p className="label" style={{ marginTop: 6 }}>Formblatt 3-B · Abteilung Versand</p>
            </div>
            <span className="stamp">Angenommen</span>
          </div>

          <div className="tape" aria-hidden="true" />

          <div className="field">
            <span className="label">Fernschreiben</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a className="field-value" href={`mailto:${PERSON.email}`}>{PERSON.email}</a>
              <button type="button" className="copy-btn" onClick={copy}>Adresse kopieren</button>
              <span aria-live="polite">
                {copied && <span className="copied">Gestempelt · Kopiert</span>}
              </span>
            </span>
          </div>

          <div className="field">
            <span className="label">Verzeichnis</span>
            <a className="field-value" href={PERSON.linkedin} target="_blank" rel="noreferrer noopener">
              {PERSON.linkedin}
            </a>
          </div>

          <div className="field">
            <span className="label">Werkstatt</span>
            <a className="field-value" href={PERSON.github} target="_blank" rel="noreferrer noopener">
              {PERSON.github}
            </a>
          </div>

          <div className="tape" aria-hidden="true" />

          <span className="enamel enamel--red enamel--lg">
            {`${PERSON.city} · ${PERSON.availability}`.toUpperCase()}
          </span>

          {canRunScene && (
            <p style={{ marginTop: 18 }}>
              <a className="field-value" href="?scene">Zur 3D-Ansicht wechseln ↗</a>
            </p>
          )}
        </div>
      </div>
    </Floor>
  );
}

export default FloorKontakt;
