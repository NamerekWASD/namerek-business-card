import useSurfaceMaterial from './useSurfaceMaterial.js';
import { worldY } from './camera.js';

const RAD = Math.PI / 180;

// Rotations are stated in CSS degrees, because every one of them is ported from
// a CSS transform and the port should be checkable by eye against the file it
// came from. `yaw` carries over unchanged — a rotation about y is written the
// same way in both systems. `pitch` does not: y points the other way here, so a
// CSS `rotateX(-90deg)` is a three.js `+90°`. That sign is the single most
// likely thing to get quietly wrong in this whole backend, so it is applied
// here, once, and nowhere else.
const rotationOf = (yaw, pitch) => /** @type {[number, number, number]} */ ([-pitch * RAD, yaw * RAD, 0]);

/**
 * A flat rectangle in scene coordinates. `left`/`top` locate the corner the
 * rotation turns about, measured the CSS way; `hinge` says which corner that is,
 * mirroring the `transformOrigin` of the element this was ported from:
 *
 * - `left` — the plane runs right from a vertical axis (the left corridor wall)
 * - `right` — it runs left from one (the right wall)
 * - `top` — it runs down from a horizontal axis (a reveal, hinged at its head)
 *
 * A rotation about a vertical axis does not care where on that axis the pivot
 * sits, and one about a horizontal axis does not care where along it — so these
 * three cases cover every plane in the shaft.
 */
export function Panel({
  surface, left, top, w, h, z = 0, yaw = 0, pitch = 0, shade = 1, hinge = 'left',
}) {
  const material = useSurfaceMaterial(surface, w, h, shade);
  const dx = hinge === 'right' ? -w / 2 : w / 2;

  return (
    <group position={[left, worldY(top), z]} rotation={rotationOf(yaw, pitch)}>
      <mesh position={[dx, -h / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial key={material.map ? 'grained' : 'flat'} {...material} />
      </mesh>
    </group>
  );
}

/**
 * A box, in the same coordinates, with its front face at `z + d` and its back at
 * `z` — the way the CSS `Solid` builds one.
 *
 * The CSS backend gives each face its own hand-computed shade because it has no
 * lights. Here the faces share one material and the lights are what makes them
 * disagree, which is most of the point of the migration.
 *
 * `children`/`extras` from the CSS `Solid` are deliberately absent: a DOM decal
 * cannot be a child of a mesh. A caller with artwork of its own to put on a
 * front face builds its own plate for it — see `DoorLeaf` in `NearScene`, which
 * is the only one so far and needs its own material anyway.
 */
export function Box({ surface, left, top, w, h, d, z = 0, yaw = 0, shade = 1, clip }) {
  const material = useSurfaceMaterial(surface, w, h, shade);
  const rad = yaw * RAD;
  return (
    // stood off by the same amount the CSS backend stands it off, so a turned
    // box does not sink its far corner into the wall behind it
    <group position={[left, worldY(top), z + w * Math.abs(Math.sin(rad))]} rotation={[0, rad, 0]}>
      <mesh position={[w / 2, -h / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {/* `clip` is this backend's `overflow: hidden` — the door leaves slide
            out of their opening and have to stop existing past the point
            anything still hides them, exactly as the CSS leaves are clipped by
            the frame they sit in. */}
        <meshStandardMaterial
          key={material.map ? 'grained' : 'flat'}
          {...material}
          clippingPlanes={clip ?? null}
        />
      </mesh>
    </group>
  );
}
