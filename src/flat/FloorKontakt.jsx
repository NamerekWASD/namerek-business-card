import { useEffect, useMemo, useState } from 'react';
import { PERSON } from '../decks/content.js';
import { DECKS } from '../lift/decks.js';
import { webglAvailable } from '../scene/renderers/flag.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import { usePick, useT } from '../i18n/LocaleContext.jsx';

const ICON_PROPS = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', 'aria-hidden': 'true' };

function EmailIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="1.5" y="3.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 4.5 L9 10 L16 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.3" cy="5.3" r="1.1" fill="currentColor" />
      <path d="M5.3 7.9 V13" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.6 13 V9.8 C8.6 8 11.4 8 11.4 9.8 V13" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path
        d="M9 1.6c-4.1 0-7.4 3.3-7.4 7.4 0 3.3 2.1 6.1 5.1 7.1.4.1.5-.2.5-.4v-1.5c-2.1.4-2.5-1-2.5-1-.3-.8-.8-1.1-.8-1.1-.7-.5.1-.5.1-.5.7.1 1.1.7 1.1.7.7 1.2 1.8.8 2.2.6.1-.5.3-.8.5-1-1.7-.2-3.5-.9-3.5-3.8 0-.8.3-1.5.7-2-.1-.2-.3-1 .1-2.1 0 0 .6-.2 2 .8a6.8 6.8 0 0 1 3.6 0c1.4-1 2-.8 2-.8.4 1.1.2 1.9.1 2.1.5.5.7 1.2.7 2 0 2.9-1.8 3.6-3.5 3.8.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4 3-1 5.1-3.8 5.1-7.1 0-4.1-3.3-7.4-7.4-7.4Z"
        stroke="currentColor"
        strokeWidth="0.4"
        fill="currentColor"
      />
    </svg>
  );
}

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
      <p className="label">3. Untergeschoss</p>
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
