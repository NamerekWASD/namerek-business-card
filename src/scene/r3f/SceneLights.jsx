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
// And each light is confined to its own room by a layer. Nothing here casts a
// shadow — the plan is explicit that shadow maps come last, if at all — so
// without layers the shaft's lamps light the far side of the back wall and the
// landing stops being a room you look into. A light that only sees its own
// room is the wall, stated in the one place it can be stated cheaply.
function SceneLights({ vw, vh, lamps, floorPx, deckTop, closure }) {
  // Spelled out rather than forwarded wholesale. It was forwarded, and the
  // scenes call the floor pitch `floorPx` while the rig calls it `floorPitch` —
  // so the rig read `undefined`, the taper produced `NaN`, and the key light
  // came out with a NaN position and intensity. three.js does not complain
  // about that: it simply contributes nothing.
  const rig = lightRig({ vw, vh, lamps, floorPitch: floorPx, deckTop, closure });
  const lights = useRef([]);

  // A point light's shadow is a cubemap — six passes over the scene rather
  // than one — and this rig can hold up to `shaftLights + 1` sources at
  // once. Every one of them casting would-be six-fold the cost for a return
  // nobody would see: the shaft lights already sit close enough together that
  // their shadows would mostly overlap. So only the two that matter — the
  // nearest shaft fitting (rig sorts shaft lights by reach, so this is
  // whichever is first) and the landing's own pendant — actually cast one.
  // The rest still light the room; they just do it without a shadow.
  const firstShaft = rig.findIndex((l) => l.kind === 'shaft');

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
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 10;
      // Covers the shaft's own depth plus the landing behind it, with room to
      // spare — a point light shadow that comes up short just short of the
      // wall it should be darkening is worse than one that never shipped.
      light.shadow.camera.far = 1200;
      light.shadow.bias = -0.0015;
      light.shadow.radius = 3;
    }
  });

  return rig.map((light, index) => (
    <pointLight
      key={light.id}
      ref={(node) => { lights.current[index] = node; }}
      position={[light.position[0], worldY(light.position[1]), light.position[2]]}
      intensity={light.intensity}
      decay={light.decay}
      color={light.colour}
      castShadow={light.kind === 'landing' || index === firstShaft}
    />
  ));
}

export default SceneLights;
