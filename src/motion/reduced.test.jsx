// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import useReducedMotion, { prefersReducedMotion } from './reduced.js';

// One switch, read in two ways: a plain call for the machinery that has no
// React around it (the ride ticker), and a hook for everything that does. The
// hook has to *keep* listening — someone who turns the preference on in their
// system while the tab is open has asked for the scene to stop, not for it to
// stop next time.

/** Installs a `matchMedia` that answers `matches` and remembers its listeners. */
function stubMedia(matches) {
  const listeners = new Set();
  const query = {
    matches,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn(() => query);
  return {
    query,
    listeners,
    set(next) {
      query.matches = next;
      for (const fn of [...listeners]) fn(query);
    },
  };
}

afterEach(() => {
  delete window.matchMedia;
});

describe('prefersReducedMotion', () => {
  it('is false where there is no matchMedia at all', () => {
    delete window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });

  it('asks for the reduce query and reports what it says', () => {
    const media = stubMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    media.query.matches = false;
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('useReducedMotion', () => {
  const seen = [];
  function Probe() {
    seen.push(useReducedMotion());
    return null;
  }

  it('reports the preference on the very first render, not a frame later', () => {
    stubMedia(true);
    seen.length = 0;
    render(<Probe />);
    expect(seen[0]).toBe(true);
  });

  it('follows the preference being turned on while the tab is open', () => {
    const media = stubMedia(false);
    seen.length = 0;
    render(<Probe />);
    expect(seen.at(-1)).toBe(false);
    act(() => media.set(true));
    expect(seen.at(-1)).toBe(true);
  });

  it('lets go of the query when it unmounts', () => {
    const media = stubMedia(false);
    const { unmount } = render(<Probe />);
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
