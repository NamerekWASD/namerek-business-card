// NBC-107. The flat card's small print was read on a laptop and half of it did
// not read: the rail's names at 55% opacity, its title in `--brass-deep`, the
// despatch form's stamp in `--enamel-red` — dark red on dark brown, 1.7:1 —
// and a run of 10px labels set in a thin monospace with wide tracking.
//
// Measured in the browser over the pixels behind each run (WCAG AA, 4.5:1 for
// text this size); what is asserted here is the arithmetic of the same colours
// from the tokens, over the lightest surface each one sits on, so a later
// "a touch more atmosphere" cannot quietly put them back under the line.

import { describe, expect, it } from 'vitest';
import { readFlatCss } from './readFlatCss.js';

const CSS = readFlatCss();

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(selector) {
  const at = CSS.indexOf(`\n${selector} {`);
  expect(at, `${selector} is not in the flat stylesheet`).toBeGreaterThan(-1);
  return CSS.slice(CSS.indexOf('{', at) + 1, CSS.indexOf('}', at));
}

function prop(body, name) {
  return body.match(new RegExp(`(?:^|[;\\s])${name}:\\s*([^;]+);`))?.[1].trim();
}

const token = (name) => prop(rule('.flat'), name);

function rgb(value) {
  const hex = value.startsWith('var(') ? token(value.slice(4, -1)) : value;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(channels) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = channels.map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast of a rule's text, its opacity composited over `background`. */
function contrast(selector, background) {
  const body = rule(selector);
  const alpha = Number(prop(body, 'opacity') ?? 1);
  const bg = rgb(background);
  const fg = rgb(prop(body, 'color')).map((v, i) => v * alpha + bg[i] * (1 - alpha));
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe('small print on the flat card', () => {
  // `--bg-2` is the lighter end of the rail's gradient and `--panel` the
  // steel the form is printed on: the worst case for light text on each.
  it.each([
    ['.rail-title', 'var(--bg-2)'],
    ['.rail-mark-name', 'var(--bg-2)'],
    ['.stamp', 'var(--panel)'],
    ['.label', 'var(--panel)'],
    ['.tech', 'var(--panel)'],
    ['.writing-gist', 'var(--panel)'],
    ['.writing-stamp', 'var(--panel)'],
  ])('%s clears 4.5:1', (selector, background) => {
    expect(contrast(selector, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['.rail-title', '.stamp', '.label', '.tech', '.stencil', '.writing-gist', '.writing-stamp'])(
    '%s is set no smaller than 11px',
    (selector) => {
      expect(parseFloat(prop(rule(selector), 'font-size'))).toBeGreaterThanOrEqual(11);
    },
  );

  it('keeps the small stencil a handset size, not a desktop one', () => {
    expect(CSS).not.toMatch(/\n\.stencil--sm \{/);
  });
});
