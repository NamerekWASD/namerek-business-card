// ── the 2. UG conveyor, as arithmetic ────────────────────────────────────────
// The treaty between the belt's geometry and the archive riding on it, kept out
// of `LandingProps.jsx` for the same reason `RACK` and `SHEET` are: that file
// owns metres and JSX, and everything here is a number that can be wrong
// *silently* — a box wider than the band it stands on, a box turning the corner
// while it is still half inside the wall, a belt that scrolls fast enough to
// appear to run backwards. None of those throw. All of them are clauses in
// `belt.test.js`.
//
// ── what NBC-68 changed, and why the old model had to go ─────────────────────
// The first cut carried the *archive* on the belt: one slot per project, the
// project on the glass parked against a stop gate, what had shipped downstream
// and what had not upstream. It was a nice idea and it read as a fault. Paging
// back a project slid the whole train the other way, which on screen is boxes
// teleporting backwards; and a belt whose boxes only ever move during a
// one-second slide is a belt that is not running.
//
// So the belt is now what a belt is: an endless run of product coming out of
// the wall, and the archive's own order is the console's job, not the
// conveyor's. Every box carries the project that was on the glass *when it came
// out of the mouth*. Change the project and the boxes already on the run keep
// what they were stamped with until they leave the room — nothing pops, nothing
// jumps, and the change arrives the way it would in a real works: on the next
// thing off the line.

export const BELT = {
  TOP: 0.68, // the belt surface, off the floor
  WIDE: 0.92, // across the run
  // 4:3, because the manifest is painted on a 4:3 canvas and a face of another
  // shape stretches every letter on it — the same clause the framed schematic
  // is held to. Half again bigger than the first cut: Mykolai's first objection
  // on NBC-68 was that nothing on the box could be read, and the box is the one
  // object in this room whose whole job is to be read.
  BOX: { w: 0.72, h: 0.54, d: 0.72 },
  PITCH: 1.5, // one box and the gap behind it, along the path
  // How far the head run comes out of the wall before the transfer. It is not
  // a taste number: the box has to be *entirely* clear of the plaster before it
  // is shoved left, or it turns the corner through the wall. See
  // `mouthClearance`, which is the clause that holds it.
  OUT: 1.05,
  SLAT: 0.2, // one slat of the band, which is what the tile is authored at
  SLATS_PER_TILE: 4,
  // The opening the run comes out of, grown with the box — an opening the same
  // size as what comes through it is a box born clipping its own surround.
  // `SILL` is how far the belt surface sits *below* the middle of the opening,
  // and it is here rather than in the JSX because the curtain's swing is
  // arithmetic off it — see `slatSwing`.
  MOUTH: { W: 1.16, H: 0.94, SILL: 0.12 },

  // ── the run behind the wall ────────────────────────────────────────────────
  // How far a box travels inside the tunnel before its nose reaches the
  // opening. Not decoration, and NBC-70's second half: the box used to be
  // switched on standing in the plane of the wall, which is half a box — 0.36 m
  // of it — appearing in the shot between one tick and the next. "Ящики просто
  // спаунятся из ничего", and that is exactly what it was.
  //
  // What makes this work with no tunnel modelled at all is that the black
  // behind the mouth is *opaque*: a box on this stretch is occluded by it and
  // by the wall, and comes out of the hole nose first. Longer than a box, so
  // there is a beat with nothing in the opening rather than a nose permanently
  // parked in it.
  LEAD: 0.92,

  // ── the strip curtain ──────────────────────────────────────────────────────
  // `HANG` and `DROP` are the hinge height above the middle of the opening and
  // the length of a slat, both as fractions of `MOUTH.H`. They live here rather
  // than in the JSX for one reason: whether a box can push the curtain at all,
  // and how far it has to swing to ride over the box instead of through it, is
  // a sum over these and `BOX.h` — and it is wrong silently.
  //
  // `RAMP` is how far the nose travels before the slats are fully aside;
  // `FALL` is how far the back travels before they have shut again, longer
  // because rubber does not snap back.
  CURTAIN: { SLATS: 7, HANG: 0.47, DROP: 0.34, RAMP: 0.12, FALL: 0.3, LIFT: 0.05 },

  // ── the two numbers that decide what this costs ────────────────────────────
  // Both canvases are `frameloop="demand"` at rest and that is deliberate: a
  // still picture redrawn 165 times a second is two fans spinning for nothing.
  // A belt written the naive way — `useFrame`, a frame asked for on every one
  // of them — throws all of it away for as long as anyone stands on this floor.
  //
  // So it is ticked at a rate of its own instead of at the display's. What
  // changed with NBC-68 is what that rate has to carry: 12 Hz was enough for a
  // texture offset on a band nobody tracks, and it is not enough for a solid
  // object crossing the room — "будто очень мало фпс" was exactly right. A
  // moving box needs its own edge to land a pixel or two along between ticks,
  // not five. `beltStep` is the clause; 30 Hz is what satisfies it at this
  // speed, and it is still less than a fifth of the display's rate.
  SPEED: 0.16, // metres a second
  HZ: 30,
};

