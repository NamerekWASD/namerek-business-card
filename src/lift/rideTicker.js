// ── the ride ticker ──────────────────────────────────────────────────────────
// The moving part of a ride, kept outside React on purpose. `setActiveRide`
// used to run on every `requestAnimationFrame` tick from a hook, which put the
// whole scene tree through reconciliation sixty-to-a-hundred-odd times a
// second — measured at 7-30ms of React commit per tick, most of a frame's
// budget gone before the browser ever gets to paint. A subscriber here reads
// the same numbers without asking anything to re-render for them; see
// `useRideFrame` for the components that do.
//
// `useLift` still mirrors this into React state — throttled — for everything
// that isn't a plain transform (which floors are mounted, face shading, and
// so on). This is the part that does not need React to know about it every
// frame, only the part that does.

import { liftDuration, liftEase } from './ride.js';

/** @import { Ride } from './useLift.js' */

/**
 * @typedef {{ floorPos: number, ride: Ride | null, velocity: number,
 *   moving: boolean, deckIndex: number }} RideSnapshot
 */

const velocityOf = (ride) => {
  if (!ride) return 0;
  // A scrubbed trip is a real trip everywhere else in this file, but it is
  // written by hand — `{ from, to, p }`, from `__shots` or the debug slider —
  // and it carries no duration, because a trip held still does not have one.
  // Divided by `undefined` that made the velocity `NaN`, which travelled all
  // the way out to `stdDeviation="0 NaN"` on the motion-blur filter and had the
  // browser reject it. A held trip is not moving, so: no duration, no speed.
  if (!ride.dur) return 0;
  // signed floors/second, sampled off the easing curve rather than off frame
  // deltas so it stays stable when a frame is dropped
  const d = 0.01;
  const dist = Math.abs(ride.to - ride.from);
  const a = liftEase(Math.max(0, ride.p - d), dist);
  const b = liftEase(Math.min(1, ride.p + d), dist);
  return ((ride.to - ride.from) * (b - a)) / (2 * d) / (ride.dur / 1000);
};

/**
 * @returns {{
 *   subscribe: (fn: (s: RideSnapshot) => void) => () => void,
 *   startRide: (to: number) => boolean,
 *   startCycle: () => boolean,
 *   setInstant: (value: boolean) => void,
 *   setScrub: (scrub: Ride | null) => void,
 *   getSnapshot: () => RideSnapshot,
 *   dispose: () => void,
 * }}
 */
export function createRideTicker() {
  let deckIndex = 0;
  let activeRide = null; // { from, to, p, dur, t0 }
  let scrubOverride = null;
  let rafId = null;
  // NBC-25. A visitor who has asked their machine to stop moving things at them
  // still changes floors; they simply arrive. Held here rather than at the
  // components because the ride is one number that the whole scene reads, and
  // stilling the walls while the doors kept folding through their phases would
  // be two clocks again — see `rideMotion.test.jsx`.
  let instant = false;
  const subscribers = new Set();

  const snapshotOf = (ride) => ({
    floorPos: ride
      ? ride.from + (ride.to - ride.from) * liftEase(ride.p, Math.abs(ride.to - ride.from))
      : deckIndex,
    ride,
    velocity: velocityOf(ride),
    moving: !!ride,
    deckIndex,
  });

  const notify = () => {
    const s = snapshotOf(scrubOverride || activeRide);
    for (const fn of subscribers) fn(s);
  };

  const tick = (now) => {
    if (!activeRide) { rafId = null; return; }
    const p = Math.min(1, (now - activeRide.t0) / activeRide.dur);
    if (p >= 1) {
      deckIndex = activeRide.to;
      activeRide = null;
      rafId = null;
      notify();
      return;
    }
    activeRide = { ...activeRide, p };
    rafId = requestAnimationFrame(tick);
    notify();
  };

  return {
    subscribe(fn) {
      subscribers.add(fn);
      fn(snapshotOf(scrubOverride || activeRide));
      return () => subscribers.delete(fn);
    },
    startRide(to) {
      if (to === deckIndex || activeRide) return false;
      if (instant) {
        // No trip is ever published, so nothing that keys off one — the doors,
        // the blur, the fittings' shading — has anything to play. The one
        // notification carries the destination, which is also what wakes the
        // demand-driven canvases to draw the floor we are suddenly on.
        deckIndex = to;
        notify();
        return true;
      }
      activeRide = { from: deckIndex, to, p: 0, dur: liftDuration(Math.abs(to - deckIndex)), t0: performance.now() };
      notify();
      rafId = requestAnimationFrame(tick);
      return true;
    },
    // NBC-90. The doors shut and open again with the cabin standing still —
    // the gesture a language change hides its repaint behind. It is an ordinary
    // trip in every respect but its destination, which is where it started, so
    // everything already keyed off `ride` plays it without being told: the
    // leaves fold, the landing dims, the canvases stop being looked at. What it
    // is *not* is a change of floor, and `from === to` is what says so — see
    // `doorClosureAt`, which reads that pair rather than being handed a flag.
    //
    // `false` means the doors are not going to move: a trip is already running,
    // or the visitor has asked for no motion at all. Either way the caller has
    // to deal with the repaint itself rather than wait for a cycle that will
    // never come.
    startCycle() {
      if (activeRide || instant) return false;
      activeRide = { from: deckIndex, to: deckIndex, p: 0, dur: liftDuration(0), t0: performance.now() };
      notify();
      rafId = requestAnimationFrame(tick);
      return true;
    },
    setInstant(value) {
      instant = !!value;
    },
    setScrub(scrub) {
      scrubOverride = scrub;
      notify();
    },
    getSnapshot() {
      return snapshotOf(scrubOverride || activeRide);
    },
    dispose() {
      cancelAnimationFrame(rafId);
      subscribers.clear();
    },
  };
}
