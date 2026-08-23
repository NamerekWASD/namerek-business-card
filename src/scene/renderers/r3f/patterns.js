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

const cache = new Map();

/**
 * @param {string} key @param {number} w @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} paint
 * @returns {CanvasTexture | null}
 */
function bake(key, w, h, paint) {
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
 * The lamp behind the cabinet's marquee. The reference photo is not a single
 * hotspot: a thin hot line traces the whole perimeter of the glass, a soft hot
 * blob sits in the centre, and the ring of glass between them — the moat — is
 * dimmer than both. An edge-lit panel with its own lamp behind the middle, not
 * a sign with one bulb behind it.
 *
 * That shape is painted per-pixel rather than with `Canvas2DGradient`s because
 * this canvas is not screen-shaped. `marqueeUV` in `ArcadeCabinet` unwraps the
 * panel across its own local X (screen-vertical, short) and Z (screen-
 * horizontal, long) axes, and neither runs the way a canvas's columns and rows
 * do: confirmed against a live render, a canvas column (u) lands as the
 * panel's screen-*vertical* position and a canvas row (v, flipped) as its
 * screen-*horizontal* one — a transpose, not the identity a gradient authored
 * in canvas space would assume. Working in screen fractions per pixel sidesteps
 * having to fight that transpose with rotated gradient coordinates.
 *
 * Ribbed the same way as `screenGlow`, and for the same reason: an untextured
 * gradient reads as a painted rectangle, where fine flutes catching the glow at
 * their crests are what says "glass with a lamp behind it" rather than "orange
 * sign". Painted as canvas columns so they land as the screen-horizontal ribs
 * the reference shows, for the transpose reason above.
 */
export const marqueeGlow = () => bake('marquee', 256, 128, (ctx, w, h) => {
  // The panel's own width:height on screen, off its bounding box (local X and
  // Z ranges) rather than guessed — a blob shaped as a true circle in canvas
  // space would read as a tall oval on this wide-and-short panel.
  const aspect = 5.4;
  const rimThickness = 0.05;
  const centerRadius = 0.6;
  const moat = [56, 35, 17];
  const hot = [235, 172, 92];
  const hottest = [255, 240, 205];

  const img = ctx.createImageData(w, h);
  for (let py = 0; py < h; py += 1) {
    // canvas row -> screen-horizontal fraction, 0 left .. 1 right (flipped)
    const screenH = 1 - py / (h - 1);
    const dx = (screenH - 0.5) * aspect;
    for (let px = 0; px < w; px += 1) {
      // canvas column -> screen-vertical fraction, 0 bottom .. 1 top
      const screenV = px / (w - 1);
      const dy = screenV - 0.5;

      const centerDist = Math.sqrt(dx * dx + dy * dy);
      const center = Math.exp(-((centerDist / centerRadius) ** 2));

      const edgeDist = Math.min(screenH * aspect, (1 - screenH) * aspect, screenV, 1 - screenV);
      const rimLinear = Math.max(0, Math.min(1, 1 - edgeDist / rimThickness));
      const rim = rimLinear * rimLinear * (3 - 2 * rimLinear); // smoothstep, or the rim aliases

      const glow = Math.min(1, Math.max(rim, center * 0.95));
      const peak = Math.max(0, glow - 0.55) / 0.45;

      const idx = (py * w + px) * 4;
      img.data[idx] = moat[0] + (hot[0] - moat[0]) * glow + (hottest[0] - hot[0]) * peak;
      img.data[idx + 1] = moat[1] + (hot[1] - moat[1]) * glow + (hottest[1] - hot[1]) * peak;
      img.data[idx + 2] = moat[2] + (hot[2] - moat[2]) * glow + (hottest[2] - hot[2]) * peak;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.globalCompositeOperation = 'multiply';
  const flutes = 13;
  const pitch = w / flutes;
  for (let i = 0; i < flutes; i += 1) {
    const x = i * pitch;
    const band = ctx.createLinearGradient(x, 0, x + pitch, 0);
    band.addColorStop(0, '#6a6a6a');
    band.addColorStop(0.4, '#ffffff');
    band.addColorStop(0.58, '#dcdcdc');
    band.addColorStop(1, '#6a6a6a');
    ctx.fillStyle = band;
    // half a pixel of overlap, or the seam between bands shows as a dark line
    ctx.fillRect(x, 0, pitch + 0.5, h);
  }
  ctx.globalCompositeOperation = 'source-over';
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
 * its `map`. The lamp glass, the marquee and the deck screens in this scene are
 * already lit that way; the door is only the largest thing that has to be.
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
  pool.addColorStop(0.78, '#3a2712');
  pool.addColorStop(1, '#0d0906');
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
