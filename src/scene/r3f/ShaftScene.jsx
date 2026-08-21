import { useMemo } from 'react';
import { CatmullRomCurve3, DoubleSide, Vector3 } from 'three';
import { SHAFT_DEPTH } from '../model/camera.js';
import {
  BACK_OVERSCAN, COUNTERWEIGHT_INSET_X, COUNTERWEIGHT_Z, DOORWAY_H_FRAC, DOORWAY_W_FRAC,
  LANDING_SETBACK, PENDANT_DROP_FRAC, PENDANT_HEAD_RISE, counterweightY, landingCeilingY,
  landingFloorY, openingTop,
} from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { LAMPS } from '../model/lighting.js';
import { Panel } from '../renderers/r3f/Surface.jsx';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import SceneLights from './SceneLights.jsx';
import Lamp from '../renderers/r3f/Lamp.jsx';
import Rivets from '../renderers/r3f/Rivets.jsx';
import Room from '../renderers/r3f/Room.jsx';
import { pendantAt } from '../renderers/r3f/lighting.js';
import { useLightTuning } from '../renderers/r3f/tuning.js';
import useRideMotion from '../renderers/r3f/useRideMotion.js';
import LandingProps from './LandingProps.jsx';
import LandingScreen from './LandingScreen.jsx';
import { DECKS, SCREEN_SIDE } from '../../lift/decks.js';
import { doorClosureAt, openFloor } from '../../lift/ride.js';

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
  const R = 62;                    // across the dome
  const headY = -36;               // the finned casting the shade hangs off
  const headTop = -PENDANT_HEAD_RISE;
  const drop = vh * PENDANT_DROP_FRAC; // chain from the ceiling down to the yoke

  // A chain link is an oval, and consecutive links have to overlap by well over
  // their own wall thickness. A pitch of one whole link leaves them merely
  // stacked, and alternating them about X rather than about the hanging axis
  // lays every one of them flat — between the two, the chain read as a column
  // of floating washers.
  const linkR = 7;
  const linkT = 2;
  const linkY = 1.45;              // stretched from a ring into a link
  const pitch = 2 * (linkR + linkT) * linkY * 0.6;
  const links = Math.max(2, Math.round(drop / pitch));

  // The guard. It is a barrel, not a cylinder: wider where it meets the shade
  // and drawn in under the bulb, so each upright leans by its own taper.
  const cageTop = 2;
  const cageBot = 44;
  const rTop = 25;
  const rBot = 17;
  const bars = 8;
  const lean = Math.atan2(rTop - rBot, cageBot - cageTop);
  const barLen = Math.hypot(cageBot - cageTop, rTop - rBot);

  return (
    <group position={[x, worldY(y), z]}>
      {/* the chain, and the yoke it lands on */}
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
      <mesh position={[0, worldY(headTop + 5), 0]} castShadow receiveShadow>
        <boxGeometry args={[17, 13, 5]} />
        <meshStandardMaterial {...cast} />
      </mesh>

      {/* The cast head. A casting of this period is finned because it had to
          shed the heat of the lamp under it, and the fins are the reason it
          reads as engineered rather than merely old. They stand off the barrel
          on their own radius — rotating a box about the axis it is already
          centred on moves it nowhere, which is how eight of them came to be
          hidden inside one another. */}
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
        <mesh key={v} position={[0, worldY(v), 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[r, 2.4, 6, 20]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {/* the finial closing the cage under the bulb */}
      <mesh position={[0, worldY(cageBot + 6), 0]} castShadow receiveShadow>
        <sphereGeometry args={[6, 10, 8]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  );
}

/** One floor's opening: the landing behind it, and the reveal into it. */
function Landing({ vw, vh, top, floor, furnished }) {
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
  return (
    // Its own room, so the shaft's fittings cannot light it through the masonry
    // between them. See  — this is the wall, as far as light is concerned.
    <Room room="landing">
      {/* the back wall, between the floor and ceiling lines only */}
      <Panel surface={SURFACES.landing} left={roomLeft} top={ceilingY} w={roomW} h={floorY - ceilingY} z={back} />
      {/* the floor and the ceiling, real planes receding from the doorway
          threshold to the back wall — the same trick as the cage's own deck and
          roof. A fitting hanging in real depth needs a real floor under it, or
          it sinks into whatever is merely painted there. No jambs — with side
          walls too this was a room the size of a doorway, and a lift that opens
          into a cupboard has nowhere to go. */}
      <Panel surface={SURFACES.landing} hinge="top" pitch={-90} shade={0.85} left={roomLeft} top={floorY} w={roomW} h={LANDING_SETBACK} z={-SHAFT_DEPTH} />
      <Panel surface={SURFACES.landing} hinge="top" pitch={-90} shade={0.3} left={roomLeft} top={ceilingY} w={roomW} h={LANDING_SETBACK} z={-SHAFT_DEPTH} />
      {/* the skirting and the cornice: a proud strip along the floor and
          ceiling lines, not a shaded stripe painted flat on the wall behind
          them */}
      <mesh position={[roomLeft + roomW / 2, worldY(floorY), back + 5]} castShadow receiveShadow>
        <boxGeometry args={[roomW, 12, 10]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.landing, 1.5)} />
      </mesh>
      <mesh position={[roomLeft + roomW / 2, worldY(ceilingY), back + 5]} castShadow receiveShadow>
        <boxGeometry args={[roomW, 12, 10]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.landing, 1.3)} />
      </mesh>
      {furnished && <Pendant vw={vw} vh={vh} top={top} />}
      {furnished && <LandingProps idx={floor} vw={vw} vh={vh} top={top} />}
      {furnished && (
        <LandingScreen
          floor={floor} side={SCREEN_SIDE[floor]} left={left} w={w}
          floorY={floorY} ceilingY={ceilingY} back={back}
        />
      )}
    </Room>
  );
}

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
  // object every ride frame. `pos` still decides which floors are built and
  // which are furnished — that is structural, and does not need to be fresh
  // sixty times a second.
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
        {slots.map((f) => {
          const top = openingTop(vh, floorPx, f);
          const isDeck = f >= 0 && f < DECKS.length;
          // A corridor is only ever seen through an open door, so a shut one is
          // a wall and everything behind it is work done for nobody.
          const shut = ride ? doorClosureAt(f, ride, deck) : Math.max(doorClosureAt(f, null, deck), f === deck ? intro : 1);
          return (
            <group key={f}>
              <Panel surface={SURFACES.backWall} left={left} top={top + h} w={w} h={floorPx - h} z={-SHAFT_DEPTH} />
              {isDeck
                ? (
                  <Landing
                    vw={vw} vh={vh} top={top} floor={f}
                    // The shut door normally means nobody is looking, so the
                    // landing behind it stays unbuilt. But that gate is exactly
                    // why the very first door-opening used to be a slideshow:
                    // the cabinet, the pendant and everything they are made of
                    // mounted — and compiled their shaders — for the first time
                    // on the same frames the door was already swinging open.
                    // `warm` forces this one build to happen a beat earlier,
                    // behind a door that is still fully shut, so there is
                    // nothing left to compile once there is something to see.
                    furnished={Math.abs(f - pos) < 1.25 && (shut < 0.985 || (warm && f === deck))}
                  />
                )
                /* dead shaft above the top floor and below the bottom one */
                : <Panel surface={SURFACES.backWall} left={left} top={top} w={w} h={h} z={-SHAFT_DEPTH} />}
            </group>
          );
        })}
      </group>
    </>
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

function ShaftScene({ vw, vh, pos, floorPx, lamps, ticker, ride, deck, intro, warm }) {
  // the room we can actually see into, which during a trip is not the deck we
  // set off from — see
  const open = openFloor(ride, deck);
  return (
    <>
      <SceneLights
        vw={vw} vh={vh} lamps={lamps} floorPx={floorPx}
        deckTop={openingTop(vh, floorPx, open.floor) + pos * floorPx}
        closure={Math.max(open.closure, open.floor === deck ? intro : 0)}
      />
      <Room room="shaft">
        <Walls vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
      <BackWall vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} ride={ride} deck={deck} intro={intro} warm={warm} />
      <ShaftCable vh={vh} x={vw * (0.5 - LAMPS.side)} pos={pos} floorPx={floorPx} ticker={ticker} />
      <Counterweight vw={vw} vh={vh} pos={pos} floorPx={floorPx} ticker={ticker} />
      {/* the fittings, bolted to the far wall either side of every landing.
          They are emissive meshes, not lights — the row is represented by the
          single key light above, standing among them. */}
      {lamps.map((L) => <Lamp key={L.id} p={L} />)}
      </Room>
    </>
  );
}

export default ShaftScene;
