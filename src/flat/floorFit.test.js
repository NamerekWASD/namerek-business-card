// NBC-99. A floor is one viewport, and on a phone with its own toolbars showing
// that viewport is short: 635px on the device this was measured on. Everything
// before this ticket answered that by taking pixels off type and padding —
// NBC-93, NBC-94, NBC-95, each buying 10-20px — and every one of them was
// spent again by the next translation.
//
// What is asserted here instead is the shape of the fix: the floor's parts are
// no longer all rigid. The tube is the part that yields, because it is the one
// part that loses nothing by yielding — a tap opens the picture full screen —
// and for it to yield the whole chain above it has to be allowed to shrink,
// which is the `min-height: 0` a flex column needs and never gets by default.
//
// jsdom lays nothing out, so this reads the stylesheet the way the browser
// does. It is the same trade `rail.geometry.test.js` makes and for the same
// reason: a screenshot proves it for one build and then stops looking.

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

/**
 * Every declaration a selector picks up inside a block, whether it was written
 * a rule of its own or as one name in a grouped header — to the browser those
 * are the same thing, and a test that can only read the first shape dictates
 * how the stylesheet has to be written.
 */
function declarationsFor(selector, source = HANDSET) {
  const found = [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, header]) => header.split(',').some((name) => name.trim() === selector))
    .map(([, , body]) => body)
    .join('');
  expect(found, `nothing in the stylesheet selects ${selector}`).not.toBe('');
  return found;
}

describe('a floor on a short screen', () => {
  it('lets the tube give up height rather than push the floor past its viewport', () => {
    const crt = declarationsFor('.crt');
    expect(crt).toMatch(/flex:\s*1\s+1\s+auto/);
    // A floor under it, so a long enough notice cannot squeeze the picture out
    // of existence — below this it stops being a picture and becomes a smear.
    expect(crt).toMatch(/min-height:\s*var\(--tube-min\)/);
    expect(declarationsFor('.crt-grid')).toMatch(/--tube-min:\s*\d+px/);
  });

  it('leaves every container between the floor and the tube able to shrink', () => {
    // A flex item's `min-height` is `auto`, which means "no smaller than my
    // content" — one of these left at the default and the tube's `flex-shrink`
    // is a rule that silently does nothing.
    for (const selector of ['.floor-inner', '.panel', '.crt-grid']) {
      expect(declarationsFor(selector), selector).toMatch(/min-height:\s*0/);
    }
  });

  it('keeps the tube’s own column standing, which is what enforces that floor', () => {
    // The column holding the tube and the console is the one box here that
    // must keep its automatic minimum. Told it may shrink to nothing it does
    // exactly that: the tube keeps its 116px, paints over the notice beside
    // it, and the floor measures as though everything fits.
    const col = declarationsFor('.crt-col');
    expect(col).not.toMatch(/min-height:\s*0/);
    // And it is not left to work that minimum out for itself either: an item
    // with an aspect ratio contributes one derived from its own width, which
    // stops the tube 11px into the yield. The column's floor is the tube's
    // plus the console riding under it, both read from the same tokens.
    expect(col).toMatch(/min-height:\s*calc\(var\(--tube-min\)\s*\+\s*var\(--console-h\)\)/);
  });

  it('stacks the archive panel as a column that can hand its height around', () => {
    expect(declarationsFor('.crt-grid')).toMatch(/flex-direction:\s*column/);
  });

  it('does not name the floor a fourth time where there is no room for it', () => {
    // The enamel tag in the corner, the marker on the rail and the floor's own
    // heading all say which floor this is. The line above the heading says it
    // once more, and on a handset it costs a line of the notice below.
    expect(declarationsFor('.floor-label')).toMatch(/display:\s*none/);
  });
});

