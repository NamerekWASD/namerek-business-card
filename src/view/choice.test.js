import { describe, expect, it } from 'vitest';
import {
  SCENE_MIN_WIDTH,
  chooseView,
  readOverride,
  rememberChoice,
  sceneFits,
  storedChoice,
} from './choice.js';

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

const angry = {
  getItem() { throw new DOMException('denied'); },
  setItem() { throw new DOMException('denied'); },
  removeItem() { throw new DOMException('denied'); },
};

describe('readOverride', () => {
  it('reads either flag out of a query string', () => {
    expect(readOverride('?flat')).toBe('flat');
    expect(readOverride('?scene')).toBe('scene');
    expect(readOverride('?utm_source=x')).toBe(null);
    expect(readOverride('')).toBe(null);
  });
});

describe('chooseView', () => {
  it('gives a capable visitor the scene and everyone else the flat card', () => {
    const storage = fakeStorage();
    expect(chooseView({ search: '', storage, capable: true })).toBe('scene');
    expect(chooseView({ search: '', storage, capable: false })).toBe('flat');
  });

  it('lets the query string override the probe, either way', () => {
    const storage = fakeStorage();
    expect(chooseView({ search: '?flat', storage, capable: true })).toBe('flat');
  });

  it('remembers a choice made in the query string, so a reload keeps it', () => {
    const storage = fakeStorage();
    chooseView({ search: '?flat', storage, capable: true });
    expect(storedChoice(storage)).toBe('flat');
    expect(chooseView({ search: '', storage, capable: true })).toBe('flat');
  });

  it('will not honour a stored scene on a machine that cannot draw one', () => {
    // The whole reason the gate exists: a remembered preference must never be
    // able to hand someone a blank page.
    const storage = fakeStorage();
    rememberChoice('scene', storage);
    expect(chooseView({ search: '', storage, capable: false })).toBe('flat');
  });

  it('ignores a stored value that is not one of the two views', () => {
    const storage = fakeStorage({ 'namerek:view': 'css3d' });
    expect(chooseView({ search: '', storage, capable: true })).toBe('scene');
  });

  it('works where storage throws — private windows, blocked site data', () => {
    expect(() => rememberChoice('flat', angry)).not.toThrow();
    expect(storedChoice(angry)).toBe(null);
    expect(chooseView({ search: '?flat', storage: angry, capable: true })).toBe('flat');
    expect(chooseView({ search: '', storage: angry, capable: true })).toBe('scene');
  });

  it('works with no storage at all', () => {
    expect(chooseView({ search: '', storage: null, capable: true })).toBe('scene');
    expect(chooseView({ search: '?flat', storage: undefined, capable: true })).toBe('flat');
  });
});

describe('sceneFits', () => {
  it('is the measured width and nothing device-shaped', () => {
    expect(sceneFits(SCENE_MIN_WIDTH)).toBe(true);
    expect(sceneFits(SCENE_MIN_WIDTH - 1)).toBe(false);
    expect(sceneFits(411)).toBe(false);
    expect(sceneFits(1440)).toBe(true);
  });

  it('does not gate on a width it could not measure', () => {
    // Server rendering, a stubbed window, anything that hands back nothing:
    // an unknown width is not evidence that the scene will clip.
    expect(sceneFits(undefined)).toBe(true);
    expect(sceneFits(null)).toBe(true);
    expect(sceneFits(0)).toBe(true);
    expect(sceneFits(Number.NaN)).toBe(true);
  });
});

describe('chooseView on a viewport the scene cannot fill', () => {
  it('hands a phone the flat card even though its GPU is willing', () => {
    const storage = fakeStorage();
    expect(chooseView({ search: '', storage, capable: true, width: 411 })).toBe('flat');
    expect(chooseView({ search: '', storage, capable: true, width: 1440 })).toBe('scene');
  });

  it('does not write that default down as a choice the visitor made', () => {
    // Nobody chose it, so nothing is remembered: a phone that is later opened
    // on a desktop, or rotated into a window wide enough, gets the scene back.
    const storage = fakeStorage();
    chooseView({ search: '', storage, capable: true, width: 411 });
    expect(storedChoice(storage)).toBe(null);
  });

  it('still lets the visitor ask for the scene on a phone, and keeps it', () => {
    const storage = fakeStorage();
    expect(chooseView({ search: '?scene', storage, capable: true, width: 411 })).toBe('scene');
    expect(chooseView({ search: '', storage, capable: true, width: 411 })).toBe('scene');
  });

  it('keeps the capability probe as the floor under all of it', () => {
    const storage = fakeStorage();
    expect(chooseView({ search: '?scene', storage, capable: false, width: 1440 })).toBe('flat');
  });
});
