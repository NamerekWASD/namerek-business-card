import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Drives an object from the ride, without React in the loop.
 *
 * This is the R3F half of the rule the CSS scene already lives by: a ride is
 * sixty frames a second of one number changing, and pushing that through React
 * state re-renders the whole shaft to move a group. So `write` is handed the
 * ride's own position and is expected to poke the object3D directly.
 *
 * The ticker arrives as an argument rather than out of `RideTickerContext`,
 * and that is not an oversight. Everything under a `<Canvas>` is rendered by a
 * second React reconciler; whether an outer context provider is visible inside
 * it depends on the version and on a bridge, and a scene that silently stops
 * moving because a context went missing is a bad way to find that out. Handing
 * the ticker down as a prop cannot go wrong quietly.
 *
 * `invalidate` is the other R3F particular. The canvases render on demand — at
 * rest this scene is a still picture, and a still picture redrawn sixty times a
 * second is a fan spinning for nothing. R3F redraws whenever React renders,
 * which covers every structural change; a ride frame deliberately changes no
 * React state at all, so it has to ask.
 *
 * @template {import('three').Object3D} T
 * @param {import('../../../lift/rideTicker.js').RideTicker | null} ticker
 * @param {(object: T, floorPos: number, snapshot: import('../../../lift/rideTicker.js').RideSnapshot | null) => void} write
 * @param {number} settled the resting floor position
 * @param {unknown[]} [deps] anything `write` closes over that can change
 * @returns {import('react').RefObject<T | null>}
 */
export default function useRideMotion(ticker, write, settled, deps = []) {
  const ref = useRef(/** @type {T | null} */(null));
  const invalidate = useThree((s) => s.invalidate);
  const writeRef = useRef(write);
  writeRef.current = write;

  // the settled position: mount, resize, and the rest between rides
  useLayoutEffect(() => {
    if (ref.current) writeRef.current(ref.current, settled, null);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, invalidate, ...deps]);

  useEffect(() => {
    if (!ticker) return undefined;
    return ticker.subscribe((snapshot) => {
      if (!ref.current) return;
      writeRef.current(ref.current, snapshot.floorPos, snapshot);
      invalidate();
    });
  }, [ticker, invalidate]);

  return ref;
}
