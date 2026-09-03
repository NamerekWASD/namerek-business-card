// ── the 3. UG screen: where the workshop actually stands ─────────────────────
// The Kontakt deck answers *how to reach me* four times over — mail, LinkedIn,
// GitHub — and once, in the smallest type on the floor, *where from*. That last
// line is the one an employer in NRW reads first and the one the deck renders
// worst: «DUISBURG — VERFÜGBAR AB SOFORT» is ten pixels of enamel, measured at
// 4.44:1 against its plate, which is under the threshold by a hair. This screen
// takes the same fact and makes it the largest thing on the floor.
//
// ── why a map and not a fifth line of type ───────────────────────────────────
// Everything else on this deck is an address you copy. A location is not: it is
// spatial, and it is the one fact in the whole card that is genuinely better as
// a picture than as a string. A recruiter in Essen does not want to parse
// «Duisburg» and reconstruct a commute; they want to see the cross sitting one
// stop from their own city.
//
// It is also the fourth screen in a building that must not have four of the
// same screen. The EG prints a log, the 1. UG runs a circuit, the 2. UG carries
// a photograph — and this is the other thing a machine room's glass would
// honestly show: a route diagram of the district it serves.
//
// ── the diagram is linear, and that is a decision ────────────────────────────
// Not a coastline traced off an atlas. A Beck-style route card: four stops, the
// legs between them labelled with the kilometres that are actually on the road,
// and the Rhine as the one piece of real geography, because it is what makes
// the shape recognisable to anybody who lives on it. A traced outline of NRW at
// this size is a grey blob; a route card reads at a glance and is honest about
// being a schematic rather than pretending to be a survey.
//
// The neighbours carry their names, which the ticket did not ask for. A landmark
// nobody can name is not a landmark — it is three dots — and the whole point of
// the screen is a reader who does not yet know where Duisburg is. They are set
// small and in the quiet ink, so the only *loud* word on the sheet is still the
// one under the cross.
//
// ── the sheet is the glass, not a picture hung on it ─────────────────────────
// The rule `flow.js` was rebuilt around, and the one fault Mykolai has caught on
// this screen twice: a canvas fixed at one shape and fitted inside the opening
// arrives as «программка, открытая на экране» — a window floating on a tube,
// with a hand's width of bare fluted glass down either side. So the canvas takes
// the **glass's own aspect** as an argument and is built to it; nothing is ever
// stretched to cover the difference. The tube, the rules and the head run the
// full width at every shape, and what varies is how much room the map has in
// the middle of them.
//
// The drawing itself is capped in *field heights* and centred in what is left —
// a route card pulled across a wide monitor puts Köln a metre from Duisburg and
// stops reading as a region. What is left over is the margin of a sheet, not
// bare glass beside a window: the difference is that the furniture around it
// still goes to the edges.
//
// ── the treaty ───────────────────────────────────────────────────────────────
// Everything here is written in its own canvas's pixels and has never heard of a
// metre. `LandingScreen.jsx` knows metres, hands this the glass's shape and
// never opens the canvas. What that leaves is a class of fault that is silent on
// the wall — a stop half off the sheet, two names printed on top of each other,
// a leg labelled with somebody else's distance — and `nrwMap.test.js` is where
// each is a clause, checked at both ends of the range of shapes.
//
// ── and the ping is geometry, not a repaint ──────────────────────────────────
// The sheet is painted once per shape. What moves is a ring of light expanding
// out of the cross, on a plane of its own — the same bargain `flow.js` makes,
// and for the same reason: a megabyte of texture re-uploaded eighteen times a
// second buys nothing a scaled quad does not. See `NrwMap` in `LandingScreen`.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { bake } from './patterns.js';

/**
 * The sheet's layout.
 *
 * `H`, `MARGIN` and the type sizes are canvas pixels. `FIELD` and `RULE` are
 * fractions of the ruled frame's height; a stop's own `x`/`y` are fractions of
 * the *map field*, which is the frame's width capped and centred against the
 * band between the rules. See `mapLayout`.
 */
export const MAP = {
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
  /** the band the map itself lives in, down the frame */
  FIELD: [0.145, 0.86],
  /**
   * How wide the map may get, in field heights. Past this a district an hour
   * across is drawn a monitor wide and stops reading as one.
   */
  MAX: 1.0,
  /** the type: the home stop, the neighbours, the legs, the head and the foot */
  NAME: 46,
  PLACE: 28,
  LEG: 24,
  HEAD: 38,
  FOOT: 34,
  /** the survey cross over the home stop, and the ring on a neighbour */
  CROSS: 34,
  DOT: 11,
};

