import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, ExtrudeGeometry, Shape } from 'three';
import { SURFACES } from '../model/materials.js';
import { useFittingMaterial } from '../renderers/r3f/useSurfaceMaterial.js';
import {
  buttonFace, buttonLegend, counterPlate, frameBand, namePlate,
} from '../renderers/r3f/propArt.js';
import { buttonRecess } from '../renderers/r3f/patterns.js';
import { invalidateScene } from '../renderers/r3f/frames.js';
import useButtonPulse, { GLOW } from '../renderers/r3f/buttonPulse.js';

// ── the wall screen's frame ──────────────────────────────────────────────────
// What was here before was a slab: one box the size of the panel with the glass
// laid on the *front* of it, so the "frame" was whatever strip of box showed
// round the edge, and the glass stood proud of the thing framing it. At two
// metres that is a picture with a border, and Mykolai's reference is not a
// picture with a border — it is an object bolted to a wall.
//
// Three things separate the two, and all three are why this is geometry rather
// than a better texture:
//
// *The glass is behind the frame.* A recess has a reveal; the reveal catches
// the pendant down one side and goes dark down the other, and that pair of
// edges is the whole of why a recessed panel reads as recessed.
//
// *The corners are heavier than the runs.* Every framed opening of the period
// is built that way — the corner is where the load is — and it gives the
// outline four places to catch a highlight instead of one even line all round.
//
// *There are members standing on the members.* A rail across each run, a vent
// between them, a stepped lip round the glass. The step is the period's
// grammar, which the architrave in this same scene already states.
//
// ── how wide ────────────────────────────────────────────────────────────────
// Mykolai's one objection to the reference was the width — "мне только не
// нравятся сильно широкие рамки" — and his call was to narrow it by half again
// rather than by half. The reference's band is about eleven per cent of the
// panel, so `BAND` is 7.3%: enough to seat a rail and a step, not enough to
// crowd the glass.

const BAND = 0.063;   // the band, as a fraction of the panel's width
const CORNER = 1.42;  // how much bigger a corner block is than the band
const LIP = 0.42;     // the bead round the glass, as a fraction of the band
const CHAMFER = 0.3;  // how much of a plate's corner is cut off, as a fraction of it
// Projekte's bottom run is what the control deck is hung off, and it has to be
// deep enough to be a plinth for it rather than a lip. At the plain band's
// width the deck would be 33 scene pixels of rake — a slot, not a shelf.
const CONSOLE_FOOT = 1.95;

// ── the control deck ────────────────────────────────────────────────────────
// The buttons used to be struck flat into the bottom run, and flat is the whole
// of what was wrong with them: a control panel is a *surface you reach for*,
// and every machine that has ever wanted a thumb found — a jukebox, a pinball
// table, an arcade cabinet, a lift car's own car station — puts its controls on
// a plate raked toward the person standing at it. Mykolai asked for exactly
// that, and it earns its geometry three times over:
//
// *It catches a different light.* The frame's runs face the room square, so the
// pendant rakes across them. A deck tipped back toward the ceiling takes that
// same lamp nearly head on, which is why the console is the brightest thing on
// this wall without a single light being added.
//
// *It gives the buttons a shadow to stand in.* A cap 5 pixels proud of a
// vertical run throws its shadow sideways, where the run's own grain hides it.
// The same cap on a raked deck throws it *down the deck*, across a surface with
// nothing else on it.
//
// *It makes room for the plate.* The deck is the one place on this frame with
// enough clear width for a legend that names what is loaded, and that legend is
// the thing that stops three pictures of one project reading as three projects.
// See `namePlate`.
//
// Everything below is a fraction: of the bottom run for the drop, of the deck's
// own rake length for what stands on it, of the band for the metal. The panel
// is sized off the viewport, so a deck authored in pixels is a shelf on one
// display and a ledge on the next.
const DECK = {
  RAKE: (15 * Math.PI) / 180, // tipped back from the wall's plane
  DROP: 1.1,   // how far down the frame the deck reaches, in bottom runs
  WIDTH: 2.9,   // corner blocks left showing at the ends, in corner blocks
  THICK: 0.42,  // the deck plate itself, as a fraction of the band
  CHEEK: 0.26,  // the gusset under each end, same
  // what stands on the deck, along its own rake: 0 is the middle of it, +1 the
  // edge against the frame, -1 the nose
  PLATE_AT: 0.29,
  PLATE_H: 0.33,
  PLATE_W: 0.58,
  BUTTON_AT: -0.11,
  BUTTON_H: 0.32,
  BUTTON_W: 0.22,
  BUTTON_X: 0.32,
};

// ── the screen's own light, on the one member close enough to catch it ───────
// The two knobs behind the note on `Bead`. `SPILL` is the colour: the glass's
// `emissive` is `#ffe6c4`, and this is that light after a bounce off warm iron,
// so it is a step further into the amber rather than the same value repeated.
// `BEAD_SPILL` is chosen to put the flat beads where the upright ones already
// measure under the pendant — the point is that all four read alike, not that
// the surround is bright. Turn it up and the frame starts advertising itself
// before the screen does.
const SPILL = '#e0a06a';
const BEAD_SPILL = 0.14;

