// The landing screen's terminal, and the log it prints.
//
// It replaces the logo reveal that used to run here. The reasoning is in
// `LandingScreen`: a mark that draws itself in on one floor out of four, for two
// seconds per arrival, is a title card, not a mark — the identity moved onto the
// doors, the console and the brick, where it is in frame the whole session. What
// the screen is left with is the job a screen is actually good at, which is
// saying what the workshop *does* rather than whose it is.
//
// ── the log is laid out as a character grid, and that is the whole design ────
// The first cut set the log as pixels — a 17px face on a 560px canvas — and it
// was unreadable on screen. Mykolai had to lean into the monitor to make it out,
// and the arithmetic says he was right to: the glass is about 520 scene pixels
// wide, it stands two rooms back so the perspective divide takes it to roughly
// 260 *screen* pixels, and 17 canvas pixels of type inside a 560-pixel canvas
// stretched to that is under eight pixels of actual letter.
//
// The lesson is that nothing about a surface this far back can be judged in
// canvas pixels. So the canvas is not a size any more, it is a **grid**: thirty
// columns by nineteen rows, and the canvas is whatever that comes to. Then the
// only number that matters can be checked with arithmetic instead of by eye —
// one canvas pixel is about a third of a screen pixel at 1600×900, so a 40px
// face lands at 13.5, which is the size the deck's own body text is set at.
//
// Two consequences, both deliberate:
//
// - **Thirty columns is the budget, and the log is written to it.** A screen
//   260 pixels wide cannot hold forty legible monospace characters; nothing
//   about the font choice changes that. Widening the canvas makes it worse, not
//   better, because the box is fitted to the glass either way and every extra
//   column takes screen pixels off every letter.
// - **Nineteen rows is the budget too, and the log fits inside it.** The
//   alternative was scrolling, which is what a real build log does — and it
//   would have scrolled the `dotnet build` off the top, leaving the thing the
//   screen is *for* visible only during the two seconds it prints. `terminal.test.js`
//   holds both budgets so an edit cannot quietly break them.
//
// The screen itself grew as well, in `SCREEN_TUNING`: the outer margin and the
// two vertical ones. Not the inner one — that is the gutter the valve rack hangs
// in, and there is about twenty pixels of clearance there already.
//
// ── what the log says, and why these lines ───────────────────────────────────
// It is this building's own control software being built, not a generic terminal
// dump: the assemblies are the parts of the lift, and every warning is a real
// .NET diagnostic code applied to a fitting the visitor can see out of the
// doorway. `Doors/Astragal.cs` is the stile standing in the reveal three metres
// away; `Counterweight.cs` is the stack of slabs riding past in the shaft;
// `Flohr.Governor` is the overspeed governor, restored from a package built for
// a framework two eras old — which is the only joke in here and is the sort a
// building tells about itself. None of it announces that it is a joke. That was
// the brief: the warnings carry the styling, they do not point at it.
//
// The counts are fixed rather than random. A build log that reads differently on
// each arrival is an animation of a build log; a build that always says four
// warnings is a build someone has been meaning to get to.

import { CanvasTexture, SRGBColorSpace } from 'three';

// ── the grid ─────────────────────────────────────────────────────────────────
/** How many characters wide the log may be. The hard budget — see above. */
export const COLS = 30;
/** How many lines fit on the tube. The other hard budget. */
export const ROWS = 19;

const FONT = 40;
// Space Mono's advance, which every monospace face in the fallback chain shares
// closely enough that a column count set from it holds.
const ADVANCE = FONT * 0.6;
const LINE = 54;
const PAD_X = 26;
const PAD_TOP = 40;
const PAD_BOTTOM = 26;

const W = Math.round(COLS * ADVANCE + PAD_X * 2);
const H = PAD_TOP + ROWS * LINE + PAD_BOTTOM;

/**
 * @typedef {'rule' | 'head' | 'cmd' | 'out' | 'ok' | 'warn' | 'ref' | 'gap' | 'cur'} Kind
 * @typedef {[Kind, string]} Line
 */

/** @type {Line[]} */
export const LOG = [
  ['head', 'NAMEREK WERK · BAUSTAND'],
  ['rule', ''],
  ['cmd', 'dotnet build -c Release'],
  ['out', ' Namerek.Core  -> Core.dll'],
  ['out', ' Namerek.Shaft -> Shaft.dll'],
  ['out', ' Namerek.Web   -> Web.dll'],
  ['cmd', 'dotnet test --no-build'],
  ['out', ' Passed! 184 tests, 0 failed'],
  ['gap', ''],
  ['ok', ' Build succeeded, 4 warning(s)'],
  ['warn', 'CS0162 unreachable code'],
  ['ref', '  Shaft/Landing.cs(48,13)'],
  ['warn', 'CS0649 _slack never assigned'],
  ['ref', '  Counterweight.cs(21,26)'],
  ['warn', 'NU1701 Flohr.Governor 1.4.2'],
  ['ref', '  restored for net48'],
  ['warn', 'CS8602 null dereference'],
  ['ref', '  Doors/Astragal.cs(77,9)'],
  ['cur', ''],
];

