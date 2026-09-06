import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Grain from '../ui/Grain.jsx';

import { cssVariables } from '../theme/tokens.js';
import { LAYERS } from '../scene/layers.js';
import { ironFace } from '../ui/surfaceStyle.js';
import { CAM_PERSPECTIVE, CAM_ORIGIN_Y, BACK_WALL_SCALE } from '../scene/model/camera.js';
import {
  CAGE_FAR, DOORWAY_H_FRAC, DOORWAY_W_FRAC, cageInset,
} from '../scene/model/geometry.js';
import SceneCanvas from '../scene/renderers/r3f/SceneCanvas.jsx';
import ShaftScene from '../scene/r3f/ShaftScene.jsx';
import NearScene from '../scene/r3f/NearScene.jsx';
import { DEBUG_PANEL, useDetailBudget } from '../scene/effects/quality.js';
import Lighting from '../scene/effects/Lighting.jsx';
import { CONTENT_RISE, DECKS, SCREEN_SIDE } from '../lift/decks.js';
import { BG_PARALLAX, DECK_GAP, doorClosure } from '../lift/ride.js';
import { DOOR_TOTAL_MS, introClosure, introDim } from '../lift/intro.js';
import useLift from '../lift/useLift.js';
import useRideFrame from '../lift/useRideFrame.js';
import { RideTickerProvider } from '../lift/RideTickerContext.js';
import { FullscreenImageProvider } from '../scene/r3f/fullscreenImage.js';
import FullscreenImageModal from '../scene/r3f/FullscreenImageModal.jsx';
import useIntroClock from '../lift/useIntroClock.js';
import useBoot from '../boot/useBoot.js';
import BootScreen from '../boot/BootScreen.jsx';
import useViewport from '../hooks/useViewport.js';
import useReducedMotion from '../motion/reduced.js';
import DebugPanel from '../debug/DebugPanel.jsx';
import LightingPanel from '../debug/LightingPanel.jsx';
import useShotStates from '../debug/shots.js';
import FloorSelector from '../ui/FloorSelector.jsx';
import DeckReveal from '../decks/DeckReveal.jsx';
import { DECK_BODIES } from '../decks/index.js';
import { SLIDES } from '../decks/projects.js';
import { SceneLocaleProvider, useLocale, useT } from '../i18n/LocaleContext.jsx';
import { useLocaleCycle } from '../i18n/SceneLocale.jsx';

