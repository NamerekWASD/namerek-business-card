import { useMemo } from 'react';
import { QuadraticBezierCurve3, Vector3 } from 'three';
import { CAM_PERSPECTIVE, SHAFT_DEPTH } from '../model/camera.js';
import {
  DOORWAY_W_FRAC, LANDING_SETBACK, landingFloorY, pxPerM,
} from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { useLightTuning } from '../renderers/r3f/tuning.js';
import {
  benchTop, cratePanel, patchBayPlate, postBoxCard, postBoxSkin,
} from '../renderers/r3f/propArt.js';
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
// and three things to stop it reading as a sticker on the wall:
//
// *Size.* A distribution panel of this period is a cast case the better part of
// a metre tall, hung at hand height because someone has to work at it.
//
// *A case, with the door standing open.* A flat plate has no silhouette; a
// hinged door swung back gives it one, throws a shadow across the wall behind
// it, and says the thing is in use rather than sealed.
//
// *Conduit.* It runs down to the skirting and up to the cornice. This is the
// detail that makes it part of the building instead of an object placed against
// it — and a panel wired into the fabric of the shaft is a better statement of
// the idea than the jack field alone ever was.
//
// It is also, measured, the best-lit spot in the room: hung at 1.5 m on the
// centre gutter it faces the pendant almost square-on, where a prop on the
// floor catches it at a graze.

const JACK_ROWS = [0.23, 0.52, 0.81]; // down the plate, matching the bake's strips
const JACK_COLS = [0, 1, 2, 3, 4, 5].map((c) => 0.07 + (0.86 * (c + 0.5)) / 6);
// …and the ones that are bridged. Without the cords it is a grid of holes.
const CORDS = [[0, 1, 2, 4], [1, 0, 0, 5], [2, 2, 1, 3]]; // [rowA, colA, rowB, colB]

function PatchBay({ M, x, y, z, ambient }) {
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

  /** A jack's position on the plate, in the case's own local frame. */
  const jackAt = (row, col) => [
    (JACK_COLS[col] - 0.5) * plateW,
    (0.5 - JACK_ROWS[row]) * plateH,
  ];

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

      {/* the door, hinged on the left and swung back against the wall */}
      <group position={[-caseW / 2, 0, front]} rotation={[0, 1.98, 0]}>
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

      {/* the pilot lamp: a dead panel is not a landmark */}
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
    </group>
  );
}

/**
 * The conduit the patch bay is wired through, running down to the skirting and
 * up into the cornice, with saddle clips at intervals.
 *
 * Separate from the panel because it belongs to the *building* rather than to
 * the fitting: it is drawn against the wall plane, not against the case that
 * stands proud of it.
 */
