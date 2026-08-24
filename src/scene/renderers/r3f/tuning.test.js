import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIGHT_DEFAULTS, LIGHT_GROUPS, LIGHT_KNOBS, knobDiff, readLight, resetKnobs, setKnob, setupSource,
} from './tuning.js';
import { LIGHT_SETUP } from './lightSetup.js';

// No `localStorage` here — this file runs in node, and that is the point: the
// store is expected to work with no storage at all and simply not remember,
// which is exactly its situation on a production build.
beforeEach(resetKnobs);

// The bench's job is to be the *only* place a brightness comes from. Most of
// what can go wrong with that is not visual — a knob with no control, a control
// pointing at nothing, a value that survives a reset — and none of it needs a
// canvas to catch.

describe('the knob catalogue', () => {
  it('gives every knob a group the panel renders', () => {
    for (const knob of LIGHT_KNOBS) {
      expect(LIGHT_GROUPS, knob.key).toContain(knob.group);
    }
  });

  // Ranges live in the catalogue and values in the setup, so "the shipped value
  // is reachable by its own slider" is no longer true by construction. It is the
  // price of the split and this is what pays it.
  it('gives every slider a range its shipped value sits inside', () => {
    for (const knob of LIGHT_KNOBS.filter((k) => k.kind === 'number' || k.kind === 'int')) {
      expect(knob.min, knob.key).toBeLessThanOrEqual(LIGHT_SETUP[knob.key]);
      expect(knob.max, knob.key).toBeGreaterThanOrEqual(LIGHT_SETUP[knob.key]);
      expect(knob.step, knob.key).toBeGreaterThan(0);
    }
  });

  // The seam the split created, and the one thing that can now go quietly wrong:
  // a knob added to the catalogue with no value in the setup reads `undefined`
  // and lights nothing, and a value left in the setup after its knob is gone is
  // a number nobody can reach.
  it('has exactly one value in the setup for every knob, and no more', () => {
    expect(LIGHT_KNOBS.map((k) => k.key).sort()).toEqual(Object.keys(LIGHT_SETUP).sort());
  });

  it('names every knob once', () => {
    const keys = LIGHT_KNOBS.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('offers only options it can actually select', () => {
    for (const knob of LIGHT_KNOBS.filter((k) => k.kind === 'enum')) {
      expect(knob.options, knob.key).toContain(LIGHT_SETUP[knob.key]);
    }
  });
});

// The split itself, as a property. Every knob belongs to exactly one room, and
// the two rooms carry the same set — a knob added to one and forgotten on the
// other is the failure this catches, and it is invisible until someone tries to
// tune the room that is missing it.
describe('the two rooms', () => {
  const ROOMS = ['shaft', 'landing'];
  // The one group that is deliberately neither room's, and the reason it is
  // allowed: a shadow map's resolution is a video-memory budget for the whole
  // scene, not a brightness, so there is no version of it that belongs to one
  // room. Nothing else may join it — see the last test in this block.
  const COST = 'shadows';

  it('puts every knob in exactly one room', () => {
    for (const knob of LIGHT_KNOBS.filter((k) => k.group !== COST)) {
      expect(ROOMS, knob.key).toContain(knob.group);
    }
  });

  it('gives the two rooms the same controls', () => {
    // the shared ones are named for what they do, not for their room, so they
    // are compared by label rather than by key
    const labels = (group) => LIGHT_KNOBS.filter((k) => k.group === group).map((k) => k.label);
    for (const label of ['tone curve', 'exposure', 'ambient', 'wrap']) {
      expect(labels('shaft'), label).toContain(label);
      expect(labels('landing'), label).toContain(label);
    }
  });

  it('leaves no brightness global for one room to drag the other by', () => {
    const shared = LIGHT_KNOBS.filter((k) => !ROOMS.includes(k.group));
    expect(shared.map((k) => k.group)).toEqual(shared.map(() => COST));
  });
});

describe('the store', () => {
  it('starts on the shipped defaults, with nothing to paste back', () => {
    expect(readLight()).toEqual(LIGHT_DEFAULTS);
    expect(knobDiff()).toEqual({});
  });

  it('reports only what was moved', () => {
    setKnob('shaftExposure', 1.4);
    expect(knobDiff()).toEqual({ shaftExposure: 1.4 });
    // and the other room is genuinely untouched, which is the entire point of
    // the split: there is no knob left that reaches both
    expect(readLight().landingExposure).toBe(LIGHT_DEFAULTS.landingExposure);
    expect(readLight().shaftAmbient).toBe(LIGHT_DEFAULTS.shaftAmbient);
  });

  it('forgets a knob moved back to its default', () => {
    setKnob('shaftExposure', 1.4);
    setKnob('shaftExposure', LIGHT_DEFAULTS.shaftExposure);
    expect(knobDiff()).toEqual({});
  });

  it('ignores a key it does not own', () => {
    setKnob('nonesuch', 3);
    expect(readLight().nonesuch).toBeUndefined();
  });

  // The store hands out a new object on every write, because the whole scene
  // reads it through `useSyncExternalStore` — and that compares by identity. A
  // mutated-in-place object is a slider that moves and a scene that does not.
  it('replaces the snapshot rather than mutating it', () => {
    const before = readLight();
    setKnob('shaftExposure', 1.4);
    expect(readLight()).not.toBe(before);
    expect(before.shaftExposure).toBe(LIGHT_DEFAULTS.shaftExposure);
  });

  // What the `copy setup` button puts on the clipboard has one job: to be
  // pasteable over `lightSetup.js` and mean the same thing. So it is checked by
  // evaluating it, rather than by matching it against a string — a format test
  // would pass on output that no longer parses.
  it('writes a setup that parses back to what is on screen', () => {
    setKnob('shaftExposure', 1.4);
    setKnob('shaftColor', '#ff0000');
    const source = setupSource();
    // eslint-disable-next-line no-new-func
    const parsed = new Function(`${source.replace('export const', 'const')}; return LIGHT_SETUP;`)();
    expect(parsed).toEqual(readLight());
  });

  it('puts everything back', () => {
    setKnob('shaftExposure', 1.4);
    setKnob('landingAmbient', 0.4);
    resetKnobs();
    expect(readLight()).toEqual(LIGHT_DEFAULTS);
  });
});
