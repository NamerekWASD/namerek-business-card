import { useLayoutEffect, useRef } from 'react';
import { LAYERS } from '../layers.js';
import { CAM_ORIGIN_Y, SHAFT_DEPTH } from '../model/camera.js';
import { DOORWAY_H_FRAC, BACK_OVERSCAN } from '../model/geometry.js';
import { useRenderer } from '../renderers/RendererContext.js';
import { DECKS } from '../../lift/decks.js';
import useRideFrame from '../../lift/useRideFrame.js';
import Doorway from './Doorway.jsx';

// The doorways, in their own camera in front of the content. Two `perspective`
// containers with identical parameters are one camera, so these line up exactly
// with the wall they stand on despite the flat content layer between them.
function Doorways({ vw, vh, pos, floorPx, deck, intro, shake, blurPx }) {
  const { Stage } = useRenderer();
  const overscan = vh * BACK_OVERSCAN;
  const here = Math.round(pos);
  const slots = [here - 1, here, here + 1].filter((f) => f >= 0 && f < DECKS.length);
  const filter = blurPx > 0.25 ? 'url(#shaftBlur)' : 'none';

  // The ride rides on this one transform, not on each doorway's `top` — same
  // motion-tier treatment as `ShaftBack`'s group. `pos` still decides `slots`
  // above, which only needs to be right to the nearest floor.
  const groupRef = useRef(null);
  const writeTravel = (p) => {
    if (groupRef.current) groupRef.current.style.transform = `translate3d(0, ${(p * floorPx).toFixed(1)}px, ${-SHAFT_DEPTH}px)`;
  };
  useLayoutEffect(() => writeTravel(pos), [pos, floorPx]);
  useRideFrame(({ floorPos }) => writeTravel(floorPos));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.doorways, pointerEvents: 'none', overflow: 'hidden', filter }}>
      <Stage>
          <div
            ref={groupRef}
            style={{
              position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
              transformStyle: 'preserve-3d',
            }}
          >
            {slots.map((f) => (
              <Doorway
                key={f}
                vw={vw}
                vh={vh}
                top={overscan - f * floorPx + vh * CAM_ORIGIN_Y - (vh * DOORWAY_H_FRAC) / 2}
                floor={f}
                deck={deck}
                intro={intro}
                shake={shake}
              />
            ))}
          </div>
      </Stage>
    </div>
  );
}

export default Doorways;
