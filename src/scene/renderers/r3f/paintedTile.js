// ── the shared half of a tile this renderer paints itself ────────────────────
// `brick.js` and `plate.js` both hand `surfaceMaterial.js` a canvas instead of a
// photograph, and both owe it the same two things: a mean it can predict, and a
// palette expressed the same way. Those live here so the two cannot drift.
//
// The contract with the bake is the part worth stating. A painted tile is still
// a *multiplier* — the surface's pigment stays in `SURFACES` — and the bake
// lifts the surface colour by one over the tile's own mean. So a painter that
// quietly comes out darker than the last one darkens the whole wall, and the
// only way to keep a palette editable without re-dialling the lighting after
// every nudge is to pin that mean. `normalise` is what pins it.

/** The mean linear luminance every painted tile is normalised to. */
export const TARGET_MEAN = 0.2;

/**
 * A palette entry as a canvas colour. `k` scales it — the way one object out of
 * a kiln or off a rolling mill differs from the next — and `a` is alpha.
 * @param {number[]} channels @param {number} [k] @param {number} [a]
 */
export const rgb = ([r, g, b], k = 1, a = 1) => {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgba(${c(r)},${c(g)},${c(b)},${a})`;
};

/** sRGB byte to linear — three's own transfer function, and the bake's. */
export const toLinear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
export const toSRGB = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * Scales the whole canvas, in linear light, until its mean luminance is
 * `TARGET_MEAN`. Done in linear rather than on the bytes because a scale on
 * gamma-encoded values changes contrast as well as level, which is exactly the
 * thing a palette was chosen for.
 * @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h
 */
export function normalise(ctx, w, h) {
  const frame = ctx.getImageData(0, 0, w, h);
  const px = frame.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    sum += 0.2126 * toLinear(px[i]) + 0.7152 * toLinear(px[i + 1]) + 0.0722 * toLinear(px[i + 2]);
  }
  const mean = sum / (px.length / 4);
  if (mean <= 0.001) return;
  const k = TARGET_MEAN / mean;
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      px[i + c] = Math.round(255 * Math.min(1, toSRGB(toLinear(px[i + c]) * k)));
    }
  }
  ctx.putImageData(frame, 0, 0);
}

/**
 * An irregular closed path — a break, a spall, a patch of scale. Not a circle:
 * nothing in a building this old has a radius.
 * @param {CanvasRenderingContext2D} ctx
 */
export function blob(ctx, cx, cy, r, rnd, points = 9) {
  ctx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (0.45 + rnd() * 0.75);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * A canvas of `size` square, or `null` where there is nothing to paint on —
 * which is every test run, and is why every painter here is allowed to return
 * nothing.
 * @param {number} size
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } | null}
 */
export function surface(size) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return ctx ? { canvas, ctx } : null;
}
