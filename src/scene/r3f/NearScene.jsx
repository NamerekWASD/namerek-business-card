import { useMemo } from 'react';
import { DoubleSide, Plane, Vector3 } from 'three';
import { SHAFT_DEPTH } from '../model/camera.js';
import {
  ARCHITRAVE_DEPTH, ARCHITRAVE_MEMBER_W, CAGE_DEPTH, CAGE_FAR, CAGE_FLOOR_Y, CAGE_NEAR,
  CAGE_POST_Z, CAGE_ROOF_Y, DOORWAY_H_FRAC, DOORWAY_W_FRAC, FRAME_TIERS, cageInset, openingTop,
} from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { Box, Panel } from '../renderers/r3f/Surface.jsx';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { gateLattice, hazardStripe } from '../renderers/r3f/patterns.js';
import useRideMotion from '../renderers/r3f/useRideMotion.js';
import SceneLights from './SceneLights.jsx';
import Room from '../renderers/r3f/Room.jsx';
import { DECKS } from '../../lift/decks.js';
import { doorClosureAt, openFloor } from '../../lift/ride.js';
import SceneWarmup from './SceneWarmup.jsx';

// Everything in WebGL that stands in front of the decks: the doorway frames,
// the leaves, and the cage we are riding in. It is a second canvas rather than a
// second layer because the decks are genuinely *between* the two halves of this
// scene — they sit on the landing, behind the doors — and no z-index inside one
// canvas can express that.

/** The four members of one tier of a frame. */
function Tier({ vw, vh, top, tier }) {
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  const m = ARCHITRAVE_MEMBER_W * tier.m;
  const d = ARCHITRAVE_DEPTH * tier.z;
  const members = [
    { left: left - m, top: top - m, w: w + m * 2, h: m }, // head
    { left: left - m, top: top + h, w: w + m * 2, h: m }, // sill
    { left: left - m, top, w: m, h }, // jambs
    { left: left + w, top, w: m, h },
  ];
  return members.map((b, i) => (
    <Box
      key={i}
      surface={SURFACES.doorFrame}
      left={b.left} top={b.top} w={b.w} h={b.h} d={d}
      z={-SHAFT_DEPTH}
      shade={tier.shade}
    />
  ));
}

/**
 * One floor's doorway: the stepped frame, the returns bridging it back to the
 * wall, and the two leaves.
 *
 * The leaves are motion tier — opening runs over the braking phase and closing
 * over the acceleration, so a trip gains no time for them — and they are written
 * straight to the meshes every ride frame rather than through a prop.
 */
function Doorway({ vw, vh, top, floor, deck, intro, ticker }) {
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  const leafW = w / 2;

  // The opening, as two world-space planes. A leaf is clipped to the hole it
  // belongs to, so sliding it open removes it rather than parking it across the
  // shaft wall — which is what an open door does, and what the CSS backend gets
  // for free from `overflow: hidden` on the frame.
  const clip = useMemo(() => [
    new Plane(new Vector3(1, 0, 0), -left),
    new Plane(new Vector3(-1, 0, 0), left + w),
  ], [left, w]);

  const leaves = useRideMotion(ticker, (group, _floorPos, snapshot) => {
    // Only the in-progress ticks belong here, and that is the whole of the door
    // flicker.
    //
    // The tick that *settles* a ride notifies with `ride: null` in the same
    // synchronous pass that updates the ticker's own deck — but this component's
    // `deck` prop has not been re-rendered with that new value yet. Computing the
    // rest state right then reads the floor we have just left, not the one we
    // have arrived at, so the door that should be opening slams shut for a
    // frame. The last in-progress tick has already eased it to within a hair of
    // open; letting the re-render own the rest state leaves nothing to hand over
    // but that correction, and it is instant.
    if (snapshot && !snapshot.ride) return;
    const ride = snapshot?.ride ?? null;
    const shut = doorClosureAt(floor, ride, deck);
    const closure = !ride && floor === deck ? Math.max(shut, intro) : shut;
    const [a, b] = group.children;
    if (a) a.position.x = (closure - 1) * leafW;
    if (b) b.position.x = (1 - closure) * leafW;
  }, 0, [floor, deck, intro, leafW]);

  return (
    <group>
      {/* The returns, bridging the frame's front back to the wall — head and
          sill only. The two upright ones are gone on purpose: they were the
          last vertical surface at the sides of the opening, and a lit panel
          exactly where the corridor is supposed to run out is a wall, whatever
          it is called in the code. */}
      <Panel surface={SURFACES.doorFrame} shade={1.15} hinge="top" pitch={-90} left={left} top={top} w={w} h={ARCHITRAVE_DEPTH} z={-SHAFT_DEPTH + ARCHITRAVE_DEPTH} />
      <Panel surface={SURFACES.doorFrame} shade={0.7} hinge="top" pitch={90} left={left} top={top + h} w={w} h={ARCHITRAVE_DEPTH} z={-SHAFT_DEPTH + ARCHITRAVE_DEPTH} />

      {/* the leaves, set back inside the frame */}
      <group ref={leaves} position={[0, 0, 0]}>
        {[0, 1].map((s) => (
          <group key={s}>
            <Box
              surface={SURFACES.doorLeaf}
              left={left + s * leafW} top={top} w={leafW} h={h} d={10}
              z={-SHAFT_DEPTH + ARCHITRAVE_DEPTH * 0.34}
              clip={clip}
            />
          </group>
        ))}
      </group>

      {FRAME_TIERS.map((tier, ti) => (
        <Tier key={ti} vw={vw} vh={vh} top={top} tier={tier} />
      ))}
    </group>
  );
}

