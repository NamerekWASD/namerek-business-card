# _attic

Things taken out of the shipped site but not thrown away. Nothing in here is
imported by `src/`, and nothing in here is copied to `dist/` — `public/` is
copied wholesale by Vite whether or not anything references it, which is why a
retired asset has to physically leave that folder rather than just be switched
off.

Moved 2026-08-22, while cutting the first-visit download from 16 MB to 1.5 MB.

## code/

- `PreviewLights.jsx` — marked temporary in its own first line, unreachable from
  `main.jsx` since the migration passed the step it existed for.
- `FloorDial.jsx` — its only use site in `StartDeck.jsx` has been commented out.

## assets/, public/

- `logo-namerek.svg` — the still logo. `logo-namerek-animated.svg` is the one in
  use.
- `icons.svg` — a sprite sheet nothing links to.

## What used to be here

`models/` and `textures/polyhaven/` held the arcade cabinet — a 6.6 MB GLB, an
untextured earlier export, and 12 MB of Poly Haven stock tiles for its
hand-painted slots. The prop was dropped from the scene entirely (NBC-82) and
all of it was deleted; git history has it if it is ever wanted back.