// How far each tier stands off the wall, as a fraction of the band's own width.
// Fractions rather than pixels because the panel is sized off the viewport: a
// fixed depth is a shallow inlay on a wide screen and, on a narrow one, a box
// standing further off the wall than it is wide.
const DEPTH = {
  pan: 0.125,   // the back pan, so the glass is not a hole onto the plaster
  glass: 0.3,
  band: 0.65,
  lip: 0.825,   // proud of the band: the step is the whole point of a stepped lip
  rail: 0.85,   // a cylinder's centre, so it sits *on* the band rather than in it
  vent: 0.8,
  corner: 0.975,
};

/** @param {number} band */
const depths = (band) => Object.fromEntries(
  Object.entries(DEPTH).map(([k, v]) => [k, band * v]),
);

/**
 * Everything both variants need about the panel's own size, worked out once so
 * that nothing downstream re-derives it — `LandingScreen` sizes the glass off
 * this too.
 *
 * @param {number} w @param {number} h @param {boolean} [console_]
 */
export function frameMetrics(w, h, console_ = false) {
  const band = w * BAND;
  const foot = console_ ? band * CONSOLE_FOOT : band;
  return {
    band,
    foot,
    glassZ: band * DEPTH.glass,
    corner: band * CORNER,
    lip: band * LIP,
    glassW: w - band * 2,
    glassH: h - band - foot,
    // Where the glass's own centre ends up once the bottom run has grown. The
    // opening runs from `-h/2 + foot` to `h/2 - band`, so its centre is half
    // the *difference* above the panel's own centre — and the sign matters:
    // inverted, Projekte's glass was pushed down by the very amount the console
    // had pushed it up, which opened a band of bare wall under the top run
    // nearly a whole member wide and read, exactly as Mykolai put it, as the
    // frame having come unglued. `plain` never showed it because there
    // `foot === band` and the term is zero.
    glassY: (foot - band) / 2,
    // how much of a run the vent or the counter takes out of the middle
    vent: w * 0.13,
  };
}

/**
 * A plate with its corners cut off and its edges taken off — the frame's own
 * corner blocks, and the plates the buttons are struck on.
 *
 * A box will not do this. Both references build every plate the same way, and
 * it is not decoration: a square corner presents one face to the pendant, and a
 * chamfered one presents a second, narrow face turned toward it. That narrow
 * face is the bright line running round the outside of the frame in both
 * references, and it is the only thing in this component that describes the
 * frame's outline when the glass behind it is blown out — which, lit from
 * inside, it always is.
 *
 * The bevel is what catches it. `ExtrudeGeometry` runs the bevel from
 * `-bevelThickness`, so the solid is shifted forward to sit in `0..depth` like
 * every box here does, and the UVs — which come out in object units, so a plate
 * fifty pixels across would tile its grain fifty times — are normalised to the
 * plate.
 */
function chamferGeometry(w, h, cut, depth) {
  // The bevel grows the outline outwards, so the shape is inset by it first and
  // the finished plate is exactly `w` by `h`. Left un-inset, every corner block
  // stood a few pixels proud of the runs it is supposed to be flush with, and
  // the frame's outline stepped at all four corners.
  const bevel = Math.min(cut * 0.3, depth * 0.28);
  const shape = new Shape();
  const x = w / 2 - bevel;
  const y = h / 2 - bevel;
  const inset = Math.max(bevel, cut - bevel);
  shape.moveTo(-x + inset, -y);
  shape.lineTo(x - inset, -y);
  shape.lineTo(x, -y + inset);
  shape.lineTo(x, y - inset);
  shape.lineTo(x - inset, y);
  shape.lineTo(-x + inset, y);
  shape.lineTo(-x, y - inset);
  shape.lineTo(-x, -y + inset);
  shape.closePath();

  const g = new ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.translate(0, 0, bevel);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** @param {{ w: number, h: number, depth: number, material: object, cut?: number, position?: [number, number, number] }} props */
function Plate({ w, h, depth, material, cut, position = [0, 0, 0] }) {
  const geo = useMemo(
    () => chamferGeometry(w, h, cut ?? Math.min(w, h) * CHAMFER, depth),
    [w, h, depth, cut],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      <meshStandardMaterial {...material} />
    </mesh>
  );
}

/**
 * The rosette in the middle of a corner block. One large boss, not the pair of
 * pinheads that were here — at this distance two four-pixel dots are noise, and
 * both references put a single big turned head on each corner.
 */
function Boss({ r, z, material, cap }) {
  return (
    <group position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r * 1.08, r * 0.5, 16]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, r * 0.4, 0]} castShadow>
        <cylinderGeometry args={[r * 0.42, r * 0.5, r * 0.3, 12]} />
        <meshStandardMaterial {...cap} />
      </mesh>
    </group>
  );
}

