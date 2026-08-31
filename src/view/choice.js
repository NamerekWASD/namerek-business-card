// Which of the two renderings of the card a visitor gets, and — the part that
// needed a file of its own — how a visitor who disagrees makes that stick.
//
// NBC-56 leaves the *default* for phones open: it has to be judged on a real
// handset, not argued. What it does not leave open is the escape hatch. "The
// visitor must always be able to override it, and the override must survive a
// reload" is a requirement of whichever of the three outcomes is chosen, so it
// is built now and the default rule below is the one that was already here.
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
 * @param {{ search?: string, storage?: Storage | null, capable: boolean }} input
 * @returns {View}
 */
export function chooseView({ search, storage, capable }) {
  const override = readOverride(search);
  if (override) {
    rememberChoice(override, storage);
    return override === 'scene' && !capable ? 'flat' : override;
  }
  const stored = storedChoice(storage);
  if (stored) return stored === 'scene' && !capable ? 'flat' : stored;
  return capable ? 'scene' : 'flat';
}
