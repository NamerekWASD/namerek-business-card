import { useCallback, useEffect, useRef, useState } from 'react';
import './flat.css';
import { FLOORS } from './floors.js';
import Rail from './Rail.jsx';
import FloorStart from './FloorStart.jsx';
import FloorLeistungen from './FloorLeistungen.jsx';
import FloorProjekte from './FloorProjekte.jsx';
import FloorKontakt from './FloorKontakt.jsx';

// The second rendering of the card: the same building, told without a lift.
//
// Four full-viewport sections under a mandatory snap — a gesture moves you one
// floor and it lands, and there is no resting position between two of them. The
// content and the palette are the scene's own, read from `decks/content.js`,
// `decks/projects.js` and `lift/decks.js`; the chrome is not, and deliberately
// so. The scene's plates are *lit* — `EnamelPlate` multiplies its colours by
// the light reaching that surface — and this page has no lights, so it takes
// the palette straight through the CSS classes in `flat.css` instead.
//
// **Two known defects are ported here on purpose**, so that the move and the
// corrections stay separate commits: the keyboard is dead until something in
// the page is focused (the handler is on this scroller and a cold load leaves
// focus on `body`), and `.floor` clips rather than yields when its content is
// taller than the viewport. NAM-49 owns both.
export default function FlatCard() {
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    let frame = 0;
    // Read on a frame rather than on every scroll event: the rail's car is the
    // only thing that moves with the scroll, and it cannot move more than once
    // per painted frame however many events arrive.
    const update = () => {
      frame = 0;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
      setActive(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const goTo = useCallback((index) => {
    const el = scrollerRef.current;
    if (!el?.scrollTo) return;
    const clamped = Math.min(FLOORS.length - 1, Math.max(0, index));
    el.scrollTo({ top: clamped * el.clientHeight, behavior: 'smooth' });
  }, []);

  const onKeyDown = (event) => {
    // The fullscreen viewer pages the archive with the same arrows this uses to
    // change floors, so while it is open the floors do not answer to them.
    if (event.target.closest?.('[role="dialog"]')) return;
    const next = {
      ArrowDown: active + 1,
      PageDown: active + 1,
      ArrowUp: active - 1,
      PageUp: active - 1,
      Home: 0,
      End: FLOORS.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    goTo(next);
  };

  // The wrapper is not decoration: it is what the palette is declared on, and
  // the rail is a fixed sibling of the scroller rather than a child of it, so
  // both have to sit inside the element that carries the custom properties.
  return (
    <div className="flat">
      <Rail active={active} progress={progress} onSelect={goTo} />
      <main className="bld" ref={scrollerRef} onKeyDown={onKeyDown} tabIndex={-1}>
        <FloorStart />
        <FloorLeistungen />
        <FloorProjekte />
        <FloorKontakt />
      </main>
    </div>
  );
}
