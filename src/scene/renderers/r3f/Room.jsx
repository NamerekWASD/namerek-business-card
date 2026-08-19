import { useLayoutEffect, useRef } from 'react';
import { LAYER_OF } from './lighting.js';
import { roomLight, useLightTuning } from './tuning.js';

/**
 * Puts everything under it in one room — and a room, here, is the whole of what
 * "the light in here" means.
 *
 * Three things follow from being in a room, and all three are applied in one
 * traverse rather than at each mesh, because there are two ways a material gets
 * made in this scene (`useSurfaceMaterial` for the big planes, a raw
 * `surfaceProps` spread for every fitting) and anything asked of the call sites
 * gets done at fifteen of them and forgotten at the sixteenth. That is not
 * hypothetical: before this, the ambience rode on `useSurfaceMaterial` only, so
 * forty percent of the meshes in frame — every rib, post, rail, rivet and
 * casting — had no ambience at all and went to pure black the moment they were
 * out of a lamp's reach.
 *
 * **The layer.** A three.js light only reaches objects sharing its layer, so
 * this is how a wall becomes opaque in a scene with no shadows: the shaft's
 * fittings are on one layer, a landing's pendant on another, and neither can
 * light the far side of the masonry between them. The camera sees every layer —
 * it is not a light.
 *
 * **The ambience.** What the room bounces back into its own corners, carried as
 * emissive at the surface's own albedo rather than as an `ambientLight`: same
 * arithmetic, no extra object, and — the part that matters here — *per room*.
 * A tight brick shaft and a plastered corridor do not bounce the same, and one
 * slider for both is why the shaft could not be lifted without flooding the
 * landing.
 *
 * **The wrap.** Which of the two shared uniforms this material's shader reads,
 * so the soft terminator is also per room. See `softLight.js`.
 *
 * Applied on every commit rather than once on mount: meshes come and go as
 * floors are furnished and unfurnished, and a prop that arrives untagged is a
 * prop lit by the wrong building.
 *
 * @param {{ room: 'shaft' | 'landing', children: React.ReactNode }} props
 */
function Room({ room, children }) {
  const group = useRef(null);
  const { ambient } = roomLight(useLightTuning(), room);

  useLayoutEffect(() => {
    const layer = LAYER_OF[room];
    group.current?.traverse((object) => {
      if (object.isLight) return;
      // A room inside a room keeps its own. React runs child effects before
      // parent ones, so the inner `Room` has already claimed its objects by the
      // time the outer one walks past them — the landing sits inside the shaft's
      // back wall in the tree, and without this the shaft would take it back.
      if (object.userData.room !== undefined && object.userData.room !== room) return;
      object.userData.room = room;
      object.layers.set(layer);
      // A prop standing in a doorway is lit by both sides of it, and a layer
      // mask holds as many rooms as it is given. The cabinet asks for this: it
      // faces straight down the open opening, so the shaft's own lamps rake
      // across it, and being lit only by the corridor made it read as a picture
      // of a cabinet hung at the back of the room.
      //
      // Nothing gates it on the doors, because nothing needs to. A shut door
      // hides the whole landing behind it — the leaf is in the near scene, the
      // landing behind the back wall — so light arriving somewhere no one can
      // look is light no one can see.
      const also = object.userData.alsoLit;
      if (also && LAYER_OF[also] !== undefined) object.layers.enable(LAYER_OF[also]);

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        // Read by `softLight`'s `onBeforeCompile`, which runs once per material
        // at its first compile — after this effect, because the canvas draws on
        // the frame *following* the commit that mounted the mesh.
        material.userData.room = room;
        // A lamp's glass, a pilot light, a lit marquee: surfaces that are their
        // own source. Their emissive says something, and the ambience is not
        // entitled to overwrite it.
        if (material.userData.selfLit || !material.emissive) continue;
        // The albedo is kept because this runs again on every commit, and by the
        // second pass `material.color` is still the albedo but `emissive` is
        // already a product of it — recomputing from the previous emissive would
        // compound, and the scene would brighten a little on every render.
        material.userData.albedo ??= material.color.clone();
        material.emissive.copy(material.userData.albedo).multiplyScalar(ambient);
      }
    });
  });

  // No context provider. Nothing below needs to *ask* which room it is in —
  // the traverse above tells every mesh and every material, which is the one
  // mechanism that also reaches the meshes React did not build (the cabinet's
  // GLB, the instanced rivets). A second, parallel way of answering the same
  // question is a second thing to keep in step.
  return <group ref={group}>{children}</group>;
}

export default Room;
