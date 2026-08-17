import { useLayoutEffect, useRef } from 'react';
import { counterweightY } from '../model/geometry.js';
import useRideFrame from '../../lift/useRideFrame.js';

// Ropes run from the sheave at the top of the shaft down to the crosshead and
// stop there — drawn past it they read as the block dangling from below.
//
// The crosshead they terminate at is the counterweight's own live position, so
// this is motion tier too, in lockstep with `Counterweight.jsx` — a rope whose
// end lagged the block it is tied to by even a throttle step would visibly
// tear away from it during a fast ride.
const TOP = -320;

function HoistRopes({ pos, floorPx, height: cwHeight, vh, dim = 1 }) {
  const refs = [useRef(null), useRef(null), useRef(null)];
  const write = (p) => {
    // Bounded to a little either side of the viewport. These were eight
    // thousand pixels tall and their height was rewritten every frame — and
    // they sit inside the subtree the motion blur filters, so that height is
    // not just a big element, it is the size of the texture the blur has to
    // rasterise before it can convolve anything. A rope you cannot see is
    // still a rope the compositor has to draw.
    const bottom = counterweightY(p, floorPx, cwHeight) - 15;
    const end = Math.min(bottom, vh + 240);
    const h = Math.max(0, end - TOP);
    for (const ref of refs) {
      if (!ref.current) continue;
      ref.current.style.height = `${h}px`;
      ref.current.style.display = h <= 0 ? 'none' : 'block';
    }
  };
  useLayoutEffect(() => write(pos), [pos, floorPx, cwHeight, vh]);
  useRideFrame(({ floorPos }) => write(floorPos));

  const dimmed = (c) => Math.round(c * dim);
  return [-16, 0, 16].map((dx, i) => (
    <div
      key={dx}
      ref={refs[i]}
      style={{
        position: 'absolute', top: TOP, left: dx - 2, width: 4,
        transform: 'translateZ(22px)',
        // A rope is the one thing here that is genuinely a line, so it keeps its
        // painted highlight — there is no third face on a 4px cable to find.
        background: `linear-gradient(90deg, rgb(${dimmed(20)},${dimmed(23)},${dimmed(26)}), rgb(${dimmed(152)},${dimmed(163)},${dimmed(171)}) 50%, rgb(${dimmed(20)},${dimmed(23)},${dimmed(26)}))`,
      }}
    />
  ));
}

export default HoistRopes;
