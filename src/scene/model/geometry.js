// ── the dimensions of the building ───────────────────────────────────────────
// Where things are and how big they are, with none of the drawing. A second
// renderer would keep every number in this file unchanged — that is the test
// for whether something belongs here.

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

// How much deeper the landing sits than the shaft wall. It is a different room,
// so it gets its own depth, its own colour and its own light — sharing all three
// with the shaft is what made the far end read as one flat backdrop.
export const LANDING_SETBACK = 78;

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