/** The frames and leaves of the floors in view, riding on one group. */
function Doorways({ vw, vh, pos, floorPx, deck, intro, ticker }) {
  const here = Math.round(pos);
  const slots = [here - 1, here, here + 1].filter((f) => f >= 0 && f < DECKS.length);
  const stack = useRideMotion(ticker, (group, floorPos) => {
    group.position.y = worldY(floorPos * floorPx);
  }, pos, [floorPx]);

  return (
    <group ref={stack}>
      {slots.map((f) => (
        <Doorway
          key={f}
          vw={vw} vh={vh} top={openingTop(vh, floorPx, f)}
          floor={f} deck={deck} intro={intro} ticker={ticker}
        />
      ))}
    </group>
  );
}

/**
 * A plane carrying one of the baked patterns, tiled to fit.
 *
 * It is a component rather than a `useTiled()` call at each site because the
 * patterns come back `null` where there is no canvas to bake on — every test
 * run — and a hook that is only called when a texture exists is a hook called
 * conditionally. Wrapping it moves the branch outside the hook.
 */
function PatternPlane({ texture, repeat, w, h, position, rotation, ...material }) {
  const map = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    t.repeat.set(repeat[0], repeat[1]);
    return t;
  }, [texture, repeat]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} {...material} />
    </mesh>
  );
}

/**
 * A horizontal deck of the cage — roof or floor. These are the first genuinely
 * horizontal surfaces in this camera, and they are the point of the exercise: a
 * vertical bar facing the viewer has no convergence available to it, while a
 * plane seen at a grazing angle converges hard and reads as depth for nothing.
 */
function CageDeck({ vw, y, isRoof }) {
  const inset = cageInset(vw);
  const width = vw - inset * 2;
  const ribs = [0.16, 0.38, 0.6, 0.82];
  const hazard = hazardStripe();
  const iron = surfaceProps(SURFACES.iron, isRoof ? 0.92 : 1.2);

  return (
    <>
      <Panel
        surface={isRoof ? SURFACES.cageRoof : SURFACES.cageFloor}
        hinge="top" pitch={isRoof ? -90 : 90}
        left={inset} top={y} w={width} h={CAGE_DEPTH}
        z={isRoof ? CAGE_NEAR : CAGE_FAR}
      />
      {/* The bright hairline was the raw near edge of the floor plane catching
          the shaft light at a grazing angle. A lift has a steel threshold here;
          it both gives the floor a physical edge and prevents that edge from
          reading as a white rendering seam. */}
      {!isRoof && (
        <mesh position={[vw / 2, worldY(y) + 5, CAGE_NEAR - 3]} castShadow receiveShadow>
          <boxGeometry args={[width, 12, 16]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.58)} />
        </mesh>
      )}
      {/* cross members: evenly spaced in depth, so on screen they bunch up
          toward the far end. Nothing else in the scene shows recession this
          plainly. */}
      {ribs.map((r) => (
        <mesh
          key={r}
          position={[vw / 2, worldY(y) + (isRoof ? -2 : 2), CAGE_NEAR - r * CAGE_DEPTH]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, 9, 4]} />
          <meshStandardMaterial {...iron} />
        </mesh>
      ))}
      {/* the hazard lip at the far edge of the floor, where you would step off.
          Needs its own albedo: a `PatternPlane` with none defaults to a white
          `material.color`, and `Room`'s ambient pass reads that colour as the
          surface's albedo — so an untinted plate bounced back a flat white
          glow wherever direct light was weak, which is exactly the grazing
          near edge of a horizontal plane. That was this scene's white seam,
          not the floor plane's raw edge the earlier fix here targeted. */}
      {!isRoof && hazard && (
        <PatternPlane
          texture={hazard} repeat={[Math.round(width / 64), 1]} w={width} h={11}
          position={[vw / 2, worldY(y) + 3, CAGE_FAR + 6]} rotation={[-Math.PI / 2, 0, 0]}
          {...iron} roughness={0.8}
        />
      )}
    </>
  );
}

