import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, ShaderChunk } from 'three';
import { installRoomLights, lightMasks, syncLightMasks } from './roomLights.js';
import { installSoftLight } from './softLight.js';
import { lightRig, maxLights, seatRoom } from './lighting.js';
import { lampsAt } from '../../model/lighting.js';

// The same argument `softLight.test.js` makes, and one more on top of it.
//
// The patch is a string replacement against somebody else's shader, and the
// failure mode of a string replacement is silence — three renames a local,
// nothing throws, and the scene goes back to lighting both rooms from every
// lamp. That was the state of this scene for months: the layer everything read
// as "the wall" is tested against the camera rather than against the receiver,
// so it never kept a lamp anywhere. A partition that silently stops partitioning
// is exactly the bug NBC-74 is about, so it is worth a test that fails loudly.

describe('the room light mask', () => {
  it('applies to the installed three, in both halves', () => {
    installRoomLights();
    // the declaration, at file scope and behind three's own guard: a material
    // compiled with no point lights would otherwise be handed `float x[ 0 ]`
    expect(ShaderChunk.lights_pars_begin).toContain('uniform float roomLightMask[ NUM_POINT_LIGHTS ];');
    expect(ShaderChunk.lights_pars_begin).toContain('#if NUM_POINT_LIGHTS > 0');
    // and the multiply, in the loop body, after the light has been computed
    expect(ShaderChunk.lights_fragment_begin).toContain('directLight.color *= roomLightMask[ i ];');
  });

  it('indexes the mask the way three unrolls the loop', () => {
    installRoomLights();
    // `loopReplacer` rewrites `[ i ]` to a literal index inside an unrolled
    // loop — spacing included. Written any other way (`[i]`, `[ idx ]`) the
    // shader keeps a dynamic index, which is legal and therefore silent, and
    // every light reads seat zero's bit.
    expect(ShaderChunk.lights_fragment_begin).toMatch(/roomLightMask\[\s*i\s*\]/);
  });

  it('gives each room the seats the rig gives it', () => {
    const rig = lightRig({
      vw: 1600, vh: 900, lamps: lampsAt(1600, 900, 0, 700), floorPitch: 700, deckTop: 200, closure: 0,
    });
    syncLightMasks(rig.map((spec) => spec.kind));

    expect(lightMasks.shaft.value.length).toBe(rig.length);
    for (const [index, spec] of rig.entries()) {
      // the mask and the seat's own room, from the two sides they are written
      // from — `SceneLights` writes the light from `spec.kind` and the mask
      // from the same array, and `seatRoom` is what `castShadow` reads
      expect(seatRoom(index)).toBe(spec.kind);
      expect(lightMasks[spec.kind].value[index]).toBe(1);
      expect(lightMasks[spec.kind === 'shaft' ? 'landing' : 'shaft'].value[index]).toBe(0);
      // a doorway sees both sides of itself
      expect(lightMasks.both.value[index]).toBe(1);
    }
    // every seat is claimed by exactly one room, and there are as many as the
    // rig always has
    expect(rig.length).toBe(maxLights());
  });

  it('resizes when the rig does, in place', () => {
    syncLightMasks(['shaft', 'landing']);
    const held = lightMasks.shaft;
    syncLightMasks(['shaft', 'shaft', 'shaft', 'landing']);
    // the *slot* survives so bound materials keep pointing at it — only the
    // array inside it is replaced, which is what the renderer uploads
    expect(held).toBe(lightMasks.shaft);
    expect(lightMasks.shaft.value.length).toBe(4);
    expect([...lightMasks.shaft.value]).toEqual([1, 1, 1, 0]);
    expect([...lightMasks.landing.value]).toEqual([0, 0, 0, 1]);
  });

  it('binds a material to the shared mask for the rooms it can see', () => {
    installSoftLight();
    installRoomLights();
    const bind = (room, lit) => {
      const material = new MeshStandardMaterial();
      if (room) material.userData.room = room;
      if (lit) material.userData.lit = lit;
      const uniforms = {};
      material.onBeforeCompile({ uniforms });
      return uniforms.roomLightMask;
    };

    // the same object, not an equal one: that is how one `syncLightMasks` on a
    // ride frame reaches every material already compiled, with no recompile
    expect(bind('landing', 'landing')).toBe(lightMasks.landing);
    expect(bind('shaft', 'shaft')).toBe(lightMasks.shaft);
    // `lit` is what is read, not `room` — a prop in a doorway lives in one room
    // and is lit by two
    expect(bind('shaft', 'both')).toBe(lightMasks.both);
    // and with no `lit` of its own a surface falls back to its room, then to
    // the shaft: the dim room is the safe thing to be wrong about
    expect(bind('landing', undefined)).toBe(lightMasks.landing);
    expect(bind(undefined, undefined)).toBe(lightMasks.shaft);
  });
});
