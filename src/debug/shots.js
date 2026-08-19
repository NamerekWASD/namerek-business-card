import { useEffect, useRef } from 'react';
import { DEBUG_PANEL } from '../scene/effects/quality.js';
import { DECKS } from '../lift/decks.js';
import { DOOR_TOTAL_MS } from '../lift/intro.js';

// ── the states a screenshot regression compares ──────────────────────────────
//
// The plan asks for automated screenshot comparison across the four floors, the
// middle of every transition, the intro and a shut door. The hard part of that
// is not taking the pictures — it is taking the *same* picture twice, and this
// scene is animated by two independent clocks. A harness that clicks a button
// and waits 400ms captures a different frame every run, and a regression suite
// that disagrees with itself is worse than none.
//
// So the app exposes the states instead. Everything here is set through the
// same React state a real interaction would set — `scrub` positions the lift on
// a continuous floor coordinate, `t` positions the intro clock — with no timers
// involved, so a given state is byte-for-byte the same frame every time it is
// asked for, in either backend.
//
// Usage, from a browser harness or the console:
//
//   await window.__shots.go('ride-1-2-mid')
//   window.__shots.states           // every name it knows
//
// Deliberately gated behind the debug build. It is a handle on the app's
// internals, and it has no business shipping on a business card.

/**
 * A state is a scrubbed ride plus a position on the intro clock. The scrub is
 * the lift's own debug shape — `{ from, to, p }`, a trip held at a fraction of
 * the way through — because that is what the ticker understands, and a trip
 * held at `p` is the only way to name "the middle of the ride from EG to 1. OG"
 * without a stopwatch.
 *
 * A settled floor is a trip that goes nowhere: `from === to`, held at zero.
 *
 * @param {number} floors
 * @returns {{ name: string, scrub: { from: number, to: number, p: number } | null, intro: number }[]}
 */
function statesFor(floors) {
  const out = [
    // the intro: shut doors, then half open — which is also the "closed doors"
    // case the plan asks for separately
    { name: 'intro-shut', scrub: null, intro: 0 },
    { name: 'intro-half', scrub: null, intro: 0.5 * DOOR_TOTAL_MS },
  ];
  for (let f = 0; f < floors; f += 1) {
    out.push({ name: `floor-${f}`, scrub: { from: f, to: f, p: 0 }, intro: DOOR_TOTAL_MS });
  }
  // and three points across each single-floor transition, where the doors are
  // shutting, the walls are moving and the light is between two fittings — the
  // states most likely to differ between backends and least likely to be looked
  // at by hand
  for (let f = 0; f < floors - 1; f += 1) {
    for (const [label, p] of [['start', 0.15], ['mid', 0.5], ['end', 0.85]]) {
      out.push({
        name: `ride-${f}-${f + 1}-${label}`,
        scrub: { from: f, to: f + 1, p },
        intro: DOOR_TOTAL_MS,
      });
    }
  }
  return out;
}

export const SHOT_STATES = statesFor(DECKS.length);

/**
 * Publishes the state driver on `window.__shots` for a screenshot harness.
 * Takes the setters it drives rather than reaching for them, so nothing here
 * knows how the lift is implemented.
 *
 * @param {{ setScrub: (v: number) => void, setT: (v: number) => void }} controls
 */
export default function useShotStates({ setScrub, setT }) {
  // The setters are held in a ref and the effect runs once. Depending on their
  // identity instead meant the handle was torn down and rebuilt on every render
  // of the scene — which is most frames — and a harness that catches the gap
  // sees `window.__shots` come back undefined for no reason it can explain.
  const controls = useRef({ setScrub, setT });
  controls.current = { setScrub, setT };

  useEffect(() => {
    if (!DEBUG_PANEL || typeof window === 'undefined') return undefined;
    window.__shots = {
      states: SHOT_STATES.map((s) => s.name),
      /**
       * Puts the scene in a named state and resolves once React has painted it.
       * @param {string} name
       */
      go(name) {
        const state = SHOT_STATES.find((s) => s.name === name);
        if (!state) throw new Error(`unknown shot state: ${name}`);
        controls.current.setT(state.intro);
        controls.current.setScrub(state.scrub);
        // two frames: one for React to commit, one for the canvases to draw the
        // committed state. A single frame catches the scene mid-update often
        // enough to matter.
        return new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(state)));
        });
      },
    };
    return () => { delete window.__shots; };
  }, []);
}
