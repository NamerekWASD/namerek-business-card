// Patterns that are genuinely flat — a painted stripe, a lattice of thin bars,
// a row of chevrons — baked once into small tiling canvases.
//
// The alternative for the gate was an `InstancedMesh` of a few hundred flats,
// and it is worth writing down why that is the wrong trade here. The gate is a
// lattice of 5px bars seen at a grazing angle across the whole depth of the
// cage; as geometry that is hundreds of quads whose entire visual contribution
// is a pattern of thin lines, and thin lines are exactly what anti-aliasing
// handles worse than a mipmapped texture does. What the gate has to do is
// *compress toward the far end*, and it gets that from the plane it is painted
// on, for free, the same way the CSS version does.
//
// Bolts are the opposite case and are instanced geometry — a bolt is a small
// round thing that catches the light on its own, which a painted dot cannot.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { CAGE_GATE } from '../../model/materials.js';
import { FIELD, metalWear, mix, seeded } from './wear.js';

const cache = new Map();

/**
 * Exported for `propArt.js`, which paints the landing's furniture. Same cache,
 * same wrapping and colour-space contract — a second `bake` living next door
 * would be a second set of textures under a second set of rules, and the two
 * would drift.
 *
 * @param {string} key @param {number} w @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} paint
 * @returns {CanvasTexture | null}
 */
export function bake(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/**
 * The scissor gate: two sets of flats crossing at ±58°, with a darker pass
 * offset behind them so the bars have some body. Transparent between, because
 * the shaft has to stream past through it — a gate you cannot see the wall
 * through is a wall.
 */
export const gateLattice = () => bake('gate', 128, 128, (ctx, w, h) => {
  const { bar, barDark, thickness } = CAGE_GATE;
  ctx.clearRect(0, 0, w, h);
  // Exactly 45°, with a spacing that divides the tile. Both matter: at any
  // other angle a diagonal leaving the right edge does not arrive at the left
  // one, and the lattice visibly breaks every tile — which is what it was
  // doing. At 45° with a spacing of w/4 the pattern is periodic in the tile,
  // so the seams disappear.
  const step = w / 4;
  const pass = (sign, colour, t, offset) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = t;
    // drawn twice as wide as the tile in both directions, so every diagonal
    // that crosses a corner is present on both sides of the seam
    for (let i = -w * 2; i < w * 3; i += step) {
      ctx.beginPath();
      ctx.moveTo(i + offset, -h);
      ctx.lineTo(i + offset + sign * h * 3, h * 2);
      ctx.stroke();
    }
  };
  // a darker pass offset behind, so the flats have some body
  pass(1, barDark, thickness + 3, 2.5);
  pass(-1, barDark, thickness + 3, 2.5);
  pass(1, bar, thickness, 0);
  pass(-1, bar, thickness, 0);
});

/**
 * The shaft's safety rack: the toothed rail a runaway cage's gear bites into.
 *
 * Mykolai asked for it — «люди придумали металлические зубья на 2 краях шахты,
 * чтобы в случае чего лифт не падал плашмя вниз» — and asked whether it could be
 * done as a texture. It can, and the reason it can is the **alpha**: the teeth
 * are cut out of the canvas rather than painted onto it, so the plane carrying
 * this has a genuinely toothed *silhouette* against the wall behind it. A
 * saw-edge painted opaque on a rectangle is a picture of a rack; a saw-edge cut
 * out of one is a rack. `alphaTest` rather than `transparent` at the call site,
 * because this is hard-edged ironwork with nothing to sort against.
 *
 * One tooth per tile, so the plane repeats down the shaft at the rack's own
 * pitch and rides on a transform modulo that pitch — see `Wall` in
 * `ShaftScene.jsx`. The web runs the full height of the tile, which is what
 * makes the rail continuous however far the cage travels.
 *
 * Drawn with the wall on the left of the canvas and the teeth pointing right,
 * into the shaft. The right-hand wall mirrors it on the texture's own `repeat`,
 * so there is one canvas for both.
 */
