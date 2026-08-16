import { LAYERS } from '../layers.js';
import { CAM_ORIGIN_Y, SHAFT_DEPTH } from '../model/camera.js';
import { DOORWAY_H_FRAC, BACK_OVERSCAN } from '../model/geometry.js';
import { useRenderer } from '../renderers/RendererContext.js';
import { DECKS } from '../../lift/decks.js';
import { doorClosureAt } from '../../lift/ride.js';
import Doorway from './Doorway.jsx';

// The doorways, in their own camera in front of the content. Two `perspective`
// containers with identical parameters are one camera, so these line up exactly
// with the wall they stand on despite the flat content layer between them.
function Doorways({ vw, vh, pos, floorPx, ride, deck, intro, shake, blurPx }) {
  const { Stage } = useRenderer();
  const travelY = pos * floorPx;
  const overscan = vh * BACK_OVERSCAN;
  const here = Math.round(pos);
  const slots = [here - 1, here, here + 1].filter((f) => f >= 0 && f < DECKS.length);
  const filter = blurPx > 0.25 ? 'url(#shaftBlur)' : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.doorways, pointerEvents: 'none', overflow: 'hidden', filter }}>
      <Stage>
          <div
            style={{
              position: 'absolute', left: 0, top: -overscan, width: vw, height: vh + overscan * 2,
              // the ride rides on this transform, not on each doorway's `top`
              transform: `translate3d(0, ${travelY.toFixed(1)}px, ${-SHAFT_DEPTH}px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {slots.map((f) => {
              // The intro concerns only the floor we are standing at, and only
              // while standing: mid-ride `deck` is still the floor we left, so
              // folding the intro in unconditionally would hold the destination
              // shut all the way to it.
              const shut = doorClosureAt(f, ride, deck);
              return (
                <Doorway
                  key={f}
                  vw={vw}
                  vh={vh}
                  top={overscan - f * floorPx + vh * CAM_ORIGIN_Y - (vh * DOORWAY_H_FRAC) / 2}
                  closure={!ride && f === deck ? Math.max(shut, intro) : shut}
                  shake={shake}
                />
              );
            })}
          </div>
      </Stage>
    </div>
  );
}

export default Doorways;