/**
 * How far the band's texture offset moves in `dt` milliseconds.
 *
 * The tile is `SLATS_PER_TILE` slats long, so one tile of offset is that many
 * slats of run — which is the only place the belt's metres and the canvas's
 * repeat are allowed to meet.
 *
 * @param {number} dt milliseconds
 */
export const bandOffset = (dt) =>
  (BELT.SPEED * dt) / 1000 / (BELT.SLAT * BELT.SLATS_PER_TILE);

/**
 * How much clear air there is between the back of a box standing at the corner
 * and the wall it came out of.
 *
 * The box is pushed sideways at the transfer without turning, so at the moment
 * it starts moving left its back face is half a box behind the corner. Negative
 * here is a box sliding through the plaster.
 *
 * @param {number} out the head run's length
 */
export const mouthClearance = (out) => out - BELT.BOX.d / 2;

/**
 * @typedef {{ lead?: number, out: number, run: number }} Path
 *   `lead` — the stretch inside the wall, before the mouth. Optional; a path
 *     without one starts the box in the plane of the opening, which is the bug
 *     NBC-70 was opened for.
 *   `out` — the head run, out of the wall toward the room.
 *   `run` — the long run, from the corner away to the left.
 */

/** @param {Path} path */
export const pathLength = (path) => (path.lead ?? 0) + path.out + path.run;

/**
 * Where a box `d` along the path stands, in the conveyor's own space: the
 * corner is the origin, the mouth is at `-out` in z, and the room is +z.
 *
 * The turn is a corner rather than a curve, which is what Mykolai asked for in
 * so many words — "с резким заворотом в лево". A right-angle transfer is also
 * the machine that actually does this: the head belt runs a box onto a plate
 * and a second belt takes it off sideways. Nothing rotates, which is why the
 * face carrying the manifest never leaves the camera.
 *
 * @param {number} d metres along the path
 * @param {Path} path
 */
export function posAt(d, path) {
  const along = Math.min(Math.max(0, d), pathLength(path));
  // Measured from the mouth, so everything downstream of it — the corner, the
  // discharge — stands exactly where it stood before the lead-in existed.
  const fromMouth = along - (path.lead ?? 0);
  if (fromMouth <= path.out) return { x: 0, z: fromMouth - path.out };
  return { x: -(fromMouth - path.out), z: 0 };
}

/**
 * The drawn length of the head run, and of the long one.
 *
 * Both runs used to be drawn their full length, which laid two bands and two
 * pans in the same plane over the square metre at the corner: coincident
 * polygons, and which one the depth buffer keeps is a coin toss per pixel that
 * is tossed again every time the camera moves. They butt instead — the head run
 * stops at the long run's far edge and the long run is carried past the corner
 * to meet it, so the corner belongs to exactly one of them.
 *
 * This is also what let the transfer go. There was a plate and four rollers
 * standing here; Mykolai's reading of them was that a box rides over a set of
 * loose bars for no reason he could see, and he asked for what a run has
 * everywhere else — a pair of legs. The corner is a plain junction now.
 *
 * @param {number} out the head run, in whatever unit `M` is given in
 * @param {number} [M] the room's metre, when the caller works in scene pixels
 */
export const headRun = (out, M = 1) => out - (BELT.WIDE / 2) * M;

/** @param {number} run @param {number} [M] */
export const longRun = (run, M = 1) => run + (BELT.WIDE / 2) * M;

/**
 * How far a curtain slat has to swing for its foot to ride over a box rather
 * than through it, in radians.
 *
 * Every term is a height above the belt: the hinge, and the top of the box. A
 * slat is a rod of known length pinned at the first, and the angle is the one
 * that puts its foot at the second.
 *
 * `LIFT` is why it is not exactly that angle. Swung to the box's own height the
 * strips sit *on* the lid, which is what rubber really does and which from this
 * camera reads as strips buried in the box rather than riding over it — the lid
 * is turned toward the lens and takes them. A few centimetres of clearance is
 * the difference between a curtain a box has pushed and a curtain a box has
 * gone through.
 */
