// ── the 2. UG conveyor, as arithmetic ────────────────────────────────────────
// The treaty between the machine's geometry and the archive riding on it, kept
// out of `LandingProps.jsx` for the same reason `RACK` and `SHEET` are: that
// file owns metres and JSX, and everything here is a number that can be wrong
// *silently* — a box wider than the run it stands on, a lift finger descending
// through a roller, a box set down while it is still half inside the wall. None
// of those throw. All of them are clauses in `belt.test.js`.
//
// ── what NBC-68 changed, and why the old model had to go ─────────────────────
// The first cut carried the *archive* on the belt: one slot per project, the
// project on the glass parked against a stop gate. Paging back a project slid
// the whole train the other way, which on screen is boxes teleporting backwards.
//
// So the belt is now what a belt is: an endless run of product coming out of
// the wall, and the archive's own order is the console's job. Every box carries
// the project that was on the glass *when it came out of the mouth*.
//
// ── what NBC-72 changed, and why the L had to go ─────────────────────────────
// The run used to turn a right angle: a head run out of the wall, a long run
// away to the left, and a box shoved sideways at the junction without turning.
// Mykolai's objection is a physics one and it is correct — "по законам логики
// (и физики) коробка должна была развернуться примерно на 90 градусов из-за
// того, что переднюю часть коробки двигает конвейер, что двигает влево". A
// rectangular transfer with nothing on it does not earn that.
//
// There is one conveyor now, running left, moved back to where the head run
// stood so the mouth is over it. What comes out of the wall does not ride it
// out: it comes out on a **lift**, a short section on a bracket that hangs over
// the run, and the lift drops the box onto the rollers and goes back up for the
// next. Nothing turns a corner because nothing turns: a box is set down, and
// what picks it up is a different machine going a different way. That is a
// lift-and-transfer, it is what a works actually uses for this, and it is the
// one arrangement in which "the box does not rotate" is not a lie.
//
// The band went with the corner. A scrolling texture on a plane "выглядит как
// плоская текстура" because that is what it is; the run is rollers now, turned
// cylinders, and the lift's fingers pass *between* them — which is what fixes
// the pitch below at a roller and a gap rather than at anything decorative.

