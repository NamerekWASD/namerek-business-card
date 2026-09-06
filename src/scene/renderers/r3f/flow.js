// ── the 1. OG screen: where a request actually goes ──────────────────────────
// The deck on this floor says «Architektur — N-Tier · DDD · REST» on an enamel
// plate, and a plate is a claim: the visitor has to take it on trust. This is
// the same sentence drawn as a circuit, on the largest surface the floor owns,
// with a request running down it every few seconds — the claim demonstrated
// instead of asserted.
//
// ── why a block diagram and not a third terminal ─────────────────────────────
// The EG already prints a build log and owns monospace on a dark tube. A second
// screen of scrolling text one floor down would make the building uniform in
// the one way it must not be: four decks that all look like the same room. So
// this floor gets the other thing a machine room's glass would honestly carry —
// a works schematic, live.
//
// It stands one floor above the framed paper amplifier on the 2. OG, which is
// the repetition worth naming. They survive being neighbours because nothing
// about them is shared: that one is olive paper under a pendant, dark ink,
// still, and a valve circuit; this one is a dark tube, amber phosphor, moving,
// and four boxes. A drawing of the building's electronics and a drawing of its
// software, in the two media the building has.
//
// ── the sheet is the glass, not a picture hung on it ─────────────────────────
// The first cut fixed the canvas at one shape and fitted it inside the opening,
// the way `terminal.js` fits its log — and Mykolai caught what that looks like
// straight away: «типа как програмка открытая на экране». It was a window
// floating on a tube, with a hand's width of bare fluted glass down either side.
//
// A tube shows its picture edge to edge, so this canvas takes the *glass's own
// aspect* as an argument and is built to it. That is `gallery.js`'s trick, but
// it cannot be `gallery.js`'s implementation: a photograph may be stretched a
// few per cent onto a rectangle of another shape and a page of monospace may
// not. So nothing here is stretched — the canvas is **rebuilt** at the glass's
// shape and the drawing lays itself out inside it, which is why every function
// below takes an aspect and why `flowLayout` is memoised per shape.
//
// What that buys, and what it constrains:
//
// - **The canvas is always 1000 tall.** So a type size in canvas pixels is a
//   fixed fraction of the *glass height* whatever the viewport does, and the
//   legibility arithmetic at the head of `terminal.js` has one number to hold
//   instead of two.
// - **The drawing has a maximum width.** Measured, the glass runs from about
//   0.74 to 1.11 wide-to-tall across the viewports this scene is used at, and a
//   stack of four boxes stretched across the widest of those is a stack of bars.
//   So the drawing is capped in *box heights* and centred in what is left, while
//   the tube, the rules and the head still run the full width — which is the
//   difference between a full screen and a floating window.
//
// ── the treaty, which is `schematic.test.js`'s treaty ────────────────────────
// Everything here is written in its own canvas's pixels and has never heard of a
// metre. `LandingScreen.jsx` knows metres, hands this the glass's shape and
// never opens the canvas. What that leaves is a class of fault that is silent on
// the wall — a box half off the sheet, the return lane drawn back through the
// stack, an impulse reaching the database before it has been through the
// service — and `flow.test.js` is where each of those is a clause, checked at
// both ends of the range of shapes rather than at one.
//
// ── and the impulse is geometry, not a repaint ───────────────────────────────
// The obvious build is one canvas repainted per tick with the pulse drawn where
// it has got to. It is also a megabyte of texture uploaded eighteen times a
// second for as long as anyone stands on this floor, which is what `terminal.js`
// pays only for the two seconds of its print. So the sheet is painted **once**
// per shape; what moves is a bead of light on a plane of its own, and what
// brightens is one `opacity` per station. See `RequestFlow` in `LandingScreen`.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { t } from '../../../i18n/strings.js';
import { DEFAULT_LOCALE } from '../../../i18n/locale.js';
import { fitFont, stencil } from './canvasText.js';
import { bake } from './patterns.js';

/**
 * The sheet's layout.
 *
 * `H`, `MARGIN`, `PAD` and the two type sizes are canvas pixels. Everything else
 * is a fraction: of the ruled frame's height down the sheet, and — across it —
 * of the *drawing*, which is the frame's width capped and centred. See
 * `flowLayout`.
 */
