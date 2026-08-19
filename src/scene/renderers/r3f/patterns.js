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
