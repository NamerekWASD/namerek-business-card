// ── the lighting bench ───────────────────────────────────────────────────────
// Every number the R3F backend uses to decide how bright something is, in one
// place, live-editable, and persisted.
//
// This exists because the light was being tuned the only way it could be: edit
// a constant, save, wait for the reload, look, guess again. Lighting is not a
// thing anyone gets right by guessing — it is a thing you dial while looking at
// it, because the eye is judging six coupled numbers at once (ambience against
// key, key against falloff, falloff against the tone curve) and no one of them
// has a right value on its own. A reload between every guess makes that
// impossible, so the guessing never converges and the scene stays wrong.
//
// So the knobs live in a store rather than in `const`s. `lighting.js` and the
// components that light things read them at call time; the debug panel writes
// them; a change re-renders whatever subscribed and invalidates the canvases.
// The values here are still the shipped defaults — the panel is a bench, not a
// config file — and a dev session's overrides are kept in localStorage so the
// work survives a reload without ever reaching a production build.

import { useSyncExternalStore } from 'react';
import { LIGHT_AMBIENT } from '../../model/lighting.js';
import { TONE_CURVE_IDS } from './roomTone.js';
import { LIGHT_SETUP } from './lightSetup.js';
import { DEBUG_PANEL } from '../../effects/quality.js';

/**
 * The curves on offer, by the name the panel shows.
 *
 * These are no longer three's `*ToneMapping` constants, because the renderer no
 * longer chooses: each room's materials carry their own curve as a uniform, so
 * what a name maps to is the integer the patched shader branches on. See
 * `roomTone.js`.
 */
export const TONE_CURVES = TONE_CURVE_IDS;

/**
 * The knobs, as data: what each one means, what a sane span for it is, and which
 * control the panel draws for it. The *values* are not here — they are in
 * `lightSetup.js`, which is the file a tuning session gets pasted into.
 *
 * Splitting them that way is the whole reason the handoff is one paste. Values
 * mixed in among ranges and prose would mean hunting sixteen `value:` fields
 * scattered through a commented file, which is a merge conflict waiting to
 * happen and an easy place to update fifteen of them.
 *
 * A descriptor list rather than a plain object, because the panel is generated
 * from it: a knob that exists cannot be missing a control, and a control cannot
 * point at a knob that is gone. `tuning.test.js` holds the third edge — that
 * this list and the setup name exactly the same keys.
 *
 * @type {{ key: string, group: string, label: string, kind: 'number'|'int'|'color'|'enum',
 *          min?: number, max?: number, step?: number, options?: string[], note?: string }[]}
 */
