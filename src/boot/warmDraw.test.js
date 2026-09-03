import { describe, expect, it, vi } from 'vitest';
import { warmDraw } from './warmDraw.js';

// A stand-in for the part of a scene graph this touches: something to traverse
// and a `frustumCulled` flag per node.
function fakeScene(nodes) {
  return {
    traverse(fn) {
      fn(this);
      for (const n of nodes) fn(n);
    },
  };
}

describe('the warm draw', () => {
  it('draws once with every culled object forced into the frame', () => {
    const near = { isMesh: true, frustumCulled: true };
    const far = { isMesh: true, frustumCulled: true };
    const scene = fakeScene([near, far]);
    const seen = [];
    const gl = { render: vi.fn(() => seen.push([near.frustumCulled, far.frustumCulled])) };

    warmDraw(gl, scene, {});

    expect(gl.render).toHaveBeenCalledTimes(1);
    // The whole point: an object the camera cannot see still has its buffers
    // uploaded and its depth program linked, because the draw reaches it.
    expect(seen).toEqual([[false, false]]);
  });

  it('puts the culling back, so the frames after it cost what they did before', () => {
    const mesh = { isMesh: true, frustumCulled: true };
    const scene = fakeScene([mesh]);
    warmDraw({ render: () => {} }, scene, {});
    expect(mesh.frustumCulled).toBe(true);
  });

  it('leaves an object that was never culled alone', () => {
    const always = { isMesh: true, frustumCulled: false };
    const scene = fakeScene([always]);
    warmDraw({ render: () => {} }, scene, {});
    expect(always.frustumCulled).toBe(false);
  });

  it('puts the culling back even if the draw throws', () => {
    const mesh = { isMesh: true, frustumCulled: true };
    const scene = fakeScene([mesh]);
    const gl = { render: () => { throw new Error('context lost'); } };
    expect(() => warmDraw(gl, scene, {})).not.toThrow();
    expect(mesh.frustumCulled).toBe(true);
  });
});
