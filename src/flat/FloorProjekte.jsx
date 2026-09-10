import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SLIDES, localized } from '../decks/projects.js';
import { DECKS } from '../lift/decks.js';
import { FLOORS } from './floors.js';
import Floor from './Floor.jsx';
import Crawl from './Crawl.jsx';
import FullscreenImageModal from '../scene/r3f/FullscreenImageModal.jsx';
import { useLocale, usePick, useT } from '../i18n/LocaleContext.jsx';
import { AddressIcon } from '../ui/icons.jsx';

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
//
// ── NBC-101: nothing moves between two shots ────────────────────────────────
// This is the one floor whose content changes without the page changing, and
// every block on it used to be sized by whatever slide was loaded: a caption
// that wrapped to two lines, a project name a word longer, a notice of another
// length, a stack that broke. The tube is the part of the floor that yields
// height (NBC-99), so all of that variation arrived at the console — the row
// of buttons moved between one press and the next, measured across three shots
// at 471px as 410 / 396 / 364px. A pager whose keys walk away from the thumb
// paging with them is the worst possible place to spend a layout's slack.
//
// So the floor is laid out around four declared boxes, and each of them
// answers exactly one question:
//
//   the glass          — what it looks like              the picture
//   the legend         — which shot this is              caption + shot number
//   the control rail   — everything you can press        pager, and the source
//   the notice window  — what the project is and why     the blurb, scrolled
//   the batten         — what was shipped                the stack, one line
//
// A label longer than its box walks it (`Crawl`) instead of growing it, the
// notice scrolls inside its own, and
// every control the floor has is in the rail rather than scattered down the
// panel with re-sizing text between them. The sizes themselves are in
// `flat.css`; `floorFit.test.js` holds them, `FloorProjekte.test.jsx` holds
// this shape.
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

            {/* The legend under the glass, which is where the 3D room puts the
                same fact: a small lit strip bolted to the tube's own bottom
                edge. Both halves of "which shot is this" live on it — the
                picture's name, and its place in the project — so neither can
                cost the floor a line by growing. */}
            <div className="shot-screen">
              <Crawl className="shot-name" dep={slide ? `${slide.key}:${locale}` : locale}>
                <h3>{slide ? caption : t('floorProjekte.empty')}</h3>
              </Crawl>
              {slide && (
                <span className="stencil stencil--sm shot-of">
                  {t('floorProjekte.shotOf', { shot: slide.shot, shots: slide.shots })}
                </span>
              )}
              <span className="shot-screen-scan" aria-hidden="true" />
            </div>

            {/* One rail, every control on the floor. The source link used to
                sit six blocks down the panel; it is a control and it belongs
                where the other controls are. It keeps the despatch desk's dark
                plate rather than the pager's brass — the shape says it leaves
                the site instead of paging the archive. */}
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
              {slide?.url && (
                <a
                  className="link-btn link-btn--sm"
                  href={slide.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t('floorProjekte.viewSource')}
                >
                  <AddressIcon href={slide.url} />
                  {t('floorProjekte.viewSourceShort')}
                </a>
              )}
            </div>
          </div>

          <div className="archive-facts">
            <span className="enamel">{slide ? slide.title : t('floorProjekte.empty')}</span>

            {/* The works notice, in a window with a height reserved in lines
                rather than taken from the sentence — and read at the visitor's
                own pace. It fed itself past the window for one build and that
                was wrong for exactly the reason given: a paragraph
                somebody is *reading* must not move while they read it. So it
                scrolls, by hand, down a brass slider of its own.

                The scene hangs the same text on the landing wall, so both
                renderings say the same thing about the same picture — here it
                can stand under the name plate rather than a metre away. */}
            <div className="notice-slot" tabIndex={0}>
              <p className="notice">{blurb}</p>
            </div>

            {/* What was shipped, sprayed along a batten across the foot of the
                panel — one line at the same size, never two. The crate in the
                3D room carries this same stencil. */}
            {slide?.stack && (
              <div className="stack-batten">
                <Crawl dep={slide.project}>
                  <span className="stencil stencil--sm">{slide.stack}</span>
                </Crawl>
              </div>
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
