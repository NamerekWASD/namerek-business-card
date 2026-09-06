// ── the Projekte console's picture tube ──────────────────────────────────────
// The glass on the 2. OG landing, and what the archive puts on it. It is the
// terminal's sibling — one canvas, painted from JS, held by a mesh that is
// built once and never unbuilt — and it follows the same rules, for the reasons
// `terminal.js` and `LandingScreen` set out at length: the canvas carries the
// state, the mesh never remounts, and nothing here is sized in canvas pixels
// without asking what that comes to on screen.
//
// ── what is different, and why the canvas is not a fixed shape ───────────────
// The terminal's aspect is fixed because monospace text stretched to a changing
// rectangle gives itself away, so the caller fits a box of the terminal's own
// shape inside the glass. A picture cannot be handled that way: the glass is
// portrait (about 0.82 wide to tall, and drifting a few per cent with the
// viewport) and a wide screenshot fitted inside a *second* box inside that
// would leave two sets of margins and a picture the size of a stamp.
//
// So this canvas fills the glass edge to edge and takes the glass's own aspect
// as an argument. Everything painted here is therefore drawn into a rectangle
// that is stretched by a few per cent on the wall — which the rules, the wedge
// and the scanlines do not care about at all, and which the *picture* very much
// does. `fitShot` is where that is paid for: it works out the rect that comes
// out at the photograph's own proportions after the stretch.
//
// ── and it is amber ─────────────────────────────────────────────────────────
// A full-colour screenshot on this wall reads as a sticker. Every light in the
// room is amber, the grade runs the landing's chroma up past 1.6, and the one
// surface in frame carrying sRGB blues would be the picture. So the shot goes
// through a phosphor: `PHOSPHOR` of the way to a monochrome amber, which keeps
// the layout of a screenshot legible while leaving it a thing this building
// could plausibly display. Turn it to 0 and the archive is in colour.

import { CanvasTexture, SRGBColorSpace } from 'three';
import { t } from '../../../i18n/strings.js';
import { DEFAULT_LOCALE } from '../../../i18n/locale.js';
import { localized } from '../../../decks/projects.js';
import { fitFont } from './canvasText.js';

/** How far toward a single-hue amber tube a picture is taken. 0..1. */
const PHOSPHOR = 0.72;
const PHOSPHOR_INK = '#ff9a3c';

/** The canvas. Portrait, near the glass's own shape so the stretch stays small. */
export const GALLERY = { W: 768, H: 928 };
const { W, H } = GALLERY;
const CANVAS_ASPECT = W / H;

const PAD = 36;
/** The caption strip under the picture — the shot's own name and its place. */
const FOOT = 96;

const INK = {
  field: '#ffb45e',
  quiet: '#a06f2c',
  rule: '#7d5722',
};

const FONT = (px, weight = 400) => `${weight} ${px}px 'Space Mono', 'Consolas', monospace`;

/**
 * The picture's rect inside a box, at its own proportions **after** the canvas
 * is stretched onto the glass.
 *
 * A canvas pixel is not square on the wall: the canvas is `W`×`H` and the glass
 * is whatever the viewport makes it, so a rect drawn `rw`×`rh` here arrives at
 * `rw·(Dw/W)` by `rh·(Dh/H)`. Setting that equal to the photograph's aspect and
 * rearranging leaves one factor — the canvas's aspect over the glass's — which
 * is the whole of the correction. At the sizes this scene runs it is under five
 * per cent, which is exactly the sort of wrong that never looks wrong and never
 * looks right either.
 *
 * @param {number} iw @param {number} ih the image's own pixels
 * @param {{ x: number, y: number, w: number, h: number }} box in canvas pixels
 * @param {number} aspect the glass's width over its height
 */