export const BELT = {
  // The roller tops, off the floor. Down a quarter of a metre from the 0.68 the
  // band sat at, which is Mykolai's own figure — the first ask was 0.5 to 1 m
  // and 0.68 − 0.5 is practically the floor. The mouth in the wall does *not*
  // come down with it: the drop is what the lift is now for, and 0.43 + `RISE`
  // puts the opening back to the millimetre where it already was.
  TOP: 0.43,
  WIDE: 0.92, // across the run, inside the side channels
  // 4:3, because the manifest is painted on a 4:3 canvas and a face of another
  // shape stretches every letter on it — the same clause the framed schematic
  // is held to.
  BOX: { w: 0.72, h: 0.54, d: 0.72 },
  // One box and the gap behind it, along the path. It is **not** a taste
  // figure any more: the lift has to hold its fingers under the roller line
  // until the box it just set down has run clear of them, and be back up before
  // the next box's nose comes out of the wall onto them. Those two are a lower
  // bound on the spacing and `minPitch` is that bound — see the clause in
  // `belt.test.js`, which is the only thing standing between this number and a
  // set of steel fingers rising through a plywood case.
  PITCH: 2,

  // ── the rollers ────────────────────────────────────────────────────────────
  // `GAP` is not a styling figure and it is the reason the pitch is written as
  // two numbers rather than one. The lift's fingers come down through these
  // gaps, so the gap has to hold a finger with air either side of it — see
  // `combClearance`, which is the clause, and `LIFT.FINGER_W`, which is what it
  // has to swallow.
  //
  // `FACETS` is a cost figure that turned into a legibility one. A smooth tube
  // spinning shows nothing at all: there is no feature on it to move. Twelve
  // flat facets walking through the pendant's highlight is what makes a roller
  // read as *turning* rather than as a bar lying across the frame.
  ROLL: { D: 0.11, GAP: 0.055, FACETS: 12 },

  // How far the mouth stands off the run's centre line, which is also how far
  // the box travels out of the wall before it is set down. It is not a taste
  // number: the box has to be *entirely* clear of the plaster before the lift
  // lets go of it, or it is dropped through the wall. See `mouthClearance`.
  OUT: 0.62,
  // The stretch of run to the right of the station — upstream, where nothing
  // has been delivered yet. Without it the run starts in mid-air under the
  // opening and the lift lowers a box onto its own end plate.
  //
  // ── why it is this figure and not a longer one ─────────────────────────────
  // The first cut ran it out to 0.88 so the machine would finish *past* the
  // lift's wall gear rather than level with it. That reasoning was sound and
  // the number was not: the counterweight hangs on that gear at the height of
  // the roller line, so a run carried out under it is a run with a cylinder of
  // cast iron standing through its rollers and its far channel — "конструкция
  // подьемника правее окна пробивает насквозь ролики и каркас".
  //
  // So the run stops where the opening's own surround stops, which is his call
  // and is also the one line in the picture that can justify an end: the
  // machine is as wide as the hole that feeds it. The end frame's outer face
  // lands on the surround's outer edge — `MOUTH.W / 2 + MOUTH.FRAME / 2` — and
  // `TAIL` is that less the frame's own thickness. `belt.test.js` holds the
  // equality, and holds the wall gear outside it.
  TAIL: 0.575,
  // The end frame across the infeed: a plate the channels lap over, standing a
  // little proud of the flange the way a stop does. Here rather than in the JSX
  // because it is half of where the run ends.
  END: 0.05,
  // How far right of the opening's own edge the lift's guide, sprocket and
  // counterweight stand. Here rather than in the JSX only because `TAIL` has to
  // be measured against it — the gear now stands entirely beyond the run's end
  // instead of over it, so this is what holds the counterweight off the end
  // frame.
  GUIDE: 0.17,

  // The opening the product comes out of, sized off the box. `SILL` is how far
  // the *lift's* surface sits below the middle of the opening, and it is here
  // rather than in the JSX because the curtain's swing is arithmetic off it.
  // `FRAME` is the pressed surround's member width, here because the run's end
  // is measured to its outer edge.
  MOUTH: { W: 1.16, H: 0.94, SILL: 0.12, FRAME: 0.09 },

  // ── the run behind the wall ────────────────────────────────────────────────
  // How far a box travels inside the tunnel before its nose reaches the
  // opening. NBC-70's second half: the box used to be switched on standing in
  // the plane of the wall, which is half a box appearing between one tick and
  // the next. What makes it work with no tunnel modelled at all is that the
  // black behind the mouth is *opaque*. Longer than a box, so there is a beat
  // with nothing in the opening rather than a nose permanently parked in it.
  LEAD: 0.92,

  // ── the lift ───────────────────────────────────────────────────────────────
  // The one part of this that is not a constant speed, and the one part
  // Mykolai asked for by feel rather than by measurement: "пускай ролики-
  // подъёмники опускают коробку быстро, будто с рывком, а коробка немножко
  // подпрыгнет и чутка повернётся… хочется немного инерции в этой сцене, а то
  // тухло пока что и идеализировано. Так не должно быть, это же дизельпанк!"
  //
  // So the fall is `t²` — all acceleration and no arrival — and everything
  // after it is the arrival being paid for: one hop, and a twist the box then
  // *keeps*. Straightening it back up is the idealisation he is objecting to.
  //
  // `HOLD` is the station, in metres of travel rather than in seconds, so it
  // rides the same clock as everything else: the box's own arc position is the
  // only state this machine has. `PAUSE` is the fraction of it spent waiting at
  // the top — a lift that starts falling the instant the box arrives reads as a
  // trapdoor rather than as a machine deciding to.
  LIFT: {
    RISE: 0.25, // how far the box falls
    CLEAR: 0.04, // and how much further the section goes, to get out from under it
    HOLD: 0.09, // metres of travel the station takes
    PAUSE: 0.42, // of which this fraction is spent at the top
    // Metres of travel the section takes to come back up, and how long it
    // stays down first. The wait is Mykolai's, on seeing the first cut: "нужно
    // чтобы коробка уехала и только после этого подьемник вернулся вверх" —
    // rising the moment it has let go puts four fingers of steel up through the
    // box still standing over them. It is derived rather than dialled; see
    // `liftWait`.
    RETURN: 0.16,
    WAIT_GAP: 0.03, // the air left between a rising finger and the box's corner
    BOUNCE: 0.075, // metres of run the hop plays over
    HOP: 0.035, // how high it hops
    YAW: 0.09, // the biggest twist a landing may put on a box, radians
    LEN: 1.02, // the section, along the way out of the wall
    BACK: 0.02, // how far in front of the plaster its back end stops
    FINGERS: 4,
    FINGER_W: 0.034, // across — has to live in the gap between two rollers
    WHEEL: 0.062, // the small rollers on a finger
    WHEEL_PITCH: 0.13,
    // The counterweight's radius. It is here rather than in the JSX because it
    // is the widest thing on the wall gear at the height of the roller line,
    // which makes it the member `TAIL` has to stay clear of.
    WEIGHT_R: 0.095,
  },

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
  //
  // Darker than it was, per the reference: the picture hangs heavy pleated
  // cloth here and we keep the seven rubber strips, because the strips already
  // swing and cloth would be paying for working mechanics twice. The one thing
  // taken off the picture is the weight of the tone.
  CURTAIN: { SLATS: 7, HANG: 0.47, DROP: 0.34, RAMP: 0.12, FALL: 0.3, LIFT: 0.05 },

  // ── the two numbers that decide what this costs ────────────────────────────
  // Both canvases are `frameloop="demand"` at rest and that is deliberate: a
  // still picture redrawn 165 times a second is two fans spinning for nothing.
  // So the belt is ticked at a rate of its own instead of at the display's.
  // 12 Hz was enough for a texture offset on a band nobody tracks and is not
  // enough for a solid object crossing the room — "будто очень мало фпс" was
  // exactly right. `beltStep` and `rollerStep` are the clauses.
  // Up from 0.16 with NBC-72, and the reason is `PITCH` rather than taste: the
  // lift's cycle forced the spacing out from 1.5 m to 2 m, and at the old speed
  // that is a box every twelve and a half seconds — a line that has stopped.
  // The same seconds between boxes, at the spacing the machine needs.
  SPEED: 0.2, // metres a second
  HZ: 30,
};

