// @vitest-environment jsdom
//
// The boot screen is up while the scene compiles, which is when the main thread
// is busiest. Anything it moves from script stops moving for exactly as long as
// the screen is needed, which is how the old gears came to freeze. So the rule
// held here is structural: script may switch a lamp on, it may not animate.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import BootScreen from './BootScreen.jsx';
import { BOOT_LAMPS } from './plan.js';
import { HOME_DEG } from './dial.js';

/** @type {FrameRequestCallback[]} */
let queued = [];

function runFrames(n) {
  for (let i = 0; i < n; i += 1) {
    const now = queued;
    queued = [];
    now.forEach((cb) => cb(i * 16));
  }
}

const screen = (over = {}) => ({ fraction: 0, phase: 'loading', t0: 0, arriveStart: 0, ...over });

beforeEach(() => {
  queued = [];
  vi.stubGlobal('requestAnimationFrame', (cb) => { queued.push(cb); return queued.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the floor indicator', () => {
  it('moves its needle by a CSS animation and never writes it from a frame', () => {
    const { container } = render(<BootScreen screen={screen()} />);
    const needle = container.querySelector('[data-boot="needle"]');
    expect(needle.classList.contains('boot-ride')).toBe(true);
    expect(container.querySelector('style').textContent).toMatch(/\.boot-ride\s*\{[^}]*animation:\s*boot-needle/);
    const before = needle.getAttribute('style');
    act(() => runFrames(30));
    expect(needle.getAttribute('style')).toBe(before);
  });

  it('lights a lamp for each share of the work that has reported', () => {
    const s = screen();
    const { container } = render(<BootScreen screen={s} />);
    const lit = () => container.querySelectorAll('[data-boot="lamp"][data-lit="true"]').length;
    const lamps = container.querySelectorAll('[data-boot="lamp"]');
    expect(lamps).toHaveLength(BOOT_LAMPS);
    expect(lit()).toBe(0);
    s.fraction = 0.4;
    act(() => runFrames(1));
    expect(lit()).toBe(2);
    s.fraction = 1;
    act(() => runFrames(1));
    expect(lit()).toBe(BOOT_LAMPS);
  });

  it('brings the needle home to the ground floor when the lift arrives', () => {
    const s = screen();
    const { container, rerender } = render(<BootScreen screen={s} />);
    s.phase = 'arrive';
    rerender(<BootScreen screen={s} />);
    const needle = container.querySelector('[data-boot="needle"]');
    expect(needle.classList.contains('boot-ride')).toBe(false);
    expect(needle.style.transform).toBe(`rotate(${HOME_DEG}deg)`);
  });

  it('puts the dial out first and holds the black before the scene shows', () => {
    const { container } = render(<BootScreen screen={screen({ phase: 'dark' })} />);
    expect(container.firstChild.style.opacity).toBe('1');
    expect(container.querySelector('[data-boot="dial"]').style.opacity).toBe('0');
  });

  it('gets out of the way once it fades', () => {
    const s = screen({ phase: 'fade' });
    const { container } = render(<BootScreen screen={s} />);
    expect(container.firstChild.style.opacity).toBe('0');
    expect(container.firstChild.style.pointerEvents).toBe('none');
  });

  it('leaves the document once the boot is done', () => {
    // Its artwork carries SVG filters, which have no business staying mounted
    // over a scene whose decks move every frame.
    const { container } = render(<BootScreen screen={screen({ phase: 'done' })} />);
    expect(container.firstChild).toBeNull();
  });
});
