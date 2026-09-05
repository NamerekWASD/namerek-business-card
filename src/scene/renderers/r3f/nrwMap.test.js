import { describe, expect, it } from 'vitest';
import {
  LEGS, MAP, PING_CYCLE_MS, PING_MS, PLACES,
  mapAspect, mapCanvas, mapLayout, nameBox, pingAt,
} from './nrwMap.js';

// The treaty `flow.test.js` holds over the request sheet, over the route card.
// `nrwMap.js` is written in its own canvas's pixels and has never heard of a
// metre; `LandingScreen.jsx` hands it the glass's shape and never opens the
// canvas. What that leaves is a class of fault nobody sees until they are
// standing on the 3. OG: a stop half off the sheet, two names printed over each
// other, the river running through a city, a leg labelled with the wrong city's
// distance.
//
// And every one of them is checked at **both ends of the range of glass**, plus
// a shape in the middle. The sheet is rebuilt at whatever shape the opening
// comes out at, so a layout that only holds at one aspect is a layout that
// breaks on somebody else's monitor and on nobody's here.
const SHAPES = [MAP.ASPECT[0], 0.95, MAP.ASPECT[1]];

/** Two boxes sharing any area at all. */
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w
  && a.y < b.y + b.h && b.y < a.y + a.h;

/** The river as points, control points and the midpoints between them. */
const sampled = (pts) => {
  const out = [];
  pts.forEach((p, i) => {
    out.push(p);
    if (i + 1 < pts.length) {
      out.push([(p[0] + pts[i + 1][0]) / 2, (p[1] + pts[i + 1][1]) / 2]);
    }
  });
  return out;
};

describe.each(SHAPES)('the NRW route card at %s', (aspect) => {
  const L = mapLayout(aspect);

  it('is painted on a canvas the shape of the glass it fills', () => {
    const [w, h] = mapCanvas(aspect);
    expect(w / h).toBeCloseTo(mapAspect(aspect), 2);
    expect(h).toBe(MAP.H);
  });

  it('rules a frame with an even margin all round', () => {
    expect(L.frame.x).toBe(MAP.MARGIN);
    expect(L.frame.y).toBe(MAP.MARGIN);
    expect(L.w - (L.frame.x + L.frame.w)).toBe(MAP.MARGIN);
    expect(L.h - (L.frame.y + L.frame.h)).toBe(MAP.MARGIN);
  });

  // The cap is what keeps a district an hour across from being drawn a monitor
  // wide, and it only ever shows up on the widest glass.
  it('centres the map in the frame, however much of it there is', () => {
    expect(L.field.x - L.frame.x).toBeCloseTo(
      L.frame.x + L.frame.w - (L.field.x + L.field.w), 6,
    );
    expect(L.field.w).toBeLessThanOrEqual(L.frame.w + 1e-9);
    expect(L.field.w).toBeLessThanOrEqual(L.field.h * MAP.MAX + 1e-9);
  });

  it('keeps the map between the head rule and the foot rule', () => {
    expect(L.field.y).toBeGreaterThan(L.frame.y + L.frame.h * MAP.RULE[0]);
    expect(L.field.y + L.field.h).toBeLessThan(L.frame.y + L.frame.h * MAP.RULE[1]);
  });

  it('stands every stop inside the field', () => {
    L.places.forEach((p) => {
      expect(p.px).toBeGreaterThanOrEqual(L.field.x);
      expect(p.px).toBeLessThanOrEqual(L.field.x + L.field.w);
      expect(p.py).toBeGreaterThanOrEqual(L.field.y);
      expect(p.py).toBeLessThanOrEqual(L.field.y + L.field.h);
    });
  });

  it('keeps every name on the sheet', () => {
    L.places.forEach((p) => {
      const box = nameBox(p);
      expect(box.x).toBeGreaterThan(L.frame.x);
      expect(box.y).toBeGreaterThan(L.frame.y + L.frame.h * MAP.RULE[0]);
      expect(box.x + box.w).toBeLessThan(L.frame.x + L.frame.w);
      expect(box.y + box.h).toBeLessThan(L.frame.y + L.frame.h * MAP.RULE[1]);
    });
  });

  // The fault that turns a route card into a smudge, and the reason `at` is
  // hand-placed per stop rather than derived.
  it('never sets one name over another, or over a stop that is not its own', () => {
    const boxes = L.places.map((p) => ({ p, box: nameBox(p) }));
    boxes.forEach((a, i) => {
      boxes.slice(i + 1).forEach((b) => {
        expect(overlaps(a.box, b.box)).toBe(false);
      });
      L.places.forEach((p) => {
        if (p.key === a.p.key) return;
        const mark = {
          x: p.px - MAP.DOT, y: p.py - MAP.DOT, w: MAP.DOT * 2, h: MAP.DOT * 2,
        };
        expect(overlaps(a.box, mark)).toBe(false);
      });
    });
  });

  it('runs the river clear of every stop and every name', () => {
    sampled(L.rhine).forEach(([x, y]) => {
      L.places.forEach((p) => {
        expect(Math.hypot(p.px - x, p.py - y)).toBeGreaterThan(MAP.CROSS * 1.5);
      });
      L.places.forEach((p) => {
        const box = nameBox(p);
        expect(overlaps({ x, y, w: 1, h: 1 }, box)).toBe(false);
      });
    });
  });

  it('draws every leg between two stops it actually has', () => {
    expect(L.legs).toHaveLength(LEGS.length);
    L.legs.forEach((leg) => {
      expect(leg.a.key).toBe(leg.from);
      expect(leg.b.key).toBe(leg.to);
      expect(leg.mid[0]).toBeCloseTo((leg.a.px + leg.b.px) / 2, 6);
      expect(leg.mid[1]).toBeCloseTo((leg.a.py + leg.b.py) / 2, 6);
    });
  });
});

