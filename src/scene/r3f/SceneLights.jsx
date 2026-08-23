import { useLayoutEffect, useRef } from 'react';
import { worldY } from '../renderers/r3f/camera.js';
import { LAYER_LANDING, LAYER_SHAFT, lightRig } from '../renderers/r3f/lighting.js';

// Every physical source in the scene, and nothing else. This component decides
// nothing: `lightRig` returns the whole rig as data and this maps over it, which
// is what makes the count a property a test can assert instead of a thing a
// reviewer has to count in a scene graph.
//
// Two facts are doing the work here.
//
// The shaft's fittings each own a light and never move. A single light standing
// for the row had to travel as the row passed, and there is no way to travel
// between two fittings that does not read as a jump.
//
// And each light is confined to its own room by a layer — the nearest shaft
// fitting and the landing pendant now cast real shadows too, but the layer is
// what keeps the *light* itself out of the wrong room even where a shadow
// isn't involved: without it the shaft's lamps light the far side of the back
// wall and the landing stops being a room you look into. A light that only
// sees its own room is the wall, stated in the one place it can be stated
// cheaply.
function SceneLights({ vw, vh, lamps, floorPx, deckTop, closure, dim = 1 }) {
  // Spelled out rather than forwarded wholesale. It was forwarded, and the
  // scenes call the floor pitch `floorPx` while the rig calls it `floorPitch` —
  // so the rig read `undefined`, the taper produced `NaN`, and the key light
  // came out with a NaN position and intensity. three.js does not complain
  // about that: it simply contributes nothing.
  const rig = lightRig({ vw, vh, lamps, floorPitch: floorPx, deckTop, closure });
  const lights = useRef([]);

  useLayoutEffect(() => {
    for (const [index, light] of lights.current.entries()) {
      if (!light) continue;
      const layer = rig[index]?.kind === 'landing' ? LAYER_LANDING : LAYER_SHAFT;
      light.layers.set(layer);
      // A point light's own shadow camera does not inherit `layers` from the
      // light it belongs to — it starts on the default layer like any fresh
      // camera — so left alone it would draw the *other* room's geometry into
      // this one's shadow map, right through the wall `Room` otherwise makes
      // opaque to light.
      light.shadow.camera.layers.set(layer);
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.camera.near = 10;
      // Covers the shaft's own depth plus the landing behind it, with room to
      // spare — a point light shadow that comes up short just short of the
      // wall it should be darkening is worse than one that never shipped.
      light.shadow.camera.far = 1800;
      light.shadow.bias = -0.0015;
      // A fitting in this scene is not a pinhole, so its shadow should not
      // read like one either — a hard edge is what a spotlight throws, not a
      // shaded bulb. This is a blur-radius knob rather than a resolution one
      // (three's point-light PCF path samples a five-tap disk scaled by this
      // value, cost is flat regardless of how wide it is set), so it can be
      // generous without costing anything back.
      light.shadow.radius = 14;

      // A dark light still has a shadow map, and three would still redraw its
      // six cube faces every frame for a contribution of exactly nothing. The
      // rig keeps its full complement of sources at all times now — that is
      // what stops the scene recompiling every shader when a door opens, see
      // `landingLight` — so the saving that used to come from removing a light
      // has to come from here instead.
      //
      // `needsUpdate` on the first pass while dark is not belt-and-braces: the
      // cubemap is allocated lazily inside the shadow pass, and six 2048²
      // targets appearing on the frame a door starts to open is the same class
      // of hitch, just at the driver rather than the compiler. One pass while
      // nobody is looking gets them made.
      //
      // Read off the rig rather than off `light.intensity`, which is the rig's
      // figure times `dim`. `dim` is nought for the whole of the boot screen
      // and the first frames of the intro, so gating on it would park every
      // shadow map through exactly the stretch that exists to get this work
      // done unseen — and then unpark them, and compile their depth shaders, on
      // the frames the lamps are striking. This asks the question that was
      // meant: is this fitting switched on, supply or no supply.
      const lit = (rig[index]?.intensity ?? 0) > 0;
      light.shadow.autoUpdate = lit;
      if (!lit && light.shadow.map === null) light.shadow.needsUpdate = true;
    }
  });

  return rig.map((light, index) => (
    <pointLight
      // Keyed by seat, not by fitting — and that is a GPU lifetime decision
      // rather than a React one.
      //
      // The rig is the three nearest fittings plus the room, so riding one
      // floor rotates one fitting out of the row and another in. Keyed by lamp
      // id, that is an unmount and a mount: React throws a `PointLight` away
      // and builds a new one, and a new point light means a new `shadow`, which
      // means six fresh 2048² faces allocated from the driver and six more
      // handed back — per floor, per canvas, in the middle of a ride. It is the
      // reason a four-floor trip hitched where a one-floor trip did not: the
      // cost was linear in the distance travelled.
      //
      // Keyed by seat, the same light object is re-aimed instead. Nothing is
      // drawn differently: what reaches the scene is the rig's positions and
      // intensities, which this component does not touch either way. The
      // handover is invisible for the same reason it always was — the fitting
      // leaving and the fitting arriving are the same distance from the cage at
      // the moment they swap, so they are at the same brightness.
      //
      // Safe only because the rig is a fixed length in every state; if that
      // ever stops being true, a seat could go empty and this becomes a light
      // that vanishes rather than moves. `lighting.test.js` holds that.
      key={index}
      ref={(node) => { lights.current[index] = node; }}
      position={[light.position[0], worldY(light.position[1]), light.position[2]]}
      // `dim` is the supply, not the fitting: one scalar over the whole rig, so
      // every source in both canvases hunts together on the intro's strike
      // pattern instead of each deciding for itself. See `introDim`.
      intensity={light.intensity * dim}
      decay={light.decay}
      color={light.colour}
      // Every fitting casts now, not just the nearest one. A point light's
      // shadow is a cubemap — six passes rather than one — so this was
      // capped to the two lights that mattered most; asked for the richer
      // scene over the cost, since the cabinet and the wall props are lit by
      // whichever shaft lamp actually rakes across them, not necessarily the
      // one nearest the cage.
      castShadow
    />
  ));
}

export default SceneLights;
