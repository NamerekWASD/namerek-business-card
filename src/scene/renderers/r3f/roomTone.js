// ── the tone curve, per room ─────────────────────────────────────────────────
// A tone curve is not a property of a lamp, and the honest first answer to
// "can each light have its own?" is no: tone mapping is the last thing that
// happens to a pixel, and by then the shaft and the landing are one image.
//
// The honest *second* answer is that in three.js it is not applied to the image
// at all. It is compiled into every material's fragment shader and runs
// per-fragment, right before the colour is written — which means the surfaces of
// one room can genuinely be graded differently from the surfaces of another,
// because they are drawn by different shaders in the first place. So this is
// possible, and it is possible without a second render target, a post pass or
// anything else that would cost a frame.
//
// What it is *not* is free of consequences, and the consequence has a name: the
// doorway. Shaft geometry (the piers, the stepped frame, the leaves) sits
// directly against landing geometry at the opening, so two different curves meet
// along an edge with nothing between them. Grade them far apart and that edge
// becomes a visible tonal step — a join, where the scene wants a room seen
// through a hole. Two exposures on one curve is the safe version of this; two
// curves is a deliberate, checkable choice, which is exactly why it is a knob
// rather than a decision made here.
//
// ── how ──────────────────────────────────────────────────────────────────────
// three picks the curve at program-build time: `WebGLProgram` appends
// `vec3 toneMapping( vec3 c ) { return <Name>ToneMapping( c ); }` chosen from the
// renderer's own setting, and sets `toneMappingExposure` as a program uniform on
// every draw. Both are global by construction.
//
// Three edits move them into uniforms this scene owns, so both become per
// material — and per room, via the tag `Room` writes — with no recompiles and no
// extra programs:
//
//   - `#define toneMappingExposure roomExposure`, right after three's own
//     declaration, so all six of its curve functions read our exposure instead;
//   - a `roomToneMapping()` dispatcher appended to the same chunk, branching on
//     an integer uniform over the curves three has already defined above it;
//   - `tonemapping_fragment` calls that dispatcher.
//
// The renderer is then left on any non-`NoToneMapping` value purely so three
// emits `#define TONE_MAPPING` and includes the chunk at all; which curve it
// names no longer matters, because the dispatcher ignores it.

import { MeshStandardMaterial, ShaderChunk, SpriteMaterial } from 'three';

/**
 * The curves, by the name the panel shows, as the integer the shader branches
 * on. Order is arbitrary and internal — nothing outside this file and the
 * uniform it sets should ever see these numbers.
 */
export const TONE_CURVE_IDS = {
  none: 0,
  linear: 1,
  reinhard: 2,
  cineon: 3,
  aces: 4,
  agx: 5,
  neutral: 6,
};

/**
 * One pair of uniforms per room, shared by every material in it — the same
 * mechanism as `softLight`'s wrap, for the same reason: a value the renderer
 * uploads is a value that can be dragged, where a value compiled into a shader
 * is a value that costs every program in the scene to change.
 */
export const toneUniforms = {
  shaft: { curve: { value: TONE_CURVE_IDS.neutral }, exposure: { value: 1 }, chroma: { value: 1 } },
  landing: { curve: { value: TONE_CURVE_IDS.neutral }, exposure: { value: 1 }, chroma: { value: 1 } },
};

// three's own declaration, which we leave in place and then shadow. Leaving it
// keeps `p_uniforms.setValue( gl, 'toneMappingExposure', … )` on the renderer's
// hot path harmless: the name is no longer an active uniform, and setting an
// inactive one is a lookup that misses.
const EXPOSURE_DECL = 'uniform float toneMappingExposure;';

const ROOM_UNIFORMS = `${EXPOSURE_DECL}
uniform float roomExposure;
uniform int roomToneCurve;
uniform float roomChroma;
// every curve below is three's, unmodified — this is the one line that makes
// them read a per-room exposure instead of the renderer's global one
#define toneMappingExposure roomExposure`;

