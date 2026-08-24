import { memo, useMemo } from 'react';
import { CatmullRomCurve3, DoubleSide, Vector3 } from 'three';
import { CAM_ORIGIN_Y, SHAFT_DEPTH } from '../model/camera.js';
import {
  BACK_OVERSCAN, COUNTERWEIGHT_INSET_X, COUNTERWEIGHT_Z, DOORWAY_H_FRAC, DOORWAY_W_FRAC,
  LANDING_SETBACK, PENDANT_HEAD_RISE, PENDANT_LINKS, PENDANT_LINK_PITCH, PENDANT_LINK_R,
  PENDANT_LINK_STRETCH, PENDANT_LINK_T, PENDANT_SCALE, counterweightY, landingCeilingY,
  landingFloorY, openingTop,
} from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { LAMPS } from '../model/lighting.js';
import { Panel } from '../renderers/r3f/Surface.jsx';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { useFittingMaterial } from '../renderers/r3f/useSurfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import SceneLights from './SceneLights.jsx';
import CanvasBoot from '../../boot/CanvasBoot.jsx';
import Lamp from '../renderers/r3f/Lamp.jsx';
import Rivets from '../renderers/r3f/Rivets.jsx';
import Room from '../renderers/r3f/Room.jsx';
import { pendantAt } from '../renderers/r3f/lighting.js';
import { useLightTuning } from '../renderers/r3f/tuning.js';
import useRideMotion from '../renderers/r3f/useRideMotion.js';
import LandingProps from './LandingProps.jsx';
import LandingScreen from './LandingScreen.jsx';
import { DECKS, SCREEN_SIDE } from '../../lift/decks.js';
import { doorClosureAt } from '../../lift/ride.js';

// The far half of the scene in WebGL: the corridor walls, the blind wall at the
// end of the shaft, the landings cut into it, the machinery running down the
// side, and both of the scene's physical lights.
//
// It is a port, not a redesign — every number comes from `scene/model/` or from
// the CSS component it replaces, so the two backends can be put side by side and
// any difference is a bug rather than a taste.

/**
 * One corridor wall, hinged at a screen edge and swung a full 90°, with the
 * ironwork that makes it read as a wall rather than as a dark gradient: a brass
 * line at a fixed depth and three rivet seams at three others.
 *
 * The seams are what were missing. A plane running away from the camera with
 * nothing on it has no scale and no speed — there is nothing for the eye to
 * measure either against. Three rows of rivets at different depths give it
 * both, and they stream past on a transform rather than being rebuilt.
 */
function Wall({ side, vw, vh, pos, floorPx, ticker }) {
  const left = side === 'left';
  const overscan = vh * 0.34;
  const span = vh + overscan * 2;
  const x = left ? 0 : vw;

  // the seams scroll with the wall, modulo their own pitch, so the row is
  // endless however far the shaft travels
  const seams = useRideMotion(ticker, (group, floorPos) => {
    const travel = floorPos * floorPx;
    group.position.y = worldY(((travel % 46) + 46) % 46);
  }, pos, [floorPx]);

  return (
    <>
      <Panel
        surface={SURFACES.shaftWall} hinge={left ? 'left' : 'right'} yaw={left ? 90 : -90}
        left={x} top={-overscan} w={SHAFT_DEPTH} h={span}
      />
      {/* the brass line, at the depth the CSS wall carries it */}
      <mesh position={[x + (left ? 2 : -2), worldY(vh / 2), -66]}>
        <boxGeometry args={[3, span, 3]} />
        <meshStandardMaterial color="#8a6a2a" roughness={0.5} metalness={0.6} />
      </mesh>
      <group ref={seams}>
        {[50, 76, 272].map((depth) => (
          <Rivets key={depth} x={x + (left ? 3 : -3)} z={-depth} span={span} top={-overscan - 46} />
        ))}
      </group>
    </>
  );
}

/** The corridor, both sides. */
function Walls({ vw, vh, pos, floorPx, ticker }) {
  return (
    <>
      <Wall side="left" vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
      <Wall side="right" vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
    </>
  );
}

