// ── how a metal surface has been used ────────────────────────────────────────
// Every painted prop in this scene needs the same thing and each one needs it
// somewhere different, and that second half is the whole reason this file
// exists rather than a `wornMetalTile()` next to the others.
//
// A tile is wrong for wear. Wear is not a texture, it is a *record of what
// happened to a particular object*: enamel goes at the arrises of a post box
// because that is what a trolley hits, a drawer front is burnished in an arc
// under its handle because that is where a hand lands, a bench rail is pitted
// along its bottom edge because that is where the water sat. Tile any one of
// those and it repeats — and a repeated accident is the single loudest tell
// that a scene was made rather than found. Mykolai's words for the requirement:
// потёртости не должны быть шаблоном, а задаваться произвольно для каждой
// поверхности отдельно.
//
// So the surface says *where* and this file says *what*.
//
// ── the field ────────────────────────────────────────────────────────────────
// "Where" is a **field**: a function from a point on the canvas to how hard
// that point has been used, 0 for untouched and 1 for worn through. Everything
// below is distributed by rejection sampling against it — a pit, a rust bloom,
// a scratch and a burnish all ask the field first and most of them are thrown
// away. That is what makes one call site's plate different from another's
// rather than the same picture at a different rotation.
//
// `FIELD` builds the primitive ones and `mix` adds them up, so a caller writes
// what it knows about its own object:
//
//   mix(FIELD.edges(1.0), FIELD.bottom(0.5), FIELD.around(0.5, 0.62, 0.22, 0.8))
//
// — "worn at the rim, worse toward the floor, and there is a hand landing here."
//
// ── and the rule the rest of this directory already keeps ────────────────────
// **Paint the surface, not the light.** None of this is form shading: no face
// gets darker at the bottom because it is turned away from the pendant, because
// the pendant is already doing that and doing it twice is what a scene ported by
// eye looks like. `grime` is the one thing here that reads as darkening and it
// is dirt — it stays put when the lamp moves, which is the test.

/**
 * A small deterministic generator. Wear seeded off the clock is a prop that is a
 * different object on every load, and two machines looking at this scene have to
 * be looking at the same one.
 * @param {number} seed
 */
export const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

const clamp01 = (v) => (v < 0 ? 0 : (v > 1 ? 1 : v));

/**
 * A wear field: how hard a point has been used.
 * @typedef {(x: number, y: number, w: number, h: number) => number} Field
 */

/**
 * The primitive fields. All of them take their strength as the first argument
 * so a caller can dial one down without rewriting the shape of it, and all of
 * them work in fractions of the canvas so the same description survives a bake
 * being re-authored at a different resolution.
 */
export const FIELD = {
  /**
   * Toward the rim. The default for nearly everything: an edge is what the
   * world actually touches.
   * @param {number} [k] @param {number} [reach] how far in it bites, as a
   *   fraction of the shorter side
   */
  edges: (k = 1, reach = 0.22) => (x, y, w, h) => {
    const d = Math.min(x, w - x, y, h - y) / Math.min(w, h);
    return Math.max(0, 1 - d / reach) * k;
  },
  /** Toward the bottom, where water and grit sit. `p` shapes how fast. */
  bottom: (k = 1, p = 2.2) => (x, y, w, h) => (y / h) ** p * k,
  /** Toward the top, which is what a horizontal surface gets instead. */
  top: (k = 1, p = 2.2) => (x, y, w, h) => (1 - y / h) ** p * k,
  /** A horizontal band — a rub line, the run under a rail, a lid seam. */
  band: (k = 1, at = 0.5, width = 0.12) => (x, y, w, h) =>
    Math.max(0, 1 - Math.abs(y / h - at) / width) * k,
  /** A vertical one, for a strap or a stile. */
  stripe: (k = 1, at = 0.5, width = 0.12) => (x, y, w) =>
    Math.max(0, 1 - Math.abs(x / w - at) / width) * k,
  /**
   * A hot spot: where a hand lands, where a bolt weeps, where something has
   * stood for forty years. Positions and radius are fractions of the canvas.
   */
  around: (k = 1, cx = 0.5, cy = 0.5, r = 0.2) => (x, y, w, h) => {
    const dx = (x / w - cx) * (w / Math.min(w, h));
    const dy = (y / h - cy) * (h / Math.min(w, h));
    return Math.max(0, 1 - Math.hypot(dx, dy) / r) * k;
  },
  /**
   * Soft blotches at no particular place — the low-frequency unevenness every
   * real surface has under whatever else is going on. Seeded, so a given
   * surface's blotches are that surface's.
   */
  blotches: (k = 1, count = 7, seed = 1) => {
    const rnd = seeded(seed * 2654435761);
    const spots = Array.from({ length: count }, () => [rnd(), rnd(), 0.1 + rnd() * 0.3]);
    return (x, y, w, h) => {
      let v = 0;
      for (const [cx, cy, r] of spots) {
        const d = Math.hypot(x / w - cx, y / h - cy);
        if (d < r) v = Math.max(v, 1 - d / r);
      }
      return v * k;
    };
  },
  /** A flat floor under the rest. Use sparingly — see the note on `postBoxSkin`. */
  even: (k = 1) => () => k,
};

/**
 * Add fields together and clamp. Additive rather than max, so two mild reasons
 * for a corner to be worn make it worse than either alone — which is what
 * corners are.
 * @param {...Field} parts
 * @returns {Field}
 */
export const mix = (...parts) => (x, y, w, h) => {
  let v = 0;
  for (const f of parts) v += f(x, y, w, h);
  return clamp01(v);
};

/** @type {Field} */
const NOWHERE = () => 0;

