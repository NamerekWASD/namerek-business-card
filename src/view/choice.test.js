import { describe, expect, it } from 'vitest';
import { chooseView, readOverride, rememberChoice, storedChoice } from './choice.js';

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
