import { useMemo, useRef } from 'react';
import {
  AdditiveBlending, CatmullRomCurve3, DoubleSide, QuadraticBezierCurve3, Vector3,
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
  benchBand, benchTop, chestPanel, cratePanel, drawerFace, patchBayPlate, postBoxCard, postBoxSkin,
} from '../renderers/r3f/propArt.js';
import { lampGlow } from '../renderers/r3f/patterns.js';
import usePilotLamps, { LAMP_DARK } from '../renderers/r3f/pilotLamps.js';
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
// EG — the patch bay
// ─────────────────────────────────────────────────────────────────────────────
// The one prop that is about the site's own subject: a board of jacks with two
// of them bridged is, under the brass, a switched network. That idea was always
// here and always illegible, because the board was 132 scene pixels across —
// four tenths of a metre, a smear of specks at the far end of a corridor.
//
// What it needed was not a different idea but the room to state the one it has,
// and four things to stop it reading as a sticker on the wall:
//
// *Size.* A distribution panel of this period is a cast case the better part of
// a metre tall, hung at hand height because someone has to work at it.
//
// *A case, with the door standing open.* A flat plate has no silhouette; a
// hinged door swung back gives it one, throws a shadow across the wall behind
// it, and says the thing is in use rather than sealed.
//
// *Its supply, arriving somewhere.* A cable rising out of a gland on the top of
// the case and running away under the cornice is what makes the panel part of
// the building rather than an object placed against it.
//
// *Lamps that are not all doing the same thing.* See `usePilotLamps`.
//
// It is also, measured, the best-lit spot in the room: hung at 1.5 m on the
// centre gutter it faces the pendant almost square-on, where a prop on the
// floor catches it at a graze.

const JACK_ROWS = [0.185, 0.385, 0.585]; // down the plate, under the bake's strips
const JACK_COLS = [0, 1, 2, 3, 4, 5].map((c) => 0.075 + (0.85 * (c + 0.5)) / 6);
// …and the ones that are bridged. Without the cords it is a grid of holes.
const CORDS = [[0, 1, 2, 4], [1, 0, 0, 5], [2, 2, 1, 3]]; // [rowA, colA, rowB, colB]
// Which of the six lamps has a cord in its circuit, which is what decides
// whether it sits lit and drops out or sits dark and blips — see
// `usePilotLamps`. Taken from `CORDS` rather than written out again, so a
// patched circuit cannot end up with an idle lamp over it.
const PATCHED = [0, 1, 2, 3, 4, 5].map(
  (c) => CORDS.some(([, ca, , cb]) => ca === c || cb === c),
);
// where the lamps sit on the plate, matching the sockets the bake paints
const LAMP_ROW = 0.7;
const LAMP_COLS = [0, 1, 2, 3, 4, 5].map((c) => 0.115 + (c * 0.77) / 5);

