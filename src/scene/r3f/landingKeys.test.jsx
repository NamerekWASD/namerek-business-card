// @vitest-environment jsdom
//
// ── a key built out of a coordinate is a key that can collapse ───────────────
// Several props in `LandingProps` used to key a row of children on the
// position each one sits at — `key={`${rx},${ry}`}`. That is unique only for
// as long as the numbers are, and every number in this file is the room's
// metre times something: `M = pxPerM(vh)`. Give the room a zero height and the
// whole set goes to `0`, four children in one array answer to the same key,
// and React's own warning says what happens next — children may be duplicated
// or dropped. In a room full of rivets a missing one is silent.
//
// So this mounts the props and fails on React's duplicate-key error. It mounts
// them twice: once in a room of a believable height, and once in a room of no
// height at all — the second is the case that actually caught it, and it is
// also the honest statement of the invariant, which is that a key is a name
// for a child and must not be a measurement.
//
// `LandingProps` reaches for no R3F hook, so react-dom can mount it: `<mesh>`
// and friends land as unknown elements, which React complains about and which
// is nothing to do with what is being asserted here. Only the duplicate-key
// error is read; everything else on the console is let through.
//
// What react-dom does not do is put a `Object3D` behind a `ref`, and the props'
// layout effects drive their rigs through exactly those — `.position.y`, a
// `setMatrixAt` on an instanced mesh, a `traverse` over a subtree. So the DOM
// node is lent the handful of members they touch, off a real `Object3D` so the
// arithmetic they do on it is the arithmetic they would do in the scene. It
// draws nothing and proves nothing about the picture; it only gets the mount
// past commit so the render that precedes it can be judged.

import { captureOwnerStack } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { InstancedBufferAttribute, Object3D } from 'three';
import LandingProps from './LandingProps.jsx';
import { DECKS } from '../../lift/decks.js';

/** The three.js side of a node, made once and kept on it. */
function proxyFor(node) {
  if (!node.__three) {
    const o = new Object3D();
    o.instanceMatrix = new InstancedBufferAttribute(new Float32Array(16 * 64), 16);
    o.setMatrixAt = () => {};
    o.material = { opacity: 1, color: { set: () => {} }, uniforms: {} };
    o.count = 0;
    node.__three = o;
  }
  return node.__three;
}

beforeAll(() => {
  for (const key of [
    'position', 'rotation', 'scale', 'visible', 'instanceMatrix', 'setMatrixAt',
    'material', 'geometry', 'count', 'traverse', 'updateWorldMatrix', 'matrixWorld',
    'getWorldPosition', 'quaternion', 'renderOrder', 'userData',
  ]) {
    Object.defineProperty(Element.prototype, key, {
      configurable: true,
      get() {
        const three = proxyFor(this);
        const member = three[key];
        // A method read off the node still has to run against the `Object3D`:
        // three walks `this.parent` and the node has none.
        return typeof member === 'function' ? member.bind(three) : member;
      },
      set(v) { proxyFor(this)[key] = v; },
    });
  }
});

beforeEach(() => {
  // jsdom has no 2d context, so every painted surface comes back null and the
  // props fall through to their flat colours. That is fine — nothing here
  // looks at a texture.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** React's duplicate-key complaints raised while mounting every landing. */
function duplicateKeys(vh) {
  const seen = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    const text = String(args[0] ?? '');
    // `captureOwnerStack` is the only thing that says *which* row collapsed:
    // React 19 no longer appends a component stack to this warning, and the JS
    // stack under it is all reconciler.
    if (text.includes('same key')) seen.push(`${args[1]}${captureOwnerStack() ?? ''}`);
  });
  for (let idx = 0; idx < DECKS.length; idx += 1) {
    render(<LandingProps idx={idx} vw={vh * 1.8} vh={vh} top={0} live />);
    cleanup();
  }
  spy.mockRestore();
  return seen;
}

describe('the landing props name their children', () => {
  it('gives every child of a row its own key in a room of the usual height', () => {
    expect(duplicateKeys(900)).toEqual([]);
  });

  it('still does so when the room measures nothing, which is when a coordinate key collapses', () => {
    expect(duplicateKeys(0)).toEqual([]);
  });
});
