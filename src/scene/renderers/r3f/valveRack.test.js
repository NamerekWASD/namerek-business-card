import { describe, expect, it } from 'vitest';
import { RACK, rackCol, rackGap, rackStrip } from './propArt.js';

// The rack is painted in one file and built in another, and the two never see
// each other: `propArt.js` has a canvas and no idea what a metre is,
// `LandingProps.jsx` has metres and never opens the canvas. `RACK` is the
// treaty between them, and everything below is a clause of it that would fail
// silently in the room — a strip hidden behind the valves it labels, a guard
// wire down the middle of a valve, a driven socket that stands empty. None of
// it is visible on the bench, all of it is obvious at 1600×900, and by then it
// is a screenshot and a round trip.

const [PX_W, PX_H] = RACK.CANVAS;
/** A strip's band down the plate, rebate included. */
const strip = (r) => [rackStrip(r), rackStrip(r) + RACK.STRIP_H / PX_H];
/** What a row of valves occupies, top and bottom. */
const valves = (r) => [RACK.SHELVES[r] - RACK.VALVE_H, RACK.SHELVES[r]];

describe('the valve rack', () => {
  // A plate 0.79 as wide as it is tall, painted on a canvas 0.86 as wide,
  // stretches every circle on it into an ellipse. Nobody notices on a bolt
  // head; everybody notices on the scorch ring round the supply lamp.
  it('is painted on a canvas the shape of the plate it goes on', () => {
    expect(PX_W / PX_H).toBeCloseTo(RACK.PLATE.W / RACK.PLATE.H, 2);
  });

  // Three decks of eight, which is what Mykolai asked for and what the case
  // was resized around.
  it('holds three rows of eight', () => {
    expect(RACK.SHELVES).toHaveLength(3);
    expect(RACK.COLS).toBe(8);
  });

  it('labels each row above the valves standing on it, and clear of the bead', () => {
    for (let r = 0; r < RACK.SHELVES.length; r += 1) {
      const [top, bottom] = strip(r);
      expect(top).toBeGreaterThan(RACK.BEAD / PX_H);
      expect(bottom).toBeLessThan(valves(r)[0]);
    }
  });

  // A deck's own ledger is painted where the deck bolts on. A strip drifting up
  // into it is a legend printed over a bolt row.
  it('keeps a strip out of the deck above it', () => {
    for (let r = 1; r < RACK.SHELVES.length; r += 1) {
      expect(rackStrip(r)).toBeGreaterThan(RACK.SHELVES[r - 1]);
    }
  });

  // The band under the bottom deck carries the mimic and the supply lamp, and
  // the guard stops above it: a guard belongs over the glass, not over the
  // thing someone has to read.
  it('leaves the legend band below the bottom deck clear of the guard', () => {
    const guardBottom = RACK.RAILS[RACK.RAILS.length - 1];
    expect(guardBottom).toBeGreaterThan(RACK.SHELVES[2]);
    expect(guardBottom).toBeLessThan(RACK.PILOT[1]);
    expect(RACK.PILOT[1]).toBeLessThan(1 - RACK.BEAD / PX_H);
  });

  // The whole point of putting the wires on the column boundaries: at this size
  // a guard crossing the valves takes a bite out of every one of them, and a
  // guard is a thing you read the rack *through*.
  it('runs every guard wire down a gap, never across a valve', () => {
    const half = (rackCol(1) - rackCol(0)) / 2;
    for (let c = 0; c <= RACK.COLS; c += 1) {
      for (let k = 0; k < RACK.COLS; k += 1) {
        expect(Math.abs(rackGap(c) - rackCol(k))).toBeGreaterThanOrEqual(half - 1e-9);
      }
    }
  });

  // Both fields stay inside the brass bead, which is the only thing on the
  // plate allowed to be bright and the only edge it has.
  it('keeps the columns inside the field', () => {
    expect(rackGap(0)).toBeGreaterThan(RACK.BEAD / PX_W);
    expect(rackGap(RACK.COLS)).toBeLessThan(1 - RACK.BEAD / PX_W);
  });

  // A driven socket with no valve in it is a lamp with nothing to be: the
  // material ref would attach to nothing and `usePilotLamps` would write to a
  // hole in the array for the life of the page, which is exactly the sort of
  // fault that shows up as one dead lamp and no error at all.
  it('never drives a socket that stands empty', () => {
    const sockets = RACK.SHELVES.length * RACK.COLS;
    for (const [socket] of RACK.STAGE) {
      expect(socket).toBeGreaterThanOrEqual(0);
      expect(socket).toBeLessThan(sockets);
      expect(RACK.EMPTY).not.toContain(socket);
    }
    expect(new Set(RACK.STAGE.map(([s]) => s)).size).toBe(RACK.STAGE.length);
  });

  // The budget, stated as a test because it is the reason most of the rack sits
  // still: this scene is `frameloop="demand"` and every driven valve is a
  // landing redrawn. Eight is what a board of pilot lamps cost, and it is what
  // this one is allowed to cost.
  it('drives no more of the rack than the old board did', () => {
    expect(RACK.STAGE.length).toBeLessThanOrEqual(8);
  });
});
