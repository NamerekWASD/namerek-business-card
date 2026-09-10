// NBC-98. What is shut has to be invisible, and in this drawer that is not the
// same as being clipped.
//
// The strip is parked one height above a box with `overflow: hidden`, so the
// plate itself is cut away — but a drop shadow is not part of the plate's box,
// and 20px of it falls back inside the visible part of the drawer and paints a
// dark rectangle across the floor's own enamel tag. It looked like a stray
// panel; it was the shadow of a plate that was standing there all along.
//
// It stood there because the rule meant to hide it could not: `RivettedPanel`
// carries its `opacity` as an inline style, and no class selector outranks
// one. So the thing that goes transparent is the drawer, which nothing else
// writes to — and that is the fact worth holding, because the next person to
// reach for `.flat-lang-drawer > *` will get a rule that silently does nothing.

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

describe('the language drawer', () => {
  it('is transparent while it is shut, so nothing of the strip paints — its shadow included', () => {
    expect(block('.flat-lang-drawer {')).toMatch(/opacity:\s*0\s*;/);
    expect(block('.flat-lang.is-open .flat-lang-drawer {')).toMatch(/opacity:\s*1\s*;/);
  });

  it('hides itself rather than the plate inside it', () => {
    // The plate's own `opacity` is an inline style written by `RivettedPanel`.
    expect(block('.flat-lang-drawer > * {')).not.toMatch(/opacity:/);
  });
});
