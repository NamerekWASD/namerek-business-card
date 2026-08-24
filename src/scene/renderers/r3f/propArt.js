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

/**
 * A small deterministic generator. A bake seeded off the clock is a prop that
 * is a different object on every load, and two machines looking at this scene
 * have to be looking at the same one.
 * @param {number} seed
 */
const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

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

// ── the patch bay ────────────────────────────────────────────────────────────
// The one prop that is about the site's own subject: a board of jacks with two
// of them bridged is, underneath the brass, a switched network. That idea was
// always there and always illegible, because the board was 132 scene pixels
// across — a smear of specks at the far end of a corridor. What it needed was
// not a different idea but the size to state the one it has.
//
// So it is a real distribution panel now: a cast case with a stepped bezel (the
// period's grammar is the step, per the styling system), a hinged door standing
// open, and the jack field inside it. This bakes the field's own backplate —
// the engraved designation strip and the ruled rows the jacks are drilled
// through. The jacks and the cords are geometry: a brass eyelet catches the
// light on its own and a painted dot never will, which is the same call the
// gate-versus-bolts note in `patterns.js` makes.

export const patchBayPlate = () => bake('patchbay:plate', 320, 384, (ctx, w, h) => {
  const rnd = seeded(0x9ac);
  // dark crackle-finish panel enamel, the standard for instrument work of the
  // period and the reason the brass reads at all
  ctx.fillStyle = '#241f18';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i += 1) {
    ctx.globalAlpha = 0.05 + rnd() * 0.14;
    ctx.fillStyle = rnd() > 0.5 ? '#3a3227' : '#12100c';
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the designation strips: a cream field between the rows of jacks, engraved
  // rather than printed, with the numbering struck into it
  const rows = 3;
  for (let r = 0; r < rows; r += 1) {
    const y = h * (0.145 + r * 0.29);
    ctx.fillStyle = '#8b8168';
    ctx.fillRect(w * 0.07, y, w * 0.86, 15);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#514a3c';
    ctx.fillRect(w * 0.07, y + 11, w * 0.86, 4);
    ctx.globalAlpha = 1;
    // the divisions, and a struck mark in each
    ctx.fillStyle = '#2a2318';
    for (let c = 1; c < 6; c += 1) ctx.fillRect(w * 0.07 + (w * 0.86 * c) / 6, y, 1.2, 15);
    ctx.globalAlpha = 0.75;
    for (let c = 0; c < 6; c += 1) {
      const cx = w * 0.07 + (w * 0.86 * (c + 0.5)) / 6;
      ctx.fillRect(cx - 7, y + 4, 6 + rnd() * 7, 4);
    }
    ctx.globalAlpha = 1;
  }

  // the corner fixings holding the plate into its case
  for (const [fx, fy] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) {
    ctx.fillStyle = '#100e0a';
    ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5d5342';
    ctx.beginPath(); ctx.arc(fx, fy, 4.4, 0, Math.PI * 2); ctx.fill();
    // the screwdriver slot, so it is a screw rather than a stud
    ctx.strokeStyle = '#171309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx - 3, fy - 1.2); ctx.lineTo(fx + 3, fy + 1.2);
    ctx.stroke();
  }
});

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