export default function Dieselpunk() {
  const {
    floorPos, deckIndex, moving, rideTo, cycleDoors, scrub, setScrub, ride, ridePhase, ticker,
  } = useLift();
  const { vw, vh } = useViewport();
  // Named `tr`, not `t`: `useIntroClock` below already owns `t` for the
  // intro's own progress, and the two would otherwise shadow each other.
  const tr = useT();
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
  // The Projekte console's page — which shot of the flat archive is loaded.
  // Held here, above the Canvas, rather than in `LandingScreen`: the
  // fullscreen modal pages this same counter (its PREV/NEXT are the console's
  // own, not a copy), and a DOM overlay outside the Canvas can only reach a
  // number that lives outside it too. See `fullscreenImage.js`.
  const [page, setPage] = useState(0);
  const pages = SLIDES.length;
  const step = useCallback(
    (delta) => setPage((p) => Math.min(Math.max(0, p + delta), Math.max(0, pages - 1))),
    [pages],
  );
  // The gallery's zoomed-in view. Held here, above the Canvas, because the
  // click that opens it fires from deep inside the R3F tree — see
  // `fullscreenImage.js` for why the modal itself cannot live there too.
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const openFullscreenImage = useCallback(() => setFullscreenOpen(true), []);
  const closeFullscreenImage = useCallback(() => setFullscreenOpen(false), []);
  const gallery = useMemo(
    () => ({ page, step, openFullscreenImage }),
    [page, step, openFullscreenImage],
  );

  const boot = useBoot();
  const booted = boot.phase === 'fade' || boot.phase === 'done';
  // Every job has reported and the gears are freewheeling: the last half-second
  // in which the scene can be drawn at nobody's expense. See `CanvasBoot`.
  const settling = boot.phase === 'spin';
  // NBC-25. Nothing in this scene may move at a visitor who has asked it not
  // to. The intro is the first thing that would — a shudder and a flicker,
  // played before anyone has touched anything — so it is handed its own end
  // state instead of its beginning; `motion/reduced.js` holds the rest of the
  // rule and who else obeys it.
  const stillness = useReducedMotion();
  const { t, setT, playing, play } = useIntroClock(DOOR_TOTAL_MS, booted, stillness);
  // The supply coming up: one scalar handed to every source in both canvases,
  // and to the DOM haze that stands in for the air between them.
  const dim = booted ? introDim(t) : 0;
  // deterministic states for the screenshot regression — see debug/shots.js
  useShotStates({ setScrub, setT });

  // One floor, in screen pixels, in each of the coordinate systems that need it.
  // These are the same distance three times over and used to be called `step`,
  // `floorPxWall` and `contentStep`, which said nothing about how they relate.
  const floorPitch = vh + vh * DECK_GAP;
  // The content travels at the landing wall's rate, because that is what it is
  // standing on — and it is *seen through* the hole its floor has in the shaft
  // wall, which is a nearer plane and therefore a faster one. Both rates live in
  // `landingReveal` now, and `DeckReveal` is what writes them.
  // the intro and a ride drive the same leaves, so whichever wants them more
  // shut wins — that also makes the very first frame a shut door rather than a
  // scene that has to be covered up by something else
  const closure = Math.max(doorClosure(ridePhase), introClosure(t));

  // NBC-90. The language the painted surfaces are in, which lags the chosen one
  // by exactly one cycle of the doors — long enough for half a dozen canvases
  // to be redrawn with nobody able to see them. Everything DOM follows
  // `useLocale` and changes at once; only what is baked into a texture waits.
  const { locale } = useLocale();
  const sceneLocale = useLocaleCycle(locale, { closure, moving, cycle: cycleDoors });

  // Where the doorway lands on screen. A plane square to the camera is only a
  // uniform scale, so this is exact — which is what lets the content stay a flat,
  // crisp DOM layer and still sit convincingly inside the opening.
  const apW = vw * DOORWAY_W_FRAC * BACK_WALL_SCALE;
  const apH = vh * DOORWAY_H_FRAC * BACK_WALL_SCALE;
  const aperture = { left: (vw - apW) / 2, top: vh * CAM_ORIGIN_Y - apH / 2, width: apW, height: apH };
  // the cage's rear frame, where the selector is mounted
  const headInset = vw / 2 + (cageInset(vw) - vw / 2) * (CAM_PERSPECTIVE / (CAM_PERSPECTIVE - CAGE_FAR));
  // What this machine has shown it can afford. It used to decide whether the
  // vertical motion smear was drawn; there is no smear any more (NBC-79), so
  // what is left of the budget is the pixels themselves.
  //
  // The ceiling is 1.5 rather than 2, and that is a memory decision. Both
  // canvases are `antialias: true`, so a pixel of framebuffer is four samples of
  // colour and four of depth plus the resolve — 36 bytes, not 4 — and at dpr 2 a
  // 2048-wide window costs 546 MB of video memory for the pair before a single
  // texture or shadow map is allocated. Measured: 137 MB at 1, 546 at 2. Half a
  // step of sharpening is not worth 400 MB on a card the shadow rig is already
  // sharing.
  const detailAllowed = useDetailBudget(moving);
  const dprCeiling = detailAllowed ? 1.5 : 1.25;
  // ── nothing on a deck has its own motion, and that is deliberate ──────────
  // There used to be an inertia here: the plates and the headings trailed the
  // cabin under acceleration and settled a beat after it stopped, written to
  // this wrapper as a `--deck-lag` custom property. It is gone, and it is not
  // coming back. **The text is printed on the landing wall**, so the only
  // motion it may have is the wall's — anything else is a heading sliding
  // across the plaster it is stencilled on, which is exactly what Mykolai saw
  // at the end of every trip and read, correctly, as the text coming loose from
  // the scene. Chasing it as a *timing* bug got the lag onto the ticker's clock
  // and made it smooth; it was never a timing bug. A sign bolted to a wall does
  // not have mass of its own.
  //
  // The vertical smear that used to sit beside this note is gone too, and for a
  // different reason: see NBC-79 and `DeckReveal`.

  // the decks are one screen each and the shaft owns the vertical axis, so the
  // document itself must never scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // The backdrop's drift is a plain transform on one wrapper, and nothing else
  // about that div depends on the ride — so it is the motion tier: written
  // straight to the DOM every ride frame via the ticker, instead of through a
  // `floorPos` prop that would re-render this whole component to change one
  // string. The layout effect covers everything the ticker itself does not run
  // for — mount, resize, and the settled position between rides. Each `DeckReveal`
  // does the same for itself.
  const backdropRef = useRef(null);
  const writeMotion = (fp) => {
    if (backdropRef.current) backdropRef.current.style.transform = `translateY(${(fp * floorPitch * BG_PARALLAX).toFixed(1)}px)`;
  };
  // Mount, resize, and everything the ticker itself does not run for. **The
  // position comes off the ticker even here**, and falls back to the props only
  // where there is no ticker at all (the test runner): `floorPos` is React's
  // throttled mirror of the ride, so a settled write taken from it disagrees
  // with the per-frame writes by up to a throttle step — measured at 1.6px of
  // the column against the wall behind it while a scrub was parked. `SceneLights`
  // states the same rule for the light rig; this is the DOM tier's copy of it.
  useLayoutEffect(() => {
    const snapshot = ticker?.getSnapshot();
    writeMotion(snapshot ? snapshot.floorPos : floorPos);
  });
  useRideFrame(({ floorPos: fp }) => writeMotion(fp));

  return (
    <RideTickerProvider value={ticker}>
    <SceneLocaleProvider value={sceneLocale}>
    <FullscreenImageProvider value={gallery}>
    <div
      style={{
        ...cssVariables, background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif",
        position: 'fixed', inset: 0, overflow: 'hidden',
      }}
    >
      {/* Everything but the modal itself. `inert` while it is open keeps focus
          from leaking into a scene the visitor can no longer see past the
          overlay — the other half of the trap `FullscreenImageModal` builds
          on its own side. */}
      <div inert={fullscreenOpen} aria-hidden={fullscreenOpen}>
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

      {/* The far half of the scene: everything behind the doors. */}
      <SceneCanvas vw={vw} vh={vh} zIndex={LAYERS.shaft} name="shaft" dprCeiling={dprCeiling} moving={moving} interactive>
        <ShaftScene
          vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
          ticker={ticker} ride={ride} deck={deckIndex}
          intro={introClosure(t)}
          // While the black rectangle is up, the shaft is held in the state
          // that needs the most work drawn: every landing shown, every fitting
          // in place, every light on. That is what the boot screen is for —
          // `CanvasBoot` compiles what it can see, and what it cannot see it
          // leaves for the frame someone is looking at. See `ShaftScene`.
          warm={!booted} settling={settling}
          dim={dim} onSettle={boot.settle}
        />
      </SceneCanvas>

      {DEBUG_PANEL && (
        <div style={{ pointerEvents: 'auto' }}>
          <DebugPanel t={t} setT={setT} playing={playing} play={play} scrub={scrub} setScrub={setScrub} hiDpr={detailAllowed} />
          <LightingPanel />
        </div>
      )}

      {/* The decks, each seen through its own floor's opening and streaming
          behind the cage's. Keeping the column moving rather than cross-fading
          is what makes a departing floor read as leaving: text escaping through
          a narrowing gap is a floor going away, where a fade is just a layer
          switching off. */}
      <div
        style={{
          position: 'absolute',
          left: aperture.left, top: aperture.top, width: aperture.width, height: aperture.height,
          overflow: 'hidden', zIndex: LAYERS.content,
          // The column is 48% of the aperture; this wrapper is all of it. Left
          // interactive it sits over the other half — the half the wall screen
          // stands on — and swallows every pointer event on its way down to the
          // shaft canvas, which is how Projekte's buttons could be built, lit and
          // animated and still never respond to a finger. The column itself takes
          // it back below.
          pointerEvents: 'none',
        }}
      >
        {/* Behind a shut door there is nothing to see, so there is nothing to
            build. The leaves are opaque and they cover the whole aperture, so
            the deck underneath is not dimmed or clipped — it is invisible, and
            at 0.985 it has been invisible for a few frames already. */}
        {closure < 0.985 && DECKS.map((d, i) => {
          // Generous, and deliberately so: what decides whether a deck can be
          // *seen* is its own opening (`revealSpan`, about two thirds of a
          // floor), and this only decides whether it is built. `floorPos` is
          // React's throttled mirror of the ride, so cutting it as fine as the
          // mask would pop a heading out mid-ride.
          if (Math.abs(i - floorPos) > 1.2) return null;
          const Body = DECK_BODIES[i];
          // The wall screen (`LandingScreen`, in the WebGL half of this same
          // landing) stands on `SCREEN_SIDE[i]`; the content takes the other
          // half so the two never fight for the same wall.
          const contentSide = SCREEN_SIDE[i] === 'left' ? 'right' : 'left';
          return (
            <DeckReveal
              key={d.id}
              floor={i}
              settled={floorPos}
              floorPitch={floorPitch}
              height={aperture.height}
              // …lifted off centre by whatever this floor's own furniture needs;
              // see `CONTENT_RISE`.
              rise={CONTENT_RISE[i] ?? 0}
              // Up to three decks are mounted at once — this floor and the
              // neighbour peeking in above or below it mid-ride — but only the
              // one the visitor is standing on should answer to Tab or a screen
              // reader.
              active={i === deckIndex}
            >
              <div style={{
                width: '48%',
                marginLeft: contentSide === 'right' ? 'auto' : 0,
                pointerEvents: 'auto',
              }}
              >
                <Body pos={floorPos} />
              </div>
            </DeckReveal>
          );
        })}
      </div>

      {/* The near canvas: everything that has to stand in front of the decks —
          the doorway frames, the leaves and the cage. A second context on
          purpose: the decks are genuinely *between* the two halves of this
          scene, and no z-index inside one canvas can express that. */}
      <SceneCanvas vw={vw} vh={vh} zIndex={LAYERS.cage} name="near" dprCeiling={dprCeiling} moving={moving}>
        <NearScene
          vw={vw} vh={vh} pos={floorPos} floorPx={floorPitch}
          deck={deckIndex} intro={introClosure(t)} ticker={ticker}
          ride={ride} settling={settling}
          dim={dim} onSettle={boot.settle}
        />
      </SceneCanvas>

      {/* The blanket of black that used to be laid over everything mid-ride has
          gone. It was there because the shaft had no lights, so "between floors
          is dark" had to be asserted; with fixtures at the half-floor levels the
          scene darkens and brightens on its own, and painting over it would only
          hide the thing we just built. */}

      <Lighting aperture={aperture} closure={closure} pos={floorPos} floorPx={floorPitch} vw={vw} vh={vh} dim={dim} />

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
      {/* Quiet, and deliberately so — this is an escape hatch, not a call to
          action. NAM-48's other half is `FloorKontakt`'s link back here. */}
      <a
        href="?flat"
        style={{
          position: 'absolute', right: 14, bottom: 10, zIndex: LAYERS.selector,
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
          color: 'var(--muted)', textDecoration: 'none', opacity: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {tr('dieselpunk.flatViewLink')}
      </a>

      {/* Over everything, including the debug panel: while this is up there is
          no scene to debug. It is the last child so it is also last in the
          paint order, which means no z-index accident can put a fitting in
          front of it. */}
      <BootScreen screen={boot.screen} />
      </div>
      <FullscreenImageModal
        open={fullscreenOpen} page={page}
        onClose={closeFullscreenImage}
        onPrev={() => step(-1)} onNext={() => step(1)}
      />
    </div>
    </FullscreenImageProvider>
    </SceneLocaleProvider>
    </RideTickerProvider>
  );
}