// NBC-101. Yielding height was only half of the archive floor's problem. The
// other half is that the height it yielded *changed with the slide*: a longer
// caption, a longer project name, a longer notice, and the console — which
// rides under the tube — moved under the thumb pressing it.
//
// So every block on that floor whose text varies is a window of a declared
// size, and what is asserted here is that the sizes are declared rather than
// left to the content. `Crawl.test.jsx` covers the walking; this covers the
// boxes it walks inside.
const REDUCED = block('@media (prefers-reduced-motion: reduce)');

describe('the archive floor between two shots', () => {
  it('reserves the caption screen’s height instead of taking it from the caption', () => {
    expect(declarationsFor('.shot-screen', CSS)).toMatch(/height:\s*var\(--strip-h\)/);
  });

  it('reserves the notice window in lines, not in magic pixels', () => {
    // A reservation written as a pixel count is a reservation that stops being
    // right at the next font-size clamp. This one is `lines × leading`, so the
    // handset block can change either and the box follows.
    const slot = declarationsFor('.notice-slot', CSS);
    expect(slot).toMatch(/line-height:\s*var\(--notice-lh\)/);
    expect(slot).toMatch(/height:\s*calc\(var\(--notice-lines\)\s*\*\s*var\(--notice-lh\)\s*\*\s*1em\)/);
    expect(declarationsFor('.notice-slot', HANDSET)).toMatch(/--notice-lines:\s*\d+/);
  });

  it('lets the visitor read the notice at their own pace, down a slider of its own', () => {
    // It fed itself past its window for one build. A label may walk; a
    // paragraph somebody is reading may not — so the notice scrolls by hand,
    // and the affordance is drawn rather than left to the platform's own grey.
    const slot = declarationsFor('.notice-slot', CSS);
    expect(slot).toMatch(/overflow-y:\s*auto/);
    expect(slot).toMatch(/scrollbar-color:/);
    expect(declarationsFor('.notice-slot::-webkit-scrollbar-thumb', CSS)).toMatch(/background:/);
    // And it is reachable from a keyboard, which is what the tabindex in
    // `FloorProjekte.jsx` is for — a focus ring it can show.
    expect(declarationsFor('.notice-slot:focus-visible', CSS)).toMatch(/outline:/);
  });

  it('gives a walking label a hard edge and one line', () => {
    expect(declarationsFor('.crawl', CSS)).toMatch(/overflow:\s*hidden/);
    expect(declarationsFor('.crawl .crawl-run', CSS)).toMatch(/white-space:\s*nowrap/);
  });

  it('spans the control rail across the panel rather than leaving it ragged', () => {
    // Naturally-sized plates leave a gap on the right whose width depends on
    // the language — the same class of fault as depending on the slide. A
    // grid of three columns plus a full-width second row cannot reflow at all.
    const rail = declarationsFor('.console', CSS);
    expect(rail).toMatch(/display:\s*grid/);
    expect(rail).toMatch(/grid-template-columns:\s*1fr auto 1fr/);
    expect(declarationsFor('.crt-col .link-btn', CSS)).toMatch(/grid-column:\s*1 \/ -1/);
  });

  it('halves the pager but not the target a thumb aims at', () => {
    // The call: every key on this floor about half its size. A 26px
    // plate is below the 44px a touch target owes, so the plate shrinks and
    // the target is put back with a pseudo-element that reaches past it.
    const key = declarationsFor('.crt-col .lamp-btn', CSS);
    expect(key).toMatch(/min-height:\s*26px/);
    const reach = declarationsFor('.crt-col .lamp-btn::after', CSS);
    expect(reach).toMatch(/inset:\s*-9px/);
  });

  it('holds still for a visitor who asked for stillness, without losing the box', () => {
    // The window keeps its declared height — the floor is laid out around it —
    // and the text inside becomes something to scroll rather than something
    // that moves on its own.
    expect(declarationsFor('.crawl-run', REDUCED)).toMatch(/animation:\s*none/);
    expect(declarationsFor('.crawl', REDUCED)).toMatch(/overflow-x:\s*auto/);
  });
});