/** The cage: decks, corner posts, hand rails and the scissor gates. */
function Cage({ vw, vh }) {
  const floorY = vh * CAGE_FLOOR_Y;
  const postH = floorY - CAGE_ROOF_Y;
  const inset = cageInset(vw);
  const railY = floorY - 300;
  const lattice = gateLattice();
  const iron = surfaceProps(SURFACES.cageSteel, 1);
  // The lattice is a texture, not a light source. Giving it the same dark
  // steel albedo as the posts leaves its brightness to the shaft lamps and the
  // room's ambient bounce, exactly like the rest of the cage.
  const gateSteel = surfaceProps(SURFACES.cageSteel, 0.9);

  return (
    <>
      <CageDeck vw={vw} y={CAGE_ROOF_Y} isRoof />
      <CageDeck vw={vw} y={floorY} isRoof={false} />

      {/* only the two end posts are solid; the gate fills between them */}
      {[inset, vw - inset].map((x) => CAGE_POST_Z.map((z) => (
        <mesh key={`${x}-${z}`} position={[x, worldY(CAGE_ROOF_Y + postH / 2), z]} castShadow receiveShadow>
          <boxGeometry args={[15, postH, 20]} />
          <meshStandardMaterial {...iron} />
        </mesh>
      )))}

      {/* the hand rails, running the length of the cage */}
      {[inset, vw - inset].map((x) => (
        <mesh key={x} position={[x, worldY(railY), (CAGE_NEAR + CAGE_FAR) / 2]} castShadow receiveShadow>
          <boxGeometry args={[18, 13, CAGE_DEPTH]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.1)} />
        </mesh>
      ))}

      {/* The scissor gates. A lattice beats a row of uprights for the same
          reason the old guide rail never worked: a vertical bar facing the
          viewer has no convergence available to it, while a diamond has its
          corners at four different depths and the whole mesh compresses toward
          the far end. Painted on a plane along the depth, that compression is
          the projection's own doing. */}
      {lattice && [inset, vw - inset].map((x) => (
        <PatternPlane
          key={x}
          texture={lattice} repeat={[Math.round(CAGE_DEPTH / 128), Math.round(postH / 128)]}
          w={CAGE_DEPTH} h={postH}
          position={[x, worldY(CAGE_ROOF_Y + postH / 2), (CAGE_NEAR + CAGE_FAR) / 2]}
          rotation={[0, Math.PI / 2, 0]}
          transparent side={DoubleSide} {...gateSteel}
        />
      ))}
    </>
  );
}

function NearScene({ vw, vh, pos, floorPx, deck, intro, ticker, lamps, ride, onReady }) {
  const open = openFloor(ride, deck);
  return (
    <>
      <SceneWarmup onReady={onReady} />
      {/* its own copy of the same two sources — a canvas is a scene, and this
          one has surfaces of its own to light */}
      <SceneLights
        vw={vw} vh={vh} lamps={lamps} floorPx={floorPx}
        deckTop={openingTop(vh, floorPx, open.floor) + pos * floorPx}
        closure={Math.max(open.closure, open.floor === deck ? intro : 0)}
      />
      {/* the doors and the cage face the shaft, so they are lit by it */}
      <Room room="shaft">
        <Doorways vw={vw} vh={vh} pos={pos} floorPx={floorPx} deck={deck} intro={intro} ticker={ticker} />
        <Cage vw={vw} vh={vh} />
      </Room>
    </>
  );
}

export default NearScene;
