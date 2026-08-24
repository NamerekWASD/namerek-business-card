// ── the lighting setup ───────────────────────────────────────────────────────
// The values the scene ships with. This file is the *only* place a shipped
// brightness lives, and it is deliberately nothing but a flat object — no
// arithmetic, no imports, no cleverness — because it is a file that gets
// replaced wholesale rather than edited line by line.
//
// The workflow it exists for:
//
//   1. run the dev server with `?renderer=r3f`, dial the panel on the right
//      until the scene looks the way you want it;
//   2. press `copy setup` — the clipboard now holds this object, in full, with
//      your values in it (it is also printed to the console, for the case where
//      the clipboard is refused);
//   3. paste it over the object below and commit.
//
// That is the whole handoff. The panel's own state lives in localStorage, which
// is one browser on one machine and is never read by a production build — so
// until a setup is pasted in here it is not really saved, and it will not be
// deployed. Once it is here it is source: it survives a reload, a different
// browser, a different machine, and a deploy.
//
// ── two rooms, two sets of numbers ───────────────────────────────────────────
// The shaft and a landing are separate rooms with an opaque wall between them,
// lit by two quite different fittings: a small bulkhead lamp in a reflector,
// bolted to the shaft wall, and a shaded pendant hanging in the middle of a
// corridor. Nothing about those two lamps is shared, so nothing below is either
// — every value here belongs to exactly one of them.
//
// That now includes the two that used to be global and had no business being so.
// `ambient` is what a room bounces back into its own corners, and a tight brick
// shaft bounces nothing like a plastered corridor does. `wrap` is how far past a
// right angle a face still catches its lamp, which depends on how big and how
// close that lamp is: the pendant hangs in open air and strikes things at real
// angles, while the bulkhead lamp sits practically *in* the plane of everything
// it lights and reaches almost none of it unaided. One slider for both meant
// every attempt to rescue the shaft washed the landing out, and no value existed
// that was right for both. Two sliders is the fix.
//
// The tone curve is in both blocks, which is worth a word because it is the one
// thing here that is normally impossible to separate: it is the last operation
// on a pixel, and by then both rooms are the same image. three saves it — it
// compiles the curve into every material's shader rather than running it over
// the finished frame, so the surfaces of one room really can be graded apart
// from the other's. `roomTone.js` does that, and also names the price: shaft
// geometry meets landing geometry along the doorway, and two curves far apart
// meet along that edge as a visible tonal step. Two exposures on one curve is
// the quiet version; two curves is a choice to make with your eyes open.
//
// `renderers/r3f/tuning.js` holds the *ranges* for these — what each one means,
// what a sane span for it is, which control the panel draws. Numbers here,
// meaning there.

/** @type {Record<string, number | string>} */
export const LIGHT_SETUP = {
  // SHAFT — the bulkhead lamp on the wall
  shaftToneCurve: 'cineon',
  shaftExposure: 2,
  shaftAmbient: 0.335,
  shaftWrap: 0,
  shaftLights: 3,
  lampPower: 3.6,
  lampReach: 420,
  keyGain: 3.34,
  shaftColor: '#ffcf9a',
  glassEmissive: 0.9,
  glowSize: 4,
  glowOpacity: 0.46,

  // LANDING — the pendant in the corridor
  landingToneCurve: 'aces',
  landingExposure: 1.72,
  landingAmbient: 0.465,
  landingWrap: 0,
  landingIntensity: 6.1,
  landingDecay: 2.09,
  landingColor: '#ffcf9a',
  landingGlass: 3.85,

  // SHADOWS — what they cost, not how bright they are
  shadowMapSize: 1024,
  shadowRadius: 14,
};
