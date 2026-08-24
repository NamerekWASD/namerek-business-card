import { useEffect, useLayoutEffect, useRef } from 'react';
import { openingTop } from '../model/geometry.js';
import { lampsAt } from '../model/lighting.js';
import { openFloor } from '../../lift/ride.js';
import { worldY } from '../renderers/r3f/camera.js';
import {
  LAYER_LANDING, LAYER_SHAFT, lightRig, maxLights, seatRoom,
} from '../renderers/r3f/lighting.js';
import { readLight, useLightTuning } from '../renderers/r3f/tuning.js';

// Every physical source in the scene, and nothing else. This component decides
// nothing: `lightRig` returns the whole rig as data and this writes it onto a
// fixed row of lights, which is what makes the count a property a test can
// assert instead of a thing a reviewer has to count in a scene graph.
//
// Three facts are doing the work here.
//
// The shaft's fittings each own a light and never move. A single light standing
// for the row had to travel as the row passed, and there is no way to travel
// between two fittings that does not read as a jump.
//
// Each light is confined to its own room by a layer — the nearest shaft fitting
// and the landing pendant now cast real shadows too, but the layer is what keeps
// the *light* itself out of the wrong room even where a shadow isn't involved:
// without it the shaft's lamps light the far side of the back wall and the
// landing stops being a room you look into. A light that only sees its own room
// is the wall, stated in the one place it can be stated cheaply.
//
// **And the rig rides the ticker, not React.** That is the third, and it is a
// bug fix rather than an optimisation. Everything else that moves during a trip
// — the walls, the masonry, the doorways, the cage, the cable, the content
// column — is written straight to its object on every ride frame. The lights
// used to be positioned from React props instead, off a `floorPos` mirrored into
// state, and React cannot commit a tree this size at a high refresh rate:
// measured on a 165Hz display, the geometry advanced about 29 scene pixels every
// frame while the lights sat still for three or four frames and then jumped 116.
// A lamp that lags the wall it is bolted to is not a smaller error than a lamp in
// the wrong place — it is the same error, arriving late. So the rig is recomputed
// from the ticker's own snapshot and written to the same light objects, and there
// is no second clock left for it to disagree with.
//
// The props that are *not* per-frame — the intro's supply, the boot warm-up, the
// bench — stay props, and are read through a ref so the per-frame write always
// sees the latest without re-subscribing.
// Which rooms this canvas has geometry for. Both, unless a canvas says
// otherwise — `NearScene` holds only the shaft's, and a seat lighting a room
// that is not there still owns a full cube map and still rasterises its six
// faces on every change. See `casts` below.
const BOTH_ROOMS = ['shaft', 'landing'];

