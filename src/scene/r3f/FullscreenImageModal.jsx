import { useEffect, useRef } from 'react';
import { LAYERS } from '../layers.js';
import { SLIDES } from '../../decks/projects.js';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Mounted from `Dieselpunk` as a DOM sibling of the scene's `<Canvas>`, never
// as its descendant — see `fullscreenImage.js` for why that boundary matters.
//
// `page` is the same flat counter the console on the wall pages — not a copy
// of it — so PREV/NEXT here move the console too, and closing the modal
// leaves the glass showing whatever was looked at last.
//
// ── why the far side of a project gets a name, not a chevron ────────────────
// A run of pictures is usually one project, and inside one project PREV/NEXT
// is enough — pressing it is never a surprise. But `SLIDES` is flat across the
// whole archive (see `projects.js`), so pressing NEXT on the last shot of one
// project lands on the first shot of the next, and a bare chevron there reads
// as "one more of these" when it is actually "somewhere else entirely". The
// neighbour's own title on the button is what tells you before you press it.
export default function FullscreenImageModal({
  open, page, onClose, onPrev, onNext,
}) {
  const slide = open ? SLIDES[page] ?? null : null;
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openedFromRef = useRef(null);

  // Focus moves in on open and comes back out on close — the trigger is a
  // click on a mesh inside the R3F canvas, not a focusable DOM element, so
  // whatever had focus before (usually `body`) is what "back" means here.
  useEffect(() => {
    if (!slide) return undefined;
    openedFromRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      const target = openedFromRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus();
    };
  }, [slide]);

  useEffect(() => {
    if (!slide) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        onPrev();
        return;
      }
      if (e.key === 'ArrowRight') {
        onNext();
        return;
      }
      if (e.key !== 'Tab') return;
      // The trap: Tab and Shift+Tab both stay inside the dialog's own
      // focusable elements, wrapping at either end rather than escaping to
      // whatever the background left focusable — see NAM-19 for why the
      // background needs its own answer to that too.
      const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slide, onClose, onPrev, onNext]);

  if (!slide) return null;

  const prevSlide = page > 0 ? SLIDES[page - 1] : null;
  const nextSlide = page < SLIDES.length - 1 ? SLIDES[page + 1] : null;
  const prevIsProject = !!prevSlide && prevSlide.project !== slide.project;
  const nextIsProject = !!nextSlide && nextSlide.project !== slide.project;

  return (
    <div
      ref={dialogRef}
      className="fullscreen-modal-overlay"
      style={{ zIndex: LAYERS.fullscreenImage }}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen image preview"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        ref={closeButtonRef}
        className="fullscreen-modal-close"
        onClick={onClose}
        aria-label="Close preview"
      >
        ×
      </button>

      {prevSlide && (
        <button
          type="button"
          className={`fullscreen-modal-nav fullscreen-modal-nav--prev${prevIsProject ? ' fullscreen-modal-nav--project' : ''}`}
          onClick={onPrev}
          aria-label={prevIsProject ? `Previous project: ${prevSlide.title}` : 'Previous photo'}
        >
          <span className="fullscreen-modal-nav-glyph">‹</span>
          {prevIsProject && <span className="fullscreen-modal-nav-label">{prevSlide.title}</span>}
        </button>
      )}

      <figure className="fullscreen-modal-figure">
        <img src={slide.src} alt={slide.caption || slide.title} className="fullscreen-modal-image" />
        <figcaption className="fullscreen-modal-caption">
          <span className="fullscreen-modal-title">{slide.title}</span>
          {slide.caption && <span className="fullscreen-modal-caption-text">{slide.caption}</span>}
          <span className="fullscreen-modal-counter">{slide.shot} / {slide.shots}</span>
        </figcaption>
      </figure>

      {nextSlide && (
        <button
          type="button"
          className={`fullscreen-modal-nav fullscreen-modal-nav--next${nextIsProject ? ' fullscreen-modal-nav--project' : ''}`}
          onClick={onNext}
          aria-label={nextIsProject ? `Next project: ${nextSlide.title}` : 'Next photo'}
        >
          {nextIsProject && <span className="fullscreen-modal-nav-label">{nextSlide.title}</span>}
          <span className="fullscreen-modal-nav-glyph">›</span>
        </button>
      )}
    </div>
  );
}
