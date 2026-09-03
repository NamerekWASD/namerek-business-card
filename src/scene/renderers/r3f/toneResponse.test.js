// The gate NBC-72 did not have.
//
// Its subject is one failure that took an evening of live probing and was never
// actually found that way: two props in the landing rendered black under
// `neutral` while the room around them did not. The cause is arithmetic —
// `NeutralToneMapping` subtracts a black point taken from the *minimum* channel,
// which costs a warm ochre nothing and costs a cold near-grey everything — so
// the check is arithmetic too, and it costs a third of a second instead of an
// evening. `toneResponse.js` carries the model and the argument.

import { describe, it, expect } from 'vitest';
import { ShaderChunk } from 'three';
import { SURFACES } from '../../model/materials.js';
import { LIGHT_SETUP } from './lightSetup.js';
import { roomLight } from './tuning.js';
import {
  AGX_MAX_EV, AGX_MIN_EV, CURVES, NEUTRAL_TOE, formatSweep, renderedLevel, sweep,
} from './toneResponse.js';

const LANDING = /** @type {any} */ (roomLight(LIGHT_SETUP, 'landing'));

// ── the props this speaks for ───────────────────────────────────────────────
// Deliberately not every `xAt(n)` in `LandingProps.jsx`. There are sixty-odd of
// them and their shades run from 0.4 to 3.6, because a great many are meant to
// be dark — a recess, a shadow-side member, the underside of a shelf. A floor
// applied to all of them would be a stream of false alarms and would be turned
// off within a week.
//
// What is listed is the furniture that occupies real screen area at the
// landing's own camera, plus the wall it is seen against. A prop joins this list
// when it is big enough that a reader would call it "that black thing".
const PROPS = [
  { name: 'conveyor rollers', surface: SURFACES.steel, shade: 3.6 },
  { name: 'lift beam & shoe', surface: SURFACES.steel, shade: 2.15 },
  { name: 'lift bars', surface: SURFACES.iron, shade: 2.6 },
  { name: 'conveyor channels', surface: SURFACES.iron, shade: 2.5 },
  { name: 'landing wall', surface: SURFACES.landing, shade: 2.6 },
];

const REFERENCE = 'landing wall';

/**
 * The floor a prop has to clear to read as a thing rather than a hole.
 *
 * In *model* units, which are not screen units: the model deliberately leaves
 * the lamp out (see `toneResponse.js`), so everything here reads lower than it
 * does on screen. Calibrated against what NBC-72 actually looked like — under
 * `neutral` the rollers modelled at 20 and the lift beam at 11 and both were
 * reported black, while the iron members at 29-30 and the wall at 35 were not
 * complained about. 28 is the line between those two groups.
 */
const FLOOR = 28;

/**
 * How far a prop's brightness *relative to the wall* is allowed to move when
 * the tone curve changes.
 *
 * This is the real invariant, and it is the one with no taste in it: a curve is
 * a grade for the whole room, so whatever it does to the wall it should do to
 * the furniture. Every warm surface in the scene sits at 1.05-1.25 across all
 * seven curves. The two cold ones swing by 2.3 and 2.7, which is another way of
 * writing the bug.
 */
const MAX_SWING = 1.5;

/** A prop's level over the wall's, under one curve. */
const ratio = (/** @type {any} */ prop, /** @type {string} */ toneCurve) => {
  const grade = { ...LANDING, toneCurve };
  const wall = /** @type {any} */ (PROPS.find((p) => p.name === REFERENCE));
  return renderedLevel(prop.surface, prop.shade, grade)
    / Math.max(1, renderedLevel(wall.surface, wall.shade, grade));
};

/** The widest that ratio moves across every curve the panel offers. */
const curveSwing = (/** @type {any} */ prop) => {
  const rs = Object.keys(CURVES).map((c) => ratio(prop, c));
  return Math.max(...rs) / Math.max(1e-6, Math.min(...rs));
};

const table = () => `\n${formatSweep(sweep(PROPS, LANDING))}\n`;

// ── the table, on demand ────────────────────────────────────────────────────
// `npm run tone` prints it and nothing else; a normal `npm test` skips it, so
// the suite stays quiet. The condition is the npm script's own name because
// that is the one signal that survives to here: `FOO=1 vitest` is not a thing
// `cmd.exe` understands, and a vitest test runs in a forked worker that is not
// given the command line.
//
// Add a prop to `PROPS` and run it. That is the whole of the workflow this file
// exists to replace: no dev server, no reload, no screenshot, no raycast.
it.runIf(process.env.npm_lifecycle_event === 'tone')('the sweep', () => {
  console.log(table());
});

