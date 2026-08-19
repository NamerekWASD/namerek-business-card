import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, BufferAttribute, Color, FrontSide, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { CABINET_H } from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { preloadSurfaceTextures, surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { marqueeGlow, screenGlow } from '../renderers/r3f/patterns.js';
import { FRAMES, SPAN, markStrip, markSurface, paintMark } from '../renderers/r3f/screenMark.js';

const MODEL = '/models/ArcadeCabinetDieselpunk.glb';

// The one authored asset in the scene, and the only object here that could not
// have been written as arithmetic: a case with a curved flank, a leaning face
// and a shelf that tips forward. Everything else in this shaft is a box, a plane
// or a body of revolution, which is exactly why they are code and this is a file.
//
// The model arrives with named parts and empty material slots — deliberately, so
// that the paint comes from this scene's own catalogue rather than from
// Blender. That is what keeps it in the same room as the walls: a prop wearing
// its own materials reads as pasted in, however good those materials are.
//
// Its height in metres becomes scene pixels through `CABINET_H`, which is
// derived in the geometry model alongside every other dimension in the scene.

/**
 * Which of the scene's surfaces each material slot in the asset is painted
 * with. Slots the model has and this table does not fall back to iron, so a
 * re-export that adds a part is a visible-but-harmless mismatch rather than an
 * untextured white box.
 */
const PAINT = {
  body_main_iron: { surface: SURFACES.iron, shade: 0.94 },
  body_bottom_iron_2: { surface: SURFACES.iron, shade: 0.78 },
  // the pressed seam between the case panels — its own slot in the asset, so
  // the line reads as a shadow in the metal rather than as a drawn stripe
  body_split_line: { surface: SURFACES.iron, shade: 0.42 },
  arcade_panel: { surface: SURFACES.steel, shade: 0.9 },
  access_panel_handle: { surface: SURFACES.steel, shade: 1.05 },
  button_base_metall: { surface: SURFACES.steel, shade: 1.1 },
  // the heads round both bezels. Brighter than the frames they sit on:
  // a rivet catches the lamp on its dome, which is the whole reason it reads
  // at this size at all.
  rivet_steel: { surface: SURFACES.steel, shade: 1.25 },
  // The frames have a visible edge in the reference: black enough to recess
  // the inserts, but still metal rather than an unlit cut-out.
  black_metall_frame: { colour: '#29231d', rough: 0.48, metal: 0.58 },
  black_plastik: { colour: '#121010', rough: 0.5, metal: 0.05 },
  button_1_red: { colour: '#c23a2c', rough: 0.35, metal: 0 },
  button_2_green: { colour: '#3a7a52', rough: 0.35, metal: 0 },
  button_3_blue: { colour: '#2f5c86', rough: 0.35, metal: 0 },
  // What the marquee and the screen glass look like with the cabinet dark.
  // The glow they carry on top of this lives in `EMISSIVE`.
  marquee_emissive: { colour: '#2a1e10', rough: 0.4, metal: 0.1 },
  screen_emissive: { colour: '#14110e', rough: 0.32, metal: 0.05 },
};

// The parts that are lit from within rather than from outside. Kept well below
// the shaft fittings' own emissive: those are bare lamps a few metres away, and
// a backlit sign and a phosphor screen that read as bright as one are the
// giveaway that a scene has been lit by dragging sliders. The screen in
// particular is mostly *dark* — its glow belongs to the mark on it, and the mark
// is still a DOM decal waiting for its anchor.
const EMISSIVE = {
  marquee_emissive: { colour: '#e3ae69', intensity: 0.36, pattern: marqueeGlow },
  // The screen carries a map rather than a flat colour, so its emissive stays
  // near white and the map does the tinting; the intensity is up because the
  // map averages well below one.
  screen_emissive: { colour: '#ffe6c4', intensity: 1.15, pattern: screenGlow },
  // the slot this mesh carried before the case was reworked, kept so the
  // shipped asset keeps its glow until the new export lands
  main_screen: { colour: '#7d5426', intensity: 0.6 },
};

/**
 * A planar unwrap across the face of a flat panel.
 *
 * The asset ships without UVs on purpose — nothing in it is textured, and the
 * coordinates would be dead weight in every mesh. The screen is the one
 * exception, and also the one mesh whose unwrap is not a judgement call: it is
 * a rectangle, so its own bounding box is the unwrap.
 *
 * @param {import('three').BufferGeometry} geometry
 */
function planarUV(geometry) {
  if (geometry.attributes.uv) return;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const w = max.x - min.x || 1;
  const h = max.y - min.y || 1;
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = (pos.getX(i) - min.x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - min.y) / h;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

/**
 * The marquee panel's own unwrap, forced rather than skipped.
 *
 * It ships with a UV already — a sliver of a shared atlas, u ∈ [0.644, 0.856],
 * v ∈ [0.254, 0.496] — which is why `planarUV` above, guarded to only fill in a
 * *missing* UV, never touches it. And it can't reuse `planarUV` even forced: that
 * function reads the panel's plane off X/Y, which is right for the screen but
 * not here — the marquee's bounding box is flat in Y, not Z, so its two in-plane
 * axes are X and Z. Confirmed live (`window.__scenes.shaft.scene`, mesh
 * `marquee_emissive`) rather than assumed, the same way the flute orientation in
 * `marqueeGlow` was: painting a colour-coded test map and reading back which
 * screen edge each corner landed on is what pinned down that X runs the panel's
 * short screen-vertical extent and Z its long screen-horizontal one, both
 * without a flip.
 */
function marqueeUV(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const w = max.x - min.x || 1;
  const h = max.z - min.z || 1;
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = (pos.getX(i) - min.x) / w;
    uv[i * 2 + 1] = (pos.getZ(i) - min.z) / h;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

function materialFor(name) {
  const spec = PAINT[name] ?? { surface: SURFACES.iron, shade: 1 };
  const base = spec.surface
    ? surfaceProps(spec.surface, spec.shade ?? 1)
    : {
      color: new Color().setStyle(spec.colour, SRGBColorSpace),
      roughness: spec.rough,
      metalness: spec.metal,
    };
  // No ambience applied here. `Room` sets it on every material in the landing,
  // this one included — which is the only reason the cabinet dims with the room
  // it stands in rather than glowing at a brightness fixed at load time.
  return new MeshStandardMaterial({ ...base, side: FrontSide });
}

/**
 * The asset, painted, built exactly once per load.
 *
 * This being a module-level cache rather than a `useMemo` is a performance fix
 * with teeth behind it. The cabinet mounts and unmounts as its landing comes
 * into and out of range during a ride — which is correct, a corridor behind a
 * shut door is work done for nobody — and painting it on every mount meant
 * nineteen fresh `MeshStandardMaterial`s each time. A fresh material is a fresh
 * shader program as far as three.js is concerned, and compiling nineteen of them
 * mid-ride cost half a second in one frame. Worse, the old cleanup *disposed*
 * them, guaranteeing the recompile.
 *
 * Painted once and shared, a mount is a few dozen object allocations.
 */
const painted = new WeakMap();

function paintedModel(scene) {
  const hit = painted.get(scene);
  if (hit) return hit;
  const root = scene.clone(true);
  let glass = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    // It stands in the mouth of the landing, so it takes the shaft's light too —
    // see `Room`, which is the only thing that reads this.
    o.userData.alsoLit = 'shaft';
    const slot = o.material?.name ?? '';
    if (slot === 'screen_emissive') glass = o;
    o.material = materialFor(slot);
    const glow = EMISSIVE[o.name] ?? EMISSIVE[slot];
    if (glow) {
      o.material.emissive = new Color().setStyle(glow.colour, SRGBColorSpace);
      o.material.emissiveIntensity = glow.intensity;
      // a lit marquee and a lit screen are their own sources; the room's
      // ambience has no business overwriting what they say
      o.material.userData.selfLit = true;
      // `bake` has no canvas to draw on outside a browser and returns null
      // rather than throwing, so a scene built in a test still builds.
      const map = glow.pattern?.();
      if (map) {
        if (slot === 'marquee_emissive') marqueeUV(o.geometry);
        else planarUV(o.geometry);
        o.material.emissiveMap = map;
        o.material.needsUpdate = true;
      }
    }
    // A screen or marquee's own glow does not want a shadow drawn over it —
    // it is a source, not a surface a shadow should darken — so those two
    // stay out; everything else on the case is a normal caster and receiver.
    o.castShadow = !glow;
    o.receiveShadow = !glow;
  });
  // Measured through the node transforms rather than from each mesh's own
  // geometry. Blender writes a part's scale onto its node instead of baking it
  // into the vertices, so `geometry.boundingBox` is the shape *before* that
  // scale; the union of those came out 6.37 units tall against a real 4.52, and
  // the fit-to-height then shrank the cabinet and lifted it clean out of the
  // doorway. `Box3` walks the graph applying matrices, so it is right whatever
  // the exporter chose to bake.
  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root);
  // Where the mark goes, read off the glass rather than written down twice.
  // The case is modelled facing +Y and glTF's y-up conversion sends that to -Z,
  // so the front of the screen is its *smallest* z, and the mark stands a hair
  // in front of it — inside the bezel's recess, clear of both.
  const screen = glass ? (() => {
    const b = new Box3().setFromObject(glass);
    return {
      x: (b.min.x + b.max.x) / 2,
      y: (b.min.y + b.max.y) / 2,
      front: b.min.z,
      width: b.max.x - b.min.x,
      height: b.max.y - b.min.y,
    };
  })() : null;
  const model = { root, screen, height: bounds.max.y - bounds.min.y, foot: bounds.min.y };
  painted.set(scene, model);
  return model;
}