/**
 * The landing's own fitting: a pendant hung off the cornice, not bolted flat to
 * the wall. A lamp needs something to hang from, and the light that stands for
 * it starts from exactly this point — see `pendantAt`. Without the fixture the
 * room had a pool of light coming out of thin air, which is bug-shaped even when
 * nobody can say why.
 */
function Pendant({ vw, vh, top }) {
  const tuning = useLightTuning();
  const [x, y, z] = pendantAt(vw, vh, top);
  const cast = surfaceProps(SURFACES.iron, 0.9);
  const steel = surfaceProps(SURFACES.steel, 1);

  // Everything here is measured downward from the point the light comes from,
  // and negated by `worldY` on the way out: this file thinks in screen pixels
  // with y down, three.js does not.
  //
  // The shade below is drawn at full size inside a single group that scales it,
  // so resizing the lamp is one number rather than forty — and that number is
  // `PENDANT_SCALE` in geometry.js, which the chain's own reach is derived from.
  // Scaling the two apart is what let the body come off the chain and hang in
  // mid-air; there is no longer a way to do it from here.
  const S = PENDANT_SCALE;
  const R = 62;      // across the dome
  const headY = -36; // the finned casting the shade hangs off
  const headTop = -PENDANT_HEAD_RISE;

  // The chain climbs from the yoke up to the ceiling mount. Its length is a
  // link count rather than a fraction of the viewport — see `PENDANT_LINKS`:
  // fewer links, shorter chain, and the whole fixture rides higher, because the
  // ceiling is the end that is nailed down.
  const linkR = PENDANT_LINK_R * S;
  const linkT = PENDANT_LINK_T * S;
  const linkY = PENDANT_LINK_STRETCH; // stretched from a ring into a link
  const pitch = PENDANT_LINK_PITCH;
  const links = PENDANT_LINKS;

  // The guard. It is a barrel, not a cylinder: wider where it meets the shade
  // and drawn in under the bulb, so each upright leans by its own taper.
  const cageTop = 2;
  const cageBot = 44;
  const rTop = 25;
  const rBot = 17;
  const bars = 8;
  const lean = Math.atan2(rTop - rBot, cageBot - cageTop);
  const barLen = Math.hypot(cageBot - cageTop, rTop - rBot);

  // The ceiling mount. The chain stops `LANDING_CEILING_CLEARANCE` short of
  // the ceiling line, so it gets hardware to hang from instead of fading into
  // the plaster: a shallow canopy screwed to the ceiling, a threaded stem and
  // a clevis collar, with the stem running down into the eye of the top link.
  // The canopy's top face is sunk 2px past the ceiling plane, so nothing here
  // is coplanar with the panel behind it.
  const ceilingLocal = landingCeilingY(vh, top) - y; // px above the anchor, negative
  const mountTopLocal = ceilingLocal - 2;
  const canopyH = 9;
  const mountBottomLocal = mountTopLocal + canopyH;
  // the chain's true top end rather than its nominal one: a link's own eye
  // reaches past the centre the last one is placed on
  const chainTopLocal = headTop - (links - 1) * pitch - (linkR + linkT) * linkY;
  const stemLen = Math.max(6 * S, chainTopLocal - mountBottomLocal + 6 * S);
  // the clevis sits off square to the room: dead-on it flattens into a stripe
  const MOUNT_YAW = (70 * Math.PI) / 180;

  return (
    <group position={[x, worldY(y), z]}>
      {/* the ceiling mount, above the chain so links read as hung from it */}
      <mesh position={[0, worldY(mountTopLocal + canopyH / 2), 0]} castShadow receiveShadow>
        <cylinderGeometry args={[36 * S, 28 * S, canopyH, 16]} />
        <meshStandardMaterial {...cast} />
      </mesh>
      <mesh position={[0, worldY(mountBottomLocal + stemLen / 2), 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4 * S, 4 * S, stemLen, 10]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh
        position={[0, worldY(mountBottomLocal + 4 * S), 0]}
        rotation={[0, MOUNT_YAW, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[32 * S, 10 * S, 5 * S]} />
        <meshStandardMaterial {...cast} />
      </mesh>

      {/* the chain, and the yoke it lands on. A link is an oval, and
          consecutive ones have to overlap by well over their own wall
          thickness; alternating them about X rather than about the hanging axis
          is what stops the run reading as a column of floating washers. */}
      {Array.from({ length: links }).map((_, i) => (
        <mesh
          key={i}
          position={[0, worldY(headTop - i * pitch), 0]}
          rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}
          scale={[1, linkY, 1]}
        >
          <torusGeometry args={[linkR, linkT, 6, 12]} />
          <meshStandardMaterial {...cast} />
        </mesh>
      ))}
      <mesh position={[0, worldY(headTop + 5 * S), 0]} castShadow receiveShadow>
        <boxGeometry args={[17 * S, 13 * S, 5 * S]} />
        <meshStandardMaterial {...cast} />
      </mesh>

      {/* The shade, drawn at its own full size — this group is the only place
          its scale is applied, and `headTop` above comes off the same number,
          so the casting's crown always meets the yoke sitting on it. */}
      <group scale={S}>
        {/* The cast head. A casting of this period is finned because it had to
            shed the heat of the lamp under it, and the fins are the reason it
            reads as engineered rather than merely old. They stand off the
            barrel on their own radius — rotating a box about the axis it is
            already centred on moves it nowhere, which is how eight of them came
            to be hidden inside one another. */}
        <mesh position={[0, worldY(headY), 0]} castShadow receiveShadow>
          <cylinderGeometry args={[17, 23, 30, 14]} />
          <meshStandardMaterial {...cast} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 20, worldY(headY), Math.cos(a) * 20]}
              rotation={[0, a, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[3, 26, 15]} />
              <meshStandardMaterial {...cast} />
            </mesh>
          );
        })}
        <mesh position={[0, worldY(headY + 17), 0]} castShadow receiveShadow>
          <cylinderGeometry args={[27, 27, 4, 18]} />
          <meshStandardMaterial {...cast} />
        </mesh>

        {/* the dome, and its lip — a shade with no rim reads as a paper cone.
            The rim sits at the guard's own top ring rather than above it: the
            shade has to reach down far enough to nest the guard inside it, or
            the two read as separate fixtures with the wall showing through the
            gap between them. */}
        <mesh position={[0, worldY(2), 0]} castShadow receiveShadow>
          <sphereGeometry args={[R, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...cast} side={DoubleSide} />
        </mesh>
        <mesh position={[0, worldY(4), 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[R * 0.99, 3, 6, 28]} />
          <meshStandardMaterial {...steel} />
        </mesh>

        {/* the glass */}
        <mesh position={[0, worldY(20), 0]} scale={[1, 1.2, 1]}>
          <sphereGeometry args={[16, 16, 12]} />
          <meshStandardMaterial
            userData={{ selfLit: true }}
            color="#3a2408"
            emissive="#ffdca6"
            emissiveIntensity={tuning.landingGlass}
            roughness={0.35}
          />
        </mesh>

        {/* and the guard over it — the fitting's whole signature, dark uprights
            against a bright bulb */}
        {Array.from({ length: bars }).map((_, i) => (
          <group key={i} rotation={[0, (i / bars) * Math.PI * 2, 0]}>
            <mesh
              position={[0, worldY((cageTop + cageBot) / 2), (rTop + rBot) / 2]}
              rotation={[lean, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[2.6, barLen, 2.6]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          </group>
        ))}
        {[[cageTop, rTop], [cageBot, rBot]].map(([v, r]) => (
          <mesh key={v} position={[0, worldY(v), 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <torusGeometry args={[r, 2.4, 6, 20]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {/* The finial closing the cage under the bulb.
            ── and neither it nor the rings above cast ──────────────────────
            They sit directly under the point the light comes from, and a point
            source has no size: a 5px ball 40px below it subtends the whole
            nadir, and at `shadowRadius` 14 the result was a dark ellipse the
            width of the light pool, dead centre on the floor. It read as a hole
            in the concrete and it was the first thing the eye found once the
            floor was bright enough to see at all.
            A real bulb is a volume and its guard is a wire basket, so this
            shadow does not exist in the thing being modelled — it is an
            artefact of putting the source at the fitting's centre. The
            uprights still cast, and should: a caged lamp throwing bars across
            a wall is the fitting's whole signature. It is only what stands
            *below* the filament that is a lie. */}
        <mesh position={[0, worldY(cageBot + 6), 0]} receiveShadow>
          <sphereGeometry args={[6, 10, 8]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * One floor's opening: the landing behind it, and the reveal into it.
 *
 * Memoized, and this is the one that matters most. `BackWall` recomputes and
 * re-renders every ride tick — it has to, `shut` is continuous — but its own
 * body is cheap. This is not: the pendant alone is dozens of meshes, and with
 * the wall props behind it, re-running this function on every tick was
 * re-diffing that whole subtree sixty-odd times a second for a result that is
 * almost always byte-identical. Nothing here depends on where the cage is any
 * more — `top` is a property of the floor, and the stack above does the
 * riding — so the memo holds for the whole life of the page.
 *
 * **Built once, shown or hidden after that.** Both flags below are `visible`,
 * never a mount, and that is not the same thing as the old gate giving up: a
 * hidden subtree is skipped whole by the renderer, in the camera pass and in
 * every shadow pass, so it costs exactly what an unmounted one did to draw.
 * What it no longer costs is the *rebuilding* — geometry uploaded again,
 * materials made again, and the last reference to a compiled shader program
 * dropped on the way out, so the driver has to link it a second time on the
 * frames the doors are parting.
 */
const Landing = memo(function Landing({ vw, vh, top, floor, furnished, shown, doorOpen, doorShut }) {
  const w = vw * DOORWAY_W_FRAC;
  const left = (vw - w) / 2;
  const back = -SHAFT_DEPTH - LANDING_SETBACK;
  // The landing runs past the opening on every side, and it has to: it sits
  // `LANDING_SETBACK` further from the camera than the hole it is seen through,
  // so from anywhere but dead centre the line of sight through the opening's
  // edge lands *outside* a wall the same width as the opening. In CSS that gap
  // shows as nothing, because everything around it is already black; lit, it is
  // a hard-edged wedge of void. The overhang hides behind the piers, which are
  // nearer. It is also the honest reading of the room: there is no wall at
  // either end of that corridor, it simply runs out of light.
  const over = LANDING_SETBACK;
  const roomLeft = left - over;
  const roomW = w + over * 2;
  // Where the floor and ceiling sit. The ceiling in particular is not a free
  // choice — it is pinned to the pendant's own reach (`landingCeilingY`), with
  // clearance to spare, so a real ceiling plane can never again clip the chain
  // that hangs from it.
  const floorY = landingFloorY(vh, top);
  const ceilingY = landingCeilingY(vh, top);
  // The floor's own albedo, and the ceiling's, are knobs rather than constants
  // — see `floorShade` in `tuning.js` for why the floor of all surfaces earned
  // one. The skirting and the cornice are grained now as well: they are the two
  // longest horizontal lines in the room and they were flat colour.
  const { floorShade } = useLightTuning();
  const trim = useFittingMaterial(SURFACES.landing, 1.35, [roomW, 12]);
  return (
    // Its own room, so the shaft's fittings cannot light it through the masonry
    // between them. See  — this is the wall, as far as light is concerned.
    <Room room="landing" visible={shown}>
      {/* the back wall, between the floor and ceiling lines only */}
      <Panel surface={SURFACES.landing} left={roomLeft} top={ceilingY} w={roomW} h={floorY - ceilingY} z={back} />
      {/* the floor and the ceiling, real planes receding from the doorway
          threshold to the back wall — the same trick as the cage's own deck and
          roof. A fitting hanging in real depth needs a real floor under it, or
          it sinks into whatever is merely painted there. No jambs — with side
          walls too this was a room the size of a doorway, and a lift that opens
          into a cupboard has nowhere to go.
          **They are hinged at opposite ends, and that is not a detail.** A
          `pitch` of -90 tips a plane's face *downward*, which is what a ceiling
          wants and is exactly wrong for a floor: built that way the landing's
          floor faced the earth, so back-face culling removed it from the camera
          and the pendant's light landed on the side of it nobody can see. The
          room had no floor at all — which is why anything stood on it read as
          hovering and why the only thing visible down there was a painted
          shadow blob. The cage's own deck (`CageDeck`, `pitch={isRoof ? -90 :
          90}`) already states the rule: a surface you look down onto is hinged
          at its far edge and runs *toward* the camera. */}
      <Panel surface={SURFACES.landingFloor} hinge="top" pitch={90} shade={floorShade} left={roomLeft} top={floorY} w={roomW} h={LANDING_SETBACK} z={back} />
      <Panel surface={SURFACES.landing} hinge="top" pitch={-90} shade={0.3} left={roomLeft} top={ceilingY} w={roomW} h={LANDING_SETBACK} z={-SHAFT_DEPTH} />
      {/* the skirting and the cornice: a proud strip along the floor and
          ceiling lines, not a shaded stripe painted flat on the wall behind
          them */}
      <mesh position={[roomLeft + roomW / 2, worldY(floorY), back + 5]} castShadow receiveShadow>
        <boxGeometry args={[roomW, 12, 10]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      <mesh position={[roomLeft + roomW / 2, worldY(ceilingY), back + 5]} castShadow receiveShadow>
        <boxGeometry args={[roomW, 12, 10]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      {/* The fittings. Behind a shut door there is nothing to see, so they are
          not drawn — but they stay built, for the reason in this component's
          own note. */}
      <group visible={furnished}>
        <Pendant vw={vw} vh={vh} top={top} />
        <LandingProps idx={floor} vw={vw} vh={vh} top={top} />
        <LandingScreen
          floor={floor} side={SCREEN_SIDE[floor]} left={left} w={w}
          floorY={floorY} ceilingY={ceilingY} back={back}
          doorOpen={doorOpen} doorShut={doorShut}
        />
      </group>
    </Room>
  );
});

/**
 * The blind wall at the end of the shaft, cut into piers and spandrels so the
 * landings are genuinely behind it rather than painted on it.
 */
function BackWall({ vw, vh, pos, floorPx, ticker, ride, deck, intro, warm }) {
  const overscan = vh * BACK_OVERSCAN;
  const w = vw * DOORWAY_W_FRAC;
  const h = vh * DOORWAY_H_FRAC;
  const left = (vw - w) / 2;
  const here = Math.round(pos);
  const slots = [here - 2, here - 1, here, here + 1, here + 2];

  // The whole stack of floors rides on one group, written straight to the
  // object every ride frame. `pos` still decides which stretch of masonry is
  // built and which landings are lit — that is structural, and does not need to
  // be fresh sixty times a second.
  const stack = useRideMotion(ticker, (group, floorPos) => {
    group.position.y = worldY(floorPos * floorPx);
  }, pos, [floorPx]);

  return (
    <>
      {/* the piers, running the full height either side of every opening. They
          do not ride with the floors — a pier is the same pier at every one. */}
      <Panel surface={SURFACES.backWall} left={0} top={-overscan} w={left} h={vh + overscan * 2} z={-SHAFT_DEPTH} />
      <Panel surface={SURFACES.backWall} left={left + w} top={-overscan} w={vw - left - w} h={vh + overscan * 2} z={-SHAFT_DEPTH} />

      <group ref={stack}>
        {/* The masonry: a window of five floors around wherever the cage is,
            because the shaft is unbounded and the wall has to be built as it
            arrives. Every panel here shares one material with the wall above
            and below it, so sliding this window compiles nothing. */}
        {slots.map((f) => {
          const top = openingTop(vh, floorPx, f);
          const isDeck = f >= 0 && f < DECKS.length;
          return (
            <group key={f}>
              <Panel surface={SURFACES.backWall} left={left} top={top + h} w={w} h={floorPx - h} z={-SHAFT_DEPTH} />
              {/* dead shaft above the top floor and below the bottom one */}
              {!isDeck && <Panel surface={SURFACES.backWall} left={left} top={top} w={w} h={h} z={-SHAFT_DEPTH} />}
            </group>
          );
        })}

        {/* The landings, all of them, for the life of the page — hidden, not
            unbuilt. There are four, they never move relative to one another,
            and the alternative is the door-opening hitch: a room's worth of
            geometry uploaded and a shader program relinked on the exact frames
            the leaves are parting. Hidden costs nothing to draw; unbuilt costs
            everything to come back. */}
        {DECKS.map((_, f) => {
          const top = openingTop(vh, floorPx, f);
          // A corridor is only ever seen through an open door, so a shut one is
          // a wall and everything behind it is drawn for nobody.
          const shut = ride
            ? doorClosureAt(f, ride, deck)
            : Math.max(doorClosureAt(f, null, deck), f === deck ? intro : 1);
          return (
            <Landing
              key={f}
              vw={vw} vh={vh} top={top} floor={f}
              // the room itself, once it is near enough to be seen into at all
              shown={warm || Math.abs(f - pos) < 2.5}
              // and its fittings, once there is a door open on them
              furnished={warm || shut < 0.985}
              // real closure, unlike `furnished` above never forced by `warm` —
              // a screen mark keyed off these only ever starts once the leaves
              // have actually finished parting, never mid-swing and never
              // during the boot warm-up, and resets once they have fully shut
              // again so the next arrival gets the reveal too, not a static mark
              doorOpen={shut <= 0}
              doorShut={shut >= 1}
            />
          );
        })}
      </group>
    </>
  );
}

/**
 * The row of bulkhead fittings on the shaft wall.
 *
 * It rides the ticker, and it is built as a *repeating run* rather than as
 * whatever `lampsAt` happens to return for this frame. Both halves of that
 * matter and they are the same lesson the rivet seams already carry: the
 * fittings are one per floor and therefore evenly spaced by exactly one floor
 * pitch, so a fixed handful of them scrolled by the travel modulo that pitch is
 * the same picture as a list rebuilt every frame — with no fitting ever mounted
 * or unmounted, and no React commit standing between the wall moving and the
 * lamp bolted to it moving with it.
 *
 * That last part is the whole point. Positioned from props, the row updated only
 * when React could commit the tree, which on a high-refresh display is a third
 * of the rate the wall itself moves at: the wall slid and the lamps hopped along
 * behind it.
 */
function LampRow({ vw, vh, floorPx, pos, ticker, dim }) {
  const x = vw * (0.5 - LAMPS.side);
  const origin = vh * CAM_ORIGIN_Y - LAMPS.rise * floorPx;

  const row = useRideMotion(ticker, (group, floorPos) => {
    const travel = floorPos * floorPx;
    group.position.y = worldY(((travel % floorPx) + floorPx) % floorPx);
  }, pos, [floorPx]);

  // Two spare either side of the one in view. `LAMP_RANGE` is 1.7 floors, so
  // two covers everything that still contributes and one would not.
  return (
    <group ref={row}>
      {[-2, -1, 0, 1, 2].map((k) => (
        <Lamp key={k} p={{ id: `row${k}`, x, y: origin - k * floorPx }} dim={dim} />
      ))}
    </group>
  );
}

/**
 * The cable that replaced the guide rail, running the height of the shaft on
 * the lamp side. It wanders, and that is the whole reason it works where the
 * rail did not: a straight vertical bar facing the camera has both its long
 * edges at the same depth, so there is no convergence to be had and shading is
 * the only cue left. A line that snakes gives its own position away at every
 * turn. Here that is a tube swept along a sine — the CSS backend draws the same
 * curve as an SVG path.
 */
function ShaftCable({ vh, x, pos, floorPx, ticker }) {
  // One period of the run, long enough that the repeat is not a pattern.
  const WAVE = 620;
  const curve = useMemo(() => {
    // This is a repeating run, rather than one viewport-sized cable.  The
    // group below only ever moves it by one period before wrapping back to
    // zero; starting and ending a period straight means those two positions
    // meet exactly.  The old path was as tall as the viewport but shifted by a
    // 620px modulus, so its upper end wandered into view further on every
    // floor.
    //
    // A cable is not a sine wave. It hangs against the wall and is tied back
    // every so often, so it runs straight for most of its length and kinks
    // where it is clipped or has been pulled aside.
    const kinks = [
      [0, 0], [0.08, 0], [0.17, 6], [0.24, 2], [0.38, 1],
      [0.46, -7], [0.53, -3], [0.68, 0], [0.79, 5], [0.87, 1], [0.92, 0], [1, 0],
    ];
    // One spare repeat is kept above and below the viewport. A translated
    // repeat can therefore never expose an end; the only joins are between
    // identical, vertical pieces of cable, outside the visible shaft.
    const periods = Math.ceil((vh + WAVE * 2) / WAVE);
    const pts = [];
    for (let period = 0; period < periods; period += 1) {
      for (let i = period ? 1 : 0; i < kinks.length; i += 1) {
        const [t, dx] = kinks[i];
        pts.push(new Vector3(dx, worldY(-WAVE + (period + t) * WAVE), 0));
      }
    }
    return new CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
  }, [vh]);

  // The wave repeats exactly, so the run is built once and shifted by the
  // travel modulo one period — a transform per frame rather than a few hundred
  // points of geometry rebuilt.
  const group = useRideMotion(ticker, (g, floorPos) => {
    const travel = floorPos * floorPx;
    g.position.y = worldY(((travel % WAVE) + WAVE) % WAVE);
  }, pos, [floorPx]);

  return (
    <group ref={group} position={[x, 0, -SHAFT_DEPTH + 5]}>
      <mesh>
        <tubeGeometry args={[curve, Math.ceil(curve.points.length * 6), 4.5, 6, false]} />
        <meshStandardMaterial color="#080706" roughness={0.55} metalness={0.25} />
      </mesh>
    </group>
  );
}

/**
 * The counterweight and the ropes it hangs on. It runs opposite the cabin at
 * twice the shaft's rate, which is what a counterweight on a 2:1 roping does,
 * and it is furniture rather than the subject — knocked back, it reads as
 * texture instead of demanding attention it cannot repay.
 */
function Counterweight({ vw, vh, pos, floorPx, ticker }) {
  const W = 62;
  const D = 42;
  const height = vh * 1.15;
  const x = vw - COUNTERWEIGHT_INSET_X;
  const steel = surfaceProps(SURFACES.steel, 0.8);

  const block = useRideMotion(ticker, (g, floorPos) => {
    g.position.y = worldY(counterweightY(floorPos, floorPx, height));
  }, pos, [floorPx, height]);

  // the ropes stop at the crosshead: drawn past it they read as the block
  // dangling from below rather than hanging from them
  const ropes = useRideMotion(ticker, (g, floorPos) => {
    const bottom = counterweightY(floorPos, floorPx, height) - 15;
    const top = -vh * 1.6;
    const run = Math.max(1, Math.min(bottom, vh + 240) - top);
    g.scale.y = run;
    g.position.y = worldY(top + run / 2);
  }, pos, [floorPx, height, vh]);

  return (
    <group position={[x, 0, COUNTERWEIGHT_Z]}>
      <group ref={ropes}>
        {[-16, 0, 16].map((dx) => (
          <mesh key={dx} position={[dx, 0, 22]}>
            <boxGeometry args={[4, 1, 4]} />
            <meshStandardMaterial color="#4a5157" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
      </group>
      <group ref={block}>
        <mesh position={[0, worldY(height / 2), 0]}>
          <boxGeometry args={[W, height, D]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {/* the crosshead the ropes terminate in */}
        <mesh position={[0, worldY(-8), D / 2 + 3]}>
          <boxGeometry args={[W + 16, 17, 10]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.steel, 1.05)} />
        </mesh>
      </group>
    </group>
  );
}

function ShaftScene({ vw, vh, pos, floorPx, ticker, ride, deck, intro, warm, dim = 1, onSettle }) {
  // the room we can actually see into, which during a trip is not the deck we
  // set off from — see
  return (
    <>
      <SceneLights
        vw={vw} vh={vh} floorPx={floorPx} ticker={ticker}
        deck={deck} ride={ride} intro={intro} warm={warm} dim={dim}
      />
      <Room room="shaft">
        <Walls vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
      <BackWall vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} ride={ride} deck={deck} intro={intro} warm={warm} />
      <ShaftCable vh={vh} x={vw * (0.5 - LAMPS.side)} pos={pos} floorPx={floorPx} ticker={ticker} />
      <Counterweight vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
      {/* the fittings, bolted to the far wall either side of every landing.
          They are emissive meshes, not lights — the row is represented by the
          rig above, standing among them. */}
      <LampRow vw={vw} vh={vh} floorPx={floorPx} pos={pos} ticker={ticker} dim={dim} />
      </Room>
      {/* last, so its effect runs once every sibling above has attached its
          meshes and there is a whole scene to compile */}
      <CanvasBoot name="shaft" onSettle={onSettle} />
    </>
  );
}

export default ShaftScene;
