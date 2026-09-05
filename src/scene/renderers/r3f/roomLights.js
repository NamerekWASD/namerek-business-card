// ── the wall, for real this time ─────────────────────────────────────────────
// The shaft and a landing are two rooms with masonry between them, and that
// masonry is opaque. Every other file in this backend says so by putting the
// two rooms on different three.js layers — `Room` sets the object's, `lightRig`
// sets the light's — on the understanding that "a light only reaches objects
// sharing its layer".
//
// **three.js does not do that.** Its renderer tests a light's layers against the
// *camera's*, once, when it gathers the lights for the frame:
//
//   if ( object.isLight && object.layers.test( camera.layers ) ) lightsArray.push( object )
//                                                 ↑ the camera, not the receiver
//
// (`WebGLRenderer.projectObject`, r185.) There is no per-object light filtering
// anywhere in the WebGL path. `CameraRig` calls `camera.layers.enableAll()` — it
// has to, or the camera would see neither room — so every light in the scene has
// been reaching every surface in the scene since the layers were introduced.
// The shadow cameras are the same story: `WebGLShadowMap.renderObject` tests
// `object.layers.test( camera.layers )` against the main camera too, so
// `light.shadow.camera.layers` selects nothing either.
//
// Measured on 2. UG at 1527×726: zeroing the three shaft fittings alone changed
// the landing's own wall and floor by up to 25 levels of 255 across a third of
// the room — the hard diagonal wedges thrown through the doorway from a fitting
// bolted to the shaft wall, which is what NBC-74 is a picture of.
//
// So the partition is implemented here instead, at the one place it can actually
// be implemented: in the shader, as a mask over the point lights. It is the same
// idea the layers were meant to express — one bit per source per room — and it
// costs one `float` multiply per light per fragment.
//
// The patch is two edits, both global and both done once:
//
//   - `lights_pars_begin` gains the array declaration, because a `uniform` has
//     to be at file scope and `lights_fragment_begin` is spliced into `main()`;
//   - `lights_fragment_begin` multiplies each point light's colour by its own
//     entry, immediately after `getPointLightInfo` computes it.
//
// The loop there is unrolled by three's own preprocessor, which rewrites `[ i ]`
// to a literal index (`loopReplacer`), so `roomLightMask[ i ]` becomes
// `roomLightMask[ 0 ]`, `[ 1 ]`, … exactly like `pointLights[ i ]` above it.
//
// What this deliberately does *not* do is decide which seat belongs to which
// room. `SceneLights` builds the rig and knows each seat's `kind`; it calls
// `syncLightMasks` with that, so the mask and the light it masks are written
// from one value in one place. A second table of seat rooms is a second thing to
// keep in step.

import { ShaderChunk } from 'three';

/**
 * One mask per room, shared by every material in it — the same mechanism as
 * `softLight`'s wrap and `roomTone`'s grade, for the same reason: a value the
 * renderer uploads is a value that can change on any frame, where a value
 * compiled into a shader costs every program in the scene to change.
 *
 * `both` is the doorway case. A prop standing in an open opening is genuinely
 * lit from both sides of it — the architrave stands in the opening itself and
 * the shaft's own fittings rake across it — and a mask holds as many rooms as
 * it is given. See `alsoLit` in `Room`.
 *
 * The arrays start empty and are sized by `syncLightMasks`: their length must
 * equal `NUM_POINT_LIGHTS`, since that is the size three declares the uniform
 * at and `gl.uniform1fv` refuses an array longer than the one it is filling.
 */
export const lightMasks = {
  shaft: { value: new Float32Array(0) },
  landing: { value: new Float32Array(0) },
  both: { value: new Float32Array(0) },
};

/** The rooms a material can be bound to, which is the rooms plus the doorway. */
export const MASK_KEYS = /** @type {const} */ (['shaft', 'landing', 'both']);

