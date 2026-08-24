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
import { useFittingMaterial } from '../renderers/r3f/useSurfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { doorLeafFace, gateLattice, hazardStripe } from '../renderers/r3f/patterns.js';
import useRideMotion from '../renderers/r3f/useRideMotion.js';
import SceneLights from './SceneLights.jsx';
import Room from '../renderers/r3f/Room.jsx';
import { DECKS } from '../../lift/decks.js';
import { doorClosureAt } from '../../lift/ride.js';
import SceneWarmup from './SceneWarmup.jsx';
import CanvasBoot from '../../boot/CanvasBoot.jsx';

// Everything in WebGL that stands in front of the decks: the doorway frames,
// the leaves, and the cage we are riding in. It is a second canvas rather than a
// second layer because the decks are genuinely *between* the two halves of this
// scene — they sit on the landing, behind the doors — and no z-index inside one
// canvas can express that.

// How far inside the architrave's own depth budget a leaf sits, and how thick
// it is.
const LEAF_Z_FRAC = 0.3;
const LEAF_D = 10;
// How far the astragal — the meeting stile the two leaves seal against — stands
// proud of the plate behind it, and how wide it is as a fraction of one leaf.
const ASTRAGAL_D = 7;
const ASTRAGAL_W = 0.022;

// The leaves carry their own light, and that is not a stylistic choice. The
// shaft's fittings stand `LAMPS.proud` off the far wall; a shut leaf's face ends
// up a few pixels in *front* of them, in their plane, so its cosine term is
// nought and no lamp in this scene reaches it. `Room`'s ambience is a flat
// emissive, and a flat emissive cannot carry a pattern — which is why a leaf
// with a tile on it and a decal over it still drew as one black rectangle.
//
// So the leaf is graded the way the CSS backend graded everything: the light is
// painted into `doorLeafFace`, and the face plate wears that painting as its
// `emissiveMap`. `selfLit` keeps `Room` from overwriting it with the flat value
// on the next commit — the same flag the lamp glass and the marquee already use.
const LEAF_GLOW = '#ffdcae';
const LEAF_GLOW_I = 0.26;
// and the astragal's own, which belongs to the architrave rather than to the
// leaf — see the material that reads it
const FRAME_TONE = '#8a7657';

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
 * One leaf of a landing door: the plate, its painted face, and the astragal it
 * seals against its partner with.
 *
 * The astragal is real geometry rather than another stripe in the paint, and it
 * is the one part of the leaf that has to be: when the leaves part, what says
 * "two doors" instead of "one picture sliding" is a raised edge with its own
 * silhouette moving against the plate behind it. Everything flat about the leaf
 * is in `doorLeafFace`, which is where flat things belong.
 *
 * @param {{ side: 0 | 1 }} props `side` 0 is the left leaf, 1 the right
 */
