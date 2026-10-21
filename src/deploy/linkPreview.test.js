import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NBC-114. The picture a shared link shows. `npm run og` rebuilds the file;
// this holds the tags that point at it to the file that is actually there.

const SITE = 'https://namerek-business-card.pages.dev';
const FILE = 'public/og-image.jpg';

const html = readFileSync('index.html', 'utf8');
const headers = readFileSync('public/_headers', 'utf8').replace(/\r\n/g, '\n');

/** @param {'property' | 'name'} attr */
const meta = (attr, key) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;

/** Width and height from a JPEG's start-of-frame segment. */
function jpegSize(bytes) {
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes[at + 1];
    const length = bytes.readUInt16BE(at + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + length;
  }
  throw new Error('no start-of-frame segment');
}

describe('the link preview', () => {
  it('names the file in public by an absolute URL', () => {
    expect(meta('property', 'og:image')).toBe(`${SITE}/og-image.jpg`);
    expect(statSync(FILE).isFile()).toBe(true);
  });

  it('declares the size the file really has, at the large-card ratio', () => {
    const { width, height } = jpegSize(readFileSync(FILE));
    expect({ width, height }).toEqual({ width: 1200, height: 630 });
    expect(meta('property', 'og:image:width')).toBe(String(width));
    expect(meta('property', 'og:image:height')).toBe(String(height));
  });

  it('describes the picture for a reader who cannot see it', () => {
    expect(meta('property', 'og:image:alt')?.length).toBeGreaterThan(20);
  });

  it('asks for the large card on X and points it at the same file', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'twitter:image')).toBe(meta('property', 'og:image'));
  });

  it('stays light enough for a crawler that gives up on big files', () => {
    expect(statSync(FILE).size).toBeLessThan(300 * 1024);
  });

  it('is cached like the icons, for a day and never immutable', () => {
    const rule = headers.match(/\n\/og-image\.jpg\n((?: {2}.*\n?)+)/)?.[1];
    expect(rule).toMatch(/max-age=86400/);
    expect(rule).not.toMatch(/immutable/);
  });
});
