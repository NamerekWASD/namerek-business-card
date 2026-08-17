import { SURFACES } from '../model/materials.js';
import { surfaceStyle } from '../renderers/css3d/surfaceStyle.js';
import { SHAFT_DEPTH } from '../model/camera.js';
import ShaftRivets from '../objects/RivetSeam.jsx';

// One wall of the corridor: a plane hinged at the screen edge and swung a full
// 90° so it genuinely runs away from the viewer. Its CSS width is depth, not
// screen width — the camera decides how much of the screen it covers.
function ShaftWall({ side, vh, pos, floorPx }) {
  const isLeft = side === 'left';
  const overscan = vh * 0.34;
  const span = vh + overscan * 2;
  // the hinge is the screen edge, so for the left wall local x grows with depth
  // and for the right wall it shrinks — measure everything from the hinge side
  const nearEdge = isLeft ? 'left' : 'right';

  return (
    <div
      style={{
        position: 'absolute',
        [isLeft ? 'left' : 'right']: 0,
        top: -overscan,
        width: SHAFT_DEPTH,
        height: span,
        transformOrigin: isLeft ? '0% 50%' : '100% 50%',
        transform: `rotateY(${isLeft ? 90 : -90}deg)`,
        overflow: 'hidden',
        ...surfaceStyle(SURFACES.shaftWall),
        // The texture no longer scrolls. These are the two largest surfaces in
        // the scene and they carry three background layers composited in
        // multiply; moving background-position repainted both of them, whole,
        // every frame. The rivet seams, the lamps and the landings all stream
        // past on transforms, which is more than enough to say "moving" — and a
        // grain at 0.22 strength drifting behind them was never what said it.
        // the far end of the corridor falls away into the dark
        boxShadow: `inset ${isLeft ? '-' : ''}120px 0 140px -40px rgba(0,0,0,0.9)`,
      }}
    >
      {/* the doors used to live here. They mark floors, and a floor is a place
          you arrive at, which is straight ahead — not something sliding past your
          shoulder. The side walls are now just wall: rust, seams, and the sense
          of speed that comes from them streaming. */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, [nearEdge]: 66, width: 3, background: 'var(--brass)', opacity: 0.35 }} />
      <ShaftRivets pos={pos} floorPx={floorPx} depth={50} span={span} nearEdge={nearEdge} />
      <ShaftRivets pos={pos} floorPx={floorPx} phase={23} depth={76} span={span} nearEdge={nearEdge} />
      <ShaftRivets pos={pos} floorPx={floorPx} phase={11} depth={272} span={span} nearEdge={nearEdge} />

    </div>
  );
}

export default ShaftWall;
