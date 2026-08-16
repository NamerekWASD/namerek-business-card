import { memo } from 'react';
import { SURFACES } from '../model/materials.js';
import { surfaceStyle } from '../renderers/css3d/surfaceStyle.js';
import { ARCHITRAVE_DEPTH, ARCHITRAVE_MEMBER_W, DOORWAY_H_FRAC, DOORWAY_W_FRAC, FRAME_TIERS } from '../model/geometry.js';

// The architrave, standing proud of the wall. It is a separate memoized piece
// because it is the heaviest static thing in the scene and it was being rebuilt
// on every frame for nothing: four members carrying forty-four bolts, three
// doorways in view, a hundred and thirty-two elements and their style objects
// created per frame so that React could compare them and find them identical.
// Its geometry depends on the viewport and nothing else — the `top` that moves
// belongs to the container above it.
const Architrave = memo(function Architrave({ vw, vh }) {
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  return FRAME_TIERS.flatMap((tier, ti) => {
    const m = ARCHITRAVE_MEMBER_W * tier.m;
    const face = surfaceStyle(SURFACES.doorFrame, tier.shade);
    const outer = ti === 0;
    return [
      { l: left - m, t: -m, w: w + m * 2, h: m },
      { l: left - m, t: h, w: w + m * 2, h: m },
      { l: left - m, t: 0, w: m, h },
      { l: left + w, t: 0, w: m, h },
    ].map((b, i) => (
    <div
      key={`${ti}-${i}`}
      style={{
        position: 'absolute', left: b.l, top: b.t, width: b.w, height: b.h,
        transform: `translateZ(${ARCHITRAVE_DEPTH * tier.z}px)`,
        ...face,
        boxShadow: outer
          ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(0,0,0,0.5), 0 6px 22px rgba(0,0,0,0.75)'
          : 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(0,0,0,0.55), 0 3px 10px rgba(0,0,0,0.7)',
      }}
    >
      {/* Bolts down the member, spaced along whichever way it runs. Only on the
          outermost tier: the inner steps are the same casting stepped back, so
          bolting each one separately would be three fixings for one member. */}
      {outer && Array.from({ length: b.w > b.h ? 14 : 8 }).map((_, k, arr) => (
        <span
          key={k}
          style={{
            position: 'absolute',
            left: b.w > b.h ? `${((k + 0.5) / arr.length) * 100}%` : '50%',
            top: b.w > b.h ? '50%' : `${((k + 0.5) / arr.length) * 100}%`,
            width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: '50%',
            background: 'var(--rivet)',
            boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
    ));
  });
});

export default Architrave;
