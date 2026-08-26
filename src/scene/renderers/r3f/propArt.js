// ── the landing's furniture, painted ─────────────────────────────────────────
// `patterns.js` bakes things that are genuinely flat — a stripe, a lattice, a
// glow. This file bakes the *skin of an object*: the enamel on a post box, the
// boards of a crate, the face of an instrument panel. Same `bake`, same cache,
// different job, and the split is why neither file is nine hundred lines long.
//
// One problem decides how all of it is authored, so it is worth stating once.
//
// The pendant is the landing's only source, it hangs in the middle of the
// ceiling, and a prop standing on the floor is four hundred-odd scene pixels
// from it at a steep angle. What that buys a *vertical* face — the front of a
// post box, the side of a crate — is a cosine term around 0.3, against a room
// ambience of 0.465 carried flat at the surface's own albedo. So on exactly the
// faces the viewer looks at, **the ambience is the brighter of the two terms**,
// and a flat ambience cannot show a pattern: it floods one colour over the
// whole face and whatever was painted under it stops mattering.
//
// The way out is not to paint the light in. These props do catch real light,
// unlike the shut door leaves that forced that trick — so instead each canvas
// here is handed to its material as `emissiveMap` as well as `map` (see
// `ambientArtwork` in `LandingProps.jsx`). The room's bounce then carries *this
// picture* at the room's own level rather than a flat wash over it, and the
// lamp adds its modelling on top. Both terms describe the same object.
//
// Which gives the rule for everything below: **paint the surface, not the
// light.** Wear, pitting, rust, grain, stencils, print — all of that belongs
// here. Form shading, a face darker at the bottom because it is turned away
// from the lamp, does not: the lamp is already doing that, and doing it twice
// is the classic signature of a scene ported by eye.

import { bake } from './patterns.js';
import { FIELD, metalWear, mix, seeded } from './wear.js';

/**
 * How near the rim of a panel a point is — 0 well inside, 1 hard on the edge.
 * Wear is positional, and this is the term that makes it so.
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
const edgeness = (x, y, w, h) => {
  const d = Math.min(x, w - x, y, h - y) / Math.min(w, h);
  return Math.max(0, 1 - d * 4.5);
};

// ── the post box ─────────────────────────────────────────────────────────────
// Deutsche Post yellow, and it is the one saturated object on any landing by
// the rule the styling system already sets: enamel is the colour budget, the
// only saturated thing in a scene that is otherwise corroded. Here it earns the
// place twice over, because it is also one of only two props whose albedo is
// high enough to *show* what the pendant does to it — every iron surface in the
// catalogue sits near 0.03 in linear terms and swallows the light whole.
//
// The wear is the object. A clean yellow box is a yellow box; what the
// reference shows is enamel chipped back to black steel along every edge and
// down the lower half, with rust bleeding out of the chips. That pattern is
// what reads as "post box" rather than "yellow crate", so it is painted at
// length rather than sampled from a tile.

// ── the value it is painted at, which is a composition decision ─────────────
// The first cut was authored at the yellow a post box is in daylight (#c2941b)
// and it did not belong in this room: against a landing wall sitting at 0.20
// sRGB it came out three and a half times brighter than anything around it and
// read, in Mykolai's words, as realistic and not part of the scene. A prop that
// out-values every surface it stands against is a prop the eye goes to first,
// and this one is furniture standing under the page's own heading.
//
// So it is painted at the yellow that enamel *is under a dim tungsten pendant*
// — still unmistakably the one saturated thing on the floor, per the styling
// system's rule that enamel is the colour budget, but inside the range the rest
// of the room occupies rather than above it.
const ENAMEL = '#8a6714';
const ENAMEL_HI = 'rgba(168,132,42,0.16)';
const ENAMEL_LO = 'rgba(88,66,12,0.26)';
const BARE_STEEL = '#1a150d';
const RUST = '#71401a';

/**
 * One face of the post box's shell.
 *
 * Baked per face rather than tiled, because the wear *has a position* — it
 * gathers at the corners and along the bottom, which is precisely the
 * information a repeating tile throws away.
 *
 * @param {'face' | 'side' | 'top'} which
 */
