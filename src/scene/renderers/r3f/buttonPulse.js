// ── telling a viewer that a button is a button ───────────────────────────────
// The wall screen's controls are modelled, lit and pressable, and none of that
// says *press me*. Mykolai's words for the problem: человек не догадается что
// их можно нажимать. On a real panel of this period the answer is not a label,
// it is that the legend is **lit** — an illuminated pushbutton advertises
// itself, and a dark one is a plate.
//
// So the invitation is a slow swell in the legend's own emissive, and the rule
// for who gets one is the rule the panel itself would follow: a control lights
// when it will *do* something. PREV lights while there is a page behind you,
// NEXT while there is one ahead, and the GITHUB button lights always, because
// it always goes somewhere.
//
// ── out of step, on purpose ─────────────────────────────────────────────────
// Three lamps pulsing together is a warning; three drifting against each other
// is a panel idling. The periods are deliberately not multiples of one another,
// so the phase relationship never repeats and the row never falls into a beat —
// the same reason `pilotLamps` draws its waits from a distribution instead of a
// timer.
//
// ── and what it costs ───────────────────────────────────────────────────────
// This is the one thing in the scene that genuinely needs a *ramp* rather than
// an event: a swell is a continuum, and `pilotLamps`' trick of sleeping until
// the next change does not apply when the value changes constantly. So it is a
// tick, and both canvases are `frameloop="demand"` — which makes the gate the
// important half of the design, not the waveform.
//
// It is gated twice. It runs only while `live` — the doors on this landing are
// actually open — and only ever for the one landing that has a console, so a
// viewer standing anywhere else in the building is paying nothing. And it ticks
// at `TICK_MS` rather than per frame: a two-second swell sampled seventeen times
// a second is smooth to the eye and asks for a quarter of the frames a
// `useFrame` would. Measured against the alternative that matters: a naive
// `useFrame` pulse never lets the scene rest again while anyone stands on
// Projekte.

import { useEffect } from 'react';
import { invalidateScene } from './frames.js';

/**
 * What a legend glows at, in `emissiveIntensity`. Exported because the pointer
 * handlers write the same material — a button under the finger has to stop
 * pulsing and answer the finger instead, and the two files agreeing about the
 * numbers is what makes handing the material back and forth invisible.
 */
export const GLOW = {
  dead: 0,
  idle: 0.22,
  peak: 1.5,
  hover: 0.55,
  press: 0.9,
};

/**
 * Where a control sits when nothing is happening to it.
 *
 * There are two resting levels, not one, and that is the whole of NBC-26. A
 * control that will do nothing was only ever *skipped* by the swell, which left
 * it at `idle` — and `idle` is where every live lamp spends most of its cycle,
 * because the waveform is squared and holds near its floor. So PREV on the
 * first picture and NEXT on the last were, in any still frame, the same object
 * as the two beside them: same legend, same reveal, same amber. The one signal
 * was the cursor, and a viewer who does not hover slowly never sees it.
 *
 * The panel's own idiom settles it: a lamp in a socket either glows or it does
 * not. Dark is `0` rather than a dim value, because both lamps this drives are
 * additive — at zero they add nothing at all, and what is left is the cap's own
 * face, where the legend is *engraved* as well as lit (see `buttonFace`). The
 * dead control keeps its lettering, in grey, a step off the phenolic it is cut
 * into, with no light round its edge. Which is what a dead button looks like.
 *
 * @param {boolean} enabled whether pressing it would do anything
 */
export const rest = (enabled) => (enabled ? GLOW.idle : GLOW.dead);

/** How often the swell is resampled. See the note on cost above. */
const TICK_MS = 60;

/**
 * Where in its swell a lamp is, 0..1.
 *
 * A raised cosine squared rather than a plain one: squaring holds it near dark
 * for most of the cycle and gives it a brief, definite crest, which reads as a
 * lamp being *pulsed* rather than a value being animated. A plain sine, at the
 * amplitude needed to be noticed, looks like the panel is breathing.
 *
 * @param {number} t milliseconds
 * @param {number} period milliseconds for one cycle
 * @param {number} phase 0..1, where in the cycle this lamp starts
 */
export function wave(t, period, phase) {
  const p = ((t / period) + phase) % 1;
  const s = 0.5 - 0.5 * Math.cos(Math.PI * 2 * p);
  return s * s;
}

/**
 * Every material one button drives. A button is two lamps, not one — the
 * legend struck on its face and the light escaping round it out of the reveal
 * it sits in — and they swell together off one waveform because they are one
 * bulb behind one plate. Both are `meshStandardMaterial`, so both take the same
 * `emissiveIntensity`, and how bright each *reads* at a given intensity is
 * decided where it is baked rather than by giving the driver two numbers.
 *
 * @param {import('three').Material | import('three').Material[] | null} entry
 * @returns {import('three').Material[]}
 */
const lamps = (entry) => {
  if (!entry) return [];
  return Array.isArray(entry) ? entry.filter(Boolean) : [entry];
};

/**
 * Drives a row of legend materials.
 *
 * Written straight to the materials, never through React state — a pulse
 * through `setState` would re-render this landing seventeen times a second for
 * a change to one float, and the landing holds the pendant, the props and the
 * whole wall screen. Same rule as `pilotLamps`, same reason.
 *
 * @param {{ current: (import('three').Material | import('three').Material[] | null)[] }} legends
 * @param {{ current: boolean[] }} hot which buttons the pointer currently owns.
 *   Those are skipped: hover and press are answers to the viewer and outrank an
 *   invitation the viewer has already accepted.
 * @param {Array<{ period: number, phase: number } | null>} specs one per button;
 *   `null` for a control that has nothing to offer and so does not light.
 * @param {boolean} live false while the doors are shut — a panel nobody can see
 *   must not be keeping the scene awake.
 */
export default function useButtonPulse(legends, hot, specs, live) {
  // Serialised, so the effect re-runs when a button becomes available or stops
  // being available — which is exactly when PREV or NEXT reaches the end of the
  // run and has to go dark — and not on every render of the frame around it.
  const shape = JSON.stringify(specs);

  useEffect(() => {
    const plan = JSON.parse(shape);
    const dark = () => {
      for (let i = 0; i < plan.length; i += 1) {
        if (hot.current?.[i]) continue;
        for (const material of lamps(legends.current?.[i])) {
          material.emissiveIntensity = rest(!!plan[i]);
        }
      }
      invalidateScene();
    };

    if (!live || !plan.some(Boolean)) {
      dark();
      return undefined;
    }

    const t0 = performance.now();
    let timer = 0;
    const step = () => {
      const t = performance.now() - t0;
      let changed = false;
      for (let i = 0; i < plan.length; i += 1) {
        if (hot.current?.[i]) continue;
        const spec = plan[i];
        const want = spec
          ? GLOW.idle + (GLOW.peak - GLOW.idle) * wave(t, spec.period, spec.phase)
          : GLOW.dead;
        for (const material of lamps(legends.current?.[i])) {
          if (material.emissiveIntensity === want) continue;
          material.emissiveIntensity = want;
          changed = true;
        }
      }
      if (changed) invalidateScene();
      timer = setTimeout(step, TICK_MS);
    };
    step();

    return () => {
      clearTimeout(timer);
      dark();
    };
  }, [legends, hot, shape, live]);
}