function SceneLights({
  vw, vh, floorPx, ticker, deck, ride, intro = 0, warm = false, dim = 1, rooms = BOTH_ROOMS,
}) {
  const lights = useRef([]);
  // Subscribed, not read: a bench slider has to reach this component, and the
  // per-frame write below reads the tuning through `lightRig` at call time.
  useLightTuning();

  const props = useRef(null);
  props.current = { vw, vh, floorPx, deck, ride, intro, warm, dim };

  // The rig for one position of the shaft, from first principles each time.
  // `lampsAt` is a handful of multiplications and `lightRig` sorts four
  // fittings; doing it per frame costs less than the render it replaces.
  const rigAt = (floorPos, liveRide, liveDeck) => {
    const p = props.current;
    const lamps = lampsAt(p.vw, p.vh, floorPos, p.floorPx);
    const open = openFloor(liveRide, liveDeck);
    // Held wide open while the boot screen is up. Nothing is being lit — `dim`
    // is nought under the screen — but a shadow map is drawn from the state the
    // rig is *in*, and a landing light that is switched off has no shadow pass
    // at all, so its depth shaders would go uncompiled until the frame a door
    // first opened on them. That is the whole of `warm`: put the scene in the
    // most demanding state it will ever be in while there is a black rectangle
    // over it, and let the boot compile find everything.
    const closure = p.warm
      ? 0
      : Math.max(open.closure, open.floor === liveDeck ? p.intro : 0);
    return lightRig({
      vw: p.vw,
      vh: p.vh,
      lamps,
      floorPitch: p.floorPx,
      deckTop: openingTop(p.vh, p.floorPx, open.floor) + floorPos * p.floorPx,
      closure,
    });
  };

  const apply = (rig) => {
    const { dim: supply } = props.current;
    for (const [index, light] of lights.current.entries()) {
      const spec = rig[index];
      if (!light || !spec) continue;
      light.position.set(spec.position[0], worldY(spec.position[1]), spec.position[2]);
      // `dim` is the supply, not the fitting: one scalar over the whole rig, so
      // every source in both canvases hunts together on the intro's strike
      // pattern instead of each deciding for itself. See `introDim`.
      light.intensity = spec.intensity * supply;
      light.decay = spec.decay;
      light.color.set(spec.colour);

      const layer = spec.kind === 'landing' ? LAYER_LANDING : LAYER_SHAFT;
      light.layers.set(layer);
      // A point light's own shadow camera does not inherit `layers` from the
      // light it belongs to — it starts on the default layer like any fresh
      // camera — so left alone it would draw the *other* room's geometry into
      // this one's shadow map, right through the wall `Room` otherwise makes
      // opaque to light.
      light.shadow.camera.layers.set(layer);
      // Off the bench, and asked again every pass rather than set once: three
      // reads `mapSize` only when it has no map to reuse, so a slider that
      // moves has to hand the old cube back or nothing happens. At 2048 one
      // light held 201 MB — six faces as colour and again as depth — and the
      // rig's eight held 1.6 GB of an 8 GB card.
      const size = readLight().shadowMapSize;
      if (light.shadow.mapSize.x !== size) {
        light.shadow.mapSize.set(size, size);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
      light.shadow.camera.near = 10;
      // Covers the shaft's own depth plus the landing behind it, with room to
      // spare — a point light shadow that comes up short just short of the wall
      // it should be darkening is worse than one that never shipped.
      light.shadow.camera.far = 1800;
      light.shadow.bias = 0.0015;
      // A fitting in this scene is not a pinhole, so its shadow should not read
      // like one either — a hard edge is what a spotlight throws, not a shaded
      // bulb. This is a blur-radius knob rather than a resolution one (three's
      // point-light PCF path samples a five-tap disk scaled by this value, cost
      // is flat regardless of how wide it is set), so it can be generous without
      // costing anything back — and it is what a smaller `shadowMapSize` is
      // meant to be spent on, since a blurred edge is what tells a soft shadow
      // apart from a low-resolution one.
      light.shadow.radius = readLight().shadowRadius;

      // A dark light still has a shadow map, and three would still redraw its
      // six cube faces every frame for a contribution of exactly nothing. The
      // rig keeps its full complement of sources at all times — that is what
      // stops the scene recompiling every shader when a door opens, see
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
      // figure times `dim`. `dim` is nought for the whole of the boot screen and
      // the first frames of the intro, so gating on it would park every shadow
      // map through exactly the stretch that exists to get this work done unseen
      // — and then unpark them, and compile their depth shaders, on the frames
      // the lamps are striking. This asks the question that was meant: is this
      // fitting switched on, supply or no supply.
      const lit = (spec.intensity ?? 0) > 0;
      light.shadow.autoUpdate = lit;
      if (!lit && light.shadow.map === null) light.shadow.needsUpdate = true;
    }
  };

  // Mount, resize, and every prop that is not per-frame. The position comes off
  // the ticker even here, for the reason `useRideMotion` spells out: the props
  // carry React's mirror of the ride, and a mirror is a commit behind.
  useLayoutEffect(() => {
    const snapshot = ticker?.getSnapshot();
    apply(rigAt(snapshot?.floorPos ?? deck, snapshot ? snapshot.ride : ride, snapshot ? snapshot.deckIndex : deck));
  });

  useEffect(() => {
    if (!ticker) return undefined;
    return ticker.subscribe((s) => apply(rigAt(s.floorPos, s.ride, s.deckIndex)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  // A fixed row of seats, and every one of them always present.
  //
  // The count being fixed rather than merely bounded is load-bearing: three.js
  // keys its shader programs on how many lights are in the scene, so a rig that
  // grows by one when a door opens invalidates every program in the room on that
  // exact frame and blocks until the driver has linked their replacements. A
  // light that is present and dark costs a handful of uniforms.
  //
  // Keyed by seat, never by fitting. Riding one floor rotates one fitting out of
  // the row and another in; keyed by lamp id that is an unmount and a mount, and
  // a new `PointLight` means a new `shadow`, which means six fresh 2048² faces
  // allocated from the driver and six more handed back — per floor, per canvas,
  // in the middle of a ride. It is the reason a four-floor trip hitched where a
  // one-floor trip did not: the cost was linear in the distance travelled.
  const casts = (index) => rooms.includes(seatRoom(index));

  return Array.from({ length: maxLights() }).map((_, index) => (
    <pointLight
      // eslint-disable-next-line react/no-array-index-key
      key={index}
      ref={(node) => { lights.current[index] = node; }}
      // Every fitting casts, not just the nearest one — asked for the richer
      // scene over the cost, since the cabinet and the wall props are lit by
      // whichever shaft lamp actually rakes across them. The exception is a
      // seat whose room this canvas does not hold: its cube would be six passes
      // over an empty layer, drawn into a map nothing samples.
      castShadow={casts(index)}
    />
  ));
}

export default SceneLights;