/**
 * The four stops, and where each stands in the field.
 *
 * Schematic, not surveyed: north is up and the order round the compass is the
 * real one — Essen east, Düsseldorf south, Köln south again — but the spacing is
 * the diagram's, not the map's. `km` is the road distance from the stop before
 * it in this list, which is the number a commuter actually cares about, and the
 * leg is drawn between exactly those two.
 *
 * `at` is which side of its own stop a name is set on. Hand-placed rather than
 * derived: what a name has to keep clear of is the leg leaving its stop and the
 * river, and neither is something a rule can see.
 */
export const PLACES = [
  { key: 'duisburg', name: 'DUISBURG', x: 0.28, y: 0.30, at: 'above', home: true },
  { key: 'essen', name: 'ESSEN', x: 0.76, y: 0.22, at: 'right', km: 22 },
  { key: 'duesseldorf', name: 'DÜSSELDORF', x: 0.44, y: 0.62, at: 'right', km: 28 },
  { key: 'koeln', name: 'KÖLN', x: 0.60, y: 0.90, at: 'right', km: 42 },
];

/**
 * Which stops a leg runs between. Essen and Düsseldorf both hang off Duisburg —
 * the home stop is the junction, which is the whole argument of the drawing —
 * and Köln hangs off Düsseldorf, which is how the road actually goes.
 */
export const LEGS = [
  ['duisburg', 'essen'],
  ['duisburg', 'duesseldorf'],
  ['duesseldorf', 'koeln'],
];

/**
 * The Rhine, in field fractions. The one piece of real geography on the sheet
 * and the reason the arrangement of stops is recognisable at all — every city
 * on it is on it. Kept west of the stops so it never runs under a name.
 */
export const RHINE = [
  [0.11, -0.04], [0.16, 0.14], [0.12, 0.34], [0.19, 0.52],
  [0.17, 0.72], [0.26, 0.88], [0.31, 1.04],
];

/**
 * The shape the canvas is actually built at: the measured glass, rounded to a
 * step and held inside the range above. Rounded because the glass drifts by a
 * pixel or two with every viewport, and a canvas rebuilt on each of those is a
 * repaint and a texture upload for a change nobody can see.
 *
 * @param {number} aspect the glass's width over its height
 */
export function mapAspect(aspect) {
  const [lo, hi] = MAP.ASPECT;
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : lo;
  return Math.min(hi, Math.max(lo, Math.round(a / MAP.STEP) * MAP.STEP));
}

/** The canvas, in pixels, for a glass of this shape. */
export function mapCanvas(aspect) {
  return [Math.round(MAP.H * mapAspect(aspect)), MAP.H];
}

const cache = new Map();

/**
 * Everything the sheet is laid out from, for one shape of glass — canvas pixels
 * throughout, so the painter and the tests read the same worked-out numbers.
 *
 * @param {number} aspect
 */
export function mapLayout(aspect) {
  const key = mapAspect(aspect).toFixed(3);
  const held = cache.get(key);
  if (held) return held;

  const [w, h] = mapCanvas(aspect);
  const frame = {
    x: MAP.MARGIN, y: MAP.MARGIN, w: w - MAP.MARGIN * 2, h: h - MAP.MARGIN * 2,
  };

  const fieldY = frame.y + frame.h * MAP.FIELD[0];
  const fieldH = frame.h * (MAP.FIELD[1] - MAP.FIELD[0]);
  const fieldW = Math.min(frame.w, fieldH * MAP.MAX);
  const fieldX = frame.x + (frame.w - fieldW) / 2;
  const field = {
    x: fieldX, y: fieldY, w: fieldW, h: fieldH,
  };

  const places = PLACES.map((p) => ({
    ...p,
    px: fieldX + fieldW * p.x,
    py: fieldY + fieldH * p.y,
  }));
  const by = new Map(places.map((p) => [p.key, p]));

  const legs = LEGS.map(([from, to]) => {
    const a = by.get(from);
    const b = by.get(to);
    return {
      from, to, a, b, km: b.km, mid: [(a.px + b.px) / 2, (a.py + b.py) / 2],
    };
  });

  const rhine = RHINE.map(([x, y]) => [fieldX + fieldW * x, fieldY + fieldH * y]);
  const home = places.find((p) => p.home);

  const out = {
    w, h, frame, field, places, legs, rhine, home,
  };
  cache.set(key, out);
  return out;
}

/**
 * The box a stop's name occupies, in canvas pixels.
 *
 * Estimated off Space Mono's advance rather than measured with a context — the
 * tests run without a canvas, and the point of the box is to catch two names
 * printed over each other, which a tenth of an em either way does not change.
 *
 * @param {{ name: string, at: string, home?: boolean, px: number, py: number }} p
 */
