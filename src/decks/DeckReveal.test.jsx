// @vitest-environment jsdom
//
// NBC-78. A floor's text is not painted on the cage's opening — it is printed on
// that landing's back wall and looked at *through* the hole its own floor has in
// the shaft's masonry. Clipped to the cage's opening alone, as it was, a heading
// stayed on screen long after its own doorway had gone behind the brick, which
// is what Mykolai caught mid-ride between the ground floor and the second.
//
// jsdom composites nothing, so this cannot say what the picture looks like. What
// it holds is the arithmetic underneath it: two planes, two rates, and the
// nearer one — the hole — is the faster.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { RideTickerProvider } from '../lift/RideTickerContext.js';
import { BACK_WALL_SCALE } from '../scene/model/camera.js';
import { LANDING_WALL_SCALE } from '../scene/model/geometry.js';
import DeckReveal from './DeckReveal.jsx';

const PITCH = 1400;
const HEIGHT = 756;

/** The two things the component asks a ticker for, and a hand on the crank. */
function stubTicker(start = 0) {
  let floorPos = start;
  const subscribers = new Set();
  return {
    getSnapshot: () => ({ floorPos }),
    subscribe(fn) {
      subscribers.add(fn);
      fn({ floorPos });
      return () => subscribers.delete(fn);
    },
    emit(next) {
      floorPos = next;
      for (const fn of subscribers) fn({ floorPos });
    },
  };
}

const offsetOf = (el) => Number(/translateY\((-?[\d.]+)px\)/.exec(el.style.transform)[1]);

function mount(ticker, props = {}) {
  const { container } = render(
    <RideTickerProvider value={ticker}>
      <DeckReveal floor={0} settled={0} floorPitch={PITCH} height={HEIGHT} {...props}>
        <p>Leistungen</p>
      </DeckReveal>
    </RideTickerProvider>,
  );
  const hole = container.firstElementChild;
  return { hole, wall: hole.firstElementChild };
}

afterEach(cleanup);

describe('DeckReveal', () => {
  it('sits exactly where the deck used to when the cage is parked at it', () => {
    const { hole, wall } = mount(stubTicker(0));
    expect(offsetOf(hole)).toBe(0);
    expect(offsetOf(wall)).toBe(0);
  });

  it('runs the opening at the masonry rate and the text at the wall behind it', () => {
    const ticker = stubTicker(0);
    const { hole, wall } = mount(ticker);
    ticker.emit(0.4);
    expect(offsetOf(hole)).toBeCloseTo(0.4 * PITCH * BACK_WALL_SCALE, 0);
    // what the eye actually reads is the sum of the two transforms
    expect(offsetOf(hole) + offsetOf(wall)).toBeCloseTo(0.4 * PITCH * LANDING_WALL_SCALE, 0);
  });

  it('takes the text behind the brick before the cage s own opening would', () => {
    const ticker = stubTicker(0);
    const { hole, wall } = mount(ticker);
    ticker.emit(0.4);
    // The whole of the fix in one line: the text is still well inside the cage's
    // opening (which is HEIGHT tall, centred), and it is the masonry that has to
    // cover it. Only an `overflow: hidden` on the moving opening does that.
    expect(Math.abs(offsetOf(hole) + offsetOf(wall))).toBeLessThan(HEIGHT / 2);
    expect(offsetOf(hole)).toBeGreaterThan(HEIGHT / 2);
    expect(hole.style.overflow).toBe('hidden');
  });

  it('lifts the text off centre by its floor s own rise, and only that', () => {
    const { wall } = mount(stubTicker(0), { rise: 0.12 });
    expect(offsetOf(wall)).toBeCloseTo(-0.12 * HEIGHT, 0);
  });

  it('falls back to the settled position where there is no ticker at all', () => {
    const { hole } = mount(null, { settled: 1 });
    expect(offsetOf(hole)).toBeCloseTo(PITCH * BACK_WALL_SCALE, 0);
  });
});
