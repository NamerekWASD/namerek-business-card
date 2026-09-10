// @vitest-environment jsdom
//
// NBC-101. The archive floor's labels are reserved boxes now, and the price of
// a reserved box is that the text inside it can be longer than the box. The
// answer is not a smaller box or a clipped sentence: a *label* walks its window
// and comes back. What has to hold is when it walks — only when it does not
// fit, never for a visitor who asked for stillness — and that is a
// measurement, not a guess, so it is worth a test of its own.
//
// A paragraph is not a label and never comes here: the notice gets a scrollbar
// and is read at the visitor's own pace. See `.notice-slot` in `flat.css`.
//
// jsdom lays nothing out: every box measures zero. So the boxes are stubbed,
// which is the only way to reach the branch this component exists for.

import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Crawl from './Crawl.jsx';

/** jsdom's zero-sized world, with one window and one run given real numbers. */
function stub({ room, need }) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return this.classList.contains('crawl') ? room : 0; },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() { return this.classList.contains('crawl-run') ? need : 0; },
  });
}

function stillness(reduced) {
  window.matchMedia = (query) => ({
    matches: reduced && query.includes('reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

beforeEach(() => stillness(false));

afterEach(() => {
  cleanup();
  for (const prop of ['clientWidth', 'scrollWidth']) delete HTMLElement.prototype[prop];
  delete window.matchMedia;
});

describe('Crawl', () => {
  it('holds still when the content fits its window', () => {
    stub({ room: 300, need: 200 });
    const { container } = render(<Crawl>Homepage</Crawl>);
    const win = container.querySelector('.crawl');
    expect(win.dataset.crawl).toBe('off');
    expect(win.textContent).toBe('Homepage');
  });

  it('walks, by exactly what does not fit', () => {
    stub({ room: 300, need: 420 });
    const { container } = render(<Crawl>Paperless webhook config</Crawl>);
    const win = container.querySelector('.crawl');
    expect(win.dataset.crawl).toBe('on');
    // The travel is the overflow itself: a marquee that runs its own width
    // scrolls the first word off a box it was already inside.
    expect(container.querySelector('.crawl-run').style.getPropertyValue('--over')).toBe('120px');
  });

  it('never walks for a visitor who asked for stillness', () => {
    // The box keeps its size — that is the whole point of reserving it — and
    // what goes is the travel.
    stillness(true);
    stub({ room: 300, need: 420 });
    const { container } = render(<Crawl>Paperless webhook config</Crawl>);
    expect(container.querySelector('.crawl').dataset.crawl).toBe('off');
  });
});
