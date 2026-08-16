import { roomLightAt } from '../../model/lighting.js';
import { ironFace } from './surfaceStyle.js';

// A box with three faces showing: the one facing us, the top, and the side
// turned toward the middle of the corridor.
//
// It is turned on its axis, and that is the load-bearing part. Built square to
// the camera these came out as flat rectangles, and the reason is worth writing
// down: the corridor is about four hundred pixels behind a camera a thousand
// four hundred out, so the projection there is very nearly orthographic. A box
// square to the wall converges by three percent — its side face works out at
// seven pixels and its top at two. The geometry was right and the picture was
// unchanged. Convergence is not available at that distance, so what makes a
// distant solid read is the *corner*: two faces at a real angle, in two
// different tones. Yaw supplies the angle, `roomLightAt` supplies the tones, and
// perspective contributes nothing either way.
//
// This is the CSS-3D renderer's implementation of the seam's `Solid` — every
// caller reaches it through `useRenderer()`, never by importing this file
// directly, so a second (e.g. R3F) implementation can stand in without any
// caller changing.
function Solid({ left, top, w, h, d, yaw = 14, tex = ironFace, scale = 50, tint = 1, children, extras }) {
  const rad = (yaw * Math.PI) / 180;
  const sinYaw = Math.sin(rad);
  const cosYaw = Math.cos(rad);
  const faceStyle = (n) => tex(scale, roomLightAt(n) * tint);
  // Every face is built and the browser decides which ones you see, via
  // backface-visibility — which is just back-face culling under another name.
  //
  // Picking the visible side by hand was wrong and could not be made right. It
  // was chosen from the sign of the yaw, but which side shows depends just as
  // much on which side of the camera axis the object stands: an object left of
  // centre is looked at from its right, however it is turned. Move a prop across
  // the corridor and the hand-picked side becomes the hidden one, leaving an
  // open corner. The GPU already knows the answer to this.
  const cull = { backfaceVisibility: 'hidden' };
  const side = (which) => ({
    position: 'absolute', left: (which > 0 ? w : 0) - d / 2, top: 0, width: d, height: h,
    transform: `translateZ(${d / 2}px) rotateY(${which * 90}deg)`,
    ...faceStyle([which * cosYaw, 0, -which * sinYaw]),
    ...cull,
  });
  return (
    // Stood off the wall by exactly how far the yaw swings its far corner back.
    // Without this a turned box sinks into the wall behind it: the corner goes to
    // z = d - w·sin(yaw), and for anything wide and shallow that is well past
    // zero, so the wall occludes most of its own front face. The EG plate lost
    // three quarters of its width that way and still measured full size, because
    // getBoundingClientRect reports the projected box and knows nothing about
    // what is drawn over it — the DOM said 75px and the screen said 20.
    <div
      style={{
        position: 'absolute', left, top, width: 0, height: 0,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${(w * Math.abs(sinYaw)).toFixed(1)}px) rotateY(${yaw}deg)`,
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translateZ(${d}px)`, ...faceStyle([sinYaw, 0, cosYaw]), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.45)' }}>
        {children}
      </div>
      {/* the top. Not culled and no underside built to match: every one of these
          stands below the camera, so the underside is a face nobody can reach.
          Raise a prop above eye level and it will want one. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: d, transformOrigin: '50% 0%', transform: 'rotateX(90deg)', ...faceStyle([0, -1, 0]) }} />
      <div style={side(-1)} />
      <div style={side(1)} />
      {/* Anything bolted to this box rather than standing near it. It goes inside
          the yawed wrapper on purpose, so it inherits the turn and the stand-off
          and cannot drift away from the thing it belongs to when either changes. */}
      {extras}
    </div>
  );
}

export default Solid;
