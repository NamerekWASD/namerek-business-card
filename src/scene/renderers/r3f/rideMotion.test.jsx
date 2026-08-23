// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createRideTicker } from '../../../lift/rideTicker.js';
import useRideMotion from './useRideMotion.js';

// R3F's own hook, stubbed down to the one thing this hook asks it for. The
// alternative is mounting a `<Canvas>`, which wants a WebGL context.
//
// The stub's state is one frozen object, and that is load-bearing rather than
// tidy: a fresh `invalidate` per render changes the identity the subscription
// effect depends on, so React tears the subscription down and builds it again
// on every commit — and `subscribe` fires its callback immediately with the
// live snapshot, which writes the right answer *after* the layout effect wrote
// the wrong one and hides the very defect this file exists to catch. Checked by
// reintroducing the defect and watching these tests fail.
const R3F_STATE = Object.freeze({ invalidate: () => {} });
vi.mock('@react-three/fiber', () => ({ useThree: (select) => select(R3F_STATE) }));

// ── the judder guard ─────────────────────────────────────────────────────────
//
// This is here because the same defect has been fixed more than once and has
// come back with the next edit each time, so it is written down as an
// executable rule rather than as a comment somebody will edit past.
//
// **The rule: while a ticker exists, nothing may write a position that did not
// come from it.**
//
// A ride is one number changing sixty-odd times a second. The ticker writes it
// straight to the object every frame; React is told about the same number and
// mirrors it into state, and that mirror is always at least one commit behind,
// because React schedules its work *off* the notification rather than inside
// it. Two writers, one of them stale, and the shaft steps backwards by a
// frame's worth of travel every time React commits. Measured in a live scene
// before this guard existed: roughly one frame in three went the wrong way,
// worst at the end of a trip, where the ride profile's own overshoot is already
// reversing and the doorway is moving against the leaves opening inside it.
//
// It reads as a flicker, so it gets chased in the door code, which is not where
// it lives. If this test fails, the fix is in `useRideMotion` — not in
// `Doorway`, not in `ride.js`, and not by adding another `Math.max` somewhere.
describe('useRideMotion', () => {
  /** Renders one object driven by the hook, and reports every write to it. */
  function mount(ticker, settled) {
    const target = { y: null };
    const writes = [];
    function Probe({ settled: s }) {
      const ref = useRideMotion(ticker, (object, floorPos) => {
        object.y = floorPos;
        writes.push(floorPos);
      }, s);
      ref.current = target;
      return null;
    }
    const { rerender } = render(<Probe settled={settled} />);
    return { target, writes, rerender: (s) => rerender(<Probe settled={s} />) };
  }

  it('never writes a stale settled position over the ticker s live one', () => {
    const ticker = createRideTicker();
    const { target, rerender } = mount(ticker, 0);

    // a trip under way, held at a known point
    ticker.setScrub({ from: 0, to: 4, p: 0.5 });
    const live = ticker.getSnapshot().floorPos;
    expect(live).toBeGreaterThan(0);
    expect(target.y).toBe(live);

    // React catches up a frame late: the commit carries the *previous* frame's
    // position, which is exactly what a mirror of a per-frame number looks like
    const stale = live / 2;
    rerender(stale);

    expect(target.y).toBe(live);
    expect(target.y).not.toBe(stale);
  });

  // ── the door-flicker guard ─────────────────────────────────────────────────
  //
  // The other half of the same mistake, and the one that actually reached the
  // screen. This effect runs whenever React commits — including in the middle
  // of a trip — and it used to tell the write `null` for the snapshot, which
  // means "nothing is under way, compute a rest state". The door leaves then
  // read which floor we are standing at off a React prop that is a commit
  // behind, decided we were still at the floor we had left, and slammed a
  // two-thirds-open leaf shut for exactly one frame. Logged live on a
  // two-floor arrival: twice in the last 150ms of the trip.
  //
  // Short trips flickered and long ones did not, which is what made this so
  // hard to corner: the same stray write happens on a long trip too, but it
  // lands while the doors are still shut, where writing "shut" changes nothing.
  //
  // If this test fails, the fix is here — not in `Doorway`, and not by adding
  // another guard that throws the offending call away instead of making it
  // correct.
  it('hands the write the ticker s live snapshot mid-ride, never null', () => {
    const ticker = createRideTicker();
    const seen = [];
    const target = { y: null };
    function Probe({ settled }) {
      const ref = useRideMotion(ticker, (object, floorPos, snapshot) => {
        object.y = floorPos;
        seen.push(snapshot);
      }, settled);
      ref.current = target;
      return null;
    }
    const { rerender } = render(<Probe settled={0} />);

    ticker.setScrub({ from: 2, to: 0, p: 0.9 });
    seen.length = 0;
    // a commit lands in the middle of the trip
    rerender(<Probe settled={1.5} />);

    expect(seen.length).toBeGreaterThan(0);
    for (const snapshot of seen) {
      expect(snapshot).not.toBeNull();
      expect(snapshot.ride).toMatchObject({ from: 2, to: 0 });
      // and the floor it reports standing at is the ticker's, not the prop's
      expect(snapshot.deckIndex).toBe(ticker.getSnapshot().deckIndex);
    }
  });

  it('still honours the settled prop when there is no ticker to ask', () => {
    const { target, rerender } = mount(null, 0);
    expect(target.y).toBe(0);
    rerender(2.5);
    expect(target.y).toBe(2.5);
  });

  it('writes the resting floor once a trip has settled', () => {
    const ticker = createRideTicker();
    const { target } = mount(ticker, 0);
    ticker.setScrub({ from: 0, to: 3, p: 1 });
    expect(target.y).toBe(3);
    // and the rest state survives a commit that arrives after it
    ticker.setScrub(null);
    expect(target.y).toBe(ticker.getSnapshot().floorPos);
  });
});
