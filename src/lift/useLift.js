import { useEffect, useRef, useState } from 'react';
import { liftDuration, liftEase } from './ride.js';

/**
 * @typedef {{ from: number, to: number, p: number, dur: number }} Ride
 */

/**
 * The cabin. Owns which deck we are on, the trip currently under way, and the
 * hand-driven stand-in for one.
 *
 * @returns {{
 *   deckIndex: number, floorPos: number, velocity: number, moving: boolean,
 *   rideTo: (to: number) => void,
 *   scrub: Ride | null, setScrub: (r: Ride | null) => void,
 *   ride: Ride | null, ridePhase: number | null,
 * }}
 */
export default function useLift() {
  const [deckIndex, setDeckIndex] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  // a hand-driven stand-in for `activeRide`, so the ride can be frozen and
  // dragged frame by frame while tuning the easing — same trick the door intro
  // uses
  const [scrub, setScrub] = useState(null);
  const rafRef = useRef(null);

  const rideTo = (to) => {
    if (to === deckIndex || activeRide) return;
    const from = deckIndex;
    const dur = liftDuration(Math.abs(to - from));
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      if (p >= 1) {
        setActiveRide(null);
        setDeckIndex(to);
        return;
      }
      setActiveRide({ from, to, p, dur });
      rafRef.current = requestAnimationFrame(tick);
    };
    setActiveRide({ from, to, p: 0, dur });
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const ride = scrub || activeRide;
  const floorPos = ride ? ride.from + (ride.to - ride.from) * liftEase(ride.p) : deckIndex;

  // signed floors/second, sampled off the easing curve rather than off frame
  // deltas so it stays stable when a frame is dropped
  let velocity = 0;
  if (ride) {
    const d = 0.01;
    const a = liftEase(Math.max(0, ride.p - d));
    const b = liftEase(Math.min(1, ride.p + d));
    const dur = ride.dur || liftDuration(Math.abs(ride.to - ride.from));
    velocity = (ride.to - ride.from) * ((b - a) / (2 * d)) / (dur / 1000);
  }

  // `ridePhase` is raw (un-eased) ride progress, which is what the doors key
  // off: they need to track the phases of the trip, not the distance covered
  return {
    deckIndex,
    floorPos,
    velocity,
    rideTo,
    moving: !!ride,
    scrub,
    setScrub,
    ride,
    ridePhase: ride ? ride.p : null,
  };
}
