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
  MOUTH: { W: 1.16, H: 0.94 },

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
 * @typedef {{ out: number, run: number }} Path
 *   `out` — the head run, out of the wall toward the room.
 *   `run` — the long run, from the corner away to the left.
 */

/** @param {Path} path */
export const pathLength = (path) => path.out + path.run;

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
  if (along <= path.out) return { x: 0, z: along - path.out };
  return { x: -(along - path.out), z: 0 };
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
