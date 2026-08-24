import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderChunk, SpriteMaterial } from 'three';
import { installSoftLight } from './softLight.js';
import { TONE_CURVE_IDS, installRoomTone, toneUniforms } from './roomTone.js';

// Same reasoning as `softLight.test.js`: this is a string replacement against
// somebody else's shader, and a replacement that stops matching fails silently.
// The scene would keep rendering, graded by whatever the renderer happens to be
// set to, with both rooms quietly sharing a curve again — which is the exact
// thing this file was written to make impossible.

describe('the per-room tone patch', () => {
  it('applies to the installed three', () => {
    expect(installRoomTone()).toBe(true);
    const pars = ShaderChunk.tonemapping_pars_fragment;
    expect(pars).toContain('uniform int roomToneCurve;');
    // the one line that redirects all six of three's own curve functions
    expect(pars).toContain('#define toneMappingExposure roomExposure');
    expect(pars).toContain('vec3 roomToneMapping( vec3 color )');
    // and the call site actually reaches the dispatcher
    expect(ShaderChunk.tonemapping_fragment).toContain('roomToneMapping( gl_FragColor.rgb )');
  });

  it('branches over every curve the panel offers', () => {
    installRoomTone();
    const pars = ShaderChunk.tonemapping_pars_fragment;
    for (const [name, id] of Object.entries(TONE_CURVE_IDS)) {
      if (name === 'none') continue;
      expect(pars, name).toContain(`roomToneCurve == ${id}`);
    }
  });

  // The chroma stage runs *after* the curve and clamps at zero. Both are load
  // bearing and neither shows up as a wrong colour: put it before the curve and
  // the curve simply takes the saturation off again, and drop the clamp and a
  // chroma over 1 drives channels negative into the sRGB encode's `pow()`,
  // which returns NaN — scattered black pixels that read as anything but a
  // saturation setting.
  it('restores chroma after the curve, clamped', () => {
    installRoomTone();
    const pars = ShaderChunk.tonemapping_pars_fragment;
    expect(pars).toContain('uniform float roomChroma;');
    expect(pars).toContain('vec3 mapped = roomToneCurveOf( color );');
    expect(pars).toContain('max( vec3( 0.0 ), mix( vec3( grey ), mapped, roomChroma ) )');
  });

  it('binds each room to its own grade, lit and unlit alike', () => {
    installSoftLight();
    installRoomTone();
    const bind = (Material, room) => {
      const material = new Material();
      material.userData.room = room;
      const uniforms = {};
      material.onBeforeCompile({ uniforms });
      return uniforms;
    };
    for (const Material of [MeshStandardMaterial, SpriteMaterial]) {
      const shaft = bind(Material, 'shaft');
      const landing = bind(Material, 'landing');
      expect(shaft.roomToneCurve).toBe(toneUniforms.shaft.curve);
      expect(shaft.roomExposure).toBe(toneUniforms.shaft.exposure);
      expect(shaft.roomChroma).toBe(toneUniforms.shaft.chroma);
      expect(landing.roomToneCurve).toBe(toneUniforms.landing.curve);
      expect(landing.roomChroma).not.toBe(toneUniforms.shaft.chroma);
      // the whole point: the two rooms hold different objects, so writing one
      // cannot move the other
      expect(landing.roomExposure).not.toBe(toneUniforms.shaft.exposure);
    }
  });
});
