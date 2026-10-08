import { expect, test } from '@playwright/test';

/** Everything the page complains about while it loads: uncaught errors,
 *  console errors, and requests that failed or came back 4xx/5xx. */
const watch = (page) => {
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`); });
  return problems;
};

const open = async (page) => {
  const problems = watch(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  return problems;
};

test.describe('a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  test('gets the flat card, cleanly', async ({ page }) => {
    const problems = await open(page);
    await expect(page.locator('main.bld')).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('gets the scene if the engine has WebGL, the flat card if not', async ({ page }) => {
    const problems = await open(page);
    // The app's own probe, asked the same way: a CI runner may have no GPU,
    // and then the flat card is the right answer rather than a failure.
    const webgl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    });
    if (webgl) {
      // The flat card here would mean the error boundary caught the scene.
      await expect(page.locator('canvas').first()).toBeVisible();
      await expect(page.locator('main.bld')).toHaveCount(0);
    } else {
      await expect(page.locator('main.bld')).toBeVisible();
    }
    test.info().annotations.push({ type: 'webgl', description: String(webgl) });
    expect(problems).toEqual([]);
  });
});
