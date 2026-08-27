// ── making the wall screen read as running ───────────────────────────────────
// The panel was a bake: a pool of light behind fluted glass, painted once and
// then held perfectly still for as long as anyone stood in front of it. It is a
// good picture and it reads as exactly that — «это читается как текстура, а не
// эмиссивный экран с низкой герцовкой».
//
// Three things are wrong with a still screen, and none of them is detail:
//
// *It does not roll.* A tube refreshing slower than the eye shows a wide soft
// band travelling down the picture, because the field rate and the eye never
// agree. `screenRaster` bakes that band; this scrolls it.
//
// *It does not hum.* Mains ripple reaches the beam current, so the whole
// picture breathes by a few per cent. Two sine terms whose periods share no
// factor, for the reason `buttonPulse` gives: one term is a metronome, two
// drifting against each other is a machine idling.
//
// *It never drops a field.* The thing a tube does that a texture never will is
// stumble — a brief dip, not on any beat you can predict.
//
// ── and the bead rolls with it ───────────────────────────────────────────────
// The moulding round the glass is driven from this same waveform, and that is
// the point of it rather than a flourish. Mykolai read the bead as a *gap* in
// the frame — «я только сейчас понял что это труба а не гэп» — and the reason
// it could be read that way is that it was the one member of the frame lit by
// nothing: two of the four beads catch a rake off the pendant and two never can
// (a cylinder gets its highlight from a light crossing its axis, and the
// pendant runs along theirs), so the flat pair went black and a black band
// lying between the glass and the run is a hole. Lit by the screen it surrounds
// — and *flickering with it* — it is unmistakably a thing standing in front of
// the light rather than an absence of one.
//
// ── what it costs ───────────────────────────────────────────────────────────
// Both canvases are `frameloop="demand"`, so the gate is the design and the
// waveform is decoration. It runs only while the landing is furnished — the
// same test `LandingProps` uses, and deliberately not `doorOpen`, which stays
// false through most of the intro's opening curve and left the valve rack dead
// in an open doorway once already. And it ticks at `TICK_MS` rather than per
// frame, which is not only a saving: a screen resampled eighteen times a second
// *is* a screen with a low refresh rate, and driving it off `useFrame` at 160
// fps would smooth away the one quality being built.

import { useEffect } from 'react';
import { invalidateScene } from './frames.js';

/** How often the panel is resampled — its refresh, in every sense. */
const TICK_MS = 55;

/** One pass of the frame bar, top to bottom. */
export const ROLL_MS = 5200;

/** The two hums, in milliseconds per radian. Deliberately not commensurate. */
const HUM = [[0.052, 96], [0.029, 37.3]];

/** How often a dropped field is *possible*, and how long one lasts. */
const STUMBLE_MS = 3700;
const STUMBLE_FOR = 0.014;
const STUMBLE_TO = 0.74;

/**
 * Where the panel is in its own life at `t`, in milliseconds since it woke.
 *
 * `level` multiplies whatever each lamp rests at, so one waveform drives the
 * glass and the bead without either needing to know the other's brightness.
 * `roll` is 0..1 down the panel, handed straight to the raster map's offset.
 *
 * Pure, and deterministic down to the stumble — the wobble comes from hashing
 * the beat rather than from `Math.random`, so a test can find one and two
 * screens woken together stay in step instead of drifting apart.
 *
 * @param {number} t milliseconds
 */
export function screenLife(t) {
  let level = 1;
  for (const [amp, period] of HUM) level += amp * Math.sin(t / period);
  // Which beat we are in decides *where inside it* the field drops, so the
  // stumbles never fall on a rhythm — the same trick `pilotLamps` plays with a
  // distribution, done without keeping any state.
  const beat = Math.floor(t / STUMBLE_MS);
  const at = Math.abs((Math.sin(beat * 12.9898) * 43758.5453) % 1);
  const into = (t % STUMBLE_MS) / STUMBLE_MS;
  if (Math.abs(into - at * 0.94) < STUMBLE_FOR) level *= STUMBLE_TO;
  return { level, roll: (t / ROLL_MS) % 1 };
}

/**
 * What each lamp sits at when the screen is off, remembered the first time it
 * is seen.
 *
 * A `WeakMap` and **not** `material.userData`, which is where this obviously
 * belongs and where it cannot go. R3F re-applies a `userData={{ ... }}` prop
 * whenever the object literal changes identity — every render — so anything
 * parked there is wiped on the next commit and read back a moment later from a
 * value this hook had already animated. That compounds: the panel would drift
 * brighter or darker every time the landing re-rendered. `Room` writes down the
 * same warning about `userData.albedo` for the same reason.
 *
 * @param {import('three').Material} m
 */
const rest = new WeakMap();
const restOf = (m) => {
  if (!rest.has(m)) rest.set(m, m.emissiveIntensity);
  return rest.get(m);
};

/**
 * Every material the screen lights, across however many owners hand them over.
 * Two, today: the landing holds the panel and `ScreenFrame` holds the bead, and
 * neither has any business knowing the other's slots.
 *
 * @param {{ current: (import('three').Material | null)[] }[]} refs
 */
const lamps = (refs) => refs.flatMap((r) => (r?.current ? r.current.filter(Boolean) : []));

/**
 * Drives one landing's screen: its glass, the bead round it, and the frame bar
 * rolling down it.
 *
 * Written straight to the materials and to the texture's offset, never through
 * React state — a screen that lives through `setState` re-renders the whole
 * landing eighteen times a second for two floats. Same rule as `buttonPulse`,
 * same reason, and see `useRideMotion` for what this scene does when something
 * that moves is positioned from a prop.
 *
 * @param {{ current: (import('three').Material | null)[] }[]} glow the slots
 *   every material carrying the screen's own light is handed up through — the
 *   panel, and the eight pieces of bead. Memoise the array: it is an effect
 *   dependency, and a fresh one per render restarts the screen every commit.
 * @param {import('three').Texture | null} bar the raster overlay's own map,
 *   scrolled down the panel. Null until the bake lands.
 * @param {boolean} live whether anyone can see this landing at all.
 */
export default function useScreenLife(glow, bar, live) {
  useEffect(() => {
    const settle = () => {
      for (const m of lamps(glow)) m.emissiveIntensity = restOf(m);
      if (bar) bar.offset.y = 0;
      invalidateScene();
    };

    if (!live) {
      settle();
      return undefined;
    }

    const t0 = performance.now();
    let timer = 0;
    const step = () => {
      const { level, roll } = screenLife(performance.now() - t0);
      for (const m of lamps(glow)) m.emissiveIntensity = restOf(m) * level;
      // Down the panel, the way the fields are drawn. A map's offset moves
      // where the surface *samples*, not where the picture goes, so winding it
      // up walks the bar down — the sign is the opposite of the one you write
      // first, and it is visible in a screenshot which way it went.
      if (bar) bar.offset.y = roll;
      invalidateScene();
      timer = setTimeout(step, TICK_MS);
    };
    step();

    return () => {
      clearTimeout(timer);
      settle();
    };
  }, [glow, bar, live]);
}
