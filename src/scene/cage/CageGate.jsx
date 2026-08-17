import { memo } from 'react';
import { CAGE_GATE } from '../model/materials.js';
import { CAGE_NEAR, CAGE_DEPTH } from '../model/geometry.js';

// The scissor gate. A lattice beats a row of uprights for the same reason the
// guide rail never worked: a vertical bar facing the viewer has no convergence
// available to it, while a diamond has its corners at four different points and
// the whole mesh compresses toward the far end. Painted into a plane that runs
// along the depth, that compression is the projection's own doing — nothing here
// is hand-tuned. It also stops the cage reading as a cell.
const CageGate = memo(function CageGate({ x, top, height, dir, nearShade, farShade }) {
  const gate = CAGE_GATE;
  const mesh = (deg, colour, t) =>
    `repeating-linear-gradient(${deg}deg, ${colour} 0 ${t}px, rgba(0,0,0,0) ${t}px ${gate.pitch}px)`;
  // The two ends used to carry hand-set darkness. Now the overall level rides on
  // a brightness filter and the gradient carries only the *ratio* between the
  // ends — otherwise the two would be counting the same light twice, and the
  // gate would go black the moment it moved away from a lamp.
  const brightest = Math.max(nearShade, farShade, 0.001);
  const contrast = Math.max(0, Math.min(0.92, 1 - Math.min(nearShade, farShade) / brightest));
  const shadeOverlay = (s) => (s < brightest ? contrast : 0).toFixed(3);
  return (
    <div
      style={{
        position: 'absolute', top, height,
        left: dir > 0 ? x : x - CAGE_DEPTH,
        width: CAGE_DEPTH,
        transformOrigin: dir > 0 ? '0% 50%' : '100% 50%',
        transform: `translateZ(${CAGE_NEAR}px) rotateY(${dir * 90}deg)`,
        backgroundImage: [
          // local +x runs away from us on the left gate and toward us on the
          // right one, which is why the ends are ordered by `dir`
          `linear-gradient(90deg, rgba(6,4,2,${shadeOverlay(dir > 0 ? nearShade : farShade)}), rgba(6,4,2,${shadeOverlay(dir > 0 ? farShade : nearShade)}))`,
          mesh(58, gate.bar, gate.thickness),
          mesh(-58, gate.bar, gate.thickness),
          // a darker pass offset behind, so the flats have some body
          mesh(58, gate.barDark, gate.thickness + 3),
          mesh(-58, gate.barDark, gate.thickness + 3),
        ].join(', '),
        backgroundPosition: '0 0, 0 0, 0 0, 2px 2px, 2px 2px',
        filter: `brightness(${Math.min(1.35, brightest).toFixed(3)})`,
      }}
    />
  );
});

export default CageGate;
