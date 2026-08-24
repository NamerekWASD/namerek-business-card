import { useLayoutEffect, useRef } from 'react';
import CornerRivets from './CornerRivets.jsx';
import { panelWearURL } from './panelWear.js';

// A bolted plate hung on the landing wall — the DOM half of the same article
// the corridor props are built from, and drawn to the same reference as the
// bench standing under it (`.temp/workbench and data blocks reference.png`).
//
// What that reference shows, and what this had to grow, is a plate with a
// *profile*: a dark field sunk inside a brass-lit arris, vignetted toward its
// own corners, sitting off the wall on its shadow. The flat rounded rectangle
// with a 1px border that was here read as a card on a web page — right colours,
// no thickness — and thickness is the whole grammar of the styling system these
// belong to.
//
// Four layers do it, and only one of them is an image:
//
// *The field.* The gradient below — the plate's own colour, and nothing else.
// *The wear.* A canvas painted by the same generator the props use, laid over
// the field. `panelWear.js` is where the recipes and the reasoning live; the
// hook underneath is only the plumbing that gets one onto this element.
// *The arris.* An inset highlight along the top edge and an inset shadow along
// the bottom, which is what a pressed steel plate does under a lamp above it,
// plus a wide inset shadow all round so the field is lit in the middle and dies
// into its own corners rather than being one flat value.
// *The stand-off.* A real drop shadow, offset down, because the plate is bolted
// proud of the plaster and not printed on it.
//
// The order is the point. Wear happened to the metal, so it goes over the
// colour; the arris and the bolts are the object's own form, so they go over
// the wear — inset shadows and child elements both paint above the background,
// which is what puts them in the right order for free.

const FIELD = 'linear-gradient(163deg, #302518 0%, #241b11 46%, #1b140c 100%)';

// The panel's box, rounded to this before anything is baked. Wear is baked at
// the element's own pixels so a pit is round rather than an oval, which means
// every distinct size is a canvas and an encode; quantising costs nothing
// visible and turns a drag-resize from hundreds of bakes into a handful.
const STEP = 8;

/**
 * Puts one plate's wear on one element.
 *
 * Written to the node rather than held in state, and that is the same rule the
 * rest of this scene keeps: a `data:` URL in `useState` is a React commit — of
 * a whole deck — to change one string, and it would land a frame after the
 * layout it belongs to. Here the property is set in the layout effect that
 * measured the box, so the plate is never once painted without it.
 *
 * The value goes into a custom property rather than straight into
 * `backgroundImage`, so the element keeps its own gradient declaratively in the
 * JSX below instead of having it pasted back on from in here. Where there is no
 * canvas — the test runner — nothing is set and the `none` fallback leaves the
 * plate as its gradient.
 *
 * @param {number} seed which plate this is
 * @param {string} variant which recipe in `panelWear.js` describes its use
 */
function usePanelWear(seed, variant) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const apply = () => {
      const w = Math.round(el.clientWidth / STEP) * STEP;
      const h = Math.round(el.clientHeight / STEP) * STEP;
      // A plate that has not been laid out yet has no wear to describe.
      if (w < STEP || h < STEP) return;
      const url = panelWearURL(w, h, { seed, variant });
      if (url) el.style.setProperty('--panel-wear', `url("${url}")`);
    };

    apply();
    // The deck column is sized off the doorway aperture, which is sized off the
    // viewport, so a plate's box changes without this component re-rendering.
    // jsdom has no `ResizeObserver`; the one `apply` above is all the test
    // runner needs and all it can use.
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [seed, variant]);

  return ref;
}

/**
 * @param {{
 *   children?: import('react').ReactNode,
 *   style?: import('react').CSSProperties,
 *   seed?: number,
 *   wear?: keyof import('./panelWear.js').VARIANTS,
 * }} props
 *
 * `seed` is which plate this is and `wear` is what kind of use it has had —
 * that is the whole of the interface, and `panelWear.js` explains both. A deck
 * rendering a row of these writes `seed={WEAR_SEED.<deck> + i}` once inside the
 * `.map()` it already has, which is what keeps a row of plates a row of
 * different objects rather than one object repeated four times.
 */
function RivettedPanel({ children, style, seed = 0, wear = 'plate' }) {
  const ref = usePanelWear(seed, wear);
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        backgroundImage: `var(--panel-wear, none), ${FIELD}`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: '1px solid #4a3821',
        borderRadius: 3,
        boxShadow: [
          'inset 0 1px 0 rgba(212,172,104,0.18)',
          'inset 0 -1px 0 rgba(0,0,0,0.6)',
          'inset 0 0 30px rgba(0,0,0,0.55)',
          '0 9px 20px rgba(0,0,0,0.55)',
        ].join(', '),
        ...style,
      }}
    >
      <CornerRivets />
      {children}
    </div>
  );
}

export default RivettedPanel;