export const slatSwing = () => {
  const hinge = BELT.CURTAIN.HANG * BELT.MOUTH.H + BELT.MOUTH.H / 2 - BELT.MOUTH.SILL;
  const clear = hinge - BELT.BOX.h - BELT.CURTAIN.LIFT;
  return Math.acos(Math.min(1, Math.max(-1, clear / (BELT.CURTAIN.DROP * BELT.MOUTH.H))));
};

/**
 * Where each slat hangs across the opening, and how wide one is — both in
 * metres, both off the mouth's own width. Two callers read these and they have
 * to agree to the millimetre: the JSX that draws the curtain, and the ticker
 * that decides which slats a box is under. A drawing and a simulation that
 * disagree about where a thing is is the family of bug this file exists for.
 */
export const slatXs = () => Array.from(
  { length: BELT.CURTAIN.SLATS },
  (_, i) => (i - (BELT.CURTAIN.SLATS - 1) / 2) * (BELT.MOUTH.W / BELT.CURTAIN.SLATS),
);

/** Half a slat, across. The 0.86 is the gap between one strip and the next. */
export const slatHalfWidth = () => (BELT.MOUTH.W / BELT.CURTAIN.SLATS) * 0.86 / 2;

/**
 * How far aside a single slat is pushed, 0 to 1.
 *
 * Everything is in metres and everything is relative, so the caller does not
 * have to hand over the scene's frame: `dz` is how far the box's middle is past
 * the slats, `x` is how far the slat is off the belt's centre line.
 *
 * The two factors are the whole of it. Across the opening, a slat moves only if
 * the box is actually under it — which is what makes the curtain say the box
 * has a width instead of opening like a door. Along the run, it ramps aside on
 * the nose and falls back behind the tail, and the two halves meet at 1 exactly
 * when the tail reaches the slats, so nothing steps.
 *
 * @param {number} dz @param {number} x @param {number} halfW half a slat, across
 */
export function slatPush(dz, x, halfW) {
  const across = Math.min(1, Math.max(0, (BELT.BOX.w / 2 + halfW - Math.abs(x)) / (2 * halfW)));
  if (across === 0) return 0;
  const nose = dz + BELT.BOX.d / 2;
  if (nose <= 0) return 0;
  const tail = dz - BELT.BOX.d / 2;
  const along = tail <= 0
    ? Math.min(1, nose / BELT.CURTAIN.RAMP)
    : Math.max(0, 1 - tail / BELT.CURTAIN.FALL);
  return across * along;
}

/**
 * How many boxes the run is given.
 *
 * One more than the path holds, so there is always one waiting behind the mouth
 * to come out — the picture NBC-68 asked for: a box is out of the wall before
 * the one ahead of it has reached the end of the corridor.
 *
 * It is also the whole of the memory argument. This many boxes are built when
 * the floor is furnished and none is ever built or thrown away again; a box
 * that has run out of the room is the *same* box coming back round behind the
 * wall. There is no allocation on the tick to leak, and nothing to dispose.
 *
 * @param {number} length the path, in metres
 * @param {number} pitch
 */
export const beltCount = (length, pitch) => Math.max(1, Math.ceil(length / pitch) + 1);

/** The travel one box makes before it is back where it started. */
const cycleOf = (count, pitch) => count * pitch;

/**
 * How far box `i` is along the path after `s` metres of travel.
 *
 * @param {number} s metres the band has run since the floor was furnished
 * @param {number} i which box
 * @param {number} count how many there are
 * @param {number} pitch
 */
export function beltAt(s, i, count, pitch) {
  const cycle = cycleOf(count, pitch);
  return ((s + i * pitch) % cycle + cycle) % cycle;
}

/**
 * How many times box `i` has been round.
 *
 * This is what tells a box to go and ask the console which project is on the
 * glass. It changes at the instant the box is back at the mouth and at no other
 * moment, which is the whole of why a project change no longer moves anything:
 * a box already on the run keeps the manifest it came out with.
 *
 * @param {number} s @param {number} i @param {number} count @param {number} pitch
 */
export function beltTrip(s, i, count, pitch) {
  return Math.floor((s + i * pitch) / cycleOf(count, pitch));
}
