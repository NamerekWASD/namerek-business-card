import { describe, expect, it } from 'vitest';
import { BELT, bandOffset, beltSlide, beltSlots } from './belt.js';

// Every clause here fails silently on the landing rather than throwing: two
// boxes standing in each other, a manifest with its letters stretched, a belt
// that reads as running the wrong way, the archive's second project never
// reaching the stop. At 156 screen pixels wide none of them announce
// themselves; they just make the room slightly wrong.

describe('the conveyor', () => {
  // A box wider than its slot is two boxes interpenetrating, which at this
  // distance reads as one long box with a seam in it.
  it('leaves a gap between one box and the next', () => {
    expect(BELT.BOX.w).toBeLessThan(BELT.PITCH);
  });

  // The manifest is painted on a 4:3 canvas — see `artifactFace`. A face of any
  // other shape stretches every letter on it, and the letters are the whole
  // point of the box. Same clause the framed schematic is held to.
  it('puts the manifest on a face the shape of the canvas it is painted on', () => {
    expect(BELT.BOX.w / BELT.BOX.h).toBeCloseTo(4 / 3, 2);
  });

  // The station has to stand clear of the mouth, or the box at the stop is
  // half inside the wall.
  it('stands the station clear of the mouth in the wall', () => {
    expect(BELT.UPSTREAM).toBeGreaterThan(BELT.BOX.w);
  });

  it('carries a box narrower than the belt it stands on', () => {
    expect(BELT.BOX.d).toBeLessThan(BELT.WIDE);
  });
});

describe('the band', () => {
  it('moves one slat of run for one slat of texture', () => {
    // A tile is four slats, so a whole tile of offset is four slats of belt.
    const oneTile = (BELT.SLAT * BELT.SLATS_PER_TILE) / BELT.SPEED;
    expect(bandOffset(oneTile * 1000)).toBeCloseTo(1, 6);
  });

  // The one failure that makes a working belt look broken: sampled slower than
  // twice its own slat rate, a scrolling pattern reads as standing still or as
  // running backwards. This is the belt's Nyquist limit and the reason `HZ`
  // and `SPEED` are written next to each other.
  it('is sampled fast enough not to appear to run backwards', () => {
    const perTick = BELT.SPEED / BELT.HZ;
    expect(perTick).toBeLessThan(BELT.SLAT / 2);
  });

  // And the other side of it: ticked so slowly that the belt steps rather than
  // runs. Two pixels of a room whose metre is around 380 scene pixels.
  it('is not sampled so slowly that the belt steps', () => {
    expect(BELT.SPEED / BELT.HZ).toBeLessThan(BELT.SLAT / 20);
  });
});

describe('the train, advancing', () => {
  it('starts a slot back and settles against the stop', () => {
    expect(beltSlide(0)).toBe(1);
    expect(beltSlide(BELT.SLIDE_MS)).toBe(0);
  });

  it('is still moving in the middle and slowest at the end', () => {
    const early = beltSlide(BELT.SLIDE_MS * 0.2) - beltSlide(BELT.SLIDE_MS * 0.3);
    const late = beltSlide(BELT.SLIDE_MS * 0.8) - beltSlide(BELT.SLIDE_MS * 0.9);
    expect(early).toBeGreaterThan(late);
  });

  it('holds still until a project has actually changed', () => {
    expect(beltSlide(null)).toBe(0);
  });

  it('does not run past the stop when a tick lands late', () => {
    expect(beltSlide(BELT.SLIDE_MS * 4)).toBe(0);
  });
});

describe('the archive, riding', () => {
  const archive = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('holds the project on the glass at the stop', () => {
    const at = beltSlots(archive, 1);
    expect(at.find((s) => s.slot === 0).project.id).toBe('b');
  });

  it('queues what has not shipped upstream and sends what has downstream', () => {
    const at = beltSlots(archive, 1);
    expect(at.find((s) => s.slot === -1).project.id).toBe('a');
    expect(at.find((s) => s.slot === 1).project.id).toBe('c');
  });

  it('leaves the belt empty where the archive has run out', () => {
    // The honest picture of a two-project archive, and the reason this is a
    // filter rather than a placeholder box.
    expect(beltSlots(archive, 2).map((s) => s.slot)).toEqual([-1, 0]);
    expect(beltSlots(archive, 0).map((s) => s.slot)).toEqual([0, 1, 2]);
  });

  it('puts no project in two slots at once', () => {
    const ids = beltSlots(archive, 1).map((s) => s.project.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is legal and empty with an empty archive', () => {
    expect(beltSlots([], 0)).toEqual([]);
  });
});
