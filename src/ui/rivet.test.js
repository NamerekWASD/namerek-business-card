import { describe, expect, it } from 'vitest';
import { rivetImage, rivetURL } from './rivet.js';

describe('rivet', () => {
  it('is a data URL CSS can put in url() without escaping it again', () => {
    const url = rivetURL();
    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    // The one trap this file exists to avoid: a raw `#` ends the URL at the
    // first colour stop and the rivet silently becomes nothing.
    expect(url.includes('#')).toBe(false);
    expect(url.includes('"')).toBe(false);
    expect(url.includes('\n')).toBe(false);
  });

  it('wraps itself for CSS, quoted, so a bare comma cannot split the layer', () => {
    expect(rivetImage()).toBe(`url("${rivetURL()}")`);
  });

  it('is the same rivet every time, so two plates are bolted with one asset', () => {
    expect(rivetURL()).toBe(rivetURL());
  });

  it('has a head, a keyline and a shadow — a dot has none of them', () => {
    const svg = decodeURIComponent(rivetURL().slice('data:image/svg+xml,'.length));
    expect(svg).toContain('radialGradient');
    // dome, specular, bounce, contact shadow: a flat disc would need one fill.
    expect(svg.match(/<radialGradient/g).length).toBeGreaterThanOrEqual(4);
  });

  it('comes in iron as well as brass, because not every bolt is bright', () => {
    expect(rivetURL('iron')).not.toBe(rivetURL('brass'));
  });

  it('refuses a tone it does not have rather than drawing an empty square', () => {
    expect(() => rivetURL('plastic')).toThrow();
  });
});