export const FLOW = {
  /** The canvas is always this tall, whatever shape the glass is. */
  H: 1000,
  /** The shapes of glass the sheet is built for, narrowest to widest. */
  ASPECT: [0.7, 1.2],
  /** and how finely a measured glass is rounded to one of them */
  STEP: 0.02,
  /** the ruled margin, even all round because a drawing's margin is */
  MARGIN: 55,
  /** the head rule and the foot rule, down the frame */
  RULE: [0.075, 0.93],
  /** the inlet and the outlet, at two heights so they read as two ports */
  PORTS: [0.125, 0.185],
  /** where each station stands down the frame */
  ROWS: [0.3, 0.46, 0.62, 0.78],
  /**
   * The stack: how much of the drawing a box takes across, how much of the
   * frame it takes down, and how long a box may get before it stops reading as
   * a block and starts reading as a bar — in box heights.
   */
  BOX: { W: 0.72, H: 0.125, MAX: 5.2 },
  /** the gutter left of the stack, where the stage numbers go */
  GUTTER: 0.08,
  /** and the lane the answer comes back up, across the drawing */
  RETURN: 0.94,
  /** where the answer leaves the stack, below the last station */
  TURN: 0.895,
  /** a box's own inner margin, in canvas pixels */
  PAD: 22,
  /** the two type sizes inside a box, in canvas pixels */
  TAG: 50,
  SUB: 36,
  /** how much of the run the impulse spends standing still in one layer */
  DWELL: 0.09,
};

/**
 * The four layers, in the order a request meets them.
 *
 * The tags are the .NET names and stay English on purpose: they are the part a
 * reader is meant to recognise, and «Steuerung» recognises as nothing. The line
 * under each is the building's own voice, and every one of them is a fact this
 * deck's plates already claim — see `SKILL_GROUPS`.
 */
// A bare string is a stencil that reads the same in every language — three of
// these four layer names are the words the code itself uses, and the two
// product lines are product names. `{ key }` is the other kind: German for a
// thing, and it has to go. See `stencil` in `canvasText.js`.
export const STATIONS = [
  { id: 'controller', tag: 'CONTROLLER', sub: { key: 'screen.flow.endpoint' } },
  { id: 'service', tag: 'SERVICE', sub: { key: 'screen.flow.rules' } },
  { id: 'repository', tag: 'REPOSITORY', sub: 'EF CORE' },
  { id: 'database', tag: { key: 'screen.flow.database' }, sub: 'MSSQL · MONGODB' },
];

/**
 * The four layers' legends, resolved into one language.
 * @param {import('../../../i18n/locale.js').LocaleId} locale
 * @returns {{ id: string, tag: string, sub: string }[]}
 */
export function stationLabels(locale) {
  return STATIONS.map((s) => ({
    id: s.id,
    tag: stencil(s.tag, locale),
    sub: stencil(s.sub, locale),
  }));
}

/**
 * The shape the canvas is actually built at: the measured glass, rounded to a
 * step and held inside the range above.
 *
 * Rounded because the glass drifts by a pixel or two with every viewport, and a
 * canvas rebuilt on each of those is a repaint and a texture upload for a change
 * nobody can see.
 *
 * @param {number} aspect the glass's width over its height
 */
export function flowAspect(aspect) {
  const [lo, hi] = FLOW.ASPECT;
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : lo;
  return Math.min(hi, Math.max(lo, Math.round(a / FLOW.STEP) * FLOW.STEP));
}

/** The canvas, in pixels, for a glass of this shape. */
export function flowCanvas(aspect) {
  return [Math.round(FLOW.H * flowAspect(aspect)), FLOW.H];
}

const cache = new Map();

/**
 * Everything the sheet is laid out from, for one shape of glass. Canvas pixels
 * throughout — having the painter and the tests read the same worked-out numbers
 * is what keeps a symbol from landing half off the paper.
 *
 * @param {number} aspect
 */