export function nameBox(p) {
  const size = p.home ? MAP.NAME : MAP.PLACE;
  const w = p.name.length * size * 0.6;
  const h = size;
  if (p.at === 'right') {
    return {
      x: p.px + MAP.DOT + 14, y: p.py - MAP.DOT - h, w, h,
    };
  }
  // above: centred over the cross, clear of its arms
  return {
    x: p.px - w / 2, y: p.py - MAP.CROSS - 12 - h, w, h,
  };
}

// ── the ping ─────────────────────────────────────────────────────────────────
// A cross on a map is a fact; a cross that pulses is a station reporting in,
// which is what this floor is for. One ring per cycle, out of the home stop and
// gone — a beacon rather than a heartbeat, because a screen somebody stands in
// front of for a minute must not flash at them the whole time.

/** How long one ring takes to travel out, in ms. */
export const PING_MS = 2400;
/** And how long the sheet is quiet before the next one, in ms. */
export const PING_REST_MS = 2000;
/** The whole thing. */
export const PING_CYCLE_MS = PING_MS + PING_REST_MS;

/** How far the ring gets, as a fraction of the field's height. */
export const PING_REACH = 0.42;

/**
 * The ring at `ms` since the screen woke: how wide it has got, as a fraction of
 * its full reach, and how bright it still is.
 *
 * Eased out, because a ring at constant speed is a hoop and a ring that slows as
 * it widens is a signal spreading. Alpha is nothing at both ends of the run, so
 * the ring never appears or vanishes as an edge standing still.
 *
 * @param {number} ms
 * @returns {{ k: number, alpha: number }}
 */
export function pingAt(ms) {
  const phase = ((ms % PING_CYCLE_MS) + PING_CYCLE_MS) % PING_CYCLE_MS;
  if (phase > PING_MS) return { k: 0, alpha: 0 };
  const p = phase / PING_MS;
  const k = 1 - (1 - p) ** 2;
  // in fast, out slow: the ring is fully there a fifth of the way through and
  // spends the rest of the run fading as it widens
  const alpha = Math.min(1, p / 0.18) * (1 - p) ** 1.2 * 0.85;
  return { k, alpha };
}

// ── the sheet, painted once per shape ────────────────────────────────────────

// One hue at levels, the phosphor `terminal.js` sets out and `flow.js` keeps:
// every light on this floor is amber and the glass behind this canvas is a lit
// amber rectangle, so a second colour here would be the one thing in frame the
// building is not lighting. What separates the home stop from its neighbours is
// level, and what separates the river from the route is level and width.
const INK = {
  home: '#ffe7c2',
  stop: '#ffbe63',
  road: '#c68e3a',
  river: '#7a5a2c',
  leg: '#b98038',
  rule: '#7d5722',
  quiet: '#b08040',
};

const FONT = (px, weight = 400) => `${weight} ${px}px 'Space Mono', 'Consolas', monospace`;

/** The dark the map sits on — `terminal.js`'s tube, at this glass's shape. */
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

/** The river: one wide dim pass with a thin bright thread down the middle of it. */
function river(ctx, pts) {
  const run = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i += 1) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(122,90,44,0.34)';
  ctx.lineWidth = 26;
  run();
  ctx.strokeStyle = INK.river;
  ctx.lineWidth = 3;
  run();
}

