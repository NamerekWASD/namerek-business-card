import { t } from '../../../i18n/strings.js';

// ── type on a canvas that has to hold four languages ─────────────────────────
// NBC-90. Every screen in this building is a canvas baked into a texture, and
// the boxes the type sits in are drawn in canvas pixels — a title bar, a box on
// a block diagram, a strip under a map. German set those widths, and German is
// the short one: the same sentence in Ukrainian or Russian runs 20-35% longer,
// and a stencil that overruns its own box is not a translation, it is a defect
// with a flag on it.
//
// Two things live here because three painters need both and none of them owns
// the other two.

/**
 * The largest size at or below `px` at which `text` fits in `max` canvas
 * pixels, applied to the context.
 *
 * Shrinking rather than wrapping, ellipsising or letting it run: these are
 * stencils on a machine, one line each, and a stencil that has been cut down a
 * point to fit its plate is a thing that happens in a real workshop. `floor`
 * stops it shrinking into illegibility — past that the string is genuinely too
 * long for the surface and the answer is a shorter translation, not smaller
 * type.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} max the width available, in canvas pixels
 * @param {number} px the size the drawing was designed at
 * @param {(size: number) => string} font builds this canvas's own font string
 * @param {number} [floor] the smallest size worth setting, default 72% of `px`
 * @returns {number} the size actually set
 */
export function fitFont(ctx, text, max, px, font, floor = px * 0.72) {
  let size = px;
  ctx.font = font(size);
  while (size > floor && ctx.measureText(text).width > max) {
    size -= 1;
    ctx.font = font(size);
  }
  return size;
}

/**
 * One label on a painted surface, which is either the same in every language or
 * a key into the dictionary.
 *
 * The distinction is the prop/content split NBC-85 drew and it is not a detail:
 * `MSSQL · MONGODB` and `EF CORE` are product names and stay put in Ukrainian,
 * while `DATENBANK` is a German word for a thing and has to go. Written as two
 * shapes rather than one so the split is visible in the data — a bare string is
 * a stencil, `{ key }` is a translation.
 *
 * @param {string | { key: string }} label
 * @param {import('../../../i18n/locale.js').LocaleId} locale
 * @returns {string}
 */
export function stencil(label, locale) {
  return typeof label === 'string' ? label : t(label.key, locale);
}
