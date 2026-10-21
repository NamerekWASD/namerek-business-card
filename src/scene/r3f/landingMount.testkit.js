// What lets react-dom mount `LandingProps` under jsdom: every DOM node is lent
// the `Object3D` members the props' rigs touch through their refs. Shared by
// the tests that mount it — `landingKeys.test.jsx` says why it is shaped so.

import { InstancedBufferAttribute, Object3D } from 'three';

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

/** Lend every DOM element the `Object3D` members the landing props touch. */
export function lendObject3D() {
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
}