/** One roller and the gap behind it, along the run. */
export const rollPitch = () => BELT.ROLL.D + BELT.ROLL.GAP;

/**
 * How far a roller turns in `dt` milliseconds, in radians.
 *
 * The one place the run's metres and the rollers' rotation are allowed to meet:
 * a roller that does not turn at exactly the speed of what stands on it is a
 * box being dragged, which is the fault the band had in the other direction.
 *
 * @param {number} dt milliseconds
 */
export const rollerSpin = (dt) => (BELT.SPEED * dt) / 1000 / (BELT.ROLL.D / 2);

/**
 * Where each of the lift's fingers hangs, across the run.
 *
 * The rollers are laid on a grid anchored at the station's own centre line, so
 * a roller sits at x = 0 and at every whole pitch either side of it. An even
 * number of fingers stepped a whole pitch apart therefore lands every one of
 * them on a half pitch — dead between two rollers, which is the interleaving
 * NBC-72 point 4 asks for and what `combClearance` measures.
 *
 * Four of them rather than two because the box is 0.72 wide and a box carried
 * on two rails a sixth of a metre apart is a box balanced on a knife.
 */
export const fingerXs = () => Array.from(
  { length: BELT.LIFT.FINGERS },
  (_, i) => (i - (BELT.LIFT.FINGERS - 1) / 2) * rollPitch(),
);

/**
 * The air between a finger and the nearest roller, across the run.
 *
 * This is the whole of NBC-72 point 4 — "САМОЕ ГЛАВНОЕ: ролики подъёмника не
 * должны соприкасаться с роликами конвейера" — reduced to one number. Negative
 * here is a lift that descends *through* the run, which at this size announces
 * itself as nothing at all: two dark metal things occupying the same
 * millimetres, resolved per pixel by whichever the depth buffer saw last.
 */
export const combClearance = () => rollPitch() / 2 - BELT.ROLL.D / 2 - BELT.LIFT.FINGER_W / 2;

/**
 * How far the box has to run before the lift may come back up past it.
 *
 * The fingers are fixed and the box is going left, so they are inside it until
 * its trailing corner has passed the outermost one. Rising before that is four
 * steel fingers coming up through a plywood case — visible immediately, and the
 * first thing Mykolai said about the first cut of this.
 */
export const liftWait = () => BELT.BOX.w / 2 + Math.max(...fingerXs())
  + BELT.LIFT.FINGER_W / 2 + BELT.LIFT.WAIT_GAP;

