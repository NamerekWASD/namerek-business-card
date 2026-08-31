// @vitest-environment jsdom
//
// NBC-62 made the rail the page's only scrollbar, which means it is no longer
// only a picture of where you are — a press on it moves the page. The three
// things worth holding still are the ones that break silently: that a press on
// a floor sign is that sign's click and not a drag of the trough underneath it,
// that a drag maps a pointer to the right place on the shaft, and that the
// release always happens so the snap is never left switched off.

import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import Rail from './Rail.jsx';
import { FLOORS } from './floors.js';

afterEach(cleanup);

const TRACK = { top: 100, height: 600 };
const MARK_H = 60;

function mount() {
  const on = {
    onSelect: vi.fn(),
    onScrubStart: vi.fn(),
    onScrub: vi.fn(),
    onScrubEnd: vi.fn(),
    onWheel: vi.fn(),
  };
  const view = render(<Rail active={0} progress={0} {...on} />);
  const track = view.container.querySelector('.rail-track');
  // jsdom lays nothing out, so the two measurements the mapping is built on
  // have to be supplied.
  track.getBoundingClientRect = () => ({ top: TRACK.top, height: TRACK.height });
  for (const mark of view.container.querySelectorAll('.rail-mark')) {
    Object.defineProperty(mark, 'offsetHeight', { value: MARK_H, configurable: true });
  }
  return { ...view, track, on };
}

describe('Rail as the scrollbar', () => {
  it('maps a press on the trough onto the shaft, top plate to bottom plate', () => {
    const { track, on } = mount();
    // The car's travel starts half a plate below the track's top edge and ends
    // half a plate above its bottom, so those two points are 0 and 1.
    const top = TRACK.top + MARK_H / 2;
    const span = TRACK.height - MARK_H;

    fireEvent.pointerDown(track, { clientY: top, button: 0 });
    expect(on.onScrubStart).toHaveBeenCalled();
    expect(on.onScrub).toHaveBeenLastCalledWith(0);

    fireEvent.pointerMove(track, { clientY: top + span / 2 });
    expect(on.onScrub).toHaveBeenLastCalledWith(0.5);

    fireEvent.pointerMove(track, { clientY: top + span });
    expect(on.onScrub).toHaveBeenLastCalledWith(1);

    fireEvent.pointerUp(track);
    expect(on.onScrubEnd).toHaveBeenCalledTimes(1);
  });

  it('clamps a pointer dragged off either end of the shaft', () => {
    const { track, on } = mount();
    fireEvent.pointerDown(track, { clientY: TRACK.top, button: 0 });
    fireEvent.pointerMove(track, { clientY: -400 });
    expect(on.onScrub).toHaveBeenLastCalledWith(0);
    fireEvent.pointerMove(track, { clientY: 9000 });
    expect(on.onScrub).toHaveBeenLastCalledWith(1);
  });

  it('leaves a press on a floor sign to that sign', () => {
    const { container, on } = mount();
    const mark = container.querySelector('.rail-mark');
    fireEvent.pointerDown(mark, { clientY: 300, button: 0, bubbles: true });
    expect(on.onScrubStart).not.toHaveBeenCalled();
    expect(on.onScrub).not.toHaveBeenCalled();
    fireEvent.click(mark);
    expect(on.onSelect).toHaveBeenCalledWith(0);
  });

  it('ends the drag when the pointer is cancelled, not only when it is lifted', () => {
    const { track, on } = mount();
    fireEvent.pointerDown(track, { clientY: 300, button: 0 });
    fireEvent.pointerCancel(track);
    expect(on.onScrubEnd).toHaveBeenCalledTimes(1);
    // and a stray move afterwards is not still driving the page
    fireEvent.pointerMove(track, { clientY: 500 });
    expect(on.onScrub).toHaveBeenCalledTimes(1);
  });

  it('forwards the wheel, because the rail is not a place scrolling stops', () => {
    const { container, on } = mount();
    fireEvent.wheel(container.querySelector('.rail'), { deltaY: 120 });
    expect(on.onWheel).toHaveBeenCalled();
  });

  it('still lists every floor as a real link', () => {
    const { container } = mount();
    const links = [...container.querySelectorAll('a.rail-mark')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(FLOORS.map((f) => `#${f.id}`));
  });
});
