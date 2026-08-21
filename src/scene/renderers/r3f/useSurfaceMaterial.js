import { useEffect, useMemo, useState } from 'react';
import { bakeSurface, surfaceProps, tileRepeat } from './surfaceMaterial.js';


/** @import { Surface, Shade } from '../../model/types.js' */

/**
 * A surface's material, with its grain tiled to the size of the thing it is on.
 *
 * The bake is asynchronous — it waits on an image — so the first frame is flat
 * colour and the grain arrives a moment later. That is deliberate: a scene that
 * suspends until its textures decode shows nothing at all for the first few
 * hundred milliseconds, and these tiles are a 22% wash over a colour that is
 * already right.
 *
 * @param {Surface} s @param {number} w @param {number} h @param {Shade} [shade]
 */
export default function useSurfaceMaterial(s, w, h, shade = 1) {
  const [tile, setTile] = useState(/** @type {import('three').Texture | null} */(null));
  useEffect(() => {
    let live = true;
    bakeSurface(s).then((t) => { if (live) setTile(t); });
    return () => { live = false; };
  }, [s]);

  return useMemo(() => {
    const base = surfaceProps(s, shade);
    if (!tile) return base;
    const map = tile.clone();
    map.needsUpdate = true;
    map.repeat.set(...tileRepeat(s, w, h));
    return { ...base, map };
  }, [s, w, h, shade, tile]);
}