function PatchBay({ M, x, y, z, ambient, live }) {
  const caseW = 0.78 * M;
  const caseH = 0.98 * M;
  const caseD = 0.16 * M;
  const plateW = caseW - 0.12 * M;
  const plateH = caseH - 0.14 * M;
  const plate = patchBayPlate();
  const plateArt = artwork(plate, ambient);

  const cast = surfaceProps(SURFACES.iron, 0.9);
  const steel = surfaceProps(SURFACES.steel, 1);
  const brass = { color: '#8a6326', roughness: 0.42, metalness: 0.72 };

  /** A point on the plate, in the case's own local frame. */
  const onPlate = (u, v) => [(u - 0.5) * plateW, (0.5 - v) * plateH];
  const jackAt = (row, col) => onPlate(JACK_COLS[col], JACK_ROWS[row]);

  const cords = useMemo(() => CORDS.map(([ra, ca, rb, cb]) => {
    const [ax, ay] = jackAt(ra, ca);
    const [bx, by] = jackAt(rb, cb);
    // A cord hangs. The control point is pulled *below* the straight line
    // between its ends, which is the whole difference between a cable and a
    // pencil stroke — and it hangs proud of the plate, not on it.
    return new QuadraticBezierCurve3(
      new Vector3(ax, ay, 0.03 * M),
      new Vector3((ax + bx) / 2, Math.min(ay, by) - 0.16 * M, 0.09 * M),
      new Vector3(bx, by, 0.03 * M),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [M, plateW, plateH]);

  // The live board. The materials are collected by ref and written to directly,
  // never through state — see `usePilotLamps` for why, and for why this costs
  // the scene almost nothing despite running while nobody is riding.
  const lampMaterials = useRef([]);
  usePilotLamps(lampMaterials, PATCHED, live);

  // the case's own front plane, which everything inside it is measured from
  const front = caseD / 2;

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

      {/* the plate, recessed inside the bezel */}
      <mesh position={[0, 0, front + 0.058 * M]} receiveShadow>
        <planeGeometry args={[plateW, plateH]} />
        {plateArt
          ? <meshStandardMaterial {...plateArt} roughness={0.62} metalness={0.2} />
          : <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.7)} />}
      </mesh>

      {/* the cords first, so they read as plugged into the jacks rather than
          laid across the top of them */}
      <group position={[0, 0, front + 0.06 * M]}>
        {cords.map((curve, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <mesh key={i} castShadow>
            <tubeGeometry args={[curve, 26, 0.008 * M, 6, false]} />
            <meshStandardMaterial color="#2b1f14" roughness={0.8} metalness={0.08} />
          </mesh>
        ))}
        {/* and the plugs on their ends — a cord that stops at the panel face is
            a cord lying against it */}
        {CORDS.flatMap(([ra, ca, rb, cb], i) => [[ra, ca], [rb, cb]].map(([r, c], k) => {
          const [jx, jy] = jackAt(r, c);
          return (
            <mesh key={`${i}-${k}`} position={[jx, jy, 0.018 * M]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.011 * M, 0.014 * M, 0.045 * M, 10]} />
              <meshStandardMaterial {...brass} />
            </mesh>
          );
        }))}
      </group>

      {/* the field itself: an eyelet per hole, because a brass ring catches the
          light on its own and a painted dot never will */}
      <group position={[0, 0, front + 0.062 * M]}>
        {JACK_ROWS.map((_, r) => JACK_COLS.map((__, c) => {
          const [jx, jy] = jackAt(r, c);
          return (
            <mesh key={`${r}-${c}`} position={[jx, jy, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.014 * M, 0.014 * M, 0.01 * M, 10, 1, true]} />
              <meshStandardMaterial {...brass} side={2} />
            </mesh>
          );
        }))}
      </group>

      {/* ── the row of pilot lamps ───────────────────────────────────────────
          A bead of glass in a brass bezel, one per circuit. Each is its own
          material because each is driven separately; sharing one would make the
          whole row blink in step, which is the single thing that would give the
          game away. */}
      <group position={[0, 0, front + 0.062 * M]}>
        {LAMP_COLS.map((u, i) => {
          const [lx, ly] = onPlate(u, LAMP_ROW);
          return (
            <group key={u} position={[lx, ly, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.021 * M, 0.023 * M, 0.016 * M, 12]} />
                <meshStandardMaterial {...brass} />
              </mesh>
              <mesh position={[0, 0, 0.011 * M]}>
                <sphereGeometry args={[0.016 * M, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                  ref={(node) => { lampMaterials.current[i] = node; }}
                  userData={{ selfLit: true }}
                  color="#2e1c06"
                  emissive={PATCHED[i] ? '#ffb454' : '#ff8f3c'}
                  emissiveIntensity={LAMP_DARK}
                  roughness={0.3}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* the mains pilot, above the field and steady — the one lamp on the
          board that says the panel has power rather than traffic */}
      <mesh position={[caseW * 0.36, caseH * 0.42, front + 0.062 * M]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.019 * M, 0.019 * M, 0.02 * M, 10]} />
        <meshStandardMaterial {...brass} />
      </mesh>
      <mesh position={[caseW * 0.36, caseH * 0.42, front + 0.074 * M]}>
        <sphereGeometry args={[0.016 * M, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          userData={{ selfLit: true }}
          color="#3a2408"
          emissive="#ffb454"
          emissiveIntensity={3}
        />
      </mesh>

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
 */
const offRoom = (vw, z) => vw / 2 + vw * 0.58 * ((CAM_PERSPECTIVE - z) / CAM_PERSPECTIVE);

/**
 * The cable the patch bay is fed by: up out of the gland, and away to the right
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
          the light landing somewhere is what makes it a lamp. */}
      {glow && (
        <mesh position={[-0.33 * M, benchH + 0.004 * M, 0.04 * M]} rotation={[-Math.PI / 2, 0, 0]}>
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

      {/* the few things left lying where they were put down */}
      {[[-0.16, 0.05, 0.34], [-0.02, -0.32, -0.5], [0.12, 0.12, 0.2]].map(([tx, tz, ta]) => (
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
// 2. OG — the crates
// ─────────────────────────────────────────────────────────────────────────────
// Three at three depths, which is still the cheapest legible object there is —
// the difference is that they are now crates rather than boxes. A crate is
// sawn boards with gaps between them, battens on the corners, steel brackets
// and a sprayed mark; a box is a rectangle. All of that is in `cratePanel`
// except the battens and the brackets, which have to be geometry because their
// whole contribution is a broken silhouette.

function Crate({ M, w, h, d, boards, stencilled, ambient, ...rest }) {
  const side = cratePanel(boards, false);
  const face = cratePanel(boards, stencilled);
  const sideArt = artwork(side, ambient);
  const faceArt = artwork(face, ambient);
  const lidArt = artwork(side, ambient, FACE.up);
  const underArt = artwork(side, ambient, FACE.down);
  const fallback = surfaceProps(SURFACES.iron, 0.9);
  const batten = 0.05 * M;
  const timber = { color: '#463825', roughness: 0.88, metalness: 0.02 };

  const panel = (art) => (art
    ? <meshStandardMaterial {...art} roughness={0.88} metalness={0.02} />
    : <meshStandardMaterial {...fallback} />);

  return (
    <group {...rest}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {panel(sideArt)}
        {panel(sideArt)}
        {panel(lidArt)}
        {panel(underArt)}
        {panel(faceArt)}
        {panel(sideArt)}
      </mesh>
      {/* the corner battens: four uprights standing proud of the boards, which
          is what a crate is actually held together by */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <mesh
          key={`${sx}${sz}`}
          position={[(sx * (w - batten)) / 2, 0, (sz * (d - batten)) / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[batten * 1.25, h + 0.006 * M, batten * 1.25]} />
          <meshStandardMaterial {...timber} />
        </mesh>
      )))}
      {/* and the steel corner brackets, top and bottom */}
      {[-1, 1].map((sy) => [-1, 1].map((sx) => (
        <mesh
          key={`${sy}${sx}`}
          position={[(sx * (w - batten * 0.6)) / 2, (sy * (h - batten)) / 2, 0]}
          castShadow
        >
          <boxGeometry args={[batten * 0.7, batten * 1.1, d * 0.98]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.steel, 0.85)} />
        </mesh>
      )))}
    </group>
  );
}

function Crates({ M, x, floorY, z, ambient }) {
  // A stack has to be a stack: the big one on the floor, a smaller one square
  // on top of it and turned off its axis, and a third alongside at a different
  // depth. Three identical boxes in a row is a pattern, not a pile.
  const big = { w: 0.86 * M, h: 0.68 * M, d: 0.64 * M };
  const small = { w: 0.6 * M, h: 0.47 * M, d: 0.54 * M };
  const flank = { w: 0.68 * M, h: 0.52 * M, d: 0.46 * M };
  return (
    <group position={[x, worldY(floorY), z]}>
      <Crate
        M={M} {...big} boards={5} stencilled ambient={ambient}
        position={[0, big.h / 2, 0]} rotation={[0, 0.13, 0]}
      />
      <Crate
        M={M} {...small} boards={4} stencilled={false} ambient={ambient}
        position={[0.06 * M, big.h + small.h / 2, -0.03 * M]} rotation={[0, -0.22, 0]}
      />
      <Crate
        M={M} {...flank} boards={4} stencilled ambient={ambient}
        position={[-0.78 * M, flank.h / 2, 0.24 * M]} rotation={[0, 0.44, 0]}
      />
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
  // where the patch bay hangs, which its cable has to leave from
  const bayX = vw / 2 + 0.1 * M * (content === 'right' ? -1 : 1);
  // A prop standing under the column is turned back toward the middle of the
  // room, which is where both the pendant and the camera are: it puts a lit
  // face and a dark one on the same object, and it is the difference between a
  // box seen corner-on and a rectangle with a picture on it.
  const facingIn = content === 'right' ? -1 : 1;

  // how far each one stands off the back wall, measured to its own centre
  const benchZ = back + 0.56 * M;
  const cratesZ = back + 0.5 * M;
  const boxZ = back + 0.52 * M;

  return (
    <>
      {idx === 0 && (
        <>
          {/* The one wall-mounted prop, so the rule above does not reach it: a
              panel hung behind the page's paragraph is a panel nobody sees. It
              stands in the gutter between the column and the wall screen, at
              the height someone would actually work at it. */}
          <PatchBay
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
        <Crates
          M={M} x={underColumn(vw, content, 0.52, cratesZ)} floorY={floorY} z={cratesZ}
          ambient={ambient}
        />
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