/**
 * Writes the mask from the rig itself.
 *
 * Takes the rig's `kind` per seat rather than asking `seatRoom` again, so the
 * mask cannot disagree with the light it masks: both are written from the same
 * array on the same frame, in `SceneLights.apply`.
 *
 * Reallocates only when the seat count changes — `shaftLights` is a knob, so it
 * does change — and otherwise writes three or four floats into arrays that are
 * already the right size, on every ride frame, for nothing.
 *
 * @param {readonly ('shaft' | 'landing')[]} kinds one per seat, in rig order
 */
export function syncLightMasks(kinds) {
  for (const key of MASK_KEYS) {
    const slot = lightMasks[key];
    if (slot.value.length !== kinds.length) slot.value = new Float32Array(kinds.length);
    for (const [index, kind] of kinds.entries()) {
      slot.value[index] = key === 'both' || key === kind ? 1 : 0;
    }
  }
}

// Declared behind the guard three itself uses for the array it sits beside: a
// material compiled with no point lights in the scene would otherwise be handed
// `float roomLightMask[ 0 ]`, which is a compile error rather than an empty
// array.
const DECLARATION = `
#if NUM_POINT_LIGHTS > 0
	uniform float roomLightMask[ NUM_POINT_LIGHTS ];
#endif
`;

// Matched as a pattern for the same reason `softLight`'s is: three ships its
// chunks with the blank lines collapsed, so a literal copied out of the
// repository matches the file you read and not the file that runs. The count is
// asserted below — a `.replace()` that quietly matches nothing is a patch that
// silently does not apply, and the symptom of *that* is a scene that looks
// exactly like the bug it was supposed to fix.
const CALL = /getPointLightInfo\( pointLight, geometryPosition, directLight \);/g;

const MASKED = `getPointLightInfo( pointLight, geometryPosition, directLight );
		// the wall — see renderers/r3f/roomLights.js
		directLight.color *= roomLightMask[ i ];`;

let installed = false;

/**
 * Applies the patch. Idempotent, and called for its side effect before any
 * material can compile — see `SceneCanvas`.
 *
 * @returns {boolean} whether it took. A caller that ignores this gets a scene
 *   where every lamp lights every room, which is what the layers were already
 *   silently doing.
 */
export function installRoomLights() {
  if (installed) return true;
  installed = true;

  const pars = ShaderChunk.lights_pars_begin;
  const frag = ShaderChunk.lights_fragment_begin;
  if ((frag.match(CALL) ?? []).length !== 1) {
    console.error(
      '[roomLights] three.js lights_fragment_begin no longer matches — the rooms are NOT '
      + 'partitioned, every lamp lights every surface. Re-derive the patch against this three.',
    );
    return false;
  }

  ShaderChunk.lights_pars_begin = pars + DECLARATION;
  ShaderChunk.lights_fragment_begin = frag.replace(CALL, MASKED);
  return true;
}

/**
 * Binds one material to its room's mask. Called from the `onBeforeCompile` that
 * `softLight` installs on the material prototypes, so there is one hook rather
 * than three fighting over the single slot.
 *
 * **Anything lit that this hook does not reach renders black.** An unbound
 * `roomLightMask` is an array of zeros, so every point light is multiplied out.
 * `softLight` hooks `MeshStandardMaterial` — which `MeshPhysicalMaterial`
 * inherits from — and this scene draws with nothing else that takes a light
 * (measured: 911 standard, 17 basic, 6 sprite across both canvases). A Lambert
 * or Phong material introduced later would need adding to that list. It is at
 * least a loud failure rather than a quiet one, which is more than the layers
 * it replaces ever managed.
 *
 * @param {{ uniforms: Record<string, unknown> }} shader
 * @param {'shaft' | 'landing' | 'both'} key
 */
export function bindRoomLights(shader, key) {
  shader.uniforms.roomLightMask = lightMasks[key] ?? lightMasks.shaft;
}
