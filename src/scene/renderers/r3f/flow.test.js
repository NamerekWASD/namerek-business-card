import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../../i18n/locale.js';
import {
  CYCLE_MS, FLOW, STATIONS, TRAVEL_MS, stationLabels,
  flowAspect, flowAt, flowCanvas, flowLayout, pathAt, travel,
} from './flow.js';

// The same treaty `schematic.test.js` holds over the paper drawing, over a
// drawing that moves. `flow.js` is written in its own canvas's pixels and has
// never heard of a metre; `LandingScreen.jsx` hands it the glass's shape and
// never opens the canvas. Everything below fails *silently* on the wall — a box
// half off the sheet, the return lane drawn back through the stack, an impulse
// arriving at the database before it has been through the service.
//
// And every one of them is checked at **both ends of the range of glass**, plus
// a shape in the middle. The sheet is rebuilt at whatever shape the opening
// comes out at, so a layout that only holds at one aspect is a layout that
// breaks on somebody else's monitor and on nobody's here.
const SHAPES = [FLOW.ASPECT[0], 0.95, FLOW.ASPECT[1]];

// Space Mono's advance, and the same figure `terminal.js` sets its column
// budget from.
const ADVANCE = 0.6;

describe.each(SHAPES)('the request-flow sheet at %s', (aspect) => {
  const L = flowLayout(aspect);

  it('is painted on a canvas the shape of the glass it fills', () => {
    const [w, h] = flowCanvas(aspect);
    expect(w / h).toBeCloseTo(flowAspect(aspect), 2);
    expect(h).toBe(FLOW.H);
  });

  it('rules a frame with an even margin all round', () => {
    expect(L.frame.x).toBe(FLOW.MARGIN);
    expect(L.frame.y).toBe(FLOW.MARGIN);
    expect(L.w - (L.frame.x + L.frame.w)).toBe(FLOW.MARGIN);
    expect(L.h - (L.frame.y + L.frame.h)).toBe(FLOW.MARGIN);
  });

  it('centres the drawing in the frame, however much of it there is', () => {
    expect(L.draw.x - L.frame.x).toBeCloseTo(
      L.frame.x + L.frame.w - (L.draw.x + L.draw.w), 6,
    );
    expect(L.draw.w).toBeLessThanOrEqual(L.frame.w + 1e-9);
  });

  it('stands every station inside the ruled frame', () => {
    L.boxes.forEach((b) => {
      expect(b.x).toBeGreaterThan(L.frame.x);
      expect(b.y).toBeGreaterThan(L.frame.y);
      expect(b.x + b.w).toBeLessThan(L.frame.x + L.frame.w);
      expect(b.y + b.h).toBeLessThan(L.frame.y + L.frame.h);
    });
  });

  it('leaves daylight between one station and the next', () => {
    L.boxes.forEach((b, i) => {
      if (i === 0) return;
      const above = L.boxes[i - 1];
      expect(b.y).toBeGreaterThan(above.y + above.h);
    });
  });

  // A block that has got long enough to read as a bar is the failure the width
  // cap exists to prevent, and it only ever shows up on a wide monitor.
  it('never lets a block stretch out into a bar', () => {
    expect(L.boxes[0].w / L.boxes[0].h).toBeLessThanOrEqual(FLOW.BOX.MAX + 1e-9);
  });

  // NBC-90. Four languages on one drawing, and the boxes were drawn at the
  // German width. `fitFont` will take a point off a legend that overruns, but
  // that is a safety net for a translation nobody measured — a legend that
  // needs it on every screen is a legend that wants rewording, so this holds
  // all four to the size the sheet was designed at.
  it('gives every station a box its own legend fits inside, in all four languages', () => {
    const room = L.boxes[0].w - FLOW.PAD * 2;
    for (const { id } of LOCALES) {
      stationLabels(id).forEach((s) => {
        expect(s.tag.length * FLOW.TAG * ADVANCE, `${s.id}.tag.${id}`).toBeLessThan(room);
        expect(s.sub.length * FLOW.SUB * ADVANCE, `${s.id}.sub.${id}`).toBeLessThan(room);
      });
    }
  });

  it('keeps both legends inside the height of the box', () => {
    expect(FLOW.TAG + FLOW.SUB).toBeLessThan(L.boxes[0].h);
  });

  // The one fault that would turn a block diagram into a tangle: the answer
  // coming back up through the boxes it is supposed to have left.
  it('runs the return lane clear of the stack', () => {
    const lane = L.draw.x + L.draw.w * FLOW.RETURN;
    expect(lane).toBeGreaterThan(L.boxes[0].x + L.boxes[0].w);
    expect(lane).toBeLessThan(L.frame.x + L.frame.w);
  });

  it('turns the return lane below the last station and above the foot rule', () => {
    const last = L.boxes[STATIONS.length - 1];
    const turn = L.frame.y + L.frame.h * FLOW.TURN;
    expect(turn).toBeGreaterThan(last.y + last.h);
    expect(turn).toBeLessThan(L.frame.y + L.frame.h * FLOW.RULE[1]);
  });

  it('keeps both ports between the head rule and the first station', () => {
    FLOW.PORTS.forEach((p) => {
      const y = L.frame.y + L.frame.h * p;
      expect(y).toBeGreaterThan(L.frame.y + L.frame.h * FLOW.RULE[0]);
      expect(y).toBeLessThan(L.boxes[0].y);
    });
  });

  it('brings the request in at one edge of the sheet and lets it out at the other', () => {
    expect(L.path[0][0]).toBe(0);
    expect(L.path[L.path.length - 1][0]).toBe(L.w);
    expect(L.path[0][1]).not.toBeCloseTo(L.path[L.path.length - 1][1], 3);
  });

  it('runs the down lane through the middle of every station', () => {
    L.boxes.forEach((b) => {
      const mid = b.y + b.h / 2;
      const on = L.legs.some((leg) => Math.abs(leg.from[0] - (b.x + b.w / 2)) < 1e-6
        && mid >= Math.min(leg.from[1], leg.to[1])
        && mid <= Math.max(leg.from[1], leg.to[1]));
      expect(on).toBe(true);
    });
  });
});

