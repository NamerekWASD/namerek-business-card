// ── the dimensions of the building ───────────────────────────────────────────
// Where things are and how big they are, with none of the drawing. A second
// renderer would keep every number in this file unchanged — that is the test
// for whether something belongs here.

import { CAM_ORIGIN_Y, CAM_PERSPECTIVE, SHAFT_DEPTH } from './camera.js';

/** @import { Shade } from './types.js' */

// ── the doorway ──────────────────────────────────────────────────────────────
// Fractions, not pixels: the opening is sized off the shaft, which is sized off
// the viewport.
export const DOORWAY_W_FRAC = 0.78; // of the shaft's width
export const DOORWAY_H_FRAC = 0.94; // of its height

// How far the masonry at the far end runs past the viewport, in viewports, so
// nothing pops in at ride speed.
export const BACK_OVERSCAN = 0.7;

// How far the architrave stands proud of the wall. The frame replaced a recessed
// niche: recessing the landing made the opening read as a window across a gap,
// and the dark piers flanking it were the gap. One continuous wall with the
// doorway standing out of it puts the far end of the shaft within reach.
export const ARCHITRAVE_DEPTH = 58;
export const ARCHITRAVE_MEMBER_W = 34;

// The setback: how the architrave steps out of the wall toward the opening.
// Four flat members standing at one depth is a picture frame, and a picture
// frame is the one profile the period never used on a doorway — everything from
// a cinema foyer to a substation door in the thirties stepped, because the
// setback was the whole grammar. Each tier is narrower than the one behind it
// and stands further proud, so the profile is a staircase running out to the
// opening. It costs geometry only: no new asset, no new texture.
//
// The tiers get their own shade because a step you cannot see the edge of is
// not a step. The proudest one catches most light, as it would.
/** @type {{ m: number, z: number, shade: Shade }[]} */
export const FRAME_TIERS = [
  { m: 1, z: 0.3, shade: 0.78 },
  { m: 0.66, z: 0.64, shade: 0.96 },
  { m: 0.36, z: 1, shade: 1.16 },
];

// Where the head of a floor's opening sits, in scene pixels, with the shaft at
// rest. The back wall, the doorways and the frames all have to agree about this
// to the pixel — they are three layers of the same hole — and each of them used
// to work it out for itself from the same four terms.
/** @param {number} vh @param {number} floorPitch @param {number} floor @returns {number} */
export const openingTop = (vh, floorPitch, floor) =>
  vh * CAM_ORIGIN_Y - (vh * DOORWAY_H_FRAC) / 2 - floor * floorPitch;

// How much deeper the landing sits than the shaft wall. It is a different room,
// so it gets its own depth, its own colour and its own light — sharing all three
// with the shaft is what made the far end read as one flat backdrop.
//
// It also decides where the arcade cabinet's front face ends up, and that turns
// out to matter for more than depth: the pendant hangs only 34px past the
// doorway threshold (see `pendantAt`), so a landing this shallow put the
// cabinet's face *nearer the camera than the light itself*. A surface can only
// be lit head-on by a source on the camera's side of it — with the light
// behind the face instead, the cabinet caught nothing but a graze from the
// side, however bright the fixture. Setting the landing back further than the
// light's own reach is what puts the light back in front of the machine.
export const LANDING_SETBACK = 678;

// How tall the arcade cabinet hangs, in scene pixels.
//
// Derived rather than dialled: the CSS cabinet is 324px tall drawn on the
// content layer, which is already scaled by the perspective divide at the
// doorway. Bolted to the landing wall — a further `LANDING_SETBACK` back — it
// has to be that much larger to cover the same height of screen. If the two
// backends are put side by side and the cabinet is the wrong size, this is the
// line that is wrong, and it can be checked with arithmetic rather than by eye.
export const CABINET_H = Math.round(
  (324 * (CAM_PERSPECTIVE + SHAFT_DEPTH + LANDING_SETBACK)) / CAM_PERSPECTIVE,
);

// ── the landing's pendant ──────────────────────────────────────────────────────
// A hanging lamp has one fixed end and one loose one, and the fixed one is the
// ceiling: the chain decides how far below it the shade ends up, never the
// other way round. So the ceiling line is stated on its own terms and the
// fixture is hung off it — take links out of the chain and the lamp rises,
// which is the only thing that reading `PENDANT_LINKS` could sanely mean.
//
// `PENDANT_HEAD_RISE` follows `PENDANT_SCALE` rather than standing beside it:
// where the chain lands is a fact about the casting the chain lands on, so
// shrinking the shade without shrinking the reach is precisely how the body
// came off the chain and hung in mid-air.
export const PENDANT_SCALE = 0.8;        // the shade assembly's own size
const SHADE_YOKE_SEAT = 51;              // yoke above the lamp's centre, at full size
export const PENDANT_HEAD_RISE = SHADE_YOKE_SEAT * PENDANT_SCALE;

// The chain, one link at a time. Consecutive links have to overlap by well
// over their own wall thickness — a pitch of one whole link leaves them merely
// stacked — which is what the 0.6 is for. `PENDANT_LINKS` is the knob: fewer
// links, shorter chain, higher lamp.
export const PENDANT_LINK_R = 7;         // across the eye
export const PENDANT_LINK_T = 2;         // its wall
export const PENDANT_LINK_STRETCH = 1.45; // ring drawn out into an oval
export const PENDANT_LINKS = 7;
export const PENDANT_LINK_PITCH =
  2 * (PENDANT_LINK_R + PENDANT_LINK_T) * PENDANT_LINK_STRETCH * 0.6 * PENDANT_SCALE;