export function fitShot(iw, ih, box, aspect) {
  if (!(iw > 0) || !(ih > 0) || !(aspect > 0)) return { ...box };
  const want = (iw / ih) * (CANVAS_ASPECT / aspect);
  let w = box.w;
  let h = w / want;
  if (h > box.h) {
    h = box.h;
    w = h * want;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/** Where the picture goes, in canvas pixels. */
export const shotBox = () => ({ x: PAD, y: PAD, w: W - PAD * 2, h: H - PAD * 2 - FOOT });

// ── the tube itself ──────────────────────────────────────────────────────────

/**
 * The dark the picture sits on. Nearly opaque in the middle and thinning at the
 * very edge, so the glass's own fluted glow still leaks round it — the same
 * reasoning as `terminal.js`: a fully opaque canvas is a card taped over the
 * opening.
 *
 * @param {CanvasRenderingContext2D} ctx
 */
function tube(ctx) {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.5, H * 0.8);
  g.addColorStop(0, 'rgba(26,15,6,0.94)');
  g.addColorStop(0.62, 'rgba(19,11,4,0.93)');
  g.addColorStop(1, 'rgba(11,6,3,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** The raster, laid over everything at the end. One line in four, a hair of it. */
function scan(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
}

/**
 * The picture, taken through the phosphor.
 *
 * `'color'` takes the hue and saturation of what is drawn over it and keeps the
 * luminance of what is under — a monochrome conversion done by the compositor
 * rather than by hand — and it is clipped to the picture, so the tube around it
 * is untouched. `globalAlpha` is how much of the way it goes.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} image
 * @param {{ x: number, y: number, w: number, h: number }} r
 */
function phosphor(ctx, image, r) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(image, r.x, r.y, r.w, r.h);
  if (PHOSPHOR > 0) {
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = PHOSPHOR;
    ctx.fillStyle = PHOSPHOR_INK;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // the beam falling off toward the edges of the picture, which is what stops a
  // pasted-in rectangle reading as pasted in
  const v = ctx.createRadialGradient(
    r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.2,
    r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.72,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = v;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** The hairline round the picture, and the light it throws onto the tube. */
function surround(ctx, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,166,74,0.5)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(255,180,90,0.55)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(r.x - 1.2, r.y - 1.2, r.w + 2.4, r.h + 2.4);
  ctx.restore();
}

/**
 * The caption strip: what this picture is, and which of the project's it is.
 *
 * The index is printed only when there is more than one — "1 / 1" under a
 * project with a single photograph is a machine reporting on itself.
 */
function caption(ctx, slide, locale) {
  const y = H - PAD - FOOT;
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = INK.rule;
  ctx.fillRect(PAD, y + 14, W - PAD * 2, 2.4);
  ctx.globalAlpha = 1;

  const base = y + FOOT * 0.72;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255,166,74,0.55)';
  ctx.shadowBlur = 10;
  ctx.font = FONT(34);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK.quiet;
  const text = localized(slide.caption, slide.captionI18n, locale);
  if (text) {
    // The index sits on the other end of the same strip, so a long caption is
    // fitted to what is left rather than to the whole width.
    fitFont(ctx, text, W - PAD * 2 - (slide.shots > 1 ? 120 : 0), 34, FONT);
    ctx.fillText(text, PAD, base);
  }
  if (slide.shots > 1) {
    ctx.font = FONT(34);
    ctx.textAlign = 'right';
    ctx.fillStyle = INK.field;
    ctx.fillText(`${slide.shot} / ${slide.shots}`, W - PAD, base);
  }
  ctx.restore();
}

/**
 * One slide.
 *
 * `image` may be null — while the file is still coming down the wire, and for
 * good if it never does. Both paint the picture's own box and say so inside it
 * rather than leaving the glass blank: a screen that shows nothing while it
 * waits is indistinguishable from a screen that is broken.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasImageSource | null} image
 * @param {import('../../../decks/projects.js').Slide} slide
 * @param {number} aspect the glass's width over its height
 * @param {string} [note] what to print in the box when there is no picture
 * @param {import('../../../i18n/locale.js').LocaleId} [locale]
 */
export function paintSlide(canvas, image, slide, aspect, note, locale = DEFAULT_LOCALE) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  tube(ctx);

  const box = shotBox();
  if (image) {
    const iw = image.naturalWidth ?? image.width;
    const ih = image.naturalHeight ?? image.height;
    const r = fitShot(iw, ih, box, aspect);
    phosphor(ctx, image, r);
    surround(ctx, r);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = INK.rule;
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2.4;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    if (note) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = FONT(34);
      ctx.fillStyle = INK.quiet;
      ctx.fillText(note, box.x + box.w / 2, box.y + box.h / 2);
      ctx.restore();
    }
  }

  caption(ctx, slide, locale);
  scan(ctx);
}

/**
 * The card the tube shows with nothing loaded.
 *
 * A test card rather than a black rectangle, and the difference is not
 * decoration: an empty archive and a broken screen look identical if the glass
 * simply goes dark, and an empty archive is the state this ships in. The ring
 * is drawn as an ellipse on purpose — corrected by the same factor the picture
 * is, so it arrives round on the wall.
 *
 * @param {HTMLCanvasElement} canvas @param {number} aspect
 */
export function paintStandby(canvas, aspect, locale = DEFAULT_LOCALE) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  tube(ctx);

  const cx = W / 2;
  const cy = H * 0.44;
  const k = aspect > 0 ? CANVAS_ASPECT / aspect : 1;
  const r = Math.min(W, H) * 0.26;

  ctx.save();
  ctx.strokeStyle = INK.rule;
  ctx.lineWidth = 2.4;
  ctx.globalAlpha = 0.55;
  // the grid the card is set out on
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + i * r * 0.5 * k, cy - r * 1.5);
    ctx.lineTo(cx + i * r * 0.5 * k, cy + r * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.5 * k, cy + i * r * 0.5);
    ctx.lineTo(cx + r * 1.5 * k, cy + i * r * 0.5);
    ctx.stroke();
  }
  // the ring and the crosshair
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = INK.field;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * k, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.3 * k, cy);
  ctx.lineTo(cx + r * 0.3 * k, cy);
  ctx.moveTo(cx, cy - r * 0.3);
  ctx.lineTo(cx, cy + r * 0.3);
  ctx.stroke();

  // the greyscale wedge every card of the period carries
  const steps = 8;
  const bw = (r * 2.4 * k) / steps;
  for (let i = 0; i < steps; i += 1) {
    ctx.globalAlpha = 0.16 + (i / (steps - 1)) * 0.72;
    ctx.fillStyle = INK.field;
    ctx.fillRect(cx - r * 1.2 * k + i * bw, cy + r * 1.28, bw - 3, r * 0.24);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255,166,74,0.6)';
  ctx.shadowBlur = 14;
  ctx.font = FONT(38, 700);
  ctx.fillStyle = INK.field;
  ctx.fillText(t('screen.archive.head', locale), cx, H * 0.115);
  ctx.font = FONT(34);
  ctx.fillStyle = INK.quiet;
  ctx.fillText(t('screen.archive.empty', locale), cx, H * 0.855);
  ctx.restore();

  scan(ctx);
}

