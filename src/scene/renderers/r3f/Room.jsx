import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import { LAYER_OF } from './lighting.js';
import { roomEnvMap } from './roomEnv.js';
import { roomLight, useLightTuning } from './tuning.js';

/**
 * Tells three that this material's `map` is not the one its shader was built
 * with. Answers whether it had to.
 *
 * Split out of the traverse below because it is the one rule in this file that
 * can be checked without a GPU, and it has already been got wrong twice by
 * being left to the call sites. See the note at its call site for what it is
 * for; the short version is that assigning a texture to a material is not the
 * same as telling three about it, and every grain in this scene is assigned
 * after the fact.
 *
 * @param {{ map?: unknown, needsUpdate?: boolean, userData: Record<string, unknown> }} material
 * @returns {boolean}
 */
export function claimMap(material) {
  const map = material.map ?? null;
  if (material.userData.mapAt === map) return false;
  material.userData.mapAt = map;
  material.needsUpdate = true;
  return true;
}

/**
 * Which lamps reach a surface, as one answer — the key `roomLights.js` binds a
 * material's mask to.
 *
 * Split out of the traverse for the same reason `claimMap` is: it is the rule
 * in this file with the loudest failure and the quietest symptom. A key the
 * mask does not hold binds nothing, an unbound mask is zeros, and a lit
 * material with a zeroed mask renders black.
 *
 * Three cases, and the scene has one of each:
 *
 * - the room it stands in — the wall, and almost everything;
 * - `both`, for a thing standing in an open doorway and genuinely lit from
 *   either side of it (`AlsoLit` — the cage, the architrave, the cabinet);
 * - one room that is not the one it stands in (`LitBy`). Exactly one surface
 *   asks for this and it is the cage's floor deck. See the note at that call
 *   site; the short version is that a bulkhead lamp in a reflector, modelled
 *   as a bare point, lands its brightest patch on the lift floor in the corner
 *   nearest the wall it is bolted to.
 *
 * @param {string} room the room the object stands in
 * @param {string} [alsoLit] a second room it is open to
 * @param {string} [litBy] the room whose lamps reach it *instead*
 * @returns {'shaft' | 'landing' | 'both'}
 */
export function litKey(room, alsoLit, litBy) {
  if (litBy && LAYER_OF[litBy] !== undefined) return litBy;
  if (alsoLit && LAYER_OF[alsoLit] !== undefined && alsoLit !== room) return 'both';
  return room;
}

/**
 * Marks everything under it as also lit by another room — the doorway case.
 *
 * A surface facing an open opening is genuinely lit from both sides of it: the
 * cage's posts and rails and the architrave lining the hole take the landing's
 * pendant, and go on taking the shaft's fittings, because there is nothing
 * between them and either. Without this they are lit by the shaft alone and the
 * lift reads as a dark box standing in front of a lit room, which is what
 * NBC-74's second reference is a picture of.
 *
 * The cage's *floor* is the one thing in there that wanted the other answer —
 * see `LitBy` below.
 *
 * A wrapper rather than `userData` at each mesh because `Panel`, `Box` and
 * `PatternPlane` build their own meshes and forward nothing — and because the
 * rule is about a *region* of the scene, not about fifteen individual boxes.
 *
 * It runs as a layout effect inside `Room`'s own subtree, and React runs a
 * child's effects before its parent's, so the tag is always already there when
 * the traverse below reads it.
 *
 * @param {{ room: 'shaft' | 'landing', children: React.ReactNode }} props
 */
export function AlsoLit({ room, children }) {
  const group = useRef(null);
  useLayoutEffect(() => {
    group.current?.traverse((object) => {
      if (!object.isLight) object.userData.alsoLit = room;
    });
  });
  return <group ref={group}>{children}</group>;
}

