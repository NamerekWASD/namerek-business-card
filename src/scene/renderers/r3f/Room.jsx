import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import { LAYER_OF } from './lighting.js';
import { roomEnvMap } from './roomEnv.js';
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
 * **What it reflects.** A metal has almost no diffuse term: nearly everything
 * it shows is the room around it, and with no `envMap` there is no room around
 * it to show — so every metallic entry in `SURFACES` was rendering as a dark
 * flat patch and paying for the privilege. `roomEnv.js` paints a small
 * environment per room, which partitions exactly the way the tone curve and the
 * wrap already do: a fitting in the shaft reflects the shaft's own lamp, and one
 * on the landing reflects the pendant.
 *
 * `visible` is forwarded to the group it wraps, because a room is also the
 * natural unit of "nobody can see in here": one flag, and the renderer skips
 * the whole subtree at `projectObject` — the camera pass and all six faces of
 * every shadow cube alike. Hiding is not unmounting, and that is the point:
 * what is hidden costs nothing to draw but keeps its geometry, its materials
 * and their compiled programs, so coming back into view is free.
 *
 * @param {{ room: 'shaft' | 'landing', visible?: boolean, children: React.ReactNode }} props
 */
function Room({ room, visible = true, children }) {
  const group = useRef(null);
  const gl = useThree((s) => s.gl);
  const { ambient, bounce, env, envColor } = roomLight(useLightTuning(), room);
  // Rebuilt only when the knob moves; the traverse below runs on every commit
  // and allocating a Color per material per commit is the kind of garbage that
  // only shows up as a stutter months later.
  const bounceColour = useMemo(() => new Color(bounce ?? '#ffffff'), [bounce]);
  // Rendered into the same target every time, so the texture keeps its identity
  // across a colour change — see `roomEnv.js`. A change of identity here would
  // relink every shader in the room, because `envMap` is in three's program
  // cache key.
  const envMap = useMemo(
    () => (gl && envColor ? roomEnvMap(gl, room, envColor) : null),
    [gl, room, envColor],
  );

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
        // Assigned once per material, guarded by identity for the same reason
        // `emissiveMap` below is. The *intensity* is a plain uniform three
        // uploads on every draw, so that one is free to write on every commit
        // and free to drag on the bench.
        if (envMap && material.isMeshStandardMaterial) {
          if (material.envMap !== envMap) {
            material.envMap = envMap;
            material.needsUpdate = true;
          }
          material.envMapIntensity = env ?? 1;
        }
        // A lamp's glass, a pilot light, a lit marquee: surfaces that are their
        // own source. Their emissive says something, and the ambience is not
        // entitled to overwrite it.
        if (material.userData.selfLit || !material.emissive) continue;
        // **The bounce carries the picture rather than flooding it.** This is
        // the half of the texture problem that does not live in the bake.
        //
        // On most faces in this scene the ambience is the *brighter* of the two
        // terms — measured, about 3:1 on a prop standing on the floor — and a
        // flat emissive cannot show a pattern. So a surface could carry a
        // perfectly good `map` and still render as one solid rectangle, which
        // is precisely what "I cannot see any of the textures" meant. Handing
        // the same texture through as `emissiveMap` makes the room's bounce
        // modulate with the grain instead of pouring one colour over it.
        //
        // Safe to do wholesale now, and it was not before: the bake used to
        // multiply the surface's colour into the tile, so the map was a picture
        // of the wall and using it twice would have squared it. It is a neutral
        // grain normalised to a mean of one, so this changes contrast and not
        // level. See `surfaceMaterial.js`.
        //
        // Assigned once. `emissiveMap` is in three's program cache key, so
        // setting it on every commit would relink every shader in the room on
        // every commit; the identity check is what keeps that to the first pass.
        if (material.map && material.emissiveMap !== material.map) {
          material.emissiveMap = material.map;
          material.needsUpdate = true;
        }
        // The albedo is kept because this runs again on every commit, and by the
        // second pass `material.color` is still the albedo but `emissive` is
        // already a product of it — recomputing from the previous emissive would
        // compound, and the scene would brighten a little on every render.
        material.userData.albedo ??= material.color.clone();
        // **And the bounce has a colour of its own.** `albedo × scalar` is the
        // one thing a shadow in this scene could not have: every unlit face came
        // out as its own albedo, so a shadow was never anything but a darker
        // copy of the surface, and the picture had exactly one hue in it at
        // every level of brightness. Measured against the reference that was the
        // whole complaint — matching luminance, matching local contrast, blue
        // channel running a third of red where the reference holds it near a
        // fifth. A tint on the way back out is what a room made of ochre plaster
        // actually does to the light it returns, and it is the only term here
        // with anywhere to put that.
        //
        // White leaves this exactly as it was, so the knob has a defensible
        // no-op and the two rooms can disagree about it.
        material.emissive.copy(material.userData.albedo)
          .multiplyScalar(ambient)
          .multiply(bounceColour);
      }
    });
  });

  // No context provider. Nothing below needs to *ask* which room it is in —
  // the traverse above tells every mesh and every material, which is the one
  // mechanism that also reaches the meshes React did not build (the cabinet's
  // GLB, the instanced rivets). A second, parallel way of answering the same
  // question is a second thing to keep in step.
  return <group ref={group} visible={visible}>{children}</group>;
}

export default Room;
