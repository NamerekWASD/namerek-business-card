import { useLayoutEffect, useRef } from 'react';
import { LAYERS } from '../layers.js';
import { CAM_ORIGIN_Y, CAM_PERSPECTIVE, SHAFT_DEPTH } from '../model/camera.js';
import { LAMPS } from '../model/lighting.js';
import useRideFrame from '../../lift/useRideFrame.js';
import { LIGHTS } from './lightSwitches.js';

// The things in front of everything that are not surfaces.
//
// The haze is as close to volumetric as this gets. Real volume means integrating
// the light along the ray, which means a renderer. What this does instead is
// stand one soft disc per lamp on the sight line to that lamp, in front of the
// cage, so the glow washes over the ironwork instead of stopping behind it.
// That buys the one thing volume is actually for here: you can tell there is
// air in the shaft, and a lamp going past sweeps through it.
//
// The landing light spills out of the doorway and therefore only exists while
// the doors are open, which makes arrival read as arrival.
function Lighting({ aperture, closure, pos, floorPx, vw, vh, dim = 1 }) {
  const spill = 1 - closure;

  // The haze rides the ticker, as a repeating run.
  //
  // It used to be `lamps.map(...)` — one disc per entry of a list rebuilt from
  // React's mirror of the ride — and that is the same defect the WebGL fitting
  // row had: the shaft streams past on every frame while React commits a
  // fraction as often, so the glow trailed the lamp it belongs to instead of
  // sitting on it. Everything needed to avoid that is already true here. The
  // fittings sit at one fixed depth, so the perspective divide is a *constant*
  // scale, which makes each disc's screen position linear in the ride position;
  // and they are one per floor, so the row repeats exactly. A fixed handful of
  // discs on a wrapper shifted by the travel modulo one pitch is therefore the
  // same picture, with nothing for React to be late about.
  const scale = CAM_PERSPECTIVE / (CAM_PERSPECTIVE - (-SHAFT_DEPTH + LAMPS.proud));
  const pitch = floorPx * scale;
  const radius = LAMPS.size * 2.4 * scale;
  const hazeX = vw / 2 + (vw * (0.5 - LAMPS.side) - vw / 2) * scale;
  const hazeTop = vh * CAM_ORIGIN_Y - LAMPS.rise * pitch;

  const hazeRef = useRef(null);
  const writeHaze = (floorPos) => {
    if (!hazeRef.current) return;
    const travel = floorPos * pitch;
    hazeRef.current.style.transform = `translateY(${(((travel % pitch) + pitch) % pitch).toFixed(1)}px)`;
  };
  useLayoutEffect(() => writeHaze(pos), [pos, pitch]);
  useRideFrame(({ floorPos }) => writeHaze(floorPos));

  // on the same supply as the fittings themselves: air lit by a lamp that is
  // guttering does not go on glowing steadily
  const alpha = LAMPS.haze * 0.3 * dim;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.lighting, pointerEvents: 'none' }}>
      {LAMPS.haze > 0 && (
        <div ref={hazeRef} style={{ position: 'absolute', inset: 0 }}>
          {[-2, -1, 0, 1, 2].map((k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: hazeX - radius, top: hazeTop - k * pitch - radius,
                width: radius * 2, height: radius * 2,
                borderRadius: '50%',
                background: `radial-gradient(circle at 50% 50%, rgba(255,208,150,${alpha.toFixed(3)}) 0%, rgba(255,160,70,${(alpha * 0.3).toFixed(3)}) 38%, rgba(0,0,0,0) 72%)`,
                mixBlendMode: 'screen',
              }}
            />
          ))}
        </div>
      )}
      {LIGHTS.vignette && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 96% 90% at 50% ${(CAM_ORIGIN_Y * 100).toFixed(0)}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.14) 66%, rgba(6,4,2,0.6) 100%)`,
          }}
        />
      )}
      {LIGHTS.landing && spill > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: aperture.left - aperture.width * 0.3, top: aperture.top - aperture.height * 0.25,
            width: aperture.width * 1.6, height: aperture.height * 1.5,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(255,186,104,0.20) 0%, rgba(255,170,80,0.07) 45%, rgba(0,0,0,0) 72%)',
            mixBlendMode: 'screen',
            opacity: spill.toFixed(3),
          }}
        />
      )}
    </div>
  );
}

export default Lighting;
