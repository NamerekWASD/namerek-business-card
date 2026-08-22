import { useEffect } from 'react';
import { preloadSurfaceTextures } from '../renderers/r3f/surfaceMaterial.js';
import { markStrip } from '../renderers/r3f/screenMark.js';

// The download half of the boot: the shared surface bakes, and the frames of
// the logo's reveal. Everything here is an image the browser has to fetch and
// decode before anything can be drawn with it.
//
// This used to be the *whole* barrier, and it used to also wait on a 6.6 MB
// arcade cabinet that `LandingProps` had already switched off. Now it is two
// jobs out of five, reported separately so the gears move twice rather than
// once — see `boot/plan.js` for the rest of the register, and `boot/CanvasBoot`
// for the part nobody was waiting for at all.

/**
 * @param {{ onSettle: (name: string) => void }} props
 */
export default function SceneWarmup({ onSettle }) {
  useEffect(() => {
    let live = true;
    // Reported one at a time rather than through a `Promise.all`, because they
    // finish at genuinely different moments and a progress figure that only
    // moves when the slower of two lands is a progress figure with a step in it
    // for no reason.
    //
    // Both settle on failure as well as success: an optional mark frame or a
    // tile that 404s is a reason to draw the scene without it, never a reason
    // to hold a black screen over a scene that is otherwise ready.
    preloadSurfaceTextures().then(
      () => { if (live) onSettle('tiles'); },
      () => { if (live) onSettle('tiles'); },
    );
    markStrip().then(
      () => { if (live) onSettle('mark'); },
      () => { if (live) onSettle('mark'); },
    );
    return () => { live = false; };
  }, [onSettle]);
  return null;
}
