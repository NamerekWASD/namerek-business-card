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
// ── the building's own materials ─────────────────────────────────────────────
// The four tiles above are metals, and until the grain was made visible at all
// (see `renderers/r3f/surfaceMaterial.js`) every large plane in this scene was
// wearing one of them: the shaft, the landing and the back wall were all rusty
// brass. That was invisible and therefore harmless; made visible it is simply
// wrong, because none of those surfaces is metal. A lift shaft is masonry, a
// landing is plastered and painted, and the floor of one is trowelled and
// walked on. Different materials, different tiles.
//
// The two concrete tiles below no longer dress anything — the shaft is brick
// now, and its tile is painted rather than photographed (see `brick.js`). They
// stay in the catalogue unused, at 65 KB the pair, so that putting a wall back
// to cast concrete is one word rather than a download.
//
// PolyHaven, CC0, downsampled to 512 — the bake composites into a 256px canvas,
// so a 1K source would be sixteen times the bytes for the same result.
import concreteBoard from '../../assets/textures/concrete-board.jpg';
import concretePour from '../../assets/textures/concrete-pour.jpg';
import plasterCrazed from '../../assets/textures/plaster-crazed.jpg';
import concreteWorn from '../../assets/textures/concrete-worn.jpg';

/** @import { Surface, Shade } from './types.js' */

export const TILES = {
  rust: rustBrass,
  bronze: bronzeWorn,
  steel: brushedSteel,
  paper: whiteStucco,
  // the building itself
  board: concreteBoard,   // bare cast concrete, horizontal formwork marks — the shaft
  pour: concretePour,     // layered pours, streaked — the blind wall at the end of it
  plaster: plasterCrazed, // painted plaster crazed into a fine craquelure — a landing
  worn: concreteWorn,     // chipped, patched, walked-on slab — a landing floor
  // Painted, not photographed — `renderers/r3f/brick.js` draws it. It is named
  // here because the catalogue is where a tile's *name* belongs, and `null`
  // because there is no file to load: the WebGL backend looks for a painter
  // before it looks for a URL, and the CSS backend, having no canvas to ask,
  // falls back to the surface's own gradient the same way `none` does.
  //
  // Why the shaft is brick at all: it is the one surface in the scene the
  // viewer spends the whole ride looking at, and a cast-concrete tile spread
  // over it had nothing in it at this distance — no course, no joint, no unit
  // of measure. A wall a lift moves past has to have a *grid* on it or the
  // motion has nothing to read against.
  brick: null,
  // Likewise painted — `renderers/r3f/plate.js`. The two corridor walls are the
  // *lining* of the shaft rather than the building: riveted steel plating, which
  // is what the three rivet seams and the brass line already bolted to them have
  // always implied, and what the safety rack running down each of them has to be
  // fixed to. The blind wall at the far end stays brick, because that is the
  // building itself.
  plate: null,
  none: null,
};

