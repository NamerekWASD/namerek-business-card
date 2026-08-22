import { useMemo } from 'react';
import { QuadraticBezierCurve3, Vector3 } from 'three';
import { SHAFT_DEPTH } from '../model/camera.js';
import { DOORWAY_H_FRAC, DOORWAY_W_FRAC, LANDING_SETBACK } from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { Box } from '../renderers/r3f/Surface.jsx';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { contactShadow } from '../renderers/r3f/patterns.js';

// One identifying object per landing, so a floor is somewhere rather than a
// number. Parked low and to one side, clear of the centred content.
//
// These are the objects the CSS backend builds out of `Solid`s — boxes with
// hand-shaded faces — and here they are boxes with lit ones. The lettering does
// *not* come across: an enamel plate and a stencil are DOM decals in the CSS
// scene and they stay DOM, because turning readable text into a texture is how a
// scene loses its typography. What is here is the volume they are bolted to.

const PROP_YAW = [0, 0, 15, 3];

/** The floor of the landing, in scene pixels, for standing things on. */
function standing(vh, top) {
  const h = vh * DOORWAY_H_FRAC;
  return top + h * 0.9;
}

// The jacks on the EG patch bay, laid out once rather than computed, because a
// hand-plugged board is never quite a grid — real ones drift a pixel or two off
// pitch, which is most of what tells you someone actually uses this one.
const JACKS = [
  [22, 26], [50, 24], [79, 27], [108, 25],
  [22, 62], [50, 64], [79, 61], [108, 63],
];

// …and the two that are bridged. A board of jacks with two of them patched is,
// underneath the brass, a switched network — the one object in this corridor
// that gets to be about the site's own subject without saying so. Without the
// cords it is just a grid of holes, which is why they are not decoration.
const CORDS = [[0, 6], [3, 5]];

/** EG — a patch bay: a board of jacks, two of them bridged by a cord. */
function PatchBay({ x, y, z }) {
  const brass = { color: '#8a6326', roughness: 0.45, metalness: 0.7 };
  const cords = useMemo(() => CORDS.map(([a, b]) => {
    const [ax, ay] = JACKS[a];
    const [bx, by] = JACKS[b];
    // a cord hangs; the control point is pulled below the straight line
    // between its ends, which is the whole difference between a cable and a
    // pencil stroke
    return new QuadraticBezierCurve3(
      new Vector3(ax, worldY(ay), 16),
      new Vector3((ax + bx) / 2, worldY(Math.max(ay, by) + 22), 26),
      new Vector3(bx, worldY(by), 16),
    );
  }), []);

  return (
    <group position={[x, worldY(y), z]}>
      <Box surface={SURFACES.iron} shade={1.1} left={0} top={0} w={132} h={88} d={14} />
      {/* the cords first, so they read as plugged into the jacks rather than
          laid across the top of them */}
      {cords.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 24, 2.4, 6, false]} />
          <meshStandardMaterial color="#2e2115" roughness={0.75} metalness={0.1} />
        </mesh>
      ))}
      {JACKS.map(([jx, jy]) => (
        <mesh key={`${jx}-${jy}`} position={[jx, worldY(jy), 15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[6.5, 6.5, 4, 12]} />
          <meshStandardMaterial {...brass} />
        </mesh>
      ))}
      {/* the one pilot lamp on the board — a dead panel is not a landmark */}
      <mesh position={[120, worldY(10), 16]}>
        <circleGeometry args={[3.4, 10]} />
        <meshStandardMaterial userData={{ selfLit: true }} color="#3a2408" emissive="#ffb454" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

/** 1. OG — a workbench: a deep carcass and a slab overhanging it. */
function Workbench({ x, y, z }) {
  const yaw = PROP_YAW[1];
  return (
    <group position={[x, worldY(y), z]}>
      <Box surface={SURFACES.iron} shade={0.85} left={0} top={26} w={172} h={82} d={116} yaw={yaw} />
      {/* the slab is the piece doing the work: a horizontal surface is the only
          thing in this corridor the eye can measure the room against */}
      <Box surface={SURFACES.steel} shade={1.05} left={-6} top={16} w={184} h={12} d={130} yaw={yaw} />
      {/* the board on the wall, and what hangs off it */}
      <Box surface={SURFACES.iron} shade={0.8} left={18} top={-76} w={124} h={52} d={8} />
      {[12, 40, 66, 96].map((tx, i) => (
        <mesh key={tx} position={[18 + tx, worldY(-64 + (i % 3) * 4), 12]} castShadow receiveShadow>
          <boxGeometry args={[i % 2 ? 6 : 9, 26 + (i % 3) * 8, 5]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.steel, 1.1)} />
        </mesh>
      ))}
    </group>
  );
}