export const PENDANT_DROP = PENDANT_LINKS * PENDANT_LINK_PITCH;

// The landing's ceiling line, and the floor's — short of the doorway's own
// head and sill, or the skirting and cornice have nothing to stand proud of.
// The clearance is the ceiling mount's own room: the chain stops short of the
// plaster and a canopy and stem bridge the rest.
export const LANDING_CEILING_RISE_FRAC = 0.075; // of vh, above the doorway head
export const LANDING_CEILING_CLEARANCE = 30;
export const LANDING_FLOOR_FRAC = 1; // of the doorway's own height

/** @param {number} vh @param {number} openingTopY */
export const landingCeilingY = (vh, openingTopY) =>
  openingTopY - vh * LANDING_CEILING_RISE_FRAC;

/** Where the topmost chain link actually ends up. @param {number} vh @param {number} openingTopY */
export const pendantChainTopY = (vh, openingTopY) =>
  landingCeilingY(vh, openingTopY) + LANDING_CEILING_CLEARANCE;

/** The lamp's own centre — the point the light comes from. @param {number} vh @param {number} openingTopY */
export const pendantAnchorY = (vh, openingTopY) =>
  pendantChainTopY(vh, openingTopY) + PENDANT_DROP + PENDANT_HEAD_RISE;

/** @param {number} vh @param {number} openingTopY */
export const landingFloorY = (vh, openingTopY) =>
  openingTopY + vh * DOORWAY_H_FRAC * LANDING_FLOOR_FRAC;

// ── the scene's metre ────────────────────────────────────────────────────────
// Everything in this model is in scene pixels, which are a screen unit and say
// nothing about how big a thing is *in the building*. That is fine for the
// building itself — a wall is as big as the viewport says — and it is exactly
// wrong for furniture, because furniture is the only thing in the frame whose
// size the viewer already knows. A bench and a crate are how a room states its
// scale, and both were built from pixel figures picked by eye: the workbench
// came out 94px tall, which against this room is a third of a metre. That is
// the whole of why the props read as toys.
//
// So there is one metre, derived from the one dimension the room actually
// fixes: floor to ceiling. An interwar goods landing runs a shade over three
// metres, and stating that here means a prop is modelled in metres and lands at
// the right size on every viewport, instead of being right on one screen and
// wrong on the next.
export const LANDING_HEIGHT_M = 3.05;

/**
 * One metre, in scene pixels. Everything that stands in the landing is built
 * from this rather than from a number that looked about right.
 * @param {number} vh @returns {number}
 */
export const pxPerM = (vh) =>
  (vh * (DOORWAY_H_FRAC * LANDING_FLOOR_FRAC + LANDING_CEILING_RISE_FRAC)) / LANDING_HEIGHT_M;

// ── the cage ─────────────────────────────────────────────────────────────────
// An open goods-lift cage riding inside the shaft, so it is narrower than the
// shaft and the walls stream past outside its posts.
//
// Its roof and floor are the point of the exercise: they are the first genuinely
// horizontal surfaces in this camera. A vertical bar facing the viewer has no
// convergence available to it and can only ever be shaded, which is why the old
// guide rail read flat. A horizontal plane seen at a grazing angle converges
// hard and reads as depth for nothing.
export const CAGE_NEAR = 300; // z of the cage's front, behind the camera
export const CAGE_FAR = -40; // z of the rear opening we look out through
export const CAGE_DEPTH = CAGE_NEAR - CAGE_FAR;
export const CAGE_ROOF_Y = 84;
export const CAGE_FLOOR_Y = 0.91; // fraction of vh
// only the two end posts are solid; the scissor gate fills between them
export const CAGE_POST_Z = [CAGE_FAR, CAGE_NEAR];

// How far the cage runs clear of the shaft wall, so the wall stays visible past
// its posts. Proportional, not fixed: a constant 190px is a tenth of a wide
// window and a fifth of a narrow one, which strangles the opening on laptops.
/** @param {number} vw @returns {number} */
export const cageInset = (vw) => Math.max(84, Math.min(190, vw * 0.12));

// ── the counterweight ────────────────────────────────────────────────────────
// It sits inboard far enough to clear the cage posts. Hard against the shaft
// wall it was hidden behind the gate at any ordinary window width and only
// appeared when the window was narrowed — furniture you can never see is
// furniture you did not build.
//
// The guide rail used to live here too, and it is gone. It was the reason this
// rebuild started and it never came good at any of it: a vertical beam facing
// the camera has no convergence available to it, so shading had to carry the
// whole of the volume, and the shading of a straight bar is a straight bar. Then
// the lamps needed the only sixty pixels of shaft you can see at all. What runs
// down that wall now is a cable, which has the one property the rail could never
// be given — it is not straight.
export const COUNTERWEIGHT_Z = -160;
export const COUNTERWEIGHT_INSET_X = 190;

// It runs opposite the cabin — anchored to hang into the top of the frame
// while the cabin rests on deck 02 — at twice the shaft's rate, which is what
// a counterweight on a 2:1 roping actually does. Pulled out into a function
// because the ride's motion tier and its shading both need this number, and
// they read it at different rates (see `Counterweight.jsx`/`HoistRopes.jsx`
// vs `Shaft.jsx`'s `cwShade`) — one formula, not two copies drifting apart.
/** @param {number} pos @param {number} floorPx @param {number} height @returns {number} */
export const counterweightY = (pos, floorPx, height) => 132 - height + 2 * (pos - 1) * floorPx;
