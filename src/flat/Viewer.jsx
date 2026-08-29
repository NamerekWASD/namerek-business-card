import { useEffect, useRef } from 'react';

// The archive's zoomed-in view. It is a second implementation of what
// `scene/r3f/FullscreenImageModal.jsx` already does for the scene, and that is
// a known duplication rather than an accident — NAM-53 decides which of the two
// survives. Until it does, this one carries the same guarantees NAM-18 and
// NAM-45 bought for the other: focus enters on open, is trapped while open,
// and returns to whatever opened it on close.
function Viewer({ slide, onPrev, onNext, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll('button');
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose, onNext, onPrev]);

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Aufnahme: ${slide.title}`}
      ref={dialogRef}
    >
      <button type="button" className="viewer-close" onClick={onClose} ref={closeRef} aria-label="Ansicht schliessen">
        Schliessen ✕
      </button>
      <button type="button" className="viewer-nav viewer-prev" onClick={onPrev} aria-label="Vorherige Aufnahme">
        ‹
      </button>
      <img src={slide.src} alt={`Bildschirmfoto: ${slide.title}`} />
      <button type="button" className="viewer-nav viewer-next" onClick={onNext} aria-label="Nächste Aufnahme">
        ›
      </button>
      <p className="viewer-cap label">
        {[slide.title, slide.caption].filter(Boolean).join(' — ')}
      </p>
    </div>
  );
}

export default Viewer;