export function flowLayout(aspect) {
  const key = flowAspect(aspect).toFixed(3);
  const held = cache.get(key);
  if (held) return held;

  const [w, h] = flowCanvas(aspect);
  const frame = {
    x: FLOW.MARGIN, y: FLOW.MARGIN, w: w - FLOW.MARGIN * 2, h: h - FLOW.MARGIN * 2,
  };

  const boxH = frame.h * FLOW.BOX.H;
  // The drawing: as wide as the frame, up to the width at which a box stops
  // being a block. Centred in whatever the frame has left — the tube and the
  // rules still run the full width, so what is left over reads as the margin of
  // a sheet rather than as bare glass beside a window.
  const drawW = Math.min(frame.w, (boxH * FLOW.BOX.MAX) / FLOW.BOX.W);
  const drawX = frame.x + (frame.w - drawW) / 2;

  const boxW = drawW * FLOW.BOX.W;
  const boxes = FLOW.ROWS.map((row) => ({
    x: drawX + drawW * FLOW.GUTTER,
    y: frame.y + frame.h * row - boxH / 2,
    w: boxW,
    h: boxH,
  }));

  const col = boxes[0].x + boxW / 2;
  const ret = drawX + drawW * FLOW.RETURN;
  const [inY, outY] = FLOW.PORTS.map((p) => frame.y + frame.h * p);
  const turn = frame.y + frame.h * FLOW.TURN;
  // In at the left edge, across to the stack, straight down through all four
  // layers, out below the last of them, back up past the stack and off the right
  // edge. Six points and five runs, all orthogonal — a block diagram whose wire
  // wanders diagonally is a flowchart, which is a different and worse drawing.
  const path = [
    [0, inY], [col, inY], [col, turn], [ret, turn], [ret, outY], [w, outY],
  ];

  const legs = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const len = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    legs.push({ from: path[i - 1], to: path[i], len, at: total });
    total += len;
  }

  // How far along the wire each layer stands. Every one of them is on the down
  // run, but found rather than assumed: a stack moved off the lane then fails a
  // test instead of lighting at the wrong moment on the wall.
  const stations = boxes.map((b) => {
    const x = b.x + b.w / 2;
    const y = b.y + b.h / 2;
    const leg = legs.find((l) => Math.abs(l.from[0] - x) < 1e-6
      && y >= Math.min(l.from[1], l.to[1]) && y <= Math.max(l.from[1], l.to[1]));
    return leg ? (leg.at + Math.abs(y - leg.from[1])) / total : 0;
  });

  const out = {
    w, h, frame, draw: { x: drawX, w: drawW }, boxes, path, legs, total, stations,
  };
  cache.set(key, out);
  return out;
}

/**
 * Where on the wire the impulse is at `u`, in canvas pixels. Parameterised by
 * arc length, so it travels at one speed the whole way round.
 * @param {number} u 0..1 @param {number} aspect
 */
export function pathAt(u, aspect) {
  const L = flowLayout(aspect);
  const d = Math.max(0, Math.min(1, u)) * L.total;
  for (const leg of L.legs) {
    if (d > leg.at + leg.len) continue;
    const k = leg.len === 0 ? 0 : (d - leg.at) / leg.len;
    return [
      leg.from[0] + (leg.to[0] - leg.from[0]) * k,
      leg.from[1] + (leg.to[1] - leg.from[1]) * k,
    ];
  }
  return L.path[L.path.length - 1];
}

// ── the run, and the stops in it ─────────────────────────────────────────────
// A bead at a constant speed is a bead on a wire. A request is not: it arrives
// at a layer, that layer does something, and only then does it go on. So the
// run is keyframed — travel between stations at one speed, then a beat standing
// in each — and the beat is what makes the drawing worth watching a second time.

/** How long one request takes from the inlet to the outlet, in ms. */
export const TRAVEL_MS = 2600;
/** And how long the wire is empty before the next one, in ms. */
export const REST_MS = 2200;
/** The whole thing. */
export const CYCLE_MS = TRAVEL_MS + REST_MS;

const keyed = new Map();

/** The run's keyframes — `[fraction of the run, fraction of the wire]`. */
function travelKeys(aspect) {
  const key = flowAspect(aspect).toFixed(3);
  const held = keyed.get(key);
  if (held) return held;

  const stops = flowLayout(aspect).stations;
  const legs = [];
  let prev = 0;
  for (const u of stops) { legs.push(u - prev); prev = u; }
  legs.push(1 - prev);
  const moving = 1 - FLOW.DWELL * stops.length;

  const out = [[0, 0]];
  let t = 0;
  legs.forEach((len, i) => {
    t += len * moving;
    const u = i < stops.length ? stops[i] : 1;
    out.push([t, u]);
    if (i < stops.length) {
      t += FLOW.DWELL;
      out.push([t, u]);
    }
  });
  keyed.set(key, out);
  return out;
}

/**
 * How far along the wire the impulse has got at fraction `p` of one run.
 * @param {number} p 0..1 @param {number} aspect
 */
export function travel(p, aspect) {
  const keys = travelKeys(aspect);
  const t = Math.max(0, Math.min(1, p));
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, u1] = keys[i];
    if (t > t1) continue;
    const [t0, u0] = keys[i - 1];
    const span = t1 - t0;
    return span === 0 ? u1 : u0 + (u1 - u0) * ((t - t0) / span);
  }
  return 1;
}

