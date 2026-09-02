import { describe, expect, it } from 'vitest';
import {
  CHANGE_MS, NOTICE, NOTICE_ROWS, swapped, warmUp, wrapLines,
} from './notice.js';
import { SLIDES } from '../../../decks/projects.js';

// The screen that replaced the enamel plate on 2. UG. Every clause here is
// about the one thing it was built to do — be *seen* changing — and every one
// of them fails silently on the landing rather than throwing.

describe('the tube, changing project', () => {
  it('sits at its own level when nothing has changed', () => {
    expect(warmUp(null)).toBe(1);
    expect(warmUp(0)).toBe(1);
  });

  // The whole point. A screen that dips to a dim grey and comes back is a
  // screen nobody notices; one that goes out is an event.
  it('goes fully dark before it comes back', () => {
    expect(warmUp(NOTICE.FADE)).toBeCloseTo(0, 6);
  });

  it('falls the whole way there rather than stepping', () => {
    const early = warmUp(NOTICE.FADE * 0.25);
    const late = warmUp(NOTICE.FADE * 0.75);
    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThan(0);
  });

  // "как на старых телевизорах" — a cathode does not come up to level, it comes
  // up past it. Without the overshoot this is a cross-fade with extra steps.
  it('strikes brighter than it settles', () => {
    const peak = warmUp(NOTICE.FADE + NOTICE.FLARE * NOTICE.RISE);
    expect(peak).toBeGreaterThan(1.5);
  });

  it('settles back to exactly its own level and stays there', () => {
    expect(warmUp(CHANGE_MS)).toBe(1);
    expect(warmUp(CHANGE_MS * 4)).toBe(1);
  });

  it('never goes negative or leaves the tube dark', () => {
    for (let ms = 0; ms <= CHANGE_MS + 200; ms += 7) {
      expect(warmUp(ms)).toBeGreaterThanOrEqual(0);
    }
    expect(warmUp(CHANGE_MS - 1)).toBeGreaterThan(0.9);
  });

  // The new words go up while the tube is black, which is why the fade has to
  // reach zero rather than merely get dim: at any other moment the swap itself
  // would be visible as a jump.
  it('swaps the text at the bottom of the fade and nowhere else', () => {
    expect(swapped(0)).toBe(false);
    expect(swapped(NOTICE.FADE - 1)).toBe(false);
    expect(swapped(NOTICE.FADE)).toBe(true);
    expect(swapped(null)).toBe(true);
  });
});

describe('the print', () => {
  // Every character is six pixels wide in this fake, so a line holds ten words
  // of five characters. Real measurement is the canvas's job; the greedy walk
  // is this function's.
  const measure = (s) => s.length * 6;

  it('breaks on words and never mid-word', () => {
    const lines = wrapLines('ein laden fuer spiele katalog warenkorb', 60, measure);
    expect(lines.every((l) => l.length * 6 <= 60 || !l.includes(' '))).toBe(true);
    expect(lines.join(' ')).toBe('ein laden fuer spiele katalog warenkorb');
  });

  it('loses no words, whatever the width', () => {
    const text = 'a bb ccc dddd eeeee ffffff';
    for (const w of [12, 30, 60, 400]) {
      expect(wrapLines(text, w, measure).join(' ')).toBe(text);
    }
  });

  it('lets a word wider than the line overhang rather than dropping it', () => {
    expect(wrapLines('supercalifragilistic', 30, measure)).toEqual(['supercalifragilistic']);
  });

  it('is empty for an empty archive', () => {
    expect(wrapLines('', 100, measure)).toEqual([]);
  });

  // The one clause that ties the canvas to the hand-edited archive: a blurb
  // long enough to overflow the tube would be silently cut off at the bottom,
  // and nothing else in the project would say so.
  it('holds every blurb the archive actually has', () => {
    for (const slide of SLIDES) {
      // ~46 characters a line at this canvas's measure, taken conservatively
      expect(wrapLines(slide.blurb, 46, (s) => s.length).length)
        .toBeLessThanOrEqual(NOTICE_ROWS);
    }
  });
});