// The asset is modelled facing +Y in Blender, and the glTF y-up conversion
// sends +Y to -Z — straight away from the camera. So square-on to the viewer
// is half a turn, and the six degrees off it are the same six degrees the
// fitting has always been given so it does not read as pasted flat to the wall.
/** How much of the glass the mark covers, top to bottom. */
const MARK_H = 0.72;

// The reveal plays once for the life of the page. The cabinet mounts and
// unmounts as its landing comes in and out of range, and a logo that redraws
// itself every time the lift comes home would be a tic rather than a flourish.
// Flip this to `false` on mount to have it play on every arrival.
let revealed = false;

/**
 * The mark, standing just off the glass, drawing itself in.
 *
 * `MeshBasicMaterial` on purpose: this is a lit screen, and a mark on a lit
 * screen owes nothing to the lamps in the room. Carrying no `emissive` is also
 * what tells `Room` to leave it alone.
 */
function ScreenMark({ screen }) {
  const invalidate = useThree((s) => s.invalidate);
  const [surface] = useState(() => (typeof document === 'undefined' ? null : markSurface()));
  const [ready, setReady] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!surface) return undefined;
    let live = true;
    markStrip().then((frames) => {
      if (!live || !frames.length) return;
      const last = frames[frames.length - 1];
      const show = (frame) => {
        paintMark(surface.canvas, frame);
        surface.texture.needsUpdate = true;
        // the scene renders on demand, so new pixels are not new frames
        invalidate();
      };
      if (revealed) { show(last); setReady(true); return; }
      revealed = true;
      const t0 = performance.now();
      const step = () => {
        if (!live) return;
        const p = Math.min(1, (performance.now() - t0) / (SPAN * 1000));
        show(frames[Math.min(frames.length - 1, Math.round(p * (FRAMES - 1)))]);
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      show(frames[0]);
      setReady(true);
      raf.current = requestAnimationFrame(step);
    });
    return () => { live = false; cancelAnimationFrame(raf.current); };
  }, [surface, invalidate]);

  if (!surface || !ready || !screen) return null;
  const size = screen.height * MARK_H;
  return (
    <mesh position={[screen.x, screen.y, screen.front - 0.01]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * A screen in a 1930s cabinet is a recessed louvred panel, not an emissive
 * rectangle.  The source asset carries the case and bezel; these shallow fins
 * give its face real highlights and depth without adding another texture or
 * asking the room for another light.
 */
function ScreenGrille({ screen }) {
  if (!screen) return null;
  const width = screen.width * 0.84;
  const height = screen.height * 0.8;
  const bars = 17;
  const steel = surfaceProps(SURFACES.iron, 0.62);
  return (
    <group position={[screen.x, screen.y, screen.front - 0.055]}>
      {/* the dark, slightly proud backing stops the emissive source reading as
          a glowing sheet through the grille */}
      <mesh>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#17110b" roughness={0.82} metalness={0.18} />
      </mesh>
      {Array.from({ length: bars }).map((_, index) => {
        const y = height / 2 - ((index + 0.5) / bars) * height;
        return (
          <mesh key={index} position={[0, y, -0.045]}>
            <boxGeometry args={[width, height / bars * 0.22, 0.045]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Resolve the two asynchronous cabinet assets before the doors may move. */
export function ArcadeCabinetWarmup({ onReady }) {
  useGLTF(MODEL);
  useEffect(() => {
    let live = true;
    Promise.all([markStrip(), preloadSurfaceTextures()])
      // An optional mark frame should never permanently lock the entire lift.
      .catch(() => [])
      .finally(() => {
        // One commit for React, then one draw for each demand-driven canvas.
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
          if (live) onReady();
        })));
      });
    return () => { live = false; };
  }, [onReady]);
  return null;
}

function ArcadeCabinet({ x, y, z, yaw = 180 }) {
  const { scene } = useGLTF(MODEL);
  const model = useMemo(() => paintedModel(scene), [scene]);
  const scale = (CABINET_H / model.height) * 1.15;
  return (
    <group position={[x, worldY(y), z]} rotation={[0, (yaw * Math.PI) / 180, 0]} scale={scale}>
      {/* the model is authored standing on y = 0; any drift from that is taken
          out here rather than by asking for a re-export. The mark shares the
          offset because it is placed in the model's own coordinates. */}
      <group position={[0, -model.foot, 0]}>
        <primitive object={model.root} />
        <ScreenMark screen={model.screen} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL);

export default ArcadeCabinet;
