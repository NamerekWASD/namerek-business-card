// ── the ride ─────────────────────────────────────────────────────────────────
// The shape of a trip between two decks, and what the doors do while it happens.
// Pure arithmetic over numbers: no React, no DOM, and no knowledge of how any of
// it will be drawn.

import { DECKS } from './decks.js';

// The backdrop is a further depth plane than the content, so it drifts slower
// — that difference is what sells "the camera moved" instead of "a div slid".
export const BG_PARALLAX = 0.42;

// Dead shaft between two decks, as a fraction of the viewport. The decks used
// to butt up against each other, which put a seam light exactly on the viewport
// edge at rest — so the settling overshoot flashed it in and out on every
// arrival. The buffer parks the seam safely off-screen instead; the ride gets
// slightly longer, which is a fair price.
export const DECK_GAP = 0.4;

export const LIFT_BASE_MS = 760;
export const LIFT_PER_FLOOR_MS = 300;

/** @param {number} dist floors travelled @returns {number} milliseconds */
export function liftDuration(dist) {
  return LIFT_BASE_MS + LIFT_PER_FLOOR_MS * (Math.max(1, dist) - 1);
}

// A lift has three phases, not one curve: it pulls away, holds a cruising
// speed, then brakes. A plain ease-out spends the whole ride decelerating and
// covers ~90% of the distance in the first half, which reads as a tween.
// This integrates an explicit velocity profile instead.
//
// These are *fractions of the trip*, not accelerations — the old names (ACCEL,
// DECEL) read as rates and they are nothing of the kind.
export const ACCEL_PHASE = 0.18;
export const DECEL_PHASE = 0.44;
export const CRUISE_PHASE = 1 - ACCEL_PHASE - DECEL_PHASE;

// The integral of the velocity profile above — the distance one trip covers in
// profile units, which is what every phase is divided by to normalise the curve
// back to 0..1.
export const PROFILE_DISTANCE = 0.4 * ACCEL_PHASE + CRUISE_PHASE + DECEL_PHASE / 3;

// Where the brakes stop biting and the overshoot starts damping out.
const SETTLE_FROM = 0.78;
// How far the cabin overshoots its floor before settling back onto it, in
// floors — a hydraulic characteristic of the brakes, not of the trip. Applied
// as a fraction of *this* progress curve (0..1 per trip), it used to scale
// with distance travelled: a one-floor hop overshot by 0.04 floors, but a
// three-floor trip overshot by 0.12, three times the wobble for a brake doing
// the same job. Callers now divide it out by `dist` so the overshoot stays
// one physical amount regardless of how far the cabin travelled to get there.
export const SETTLE_OVERSHOOT = 0.04;

/**
 * @param {number} progress 0..1 through the trip
 * @param {number} [dist] floors travelled this trip, used only to keep the
 *   brake overshoot a constant physical size instead of growing with distance
 * @returns {number} 0..1 of the distance covered, overshooting slightly near the end
 */
export function liftEase(progress, dist = 1) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let distance;
  if (progress < ACCEL_PHASE) {
    distance = 0.4 * ACCEL_PHASE * Math.pow(progress / ACCEL_PHASE, 2.5);
  } else if (progress < ACCEL_PHASE + CRUISE_PHASE) {
    distance = 0.4 * ACCEL_PHASE + (progress - ACCEL_PHASE);
  } else {
    const u = (progress - ACCEL_PHASE - CRUISE_PHASE) / DECEL_PHASE;
    distance = 0.4 * ACCEL_PHASE + CRUISE_PHASE + (DECEL_PHASE / 3) * (1 - Math.pow(1 - u, 3));
  }
  const base = distance / PROFILE_DISTANCE;
  // hydraulic overshoot as the brakes bite, damped out over the last stretch —
  // the arrival is what makes it read as machinery rather than a tween
  if (progress <= SETTLE_FROM) return base;
  const k = (progress - SETTLE_FROM) / (1 - SETTLE_FROM);
  return base + Math.sin(k * Math.PI * 2) * (SETTLE_OVERSHOOT / Math.max(1, dist)) * (1 - k);
}

// Landing doors, folded into the ride rather than added to it. Closing runs over
// the acceleration phase and opening over the braking phase, so the trip gains
// no time at all — deliberately lengthening a transition to fit an animation in
// is how a transition starts to feel like a toll.
/**
 * @param {number | null} phase raw (un-eased) ride progress, or null at rest
 * @returns {number} 0 fully open, 1 fully shut
 */
export function doorClosure(phase) {
  if (phase == null) return 0;
  if (phase < ACCEL_PHASE) return phase / ACCEL_PHASE;
  const openFrom = ACCEL_PHASE + CRUISE_PHASE;
  if (phase < openFrom) return 1;
  return 1 - (phase - openFrom) / DECEL_PHASE;
}

// …and which floor's doors those phases belong to. Exactly two floors have
// anything to do in a ride: the one being left, which shuts over the
// acceleration, and the one being arrived at, which opens over the braking.
// Every floor in between is one the lift is going past, and a lift going past a
// landing does not open its doors at it — riding one to four used to open three
// of them.
/**
 * @param {number} floor
 * @param {{ from: number, to: number, p: number } | null} ride
 * @param {number} deckIndex the settled floor, used only at rest
 * @returns {number} 0 fully open, 1 fully shut
 */
export function doorClosureAt(floor, ride, deckIndex) {
  if (!ride) return floor === deckIndex ? 0 : 1;
  if (floor === ride.from) return ride.p < ACCEL_PHASE ? ride.p / ACCEL_PHASE : 1;
  if (floor === ride.to) {
    const openFrom = ACCEL_PHASE + CRUISE_PHASE;
    return ride.p < openFrom ? 1 : 1 - (ride.p - openFrom) / DECEL_PHASE;
  }
  return 1;
}

/**
 * Which floor is the one currently open to us, and how far open it is.
 *
 * At rest that is simply the deck we are standing at. During a trip it is not:
 * exactly two floors have doors doing anything, the one being left and the one
 * being arrived at, and which of them is the *room we can see into* swaps over
 * partway through. Anything that lights, furnishes or looks into a landing has
 * to follow that swap — the settled deck index does not, and using it lit the
 * floor we were leaving while we arrived somewhere dark.
 *
 * @param {{ from: number, to: number, p: number } | null} ride
 * @param {number} deckIndex the settled floor, used only at rest
 * @returns {{ floor: number, closure: number }}
 */
export function openFloor(ride, deckIndex) {
  if (!ride) return { floor: deckIndex, closure: doorClosureAt(deckIndex, null, deckIndex) };
  const leaving = doorClosureAt(ride.from, ride, deckIndex);
  const arriving = doorClosureAt(ride.to, ride, deckIndex);
  return arriving <= leaving
    ? { floor: ride.to, closure: arriving }
    : { floor: ride.from, closure: leaving };
}

export const DECK_COUNT = DECKS.length;