describe.each(SHAPES)('the impulse at %s', (aspect) => {
  const L = flowLayout(aspect);
  /** The fraction of the run at which the impulse is standing on `u`. */
  const pOf = (u) => {
    for (let i = 0; i <= 2000; i += 1) {
      if (travel(i / 2000, aspect) >= u) return i / 2000;
    }
    return 1;
  };

  it('starts at the inlet and finishes at the outlet', () => {
    const ends = [[pathAt(0, aspect), L.path[0]], [pathAt(1, aspect), L.path[L.path.length - 1]]];
    ends.forEach(([got, want]) => {
      expect(got[0]).toBeCloseTo(want[0], 6);
      expect(got[1]).toBeCloseTo(want[1], 6);
    });
  });

  // Parameterised by arc length in canvas pixels, which is the whole of the
  // correction: this canvas is not square, so an impulse stepped in fractions
  // sprints down the tall axis and dawdles across the wide one.
  it('covers the same ground on every step of the way round', () => {
    const steps = 200;
    const hops = [];
    let total = 0;
    for (let i = 1; i <= steps; i += 1) {
      const [x0, y0] = pathAt((i - 1) / steps, aspect);
      const [x1, y1] = pathAt(i / steps, aspect);
      const d = Math.hypot(x1 - x0, y1 - y0);
      hops.push(d);
      total += d;
    }
    const nominal = total / steps;
    hops.forEach((d) => {
      expect(d).toBeLessThan(nominal * 1.02);
      // a step that turns a right-angle corner cuts it, and the worst cut is
      // the one that turns exactly halfway through — a chord of 1/√2
      expect(d).toBeGreaterThan(nominal * 0.7);
    });
  });

  it('visits the layers in the order the request goes through them', () => {
    expect(L.stations).toHaveLength(STATIONS.length);
    L.stations.forEach((u, i) => {
      expect(u).toBeGreaterThan(0);
      expect(u).toBeLessThan(1);
      if (i > 0) expect(u).toBeGreaterThan(L.stations[i - 1]);
    });
  });

  it('runs from one end of the wire to the other, and only forwards', () => {
    expect(travel(0, aspect)).toBeCloseTo(0, 6);
    expect(travel(1, aspect)).toBeCloseTo(1, 6);
    let last = -1;
    for (let i = 0; i <= 400; i += 1) {
      const u = travel(i / 400, aspect);
      expect(u).toBeGreaterThanOrEqual(last - 1e-9);
      last = u;
    }
  });

  // A request that crosses a layer without stopping in it is a request that did
  // no work there. The dwell is the whole reason the sheet is worth watching a
  // second time.
  it('stops in every layer on the way through', () => {
    L.stations.forEach((u) => {
      let held = 0;
      for (let i = 0; i <= 1000; i += 1) {
        if (Math.abs(travel(i / 1000, aspect) - u) < 1e-3) held += 1;
      }
      expect(held).toBeGreaterThan(1000 * FLOW.DWELL * 0.5);
    });
  });

  it('takes the wire off the sheet between requests', () => {
    expect(flowAt(0, aspect).u).not.toBeNull();
    expect(flowAt(TRAVEL_MS * 0.5, aspect).u).not.toBeNull();
    expect(flowAt(TRAVEL_MS + 1, aspect).u).toBeNull();
    expect(flowAt(CYCLE_MS, aspect).u).toBeCloseTo(0, 6);
  });

  it('lights each layer as the impulse reaches it, and none below it', () => {
    L.stations.forEach((u, i) => {
      const { lit } = flowAt(TRAVEL_MS * pOf(u), aspect);
      expect(lit[i]).toBeGreaterThan(0.9);
      lit.forEach((v, j) => { if (j > i) expect(v).toBe(0); });
    });
  });

  it('lets a layer cool down instead of snapping off', () => {
    const p = pOf(L.stations[0]);
    const hot = flowAt(TRAVEL_MS * p, aspect).lit[0];
    // far enough on that the impulse has left the layer — a probe inside the
    // dwell is a probe of a request that has not moved yet
    const cooling = flowAt(TRAVEL_MS * (p + FLOW.DWELL * 2), aspect).lit[0];
    expect(cooling).toBeLessThan(hot);
    expect(cooling).toBeGreaterThan(0);
  });

  it('leaves the whole sheet dark by the time the next request is due', () => {
    expect(flowAt(CYCLE_MS - 1, aspect).lit.every((v) => v === 0)).toBe(true);
  });
});

describe('the shape the sheet is built at', () => {
  it('rounds a measured glass to a step, so a pixel of resize is not a repaint', () => {
    expect(flowAspect(0.901)).toBeCloseTo(flowAspect(0.907), 6);
  });

  it('holds a glass of any shape inside the range it is drawn for', () => {
    expect(flowAspect(0.2)).toBeCloseTo(FLOW.ASPECT[0], 6);
    expect(flowAspect(4)).toBeCloseTo(FLOW.ASPECT[1], 6);
    expect(flowAspect(NaN)).toBeCloseTo(FLOW.ASPECT[0], 6);
  });

  it('hands back the same layout twice rather than building it again', () => {
    expect(flowLayout(0.9)).toBe(flowLayout(0.903));
  });
});
