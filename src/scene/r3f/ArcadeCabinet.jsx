import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
  Box3, BufferAttribute, Color, FrontSide, Matrix3, MeshStandardMaterial,
  RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3,
} from 'three';
import { CABINET_H } from '../model/geometry.js';
import { SURFACES } from '../model/materials.js';
import { preloadSurfaceTextures, surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { marqueeGlow, screenGlow } from '../renderers/r3f/patterns.js';
import { FRAMES, SPAN, markStrip, markSurface, paintMark } from '../renderers/r3f/screenMark.js';

import metalPlateDiff from '../../assets/textures/polyhaven/metal_plate_diff.jpg';
import metalPlateRough from '../../assets/textures/polyhaven/metal_plate_rough.jpg';
import metalPlateNor from '../../assets/textures/polyhaven/metal_plate_nor.jpg';

import rustCoarseDiff from '../../assets/textures/polyhaven/rust_coarse_diff.jpg';
import rustCoarseRough from '../../assets/textures/polyhaven/rust_coarse_rough.jpg';
import rustCoarseNor from '../../assets/textures/polyhaven/rust_coarse_nor.jpg';

import rustPanelDiff from '../../assets/textures/polyhaven/rust_panel_diff.jpg';
import rustPanelRough from '../../assets/textures/polyhaven/rust_panel_rough.jpg';
import rustPanelNor from '../../assets/textures/polyhaven/rust_panel_nor.jpg';

const MODEL = '/models/ArcadeCabinetDieselpunk.glb';

const texLoader = typeof document !== 'undefined' ? new TextureLoader() : null;

function createPBRSet(diff, rough, nor) {
  if (!texLoader) return null;
  const d = texLoader.load(diff);
  d.wrapS = d.wrapT = RepeatWrapping;
  d.colorSpace = SRGBColorSpace;
  d.anisotropy = 8;

  const r = texLoader.load(rough);
  r.wrapS = r.wrapT = RepeatWrapping;
  r.anisotropy = 8;

  const n = texLoader.load(nor);
  n.wrapS = n.wrapT = RepeatWrapping;
  n.anisotropy = 8;

  return { map: d, roughnessMap: r, normalMap: n };
}

const PBR = {
  steel: createPBRSet(metalPlateDiff, metalPlateRough, metalPlateNor),
  rust: createPBRSet(rustCoarseDiff, rustCoarseRough, rustCoarseNor),
  rustPanel: createPBRSet(rustPanelDiff, rustPanelRough, rustPanelNor),
};

const PAINT = {
  // Main case side flanks and outer body: Poly Haven Metal Plate 02 (matte dark steel with scratches)
  body_main_iron: { pbr: 'steel', tint: '#8e8982', rough: 0.72, metal: 0.45, scale: 65, edgeWear: true, edgeWearIntensity: 1.4 },
  // Recessed front plate (behind screen): Poly Haven Rust Coarse 01 (rich warm rust & patina)
  body_bottom_iron_2: { pbr: 'rust', tint: '#d89c58', rough: 0.65, metal: 0.25, scale: 75 },
  // Pressed split line shadow
  body_split_line: { pbr: 'steel', tint: '#34302c', rough: 0.85, metal: 0.3, scale: 40 },
  // Control panel: dark cast steel with prominent worn scuffs on bevels
  arcade_panel: { pbr: 'steel', tint: '#9c968e', rough: 0.44, metal: 0.65, scale: 50, edgeWear: true, edgeWearIntensity: 2.5 },
  // Bottom bronze latch plate
  access_panel_handle: { pbr: 'rust', tint: '#e2ba72', rough: 0.38, metal: 0.78, scale: 30, edgeWear: true, edgeWearIntensity: 1.6 },
  // Button bases: dark burnished steel ring
  button_base_metall: { colour: '#1e1c1a', rough: 0.42, metal: 0.72 },
  // Screws and rivets on frames: bright turned steel catching highlights
  rivet_steel: { colour: '#b8b3a8', rough: 0.22, metal: 0.88 },
  // Screen & Marquee frame: dark industrial cast metal with worn edge scuffs
  black_metall_frame: { pbr: 'steel', tint: '#66605a', rough: 0.48, metal: 0.55, scale: 45, edgeWear: true, edgeWearIntensity: 2.2 },
  // Plastic collar under joystick
  black_plastik: { colour: '#141312', rough: 0.65, metal: 0.05 },
  // Buttons matching reference photo: Red, Golden Yellow/Amber, Emerald Green
  button_1_red: { colour: '#c8261a', rough: 0.18, metal: 0.04 },
  button_2_green: { colour: '#d99426', rough: 0.18, metal: 0.04 }, // Golden amber in reference photo
  button_3_blue: { colour: '#288c4a', rough: 0.18, metal: 0.04 },  // Emerald green in reference photo
  // What the marquee and the screen glass look like with the cabinet dark.
  marquee_emissive: { colour: '#241b10', rough: 0.4, metal: 0.1 },
  screen_emissive: { colour: '#120f0c', rough: 0.32, metal: 0.05 },
};

const PART_OVERRIDES = {
  joystick_ball_red: { colour: '#d62015', rough: 0.12, metal: 0.03 },
  Joystick_stick_metall: { colour: '#cac6c0', rough: 0.16, metal: 0.94 },
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

const resolvePaint = (slot, name) => PART_OVERRIDES[name] ?? PAINT[slot] ?? { surface: SURFACES.iron, shade: 1 };

/**
 * The scuffed-bevel look, patched onto whichever material a slot ends up
 * with — hand-authored or the asset's own bake alike.
 *
 * `softLight.js` hangs the shaft's wrap-lighting and `roomTone.js`'s per-room
 * grade off a *single* `onBeforeCompile` on `MeshStandardMaterial.prototype`
 * — both files are explicit that a second assignment silently wins and takes
 * those with it. So this does not set `mat.onBeforeCompile`, it wraps
 * whatever is already there (that shared hook, inherited from the prototype)
 * and calls it first, then patches the shader it was handed.
 */
function applyEdgeWear(mat, spec) {
  if (spec.edgeWear) {
    const intensity = (spec.edgeWearIntensity ?? 1.8).toFixed(2);
    const bindRoom = mat.onBeforeCompile;
    mat.onBeforeCompile = function scuffedCompile(shader, renderer) {
      bindRoom.call(this, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjectPos;
        varying vec3 vViewPos;`
      ).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObjectPos = position;
        vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;`
      );

      // Everything lands at the `metalnessmap_fragment` include, and nowhere
      // earlier: `meshphysical.glsl.js` resolves `color_fragment` *before*
      // `roughnessmap_fragment`/`metalnessmap_fragment`, so a wear patch split
      // across those three — tint at `color_fragment`, factors at
      // `roughnessmap_fragment` — reads `edgeHighlight` and `metalnessFactor`
      // before either is declared. GLSL has no hoisting, so that compiled on
      // some materials and silently failed on others depending on which one
      // happened to own the program three.js's cache handed back. One splice
      // point after both factors exist sidesteps the ordering entirely.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjectPos;
        varying vec3 vViewPos;
        float hashNoise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }`
      ).replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        vec3 dNdx = dFdx(vNormal);
        vec3 dNdy = dFdy(vNormal);
        float edgeCurvature = length(dNdx) + length(dNdy);

        float n1 = hashNoise(floor(vObjectPos * 80.0));
        float n2 = hashNoise(floor(vObjectPos * 240.0));
        float scuffNoise = 0.5 + 0.5 * (0.6 * n1 + 0.4 * n2);

        // Crisp wear on bevels and corners. The thresholds sit well above the
        // curvature this asset's own hard-shaded (unwelded) normal splits
        // produce along ordinary low-poly triangle seams — low enough
        // thresholds here light up every seam on a flat panel, not just its
        // real bevels, and wash the whole face toward wornSteel below.
        float edgeWear = smoothstep(0.35, 0.9, edgeCurvature) * scuffNoise;
        edgeWear = clamp(edgeWear * ${intensity}, 0.0, 1.0);

        // Subtle grazing angle sheen on edges
        vec3 viewDir = normalize(-vViewPos);
        float fresnel = pow(clamp(1.0 - dot(normalize(vNormal), viewDir), 0.0, 1.0), 3.5);
        float edgeHighlight = clamp(edgeWear + fresnel * 0.15 * smoothstep(0.35, 0.9, edgeCurvature), 0.0, 1.0);

        roughnessFactor = mix(roughnessFactor, 0.18, edgeHighlight);
        metalnessFactor = mix(metalnessFactor, 0.90, edgeHighlight);

        vec3 wornSteel = vec3(0.78, 0.75, 0.70);
        diffuseColor.rgb = mix(diffuseColor.rgb, wornSteel, edgeHighlight * 0.35);`
      );
    };
  }

  return mat;
}