/**
 * Wipe without touching the texture, the material or its compiled program —
 * the contract `clearTerminal` holds, and for the same reason.
 * @param {HTMLCanvasElement} canvas
 */
export function clearGallery(canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, W, H);
}

/** A canvas and the texture over it. One per landing that carries an archive. */
export function gallerySurface() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}

// ── the pictures ─────────────────────────────────────────────────────────────
// Kept by URL for the life of the page. The archive is a handful of files and
// paging back and forth through it must not go to the network again — and, more
// to the point, must not repaint the glass a frame *after* the counter moved.
/** @type {Map<string, HTMLImageElement>} */
const shots = new Map();

/** The image if it is already decoded, so a repeat visit paints in one pass. */
export function readyShot(src) {
  const img = shots.get(src);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** @param {string} src @returns {Promise<HTMLImageElement>} */
export function loadShot(src) {
  const held = shots.get(src);
  if (held) {
    if (held.complete && held.naturalWidth > 0) return Promise.resolve(held);
    return new Promise((ok, no) => {
      held.addEventListener('load', () => ok(held), { once: true });
      held.addEventListener('error', () => no(new Error(src)), { once: true });
    });
  }
  const img = new Image();
  shots.set(src, img);
  const done = new Promise((ok, no) => {
    img.addEventListener('load', () => ok(img), { once: true });
    img.addEventListener('error', () => no(new Error(src)), { once: true });
  });
  img.src = src;
  return done;
}