/** The survey cross over the home stop: arms, a ring, and the ticks of a mark. */
function cross(ctx, x, y) {
  const a = MAP.CROSS;
  ctx.shadowColor = 'rgba(255,190,110,0.85)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = INK.home;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(x - a, y);
  ctx.lineTo(x + a, y);
  ctx.moveTo(x, y - a);
  ctx.lineTo(x, y + a);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, a * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = INK.home;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

/** The needle in the corner, so a schematic still says which way is north. */
function compass(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = INK.quiet;
  ctx.fillStyle = INK.quiet;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(x, y + 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 38);
  ctx.lineTo(x - 9, y - 18);
  ctx.lineTo(x + 9, y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = FONT(22, 700);
  ctx.fillText('N', x, y + 40);
  ctx.restore();
}

/**
 * The sheet: the head, the river, the route with its stops and distances, the
 * compass and the foot line this whole screen exists to enlarge.
 *
 * Everything on it is at rest. The only thing that moves is the ring out of the
 * cross, which is geometry the caller drives.
 *
 * @param {HTMLCanvasElement} canvas @param {number} aspect
 */
export function paintMap(canvas, aspect) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const L = mapLayout(aspect);
  const { frame: f } = L;
  tube(ctx, L.w, L.h);

  ctx.textBaseline = 'middle';

  // The head and the foot, both running the full width of the frame whatever
  // the map inside them does — this is the sheet, and the sheet is the glass.
  ctx.shadowColor = 'rgba(255,166,74,0.6)';
  ctx.shadowBlur = 12;
  ctx.textAlign = 'center';
  ctx.font = FONT(MAP.HEAD, 700);
  ctx.fillStyle = INK.stop;
  ctx.fillText('NAMEREK WERK · STANDORT', f.x + f.w / 2, f.y + f.h * 0.032);
  // the fact the ticket is about, at three and a half times the enamel plate's
  // type and on the brightest ink the sheet has
  ctx.font = FONT(MAP.FOOT, 700);
  ctx.fillStyle = INK.home;
  ctx.fillText('VERFÜGBAR AB SOFORT', f.x + f.w / 2, f.y + f.h * 0.962);
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.6;
  ctx.fillStyle = INK.rule;
  MAP.RULE.forEach((r) => ctx.fillRect(f.x, f.y + f.h * r, f.w, 2.4));
  ctx.globalAlpha = 1;

  river(ctx, L.rhine);
  // named along its own bank, in the quiet ink — geography, not route
  ctx.save();
  ctx.translate(L.rhine[3][0] - 26, L.rhine[3][1]);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = FONT(22, 700);
  ctx.fillStyle = INK.quiet;
  ctx.globalAlpha = 0.8;
  ctx.fillText('RHEIN', 0, 0);
  ctx.restore();

  // the route
  ctx.shadowColor = 'rgba(255,166,74,0.45)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = INK.road;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  L.legs.forEach(({ a, b }) => {
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // and what each leg costs, set beside its own middle rather than on it
  ctx.font = FONT(MAP.LEG);
  ctx.fillStyle = INK.leg;
  L.legs.forEach(({ a, b, km, mid }) => {
    const dx = b.px - a.px;
    const dy = b.py - a.py;
    const len = Math.hypot(dx, dy) || 1;
    // a quarter of the type off the wire, on its left-hand side
    const off = MAP.LEG * 0.9;
    ctx.textAlign = dy >= 0 ? 'right' : 'left';
    ctx.fillText(`${km} KM`, mid[0] - (dy / len) * off, mid[1] + (dx / len) * off);
  });

  // the stops: the neighbours first, so the home stop's glow lands over them
  L.places.forEach((p) => {
    if (p.home) return;
    ctx.shadowColor = 'rgba(255,166,74,0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = INK.stop;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(p.px, p.py, MAP.DOT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
  cross(ctx, L.home.px, L.home.py);

  // the names
  L.places.forEach((p) => {
    const box = nameBox(p);
    ctx.textAlign = p.at === 'right' ? 'left' : 'center';
    ctx.shadowColor = 'rgba(255,166,74,0.55)';
    ctx.shadowBlur = p.home ? 16 : 8;
    ctx.font = FONT(p.home ? MAP.NAME : MAP.PLACE, 700);
    ctx.fillStyle = p.home ? INK.home : INK.quiet;
    const x = p.at === 'right' ? box.x : p.px;
    ctx.fillText(p.name, x, box.y + box.h / 2);
    ctx.shadowBlur = 0;
  });

  compass(ctx, f.x + f.w - 34, f.y + f.h * 0.135);
}

/** The ring the cross throws: nothing to it but an edge and its falloff. */
export const mapPing = () => bake('nrw:ping', 256, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const r = w / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  // Narrow on purpose. The first cut ramped from 0.72 and arrived as a soft
  // disc sitting over the cross — a smudge on the glass rather than a signal
  // leaving it. A ring is an *edge*: everything inside it has to be nothing.
  g.addColorStop(0, 'rgba(255,170,70,0)');
  g.addColorStop(0.9, 'rgba(255,170,70,0)');
  g.addColorStop(0.945, 'rgba(255,206,132,0.5)');
  g.addColorStop(0.975, 'rgba(255,242,214,0.9)');
  g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});

/**
 * A canvas and the texture over it, built at the glass's own shape.
 *
 * One per landing that carries the sheet, and **resized in place** when the
 * viewport changes that shape — see `sizeMap`. A second surface would be a
 * second texture, and dropping the first is a compiled program let go on
 * whichever frame the resize happened to land on.
 *
 * @param {number} aspect
 */
export function mapSurface(aspect) {
  const canvas = document.createElement('canvas');
  const [w, h] = mapCanvas(aspect);
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
export function sizeMap(surface, aspect) {
  const [w, h] = mapCanvas(aspect);
  if (surface.canvas.width === w && surface.canvas.height === h) return false;
  surface.canvas.width = w;
  surface.canvas.height = h;
  return true;
}
