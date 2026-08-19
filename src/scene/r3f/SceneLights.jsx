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

  useLayoutEffect(() => {
    for (const [index, light] of lights.current.entries()) {
      if (!light) continue;
      light.layers.set(rig[index]?.kind === 'landing' ? LAYER_LANDING : LAYER_SHAFT);
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
      castShadow={true}
    />
  ));
}

export default SceneLights;
