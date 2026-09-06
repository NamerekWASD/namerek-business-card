// @vitest-environment jsdom
//
// The rotary is a radio group wearing a knob, and the things worth holding
// still are the ones a picture of it would never show:
//
// * it has **end stops**. A four-position selector on a 150° sweep is not a
//   wheel; arrowing off the last position must stay on the last position,
//   because a switch that silently wraps from Russian back to German is a
//   switch that changed the language while the visitor was looking away.
// * its arrow keys must not reach `document`. The flat card steers floors from
//   a document-level keydown, so an unstopped ArrowLeft here would change the
//   language *and* ride a floor.
// * the carriage must actually be under the live position. Its offset is the
//   one thing binding the drawing to the state, and nothing else in the
//   component would fail if it were wrong.

import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LanguageSelector from './LanguageSelector.jsx';
import { LOCALES } from '../i18n/locale.js';

afterEach(cleanup);

function mount(value = 'en') {
  const onChange = vi.fn();
  const view = render(<LanguageSelector value={value} onChange={onChange} />);
  return { ...view, onChange, group: screen.getByRole('radiogroup') };
}

const positions = () => screen.getAllByRole('radio');

describe('the language rotary', () => {
  it('offers the four positions, named in their own language', () => {
    mount();
    expect(positions()).toHaveLength(LOCALES.length);
    for (const locale of LOCALES) {
      expect(screen.getByRole('radio', { name: locale.endonym })).toBeTruthy();
    }
  });

  it('marks and tabs to the position the switch is on', () => {
    mount('uk');
    const checked = positions().filter((el) => el.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
    expect(checked[0].getAttribute('aria-label')).toBe('Українська');
    // One tab stop for the whole group: a rotary is one control, not four.
    expect(positions().filter((el) => el.tabIndex === 0)).toEqual(checked);
  });

  it('turns to a position that is clicked, and does not report a turn that is not one', () => {
    const { onChange } = mount('en');
    fireEvent.click(screen.getByRole('radio', { name: 'Русский' }));
    expect(onChange).toHaveBeenCalledWith('ru');
    onChange.mockClear();
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('steps one position per arrow and stops at the ends', () => {
    const { group, onChange } = mount('en');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('uk');
    onChange.mockClear();
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('de');

    onChange.mockClear();
    cleanup();
    const first = mount('de');
    fireEvent.keyDown(first.group, { key: 'ArrowLeft' });
    expect(first.onChange).not.toHaveBeenCalled();

    cleanup();
    const last = mount('ru');
    fireEvent.keyDown(last.group, { key: 'ArrowRight' });
    expect(last.onChange).not.toHaveBeenCalled();
  });

  it('carries focus with the selection', () => {
    const { group } = mount('en');
    screen.getByRole('radio', { name: 'English' }).focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(document.activeElement.getAttribute('aria-label')).toBe('Українська');
  });

  it('throws the switch to either end', () => {
    const { group, onChange } = mount('en');
    fireEvent.keyDown(group, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('ru');
    onChange.mockClear();
    fireEvent.keyDown(group, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('de');
  });

  it('keeps its keys to itself, so the page does not steer on them too', () => {
    const page = vi.fn();
    document.addEventListener('keydown', page);
    const { group } = mount('en');
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      fireEvent.keyDown(group, { key, bubbles: true });
    }
    document.removeEventListener('keydown', page);
    expect(page).not.toHaveBeenCalled();
  });

  it('lets a key the switch has no use for through', () => {
    const page = vi.fn();
    document.addEventListener('keydown', page);
    const { group } = mount('en');
    fireEvent.keyDown(group, { key: 'ArrowDown', bubbles: true });
    document.removeEventListener('keydown', page);
    expect(page).toHaveBeenCalled();
  });

  it('parks the carriage under the position it is on', () => {
    const at = (id) => {
      cleanup();
      mount(id);
      return parseFloat(document.querySelector('.lang-pointer').style.getPropertyValue('--sel-x'));
    };
    const run = LOCALES.map((locale) => at(locale.id));
    // The first position is the groove's own start, the rest are evenly
    // spaced along it, and the order on the strip is the order in `LOCALES` —
    // the drawing and the list cannot disagree about which way it runs.
    expect(run[0]).toBe(0);
    const step = run[1] - run[0];
    expect(step).toBeGreaterThan(0);
    for (let i = 1; i < run.length; i += 1) {
      expect(run[i] - run[i - 1]).toBeCloseTo(step, 5);
    }
  });
});

// ── locked while the cabin is busy ──────────────────────────────────────────
// NBC-90. A language change repaints half the scene's textures, and the way
// that repaint is hidden is a cycle of the landing doors. Two things must not
// be able to start one: a trip already under way, and a repaint already under
// way. Both are the same fact from this control's side — the cabin is moving —
// so the switch is dead for as long as it is.
describe('while the cabin is moving', () => {
  const locked = () => {
    const onChange = vi.fn();
    render(<LanguageSelector value="en" onChange={onChange} disabled />);
    return onChange;
  };

  it('does not answer a click', () => {
    const onChange = locked();
    fireEvent.click(screen.getAllByRole('radio')[3]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not answer the arrow keys either', () => {
    const onChange = locked();
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says so to a screen reader rather than only going quiet', () => {
    locked();
    for (const position of screen.getAllByRole('radio')) {
      expect(position.disabled).toBe(true);
    }
  });

  it('still shows which language is live — a locked switch is not a blank one', () => {
    locked();
    const live = screen.getAllByRole('radio').filter((b) => b.getAttribute('aria-checked') === 'true');
    expect(live).toHaveLength(1);
    expect(live[0].getAttribute('aria-label')).toBe('English');
  });
});
