// ── a board of indicator lamps that behaves like one ─────────────────────────
// The patch bay is the one prop in this scene that is about the site's own
// subject: a field of jacks with three of them bridged is, underneath the
// brass, a switched network. Standing dead it states that idea in the past
// tense. What makes a board of this period read as *working* is not motion —
// nothing on it moves — it is the lamps, and specifically the fact that they
// are not in step with each other.
//
// So the model here is the thing itself rather than an animation of it. Each
// circuit is either carrying traffic or idle:
//
// - a **patched** circuit — one with a cord in it — sits lit, and drops out for
//   a fraction of a second now and then, the way a relay chatters;
// - an **idle** one sits dark and blips when something passes through it.
//
// Both are drawn from exponential-ish waits, so the board never falls into a
// rhythm. That is the whole difference between "the lamps are blinking" and
// "the board is doing something".
//
// ── and it is event-driven, which is the part that matters for cost ─────────
// Both canvases are `frameloop="demand"`: a still picture redrawn 165 times a
// second is two fans spinning for nothing, and that is deliberate. A naive
// blink written in `useFrame` throws all of it away — the scene would never
// rest again while anyone stood on the ground floor, and every one of those
// frames redraws six cube faces per lit light.
//
// This never ticks. It works out *when the next lamp changes* and sleeps until
// exactly then, writes the one material it has to, and asks for a frame. A
// board of eight settles at roughly two or three redraws a second and goes
// quiet for a second at a time, which is both cheaper than a tick and a truer
// description of what indicator lamps do.

import { useEffect, useRef } from 'react';
import { invalidateScene } from './frames.js';

/** How hard a lamp glows lit, and how hard its cold filament glows dark. */
// Measured on screen rather than guessed: at 2.8 against 0.22 the change was
// there and read as the *bezel* flickering, because a brass ring round a small
// bead is brighter than the bead's own dark state. The lit end has to clear the
// ring it sits in and the dark end has to go properly cold.
export const LAMP_LIT = 4.4;
export const LAMP_DARK = 0.05;

/** A small deterministic generator, so two machines see the same board. */
const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * An exponential-ish wait between `lo` and `hi` seconds, in milliseconds.
 * Squaring the uniform biases it toward the short end, which is what makes a
 * run of blips cluster the way real traffic does instead of arriving on a beat.
 */
const wait = (rnd, lo, hi) => (lo + (hi - lo) * rnd() ** 2) * 1000;

/**
 * Drives a row of lamp materials.
 *
 * `materials.current` is an array of `MeshStandardMaterial` — written straight
 * to, never through React state. A board that blinked through `setState` would
 * re-render this whole landing several times a second for a change to one
 * float, and the landing holds the pendant, the props and the wall screen.
 *
 * @param {{ current: (import('three').Material | null)[] }} materials
 * @param {boolean[]} patched which circuits have a cord in them
 * @param {boolean} live false while the doors are shut — a board nobody can see
 *   should not be asking the scene for frames
 * @param {number} [seed]
 * @param {{ lit: number, dark: number }} [levels] what "on" and "off" are worth
 *   for this board. The defaults are a pilot lamp's, which is a thing that is
 *   on or off; a valve heater dims and comes back instead, and hands its own
 *   narrower pair in — see `VALVE_LIT` in `LandingProps.jsx`.
 */
export default function usePilotLamps(
  materials, patched, live, seed = 0x9ac, levels = { lit: LAMP_LIT, dark: LAMP_DARK },
) {
  // Held across renders so a re-render mid-blink does not restart the board on
  // a fresh pattern — the lamps keep whatever state they were in.
  const state = useRef(null);

  useEffect(() => {
    if (!live) return undefined;
    const rnd = seeded(seed);
    const now = () => performance.now();

    if (!state.current) {
      state.current = patched.map((busy) => ({ on: busy, due: 0 }));
    }
    const lamps = state.current;

    /** When this lamp next changes, given what it is doing now. */
    const schedule = (i, t) => {
      const busy = patched[i];
      const lamp = lamps[i];
      if (busy) {
        lamp.due = t + (lamp.on ? wait(rnd, 0.35, 2.6) : wait(rnd, 0.05, 0.22));
      } else {
        lamp.due = t + (lamp.on ? wait(rnd, 0.06, 0.4) : wait(rnd, 1.2, 7));
      }
    };

    const paint = (i) => {
      const material = materials.current?.[i];
      if (material) material.emissiveIntensity = lamps[i].on ? levels.lit : levels.dark;
    };

    const t0 = now();
    for (let i = 0; i < lamps.length; i += 1) {
      if (!lamps[i].due) schedule(i, t0);
      paint(i);
    }
    invalidateScene();

    let timer = 0;
    const step = () => {
      const t = now();
      let changed = false;
      let soonest = Infinity;
      for (let i = 0; i < lamps.length; i += 1) {
        if (lamps[i].due <= t) {
          lamps[i].on = !lamps[i].on;
          schedule(i, t);
          paint(i);
          changed = true;
        }
        soonest = Math.min(soonest, lamps[i].due);
      }
      if (changed) invalidateScene();
      // A floor under the wait, so a pathological draw cannot turn this into a
      // busy loop; a ceiling so a long idle stretch still checks in.
      timer = setTimeout(step, Math.min(1500, Math.max(40, soonest - now())));
    };
    step();

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, seed]);
}
