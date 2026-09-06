import { describe, expect, it } from 'vitest';
import {
  COLS, LOG_ROWS, ROWS, RUN, TERM, linesAt, logLines, pageLeft, termAspect, termCanvas,
} from './terminal.js';
import { LOCALES } from '../../../i18n/locale.js';

// NBC-90 made one line of the page translatable — the heading — so the column
// budget below is now a budget in four languages rather than one. `LOG` is
// `logLines(locale)`; the German page is what the tube was measured against and
// stays the one every other clause reads.
const LOG = logLines('de');

// The two budgets in `terminal.js` are the whole reason the log is readable, and
// both are the kind of thing an edit breaks silently: a warning message a few
// characters longer runs off the side of a screen nobody is looking closely at,
// and one more warning pushes the cursor off the bottom. Neither shows up as an
// error anywhere. They show up as Mykolai leaning into the monitor, which is
// where this started.

describe('the log fits the tube it is printed on', () => {
  it('never runs past the column budget, in any of the four languages', () => {
    for (const { id } of LOCALES) {
      for (const [kind, text] of logLines(id)) {
        expect(text.length, `${id} ${kind}: ${text}`).toBeLessThanOrEqual(COLS);
      }
    }
  });

  it('never runs past the bottom of the screen', () => {
    // Equal is fine — the grid is sized to hold exactly this many.
    expect(LOG_ROWS).toBe(LOG.length);
    expect(LOG.length).toBeLessThanOrEqual(ROWS);
  });

  it('ends on the cursor, so the machine reads as waiting rather than done', () => {
    expect(LOG[LOG.length - 1][0]).toBe('cur');
  });

  it('shows the build and the test run, not only the warnings', () => {
    const commands = LOG.filter(([kind]) => kind === 'cmd').map(([, text]) => text);
    expect(commands.some((c) => c.startsWith('dotnet build'))).toBe(true);
    expect(commands.some((c) => c.startsWith('dotnet test'))).toBe(true);
  });

  it('names as many warnings as the summary claims', () => {
    const summary = LOG.find(([kind]) => kind === 'ok')?.[1] ?? '';
    const claimed = Number(/(\d+) warning/.exec(summary)?.[1]);
    expect(claimed).toBeGreaterThan(0);
    expect(LOG.filter(([kind]) => kind === 'warn')).toHaveLength(claimed);
  });
});

// The tube is built at whatever shape the opening comes out at, so that the
// picture fills the glass instead of floating in the middle of it. What must
// survive that is the *page*: thirty columns of monospace, on a canvas that is
// never narrower than they are and never a shape they get stretched onto.
describe('the tube fills the glass without stretching the page', () => {
  const SHAPES = [TERM.ASPECT[0], 0.9, TERM.ASPECT[1]];

  it.each(SHAPES)('is a canvas the shape of the glass at %s', (a) => {
    const [w, h] = termCanvas(a);
    expect(w / h).toBeCloseTo(termAspect(a), 2);
  });

  it.each(SHAPES)('leaves the page room for its full width of type at %s', (a) => {
    const [w] = termCanvas(a);
    const left = pageLeft(a);
    // the page is centred, so the right margin is the left one
    expect(left).toBeGreaterThan(0);
    expect(w - left * 2).toBeGreaterThanOrEqual(COLS * 24);
  });

  it('is never asked for a canvas narrower than the page itself', () => {
    expect(termAspect(0.2)).toBeCloseTo(TERM.ASPECT[0], 6);
    expect(termAspect(9)).toBeCloseTo(TERM.ASPECT[1], 6);
    expect(termAspect(NaN)).toBeCloseTo(TERM.ASPECT[0], 6);
  });

  it('rounds a measured glass to a step, so a pixel of resize is not a repaint', () => {
    expect(termAspect(0.901)).toBeCloseTo(termAspect(0.907), 6);
  });
});

describe('the print', () => {
  it('starts empty and ends with every line up', () => {
    expect(linesAt(0)).toBe(0);
    expect(linesAt(1)).toBe(LOG_ROWS);
  });

  it('runs monotonically', () => {
    let last = -1;
    for (let i = 0; i <= 40; i += 1) {
      const n = linesAt(i / 40);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  it('is over inside the time the doors take to settle', () => {
    expect(RUN).toBeLessThan(3);
  });
});
