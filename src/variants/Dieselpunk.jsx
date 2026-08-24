import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Grain from '../ui/Grain.jsx';

import { cssVariables } from '../theme/tokens.js';
import { LAYERS } from '../scene/layers.js';
import { ironFace } from '../scene/renderers/css3d/surfaceStyle.js';
import { CAM_PERSPECTIVE, CAM_ORIGIN_Y, BACK_WALL_SCALE } from '../scene/model/camera.js';
import { lampsAt } from '../scene/model/lighting.js';
import { DOORWAY_W_FRAC, DOORWAY_H_FRAC, CAGE_FAR, cageInset } from '../scene/model/geometry.js';
import Shaft from '../scene/shaft/Shaft.jsx';
import Doorways from '../scene/shaft/Doorways.jsx';
import CageFront from '../scene/cage/CageFront.jsx';
import { markContextLost, useIsR3F } from '../scene/renderers/active.js';
import SceneCanvas from '../scene/renderers/r3f/SceneCanvas.jsx';
import ShaftScene from '../scene/r3f/ShaftScene.jsx';
import NearScene from '../scene/r3f/NearScene.jsx';
import { DEBUG_PANEL, useBlurBudget } from '../scene/effects/quality.js';
import Lighting from '../scene/effects/Lighting.jsx';
import MotionBlurDef from '../scene/effects/MotionBlurDef.jsx';
import { CONTENT_RISE, DECKS, SCREEN_SIDE } from '../lift/decks.js';
import { WALL_PARALLAX, BG_PARALLAX, DECK_GAP, doorClosure } from '../lift/ride.js';
import { DOOR_TOTAL_MS, introClosure, introDim, introShake } from '../lift/intro.js';
import useLift from '../lift/useLift.js';
import useRideFrame from '../lift/useRideFrame.js';
import { RideTickerProvider } from '../lift/RideTickerContext.js';
import useIntroClock from '../lift/useIntroClock.js';
import useBoot from '../boot/useBoot.js';
import BootScreen from '../boot/BootScreen.jsx';
import useViewport from '../hooks/useViewport.js';
import DebugPanel from '../debug/DebugPanel.jsx';
import LightingPanel from '../debug/LightingPanel.jsx';
import useShotStates from '../debug/shots.js';
import FloorSelector from '../ui/FloorSelector.jsx';
import { DECK_BODIES } from '../decks/index.js';

