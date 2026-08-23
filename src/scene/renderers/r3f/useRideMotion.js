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

  // The settled position: mount, resize, and the rest between rides.
  //
  // **It asks the ticker, and never trusts `settled` while there is one.** This
  // is the whole of a judder that has been chased more than once, so it is
  // worth writing down exactly. `settled` is React's mirror of the very number
  // the ticker is already writing here every frame — and a mirror is always a
  // commit behind, because React schedules its work off the ticker's own
  // notification rather than inside it. So during a ride this transform has two
  // writers: the ticker's callback, with this frame's position, and this
  // effect, with the previous one. Measured on a four-floor trip, the shaft
  // stepped *backwards* by a frame's worth of travel every time React committed
  // — about one frame in three — which is a judder, not a flicker, but it lands
  // hardest at the end of a trip where the ride profile's own overshoot is
  // already reversing direction, and it moves the doorway against the leaves
  // opening inside it.
  //
  // Reading the live snapshot makes the two writers agree by construction
  // rather than by luck of ordering. `settled` stays as the answer for a scene
  // with no ticker at all — tests, and any renderer that has not got one yet —
  // and is still what re-runs this effect, which is exactly what it is good
  // for: knowing that something changed.
  // It also hands the write the ticker's *snapshot*, not `null`. Passing `null`
  // said "there is no trip under way", and this effect runs whenever React
  // commits — including in the middle of one. A writer that believes it is at
  // rest computes a rest state, and for the doors that meant reading the floor
  // we had just left and slamming a two-thirds-open leaf shut for exactly one
  // frame. `null` stays the answer only where there is genuinely nothing to
  // ask, which is a scene with no ticker at all.
  useLayoutEffect(() => {
    if (ref.current) {
      const snapshot = ticker ? ticker.getSnapshot() : null;
      writeRef.current(ref.current, snapshot ? snapshot.floorPos : settled, snapshot);
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, invalidate, ticker, ...deps]);

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
