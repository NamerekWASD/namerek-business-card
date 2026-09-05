import { useEffect } from 'react';
import { preloadSurfaceTextures } from '../renderers/r3f/surfaceMaterial.js';
import { settledMark } from '../renderers/r3f/screenMark.js';

// The download half of the boot: the shared surface bakes, and the mark. Both
// are images the browser has to fetch and decode before anything can be drawn
// with them.
//
// The mark used to arrive here as a hundred and twenty stills — the frames of a
// reveal the wall screen played. That reveal is gone: the mark is cut in half
// down the astragal and painted on the two door leaves, so parting the doors is
// the reveal and there is nothing to play. One still is all the scene now needs,
// and it is still a barrier because the leaves are the very first thing in
// frame — see `settledMark`.
//
// This used to be the *whole* barrier, and it used to also wait on a 6.6 MB
// model that nothing was drawing any more. Now it is two jobs out of five, reported separately so the gears move twice rather than
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
    settledMark().then(
      () => { if (live) onSettle('mark'); },
      () => { if (live) onSettle('mark'); },
    );
    return () => { live = false; };
  }, [onSettle]);
  return null;
}
