import { useEffect, useMemo, useState } from 'react';
import { PERSON } from '../decks/content.js';
import { DECKS } from '../lift/decks.js';
import { webglAvailable } from '../scene/renderers/flag.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import { usePick, useT } from '../i18n/LocaleContext.jsx';
import { EmailIcon, GithubIcon, LinkedinIcon } from '../ui/icons.jsx';

// The despatch desk — the only floor with a job beyond being read. Every
// address is a real, copyable link: a recruiter copying an email out of a
// picture is a recruiter who moves on. There is no contact form, because there
// is no backend, and a form that silently does nothing is worse than none.
function FloorKontakt() {
  const pick = usePick();
  const t = useT();
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
      <p className="label floor-label">3. Untergeschoss</p>
      <h2 style={{ fontSize: 'clamp(26px, 4.6vw, 54px)', marginTop: 8 }}>{pick(DECKS[3].label)}</h2>

      <div className="panel" style={{ marginTop: 'clamp(12px, 2vh, 24px)' }}>
        <div className="panel-body">
          <div className="form-head">
            <div>
              <p className="stencil">{t('floorKontakt.formTitle')}</p>
              <p className="label" style={{ marginTop: 6 }}>{t('floorKontakt.formSub')}</p>
            </div>
            <span className="stamp">{t('floorKontakt.stamp')}</span>
          </div>

          <div className="tape" aria-hidden="true" />

          <div className="field">
            <span className="label">{t('floorKontakt.telex')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a className="link-btn" href={`mailto:${PERSON.email}`} aria-label={PERSON.email}>
                <EmailIcon />
                {t('floorKontakt.emailBtn')}
              </a>
              <button type="button" className="copy-btn" onClick={copy}>{t('floorKontakt.copy')}</button>
              <span aria-live="polite">
                {copied && <span className="copied">{t('floorKontakt.copied')}</span>}
              </span>
            </span>
          </div>

          <div className="field">
            <span className="label">{t('floorKontakt.directory')}</span>
            <a className="link-btn" href={PERSON.linkedin} target="_blank" rel="noreferrer noopener">
              <LinkedinIcon />
              {t('floorKontakt.linkedinBtn')}
            </a>
          </div>

          <div className="field">
            <span className="label">{t('floorKontakt.workshop')}</span>
            <a className="link-btn" href={PERSON.github} target="_blank" rel="noreferrer noopener">
              <GithubIcon />
              {t('floorKontakt.githubBtn')}
            </a>
          </div>

          <div className="tape" aria-hidden="true" />

          <span className="enamel enamel--red enamel--lg">
            {`${pick(PERSON.city)} · ${pick(PERSON.availability)}`.toUpperCase()}
          </span>

          {canRunScene && (
            <p style={{ marginTop: 18 }}>
              <a className="field-value" href="?scene">{t('floorKontakt.switchTo3d')}</a>
            </p>
          )}
        </div>
      </div>
    </Floor>
  );
}

export default FloorKontakt;
