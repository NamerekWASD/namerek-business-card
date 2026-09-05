// ── coming out of the dark ───────────────────────────────────────────────────
// NBC-77. A box on the 2. UG conveyor used to appear at the plane of the
// plaster: the black behind the opening is opaque, so a box in the tunnel is
// not dark, it is *not drawn*, and the first frame any of it exists it exists
// at full brightness. Mykolai's word for it was "спаунятся из темноты", and the
// mechanic is right — the product does come out of the works behind the wall —
// but nothing was grading the arrival.
//
// ── why it could not be done with a card ────────────────────────────────────
// His own first idea was a semi-transparent black quad hung in the opening. It
// cannot ramp: alpha grades in the plane of the card, and what has to grade
// here is *depth*. One card is a step — behind it darker, in front of it
// instantly not — and the step lands on the box's silhouette exactly as hard as
// the plaster does now. Several cards are a staircase, and each one is another
// transparent draw over the one part of the room with a machine in it.
//
// The same idea done as a term in the shader is continuous, costs no draw call
// and no light, and — because it is a function of world position and nothing
// else — is not a second writer: the ticker owns where a box is, this owns
// nothing at all. (`project_ride_judder_two_writers`, and the rule the whole
// belt is written under.)
//
// ── why it multiplies at the very end ───────────────────────────────────────
// A box face is self-lit: `artwork()` in `LandingProps.jsx` hands it
// `emissive` × `emissiveMap` × the room's ambience, and on this floor that term
// is the *brighter* of the two. A fade applied to the lit term alone would
// grade almost nothing. So the multiply lands on `gl_FragColor` after
// `opaque_fragment` has composed the emissive in, and before tone mapping,
// which is where a darkening belongs — after it, and a fade to black would be
// a fade to whatever the curve puts at the bottom.

import { MeshStandardMaterial } from 'three';

/**
 * The uniform every faded material shares with its neighbours: where the ramp
 * starts, in world z, and how long it is.
 *
 * A `vec2` rather than two floats because both are written at the same moment
 * by the same measurement — the run's group is measured off its world matrix
 * after layout, so the value arrives *after* the materials exist and has to
 * reach them with nothing recompiled.
 *
 * @param {number} from world z at which the surface is entirely black
 * @param {number} span how far in front of that it comes up to full brightness
 */
export const mouthFadeUniform = (from, span) => ({ value: [from, span] });

/**
 * Patch a shader three has just handed us. Split out from the binding below
 * only so the replacements can be asserted on their own.
 *
 * @param {{ vertexShader: string, fragmentShader: string, uniforms: object }} shader
 * @param {{ value: [number, number] }} uniform
 */
function fadeShader(shader, uniform) {
  shader.uniforms.mouthFade = uniform;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vMouthZ;')
    // `transformed` rather than `position`: it is what every deformation in the
    // pipeline has already been applied to, and it is what the rest of the
    // vertex shader goes on to use.
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvMouthZ = ( modelMatrix * vec4( transformed, 1.0 ) ).z;',
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>\nvarying float vMouthZ;\nuniform vec2 mouthFade;',
    )
    // Evaluated here rather than interpolated from the vertices: a box's side
    // face is two vertices deep, so a curve sampled at its ends and stretched
    // between them is a straight line — which is a ramp, but not this ramp, and
    // the difference shows on the one face the camera is closest to.
    .replace(
      '#include <tonemapping_fragment>',
      'gl_FragColor.rgb *= smoothstep( mouthFade.x, mouthFade.x + mouthFade.y, vMouthZ );\n'
      + '#include <tonemapping_fragment>',
    );
}

/**
 * Bind one material to the ramp.
 *
 * It does **not** assign `onBeforeCompile`, it wraps whatever is already there.
 * `softLight.js` hangs the wrap lighting, the room's tone grade and the room's
 * light mask off a single hook on `MeshStandardMaterial.prototype`, and all
 * three files are explicit that a second assignment silently wins and takes the
 * others with it. `ArcadeCabinet.jsx` states the same idiom for its edge wear.
 *
 * Idempotent, because it runs from a layout effect that runs on every commit —
 * the box's faces are rebuilt whenever the console pages to another project,
 * and a second round of patching would declare `vMouthZ` twice, which is a
 * compile error that takes the whole program with it.
 *
 * @param {import('three').Material} material
 * @param {{ value: [number, number] }} uniform
 */
export function bindMouthFade(material, uniform) {
  if (material.userData.mouthFade) return;
  material.userData.mouthFade = true;
  const inherited = material.onBeforeCompile;
  material.onBeforeCompile = function mouthFadeCompile(shader, renderer) {
    inherited.call(this, shader, renderer);
    fadeShader(shader, uniform);
  };
  // One key for every box on the run, and a different one from everything else
  // in the room. three's default is `onBeforeCompile.toString()`, which would
  // read the *inherited* hook's source through the wrapper on some paths and
  // hand a faded material the room's ordinary program.
  material.customProgramCacheKey = () => 'mouthFade';
  // The materials exist before this runs — R3F built them on the commit this
  // effect is the tail of — and three only re-reads a material's program when
  // the flag says so. Without this the first draw compiles the unpatched
  // program and keeps it. (The same lesson as `claimMap` in `Room.jsx`.)
  material.needsUpdate = true;
}

/**
 * Bind everything under one object, materials arrays included.
 *
 * A box is seven materials — six faces and two straps sharing one — and the
 * point of doing it by traverse rather than by hand is the eighth: anything
 * added to a box later is faded because it is on the box, not because someone
 * remembered.
 *
 * @param {import('three').Object3D | null} root
 * @param {{ value: [number, number] }} uniform
 */
export function bindMouthFadeTree(root, uniform) {
  if (!root) return;
  root.traverse((o) => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) if (m instanceof MeshStandardMaterial) bindMouthFade(m, uniform);
  });
}
