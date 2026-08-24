import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { SURFACES } from '../model/materials.js';
import { useFittingMaterial } from '../renderers/r3f/useSurfaceMaterial.js';
import { buttonFace, counterPlate, frameBand } from '../renderers/r3f/propArt.js';
import { invalidateScene } from '../renderers/r3f/frames.js';

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

const BAND = 0.073;   // the band, as a fraction of the panel's width
const CORNER = 1.42;  // how much bigger a corner block is than the band
const LIP = 0.42;     // the bead round the glass, as a fraction of the band
const CHAMFER = 0.3;  // how much of a plate's corner is cut off, as a fraction of it
// Projekte's bottom run has to hold three buttons a thumb could find, and at
// the plain band's width they would be 33 scene pixels tall — a row of dashes.
const CONSOLE_FOOT = 1.95;

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
 * inside. A cylinder has that highlight for free and a box can never have it.
 */
function Bead({ m, r, z, material }) {
  const x = m.glassW / 2 - r;
  const y = m.glassH / 2 - r;
  return (
    <group position={[0, m.glassY, z]}>
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r, r, m.glassW - r * 2, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`v${s}`} position={[s * x, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, m.glassH - r * 2, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sy) => (
        <mesh key={`${sx}${sy}`} position={[sx * x, sy * y, 0]} castShadow>
          <sphereGeometry args={[r, 12, 8]} />
          <meshStandardMaterial {...material} />
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
 * A control-panel button that goes down when it is pressed.
 *
 * ── written to the mesh, never through state ────────────────────────────────
 * The travel is five scene pixels of z on one group, set on the object
 * directly. Through `useState` it would be a React commit on every pointer down
 * and up — of a landing holding the pendant, the props and the wall screen —
 * for a change to one float. This scene has been bitten once already by
 * positioning something from a prop; see `useRideMotion`.
 *
 * ── and it does nothing else, deliberately ──────────────────────────────────
 * Mykolai's call. There is nothing to page through yet — `content.js` still
 * says the projects are in preparation — so a working PREV/NEXT would be three
 * buttons paging an empty gallery. What they have is the part that has to be
 * right first, which is the feel: they go down under the finger, the legend
 * comes up, and they spring back.
 */
function PressButton({ x, y, w, h, label, glyph, cap: capMaterial, bezel, z, band }) {
  const cap = useRef(null);
  const legend = useRef(null);
  const face = buttonFace(label, glyph);
  // Ten scene pixels of relief at the band this frame is built to, and half of
  // that in travel. Both were a third of this in the first cut, and a cap
  // standing three pixels off its bezel is a printed rectangle whichever way it
  // moves — which is precisely what Mykolai asked this not to be.
  const travel = band * 0.13;

  // The cursor is the other half of "it presses". A cap that goes down under a
  // pointer still shaped like an arrow reads as the scene reacting to the
  // mouse; the same cap under a hand reads as a control.
  const cursor = (shape) => { document.body.style.cursor = shape; };

  const set = (at, glow) => {
    if (cap.current) cap.current.position.z = at;
    if (legend.current) legend.current.emissiveIntensity = glow;
    // Both canvases are on demand, so a press that does not ask for a frame is
    // a button that only moves the next time something else happens to redraw.
    invalidateScene();
  };

  return (
    <group position={[x, y, 0]}>
      {/* the surround it sits in — a button with no shoulder is a sticker */}
      <Plate
        w={w + h * 0.36}
        h={h + h * 0.36}
        depth={band * 0.4}
        material={bezel}
        position={[0, 0, z.band - band * 0.5]}
      />
      <group
        ref={cap}
        position={[0, 0, z.band]}
        onPointerOver={(e) => { e.stopPropagation(); cursor('pointer'); set(z.band, 0.5); }}
        onPointerOut={() => { cursor(''); set(z.band, 0.22); }}
        onPointerDown={(e) => { e.stopPropagation(); set(z.band - travel, 0.75); }}
        onPointerUp={(e) => { e.stopPropagation(); set(z.band, 0.5); }}
      >
        <Plate
          w={w}
          h={h}
          depth={band * 0.33}
          material={capMaterial}
          position={[0, 0, -band * 0.165]}
        />
        {face && (
          <mesh position={[0, 0, band * 0.18]}>
            <planeGeometry args={[w * 0.97, h * 0.9]} />
            <meshStandardMaterial
              ref={legend}
              map={face}
              emissiveMap={face}
              emissive="#ffb45e"
              emissiveIntensity={0.22}
              color="#ffffff"
              roughness={0.55}
              metalness={0.25}
              userData={{ selfLit: true }}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

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
 * counter above the glass and a row of buttons under it, to Mykolai's second
 * reference. Two variants of one component rather than two components: they
 * share the band, the corners and the recess, and the only honest way to keep
 * those in step is for there to be one of each.
 *
 * @param {{ w: number, h: number, variant?: 'plain' | 'console' }} props
 */
function ScreenFrame({ w, h, variant = 'plain' }) {
  const console_ = variant === 'console';
  const m = frameMetrics(w, h, console_);
  const Z = depths(m.band);

  const band = frameBand();
  const runH = useBandMaterial(band, w);
  const runV = useBandMaterial(band, h);
  const capM = useBandMaterial(band, w * 0.185, 0.42, 0.45);

  const fallback = useFittingMaterial(SURFACES.cabinetFrame, 1, [w, m.band]);
  const iron = useFittingMaterial(SURFACES.cabinetFrame, 1.25, [m.corner, m.corner]);
  const dark = useFittingMaterial(SURFACES.cabinetFrame, 0.55, [w, h]);
  const rib = useFittingMaterial(SURFACES.cabinetPanel, 1.3, [m.band, m.band]);
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
      <Bead m={m} r={m.lip / 2} z={Z.lip - m.lip / 2} material={rib} />

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
          <Counter y={topY} m={m} iron={iron} z={Z} />
        )
        : [topY, botY].map((vy) => (
          <Vent key={vy} y={vy} w={m.vent} band={m.band} material={iron} rib={rib} z={Z} />
        ))}

      {console_ && [['PREV', 'left', -1], ['GITHUB', null, 0], ['NEXT', 'right', 1]].map(
        ([label, glyph, s]) => (
          <PressButton
            key={label}
            x={s * w * 0.26}
            y={botY}
            w={w * 0.2}
            h={m.foot * 0.44}
            label={label}
            glyph={glyph}
            cap={capM ?? fallback}
            bezel={rib}
            z={Z}
            band={m.band}
          />
        ),
      )}
    </group>
  );
}

/** Projekte's counter, standing in the top run where a vent would be. */
function Counter({ y, m, iron, z }) {
  const plate = counterPlate('01 / 06');
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

export default ScreenFrame;
