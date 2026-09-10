// NBC-97. Two facts about the handset rail that no other test can hold: it is
// a shaft, not a strip of chrome, and the car has to *disappear* at a floor —
// what is left standing at a stop is the enamel sign, with the car behind it.
//
// Neither can be measured where the rest of the flat card is tested: jsdom lays
// nothing out, and a screenshot proves it for one build and then stops looking.
// So the geometry is declared — `--car` is the car's box and `--plate-min` is
// the smallest box a floor sign is allowed to have, both on `.flat` inside the
// handset block — and this reads the stylesheet the way the browser does and
// checks the one relation between them that matters.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('./flat.css', import.meta.url), 'utf8');

/** The body of a rule or at-rule, brace-matched — a regexp cannot nest. */
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

const px = (name, source = HANDSET) => {
  const found = source.match(new RegExp(`${name}:\\s*(-?[\\d.]+)px`));
  expect(found, `${name} is not declared`).toBeTruthy();
  return Number.parseFloat(found[1]);
};

describe('the handset rail', () => {
  it('parks the car entirely behind a floor sign', () => {
    // The car is square, so its width is also its height, and the sign's width
    // is the tighter of the sign's two dimensions — clear that and the car is
    // covered whichever way it is measured.
    expect(px('--car')).toBeLessThanOrEqual(px('--plate-min'));
  });

  it('sizes the car off that token rather than beside it', () => {
    const car = block('.rail-car', HANDSET);
    expect(car).toContain('width: var(--car)');
    expect(car).toContain('height: var(--car)');
  });

  it('guarantees the sign is never narrower than the car it hides', () => {
    expect(HANDSET).toContain('min-width: var(--plate-min)');
  });

  it('keeps the shaft narrow without taking the thumb\'s target with it', () => {
    // NBC-66 measured the drag on the device: the whole width of the rail
    // answers a finger here, and 44px is the smallest target that reliably
    // does. Narrower than the desktop shaft, wider than a thumb needs.
    const rail = px('--rail-w');
    expect(rail).toBeLessThan(px('--rail-w', CSS.slice(0, CSS.indexOf('@media'))));
    expect(rail).toBeGreaterThanOrEqual(44);
  });
});
