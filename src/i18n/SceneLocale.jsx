import { useEffect, useRef, useState } from 'react';

// ── the language the scene is *painted* in ───────────────────────────────────
// NBC-90. Half the German in this building is not text — it is pixels. The
// screens, the map, the archive's test card and the works notice are all
// canvases baked into textures, and a language change has to draw every one of
// them again.
//
// That is a repaint of half a dozen surfaces in one commit, and Mykolai ruled
// out doing it in front of the visitor: a batch of textures re-uploaded while
// somebody is looking at them is the known shape of a hitch in this scene (see
// `project_r3f_hitch_playbook`). So the cabin performs the one gesture it
// already owns for "you are about to be shown something else" — it shuts its
// doors and opens them again, standing still on the floor it is on. The repaint
// happens in the middle of that, during the stretch where the leaves are fully
// shut and nothing in the frame is moving.
//
// Which makes two languages in play at once: `useLocale()` is what the visitor
// has *chosen*, and `useSceneLocale()` is what the scene is currently showing.
// They differ for about a third of a second, once, per change.
//
// **The whole scene waits, not only the textures.** The first build let the DOM
// half — the deck headings, the plates, the body copy, the floor buttons —
// change the instant the switch was turned, on the theory that a DOM string
// costs nothing to redraw. Mykolai saw exactly what that is: the text on the
// landing wall changing language in front of you while the screen bolted to the
// same wall waits for the doors. One wall, two clocks. So `useT` and `usePick`
// read this value too, and the only thing left reading the choice directly is
// the switch's own carriage — which *should* move the moment it is turned,
// because that is the click being acknowledged.

/**
 * The machine: chosen language in, painted language out, a door cycle in
 * between.
 *
 * Three cases, and the two facts they turn on are already on the ride —
 * `moving` says a trip is under way and `closure` says how shut the doors are.
 * What is held here is only which language a set of doors was asked for.
 *
 * - **A trip is under way.** Nothing happens. The switch is locked while the
 *   cabin moves (see `FloorSelector`), so this is the narrow case of a change
 *   arriving from somewhere else — another tab writing `localStorage`, a test —
 *   and it waits for the trip to end rather than repainting mid-flight.
 * - **The doors are ours and fully shut.** The swap, which is the repaint.
 * - **No cycle was granted.** `startCycle` says so by returning `false`, which
 *   happens when the visitor has asked for no motion at all. Then there is no
 *   curtain to draw and the language changes on the spot — which is what a
 *   reduced-motion visitor asked for and, for them, the correct answer.
 *
 * @param {import('./locale.js').LocaleId} locale what the visitor has chosen
 * @param {{ closure: number, moving: boolean, cycle: () => boolean }} lift
 * @returns {import('./locale.js').LocaleId} what the canvases are painted in
 */
export function useLocaleCycle(locale, { closure, moving, cycle }) {
  const [painted, setPainted] = useState(locale);
  // Which language a cycle has already been asked for. A flag would not do:
  // what has to be remembered is not *that* we asked but *what for*, so a
  // second change while the first is still riding asks for its own doors
  // instead of quietly borrowing them.
  const [asked, setAsked] = useState(null);
  // Whether the trip we asked for actually started. Read only by the reset
  // below, and a ref rather than state because nothing renders differently
  // for it.
  const rode = useRef(false);

  useEffect(() => {
    if (locale === painted) return;
    if (asked !== locale) {
      if (moving) return;
      if (cycle()) setAsked(locale);
      else setPainted(locale);
      return;
    }
    if (moving) {
      rode.current = true;
      if (closure >= 1) setPainted(locale);
      return;
    }
    // Asked for, and not started yet — the ticker publishes the trip on the
    // same commit, so this is the gap of a single render.
    if (!rode.current) return;
    // Our doors have finished and the swap has not happened, which means no
    // render landed in the stretch where they were shut. That is not a
    // hypothetical: a browser throttles a window it thinks nobody is looking at
    // down to one frame a second, and the whole cycle then passes between two
    // renders. The repaint is owed either way and this is where it is paid —
    // the first build waited for a closure that was never coming back, dropped
    // the request when the trip ended, and asked for another set of doors on
    // the next render, which is a lift that shuts its doors for ever.
    rode.current = false;
    setPainted(locale);
  }, [locale, painted, asked, closure, moving, cycle]);

  return painted;
}
