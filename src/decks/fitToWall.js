import { useLayoutEffect, useRef } from 'react';

// NBC-106. A deck's wall is a fixed share of the window's height, and a deck's
// column is a fixed number of CSS pixels tall, so on a short enough window any
// column taller than a few lines runs out of its own doorway and is cut by the
// masonry. The entrance deck crossed that line when it grew a nameplate and a
// logbook: no set of margins fits both a 900px and a 600px window. What fits
// both is letting the column yield as a whole — scale it down to the wall's
// height, which keeps every line in proportion.
//
// A transform and not `zoom`: under the wall's own transformed ancestors
// Chrome applied a `zoom` twice (offsetHeight came back already zoomed, the
// painted box zoomed again), and Safari's `zoom` is a different property
// altogether. A scale leaves the layout box alone, so the flex box that
// centres the column still centres it, and `transform-origin` keeps the
// shrunken column on the same centre line.

/** Below this the copy stops being readable; a column this squeezed is cut. */
export const MIN_FIT = 0.75;

/**
 * How far a column has to shrink to stand inside its wall.
 * @param {number} available the wall's inner height, CSS px
 * @param {number} natural the column's own height at full size, CSS px
 * @returns {number} a scale factor in `[MIN_FIT, 1]`
 */
export function fitScale(available, natural) {
  if (!(available > 0) || !(natural > 0) || natural <= available) return 1;
  return Math.max(MIN_FIT, available / natural);
}

/**
 * Scales the element it is given down to fit the `[data-deck-wall]` it stands
 * on. Written to the node, never to state, for the reason `usePanelWear`
 * gives: a commit of a whole deck to change one number, a frame late.
 */
export function useFitToWall() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const wall = el?.closest('[data-deck-wall]');
    if (!el || !wall) return undefined;

    const apply = () => {
      const cs = getComputedStyle(wall);
      const available = wall.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // offsetHeight ignores transforms, so this is always the natural height.
      const scale = fitScale(available, el.offsetHeight);
      el.style.transform = scale === 1 ? '' : `scale(${scale.toFixed(4)})`;
      el.style.transformOrigin = 'left center';
    };

    apply();
    // The wall follows the window; the column follows the locale and the web
    // fonts arriving. A transform resizes nothing, so observing the element
    // it scales does not loop.
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(apply);
    observer.observe(wall);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
