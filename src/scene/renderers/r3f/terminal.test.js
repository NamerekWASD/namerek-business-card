import { describe, expect, it } from 'vitest';
import { COLS, LOG, ROWS, RUN, linesAt } from './terminal.js';

// The two budgets in `terminal.js` are the whole reason the log is readable, and
// both are the kind of thing an edit breaks silently: a warning message a few
// characters longer runs off the side of a screen nobody is looking closely at,
// and one more warning pushes the cursor off the bottom. Neither shows up as an
// error anywhere. They show up as Mykolai leaning into the monitor, which is
// where this started.

describe('the log fits the tube it is printed on', () => {
  it('never runs past the column budget', () => {
    for (const [kind, text] of LOG) {
      expect(text.length, `${kind}: ${text}`).toBeLessThanOrEqual(COLS);
    }
  });

  it('never runs past the bottom of the screen', () => {
    // Equal is fine — the grid is sized to hold exactly this many.
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

describe('the print', () => {
  it('starts empty and ends with every line up', () => {
    expect(linesAt(0)).toBe(0);
    expect(linesAt(1)).toBe(LOG.length);
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