export const LIGHT_KNOBS = [
  // ── the shaft ──────────────────────────────────────────────────────────────
  // A bulkhead lamp in a reflector, bolted to the wall — and the room it is in
  // is a tight brick well that bounces very little back.
  //
  // The ambience is not a light: it rides on every surface as emissive at that
  // surface's own albedo, which is the same arithmetic as an `ambientLight`
  // without being another object in the graph. `Room` applies it.
  //
  // The CSS model's 0.26 came straight across at first and was far too much,
  // because there it is added *before* a shade multiplier well under one while
  // here nothing divides it again — it landed as a flat floor under every plane
  // and no corner of the shaft ever went dark.
  // Its own grade. A tone curve is normally the one thing that cannot be
  // per-room — it is the last thing to touch a pixel — but three compiles it
  // into each material's shader rather than running it over the finished frame,
  // so the two rooms genuinely can be graded apart. See `roomTone.js`, which
  // also names the price: shaft geometry abuts landing geometry at the doorway,
  // and two curves far apart meet along that edge as a visible tonal step.
  {
    key: 'shaftToneCurve', group: 'shaft', label: 'tone curve', kind: 'enum',
    options: Object.keys(TONE_CURVES),
    note: 'neutral rolls highlights and keeps hue; none clips them to white',
  },
  {
    key: 'shaftExposure', group: 'shaft', label: 'exposure', kind: 'number',
    min: 0.1, max: 2.5, step: 0.01,
  },
  {
    key: 'shaftAmbient', group: 'shaft', label: 'ambient', kind: 'number',
    min: 0, max: 0.5, step: 0.005,
    note: `what the well bounces back; the CSS model says ${LIGHT_AMBIENT} for the whole scene`,
  },
  // How far past ninety degrees a face still catches this lamp. It matters most
  // here of anywhere: the fittings stand 26px proud of a wall, so they sit
  // practically in the plane of the piers, frames and leaves they are meant to
  // light, and at 0 — plain Lambert — they reach none of it and the shaft is
  // carried by ambience alone. See `softLight.js`.
  {
    key: 'shaftWrap', group: 'shaft', label: 'wrap', kind: 'number',
    min: 0, max: 1.2, step: 0.01,
    note: 'how far past 90 degrees a face still catches the bulkhead lamp',
  },
  {
    key: 'shaftLights', group: 'shaft', label: 'lights kept', kind: 'int',
    min: 1, max: 4, step: 1,
    note: 'how many of the nearest fittings get a real light',
  },
  {
    key: 'lampPower', group: 'shaft', label: 'lamp power', kind: 'number',
    min: 0, max: 8, step: 0.05,
  },
  {
    key: 'lampReach', group: 'shaft', label: 'lamp reach', kind: 'number',
    min: 120, max: 1600, step: 10,
  },
  {
    key: 'keyGain', group: 'shaft', label: 'key gain', kind: 'number',
    min: 0, max: 8, step: 0.01,
    note: 'three.js Lambert carries a 1/pi the CSS model does not; pi puts it back',
  },
  { key: 'shaftColor', group: 'shaft', label: 'colour', kind: 'color' },
  {
    key: 'glassEmissive', group: 'shaft', label: 'glass', kind: 'number',
    min: 0, max: 8, step: 0.05,
    note: 'how hard a fitting own glass glows',
  },
  {
    key: 'glowSize', group: 'shaft', label: 'halo size', kind: 'number',
    min: 0, max: 9, step: 0.1,
  },
  {
    key: 'glowOpacity', group: 'shaft', label: 'halo strength', kind: 'number',
    min: 0, max: 1, step: 0.01,
  },

  // ── the landing's own fitting ──────────────────────────────────────────────
  // The single loudest thing in the frame, and the reason this file exists.
  // At decay 1.35 a point light barely falls off at all across a room this size,
  // so the pendant was lighting the back wall, the skirting, the cornice and the
  // props at very nearly the same strength — a room lit by a flashbulb rather
  // than by a shaded lamp hanging in it. Decay 2 is what an actual source does,
  // and it is what makes the far corners of the landing go dark on their own.
  // Its own room, so its own floor: a plastered corridor with furniture in it
  // bounces more than a brick shaft, and this is the slider that says so
  // without touching the shaft at all.
  {
    key: 'landingToneCurve', group: 'landing', label: 'tone curve', kind: 'enum',
    options: Object.keys(TONE_CURVES),
    note: 'far from the shaft curve, the doorway edge becomes a visible step',
  },
  {
    key: 'landingExposure', group: 'landing', label: 'exposure', kind: 'number',
    min: 0.1, max: 2.5, step: 0.01,
  },
  {
    key: 'landingAmbient', group: 'landing', label: 'ambient', kind: 'number',
    min: 0, max: 0.5, step: 0.005,
    note: 'what the corridor bounces back — independent of the shaft',
  },
  // Lower than the shaft's, and that is the point of splitting them. This lamp
  // hangs in open air in the middle of its room and strikes things at real
  // angles, so it needs far less help past the terminator; the wrap that
  // rescues the shaft flattens the landing.
  {
    key: 'landingWrap', group: 'landing', label: 'wrap', kind: 'number',
    min: 0, max: 1.2, step: 0.01,
    note: 'how far past 90 degrees a face still catches the pendant',
  },
  {
    key: 'landingIntensity', group: 'landing', label: 'pendant', kind: 'number',
    min: 0, max: 12, step: 0.05,
    note: 'x1e5 candela — the scene is modelled in screen pixels, so distances are large',
  },
  {
    key: 'landingDecay', group: 'landing', label: 'pendant decay', kind: 'number',
    min: 0.5, max: 3, step: 0.01,
  },
  { key: 'landingColor', group: 'landing', label: 'colour', kind: 'color' },
  {
    key: 'landingGlass', group: 'landing', label: 'bulb', kind: 'number',
    min: 0, max: 8, step: 0.05,
  },

  // ── what the shadows cost ───────────────────────────────────────────────
  // The only knobs here that are not a brightness. They are on the bench for the
  // same reason the brightnesses are — the right value is the one that still
  // looks right, and that is a thing to find by eye rather than by argument —
  // except that what they trade against is video memory rather than taste.
  //
  // A point light's shadow is a *cube*: six faces of `size²`, as RGBA8 and again
  // as depth, so one light at 2048 holds 201 MB and the rig's eight (four per
  // canvas) held 1.6 GB of an 8 GB card. Every step down the slider quarters
  // that — 1024 is 50 MB a light, 512 is 12.6 — and it quarters the rasterising
  // too, which is what `frameloop: 'demand'` pays on every change in the frame.
  {
    key: 'shadowMapSize', group: 'shadows', label: 'map size', kind: 'int',
    min: 256, max: 2048, step: 256,
    note: 'per light: 2048 = 201 MB, 1024 = 50 MB, 512 = 12.6 MB — six cube faces, twice',
  },
  // Free, and independent of the above: three's point-light PCF path always
  // samples the same five-tap disk and only scales it by this. A small map with
  // a generous radius reads as a soft shadow rather than as a low-resolution
  // one, which is what makes the slider above cheaper than it looks.
  {
    key: 'shadowRadius', group: 'shadows', label: 'softness', kind: 'number',
    min: 0, max: 20, step: 0.5,
    note: 'blur radius, flat cost — it hides the seams a smaller map leaves',
  },
];

