import { useCallback, useEffect, useMemo, useState } from 'react';
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

// ── one bake, many shades ────────────────────────────────────────────────────
// NBC-69, and the reason it needed a second entry point rather than more calls
// to the one above. A fitting is rarely one tone: the workbench alone spreads
// `SURFACES.iron` across eleven shades, the valve rack across seven, and every
// one of those was a raw `surfaceProps()` spread — a flat rectangle of colour
// with no grain and no roughness field on it. Reaching for `useFittingMaterial`
// once per tone would be eleven hooks, eleven awaited bakes and eleven pairs of
// cloned textures for one piece of furniture.
//
// The way out is that `shade` does exactly one thing: it multiplies the colour.
// It touches neither map, and it is applied *after* the grain's own gain, so a
// tone can be taken off a material that already carries its texture instead of
// being re-derived from the catalogue — which is the one way this could go
// quietly wrong, and what `fittingShades.test.js` holds.

/**
 * The same material at another tone.
 *
 * @param {{ color: import('three').Color, roughness: number, metalness: number,
 *   map?: unknown, roughnessMap?: unknown }} base
 * @param {Shade} [shade]
 */
export function shadeProps(base, shade = 1) {
  if (shade === 1) return base;
  return { ...base, color: base.color.clone().multiplyScalar(shade) };
}

/**
 * A surface's grain baked once, handed back as something a call site can take
 * any number of tones off.
 *
 * ```jsx
 * const iron = useFittingShades(SURFACES.iron, [bodyW, bodyH]);
 * // …
 * <meshStandardMaterial {...iron(0.62)} />
 * ```
 *
 * @param {Surface} s @param {[number, number]} [size] the largest face the tile
 *   has to cover, so a box's six faces share one density
 */
export function useFittingShades(s, size = [64, 64]) {
  const base = useFittingMaterial(s, 1, size);
  return useCallback((/** @type {Shade} */ shade = 1) => shadeProps(base, shade), [base]);
}
