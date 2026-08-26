// ── the corridor's plating, painted rather than photographed ─────────────────
// The two walls the cage runs between are steel, not masonry, and that is
// Mykolai's call rather than a rendering one: the ironwork already bolted to
// them — three rivet seams and a brass line — reads as fixings into plate, and
// the shaft's safety gear (see `guideRack` in `patterns.js`) has to be bolted to
// something that could take it. The blind wall at the far end stays brick; it is
// the building, and this is the lining inside it.
//
// Painted for the same reason `brick.js` is: a photograph of steel plating tiles
// as a whole picture, seams and all, and its plates are whatever size the
// photographer's building used. Here a plate is 1.2 m × 0.6 m in the scene's own
// metre, laid in two staggered courses per tile, which closes on itself after
// two — the same rule the brick bond keeps and for the same reason.
//
// Paint the surface, not the light: the strap arrises are lit from the upper
// left like every other painted relief in this directory, and the only thing in
// here that darkens is dirt, which stays put when the lamp moves.

import { FIELD, metalWear, mix, seeded } from './wear.js';
import { blob, normalise, rgb, surface } from './paintedTile.js';

const TILE = 1024;
const ROWS = 2; // plate courses per tile — **even**, or the stagger does not close
const PH = TILE / ROWS; // one plate's height
const SEAM = 5; // the gap between two plates
const STRAP_W = 96; // the butt strap covering a seam

/**
 * The plating, as numbers, so `plate.test.js` can check the wall is still made
 * of plates a person could have lifted: 1.2 m square per tile, two courses.
 */
export const PLATING = { TILE, ROWS, SEAM, STRAP_W, TILE_M: 1.2 };

// Warm near-grey, the way every steel in this catalogue runs (R > G > B). The
// pigment is `SURFACES.shaftWall`'s; what is here is only how a plate differs
// from the plate next to it.
const STEEL = [150, 140, 128];
const STRAP = [166, 155, 141];
const SCALE_DARK = [96, 88, 80]; // mill scale, the blue-black skin off the rolls
const SHADOW = [44, 38, 33];

