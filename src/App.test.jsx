// @vitest-environment jsdom
//
// NAM-48's own tests: the gate must never leave a visitor at a blank root,
// whichever way it fails. Two paths in, one net.

import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const webglAvailable = vi.fn();
vi.mock('./scene/renderers/flag.js', () => ({ webglAvailable: (...args) => webglAvailable(...args) }));

// The scene itself is not what this file tests — `Dieselpunk.smoke.test.jsx`
// owns that — so it stands in for two things at once: a capable machine that
// never gets a working scene (the boundary test) and, by never being reached
// at all in the other test, proof that a WebGL-less machine never pays for
// importing it.
vi.mock('./variants/Dieselpunk', () => ({
  default: () => { throw new Error('scene exploded'); },
}));

import App from './App.jsx';
import { PERSON } from './decks/content.js';

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });
});

afterEach(() => {
  cleanup();
  webglAvailable.mockReset();
});

describe('App', () => {
  it('gives a WebGL-less browser the flat card instead of a thrown constructor', () => {
    webglAvailable.mockReturnValue(false);
    render(<App />);
    expect(screen.getByRole('link', { name: PERSON.email })).toBeDefined();
  });

  it('falls back to the flat card when the scene throws after mount, instead of an empty root', () => {
    webglAvailable.mockReturnValue(true);
    // React logs the boundary's catch to the console; expected here and not
    // worth the noise in the test run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    expect(screen.getByRole('link', { name: PERSON.email })).toBeDefined();
    spy.mockRestore();
  });
});