/**
 * The closest two boxes may be spaced, given everything the lift has to do
 * between them.
 *
 * The cycle in order: the station, the wait while the box runs clear, the climb
 * back — and then the next box's *nose*, which reaches the back of the finger
 * bed a box-half before its middle does. A pitch under this is a machine whose
 * fingers are still coming up when the next box arrives on them.
 */
export const minPitch = () => BELT.LIFT.HOLD + liftWait() + BELT.LIFT.RETURN
  + (BELT.OUT - BELT.LIFT.BACK) + BELT.BOX.d / 2;

/**
 * How much clear air there is between the back of a box standing at the station
 * and the wall it came out of.
 *
 * Negative here is a box being set down inside the plaster.
 *
 * @param {number} out how far the station stands off the wall
 */
export const mouthClearance = (out) => out - BELT.BOX.d / 2;

/**
 * @typedef {{ lead?: number, out: number, hold?: number, run: number }} Path
 *   `lead` — the stretch inside the wall, before the mouth. Optional; a path
 *     without one starts the box in the plane of the opening, which is the bug
 *     NBC-70 was opened for.
 *   `out` — out of the wall on the lift, to the station over the run.
 *   `hold` — the station itself. Metres of travel during which the box does not
 *     move at all: it is standing still while the lift lets it down. Charging
 *     the dwell to the *path* rather than to a timer is what keeps every box on
 *     one constant-speed clock — see `beltAt`.
 *   `run` — the run itself, away to the left.
 */

/** @param {Path} path */
export const pathLength = (path) => (path.lead ?? 0) + path.out + (path.hold ?? 0) + path.run;

/** The arc position at which a box reaches the station. @param {Path} path */
const stationAt = (path) => (path.lead ?? 0) + path.out;

/**
 * Where a box `d` along the path stands, in the conveyor's own space: the
 * station is the origin, the mouth is at `-out` in z, and the room is +z.
 *
 * @param {number} d metres along the path
 * @param {Path} path
 */
export function posAt(d, path) {
  const along = Math.min(Math.max(0, d), pathLength(path));
  const past = along - stationAt(path);
  if (past <= 0) return { x: 0, z: past };
  if (past <= (path.hold ?? 0)) return { x: 0, z: 0 };
  return { x: -(past - (path.hold ?? 0)), z: 0 };
}

// Everything below is written against `path.hold` rather than against metres,
// so the same functions serve `belt.test.js` in metres and the ticker in scene
// pixels without either of them handing over the room's scale.
const returnArc = (path) => (path.hold ?? 0) * (BELT.LIFT.RETURN / BELT.LIFT.HOLD);
const waitArc = (path) => (path.hold ?? 0) * (liftWait() / BELT.LIFT.HOLD);
const bounceArc = (path) => (path.hold ?? 0) * (BELT.LIFT.BOUNCE / BELT.LIFT.HOLD);

/** The fall: acceleration and no arrival. @param {number} t 0 to 1 */
const fall = (t) => t * t;
/** The way back up, which is a machine being careful. @param {number} t 0 to 1 */
const rise = (t) => t * t * (3 - 2 * t);

/** Of the section's whole travel, the fraction at which it has let the box go. */
const handover = BELT.LIFT.RISE / (BELT.LIFT.RISE + BELT.LIFT.CLEAR);

/**
 * How far the lift section has descended for the box at `d`, as a fraction of
 * its whole travel — 0 up, 1 at the bottom.
 *
 * The section carries on past the box: it has to end up *below* the roller
 * tops, or the box never leaves it. `CLEAR` is that overshoot and `handover` is
 * where in the fall the box is actually released.
 *
 * @param {number} d @param {Path} path
 */
export function liftDrop(d, path) {
  const hold = path.hold ?? 0;
  const past = d - stationAt(path);
  if (past <= 0 || hold <= 0) return 0;
  if (past < hold) {
    const t = (past / hold - BELT.LIFT.PAUSE) / (1 - BELT.LIFT.PAUSE);
    return t <= 0 ? 0 : fall(Math.min(1, t));
  }
  // Down, and staying down, for as long as the box it just set down is still
  // over the fingers.
  const back = (past - hold - waitArc(path)) / returnArc(path);
  if (back <= 0) return 1;
  return back >= 1 ? 0 : 1 - rise(back);
}

/**
 * How high the box at `d` stands above the run, as a fraction of `RISE`.
 *
 * It rides the section down and then stops, because the rollers are there. The
 * hop is what the stop costs.
 *
 * @param {number} d @param {Path} path
 */