// How near the impulse has to be for a layer to light. Asymmetric, because a
// layer is not warm before the request arrives and is warm for a moment after
// it leaves — which is the difference between a lamp on a wire and work being
// done. `LEAD` is comfortably under the gap between two stations, so a station
// never lights for its neighbour's request.
const LEAD = 0.03;
const TAIL = 0.16;

/**
 * The whole live state of the sheet at `ms` since the screen woke: where the
 * impulse is, and how hot each layer is.
 *
 * `u` is null while the wire is empty between requests — but the *layers* go on
 * cooling, so their level is worked out from an impulse that keeps notionally
 * running off the end of the wire. Snapped to nothing the instant the run
 * finished, the last layer would blink out rather than fade.
 *
 * @param {number} ms @param {number} aspect
 * @returns {{ u: number | null, lit: number[] }}
 */
export function flowAt(ms, aspect) {
  const phase = ((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  const running = phase <= TRAVEL_MS;
  const u = running ? travel(phase / TRAVEL_MS, aspect) : null;
  const past = running ? u : 1 + (phase - TRAVEL_MS) / TRAVEL_MS;
  const lit = flowLayout(aspect).stations.map((s) => {
    const d = past - s;
    return Math.max(0, 1 - Math.abs(d) / (d < 0 ? LEAD : TAIL));
  });
  return { u, lit };
}

// ── the sheet, painted once per shape ────────────────────────────────────────

// One hue at levels, the phosphor `terminal.js` sets out: every light on this
// floor is amber and the glass behind this canvas is a lit amber rectangle, so a
// second colour here would be the one thing in frame the building is not
// lighting. What separates a wire from a legend is level.
const INK = {
  wire: '#c68e3a',
  box: '#ffbe63',
  tag: '#ffdcab',
  sub: '#a06f2c',
  rule: '#7d5722',
  quiet: '#966829',
};

const FONT = (px, weight = 400) => `${weight} ${px}px 'Space Mono', 'Consolas', monospace`;

/** The dark the diagram sits on — `terminal.js`'s tube, at this glass's shape. */
function tube(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, 'rgba(26,15,6,0.95)');
  g.addColorStop(0.62, 'rgba(20,11,4,0.93)');
  g.addColorStop(1, 'rgba(12,7,3,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1.4);
}

/** A chevron on the wire, pointing the way the current runs. */
function arrow(ctx, x, y, dx, dy, size) {
  ctx.beginPath();
  ctx.moveTo(x - dy * size - dx * size, y + dx * size - dy * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dy * size - dx * size, y - dx * size - dy * size);
  ctx.stroke();
}

/**
 * The sheet: the head, the wire with its arrows, the four layers, the two ports
 * and the foot. Everything on it is dim — this is the circuit at rest, and the
 * only bright things on this screen are the impulse and whichever layer it is
 * standing in, both of which are geometry the caller moves.
 *
 * @param {HTMLCanvasElement} canvas @param {number} aspect
 */
export function paintFlow(canvas, aspect, locale = DEFAULT_LOCALE) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const L = flowLayout(aspect);
  const labels = stationLabels(locale);
  const { frame: f, boxes, path: pts } = L;
  tube(ctx, L.w, L.h);

  ctx.textBaseline = 'middle';

  // The head and the foot, and the two rules the drawing lives between. Both
  // run the full width of the frame whatever the stack below them does — this
  // is the sheet, and the sheet is the whole glass.
  ctx.shadowColor = 'rgba(255,166,74,0.6)';
  ctx.shadowBlur = 12;
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.tag;
  // The head is the one line on this sheet that runs the frame's full width, so
  // it is also the one that a longer language can push off the end of it.
  fitFont(ctx, t('screen.flow.head', locale), f.w, 38, (px) => FONT(px, 700));
  ctx.fillText(t('screen.flow.head', locale), f.x + f.w / 2, f.y + f.h * 0.032);
  ctx.font = FONT(30);
  ctx.fillStyle = INK.sub;
  ctx.fillText('N-TIER · DDD · REST', f.x + f.w / 2, f.y + f.h * 0.966);
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.6;
  ctx.fillStyle = INK.rule;
  FLOW.RULE.forEach((r) => ctx.fillRect(f.x, f.y + f.h * r, f.w, 2.4));
  ctx.globalAlpha = 1;

  // the wire
  ctx.shadowColor = 'rgba(255,166,74,0.45)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = INK.wire;
  ctx.lineWidth = 3.4;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // and the way it runs: one chevron in each gap above a layer, and one on each
  // of the four runs the wire makes outside the stack
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  boxes.forEach((b, i) => {
    const above = i === 0 ? f.y + f.h * FLOW.PORTS[0] : boxes[i - 1].y + boxes[i - 1].h;
    arrow(ctx, pts[1][0], (above + b.y) / 2 + 7, 0, 1, 12);
  });
  arrow(ctx, (pts[0][0] + pts[1][0]) / 2, pts[0][1], 1, 0, 12);
  arrow(ctx, (pts[2][0] + pts[3][0]) / 2, pts[2][1], 1, 0, 12);
  arrow(ctx, pts[3][0], (pts[3][1] + pts[4][1]) / 2, 0, -1, 12);
  arrow(ctx, (pts[4][0] + pts[5][0]) / 2, pts[4][1], 1, 0, 12);
  ctx.shadowBlur = 0;

  // the two ports, named over their own run and pulled out to the frame's edge
  ctx.font = FONT(28, 700);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK.box;
  ctx.fillText(t('screen.flow.request', locale), f.x + 6, pts[0][1] - 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = INK.sub;
  ctx.fillText(t('screen.flow.response', locale), f.x + f.w - 6, pts[4][1] - 26);

  // the layers
  boxes.forEach((b, i) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;

    // filled with the tube's own dark, so the wire runs behind the box rather
    // than through the type on it
    ctx.fillStyle = 'rgba(14,8,3,0.94)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowColor = 'rgba(255,166,74,0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = INK.box;
    ctx.lineWidth = 2.8;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,166,74,0.55)';
    ctx.shadowBlur = 12;
    // Fitted rather than set: a box drawn at the German width has to hold the
    // Russian word for the same thing, which is two characters longer.
    fitFont(ctx, labels[i].tag, b.w - FLOW.PAD * 2, FLOW.TAG, (px) => FONT(px, 700));
    ctx.fillStyle = INK.tag;
    ctx.fillText(labels[i].tag, cx, cy - FLOW.SUB * 0.55);
    ctx.shadowBlur = 7;
    fitFont(ctx, labels[i].sub, b.w - FLOW.PAD * 2, FLOW.SUB, FONT);
    ctx.fillStyle = INK.sub;
    ctx.fillText(labels[i].sub, cx, cy + FLOW.TAG * 0.44);
    ctx.shadowBlur = 0;

    // the stage's number, out in the gutter the stack leaves to its left
    ctx.font = FONT(30, 700);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = INK.quiet;
    ctx.fillText(`${i + 1}`, (L.draw.x + b.x) / 2, cy);
    ctx.globalAlpha = 1;
  });
}

/**
 * The light one layer throws while the request is standing in it: the box's own
 * outline, alight, with a wash inside it. Additive over the painted sheet, so at
 * zero it is nothing at all and what is left is the drawing at rest.
 *
 * Baked at the box's own proportions — a glow authored square and stretched five
 * to one arrives with the corners of an ellipse.
 */
export const flowHalo = () => bake('flow:halo', 256, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const inset = 4;
  ctx.shadowColor = 'rgba(255,190,110,0.95)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = 'rgba(255,214,160,0.95)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,150,60,0.06)');
  g.addColorStop(0.5, 'rgba(255,170,80,0.16)');
  g.addColorStop(1, 'rgba(255,150,60,0.06)');
  ctx.fillStyle = g;
  ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2);
});

