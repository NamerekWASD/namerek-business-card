// ── the soft terminator ──────────────────────────────────────────────────────
// The one piece of the CSS lighting model that never got ported, and the reason
// the WebGL scene could not be lit without either blowing out or going black.
//
// `model/lighting.js` shades a face with
//
//   lam = max(0, (cos + LIGHT_WRAP) / (1 + LIGHT_WRAP))
//
// rather than plain `max(0, cos)`. That is wrap lighting, and in this scene it
// is not a stylistic softener — it is load-bearing. The fittings are bolted flat
// to the far wall, twenty-six pixels proud of it, so they sit very nearly *in*
// the plane of everything they are supposed to light: the back wall, the piers,
// the doorway frames, the leaves. Every one of those faces the camera, so the
// angle between its normal and the direction to a fitting is about ninety
// degrees, and `cos` is about zero.
//
// Lambert's answer to that is "unlit". It is the right answer for a point source
// and the wrong answer for a lamp in a reflector on a wall in a narrow shaft,
// where the light arrives off the ceiling, off the opposite wall and off the
// glass itself. The CSS model says so in one constant. three.js's standard
// material does not, so in the WebGL backend the entire front of the scene was
// receiving nothing at all from its own lamps, and the only thing keeping it
// visible was a flat emissive ambience — which is why raising that to where the
// shaft read at all made the landing milky, and lowering it to where the landing
// read made a moving lift a black rectangle. The two are not in tension once the
// fittings actually reach the surfaces in front of them.
//
// There is no `wrap` on `MeshStandardMaterial`, so this patches the chunk that
// computes it. Two edits, both global and both done once:
//
//   - the irradiance line in `RE_Direct_Physical`, which becomes the CSS
//     model's `lam` verbatim;
//   - `MeshStandardMaterial.prototype.onBeforeCompile`, which hands every
//     standard material the *same* uniform object, so the amount is a value the
//     renderer uploads rather than a number compiled into a shader. That is what
//     makes it a knob you can drag: a constant baked into the source would need
//     every program in the scene rebuilt on every step of the slider, and
//     three's program cache is keyed on material state rather than on chunk
//     text, so it would hand back the stale program anyway.
//
// Patching a shader chunk is a heavy hammer and worth being uneasy about. It is
// justified here because the scene owns its whole three.js usage — there is no
// second consumer of `MeshStandardMaterial` to surprise — and because the
// alternative is threading an `onBeforeCompile` through every mesh in four
// files, which is the same patch applied fifteen times and forgotten on the
// sixteenth.

import { MeshBasicMaterial, MeshStandardMaterial, ShaderChunk, SpriteMaterial } from 'three';
import { LIGHT_WRAP } from '../../model/lighting.js';
import { bindTone } from './roomTone.js';
import { bindRoomLights, lightMasks } from './roomLights.js';

/**
 * One uniform per room, each shared by every material in that room.
 *
 * Two, not one, and that is the whole reason this can be dialled at all. The
 * bulkhead lamp sits practically in the plane of everything it lights and needs
 * a great deal of wrap to reach any of it; the pendant hangs in open air and
 * needs very little. A single figure meant every value that rescued the shaft
 * flattened the landing, and there was no number that was right for both.
 *
 * A material is bound to one of these at its first compile, by the room tag
 * `Room` puts on it — see `onBeforeCompile` below. Shared objects, so changing
 * `.value` reaches every material in that room the next frame with nothing
 * recompiled and nothing re-rendered.
 */
export const wrapUniforms = {
  shaft: { value: LIGHT_WRAP },
  landing: { value: LIGHT_WRAP },
};

const DECLARATION = 'uniform float shaftWrap;';

// Matched as a pattern rather than as a literal, because three ships the chunk
// with its blank lines collapsed and the source in the repository keeps them —
// so a copy-pasted literal matches the file you read it from and not the file
// that runs. The count is asserted below: a `.replace()` that quietly matches
// nothing is a patch that silently does not apply, and the symptom of that is
// "the lighting looks a bit off".
const LAMBERT = /float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s*vec3 irradiance = dotNL \* directLight\.color;/g;

const WRAPPED = `float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	// wrap lighting — see renderers/r3f/softLight.js. This is
	// model/lighting.js's \`lam\`, which is what the CSS backend shades with.
	float wrapNL = max( 0.0, ( dot( geometryNormal, directLight.direction ) + shaftWrap ) / ( 1.0 + shaftWrap ) );
	vec3 irradiance = wrapNL * directLight.color;`;

let installed = false;

/**
 * Applies the patch. Idempotent, and called for its side effect at the top of
 * the R3F backend — it has to run before the first material compiles, and a
 * module that is imported for its side effect is easier to reason about than an
 * effect that has to be ordered against a render.
 */
export function installSoftLight() {
  if (installed) return;
  installed = true;

  const chunk = ShaderChunk.lights_physical_pars_fragment;
  if ((chunk.match(LAMBERT) ?? []).length !== 1) {
    // Loud, because the failure is otherwise invisible: the scene renders, it
    // just renders with the lighting model this whole file exists to replace.
    console.error(
      '[softLight] three.js RE_Direct_Physical no longer matches — wrap lighting is NOT applied. '
      + 'Re-derive the patch against this version of three.',
    );
    return;
  }
  ShaderChunk.lights_physical_pars_fragment = `${DECLARATION}\n${chunk.replace(LAMBERT, WRAPPED)}`;

  // One hook, on the prototype, binding every per-room uniform this scene has.
  //
  // On the prototype rather than per material so there is no call site to
  // forget, and because `customProgramCacheKey` defaults to this function's
  // source — one shared function is one cache key, so two rooms still cost one
  // program.
  //
  // One hook rather than two because there is only one slot: a second module
  // assigning `onBeforeCompile` would silently replace this and take the wrap
  // with it. So the tone grade is bound from here too, by `roomTone`'s own
  // function — the patches stay in their own files, the binding does not.
  //
  // Per material, not per program, and that distinction is load-bearing:
  // three.js keeps a `programs` map on each material and calls this once per
  // entry in it, then stores the result as *that material's* uniforms. Two
  // materials sharing a compiled program still get their own bindings, which is
  // exactly what a room split needs. (`WebGLRenderer.getProgram`, r185.)
  //
  // The room tag is written by `Room` in a layout effect, which runs on the
  // commit before the canvas draws — so by the time anything compiles, every
  // material knows where it is. Anything untagged is treated as the shaft:
  // the dim room is the safer thing to be wrong about.
  //
  // Basic and sprite materials are unlit, so `shaftWrap` is not in their
  // shaders and binding it is a no-op — but they are still *graded*, and a
  // sprite left out would be the one thing in frame ignoring the room's tone
  // curve. Hence all three.
  function bindRoom(shader) {
    const room = this.userData.room in wrapUniforms ? this.userData.room : 'shaft';
    shader.uniforms.shaftWrap = wrapUniforms[room];
    bindTone(shader, room);
    // Which sources reach this surface at all — the wall, which three's own
    // layers turned out not to be. A prop standing in an open doorway is lit
    // from both sides and says so with its own key; see `roomLights.js` and
    // `alsoLit` in `Room`. It is bound off `lit` rather than `room` because
    // the wrap and the grade are properties of the room a surface is *in*,
    // while this one is about the rooms it can *see*.
    const lit = this.userData.lit in lightMasks ? this.userData.lit : room;
    bindRoomLights(shader, lit);
  }
  for (const Material of [MeshStandardMaterial, MeshBasicMaterial, SpriteMaterial]) {
    Material.prototype.onBeforeCompile = bindRoom;
  }
}
