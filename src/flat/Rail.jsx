import { useCallback, useRef } from 'react';
import { FLOORS } from './floors.js';

// The lift, flattened. A fixed hoist guide down the edge with the building's
// four floor plates on it and a car that rides continuously with the scroll —
// continuously and not in steps, so the travel is visible while the snap is
// still animating. It is what stops this page reading as a generic snap-scroll
// landing page.
//
// ── NBC-62: it is also the scrollbar ────────────────────────────────────────
// The native scrollbar is gone from this page, in development as well as in
// production, and this took over its job rather than merely reporting it. The
// two together were the problem: a real scrollbar you can drag on the right, a
// painted one you cannot on the left, both describing the same scroller. So
// the guide is a trough — press anywhere on it and the car goes there, drag
// and the page follows live, let go and it lands on the nearest floor — and
// the wheel works over the rail the way it works over the page.
//
// Snap is what makes that need saying at all. `.bld` snaps mandatorily, so a
// live drag would be fighting a re-snap on every frame; `is-scrubbing` lifts
// the snap for exactly as long as a finger is down, and the release rides to
// the floor the car was left over. The class goes straight onto the node
// rather than through state: a drag writes it several times a second and none
// of those writes is worth a re-render of four floors.
function Rail({ active, progress, onSelect, onScrubStart, onScrub, onScrubEnd, onWheel }) {
  const railRef = useRef(null);
  const trackRef = useRef(null);
  const dragging = useRef(false);

  // Where on the shaft a pointer is, 0 at the top floor and 1 at the bottom.
  // Measured against the car's own travel rather than against the track's box:
  // the plates are laid out `space-between`, so the top one's centre is half a
  // plate below the track's top edge and the bottom one's is half a plate
  // above its bottom edge, and the car travels between those two centres. The
  // half-plate is read off the plate rather than written down here — the
  // stylesheet owns that height and cannot hand a number back.
  const fractionAt = useCallback((clientY) => {
    const el = trackRef.current;
    if (!el) return 0;
    const box = el.getBoundingClientRect();
    const inset = (el.querySelector('.rail-mark')?.offsetHeight ?? 0) / 2;
    const span = box.height - inset * 2;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (clientY - box.top - inset) / span));
  }, []);

  const onPointerDown = useCallback((event) => {
    // A press that started on a floor plate is that plate's click, not a drag
    // of the trough underneath it.
    if (event.target.closest('.rail-mark')) return;
    if (event.button !== undefined && event.button !== 0) return;
    dragging.current = true;
    railRef.current?.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onScrubStart?.();
    onScrub?.(fractionAt(event.clientY));
  }, [fractionAt, onScrub, onScrubStart]);

  const onPointerMove = useCallback((event) => {
    if (!dragging.current) return;
    onScrub?.(fractionAt(event.clientY));
  }, [fractionAt, onScrub]);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    railRef.current?.classList.remove('is-dragging');
    onScrubEnd?.();
  }, [onScrubEnd]);

  return (
    <nav className="rail" aria-label="Etagen" ref={railRef} onWheel={onWheel}>
      <p className="rail-title">Aufzug</p>
      <div
        className="rail-track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="rail-guide" aria-hidden="true" />
        <div
          className="rail-shuttle"
          aria-hidden="true"
          style={{ transform: `translate3d(0, ${progress * 100}%, 0)` }}
        >
          <div className="rail-car" />
        </div>
        {FLOORS.map((floor) => (
          // A real link to the section's own id, not a bare button: this is
          // the page's skip navigation as much as it is the lift's dial, and
          // it has to keep working with the click handler stripped out —
          // right-click-to-open-in-a-tab, a screen reader's link list, JS
          // disabled entirely. `goTo` is still what runs on a plain click, so
          // the ride keeps its own smooth-scroll and settle rather than
          // falling back to the browser's bare jump.
          <a
            key={floor.id}
            href={`#${floor.id}`}
            className="rail-mark"
            // Named on the link rather than left to whatever is visible
            // inside it: below 900px the floor's name is not drawn and the
            // plate shows the short form, and a link reading "1" is not a
            // floor anyone can navigate by.
            aria-label={`${floor.code} — ${floor.label}`}
            aria-current={active === floor.index ? 'true' : 'false'}
            onClick={(event) => {
              event.preventDefault();
              onSelect(floor.index);
            }}
          >
            <span className="enamel" aria-hidden="true">
              <span className="rail-code">{floor.code}</span>
              <span className="rail-tick">{floor.tick}</span>
            </span>
            <span className="rail-mark-name" aria-hidden="true">{floor.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

export default Rail;
