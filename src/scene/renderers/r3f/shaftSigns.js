// What is written on the shaft: the firm's ghost sign painted across the brick,
// and the enamel plates naming the trade of the shop behind each door.
//
// Both are the *permanent* half of the identity, as against the door leaves'
// entrance. A mark that is only on the doors is only there while you are
// arriving; these are in frame during every ride, and they are the two things a
// real building of this date would actually carry — a signwritten wall and a
// rack of vitreous plates.
//
// ── they are painted, not photographed, for the reason the brick is ──────────
// See `brick.js`. A photographed sign brings its own wall's mortar, its own
// baked-in shadow and its own courses, and none of them are this shaft's. These
// are struck onto a transparent canvas and eroded against a grid that is this
// wall's grid, so the paint sits on the brick faces and has fallen out of the
// joints — which is the single thing that separates a ghost sign from a decal.
//
// ── and they are self-lit, because nothing here is lit ──────────────────────
// Every surface in this file ends up at or near z = -SHAFT_DEPTH, and the shaft's
// fittings stand `LAMPS.proud` (26) in front of that plane. A sign in the plane
// of the lamps lighting it receives, at best, a graze. So the light is painted
// in and the same canvas goes back as `emissiveMap` with `selfLit` set — the
// rule from `project_r3f_unlit_surfaces`, which was learned on the door leaves
// and applies to every one of these.

import { ENAMEL } from '../../../theme/tokens.js';
import { bake } from './patterns.js';
import { seeded } from './wear.js';

// ─────────────────────────────────────────────────────────────────────────────
// the ghost sign
// ─────────────────────────────────────────────────────────────────────────────
// A brandmauer sign: the firm's name laid across the blind masonry of the shaft
// at a size no plate in the building comes near, so it reads as belonging to the
// *building* rather than to a floor. It is the largest the mark's name ever gets
// here, and it is also the faintest — which is the correct order for a sign that
// was painted once, decades before anything else in this scene was installed.

const GHOST_W = 1152;
const GHOST_H = 320;
// The whitewash a signwriter used, thinned by weather. Not white: it has to sit
// *in* the amber of this shaft rather than on top of it, and pure white is the
// one value in here that would read as a light source.
const WASH = '#cbb794';

/** How many brick courses the sign's own height spans. */
const COURSES = 14;

/**
 * Knock the mortar out from under the paint.
 *
 * Whitewash goes onto the faces of bricks and skips the recessed joints, so what
 * survives forty years of weather is a grid of paint with the bond showing
 * through it. Doing this — rather than simply lowering the alpha — is the whole
 * of why the sign looks painted onto masonry instead of composited over it.
 *
 * @param {CanvasRenderingContext2D} ctx @param {() => number} rnd
 */
