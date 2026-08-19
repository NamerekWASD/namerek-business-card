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
const Lamp = memo(function Lamp({ p }) {
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
      {/* the cast base bolted to the wall */}
      <mesh position={[0, 0, wall + 3]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 6, 24]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {/* the body, standing off the wall */}
      <mesh position={[0, 0, wall + proud / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.82, radius * 0.9, proud, 20, 1, true]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.steel, 1)} side={DoubleSide} />
      </mesh>
      {/* the glass: the only surface in the scene allowed to be its own source */}
      <mesh position={[0, 0, wall + proud]}>
        <circleGeometry args={[radius * 0.8, 24]} />
        <meshStandardMaterial
          // its own source, so the room's ambience must not overwrite it
          userData={{ selfLit: true }}
          color="#3a2408"
          emissive="#ffcf8c"
          emissiveIntensity={tuning.glassEmissive}
          roughness={0.4}
        />
      </mesh>
      {/* the guard: a ring and two crossed bars, dark against the glass */}
      <mesh position={[0, 0, wall + proud + 6]} rotation={[0, 0, 0]}>
        <torusGeometry args={[radius * 0.86, 3.5, 8, 28]} />
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
            opacity={tuning.glowOpacity}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>
      )}
    </group>
  );
}, (a, b) => a.p.x === b.p.x && a.p.y === b.p.y);

export default Lamp;