export const postBoxSkin = (which) => {
  const [W, H] = { face: [256, 592], side: [176, 592], top: [256, 176] }[which];
  return bake(`postbox:${which}`, W, H, (ctx, w, h) => {
    const rnd = seeded(0x5eed + which.length * 7919);
    const flat = which === 'top';

    // ── the enamel ───────────────────────────────────────────────────────────
    ctx.fillStyle = ENAMEL;
    ctx.fillRect(0, 0, w, h);
    // Sprayed enamel is never one tone: it pools and thins over the pressing
    // underneath. Blobs well under the eye's threshold individually are what
    // stop the field reading as a paint swatch.
    for (let i = 0; i < 46; i += 1) {
      const cx = rnd() * w;
      const cy = rnd() * h;
      const r = 18 + rnd() * 70;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rnd() > 0.5 ? ENAMEL_HI : ENAMEL_LO);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // The wear field: how likely this spot is to have lost its enamel. Rising
    // toward every edge and toward the bottom is the whole difference between
    // weathering and noise. The top face is the exception — grit and water sit
    // on it, so it goes from the middle out as well.
    // No constant floor under it, and that matters more than it sounds: with
    // even a small one every part of the panel pits at some rate, and the
    // result is measles rather than weathering. Enamel in the middle of a face
    // is *intact* — what the reference shows is damage that starts at an edge
    // and works inward.
    const wear = (x, y) => {
      const rim = edgeness(x, y, w, h);
      const low = flat ? 0.42 : (y / h) ** 2.2;
      return Math.min(1, rim * 1.05 + low * 0.5);
    };

    // ── the pitting ──────────────────────────────────────────────────────────
    // Rejection-sampled against that field rather than scattered evenly.
    for (let i = 0; i < 6400; i += 1) {
      const x = rnd() * w;
      const y = rnd() * h;
      const k = wear(x, y);
      if (rnd() > k) continue;
      // strength and size follow the field as well as the count — a speck a
      // long way in from an edge is a speck that has only just started
      ctx.globalAlpha = 0.18 + rnd() * 0.62 * k;
      ctx.fillStyle = rnd() > 0.28 ? BARE_STEEL : RUST;
      ctx.beginPath();
      ctx.arc(x, y, 0.4 + rnd() * (0.7 + 1.9 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── the chips ────────────────────────────────────────────────────────────
    // Where the enamel has come away in a flake rather than a speck: bare steel
    // with rust creeping out of the edge, because a chip that is only a dark
    // blob reads as dirt.
    for (let i = 0; i < 60; i += 1) {
      const x = rnd() * w;
      const y = rnd() * h;
      if (rnd() > wear(x, y) ** 1.6) continue;
      const r = 2.5 + rnd() * 9;
      const pts = 6 + Math.floor(rnd() * 4);
      // the same outline twice — a rust halo under a steel centre
      const radii = Array.from({ length: pts }, () => r * (0.55 + rnd() * 0.75));
      const outline = (scale) => {
        ctx.beginPath();
        for (let k = 0; k <= pts; k += 1) {
          const a = (k / pts) * Math.PI * 2;
          const rr = radii[k % pts] * scale;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr * 0.8;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = RUST;
      outline(1.35);
      ctx.fill();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = BARE_STEEL;
      outline(1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── the runs ─────────────────────────────────────────────────────────────
    // Rust does not stay where it starts; it washes down and leaves a tail.
    // Uprights only — a horizontal face has nowhere to run to.
    if (!flat) {
      for (let i = 0; i < 24; i += 1) {
        const x = rnd() * w;
        const y = rnd() * h * 0.75;
        const len = 12 + rnd() * 90;
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, 'rgba(113,64,26,0.42)');
        g.addColorStop(1, 'rgba(113,64,26,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 1 + rnd() * 2.5, len);
      }
    }

    // ── the pressing ─────────────────────────────────────────────────────────
    // A shell folded out of sheet has a radius at every corner and the enamel
    // sits thinnest right on it. This is the one gradient in the file that is
    // honest: it is the paint being thin, not the light falling off.
    const rim = 11;
    for (const [x0, y0, x1, y1] of [
      [0, 0, rim, 0], [w, 0, w - rim, 0], [0, 0, 0, rim], [0, h, 0, h - rim],
    ]) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(26,21,13,0.5)');
      g.addColorStop(1, 'rgba(26,21,13,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
};

/**
 * The collection-times card behind the post box's little window: ruled columns
 * and rows of times, printed rather than legible.
 *
 * Deliberately unreadable, and that is a rule rather than a shortcut. Turning
 * readable text into a texture is how a scene loses its typography — the same
 * reason the landing's own signage stays out of these bakes — so what is here
 * is the *look* of a printed timetable at two metres and nothing more.
 */
export const postBoxCard = () => bake('postbox:card', 128, 160, (ctx, w, h) => {
  const rnd = seeded(0xc0ffee);
  ctx.fillStyle = '#7d7561';
  ctx.fillRect(0, 0, w, h);
  // foxing: a card that has lived in a steel box for forty years is not white
  for (let i = 0; i < 90; i += 1) {
    ctx.globalAlpha = 0.04 + rnd() * 0.1;
    ctx.fillStyle = rnd() > 0.5 ? '#544730' : '#8d8570';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#2b2419';
  ctx.lineWidth = 1;
  ctx.strokeRect(6.5, 6.5, w - 13, h - 13);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(6, 30);
  ctx.lineTo(w - 6, 30);
  for (let i = 1; i < 8; i += 1) {
    ctx.moveTo(6, 30 + i * 15);
    ctx.lineTo(w - 6, 30 + i * 15);
  }
  for (const cx of [w * 0.52, w * 0.76]) {
    ctx.moveTo(cx, 30);
    ctx.lineTo(cx, h - 6);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // the print itself: bars where the setting would be
  ctx.fillStyle = '#332b1e';
  ctx.globalAlpha = 0.72;
  ctx.fillRect(12, 14, w * 0.5, 8);
  for (let r = 0; r < 7; r += 1) {
    ctx.fillRect(12, 36 + r * 15, 20 + rnd() * 26, 5);
    ctx.fillRect(w * 0.55, 36 + r * 15, 14 + rnd() * 10, 5);
    ctx.fillRect(w * 0.79, 36 + r * 15, 14 + rnd() * 10, 5);
  }
  ctx.globalAlpha = 1;
});

// ── the crates ───────────────────────────────────────────────────────────────
// Sawn boards. The styling system is explicit that a crate is *consumable* and
// therefore wears a sprayed stencil rather than an enamel plate, which also
// makes it the one prop here allowed to carry lettering at all: a stencil is a
// mark sprayed through a template, so it may be a texture in a way a building's
// own signage may not.
//
// Pine rather than the iron everything else in this room is made of, and that
// is load-bearing rather than decorative: at roughly 0.11 linear it has three
// or four times the albedo of anything else in the catalogue, so it is the
// second of the two props bright enough to show the pendant's modelling.

// ── the value pine is painted at ────────────────────────────────────────────
// Sawn softwood is a pale, cheerful thing in daylight and none of that belongs
// here. The first cut used the blond of fresh boards and the crates came back
// as the brightest object in the corridor after the wall screen itself — the
// same fault the post box's enamel had, and the same fix: paint the colour the
// timber *is under one tungsten pendant*, not the colour it is on a loading
// bay. It is still the second-highest albedo in the room, which is what earns
// it the pendant's modelling; it is no longer competing with the page.
const PINE = ['#584727', '#4e3f23', '#61502e', '#463823', '#554425'];

/**
 * A crate panel: boards, the gaps between them, the grain running along them,
 * the knots and the nails.
 *
 * @param {number} boards how many run across the panel
 * @param {boolean} stencilled whether this face carries the sprayed mark
 */
export const cratePanel = (boards = 5, stencilled = false) => bake(
  `crate:${boards}:${stencilled}`, 256, 256, (ctx, w, h) => {
    const rnd = seeded(0xb0a2d + boards * 131 + (stencilled ? 977 : 0));

    // The shadow between the boards shows wherever they do not quite meet, so
    // the dark goes down first and the boards are laid over it.
    ctx.fillStyle = '#120d07';
    ctx.fillRect(0, 0, w, h);

    const pitch = h / boards;
    for (let i = 0; i < boards; i += 1) {
      const y = i * pitch;
      const gap = 1.5 + rnd() * 2;
      ctx.fillStyle = PINE[Math.floor(rnd() * PINE.length)];
      ctx.fillRect(0, y + gap, w, pitch - gap * 2);

      // The grain. Sawn softwood is banded along its length by the growth
      // rings, and those bands are what tell a board from a brown rectangle —
      // long, near-parallel, never evenly spaced, and never actually straight.
      for (let g = 0; g < 26; g += 1) {
        const gy = y + gap + rnd() * (pitch - gap * 2);
        ctx.globalAlpha = 0.05 + rnd() * 0.16;
        ctx.strokeStyle = rnd() > 0.55 ? '#3b2d19' : '#7a6440';
        ctx.lineWidth = 0.6 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(-4, gy);
        ctx.bezierCurveTo(
          w * 0.3, gy + (rnd() - 0.5) * 5,
          w * 0.7, gy + (rnd() - 0.5) * 5,
          w + 4, gy + (rnd() - 0.5) * 3,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // a knot on most boards, with the grain swept round it
      if (rnd() > 0.45) {
        const kx = 20 + rnd() * (w - 40);
        const ky = y + pitch / 2;
        const kr = 3 + rnd() * 5;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#4a3720';
        ctx.lineWidth = 1.2;
        for (let r = 4; r > 0; r -= 1) {
          ctx.beginPath();
          ctx.ellipse(kx, ky, kr * r * 0.5, kr * r * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#3b2a16';
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr, kr * 0.68, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // the sawn arris catching what light there is, and the dirt packed into
      // the joint below it
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#7d6a49';
      ctx.fillRect(0, y + gap, w, 1);
      ctx.fillStyle = '#241a0e';
      ctx.fillRect(0, y + pitch - gap - 1.5, w, 1.5);
      ctx.globalAlpha = 1;
    }

    // ── the nails ────────────────────────────────────────────────────────────
    // Two rows, on the battens. They are what says the boards are fixed to
    // something rather than merely lying side by side.
    for (const nx of [16, w - 16]) {
      for (let i = 0; i < boards; i += 1) {
        const ny = i * pitch + pitch / 2 + (rnd() - 0.5) * 3;
        ctx.fillStyle = '#2a2016';
        ctx.beginPath(); ctx.arc(nx + 0.6, ny + 0.8, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4d4234';
        ctx.beginPath(); ctx.arc(nx, ny, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#6f6455';
        ctx.beginPath(); ctx.arc(nx - 0.7, ny - 0.7, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── the stencil ──────────────────────────────────────────────────────────
    // Sprayed, so it haloes at the edge and skips where the boards part. Set in
    // the display face the rest of the variant uses.
    if (stencilled) {
      ctx.save();
      ctx.translate(w / 2, h * 0.5);
      ctx.rotate(-0.02);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 44px "Archivo Black", "Arial Black", sans-serif';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#161009';
      ctx.filter = 'blur(3px)';
      ctx.fillText('Nr. 001', 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 0.8;
      ctx.fillText('Nr. 001', 0, 0);
      ctx.restore();
      // and the skips: the gaps between the boards eat the paint
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.8;
      for (let i = 0; i <= boards; i += 1) ctx.fillRect(0, i * pitch - 2, w, 4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  },
);

// ── the valve rack ───────────────────────────────────────────────────────────
// The one prop that is about the site's own subject. It used to state that with
// a field of jacks and three cords bridged across it — a switched network,
// under the brass — and the idea was sound but the object was mute: a board of
// holes reads as a board of holes at any distance, and nothing on it was ever
// doing anything the eye could catch.
//
// A rack of valves states the same thing louder, and states it in *light*.
// Three decks of eight, standing in a cast case with its door swung back, is
// the machine this whole building is a joke about — and a hot heater carries
// down a corridor in a way a brass eyelet never did. The mechanics come over
// one for one: what used to be "this circuit has a cord in it" is now "this
// valve is in the live stage", and it drives the same board of lamps (see
// `usePilotLamps`).
//
// This bakes the backplane the decks are bolted to. The valves, the shelves and
// the wire guard are geometry, for the same reason the jacks were: a curved
// glass with something hot inside it catches the light on its own, and a
// painted bottle never will.
//
// ── drawn to the frame reference ────────────────────────────────────────────
// Mykolai's reference for the wall screen's frame is the style note for this
// panel too — he said so directly. What that image does, and what is copied
// here, is three things and no more: **dark aged cast metal** as the field,
// **brass** as the only bright accent and only ever on a raised member, and
// **engraved cream strips** carrying the legend. Everything else in it is wear.
// There is no fourth colour, and no gradient that is not a form.
//
// The lettering stays illegible on purpose, and that is a rule in this file
// rather than a shortcut: turning readable text into a texture is how a scene
// loses its typography — the same reason the landing's own signage stays out of
// these bakes. What is here is the *look* of a struck designation strip at two
// metres.

// the panel's three tones, and there are only three
const CAST = '#241f18';   // the crackle-finished field
const BRASS = '#8a6a2e';  // raised members only
const LEGEND = '#8b8168'; // the engraved strips

/**
 * The rack's layout, stated once for both halves of it.
 *
 * The painting and the geometry describe the same object from two different
 * places — this file has only a canvas and knows nothing about metres,
 * `LandingProps` has only metres and never sees the canvas — so every figure
 * the two must agree on lives here and neither writes one of its own. A
 * designation strip that has drifted behind the valves it labels is invisible
 * on the bench and obvious in the room, which is the worst way round.
 *
 * Everything vertical is a fraction *down* the plate, the way a canvas is
 * measured. `PLATE` is the only entry in metres, and it is what the case in
 * `LandingProps` is built around.
 */
export const RACK = {
  COLS: 8,
  /** where each chassis deck's top surface sits, down the plate */
  SHELVES: [0.3, 0.565, 0.83],
  /** how tall a valve stands, as a fraction of the plate's height */
  VALVE_H: 0.2,
  /** and the clear band above each row, which its strip sits in */
  STRIP_GAP: 0.055,
  /** how tall a designation strip is, rebate included */
  STRIP_H: 21,
  /** the field the eight columns are spread across, as fractions across */
  SPAN: [0.075, 0.925],
  /** the brass bead, in from every edge */
  BEAD: 10,
  /** the backplane itself, in metres */
  PLATE: { W: 0.66, H: 0.84 },
  /**
   * …and the canvas it is painted on, which is that shape and not a convenient
   * one. A plate 0.79 as wide as it is tall painted on a canvas 0.86 as wide
   * stretches every circle on it into an ellipse — invisible on a bolt head,
   * plain on the scorch ring round the supply lamp.
   */
  CANVAS: [384, 488],
  /** the supply lamp, which sits below the guard rather than behind it */
  PILOT: [0.82, 0.912],
  /** where the guard's rails run, and how far down its wires reach */
  RAILS: [0.03, 0.315, 0.58, 0.845],
  /** sockets standing empty — a valve pulled and not yet replaced */
  EMPTY: [5, 12, 18],
  /**
   * The stages wired live, and which of them are carrying.
   *
   * `[socket, carrying]`, in reading order across the decks, and it is the
   * exact shape the patch cords used to hand to `usePilotLamps`: a carrying
   * stage sits hot and drops out for a moment the way a relay chatters, an idle
   * one sits cold and strikes when something passes through it.
   */
  STAGE: [
    [1, true], [3, false], [6, true], [9, true],
    [14, false], [16, true], [20, false], [22, true],
  ],
};

/** The centre of column `c`, as a fraction across the plate. */
export const rackCol = (c) => RACK.SPAN[0]
  + (RACK.SPAN[1] - RACK.SPAN[0]) * ((c + 0.5) / RACK.COLS);

/** The boundary between columns `c-1` and `c` — where a guard wire goes. */
export const rackGap = (c) => RACK.SPAN[0]
  + (RACK.SPAN[1] - RACK.SPAN[0]) * (c / RACK.COLS);

/** The designation strip labelling the row that stands on shelf `r`. */
export const rackStrip = (r) => RACK.SHELVES[r] - RACK.VALVE_H - RACK.STRIP_GAP;

export const valveRackPlate = () => bake('valverack:plate', ...RACK.CANVAS, (ctx, w, h) => {
  const rnd = seeded(0x9ac);

  // ── the field ──────────────────────────────────────────────────────────────
  // Crackle-finish panel enamel, the standard for instrument work of the period
  // and the reason the brass reads at all.
  ctx.fillStyle = CAST;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3400; i += 1) {
    ctx.globalAlpha = 0.05 + rnd() * 0.14;
    ctx.fillStyle = rnd() > 0.5 ? '#3a3227' : '#12100c';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // and the crazing itself: hairlines that wander and stop, which is what tells
  // crackle enamel from noise
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#0d0b08';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 90; i += 1) {
    let x = rnd() * w;
    let y = rnd() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3 + Math.floor(rnd() * 4); k += 1) {
      x += (rnd() - 0.5) * 34;
      y += (rnd() - 0.5) * 34;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── the brass bead ─────────────────────────────────────────────────────────
  // One raised line round the field, with its own shadow inside it. It is the
  // only thing on the plate allowed to be bright, and it is what makes
  // everything within it read as recessed.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 3;
  ctx.strokeRect(RACK.BEAD, RACK.BEAD, w - RACK.BEAD * 2, h - RACK.BEAD * 2);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#0e0c08';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(RACK.BEAD + 3, RACK.BEAD + 3, w - RACK.BEAD * 2 - 6, h - RACK.BEAD * 2 - 6);
  ctx.globalAlpha = 1;

  // ── the ledgers ────────────────────────────────────────────────────────────
  // The rails each deck is bolted to. A shelf meeting the backplane along a
  // bare line is a shelf floating in front of it; a rail with a bolt row down
  // it is how the thing is actually held up, and it is the one place this
  // painting is allowed to say something structural.
  //
  // Deliberately not a shadow. The decks are geometry standing in real light,
  // and painting their darkness in as well is the doubled-shading fault this
  // file opens by warning about.
  for (const shelf of RACK.SHELVES) {
    const y = h * shelf;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#191510';
    ctx.fillRect(w * 0.05, y - 11, w * 0.9, 12);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4a4133';
    ctx.fillRect(w * 0.05, y - 11, w * 0.9, 2.2);
    ctx.globalAlpha = 1;
    for (let c = 0; c < RACK.COLS; c += 1) {
      const bx = w * rackCol(c);
      ctx.fillStyle = '#0b0906';
      ctx.beginPath(); ctx.arc(bx, y - 5, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#584e3d';
      ctx.beginPath(); ctx.arc(bx, y - 5.9, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── the designation strips ─────────────────────────────────────────────────
  // A cream field over each row of valves, engraved rather than printed, with
  // the stage numbering struck into it. Each sits in a shallow rebate: a dark
  // line above it and a lighter one below, and that pair is the whole of why a
  // strip reads as let into the panel rather than stuck onto it.
  for (let r = 0; r < RACK.SHELVES.length; r += 1) {
    // `rackStrip` gives the top of the rebate; the cream sits two pixels in.
    const y = h * rackStrip(r) + 2;
    const sx = w * RACK.SPAN[0];
    const sw = w * (RACK.SPAN[1] - RACK.SPAN[0]);
    const sh = RACK.STRIP_H - 4;
    ctx.fillStyle = '#0c0a07';
    ctx.fillRect(sx - 2, y - 2, sw + 4, RACK.STRIP_H);
    ctx.fillStyle = LEGEND;
    ctx.fillRect(sx, y, sw, sh);
    // the strip's own age: celluloid that has yellowed unevenly
    for (let i = 0; i < 70; i += 1) {
      ctx.globalAlpha = 0.05 + rnd() * 0.12;
      ctx.fillStyle = rnd() > 0.5 ? '#5b533f' : '#a49a7e';
      ctx.beginPath();
      ctx.arc(sx + rnd() * sw, y + rnd() * sh, 1 + rnd() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#514a3c';
    ctx.fillRect(sx, y + sh - 5, sw, 5);
    ctx.globalAlpha = 1;
    // the divisions, one per valve, and a struck mark in each
    ctx.fillStyle = '#2a2318';
    for (let c = 1; c < RACK.COLS; c += 1) {
      ctx.fillRect(sx + (sw * c) / RACK.COLS, y, 1.3, sh);
    }
    ctx.globalAlpha = 0.78;
    for (let c = 0; c < RACK.COLS; c += 1) {
      const cx = sx + (sw * (c + 0.5)) / RACK.COLS;
      ctx.fillRect(cx - 6, y + 5, 5 + rnd() * 6, 4);
    }
    ctx.globalAlpha = 1;
  }

  // ── the mimic ──────────────────────────────────────────────────────────────
  // The band under the bottom deck carries an engraved schematic of what the
  // rack amplifies: stages, and the path between them. It is the one place in
  // this scene where the site's own subject is drawn rather than implied, and
  // it is engraved rather than printed because everything else on a cast panel
  // of this date is.
  const my = h * 0.855;
  const mh = h * 0.115;
  const mx = w * 0.08;
  const mw = w * 0.6;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#0d0b08';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx, my, mw, mh);
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#7d7156';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 1.5, my + 1.5, mw - 3, mh - 3);
  ctx.globalAlpha = 1;

  const nodes = [
    [0.12, 0.28], [0.36, 0.72], [0.5, 0.18], [0.68, 0.64], [0.88, 0.34],
  ].map(([nx, ny]) => [mx + nx * mw, my + ny * mh]);
  // An engraved line is a dark groove with a lit lower lip. Two strokes, one
  // pixel apart — the same trick every struck mark on this panel uses, and the
  // reason the schematic reads as cut into the metal rather than drawn on it.
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 4], [1, 3], [0, 2]]) {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#0d0b08';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(nodes[a][0], nodes[a][1]);
    ctx.lineTo(nodes[b][0], nodes[b][1]);
    ctx.stroke();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = '#9b9070';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(nodes[a][0], nodes[a][1] + 1.5);
    ctx.lineTo(nodes[b][0], nodes[b][1] + 1.5);
    ctx.stroke();
  }
  for (const [nx, ny] of nodes) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#0d0b08';
    ctx.beginPath(); ctx.arc(nx, ny, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = BRASS;
    ctx.beginPath(); ctx.arc(nx, ny, 2.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── the supply lamp's socket ───────────────────────────────────────────────
  // One bezelled hole beside the mimic, and nothing lit painted into it. The
  // lamp itself is geometry with a live emissive, so what belongs here is only
  // the hole it sits in — a dark socket with a brass ring and the scorch a hot
  // bulb leaves on the enamel around it. Paint a glow in as well and the lamp
  // would be permanently half-on whatever the rack is doing.
  {
    const cx = w * RACK.PILOT[0];
    const cy = h * RACK.PILOT[1];
    const scorch = ctx.createRadialGradient(cx, cy, 0, cx, cy, 21);
    scorch.addColorStop(0, 'rgba(10,8,5,0.5)');
    scorch.addColorStop(1, 'rgba(10,8,5,0)');
    ctx.fillStyle = scorch;
    ctx.fillRect(cx - 21, cy - 21, 42, 42);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0a0806';
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  }

  // ── the corner fixings ─────────────────────────────────────────────────────
  for (const [fx, fy] of [[19, 19], [w - 19, 19], [19, h - 19], [w - 19, h - 19]]) {
    ctx.fillStyle = '#100e0a';
    ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d5342';
    ctx.beginPath(); ctx.arc(fx, fy, 4.6, 0, Math.PI * 2); ctx.fill();
    // the screwdriver slot, so it is a screw rather than a stud
    ctx.strokeStyle = '#171309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx - 3, fy - 1.2); ctx.lineTo(fx + 3, fy + 1.2);
    ctx.stroke();
  }

  // ── the grime ──────────────────────────────────────────────────────────────
  // Last, over everything, heaviest at the bottom: a panel someone has had
  // their hands on for forty years. Without it the strips and the mimic read as
  // freshly made, which is the one thing this room is not.
  const soot = ctx.createLinearGradient(0, h, 0, h * 0.45);
  soot.addColorStop(0, 'rgba(9,7,5,0.26)');
  soot.addColorStop(1, 'rgba(9,7,5,0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, w, h);
});


// ── the punched tape ─────────────────────────────────────────────────────────
// The pale thing on the bench, and the only object on this floor that is paper.
// It is what the desk lamp is pointed at, which is the whole reason it earns a
// place: the lamp has been throwing a pool onto an empty slab, and a lamp lights
// *something* or it is an ornament.
//
// ── it is drawn bigger than it was ──────────────────────────────────────────
// A real eight-track tape is an inch across. At this room's metre that is eight
// scene pixels — four on screen, a thread. So the tape is 6 cm wide, two and a
// half times life size, and the same call the landing terminal's typeface had to
// make for the same reason. What is *not* stretched is the proportion: nine hole
// positions across the width against a row pitch a tenth of it, which is the
// ratio a real tape has, so it still reads as tape rather than as ribbon.
//
// The tile is 48 rows tall and the rows divide it exactly, because this canvas
// repeats along a strip nearly a metre long — a row pitch that does not close
// puts a visible seam every third of a metre.

const TAPE = {
  /** nine hole positions: three tracks, the sprocket, then five more */
  SLOTS: 9,
  /** where the sprocket sits among them */
  SPROCKET: 3,
  ROWS: 48,
  /** the tile, at ten pixels to a row */
  CANVAS: [96, 480],
};

export const punchTape = () => bake('bench:tape', ...TAPE.CANVAS, (ctx, w, h) => {
  const rnd = seeded(0x7a9e);
  const pitch = h / TAPE.ROWS;
  const slot = (i) => (w * (i + 0.5)) / TAPE.SLOTS;

  // ── the paper ──────────────────────────────────────────────────────────────
  // Oiled manila, not white. A tape painted at the value paper is in daylight
  // is the brightest thing in the room by a factor of four and stands under the
  // page's own heading — the post box's lesson, and it applies to anything pale
  // down here.
  ctx.fillStyle = '#6b6047';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i += 1) {
    ctx.globalAlpha = 0.04 + rnd() * 0.1;
    ctx.fillStyle = rnd() > 0.5 ? '#80745a' : '#4e452f';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the edges, which are where a tape gets handled and where it darkens first
  for (const [ex, dir] of [[0, 1], [w, -1]]) {
    const edge = ctx.createLinearGradient(ex, 0, ex + dir * 11, 0);
    edge.addColorStop(0, 'rgba(24,19,12,0.5)');
    edge.addColorStop(1, 'rgba(24,19,12,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(Math.min(ex, ex + dir * 11), 0, 11, h);
  }

  // ── the perforation ────────────────────────────────────────────────────────
  // A hole is a hole: nothing behind this tape is lit, so a punched hole is the
  // darkest thing on the strip and needs no more than that. What it does need
  // is the lit lower lip — a punch leaves a burr that catches the light, and it
  // is the only reason a grid of black dots reads as *through* the paper rather
  // than printed on it.
  //
  // The data is drawn to look like text rather than noise: the high bit is
  // mostly clear, one track is almost always set, and there are blank rows.
  // Nobody will decode it and everybody would feel a field of coin flips.
  for (let r = 0; r < TAPE.ROWS; r += 1) {
    const y = (r + 0.5) * pitch;
    const blank = rnd() < 0.09;
    for (let s = 0; s < TAPE.SLOTS; s += 1) {
      const sprocket = s === TAPE.SPROCKET;
      if (!sprocket && blank) continue;
      const bias = [0.62, 0.5, 0.55, 0, 0.7, 0.44, 0.5, 0.86, 0.14][s];
      if (!sprocket && rnd() > bias) continue;
      const cx = slot(s);
      const rad = sprocket ? pitch * 0.17 : pitch * 0.32;
      ctx.fillStyle = '#0d0a07';
      ctx.beginPath(); ctx.arc(cx, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#9a8d6d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, y + 0.7, rad, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── what it has been through ───────────────────────────────────────────────
  // Creases across it, and the oil it picked up off the bench. Both run *across*
  // the tape, because that is the only way a strip this narrow can be folded or
  // dragged.
  for (let i = 0; i < 7; i += 1) {
    const y = rnd() * h;
    ctx.globalAlpha = 0.16 + rnd() * 0.2;
    ctx.strokeStyle = '#241d12';
    ctx.lineWidth = 0.9 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (rnd() - 0.5) * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i += 1) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = 8 + rnd() * 22;
    const oil = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    oil.addColorStop(0, 'rgba(30,23,13,0.3)');
    oil.addColorStop(1, 'rgba(30,23,13,0)');
    ctx.fillStyle = oil;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
});

/** How long one tile of the tape is, as a multiple of its width. */
export const TAPE_ASPECT = TAPE.CANVAS[1] / TAPE.CANVAS[0];


// ── the workbench ────────────────────────────────────────────────────────────
// The bench top is the one horizontal surface in this room the eye can measure
// against, so it is also the surface most worth painting: it faces the pendant
// squarely, which means it is the only prop face where the *lamp* is the
// brighter term and the artwork under it is genuinely graded rather than
// flooded. Everything a bench top accumulates — saw cuts, burns, oil, the
// bruising round the vice — reads.

export const benchTop = () => bake('bench:top', 512, 224, (ctx, w, h) => {
  const rnd = seeded(0xbe27);
  // beech, darkened right through by forty years of oil rather than stained
  ctx.fillStyle = '#4a3722';
  ctx.fillRect(0, 0, w, h);

  // laminated from staves, the way a real bench top is — the joints run its
  // length and are the first thing that says "bench" rather than "plank"
  const staves = 7;
  const pitch = h / staves;
  for (let i = 0; i < staves; i += 1) {
    const y = i * pitch;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ['#523c25', '#46331e', '#59422a', '#3f2e1c'][i % 4];
    ctx.fillRect(0, y, w, pitch);
    ctx.globalAlpha = 1;
    // the glue line
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#2a1d10';
    ctx.fillRect(0, y, w, 1.4);
    ctx.globalAlpha = 1;
    for (let g = 0; g < 30; g += 1) {
      const gy = y + rnd() * pitch;
      ctx.globalAlpha = 0.05 + rnd() * 0.13;
      ctx.strokeStyle = rnd() > 0.5 ? '#3a2a17' : '#7d6440';
      ctx.lineWidth = 0.6 + rnd() * 1.4;
      ctx.beginPath();
      ctx.moveTo(-4, gy);
      ctx.bezierCurveTo(w * 0.35, gy + (rnd() - 0.5) * 4, w * 0.65, gy + (rnd() - 0.5) * 4, w + 4, gy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // saw cuts and chisel scores, across the staves rather than along them —
  // which is how they happen, and how they read as use rather than as grain
  for (let i = 0; i < 40; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 8 + rnd() * 60;
    const a = (rnd() - 0.5) * 0.7 + Math.PI / 2;
    ctx.globalAlpha = 0.16 + rnd() * 0.3;
    ctx.strokeStyle = '#241809';
    ctx.lineWidth = 0.7 + rnd() * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // oil, burns and the dark ring where things have stood
  for (let i = 0; i < 34; i += 1) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = 6 + rnd() * 46;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const dark = rnd() > 0.35;
    g.addColorStop(0, dark ? 'rgba(24,15,6,0.46)' : 'rgba(96,77,48,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // the bruising along the front edge, where every job gets clamped
  const front = ctx.createLinearGradient(0, h, 0, h - 26);
  front.addColorStop(0, 'rgba(20,13,6,0.5)');
  front.addColorStop(1, 'rgba(20,13,6,0)');
  ctx.fillStyle = front;
  ctx.fillRect(0, 0, w, h);
});

// ── the workbench's ironwork ─────────────────────────────────────────────────
// The reference's bench is not a timber bench with iron legs: it is a *riveted
// frame* with a slab dropped into it. Every horizontal member — the apron under
// the slab, the bottom rail the shelf sits on, the drawer fronts — is the same
// article: a rolled plate with a brass strip along each arris and a row of
// domed bolts down the middle of it. That row is what the eye reads the bench
// by at this distance; without it the bench is three dark rectangles.
//
// So it is one bake with a bolt count, used at three sizes, rather than three
// bakes saying the same thing. The bolts are painted rather than instanced
// because they sit on a face the pendant only grazes: a dome there is half a
// pixel of highlight, where a painted one keeps its brass whatever the angle.
// The arrises are the opposite case and stay geometry — see the strips the
// bench builds along the slab.

const BENCH_IRON = '#251c12';
const BENCH_BRASS = '#7d5c26';

/** One domed bolt head, lit from the upper left like everything else in here. */
const boltHead = (ctx, x, y, r) => {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#a8823a');
  g.addColorStop(0.55, '#6d5122');
  g.addColorStop(1, '#2a1f10');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // the shadow it drops onto the plate, which is most of why it reads as proud
  ctx.fillStyle = 'rgba(10,6,2,0.55)';
  ctx.beginPath();
  ctx.arc(x + r * 0.28, y + r * 0.34, r * 0.92, 0.2, 2.3);
  ctx.fill();
};

// What the bench's iron is made of, as `metalWear` states a metal: bare steel
// under the finish, the oxide that comes out of it, and what a rubbed patch
// comes up as. One object, so the frame, the drawers and the chest are visibly
// the same alloy however differently each of them has been used.
const BENCH_METAL = { dark: '#140d06', rust: '#6b3d18', light: '#8d7043' };

/**
 * A riveted member of the bench frame: the apron, the bottom rail and the end
 * brackets are all this plate at different lengths.
 *
 * @param {number} bolts how many heads across the run
 * @param {number} [seed] so two members standing one above the other do not
 *   carry pixel-identical pitting
 */
export const benchBand = (bolts, seed = 0) => bake(
  `bench:band:${bolts}:${seed}`, 1024, 64, (ctx, w, h) => {
    ctx.fillStyle = BENCH_IRON;
    ctx.fillRect(0, 0, w, h);

    // the plate's own slight crown, so it is not a flat rectangle of one value
    const crown = ctx.createLinearGradient(0, 0, 0, h);
    crown.addColorStop(0, 'rgba(80,62,36,0.30)');
    crown.addColorStop(0.42, 'rgba(80,62,36,0.06)');
    crown.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = crown;
    ctx.fillRect(0, 0, w, h);

    // Where this member has been used: its own rim, worse toward the bottom
    // edge where water sits, and worst along the line of bolts — a fastening is
    // a place damp gets in, which is why every real plate weeps from its heads
    // rather than from its middle.
    metalWear(ctx, w, h, {
      ...BENCH_METAL,
      seed: 0xb1a5 + bolts * 977 + seed * 31,
      field: mix(
        FIELD.edges(0.9, 0.26),
        FIELD.bottom(0.45),
        FIELD.band(0.5, 0.53, 0.1),
        FIELD.blotches(0.35, 6, seed + 3),
      ),
      pit: 2.6,
      bloom: 14,
      // along the run, because a rolled section is finished along its length
      scratch: 26,
      scratchAngle: 0,
      scratchSpread: 0.16,
      polish: 6,
      streaks: 10,
      grime: 0.85,
    });

    // the brass strip along each arris — the bench's brightest line, and the
    // one that draws its silhouette out of the dark room behind it
    for (const [y, t] of [[0, h * 0.1], [h - h * 0.085, h * 0.085]]) {
      const strip = ctx.createLinearGradient(0, y, 0, y + t);
      strip.addColorStop(0, '#a37c34');
      strip.addColorStop(0.5, BENCH_BRASS);
      strip.addColorStop(1, '#3d2c11');
      ctx.fillStyle = strip;
      ctx.fillRect(0, y, w, t);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, h * 0.1, w, 1.6);
    ctx.fillRect(0, h - h * 0.085 - 1.6, w, 1.6);

    // the plate joints: a member this long is two or three plates, and the butt
    // lines are the only vertical incident on the whole run
    for (const f of [0.34, 0.68]) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(w * f, h * 0.1, 1.8, h * 0.8);
      ctx.fillStyle = 'rgba(140,110,62,0.16)';
      ctx.fillRect(w * f + 1.8, h * 0.1, 1.2, h * 0.8);
    }

    for (let i = 0; i < bolts; i += 1) {
      boltHead(ctx, (w * (i + 0.5)) / bolts, h * 0.53, h * 0.115);
    }
  },
);

/**
 * One drawer front: the same plate, with the sunk panel a drawer has and a bolt
 * at each corner of it. The bail handle is geometry — a strap standing off the
 * face is the one part of a drawer with a silhouette.
 */
export const drawerFace = () => bake('bench:drawer', 384, 96, (ctx, w, h) => {
  ctx.fillStyle = BENCH_IRON;
  ctx.fillRect(0, 0, w, h);
  // A drawer is worn where it is *pulled*, and that is the one place on it that
  // gets brighter rather than darker — an arc of burnished metal under the bail
  // where forty years of thumbs have taken the finish back to steel. The rim
  // and the bottom edge get the ordinary treatment underneath it.
  metalWear(ctx, w, h, {
    ...BENCH_METAL,
    seed: 0xd7a4,
    field: mix(
      FIELD.edges(0.7, 0.2),
      FIELD.bottom(0.3),
      FIELD.around(0.95, 0.5, 0.6, 0.34),
    ),
    pit: 1.6,
    bloom: 6,
    scratch: 14,
    scratchAngle: 0,
    scratchSpread: 0.5,
    polish: 16,
    grime: 0.5,
  });

  // the sunk panel: a groove with a lit lip inside it, which is the whole of
  // how a pressed panel reads
  const inset = h * 0.14;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(150,118,66,0.28)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(inset + 2.2, inset + 2.2, w - inset * 2 - 4.4, h - inset * 2 - 4.4);

  const face = ctx.createLinearGradient(0, inset, 0, h - inset);
  face.addColorStop(0, 'rgba(96,74,42,0.20)');
  face.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = face;
  ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2);

  for (const [bx, by] of [[0.07, 0.16], [0.93, 0.16], [0.07, 0.84], [0.93, 0.84]]) {
    boltHead(ctx, w * bx, h * by, h * 0.062);
  }
  const strip = ctx.createLinearGradient(0, 0, 0, h * 0.055);
  strip.addColorStop(0, '#9c7631');
  strip.addColorStop(1, '#3a2a10');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, w, h * 0.055);
});

/**
 * The tool chest that lives on the bench's lower shelf.
 *
 * It is the one object under there with any value at all — the shelf is the
 * darkest place in the room — so the panel is painted a shade lighter than the
 * frame around it and carries the strapping and the two lid catches. Mykolai
 * named it and the lamp as the two things about the reference that had to
 * survive whatever else got simplified.
 */
export const chestPanel = () => bake('bench:chest', 256, 160, (ctx, w, h) => {
  ctx.fillStyle = '#31261a';
  ctx.fillRect(0, 0, w, h);
  // A box that gets carried and dropped: the corners go first, the lid seam is
  // rubbed by opening, and it stands on a shelf so its bottom rots. Scratched
  // across rather than along — a chest is dragged off a shelf sideways.
  metalWear(ctx, w, h, {
    ...BENCH_METAL,
    seed: 0xc4e5,
    field: mix(
      FIELD.edges(1.1, 0.24),
      FIELD.bottom(0.55),
      FIELD.band(0.4, 0.34, 0.07),
    ),
    pit: 3,
    bloom: 12,
    scratch: 20,
    scratchAngle: Math.PI / 2,
    scratchSpread: 0.6,
    polish: 10,
    streaks: 8,
    grime: 0.7,
  });

  // the lid seam, a third of the way down
  const lid = h * 0.34;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, lid, w, 3);
  ctx.fillStyle = 'rgba(148,116,64,0.22)';
  ctx.fillRect(0, lid + 3, w, 1.6);

  // the strapping: two bands round the body, with a catch straddling the seam
  for (const f of [0.24, 0.76]) {
    const x = w * f - w * 0.035;
    const band = ctx.createLinearGradient(x, 0, x + w * 0.07, 0);
    band.addColorStop(0, 'rgba(0,0,0,0.4)');
    band.addColorStop(0.4, 'rgba(122,94,46,0.5)');
    band.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = band;
    ctx.fillRect(x, 0, w * 0.07, h);
    boltHead(ctx, w * f, h * 0.12, 4.4);
    boltHead(ctx, w * f, h * 0.9, 4.4);
    ctx.fillStyle = '#8a6a2c';
    ctx.fillRect(x + w * 0.008, lid - h * 0.07, w * 0.054, h * 0.15);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + w * 0.008, lid + h * 0.055, w * 0.054, 2.4);
  }

  // the corner protectors
  ctx.fillStyle = 'rgba(126,96,48,0.4)';
  for (const [cx, cy] of [[0, 0], [w - 16, 0], [0, h - 16], [w - 16, h - 16]]) {
    ctx.fillRect(cx, cy, 16, 3);
    ctx.fillRect(cx, cy, 3, 16);
  }
});

// ── the wall screen's frame ──────────────────────────────────────────────────
// Painted to Mykolai's reference, with one deliberate departure from it: the
// band is a good deal narrower. He liked the frame and said the width was the
// one thing he did not — "мне только не нравятся сильно широкие рамки" — and
// chose a band about two thirds of the reference's rather than half, so there
// is still room for a step and a rail to sit in.
//
// The split between what is here and what is geometry follows the same rule as
// everywhere else in this file: **form is geometry, surface is paint.** The
// corner blocks, the rails, the vents and the stepped lip are meshes, because
// their whole contribution is catching the pendant along one edge and dropping
// a shadow off the other, and no painting does that. What is baked is what a
// mesh cannot be: the pitting, the thin paint on the arrises, the grime that
// gathers along the bottom of anything bolted to a wall for forty years.

/**
 * One length of the frame's own band, as a tile that repeats along its run.
 *
 * A strip rather than a fitted texture, because the four members are different
 * lengths and a fitted one would need four bakes to say the same thing. The
 * grain runs across the band, which is how a rolled section is finished, so the
 * repeat direction is the only one the eye can check and it is the one that
 * carries no incident.
 */
export const frameBand = () => bake('screen:band', 128, 64, (ctx, w, h) => {
  const rnd = seeded(0xf7a3);

  ctx.fillStyle = '#2b2620';
  ctx.fillRect(0, 0, w, h);

  // the rolling marks: fine lines across the section, never quite parallel
  for (let i = 0; i < 130; i += 1) {
    const y = rnd() * h;
    ctx.globalAlpha = 0.04 + rnd() * 0.12;
    ctx.strokeStyle = rnd() > 0.5 ? '#181410' : '#4a4238';
    ctx.lineWidth = 0.6 + rnd() * 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, y);
    ctx.bezierCurveTo(w * 0.35, y + (rnd() - 0.5) * 2, w * 0.7, y + (rnd() - 0.5) * 2, w + 2, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // the pitting, heavier toward the lower edge where water sits
  for (let i = 0; i < 1500; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    if (rnd() > 0.25 + (y / h) * 0.75) continue;
    ctx.globalAlpha = 0.1 + rnd() * 0.4;
    ctx.fillStyle = rnd() > 0.35 ? '#141009' : '#6a4322';
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The arrises. A member gets handled, and the paint goes thin on the two
  // edges that stand proud — that is surface, not shading: the metal under it
  // is genuinely showing. Kept to two pixels, so it reads as an edge rather
  // than as a light on one.
  for (const y of [0, h - 2]) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#6e6353';
    ctx.fillRect(0, y, w, 2);
  }
  ctx.globalAlpha = 1;

  // and the grime along the bottom
  const dirt = ctx.createLinearGradient(0, h, 0, h * 0.5);
  dirt.addColorStop(0, 'rgba(10,8,5,0.4)');
  dirt.addColorStop(1, 'rgba(10,8,5,0)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, w, h);
});

/**
 * The face of one control-panel button.
 *
 * Lettering, and this file's own rule says lettering in a texture is how a
 * scene loses its typography. The exception is deliberate and narrow: this is a
 * *legend on a machine*, struck into a control plate, in the same class as the
 * crate's sprayed stencil and the patch bay's designation strips. It is not the
 * building's signage and it is not the page's — those stay in the DOM, where
 * they can be selected, read by a screen reader and rendered at the display's
 * own resolution.
 *
 * @param {string} label @param {'left' | 'right' | 'mark' | null} glyph
 */
// ── the console's buttons ────────────────────────────────────────────────────
// Two canvases per control, and the split is the whole of what was wrong with
// the first cut. That one baked the plate, the bead, the bolts and the legend
// into a single picture and then handed the *whole picture* through as an
// `emissiveMap` — so the swell that was meant to say "this legend is lit" lit
// the button's paintwork, its bolts and its grime along with it, and Mykolai's
// verdict on the result was the correct one. An illuminated pushbutton has a
// lamp behind its legend, not behind its face.
//
// So `buttonFace` is the albedo — what the plate looks like with the lamp out —
// and `buttonLegend` is a black canvas with nothing on it but the mark that
// lights. Only the second one goes to `emissiveMap`. The two are baked from one
// `strike` so the lit mark and the engraved one cannot fall out of register.
//
// ── and why grey ─────────────────────────────────────────────────────────────
// Everything else on this panel is the scene's iron: warm, dark, corroded, and
// stated as such all through `SURFACES`. Mykolai asked for the buttons to sit
// *outside* that — «серый оттенок, чтобы он выбивался из общей концепции» —
// and the reason it works rather than looking like a mistake is that it is the
// same distinction a real panel makes. The case is painted ironwork; the
// controls are a different component, bought in, moulded in a pale grey
// phenolic, and forty years of thumbs have polished them paler still. A grey
// cap on a warm panel reads as a *part*, which is exactly the cue that it is
// the part you touch.
// **Cool grey, not neutral grey**, and the reason is the room rather than the
// part. Every light on this landing is amber — the pendant at `#ffd29e`, the
// bounce at `#fff3e6` — and `landingChroma` runs at 1.6, so a *neutral* albedo
// comes back off this wall as warm olive: the first cut of this was grey in the
// bake and yellow on the panel. To read as grey under that light the pigment
// has to lean the other way, which is the same trick `SURFACES.steel` already
// plays as the one cool entry in that catalogue.
const CAP = '#7a7d81';
const CAP_HI = '#a7abaf';
const CAP_LO = '#2b2e30';
const CAP_INK = '#121417';

/** Where a legend sits, so the albedo and the lit mask cannot drift apart. */
const strike = (ctx, w, label, glyph) => {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 38px "Space Mono", "Consolas", monospace';
  const cx = w / 2 + (glyph === 'left' ? 14 : 0) + (glyph === 'right' ? -14 : 0);
  const arrow = (glyph === 'left' || glyph === 'right')
    ? { s: glyph === 'left' ? -1 : 1, x: w / 2 + (glyph === 'left' ? -1 : 1) * (w * 0.32) }
    : null;
  return { cx, arrow };
};

/** The arrow, drawn rather than set: a font glyph at this size is a different
 *  weight from the label beside it. */
const arrowPath = (ctx, ax, s, y) => {
  ctx.beginPath();
  ctx.moveTo(ax + s * 11, y);
  ctx.lineTo(ax - s * 8, y - 12);
  ctx.lineTo(ax - s * 8, y + 12);
  ctx.closePath();
};

/**
 * The cap's own face — pale phenolic, its bead, its bolts and its thumb wear.
 * No light in it: this is what the button looks like with the lamp out.
 */
export const buttonFace = (label, glyph = null) => bake(
  `screen:button:${label}`, 256, 96, (ctx, w, h) => {
    const rnd = seeded(0xb77 + label.length * 31);

    ctx.fillStyle = CAP;
    ctx.fillRect(0, 0, w, h);
    // moulded, not cast: a fine even speckle rather than the granular crust an
    // iron surface in this scene carries
    for (let i = 0; i < 900; i += 1) {
      ctx.globalAlpha = 0.04 + rnd() * 0.1;
      ctx.fillStyle = rnd() > 0.5 ? CAP_HI : CAP_LO;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 0.5 + rnd() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // the bead round the plate, and the bolt in each corner
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = CAP_LO;
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.globalAlpha = 1;
    for (const [bx, by] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) {
      ctx.fillStyle = '#1c1f21';
      ctx.beginPath(); ctx.arc(bx, by, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#767c80';
      ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, Math.PI * 2); ctx.fill();
    }

    // The legend, struck: a dark groove with a lit lower lip, which is the same
    // two-stroke trick every engraved mark in this file uses. It is *engraved*
    // here and *lit* in `buttonLegend`; both, so the label is still legible on
    // a control that has nothing to offer and never lights at all.
    const { cx, arrow } = strike(ctx, w, label, glyph);
    ctx.fillStyle = CAP_INK;
    ctx.fillText(label, cx, h / 2 - 1);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = CAP_HI;
    ctx.fillText(label, cx, h / 2 + 2);
    ctx.globalAlpha = 1;
    if (arrow) {
      ctx.fillStyle = CAP_INK;
      arrowPath(ctx, arrow.x, arrow.s, h / 2);
      ctx.fill();
    }

    // the wear where a thumb has been, which is the whole reason a button on a
    // forty-year-old panel does not look like a rendered rectangle. On a pale
    // cap it goes the other way from the iron in this file: use *polishes* a
    // moulded surface and leaves grime in the bead round it.
    const thumb = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.4);
    thumb.addColorStop(0, 'rgba(198,206,211,0.2)');
    thumb.addColorStop(1, 'rgba(198,206,211,0)');
    ctx.fillStyle = thumb;
    ctx.fillRect(0, 0, w, h);
    metalWear(ctx, w, h, {
      seed: 0xb77 + label.length * 31,
      field: mix(FIELD.edges(0.85, 0.16), FIELD.bottom(0.3)),
      dark: '#26292b',
      rust: '#4a4239',
      light: '#c3c9cd',
      pit: 1.6,
      polish: 2,
      grime: 0.25,
    });
  },
);

/**
 * The same button's lit mark, and nothing else. Black everywhere the lamp does
 * not reach, which — this being an `emissiveMap` and nothing else — means the
 * swell has no way to reach the paintwork.
 */
export const buttonLegend = (label, glyph = null) => bake(
  `screen:legend:${label}`, 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    const { cx, arrow } = strike(ctx, w, label, glyph);
    // A struck legend on a lit button is a *window*: the mark is cut through
    // the paint and the lamp behind it comes out of the cut. So it is drawn at
    // full white and the colour is decided by the material's `emissive`, the
    // way every other lamp in this scene has its colour decided.
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, cx, h / 2);
    if (arrow) {
      arrowPath(ctx, arrow.x, arrow.s, h / 2);
      ctx.fill();
    }
    // the light bleeding into the plate around the cut, which is what stops a
    // lit legend reading as white text pasted on grey
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(6px)';
    ctx.fillText(label, cx, h / 2);
    if (arrow) {
      arrowPath(ctx, arrow.x, arrow.s, h / 2);
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  },
);

/**
 * The counter plate above the glass — the small window a machine of this period
 * shows its own position in.
 */
export const counterPlate = (text) => bake(`screen:counter:${text}`, 256, 88, (ctx, w, h) => {
  const rnd = seeded(0xc07);
  ctx.fillStyle = '#17130e';
  ctx.fillRect(0, 0, w, h);
  // the recess it sits in
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(10, 12, w - 20, h - 24);
  for (let i = 0; i < 400; i += 1) {
    ctx.globalAlpha = 0.05 + rnd() * 0.1;
    ctx.fillStyle = rnd() > 0.5 ? '#2e281f' : '#000000';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#8a6a2e';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(10, 12, w - 20, h - 24);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 40px "Space Mono", "Consolas", monospace';
  ctx.fillStyle = '#0b0906';
  ctx.fillText(text, w / 2, h / 2 - 1);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#e0a95a';
  ctx.fillText(text, w / 2, h / 2 + 1);
  ctx.globalAlpha = 1;
});