export function boxRise(d, path) {
  const drop = liftDrop(d, path);
  const past = d - stationAt(path);
  const carried = past < (path.hold ?? 0)
    ? Math.max(0, 1 - drop / handover)
    : 0;
  return carried + boxHop(d, path);
}

/**
 * The hop, as a fraction of `RISE`: one damped bound, done inside a tenth of a
 * second more than the fall itself took.
 *
 * @param {number} d @param {Path} path
 */
export function boxHop(d, path) {
  const arc = bounceArc(path);
  if (arc <= 0) return 0;
  // Measured from the release rather than from the end of the hold: the box is
  // on the rollers as soon as the section has fallen `RISE`, which is a hair
  // before the section itself has finished.
  const from = stationAt(path) + (path.hold ?? 0) * (BELT.LIFT.PAUSE
    + (1 - BELT.LIFT.PAUSE) * Math.sqrt(handover));
  const u = (d - from) / arc;
  if (u <= 0 || u >= 1) return 0;
  return (BELT.LIFT.HOP / BELT.LIFT.RISE) * Math.sin(Math.PI * u) * (1 - u);
}

/**
 * A number in [0, 1) from an integer, mixed rather than merely scaled.
 *
 * The obvious `(i * k) % n` is what was here first and it is useless for this:
 * the low bit of a multiple of an odd constant alternates, so a sign taken off
 * it gives every box in the pool the opposite twist to its neighbour — five
 * boxes nodding left, right, left down the run. Two rounds of multiply-and-xor
 * is what makes consecutive indices land somewhere unrelated.
 *
 * @param {number} n
 */
function hash01(n) {
  let x = Math.imul(n + 1, 2654435761) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

/**
 * The twist box `i` picked up when it was dropped, in radians.
 *
 * Deterministic per box and random-looking along the stream, which is the only
 * way to have both: the pool is four or five boxes going round for as long as
 * anyone stands on this floor, and a twist re-rolled every trip would be a box
 * that shivers each time it comes out of the wall.
 *
 * It is bounded, and the bound is the manifest: the face carrying the lettering
 * is turned at the camera, and a box far enough round is a box whose whole
 * point cannot be read. `BELT.LIFT.YAW` is that limit.
 *
 * @param {number} i @param {number} d @param {Path} path
 */
export function boxYaw(i, d, path) {
  const arc = bounceArc(path);
  if (arc <= 0) return 0;
  const from = stationAt(path) + (path.hold ?? 0);
  const u = (d - from) / arc;
  if (u <= 0) return 0;
  // A twist is put on by an impact, so it arrives with the impact rather than
  // being eased in over the hop.
  const settled = Math.min(1, u * 4);
  const sign = hash01(i) < 0.5 ? -1 : 1;
  return sign * BELT.LIFT.YAW * (0.45 + 0.55 * hash01(i + 101)) * settled;
}

/**
 * How far a curtain slat has to swing for its foot to ride over a box rather
 * than through it, in radians.
 *
 * Every term is a height above the lift's surface: the hinge, and the top of
 * the box. A slat is a rod of known length pinned at the first, and the angle
 * is the one that puts its foot at the second.
 *
 * `LIFT` is why it is not exactly that angle. Swung to the box's own height the
 * strips sit *on* the lid, which from this camera reads as strips buried in the
 * box rather than riding over it.
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
 * that decides which slats a box is under.
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
 * `dz` is how far the box's middle is past the slats, `x` is how far the slat
 * is off the run's centre line. Across the opening, a slat moves only if the
 * box is actually under it — which is what makes the curtain say the box has a
 * width instead of opening like a door. Along the way out, it ramps aside on
 * the nose and falls back behind the tail.
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
 * to come out. It is also the whole of the memory argument: this many boxes are
 * built when the floor is furnished and none is ever built or thrown away
 * again; a box that has run out of the room is the *same* box coming back round
 * behind the wall.
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
 * @param {number} s metres the machine has run since the floor was furnished
 * @param {number} i which box @param {number} count @param {number} pitch
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
 * moment, which is the whole of why a project change no longer moves anything.
 *
 * @param {number} s @param {number} i @param {number} count @param {number} pitch
 */
export function beltTrip(s, i, count, pitch) {
  return Math.floor((s + i * pitch) / cycleOf(count, pitch));
}