/**
 * Hands everything under it to another room's lamps *instead* of its own.
 *
 * The stronger claim than `AlsoLit`, and it needs the stronger argument. There
 * is exactly one surface in this scene that earns it: the floor of the cage.
 *
 * The shaft's fittings are bulkhead lamps in reflectors, bolted flat to the
 * back wall either side of the opening. They are modelled as bare point
 * lights — which is right for the piers and the frames they are a foot away
 * from, and wrong for a horizontal deck five hundred pixels below and five
 * hundred to the side, because a bare point keeps a cosine term a reflector
 * would have thrown away. The result was measurable and backwards: across the
 * lift floor, left to right, the pendant alone lays 7/9/20/34/42/22/8 — a pool
 * centred on the doorway, which is what a lift standing at a lit landing looks
 * like — and the shaft lamps turn that into 29/55/48/44/46/36/17, monotonic,
 * brightest in the corner nearest the wall lamp and flat everywhere the pool
 * was supposed to be.
 *
 * So the deck takes the landing's lamps and nothing else, and what is on it is
 * the corridor's own light and the shadow of the pendant's guard falling
 * through the doorway — see `PendantCage`.
 *
 * **It changes which lamps reach the surface, not which room it is in.** The
 * layer, the tone curve, the ambience and the environment map all stay the
 * shaft's, because the deck really is in the shaft: it is a steel floor in a
 * brick hoistway, and it should be graded like one. This is the one place in
 * the scene where "where does this stand" and "what lights it" have different
 * answers, which is why it is a wrapper of its own rather than a flag on
 * `AlsoLit`.
 *
 * @param {{ room: 'shaft' | 'landing', children: React.ReactNode }} props
 */
export function LitBy({ room, children }) {
  const group = useRef(null);
  useLayoutEffect(() => {
    group.current?.traverse((object) => {
      if (!object.isLight) object.userData.litBy = room;
    });
  });
  return <group ref={group}>{children}</group>;
}

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
 * **The layer, and the mask.** A wall is opaque to light, and saying so is this
 * component's first job. The layer is how it was said for a long time — and it
 * turned out not to say anything at all: three tests a light's layers against
 * the *camera's*, never against the receiver's, and this scene's camera is on
 * every layer because it has to see both rooms. So the layer is a tag now, and
 * the mask beside it (`userData.lit`, read by `roomLights.js` at compile) is the
 * masonry. `alsoLit` is the doorway: a prop standing in an open opening is lit
 * from both sides and gets both bits.
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
      // What the layer above was always meant to mean, in the one form three
      // actually honours: which sources reach this surface. See `roomLights.js`
      // — the layers do not do this and never did, and `litKey` at the top of
      // this file for the three answers and which surface asks for each.
      const lit = litKey(room, also, object.userData.litBy);

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        // Read by `softLight`'s `onBeforeCompile`, which runs once per material
        // at its first compile — after this effect, because the canvas draws on
        // the frame *following* the commit that mounted the mesh.
        material.userData.room = room;
        // Read at the same moment and under the same rule as `room` above it:
        // `onBeforeCompile` runs once per material, so both tags have to be
        // right before the material's first draw. This traverse is a layout
        // effect and the canvas draws on the frame after the commit, so they
        // are — including for the cabinet, whose meshes are tagged in
        // `paintedModel` as its materials are built. A material that changed
        // rooms after compiling would need `needsUpdate` *and* a cache key of
        // its own, which would cost the scene a second program per room; no
        // surface in this scene moves house.
        material.userData.lit = lit;
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
        // **A map that arrives late is a map three never hears about.** R3F
        // writes a changed prop straight onto the material and never touches
        // `needsUpdate`; three keys its program on which maps a material
        // carries and only re-reads that when the flag says so. Every grain in
        // this scene is baked asynchronously and lands a commit or two after
        // the material it belongs to was made, so the texture ends up on the
        // object and never in the shader. Measured on 2026-09-03: 42 materials
        // across the two canvases holding a `map` whose own program had no
        // `USE_MAP` in it — the astragals, the pendant's stem and globe, the
        // valve rack's bottles.
        //
        // Everything that is not self-lit was being rescued by accident a few
        // lines down: `emissiveMap` is set from the same texture and *that*
        // sets the flag. The self-lit ones return before they reach it, which
        // is exactly why the list was exactly the self-lit ones. So the flag is
        // raised here instead, above the return, where it covers both.
        //
        // It is also the last of NBC-76's door hitches. Which program a
        // material ended up with depended on whether its bake landed before or
        // after its first draw: at boot it lands after, so the leaves compiled
        // flat and the mapped program was never linked — and then a doorway
        // mounted mid-ride was born with the bake already cached, wanted that
        // program, and linked it on the frame its own leaves were parting. One
        // state per material, one program, and `warmDraw` covers it.
        claimMap(material);
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
