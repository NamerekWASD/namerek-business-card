import { ROOM_LIGHT } from '../model/lighting.js';

// The cue every prop in the corridor and every flat panel outside it has been
// missing: a soft patch on the surface an object stands on or hangs against,
// leaning away from the same `ROOM_LIGHT` this file already shades every face
// by. Not a projected silhouette — that is a real per-object geometry problem,
// different for a crate and a picture frame — just the one signal that is
// cheap everywhere and currently nowhere, which is why props read as pasted on
// rather than standing in the room. `lean` scales how far it drifts off-centre;
// leave it at 1 and it agrees with `roomLightAt` on where the light is.
function ContactShadow({ w, h = Math.round(w * 0.34), lean = 1, opacity = 0.4, x = '50%', bottom }) {
  const dx = -ROOM_LIGHT[0] * 16 * lean;
  const dy = -ROOM_LIGHT[1] * 16 * lean;
  return (
    <div
      style={{
        position: 'absolute', left: x, bottom: bottom ?? -h * 0.4,
        width: w, height: h,
        transform: `translate(calc(-50% + ${dx.toFixed(1)}px), ${dy.toFixed(1)}px)`,
        background: `radial-gradient(closest-side, rgba(0,0,0,${opacity}), rgba(0,0,0,0) 75%)`,
        pointerEvents: 'none',
      }}
    />
  );
}

export default ContactShadow;
