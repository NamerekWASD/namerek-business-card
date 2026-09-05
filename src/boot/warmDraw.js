// The half of the boot the compile never covered: getting the *data* onto the
// card, not just the programs.
//
// `compileAsync` walks the whole graph and links a program for every material
// it finds, which is why the first frame of the shaft is cheap. A draw needs
// two more things from every object it touches, and neither is a program: the
// geometry's buffers, uploaded on the first `renderBufferDirect` that asks for
// them, and each texture's storage, uploaded on the first material that binds
// it. Both are paid by whoever draws the object first.
//
// `warm` was supposed to make that whoever be the boot screen — every landing
// shown, every fitting placed, one frame drawn behind the black rectangle. It
// did not work, and the reason is that `visible` is not the only gate an object
// passes on its way into a frame. The other is the frustum. The landings sit at
// their own floors, a screenful apart; from the ground floor's camera the other
// three are metres off the top and bottom of the frame, so `projectObject`
// dropped them on the exact test `frustumCulled` exists for. Measured on
// 2026-09-03: 519 geometries registered through the whole boot, 741 after
// riding all four floors — 222 that the warm frame never touched, arriving 72
// and 101 at a time on the frame each floor's doors first parted, alongside the
// depth programs that `compile()` does not cover either. 169 ms on 1. OG and
// 320 ms on 2. OG, once per floor per load, exactly as reported.
//
// So the warm-up asks for the one thing the frustum test cannot refuse: it is
// turned off for the length of a single draw. Off-screen geometry rasterises to
// nothing, so the frame costs its uploads and almost none of its fill — and it
// is a frame nobody sees, under the boot screen, which is what that screen is
// for.

/**
 * One draw that reaches everything visible, culled or not.
 *
 * @param {{ render: (scene: unknown, camera: unknown) => void }} gl
 * @param {{ traverse: (fn: (o: any) => void) => void }} scene
 * @param {unknown} camera
 */
export function warmDraw(gl, scene, camera) {
  /** @type {any[]} */
  const forced = [];
  scene.traverse((o) => {
    if (o.frustumCulled) {
      o.frustumCulled = false;
      forced.push(o);
    }
  });
  try {
    gl.render(scene, camera);
  } catch {
    // A driver that will not draw this frame is a reason to open the doors
    // anyway. The cost comes back a floor at a time, which is where it was.
  } finally {
    // Restored before anything else can draw: a scene left uncullable pays for
    // three landings nobody is looking at on every frame of every ride.
    for (const o of forced) o.frustumCulled = true;
  }
}

export default warmDraw;