/**
 * The bead round the glass.
 *
 * This replaced a stepped lip built out of four thin boxes, which was the one
 * part of the first cut that did not survive being looked at: flat-fronted
 * boxes under a lamp this raking give the opening a *darker* outline, and both
 * references live off the opposite — a fat rounded surround with a highlight
 * running along it, brightest where the glass's own light rakes across it from
 * inside.
 *
 * ── "a cylinder has that highlight for free" was half true ───────────────────
 * That is what stood here, and it holds for two of the four beads. A cylinder
 * gets its highlight from a light crossing its *axis*; the pendant hangs above
 * and off to one side, so it rakes hard across the two upright beads and runs
 * very nearly along the two flat ones — which the top run then shadows for good
 * measure. Measured on the panel: the upright beads come back near the glass's
 * own brightness, the flat pair at about half of it, all but black.
 *
 * A black band a fifth of a member wide, lying between the lit glass and the
 * run, is not read as a moulding. It is read as a hole, which is exactly what
 * happened — «рамка экрана разъехалась по вертикали от самого экрана», and it
 * took a scanline through the render to establish that the frame and the glass
 * are in fact flush to the pixel and that the "gap" was this.
 *
 * So the bead stops depending on the room's light and carries the *screen's*.
 * That is what a moulding a hand's width from a lit panel actually does, it
 * cannot be shadowed by the frame it belongs to, and it lands on all four sides
 * equally. It is carried rather than lit for the same reason the console's caps
 * are — see `CAP_LIT` — and `selfLit` is what keeps `Room` from pouring the
 * landing's own bounce over it.
 *
 * `spill` is how the eight pieces reach `useScreenLife`: they flicker with the
 * panel, because a surround lit by a screen is lit by whatever the screen is
 * doing. That is the half of this that makes it read as a tube rather than as
 * a strip of paint the shape of one.
 */
function Bead({ m, r, z, material, spill }) {
  const x = m.glassW / 2 - r;
  const y = m.glassH / 2 - r;
  // Callback refs rather than an effect, for the reason `PressButton` states:
  // the material exists the moment the mesh attaches, and an effect would leave
  // the driver holding a hole for a frame.
  const hold = (slot) => (mat) => { if (spill) spill.current[slot] = mat; };
  return (
    <group position={[0, m.glassY, z]}>
      {[-1, 1].map((s, i) => (
        <mesh key={`h${s}`} position={[0, s * y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r, r, m.glassW - r * 2, 12]} />
          <meshStandardMaterial ref={hold(i)} {...material} />
        </mesh>
      ))}
      {[-1, 1].map((s, i) => (
        <mesh key={`v${s}`} position={[s * x, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, m.glassH - r * 2, 12]} />
          <meshStandardMaterial ref={hold(2 + i)} {...material} />
        </mesh>
      ))}
      {[-1, 1].map((sx, i) => [-1, 1].map((sy, j) => (
        <mesh key={`${sx}${sy}`} position={[sx * x, sy * y, 0]} castShadow>
          <sphereGeometry args={[r, 12, 8]} />
          <meshStandardMaterial ref={hold(4 + i * 2 + j)} {...material} />
        </mesh>
      )))}
    </group>
  );
}

/**
 * One of the grilles, centred in a run.
 *
 * Real ribs rather than a painted stripe, and it is the cheapest legible relief
 * on the frame: five bars standing five pixels proud throw five hard shadows
 * across a flat plate, and a painted grille under a lamp this raking throws
 * none at all.
 */
