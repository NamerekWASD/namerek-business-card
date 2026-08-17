import { memo } from 'react';
import { CAGE_NEAR, CAGE_FAR, CAGE_DEPTH } from '../model/geometry.js';
import { ironFace } from '../renderers/css3d/surfaceStyle.js';

// A hand rail running the length of the cage. Built the same way as a shaft wall:
// a plane hinged at the near end and swung 90°, so its CSS width is depth.
const CageRail = memo(function CageRail({ x, y, dir, h = 13, sideShade, topShade }) {
  const D = 18;
  const hinge = dir > 0 ? '0% 50%' : '100% 50%';
  return (
    <>
      <div
        style={{
          position: 'absolute', top: y, left: dir > 0 ? x : x - CAGE_DEPTH,
          width: CAGE_DEPTH, height: h,
          transformOrigin: hinge,
          transform: `translateZ(${CAGE_NEAR}px) rotateY(${dir * 90}deg)`,
          ...ironFace(48, sideShade),
        }}
      />
      {/* the rail sits below eye level, so the face we look at is its top */}
      <div
        style={{
          position: 'absolute', top: y, left: x - D / 2, width: D, height: CAGE_DEPTH,
          transformOrigin: '50% 0%',
          transform: `translateZ(${CAGE_FAR}px) rotateX(90deg)`,
          ...ironFace(38, topShade),
        }}
      />
    </>
  );
});

export default CageRail;