describe('the region the card draws', () => {
  it('marks exactly one home stop, and it is Duisburg', () => {
    const home = PLACES.filter((p) => p.home);
    expect(home).toHaveLength(1);
    expect(home[0].key).toBe('duisburg');
  });

  // The argument of the whole drawing: the home stop is the junction the
  // neighbours hang off, not one dot among four.
  it('hangs the neighbours off the home stop', () => {
    const from = LEGS.filter(([a]) => a === 'duisburg');
    expect(from.length).toBeGreaterThanOrEqual(2);
    PLACES.forEach((p) => {
      if (p.home) return;
      expect(LEGS.some(([a, b]) => a === p.key || b === p.key)).toBe(true);
    });
  });

  it('labels each leg with the distance of the stop it arrives at', () => {
    const L = mapLayout(0.95);
    L.legs.forEach((leg) => {
      expect(leg.km).toBe(PLACES.find((p) => p.key === leg.to).km);
      expect(leg.km).toBeGreaterThan(0);
    });
  });

  // A stop the reader cannot name is a dot, not a landmark — the one place the
  // build departs from the ticket, so it is a clause rather than a habit.
  it('names every stop', () => {
    PLACES.forEach((p) => expect(p.name.length).toBeGreaterThan(0));
  });
});

describe('the ping out of the cross', () => {
  it('starts at nothing, ends at nothing, and never leaves the field', () => {
    expect(pingAt(0).alpha).toBeCloseTo(0, 6);
    expect(pingAt(PING_MS).alpha).toBeCloseTo(0, 6);
    for (let ms = 0; ms <= PING_MS; ms += 40) {
      const { k, alpha } = pingAt(ms);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it('only ever travels outward', () => {
    let last = -1;
    for (let ms = 0; ms <= PING_MS; ms += 40) {
      const { k } = pingAt(ms);
      expect(k).toBeGreaterThanOrEqual(last);
      last = k;
    }
  });

  it('leaves the sheet quiet between one ring and the next', () => {
    for (let ms = PING_MS + 1; ms < PING_CYCLE_MS; ms += 50) {
      expect(pingAt(ms).alpha).toBe(0);
    }
  });

  it('repeats, and survives a clock that reads before it woke', () => {
    expect(pingAt(PING_CYCLE_MS + 800).k).toBeCloseTo(pingAt(800).k, 6);
    expect(pingAt(-400).alpha).toBeGreaterThanOrEqual(0);
  });
});
