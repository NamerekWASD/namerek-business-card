import { useLayoutEffect, useMemo, useRef } from 'react';
import { Object3D } from 'three';
import { SURFACES } from '../../model/materials.js';
import { surfaceProps } from './surfaceMaterial.js';
import { worldY } from './camera.js';

// A rivet seam running the height of a shaft wall.
//
// Instanced, and this is the case where instanced geometry beats a painted
// pattern — the opposite call to the one made for the scissor gate. A rivet is a
// small domed thing whose whole job is to catch the one light in the shaft as it
// passes; painted on, it would be a dot that stays the same brightness while the
// wall around it changes, which is worse than no rivet. Two hundred of them cost
// one draw call.
//
// Offsetting the seam modulo its pitch makes it endless: the wall can travel any
// distance and the row never runs out or visibly restarts.
const dummy = new Object3D();

/**
 * @param {{ x: number, z: number, span: number, top: number, pitch?: number, radius?: number }} props
 */
function Rivets({ x, z, span, top, pitch = 46, radius = 4 }) {
  const count = Math.ceil(span / pitch) + 2;
  const ref = useRef(null);
  const iron = useMemo(() => surfaceProps(SURFACES.iron, 1.15), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      dummy.position.set(0, worldY(top + i * pitch), 0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, pitch, top]);

  return (
    <group position={[x, 0, z]}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[radius, 8, 6]} />
        <meshStandardMaterial {...iron} />
      </instancedMesh>
    </group>
  );
}

export default Rivets;
