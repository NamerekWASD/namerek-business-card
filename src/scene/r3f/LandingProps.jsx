import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PROJECTS, SLIDES } from '../../decks/projects.js';
import {
  BELT, bandOffset, beltAt, beltCount, beltTrip, pathLength, posAt,
} from '../renderers/r3f/belt.js';
import { useFullscreenGallery } from './fullscreenImage.js';
import NoticeScreen from './NoticeScreen.jsx';
import { invalidateScene } from '../renderers/r3f/frames.js';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide,
  LatheGeometry, Vector2, Vector3,
} from 'three';
import { CAM_PERSPECTIVE, SHAFT_DEPTH } from '../model/camera.js';
import {
  DOORWAY_W_FRAC, LANDING_SETBACK, landingCeilingY, landingFloorY, pxPerM,
} from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { useLightTuning } from '../renderers/r3f/tuning.js';
import {
  RACK, SHEET, TAPE_ASPECT, artifactFace, beltBand, benchBand, benchTop, chestPanel,
  drawerFace, postBoxCard, postBoxSkin, punchTape, rackCol, rackGap, schematicSheet,
  valveRackPlate,
} from '../renderers/r3f/propArt.js';
import { lampGlow } from '../renderers/r3f/patterns.js';
import usePilotLamps from '../renderers/r3f/pilotLamps.js';
import { SCREEN_SIDE } from '../../lift/decks.js';

// One identifying object per landing, so a floor is somewhere rather than a
// number.
//
// ── everything here is in metres ─────────────────────────────────────────────
// Not as a tidiness measure. Furniture is the only thing in this frame whose
// size the viewer already knows, so a bench and a crate are how the room states
// its own scale — and every one of these was previously built from a pixel
// figure picked by eye. The workbench came out 94 scene pixels tall, which
// against this room is a third of a metre. They did not look small; they *were*
// small, by a factor of three, and no amount of better modelling fixes a
// half-scale object. So `M` below is the room's own metre (`pxPerM`), and
// nothing in this file is sized any other way.
//
// ── and they stand on the floor ──────────────────────────────────────────────
// There was a `standing()` helper here returning `top + h * 0.9` where the
// landing's floor is at `top + h`, so every prop hovered eighty pixels clear of
// it. That was invisible for a while because the floor itself was invisible —
// its panel was built facing downward and back-face culling removed it from the
// camera (see `Landing` in `ShaftScene.jsx`). With a real floor under them the
// offset shows immediately, so the floor line is now read from the one function
// that defines it and nowhere else.
//
// ── and they cast real shadows ───────────────────────────────────────────────
// The painted `ContactShadow` blobs are gone. They were a soft dark ellipse laid
// on the floor plane, which is a reasonable stand-in when there is no shadow
// map — and this scene has had shadow-casting point lights for a while now, so
// what they actually did was sit on an invisible floor as a black smear with
// nothing casting it. The pendant casts; the props cast; the floor receives.

// ── where a prop stands ──────────────────────────────────────────────────────
// **Furniture goes under the page's own column, against the wall.** Mykolai's
// call, twice, and it overturned what was here before — which put every prop on
// the *other* half, standing in front of the lit wall screen for the sake of a
// silhouette. That reasoning was not wrong about silhouettes and was wrong
// about the picture: a full-size object out in the open on the empty half stops
// being furniture and starts being the subject of the shot, and this scene
// already has a subject. His words for it were "в сцену не вписывается" —
// realistic, and not part of the room.
//
// Under the text it is background. The column runs down the middle of one half
// of the opening (48% of it, see `Dieselpunk.jsx`), the heading sits high in
// that half, and a bench or a box pushed back to the wall beneath it reads as
// what is standing in the room the text is printed over. Two things follow and
// both are wanted: the prop is further from the pendant, so it is dimmer and
// knocked back where it belongs; and it stops fighting the wall screen, which
// gets its whole panel to itself again.
//
// What a prop must not do down there is out-shine the text above it, which is
// the other half of "не вписывается" — see the note on the post box's enamel.

/**
 * Where to stand something so it lands under the page's own column.
 *
 * The column is a screen-space fact — 48% of the doorway aperture, hugging one
 * side — and a prop is a scene-space object several hundred pixels behind that
 * aperture, so the two only line up through the perspective divide. Doing it by
 * eye is how a prop ends up correctly placed at one viewport and off the column
 * at every other.
 *
 * @param {number} vw
 * @param {'left' | 'right'} side which half the page's content is on
 * @param {number} across 0 at the column's inner edge, 1 at its outer one.
 *   May go negative, which straddles the centre line — see the bench, whose
 *   two metres do not fit inside a column half this wide.
 * @param {number} z the depth the prop will stand at
 */
const underColumn = (vw, side, across, z) => {
  const w = vw * DOORWAY_W_FRAC;
  const doorScale = CAM_PERSPECTIVE / (CAM_PERSPECTIVE + SHAFT_DEPTH);
  // the column's near and far edges, as fractions of the aperture's half width
  const f = 0.04 + 0.96 * across;
  const offset = (side === 'left' ? -f : f) * (w / 2) * doorScale;
  // …and back out to a scene x that projects there from this depth
  return vw / 2 + (offset * (CAM_PERSPECTIVE - z)) / CAM_PERSPECTIVE;
};

/** How much of the room's bounce reaches a face, by which way it is turned. */
const FACE = { up: 1.2, side: 0.82, down: 0.28 };

/**
 * A surface whose own artwork carries the room's ambience as well as its
 * colour.
 *
 * This is the one thing every textured prop in here needs and it is not
 * decoration — it is what makes the texture visible at all. `Room` gives every
 * material in the landing `emissive = albedo × ambient`, one flat colour over
 * the whole face, and on these props that term is *brighter* than anything the
 * pendant delivers to a vertical surface. A flat emissive cannot show a
 * pattern, so artwork under one is artwork thrown away.
 *
 * Handing the same canvas back as `emissiveMap` makes the bounce carry the
 * picture instead of flooding it. `selfLit` keeps `Room` from overwriting the
 * result on its next traverse, and the level is read from the bench rather than
 * frozen, so the ambience slider still moves these props along with everything
 * else in the room — which is the whole reason `Room` owned this in the first
 * place.
 *
 * `weight` is how much of the room's bounce this particular face is entitled
 * to, and it is not a fudge for the lamp being weak. A room's bounce is not
 * isotropic: an upward face sees the ceiling and the lit air under the pendant,
 * a downward one sees a foot of dark floor and its own shadow, and a flank sees
 * something in between. Without it every face of a box gets an identical
 * emissive and the box loses the one thing that makes it a solid — its faces
 * disagreeing. `FACE` below states the three values once.
 *
 * @param {import('three').Texture | null} map
 * @param {number} ambient
 * @param {number} [weight]
 */
const artwork = (map, ambient, weight = FACE.side) => (map ? {
  map,
  color: '#ffffff',
  emissive: '#ffffff',
  emissiveMap: map,
  emissiveIntensity: ambient * weight,
  userData: { selfLit: true },
} : null);


// ─────────────────────────────────────────────────────────────────────────────
// EG — the valve rack
// ─────────────────────────────────────────────────────────────────────────────
// The one prop that is about the site's own subject. It was a patch bay: a
// field of jacks with three cords bridged across it, which is a switched
// network under the brass. The idea was right and the object was mute — a board
// of holes reads as a board of holes from any distance, and the only thing on
// it the eye could catch was six beads of glass the size of a full stop.
//
// It is now three decks of eight valves in the same case. Everything the panel
// had that was working is kept, because none of it was ever about the jacks:
//
// *Size.* A distribution case of this period is the better part of a metre
// tall, hung at hand height because someone has to work at it.
//
// *A case, with the door standing open.* A flat plate has no silhouette; a
// hinged door swung back gives it one, throws a shadow across the wall behind
// it, and says the thing is in use rather than sealed.
//
// *Its supply, arriving somewhere.* A cable rising out of a gland on the top of
// the case and running away under the cornice is what makes the rack part of
// the building rather than an object placed against it.
//
// *Lamps that are not all doing the same thing.* See `usePilotLamps`. What
// changed is only what they are: the board used to be six pilot lamps *about*
// the circuits, and it is now the circuits themselves. "This jack has a cord in
// it" became "this valve is in the live stage", one for one.
//
// And it gains the thing the jack field never had, which is why the swap was
// worth it: a valve is *lit from inside*, and this is the best-lit spot in the
// room only in the sense that the pendant reaches it. Twenty-one hot heaters
// standing in a dark case do not need reaching.
//
// ── why most of them sit still ──────────────────────────────────────────────
// Only eight of the twenty-one are driven. That is a budget decision and a
// truth about the object at the same time. The budget: this scene is
// `frameloop="demand"`, and every valve that changes is a redraw of a landing
// holding a pendant, the props and the wall screen — a board of eight settles
// at two or three redraws a second, and twenty-four would triple that for a
// prop nobody is looking straight at. The truth: a heater does not blink. What
// a working bay looks like is a wall of steady filaments with the switched
// stages moving against it, and a rack where every valve flickered would read
// as a Christmas tree.

// Which sockets are driven, and what each of them is doing. Both are read off
// `RACK.STAGE` rather than written out again here, so a valve cannot end up
// wired to a lamp that is not in it — the same discipline `PATCHED` kept when
// this was a patch bay and the cords decided it.
const RACK_DRIVEN = RACK.STAGE.map(([socket]) => socket);
const RACK_CARRYING = RACK.STAGE.map(([, carrying]) => carrying);

/**
 * How hard a heater glows, driven and undriven.
 *
 * Not `LAMP_LIT` / `LAMP_DARK`, and the difference is the whole character of
 * the prop. Those two are authored for a pilot lamp, which is a thing that is
 * *on or off* and has to clear the brass ring it sits in at one end and go
 * properly cold at the other. A heater has no off state worth painting: it
 * dims and comes back. So the swing is narrower, it is centred near where the
 * undriven valves sit, and the result is a rack that breathes rather than one
 * that flashes.
 */
const VALVE_LIT = 2.6;
const VALVE_DIM = 0.55;
const VALVE_WARM = 1.0;

/**
 * The profile of a valve, turned about its own axis.
 *
 * Ten points and ten segments, which is more than it sounds like it needs and
 * exactly as much as it does: the whole silhouette of the object is the
 * shoulder and the dome, and a cylinder with a flat top is a battery.
 *
 * @param {number} r the glass at its widest @param {number} h overall
 */
const valveProfile = (r, h) => [
  [0, 0], [0.6, 0], [0.66, 0.06], [0.62, 0.13], [1, 0.22],
  [1, 0.74], [0.88, 0.86], [0.55, 0.95], [0.2, 1], [0, 1],
].map(([pr, ph]) => new Vector2(pr * r, ph * h));

