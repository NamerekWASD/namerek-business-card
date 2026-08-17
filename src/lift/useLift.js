import { useEffect, useRef, useState } from 'react';
import { createRideTicker } from './rideTicker.js';

/**
 * @typedef {{ from: number, to: number, p: number, dur: number }} Ride
 */

// The reactive tier (which floors are mounted, face shading, the floor
// selector) used to be throttled to a fraction of the ride's frame rate on
// the theory that lamp shading is quantised and would not read as different
// a few times a second. It reads as different: throttling it left the content
// and lighting visibly trailing the walls and doors, which move on the
// ticker's own frame rate. Content sitting still while its frame moves reads
// as broken, not as an optimisation — so this tier commits on every ride
// frame again, same as the motion tier. What made that afford-able is on the
// components themselves now: see the `memo` comparators in `CageFront`'s
// family and `Lamp`, which turn "recomputed every frame" back into "skipped
// most frames" without touching how often it is *asked* to.

/**
 * The cabin. Owns which deck we are on and the trip currently under way,
 * fronting a `rideTicker` that does the actual per-frame arithmetic outside
 * React. What this hook hands back to its caller is a *throttled* view of
 * that ticker — plenty for anything that isn't itself a transform. Components
 * that need the live position every frame read the ticker directly through
 * `useRideFrame`, via the `ticker` this returns.
 *
 * @returns {{
 *   deckIndex: number, floorPos: number, velocity: number, moving: boolean,
 *   rideTo: (to: number) => void,
 *   scrub: Ride | null, setScrub: (r: Ride | null) => void,
 *   ride: Ride | null, ridePhase: number | null,
 *   ticker: ReturnType<typeof createRideTicker>,
 * }}
 */
export default function useLift() {
  const tickerRef = useRef(null);
  if (!tickerRef.current) tickerRef.current = createRideTicker();
  const ticker = tickerRef.current;

  const [scrub, setScrubState] = useState(null);
  const [snapshot, setSnapshot] = useState(() => ticker.getSnapshot());

  useEffect(() => {
    const unsubscribe = ticker.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      ticker.dispose();
    };
  }, [ticker]);

  const setScrub = (value) => {
    setScrubState(value);
    ticker.setScrub(value);
  };

  return {
    deckIndex: snapshot.deckIndex,
    floorPos: snapshot.floorPos,
    velocity: snapshot.velocity,
    moving: snapshot.moving,
    rideTo: (to) => ticker.startRide(to),
    scrub,
    setScrub,
    ride: snapshot.ride,
    // `ridePhase` is raw (un-eased) ride progress, which is what the doors key
    // off: they need to track the phases of the trip, not the distance covered
    ridePhase: snapshot.ride ? snapshot.ride.p : null,
    ticker,
  };
}
