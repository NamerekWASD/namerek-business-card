import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { warmDraw } from './warmDraw.js';

// The job the old barrier never had: waiting for the renderer to compile.
//
// A `MeshStandardMaterial` becomes a GPU program the first time something tries
// to draw it, and this scene has a few dozen distinct ones across two contexts.
// Left to itself the renderer does that work spread over the first several
// frames — which is precisely the "every texture loads separately" the boot
// screen exists to stop. `compileAsync` forces the whole set up front, off the
// main thread where the driver supports it, and hands back a promise: the first
// thing in this project that can honestly say the scene is *ready* rather than
// merely downloaded.
//
// One of these goes in each canvas, last, so its effect runs after the scene
// graph its siblings build has been committed.

/**
 * @param {{ name: string, onSettle: (name: string) => void, again?: boolean }} props
 */
export default function CanvasBoot({ name, onSettle, again = false }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let live = true;
    const done = () => {
      if (!live) return;
      // Compiled is not uploaded. One draw with the frustum test off puts every
      // geometry's buffers and every texture's storage on the card while the
      // black rectangle is still up — including the three landings the camera
      // cannot see from here, which is the whole reason `warm` was not enough
      // on its own. See `warmDraw`.
      warmDraw(gl, scene, camera);
      // The canvas is `frameloop="demand"`: compiling a program does not draw
      // with it, and a scene that is compiled but never drawn still shows its
      // first frame late. Ask for the draw, then let it land — two frames,
      // because the request is served on the next one and the upload lands on
      // the one after.
      invalidate();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (live) onSettle(name);
      }));
    };

    const pending = gl.compileAsync?.(scene, camera);
    if (pending && typeof pending.then === 'function') {
      // Settled either way. A driver that refuses to compile something is a
      // reason to show the scene anyway, not a reason to hold a black screen
      // over it forever.
      pending.then(done, done);
    } else {
      // Older three, or a stub in a test: the synchronous path still front-loads
      // the work, it just blocks to do it.
      try { gl.compile?.(scene, camera); } catch { /* nothing to compile */ }
      done();
    }
    return () => { live = false; };
  }, [gl, scene, camera, invalidate, name, onSettle]);

  // And once more at the end of the wait, which is a different moment and
  // catches a different thing. The draw above happens the instant this canvas
  // has compiled — before the other four jobs have necessarily reported, before
  // the shared bakes have landed on the materials that wear them, and before
  // every prop's own effect has had its first commit. Anything that arrives
  // after it is a program linked on the frame it is first *seen*, which on this
  // scene means the frame a floor's doors part. Measured on 2026-09-03: two
  // programs, 79 ms and 186 ms, on the first EG → 2. UG trip and never again.
  //
  // `again` is the boot's spin — every job in, the gears freewheeling, the black
  // rectangle still up and `warm` still holding every landing visible. It is the
  // last moment at which this is free.
  useEffect(() => {
    if (!again) return;
    warmDraw(gl, scene, camera);
    invalidate();
  }, [again, gl, scene, camera, invalidate]);

  return null;
}
