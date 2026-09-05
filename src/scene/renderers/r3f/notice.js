// The works notice on 2. OG, and the tube it is printed on.
//
// ── why this stopped being DOM ───────────────────────────────────────────────
// It was a plate of selectable HTML text, and the reason it was is written out
// at length in `project_deck_text_stays_dom`: text drawn into the scene cannot
// be selected, copied or read by a screen reader. That reasoning was sound and
// Mykolai overruled it on NBC-68 with a better one — nobody has any reason to
// copy this paragraph out. It is one sentence saying what a project is, next to
// a screen already showing the project and a plate already naming it. What it
// has to do is be *noticed changing*, which an enamel plate that quietly swaps
// its text under you does not.
//
// So it is a screen now, and the fact that it is a screen is what does the job:
// it can go dark and come back, which is the one thing a plate cannot do.
//
// ── the room's rule still holds ──────────────────────────────────────────────
// One surface, one question. This one answers *what it is and why* and nothing
// else — no heading, no project name, no stack. The console plate a metre to
// the right names the job and the stencil on the box says what shipped. See the
// table at the top of `decks/projects.js`.

import { CanvasTexture, SRGBColorSpace } from 'three';

// ── the canvas ───────────────────────────────────────────────────────────────
// Not a character grid like `terminal.js`: that one is monospace and its whole
// design is that a column count can be checked with arithmetic. This is prose
// in a proportional face, so the canvas is a rectangle and the wrap is
// measured. What is shared is the lesson underneath — nothing on a surface this
// far back can be judged in canvas pixels, so the type is set large relative to
// the canvas and the canvas is fitted to the glass by the caller.
const W = 660;
const H = 420;
const FONT = 34;
const LINE = 46;
const PAD_X = 46;
const PAD_TOP = 54;

/** The canvas's own shape, for a caller fitting it inside the glass. */
export const NOTICE_ASPECT = W / H;

/** How many lines of prose the tube holds before it starts dropping words. */
export const NOTICE_ROWS = Math.floor((H - PAD_TOP * 1.2) / LINE);

// ── the change, as a picture tube warming up ─────────────────────────────────
// Mykolai's brief, near enough word for word: full fade, then half a second of
// the print coming back brighter than it settles at, "как на старых телевизорах
// или приемниках". Both halves are load-bearing. The fade is what makes the
// change impossible to miss — a screen that goes black is an event, and a
// paragraph that swaps its words is not. The overshoot is what makes it a
// *tube* rather than a CSS cross-fade: a cathode does not come up to level, it
// comes up past it and settles.
const NOTICE = {
  FADE: 220, // to black
  FLARE: 520, // and back, the long way round
  RISE: 0.22, // how much of the flare is the strike itself
  PEAK: 1.95, // how far past its own level the tube comes up
};

export { NOTICE };

/** How long the whole change takes. */
export const CHANGE_MS = NOTICE.FADE + NOTICE.FLARE;

/**
 * How bright the tube is, `ms` after the project last changed.
 *
 * 1 is its resting level, 0 is black, and the stretch above 1 is the strike.
 * The caller multiplies its emissive by this and paints the *new* text at the
 * moment it crosses zero — which is the whole reason the fade has to reach zero
 * rather than merely get dim.
 *
 * @param {number | null} ms milliseconds since the change, or `null` if there
 *   has not been one
 */
export function warmUp(ms) {
  if (ms === null || ms >= CHANGE_MS) return 1;
  if (ms <= 0) return 1;
  if (ms < NOTICE.FADE) return 1 - ms / NOTICE.FADE;
  const p = (ms - NOTICE.FADE) / NOTICE.FLARE;
  if (p < NOTICE.RISE) return (p / NOTICE.RISE) * NOTICE.PEAK;
  const settle = (p - NOTICE.RISE) / (1 - NOTICE.RISE);
  return NOTICE.PEAK + (1 - NOTICE.PEAK) * settle ** 0.6;
}

/** Whether the new text should be on the canvas yet. */
export const swapped = (ms) => ms === null || ms >= NOTICE.FADE;

/**
 * Break `text` into lines no wider than `width`, measuring with `measure`.
 *
 * Greedy, which is what every terminal and every teleprinter does and what this
 * surface should look like. A word longer than the whole line is left to
 * overhang rather than being hyphenated — there is no such word in this
 * archive, and a wrap that silently loses characters is worse than one that
 * runs a little wide.
 *
 * @param {string} text
 * @param {number} width
 * @param {(s: string) => number} measure
 * @returns {string[]}
 */
export function wrapLines(text, width, measure) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The tube itself: dark, pooled toward the middle, ruled with the scan of a
 * raster.
 *
 * Painted rather than left transparent, for the reason `terminal.js` gives at
 * length — the glass under this plane is a lit amber rectangle, and text laid
 * straight onto it has nothing to be dark against.
 *
 * @param {CanvasRenderingContext2D} ctx
 */
function tube(ctx) {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.5, W * 0.95);
  g.addColorStop(0, 'rgba(26,15,6,0.95)');
  g.addColorStop(0.62, 'rgba(20,11,4,0.93)');
  g.addColorStop(1, 'rgba(12,7,3,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.4);
}

/**
 * Print one project's description.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} text the blurb, or '' for a tube with nothing loaded
 */
export function paintNotice(canvas, text) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  tube(ctx);
  if (!text) return;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${FONT}px 'Space Mono', 'Consolas', monospace`;
  const lines = wrapLines(text, W - PAD_X * 2, (s) => ctx.measureText(s).width)
    .slice(0, NOTICE_ROWS);

  // Two passes, the way the terminal's own log is drawn onto this same kind of
  // glass: a wide bleed for the phosphor spreading into the tube and a tight
  // one for the stroke itself alight. A single flat fill reads as printing.
  ctx.shadowColor = 'rgba(255,166,74,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd08b';
  lines.forEach((line, i) => {
    ctx.fillText(line, PAD_X, PAD_TOP + i * LINE + FONT * 0.82);
  });
  ctx.shadowBlur = 0;
}

/**
 * A canvas and the texture over it.
 *
 * Aspect is fixed here rather than taken from the glass, for the reason
 * `terminalSurface` gives: the screen's own proportions follow the viewport,
 * and type stretched to fit a changing rectangle is the one thing on this
 * surface that would give it away. The caller fits this box inside the glass.
 */
export function noticeSurface() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}
