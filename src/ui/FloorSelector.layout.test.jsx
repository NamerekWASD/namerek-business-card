// @vitest-environment jsdom
//
// Where the deck buttons sit on the console track. NBC-86 first centred them
// against the track, then the brief changed: they belong beside the language
// rotary, with the slack all on the works-plate side.
//
// jsdom lays out no grid, so this reads the track definition rather than
// measuring boxes — which is the whole contract anyway: exactly one flexible
// column, and it is the first one, so nothing can open a gap between the
// buttons and the switch.

import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FloorSelector from './FloorSelector.jsx';

afterEach(cleanup);

const noop = () => {};

describe('the console track', () => {
  it('leaves the free width on the works-plate side, not between the buttons and the switch', () => {
    render(<FloorSelector pos={0} deck={0} moving={false} go={noop} />);
    const nav = screen.getByRole('navigation');
    const tracks = nav.style.gridTemplateColumns.trim().split(/\s+/);
    expect(tracks).toHaveLength(3);
    expect(tracks.filter((t) => t !== 'auto')).toEqual(['1fr']);
    expect(tracks[0]).toBe('1fr');
  });

  it('ends the button row against the switch', () => {
    render(<FloorSelector pos={0} deck={0} moving={false} go={noop} />);
    const row = screen.getAllByRole('button')[0].parentElement;
    expect(row.style.justifySelf).toBe('end');
  });
});
