import { LAYERS } from '../layers.js';
import { LAMPS, lightAt } from '../model/lighting.js';
import { COUNTERWEIGHT_Z, COUNTERWEIGHT_INSET_X, counterweightY } from '../model/geometry.js';
import { useRenderer } from '../renderers/RendererContext.js';
import Lamp from '../objects/Lamp.jsx';
import Counterweight from '../objects/Counterweight.jsx';
import ShaftCable from '../objects/ShaftCable.jsx';
import HoistRopes from '../objects/HoistRopes.jsx';
import ShaftBack from './ShaftBack.jsx';
import ShaftWall from './ShaftWall.jsx';

// Everything that lives in the shaft, under one camera. The blur sits on the
// wrapper *outside* the perspective element on purpose: `filter` flattens the
// 3D rendering context of the element it is applied to, so putting it any
// deeper would collapse the whole scene back into decals.
function Shaft({ vw, vh, pos, floorPx, backFloorPx, blurPx, lamps, ride, deck, intro }) {
  const { Stage } = useRenderer();
  // the counterweight is shaft furniture, not the subject. Knocked back, it
  // reads as texture instead of demanding attention it cannot repay.
  const dim = 0.62;
  const cwHeight = vh * 1.15;
  // Shading only — a throttled estimate of where the counterweight sits, good
  // enough for which lamp lights it. The counterweight's actual on-screen
  // position is motion tier now; see `Counterweight.jsx`/`HoistRopes.jsx`.
  const cwY = counterweightY(pos, floorPx, cwHeight);
  const wallFilter = blurPx > 0.25 ? `url(#shaftBlur) brightness(${(1 - Math.min(0.2, blurPx * 0.02)).toFixed(3)})` : 'none';

  // This is where `dim` used to be applied — as a `filter` on the group holding
  // the object. That was the bug underneath the counterweight and the old rail
  // both. A filter forces the used value of transform-style to flat, so those
  // groups rendered with their 3D collapsed: every face was being drawn into a
  // single plane, which is why neither ever read as a solid however the tones
  // were tuned. It has to travel with the faces instead.
  const shadeAt = (at, dir) => ({
    front: (lightAt(at, [0, 0, 1], lamps) / 0.8) * dim,
    side: (lightAt(at, [dir, 0, 0], lamps) / 0.8) * dim,
    top: (lightAt(at, [0, -1, 0], lamps) / 0.8) * dim,
    under: (lightAt(at, [0, 1, 0], lamps) / 0.8) * dim,
  });
  const cwShade = shadeAt([vw - COUNTERWEIGHT_INSET_X, Math.max(0, cwY + cwHeight - 200), COUNTERWEIGHT_Z], -1);

  return (
    // `overflow: hidden` is here for the filter, not for the layout. A CSS
    // filter has to rasterise the element's rendered content before it can
    // convolve it, and that content is not the screen — it is everything the
    // subtree paints, including a back wall overscanned to 2.4 viewports and the
    // hoist ropes. Clipping first means the blur works on a screen-sized texture
    // instead of whatever the scene happens to sprawl to. Safe on this element
    // because it carries neither a transform nor preserve-3d; the camera is on
    // the child.
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.shaft, pointerEvents: 'none', overflow: 'hidden', filter: wallFilter }}>
      <Stage>
        {/* no camera move on the intro: we are already standing in the cage, so
            riding forward into it was describing an approach that never happens */}
          <ShaftBack vw={vw} vh={vh} pos={pos} floorPx={backFloorPx} ride={ride} deck={deck} intro={intro} />
          <ShaftWall side="left" vh={vh} pos={pos} floorPx={floorPx} />
          <ShaftWall side="right" vh={vh} pos={pos} floorPx={floorPx} />

          {/* the cable, running down past the lamps it feeds. It is drawn before
              them so it disappears behind each fitting and comes out below,
              which is the only part of a wiring run anyone ever notices. */}
          <ShaftCable vh={vh} x={vw * (0.5 - LAMPS.side)} pos={pos} floorPx={backFloorPx} />

          {/* the counterweight runs in its own guides on the far side */}
          <div
            style={{
              position: 'absolute', top: 0, left: vw - COUNTERWEIGHT_INSET_X, width: 0, height: 0,
              transformStyle: 'preserve-3d', transform: `translateZ(${COUNTERWEIGHT_Z}px)`,
            }}
          >
            <HoistRopes pos={pos} floorPx={floorPx} height={cwHeight} vh={vh} dim={dim} />
            <Counterweight pos={pos} floorPx={floorPx} height={cwHeight} dir={-1} shade={cwShade} />
          </div>

          {/* the lamps, bolted to the far wall either side of every doorway.
              They are the only light in here, so they are also the only reason
              anything else in the shaft is visible at all. */}
          {lamps.map((L) => (
            <Lamp key={L.id} p={L} lamps={lamps} />
          ))}
      </Stage>
    </div>
  );
}

export default Shaft;