function materialFor(spec) {
  let mat;
  if (spec.pbr && PBR[spec.pbr]) {
    const pbr = PBR[spec.pbr];
    mat = new MeshStandardMaterial({
      color: new Color().setStyle(spec.tint || '#ffffff', SRGBColorSpace),
      map: pbr?.map ?? null,
      roughnessMap: pbr?.roughnessMap ?? null,
      normalMap: pbr?.normalMap ?? null,
      roughness: spec.rough ?? 0.6,
      metalness: spec.metal ?? 0.45,
      side: FrontSide,
    });
    if (mat.normalMap) mat.normalScale.set(0.75, 0.75);
  } else if (spec.surface) {
    const base = surfaceProps(spec.surface, spec.shade ?? 1);
    mat = new MeshStandardMaterial({ ...base, side: FrontSide });
  } else {
    mat = new MeshStandardMaterial({
      color: new Color().setStyle(spec.colour || '#ffffff', SRGBColorSpace),
      roughness: spec.rough ?? 0.5,
      metalness: spec.metal ?? 0.5,
      side: FrontSide,
    });
  }

  return applyEdgeWear(mat, spec);
}

// The mean colour of each baked slot's own baseColorTexture, sampled off the
// actual shipped pixels (a 16×16 canvas downscale of the live `map` image,
// averaged) rather than guessed — see `bakedMaterialFor` below for why a
// guess undersells it. `access_panel_handle`/`arcade_main_box_front` share a
// value because this export's bake happens to point both at the same rust
// tile. Slots absent here (`black_metall_frame`) carry no baseColorTexture at
// all — nothing to sample — and fall through to `spec.tint` instead.
const BAKED_ALBEDO = {
  access_panel_handle: '#502e19',
  arcade_main_box_front: '#3a2213',
  arcade_panel: '#55493e',
};

