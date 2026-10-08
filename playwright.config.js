import { defineConfig } from '@playwright/test';

// NBC-89. The built site in a real WebKit — the engine behind every iPhone
// browser, which nothing else in this repository runs. It is always roughly
// the newest Safari, so it catches engine differences and not version cliffs:
// those are `src/deploy/browserFloor.test.js`'s job.
//
// Serves `dist`, so `npm run build` comes first.

const PORT = 4178;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.js',
  outputDir: '.temp/playwright',
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, browserName: 'webkit' },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
});