export const LIGHT_GROUPS = ['shaft', 'landing', 'shadows'];

/**
 * What the scene draws when nobody has touched anything — the committed setup,
 * verbatim. The panel calls these "the defaults" and compares against them to
 * decide what is worth copying back.
 * @type {Record<string, any>}
 */
export const LIGHT_DEFAULTS = Object.freeze({ ...LIGHT_SETUP });

const STORE_KEY = 'namerek:lighting';

// Read back only on a build that has the panel. A deployed business card must
// draw the numbers in this file and nothing else — a stale override in one
// visitor's localStorage silently relighting the scene for them, months later,
// is the kind of bug that is never reported and never found.
function stored() {
  if (!DEBUG_PANEL || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    // only keys that still exist: a knob removed from the list above must not
    // come back from disk
    return Object.fromEntries(
      Object.entries(saved).filter(([k]) => k in LIGHT_DEFAULTS),
    );
  } catch {
    return {};
  }
}

let current = { ...LIGHT_DEFAULTS, ...stored() };

/** @type {Set<() => void>} */
const listeners = new Set();

function publish() {
  if (DEBUG_PANEL && typeof localStorage !== 'undefined') {
    try {
      const diff = knobDiff();
      if (Object.keys(diff).length) localStorage.setItem(STORE_KEY, JSON.stringify(diff));
      else localStorage.removeItem(STORE_KEY);
    } catch { /* private mode, quota — the bench still works, it just forgets */ }
  }
  for (const notify of listeners) notify();
}

/** The live values. Read at call time, never captured. */
export const readLight = () => current;

