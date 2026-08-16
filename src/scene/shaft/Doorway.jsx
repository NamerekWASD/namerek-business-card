import rustBrass from '../../assets/textures/rust-brass.jpg';
import { SURFACES } from '../model/materials.js';
import { surfaceStyle } from '../renderers/css3d/surfaceStyle.js';
import { ARCHITRAVE_DEPTH, DOORWAY_H_FRAC, DOORWAY_W_FRAC } from '../model/geometry.js';
import Architrave from './Architrave.jsx';

// The doorway of one floor: architrave, leaves, indicator. It lives in its own
// layer in front of the content, because the content sits on the landing wall
// and doors that cannot cover it are not doors.
function Doorway({ vw, vh, top, closure, shake }) {
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  // The returns are graded along their own depth — bright at the front edge
  // where the cage lamp reaches them, dark where they meet the wall. This is the
  // one lighting cue a flat face can carry honestly, because here the gradient
  // really does run along the z axis.
  const ret = (nearFirst, horiz) => ({
    backgroundImage:
      `linear-gradient(${horiz ? '180deg' : '90deg'}, ${nearFirst ? '#c99a5c, #2a1d10' : '#2a1d10, #c99a5c'}), url(${rustBrass})`,
    backgroundSize: 'auto, 70px 70px',
    backgroundBlendMode: 'soft-light',
  });

  return (
    <div style={{ position: 'absolute', left: 0, top, width: vw, height: h, transformStyle: 'preserve-3d' }}>
      {/* the leaves, set back inside the frame */}
      <div style={{ position: 'absolute', left, top: 0, width: w, height: h, overflow: 'hidden', transform: `translateZ(${ARCHITRAVE_DEPTH * 0.34}px)` }}>
        {[0, 1].map((s) => (
          <div
            key={s}
            style={{
              position: 'absolute', top: 0, height: '100%', width: '50%',
              left: s ? '50%' : 0,
              transform: `translateX(calc(${((s ? 1 - closure : closure - 1) * 100).toFixed(2)}% + ${((s ? 1 : -1) * shake).toFixed(2)}px))`,
              ...surfaceStyle(SURFACES.doorLeaf),
              boxShadow: `inset 0 0 30px rgba(0,0,0,0.75), ${s ? '-' : ''}4px 0 16px rgba(0,0,0,0.85)`,
            }}
          >
            <div style={{ position: 'absolute', top: '7%', bottom: '7%', [s ? 'left' : 'right']: 10, width: 3, background: 'rgba(0,0,0,0.6)' }} />
            <div
              style={{
                position: 'absolute', left: '8%', right: '8%', bottom: '7%', height: 13,
                backgroundImage: 'repeating-linear-gradient(45deg, #b8862a 0px, #b8862a 9px, #241a10 9px, #241a10 18px)',
                opacity: 0.7,
              }}
            />
            {/* the mark that used to live on the intro's own doors — it belongs
                on the real ones, where it is legible every time they close */}
            <div
              style={{
                position: 'absolute', top: '42%', [s ? 'left' : 'right']: '14%',
                fontFamily: 'var(--mono)', fontSize: 15, letterSpacing: 3,
                color: 'rgba(196,150,86,0.34)', textShadow: '0 1px 0 rgba(0,0,0,0.7)',
              }}
            >
              {s ? 'Nr. 001' : 'MT'}
            </div>
          </div>
        ))}
      </div>

      {/* The returns, bridging the frame's front back to the wall — head and
          sill only. The two upright ones are gone: they were the last vertical
          wall surface left at the sides of the opening, and a lit panel standing
          exactly where the corridor is supposed to run out is a wall, whatever
          it is called in the code. Now the cut is clean and the passage carries
          on past both edges. */}
      <div style={{ position: 'absolute', left, top: 0, width: w, height: ARCHITRAVE_DEPTH, transformOrigin: '50% 0%', transform: `translateZ(${ARCHITRAVE_DEPTH}px) rotateX(-90deg)`, ...ret(true, true) }} />
      <div style={{ position: 'absolute', left, top: h, width: w, height: ARCHITRAVE_DEPTH, transformOrigin: '50% 0%', transform: 'rotateX(90deg)', ...ret(false, true) }} />

      <Architrave vw={vw} vh={vh} />
    </div>
  );
}

export default Doorway;
