import { useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { LinearToneMapping } from 'three';
import { cameraProps } from './camera.js';
import { TONE_CURVES, roomLight, useLightTuning } from './tuning.js';
import { installSoftLight, wrapUniforms } from './softLight.js';
import { installRoomTone, toneUniforms } from './roomTone.js';
import { registerCanvas } from './frames.js';
import { DEBUG_PANEL } from '../../effects/quality.js';

// Both before anything can compile a material. `softLight` gives the fittings a
// soft terminator — without it they sit in the plane of nearly everything they
// light and reach none of it — and `roomTone` moves the tone curve out of the
// renderer and into each material, which is what lets the two rooms be graded
// apart at all.
installSoftLight();
installRoomTone();

// One of the scene's two WebGL layers. Two, and not one, because the decks are
// *inside* this scene rather than laid over it: they sit on the landing, behind
// the doors and in front of the far wall. A single canvas would have to bring
// that HTML into WebGL to keep the order right, and every way of doing that
// costs the text its sharpness, its links or its selectability. Two canvases
// with the DOM sandwiched between them cost nothing but a second context.
//
// Both are handed the same camera, from the same function, so "the same camera"
// is a fact about the code rather than a thing to check on screen.

/**
 * Keeps the camera on the viewport, and — the part that matters — keeps it
 * pointing straight down -z.
 *
 * R3F aims its default camera at the world origin unless it is told not to.
 * That is a sensible default for a scene modelled around zero and exactly wrong
 * for this one: the model is in screen pixels, so the origin is the *top-left
 * corner of the viewport*, and a camera at (vw/2, -vh/2, 1400) told to look at
 * it comes out yawed thirty-five degrees. Everything then lands somewhere
 * plausible-but-wrong, which is the worst kind of wrong — the walls still
 * converge, the frame is still rectangular, and only the odd hard-edged wedge of
 * geometry showing where no geometry should be says anything is amiss.
 *
 * So the rotation is set here explicitly rather than left to a default, and the
 * Canvas below asks for `manual` on top of that, which stops R3F adjusting the
 * projection behind this rig's back.
 */
function CameraRig({ vw, vh }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const c = cameraProps(vw, vh);
    camera.fov = c.fov;
    camera.aspect = c.aspect;
    camera.near = c.near;
    camera.far = c.far;
    camera.position.set(...c.position);
    camera.rotation.set(0, 0, 0);
    // the camera is not a light: it sees every room, however the lights are
    // partitioned between them
    camera.layers.enableAll();
    camera.updateProjectionMatrix();
  }, [camera, vw, vh]);
  return null;
}

/**
 * Every per-room grade and the redraw that a change to the lighting bench needs.
 *
 * Two things here are less obvious than they look.
 *
 * A tone curve is compiled *into* every shader rather than applied after them,
 * which is normally the reason it cannot be per-room — and, once `roomTone` has
 * turned it into a uniform, exactly the reason it can. Nothing below recompiles
 * anything; it writes numbers the renderer uploads on the next draw.
 *
 * And the canvas is `frameloop="demand"` at rest, which is the whole reason the
 * scene is cheap when nobody is riding. It also means nothing redraws when a
 * slider moves unless something says so. `invalidate()` on every tuning change
 * is that; it is the difference between a bench and a bench you have to nudge
 * the lift to see the results of.
 */
function Output() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const tuning = useLightTuning();

  // This canvas joins the scene, so anything that asks the *scene* for a frame
  // wakes it too. Both canvases are on demand at rest and R3F's `invalidate`
  // reaches only its own; see `frames.js` for what that cost.
  useLayoutEffect(() => registerCanvas(invalidate), [invalidate]);

  // The renderer is held on one arbitrary non-`NoToneMapping` value and left
  // there. It is not the curve any more — `roomTone` replaced the dispatcher
  // three compiles in — but it is still the switch that decides whether three
  // emits `#define TONE_MAPPING` and includes the chunk at all. Turn it off and
  // the patched code is not in the shader to be reached.
  useLayoutEffect(() => {
    gl.toneMapping = LinearToneMapping;
    invalidate();
  }, [gl, invalidate]);

  // Every per-room grade and the wrap, all of them uniforms shared by the
  // materials of one room: pushed rather than passed, so nothing re-renders and
  // nothing recompiles. That is what lets them be dragged rather than stepped —
  // and, for the curve, what lets it be per-room at all, since a curve chosen at
  // compile time would need a program per room and three's cache is keyed on
  // material state rather than on which room asked.
  useLayoutEffect(() => {
    for (const room of ['shaft', 'landing']) {
      const { toneCurve, exposure, wrap } = roomLight(tuning, room);
      toneUniforms[room].curve.value = TONE_CURVES[toneCurve] ?? TONE_CURVES.none;
      toneUniforms[room].exposure.value = exposure;
      wrapUniforms[room].value = wrap;
    }
    invalidate();
  }, [invalidate, tuning]);

  return null;
}

