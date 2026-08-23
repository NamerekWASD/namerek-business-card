// ── surfaces ─────────────────────────────────────────────────────────────────
// Every large plane in the scene is described here rather than inline, so the
// look can be dialled without going near the geometry. The textures were chosen
// back when they covered a few small fittings; spread over every surface at full
// strength they fight each other and the text, so `tex` is now a real scalar:
// 1 is the raw tile, 0 is flat colour, and the sensible range is 0.1–0.4.
//
// This file is the *catalogue*, not the paint. Turning a `Surface` into
// something a browser can draw is `scene/renderers/css3d/surfaceStyle.js`; a
// three.js backend would read the same entries and build a `MeshStandardMaterial`
// from them. Nothing here knows what CSS is.

import rustBrass from '../../assets/textures/rust-brass.jpg';
import bronzeWorn from '../../assets/textures/bronze-worn.jpg';
import brushedSteel from '../../assets/textures/brushed-steel.jpg';
import whiteStucco from '../../assets/textures/white_stucco.png';

/** @import { Surface, Shade } from './types.js' */

export const TILES = { rust: rustBrass, bronze: bronzeWorn, steel: brushedSteel, paper: whiteStucco, none: null };

// `rough`/`metal` are read only by a physically-lit backend. Nothing here is
// polished: this is a shaft of painted iron and worn steel in a damp building,
// so roughness stays high and metalness low — a fully metallic surface with no
// environment map to reflect renders black, which is the classic way a ported
// scene ends up looking like a hole rather than a wall.
/** @type {Record<string, Surface>} */
export const SURFACES = {
  // the corridor either side of us — furthest from the lamp, so the flattest
  shaftWall: { from: '#2b2521', to: '#14110e', tile: 'rust', scale: 320, tex: 0.22, rough: 0.92, metal: 0.05 },
  // the blind wall at the far end, between the landings
  backWall: { from: '#2e2822', to: '#171310', tile: 'rust', scale: 360, tex: 0.16, rough: 0.94, metal: 0.05 },
  // inside the landing: another room, so its own colour and its own light
  landing: { from: '#463a2c', to: '#221a12', tile: 'rust', scale: 300, tex: 0.14, rough: 0.9, metal: 0.04 },
  // the cage we are standing in — nearest, so it may carry the most grain
  cageRoof: { from: '#242019', to: '#12100d', tile: 'steel', scale: 190, tex: 0.3, rough: 0.78, metal: 0.3 },
  cageFloor: { from: '#3c342a', to: '#201b15', tile: 'steel', scale: 210, tex: 0.34, rough: 0.74, metal: 0.34 },
  cageSteel: { from: '#3b352d', to: '#1e1a15', tile: 'steel', scale: 130, tex: 0.36, rough: 0.7, metal: 0.38 },
  // Blackened steel, not the rust it used to carry — it read as a warm brown
  // box next to the frame's grey the moment the two actually meet (see the
  // leaf's own reveal at the frame's outer tier), and the frame stays grey.
  // Kept warm like every other steel in this catalogue (`cageSteel`, `steel`,
  // `doorFrame` below all run R>G>B, never B>G) — a cooler, bluer grey here
  // was the one hex in the file fighting the cineon grade instead of riding
  // it, which is what read as a flat, textureless slab under real exposure.
  doorLeaf: { from: '#332e28', to: '#151210', tile: 'steel', scale: 240, tex: 0.3, rough: 0.68, metal: 0.3 },
  doorFrame: { from: '#4a4137', to: '#231e19', tile: 'steel', scale: 160, tex: 0.32, rough: 0.72, metal: 0.34 },
  // the small fittings — clips, shoes, rivetted plates, architrave members
  iron: { from: '#443626', to: '#241a11', tile: 'rust', scale: 70, tex: 0.3, rough: 0.84, metal: 0.16 },
  steel: { from: '#3f454a', to: '#1e2225', tile: 'steel', scale: 46, tex: 0.34, rough: 0.62, metal: 0.45 },
  // The arcade cabinet's own case and control-panel metal. Same tiles as
  // `iron`/`steel` for family continuity, but those two are tuned for a
  // barely-there wash on small fittings glimpsed in passing — baked at their
  // dark `from`/`to` and low `tex`, the multiply-then-wash in `bakeSurface`
  // crushes the grain down to a near-flat smear. The cabinet is a hero prop
  // looked at close and square-on, so it gets lighter tones (more survives
  // the multiply) and a much higher `tex` (less of the wash flattens it back
  // out) instead.
  cabinetCase: { from: '#8a6b3e', to: '#4a3520', tile: 'rust', scale: 140, tex: 0.78, rough: 0.6, metal: 0.28 },
  cabinetFlank: { from: '#3e3a36', to: '#1c1a18', tile: 'steel', scale: 80, tex: 0.88, rough: 0.72, metal: 0.42 },
  cabinetRust: { from: '#865828', to: '#382010', tile: 'rust', scale: 100, tex: 0.92, rough: 0.62, metal: 0.25 },
  cabinetPanel: { from: '#4c4640', to: '#22201e', tile: 'steel', scale: 70, tex: 0.88, rough: 0.42, metal: 0.65 },
  cabinetFrame: { from: '#322d28', to: '#161412', tile: 'steel', scale: 50, tex: 0.82, rough: 0.48, metal: 0.55 },
  cabinetBronze: { from: '#9e8048', to: '#4a3a1c', tile: 'bronze', scale: 60, tex: 0.85, rough: 0.38, metal: 0.78 },
  paper: { from: '#a6a7a9', to: '#d8d8d8', tile: 'paper', scale: 46, tex: 0.34, rough: 0.97, metal: 0 },
};

// The gate: painted mild steel, the one saturated thing in the frame. It is not
// a `Surface` — a scissor gate is a lattice, not a plane, so it is described by
// what it is made of rather than by a gradient and a tile.
// The two ends used to carry hand-set darkness values here; the lamps decide
// that now, so all that is left is what the gate is made of.
export const CAGE_GATE = { bar: '#7f6a35', barDark: '#211c12', pitch: 40, thickness: 5 };

/**
 * The three channels of `hex`, each multiplied by `k` and clamped to a byte.
 * @param {string} hex
 * @param {Shade} k
 * @returns {[number, number, number]}
 */
export function scaleChannels(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

/** @param {string} hex @param {Shade} [k] */
export const shadedRgb = (hex, k = 1) => `rgb(${scaleChannels(hex, k).join(', ')})`;

/** @param {string} hex @param {number} a @param {Shade} [k] */
export const shadedRgba = (hex, a, k = 1) => `rgba(${scaleChannels(hex, k).join(', ')}, ${a})`;
