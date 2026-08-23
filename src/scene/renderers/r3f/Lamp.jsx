import { memo } from 'react';
import { AdditiveBlending, DoubleSide } from 'three';
import { LAMPS } from '../../model/lighting.js';
import { SHAFT_DEPTH } from '../../model/camera.js';
import { SURFACES } from '../../model/materials.js';
import { surfaceProps } from './surfaceMaterial.js';
import { useLightTuning } from './tuning.js';
import { worldY } from './camera.js';
import { lampGlow } from './patterns.js';

/** @import { Lamp as LampSpec } from '../../model/types.js' */

// A bulkhead fitting on the shaft wall — and, importantly, **not a light**.
//
// There are three or four of these in frame at once and the scene is allowed two
// physical sources, so what they are is emissive geometry: a glass bright enough
// to read as lit, and a halo standing in for the bloom a real lens would give
// it. The one light that stands for the whole row lives in `lighting.js` and
// floats among them.
//
// That split is why this reads as a row of lamps rather than a row of lamp
// *pictures*: the fittings are where the light appears to come from, and the
// light genuinely comes from among the fittings, so nothing has to agree with
// anything by hand.
//
// The CSS version builds its cylinder out of ten shaded quads because it has no
// lights to round it for it. Here it is a cylinder.
const Lamp = memo(function Lamp({ p, dim = 1 }) {
  // Subscribed, not read. `memo` below blocks re-renders driven by the parent,
  // which is what makes a ride cheap; it does not block one driven by a hook
  // inside, which is what makes the bench's sliders reach this component at all.
  const tuning = useLightTuning();
  const radius = LAMPS.size / 2;
  const proud = LAMPS.proud;
  const iron = surfaceProps(SURFACES.iron, 1);
  const glow = lampGlow();
  const wall = -SHAFT_DEPTH;

  return (
    <group position={[p.x, worldY(p.y), 0]}>
      {/* The housing: the cast base bolted to the wall, and the body standing
          off it. Neither casts, and that is a fix rather than a saving.
          `lampsAt` puts this fitting's own light exactly at the glass — which
          is where the light of a lamp comes from — so the base plate and the
          body are *behind* the source, between it and the wall they are bolted
          to. Left casting, they threw a hard black disc of their own onto the
          wall immediately around the fitting: a lamp sitting in a shadow it had
          cast itself, with the PCF dither on its edge, which is what was
          showing as a dark crescent beside every fitting in the shaft. A source
          does not occlude itself, and the housing has nothing else to shadow. */}
      <mesh position={[0, 0, wall + 3]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 6, 24]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {/* The barrel takes a little light of its own, and it is the last piece
          of the same smudge. Its outer flank faces *away* from the glass at its
          own front rim, so no source in the scene reaches it — and a cool grey
          crescent standing unlit against a warm lit wall reads as a shadow
          whether or not anything cast it. Warm iron rather than the cool steel
          it was, with the bounce a casting an inch from a burning lamp actually
          picks up. */}
      <mesh position={[0, 0, wall + proud / 2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.94, radius * 0.84, proud, 20, 1, true]} />
        <meshStandardMaterial
          {...surfaceProps(SURFACES.iron, 1.15)}
          side={DoubleSide}
          emissive="#c08a44"
          emissiveIntensity={0.1 * dim}
          userData={{ selfLit: true }}
        />
      </mesh>
      {/* The glass: the only surface in the scene allowed to be its own source.
          Wide enough to fill the housing's own aperture, which is the second
          half of the shadow fix above. The fitting is off to one side of the
          shaft and seen from well inboard of it, and the barrel's *back* rim
          projects larger on screen than its front one does — so a glass cut
          narrower than the barrel left a crescent of unlit housing interior
          showing past its edge, on the same side and at the same size as the
          shadow disc, and reading as the same smudge. The barrel flares toward
          the front now as a reflector actually does, which puts its back rim
          inside its front one and leaves nothing of the inside to see. */}
      <mesh position={[0, 0, wall + proud]}>
        <circleGeometry args={[radius * 0.9, 24]} />
        <meshStandardMaterial
          // its own source, so the room's ambience must not overwrite it
          userData={{ selfLit: true }}
          color="#3a2408"
          emissive="#ffcf8c"
          // the glass is on the same supply as the sources — a fitting that
          // stays lit while the room it lights gutters is a fitting that is not
          // the thing lighting it
          emissiveIntensity={tuning.glassEmissive * dim}
          roughness={0.4}
        />
      </mesh>
      {/* the guard: a ring and two crossed bars, dark against the glass */}
      <mesh position={[0, 0, wall + proud + 6]} rotation={[0, 0, 0]}>
        <torusGeometry args={[radius * 0.94, 3.5, 8, 28]} />
        <meshStandardMaterial color="#2a231a" roughness={0.75} metalness={0.2} />
      </mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[0, 0, wall + proud + 6]} rotation={[0, 0, a]}>
          <boxGeometry args={[radius * 1.72, 4, 4]} />
          <meshStandardMaterial color="#332b20" roughness={0.8} metalness={0.15} />
        </mesh>
      ))}
      {/* The halo. Not a light either — a small very bright thing bleeds in any
          real lens as well as in this one, and a sprite costs nothing where a
          third source would cost the whole budget.
          It needs its texture: a sprite material without a map draws a flat
          square, which is exactly what was sitting over every fitting. */}
      {glow && (
        <sprite
          position={[0, 0, wall + proud + 10]}
          scale={[radius * tuning.glowSize, radius * tuning.glowSize, 1]}
        >
          <spriteMaterial
            map={glow}
            transparent
            opacity={tuning.glowOpacity * dim}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>
      )}
    </group>
  );
}, (a, b) => a.p.x === b.p.x && a.p.y === b.p.y && a.dim === b.dim);

export default Lamp;
