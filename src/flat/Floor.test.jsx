// @vitest-environment jsdom
//
// NBC-63. jsdom cannot watch an animation, so what is asserted here is the
// shape the fix depends on: the light is a layer of its own, laid over the
// floor's content rather than applied to it. If the lamp ever goes back to
// being the content's own opacity, the "page still loading" reading and the
// flash rate come back with it and no test would have noticed.

import { readFileSync } from 'node:fs';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Floor from './Floor.jsx';
import { FLOORS } from './floors.js';

afterEach(cleanup);

describe('Floor arrival', () => {
  it('lights the floor with a layer over it, not by dimming what is on it', () => {
    const { container } = render(<Floor meta={FLOORS[0]}><p>Inhalt</p></Floor>);
    const section = container.querySelector('.floor');
    const lamp = section.querySelector('.floor-lamp');

    expect(lamp).not.toBeNull();
    expect(lamp.getAttribute('aria-hidden')).toBe('true');
    // Over everything, and last, so nothing on the floor paints above it.
    expect(section.lastElementChild).toBe(lamp);
    expect(section.querySelector('.floor-inner').textContent).toBe('Inhalt');
  });

  it('arrives where there is no IntersectionObserver to say it has', () => {
    // Which is this runner. A page that hides its content behind an observer
    // it cannot build is a page with no content — see `useArrival`.
    expect(typeof IntersectionObserver).toBe('undefined');
    const { container } = render(<Floor meta={FLOORS[0]}><p>Inhalt</p></Floor>);
    expect(container.querySelector('.floor').className).toContain('is-lit');
  });

  it('brings the lamp up once, without a beat back towards dark', () => {
    // NBC-63, second pass: he picked the cascade on its own, so the contactor
    // hit is gone. jsdom will not run the animation, but a keyframe that goes
    // back up in opacity is a flash by definition — assert the curve only ever
    // falls, and no reviewer has to eyeball it again.
    const css = readFileSync('src/flat/flat.css', 'utf8');
    const block = css.match(/@keyframes lamp-lift\s*\{([^}]*\}\s*)*?\}/)[0];
    const stops = [...block.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1]));

    expect(stops.length).toBeGreaterThan(1);
    for (let i = 1; i < stops.length; i += 1) expect(stops[i]).toBeLessThan(stops[i - 1]);
  });
});