function ValveRack({ M, x, y, z, ambient, live }) {
  const plateW = RACK.PLATE.W * M;
  const plateH = RACK.PLATE.H * M;
  const caseW = plateW + 0.12 * M;
  const caseH = plateH + 0.14 * M;
  const caseD = 0.16 * M;
  const plate = valveRackPlate();
  const plateArt = artwork(plate, ambient);

  const cast = surfaceProps(SURFACES.iron, 0.9);
  const steel = surfaceProps(SURFACES.steel, 1);
  const brass = { color: '#8a6326', roughness: 0.42, metalness: 0.72 };

  /** A point on the plate, in the case's own local frame. */
  const onPlate = (u, v) => [(u - 0.5) * plateW, (0.5 - v) * plateH];

  const pitch = ((RACK.SPAN[1] - RACK.SPAN[0]) / RACK.COLS) * plateW;
  const valveR = pitch * 0.42;
  const valveH = RACK.VALVE_H * plateH;
  const deckT = 0.018 * M;
  const deckD = 0.13 * M;

  // One geometry for twenty-one valves. They differ in nothing but where they
  // stand and how hard they are glowing, and the second of those is a material.
  const glass = useMemo(
    () => new LatheGeometry(valveProfile(valveR, valveH), 10),
    [valveR, valveH],
  );
  useEffect(() => () => glass.dispose(), [glass]);

  // the case's own front plane, which everything inside it is measured from
  const front = caseD / 2;
  const plateZ = front + 0.058 * M;
  const standZ = plateZ + 0.062 * M;
  const guardZ = plateZ + 0.128 * M;

  /** Every socket in the rack, in reading order, with what is standing in it. */
  const sockets = useMemo(() => {
    const out = [];
    for (let r = 0; r < RACK.SHELVES.length; r += 1) {
      for (let c = 0; c < RACK.COLS; c += 1) {
        const i = r * RACK.COLS + c;
        const [sx] = onPlate(rackCol(c), 0);
        const deckY = (0.5 - RACK.SHELVES[r]) * plateH;
        out.push({
          i,
          x: sx,
          y: deckY,
          empty: RACK.EMPTY.includes(i),
          driven: RACK_DRIVEN.indexOf(i),
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plateW, plateH]);

  // The live rack. The materials are collected by ref and written to directly,
  // never through state — see `usePilotLamps` for why, and for why this costs
  // the scene almost nothing despite running while nobody is riding.
  const heaters = useRef([]);
  usePilotLamps(heaters, RACK_CARRYING, live, 0x9ac, { lit: VALVE_LIT, dark: VALVE_DIM });

  return (
    <group position={[x, worldY(y), z]}>
      {/* the carcass, stood off the wall on its brackets so it has somewhere to
          throw a shadow */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[caseW, caseH, caseD]} />
        <meshStandardMaterial {...cast} />
      </mesh>
      {/* the stepped bezel — the period's grammar is the step, and two tiers
          each narrower and prouder than the last cost geometry only */}
      {[[1.0, 0.028], [0.93, 0.05]].map(([k, d], i) => (
        <mesh key={k} position={[0, 0, front + (d * M) / 2]} castShadow receiveShadow>
          <boxGeometry args={[caseW * k, caseH * k, d * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.8 + i * 0.35)} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * caseW * 0.36, -caseH / 2 - 0.03 * M, -caseD / 2 - 0.025 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.06 * M, 0.1 * M, 0.05 * M]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}

      {/* ── the gland ────────────────────────────────────────────────────────
          Where the supply enters, on the top of the case. It is three turned
          steps and a lock nut, and it is doing more work than its size
          suggests: it is the thing that makes the cable above *belong to this
          box*. A pipe that merely passes near a panel is a pipe passing near a
          panel, which is exactly how the old conduit read — it ran floor to
          ceiling straight through the case and touched nothing. */}
      <group position={[GLAND_X * caseW, caseH / 2, 0]}>
        {[[0.075, 0.03, 0], [0.055, 0.035, 0.032], [0.042, 0.05, 0.062]].map(([r, hh, oy]) => (
          <mesh key={r} position={[0, (oy + hh / 2) * M, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r * M, r * M * 1.08, hh * M, 12]} />
            <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.1)} />
          </mesh>
        ))}
        {/* the lock nut: a hexagon, because that is what says "threaded" */}
        <mesh position={[0, 0.048 * M, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.062 * M, 0.062 * M, 0.022 * M, 6]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>

      {/* the backplane, recessed inside the bezel */}
      <mesh position={[0, 0, plateZ]} receiveShadow>
        <planeGeometry args={[plateW, plateH]} />
        {plateArt
          ? <meshStandardMaterial {...plateArt} roughness={0.62} metalness={0.2} />
          : <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.7)} />}
      </mesh>

      {/* ── the decks ────────────────────────────────────────────────────────
          A chassis plate per row, bolted to the ledger the bake paints behind
          it. It is what the valves stand on and it is also the only horizontal
          in the prop: three lit edges stacked up the case, which is most of
          what makes the thing read as a rack rather than a cupboard. */}
      {RACK.SHELVES.map((v) => (
        <mesh
          key={v}
          position={[0, (0.5 - v) * plateH - deckT / 2, plateZ + deckD / 2 - 0.008 * M]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[plateW * 0.95, deckT, deckD]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.15)} />
        </mesh>
      ))}

      {/* ── the valves ───────────────────────────────────────────────────────
          One material each, because each is glowing at its own level and a
          shared one would make the whole rack breathe in step — which is the
          single thing that would give the game away. */}
      {sockets.map((s) => (s.empty ? (
        // a bare socket: the ceramic is what says a valve was pulled out of it
        // rather than never fitted
        <mesh key={s.i} position={[s.x, s.y + 0.012 * M, standZ]}>
          <cylinderGeometry args={[valveR * 0.68, valveR * 0.74, 0.024 * M, 10]} />
          <meshStandardMaterial color="#4a4234" roughness={0.85} metalness={0.05} />
        </mesh>
      ) : (
        <mesh key={s.i} geometry={glass} position={[s.x, s.y, standZ]}>
          <meshStandardMaterial
            ref={(node) => {
              if (s.driven >= 0) heaters.current[s.driven] = node;
            }}
            userData={{ selfLit: true }}
            color="#2b2119"
            emissive="#ff9a3a"
            emissiveIntensity={s.driven >= 0 ? VALVE_DIM : VALVE_WARM}
            roughness={0.28}
            metalness={0.06}
          />
        </mesh>
      )))}

      {/* ── the wire guard ───────────────────────────────────────────────────
          Rails across the decks and a wire down every gap between columns.
          Down the *gaps*: at this size a guard that crossed the valves would
          take a bite out of each one, and the whole job of the thing is to be
          read through. It stops above the legend band, because a guard is over
          the glass and not over the strip someone has to read. */}
      <group position={[0, 0, guardZ]}>
        {Array.from({ length: RACK.COLS + 1 }, (_, c) => {
          const [wx] = onPlate(rackGap(c), 0);
          const [, top] = onPlate(0, RACK.RAILS[0]);
          const [, bottom] = onPlate(0, RACK.RAILS[RACK.RAILS.length - 1]);
          return (
            <mesh key={c} position={[wx, (top + bottom) / 2, 0]}>
              <cylinderGeometry args={[0.005 * M, 0.005 * M, top - bottom, 6]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          );
        })}
        {RACK.RAILS.map((v) => (
          <mesh key={v} position={[0, (0.5 - v) * plateH, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0065 * M, 0.0065 * M, plateW * 0.94, 6]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
      </group>

      {/* the mains pilot, below the guard and steady — the one lamp on the case
          that says the rack has power rather than traffic */}
      {(() => {
        const [px, py] = onPlate(RACK.PILOT[0], RACK.PILOT[1]);
        return (
          <group position={[px, py, plateZ]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.019 * M, 0.019 * M, 0.02 * M, 10]} />
              <meshStandardMaterial {...brass} />
            </mesh>
            <mesh position={[0, 0, 0.012 * M]}>
              <sphereGeometry args={[0.016 * M, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                userData={{ selfLit: true }}
                color="#3a2408"
                emissive="#ffb454"
                emissiveIntensity={3}
              />
            </mesh>
          </group>
        );
      })()}

      {/* ── the door ─────────────────────────────────────────────────────────
          Hinged on the left and standing open a little past square.
          It used to be swung 113°, and at that angle it went *into the wall*:
          a 0.78 m leaf turning about a hinge 0.08 m proud of the plaster
          reaches 0.72 m back and 0.31 m across, so all that emerged was its
          own edge — a pair of unexplained vertical stripes beside the case,
          which is exactly what Mykolai circled in red. A door has to come out
          into the room to read as a door. */}
      <group position={[-caseW / 2, 0, front]} rotation={[0, -1.78, 0]}>
        <mesh position={[caseW / 2, 0, -0.012 * M]} castShadow receiveShadow>
          <boxGeometry args={[caseW, caseH, 0.024 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.05)} />
        </mesh>
        {/* its stiffening rib and the catch it shuts on */}
        <mesh position={[caseW / 2, 0, -0.03 * M]} castShadow>
          <boxGeometry args={[caseW * 0.7, caseH * 0.72, 0.014 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.78)} />
        </mesh>
        <mesh position={[caseW * 0.94, 0, -0.03 * M]} castShadow>
          <boxGeometry args={[0.03 * M, 0.09 * M, 0.03 * M]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
      {/* the hinges themselves, on the case rather than on the leaf — a door
          that pivots about nothing is a door floating beside a box */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-caseW / 2, s * caseH * 0.32, front]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018 * M, 0.018 * M, 0.1 * M, 8]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
    </group>
  );
}

/** Where the gland sits on the top of the case, as a fraction of its width. */
const GLAND_X = 0.24;

/**
 * A scene x that projects clear off the side of the doorway, at this depth.
 *
 * Needed because the landing sits `LANDING_SETBACK` further from the camera
 * than the opening it is seen through, so scene coordinates out there are not
 * screen coordinates — running the cable to `vw * 0.99` put its cut end
 * *exactly* on the pier's edge, which is the one place a run must not stop. It
 * has to disappear behind the masonry, the way the corridor itself does.
 *
 * @param {number} vw @param {number} z
 * @param {1 | -1} [dir] which side to leave by; the cable goes right, the belt left
 */
const offRoom = (vw, z, dir = 1) =>
  vw / 2 + dir * vw * 0.58 * ((CAM_PERSPECTIVE - z) / CAM_PERSPECTIVE);

/**
 * The cable the valve rack is fed by: up out of the gland, and away to the right
 * under the cornice.
 *
 * ── the route, and why it is this one ───────────────────────────────────────
 * The old conduit ran floor to ceiling in two straight pieces with the case
 * sitting in front of the middle of it, so it arrived from under the skirting
 * and left into the plaster having touched nothing on the way. Mykolai read it
 * as "a black stripe with white dots" and said so — and he is right that it is
 * not a cable, because nothing about it says where it comes from or what it is
 * for. In a dieselpunk building services are *on* the fabric, not buried in it.
 *
 * So: it leaves the top of the case, rises to just under the cornice, turns
 * right on a radius rather than a mitre — a cable of this gauge cannot be bent
 * square and one drawn square reads as a diagram — and runs off along the wall
 * past the pier, which is where the corridor continues.
 *
 * Down is deliberately nothing. A single run that starts at the thing it feeds
 * and leaves in one direction is legible; two runs leaving a box in opposite
 * directions is a pipe the box happens to be near.
 *
 * ── and the saddles ─────────────────────────────────────────────────────────
 * The clips were the other half of the complaint: white dots at intervals whose
 * purpose was not obvious. They were a flat box behind the pipe in
 * `SURFACES.steel`, the one cold blue-grey in a catalogue that is otherwise
 * warm, so they read as specks of light rather than as ironmongery. They are
 * saddles now — a band that goes *round* the cable with a foot either side and
 * a bolt through each foot, in the same iron as everything else on this wall.
 * A band around a pipe is self-explanatory in a way a rectangle behind one is
 * not.
 */
function WallCable({ M, from, runY, toX, radius, z }) {
  const r = 0.036 * M;

  const { curve, saddles } = useMemo(() => {
    const bend = Math.min(radius, Math.abs(runY - from[1]), Math.abs(toX - from[0]));
    const pts = [];
    // the rise
    pts.push(new Vector3(from[0], worldY(from[1]), z));
    pts.push(new Vector3(from[0], worldY(runY + bend), z));
    // the bend, as a real quarter arc sampled rather than a bezier guessed at —
    // a constant-radius corner is what a cable pulled round a former looks like
    const steps = 8;
    for (let i = 1; i < steps; i += 1) {
      const a = (i / steps) * (Math.PI / 2);
      pts.push(new Vector3(
        from[0] + bend * (1 - Math.cos(a)),
        worldY(runY + bend * (1 - Math.sin(a))),
        z,
      ));
    }
    // and the run
    pts.push(new Vector3(from[0] + bend, worldY(runY), z));
    pts.push(new Vector3(toX, worldY(runY), z));
    const c = new CatmullRomCurve3(pts, false, 'catmullrom', 0.02);

    // Saddles at a fixed spacing along the cable's own length rather than along
    // either axis, so the run and the rise are clipped at the same pitch and
    // none of them lands on the bend.
    const length = c.getLength();
    const count = Math.max(2, Math.round(length / (0.62 * M)));
    const at = [];
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const p = c.getPointAt(t);
      const tangent = c.getTangentAt(t);
      at.push({ p, roll: Math.atan2(tangent.y, tangent.x) });
    }
    return { curve: c, saddles: at };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, from[0], from[1], toX, runY, radius, z]);

  // Its own material rather than the catalogue's iron, and this is the whole of
  // "make it read as a cable". A run under the cornice is the furthest point in
  // the room from the pendant, so at the iron's albedo it comes back as a black
  // stripe with the saddles glinting on it — which is precisely the thing being
  // fixed, just moved up a wall. What tells a cylinder from a stripe is the
  // highlight running down its length, and that needs a surface smooth enough
  // to have one: lead sheathing, half rough, half metal. The saddles are pitched
  // brighter still so they read as separate ironmongery clamped over it.
  const sheath = { color: '#4a4136', roughness: 0.44, metalness: 0.6 };
  const strap = { color: '#6b5f4c', roughness: 0.5, metalness: 0.55 };

  return (
    <group>
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[curve, 110, r, 16, false]} />
        <meshStandardMaterial {...sheath} />
      </mesh>
      {saddles.map(({ p, roll }, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <group key={i} position={[p.x, p.y, p.z]} rotation={[0, 0, roll - Math.PI / 2]}>
          {/* the band round the cable */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[r * 1.12, r * 0.2, 6, 14]} />
            <meshStandardMaterial {...strap} />
          </mesh>
          {/* its two feet, flat to the wall, with a bolt through each */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * r * 1.22, 0, -r * 0.62]}>
              <mesh castShadow>
                <boxGeometry args={[r * 0.62, r * 0.55, r * 1.5]} />
                <meshStandardMaterial {...strap} />
              </mesh>
              <mesh position={[0, 0, r * 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[r * 0.17, r * 0.17, r * 0.5, 6]} />
                <meshStandardMaterial color="#7d7159" roughness={0.42} metalness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OG — the workbench
// ─────────────────────────────────────────────────────────────────────────────
// The slab is the piece doing the work. A horizontal surface at a known height
// is the only thing in this corridor the eye can measure the room against, and
// it is also the one prop face the pendant strikes square-on — so it is the one
// place in this scene where the lamp, not the ambience, is the brighter term.
// Everything else about the bench exists to hold that plane at 0.92 m and give
// it an underside to be dark.
//
// ── built to Mykolai's reference ─────────────────────────────────────────────
// `.temp/workbench and data blocks reference.png`. His brief was explicit about
// what could be dropped and what could not: the very fine detail may be
// simplified or lost, **the palette and the concept — the lamp standing on the
// bench, the chest under it — stay**. So those two are modelled properly and
// the rest is triaged.
//
// What the reference is, structurally, is not a timber bench with iron legs. It
// is a riveted frame with a slab dropped into it, and four things carry that:
//
// *The members.* An apron under the slab and a bottom rail at shelf height,
// both a rolled plate with a brass strip along each arris and a row of domed
// bolts down the middle. That bolt row is what the eye actually reads the bench
// by from across a corridor — see `benchBand`.
//
// *The corners.* A bracket plate wrapping every junction of member and post,
// standing proud and brighter than either. They are the bench's punctuation.
//
// *The feet.* Turned, stepped, and round — the one curve in an object that is
// otherwise all right angles, and the detail that dates it.
//
// *The bays.* A brace across the open one, a drawer bank filling the other. An
// empty underneath is a table; a bench has its volume used.
//
// ── and it is lit by a lamp that is not a light ──────────────────────────────
// The desk lamp is the reference's subject and it cannot be a `pointLight`.
// Nothing on a landing may add or remove a source: this whole subtree hangs off
// `visible={furnished}`, three drops hidden lights out of the scene's light
// list, and the list's length is in its shader program cache key — so a light
// down here would relink every program in the room on the frames a door parts.
// That is the door hitch, bought back at full price.
//
// So it is built the way the shaft's own fittings are (see `Lamp`): an emissive
// glass in the shade, a sprite halo round it, and — the part that sells it — a
// pool of glow laid flat on the slab where the light would land. Three cheap
// objects that agree with each other about where the source is.

const LAMP_TILT = 0.62;                 // the shade's axis, off vertical
const BENCH_BRASS = { color: '#6f5222', roughness: 0.4, metalness: 0.78 };
const BENCH_BRASS_HI = { color: '#8a6a2c', roughness: 0.32, metalness: 0.8 };
// A large smooth turned surface is nearly all reflection, so the vessel on the
// shelf came out at the brass the *arrises* are painted at and read as cream
// plastic — the brightest thing on the floor, standing in the darkest place on
// it. Roughed right up and taken down a stop: this is brass in shadow.
const SHELF_BRASS = { color: '#3a2a11', roughness: 0.7, metalness: 0.62 };

/**
 * A member laid between two points of the bench's own upright plane.
 *
 * Two rotations, because the two primitives this feeds disagree about which way
 * they are long: a `cylinderGeometry` runs up its own Y, a `boxGeometry` runs
 * along its X. One `rotation` field for both is a strap lying at ninety degrees
 * to the brace it was meant to be.
 */
const strut = (ax, ay, bx, by) => {
  const angle = Math.atan2(by - ay, bx - ax);
  return {
    position: /** @type {[number, number, number]} */ ([(ax + bx) / 2, (ay + by) / 2, 0]),
    /** for a `boxGeometry`, long on X */
    lying: /** @type {[number, number, number]} */ ([0, 0, angle]),
    /** for a `cylinderGeometry`, long on Y */
    standing: /** @type {[number, number, number]} */ ([0, 0, angle - Math.PI / 2]),
    length: Math.hypot(bx - ax, by - ay),
  };
};

/**
 * A flat strip laid along a curve, with its width always across the same axis.
 *
 * `tubeGeometry` cannot do this — a tape has no cross-section to sweep, it has
 * a face, and a tube with a flattened profile twists along its own Frenet frame
 * and puts a barley-sugar curl in something that is a strip of paper. Holding
 * the width on X instead is what keeps the run flat on the slab *and* flat
 * against the room where it hangs down: both are moves in the y-z plane, and a
 * ribbon whose width never leaves X is correctly turned for either.
 *
 * `getSpacedPoints` and not `getPoints`, because the artwork repeats along the
 * length: parameter-spaced samples bunch the perforation up wherever the curve
 * is tight, which on this run is exactly the nose of the bench.
 *
 * @param {import('three').Curve<Vector3>} curve
 * @param {number} width @param {number} segments
 * @param {number} repeats how many tiles of artwork fit along it
 */
const ribbon = (curve, width, segments, repeats) => {
  const pts = curve.getSpacedPoints(segments);
  const position = new Float32Array((segments + 1) * 6);
  const uv = new Float32Array((segments + 1) * 4);
  const index = [];
  for (let i = 0; i <= segments; i += 1) {
    const p = pts[i];
    position.set([p.x - width / 2, p.y, p.z, p.x + width / 2, p.y, p.z], i * 6);
    const v = (i / segments) * repeats;
    uv.set([0, v, 1, v], i * 4);
    if (i < segments) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
};

/** Where the tape stands, which is where the lamp's pool lands. */
const TAPE_X = -0.23;
const TAPE_W = 0.06;

function Workbench({ M, x, floorY, z, ambient, yaw }) {
  const len = 2.05 * M;
  const depth = 0.72 * M;
  const topT = 0.075 * M;
  const benchH = 0.92 * M;              // the working height, and the whole point
  const legT = 0.105 * M;
  const footH = 0.06 * M;

  const endX = len / 2 - legT * 0.62;
  const legZ = depth / 2 - legT * 0.85;
  const legTop = benchH - topT;
  const legH = legTop - footH;

  const apronH = 0.14 * M;
  const apronY = legTop - apronH / 2;
  const railH = 0.1 * M;
  const railY = 0.24 * M;
  const shelfY = railY + railH / 2;
  const frontZ = depth / 2 - 0.03 * M;
  const memberW = len - legT * 1.1;

  const top = benchTop();
  const topArt = artwork(top, ambient);
  // Two seeds, so the apron and the rail standing one above the other do not
  // carry the same pitting in the same places.
  const apronArt = artwork(benchBand(15, 1), ambient);
  const railArt = artwork(benchBand(17, 2), ambient);
  const drawerArt = artwork(drawerFace(), ambient);
  // Between a flank and an underside: the chest stands in the one place in this
  // room nothing reaches, and at `FACE.side` it read as brighter than the bench
  // it is under.
  const chestArt = artwork(chestPanel(), ambient, 0.5);
  // The tape lies flat under the lamp for most of its length and hangs against
  // the room for the rest, so it is neither an upward face nor a flank. Read at
  // `FACE.up`, because the half of it that decides how the object reads is the
  // half in the pool.
  const tapeArt = artwork(punchTape(), ambient, FACE.up);
  const glow = lampGlow();

  const iron = surfaceProps(SURFACES.iron, 0.85);
  const ironDark = surfaceProps(SURFACES.iron, 0.5);
  // What the small hardware on the slab is made of. **Not the catalogue's
  // steel**, which is the one cool entry in it (#404952) and is authored for
  // fittings the shaft's own lamps rake across at close range. Up here, under a
  // pendant four hundred pixels off at a graze and against a bench top that is
  // all warm ochre, it has nowhere to go but black — a rack of tools rendered as
  // a row of holes cut in the bench. Warm iron, lifted, so a small object on the
  // slab reads as an object.
  const hardware = surfaceProps(SURFACES.iron, 1.35);
  // Warm, not the catalogue's steel. Every grey in this scene is warm on
  // purpose (see the note on `doorLeaf` in `materials.js`) and a cool bracket on
  // a brass-lit bench is the one hex fighting the grade.
  const bracket = surfaceProps(SURFACES.iron, 1.55);

  const band = (art, fallbackShade) => (art
    ? <meshStandardMaterial {...art} roughness={0.8} metalness={0.42} />
    : <meshStandardMaterial {...surfaceProps(SURFACES.iron, fallbackShade)} />);

  // the drawer bank fills the right-hand bay, the brace crosses the left one
  const bankW = 0.64 * M;
  const bankD = depth - legT * 1.3;
  // Stops under the apron rather than at the slab: run up to `legTop` the apron
  // crosses in front of the top drawer, and a drawer with a plate over its face
  // is not a drawer.
  const bankH = apronY - apronH / 2 - shelfY - 0.012 * M;
  const bankX = endX - legT * 0.7 - bankW / 2;
  const brace = strut(-endX + legT * 0.5, shelfY, -endX + 0.68 * M, apronY - apronH * 0.4);

  // The lamp, in its own upright plane: base, two arms and a shade.
  //
  // Kept under a third of a metre, and that is a composition constraint rather
  // than a modelling one. This deck's own text column is lifted off centre by
  // `CONTENT_RISE` to clear the bench, which leaves about 0.4 m of scene between
  // the slab and the bottom rank of plates — a lamp at the height an anglepoise
  // actually stands put its shade behind `DATEN`.
  const armA = strut(0, 0.062 * M, 0.06 * M, 0.235 * M);
  const armB = strut(0.06 * M, 0.235 * M, 0.215 * M, 0.3 * M);
  const headX = 0.215 * M;
  const headY = 0.3 * M;
  // where the mouth of the shade points, and how far down the pool falls
  const aim = [Math.sin(LAMP_TILT), -Math.cos(LAMP_TILT)];

  // ── the tape's run ─────────────────────────────────────────────────────────
  // Off the underside of the reel, over the reader, along the slab, and down
  // the front of the bench. Two things in it are not free-hand: it clears the
  // top of the brass nose strip and comes down *in front* of it, so it drapes
  // over the edge rather than through it; and it stands a little proud of the
  // slab but under the lamp's pool, so the pool washes over the tape instead of
  // the tape masking the pool. Both are one number each and both look like a
  // modelling error when they are wrong.
  const reelY = benchH + 0.155 * M;
  const tape = useMemo(() => {
    const curve = new CatmullRomCurve3([
      [0, 0.069, -0.042], [0, 0.062, 0.005], [0, 0.062, 0.062], [0, 0.02, 0.1],
      [0, 0.005, 0.15], [0.005, 0.005, 0.26], [0.008, -0.004, 0.352],
      [0.012, -0.035, 0.386], [0.018, -0.13, 0.394], [0.026, -0.27, 0.379],
      [0.034, -0.39, 0.352],
    ].map(([px, py, pz]) => new Vector3(px * M, benchH + py * M, pz * M)),
    false, 'centripetal');
    const repeats = curve.getLength() / (TAPE_W * M * TAPE_ASPECT);
    return ribbon(curve, TAPE_W * M, 56, repeats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, benchH]);
  useEffect(() => () => tape.dispose(), [tape]);

  return (
    <group position={[x, worldY(floorY), z]} rotation={[0, yaw, 0]}>
      {/* the four posts, each standing on a turned foot */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}:${sz}`} position={[sx * endX, 0, sz * legZ]}>
          <mesh position={[0, footH * 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[legT * 0.6, legT * 0.8, footH * 0.6, 12]} />
            <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.7)} />
          </mesh>
          <mesh position={[0, footH * 0.78, 0]}>
            <cylinderGeometry args={[legT * 0.44, legT * 0.56, footH * 0.36, 12]} />
            <meshStandardMaterial {...BENCH_BRASS} />
          </mesh>
          <mesh position={[0, footH + legH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[legT, legH, legT]} />
            <meshStandardMaterial {...iron} />
          </mesh>
        </group>
      )))}

      {/* the end frames tying each pair of posts together, front to back */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * endX, apronY, 0]} castShadow receiveShadow>
          <boxGeometry args={[legT * 0.92, apronH * 0.92, depth - legT * 1.2]} />
          <meshStandardMaterial {...iron} />
        </mesh>
      ))}

      {/* The apron and the bottom rail: the two members that draw the bench.
          Both faces get the band, front and back — the back one is barely seen
          past the legs but a member that is plate on one side and nothing on
          the other reads as a card standing on edge the moment the bench is
          turned at all. */}
      {[1, -1].map((sz) => (
        <mesh key={sz} position={[0, apronY, sz * frontZ]} castShadow receiveShadow>
          <boxGeometry args={[memberW, apronH, 0.035 * M]} />
          {band(sz > 0 ? apronArt : null, 0.8)}
        </mesh>
      ))}
      {[1, -1].map((sz) => (
        <mesh key={sz} position={[0, railY, sz * frontZ]} castShadow receiveShadow>
          <boxGeometry args={[memberW, railH, 0.032 * M]} />
          {band(sz > 0 ? railArt : null, 0.65)}
        </mesh>
      ))}

      {/* the corner brackets, one at every junction of member and post */}
      {[-1, 1].map((sx) => [[apronY, apronH], [railY, railH]].map(([by, bh]) => (
        <mesh
          key={`${sx}:${by}`}
          position={[sx * (endX - legT * 0.1), by, frontZ + 0.026 * M]}
        >
          <boxGeometry args={[legT * 1.7, bh * 1.34, 0.018 * M]} />
          <meshStandardMaterial {...bracket} />
        </mesh>
      )))}

      {/* the shelf, and the brace across the open bay above it */}
      <mesh position={[0, shelfY, 0]} receiveShadow>
        <boxGeometry args={[len - legT * 2.2, 0.03 * M, depth - legT * 1.6]} />
        <meshStandardMaterial {...ironDark} />
      </mesh>
      <mesh position={[brace.position[0], brace.position[1], -legZ * 0.35]} rotation={brace.lying}>
        <boxGeometry args={[brace.length, 0.045 * M, 0.018 * M]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.62)} />
      </mesh>

      {/* the drawer bank, filling the other bay */}
      <group position={[bankX, shelfY + bankH / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[bankW, bankH, bankD]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.6)} />
        </mesh>
        {[-1, 0, 1].map((d) => (
          <group key={d} position={[0, d * -bankH * 0.31, bankD / 2 + 0.006 * M]}>
            <mesh receiveShadow>
              <boxGeometry args={[bankW * 0.92, bankH * 0.28, 0.012 * M]} />
              {band(drawerArt, 0.9)}
            </mesh>
            {/* the bail: a strap hanging off two posts, which is the one part
                of a drawer with a silhouette of its own */}
            <mesh position={[0, -bankH * 0.015, 0.012 * M]} rotation={[0.95, 0, Math.PI]}>
              <torusGeometry args={[bankW * 0.21, 0.012 * M, 5, 14, Math.PI]} />
              <meshStandardMaterial {...BENCH_BRASS_HI} />
            </mesh>
          </group>
        ))}
      </group>

      {/* the chest on the shelf — his, by name, and the one object under there
          with any value at all */}
      <group position={[-0.34 * M, shelfY, 0.02 * M]} rotation={[0, 0.09, 0]}>
        <mesh position={[0, 0.115 * M, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.44 * M, 0.23 * M, 0.27 * M]} />
          {band(chestArt, 0.85)}
        </mesh>
        <mesh position={[0, 0.25 * M, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.46 * M, 0.05 * M, 0.29 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.78)} />
        </mesh>
        <mesh position={[0, 0.276 * M, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.075 * M, 0.008 * M, 5, 14, Math.PI]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
      </group>

      {/* and the brass vessel beside it, which is the only warm note down there */}
      <group position={[0.02 * M, shelfY, -0.02 * M]}>
        <mesh position={[0, 0.028 * M, 0]} castShadow>
          <cylinderGeometry args={[0.062 * M, 0.078 * M, 0.056 * M, 14]} />
          <meshStandardMaterial {...SHELF_BRASS} />
        </mesh>
        <mesh position={[0, 0.14 * M, 0]} castShadow>
          <cylinderGeometry args={[0.05 * M, 0.075 * M, 0.17 * M, 14]} />
          <meshStandardMaterial {...SHELF_BRASS} />
        </mesh>
        <mesh position={[0, 0.255 * M, 0]}>
          <cylinderGeometry args={[0.03 * M, 0.045 * M, 0.06 * M, 12]} />
          <meshStandardMaterial {...SHELF_BRASS} />
        </mesh>
        <mesh position={[0.062 * M, 0.15 * M, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <torusGeometry args={[0.042 * M, 0.007 * M, 5, 12, Math.PI]} />
          <meshStandardMaterial {...BENCH_BRASS} />
        </mesh>
      </group>

      {/* the slab, overhanging the frame on every side */}
      <mesh position={[0, benchH - topT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, topT, depth]} />
        {/* top face only takes the artwork; the edges are end grain and read
            better as plain dark timber than as the top's own picture repeated */}
        <meshStandardMaterial attach="material-0" {...surfaceProps(SURFACES.iron, 0.6)} />
        <meshStandardMaterial attach="material-1" {...surfaceProps(SURFACES.iron, 0.6)} />
        {topArt
          ? <meshStandardMaterial attach="material-2" {...topArt} roughness={0.78} metalness={0.05} />
          : <meshStandardMaterial attach="material-2" {...surfaceProps(SURFACES.iron, 1.1)} />}
        <meshStandardMaterial attach="material-3" {...surfaceProps(SURFACES.iron, 0.4)} />
        <meshStandardMaterial attach="material-4" {...surfaceProps(SURFACES.iron, 0.75)} />
        <meshStandardMaterial attach="material-5" {...surfaceProps(SURFACES.iron, 0.5)} />
      </mesh>
      {/* the brass edge strip along the front, which every bench in the
          reference has and which gives the slab a bright line to be read
          against */}
      <mesh position={[0, benchH - topT * 0.62, depth / 2 + 0.006 * M]} castShadow receiveShadow>
        <boxGeometry args={[len, topT * 0.42, 0.014 * M]} />
        <meshStandardMaterial {...BENCH_BRASS_HI} />
      </mesh>

      {/* ── the lamp ─────────────────────────────────────────────────────── */}
      <group position={[-0.58 * M, benchH, -0.1 * M]} rotation={[0, -0.62, 0]}>
        <mesh position={[0, 0.011 * M, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.082 * M, 0.095 * M, 0.022 * M, 18]} />
          <meshStandardMaterial {...BENCH_BRASS} />
        </mesh>
        <mesh position={[0, 0.036 * M, 0]}>
          <cylinderGeometry args={[0.046 * M, 0.06 * M, 0.032 * M, 16]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
        <mesh position={armA.position} rotation={armA.standing} castShadow>
          <cylinderGeometry args={[0.013 * M, 0.013 * M, armA.length, 8]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
        <mesh position={[0.06 * M, 0.235 * M, 0]}>
          <sphereGeometry args={[0.019 * M, 10, 8]} />
          <meshStandardMaterial {...BENCH_BRASS} />
        </mesh>
        <mesh position={armB.position} rotation={armB.standing} castShadow>
          <cylinderGeometry args={[0.012 * M, 0.012 * M, armB.length, 8]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
        {/* the shade, open at the mouth so the glass inside it can be seen */}
        <mesh position={[headX, headY, 0]} rotation={[0, 0, LAMP_TILT]} castShadow>
          <coneGeometry args={[0.085 * M, 0.115 * M, 18, 1, true]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} side={DoubleSide} />
        </mesh>
        {/* the glass. Its own source, so the room's bounce must not overwrite
            it — the same contract the shaft's fittings hold. */}
        <mesh position={[headX + aim[0] * 0.05 * M, headY + aim[1] * 0.05 * M, 0]}>
          <sphereGeometry args={[0.042 * M, 12, 10]} />
          <meshStandardMaterial
            userData={{ selfLit: true }}
            color="#3a2408"
            emissive="#ffd79a"
            emissiveIntensity={1.5}
            roughness={0.4}
          />
        </mesh>
        {glow && (
          <sprite
            position={[headX + aim[0] * 0.08 * M, headY + aim[1] * 0.08 * M, 0]}
            scale={[0.42 * M, 0.42 * M, 1]}
          >
            <spriteMaterial map={glow} transparent opacity={0.4} depthWrite={false} />
          </sprite>
        )}
      </group>
      {/* The pool it throws, laid flat on the slab. This is the piece doing the
          work: a shade that glows over an evenly lit bench reads as a prop, and
          the light landing somewhere is what makes it a lamp.
          Four millimetres above the tape rather than below it. Additive and
          `depthWrite: false` still test depth, so a pool under the tape gets
          drawn and then covered — the one pale object on the bench would come
          out as the only thing the lamp misses. */}
      {glow && (
        <mesh position={[-0.33 * M, benchH + 0.009 * M, 0.04 * M]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.1 * M, 0.66 * M]} />
          <meshBasicMaterial
            map={glow}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}

      {/* ── what is standing on the bench ────────────────────────────────── */}
      {/* the vice: the one part of a bench that reads instantly as a bench, and
          the only thing here that breaks the silhouette's top line */}
      <group position={[-endX * 0.72, benchH, depth / 2 - 0.02 * M]}>
        <mesh position={[0, 0.035 * M, 0.09 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.22 * M, 0.07 * M, 0.2 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.9)} />
        </mesh>
        {[0.03, 0.15].map((jz) => (
          <mesh key={jz} position={[0, 0.1 * M, jz * M]} castShadow receiveShadow>
            <boxGeometry args={[0.18 * M, 0.11 * M, 0.035 * M]} />
            <meshStandardMaterial {...hardware} />
          </mesh>
        ))}
        <mesh position={[0, 0.09 * M, 0.24 * M]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018 * M, 0.018 * M, 0.14 * M, 10]} />
          <meshStandardMaterial {...hardware} />
        </mesh>
        <mesh position={[0, 0.09 * M, 0.3 * M]} rotation={[0, 0, Math.PI / 2.6]} castShadow>
          <cylinderGeometry args={[0.011 * M, 0.011 * M, 0.26 * M, 8]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
      </group>

      {/* the tool rail: two posts, a pipe across them and three things hung off
          it. The reference's is crowded with hardware; three is what survives
          being read at this distance. */}
      <group position={[0.2 * M, benchH, -0.19 * M]}>
        {[-0.2, 0.2].map((px) => (
          <mesh key={px} position={[px * M, 0.07 * M, 0]} castShadow>
            <cylinderGeometry args={[0.013 * M, 0.015 * M, 0.14 * M, 8]} />
            <meshStandardMaterial {...hardware} />
          </mesh>
        ))}
        <mesh position={[0, 0.135 * M, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012 * M, 0.012 * M, 0.44 * M, 8]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
        {[-0.13, 0.01, 0.15].map((hx, i) => (
          <mesh key={hx} position={[hx * M, 0.095 * M - i * 0.008 * M, 0.01 * M]}>
            <boxGeometry args={[0.016 * M, 0.07 * M + i * 0.014 * M, 0.01 * M]} />
            <meshStandardMaterial {...hardware} />
          </mesh>
        ))}
      </group>

      {/* the two canisters standing under the rail */}
      {[[0.46, 0.075, 0.11], [0.57, 0.06, 0.085]].map(([cx, cr, ch]) => (
        <group key={cx} position={[cx * M, benchH, 0.08 * M]}>
          <mesh position={[0, (ch * M) / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[cr * M, cr * M * 1.06, ch * M, 14]} />
            <meshStandardMaterial {...hardware} />
          </mesh>
          <mesh position={[0, ch * M + 0.014 * M, 0]}>
            <cylinderGeometry args={[cr * M * 0.5, cr * M * 0.62, 0.028 * M, 12]} />
            <meshStandardMaterial {...BENCH_BRASS} />
          </mesh>
        </group>
      ))}

      {/* The valve cluster at the far end. This is the reference's crowd of
          pipework, reduced to the three things that make it read: a block, two
          risers with handwheels on them, and an elbow going nowhere. */}
      <group position={[endX * 0.73, benchH, -0.12 * M]} rotation={[0, -0.24, 0]}>
        <mesh position={[0, 0.055 * M, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.36 * M, 0.11 * M, 0.22 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.9)} />
        </mesh>
        {[[-0.1, 0.22], [0.09, 0.15]].map(([vx, vh]) => (
          <group key={vx} position={[vx * M, 0.11 * M, 0]}>
            <mesh position={[0, (vh * M) / 2, 0]} castShadow>
              <cylinderGeometry args={[0.026 * M, 0.03 * M, vh * M, 10]} />
              <meshStandardMaterial {...hardware} />
            </mesh>
            <mesh position={[0, vh * M, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.062 * M, 0.009 * M, 6, 16]} />
              <meshStandardMaterial {...BENCH_BRASS_HI} />
            </mesh>
            {[0, Math.PI / 2].map((a) => (
              <mesh key={a} position={[0, vh * M, 0]} rotation={[0, a, 0]}>
                <boxGeometry args={[0.124 * M, 0.008 * M, 0.01 * M]} />
                <meshStandardMaterial {...BENCH_BRASS} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0.2 * M, 0.09 * M, 0.02 * M]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07 * M, 0.026 * M, 8, 14, Math.PI / 2]} />
          <meshStandardMaterial {...BENCH_BRASS} />
        </mesh>
      </group>

      {/* ── the punched tape ─────────────────────────────────────────────────
          A reel on the slab, a reader under it, and the tape running out across
          the bench and over the front edge. It stands where it does for one
          reason: it is what the lamp is aimed at. The shade tilts down and
          forward and its pool lands at about (-0.23, 0.15) on the slab, which
          up to now was bare timber — a lamp lighting nothing is an ornament,
          and this is the object that turns the pool into an act.
          Paper is also the only material on this floor that is not metal or
          timber, and the only pale one. */}
      <group position={[TAPE_X * M, 0, 0]}>
        {/* the reel: two flanges, the wound tape between them, and the spindle
            it turns on. Axis along the bench, so what the room sees is a disc —
            the one circle on a bench made entirely of right angles. */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.036 * M, reelY, -0.04 * M]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.105 * M, 0.105 * M, 0.006 * M, 20]} />
            <meshStandardMaterial {...hardware} />
          </mesh>
        ))}
        <mesh position={[0, reelY, -0.04 * M]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.086 * M, 0.086 * M, 0.066 * M, 18]} />
          <meshStandardMaterial color="#5f5540" roughness={0.94} metalness={0.02} />
        </mesh>
        <mesh position={[0, reelY, -0.04 * M]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.034 * M, 0.034 * M, 0.078 * M, 12]} />
          <meshStandardMaterial {...BENCH_BRASS} />
        </mesh>
        {/* the standard it hangs off, bolted to the slab */}
        <mesh position={[0, benchH + 0.055 * M, -0.075 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.11 * M, 0.11 * M, 0.02 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.85)} />
        </mesh>
        <mesh position={[0, benchH + 0.008 * M, -0.075 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.17 * M, 0.016 * M, 0.07 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.7)} />
        </mesh>

        {/* the reader head the tape passes through, and the two knobs that set
            it. A tape that merely lies on a bench is litter; a tape that goes
            into something is a machine mid-job. */}
        <mesh position={[0, benchH + 0.028 * M, 0.035 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.13 * M, 0.056 * M, 0.1 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.0)} />
        </mesh>
        <mesh position={[0, benchH + 0.058 * M, 0.035 * M]} castShadow>
          <boxGeometry args={[0.134 * M, 0.008 * M, 0.03 * M]} />
          <meshStandardMaterial {...BENCH_BRASS_HI} />
        </mesh>
        {[-0.042, 0.042].map((kx) => (
          <mesh key={kx} position={[kx * M, benchH + 0.032 * M, 0.088 * M]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.016 * M, 0.018 * M, 0.014 * M, 10]} />
            <meshStandardMaterial {...BENCH_BRASS} />
          </mesh>
        ))}

        {/* and the tape itself */}
        {tape && (
          <mesh geometry={tape} castShadow>
            {tapeArt
              ? <meshStandardMaterial {...tapeArt} roughness={0.95} metalness={0} side={DoubleSide} />
              : <meshStandardMaterial color="#6b6047" roughness={0.95} side={DoubleSide} />}
          </mesh>
        )}
      </group>

      {/* the few things left lying where they were put down. There used to be
          a third, at (-0.16, 0.05) — the tape runs through that spot now, and a
          bar lying across it was the one collision on this slab. */}
      {[[-0.02, -0.32, -0.5], [0.12, 0.12, 0.2]].map(([tx, tz, ta]) => (
        <mesh
          key={tx}
          position={[tx * M, benchH + 0.008 * M, tz * M]}
          rotation={[0, ta, 0]}
          castShadow
        >
          <boxGeometry args={[0.26 * M, 0.016 * M, 0.026 * M]} />
          <meshStandardMaterial {...hardware} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. UG — the conveyor, and what rides on it
// ─────────────────────────────────────────────────────────────────────────────
// Three crates stood here in a pile, for looks. Mykolai's objection was that
// the most *programmer* object a building can have was sitting in this room
// doing nothing: the industry names itself after this machine. A pipeline is a
// conveyor. What comes off one is an artifact. `dotnet publish` produces a
// package. A container is a container. A message queue is items on a belt,
// taken one at a time.
//
// It also fixes the building's own logic. This is a goods lift in a works and
// the landings are loading bays — the lift carries people, the belt carries
// product — so the room stops being a corridor with a box in it.
//
// ── the direction is the argument ────────────────────────────────────────────
// The run comes out of a mouth in the back wall, where the thing is built and
// which is never seen, and leaves to the left, into the corridor, shipped. The
// delivery vector passes under the page's own column, which on this floor is
// the left half. Nothing about that is decorative: a belt running the other way
// would be a delivery *in*.
//
// ── what is on the boxes, and why it is not a name plate ─────────────────────
// A project name sprayed on a box makes it a tag. A **package manifest** makes
// it an artifact, and that is the whole difference — see `artifactFace` in
// `propArt.js`, which owns the lettering. This file owns metres and never opens
// that canvas.
//
// ── which box is which project ───────────────────────────────────────────────
// The archive itself rides the belt, in its own order, one slot per project.
// The box held at the stop gate is the project on the glass; behind it queues
// what has not shipped yet, and ahead of it, already leaving, is what has. Two
// things follow that are worth having: the belt is *about* the archive rather
// than being scenery next to it, and pressing NEXT through six shots of one job
// does not move it, because it moves by project — the fault the card itself
// flagged ("if it changes on FRAME swap, a box with a project name lies inside
// one project").

/**
 * A box coming off the belt: plywood, with the manifest on the face turned
 * toward the room. Flat sheets, so it does not read as another crate — the
 * crate above is sawn boards with gaps and battens, and the silhouette is what
 * separates the two at this distance.
 */
function ArtifactBox({ M, mark, spec, ambient, ...rest }) {
  const { w, h, d } = BELT.BOX;
  const face = artifactFace(mark, spec, true);
  const side = artifactFace(mark, spec, false);
  const faceArt = artwork(face, ambient);
  const sideArt = artwork(side, ambient);
  const lidArt = artwork(side, ambient, FACE.up);
  const underArt = artwork(side, ambient, FACE.down);
  const fallback = { color: '#4c3f28', roughness: 0.9, metalness: 0.02 };
  const strap = { color: '#2b2419', roughness: 0.55, metalness: 0.45 };
  // ── one material per face, and each of them says which face ────────────────
  // A row of bare `<meshStandardMaterial>` children does **not** make a
  // material array: R3F attaches every one of them to `material`, so the last
  // one silently wins and all six faces come out identical. That is not a
  // theory — it is why the crates that stood here for weeks never showed the
  // `Nr. 001` their own canvas had painted on them, and it would have quietly
  // thrown this box's whole manifest away. `attach="material-n"` is what
  // actually builds the array. `BoxGeometry` orders its groups +X −X +Y −Y +Z
  // −Z, and +Z is the face turned toward the camera.
  const faces = [sideArt, sideArt, lidArt, underArt, faceArt, sideArt];

  return (
    <group {...rest}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w * M, h * M, d * M]} />
        {faces.map((art, i) => (art
          ? (
            <meshStandardMaterial
              key={i} attach={`material-${i}`} {...art} roughness={0.9} metalness={0.02}
            />
          )
          : <meshStandardMaterial key={i} attach={`material-${i}`} {...fallback} />))}
      </mesh>
      {/* Two steel bands round it. A plywood case is a rectangle without them,
          and they say the thing is closed and going somewhere rather than open
          and being packed. They run *round* it rather than up it: the first cut
          had them vertical and they went straight through the middle of the
          manifest, which is the one thing on this box that has to be read. */}
      {[-0.41, 0.41].map((f) => (
        <mesh key={f} position={[0, f * h * M, 0]} castShadow>
          <boxGeometry args={[w * M + 0.006 * M, 0.02 * M, d * M + 0.006 * M]} />
          <meshStandardMaterial {...strap} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The mouth in the back wall the run comes out of.
 *
 * Not a hole — the landing wall is one panel and cutting it would be a
 * subtraction the whole room would have to pay for. What reads as an opening at
 * this distance is a recess with something over it that casts into it, which is
 * how the post box's letter slot is built too.
 *
 * It grew with the boxes on NBC-68. The old opening was authored to the *band*
 * and the band alone, so a box half again bigger came out of a hole it barely
 * fitted through — which read, correctly, as a box pushing through a letter
 * slot. `BELT.MOUTH` is the size now and `belt.test.js` holds it to being
 * bigger than what comes out of it.
 */
function BeltMouth({ M, x, y, z }) {
  const w = BELT.MOUTH.W * M;
  const h = BELT.MOUTH.H * M;
  // Hand-set rather than taken from the catalogue: every iron in `SURFACES`
  // sits low enough that a member this small disappears, and what makes an
  // opening read as an opening is one bright edge against the black behind it.
  // Darker than the plaster it is set into, and deliberately: `Room` gives
  // every material emissive = albedo x ambient, so a light albedo on a small
  // member is a small member that glows. At the catalogue's old value the
  // whole assembly read as a timber crate standing against the wall instead
  // of an opening cut through it — the one thing it exists to be.
  const surround = { color: '#3b3018', roughness: 0.66, metalness: 0.34 };
  const slats = 7;
  return (
    <group position={[x, y, z]}>
      {/* the dark of the shaft behind the wall */}
      <mesh position={[0, 0, 0.02 * M]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#050403" roughness={1} metalness={0} />
      </mesh>
      {/* the pressed steel surround, standing proud of the plaster */}
      {[[0, h / 2, w, 0.09 * M], [0, -h / 2, w, 0.09 * M],
        [-w / 2, 0, 0.09 * M, h], [w / 2, 0, 0.09 * M, h]].map(([rx, ry, rw, rh]) => (
          <mesh key={`${rx},${ry}`} position={[rx, ry, 0.05 * M]} castShadow receiveShadow>
            <boxGeometry args={[rw, rh, 0.07 * M]} />
            <meshStandardMaterial {...surround} />
          </mesh>
      ))}
      {/* The hood, tipped out over the opening. It is the whole reason this
          reads as a hole rather than a dark panel: a lit lip along the top with
          its own shadow falling into the black under it. The post box's letter
          slot is built the same way and for the same reason. */}
      <mesh position={[0, h / 2 + 0.045 * M, 0.1 * M]} rotation={[-0.34, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.05 * M, 0.115 * M, 0.018 * M]} />
        <meshStandardMaterial color="#4a3b1f" roughness={0.6} metalness={0.34} />
      </mesh>
      {/* The strip curtain: what a goods opening in a wall actually has, and
          the one part of this that breaks the rectangle. It hangs down only the
          top third — the boxes come through here now rather than standing off to
          one side, and a curtain a box walks through without moving is worse
          than no curtain at all. */}
      {Array.from({ length: slats }, (_, i) => (
        <mesh
          key={i}
          position={[(i - (slats - 1) / 2) * (w / slats), h * 0.3, 0.075 * M]}
          rotation={[0, 0, (i % 3 - 1) * 0.035]}
          castShadow
        >
          <boxGeometry args={[w / slats * 0.86, h * 0.34, 0.012 * M]} />
          <meshStandardMaterial color="#171310" roughness={0.88} metalness={0.04} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Drives the band and every box on it.
 *
 * One writer, ticked off `requestAnimationFrame` with a gate on it rather than
 * off React state. Both halves of that matter and both are scars: a prop
 * positioned from a React prop while the lift is riding is being written by two
 * clocks and judders (`useRideMotion` was written to end exactly that), and a
 * frame asked of one canvas while its neighbour sits out a long run is how the
 * doors came to blink — so the frame is asked of the scene.
 *
 * rAF also gets one thing a timer would not: a hidden tab stops paying for it.
 *
 * ── the one thing React is allowed to own here ──────────────────────────────
 * Which project each box is stamped with, and nothing else. Position is written
 * here and only here; the stamp is a rare, discrete fact — a box reaching the
 * mouth, roughly once every ten seconds per box — and a texture swap is not
 * something a ticker can do without reaching into materials it does not own.
 * So the ticker *reports* the crossing through `onStamp` and React re-renders
 * that one box's faces. The group it re-renders never carries a `position`
 * prop, which is what keeps this from being two clocks again.
 *
 * @param {{ head: { current: import('three').Texture | null },
 *           run: { current: import('three').Texture | null } }} bands
 * @param {{ current: Array<import('three').Object3D | null> }} boxes
 * @param {{ out: number, run: number }} path in scene pixels
 * @param {number} count how many boxes are on the run
 * @param {number} pitch one box and its gap, in scene pixels
 * @param {number} M the room's metre
 * @param {{ current: number }} projectRef what is on the glass, right now
 * @param {(i: number, project: number) => void} onStamp
 * @param {boolean} live
 */
function useBeltMotion(bands, boxes, path, count, pitch, M, projectRef, onStamp, live) {
  const travel = useRef(0);
  const trips = useRef([]);

  // Where the boxes stand, laid out from the ticker's *own* travel rather than
  // from a second source — so this is the same clock, not a second one. It has
  // to exist at all because a landing can be furnished with `live` false (the
  // boot warm-up, and every floor the lift is not standing at), and without it
  // those rooms hold four boxes stacked on the corner.
  useLayoutEffect(() => {
    const len = pathLength(path);
    for (let i = 0; i < count; i += 1) {
      const g = boxes.current[i];
      if (!g) continue;
      const d = beltAt(travel.current, i, count, pitch);
      const at = posAt(d, path);
      g.position.x = at.x;
      g.position.z = at.z;
      g.visible = d < len;
    }
  });

  useEffect(() => {
    if (!live) return undefined;
    let raf = 0;
    let last = performance.now();
    const period = 1000 / BELT.HZ;
    const len = pathLength(path);
    // Seeded from where the boxes already are rather than from zero, so a
    // resize — which re-lays the room and can change `count` — does not fire a
    // burst of stamps for crossings that never happened.
    trips.current = Array.from(
      { length: count }, (_, i) => beltTrip(travel.current, i, count, pitch),
    );

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < period) return;
      last = now;

      const off = bandOffset(dt);
      // Opposite signs, and not a typo: the two runs point different ways, and
      // both bands have to appear to carry a box the way the boxes actually go.
      // The head run's own +u is world +z, the long run's is world +x, and the
      // product travels +z then −x.
      if (bands.head.current) bands.head.current.offset.x -= off;
      if (bands.run.current) bands.run.current.offset.x += off;

      travel.current += (BELT.SPEED * M * dt) / 1000;
      const s = travel.current;
      for (let i = 0; i < count; i += 1) {
        const g = boxes.current[i];
        if (!g) continue;
        const d = beltAt(s, i, count, pitch);
        const at = posAt(d, path);
        g.position.x = at.x;
        g.position.z = at.z;
        // The stretch of the cycle past the end of the run: the box is back
        // behind the wall being brought round again, which is not a place
        // anything is drawn.
        g.visible = d < len;
        const trip = beltTrip(s, i, count, pitch);
        if (trip !== trips.current[i]) {
          trips.current[i] = trip;
          onStamp(i, projectRef.current);
        }
      }
      invalidateScene();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bands, boxes, path, count, pitch, M, projectRef, onStamp, live]);
}

/**
 * One run of belt: the frame, the legs, the pan and the band itself.
 *
 * Laid out along its own +x and turned into place by the caller, so the head
 * run and the long run are the same object twice rather than two near-copies
 * that drift. That also settles which way the band's `u` points on each of
 * them, which is the whole of why `useBeltMotion` scrolls the two in opposite
 * directions — see the note there.
 */
function BeltRun({ M, len, band, ambient, steel, iron, legFrom, ...rest }) {
  const beltY = BELT.TOP * M;
  // ── the rail sits *under* the band, not beside the box ─────────────────────
  // It used to stand a hair proud of the belt surface, which is what a real
  // side guide does and which was wrong here for a reason no drawing shows: the
  // near rail is a third of a metre closer to the camera than the box behind
  // it, so at this camera height it projects up across the bottom of the face —
  // straight through the stack line on the manifest. Mykolai caught it on the
  // first cut. The box is the thing that has to be read, so the rail loses.
  const railH = 0.07 * M;
  const legs = [];
  for (let lx = -legFrom; lx > -len + 0.2 * M; lx -= 1.15 * M) legs.push(lx);

  return (
    <group {...rest}>
      {/* ── the frame ───────────────────────────────────────────────────────── */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[-len / 2, beltY - railH * 0.62, s * (BELT.WIDE / 2 + 0.03) * M]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[len, railH, 0.06 * M]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {/* the pan under the band, so the run is not a floating ribbon */}
      <mesh position={[-len / 2, beltY - 0.055 * M, 0]} receiveShadow>
        <boxGeometry args={[len, 0.05 * M, BELT.WIDE * M]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {legs.map((lx) => [-1, 1].map((s) => (
        <mesh
          key={`${lx}${s}`}
          position={[lx, (beltY - railH) / 2, s * (BELT.WIDE / 2 - 0.02) * M]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.055 * M, beltY - railH, 0.055 * M]} />
          <meshStandardMaterial {...iron} />
        </mesh>
      )))}

      {/* ── the band ────────────────────────────────────────────────────────── */}
      <mesh position={[-len / 2, beltY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[len, BELT.WIDE * M]} />
        {band
          ? (
            <meshStandardMaterial
              map={band}
              emissive="#ffffff"
              emissiveMap={band}
              emissiveIntensity={ambient * FACE.up}
              roughness={0.92}
              metalness={0.04}
              userData={{ selfLit: true }}
            />
          )
          : <meshStandardMaterial color="#181410" roughness={0.92} />}
      </mesh>
    </group>
  );
}

/**
 * A band texture cloned and repeated to a run of `len` scene pixels.
 *
 * Cloned rather than shared: the offset is written every tick, and two runs —
 * never mind two landings furnished at once during a ride — would be several
 * drivers on one texture, each winning every other frame. A clone shares the
 * image, so this is a descriptor rather than a second upload.
 */
function useBand(len, M, ref) {
  const src = beltBand();
  const band = useMemo(() => {
    if (!src) return null;
    const map = src.clone();
    map.repeat.set(len / M / (BELT.SLAT * BELT.SLATS_PER_TILE), 1);
    map.needsUpdate = true;
    return map;
  }, [src, len, M]);
  useEffect(() => {
    ref.current = band;
    return () => band?.dispose();
  }, [band, ref]);
  return band;
}

function Conveyor({ M, x, floorY, z, ambient, leftEnd, live }) {
  const gallery = useFullscreenGallery();
  const slide = SLIDES[gallery?.page ?? 0] ?? null;
  // Which *project*, not which frame. Six shots of one job must not change what
  // comes out of the wall.
  const project = Math.max(0, PROJECTS.findIndex((p) => p.id === slide?.project));
  // Read by the ticker, which must not be torn down and rebuilt every time the
  // console is paged — that would restart the belt on a keypress.
  const projectRef = useRef(project);
  projectRef.current = project;

  // ── the L ──────────────────────────────────────────────────────────────────
  // The group's origin is the corner. The head run comes toward the room out of
  // the wall behind it, the long run leaves to the left, and both are measured
  // from here so the transfer cannot drift away from either of them.
  const out = BELT.OUT * M;
  const run = x - leftEnd;
  const path = useMemo(() => ({ out, run }), [out, run]);
  const pitch = BELT.PITCH * M;
  const count = beltCount(pathLength(path), pitch);

  const headBand = useRef(null);
  const runBand = useRef(null);
  const bands = useMemo(() => ({ head: headBand, run: runBand }), []);
  const head = useBand(out, M, headBand);
  const long = useBand(run, M, runBand);

  // ── what each box is stamped with ──────────────────────────────────────────
  // One entry per box, written only when that box is back at the mouth. A box
  // already out on the run keeps what it came out with until it has left the
  // room, which is the whole of NBC-68 point 3: the archive changes on the
  // glass, and the change reaches the floor as the next thing off the line.
  const [stamps, setStamps] = useState(() => Array.from({ length: count }, () => project));
  useEffect(() => {
    setStamps((prev) => (prev.length === count
      ? prev
      : Array.from({ length: count }, (_, i) => prev[i] ?? projectRef.current)));
  }, [count]);
  const onStamp = useCallback((i, p) => setStamps((prev) => {
    if (prev[i] === p) return prev;
    const next = prev.slice();
    next[i] = p;
    return next;
  }), []);

  const boxes = useRef([]);
  useBeltMotion(bands, boxes, path, count, pitch, M, projectRef, onStamp, live);

  // Shaded up rather than left at the catalogue's own level: `SURFACES.steel`
  // and `SURFACES.iron` sit near 0.03 linear and swallow this room's pendant
  // whole, which on a member this long reads as one black beam with boxes
  // balanced on it. The bench, the only other big steel object down here, is
  // carried at the same sort of level for the same reason.
  const steel = surfaceProps(SURFACES.steel, 1.35);
  const iron = surfaceProps(SURFACES.iron, 1.05);
  const beltY = BELT.TOP * M;

  return (
    <group position={[x, worldY(floorY), z]}>
      {/* ── the head run, out of the wall ───────────────────────────────────
          Turned so its own +x points along world +z. The Euler is worth
          reading rather than trusting: three applies XYZ as Rx·Ry·Rz, so the
          −90° about z lays the run across and the −90° about x tips it flat,
          and the pair leaves the band's `u` pointing out of the wall. */}
      <BeltRun
        M={M} len={out} band={head} ambient={ambient} steel={steel} iron={iron}
        legFrom={0.28 * M}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      />
      {/* ── the long run, away to the left ──────────────────────────────────
          It does not stop at the edge of what can be seen — a corridor carries
          on, and the same argument is written out at length on `WallCable`. */}
      <BeltRun
        M={M} len={run} band={long} ambient={ambient} steel={steel} iron={iron}
        legFrom={0.9 * M}
      />

      {/* ── the transfer ────────────────────────────────────────────────────
          What actually turns the corner. A right-angle transfer is a plate the
          head belt runs the box onto and a set of short rollers that take it
          off sideways — no curve, no turntable, and nothing rotates, which is
          why the manifest never leaves the camera. It replaces the stop gate
          that used to stand here; Mykolai's word for that was "ни к чему", and
          he is right — a gate is what a belt has when something is meant to
          stand still on it, and nothing on this belt is. */}
      <group position={[0, beltY, 0]}>
        <mesh position={[0, -0.055 * M, 0]} receiveShadow castShadow>
          <boxGeometry args={[BELT.WIDE * M, 0.05 * M, BELT.WIDE * M]} />
          <meshStandardMaterial {...iron} />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].map((f) => (
          <mesh
            key={f}
            position={[f * BELT.WIDE * M, -0.012 * M, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.032 * M, 0.032 * M, BELT.WIDE * M * 0.94, 10]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {/* There was a guide rail across the front of the transfer here — the
            member a real one pushes the box against — and it is gone, because
            of where the camera stands rather than because of what a conveyor
            has. It sat half a metre nearer the lens than the box it belonged
            to and projected as a black bar straight across the bottom two lines
            of the manifest. The box is the thing in this room that has to be
            read; anything that crosses it loses. Same call, same reason, as the
            side rails dropping under the band. */}
      </group>

      {/* the head pulley at the discharge end, turned across the run */}
      <mesh
        position={[-run + 0.06 * M, beltY - 0.04 * M, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.09 * M, 0.09 * M, BELT.WIDE * M, 14]} />
        <meshStandardMaterial {...steel} />
      </mesh>

      <BeltMouth M={M} x={0} y={beltY + (BELT.MOUTH.H / 2 - 0.12) * M} z={-out} />

      {/* ── the archive, shipping ───────────────────────────────────────────
          `count` boxes, built when the floor is furnished and never rebuilt.
          Each one's group carries no `position` prop on purpose: the ticker
          owns where it is, React owns only what is stamped on it. A box that
          has run out of the room is this same box coming round behind the
          wall, so there is nothing here to dispose of on the way past. */}
      {stamps.map((p, i) => (
        <group
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(g) => { boxes.current[i] = g; }}
        >
          <ArtifactBox
            M={M}
            mark={PROJECTS[p]?.title ?? ''}
            spec={PROJECTS[p]?.stack ?? ''}
            ambient={ambient}
            position={[0, beltY + (BELT.BOX.h / 2) * M, 0]}
            rotation={[0, (i % 2 ? 0.05 : -0.04), 0]}
          />
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OG — the framed schematic
// ─────────────────────────────────────────────────────────────────────────────
// The crates stand under the column; this hangs in the gutter, where the valve
// rack hangs on the EG. It is the second half of `SHEET` in `propArt.js`: this
// file owns metres and never opens that canvas, and the aspect the two agree on
// is a clause in `schematic.test.js`.
//
// A framed drawing is four mouldings, and the reason it cannot be one box with
// a picture on it is the same reason the crates got battens: what makes a frame
// read is its stepped silhouette against the wall, and a rectangle has none.

function Schematic({ M, x, y, z, ambient }) {
  const paper = schematicSheet();
  const paperArt = artwork(paper, ambient);
  const pw = SHEET.PAPER.W * M;
  const ph = SHEET.PAPER.H * M;
  // the moulding: a wide outer run and a narrow inner lip standing proud of it
  const rail = 0.045 * M;
  const lip = 0.014 * M;
  const deep = 0.03 * M;
  const w = pw + rail * 2;
  const h = ph + rail * 2;
  const wood = { color: '#2c2318', roughness: 0.72, metalness: 0.06 };
  const runs = [
    [0, (h - rail) / 2, w, rail],
    [0, -(h - rail) / 2, w, rail],
    [-(w - rail) / 2, 0, rail, h - rail * 2],
    [(w - rail) / 2, 0, rail, h - rail * 2],
  ];

  return (
    <group position={[x, y, z]}>
      {/* the back pan, which is what the sheet is actually mounted on and what
          keeps the whole thing off the plaster */}
      <mesh position={[0, 0, -deep / 2]} receiveShadow>
        <boxGeometry args={[w, h, deep]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.9)} />
      </mesh>
      {runs.map(([rx, ry, rw, rh]) => (
        <group key={`${rx},${ry}`}>
          <mesh position={[rx, ry, deep * 0.4]} castShadow receiveShadow>
            <boxGeometry args={[rw, rh, deep * 0.8]} />
            <meshStandardMaterial {...wood} />
          </mesh>
          {/* the lip, turned in over the paper's edge */}
          <mesh
            position={[
              rx - Math.sign(rx) * (rail - lip) / 2,
              ry - Math.sign(ry) * (rail - lip) / 2,
              deep * 0.8,
            ]}
            castShadow
          >
            <boxGeometry args={[rx ? lip : rw, ry ? lip : rh, deep * 0.5]} />
            <meshStandardMaterial {...wood} />
          </mesh>
        </group>
      ))}
      {/* one bolt head at each corner — the frame is screwed to the wall, not
          hung on a cord, which is what a works drawing gets */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => (
        <mesh
          key={`${sx}${sy}`}
          position={[(sx * (w - rail)) / 2, (sy * (h - rail)) / 2, deep * 0.86]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.008 * M, 0.008 * M, 0.006 * M, 6]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.steel, 0.8)} />
        </mesh>
      ))}
      <mesh position={[0, 0, deep * 0.42]}>
        <planeGeometry args={[pw, ph]} />
        {paperArt
          ? <meshStandardMaterial {...paperArt} roughness={0.94} metalness={0} />
          : <meshStandardMaterial color="#6e6446" roughness={0.94} />}
      </mesh>
      {/* the glass. It takes no shadow and writes no depth: its whole job is the
          one flat sheen that says there is something between the eye and the
          paper, and a pane that occludes is a pane that greys the drawing out. */}
      <mesh position={[0, 0, deep * 0.78]}>
        <planeGeometry args={[pw, ph]} />
        <meshStandardMaterial
          color="#9fb0b8"
          transparent
          opacity={0.055}
          roughness={0.14}
          metalness={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. OG — the post box
// ─────────────────────────────────────────────────────────────────────────────
// Built to the reference: a Deutsche Post letter box, a tall narrow shell on a
// plinth, with the slot under a projecting hood at the top, the collection
// times behind a little window below it, and the enamel chipped back to bare
// steel along every edge.
//
// It is the one saturated object in the scene, which the styling system already
// asks for — enamel is the colour budget, and a corridor that is brown the
// whole way through needs exactly one thing that is not. It also happens to be
// the only prop with the albedo to show the pendant properly.
//
// Turned off square on purpose. A box facing the camera dead-on is a rectangle
// with a picture on it: the yaw is what gives it a near face, a far face and a
// corner between them, which is the whole of why the reference photograph is a
// three-quarter view too.

function PostBox({ M, x, floorY, z, ambient, yaw }) {
  const bodyW = 0.5 * M;
  const bodyH = 1.16 * M;
  const bodyD = 0.34 * M;
  const plinthH = 0.15 * M;

  const skin = {
    face: artwork(postBoxSkin('face'), ambient),
    side: artwork(postBoxSkin('side'), ambient),
    top: artwork(postBoxSkin('top'), ambient, FACE.up),
    under: artwork(postBoxSkin('top'), ambient, FACE.down),
  };
  const enamel = { roughness: 0.46, metalness: 0.16 };
  const fallback = { color: '#b0851a', roughness: 0.5, metalness: 0.15 };
  const panel = (art) => (art
    ? <meshStandardMaterial {...art} {...enamel} />
    : <meshStandardMaterial {...fallback} />);

  const bodyY = plinthH + bodyH / 2;
  const frontZ = bodyD / 2;
  const card = postBoxCard();
  // recessed behind its own frame, so it sees less of the room than a flank does
  const cardArt = artwork(card, ambient, FACE.down * 1.6);

  return (
    <group position={[x, worldY(floorY), z]} rotation={[0, yaw, 0]}>
      {/* The plinth. Cast, not enamelled — it is the part that gets kicked, and
          it is also what stops the box reading as balanced on a line.
          Keyed to the landing's own surface rather than given a grey of its
          own: a light slab under a dark box is a spotlit pedestal, and the
          first cut's #4b4841 was the brightest thing on the floor of a room
          whose walls sit at half that. Concrete in this building is the same
          concrete the room is made of. */}
      <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW + 0.06 * M, plinthH, bodyD + 0.06 * M]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.landing, 0.72)} />
      </mesh>
      <mesh position={[0, plinthH + 0.008 * M, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW + 0.02 * M, 0.016 * M, bodyD + 0.02 * M]} />
        <meshStandardMaterial color="#26241f" roughness={1} metalness={0} />
      </mesh>

      {/* the shell — its own skin per face, because the wear has a position and
          a tiled one would put the same corner damage in the middle */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW, bodyH, bodyD]} />
        {panel(skin.side)}
        {panel(skin.side)}
        {panel(skin.top)}
        {panel(skin.under)}
        {panel(skin.face)}
        {panel(skin.face)}
      </mesh>
      {/* the top cap, standing a little proud all round the way a pressed lid
          does — the reference's crispest edge */}
      <mesh position={[0, plinthH + bodyH + 0.012 * M, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyW + 0.018 * M, 0.024 * M, bodyD + 0.018 * M]} />
        {panel(skin.top)}
      </mesh>

      {/* ── the slot, and the hood over it ───────────────────────────────────
          The hood is the box's signature and it is real geometry: a projecting
          tilted lip with a bright inner face, hinged above the aperture. Its
          whole job is to break the flat front, catch the pendant on its upper
          surface and drop a hard shadow across the enamel under it. */}
      <group position={[0, plinthH + bodyH * 0.855, frontZ]}>
        {/* the aperture: a real recess, not a painted line */}
        <mesh position={[0, 0, -0.02 * M]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 0.76, 0.05 * M, 0.06 * M]} />
          <meshStandardMaterial color="#080705" roughness={1} metalness={0} />
        </mesh>
        {/* The hood, tipped out over it — sloping up and forward, so its outer
            edge stands highest and the slot is in the shade beneath it.
            Brass, but the *value* of brass in a room lit by one tungsten
            pendant: at #a98a2a with roughness 0.34 it caught a specular and
            came back as a sheet of white paper stuck to the box, which was the
            single loudest thing in the frame. Rough and dark, it is a metal
            lip catching a highlight along one edge, which is what it is. */}
        <mesh position={[0, 0.048 * M, 0.052 * M]} rotation={[-0.42, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 0.82, 0.125 * M, 0.014 * M]} />
          <meshStandardMaterial color="#6b5316" roughness={0.56} metalness={0.42} />
        </mesh>
        {/* its cheeks, which are what stop the hood reading as a loose flap */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * bodyW * 0.41, 0.03 * M, 0.028 * M]} castShadow receiveShadow>
            <boxGeometry args={[0.016 * M, 0.115 * M, 0.075 * M]} />
            {panel(skin.side)}
          </mesh>
        ))}
        {/* the lip under the aperture, so the slot has a bottom edge to it */}
        <mesh position={[0, -0.036 * M, 0.012 * M]} castShadow receiveShadow>
          <boxGeometry args={[bodyW * 0.84, 0.022 * M, 0.026 * M]} />
          {panel(skin.top)}
        </mesh>
      </group>

      {/* ── the collection times ─────────────────────────────────────────────
          The enamel plate the styling system asks a letter box to carry: a dark
          frame, a printed card behind it, and a small drip cap over the top
          because it is a frame screwed to the outside of a box. */}
      <group position={[0, plinthH + bodyH * 0.53, frontZ]}>
        <mesh position={[0, 0, 0.008 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.23 * M, 0.28 * M, 0.016 * M]} />
          <meshStandardMaterial color="#191510" roughness={0.62} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.017 * M]}>
          <planeGeometry args={[0.19 * M, 0.24 * M]} />
          {cardArt
            ? <meshStandardMaterial {...cardArt} roughness={0.95} metalness={0} />
            : <meshStandardMaterial color="#7d7561" roughness={0.95} />}
        </mesh>
        <mesh position={[0, 0.158 * M, 0.014 * M]} rotation={[-0.3, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.25 * M, 0.03 * M, 0.01 * M]} />
          {panel(skin.top)}
        </mesh>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function LandingProps({ idx, vw, vh, top, live = true }) {
  const M = pxPerM(vh);
  const floorY = landingFloorY(vh, top);
  const back = -SHAFT_DEPTH - LANDING_SETBACK;
  // The wall screen takes one half of the opening and the page's own column the
  // other, so this is where the text is — and, per the note above, where the
  // furniture goes.
  const content = SCREEN_SIDE[idx] === 'left' ? 'right' : 'left';
  const { landingAmbient: ambient } = useLightTuning();
  const ceilingY = landingCeilingY(vh, top);
  // where the valve rack hangs, which its cable has to leave from
  const bayX = vw / 2 + 0.1 * M * (content === 'right' ? -1 : 1);
  // A prop standing under the column is turned back toward the middle of the
  // room, which is where both the pendant and the camera are: it puts a lit
  // face and a dark one on the same object, and it is the difference between a
  // box seen corner-on and a rectangle with a picture on it.
  const facingIn = content === 'right' ? -1 : 1;

  // how far each one stands off the back wall, measured to its own centre
  const benchZ = back + 0.56 * M;
  // The conveyor's origin is its *corner*, not its centre, and it has to stand
  // the head run's own length off the wall — that is what makes the run come
  // out of the mouth instead of past it. See `BELT.OUT` and `mouthClearance`.
  const beltZ = back + BELT.OUT * M;
  const boxZ = back + 0.52 * M;

  return (
    <>
      {idx === 0 && (
        <>
          {/* The one wall-mounted prop, so the rule above does not reach it: a
              panel hung behind the page's paragraph is a panel nobody sees. It
              stands in the gutter between the column and the wall screen, at
              the height someone would actually work at it. */}
          <ValveRack
            M={M} x={bayX} y={floorY - 1.54 * M} z={back + 0.05 * M}
            ambient={ambient} live={live}
          />
          {/* Up out of the gland and away to the right under the cornice, and
              nothing at all downward — see `WallCable`. It stands a little
              proud of the plaster on its saddles, and it runs past the pier
              rather than stopping at the edge of what can be seen: a corridor
              carries on, and a cable that ends in mid-air at the frame edge is
              the same fault as one that vanished into the skirting. */}
          <WallCable
            M={M}
            from={[bayX + GLAND_X * 0.78 * M, floorY - 2.09 * M]}
            runY={ceilingY + 0.22 * M}
            toX={offRoom(vw, back + 0.05 * M)}
            radius={0.24 * M}
            z={back + 0.05 * M}
          />
        </>
      )}
      {idx === 1 && (
        // Centred under the column and pushed back to the wall, so the heading
        // and the plates sit above it rather than beside it. Barely turned: a
        // bench shoved against a wall is square to it, and the vice and the
        // drawer bank are what break the symmetry.
        <Workbench
          M={M} x={underColumn(vw, content, 0.4, benchZ)} floorY={floorY} z={benchZ}
          ambient={ambient} yaw={facingIn * 0.05}
        />
      )}
      {idx === 2 && (
        <>
          {/* The corner — where the run turns out of the wall and away — stands
              where the pile of crates used to, under the column. The mouth is
              behind it in the plaster and the long run carries on past the pier
              and out of the room to the left, because a corridor does. */}
          {/* Hard against the column's inner edge rather than out in the
              middle of it, so the mouth lands in the gap between the notice
              above and the console beside it — Mykolai's call once he saw the
              first cut ("нужно чтобы окно и конвейер был правее, поближе к
              экрану"). Not as far as it will go, though: at the column's own
              inner edge the mouth ended up *behind* the console's frame and the
              head run with it, so the one thing the move was for — seeing the
              product come out of the wall — was the thing it hid. This is the
              rightmost place the whole opening still stands clear of it. The
              product then runs left *under* the notice, which is the right way
              round: the sign is over the line, not beside it. */}
          <Conveyor
            M={M} x={underColumn(vw, content, 0.24, beltZ)} floorY={floorY} z={beltZ}
            leftEnd={offRoom(vw, beltZ, -1)}
            ambient={ambient} live={live}
          />
          {/* In the gutter, where the rack hangs on the EG, at the height a
              drawing gets hung at — eye level for someone standing. */}
          <Schematic
            M={M} x={bayX} y={floorY - 1.5 * M} z={back + 0.03 * M}
            ambient={ambient}
          />
          {/* The works notice, which was an enamel plate of DOM text until
              NBC-68 and is a screen now — see `NoticeScreen`. It hangs on the
              column's own wall, over the run: the product passes underneath it,
              which is the right way round for a sign in a works. The DOM half
              of this floor is empty as a result, and that is why
              `ProjekteDeck` renders nothing.

              ── the height is not a taste call ─────────────────────────────
              The first cut hung it where a sign gets hung and its bottom run
              landed straight across the mouth in the wall. Mykolai's word for
              it was "коллизия" and he is right: a sign growing out of a hole
              is worse than no sign. The mouth tops out at
              `TOP + MOUTH.H − 0.12` above the floor, so this clears that with
              a hand's width of plaster showing between the two — and it had to
              give up a little width to keep its own head under the cornice,
              which is 3.05 m up and not negotiable. */}
          <NoticeScreen
            x={underColumn(vw, content, 0.5, back + 0.04 * M)}
            y={floorY - 2.25 * M}
            z={back + 0.04 * M}
            w={1.55 * M}
            live={live}
          />
        </>
      )}
      {idx === 3 && (
        // Out toward the column's far edge and turned to face back across the
        // room, which is the one prop Mykolai placed by hand.
        <PostBox
          M={M} x={underColumn(vw, content, 0.87, boxZ)} floorY={floorY} z={boxZ}
          ambient={ambient} yaw={facingIn * 0.5}
        />
      )}
    </>
  );
}

export default LandingProps;