/**
 * A slot the Blender export baked its own maps onto keeps them: the case's
 * hero panels (`access_panel_handle`, `arcade_panel`, `arcade_main_box_front`,
 * `black_metall_frame` as of this export) now carry a real baseColor/normal/
 * metallicRoughness bake, and building a fresh material from the JS paint
 * catalogue — as every slot used to need, back when the asset shipped with
 * empty material slots on purpose — threw that bake away and painted a stand-in
 * over it instead. `paintedModel` below only reaches for this when the slot's
 * own material actually carries a map; anything still flat-coloured (buttons,
 * the split line, the two emissive glass slots…) keeps going through
 * `materialFor` and the hand-authored `PAINT` table.
 */
function bakedMaterialFor(original, spec) {
  const mat = original.clone();
  mat.side = FrontSide;
  // `Room` reads `material.color` as the surface's albedo to fake an ambient
  // bounce (`emissive = albedo * ambient`) — right for every hand-tinted
  // material elsewhere in this scene, wrong here: a baked slot's `color` is
  // the glTF `baseColorFactor`, which defaults to white when the artist left
  // it unset and the real colour lives entirely in the texture. Left alone,
  // `Room` would wash the whole panel toward white regardless of what the
  // bake actually shows. Seeding `userData.albedo` first beats it there — see
  // the `??=` in `Room.jsx`. `spec.tint` is a worse fallback than it looks:
  // those values were hand-picked to *tint a stock Poly Haven JPG*, not to
  // describe this bake's own average, and read paler than the bake actually
  // is (measured live: access_panel_handle's tint is #e2ba72, the bake's own
  // average is #62391f — a different colour, not just a different shade).
  //
  // Damped again on top of that: the bake already carries Blender's own
  // shading and occlusion baked into its pixels, so `Room`'s flat per-room
  // wash is doing double duty here that it never was on a flat-tinted
  // fitting. Undamped, a uniform add lightens the bake's dark, high-contrast
  // rust more than it does anything bright — read as the whole panel
  // drifting pale rather than staying lit-but-textured, which is what a
  // fixed fraction of an already-representative albedo fixes.
  const BAKE_AMBIENT_DAMPING = 0.15;
  mat.userData.albedo = new Color()
    .setStyle(BAKED_ALBEDO[original.name] ?? spec.tint ?? '#231c13', SRGBColorSpace)
    .multiplyScalar(BAKE_AMBIENT_DAMPING);
  return applyEdgeWear(mat, spec);
}

