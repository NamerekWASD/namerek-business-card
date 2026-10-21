// NBC-114. Builds `public/og-image.jpg`, the picture a shared link shows.
//
//   npm run og
//
// Two shots. The first is the entrance of the built site — the scene, in
// German, after the intro has settled. The second is `card.html` with that shot,
// the logo and the text of `og:title` / `og:description` poured into it, taken
// at 1200x630. The text is read from `index.html` so the picture cannot say
// something the tags do not.
//
// JPEG, because the scene is photographic: the same card is ~400 KB as a PNG
// and ~100 KB at quality 90, with no difference anyone can see.

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { preview } from 'vite';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const at = (path) => join(root, path);

const OUT = at('public/og-image.jpg');
const PORT = 4179;
// The scene freezes the main thread for several seconds on arrival under
// software GL, then runs its door intro; 20s leaves both behind with margin.
const SETTLE_MS = 20_000;

const html = await readFile(at('index.html'), 'utf8');
const meta = (property) => {
  const found = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`));
  if (!found) throw new Error(`index.html has no ${property}`);
  return found[1].replaceAll('&amp;', '&');
};
const [name, role] = meta('og:title').split(' — ');
const line = meta('og:description');

const svg = await readFile(at('src/assets/logo-namerek-animated.svg'));
const logo = `data:image/svg+xml;base64,${svg.toString('base64')}`;

const server = await preview({ root, logLevel: 'warn', preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({
  // Headless Chromium has no GPU; this is what lets it draw the WebGL scene.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const site = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: 'de-DE',
  });
  await site.goto(`http://localhost:${PORT}/?scene`);
  await site.waitForTimeout(SETTLE_MS);
  // The build-status screen drops whole fields now and then, and a shot taken
  // in one shows it black. A lit screen is the most detailed frame of the
  // series, so the largest PNG is the one to keep. 4:3 from the middle: the
  // cage gates stay in at the edges, the content is drawn larger.
  let shot = Buffer.alloc(0);
  for (let i = 0; i < 5; i++) {
    const next = await site.screenshot({ clip: { x: 120, y: 0, width: 1200, height: 900 } });
    if (next.length > shot.length) shot = next;
    await site.waitForTimeout(700);
  }
  const frame = `data:image/png;base64,${shot.toString('base64')}`;
  await site.close();

  const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await card.addInitScript((data) => {
    window.__og = data;
  }, { name, role, line, logo, frame });
  await card.goto(pathToFileURL(at('scripts/og-image/card.html')).href);
  await card.evaluate(() => document.fonts.ready);
  await card.waitForFunction(() => [...document.images].every((img) => img.complete));
  // The logo draws itself in about a second; let it finish.
  await card.waitForTimeout(2_000);
  await card.screenshot({ path: OUT, type: 'jpeg', quality: 90 });
  await card.close();
} finally {
  await browser.close();
  await server.close();
}

const { size } = await stat(OUT);
console.log(`public/og-image.jpg —${Math.round(size / 1024)} KB`);
