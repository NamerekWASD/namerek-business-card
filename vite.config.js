import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // basicSsl()
  ],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    host: true,
    allowedHosts: true,
  },
  // Pinned rather than left to Vite's `baseline-widely-available`, which
  // resolves to safari16.4 and shipped a white page to every iPhone below that:
  // three.js writes class static blocks, which older Safari rejects while
  // *parsing*, so nothing in the bundle runs — not the error boundary, not the
  // WebGL probe, not the flat card that a phone is supposed to get.
  //
  // `es2020` is the entry doing the work — class static blocks are ES2022, so
  // it alone forces them down whatever the Safari entries say. Those are here
  // to state the intent and to keep a future bump of the year honest.
  //
  // Measured on this commit, default target against this one: 1 297 320 →
  // 1 299 968 bytes, 360 953 → 361 808 gzipped. 855 gzipped bytes, 0.24%.
  //
  // It also holds the CSS up: `build.cssTarget` defaults to it, and without it
  // the minifier deletes every `vh` fallback that sits in front of a `dvh`.
  //
  // `src/deploy/browserFloor.test.js` guards both, on a fresh in-memory build.
  build: {
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14', 'ios14'],
  },
})
