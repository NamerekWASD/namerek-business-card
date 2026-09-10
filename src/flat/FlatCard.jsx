import { useCallback, useEffect, useRef, useState } from 'react';
import './flat.css';
import { FLOORS } from './floors.js';
import Rail from './Rail.jsx';
import { rivetImage } from '../ui/rivet.js';
import FloorStart from './FloorStart.jsx';
import FloorLeistungen from './FloorLeistungen.jsx';
import FloorProjekte from './FloorProjekte.jsx';
import FloorKontakt from './FloorKontakt.jsx';
import { prefersReducedMotion } from '../motion/reduced.js';
import FlatLang from './FlatLang.jsx';
import { useLocale } from '../i18n/LocaleContext.jsx';
import useViewport from '../hooks/useViewport.js';

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
// NAM-49 fixed both defects the transplant carried on purpose: the keyboard
// listener is bound to `document` rather than to this scroller, because a
// cold load leaves focus on `body` and a handler on an unfocused element
// never fires; and `.floor` yields (`overflow-y: auto`) instead of clipping
// when a section's content is taller than the viewport — see `flat.css`.
// The bolt head, handed to the stylesheet. `flat.css` has no build step and
// cannot construct a data URL, and the alternative — pasting the SVG into the
// CSS by hand — is a second copy of `ui/rivet.js` that will drift from the
// first. See NBC-65.
const RIVETS = {
  '--rivet': rivetImage('brass'),
  '--rivet-iron': rivetImage('iron'),
};

export default function FlatCard() {
  const { locale, setLocale } = useLocale();
  // Only for the switch, and only to answer one question: is there room for
  // its stencil. The same breakpoint the rail drops its floor names at.
  const { vw } = useViewport();
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
    // NBC-25. `.bld` already drops to `scroll-behavior: auto` under the
    // preference, and a `behavior` passed here would override that CSS rather
    // than obey it — an explicit option always wins. Read at the click, not at
    // mount, so the preference can be turned on mid-visit.
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    el.scrollTo({ top: clamped * el.clientHeight, behavior });
  }, []);

  // NBC-62: the rail is the scrollbar now, so it has to be able to drive the
  // scroller and not only read it.
  //
  // The snap is why this is three callbacks rather than one. `.bld` snaps
  // mandatorily — that is the whole spine of the page — and a drag that writes
  // `scrollTop` every frame against a mandatory snap is a fight the drag
  // loses. `is-scrubbing` lifts the snap for exactly as long as a pointer is
  // down; the release rides to whichever floor the car was left over, which is
  // the same landing a flung scroll gets. Written to the node, not to state: a
  // drag would otherwise re-render four floors several times a second to
  // change one class.
  const onScrubStart = useCallback(() => {
    scrollerRef.current?.classList.add('is-scrubbing');
  }, []);

  const onScrub = useCallback((fraction) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = fraction * Math.max(0, el.scrollHeight - el.clientHeight);
  }, []);

  const onScrubEnd = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.classList.remove('is-scrubbing');
    goTo(Math.round(el.scrollTop / Math.max(1, el.clientHeight)));
  }, [goTo]);

  // The rail is a fixed sibling of the scroller, so a wheel over it reaches
  // nothing on its own. Forwarded rather than ignored: a strip a fifth of the
  // window wide that swallows the wheel is a worse bug than no rail at all.
  const onWheel = useCallback((event) => {
    scrollerRef.current?.scrollBy({ top: event.deltaY, behavior: 'auto' });
  }, []);

  // Bound to `document`, not to `.bld`: a cold load leaves focus on `body`,
  // and a handler that only listens on the scroller never fires until
  // something inside it has been clicked or tabbed into. `active` is read off
  // a ref so the listener does not have to be torn down and rebound on every
  // floor change.
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const onKeyDown = (event) => {
      // The fullscreen viewer pages the archive with the same arrows this
      // uses to change floors, so while it is open the floors do not answer
      // to them.
      if (event.target.closest?.('[role="dialog"]')) return;
      const current = activeRef.current;
      const next = {
        ArrowDown: current + 1,
        PageDown: current + 1,
        ArrowUp: current - 1,
        PageUp: current - 1,
        Home: 0,
        End: FLOORS.length - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      goTo(next);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [goTo]);

  // The wrapper is not decoration: it is what the palette is declared on, and
  // the rail is a fixed sibling of the scroller rather than a child of it, so
  // both have to sit inside the element that carries the custom properties.
  return (
    <div className="flat" style={RIVETS}>
      {/* Bolted in the corner the rail is not in. It has to be fixed rather
          than laid on a floor — the card is four snapping floors and a switch
          that scrolls away is a switch you can only reach from the ground
          floor — and it has to be out of the rail, which is 58px drawn and 37
          live on a handset with no room to spare. NBC-96 shut it behind a
          badge: the corner it is fixed in is also the one every floor bolts
          its own number to, and a fixed plate over a riding one is a plate
          that eats it. */}
      <FlatLang value={locale} onChange={setLocale} compact={vw <= 900} />
      <Rail
        active={active}
        progress={progress}
        onSelect={goTo}
        onScrubStart={onScrubStart}
        onScrub={onScrub}
        onScrubEnd={onScrubEnd}
        onWheel={onWheel}
      />
      <main className="bld" ref={scrollerRef}>
        <FloorStart />
        <FloorLeistungen />
        <FloorProjekte />
        <FloorKontakt />
      </main>
    </div>
  );
}
