import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SLIDES, localized } from '../decks/projects.js';
import { DECKS } from '../lift/decks.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import FullscreenImageModal from '../scene/r3f/FullscreenImageModal.jsx';
import { useLocale, usePick, useT } from '../i18n/LocaleContext.jsx';

// The archive, on a picture tube. It pages the same flat run of shots the
// console in the scene pages — `SLIDES`, not `PROJECTS` — for the same reason:
// one project is often several pictures, and a counter that sits on the same
// number through three presses of NEXT is a counter that looks stuck.
//
// What keeps three pictures of one job from reading as three different jobs is
// the project's name on its own plate, standing still while the pictures change
// under it.
//
// The fullscreen view is `FullscreenImageModal` — the scene's own, not a
// second implementation (NAM-53 decided that; the draft's `Viewer.tsx` is
// gone). It has to be portalled to `document.body` rather than rendered
// where the click happened: nested inside `.floor-inner`, whose opacity
// during the arrival animation quietly opens a stacking context, its `z-index:
// 400` is only ever compared against the other children of that context —
// which is how it ended up losing to `.rail` (`z-index: 30`) and to this
// floor's own `.floor-tag`. A portal escapes that context entirely, the same
// way it already does mounted above the scene's `<Canvas>` in `Dieselpunk`.
function FloorProjekte() {
  const { locale } = useLocale();
  const pick = usePick();
  const t = useT();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const slide = SLIDES[index];
  const step = (delta) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta)));
  const blurb = slide ? localized(slide.blurb, slide.blurbI18n, locale) : '';
  const caption = slide ? localized(slide.caption, slide.captionI18n, locale) : '';

  return (
    <Floor meta={FLOORS[2]}>
      <p className="label floor-label">2. Untergeschoss</p>
      <h2 style={{ fontSize: 'clamp(26px, 4.6vw, 54px)', marginTop: 8 }}>{pick(DECKS[2].label)}</h2>

      <div className="panel" style={{ marginTop: 'clamp(12px, 2vh, 24px)' }}>
        <div className="panel-body crt-grid">
          <div className="crt-col">
            <button
              type="button"
              className="crt"
              onClick={() => setOpen(true)}
              disabled={!slide}
              aria-label={slide ? t('floorProjekte.viewFullscreenAria', { title: slide.title }) : t('floorProjekte.archiveEmptyAria')}
            >
              {slide && (
                <img src={slide.src} alt={t('floorProjekte.screenshotAlt', { title: slide.title })} loading="lazy" />
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
                aria-label={t('floorProjekte.prevAria')}
              >
                {t('floorProjekte.prevLabel')}
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
                aria-label={t('floorProjekte.nextAria')}
              >
                {t('floorProjekte.nextLabel')}
              </button>
            </div>
          </div>

          <div>
            <span className="enamel">{slide ? slide.title : t('floorProjekte.empty')}</span>
            {/* The caption names the picture and the stencil beside it says
                which of the project's pictures this is. Two answers to one
                question, so they share one line — on a short screen the line
                they used to take in turn is a line of the notice below. */}
            <div className="shot-line">
              {caption && <h3>{caption}</h3>}
              {slide && (
                <p className="stencil">
                  {t('floorProjekte.shotOf', { shot: slide.shot, shots: slide.shots })}
                </p>
              )}
            </div>
            {/* The same works notice the scene hangs on the landing wall, so
                the two renderings of this card say the same thing about the
                same picture. Here it can stand under the name plate rather
                than a metre away from it. */}
            {blurb && (
              <p className="notice" key={slide.project}>{blurb}</p>
            )}
            {slide?.url && (
              <p style={{ marginTop: 14 }}>
                <a className="field-value" href={slide.url} target="_blank" rel="noreferrer noopener">
                  {t('floorProjekte.viewSource')}
                </a>
              </p>
            )}
            {slide?.stack && (
              <p className="stencil stencil--sm" style={{ marginTop: 14 }}>{slide.stack}</p>
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <FullscreenImageModal
          open={open}
          page={index}
          onClose={() => setOpen(false)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />,
        document.body,
      )}
    </Floor>
  );
}

export default FloorProjekte;