/**
 * @typedef {object} WearOptions
 * @property {number} seed which object this is. Two surfaces with the same
 *   description and different seeds are two different objects; the same seed
 *   twice is the same object, which is what a cache needs.
 * @property {Field} [field] where this surface has been used. Defaults to its
 *   own edges, which is the honest minimum.
 * @property {string} [dark] what shows through when the finish goes — bare
 *   steel under enamel, shadow inside a pit.
 * @property {string} [rust] the oxide bleeding out of it.
 * @property {string} [light] what a burnished patch comes up as.
 * @property {number} [pit] how many specks, per thousand pixels of canvas.
 * @property {number} [bloom] how many rust patches.
 * @property {number} [scratch] how many scratches.
 * @property {number} [scratchAngle] which way they run, in radians. Scratches
 *   have a direction because tools do: a filed face is not a scribbled one.
 * @property {number} [scratchSpread] how far off that they wander.
 * @property {number} [polish] how many burnished patches — where use has made
 *   the metal *brighter*, not darker. Leaving this out is the commonest way a
 *   worn surface still reads as new: real wear is two-sided.
 * @property {number} [grime] a dark wash gathering at the bottom, 0..1.
 * @property {number} [streaks] how many weeping runs down from the top.
 */

/**
 * Paint one metal surface's history onto a canvas that already carries its
 * colour. Call it after the field is laid down and before anything that has to
 * stay crisp on top — a stencil, a keyline, a bolt head — because those are
 * applied to the object and the wear happened to the metal.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w @param {number} h
 * @param {WearOptions} options
 */
export function metalWear(ctx, w, h, {
  seed,
  field = FIELD.edges(1),
  dark = '#140d06',
  rust = '#71401a',
  light = '#8d7043',
  pit = 2.2,
  bloom = 0,
  scratch = 0,
  scratchAngle = 0,
  scratchSpread = 0.35,
  polish = 0,
  grime = 0,
  streaks = 0,
} = {}) {
  const rnd = seeded(seed >>> 0);
  const area = (w * h) / 1000;

  // ── the pitting ────────────────────────────────────────────────────────────
  // Rejection-sampled, and both the *count* and the *size* follow the field: a
  // speck a long way in from an edge is a speck that has only just started.
  const pits = Math.round(pit * area);
  for (let i = 0; i < pits; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const k = field(x, y, w, h);
    if (rnd() > k) continue;
    ctx.globalAlpha = 0.14 + rnd() * 0.6 * k;
    ctx.fillStyle = rnd() > 0.3 ? dark : rust;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * (0.7 + 2.2 * k), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── the blooms ─────────────────────────────────────────────────────────────
  // Rust does not arrive as specks; it arrives as a patch with a dark middle
  // and a soft orange halo creeping out of it.
  for (let i = 0; i < bloom; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const k = field(x, y, w, h);
    if (rnd() > k) continue;
    const r = (0.02 + rnd() * 0.08) * Math.min(w, h) * (0.5 + k);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${dark}cc`);
    g.addColorStop(0.35, `${rust}99`);
    g.addColorStop(1, `${rust}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ── the scratches ──────────────────────────────────────────────────────────
  // Each one is a dark cut with a lit lip along one side, because that is what
  // a groove in metal is under a lamp — a scratch drawn as one dark line reads
  // as a hair on the lens.
  for (let i = 0; i < scratch; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const k = field(x, y, w, h);
    if (rnd() > 0.25 + k * 0.75) continue;
    const a = scratchAngle + (rnd() - 0.5) * 2 * scratchSpread;
    const len = (0.04 + rnd() * 0.3) * Math.max(w, h);
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    ctx.lineWidth = 0.6 + rnd() * 1.2;
    ctx.globalAlpha = 0.12 + rnd() * 0.34;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.strokeStyle = light;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * 1.1, y - Math.cos(a) * 1.1);
    ctx.lineTo(x + dx + Math.sin(a) * 1.1, y + dy - Math.cos(a) * 1.1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── the burnish ────────────────────────────────────────────────────────────
  // The half everybody forgets. Where a surface is handled it does not go dark,
  // it goes *bright*: the finish rubs off and the metal under it polishes. This
  // is what makes a drawer front look pulled and a rail look leant on.
  for (let i = 0; i < polish; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h;
    const k = field(x, y, w, h);
    if (rnd() > k) continue;
    const r = (0.04 + rnd() * 0.12) * Math.min(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${light}66`);
    g.addColorStop(1, `${light}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ── the weeping ────────────────────────────────────────────────────────────
  // Runs down from wherever water has sat: under a bolt, off a lid seam. They
  // start at the field's own hot spots rather than anywhere, so a plate with
  // nothing on its top edge does not bleed for no reason.
  for (let i = 0; i < streaks; i += 1) {
    const x = rnd() * w;
    const y = rnd() * h * 0.6;
    if (rnd() > field(x, y, w, h)) continue;
    const len = (0.1 + rnd() * 0.5) * h;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, `${rust}80`);
    g.addColorStop(1, `${rust}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - (0.6 + rnd() * 1.6), y, 1.4 + rnd() * 2.6, len);
  }

  // ── the grime ──────────────────────────────────────────────────────────────
  // Dirt, not shading: it gathers at the bottom of anything that has been
  // bolted somewhere for forty years and it does not move when the lamp does.
  if (grime > 0) {
    const g = ctx.createLinearGradient(0, h, 0, h * 0.45);
    g.addColorStop(0, `rgba(8,5,2,${(0.62 * grime).toFixed(3)})`);
    g.addColorStop(1, 'rgba(8,5,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

export { NOWHERE };
