import { useEffect } from 'react';
import { preloadSurfaceTextures } from '../renderers/r3f/surfaceMaterial.js';
import { markStrip } from '../renderers/r3f/screenMark.js';

// The barrier the door intro waits behind. Everything the first frame needs has
// to have committed *and drawn* before the leaves are allowed to move, or the
// opening coincides with an image decode and a material update and the visitor
// watches the scene assemble itself a texture at a time.
//
// This used to live in `ArcadeCabinet.jsx` as `ArcadeCabinetWarmup`, and it
// waited on `useGLTF` for a 6.6 MB model that `LandingProps` had already
// switched off — so every first visit paid for the whole download and was shown
// none of it. What is left is what the scene actually draws: the shared surface
// bakes and the logo's frames.
//
// It is still an honest barrier only for what it can see. The tail nobody waits
// for yet is shader compilation, which is why three requestAnimationFrames sit
// at the end rather than one — a demand-driven canvas needs a draw call before
// its programs exist at all. A real boot screen wants `compileAsync` here.

/**
 * @param {{ onReady: () => void }} props
 */
export default function SceneWarmup({ onReady }) {
  useEffect(() => {
    let live = true;
    Promise.all([markStrip(), preloadSurfaceTextures()])
      // An optional mark frame should never permanently lock the entire lift.
      .catch(() => [])
      .finally(() => {
        // One commit for React, then one draw for each demand-driven canvas.
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
          if (live) onReady();
        })));
      });
    return () => { live = false; };
  }, [onReady]);
  return null;
}