/** The impulse itself: a bead of light with nothing to it but falloff. */
export const flowBead = () => bake('flow:bead', 128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,246,226,0.95)');
  g.addColorStop(0.16, 'rgba(255,206,132,0.62)');
  g.addColorStop(0.44, 'rgba(255,158,58,0.18)');
  g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

/**
 * A canvas and the texture over it, built at the glass's own shape.
 *
 * One per landing that carries the sheet, and **resized in place** when the
 * viewport changes that shape — see `sizeFlow`. A second surface would be a
 * second texture, and dropping the first is a compiled program let go on
 * whichever frame the resize happened to land on.
 *
 * @param {number} aspect
 */
export function flowSurface(aspect) {
  const canvas = document.createElement('canvas');
  const [w, h] = flowCanvas(aspect);
  canvas.width = w;
  canvas.height = h;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}

/**
 * Put a surface at this shape, and say whether anything changed. Writing
 * `canvas.width` wipes the canvas even when the value written is the one already
 * there, so the caller must not do it unconditionally — that is a blank sheet on
 * every commit.
 *
 * @param {{ canvas: HTMLCanvasElement }} surface @param {number} aspect
 */
export function sizeFlow(surface, aspect) {
  const [w, h] = flowCanvas(aspect);
  if (surface.canvas.width === w && surface.canvas.height === h) return false;
  surface.canvas.width = w;
  surface.canvas.height = h;
  return true;
}
