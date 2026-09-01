// ── the 2. UG conveyor, as arithmetic ────────────────────────────────────────
// The treaty between the belt's geometry and the archive riding on it, kept out
// of `LandingProps.jsx` for the same reason `RACK` and `SHEET` are: that file
// owns metres and JSX, and everything here is a number that can be wrong
// *silently* — a box wider than the slot it stands in, two projects on one
// slot, a belt that scrolls fast enough to appear to run backwards. None of
// those throw. All of them are clauses in `belt.test.js`.

export const BELT = {
  TOP: 0.68, // the belt surface, off the floor
  WIDE: 0.52, // across the run
  // 4:3, because the manifest is painted on a 4:3 canvas and a face of another
  // shape stretches every letter on it — the same clause the framed schematic
  // is held to.
  BOX: { w: 0.52, h: 0.39, d: 0.44 },
  PITCH: 0.68, // one box and the gap behind it
  UPSTREAM: 1.16, // the station to the mouth in the wall
  SLAT: 0.2, // one slat of the band, which is what the tile is authored at
  SLATS_PER_TILE: 4,

  // ── the two numbers that decide what this costs ────────────────────────────
  // Both canvases are `frameloop="demand"` at rest and that is deliberate: a
  // still picture redrawn 165 times a second is two fans spinning for nothing.
  // A belt written the naive way — `useFrame`, a frame asked for on every one
  // of them — throws all of it away for as long as anyone stands on this floor.
  //
  // So it is ticked at a rate of its own instead of at the display's. A slow
  // belt does not need 165 samples a second to read as running; it needs its
  // slats to move a pixel or two between frames. `pilotLamps.js` makes the same
  // argument for the same reason and settles at two or three a second.
  SPEED: 0.07, // metres a second
  HZ: 12,

  /** How long the train takes to advance one slot when the project changes. */
  SLIDE_MS: 1100,
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
 * Where the train stands, as a fraction of one slot, `ms` after the project
 * last changed. 1 is where it was, 0 is against the stop.
 *
 * Cubic, so it settles into the stop rather than arriving at it flat. A belt
 * that stops dead is a belt with no mass.
 *
 * @param {number} ms milliseconds since the change, or `null` if it never has
 */
export const beltSlide = (ms) => {
  if (ms === null) return 0;
  const p = Math.min(1, Math.max(0, ms / BELT.SLIDE_MS));
  return (1 - p) ** 3;
};

/**
 * Which project stands in which slot.
 *
 * Slot 0 is the station — the box held at the stop gate, which is the project
 * on the glass. Positive slots are upstream, toward the mouth in the wall:
 * what has not shipped yet. Negative slots are downstream, leaving to the
 * left: what has. So the belt carries the archive in the archive's own order,
 * and the room is *about* the projects rather than standing next to them.
 *
 * A slot with no project in it is not a box. An empty stretch of belt behind
 * the station is the honest picture of an archive with nothing more in it.
 *
 * @template {{ id: string }} P
 * @param {P[]} projects
 * @param {number} current index of the project on the glass
 * @param {number[]} [slots] which slots the belt is long enough to show
 * @returns {{ slot: number, project: P }[]}
 */
export function beltSlots(projects, current, slots = [-1, 0, 1, 2]) {
  return slots
    .map((slot) => ({ slot, project: projects[current + slot] }))
    .filter((s) => s.project);
}
