// ── the one switch that stops the building ───────────────────────────────────
// `prefers-reduced-motion: reduce` is a person telling their machine that
// things moving at them without being asked make them ill. This scene is a lift
// shaft: it rides between floors, its screens roll, its lamps blink and its
// conveyor never stops. For that visitor none of it is decoration — a cabin
// accelerating down a shaft is exactly the stimulus a vestibular disorder
// answers to, and it happens the moment they touch a floor button.
//
// So the preference is read in one place and honoured everywhere, and the rule
// it enforces is narrower than "turn the scene off":
//
//   **Nothing may move by itself, and nothing the visitor asks for may travel
//   to get there.**
//
// The room stays. The lamps stay lit, the screens stay bright, the boxes stay
// on the belt — what goes is the *travel*: the ride becomes a cut, the intro's
// shudder and hunt never play, the raster bar stops rolling, the pulses hold at
// a level instead of swelling. Everything that was a waveform becomes the value
// it would have rested at, which is why every driver in the scene already had a
// settle path before this was written — see `useScreenLife`, `usePilotLamps`
// and the flow screen, all of which go still through the same door their
// `live` gate uses.
//
// The flat card answered this in CSS long ago (`flat.css`, and NAM-55's note in
// it). This is the scene's copy of that answer, in the only language a WebGL
// picture has.

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The preference, right now, with no React around it.
 *
 * Guarded rather than assumed: this is called from module-level machinery and
 * from the test runner, and a missing `matchMedia` means "nobody has asked for
 * anything", not a crash.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !!window.matchMedia(QUERY).matches;
}

/**
 * The same preference, kept current.
 *
 * It listens, and that is the point of the hook rather than an afterthought: a
 * visitor who reaches for the setting is usually reaching for it *because* of
 * what is on the screen, and a scene that only checks at load hands them a page
 * reload as the price of being heard.
 *
 * @returns {boolean}
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(QUERY);
    const onChange = () => setReduced(!!query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