/**
 * A cube-projected UV for a solid that ships with none.
 */
function boxUV(mesh, scale = 70, fit = 1.0) {
  const geometry = mesh.geometry;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld).multiplyScalar(fit);
    n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).applyMatrix3(normalMatrix);
    const ax = Math.abs(n.x); const ay = Math.abs(n.y); const az = Math.abs(n.z);
    if (ax >= ay && ax >= az) { uv[i * 2] = p.y / scale; uv[i * 2 + 1] = p.z / scale; }
    else if (ay >= ax && ay >= az) { uv[i * 2] = p.x / scale; uv[i * 2 + 1] = p.z / scale; }
    else { uv[i * 2] = p.x / scale; uv[i * 2 + 1] = p.y / scale; }
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

/**
 * The asset, painted, built exactly once per load.
 */
const painted = new WeakMap();

function paintedModel(scene) {
  const hit = painted.get(scene);
  if (hit) return hit;
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root);
  const fit = (CABINET_H / (bounds.max.y - bounds.min.y)) * 1.15;
  let glass = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.alsoLit = 'shaft';
    const original = o.material;
    const slot = original?.name ?? '';
    if (slot === 'screen_emissive') glass = o;
    const spec = resolvePaint(slot, o.name);
    const baked = !!(original?.map || original?.normalMap || original?.roughnessMap || original?.metalnessMap);
    if (baked) {
      o.material = bakedMaterialFor(original, spec);
    } else {
      o.material = materialFor(spec);
      if (spec.scale || spec.surface) {
        boxUV(o, spec.scale ?? spec.surface?.scale ?? 70, fit);
      }
    }
    const glow = EMISSIVE[o.name] ?? EMISSIVE[slot];
    if (glow) {
      o.material.emissive = new Color().setStyle(glow.colour, SRGBColorSpace);
      o.material.emissiveIntensity = glow.intensity;
      o.material.userData.selfLit = true;
      const map = glow.pattern?.();
      if (map) {
        if (slot === 'marquee_emissive') marqueeUV(o.geometry);
        else planarUV(o.geometry);
        o.material.emissiveMap = map;
        o.material.needsUpdate = true;
      }
    }
    o.castShadow = !glow;
    o.receiveShadow = !glow;
  });
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
  const model = {
    root,
    screen,
    height: bounds.max.y - bounds.min.y,
    foot: bounds.min.y,
    mapsReady: Promise.resolve(),
  };
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
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // The bake usually finishes during `ArcadeCabinetWarmup`, well before this
    // ever mounts, but a demand-driven renderer only redraws on request — a map
    // that lands after this frame's last draw call needs its own nudge or it
    // sits ready in memory and never actually appears.
    model.mapsReady.then(invalidate);
  }, [model, invalidate]);
  const scale = (CABINET_H / model.height) * 1.1;
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