/** How long the whole log takes to print itself, in seconds. */
export const RUN = 2.4;

/**
 * How many lines are up at fraction `p` of the run.
 *
 * Not linear in lines: a blank line and a thirty-character line take the same
 * time only on a printer nobody has ever used. Each line is weighted by its own
 * length, with a floor so an empty one still costs a beat, and the cursor waits
 * for everything above it.
 *
 * @param {number} p 0..1
 */
export function linesAt(p) {
  const weight = (/** @type {Line} */ l) => Math.max(6, l[1].length);
  const total = LOG.reduce((sum, l) => sum + weight(l), 0);
  let seen = 0;
  for (let i = 0; i < LOG.length; i += 1) {
    seen += weight(LOG[i]);
    if (seen / total > p) return i;
  }
  return LOG.length;
}

// Phosphor, in one hue at six levels. Every light in this room is amber and the
// glass behind this canvas is emissive amber already, so a second colour on the
// screen would be the one thing in the frame that is not lit by the building.
// What separates a command from its output is *level*, which is also what
// separates them on the real thing.
const INK = {
  head: '#ffdcab',
  rule: '#7d5722',
  cmd: '#ffd08b',
  out: '#c68e3a',
  ok: '#ffbe63',
  warn: '#ff9b3e',
  ref: '#966829',
  cur: '#ffc978',
};

/**
 * The screen the log is printed on: dark, pooled toward the middle, ruled with
 * the scan of a raster.
 *
 * Painted rather than left transparent, and that is the whole difference
 * between a terminal and a caption. The glass under this plane is a lit amber
 * rectangle (`screenGlow`); text laid straight onto it has nothing to be dark
 * against, and a terminal is mostly dark. So the canvas lays its own tube down
 * first — nearly opaque in the middle, thinning at the very edge so the frame's
 * own glow still leaks round it and the plane does not read as a card taped
 * over the opening.
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

  // the raster. One line of tube in four, at a hair of alpha — invisible as a
  // pattern at this size, and the thing that stops the dark reading as paint.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.4);
}

/**
 * Print the first `count` lines of the log.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} count
 */
export function paintTerminal(canvas, count) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  tube(ctx);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const shown = Math.max(0, Math.min(LOG.length, count));

  for (let i = 0; i < shown; i += 1) {
    const [kind, text] = LOG[i];
    // the baseline of row `i`, sitting a little above the row's own bottom
    const y = PAD_TOP + i * LINE + FONT * 0.82;
    if (kind === 'gap') continue;

    if (kind === 'rule') {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = INK.rule;
      ctx.fillRect(PAD_X, y - FONT * 0.34, W - PAD_X * 2, 2.4);
      ctx.globalAlpha = 1;
      continue;
    }

    if (kind === 'cur') {
      // A block, not a caret, and steady rather than blinking. Both canvases
      // are `frameloop="demand"`; a cursor on a two-second cycle is a texture
      // upload of a megabyte twice a second for as long as anyone stands and
      // reads the page in front of it. The typing is the life here.
      ctx.shadowColor = 'rgba(255,180,90,0.7)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = INK.cur;
      ctx.fillRect(PAD_X, y - FONT * 0.74, ADVANCE, FONT * 0.86);
      ctx.shadowBlur = 0;
      continue;
    }

    const bold = kind === 'head' || kind === 'cmd' || kind === 'ok';
    ctx.font = `${bold ? 700 : 400} ${FONT}px 'Space Mono', 'Consolas', monospace`;
    // Two passes, the way the mark used to be drawn onto this same glass: a
    // wide bleed for the phosphor spreading into the tube and a tight one for
    // the stroke itself alight. A single flat fill reads as printing.
    ctx.shadowColor = 'rgba(255,166,74,0.6)';
    ctx.shadowBlur = kind === 'ref' ? 6 : 12;
    ctx.fillStyle = INK[kind];

    if (kind === 'cmd') {
      // the prompt is the machine's, the command is the operator's, and they
      // are not printed at the same level
      ctx.globalAlpha = 0.7;
      ctx.fillText('>', PAD_X, y);
      ctx.globalAlpha = 1;
      ctx.fillText(text, PAD_X + ADVANCE * 2, y);
    } else {
      ctx.fillText(text, PAD_X, y);
    }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

/**
 * A canvas and the texture over it, sized to the grid.
 *
 * Aspect is fixed here rather than taken from the glass: the screen's own
 * proportions follow the viewport, and monospace text stretched to fit a
 * changing rectangle is the one thing on this surface that would give it away.
 * The caller fits this box inside the glass instead — see `TERMINAL_ASPECT`.
 */
export function terminalSurface() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}

/** The canvas's own shape, for a caller fitting it inside the glass. */
export const TERMINAL_ASPECT = W / H;

/**
 * Wipe the screen back to nothing without touching the texture, the material or
 * its compiled program — the contract `clearMark` held before it, and for the
 * same reason: unmounting the mesh drops the last reference to a linked program
 * on the exact frame the leaves finish parting. See `LandingScreen`.
 *
 * @param {HTMLCanvasElement} canvas
 */
export function clearTerminal(canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}