function knockOutJoints(ctx, rnd) {
  const course = GHOST_H / COURSES;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (let r = 0; r < COURSES; r += 1) {
    const y = r * course;
    // the bed joint under this course
    ctx.globalAlpha = 0.75 + rnd() * 0.25;
    ctx.fillRect(0, y - course * 0.11, GHOST_W, course * 0.22);
    // and the perpends: a brick is three courses long, and every other course
    // is offset by half of one — the bond, the same one `brick.js` lays
    const unit = course * 3;
    const offset = r % 2 ? unit / 2 : 0;
    for (let x = offset - unit; x < GHOST_W + unit; x += unit) {
      ctx.globalAlpha = 0.6 + rnd() * 0.4;
      ctx.fillRect(x - course * 0.1, y, course * 0.2, course);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Weather it: the paint is gone in patches, and gone almost entirely down one
 * side and along the top, which is where the water runs.
 *
 * @param {CanvasRenderingContext2D} ctx @param {() => number} rnd
 */
function weather(ctx, rnd) {
  ctx.globalCompositeOperation = 'destination-out';
  // the patches — big, soft and few. Many small ones read as noise; a sign
  // loses paint in sheets.
  for (let i = 0; i < 90; i += 1) {
    const x = rnd() * GHOST_W;
    const y = rnd() * GHOST_H;
    const r = 14 + rnd() * 82;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.18 + rnd() * 0.55;
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // and the run-off, heaviest at the top edge where the wall has been wet
  // longest
  const wash = ctx.createLinearGradient(0, 0, 0, GHOST_H);
  wash.addColorStop(0, 'rgba(0,0,0,0.72)');
  wash.addColorStop(0.34, 'rgba(0,0,0,0.1)');
  wash.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, GHOST_W, GHOST_H);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The sign itself.
 *
 * Two lines and a keyline, which is the whole grammar of the form: the name at
 * the size of the wall, the trade under it at a third of that, and a ruled box
 * round both so the signwriter's setting-out survives even where the letters do
 * not. `RECHENWERKE` — calculating works — is what makes the valve rack on the
 * ground floor and the punched tape upstairs read as this firm's plant rather
 * than as period dressing.
 */
export const ghostSign = () => bake('shaft:ghost', GHOST_W, GHOST_H, (ctx, w, h) => {
  const rnd = seeded(0x6ab1);

  ctx.fillStyle = WASH;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // the keyline, painted the same colour and therefore weathering with the rest
  ctx.strokeStyle = WASH;
  ctx.lineWidth = h * 0.018;
  ctx.strokeRect(h * 0.1, h * 0.1, w - h * 0.2, h - h * 0.2);

  // `letterSpacing` is a Chrome-era canvas property; where it is missing the
  // sign simply sets tighter, which is a worse sign rather than a broken one.
  ctx.letterSpacing = `${Math.round(h * 0.055)}px`;
  ctx.font = `700 ${Math.round(h * 0.4)}px 'Archivo Black', 'Arial Black', sans-serif`;
  ctx.fillText('NAMEREK', w / 2, h * 0.38);

  ctx.letterSpacing = `${Math.round(h * 0.085)}px`;
  ctx.font = `700 ${Math.round(h * 0.13)}px 'Archivo Black', 'Arial Black', sans-serif`;
  ctx.fillText('RECHENWERKE', w / 2, h * 0.72);
  ctx.letterSpacing = '0px';

  knockOutJoints(ctx, rnd);
  weather(ctx, rnd);
});

// ─────────────────────────────────────────────────────────────────────────────
// the trade plates
// ─────────────────────────────────────────────────────────────────────────────
// Vitreous enamel, which the styling system reserves for anything that is part
// of the building rather than a consumable (see `project_dieselpunk_styling_system`
// — a crate is stencilled, a doorway is enamelled). These name what the shop
// behind each door works in, and that is the one place the site's actual stack
// is allowed to be written out in words: on the fabric, in the building's own
// signage, rather than as a list on a page.
//
// They are also the scene's colour budget. The shaft is brick and rust the whole
// way down; four saturated plates riding past are the only chroma in it.

const PLATE_W = 320;
const PLATE_H = 116;

/**
 * One enamel plate.
 *
 * The parts that make enamel read as enamel and not as a coloured rectangle,
 * all of them in the DOM version already (`ui/EnamelPlate.jsx`) and worth
 * keeping identical here: a field graded from top-left, a cream keyline struck
 * just inside the edge, a darker rolled edge outside that where the glass thins
 * over the steel, and chips through to bare metal on the corners — which is the
 * only place a plate ever chips, because the corners are what it is handled by.
 *
 * @param {string} text @param {'red' | 'green'} colour
 */
export const stackPlate = (text, colour) => bake(
  `shaft:plate:${text}`,
  PLATE_W,
  PLATE_H,
  (ctx, w, h) => {
    const rnd = seeded(0x51a0 + text.length * 977);
    const field = ENAMEL[colour];

    const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, field);
    g.addColorStop(1, '#000000');
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // the rolled edge: the glass runs thin over the turned steel rim, so it
    // goes dark rather than bright
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 9;
    ctx.strokeRect(4.5, 4.5, w - 9, h - 9);
    // and the keyline printed inside it
    ctx.strokeStyle = ENAMEL.cream;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 3;
    ctx.strokeRect(13, 13, w - 26, h - 26);
    ctx.globalAlpha = 1;

    ctx.fillStyle = ENAMEL.cream;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Set to the plate rather than to a fixed size: `POSTGRES` is more than
    // twice the width of `C#`, and a plate whose type runs off the ends is the
    // one fault an enamel sign never has.
    let size = Math.round(h * 0.44);
    ctx.letterSpacing = `${Math.round(h * 0.06)}px`;
    for (; size > 8; size -= 2) {
      ctx.font = `700 ${size}px 'Archivo Black', 'Arial Black', sans-serif`;
      if (ctx.measureText(text).width <= w - 52) break;
    }
    ctx.fillText(text, w / 2, h * 0.52);
    ctx.letterSpacing = '0px';

    // the fixing holes, top and bottom, which is how these were hung
    for (const [hx, hy] of [[w * 0.5, h * 0.13], [w * 0.5, h * 0.87]]) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,132,96,0.5)';
      ctx.beginPath(); ctx.arc(hx, hy - 1, 3.4, 0, Math.PI * 2); ctx.fill();
    }

    // the chips: bare steel showing through, on the corners and along the top
    // edge, with a rust halo under each because a chip in enamel is where the
    // steel starts going
    for (let i = 0; i < 34; i += 1) {
      const corner = rnd() < 0.7;
      const cx = corner ? (rnd() < 0.5 ? rnd() * w * 0.16 : w - rnd() * w * 0.16) : rnd() * w;
      const cy = corner ? (rnd() < 0.5 ? rnd() * h * 0.24 : h - rnd() * h * 0.24) : rnd() * h;
      const r = 1.6 + rnd() * 4.4;
      ctx.fillStyle = `rgba(96,58,26,${(0.2 + rnd() * 0.3).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(58,52,44,${(0.55 + rnd() * 0.4).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }

    // and the grime, heaviest at the bottom, the same last pass every painted
    // surface in this scene takes
    const soot = ctx.createLinearGradient(0, h, 0, h * 0.3);
    soot.addColorStop(0, 'rgba(10,8,5,0.4)');
    soot.addColorStop(1, 'rgba(10,8,5,0)');
    ctx.fillStyle = soot;
    ctx.fillRect(0, 0, w, h);
  },
);

/**
 * What each landing's plate says, and what colour it is.
 *
 * Alternated red and green because both were made and a rack of four in one
 * colour reads as a set someone ordered rather than as signage accumulated.
 *
 * @type {{ text: string, colour: 'red' | 'green' }[]}
 */
export const STACK_PLATES = [
  { text: '.NET', colour: 'green' },
  { text: 'C#', colour: 'red' },
  { text: 'POSTGRES', colour: 'green' },
  { text: 'DOCKER', colour: 'red' },
];

/** The plate's own shape, for whatever hangs it. */
export const PLATE_ASPECT = PLATE_W / PLATE_H;
/** And the ghost sign's. */
export const GHOST_ASPECT = GHOST_W / GHOST_H;
