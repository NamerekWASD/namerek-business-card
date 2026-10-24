# namerek-business-card

An interactive business-card site built as a small dieselpunk elevator scene:
you ride a lift between floors (Home / Services / Projects / Contacts)
through a WebGL shaft, cage and corridor set.

## Stack

- React 19 + Vite
- react-three-fiber / three.js for the scene
- Vitest + Testing Library for tests
- oxlint for linting

## Getting started

```bash
npm ci            # install exactly what the lockfile pins
npm run dev       # start the dev server
npm run build      # production build
npm run preview    # serve the production build locally
npm test           # run the test suite
npm run lint        # lint
npm run og          # rebuild the link preview, public/og-image.jpg
```

## Project layout

- `src/scene/` — the shaft, cage, doors, lighting and lamps that make up the 3D scene
- `src/lift/` — ride/floor state and the animation ticker driving the shaft
- `src/decks/` — the content shown on each floor
- `src/ui/`, `src/theme/` — shared UI pieces and the dieselpunk styling system

## Deployment

The site is static — there is no backend and nothing to run on a server — so it
is published to [Cloudflare Pages](https://pages.cloudflare.com/) from
`.github/workflows/ci.yml`. Every push to `main` and every pull request is
linted, tested and built, but not deployed. A release is a version tag:

```sh
git tag v1.2.0
git push origin v1.2.0
```

The tag runs the same checks, and only a build that survives them is deployed,
as the production deployment of `main`.

Caching and security headers live in `public/_headers`, which Cloudflare reads
and does not serve.

### One-time setup

1. Create a Pages project named `namerek-business-card` in the Cloudflare
   dashboard, using **Direct Upload** rather than the Git integration — the
   workflow here is what uploads, and connecting Git as well would publish the
   same commit twice.
2. Create an API token with the **Cloudflare Pages: Edit** permission.
3. Add two repository secrets under *Settings → Secrets and variables →
   Actions*: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## License

All rights reserved — see [LICENSE](LICENSE).
