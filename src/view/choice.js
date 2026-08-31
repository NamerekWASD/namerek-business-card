// Which of the two renderings of the card a visitor gets, and — the part that
// needed a file of its own — how a visitor who disagrees makes that stick.
//
// NBC-56 asked for that default to be judged on a real handset rather than
// argued, and it now has been — a Pixel 6a on a cable, the production build,
// portrait. The scene does not present the card there: at 411px the name is
// cut to "MYKOLA / TYMCHE", every line of the intro is clipped, and the deck
// navigation runs 343px past the right edge. Sweeping the viewport width on
// that same device puts the point where nothing clips any more at 820px —
// which is `SCENE_MIN_WIDTH` below, and is a measurement rather than the
// `max-width` guess the ticket warned against. The speed was the weaker half
// of the case and pointed the same way: the scene freezes the main thread for
// between five and nine seconds on arrival and then holds about 30fps, where
// the flat card settles in 0.6s at a flat 60.
//
// So the width is a *floor under the default*, not a rule about phones. A
// desktop window narrowed past 820px clips exactly as badly as a handset and
// gets the same answer, and nothing here asks what kind of device is holding
// the viewport.
//
// `?flat` / `?scene` were doing half of that job: they force a path, but they
// live in the URL, so the choice lasts exactly as long as nobody types the bare
// domain again — and the two links that switch between the renderings
// (`Dieselpunk`'s corner, `FloorKontakt`'s despatch desk) hand out precisely
// that bare domain on the next visit. So the flag is now also a *preference*:
// arriving with one writes it down, and a later visit with no flag honours it.
//
// The one thing a stored preference may never do is hand someone a blank page.
// A remembered `scene` on a machine that cannot grant a WebGL context is
// ignored — the capability probe is a floor under the preference, not a
// default the preference replaces.

export const KEY = 'namerek:view';

/** @typedef {'scene' | 'flat'} View */

/** @type {View[]} */
const VIEWS = ['scene', 'flat'];

/**
 * The narrowest viewport that shows the scene's card whole, measured on the
 * device rather than chosen: at 480px the heading is still 2px short, at 760px
 * the deck navigation still hangs 6px off the edge, and at 820px neither does.
 */
export const SCENE_MIN_WIDTH = 820;

/**
 * Whether the scene has the room to present its content. An unmeasurable width
 * — no window, a stub, a zero — is not evidence that it will clip, so it does
 * not gate.
 * @param {number | null | undefined} width
 */
export function sceneFits(width) {
  return !Number.isFinite(width) || width <= 0 || width >= SCENE_MIN_WIDTH;
}

/**
 * The flag in the URL, if there is one. `?flat` wins over `?scene` when both
 * are present, on the grounds that the flat card is the one that always works.
 * @returns {View | null}
 */
export function readOverride(search) {
  const params = new URLSearchParams(search ?? '');
  if (params.has('flat')) return 'flat';
  if (params.has('scene')) return 'scene';
  return null;
}

// Every access is guarded. `localStorage` is not merely empty in a private
// window or with site data blocked — reading it *throws*, and an uncaught
// throw here would take down the root before either rendering got a chance.
function safely(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** @returns {View | null} */
export function storedChoice(storage) {
  const raw = safely(() => storage?.getItem(KEY) ?? null);
  return VIEWS.includes(raw) ? raw : null;
}

/** @param {View} view */
export function rememberChoice(view, storage) {
  if (!VIEWS.includes(view)) return;
  safely(() => storage?.setItem(KEY, view));
}

/**
 * The width only ever moves the *default*. A flag and a remembered preference
 * both still win over it — someone who asks for the scene on a phone gets the
 * scene, clipped and all, because that is what "the visitor must always be
 * able to override it" means — and nothing about a narrow viewport is written
 * down as a choice, so the same visitor on a desktop is back to the scene.
 * @param {{
 *   search?: string,
 *   storage?: Storage | null,
 *   capable: boolean,
 *   width?: number | null,
 * }} input
 * @returns {View}
 */
export function chooseView({ search, storage, capable, width }) {
  const override = readOverride(search);
  if (override) {
    rememberChoice(override, storage);
    return override === 'scene' && !capable ? 'flat' : override;
  }
  const stored = storedChoice(storage);
  if (stored) return stored === 'scene' && !capable ? 'flat' : stored;
  return capable && sceneFits(width) ? 'scene' : 'flat';
}