// A WebGL scene has no DOM to inspect: nothing in devtools' elements panel says
// where a mesh ended up or how many lights are in the graph, and both of those
// are things this migration has to be able to answer — the second one is an
// acceptance criterion. So on a debug build each canvas publishes its own state
// under `window.__scenes`, which is enough for the console, a screenshot
// harness, or a test to ask.
function SceneProbe({ name }) {
  const state = useThree();
  useLayoutEffect(() => {
    if (!DEBUG_PANEL || typeof window === 'undefined') return undefined;
    const all = (window.__scenes ??= {});
    all[name] = state;
    return () => { delete all[name]; };
  }, [name, state]);
  return null;
}

/**
 * @param {{
 *   vw: number, vh: number, zIndex: number, name: string,
 *   dprCeiling?: number, onLost?: () => void, children: React.ReactNode,
 * }} props
 */
function SceneCanvas({ vw, vh, zIndex, name, dprCeiling = 2, moving = false, onLost, children }) {
  // A WebGL context can be taken away at any moment — a driver reset, the tab
  // backgrounded for long enough, too many contexts open across tabs. The
  // browser fires an event and then simply stops drawing, so a scene that does
  // not listen for it does not crash; it silently goes blank, which is worse.
  // Here it hands the frame back to the CSS backend, which needs no context at
  // all.
  const handleCreated = ({ gl }) => {
    // per-material clipping planes: this backend's `overflow: hidden`, and the
    // only way a door leaf can slide out of its opening and stop existing
    gl.localClippingEnabled = true;
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      onLost?.();
    });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex, pointerEvents: 'none' }}>
      <Canvas
        onCreated={handleCreated}
        // No `flat` and no reliance on R3F's default either: the tone curve is
        // owned by `Output` below, because it is a thing to be dialled against
        // the lights rather than a constant to inherit. It was `flat` —
        // NoToneMapping — which is defensible for authored colours and wrong for
        // real sources: a point light near a wall goes well past 1, and with no
        // curve it clips to white and takes the hue with it.
        // On demand at rest, on every frame while the lift moves.
        //
        // At rest the scene is a still picture — the cage rides with us, so
        // nothing in frame moves between trips — and redrawing it sixty times a
        // second is two WebGL contexts holding a fan open for nothing.
        //
        // During a ride it has to be a real loop. `invalidate()` schedules a
        // frame, so the canvas lands one behind the DOM decks, which move
        // synchronously on the same tick; a WebGL frame and a CSS frame apart
        // shows up as the doorway sliding against the text it frames.
        frameloop={moving ? 'always' : 'demand'}
        // The ceiling, not the device's own ratio. A retina laptop asks for four
        // times the pixels of a 1x screen for a scene whose whole subject is a
        // dark corridor, and the quality budget can pull this down further on a
        // machine that has already shown it cannot afford the motion blur.
        dpr={[1, dprCeiling]}
        gl={{ antialias: true, alpha: true }}
        // `manual` hands the camera to `CameraRig` outright; `rotation` is here
        // as well as in the rig because R3F decides whether to aim the camera at
        // the origin at *creation*, before any effect has run.
        camera={{ ...cameraProps(vw, vh), rotation: [0, 0, 0], manual: true }}
        style={{ pointerEvents: 'none' }}
        // `percentage`, not `soft`, and that is a bug fix rather than a
        // downgrade: `soft` asks for `PCFSoftShadowMap`, which three deprecated
        // and now silently rewrites to `PCFShadowMap` — inside its own shadow
        // pass, *every time it runs*, with a `console.warn` each time. R3F
        // re-applies the requested type whenever this Canvas re-renders, which
        // during a ride is every frame, so the two sat there arguing: measured
        // at 74 rewrites per trip. Nothing was ever drawn softly for it.
        //
        // Asking for what was actually being used ends the argument, and the
        // picture is identical to the pixel. The soft edge in this scene comes
        // from `shadow.radius` in `SceneLights` — three's point-light PCF path
        // blurs a five-tap disk by it at flat cost — and never came from here.
        shadows="percentage"
      >
        <CameraRig vw={vw} vh={vh} />
        <Output />
        <SceneProbe name={name} />
        {children}
      </Canvas>
    </div>
  );
}

export default SceneCanvas;
