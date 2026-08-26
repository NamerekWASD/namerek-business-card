// ── the building's masonry, painted rather than photographed ─────────────────
// This dresses `backWall` — the blind wall at the end of the shaft, which is the
// building itself. The two corridor walls the cage runs between are its steel
// lining and have their own painter, `plate.js`.
//
// Every photographic entry in `TILES` is a downsampled PolyHaven JPEG. This one
// is painted, and the reason is the one thing a photograph of a brick wall
// cannot give this scene: *the right brick, at the right size, seamless*.
//
// A photographed wall arrives with its own courses, its own bond and its own
// lighting baked in. Tiled at the density this camera needs it either repeats
// visibly — a photograph repeats as a whole picture, mortar lines and shadows
// together, which is the loudest tell there is — or it has to be scaled until
// the courses are wrong for the room. Painted, the bond is periodic in the tile
// by construction, and every brick in it is a different brick.
//
// ── the size, and why it is not a brick's ────────────────────────────────────
// The tile is 1.2 m square in the scene's own metre (`pxPerM` in `geometry.js`),
// carrying four brick lengths across and twelve courses down — so a unit is
// 300 × 100 mm rather than the 225 × 75 mm a real brick measures. That is a
// third over life size and it is deliberate: at the distance this camera holds
// the wall a true brick course lands around fifteen screen pixels, where the
// joint is a hairline, the chipping is sub-pixel and the whole thing mips down
// to the flat wash the concrete tile before it already was. What the wall owes
// this scene is a *grid to read the ride against*, and it has to survive being
// looked at from across a shaft. The proportion is kept exactly, which is what
// the eye actually checks.
//
// ── what goes in the map and what does not ───────────────────────────────────
// This is a *neutral-ish* painting: the bricks carry a little warmth and the
// mortar a little grey, but the wall's actual pigment stays in `SURFACES` where
// the rest of the catalogue keeps it. The map is a multiplier — see the note in
// `surfaceMaterial.js` — so painting the full brick red in here as well would
// square the hue and hand back a wall the colour of a fire engine. What the map
// owes the scene is *pattern, level and damage*.
//
// The same rule the props keep applies: paint the surface, not the light. The
// arrises are lit from the upper left because that is a real bevel on a real
// brick and every other painted surface in this directory throws its relief the
// same way; nothing in here gets darker because it is further from the lamp.

import { seeded } from './wear.js';
import { blob, normalise, rgb, surface } from './paintedTile.js';

const TILE = 1024;
const COLS = 4; // brick lengths across the tile
const ROWS = 12; // courses down it — **even**, or the running bond does not close
const BW = TILE / COLS;
const BH = TILE / ROWS;
const JOINT = 10; // the mortar joint, the same width in both directions

/**
 * The bond, as numbers, so `brick.test.js` can check that what this paints is
 * still masonry: four lengths by twelve courses in a 1.2 m tile, at a real
 * brick's proportion, and the catalogue's `scale` has to keep landing on that
 * 1.2 m or the wall stops being built out of units.
 */
export const BOND = { TILE, COLS, ROWS, JOINT, TILE_M: 1.2 };

// Warm buff-to-brown, low chroma. The red is `SURFACES.backWall`'s job.
const BRICKS = [
  [172, 148, 133],
  [160, 134, 118],
  [150, 126, 114],
  [178, 152, 132],
  [138, 116, 105],
  [186, 158, 138], // a pale one, salt-burnt
  [120, 102, 95], // and an over-fired one
  [104, 92, 88], // the blackened header, rare
];
// weighted so the two dark ones are occasional rather than every fourth brick
const PICK = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7];

const MORTAR = [112, 107, 100];

// ── damage ───────────────────────────────────────────────────────────────────
// The thing that separates a wall from a pattern of rectangles. A new brick is
// a rounded rectangle of one colour; an old one has lost its arrises, has been
// hit, has cracked along a line the kiln put in it, and has had eighty years of
// trolleys and hoist gear scraped down it. None of that is uniform, so all of it
// is rejection-sampled per brick against that brick's own `age`.
//
// Everything in here is drawn *inside a clip of the brick's own face*, so damage
// at an edge stops at the joint rather than spilling into the mortar. Damage
// that belongs to the mortar is a separate pass, below.

/**
 * A spall: a piece of the face broken away. The hollow it leaves is in shadow
 * and the clay it exposes is a shade fresher than the weathered face around it,
 * which is the pair of cues that says "broken" rather than "stained".
 */
