import { useEffect, useRef, useState } from 'react';
import useReducedMotion from '../motion/reduced.js';

// ── a one-line window, and a legend that walks it ───────────────────────────
// NBC-101. The archive floor changes its content without the page changing,
// and every block on it used to be sized by whatever slide was loaded. A
// caption that wrapped to two lines, a stack that broke onto a second — each of
// them arrived at the console as a row of buttons that moved while it was
// being pressed.
//
// So those blocks are boxes of a size the *stylesheet* decides, and this is
// what happens to a line too long for its box: it walks, and comes back, the
// way a legend on an instrument walks past its glass. Clipping would lose a
// fact and an ellipsis would hide one behind a control nobody finds.
//
// This is for a **line**, never a paragraph. That was the call on the notice,
// and it is the right one: text somebody has to read at their own pace gets a
// scrollbar and moves when they say so, and only a label — a name, a stack —
// is short enough that walking it is legible rather than maddening. See
// `.notice-slot` in `flat.css`.
//
// Two more things it deliberately is not:
//
// *Not a marquee.* A marquee runs continuously and scrolls the first word out
// of a box it already fitted inside. This measures the overflow and travels
// exactly that far, holds at both ends, and holds still when the content fits
// — which, for every language in the archive today at his own viewport, is
// most of the time.
//
// *Not a filter or a mask on the moving part.* Everything that moves is a
// `transform`, so the walk stays on the compositor — the rule NBC-79 had to
// learn the hard way. The window itself never moves.
//
// The measurement is real, not a character count: `scrollWidth` against the
// window's own `clientWidth`. A guess from string length is wrong the moment a
// translation, a font or a viewport changes, and all three do.

/**
 * @param {object} props
 * @param {string} [props.className] a skin for the window — a screen, a batten
 * @param {unknown} [props.dep] re-measure when this changes (the slide, usually)
 * @param {import('react').ReactNode} props.children
 */
function Crawl({ className = '', dep, children, ...rest }) {
  const run = useRef(null);
  const [over, setOver] = useState(0);
  const reduced = useReducedMotion();

  // `children` is deliberately not a dependency of the effect below: a new
  // element identity every render would re-subscribe the observer every
  // render, and the observer already watches the run's own box — which is what
  // changes when the text does. `dep` is for what a box size cannot see: a
  // locale that swaps one word for another of the same width.
  useEffect(() => {
    const el = run.current;
    const win = el?.parentElement;
    if (!el || !win) return undefined;

    const measure = () => setOver(Math.max(0, Math.ceil(el.scrollWidth - win.clientWidth)));
    measure();
    // A web font landing after the first paint changes every width on the
    // floor, and the box it changes them inside is the one thing that must not
    // change with it.
    document.fonts?.ready?.then(measure).catch(() => {});
    if (typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    watch.observe(win);
    return () => watch.disconnect();
  }, [dep]);

  const walking = over > 0 && !reduced;

  return (
    <div className={`crawl ${className}`.trim()} data-crawl={walking ? 'on' : 'off'} {...rest}>
      <div
        className="crawl-run"
        ref={run}
        style={{
          '--over': `${over}px`,
          // Paced by the distance rather than fixed: a name three characters
          // too long and one twice the window's width are not the same
          // journey, and one duration for both makes one of them a blur.
          '--crawl-ms': `${2400 + over * 90}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default Crawl;
