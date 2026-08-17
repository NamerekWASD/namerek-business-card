import { useLayoutEffect, useRef } from 'react';
import rustBrass from '../../assets/textures/rust-brass.jpg';
import { SURFACES } from '../model/materials.js';
import { surfaceStyle } from '../renderers/css3d/surfaceStyle.js';
import { ARCHITRAVE_DEPTH, DOORWAY_H_FRAC, DOORWAY_W_FRAC } from '../model/geometry.js';
import { doorClosureAt } from '../../lift/ride.js';
import useRideFrame from '../../lift/useRideFrame.js';
import Architrave from './Architrave.jsx';

// The doorway of one floor: architrave, leaves, indicator. It lives in its own
// layer in front of the content, because the content sits on the landing wall
// and doors that cannot cover it are not doors.
//
// `floor`/`deck`/`intro`/`shake` replace what used to be one precomputed
// `closure` prop: opening and closing is as sharp a motion cue as the walls
// streaming past, so it gets the same motion-tier treatment — computed and
// written to the leaves every ride frame via the ticker, rather than through
// a prop that would ask this component to re-render for it. `intro`/`shake`
// still arrive as ordinary props: they only move during the once-only door
// intro, not on every ride, so there is nothing to gain by pulling them off
// the ticker too, and the intro clock is not what this scene's rides drive.
function Doorway({ vw, vh, top, floor, deck, intro, shake }) {
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  const leafRefs = [useRef(null), useRef(null)];
  const writeLeaves = (ride) => {
    const shut = doorClosureAt(floor, ride, deck);
    const closure = !ride && floor === deck ? Math.max(shut, intro) : shut;
    for (const s of [0, 1]) {
      const node = leafRefs[s].current;
      if (!node) continue;
      const pct = ((s ? 1 - closure : closure - 1) * 100).toFixed(2);
      const px = ((s ? 1 : -1) * shake).toFixed(2);
      node.style.transform = `translateX(calc(${pct}% + ${px}px))`;
    }
  };
  useLayoutEffect(() => writeLeaves(null), [floor, deck, intro, shake]);
  // Only the in-progress ticks belong here. The tick that settles a ride
  // notifies with `ride: null` in the same synchronous pass that updates the
  // ticker's own deck — but this component's `deck` *prop* has not been
  // re-rendered with that new value yet, so computing the rest state right
  // then reads the floor we just left, not the one we arrived at, and the
  // door this component belongs to slams shut for one frame before the real
  // re-render (driven by the layout effect above) corrects it. Leaving the
  // settle notification alone and letting that re-render own the rest state
  // is what a plain prop-driven Doorway did all along; the last in-progress
  // tick has already eased the arriving floor to within a hair of open, so
  // there is nothing to hand off but that correction, and it is instant.
  useRideFrame(({ ride }) => { if (ride) writeLeaves(ride); });
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
            ref={leafRefs[s]}
            style={{
              position: 'absolute', top: 0, height: '100%', width: '50%',
              left: s ? '50%' : 0,
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