/** A rivet head: a dome, its highlight up-left and its shadow down-right. */
function rivet(ctx, x, y, r) {
  ctx.fillStyle = rgb(SHADOW, 1, 0.55);
  ctx.beginPath();
  ctx.arc(x + r * 0.28, y + r * 0.3, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(STRAP, 0.92);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(STRAP, 1.28, 0.8);
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.32, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * One plate's face: the mill scale still on it in patches, the dishing between
 * its fixings, and everything that has hit it since.
 *
 * The dishing is the one cue that says *plate* rather than *painted rectangle*.
 * A riveted plate is pulled tight at its edges and belled slightly in the
 * middle, so it holds a broad soft highlight nowhere near its centre of area —
 * which is why a flat fill with wear on top still reads as cardboard.
 */
function plate(ctx, x, y, w, h, seed) {
  const rnd = seeded(seed);
  const k = 0.9 + rnd() * 0.22; // no two plates came off the mill alike

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = rgb(STEEL, k);
  ctx.fillRect(x, y, w, h);

  // the dishing
  const belly = ctx.createRadialGradient(
    x + w * 0.42, y + h * 0.38, 0,
    x + w * 0.42, y + h * 0.38, Math.max(w, h) * 0.6,
  );
  belly.addColorStop(0, rgb(STEEL, k * 1.16, 0.5));
  belly.addColorStop(1, rgb(STEEL, k * 0.82, 0));
  ctx.fillStyle = belly;
  ctx.fillRect(x, y, w, h);

  // mill scale, in patches rather than as a wash — it flakes off in sheets
  for (let i = 0; i < 26; i += 1) {
    blob(ctx, x + rnd() * w, y + rnd() * h, 18 + rnd() * 90, rnd, 11);
    ctx.globalAlpha = 0.06 + rnd() * 0.16;
    ctx.fillStyle = rgb(SCALE_DARK, 0.8 + rnd() * 0.6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // and its history. `metalWear` is the module for this — the surface says
  // where it has been used and that file says what use looks like — so a plate
  // is worn at its edges, worse toward the bottom where the water sits, with a
  // few blotches of its own on top of that.
  metalWear(ctx, w, h, {
    seed,
    field: mix(FIELD.edges(0.9, 0.16), FIELD.bottom(0.55), FIELD.blotches(0.45, 6, seed)),
    dark: '#241a12',
    rust: '#7a4620',
    light: '#a08b62',
    pit: 3.4,
    bloom: 5,
    scratch: 16,
    scratchAngle: Math.PI / 2, // rolled steel is scored along its length
    scratchSpread: 0.5,
    polish: 3,
    streaks: 6,
    grime: 0.5,
  });

  ctx.restore();
}

/**
 * A seam: two plate edges, the gap between them, the strap covering it and the
 * two rows of rivets holding the lot together.
 *
 * `horizontal` says which way it runs; `at` is where along the other axis. The
 * strap is drawn over both plates rather than between them, which is what a
 * butt strap is — and it is the reason the seams read from across the shaft
 * while the plate faces do not: a strap is a raised band with its own two
 * arrises, and an arris is the only thing on a flat wall that catches a lamp.
 */
function seam(ctx, horizontal, at, seed) {
  const rnd = seeded(seed);
  const half = STRAP_W / 2;

  const band = (x, y, w, h) => {
    ctx.fillStyle = rgb(STRAP, 0.98);
    ctx.fillRect(x, y, w, h);
    // lit up-left, in shadow down-right — the same throw as every other relief
    ctx.fillStyle = rgb(STRAP, 1.3, 0.6);
    if (horizontal) ctx.fillRect(x, y, w, 3); else ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = rgb(SHADOW, 1, 0.5);
    if (horizontal) ctx.fillRect(x, y + h - 3, w, 3); else ctx.fillRect(x + w - 3, y, 3, h);
  };

  // the gap first, so the strap sits on top of it
  ctx.fillStyle = rgb(SHADOW, 1, 0.85);
  if (horizontal) ctx.fillRect(0, at - SEAM / 2, TILE, SEAM);
  else ctx.fillRect(at - SEAM / 2, 0, SEAM, TILE);

  if (horizontal) band(0, at - half, TILE, STRAP_W);
  else band(at - half, 0, STRAP_W, TILE);

  // the rivets, two rows either side of the joint, at a pitch that divides the
  // tile so the row carries on across the seam
  const pitch = TILE / 16;
  for (let i = 0; i < 16; i += 1) {
    const along = (i + 0.5) * pitch;
    for (const off of [-half * 0.58, half * 0.58]) {
      const r = 7.5 + rnd() * 1.6;
      if (horizontal) rivet(ctx, along, at + off, r);
      else rivet(ctx, at + off, along, r);
    }
  }

  // and what weeps out of them
  for (let i = 0; i < 22; i += 1) {
    const along = rnd() * TILE;
    const off = (rnd() - 0.5) * STRAP_W;
    const len = 20 + rnd() * 130;
    const run = ctx.createLinearGradient(
      horizontal ? along : at + off, horizontal ? at + off : along,
      horizontal ? along : at + off, (horizontal ? at + off : along) + len,
    );
    run.addColorStop(0, `rgba(96,54,24,${0.16 + rnd() * 0.24})`);
    run.addColorStop(1, 'rgba(96,54,24,0)');
    ctx.fillStyle = run;
    ctx.fillRect(
      (horizontal ? along : at + off) - 2, horizontal ? at + off : along,
      3 + rnd() * 5, len,
    );
  }
}

/** @type {HTMLCanvasElement | null | undefined} */
let cached;

/**
 * The tile. One canvas for both corridor walls — they are the same lining, and
 * they face each other, so sharing one painting costs nothing.
 *
 * @returns {HTMLCanvasElement | null} `null` where there is no canvas to paint
 *   on, which is every test run.
 */
export function plateCanvas() {
  if (cached !== undefined) return cached;
  const made = surface(TILE);
  if (!made) {
    cached = null;
    return cached;
  }
  const { canvas, ctx } = made;
  const rnd = seeded(0x2f19a);

  // ── the plates ─────────────────────────────────────────────────────────────
  // Two courses, the lower one offset by half a plate, so the vertical seams
  // stagger the way any sane plating does — an unbroken vertical joint through
  // a whole wall is a hinge, not a wall. Each course is drawn as two plates
  // either side of its own vertical seam; the course whose seam lands on the
  // tile's edge gets one plate spanning the width, since the edge *is* the seam.
  for (let row = 0; row < ROWS; row += 1) {
    const y = row * PH;
    const split = row % 2 ? TILE / 2 : 0;
    if (split) {
      plate(ctx, 0, y, split, PH, 0x1000 + row * 977);
      plate(ctx, split, y, TILE - split, PH, 0x2000 + row * 977);
    } else {
      plate(ctx, 0, y, TILE, PH, 0x3000 + row * 977);
    }
  }

  // ── the seams ──────────────────────────────────────────────────────────────
  // Horizontals at every course line, including the tile's own edge, drawn
  // twice there so the strap arrives whole on the far side rather than being
  // halved at the join.
  for (let row = 0; row < ROWS; row += 1) seam(ctx, true, row * PH, 0x51 + row * 31);
  seam(ctx, true, TILE, 0x51);
  for (let row = 0; row < ROWS; row += 1) {
    const at = row % 2 ? TILE / 2 : 0;
    // a vertical strap only spans its own course, so it is clipped to it
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, row * PH, TILE, PH);
    ctx.clip();
    seam(ctx, false, at, 0x83 + row * 47);
    if (!at) seam(ctx, false, TILE, 0x83 + row * 47);
    ctx.restore();
  }

  // ── and what the shaft does to all of it ───────────────────────────────────
  // Kept few and kept soft, for the reason the brick keeps its own variation at
  // brick scale: large incident inside a tile is what makes a repeat visible.
  for (let i = 0; i < 8; i += 1) {
    const x = rnd() * TILE;
    const wdt = 26 + rnd() * 110;
    const streak = ctx.createLinearGradient(x, 0, x + wdt, 0);
    streak.addColorStop(0, 'rgba(24,18,14,0)');
    streak.addColorStop(0.5, `rgba(24,18,14,${0.1 + rnd() * 0.16})`);
    streak.addColorStop(1, 'rgba(24,18,14,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 0, wdt, TILE);
    ctx.fillRect(x - TILE, 0, wdt, TILE);
  }

  normalise(ctx, TILE, TILE);
  cached = canvas;
  return cached;
}
