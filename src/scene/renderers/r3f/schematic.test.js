import { describe, expect, it } from 'vitest';
import { SHEET, sheetBlock, sheetFrame } from './propArt.js';

// Same treaty as the valve rack, same reason for the tests. `propArt.js` draws
// this sheet in fractions and has never heard of a metre; `LandingProps.jsx`
// cuts the frame in metres and never opens the canvas. Everything below is a
// clause that fails *silently* on the wall — a valve half off the paper, the
// earth rail running through the title block, a stage drawn on top of the one
// before it. On the bench it is a smudge 60 pixels across; at 1600×900 it is a
// drawing that does not survive being looked at.

const [PX_W, PX_H] = SHEET.CANVAS;

describe('the schematic sheet', () => {
  // A sheet 1.43 as wide as it is tall painted on a canvas of a different
  // aspect turns every valve envelope into an ellipse and every fold into a
  // slant. It is the one fault on a framed drawing nobody can un-see.
  it('is painted on a canvas the shape of the paper it goes on', () => {
    expect(PX_W / PX_H).toBeCloseTo(SHEET.PAPER.W / SHEET.PAPER.H, 2);
  });

  it('rules a frame with an even margin all round', () => {
    const f = sheetFrame();
    expect(f.y * PX_H).toBeCloseTo((1 - f.w - f.x) * PX_W, 1);
  });

  it('keeps the title block inside the ruled frame', () => {
    const f = sheetFrame();
    const b = sheetBlock();
    expect(b.x).toBeGreaterThanOrEqual(f.x);
    expect(b.y).toBeGreaterThanOrEqual(f.y);
    expect(b.x + b.w).toBeCloseTo(f.x + f.w, 5);
    expect(b.y + b.h).toBeCloseTo(f.y + f.h, 5);
  });

  // HT above earth, in that order, because every stage below is drawn from the
  // pair as `[htY, gndY]` and a swapped rail turns the circuit inside out.
  it('hangs the circuit between an HT rail and an earth rail', () => {
    const [ht, gnd] = SHEET.RAILS;
    expect(ht).toBeLessThan(gnd);
  });

  // The earth rail stops short of the title block. If the block ever grows
  // taller than the gap under that rail, the rail runs straight through it.
  it('leaves the earth rail clear of the title block', () => {
    const f = sheetFrame();
    const b = sheetBlock();
    expect(f.y + f.h * SHEET.RAILS[1]).toBeLessThan(b.y);
  });

  it('stands every valve inside the frame', () => {
    const f = sheetFrame();
    SHEET.STAGES.forEach((s) => {
      expect(f.x + f.w * (s - SHEET.ENVELOPE)).toBeGreaterThan(f.x);
      expect(f.x + f.w * (s + SHEET.ENVELOPE)).toBeLessThan(f.x + f.w);
    });
  });

  // The valves sit on the midline between the rails and their envelopes reach
  // out from it; the title block is in the lower corner. The two share a column
  // of the sheet, so what has to hold is that the circuit is finished with the
  // paper above the block.
  it('keeps the valve band above the title block', () => {
    const f = sheetFrame();
    const b = sheetBlock();
    const mid = (SHEET.RAILS[0] + SHEET.RAILS[1]) / 2;
    expect(f.y + f.h * (mid + SHEET.ENVELOPE)).toBeLessThan(b.y);
  });

  it('does not let one stage stand on the one before it', () => {
    SHEET.STAGES.forEach((s, i) => {
      if (i === 0) return;
      expect(s - SHEET.STAGES[i - 1]).toBeGreaterThan(SHEET.ENVELOPE * 2);
    });
  });

  // The two transformers bracket the run: input before V1, output after V3.
  it('puts a transformer at each end of the run', () => {
    const [inX, outX] = SHEET.ENDS;
    expect(inX).toBeLessThan(SHEET.STAGES[0] - SHEET.ENVELOPE);
    expect(outX).toBeGreaterThan(SHEET.STAGES[SHEET.STAGES.length - 1] + SHEET.ENVELOPE);
    expect(outX + SHEET.ENVELOPE * 0.6).toBeLessThan(1);
  });
});
