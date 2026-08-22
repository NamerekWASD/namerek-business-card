// @vitest-environment jsdom
//
// The scene does not render into a jsdom document the way it renders into a
// browser — there is no compositor, no `preserve-3d`, and every measurement
// comes back zero. So this proves nothing about the *picture*.
//
// What it does prove is the thing a bundler cannot: that every identifier this
// component reaches for at render time actually exists. `vite build` happily
// ships a file that references a constant which moved to another module and was
// never imported back; the failure only shows up as a white screen. Splitting a
// 2768-line file into twenty is exactly the operation that produces that bug,
// and this is the cheapest net under it.

import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Dieselpunk from './Dieselpunk.jsx';

beforeAll(() => {
  // jsdom leaves these at zero, which makes every floor zero pixels tall and
  // sends the lamp loop looking for fixtures in an empty shaft.
  Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
});

afterEach(cleanup);

describe('Dieselpunk', () => {
  it('mounts without reaching for anything that no longer exists', () => {
    expect(() => render(<Dieselpunk />)).not.toThrow();
  });

  it('renders the whole floor selector, so the lift can be driven at all', () => {
    render(<Dieselpunk />);
    for (const label of ['Start', 'Leistungen', 'Projekte', 'Kontakt']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeDefined();
    }
  });

  it('builds nothing behind a shut door', () => {
    // The intro starts with the leaves closed, and the deck underneath is not
    // dimmed or clipped — it is not built. If this starts finding the ground
    // floor's heading on the first frame, that optimisation has been lost.
    render(<Dieselpunk />);
    expect(screen.queryByText(/Tymchenko/)).toBeNull();
  });

  it('keeps the debug panel out of the way unless it is asked for', () => {
    // It used to render unconditionally, pinned over everything, on a business
    // card. Then it was gated on `import.meta.env.DEV` *or* a `?debug` query
    // flag — which still meant every dev run wore the panel, and the scene
    // could not be looked at plainly without editing the gate and restarting
    // the server. It is now DEV *and* the flag: a dev build that was not asked
    // for the panel does not get one.
    //
    // The gate is read at module load, so a test that wanted the panel would
    // have to control the URL before the import — not worth it. What matters is
    // that the flag is consulted at all rather than the panel being
    // unconditional, and the runner's own URL carries no `?debug`.
    render(<Dieselpunk />);
    expect(screen.queryByText(/door intro debug/)).toBeNull();
  });

  it('survives a resize, which rebuilds every dimension in the scene', () => {
    render(<Dieselpunk />);
    window.innerWidth = 480;
    window.innerHeight = 640;
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
  });

  it('leaves the document scroll exactly as it found it', () => {
    // The shaft owns the vertical axis, so the body must not scroll — but a
    // component that locks the page and does not unlock it is a component that
    // breaks whatever renders after it.
    document.body.style.overflow = 'auto';
    const view = render(<Dieselpunk />);
    expect(document.body.style.overflow).toBe('hidden');
    view.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('cancels its animation frames on unmount', () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    render(<Dieselpunk />).unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