function spall(ctx, x, y, w, h, tint, k, rnd) {
  // they start at an edge, because that is where a brick gets hit
  const edge = Math.floor(rnd() * 4);
  const cx = edge === 0 || edge === 2 ? x + rnd() * w : (edge === 1 ? x + w : x);
  const cy = edge === 1 || edge === 3 ? y + rnd() * h : (edge === 0 ? y : y + h);
  const r = h * (0.16 + rnd() * 0.34);

  blob(ctx, cx, cy, r, rnd);
  ctx.fillStyle = rgb(tint, k * 0.6);
  ctx.fill();
  blob(ctx, cx + r * 0.12, cy + r * 0.14, r * 0.68, rnd);
  ctx.fillStyle = rgb(tint, k * 1.16);
  ctx.fill();
  // the lip the break leaves, catching the light on its upper side
  ctx.strokeStyle = rgb(tint, k * 1.4, 0.55);
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** A crack, walked across the face and usually running out of an edge. */
function crack(ctx, x, y, w, h, rnd) {
  let px = x + rnd() * w;
  let py = rnd() > 0.5 ? y : y + h;
  const dir = py === y ? 1 : -1;
  const steps = 4 + Math.floor(rnd() * 5);
  const path = [[px, py]];
  for (let i = 0; i < steps; i += 1) {
    px += (rnd() - 0.5) * w * 0.22;
    py += dir * (h / steps) * (0.5 + rnd());
    path.push([px, py]);
  }
  // Walked twice rather than stroked twice under a transform: a canvas path
  // takes the CTM at the moment each point is added, so translating afterwards
  // moves nothing and the ghost lands exactly on the crack.
  const walk = (dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(path[0][0] + dx, path[0][1] + dy);
    for (const [ax, ay] of path.slice(1)) ctx.lineTo(ax + dx, ay + dy);
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(24,18,14,0.62)';
  ctx.lineWidth = 0.8 + rnd() * 1.4;
  walk(0, 0);
  // the ghost beside it: one side of a crack sits a hair proud of the other
  ctx.strokeStyle = 'rgba(232,214,196,0.2)';
  ctx.lineWidth = 0.8;
  walk(1, -1);
}

/** Scrapes: what a hoist rope, a gate and eighty years of crates leave. */
function scores(ctx, x, y, w, h, rnd, n) {
  for (let i = 0; i < n; i += 1) {
    const sy = y + rnd() * h;
    const sx = x + rnd() * w * 0.7;
    const len = w * (0.12 + rnd() * 0.5);
    const tilt = (rnd() - 0.5) * h * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + len, sy + tilt);
    ctx.strokeStyle = rnd() > 0.45 ? 'rgba(238,224,206,0.22)' : 'rgba(30,23,18,0.34)';
    ctx.lineWidth = 0.6 + rnd() * 1.1;
    ctx.stroke();
  }
}

/**
 * One brick face, inset inside its joint: the drop into the recess, the face
 * itself, its broken arrises, and whatever has happened to it since.
 *
 * `age` is this brick's own share of the wall's history, 0 to 1. It decides how
 * much of the repertoire below it gets, which is what keeps a wall of forty-
 * eight bricks from reading as forty-eight copies of the same damaged brick.
 */
function brick(ctx, bx, by, tint, rnd) {
  const w = BW - JOINT;
  const h = BH - JOINT;
  const k = 0.82 + rnd() * 0.34; // no two bricks out of one kiln match
  const age = rnd();
  // some sit proud of their neighbours and some have sunk back
  const x = bx + (rnd() - 0.5) * 2.4;
  const y = by + (rnd() - 0.5) * 2.4;

  // the recess: the joint is raked back, so the face drops a shadow down-right
  ctx.fillStyle = 'rgba(18,14,11,0.45)';
  ctx.fillRect(x + 3, y + 3, w, h);

  ctx.fillStyle = rgb(tint, k);
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // The arrises, lit from the upper left like every other painted relief here —
  // but **broken**, in segments with gaps. A continuous highlight down a whole
  // edge is the single loudest thing saying "new": it is a machine-cut arris,
  // and eighty years in a lift shaft do not leave one.
  const arris = (horizontal) => {
    const run = horizontal ? w : h;
    let at = rnd() * 20;
    while (at < run) {
      const seg = run * (0.06 + rnd() * 0.22);
      const lit = rnd() > age * 0.7;
      ctx.fillStyle = lit ? rgb(tint, k * 1.34, 0.72) : 'rgba(26,20,16,0.3)';
      if (horizontal) ctx.fillRect(x + at, y, Math.min(seg, run - at), 2.4);
      else ctx.fillRect(x, y + at, 2.4, Math.min(seg, run - at));
      at += seg + run * rnd() * 0.12;
    }
  };
  arris(true);
  arris(false);
  ctx.fillStyle = 'rgba(22,17,13,0.5)';
  ctx.fillRect(x, y + h - 2.4, w, 2.4);
  ctx.fillRect(x + w - 2.4, y, 2.4, h);

  // the face's own grain: fired clay is never flat, and at this tile size the
  // speckle is most of what stops a brick reading as a rectangle of paint
  for (let i = 0; i < 150; i += 1) {
    const r = 0.6 + rnd() * 3.2;
    ctx.globalAlpha = 0.05 + rnd() * 0.2;
    ctx.fillStyle = rnd() > 0.45 ? 'rgb(52,41,34)' : 'rgb(228,208,188)';
    ctx.beginPath();
    ctx.arc(x + rnd() * w, y + rnd() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // and the deeper pitting, which is a hole rather than a fleck: a dark cup
  // with a lit lower lip, because that is the one direction a hollow catches
  for (let i = 0; i < Math.round(4 + age * 26); i += 1) {
    const r = 1.4 + rnd() * 4.4;
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    ctx.globalAlpha = 0.3 + rnd() * 0.4;
    ctx.fillStyle = 'rgb(38,29,24)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgb(226,206,186)';
    ctx.beginPath();
    ctx.arc(px + r * 0.22, py + r * 0.3, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── and what has actually happened to this one ─────────────────────────────
  scores(ctx, x, y, w, h, rnd, Math.round(2 + age * 9));
  for (let i = 0; i < Math.round(age * 3.4); i += 1) spall(ctx, x, y, w, h, tint, k, rnd);
  if (age > 0.55) crack(ctx, x, y, w, h, rnd);
  if (age > 0.86) crack(ctx, x, y, w, h, rnd);

  // a lost corner: the whole arris gone, back to the mortar behind it
  if (age > 0.68) {
    const cw = w * (0.06 + rnd() * 0.18);
    const ch = h * (0.18 + rnd() * 0.4);
    const cx = rnd() > 0.5 ? x : x + w - cw;
    const cy = rnd() > 0.5 ? y : y + h - ch;
    blob(ctx, cx + cw / 2, cy + ch / 2, Math.max(cw, ch) * 0.62, rnd, 7);
    ctx.fillStyle = rgb(MORTAR, 0.62);
    ctx.fill();
    ctx.strokeStyle = rgb(tint, k * 1.25, 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // the grime that collects on the top of a course and under it — dirt, which
  // stays where it is when the lamp moves. That is the test.
  const dirt = ctx.createLinearGradient(0, y + h * 0.6, 0, y + h);
  dirt.addColorStop(0, 'rgba(30,23,18,0)');
  dirt.addColorStop(1, `rgba(30,23,18,${0.12 + age * 0.26})`);
  ctx.fillStyle = dirt;
  ctx.fillRect(x, y + h * 0.6, w, h * 0.4);

  ctx.restore();
}

/** @type {HTMLCanvasElement | null | undefined} */
let cached;

/**
 * The tile. One canvas, shared by every piece of the blind wall — the piers
 * either side of an opening and the spandrels between floors are all one wall,
 * and sharing a painting keeps their courses at the same height.
 *
 * @returns {HTMLCanvasElement | null} `null` where there is no canvas to paint
 *   on, which is every test run.
 */
export function brickCanvas() {
  if (cached !== undefined) return cached;
  const made = surface(TILE);
  if (!made) {
    cached = null;
    return cached;
  }
  const { canvas, ctx } = made;
  const rnd = seeded(0x5b1c4);

  // ── the bed ────────────────────────────────────────────────────────────────
  ctx.fillStyle = rgb(MORTAR);
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 9000; i += 1) {
    ctx.globalAlpha = 0.05 + rnd() * 0.16;
    ctx.fillStyle = rnd() > 0.5 ? 'rgb(150,144,134)' : 'rgb(58,53,48)';
    ctx.fillRect(rnd() * TILE, rnd() * TILE, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  ctx.globalAlpha = 1;

  // ── the bond ───────────────────────────────────────────────────────────────
  // Stretcher bond: every course offset by half a brick from the one above it,
  // which closes on itself after two courses — hence `ROWS` being even.
  //
  // **Every brick carries its own generator, seeded off where it sits.** Not a
  // nicety: on the offset courses one brick straddles the tile's right edge, so
  // the half that runs off has to arrive on the left as *the same brick* —
  // same colour, same cracks, same lost corner — or the wall comes apart down a
  // vertical line every tile. Drawing it twice off one shared stream would give
  // two different bricks, which is exactly the seam this is here to close.
  for (let row = 0; row < ROWS; row += 1) {
    const off = (row % 2) * (BW / 2);
    for (let col = 0; col < COLS; col += 1) {
      const seed = 0x9e37 + row * 7919 + col * 104729;
      const tint = BRICKS[PICK[Math.floor(seeded(seed)() * PICK.length)]];
      const x = col * BW + off + JOINT / 2;
      const y = row * BH + JOINT / 2;
      brick(ctx, x, y, tint, seeded(seed + 1));
      if (x + BW - JOINT > TILE) brick(ctx, x - TILE, y, tint, seeded(seed + 1));
    }
  }

  // ── the pointing, which goes before the brick does ─────────────────────────
  // Mortar is the soft part of a wall: it washes out, it gets raked by frost,
  // and in a damp shaft it goes first. Painted after the bond so it reads as
  // gouged out from between the units rather than laid under them, and kept to
  // short segments so it follows the joints instead of drawing a grid over
  // them — the joint lines themselves are already there, from the gaps.
  for (let i = 0; i < 190; i += 1) {
    const horizontal = rnd() > 0.42;
    const row = Math.floor(rnd() * ROWS);
    const off = (row % 2) * (BW / 2);
    const len = (horizontal ? BW : BH) * (0.2 + rnd() * 0.7);
    const x = horizontal
      ? rnd() * TILE
      : Math.floor(rnd() * (COLS + 1)) * BW + off - JOINT / 2;
    const y = horizontal ? row * BH - JOINT / 2 : row * BH + rnd() * BH;
    ctx.globalAlpha = 0.25 + rnd() * 0.45;
    ctx.fillStyle = rnd() > 0.35 ? 'rgb(46,40,35)' : 'rgb(158,150,138)';
    const t = JOINT * (0.3 + rnd() * 0.6);
    if (horizontal) {
      const jy = y + rnd() * 3;
      ctx.fillRect(x, jy, len, t);
      // and again on the far side, for a gouge that runs off the edge
      if (x + len > TILE) ctx.fillRect(x - TILE, jy, len, t);
    } else {
      ctx.fillRect(x + rnd() * 3, y, t, len);
    }
  }
  ctx.globalAlpha = 1;

  // ── and what a damp shaft does to the whole of it ─────────────────────────
  // Kept few and kept soft. Large incident inside a tile is the thing that
  // makes a repeat visible — the eye finds the same blotch four times across a
  // wall long before it finds the same brick — so the variation that carries
  // this surface lives at brick scale, above, and this is only enough to say
  // the wall is in a lift shaft rather than in a catalogue.
  for (let i = 0; i < 9; i += 1) {
    const x = rnd() * TILE;
    const wdt = 30 + rnd() * 120;
    const streak = ctx.createLinearGradient(x, 0, x + wdt, 0);
    streak.addColorStop(0, 'rgba(26,20,16,0)');
    streak.addColorStop(0.5, `rgba(26,20,16,${0.1 + rnd() * 0.18})`);
    streak.addColorStop(1, 'rgba(26,20,16,0)');
    ctx.fillStyle = streak;
    // drawn twice, so a streak leaving one edge arrives at the other
    ctx.fillRect(x, 0, wdt, TILE);
    ctx.fillRect(x - TILE, 0, wdt, TILE);
  }
  for (let i = 0; i < 6; i += 1) {
    const x = rnd() * TILE;
    const y = rnd() * TILE;
    const r = 50 + rnd() * 140;
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, r);
    bloom.addColorStop(0, `rgba(206,198,184,${0.06 + rnd() * 0.09})`);
    bloom.addColorStop(1, 'rgba(206,198,184,0)');
    ctx.fillStyle = bloom;
    for (const dx of [0, -TILE, TILE]) {
      for (const dy of [0, -TILE, TILE]) ctx.fillRect(x - r + dx, y - r + dy, r * 2, r * 2);
    }
  }

  normalise(ctx, TILE, TILE);
  cached = canvas;
  return cached;
}
