# The renderer seam

Everything in `scene/` that puts a solid on screen goes through `useRenderer()`
(`RendererContext.js`) instead of importing a CSS-specific component directly.
Today that context has exactly one value — `css3d/` — and nothing provides a
different one. The point of the seam is not that a second renderer exists; it's
that swapping one in later touches this folder and nothing else.

```js
import { useRenderer } from '../renderers/RendererContext.js';

function SomeSceneObject(props) {
  const { Solid, Stage } = useRenderer();
  return (
    <Stage>
      <Solid left={0} top={0} w={172} h={82} d={116} yaw={14} />
    </Stage>
  );
}
```

`Stage` is the shared camera (one `perspective` + one `preserve-3d` root).
`Solid` is a box: three visible faces, shaded from a normal, culled by the
browser. Every object in `scene/objects/`, `scene/shaft/`, `scene/cage/`, and
`scene/landing/` that needs a 3D box asks for these rather than building divs
by hand.

## Three tiers, not one

Not everything here is equally portable, and pretending otherwise would be
worse than saying so. The refactor sorted every piece of the scene into one of
three buckets.

**Tier A — already renderer-agnostic.** `scene/model/`: the camera
(`camera.js`), the lighting math (`lighting.js`), the material catalogue
(`materials.js`), the geometry constants (`geometry.js`). Pure functions over
numbers — no React, no DOM, no CSS string anywhere in this directory. A
three.js backend uses these **directly**: `CAM_PERSPECTIVE` converts straight
to a vertical FOV (see `fovFor()` in `camera.js`), each entry from `lampsAt()`
becomes a `PointLight` with the same falloff, `SURFACES.iron` becomes a
`MeshStandardMaterial` keyed off the same tile.

**Tier B — geometry with a direct 3D analogue, behind the seam.**
`scene/objects/`, and the assemblies in `scene/shaft/`, `scene/cage/`,
`scene/landing/` that compose them. `Solid` maps onto `THREE.BoxGeometry`.
`Lamp`'s cylindrical body — sixteen quads around an axis, each shaded from its
own normal — maps onto `THREE.CylinderGeometry`. These components describe
*what* to draw (position, size, yaw, material, tint) and the active renderer
decides *how*. An R3F implementation of `Solid`/`Stage` would live in a
sibling `scene/renderers/r3f/` and get plugged in via
`<RendererContext.Provider value={r3fRenderer}>` above the scene — no caller
in `objects/`, `shaft/`, `cage/`, or `landing/` would change.

**Tier C — irreducibly DOM.** The scissor-gate lattice in `CageGate`
(`repeating-linear-gradient`), the enamel plates and stencils in `ui/`, the
rivet corners, the vignette and haze discs in `scene/effects/Lighting.jsx`,
the SVG motion-blur filter in `MotionBlurDef.jsx`, and all of `decks/`'s flat
text content. None of this has a meaningful 3D form — in an R3F world these
stay as `<Html>` overlays or 2D compositing on top of the canvas, not
geometry. Don't try to force them through `Solid`.

## What actually moves, what doesn't

If a second renderer ever gets built:

- **Moves untouched:** everything in `scene/model/` — that's the entire point
  of Tier A.
- **Moves by re-implementing two components:** `Stage` and `Solid` in a new
  `scene/renderers/r3f/` folder, matching the same props. Every Tier B
  consumer (`Lamp`, `Counterweight`, `ShaftCable`, `HoistRopes`, `RivetSeam`,
  `PropBody`, `CageDeck`/`CagePost`/`CageGate`/`CageRail`, `ShaftWall`,
  `ShaftBack`, `Doorway`, `Architrave`) keeps working without edits, because
  none of them import `css3d/` directly — they all go through
  `useRenderer()`.
- **Never moves:** Tier C. It stays exactly what it is today, mounted
  alongside the canvas rather than inside it.

## Constraints that matter more once there's a second implementation

- Props passed to `Solid` are primitives only — no object literals. A fresh
  object on every render defeats `memo` on whatever's underneath, in both a
  CSS-3D world and a scene-graph one.
- `useRenderer()` must return a stable reference (`RendererContext.js` seeds
  it with a module-level `css3d` namespace object, not something rebuilt per
  render) — an unstable context value re-renders the entire scene subtree on
  every frame regardless of which renderer is behind it.
