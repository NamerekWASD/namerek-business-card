import { useEffect, useMemo, useState } from 'react';
import { bakeSurface, surfaceProps, tileRepeat } from './surfaceMaterial.js';
import { useLightTuning } from './tuning.js';

/** @import { Surface, Shade } from '../../model/types.js' */

/**
 * A surface's material, with its grain tiled to the size of the thing it is on.
 *
 * The bake is asynchronous — it waits on an image — so the first frame is flat
 * colour and the grain arrives a moment later. That is deliberate: a scene that
 * suspends until its textures decode shows nothing at all for the first few
 * hundred milliseconds.
 *
 * **Subscribed to the bench.** Grain strength and tile size are knobs now (see
 * `grainOf`), so this has to re-ask for the bake when one of them moves or the
 * panel would be a set of sliders that do nothing until a reload. The bakes are
 * quantised and cached, so a drag walks through a handful of canvases rather
 * than making one per frame.
 *
 * @param {Surface} s @param {number} w @param {number} h @param {Shade} [shade]
 */
export default function useSurfaceMaterial(s, w, h, shade = 1) {
  const tuning = useLightTuning();
  const [tile, setTile] = useState(/** @type {import('three').Texture | null} */(null));

  useEffect(() => {
    let live = true;
    bakeSurface(s).then((t) => { if (live) setTile(t); });
    return () => { live = false; };
    // the knobs the bake itself reads — a change to either is a different tile
  }, [s, tuning.grainWall, tuning.grainMetal]);

  return useMemo(() => {
    if (!tile) return surfaceProps(s, shade);
    const map = tile.clone();
    map.needsUpdate = true;
    map.repeat.set(...tileRepeat(s, w, h));
    // the map goes *through* `surfaceProps`, which is what lifts the colour by
    // the grain's own gain — see the note there
    return surfaceProps(s, shade, map);
  }, [s, w, h, shade, tile, tuning.grainScale]);
}

/**
 * The same thing for a fitting rather than a plane: a cage post, a rail, a
 * skirting, a counterweight.
 *
 * It exists because `surfaceProps()` on its own returns no map, and until now
 * *every* raw `<meshStandardMaterial {...surfaceProps(…)} />` in this codebase
 * was completely untextured — the pendant, the cage, the counterweight, the
 * door-frame members, all of the workbench but its slab. Measured off screen,
 * the bench's legs had a luminance stddev of 2.3 out of 255, which is a flat
 * rectangle. That is not a lighting fault and no amount of relighting reaches
 * it.
 *
 * `size` is the largest face the tile has to cover, so a box's six faces share
 * one density instead of each stretching the tile to its own proportions.
 *
 * @param {Surface} s @param {Shade} [shade] @param {[number, number]} [size]
 */
export function useFittingMaterial(s, shade = 1, size = [64, 64]) {
  return useSurfaceMaterial(s, size[0], size[1], shade);
}
