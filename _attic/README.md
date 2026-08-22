# _attic

Things taken out of the shipped site but not thrown away. Nothing in here is
imported by `src/`, and nothing in here is copied to `dist/` — `public/` is
copied wholesale by Vite whether or not anything references it, which is why the
cabinet GLB had to physically leave that folder rather than just be switched off.

Moved 2026-08-22, while cutting the first-visit download from 16 MB to 1.5 MB.

## models/

- `ArcadeCabinetDieselpunk.glb` — the cabinet, retired from the scene. It was
  still being downloaded on every visit by a warm-up hook after `LandingProps`
  had already stopped drawing it. 6.6 MB, of which 6.3 MB is 18 embedded PNG
  bakes over 8.3k triangles.
- `ArcadeCabinetDieselpunk.v1.glb` — the untextured earlier export, referenced
  by nothing even while the cabinet was live.

## textures/polyhaven/

Stock tiles for the cabinet's hand-painted slots. All three sets were loaded on
every first visit; none of them was ever drawn.

- `rust_panel_*` — the `rustPanel` set. Requested by no `PAINT` entry at all.
- `rust_coarse_*` — the `rust` set. Requested only by `body_bottom_iron_2`,
  which is not a material in any shipped export, and by `access_panel_handle`,
  which ships its own bake and therefore never reaches the stock tiles.
- `painted_metal_*`, `rust_coarse_01_*`, `rusty_metal_sheet_rough_1k.png` —
  downloaded from Poly Haven, imported by nothing, ever.

`metal_plate_*` is deliberately **not** here: it is the one set that did resolve
(to `body_split_line`), and it stays in `src/assets/textures/polyhaven/` so the
parked `src/scene/r3f/ArcadeCabinet.jsx` still compiles if it is ever rewired.
Nothing imports that module, so nothing about it reaches the bundle.

## code/

- `PreviewLights.jsx` — marked temporary in its own first line, unreachable from
  `main.jsx` since the migration passed the step it existed for.
- `FloorDial.jsx` — its only use site in `StartDeck.jsx` has been commented out.

## assets/, public/

- `logo-namerek.svg` — the still logo. `logo-namerek-animated.svg` is the one in
  use. 
- `icons.svg` — a sprite sheet nothing links to.
