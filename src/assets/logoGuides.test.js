import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NBC-80. The letter's left leg carries `transform="matrix(1.0326907,...)"` — a
// 3.27% horizontal stretch applied after the construction frame was drawn. The
// frame never followed, so the guide, the pivots and the top gradient block all
// sat 1.25–1.28 units to the right of the edge they were supposed to mark, and
// the step between the block and the leg was visible at any size.
//
// The leg is the reference: whatever its transform does, everything that claims
// to sit on the left edge must land where the leg's own left edge lands. The
// animation masks count too — they are what draws each guide on, and a mask
// left behind re-introduces the drift the moment the logo animates.

const svg = readFileSync(new URL('./logo-namerek-animated.svg', import.meta.url), 'utf8');

const attr = (id, name) => {
  const el = svg.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`));
  if (!el) throw new Error(`no element #${id}`);
  const m = el[0].match(new RegExp(`\\b${name}="([^"]*)"`));
  if (!m) throw new Error(`#${id} has no ${name}`);
  return m[1];
};

const num = (id, name) => Number(attr(id, name));

const legLeftEdge = () => {
  const [a, , , , e] = attr('rect4', 'transform').match(/matrix\(([^)]*)\)/)[1].split(',').map(Number);
  const x = Number(attr('rect4', 'd').match(/^m\s*([\d.-]+)/i)[1]);
  return x * a + e;
};

describe('the construction frame against the letter it describes', () => {
  const LEFT = legLeftEdge();

  it('measures the leg edge from the leg, transform and all', () => {
    expect(LEFT).toBeCloseTo(116.539, 3);
  });

  // The guide runs the full height of the edge (variant A): it reads as a seam
  // down the left side rather than stopping where the black starts.
  it('runs the left guide down the leg edge, both ends', () => {
    expect(num('line2', 'x1')).toBeCloseTo(LEFT, 3);
    expect(num('line2', 'x2')).toBeCloseTo(LEFT, 3);
  });

  it('starts the top gradient block on the same edge', () => {
    const d = attr('path9', 'd');
    expect(Number(d.match(/^M\s*([\d.-]+)/)[1])).toBeCloseTo(LEFT, 3);
  });

  // Moving the block's left edge must not drag its top-right corner along, or
  // the light patch changes shape instead of just losing the step.
  it('leaves the block top-right corner where it was', () => {
    const d = attr('path9', 'd');
    const [, left, , run] = d.match(/^M\s*([\d.-]+),[\d.-]+\s+V\s*([\d.-]+)\s+l\s*([\d.-]+)/);
    expect(Number(left) + Number(run)).toBeCloseTo(185.35037, 4);
  });

  it('pins both left pivots to the edge', () => {
    expect(num('circle2', 'cx')).toBeCloseTo(LEFT, 3);
    expect(num('circle2-7-5', 'cx')).toBeCloseTo(LEFT, 3);
  });

  it('starts both horizontal ticks at the edge', () => {
    expect(num('line2-1', 'x1')).toBeCloseTo(LEFT, 3);
    expect(num('line2-1-2', 'x1')).toBeCloseTo(LEFT, 3);
  });

  it('draws the guides on from the edge, not from the old frame', () => {
    expect(num('nkM1s', 'x1')).toBeCloseTo(LEFT, 3);
    expect(num('nkM1s', 'x2')).toBeCloseTo(LEFT, 3);
    expect(num('nkM2s', 'x1')).toBeCloseTo(LEFT, 3);
    expect(num('nkM3s', 'x1')).toBeCloseTo(LEFT, 3);
  });

  // A drawing mask is a fat white stroke over the line it reveals; if it drifts
  // by more than its own half-width the line is drawn on clipped.
  it('keeps every drawing mask over the line it reveals', () => {
    for (const [line, mask] of [['line2', 'nkM1s'], ['line2-1-2', 'nkM2s'], ['line2-1', 'nkM3s']]) {
      const half = Number(attr(mask, 'stroke-width')) / 2;
      expect(Math.abs(num(line, 'x1') - num(mask, 'x1'))).toBeLessThan(half);
    }
  });
});

// A guide is a drafting line: the letter is drawn over it, not under it. The
// animated copy had the solid letterform painted first, so every guide that
// crossed a stroke sat on top of the black as a slightly darker dashed seam —
// the guides read as scratches on the mark instead of the frame it was built
// from. Order is what hides them, not colour: they stay full length underneath.
describe('paint order in the animated copy', () => {
  const body = svg.slice(svg.indexOf('<g id="g1"'), svg.indexOf('</g>'));
  const at = (id) => {
    const i = body.search(new RegExp(`<\\w+[^>]*\\bid="${id}"`));
    if (i < 0) throw new Error(`no element #${id} in the drawing`);
    return i;
  };
  const GUIDES = ['line2-94', 'line2-94-8', 'line1', 'line1-2', 'line2', 'line2-9',
                  'line2-1', 'line2-1-2', 'line2-1-9', 'line2-1-1'];
  const SOLIDS = ['polygon2', 'rect4', 'path6'];

  it('paints every guide before the solid letterform covers it', () => {
    const firstSolid = Math.min(...SOLIDS.map(at));
    for (const guide of GUIDES) expect(at(guide)).toBeLessThan(firstSolid);
  });

  // The gradient blocks are the letter fading out, so guides belong over them —
  // that is the one place a guide is meant to be seen crossing the mark.
  it('leaves the guides on top of the gradient blocks', () => {
    expect(at('path11')).toBeLessThan(Math.min(...GUIDES.map(at)));
    expect(at('path9')).toBeLessThan(at('line2'));
  });

  it('keeps the pivots and the halo above everything', () => {
    const lastSolid = Math.max(...SOLIDS.map(at));
    for (const pivot of ['circle2', 'circle2-7', 'circle2-7-5', 'circle9', 'circle9-5', 'path1']) {
      expect(at(pivot)).toBeGreaterThan(lastSolid);
    }
  });
});