// ── is the model still a model of the renderer we ship? ─────────────────────
// The curves in `toneResponse.js` are transcribed from GLSL that cannot be
// called from JS, so nothing but this checks that the transcription still
// matches. A three upgrade that re-tunes a curve has to be noticed here, or the
// gate below quietly starts grading a renderer nobody is running.
describe('the ported curves still match three', () => {
  const pars = ShaderChunk.tonemapping_pars_fragment;

  it('keeps Neutral\'s black point where the model puts it', () => {
    expect(pars).toContain(`float offset = x < ${NEUTRAL_TOE} ? x - 6.25 * x * x : 0.04;`);
    expect(pars).toContain('const float StartCompression = 0.8 - 0.04;');
    expect(pars).toContain('const float Desaturation = 0.15;');
  });

  it('keeps AgX\'s log domain where the model puts it', () => {
    expect(pars).toContain(`const float AgxMinEv = ${String(AGX_MIN_EV).replace('-', '- ')};`);
    expect(pars).toContain(`const float AgxMaxEv = ${AGX_MAX_EV};`);
  });

  // `none` is absent on purpose: it is three's `NoToneMapping`, which is the
  // absence of a function rather than one of them.
  const GLSL = {
    linear: 'Linear', reinhard: 'Reinhard', cineon: 'Cineon', aces: 'ACESFilmic', agx: 'AgX', neutral: 'Neutral',
  };

  it('names every curve the dispatcher branches on', () => {
    expect(Object.keys(CURVES).filter((c) => c !== 'none').sort()).toEqual(Object.keys(GLSL).sort());
    for (const fn of Object.values(GLSL)) {
      expect(pars).toContain(`vec3 ${fn}ToneMapping( vec3 color )`);
    }
  });
});

// ── the fault itself, held as a fact ────────────────────────────────────────
describe('what NBC-72 was', () => {
  it('collapses the cold props under neutral and leaves the warm ones standing', () => {
    const under = (/** @type {string} */ c) => Object.fromEntries(
      PROPS.map((p) => [p.name, renderedLevel(p.surface, p.shade, { ...LANDING, toneCurve: c })]),
    );
    const n = under('neutral');
    const a = under('agx');

    // the two the user circled: more than halved by the curve alone
    expect(n['conveyor rollers']).toBeLessThan(a['conveyor rollers'] / 2);
    expect(n['lift beam & shoe']).toBeLessThan(a['lift beam & shoe'] / 2);
    // the warm members standing beside them: barely touched
    expect(n['lift bars']).toBeGreaterThan(a['lift bars'] * 0.85);
    expect(n['landing wall']).toBeGreaterThan(a['landing wall'] * 0.85);
  });

  it('is a property of the pigment, not of the light', () => {
    // The same shade on iron instead of steel survives the curve that erases
    // steel — which is the whole finding, and the cheapest fix available.
    const asSteel = renderedLevel(SURFACES.steel, 2.15, { ...LANDING, toneCurve: 'neutral' });
    const asIron = renderedLevel(SURFACES.iron, 2.15, { ...LANDING, toneCurve: 'neutral' });
    expect(asIron).toBeGreaterThan(asSteel * 2);
  });
});

describe('the landing reads at the grade it ships', () => {
  it('puts no large prop below the floor', () => {
    for (const p of PROPS) {
      const level = renderedLevel(p.surface, p.shade, LANDING);
      expect(
        level,
        `${p.name} renders at ${level} under '${LANDING.toneCurve}', below the floor of ${FLOOR}.${table()}`,
      ).toBeGreaterThanOrEqual(FLOOR);
    }
  });

  // The characterisation half, and the one that actually stops a repeat. Two
  // props in this scene are legible only because the landing is graded `agx`;
  // they are named here so that a third one cannot join them silently, and so
  // that flipping the grade back fails the test above by name rather than
  // showing up as a black band in a screenshot a day later.
  it('knows exactly which props depend on the curve for their legibility', () => {
    const fragile = PROPS.filter((p) => curveSwing(p) > MAX_SWING).map((p) => p.name);
    expect(fragile, table()).toEqual(['conveyor rollers', 'lift beam & shoe']);
  });

  it('holds every warm surface steady against the wall whatever the curve', () => {
    for (const p of PROPS.filter((x) => x.surface !== SURFACES.steel)) {
      expect(curveSwing(p), `${p.name}${table()}`).toBeLessThan(MAX_SWING);
    }
  });
});
