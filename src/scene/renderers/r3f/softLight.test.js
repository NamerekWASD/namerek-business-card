import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderChunk } from 'three';
import { installSoftLight, wrapUniforms } from './softLight.js';
import { LIGHT_WRAP } from '../../model/lighting.js';

// This file exists for one reason: the patch is a string replacement against
// somebody else's shader, and the failure mode of a string replacement is
// silence. Upgrade three, have it rename `geometryNormal` or reflow the
// function, and nothing throws — the scene renders, with plain Lambert, and the
// only symptom is that the shaft looks a bit flat months later.
//
// So the assertion is not "wrap lighting looks right", which needs a GPU and an
// eye. It is "the patch found its target, exactly once, in the version of three
// that is actually installed", which needs neither and is the thing that breaks.

describe('the wrap-lighting patch', () => {
  it('applies to the installed three, and says so in the shader', () => {
    installSoftLight();
    const chunk = ShaderChunk.lights_physical_pars_fragment;
    expect(chunk).toContain('uniform float shaftWrap;');
    expect(chunk).toContain('float wrapNL = max( 0.0,');
    // the term it replaces is gone: a patch that adds a wrapped irradiance and
    // leaves the unwrapped one behind lights everything twice
    expect(chunk).not.toContain('vec3 irradiance = dotNL * directLight.color;');
  });

  it('leaves the specular term its own unwrapped cosine', () => {
    installSoftLight();
    // `dotNL` still feeds BRDF_GGX below the replacement. Wrapping the diffuse
    // is a statement about light arriving off the walls; wrapping a mirror
    // reflection is a statement about geometry that is not there.
    expect(ShaderChunk.lights_physical_pars_fragment)
      .toContain('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );');
  });

  it('binds a material to its own room, and shares one object within it', () => {
    installSoftLight();
    const bind = (room) => {
      const material = new MeshStandardMaterial();
      if (room) material.userData.room = room;
      const uniforms = {};
      material.onBeforeCompile({ uniforms });
      return uniforms.shaftWrap;
    };

    // the same object, not an equal one — that is the whole mechanism by which
    // one assignment reaches every material in a room without recompiling any
    expect(bind('shaft')).toBe(wrapUniforms.shaft);
    expect(bind('shaft')).toBe(wrapUniforms.shaft);
    expect(bind('landing')).toBe(wrapUniforms.landing);

    // and the two rooms are genuinely two, which is the point of the split
    expect(wrapUniforms.shaft).not.toBe(wrapUniforms.landing);
  });

  // The failure this guards against is silent and specific: a mesh that `Room`
  // never reached compiles with no room at all. Sending it to the landing would
  // over-light it in the one place that shows; the shaft is the dim room and the
  // safe default.
  it('treats an untagged material as the shaft', () => {
    installSoftLight();
    const uniforms = {};
    new MeshStandardMaterial().onBeforeCompile({ uniforms });
    expect(uniforms.shaftWrap).toBe(wrapUniforms.shaft);
    expect(wrapUniforms.shaft.value).toBe(LIGHT_WRAP);
  });

  it('can be installed twice without patching twice', () => {
    installSoftLight();
    const once = ShaderChunk.lights_physical_pars_fragment;
    installSoftLight();
    expect(ShaderChunk.lights_physical_pars_fragment).toBe(once);
  });
});