function Conduit({ M, x, z, fromY, toY }) {
  const r = 0.022 * M;
  const run = Math.abs(toY - fromY);
  const clips = Math.max(1, Math.round(run / (0.55 * M)));
  return (
    <group position={[x, worldY((fromY + toY) / 2), z]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, run, 10]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.95)} />
      </mesh>
      {Array.from({ length: clips }).map((_, i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          position={[0, run * ((i + 0.5) / clips - 0.5), -r * 0.7]}
          castShadow
        >
          <boxGeometry args={[r * 3.4, r * 0.9, r * 1.6]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.steel, 1.1)} />
        </mesh>
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
// The wall tool-board that used to hang above it is gone. At the height a board
// wants it climbed straight into the page's own text column, and a bench that
// has to be read through a paragraph is a bench nobody looks at.

function Workbench({ M, x, floorY, z, ambient, yaw }) {
  const len = 2.05 * M;
  const depth = 0.72 * M;
  const topT = 0.075 * M;              // the slab sits at 0.92 m — the working
  const legT = 0.09 * M;               // height, and the whole point of the piece
  const legH = 0.92 * M - topT;

  const top = benchTop();
  const topArt = artwork(top, ambient);
  const iron = surfaceProps(SURFACES.iron, 0.85);
  const ironDark = surfaceProps(SURFACES.iron, 0.55);
  const steel = surfaceProps(SURFACES.steel, 1.05);

  const endX = len / 2 - legT * 1.2;
  const legZ = depth / 2 - legT * 0.9;

  return (
    <group position={[x, worldY(floorY), z]} rotation={[0, yaw, 0]}>
      {/* the frames: two legs and a rail at each end, in iron */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {[-1, 1].map((sz) => (
            <mesh key={sz} position={[sx * endX, legH / 2, sz * legZ]} castShadow receiveShadow>
              <boxGeometry args={[legT, legH, legT]} />
              <meshStandardMaterial {...iron} />
            </mesh>
          ))}
          {/* the end rail, and the foot the legs stand on */}
          <mesh position={[sx * endX, legH * 0.86, 0]} castShadow receiveShadow>
            <boxGeometry args={[legT * 0.7, legT * 0.8, depth - legT * 1.4]} />
            <meshStandardMaterial {...iron} />
          </mesh>
          <mesh position={[sx * endX, 0.022 * M, 0]} castShadow receiveShadow>
            <boxGeometry args={[legT * 1.5, 0.045 * M, depth - legT * 0.6]} />
            <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.65)} />
          </mesh>
        </group>
      ))}
      {/* the stretcher tying the two frames together, low and to the back */}
      <mesh position={[0, 0.24 * M, -legZ * 0.55]} castShadow receiveShadow>
        <boxGeometry args={[len - legT * 3, 0.05 * M, 0.05 * M]} />
        <meshStandardMaterial {...iron} />
      </mesh>

      {/* the lower shelf, and what is on it — a bench with an empty underneath
          is a table */}
      <mesh position={[0, 0.26 * M, 0]} castShadow receiveShadow>
        <boxGeometry args={[len - legT * 2.6, 0.035 * M, depth - legT * 2]} />
        <meshStandardMaterial {...ironDark} />
      </mesh>
      {[[-0.28, 0.13, 0.34], [0.06, 0.1, 0.22], [0.3, 0.16, 0.3]].map(([fx, fh, fw]) => (
        <mesh key={fx} position={[fx * len, 0.278 * M + (fh * M) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[fw * M, fh * M, fw * M * 0.8]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.7)} />
        </mesh>
      ))}

      {/* the drawer bank at one end */}
      <group position={[endX * 0.42, legH - 0.235 * M, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.56 * M, 0.44 * M, depth - legT * 1.6]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.75)} />
        </mesh>
        {[-1, 0, 1].map((d) => (
          <group key={d} position={[0, d * -0.145 * M, (depth - legT * 1.6) / 2 + 0.008 * M]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.53 * M, 0.13 * M, 0.016 * M]} />
              <meshStandardMaterial {...surfaceProps(SURFACES.iron, 1.0)} />
            </mesh>
            {/* the pull, which is what makes it a drawer rather than a groove */}
            <mesh position={[0, 0, 0.018 * M]} castShadow>
              <boxGeometry args={[0.16 * M, 0.022 * M, 0.02 * M]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          </group>
        ))}
      </group>

      {/* the slab, overhanging the frames on every side */}
      <mesh position={[0, 0.92 * M - topT / 2, 0]} castShadow receiveShadow>
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
      {/* the steel edge strip along the front, which every real bench has and
          which gives the slab a bright line to be read against */}
      <mesh position={[0, 0.92 * M - topT / 2, depth / 2 + 0.006 * M]} castShadow receiveShadow>
        <boxGeometry args={[len, topT * 0.9, 0.012 * M]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.steel, 0.9)} />
      </mesh>

      {/* the vice: the one part of a bench that reads instantly as a bench, and
          the only thing here that breaks the silhouette's top line */}
      <group position={[-endX * 0.55, 0.92 * M, depth / 2 - 0.02 * M]}>
        <mesh position={[0, 0.035 * M, 0.09 * M]} castShadow receiveShadow>
          <boxGeometry args={[0.22 * M, 0.07 * M, 0.2 * M]} />
          <meshStandardMaterial {...surfaceProps(SURFACES.iron, 0.9)} />
        </mesh>
        {[0.03, 0.15].map((jz) => (
          <mesh key={jz} position={[0, 0.1 * M, jz * M]} castShadow receiveShadow>
            <boxGeometry args={[0.18 * M, 0.11 * M, 0.035 * M]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {/* the screw and its tommy bar */}
        <mesh position={[0, 0.09 * M, 0.24 * M]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.018 * M, 0.018 * M, 0.14 * M, 10]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh position={[0, 0.09 * M, 0.3 * M]} rotation={[0, 0, Math.PI / 2.6]} castShadow>
          <cylinderGeometry args={[0.011 * M, 0.011 * M, 0.26 * M, 8]} />
          <meshStandardMaterial {...steel} />
        </mesh>
      </group>
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

function LandingProps({ idx, vw, vh, top }) {
  const M = pxPerM(vh);
  const floorY = landingFloorY(vh, top);
  const back = -SHAFT_DEPTH - LANDING_SETBACK;
  // The wall screen takes one half of the opening and the page's own column the
  // other, so this is where the text is — and, per the note above, where the
  // furniture goes.
  const content = SCREEN_SIDE[idx] === 'left' ? 'right' : 'left';
  const { landingAmbient: ambient } = useLightTuning();
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
            M={M} x={vw / 2 + 0.1 * M * (content === 'right' ? -1 : 1)}
            y={floorY - 1.54 * M} z={back + 0.05 * M} ambient={ambient}
          />
          <Conduit M={M} x={vw / 2 + (content === 'right' ? -0.1 : 0.1) * M + 0.31 * M} z={back + 0.03 * M} fromY={floorY - 2.03 * M} toY={floorY - 3.0 * M} />
          <Conduit M={M} x={vw / 2 + (content === 'right' ? -0.1 : 0.1) * M + 0.31 * M} z={back + 0.03 * M} fromY={floorY - 1.05 * M} toY={floorY - 0.04 * M} />
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
