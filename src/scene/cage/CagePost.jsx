import { ironFace } from '../renderers/css3d/surfaceStyle.js';

// A corner post. Two faces: the one pointing at the camera and the inboard side,
// which is the one that actually varies as the post moves along the depth.
function CagePost({ z, x, top, height, dir, shade }) {
  const W = 15;
  const D = 20;
  return (
    <div
      style={{
        position: 'absolute', top, left: x, width: 0, height: 0,
        transformStyle: 'preserve-3d', transform: `translateZ(${z}px)`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: -W / 2, width: W, height, transform: `translateZ(${D / 2}px)`, ...ironFace(58, shade.front) }} />
      <div style={{ position: 'absolute', top: 0, left: (dir > 0 ? W / 2 : -W / 2) - D / 2, width: D, height, transform: `rotateY(${dir * 90}deg)`, ...ironFace(44, shade.side * 0.92) }} />
    </div>
  );
}

export default CagePost;
