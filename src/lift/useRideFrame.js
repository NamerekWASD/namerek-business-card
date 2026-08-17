import { useEffect, useRef } from 'react';
import { useRideTicker } from './RideTickerContext.js';

/**
 * Subscribes `callback` to the shared ride ticker, so it runs on every ride
 * frame without asking React to re-render for it. `callback` is expected to
 * write straight to a DOM ref it holds — this hook never triggers a render on
 * its own.
 *
 * Only fires while a ride (or a scrub) is actually under way: the ticker's own
 * loop is gated the same way, so nothing here spins a frame loop at rest. The
 * settled/resting look is each caller's own concern — usually a plain
 * `useLayoutEffect` alongside this one, driven by ordinary (throttled) props.
 *
 * The callback does not need to be memoised: the latest one is always used,
 * so an inline arrow function written at the call site is fine.
 *
 * @param {(snapshot: import('./rideTicker.js').RideSnapshot) => void} callback
 */
export default function useRideFrame(callback) {
  const ticker = useRideTicker();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    if (!ticker) return undefined;
    return ticker.subscribe((snapshot) => callbackRef.current(snapshot));
  }, [ticker]);
}