// ── the chroma stage ────────────────────────────────────────────────────────
// Every curve above trades saturation for headroom on its shoulder — ACES and
// AgX do it hardest and most deliberately, since a "path to white" is what
// keeps a blown highlight from turning into a coloured hole. Measured against
// the reference render, that is where this scene loses: the two pictures match
// on luminance histogram and on local contrast, and diverge only on saturation,
// entirely in the bands the shoulder touches — 0.70 against 0.49 in the lit
// band, 0.48 against 0.22 in the highlights.
//
// So the chroma is put back after the curve rather than the curve being
// abandoned. A curve that rolls highlights and a picture that stays coloured
// are not in fact opposed; they were only welded together by three's tone
// mapping being one step.
//
// In linear space, before the sRGB encode, because that is where the curve took
// it away. The clamp is not decoration: past 1.0 the mix drives channels
// negative, and a negative channel reaching `pow()` in the encode comes out NaN
// — one black pixel per fragment that tips over, scattered, and impossible to
// read as a saturation bug.
//
// Appended after the chunk, so every function it names is already defined.
// `none` returns the colour untouched, exposure included, because that is what
// `NoToneMapping` means in three and a knob labelled "none" should not quietly
// keep applying half of something — the chroma stage still runs, since it is a
// grade rather than part of the curve.
const DISPATCHER = `
vec3 roomToneCurveOf( vec3 color ) {
	if ( roomToneCurve == 1 ) return LinearToneMapping( color );
	if ( roomToneCurve == 2 ) return ReinhardToneMapping( color );
	if ( roomToneCurve == 3 ) return CineonToneMapping( color );
	if ( roomToneCurve == 4 ) return ACESFilmicToneMapping( color );
	if ( roomToneCurve == 5 ) return AgXToneMapping( color );
	if ( roomToneCurve == 6 ) return NeutralToneMapping( color );
	return color;
}

vec3 roomToneMapping( vec3 color ) {
	vec3 mapped = roomToneCurveOf( color );
	float grey = dot( mapped, vec3( 0.2126, 0.7152, 0.0722 ) );
	return max( vec3( 0.0 ), mix( vec3( grey ), mapped, roomChroma ) );
}
`;

const CALL = /gl_FragColor\.rgb = toneMapping\( gl_FragColor\.rgb \);/;

let installed = false;

/**
 * Applies the patch. Idempotent, and called for its side effect before any
 * material can compile — see `SceneCanvas`.
 *
 * @returns {boolean} whether it took. A caller that ignores this gets a scene
 *   graded by the renderer's global curve, which looks plausible and is wrong.
 */
export function installRoomTone() {
  if (installed) return true;
  installed = true;

  const pars = ShaderChunk.tonemapping_pars_fragment;
  const frag = ShaderChunk.tonemapping_fragment;
  if (!pars.includes(EXPOSURE_DECL) || !CALL.test(frag)) {
    // Loud, because the failure is otherwise invisible: the scene still renders,
    // graded by whatever the renderer happens to be set to, and the two rooms
    // quietly share a curve again.
    console.error(
      '[roomTone] three.js tone mapping chunks no longer match — per-room grading is NOT applied. '
      + 'Re-derive the patch against this version of three.',
    );
    return false;
  }

  ShaderChunk.tonemapping_pars_fragment = pars.replace(EXPOSURE_DECL, ROOM_UNIFORMS) + DISPATCHER;
  ShaderChunk.tonemapping_fragment = frag.replace(CALL, 'gl_FragColor.rgb = roomToneMapping( gl_FragColor.rgb );');
  return true;
}

/**
 * Binds one material to its room's grade. Called from the `onBeforeCompile` that
 * `softLight` installs, so there is a single hook on the prototype rather than
 * two fighting over it — the second assignment would silently win.
 *
 * @param {{ uniforms: Record<string, unknown> }} shader
 * @param {'shaft' | 'landing'} room
 */
export function bindTone(shader, room) {
  const grade = toneUniforms[room] ?? toneUniforms.shaft;
  shader.uniforms.roomToneCurve = grade.curve;
  shader.uniforms.roomExposure = grade.exposure;
  shader.uniforms.roomChroma = grade.chroma;
}

/** The material types this scene actually draws with, for the tests to hold. */
export const GRADED_MATERIALS = [MeshStandardMaterial, SpriteMaterial];
