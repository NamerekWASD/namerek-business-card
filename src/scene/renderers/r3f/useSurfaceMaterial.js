import { useEffect, useMemo, useState } from 'react';
import { bakeRoughness, bakeSurface, surfaceProps, tileRepeat } from './surfaceMaterial.js';
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
 * **Two bakes, one arrival.** The grain also serves as a roughness field — the
 * thing that turns the environment map's reflection into wear rather than a
 * uniform sheen — and the two are awaited together on purpose. Resolved apart,
 * they would land in two commits, and the second one changes the material's
 * shader program: a visible relink of every surface in the scene, a frame after
 * it already settled.
 *
 * @param {Surface} s @param {number} w @param {number} h @param {Shade} [shade]
 */
export default function useSurfaceMaterial(s, w, h, shade = 1) {
  const tuning = useLightTuning();
  const [baked, setBaked] = useState(
    /** @type {{ tile: import('three').Texture | null, rough: import('three').Texture | null }} */
    ({ tile: null, rough: null }),
  );

  useEffect(() => {
    let live = true;
    Promise.all([bakeSurface(s), bakeRoughness(s)]).then(([tile, rough]) => {
      if (live) setBaked({ tile, rough });
    });
    return () => { live = false; };
    // the knobs the bakes themselves read — a change to any is a different tile
  }, [s, tuning.grainWall, tuning.grainMetal, tuning.roughGrain]);

  return useMemo(() => {
    const { tile, rough } = baked;
    if (!tile && !rough) return surfaceProps(s, shade);
    // Cloned per surface because the repeat lives on the texture and a cage
    // rail is not tiled like a wall. A clone shares the image, so this is a
    // second descriptor rather than a second upload.
    const repeat = tileRepeat(s, w, h);
    const at = (t) => {
      const copy = t.clone();
      copy.needsUpdate = true;
      copy.repeat.set(...repeat);
      return copy;
    };
    // both go *through* `surfaceProps`, which is what lifts the colour by the
    // grain's gain and the roughness by its own — see the note there
    return surfaceProps(s, shade, tile ? at(tile) : null, rough ? at(rough) : null);
  }, [s, w, h, shade, baked, tuning.grainScale]);
}

/**
 * What a `<meshStandardMaterial>` built from these props should be keyed on.
 *
 * Which maps a material carries is part of three's program cache key, so a map
 * arriving after the first frame has to remount the material rather than be
 * assigned into the one already compiled.
 *
 * @param {{ map?: unknown, roughnessMap?: unknown }} material
 */
export const materialKey = (material) => `${material.map ? 'g' : ''}${material.roughnessMap ? 'r' : ''}` || 'flat';

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
