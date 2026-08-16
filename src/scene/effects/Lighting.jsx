import { LAYERS } from '../layers.js';
import { CAM_ORIGIN_Y, projectToScreen } from '../model/camera.js';
import { LAMPS } from '../model/lighting.js';
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
function Lighting({ aperture, closure, lamps, vw, vh }) {
  const spill = 1 - closure;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.lighting, pointerEvents: 'none' }}>
      {LAMPS.haze > 0 && lamps.map((L) => {
        const screen = projectToScreen([L.x, L.y, L.z], vw, vh);
        if (screen.y < -vh * 0.5 || screen.y > vh * 1.5) return null;
        const r = LAMPS.size * 2.4 * screen.s;
        const a = LAMPS.haze * 0.3;
        return (
          <div
            key={L.id}
            style={{
              position: 'absolute', left: screen.x - r, top: screen.y - r, width: r * 2, height: r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 50%, rgba(255,208,150,${a.toFixed(3)}) 0%, rgba(255,160,70,${(a * 0.3).toFixed(3)}) 38%, rgba(0,0,0,0) 72%)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
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
