import { DoubleSide } from 'three';
import { PENDANT_GUARD, PENDANT_SCALE, PENDANT_SHADE_R } from '../model/geometry.js';
import { worldY } from '../renderers/r3f/camera.js';

/**
 * The pendant's dome and the wire guard under it — the two parts of the fixture
 * that stand between the source and the room, and therefore the two that decide
 * what it lays on a floor.
 *
 * ── why this is its own file ─────────────────────────────────────────────────
 * The scene is drawn by two canvases. The landing and its fixtures are in the
 * far one; the cage we ride in is in the near one. Both hold a light at
 * `pendantAt`, because the cage stands in an open doorway and is genuinely lit
 * by the corridor — but only the far canvas held the *lamp*, so only the far
 * canvas had anything for that light to shine through.
 *
 * That is the whole of NBC-74's second reference. On the landing floor the
 * guard throws what a caged pendant throws: a ring, and eight bars running out
 * of it. Cross the threshold and the same light arrives with nothing in front
 * of it, so the lift floor took a flat wash and read as an unlit box standing
 * in front of a lit room. The red marker on that reference runs along the
 * bars, out of the doorway and forward across the floor — the shadow carrying
 * on, which is exactly what a shadow does.
 *
 * `guardCrossing` in `geometry.js` states the claim as arithmetic, and
 * `pendantGuard.test.js` holds it: from the lamp, every point of the lift floor
 * is seen through the wall of the basket.
 *
 * ── shadowOnly ───────────────────────────────────────────────────────────────
 * The near canvas wants the fixture's shadow and not a second copy of the
 * fixture, which would draw over the real one at a slightly different tone.
 * `colorWrite` and `depthWrite` both off is three's own way of saying that: the
 * shadow pass draws its own depth material and never looks at either flag, so
 * the mesh casts exactly as it would and contributes nothing to the picture.
 * `visible={false}` is not the same thing and would not do — the renderer skips
 * a hidden subtree in the shadow pass too.
 *
 * @param {{
 *   cast?: Record<string, unknown>, steel?: Record<string, unknown>,
 *   shadowOnly?: boolean,
 * }} props
 */
function PendantCage({ cast, steel, shadowOnly = false }) {
  const {
    top, bot, rTop, rBot, bars, bar, ring,
  } = PENDANT_GUARD;
  // each upright leans by its own taper — the basket is a barrel, not a tube
  const lean = Math.atan2(rTop - rBot, bot - top);
  const barLen = Math.hypot(bot - top, rTop - rBot);

  // One element apiece, reused across the meshes below: a React element is a
  // description rather than an instance, and R3F builds a material per mesh
  // from it. Declared here rather than as a nested component, which would be a
  // fresh type on every render and so a fresh material — and a new material is
  // a new shader program.
  const hidden = <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />;
  const domeSkin = shadowOnly ? hidden : <meshStandardMaterial {...cast} side={DoubleSide} />;
  const steelSkin = shadowOnly ? hidden : <meshStandardMaterial {...steel} />;
  const take = !shadowOnly;

  return (
    <group scale={PENDANT_SCALE}>
      {/* the dome, and its lip — a shade with no rim reads as a paper cone.
          The rim sits at the guard's own top ring rather than above it: the
          shade has to reach down far enough to nest the guard inside it, or
          the two read as separate fixtures with the wall showing through the
          gap between them. */}
      <mesh position={[0, worldY(2), 0]} castShadow receiveShadow={take}>
        <sphereGeometry args={[PENDANT_SHADE_R, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {domeSkin}
      </mesh>
      <mesh position={[0, worldY(4), 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow={take}>
        <torusGeometry args={[PENDANT_SHADE_R * 0.99, 3, 6, 28]} />
        {steelSkin}
      </mesh>

      {/* and the guard over the bulb — the fitting's whole signature, dark
          uprights against a bright bulb, and the bars they throw across
          everything the lamp reaches */}
      {Array.from({ length: bars }).map((_, i) => (
        <group key={i} rotation={[0, (i / bars) * Math.PI * 2, 0]}>
          <mesh
            position={[0, worldY((top + bot) / 2), (rTop + rBot) / 2]}
            rotation={[lean, 0, 0]}
            castShadow
            receiveShadow={take}
          >
            <boxGeometry args={[bar, barLen, bar]} />
            {steelSkin}
          </mesh>
        </group>
      ))}

      {/* The two rings of the guard — and only the lower one casts.
          That is a measurement rather than a preference. The source stands
          at the fitting's own centre, so the *upper* ring is barely two
          pixels below it and its shadow projects to something the size of
          the corridor; the lower one is thirty-odd below and throws a ring
          on the floor about the width of the pool, which is what a caged
          pendant actually lays down and what NBC-74's second reference
          circles in red. */}
      {[[top, rTop], [bot, rBot]].map(([v, r]) => (
        <mesh
          key={v}
          position={[0, worldY(v), 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow={v === bot}
          receiveShadow={take}
        >
          <torusGeometry args={[r, ring, 6, 20]} />
          {steelSkin}
        </mesh>
      ))}
    </group>
  );
}

export default PendantCage;