export default function Dieselpunk() {
  const {
    floorPos, deckIndex, moving, velocity, rideTo, scrub, setScrub, ride, ridePhase, ticker,
  } = useLift();
  const { vw, vh } = useViewport();
  // which backend is actually drawing — see scene/renderers/active.js
  const r3f = useIsR3F();
  // Nothing is shown until the scene is genuinely ready to be shown — every
  // tile decoded, every shader compiled, every canvas drawn at least once. The
  // boot screen holds a black rectangle with a pair of gears on it in the
  // meantime, and `boot/plan.js` is the register of what "ready" means.
  //
  // The arrival then plays in one continuous movement: the gears drop the
  // ratchet and run away (`spin`), the black fades (`fade`), and the intro
  // clock starts on that same transition — so the lamps strike and hunt while
  // the fade is still finishing, and the leaves shudder just as it clears. The
  // clock is autoplayed from `fade`, not from `done`, precisely so those two
  // overlap rather than queue.
  const boot = useBoot(r3f);
  const booted = boot.phase === 'fade' || boot.phase === 'done';
  const { t, setT, playing, play } = useIntroClock(DOOR_TOTAL_MS, booted);
  // The supply coming up: one scalar handed to every source in both canvases,
  // and to the DOM haze that stands in for the air between them.
  const dim = booted ? introDim(t) : 0;
  // deterministic states for the screenshot regression — see debug/shots.js
  useShotStates({ setScrub, setT });

  // One floor, in screen pixels, in each of the coordinate systems that need it.
  // These are the same distance three times over and used to be called `step`,
  // `floorPxWall` and `contentStep`, which said nothing about how they relate.
  const floorPitch = vh + vh * DECK_GAP;
  const wallFloorPitch = floorPitch * WALL_PARALLAX;
  // the content travels at the doorway's on-screen rate, so a deck stays welded
  // to the door that frames it
  const contentFloorPitch = floorPitch * BACK_WALL_SCALE;
  // the intro and a ride drive the same leaves, so whichever wants them more
  // shut wins — that also makes the very first frame a shut door rather than a
  // scene that has to be covered up by something else
  const closure = Math.max(doorClosure(ridePhase), introClosure(t));
  const shake = introShake(t);

  // Where the doorway lands on screen. A plane square to the camera is only a
  // uniform scale, so this is exact — which is what lets the content stay a flat,
  // crisp DOM layer and still sit convincingly inside the opening.
  const apW = vw * DOORWAY_W_FRAC * BACK_WALL_SCALE;
  const apH = vh * DOORWAY_H_FRAC * BACK_WALL_SCALE;
  const aperture = { left: (vw - apW) / 2, top: vh * CAM_ORIGIN_Y - apH / 2, width: apW, height: apH };
  // the cage's rear frame, where the selector is mounted
  const headInset = vw / 2 + (cageInset(vw) - vw / 2) * (CAM_PERSPECTIVE / (CAM_PERSPECTIVE - CAGE_FAR));
  const speed = Math.abs(velocity);
  // Quantised into steps. Every distinct stdDeviation is a different filter as
  // far as the compositor is concerned, so a continuously varying one threw away
  // the cached result on every single frame; nine buckets look identical in
  // motion and let it be reused.
  const blurAllowed = useBlurBudget(moving);
  // A machine that has already given the motion blur up has told us what it can
  // afford; asking it for four times the pixels as well is not a kindness.
  //
  // The ceiling is 1.5 rather than 2, and that is a memory decision. Both
  // canvases are `antialias: true`, so a pixel of framebuffer is four samples of
  // colour and four of depth plus the resolve — 36 bytes, not 4 — and at dpr 2 a
  // 2048-wide window costs 546 MB of video memory for the pair before a single
  // texture or shadow map is allocated. Measured: 137 MB at 1, 546 at 2. Half a
  // step of sharpening is not worth 400 MB on a card the shadow rig is already
  // sharing.
  const dprCeiling = blurAllowed ? 1.5 : 1.25;
  const blurAmount = blurAllowed ? Math.round(Math.min(16, speed * 5.5) / 2) * 2 : 0;
  // The lamps, for this position of the shaft. Everything that gets lit is
  // handed this same list, so the cage, the fixtures and the haze cannot
  // disagree about where the light is coming from — which is the entire reason
  // for computing it once rather than painting it three times.
  //
  // Memoized, and not for the arithmetic — that is a handful of multiplications.
  // It is for the *identity*: this array is handed to `Shaft`, `CageFront` and
  // `Lighting`, and a fresh one on every render defeats every `memo` underneath
  // them. At rest that is where it bites hardest, because the intro clock
  // re-renders this component at 60Hz for two seconds while nothing in the shaft
  // has moved at all.
  const lamps = useMemo(
    () => lampsAt(vw, vh, floorPos, floorPitch),
    [vw, vh, floorPos, floorPitch],
  );
  // the decks get a touch of the same vertical smear — razor-sharp text flying
  // past at speed is the giveaway that nothing is really moving
  const contentSmear = blurAllowed ? Math.round(Math.min(3.2, speed * 1.1)) : 0;
  // loose objects trail the cabin's motion and settle a beat after it stops
  const inertiaPx = Math.max(-17, Math.min(17, -velocity * 4.6));

  // the decks are one screen each and the shaft owns the vertical axis, so the
  // document itself must never scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Backdrop drift and the content column's travel are both a plain transform
  // on one wrapper each, and nothing else about either div depends on the
  // ride — so they are the motion tier: written straight to the DOM every
  // ride frame via the ticker, instead of through a `floorPos` prop that
  // would re-render this whole component to change one string twice. The
  // layout effect covers everything the ticker itself does not run for —
  // mount, resize, and the settled position between rides.
  const backdropRef = useRef(null);
  const contentWrapRef = useRef(null);
  const writeMotion = (fp) => {
    if (backdropRef.current) backdropRef.current.style.transform = `translateY(${(fp * floorPitch * BG_PARALLAX).toFixed(1)}px)`;
    if (contentWrapRef.current) contentWrapRef.current.style.transform = `translateY(${(fp * contentFloorPitch).toFixed(1)}px)`;
  };
  useLayoutEffect(() => writeMotion(floorPos), [floorPos, floorPitch, contentFloorPitch]);
  useRideFrame(({ floorPos: fp }) => writeMotion(fp));

  return (
    <RideTickerProvider value={ticker}>
    <div
      style={{
        ...cssVariables, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif",
        position: 'fixed', inset: 0, overflow: 'hidden',
      }}
    >
      <MotionBlurDef amount={blurAmount} contentAmount={contentSmear} />
      <Grain opacity={0.06} />

      {/* backdrop — the deepest plane, so it drifts slowest. Transform is
          written imperatively; see `writeMotion` above. */}
      <div
        ref={backdropRef}
        style={{
          position: 'absolute', left: 0, right: 0, top: '-60%', bottom: '-60%',
          background: 'radial-gradient(ellipse at 50% 30%, var(--bg-2) 0%, var(--bg) 62%)',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,205,150,0.07) 0%, transparent 65%, transparent 75%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      {/* The far half of the scene. Under `?renderer=r3f` it is WebGL and the
          CSS shaft stands down; the flag exists so the two can be compared in
          one build rather than across two branches, and CSS stays the default
          until the comparison says otherwise. */}
      {r3f ? (
        <SceneCanvas vw={vw} vh={vh} zIndex={LAYERS.shaft} name="shaft" dprCeiling={dprCeiling} moving={moving} onLost={markContextLost}>
          <ShaftScene
            vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
            ticker={ticker} ride={ride} deck={deckIndex}
            intro={introClosure(t)}
            // While the black rectangle is up, the shaft is held in the state
            // that needs the most work drawn: every landing shown, every fitting
            // in place, every light on. That is what the boot screen is for —
            // `CanvasBoot` compiles what it can see, and what it cannot see it
            // leaves for the frame someone is looking at. See `ShaftScene`.
            warm={!booted}
            dim={dim} onSettle={boot.settle}
          />
        </SceneCanvas>
      ) : (
        <Shaft
          vw={vw} vh={vh} pos={floorPos}
          floorPx={wallFloorPitch} backFloorPx={floorPitch}
          blurPx={blurAmount}
          lamps={lamps}
          ride={ride} deck={deckIndex} intro={introClosure(t)}
        />
      )}

      {DEBUG_PANEL && (
        <div style={{ pointerEvents: 'auto' }}>
          <DebugPanel t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} blurEnabled={blurAllowed} />
          {/* Only under WebGL: the CSS scene shades itself arithmetically from
              `model/lighting.js` and none of these knobs reach it, so showing
              them there would be a panel that lies about what it controls. */}
          {r3f && <LightingPanel />}
        </div>
      )}

      {/* The decks, clipped to the doorway and streaming behind it. Keeping the
          column moving rather than cross-fading is what makes a departing floor
          read as leaving: text escaping through a narrowing gap is a floor going
          away, where a fade is just a layer switching off. */}
      <div
        style={{
          position: 'absolute',
          left: aperture.left, top: aperture.top, width: aperture.width, height: aperture.height,
          overflow: 'hidden', zIndex: LAYERS.content,
          filter: contentSmear > 0.2 ? 'url(#deckBlur)' : 'none',
        }}
      >
        <div ref={contentWrapRef} style={{ position: 'absolute', inset: 0 }}>
          {/* Behind a shut door there is nothing to see, so there is nothing to
              build. The leaves are opaque and they cover the whole aperture, so
              the deck underneath is not dimmed or clipped — it is invisible, and
              at 0.985 it has been invisible for a few frames already. */}
          {closure < 0.985 && DECKS.map((d, i) => {
            if (Math.abs(i - floorPos) > 1.2) return null;
            const Body = DECK_BODIES[i];
            // The wall screen (`LandingScreen`, in the WebGL half of this same
            // landing) stands on `SCREEN_SIDE[i]`; the content takes the other
            // half so the two never fight for the same wall.
            const contentSide = SCREEN_SIDE[i] === 'left' ? 'right' : 'left';
            return (
              <div
                key={d.id}
                style={{
                  position: 'absolute', left: 0, right: 0, top: -i * contentFloorPitch, height: aperture.height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  // …and then lifted off that centre by whatever this floor's
                  // own furniture needs — see `CONTENT_RISE`. A transform
                  // rather than a changed `justifyContent`, so a rise of 0 is
                  // exactly the layout this had before there was anything
                  // standing on the landing to collide with.
                  transform: `translateY(${-(CONTENT_RISE[i] ?? 0) * aperture.height}px)`,
                  padding: '1.4rem 5.8rem',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: '48%', marginLeft: contentSide === 'right' ? 'auto' : 0 }}>
                  <Body lag={inertiaPx} pos={floorPos} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the doors, in front of the content: the content sits on the landing,
          so leaves that cannot cover it are not doors */}
      {!r3f && (
        <Doorways
          vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
          deck={deckIndex} intro={introClosure(t)}
          shake={shake} blurPx={blurAmount}
        />
      )}

      {/* The near canvas: everything in WebGL that has to stand in front of the
          decks — the doorway frames, the leaves and the cage. A second context
          on purpose: the decks are genuinely *between* the two halves of this
          scene, and no z-index inside one canvas can express that. */}
      {r3f && (
        <SceneCanvas vw={vw} vh={vh} zIndex={LAYERS.cage} name="near" dprCeiling={dprCeiling} moving={moving} onLost={markContextLost}>
          <NearScene
            vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
            deck={deckIndex} intro={introClosure(t)} ticker={ticker}
            ride={ride}
            dim={dim} onSettle={boot.settle}
          />
        </SceneCanvas>
      )}

      {/* The blanket of black that used to be laid over everything mid-ride has
          gone. It was there because the shaft had no lights, so "between floors
          is dark" had to be asserted; with fixtures at the half-floor levels the
          scene darkens and brightens on its own, and painting over it would only
          hide the thing we just built. */}

      {/* the cage rides with us, not with the shaft, and draws in front of the
          content because it is nearer than the landing the content sits on */}
      {!r3f && <CageFront vw={vw} vh={vh} lamps={lamps} />}

      <Lighting aperture={aperture} closure={closure} pos={floorPos} floorPx={floorPitch} vw={vw} vh={vh} dim={r3f ? dim : 1} />

      {/* The selector is mounted on the cage, not above the landing door. A lift's
          floor buttons live in the cabin — and had they gone on the shaft wall
          they would have ridden away with the floor you were trying to leave. */}
      <div
        style={{
          position: 'absolute', top: 0, left: headInset, width: vw - headInset * 2, zIndex: LAYERS.selector,
        }}
      >
        <div
          style={{
            padding: '0 1.1rem',
            ...ironFace(70, 0.95),
            boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.09), 0 5px 14px rgba(0,0,0,0.6)',
          }}
        >
          <FloorSelector pos={floorPos} deck={deckIndex} moving={moving} go={rideTo} />
        </div>
      </div>
      {/* Over everything, including the debug panel: while this is up there is
          no scene to debug. It is the last child so it is also last in the
          paint order, which means no z-index accident can put a fitting in
          front of it. */}
      <BootScreen screen={boot.screen} />
    </div>
    </RideTickerProvider>
  );
}
