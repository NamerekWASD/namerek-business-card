import { useLayoutEffect, useRef } from 'react';
import { useRideTicker } from '../lift/RideTickerContext.js';
import useRideFrame from '../lift/useRideFrame.js';
import { landingReveal } from '../scene/model/geometry.js';

/**
 * One floor's content, seen through that floor's own hole in the masonry.
 *
 * The deck text is a flat DOM layer, and for a long time the only thing that
 * clipped it was the cage's opening — one fixed rectangle on screen. That is
 * not where the text is. The text is printed on the landing's back wall, and a
 * visitor looks at it through the doorway cut into the shaft wall in front of
 * it: two planes, at two depths, so two rates on screen. The hole is the nearer
 * of the two and therefore the faster, and it is what has to hide the text —
 * mid-ride the brick between two landings should be standing in front of a
 * heading long before that heading has drifted out of the cage's opening. It
 * was not, so headings from the floor being passed flickered across the wall.
 *
 * So there are two transforms here rather than one, and both are written from
 * the ticker every ride frame: the opening travels at the masonry's rate and
 * clips, and the wall inside it makes up the difference so that the text itself
 * ends up travelling at the landing wall's. See `landingReveal`.
 *
 * @param {object} props
 * @param {number} props.floor which deck this is
 * @param {number} props.settled the resting floor position, for a scene with no ticker
 * @param {number} props.floorPitch one floor, in screen pixels, at the cage
 * @param {number} props.height the opening's height on screen
 * @param {number} [props.rise] this floor's lift off centre, as a fraction of `height`
 * @param {boolean} [props.active] whether this is the floor being stood on
 * @param {import('react').ReactNode} props.children
 */
export default function DeckReveal({
  floor, settled, floorPitch, height, rise = 0, active = true, children,
}) {
  const holeRef = useRef(null);
  const wallRef = useRef(null);
  const ticker = useRideTicker();

  const write = (floorPos) => {
    const { hole, wall } = landingReveal(floorPitch, floorPos - floor);
    if (holeRef.current) holeRef.current.style.transform = `translateY(${hole.toFixed(1)}px)`;
    // The wall is written relative to the opening it is seen through, because it
    // is a child of it: what the eye reads is the sum of the two.
    if (wallRef.current) {
      wallRef.current.style.transform = `translateY(${(wall - rise * height - hole).toFixed(1)}px)`;
    }
  };
  // Mount, resize, and the rest between rides — off the ticker even here, for
  // the reason `useRideMotion` states at length: React's mirror of the ride is
  // always a commit behind, and a settled write taken from it disagrees with the
  // per-frame ones by up to a throttle step.
  useLayoutEffect(() => {
    const snapshot = ticker?.getSnapshot();
    write(snapshot ? snapshot.floorPos : settled);
  });
  useRideFrame(({ floorPos }) => write(floorPos));

  return (
    <div
      ref={holeRef}
      inert={!active}
      aria-hidden={!active}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        // Both of these move every frame and nothing else about them changes, so
        // they are the compositor's business and not the main thread's.
        willChange: 'transform',
      }}
    >
      <div
        ref={wallRef}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '1.4rem 5.8rem', boxSizing: 'border-box',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
