# namerek-business-card

An interactive business-card site built as a small dieselpunk elevator scene:
you ride a lift between floors (Home / Services / Projects / Contacts)
through a hand-built CSS 3D shaft, cage and corridor set.

## Stack

- React 19 + Vite
- Plain CSS 3D transforms for the scene (no WebGL/R3F)
- Vitest + Testing Library for tests
- oxlint for linting

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build      # production build
npm run preview    # serve the production build locally
npm test           # run the test suite
npm run lint        # lint
```

## Project layout

- `src/scene/` — the shaft, cage, doors, lighting and lamps that make up the 3D scene
- `src/lift/` — ride/floor state and the animation ticker driving the shaft
- `src/decks/` — the content shown on each floor
- `src/ui/`, `src/theme/` — shared UI pieces and the dieselpunk styling system

## License

All rights reserved — see [LICENSE](LICENSE).