/** 2. OG — three crates at three depths, the cheapest legible object there is. */
function Crates({ x, y, z }) {
  const yaw = PROP_YAW[2];
  return (
    <group position={[x, worldY(y), z]}>
      <Box surface={SURFACES.iron} shade={0.92} left={0} top={62} w={104} h={88} d={80} yaw={yaw} />
      <Box surface={SURFACES.iron} shade={0.8} left={104} top={86} w={82} h={64} d={60} yaw={yaw} />
      <Box surface={SURFACES.iron} shade={1.08} left={20} top={0} w={74} h={56} d={62} yaw={yaw} />
    </group>
  );
}

/** 3. OG — a post box: a slot at hand height and a hood over it. */
function PostBox({ x, y, z }) {
  const yaw = PROP_YAW[3];
  return (
    <group position={[x, worldY(y), z]}>
      <Box surface={SURFACES.steel} shade={0.95} left={0} top={0} w={125} h={136} d={78} yaw={yaw} />
      {/* the hood, hinged just above the slot and tipped out over it — which is
          the whole point of a hood */}
      <mesh position={[62, worldY(16), 82]} rotation={[-0.59, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[104, 26, 6]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.steel, 1.1)} />
      </mesh>
      {/* the slot itself: a dark recess rather than a painted line */}
      <mesh position={[62, worldY(41), 77]}>
        <boxGeometry args={[88, 13, 8]} />
        <meshStandardMaterial color="#070605" roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * The shadow a standing object lays on the floor it stands on. Cheap and
 * painted, not a shadow map: the plan is explicit that contact darkening comes
 * first and real shadow casting only after profiling says it is affordable.
 */
function ContactShadow({ x, y, z, w, d = 90, opacity = 0.7 }) {
  const map = contactShadow();
  if (!map) return null;
  return (
    <mesh position={[x, worldY(y), z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function LandingProps({ idx, vw, vh, top }) {
  const w = vw * DOORWAY_W_FRAC;
  const left = (vw - w) / 2;
  const floor = standing(vh, top);
  const back = -SHAFT_DEPTH - LANDING_SETBACK + 6;
  // parked to one side, clear of the centred content — the same rule the CSS
  // backend applies, stated in the same fractions
  const x = left + w * (idx === 1 ? 0.3 : 0.1);

  return (
    <>
      {/* stood 40 off the wall rather than flush against it — a board bolted
          straight to the plaster has nowhere for its own shadow to land; the
          brackets a real patch bay hangs on give it exactly this much air */}
      {idx === 0 && <PatchBay x={x} y={floor - 220} z={back + 40} />}
      {idx === 1 && (
        <>
          <ContactShadow x={x + 86} y={floor} z={back + 60} w={450} opacity={0.6} />
          <Workbench x={x} y={floor - 108} z={back} />
        </>
      )}
      {idx === 2 && (
        <>
          <ContactShadow x={x + 90} y={floor} z={back + 40} w={220} opacity={0.7} />
          <Crates x={x} y={floor - 150} z={back} />
        </>
      )}
      {idx === 3 && (
        <>
          <ContactShadow x={x + 380} y={floor} z={back + 40} w={260} opacity={0.75} />
          <PostBox x={x + 316} y={floor - 136} z={back} />
        </>
      )}
    </>
  );
}

export default LandingProps;