function Vent({ y, w, band, material, rib, z }) {
  const bars = 5;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, z.vent]} castShadow receiveShadow>
        <boxGeometry args={[w, band * 0.66, band * 0.2]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {Array.from({ length: bars }).map((_, i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          position={[(i - (bars - 1) / 2) * (w / (bars + 1)), 0, z.vent + band * 0.15]}
          castShadow
        >
          <boxGeometry args={[w * 0.05, band * 0.46, band * 0.13]} />
          <meshStandardMaterial {...rib} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * How a button sits in the run it is sunk into, as fractions of its own height.
 *
 * `GAP` is the reveal — the bare slot between the cap and the metal round it,
 * which is where the lamp behind the button shows. It is the whole of what
 * Mykolai asked for: the glow used to be smeared over the cap's own face, and a
 * lit cap is a lamp, while a dark cap in a lit slot is a *control*.
 *
 * `SHOULDER` is the bezel left outside the reveal. It has to survive the spill
 * — light that reaches the outer edge of the bezel and stops there draws a
 * bright rectangle, which is the one shape that gives away a painted glow.
 */
// Both were half this in the first cut and neither read at all: a reveal a
// couple of screen pixels wide is a dark line, not a slot with a lamp in it.
const GAP = 0.26;
const SHOULDER = 0.12;

/**
 * How brightly the cap's own paint is carried, and **why it is carried at all
 * rather than lit.**
 *
 * Measured on the panel: a cool grey cap lit by this landing came back at
 * rgb(112, 77, 12) — a blue channel at a tenth of red, which is not a grey by
 * any description. Nothing was wrong. Every light in this room is amber (the
 * pendant at `#ffd29e`, the bounce at `#fff3e6`) and `landingChroma` runs at
 * 1.61, so the grade takes whatever warmth the light leaves on a surface and
 * multiplies it. Working back from the measurement, an albedo that came out
 * neutral through that would need eight times more blue than red — there is no
 * such pigment, and Mykolai's «серый оттенок» is unreachable by repainting.
 *
 * So the cap is carried the way every painted prop on this landing is carried
 * (see `artwork` in `LandingProps.jsx`): its albedo is dropped to near black so
 * the amber has nothing to land on, and the bake is handed back as its own
 * `emissiveMap` at white. What the panel then shows is the paint itself, at the
 * hue it was painted, and the grade's chroma acts on *that* — which is what
 * makes these three the one grey thing in a room made of rust.
 *
 * The level is chosen to land where the lit version already sat, so the change
 * is one of hue and not of a button suddenly shouting.
 */
const CAP_LIT = 0.45;

/**
 * A control-panel button that goes down when it is pressed.
 *
 * ── written to the mesh, never through state ────────────────────────────────
 * The travel is five scene pixels of z on one group, set on the object
 * directly. Through `useState` it would be a React commit on every pointer down
 * and up — of a landing holding the pendant, the props and the wall screen —
 * for a change to one float. This scene has been bitten once already by
 * positioning something from a prop; see `useRideMotion`.
 *
 * ── two lamps, one bulb ─────────────────────────────────────────────────────
 * A button lights in two places and they are the same lamp: the legend struck
 * through the cap, and the reveal round the cap's edge. Both are driven off one
 * `emissiveIntensity`, and both are registered under this button's index so the
 * row's pulse and the pointer handlers reach them together.
 *
 * ── who owns them ───────────────────────────────────────────────────────────
 * Two things write that value: the invitation (`buttonPulse`, a slow swell that
 * says this can be pressed at all) and the answer (a pointer over it, a finger
 * on it). The answer wins while the pointer is here, which is what `hot` is for
 * — this component raises the flag and the row's pulse leaves that button alone
 * until it drops again.
 *
 * A button with no `onPress` is dead metal and answers nothing: no cursor, no
 * lift under the pointer, no travel. NEXT on the last picture used to light and
 * go down and do nothing, which is the same lie the pulse is gated to avoid.
 */
function PressButton({
  x, y, w, h, label, glyph, cap: capMaterial, bezel, base, band,
  index, legends, hot, onPress,
}) {
  const cap = useRef(null);
  // The legend and the reveal, in that order. A plain array on a ref, not
  // state: it is handed straight to the pulse, which writes the materials.
  const lit = useRef([]);
  const face = buttonFace(label, glyph);
  const legend = buttonLegend(label, glyph);
  // Ten scene pixels of relief at the band this frame is built to, and half of
  // that in travel. Both were a third of this in the first cut, and a cap
  // standing three pixels off its bezel is a printed rectangle whichever way it
  // moves — which is precisely what Mykolai asked this not to be.
  const travel = band * 0.13;

  // The bezel, and the glow plane laid over it — one size, so the bake knows
  // exactly how much of itself the cap covers and the bright part of the ring
  // lands in the reveal rather than behind the button.
  const bezelW = w + (h * (GAP + SHOULDER)) * 1.2;
  const bezelH = h + (h * (GAP + SHOULDER)) * 1.2;
  const glow = buttonRecess(w / bezelW, h / bezelH);

  // The cursor is the other half of "it presses". A cap that goes down under a
  // pointer still shaped like an arrow reads as the scene reacting to the
  // mouse; the same cap under a hand reads as a control.
  const cursor = (shape) => { document.body.style.cursor = shape; };

  const set = (at, level) => {
    if (cap.current) cap.current.position.z = at;
    for (const material of lit.current) {
      if (material) material.emissiveIntensity = level;
    }
    // Both canvases are on demand, so a press that does not ask for a frame is
    // a button that only moves the next time something else happens to redraw.
    invalidateScene();
  };

  // Handing this button's own lamps up to the row's pulse. Callback refs rather
  // than an effect: the material exists the moment the mesh is attached, and an
  // effect would leave the row driving a hole for a frame. The array's identity
  // never changes, so registering it from either slot is enough.
  const hold = (slot) => (material) => {
    lit.current[slot] = material;
    if (legends) legends.current[index] = lit.current;
  };
  const mark = (on) => { if (hot) hot.current[index] = on; };

  return (
    <group position={[x, y, 0]}>
      {/* the surround it sits in — a button with no shoulder is a sticker */}
      {/* The surround it sits in — a button with no shoulder is a sticker.
          It stands a little proud of the run rather than inside it: at the
          depth this used to be authored at, the whole plate was buried in the
          bottom run's own box and had never once been visible. */}
      <Plate
        w={bezelW}
        h={bezelH}
        depth={band * 0.4}
        material={bezel}
        position={[0, 0, base - band * 0.36]}
      />
      {/* The reveal: the light escaping round the cap, laid on the bezel's own
          front face. It is *behind* the cap, which is what makes the middle of
          it disappear — the cap is opaque and this is depth-tested against it,
          so only the border round the cap survives. Additive and `depthWrite`
          off, because it is light rather than paint: adding nothing where the
          bake is black is the whole reason the corners of the slot do not show
          as a dark rectangle. */}
      {glow && (
        <mesh position={[0, 0, base + band * 0.055]}>
          <planeGeometry args={[bezelW, bezelH]} />
          <meshStandardMaterial
            ref={hold(1)}
            color="#000000"
            emissive="#ffb45e"
            emissiveMap={glow}
            emissiveIntensity={GLOW.idle}
            roughness={1}
            metalness={0}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            userData={{ selfLit: true }}
          />
        </mesh>
      )}
      <group
        ref={cap}
        position={[0, 0, base]}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!onPress) return;
          mark(true); cursor('pointer'); set(base, GLOW.hover);
        }}
        onPointerOut={() => { mark(false); cursor(''); set(base, GLOW.idle); }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!onPress) return;
          mark(true); set(base - travel, GLOW.press);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (!onPress) return;
          set(base, GLOW.hover); onPress();
        }}
      >
        <Plate
          w={w}
          h={h}
          depth={band * 0.33}
          material={capMaterial}
          position={[0, 0, -band * 0.165]}
        />
        {/* The paint. Near-black albedo and its own bake as `emissiveMap` —
            see `CAP_LIT` for why a grey button on this landing has to be
            carried rather than lit. Nothing drives this: it is paintwork, and
            the whole complaint about the first cut was paintwork that
            pulsed. */}
        {face && (
          <mesh position={[0, 0, band * 0.18]}>
            <planeGeometry args={[w * 0.97, h * 0.9]} />
            <meshStandardMaterial
              map={face}
              emissiveMap={face}
              emissive="#ffffff"
              emissiveIntensity={CAP_LIT}
              color="#1a1d20"
              roughness={0.62}
              metalness={0.08}
              userData={{ selfLit: true }}
            />
          </mesh>
        )}
        {/* And the lamp behind it. A separate plane a hair in front, additive
            like the reveal, because that is what the two of them are: one bulb
            showing through the legend cut into the cap and round the cap's own
            edge. Additive also means the mark cannot darken the paint it sits
            on when the bulb is out, which a `map` on this plane would. */}
        {legend && (
          <mesh position={[0, 0, band * 0.205]}>
            <planeGeometry args={[w * 0.97, h * 0.9]} />
            <meshStandardMaterial
              ref={hold(0)}
              color="#000000"
              emissive="#ffd7a2"
              emissiveMap={legend}
              emissiveIntensity={GLOW.idle}
              roughness={1}
              metalness={0}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
              userData={{ selfLit: true }}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * The console's three controls, in the order they stand on the deck.
 *
 * `at` is which third of the deck each one takes. `pulse` is its invitation —
 * the swell that says it can be pressed — and the three periods are chosen not
 * to be multiples of one another so the row never falls into a beat; see
 * `buttonPulse.js`. Whether a control actually gets its invitation is decided
 * per render from what it would do: PREV lights while there is a picture behind
 * you, NEXT while there is one ahead, LINK while the project on the plate has
 * an address.
 *
 * ── it was GITHUB ───────────────────────────────────────────────────────────
 * A fixed GITHUB was right while the console had one destination for the whole
 * archive. It has one per project now (`url` in `projects.js`), and half of
 * those will not be repositories — a live site, a case study, a shop. LINK is
 * what a machine of this period engraves on a control whose destination is
 * whatever is loaded.
 */
const CONTROLS = [
  { label: 'PREV', glyph: 'left', at: -1, pulse: { period: 2300, phase: 0 } },
  { label: 'LINK', glyph: null, at: 0, pulse: { period: 1700, phase: 0.38 } },
  { label: 'NEXT', glyph: 'right', at: 1, pulse: { period: 2900, phase: 0.62 } },
];

/** Two digits, the way a mechanical counter shows them. */
const pad = (n) => String(n).padStart(2, '0');

/**
 * A baked strip, tiled along the member it is on rather than stretched to fit
 * it. The four runs are four different lengths and a fitted texture would need
 * four bakes to say the same thing.
 */
function useBandMaterial(texture, len, roughness = 0.5, metalness = 0.4) {
  return useMemo(() => {
    if (!texture) return null;
    const map = texture.clone();
    map.needsUpdate = true;
    map.repeat.set(Math.max(1, Math.round(len / 150)), 1);
    // white, because the bake *is* the albedo — `Room` picks the map up as an
    // `emissiveMap` on its next traverse, so the room's bounce carries this
    // picture rather than pouring a flat colour over it
    return { map, color: '#ffffff', roughness, metalness };
  }, [texture, len, roughness, metalness]);
}

/**
 * The frame itself.
 *
 * `variant` is `'plain'` everywhere but Projekte, which gets `'console'` — a
 * counter above the glass and a raked control deck under it, to Mykolai's
 * second reference. Two variants of one component rather than two components:
 * they share the band, the corners and the recess, and the only honest way to
 * keep those in step is for there to be one of each.
 *
 * `live` is whether this landing's doors are actually open. It gates the one
 * thing on the frame that animates of its own accord — the buttons' invitation
 * — for the reason every other prop on a landing is gated: both canvases are
 * `frameloop="demand"`, and a panel pulsing behind a shut door is a panel
 * keeping the whole scene awake for nobody.
 *
 * `spill` is where the bead's eight materials are handed up, so the landing can
 * flicker them along with the glass they surround. See `Bead`.
 *
 * ── the console is controlled, and where its state went ─────────────────────
 * `page` used to be `useState` in here. It cannot be any more: the glass shows
 * the picture that page names, and the glass belongs to `LandingScreen`. State
 * held by the frame would be state the picture has to be told about, which is
 * two owners for one number. So the landing holds it and hands down `gallery` —
 * which picture is loaded, how many there are, what it is called and where it
 * goes — and gets `onPage` back. The frame stays what it looks like: the
 * cabinet, not the archive.
 *
 * @param {{ w: number, h: number, variant?: 'plain' | 'console', live?: boolean,
 *   spill?: { current: unknown[] },
 *   gallery?: { page: number, pages: number, title: string, url: string | null },
 *   onPage?: (delta: number) => void }} props
 */
const NO_GALLERY = { page: 0, pages: 0, title: '', url: null };

function ScreenFrame({
  w, h, variant = 'plain', live = false, spill, gallery = NO_GALLERY, onPage,
}) {
  const console_ = variant === 'console';
  const m = frameMetrics(w, h, console_);
  const Z = depths(m.band);

  const { page, pages, title, url } = gallery;
  // The legends the pulse drives, and which of them the pointer currently owns.
  // Refs, not state — see `buttonPulse`.
  const legends = useRef([]);
  const hot = useRef([]);
  // What each control would actually do. A lit button that changes nothing when
  // it is pressed is a worse lie than an unlit one — the rule the counter was
  // made live for in the first place — so LINK goes dark on a project with no
  // address, and both arrows go dark at the ends of the run.
  const enabled = [page > 0, !!url, page < pages - 1];
  const press = [
    () => onPage?.(-1),
    () => { if (url) window.open(url, '_blank', 'noopener'); },
    () => onPage?.(1),
  ];
  useButtonPulse(
    legends,
    hot,
    console_ ? CONTROLS.map((c, i) => (enabled[i] ? c.pulse : null)) : [],
    console_ && live,
  );

  const band = frameBand();
  const runH = useBandMaterial(band, w);
  const runV = useBandMaterial(band, h);
  // The buttons' own paint, and the one thing on this panel that is deliberately
  // *not* the scene's iron. See the note at the head of `buttonFace`: on a real
  // console the controls are a bought-in part in pale moulded phenolic, and a
  // grey cap on a warm panel reads as the part you are meant to touch.
  const capGrey = { color: '#666d71', roughness: 0.6, metalness: 0.1 };

  const fallback = useFittingMaterial(SURFACES.cabinetFrame, 1, [w, m.band]);
  const iron = useFittingMaterial(SURFACES.cabinetFrame, 1.25, [m.corner, m.corner]);
  const dark = useFittingMaterial(SURFACES.cabinetFrame, 0.55, [w, h]);
  const rib = useFittingMaterial(SURFACES.cabinetPanel, 1.3, [m.band, m.band]);
  // The deck's own plate, and the one member on this frame carried a full step
  // brighter than the iron beside it. It is not a second finish invented for
  // the sake of one: the room's light here is mostly bounce and an environment
  // sphere (see `roomEnv.js`), which is very nearly ambient, so a surface tipped
  // up toward the ceiling measures the same as the vertical run beside it —
  // 46 against 44, taken off the panel. A rake that cannot be seen is not a
  // rake, so the deck is finished lighter, the way a working surface on a
  // painted machine actually is: it is the part that gets wiped.
  const deckIron = useFittingMaterial(SURFACES.cabinetFrame, 1.75, [w, m.foot]);
  // The same iron as the vents' ribs, carrying the screen's light. `selfLit`
  // is not decoration here: without it `Room` overwrites `emissive` with the
  // landing's own bounce on its next traverse — which is every commit — and the
  // bead goes straight back to being a black band. See `Bead`.
  const beadIron = { ...rib, emissive: SPILL, emissiveIntensity: BEAD_SPILL, userData: { selfLit: true } };
  // Copper on the rails, the reference's one warm accent. Kept to a raised
  // round member, per the rule the patch bay's brass follows: a bright tone on
  // a flat face is a stain, on a cylinder it is metal.
  const copper = { color: '#7d4f26', roughness: 0.34, metalness: 0.85 };
  const bolt = { color: '#5f5544', roughness: 0.42, metalness: 0.6 };
  // The turned head on the boss. Warm, but a long way off the rails' copper:
  // at the size a corner boss is on screen, a saturated cap stops reading as
  // metal and starts reading as a lamp that is on.
  const brass = { color: '#6a5230', roughness: 0.4, metalness: 0.7 };

  const halfW = w / 2;
  const halfH = h / 2;
  const topY = halfH - m.band / 2;
  const botY = -halfH + m.foot / 2;
  const midX = halfW - m.band / 2;
  // What the rails have to clear in the middle of the run. Projekte's counter
  // is nearly twice a vent's width, and sizing the rails off the vent regardless
  // ran the near end of each one straight across the first digit of "01 / 06".
  const gap = console_ ? m.vent * 1.9 : m.vent;
  const railLen = (w - m.corner * 2 - gap) / 2 - m.band * 0.2;
  const railX = (gap + railLen) / 2 + m.band * 0.1;

  return (
    <group>
      {/* the back pan: the frame is a hollow rectangle now, and the glass would
          otherwise be a hole onto the plaster behind it */}
      <mesh position={[0, m.glassY, Z.pan / 2]} receiveShadow>
        <boxGeometry args={[m.glassW + m.band, m.glassH + m.band, Z.pan]} />
        <meshStandardMaterial {...dark} />
      </mesh>

      {/* ── the four runs ──────────────────────────────────────────────────── */}
      <mesh position={[0, topY, Z.band / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, m.band, Z.band]} />
        <meshStandardMaterial {...(runH ?? fallback)} />
      </mesh>
      <mesh position={[0, botY, Z.band / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, m.foot, Z.band]} />
        <meshStandardMaterial {...(runH ?? fallback)} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * midX, m.glassY, Z.band / 2]} castShadow receiveShadow>
          <boxGeometry args={[m.band, m.glassH, Z.band]} />
          <meshStandardMaterial {...(runV ?? fallback)} />
        </mesh>
      ))}

      {/* ── the bead round the glass ───────────────────────────────────────── */}
      <Bead m={m} r={m.lip / 2} z={Z.lip - m.lip / 2} material={beadIron} spill={spill} />

      {/* ── the corner blocks, and the boss turned into each ───────────────── */}
      {[-1, 1].map((sx) => [-1, 1].map((sy) => (
        <group
          key={`${sx}${sy}`}
          position={[sx * (halfW - m.corner / 2), sy * (halfH - m.corner / 2), 0]}
        >
          {/* A shallower cut than a button's. At the plate's own 30% the block
              came out a regular octagon — a stop sign bolted to the wall — and
              the reference mitres a corner, it does not turn one. */}
          <Plate w={m.corner} h={m.corner} cut={m.corner * 0.2} depth={Z.corner} material={iron} />
          <Boss r={m.band * 0.28} z={Z.corner + m.band * 0.06} material={bolt} cap={brass} />
        </group>
      )))}

      {/* Projekte's frame carries a tube down each side as well, per its own
          reference — the plain one does not, per its. It is the difference
          between a panel and a console, and it is the reference's difference,
          not an invented one. */}
      {console_ && [-1, 1].map((sx) => (
        <group key={`vr${sx}`} position={[sx * midX, m.glassY, Z.rail]}>
          <mesh castShadow>
            <cylinderGeometry args={[m.band * 0.19, m.band * 0.19, m.glassH * 0.62, 14]} />
            <meshStandardMaterial {...copper} />
          </mesh>
          {[-1, 1].map((sy) => (
            <mesh key={sy} position={[0, sy * m.glassH * 0.31, 0]} castShadow>
              <cylinderGeometry args={[m.band * 0.26, m.band * 0.26, m.band * 0.3, 12]} />
              <meshStandardMaterial {...iron} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── the rails, and the collars they are made off in ────────────────── */}
      {(console_ ? [[topY, 1]] : [[topY, 1], [botY, -1]]).map(([ry, sy]) => (
        [-1, 1].map((sx) => (
          <group key={`${sy}${sx}`}>
            <mesh
              position={[sx * railX, ry, Z.rail]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[m.band * 0.19, m.band * 0.19, railLen, 14]} />
              <meshStandardMaterial {...copper} />
            </mesh>
            <mesh
              position={[sx * (railX - railLen / 2), ry, Z.rail]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[m.band * 0.26, m.band * 0.26, m.band * 0.3, 12]} />
              <meshStandardMaterial {...iron} />
            </mesh>
          </group>
        ))
      ))}

      {/* ── what goes in the middle of each run ────────────────────────────── */}
      {console_
        ? (
          <Counter y={topY} m={m} iron={iron} z={Z} page={page} pages={pages} />
        )
        : [topY, botY].map((vy) => (
          <Vent key={vy} y={vy} w={m.vent} band={m.band} material={iron} rib={rib} z={Z} />
        ))}

      {console_ && (
        <ConsoleDeck
          w={w}
          m={m}
          z={Z}
          hingeY={-halfH + m.foot}
          iron={iron}
          deck={deckIron}
          rib={rib}
          copper={copper}
          cap={capGrey}
          title={title}
          enabled={enabled}
          press={press}
          legends={legends}
          hot={hot}
        />
      )}
    </group>
  );
}

/**
 * Projekte's counter, standing in the top run where a vent would be.
 *
 * The text used to be the fixed string "01 / 06", then the live page out of a
 * constant six. It is the live page out of the archive's own length now, which
 * is what makes the buttons under it honest: a lit NEXT that changes nothing
 * when it is pressed is a worse lie than an unlit one. One plate per reading,
 * baked once each and cached by their own text.
 *
 * It counts **pictures, not projects** — see the note at the head of
 * `projects.js`. A counter that sits on "02 / 05" through three presses of NEXT
 * is a counter that looks stuck, and what keeps three shots of one job from
 * reading as three jobs is the name plate on the deck below, not this.
 *
 * With nothing loaded it reads "00 / 00", which is what a machine with an empty
 * magazine shows. Not blanked: a dark window in a lit frame reads as a fault.
 */
function Counter({ y, m, iron, z, page = 0, pages = 0 }) {
  const plate = counterPlate(`${pad(pages ? page + 1 : 0)} / ${pad(pages)}`);
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, z.vent + m.band * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[m.vent * 1.9, m.band * 0.74, m.band * 0.22]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {plate && (
        <mesh position={[0, 0, z.vent + m.band * 0.22]}>
          <planeGeometry args={[m.vent * 1.78, m.band * 0.62]} />
          <meshStandardMaterial
            map={plate}
            emissiveMap={plate}
            emissive="#ffb45e"
            emissiveIntensity={0.3}
            color="#ffffff"
            roughness={0.5}
            metalness={0.3}
            userData={{ selfLit: true }}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * A gusset under one end of the deck.
 *
 * Two of these are the difference between a shelf and a plate floating in front
 * of a wall. They are the triangle the deck's own underside closes: the upright
 * edge lies on the frame's front face, the flat edge on the deck's bottom line,
 * and the hypotenuse *is* the deck's mid-plane, so the plate sits on them by
 * construction rather than by a number chosen to look right.
 *
 * Built in the shape's own plane and turned a quarter turn so the extrusion
 * runs across the frame — `ExtrudeGeometry` only ever pushes along +z, and the
 * alternative is three trigonometric expressions per vertex.
 */
function Cheek({ x, y, z, drop, reach, thick, material }) {
  const geo = useMemo(() => {
    const s = new Shape();
    // (u, v) with u standing for -z and v for y, which the quarter turn undoes
    s.moveTo(0, 0);
    s.lineTo(0, -drop);
    s.lineTo(-reach, -drop);
    s.closePath();
    const bevel = thick * 0.16;
    const g = new ExtrudeGeometry(s, {
      depth: thick - bevel * 2,
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.translate(0, 0, bevel - thick / 2);
    // object units again, and a gusset a hundred pixels tall would otherwise
    // tile its grain a hundred times — see `chamferGeometry`
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, uv.getX(i) / reach + 1, uv.getY(i) / drop + 1);
    }
    uv.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [drop, reach, thick]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial {...material} />
    </mesh>
  );
}

/**
 * The plate on the deck that says what is loaded.
 *
 * A window in a raised iron surround, the same two pieces the counter above the
 * glass is made of — deliberately, because they are the pair of readings this
 * machine offers and a visitor should recognise the second as the same kind of
 * thing as the first. What they say is split so that neither repeats the other:
 * the counter is *where you are in the archive*, this is *what you are looking
 * at*, and the picture's own place inside its project is printed on the glass.
 *
 * `selfLit` for the reason the bead and the counter both carry: `Room` writes
 * the landing's bounce into `emissive` on every commit unless told the surface
 * is carrying its own light, and a plate lit by the room is a plate that goes
 * out when the room does.
 */
function NamePlate({ y, w, h, base, band, iron, title }) {
  // An empty archive still has a plate, and a blank one reads as a fault. Three
  // dashes is what a machine with nothing loaded shows in a window it cannot
  // turn off.
  const plate = namePlate(title || '— — —');
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, base + band * 0.06]} castShadow receiveShadow>
        <boxGeometry args={[w, h, band * 0.16]} />
        <meshStandardMaterial {...iron} />
      </mesh>
      {plate && (
        <mesh position={[0, 0, base + band * 0.15]}>
          <planeGeometry args={[w * 0.94, h * 0.76]} />
          <meshStandardMaterial
            map={plate}
            emissiveMap={plate}
            emissive="#ffb45e"
            emissiveIntensity={0.34}
            color="#ffffff"
            roughness={0.5}
            metalness={0.3}
            userData={{ selfLit: true }}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Projekte's control deck: the raked plate under the glass, what stands on it,
 * and the two gussets holding it out from the wall.
 *
 * ── the one piece of arithmetic worth stating ───────────────────────────────
 * The deck is hinged at the top edge of the bottom run and drops `DROP` runs
 * from there, so its rake length is that drop over the cosine and its reach off
 * the wall is the same length times the sine. Written that way round — drop
 * first, length derived — because the drop is the thing that has to line up
 * with the frame, and a deck authored by its length instead grows and shrinks
 * against the panel every time the rake is touched.
 *
 * Everything standing on it is positioned in the deck's own space, which is why
 * `PressButton` takes a mounting face rather than the frame's depth table: on
 * the bottom run that face was the band, here it is the front of the deck
 * plate, and the button neither knows nor cares which.
 */
function ConsoleDeck({
  w, m, z, hingeY, iron, deck, rib, copper, cap, title, enabled, press, legends, hot,
}) {
  const drop = m.foot * DECK.DROP;
  const len = drop / Math.cos(DECK.RAKE);
  const reach = len * Math.sin(DECK.RAKE);
  const deckW = w - m.corner * DECK.WIDTH;
  const thick = m.band * DECK.THICK;
  // the mounting face: the deck plate is centred on the group's own plane, so
  // half its thickness is what stands proud of it
  const base = thick / 2;

  const plateH = len * DECK.PLATE_H;
  const buttonH = len * DECK.BUTTON_H;

  return (
    <group>
      <group
        position={[0, hingeY - drop / 2, z.band + reach / 2]}
        rotation={[-DECK.RAKE, 0, 0]}
      >
        <Plate
          w={deckW}
          h={len}
          cut={m.band * 0.45}
          depth={thick}
          material={deck}
          position={[0, 0, -base]}
        />
        <NamePlate
          y={len * DECK.PLATE_AT}
          w={deckW * DECK.PLATE_W}
          h={plateH}
          base={base}
          band={m.band}
          iron={iron}
          title={title}
        />
        {CONTROLS.map((c, i) => (
          <PressButton
            key={c.label}
            x={c.at * deckW * DECK.BUTTON_X}
            y={len * DECK.BUTTON_AT}
            w={deckW * DECK.BUTTON_W}
            h={buttonH}
            label={c.label}
            glyph={c.glyph}
            cap={cap}
            bezel={rib}
            base={base}
            band={m.band}
            index={i}
            legends={legends}
            hot={hot}
            onPress={enabled[i] ? press[i] : undefined}
          />
        ))}
        {/* The nose, wrapping the deck's front edge. Copper, and a cylinder,
            per the rule the frame's own rails follow: a bright tone on a flat
            face is a stain and on a turned member it is metal. It is also the
            edge a hand would actually rest on, which is the last thing that
            separates a console from a picture of one. */}
        <group position={[0, -len / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow>
            <cylinderGeometry args={[m.band * 0.3, m.band * 0.3, deckW, 14]} />
            <meshStandardMaterial {...copper} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * deckW / 2, 0]} castShadow>
              <cylinderGeometry args={[m.band * 0.38, m.band * 0.38, m.band * 0.3, 12]} />
              <meshStandardMaterial {...iron} />
            </mesh>
          ))}
        </group>
      </group>

      {[-1, 1].map((s) => (
        <Cheek
          key={s}
          x={s * (deckW / 2 - m.band * DECK.CHEEK / 2)}
          y={hingeY}
          z={z.band}
          drop={drop}
          reach={reach}
          thick={m.band * DECK.CHEEK}
          material={rib}
        />
      ))}
    </group>
  );
}

export default ScreenFrame;
