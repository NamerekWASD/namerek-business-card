// NBC-102. The despatch desk's divider is a punched tape, and its holes were
// drawn in absolute pixels for one bar height: a 3px circle centred 13px down
// an 18×26 tile. The handset block then shortened the bar to 16px without
// touching the pattern, so the hole's centre sat 13px down a 16px box and the
// bottom of every circle was cut off by the bar's own edge — a row of scallops
// along the bottom rather than a punched tape. Reported at 471px.
//
// What is asserted here is the shape of the fix, not the numbers: the hole is
// positioned *relative to its tile* and the tile is sized from the bar's own
// height, so a shorter bar cannot cut its own holes. A handset then changes
// tokens and never the pattern — which is what stopped this being caught
// three responsive passes ago.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('./flat.css', import.meta.url), 'utf8');

/** The body of a rule, brace-matched — a regexp cannot nest. */
function block(header, source = CSS) {
  const start = source.indexOf(header);
  expect(start, `${header} is not in flat.css`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i);
    }
  }
  throw new Error(`${header} is never closed`);
}

const HANDSET = block('@media (max-width: 900px)');

describe('the punched tape', () => {
  const rule = block('\n.tape {');

  it('takes its height, its pitch and its hole from tokens', () => {
    expect(rule).toMatch(/--tape-h:\s*\d/);
    expect(rule).toMatch(/--tape-pitch:\s*\d/);
    expect(rule).toMatch(/--tape-hole:\s*[\d.]/);
    expect(rule).toMatch(/height:\s*var\(--tape-h\)/);
  });

  it('punches each hole in the middle of its own tile, at any bar height', () => {
    // Half the pitch across, half the bar down. This is the whole fix: an
    // absolute `13px` here is a hole that leaves the bar the moment the bar
    // is not 26px tall.
    expect(rule).toMatch(/circle at calc\(var\(--tape-pitch\) \/ 2\) 50%/);
    expect(rule).toMatch(/var\(--tape-pitch\) var\(--tape-h\)/);
  });

  it('lets a handset change the tokens and nothing else', () => {
    const small = [...HANDSET.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, header]) => header.split(',').some((name) => name.trim() === '.tape'))
      .map(([, , body]) => body)
      .join('');
    expect(small, 'the handset does not resize the tape at all any more').not.toBe('');
    expect(small).toMatch(/--tape-h:/);
    // A `background` here is the bug coming back: two patterns to keep in step.
    expect(small).not.toMatch(/background/);
  });
});