/**
 * The half of the setup that belongs to one room.
 *
 * The keys are prefixed rather than nested — `shaftAmbient`, not
 * `shaft.ambient` — because the setup is a flat object that gets pasted whole,
 * and a nested one would make `copy setup` a formatter rather than a list. This
 * is the one place that knows the prefixes, so nothing else has to build a key
 * out of a string.
 *
 * @param {Record<string, any>} tuning @param {'shaft' | 'landing'} room
 */
export const roomLight = (tuning, room) => (room === 'landing'
  ? {
    ambient: tuning.landingAmbient,
    wrap: tuning.landingWrap,
    toneCurve: tuning.landingToneCurve,
    exposure: tuning.landingExposure,
  }
  : {
    ambient: tuning.shaftAmbient,
    wrap: tuning.shaftWrap,
    toneCurve: tuning.shaftToneCurve,
    exposure: tuning.shaftExposure,
  });

/** @param {string} key @param {any} value */
export function setKnob(key, value) {
  if (!(key in LIGHT_DEFAULTS) || current[key] === value) return;
  current = { ...current, [key]: value };
  publish();
}

export function resetKnobs() {
  current = { ...LIGHT_DEFAULTS };
  publish();
}

/** Everything the bench has been moved away from — used to decide what is worth copying, and to label a moved knob in the panel. */
export const knobDiff = () => Object.fromEntries(
  Object.entries(current).filter(([k, v]) => v !== LIGHT_DEFAULTS[k]),
);

/** Titles for the panel's sections, and for the comments in a copied setup. */
// Nothing is shared any more, and the titles say which lamp each block is for
// rather than which part of the pipeline it touches — the question a person
// standing in front of the scene is actually asking.
export const GROUP_TITLES = {
  shaft: 'SHAFT — the bulkhead lamp on the wall',
  landing: 'LANDING — the pendant in the corridor',
  shadows: 'SHADOWS — what they cost, not how bright they are',
};

/**
 * The current values, written out as the body of `lightSetup.js`.
 *
 * The whole object, not just what was moved — because the point is that this is
 * pasted *over* the file rather than merged into it. A diff would leave the
 * reader to work out which of two places a given number now comes from, which
 * is exactly the confusion this split was made to avoid.
 *
 * Grouped and commented the way the file is, so a pasted setup reads like
 * something a person wrote rather than like a dump.
 */
export function setupSource() {
  const quote = (v) => (typeof v === 'string' ? `'${v}'` : String(v));
  const out = ['export const LIGHT_SETUP = {'];
  for (const group of LIGHT_GROUPS) {
    if (out.length > 1) out.push('');
    out.push(`  // ${GROUP_TITLES[group]}`);
    for (const knob of LIGHT_KNOBS.filter((k) => k.group === group)) {
      out.push(`  ${knob.key}: ${quote(current[knob.key])},`);
    }
  }
  out.push('};');
  return out.join('\n');
}

// The bench, from the console and from a screenshot harness — the same handle
// `window.__scenes` and `window.__shots` already give the rest of the scene. A
// slider is the right control for dialling by eye; it is the wrong one for
// "show me these four settings side by side", which is how a choice between two
// nearly-identical rigs actually gets made.
//
//   __light.read()                  // everything, live
//   __light.set({ exposure: 1.2 })  // several at once
//   __light.diff()                  // what you would paste back
//
if (DEBUG_PANEL && typeof window !== 'undefined') {
  window.__light = {
    read: readLight,
    knobs: LIGHT_KNOBS,
    defaults: LIGHT_DEFAULTS,
    set: (values) => { for (const [k, v] of Object.entries(values)) setKnob(k, v); },
    reset: resetKnobs,
    diff: knobDiff,
  };
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The live values, as a hook. Anything whose appearance depends on a knob must
 * call this rather than `readLight()` — that is what makes a drag repaint it.
 */
export function useLightTuning() {
  return useSyncExternalStore(subscribe, readLight, () => LIGHT_DEFAULTS);
}
