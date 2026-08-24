import { describe, expect, it } from 'vitest';
import { VARIANTS, WEAR_SEED, panelWearURL } from './panelWear.js';
import { RIVET_INSET, RIVET_SIZE } from './CornerRivets.jsx';

// What a test can hold here is the *description*, not the picture — how a plate
// looks is a taste call and belongs in front of eyes. The description is worth
// pinning because it is the half that can be wrong silently: a field that says
// "the bolts" and puts the rust in the middle looks fine in isolation and only
// reads as wrong next to the four bolts drawn over it in DOM.

const W = 320;
const H = 140;
const at = (field, fx, fy) => field(fx * W, fy * H, W, H);

describe('a plate variant', () => {
  it('offers a recipe for every name a call site can pass', () => {
    for (const [name, recipe] of Object.entries(VARIANTS)) {
      expect(typeof recipe.field, name).toBe('function');
      expect(typeof recipe.paint, name).toBe('object');
    }
  });

  it('puts the corrosion where CornerRivets puts the bolts', () => {
    // The two files describe one fact and this is the assertion that keeps them
    // describing the same one: move a bolt in `CornerRivets` and this follows
    // it, because both read the same constants.
    const field = VARIANTS.plate.field(W, H, 1);
    const bx = (RIVET_INSET + RIVET_SIZE / 2) / W;
    const by = (RIVET_INSET + RIVET_SIZE / 2) / H;
    const bolt = at(field, bx, by);
    const clear = at(field, 0.5, 0.42);
    expect(bolt).toBeGreaterThan(clear);
  });

  it('wears a plate at its rim and leaves the middle of it alone', () => {
    const field = VARIANTS.plate.field(W, H, 1);
    expect(at(field, 0.5, 0.45)).toBeLessThan(0.35);
    expect(at(field, 0.005, 0.5)).toBeGreaterThan(0.6);
  });

  it('puts `handled` where a hand lands rather than round the edge', () => {
    const field = VARIANTS.handled.field(W, H, 1);
    expect(at(field, 0.5, 0.66)).toBeGreaterThan(at(field, 0.5, 0.1));
  });

  it('gathers `weathered` toward the bottom, which is what the draught does', () => {
    const field = VARIANTS.weathered.field(W, H, 1);
    expect(at(field, 0.5, 0.95)).toBeGreaterThan(at(field, 0.5, 0.2));
  });

  it('is the same plate twice for one seed and a different one for another', () => {
    const a = VARIANTS.plate.field(W, H, 3);
    const b = VARIANTS.plate.field(W, H, 3);
    const other = VARIANTS.plate.field(W, H, 9);
    const sample = (f) => Array.from({ length: 9 }, (_, i) => at(f, (i + 1) / 10, 0.5));
    expect(sample(a)).toEqual(sample(b));
    expect(sample(a)).not.toEqual(sample(other));
  });
});

describe('the seed register', () => {
  it('leaves room for a deck to grow a plate without borrowing the next deck\'s', () => {
    const seeds = Object.values(WEAR_SEED).sort((a, b) => a - b);
    for (let i = 1; i < seeds.length; i += 1) {
      expect(seeds[i] - seeds[i - 1]).toBeGreaterThan(16);
    }
  });
});

describe('baking one', () => {
  it('declines rather than throwing where there is no 2D context', () => {
    // Two ways to have nothing to draw on and one answer to both: the runner
    // has no `document` at all, jsdom has one with no 2D context. The plate
    // falls back to its gradient and nothing else notices.
    expect(panelWearURL(W, H, { seed: 1 })).toBeNull();
  });
});
