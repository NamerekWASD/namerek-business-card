import { useEffect, useMemo } from 'react';
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
import { DEBUG_PANEL, useBlurBudget } from '../scene/effects/quality.js';
import Lighting from '../scene/effects/Lighting.jsx';
import MotionBlurDef from '../scene/effects/MotionBlurDef.jsx';
import { DECKS } from '../lift/decks.js';
import { WALL_PARALLAX, BG_PARALLAX, DECK_GAP, doorClosure } from '../lift/ride.js';
import { DOOR_TOTAL_MS, introClosure, introShake } from '../lift/intro.js';
import useLift from '../lift/useLift.js';
import useIntroClock from '../lift/useIntroClock.js';
import useViewport from '../hooks/useViewport.js';
import DebugPanel from '../debug/DebugPanel.jsx';
import FloorSelector from '../ui/FloorSelector.jsx';
import { DECK_BODIES } from '../decks/index.js';

export default function Dieselpunk() {
  const { t, setT, playing, play } = useIntroClock(DOOR_TOTAL_MS);
  const { floorPos, deckIndex, moving, velocity, rideTo, scrub, setScrub, ride, ridePhase } = useLift();
  const { vw, vh } = useViewport();

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

  return (
    <div
      style={{
        ...cssVariables, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif",
        position: 'fixed', inset: 0, overflow: 'hidden',
      }}
    >
      <MotionBlurDef amount={blurAmount} contentAmount={contentSmear} />
      <Grain opacity={0.06} />

      {/* backdrop — the deepest plane, so it drifts slowest */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: '-60%', bottom: '-60%',
          background: 'radial-gradient(ellipse at 50% 30%, var(--bg-2) 0%, var(--bg) 62%)',
          transform: `translateY(${(floorPos * floorPitch * BG_PARALLAX).toFixed(1)}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,205,150,0.07) 0%, transparent 65%, transparent 75%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      <Shaft
        vw={vw} vh={vh} pos={floorPos}
        floorPx={wallFloorPitch} backFloorPx={floorPitch}
        blurPx={blurAmount}
        lamps={lamps}
        ride={ride} deck={deckIndex} intro={introClosure(t)}
      />

      {DEBUG_PANEL && (
        <div style={{ pointerEvents: 'auto' }}>
          <DebugPanel t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} blurEnabled={blurAllowed} />
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
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(floorPos * contentFloorPitch).toFixed(1)}px)` }}>
          {/* Behind a shut door there is nothing to see, so there is nothing to
              build. The leaves are opaque and they cover the whole aperture, so
              the deck underneath is not dimmed or clipped — it is invisible, and
              at 0.985 it has been invisible for a few frames already. */}
          {closure < 0.985 && DECKS.map((d, i) => {
            if (Math.abs(i - floorPos) > 1.2) return null;
            const Body = DECK_BODIES[i];
            return (
              <div
                key={d.id}
                style={{
                  position: 'absolute', left: 0, right: 0, top: -i * contentFloorPitch, height: aperture.height,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '1.4rem 5.8rem',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ width: '100%' }}>
                  <Body lag={inertiaPx} pos={floorPos} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the doors, in front of the content: the content sits on the landing,
          so leaves that cannot cover it are not doors */}
      <Doorways
        vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
        ride={ride} deck={deckIndex} intro={introClosure(t)}
        shake={shake} blurPx={blurAmount}
      />

      {/* The blanket of black that used to be laid over everything mid-ride has
          gone. It was there because the shaft had no lights, so "between floors
          is dark" had to be asserted; with fixtures at the half-floor levels the
          scene darkens and brightens on its own, and painting over it would only
          hide the thing we just built. */}

      {/* the cage rides with us, not with the shaft, and draws in front of the
          content because it is nearer than the landing the content sits on */}
      <CageFront vw={vw} vh={vh} lamps={lamps} />

      <Lighting aperture={aperture} closure={closure} lamps={lamps} vw={vw} vh={vh} />

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
    </div>
  );
}