export const guideRack = () => bake('rack', 96, 128, (ctx, w, h) => {
  let seed = 0x7c41;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const WEB = 56;          // where the blade leaves the web
  const STEEL = '#6a6154';
  const STEEL_HI = '#9d9280';
  const STEEL_LO = '#2b2620';

  ctx.clearRect(0, 0, w, h);

  // ── the web: the flat the rail is bolted to the wall through ───────────────
  ctx.fillStyle = STEEL;
  ctx.fillRect(0, 0, WEB, h);
  // lit up-left like every other relief here
  ctx.fillStyle = STEEL_HI;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 5, h);
  ctx.globalAlpha = 0.32;
  ctx.fillRect(WEB - 10, 0, 4, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = STEEL_LO;
  ctx.fillRect(WEB - 4, 0, 4, h);

  // ── the tooth ──────────────────────────────────────────────────────────────
  // A ratchet, not a saw: the long face slopes up out of the web and the short
  // one comes back square, so the gear rides over it going up and catches on it
  // going down. That asymmetry is the whole of what the thing is for, and it is
  // legible at a glance even at this size.
  const tip = w - 4;
  ctx.beginPath();
  ctx.moveTo(WEB - 2, 6);
  ctx.lineTo(tip, 88);
  ctx.lineTo(tip, 100);
  ctx.lineTo(WEB - 2, 100);
  ctx.closePath();
  ctx.fillStyle = STEEL;
  ctx.fill();
  // the slope catches the light, the square underside does not
  ctx.strokeStyle = STEEL_HI;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(WEB - 2, 6);
  ctx.lineTo(tip, 88);
  ctx.stroke();
  ctx.strokeStyle = STEEL_LO;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(WEB - 2, 100);
  ctx.lineTo(tip, 100);
  ctx.stroke();

  // ── the fixings, and what eighty years leave on them ───────────────────────
  for (const y of [30, 94]) {
    const r = 7;
    ctx.fillStyle = 'rgba(30,24,20,0.6)';
    ctx.beginPath(); ctx.arc(26 + r * 0.3, y + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = STEEL;
    ctx.beginPath(); ctx.arc(26, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = STEEL_HI;
    ctx.beginPath(); ctx.arc(26 - r * 0.3, y - r * 0.32, r * 0.5, 0, Math.PI * 2); ctx.fill();
    // the rust weeping out from under the head
    const run = ctx.createLinearGradient(26, y, 26, y + 34);
    run.addColorStop(0, 'rgba(104,58,26,0.45)');
    run.addColorStop(1, 'rgba(104,58,26,0)');
    ctx.fillStyle = run;
    ctx.fillRect(22, y, 8, 34);
  }
  // the polish along the tooth's own slope, where the gear has ridden it — wear
  // that makes metal *brighter*, which is the half usually left out
  for (let i = 0; i < 14; i += 1) {
    const t = rnd();
    const x = WEB + t * (tip - WEB);
    const y = 6 + t * 82 + (rnd() - 0.5) * 7;
    ctx.globalAlpha = 0.1 + rnd() * 0.28;
    ctx.fillStyle = rnd() > 0.4 ? '#c3b79c' : '#231d17';
    ctx.fillRect(x, y, 2 + rnd() * 9, 1 + rnd() * 2);
  }
  ctx.globalAlpha = 1;
});

// ── the counterweight's filler weights ───────────────────────────────────────
// The block running opposite the cage is not a block. A counterweight is a
// steel frame with a stack of cast-iron slabs dropped into it, and how many
// slabs there are is how the machine was balanced against the car it was fitted
// to — which is why the stack, and not the frame, is the thing that says what
// the object is. Mykolai's word for them is «блины», and that is what they are:
// slabs a hand's depth thick, cast in a sand mould, with rounded edges because
// a sand mould has no arrises to give in the first place.
//
// **The relief is painted, and this is the one place in the shaft besides
// `guideRack` where that is the honest choice rather than a shortcut.** Every
// bulkhead lamp in this shaft is on the *left* wall — `LAMPS.side` puts them
// there and nowhere else, because two symmetric rows would light the cage from
// both sides at once and produce no modelling at all — and the counterweight
// hangs on the right, further away than `LAMPS.reach`. Nothing reaches it. Its
// bevels are real geometry, because the silhouette of a stack of slabs is the
// point of the rebuild, but the light *across* them has to be in the paint:
// lit along the top edge and down the left, in shadow along the bottom and
// down the right, which is the same up-left throw every other painted relief in
// this directory keeps.
//
// Three variants rather than one. A vertical stack of three dozen identical
// castings is the loudest kind of repeat there is, and the cost of the fix is
// two more small canvases and two more draw calls — see `Counterweight` in
// `ShaftScene.jsx`, which deals them out round-robin.
const CAST = '#615d58';
const CAST_HI = '#9c968a';
const CAST_LO = '#241e17';

/** How many faces the stack is dealt from. */
export const CW_PLATE_VARIANTS = 3;

/** @param {number} variant which of `CW_PLATE_VARIANTS` castings this is */
export const counterweightPlate = (variant = 0) => bake(
  `cw-plate:${variant}`, 256, 128, (ctx, w, h) => {
    const seed = 0x51c0 + variant * 9721;
    const rnd = seeded(seed);

    ctx.fillStyle = CAST;
    ctx.fillRect(0, 0, w, h);

    // The sand-cast skin. This is the whole difference between cast iron and
    // the rolled plate lining the walls: rolled steel is smooth and scored
    // along its length, a casting is granular all over, because what it was
    // last in contact with was sand.
    for (let i = 0; i < 2600; i += 1) {
      ctx.globalAlpha = 0.04 + rnd() * 0.15;
      ctx.fillStyle = rnd() > 0.5 ? CAST_HI : CAST_LO;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 0.4 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Where the mould filled unevenly — broad, low-frequency, and placed off
    // centre per variant so the three faces do not share a bright middle.
    const bx = w * (0.34 + variant * 0.16);
    const belly = ctx.createRadialGradient(bx, h * 0.44, 0, bx, h * 0.44, w * 0.6);
    belly.addColorStop(0, 'rgba(168,156,132,0.22)');
    belly.addColorStop(1, 'rgba(168,156,132,0)');
    ctx.fillStyle = belly;
    ctx.fillRect(0, 0, w, h);

    // and eighty years in a wet shaft on top of it
    metalWear(ctx, w, h, {
      seed,
      field: mix(FIELD.edges(0.8, 0.2), FIELD.bottom(0.6), FIELD.blotches(0.5, 5, seed)),
      dark: '#1d1710',
      rust: '#7d4a22',
      light: '#ab9b7c',
      pit: 6.5,
      bloom: 5,
      scratch: 5,
      scratchSpread: 0.7,
      polish: 2.5,
      streaks: 5,
      grime: 0.55,
    });

    // ── the arrises ──────────────────────────────────────────────────────────
    // Painted, for the reason given at the head of this section. Kept to a
    // sixth of the plate at each edge: any wider and the slab reads as a pillow
    // rather than as iron with its corners knocked off.
    const HI = '196,183,153';
    const LO = '12,10,7';
    /** A band fading away from one edge of the plate. */
    const arris = (rgbs, k, x, y, x2, y2, rect) => {
      const g = ctx.createLinearGradient(x, y, x2, y2);
      g.addColorStop(0, `rgba(${rgbs},${k})`);
      g.addColorStop(1, `rgba(${rgbs},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
    };
    arris(HI, 0.5, 0, 0, 0, 15, [0, 0, w, 15]);
    arris(HI, 0.3, 0, 0, 16, 0, [0, 0, 16, h]);
    arris(LO, 0.62, 0, h, 0, h - 17, [0, h - 17, w, 17]);
    arris(LO, 0.4, w, 0, w - 16, 0, [w - 16, 0, 16, h]);
  },
);

/**
 * The light escaping round a recessed button.
 *
 * Mykolai's brief for the console: «нужно вместо текущего свечения сделать
 * свечение по краям предварительно сделав отступ». A pushbutton of this period
 * is not a lamp with a lens on the front — it is a cap standing in a hole, with
 * the lamp behind it, and what a viewer across the room actually sees of that
 * lamp is the **reveal**: the few millimetres of gap between the cap and the
 * metal it is sunk into, lit from inside. So the cap keeps its own paint and
 * the glow lives in the gap around it.
 *
 * This bakes that gap. `fx` and `fy` are how much of the plane the cap covers
 * on each axis, so the bright part is exactly the border left over, and the
 * falloff runs outward from the cap's own outline onto the bezel — light does
 * not stop at the edge of the hole it came out of.
 *
 * Painted as a field rather than as four gradients because the corners are the
 * whole difficulty: four overlapping linear gradients double up where they
 * cross and leave four bright dots at the corners of every button. A distance
 * to the cap's rectangle has no corners to get wrong.
 *
 * Used as an `emissiveMap` on an additively-blended material, so black really
 * is nothing rather than dark grey — see `PressButton` in `ScreenFrame.jsx`.
 *
 * @param {number} fx @param {number} fy
 */
// How bright the reveal is baked, against the legend's own 255. The two lamps
// share one `emissiveIntensity` — they are one bulb — so the balance between
// them has to live here, and at parity the reveal blew out into a solid orange
// rectangle while the legend was still coming up. A slot is dimmer than the cut
// it lights through; this is that ratio, measured on the panel.
const PEAK = 116;

export const buttonRecess = (fx, fy) => bake(
  `recess:${fx.toFixed(3)}:${fy.toFixed(3)}:${PEAK}`, 128, 64, (ctx, w, h) => {
    const frame = ctx.createImageData(w, h);
    const px = frame.data;
    const x0 = (w / 2) * (1 - fx);
    const y0 = (h / 2) * (1 - fy);
    const x1 = w - x0;
    const y1 = h - y0;
    // How far the spill carries past the reveal, as a multiple of the reveal's
    // own width. Under one and the light stops dead at the edge of the bezel,
    // which is the look of a sticker rather than of a lamp.
    const reachX = Math.max(1e-3, x0 * 1.2);
    const reachY = Math.max(1e-3, y0 * 1.2);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const dx = Math.max(x0 - x, x - x1, 0) / reachX;
        const dy = Math.max(y0 - y, y - y1, 0) / reachY;
        const k = Math.max(0, 1 - Math.hypot(dx, dy)) ** 1.7;
        const v = Math.round(PEAK * k);
        const i = (y * w + x) * 4;
        px[i] = v;
        px[i + 1] = v;
        px[i + 2] = v;
        px[i + 3] = 255;
      }
    }
    ctx.putImageData(frame, 0, 0);
  },
);

/**
 * The bloom around a bright fitting. A small very bright thing bleeds in any
 * real lens as well as in this one, and a sprite costs nothing where a third
 * light would cost the whole budget.
 *
 * It exists as a texture because a `spriteMaterial` with no map is a *square*,
 * which is what was showing as a yellow tile over every lamp in the shaft.
 */
export const lampGlow = () => bake('glow', 128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,224,170,0.72)');
  g.addColorStop(0.22, 'rgba(255,186,96,0.34)');
  g.addColorStop(0.55, 'rgba(255,150,50,0.09)');
  g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

/**
 * The darkening an object lays on the floor it stands on. Painted, not cast:
 * what makes a thing sit on a floor rather than hover above it is a soft patch
 * of contact darkening, and a shadow map costs the whole frame budget to
 * produce something the eye reads as the same patch.
 *
 * Soft-edged for the obvious reason — the hard rectangle this replaces read as
 * a sheet of card lying on the floor.
 */
export const contactShadow = () => bake('contact', 128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.92)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.78, 'rgba(0,0,0,0.13)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

/**
 * A landing door's leaf, painted whole: the plate and its brushed grain, the
 * stiles standing round it, two recessed panels, the vision grille the pair of
 * them share when they are shut, the pull, the kick plate, the stencilled mark
 * and the rivets holding the lot together.
 *
 * **Nothing lights this surface, and that is why the shading is painted.** The
 * shaft's fittings are bolted to the far wall and stand `LAMPS.proud` off it; a
 * shut leaf's own face ends up a handful of pixels *in front of* them, in their
 * plane — so the cosine term is nought and a leaf receives no direct light at
 * all. What the room bounces back is carried as a flat emissive (see `Room`),
 * and a flat emissive cannot show a pattern. That is the whole reason a leaf
 * with a perfectly good tile on it and a perfectly good decal over it still came
 * out as one black rectangle, and it is not something a better tile fixes.
 *
 * So this is authored the way the CSS backend authored every surface — the light
 * is in the paint — and the face plate wears it as its `emissiveMap` as well as
 * its `map`. The lamp glass and the deck screens in this scene are already lit
 * that way; the door is only the largest thing that has to be.
 *
 * Baked large for the same reason the decal before it was: a leaf is one of the
 * biggest single surfaces in frame, and the 64–256px tiles everything else here
 * gets away with come back as a staircase on every diagonal once stretched
 * across one.
 *
 * @param {0 | 1} side — 0 is the left leaf and meets its partner on its own
 *   right; 1 is the right leaf and meets it on its own left.
 */
export const doorLeafFace = (side) => bake(`leaf:${side}`, 640, 700, (ctx, w, h) => {
  // Deterministic, so the grain is the same picture on every load and two
  // machines looking at the same scene are looking at the same door.
  let seed = 0x9e37 + side * 7919;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const PLATE = '#6a5e4e';
  const PLATE_DK = '#4a4136';
  const PANEL = '#584d40';
  const HI = '#a58f70';
  const LO = '#231d16';
  const BRASS = '#b8862a';
  const BRASS_HI = '#dcae4e';
  const IRON = '#1b150e';

  const atRight = side === 0;         // which edge meets the other leaf
  const meet = atRight ? w : 0;
  const inward = atRight ? -1 : 1;    // from the meeting edge toward the jamb

  const fill = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };

  // A step in the plate, lit from the upper left — the shaft's own fitting is
  // on the left wall, so every bevel in here is thrown the same way and the
  // leaf's relief agrees with the one light the room actually has.
  const bevel = (x, y, ww, hh, t, raised) => {
    const near = raised ? HI : LO;
    const far = raised ? LO : HI;
    ctx.globalAlpha = 0.75;
    fill(x, y, ww, t, near);
    fill(x, y, t, hh, near);
    ctx.globalAlpha = 0.6;
    fill(x, y + hh - t, ww, t, far);
    fill(x + ww - t, y, t, hh, far);
    ctx.globalAlpha = 1;
  };

  const rivet = (x, y, r) => {
    ctx.fillStyle = '#5b5044';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b7c63';
    ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(10,7,4,0.75)';
    ctx.beginPath(); ctx.arc(x + r * 0.38, y + r * 0.4, r * 0.42, 0, Math.PI * 2); ctx.fill();
  };

  // ── the plate ──────────────────────────────────────────────────────────────
  fill(0, 0, w, h, PLATE);
  // rolled steel is brushed along its length, so the grain runs vertically and
  // nothing about it repeats across the leaf
  for (let x = 0; x < w; x += 2) {
    ctx.globalAlpha = 0.03 + rnd() * 0.07;
    fill(x, 0, 1 + Math.round(rnd()), h, rnd() > 0.5 ? '#6d6050' : '#231d17');
  }
  // and the pitting, which is what says painted steel rather than plastic
  for (let i = 0; i < 900; i += 1) {
    ctx.globalAlpha = 0.05 + rnd() * 0.12;
    const r = 0.6 + rnd() * 2.6;
    ctx.fillStyle = rnd() > 0.45 ? '#1d1811' : '#77684f';
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── the stiles, and the panels between them ────────────────────────────────
  const m = 30;                       // the stile's own width
  bevel(0, 0, w, h, 4, true);

  const panelX = m;
  const panelW = w - m * 2;
  const rows = [
    { y: 0.075, to: 0.415 },          // the upper panel, with the grille in it
    { y: 0.505, to: 0.795 },          // and the lower one
  ];
  for (const row of rows) {
    const y = h * row.y;
    const hh = h * (row.to - row.y);
    fill(panelX, y, panelW, hh, PANEL);
    bevel(panelX, y, panelW, hh, 7, false);
    // the field of the panel sits a shade below the stiles around it
    ctx.globalAlpha = 0.35;
    fill(panelX + 7, y + 7, panelW - 14, hh - 14, PLATE_DK);
    ctx.globalAlpha = 1;
  }

  // ── the vision grille ──────────────────────────────────────────────────────
  // Flush to the meeting edge, so the two leaves make one wide window when they
  // are shut and it is cut cleanly in half the moment they part. That halving is
  // the cue that says two leaves rather than one panel sliding.
  const gW = w * 0.46;
  const gH = h * 0.115;
  const gX = atRight ? meet - gW : meet;
  const gY = h * 0.135;
  fill(gX, gY, gW, gH, IRON);
  bevel(gX, gY, gW, gH, 5, false);
  ctx.globalAlpha = 0.85;
  fill(gX + 5, gY + 5, gW - 10, gH - 10, '#171008');
  ctx.globalAlpha = 1;
  // the bars, brass and catching the light on their left flank
  const bars = 7;
  for (let i = 1; i < bars; i += 1) {
    const bx = gX + 6 + ((gW - 12) * i) / bars;
    fill(bx - 2, gY + 6, 4, gH - 12, '#3a2f1c');
    fill(bx - 2, gY + 6, 1.5, gH - 12, BRASS);
  }
  // and its own frame, bolted on
  ctx.strokeStyle = '#5d5140';
  ctx.lineWidth = 3;
  ctx.strokeRect(gX + 1.5, gY + 1.5, gW - 3, gH - 3);
  for (const ry of [gY + 9, gY + gH - 9]) {
    for (let i = 0; i <= 3; i += 1) rivet(gX + 12 + ((gW - 24) * i) / 3, ry, 3);
  }

  // ── the mid rail, and the mark struck into it ──────────────────────────────
  const railY = h * 0.415;
  const railH = h * 0.09;
  fill(0, railY, w, railH, PLATE);
  bevel(0, railY, w, railH, 4, true);

  const size = 34;
  ctx.font = `${size}px 'Space Mono', monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = atRight ? 'right' : 'left';
  const tx = atRight ? meet - m * 2.2 : meet + m * 2.2;
  const ty = railY + railH / 2;
  const label = atRight ? 'MT' : 'Nr. 001';
  // struck, not printed: a dark strike first and the brass catching the light
  // over it, the way `EnamelPlate` builds a stamped mark out of two passes
  ctx.fillStyle = 'rgba(6,4,2,0.8)';
  ctx.fillText(label, tx + 2, ty + 2);
  ctx.fillStyle = BRASS_HI;
  ctx.globalAlpha = 0.72;
  ctx.fillText(label, tx, ty);
  ctx.globalAlpha = 1;

  // ── the pull ───────────────────────────────────────────────────────────────
  // A landing door of this period is opened by the gear, not by hand, so what
  // is here is the release: a recessed grip near the meeting edge.
  const pw = 26;
  const ph = h * 0.14;
  const px = atRight ? meet - m - pw - 10 : meet + m + 10;
  const py = h * 0.58;
  fill(px, py, pw, ph, '#0d0a07');
  bevel(px, py, pw, ph, 4, false);
  fill(px + 6, py + 8, pw - 12, ph - 16, '#241d14');
  ctx.globalAlpha = 0.7;
  fill(px + 6, py + 8, 2, ph - 16, BRASS);
  ctx.globalAlpha = 1;

  // ── the kick plate ─────────────────────────────────────────────────────────
  // Brass over blackened iron, the two tones the CSS leaf painted it in — it
  // takes the knock of every crate wheeled through, which is why it is a
  // separate plate bolted over the door rather than part of it.
  const kY = h * 0.845;
  const kH = h * 0.115;
  fill(m, kY, w - m * 2, kH, IRON);
  ctx.save();
  ctx.beginPath();
  ctx.rect(m + 4, kY + 4, w - m * 2 - 8, kH - 8);
  ctx.clip();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = kH * 0.34;
  ctx.globalAlpha = 0.62;
  for (let x = -kH * 2; x < w + kH * 2; x += kH * 0.95) {
    ctx.beginPath();
    ctx.moveTo(x, kY + kH);
    ctx.lineTo(x + kH, kY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  bevel(m, kY, w - m * 2, kH, 4, true);
  for (const rx of [m + 12, w - m - 12]) {
    rivet(rx, kY + 12, 4);
    rivet(rx, kY + kH - 12, 4);
  }

  // ── the fixings down the jamb stile ────────────────────────────────────────
  const stileX = atRight ? m / 2 : w - m / 2;
  for (let i = 0; i < 11; i += 1) rivet(stileX, h * (0.035 + (i * 0.93) / 10), 4.5);

  // ── the meeting edge ───────────────────────────────────────────────────────
  // The astragal itself is real geometry (see `DoorLeaf`); what belongs in the
  // paint is the shadow it throws back across the plate, and the strip of brass
  // right on the edge that catches the light coming through the joint.
  const seam = ctx.createLinearGradient(meet, 0, meet + inward * 64, 0);
  seam.addColorStop(0, 'rgba(4,3,2,0.68)');
  seam.addColorStop(1, 'rgba(4,3,2,0)');
  ctx.fillStyle = seam;
  ctx.fillRect(atRight ? meet - 64 : meet, 0, 64, h);
  ctx.globalAlpha = 0.9;
  fill(atRight ? meet - 4 : meet + 1, h * 0.02, 3, h * 0.96, BRASS_HI);
  ctx.globalAlpha = 1;

  // ── and the light, which is the whole point of this file ───────────────────
  // The shaft's fitting is on the left-hand wall, so a doorway is lit across
  // rather than head on: the left leaf catches most of it and the right one sits
  // in its own shadow. Multiplied over the finished artwork so the relief above
  // is graded by it rather than competing with it.
  // Gently, and that is worth a line of its own: a canvas `multiply` works on
  // sRGB bytes, so two grades stacked over each other fall off far faster than
  // either reads on its own. The first cut had the far leaf at a third of the
  // near one *and* a vertical grade over the top, and the two together took it
  // to nothing.
  const across = ctx.createLinearGradient(0, 0, w, 0);
  if (atRight) {
    across.addColorStop(0, '#ffffff');
    across.addColorStop(1, '#c2b9ad');
  } else {
    across.addColorStop(0, '#d8cfc3');
    across.addColorStop(1, '#a49b90');
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, w, h);

  // the leaf's own edges falling away, which is `inset 0 0 30px rgba(0,0,0,.75)`
  // on the CSS leaf and the same job here: a plate lit flat reads as a sticker
  const down = ctx.createLinearGradient(0, 0, 0, h);
  down.addColorStop(0, '#c8c4bf');
  down.addColorStop(0.34, '#ffffff');
  down.addColorStop(1, '#b2ada8');
  ctx.fillStyle = down;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
});

/** The hazard lip at the edge of the cage floor, where you would step off. */
export const hazardStripe = () => bake('hazard', 64, 16, (ctx, w, h) => {
  ctx.fillStyle = '#241a10';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9a531';
  ctx.lineWidth = 9;
  for (let i = -h; i < w + h; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, h);
    ctx.lineTo(i + h, 0);
    ctx.stroke();
  }
});

/**
 * The headboard chevrons, painted across the far strip of the cage ceiling.
 * The one piece of pure ornament in the scene, and the reason it is here rather
 * than dropped: the machine age decorated its machines, and a lift built in 1936
 * carrying none at all would be the odd one.
 */
export const chevrons = () => bake('chevrons', 96, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(233,223,198,0.32)';
  const t = 30;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(t * 0.46, 0);
  ctx.lineTo(t, h / 2);
  ctx.lineTo(t * 0.46, h);
  ctx.lineTo(0, h);
  ctx.lineTo(t * 0.54, h / 2);
  ctx.closePath();
  ctx.fill();
});

/**
 * A backlit fluted screen, as an emissive map.
 *
 * The flutes exist in the model as real geometry, and on any other surface that
 * would be the end of it. Not here: an emissive material ignores its normals
 * entirely — it radiates the same amount whichever way a face is turned — so a
 * ridge cast into glowing glass contributes nothing at all. What the reference
 * photograph actually shows is not shaded ridges but *light bent by them*: each
 * flute carries the lamp behind it along its own crest and drops away into the
 * groove beside it. That is a pattern in the emission, and this is where it
 * belongs.
 *
 * Two things multiplied: the pool of light behind the glass, and the flutes
 * banding it.
 *
 * @param {number} [flutes] how many bands across the height, matching the model
 */
export const screenGlow = (flutes = 26) => bake(`screen:${flutes}`, 256, 256, (ctx, w, h) => {
  const pool = ctx.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h * 0.5, w * 0.66);
  pool.addColorStop(0, '#fff4e2');
  pool.addColorStop(0.38, '#c08c4c');
  pool.addColorStop(0.78, '#52330f');
  pool.addColorStop(1, '#24160c');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'multiply';
  const pitch = h / flutes;
  for (let i = 0; i < flutes; i += 1) {
    const y = i * pitch;
    const band = ctx.createLinearGradient(0, y, 0, y + pitch);
    band.addColorStop(0, '#4e4e4e');
    band.addColorStop(0.4, '#ffffff');
    band.addColorStop(0.58, '#dcdcdc');
    band.addColorStop(1, '#4e4e4e');
    ctx.fillStyle = band;
    // half a pixel of overlap, or the seam between bands shows as a dark line
    ctx.fillRect(0, y, w, pitch + 0.5);
  }
});

/**
 * The frame bar that rolls down a running screen, as a multiply mask.
 *
 * ── why a screen needs one at all ────────────────────────────────────────────
 * `screenGlow` above is a perfectly good picture of a lit panel and that is
 * exactly its problem: a picture. Mykolai's words for it — «это читается как
 * текстура, а не эмиссивный экран с низкой герцовкой». He is right, and the
 * reason is that nothing about a static bake distinguishes *glass with a lamp
 * behind it* from *a screen that is drawing*. The flutes already run the right
 * way — across the panel, like scan lines — so what is missing is not detail,
 * it is that they are not going anywhere.
 *
 * A tube refreshing slower than the eye gives you one unmistakable artefact: a
 * wide, soft band of the last field still fading while the next one is drawn,
 * travelling down the picture because the two rates never quite agree. That is
 * the whole of what this bakes — a trough, not a highlight, because the bar is
 * the part of the screen that has *not* been redrawn yet.
 *
 * Baked as a column rather than a picture: it varies only down the panel, so
 * four pixels across is four more than it needs, and it is scrolled by moving
 * the map's own `offset` — a uniform, so a rolling bar costs one float a tick
 * rather than a canvas. `bake` gives it `RepeatWrapping`, and the trough is
 * shaped to reach flat well before either end so the wrap has no seam in it.
 */
export const screenRaster = () => bake('raster', 4, 512, (ctx, w, h) => {
  // How dark the middle of the bar goes, and how much of the panel it covers.
  // Deep enough to be seen through the terminal's own print, shallow enough
  // that it never reads as the screen having a fault.
  // Measured on the panel rather than picked: at the bake's own 0.26 the bar
  // came back as a 10% dip once the tone curve had had it, which is a screen
  // that is technically breathing. This lands it near 18%, which is where it
  // stops needing to be pointed out.
  const depth = 0.36;
  const reach = 0.17;
  // And the line at its trailing edge. A soft trough on its own is a shadow;
  // what says *this is a raster* is that one side of it is a hard edge — the
  // beam's return, arriving where the fade has not yet caught up.
  const edgeAt = 0.5 + reach * 0.92;
  const edgeT = 0.009;
  const edgeTo = 0.72;

  for (let y = 0; y < h; y += 1) {
    const p = y / h;
    const d = Math.abs(p - 0.5) / reach;
    // A parabola, zero at the trough's own edge: it lands flat rather than
    // stopping, so nothing draws an outline round the bar.
    const soft = d < 1 ? 1 - d * d : 0;
    const edge = Math.abs(p - edgeAt) < edgeT ? edgeTo : 1;
    const v = Math.round(255 * (1 - depth * soft) * edge);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, w, 1);
  }
});
