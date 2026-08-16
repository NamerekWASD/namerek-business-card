import { createContext, useContext } from 'react';
import * as css3d from './css3d/index.js';

// The seam. Every solid in the scene is built by asking for `Solid`/`Stage`
// here rather than importing a CSS-specific component directly — the CSS-3D
// implementation is the only one that exists, but nothing that calls
// `useRenderer()` knows that. A future backend (R3F, say) plugs in by
// rendering `<RendererContext.Provider value={r3fRenderer}>` above the scene;
// today nothing does, so every consumer gets `css3d` by default.
const RendererContext = createContext(css3d);

export function useRenderer() {
  return useContext(RendererContext);
}

export const RendererProvider = RendererContext.Provider;