function DoorLeaf({ side, left, top, w, h, z, clip }) {
  const face = doorLeafFace(side);
  const plate = surfaceProps(SURFACES.doorLeaf, 1);
  // The astragal is one of the four vertical members that frame every opening
  // in this scene, and it was flat colour like the rest of them. Grained, at
  // the frame's own tile size.
  const astragal = useFittingMaterial(SURFACES.doorFrame, 1.1, [w * ASTRAGAL_W, h]);
  const stileW = w * ASTRAGAL_W;
  // 0 meets its partner on its own right, 1 on its own left
  const stileX = side ? stileW / 2 : w - stileW / 2;

  return (
    <group position={[left, worldY(top), z]}>
      <mesh position={[w / 2, -h / 2, LEAF_D / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, LEAF_D]} />
        {/* `clip` is this backend's `overflow: hidden` — a leaf slides out of
            its opening and has to stop existing where the frame stops hiding
            it, exactly as the CSS leaves are clipped by the frame they sit in */}
        <meshStandardMaterial {...plate} clippingPlanes={clip ?? null} />
      </mesh>
      {face && (
        <mesh position={[w / 2, -h / 2, LEAF_D + 0.4]} receiveShadow>
          <planeGeometry args={[w, h]} />
          {/* The same painting twice over: as albedo, so what light does reach
              the leaf lands on artwork rather than on a flat slab, and as
              emissive, because for most of this door's life no light reaches it
              at all. `color` holds the plate's own albedo rather than the
              default white — `Room` reads a material's colour back as what it
              bounces, and an unset one bounces white. */}
          <meshStandardMaterial
            map={face}
            emissiveMap={face}
            emissive={LEAF_GLOW}
            emissiveIntensity={LEAF_GLOW_I}
            color={plate.color}
            roughness={0.64}
            metalness={0.22}
            clippingPlanes={clip ?? null}
            userData={{ selfLit: true }}
          />
        </mesh>
      )}
      <mesh position={[stileX, -h / 2, LEAF_D + ASTRAGAL_D / 2]} castShadow receiveShadow>
        <boxGeometry args={[stileW, h * 0.985, ASTRAGAL_D]} />
        {/* The frame's casting, not the leaf's plate — an astragal is the same
            ironwork as the architrave it shuts against, and giving it the leaf's
            own tone at the leaf's own level put a pale pillar down the middle of
            the doorway, brighter than anything it stood against. It is the one
            part of a leaf with no painting on it, so it takes the room's whole
            contribution flat across its width and has to be pitched by hand
            against `doorFrame`'s own. */}
        <meshStandardMaterial
          {...astragal}
          emissive={FRAME_TONE}
          emissiveIntensity={LEAF_GLOW_I * 0.34}
          clippingPlanes={clip ?? null}
          userData={{ selfLit: true }}
        />
      </mesh>
    </group>
  );
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

  const leaves = useRideMotion(ticker, (group, _floorPos, snapshot) => {
    // **Both halves of "which door is open" come off the ticker, never off a
    // prop.** This is the door flicker, and it is worth writing down exactly,
    // because it has been chased in this component more than once and the
    // component was never where it lived.
    //
    // `doorClosureAt` needs two things: the trip under way, and — if there is
    // none — the floor we are standing at. The trip arrived here on the
    // snapshot and was always right. The floor came from the `deck` *prop*,
    // which is React's mirror of the ticker and is a commit behind. So any
    // write that ran with no trip in hand computed the rest state for the floor
    // we had just *left*: `doorClosureAt(0, null, 2)` is 1, and the door that
    // was two-thirds open slammed shut for exactly one frame before the next
    // tick corrected it. Logged live on a two-floor arrival, twice in the last
    // 150ms of the trip — which is precisely where it is most visible, and why
    // short trips flickered while long ones did not: on a long trip the same
    // stray write lands while the doors are still shut and changes nothing.
    //
    // Reading `deckIndex` off the snapshot removes the disagreement rather than
    // dodging it, so there is no longer a state this can be called in that
    // produces a wrong answer — which is what the old guard here was for. It is
    // gone, and the settle is better for it: the tick that ends a ride carries
    // the arrived-at deck already (see `rideTicker`'s `tick`), so the doors now
    // reach their rest state on that frame instead of waiting for a re-render.
    const ride = snapshot?.ride ?? null;
    const at = snapshot ? snapshot.deckIndex : deck;
    const shut = doorClosureAt(floor, ride, at);
    const closure = !ride && floor === at ? Math.max(shut, intro) : shut;
    const [a, b] = group.children;
    if (a) a.position.x = (closure - 1) * leafW;
    if (b) b.position.x = (1 - closure) * leafW;
  }, 0, [floor, deck, intro, leafW]);

  // The opening, widened into the pocket the frame's own jambs make — so a leaf
  // slides *behind* the architrave and is gone, instead of being cut off at the
  // raw opening line with nothing standing there to hide the cut.
  //
  // How far it may be widened is not a taste call, and getting it wrong is
  // visible from across the room. `FRAME_TIERS` steps *narrower and prouder* the
  // further out it goes (see `geometry.js`), so the outermost jamb is also the
  // shallowest one: at 0.3 of the architrave's depth it does not reach as far
  // forward as the leaf's own front face does. Clip out to that jamb's full
  // width and the strip of leaf between it and the next tier in has nothing in
  // front of it — which drew as a bright vertical bar standing off the wall
  // either side of every open doorway, and read exactly like a frame that had
  // come unstuck.
  //
  // So the margin is the widest tier that genuinely stands in front of the leaf,
  // read off the same table the frame is built from rather than written down
  // here as a fraction to be re-tuned whenever the profile changes.
  const clip = useMemo(() => {
    const leafFront = ARCHITRAVE_DEPTH * LEAF_Z_FRAC + LEAF_D + ASTRAGAL_D;
    const margin = FRAME_TIERS
      .filter((tier) => ARCHITRAVE_DEPTH * tier.z > leafFront)
      .reduce((widest, tier) => Math.max(widest, ARCHITRAVE_MEMBER_W * tier.m), 0);
    return [
      new Plane(new Vector3(1, 0, 0), margin - left),
      new Plane(new Vector3(-1, 0, 0), left + w + margin),
    ];
  }, [left, w]);

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
            <DoorLeaf
              side={/** @type {0 | 1} */ (s)}
              left={left + s * leafW} top={top} w={leafW} h={h}
              z={-SHAFT_DEPTH + ARCHITRAVE_DEPTH * LEAF_Z_FRAC}
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
      {/* the map last, and deliberately so: callers spread a surface's whole
          material in here for its albedo and roughness, and since fittings
          carry a grain map of their own now, `map` first meant the surface's
          grain quietly replacing the pattern this component exists to draw */}
      <meshStandardMaterial {...material} map={map} />
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
  const iron = useFittingMaterial(SURFACES.iron, isRoof ? 0.92 : 1.2, [width, 9]);
  const threshold = useFittingMaterial(SURFACES.iron, 0.58, [width, 12]);

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
          <meshStandardMaterial {...threshold} />
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
  // The uprights and the hand rails — "вертикальные и горизонтальные стойки
  // лифта", the two members the eye spends the whole ride looking past. Both
  // were untextured, which on a bar facing the camera dead-on is fatal: a
  // vertical member has no convergence available to it, so grain is the only
  // thing it has left to be read by.
  const iron = useFittingMaterial(SURFACES.cageSteel, 1, [15, postH]);
  // The lattice is a texture, not a light source. Giving it the same dark
  // steel albedo as the posts leaves its brightness to the shaft lamps and the
  // room's ambient bounce, exactly like the rest of the cage.
  const gateSteel = surfaceProps(SURFACES.cageSteel, 0.9);
  const rail = useFittingMaterial(SURFACES.iron, 1.1, [CAGE_DEPTH, 13]);

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
          <meshStandardMaterial {...rail} />
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

function NearScene({ vw, vh, pos, floorPx, deck, intro, ticker, ride, dim = 1, onSettle }) {
  return (
    <>
      <SceneWarmup onSettle={onSettle} />
      {/* its own copy of the same sources — a canvas is a scene, and this one
          has surfaces of its own to light. It reads the same ticker, so the two
          canvases cannot disagree about where the light is. */}
      <SceneLights
        vw={vw} vh={vh} floorPx={floorPx} ticker={ticker}
        deck={deck} ride={ride} intro={intro} dim={dim}
        // everything below is `<Room room="shaft">`, so the pendant's seat here
        // lights nothing and needs no shadow of its own — the landing itself is
        // in the other canvas, with the other copy of this rig
        rooms={['shaft']}
      />
      {/* the doors and the cage face the shaft, so they are lit by it */}
      <Room room="shaft">
        <Doorways vw={vw} vh={vh} pos={pos} floorPx={floorPx} deck={deck} intro={intro} ticker={ticker} />
        <Cage vw={vw} vh={vh} />
      </Room>
      {/* last, for the same reason it is last in `ShaftScene` */}
      <CanvasBoot name="near" onSettle={onSettle} />
    </>
  );
}

export default NearScene;
