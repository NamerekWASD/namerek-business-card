import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderLib } from 'three';
import { bindMouthFade, mouthFadeUniform } from './mouthFade.js';
import { installSoftLight, wrapUniforms } from './softLight.js';

// The same argument `softLight.test.js` opens with, for the same reason: this
// is a string replacement against somebody else's shader, and the failure mode
// of a string replacement is silence. Upgrade three, have it rename a chunk,
// and nothing throws — the boxes simply go back to being born at full
// brightness on the plane of the plaster, which is the bug this was written to
// end and which nobody would think to look for again.

const fakeShader = () => ({
  uniforms: {},
  vertexShader: ShaderLib.physical.vertexShader,
  fragmentShader: ShaderLib.physical.fragmentShader,
});

describe('the mouth fade', () => {
  it('finds every one of its targets in the installed three', () => {
    const shader = fakeShader();
    expect(shader.vertexShader).toContain('#include <common>');
    expect(shader.vertexShader).toContain('#include <begin_vertex>');
    expect(shader.fragmentShader).toContain('#include <common>');
    // Where the multiply lands, and it has to be this one: after
    // `opaque_fragment` has composed the emissive into `gl_FragColor` — a box
    // face is *self*-lit and a fade that only touched the lit term would grade
    // nothing — and before tone mapping, which is where a darkening belongs.
    expect(shader.fragmentShader).toContain('#include <tonemapping_fragment>');
  });

  it('writes the world depth in the vertex shader and reads it in the fragment', () => {
    const material = new MeshStandardMaterial();
    bindMouthFade(material, mouthFadeUniform(10, 2));
    const shader = fakeShader();
    material.onBeforeCompile(shader);

    expect(shader.vertexShader).toContain('varying float vMouthZ;');
    expect(shader.vertexShader).toContain('modelMatrix * vec4( transformed, 1.0 )');
    expect(shader.fragmentShader).toContain('varying float vMouthZ;');
    expect(shader.fragmentShader).toContain('uniform vec2 mouthFade;');
    expect(shader.fragmentShader).toContain('gl_FragColor.rgb *= smoothstep(');
  });

  it('hands the material the same uniform object it was bound to', () => {
    const uniform = mouthFadeUniform(10, 2);
    const material = new MeshStandardMaterial();
    bindMouthFade(material, uniform);
    const shader = fakeShader();
    material.onBeforeCompile(shader);
    // The same object, not an equal one: the run's origin is measured off the
    // group's world matrix after layout, so the value is written once the
    // materials already exist and must reach them with nothing recompiled.
    expect(shader.uniforms.mouthFade).toBe(uniform);
  });

  // The trap this file exists for as much as the chunk names. `softLight.js`
  // hangs the wrap, the room's tone grade and the room's light mask off a
  // single hook on `MeshStandardMaterial.prototype`, and an assignment to
  // `material.onBeforeCompile` silently shadows all three — a box that fades
  // correctly and is lit by the wrong room's lamps.
  it('keeps the room hook it is wrapping', () => {
    installSoftLight();
    const material = new MeshStandardMaterial();
    material.userData.room = 'landing';
    bindMouthFade(material, mouthFadeUniform(0, 1));
    const shader = fakeShader();
    material.onBeforeCompile(shader);
    expect(shader.uniforms.shaftWrap).toBe(wrapUniforms.landing);
  });

  it('binds a material once, however many times it is asked', () => {
    const material = new MeshStandardMaterial();
    bindMouthFade(material, mouthFadeUniform(0, 1));
    const once = material.onBeforeCompile;
    bindMouthFade(material, mouthFadeUniform(0, 1));
    expect(material.onBeforeCompile).toBe(once);

    // and one bind is one patch: two rounds of it would declare `vMouthZ`
    // twice, which is a compile error and takes the whole room's program with
    // it
    const shader = fakeShader();
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader.match(/varying float vMouthZ;/g)).toHaveLength(1);
  });

  // Every box material is bound through the same function, so three's program
  // cache — which keys on `onBeforeCompile.toString()` unless told otherwise —
  // hands all of them one program while leaving every unfaded material in the
  // room on its own.
  it('costs the scene one program for every box on the run', () => {
    const a = new MeshStandardMaterial();
    const b = new MeshStandardMaterial();
    bindMouthFade(a, mouthFadeUniform(0, 1));
    bindMouthFade(b, mouthFadeUniform(5, 2));
    expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
    expect(a.customProgramCacheKey()).not.toBe(new MeshStandardMaterial().customProgramCacheKey());
  });
});