// `rough`/`metal` are read only by a physically-lit backend. Nothing here is
// polished: this is a shaft of painted iron and worn steel in a damp building,
// so roughness stays high and metalness low — a fully metallic surface with no
// environment map to reflect renders black, which is the classic way a ported
// scene ends up looking like a hole rather than a wall.
//
// ── these are pigments, not greys ────────────────────────────────────────────
// Every hex below used to be a near-neutral with a warm bias — the walls sat at
// saturation 0.25, the cage and the doors at 0.22 to 0.30 — and the scene's
// warmth came almost entirely from the lamp. That is a real thing a room can be,
// and it is not this room: a grey wall under a warm lamp renders as a *washed*
// warm, which is exactly what measuring the frame against the reference showed.
// Matching luminance, matching local contrast, and a blue channel running a
// third of red where the reference holds it near a fifth.
//
// So the catalogue was re-pigmented: same luminance for every surface to the
// decimal, chroma pushed to where an ochre-plastered corridor and a blackened
// steel cage actually sit. Two things follow that are easy to undo by accident.
// The walls carry a deliberate lift (about 1.2x) which `shaftExposure` and
// `landingExposure` were dropped to pay for — same final brightness, less of it
// spent on the tone curve's shoulder, which is where saturation goes to die.
// And `steel` is the one cool entry in the file, on purpose: it is what gives
// the eye something to read the rest of the scene as warm *against*.
/** @type {Record<string, Surface>} */
export const SURFACES = {
  // ── the shaft: a brick building lined in steel ─────────────────────────────
  // Two materials and one size. Both tiles are painted (`brick.js`, `plate.js`)
  // and both are authored 1.2 m square in the scene's own metre — `pxPerM` in
  // `geometry.js`, about 300 px at a 900px-tall viewport — so they carry the
  // same `scale` and a plate seam and a brick course are measured against the
  // same room.
  //
  // `scale` is not a taste figure. The bench's `grainScale` multiplies it and
  // ships at 0.7, so 513 × 0.7 lands on the 360 px that 1.2 m asks for. Move
  // one and the other has to move with it, or the wall stops being built out of
  // units. `brick.test.js` and `plate.test.js` hold that edge.
  //
  // `tex` is not the usual figure either. For a painted tile it is contrast
  // about the picture's own mean rather than how much grain to add (see
  // `surfaceMaterial.js`), and the bench multiplies a wall's by `grainWall`,
  // which ships at 3 — so 1/3 is "the painting as authored" and anything much
  // under it is a wall going out of focus.
  //
  // The pigment is the catalogue's, not the painting's: a painted map is a
  // *multiplier*, so a colour painted into it as well would square the hue. The
  // tiles stay warm near-greys and the red and the steel live here. Both hexes
  // hold the luminance the ochre before them had, to within half a level.
  //
  // the corridor either side of us — riveted plating, and the flattest surface
  // in the scene because it is furthest from the lamp
  shaftWall: { from: '#342d23', to: '#1a1711', tile: 'plate', scale: 513, tex: 0.34, rough: 0.86, metal: 0.22 },
  // The blind wall at the far end: brick, and less saturated than the first cut
  // at it — «цвет кирпича слишком насыщенно красный», so the chroma came down
  // about a quarter at the same luminance. Still plainly brick, no longer
  // plainly a fire engine.
  backWall: { from: '#482d22', to: '#231611', tile: 'brick', scale: 513, tex: 0.32, rough: 0.94, metal: 0.05 },
  // inside the landing: another room, so its own colour and its own light
  landing: { from: '#5d4523', to: '#2a1f10', tile: 'plaster', scale: 480, tex: 0.16, rough: 0.9, metal: 0.04 },
  // Its own surface, and not only so it can carry a different tile. The floor
  // is the one plane in this room the pendant strikes square-on, so it is the
  // one that has to be *brighter* than the wall rather than darker — see
  // `floorShade` on the bench.
  //
  // Its `scale` is the largest in the catalogue, and that is about the angle
  // rather than about the material. This plane is seen almost edge-on: its
  // whole 678-pixel depth lands in a couple of hundred rows of screen, so the
  // tile is compressed to nothing vertically and the mip chain hands back its
  // mean. A fine grain — the first cut used brushed concrete, whose trowel arcs
  // are soft and low-contrast — arrives as a flat wash however hard it is
  // drawn. What survives foreshortening is *large* incident: chips, patches,
  // the dark of a repair. So the floor is a damaged slab at a coarse scale, not
  // a fine finish at a fine one.
  landingFloor: { from: '#5b4329', to: '#291f13', tile: 'worn', scale: 560, tex: 0.26, rough: 0.94, metal: 0.03 },
  // the cage we are standing in — nearest, so it may carry the most grain
  cageRoof: { from: '#2d2215', to: '#16110b', tile: 'steel', scale: 190, tex: 0.3, rough: 0.78, metal: 0.3 },
  cageFloor: { from: '#493823', to: '#261d12', tile: 'steel', scale: 210, tex: 0.34, rough: 0.74, metal: 0.34 },
  cageSteel: { from: '#4a3924', to: '#251c12', tile: 'steel', scale: 130, tex: 0.36, rough: 0.7, metal: 0.38 },
  // Blackened steel, not the rust it used to carry — it read as a warm brown
  // box next to the frame's grey the moment the two actually meet (see the
  // leaf's own reveal at the frame's outer tier), and the frame stays grey.
  // Kept warm like every other steel in this catalogue (`cageSteel`, `steel`,
  // `doorFrame` below all run R>G>B, never B>G) — a cooler, bluer grey here
  // was the one hex in the file fighting the cineon grade instead of riding
  // it, which is what read as a flat, textureless slab under real exposure.
  doorLeaf: { from: '#403121', to: '#19140d', tile: 'steel', scale: 240, tex: 0.3, rough: 0.68, metal: 0.3 },
  doorFrame: { from: '#5c462b', to: '#2b2014', tile: 'steel', scale: 160, tex: 0.32, rough: 0.72, metal: 0.34 },
  // the small fittings — clips, shoes, rivetted plates, architrave members
  iron: { from: '#553920', to: '#2a1c10', tile: 'rust', scale: 70, tex: 0.3, rough: 0.84, metal: 0.5 },
  steel: { from: '#404952', to: '#1f2428', tile: 'steel', scale: 46, tex: 0.34, rough: 0.62, metal: 0.45 },
  // The arcade cabinet's own case and control-panel metal. Same tiles as
  // `iron`/`steel` for family continuity, but those two are tuned for a
  // barely-there wash on small fittings glimpsed in passing — baked at their
  // dark `from`/`to` and low `tex`, the multiply-then-wash in `bakeSurface`
  // crushes the grain down to a near-flat smear. The cabinet is a hero prop
  // looked at close and square-on, so it gets lighter tones (more survives
  // the multiply) and a much higher `tex` (less of the wash flattens it back
  // out) instead.
  cabinetCase: { from: '#8f6a39', to: '#49361d', tile: 'rust', scale: 140, tex: 0.78, rough: 0.6, metal: 0.28 },
  cabinetFlank: { from: '#45392b', to: '#1f1a13', tile: 'steel', scale: 80, tex: 0.88, rough: 0.72, metal: 0.42 },
  cabinetRust: { from: '#88572e', to: '#342112', tile: 'rust', scale: 100, tex: 0.92, rough: 0.62, metal: 0.25 },
  cabinetPanel: { from: '#524535', to: '#252018', tile: 'steel', scale: 70, tex: 0.88, rough: 0.42, metal: 0.65 },
  cabinetFrame: { from: '#382c1f', to: '#19140e', tile: 'steel', scale: 50, tex: 0.82, rough: 0.48, metal: 0.55 },
  cabinetBronze: { from: '#a1803d', to: '#493a1c', tile: 'bronze', scale: 60, tex: 0.85, rough: 0.38, metal: 0.78 },
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
