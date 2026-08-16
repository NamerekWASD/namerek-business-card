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

/** @type {Record<string, Surface>} */
export const SURFACES = {
  // the corridor either side of us — furthest from the lamp, so the flattest
  shaftWall: { from: '#2b2521', to: '#14110e', tile: 'rust', scale: 320, tex: 0.22 },
  // the blind wall at the far end, between the landings
  backWall: { from: '#2e2822', to: '#171310', tile: 'rust', scale: 360, tex: 0.16 },
  // inside the landing: another room, so its own colour and its own light
  landing: { from: '#463a2c', to: '#221a12', tile: 'rust', scale: 300, tex: 0.14 },
  // the cage we are standing in — nearest, so it may carry the most grain
  cageRoof: { from: '#242019', to: '#12100d', tile: 'steel', scale: 190, tex: 0.3 },
  cageFloor: { from: '#3c342a', to: '#201b15', tile: 'steel', scale: 210, tex: 0.34 },
  cageSteel: { from: '#3b352d', to: '#1e1a15', tile: 'steel', scale: 130, tex: 0.36 },
  doorLeaf: { from: '#3d3123', to: '#1c1610', tile: 'rust', scale: 280, tex: 0.26 },
  doorFrame: { from: '#4a4137', to: '#231e19', tile: 'steel', scale: 160, tex: 0.32 },
  // the small fittings — clips, shoes, rivetted plates, architrave members
  iron: { from: '#443626', to: '#241a11', tile: 'rust', scale: 70, tex: 0.3 },
  steel: { from: '#3f454a', to: '#1e2225', tile: 'steel', scale: 46, tex: 0.34 },
  paper: { from: '#a6a7a9', to: '#d8d8d8', tile: 'paper', scale: 46, tex: 0.34 },
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
