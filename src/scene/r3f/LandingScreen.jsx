import { useEffect, useMemo, useRef, useState } from 'react';
import { AdditiveBlending, MultiplyBlending } from 'three';
import { worldY } from '../renderers/r3f/camera.js';
import { screenGlow, screenRaster } from '../renderers/r3f/patterns.js';
import useScreenLife from '../renderers/r3f/screenLife.js';
import {
  LOG_ROWS, RUN, clearTerminal, linesAt, paintTerminal, sizeTerminal, terminalSurface,
} from '../renderers/r3f/terminal.js';
import {
  STATIONS, flowAt, flowBead, flowHalo, flowLayout, flowSurface, paintFlow, pathAt, sizeFlow,
} from '../renderers/r3f/flow.js';
import { invalidateScene } from '../renderers/r3f/frames.js';
import {
  gallerySurface, loadShot, paintSlide, paintStandby, readyShot,
} from '../renderers/r3f/gallery.js';
import {
  PING_REACH, mapLayout, mapPing, mapSurface, paintMap, pingAt, sizeMap,
} from '../renderers/r3f/nrwMap.js';
import { SLIDES } from '../../decks/projects.js';
import ScreenFrame, { frameMetrics } from './ScreenFrame.jsx';
import { useFullscreenGallery } from './fullscreenImage.js';
import useReducedMotion from '../../motion/reduced.js';
import { useSceneLocale } from '../../i18n/LocaleContext.jsx';
import { t } from '../../i18n/strings.js';

// The wall screen every landing shares: a fluted glass panel recessed into a
// frame on the back wall. Plain exported numbers rather than a live panel — this is layout, not
// a taste call judged frame-to-frame like the lighting rig — so Mykolai can
// nudge them by hand here whenever the landing's proportions change.
//
// The frame's own dimensions are not here: how wide a band is, how far each of
// its tiers stands off the wall and where the glass sits inside it are all
// fractions of the panel, and they live with the geometry that reads them —
// `ScreenFrame.jsx`. What is left here is where on the wall the panel goes.
//
// ── these grew when the screen became a terminal ─────────────────────────────
// A logo the size of a hand is legible at any size; thirty columns of monospace
// is not. Three of the four margins came in to buy the type back — see the note
// at the top of `terminal.js` for the arithmetic that decides how much is
// enough. **`innerMarginX` deliberately did not move**: that is the gutter the
// ground floor's valve rack hangs in, and there is about twenty scene pixels
// between the rack's right-hand edge and the screen's left one already. Take it
// and the two props on this wall start overlapping.
export const SCREEN_TUNING = [
  {
    floor: 0, // ground floor, the terminal
    tuning: {
      outerMarginX: -196, // the screen runs out past the opening, onto wall the pier does not hide
      innerMarginX: 176, // the gutter — do not narrow, see above
      marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
      marginTop: 104, // gap under the cornice
      marginBottom: 124, // gap above the skirting
      screenFill: 0.94, // only the 2. OG picture tube reads this — see below
    }
  },
  {
    floor: 1,
    tuning: {
      outerMarginX: -196, // the screen runs out past the opening, onto wall the pier does not hide
      innerMarginX: 176, // the gutter — do not narrow, see above
      marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
      marginTop: 104, // gap under the cornice
      marginBottom: 124, // gap above the skirting
      screenFill: 0.94, // only the 2. OG picture tube reads this — see below
    }
  },
  {
    floor: 2,
    tuning: {
      outerMarginX: -196, // the screen runs out past the opening, onto wall the pier does not hide
      innerMarginX: 76, // the gutter — do not narrow, see above
      marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
      marginTop: 44, // gap under the cornice
      marginBottom: 124, // gap above the skirting
      screenFill: 0.94, // only the 2. OG picture tube reads this — see below
    }
  },
  {
    floor: 3,
    tuning: {
      outerMarginX: -196, // the screen runs out past the opening, onto wall the pier does not hide
      innerMarginX: 176, // the gutter — do not narrow, see above
      marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
      marginTop: 104, // gap under the cornice
      marginBottom: 124, // gap above the skirting
      screenFill: 0.94, // only the 2. OG picture tube reads this — see below
    }
  }
];

/**
 * The ground-floor screen's terminal, printing its log when the doors part.
 *
 * ── why this is not the logo any more ────────────────────────────────────────
 * What stood here was the mark drawing itself in. It was the only place in the
 * scene the identity appeared at all, which made it carry two jobs it could not
 * both do: *this is whose it is* and *this is here all the time*. It managed
 * neither well — one floor out of four, two seconds per arrival, and it replayed
 * the whole reveal every time the lift came back, which is a title card rather
 * than a mark. The identity is now on the door leaves, the cabin's maker plate,
 * the indicator face and the shaft's brick, all of which are in frame far longer
 * than this ever was.
 *
 * That frees the screen to say what the workshop *does*. A build log is the one
 * thing a screen in a machine room would honestly be showing, and it is the
 * third member of a vocabulary the rest of the floor is already speaking — the
 * valve rack on this wall is the machine, the punched tape on the bench upstairs
 * is the program, and this is the two of them being put to work.
 *
 * ── and it keeps the mark's own discipline ───────────────────────────────────
 * Everything about the mounting below is inherited unchanged and deliberately:
 * the mesh is built once and never unbuilt, the canvas carries the state, and
 * the log clears on a full close so the next arrival gets the print again rather
 * than a page of static text. See the note on the mesh, which is a hitch that
 * was measured rather than a style.
 */
function TerminalLog({ y, z, w, h, open, shut }) {
  const still = useReducedMotion();
  // NBC-90. The language the tube is *painted* in, which is not always the one
  // the visitor has chosen: a repaint waits for the doors. See `SceneLocale`.
  const locale = useSceneLocale();
  // The glass's own shape. The page inside stays a fixed grid; what follows the
  // opening is the tube around it — see the note at the head of `terminal.js`.
  const aspect = w / h;
  const [surface] = useState(() => (
    typeof document === 'undefined' ? null : terminalSurface(aspect)
  ));
  const raf = useRef(0);
  // has this open cycle already printed — cleared on the next full close
  const playing = useRef(false);

  // A resize is a new canvas, and a new canvas is a blank one — so whatever was
  // on the tube has to go back onto it. Ahead of the print's own effect, which
  // will not run again for a change of shape alone.
  useEffect(() => {
    if (!surface || !sizeTerminal(surface, aspect)) return;
    if (playing.current) paintTerminal(surface.canvas, LOG_ROWS, aspect, locale);
    surface.texture.needsUpdate = true;
    invalidateScene();
  }, [surface, aspect, locale]);

  // ── the page is printed in one language ────────────────────────────────────
  // NBC-90. Everything else on these walls repaints from its own effect, but
  // the log is guarded by `playing`: it prints once per visit and refuses to
  // print again until the doors have fully shut. On the ordinary path that is
  // exactly what happens — the language swaps while they are shut, the guard
  // clears with them, and the next opening replays the print in the new
  // language. The swap can also arrive late, though (a throttled tab, a
  // dropped frame — see `SceneLocale`), and then the guard is up, the doors
  // are open and the page would sit in the old language until the next trip.
  //
  // So the page is reprinted whole rather than replayed. A log that types
  // itself out again because somebody turned a switch reads as the machine
  // restarting; a page that is simply *in the other language now* reads as
  // what happened.
  const printedIn = useRef(null);
  useEffect(() => {
    if (!surface || !playing.current || printedIn.current === locale) return;
    printedIn.current = locale;
    paintTerminal(surface.canvas, LOG_ROWS, aspect, locale);
    surface.texture.needsUpdate = true;
    invalidateScene();
  }, [surface, aspect, locale]);

  useEffect(() => {
    if (!surface) return undefined;
    if (shut) {
      playing.current = false;
      // Wiped, not unmounted — see the note on the mesh below.
      clearTerminal(surface.canvas);
      surface.texture.needsUpdate = true;
      invalidateScene();
      return undefined;
    }
    if (!open || playing.current) return undefined;
    playing.current = true;
    printedIn.current = locale;
    if (still) {
      // NBC-25. The print is text arriving line by line, which is motion the
      // visitor did not ask for and cannot look away from — the page is the
      // point of it, so they get the page. The log is what a finished build
      // leaves on the tube anyway.
      paintTerminal(surface.canvas, LOG_ROWS, aspect, locale);
      surface.texture.needsUpdate = true;
      invalidateScene();
      return undefined;
    }
    let live = true;
    // `paintTerminal` re-lays the whole page, with two shadow passes per line —
    // cheap two dozen times, not sixty times a second. rAF ticks far more often
    // than the log has lines, so most ticks would ask to redraw a page already
    // on the canvas; this only repaints when a line actually arrives.
    let lastCount = -1;
    const show = (count) => {
      if (count === lastCount) return;
      lastCount = count;
      paintTerminal(surface.canvas, count, aspect, locale);
      surface.texture.needsUpdate = true;
      // The whole scene, not this canvas. The print runs with the lift standing
      // still, so both canvases are on demand — and asking only this one left
      // the near canvas, which holds the doors, sitting out a couple of thousand
      // composites without drawing. That is the door flicker: see `frames.js`.
      invalidateScene();
    };
    const t0 = performance.now();
    const step = () => {
      if (!live) return;
      const p = Math.min(1, (performance.now() - t0) / (RUN * 1000));
      show(linesAt(p, locale));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else show(LOG_ROWS);
    };
    show(0);
    raf.current = requestAnimationFrame(step);
    return () => { live = false; cancelAnimationFrame(raf.current); };
  }, [surface, open, shut, aspect, still, locale]);

  if (!surface) return null;
  // **Built once, and never unbuilt.** This mesh used to be gated on the reveal
  // having started — `null` until the doors opened, `null` again once they shut —
  // and that is a mount and an unmount on every single visit to this floor. A
  // mount is a fresh material, a fresh material is a shader compiled and a
  // program linked, and the driver does that work synchronously on the frame
  // that asks for it. The frame that asked was the one where the leaves finish
  // parting, so arriving at the ground floor stuttered right at the end of the
  // animation — every time, and nowhere else, because this is the only landing
  // that carries the screen's own picture. Measured: two `compileShader` calls
  // and a `linkProgram` on each arrival here, none at all on any other floor.
  //
  // So the mesh stays for the life of the page and the *canvas* carries the
  // state. Cleared, it is fully transparent and draws nothing; there is no
  // `visible` flag to get wrong, and it is on screen during the boot warm-up
  // (`Landing` forces its fittings visible under `warm`), which is where the one
  // compile it ever needs now happens — behind the black rectangle, with nobody
  // looking. This is the rule `Landing` states for the room around it.
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** How often the impulse is resampled — the screen's own refresh, as
 * `screenLife` sets it, and for the reason written there: a request bead moved
 * at 160 fps is a bead on a modern monitor. */
const FLOW_TICK_MS = 55;

/** How much of the run the bead spends coming on and going off, so it does not
 * appear as a half-blob standing on the edge of the sheet. */
const FLOW_EDGE = 0.04;

/**
 * The 1. OG screen: the request the deck's Architektur plate is describing,
 * running down the layers it names.
 *
 * ── the mounting is the terminal's, whole ───────────────────────────────────
 * Built once and never unbuilt, the canvas carrying the state, every write
 * asking the *scene* for a frame rather than this canvas. All three are argued
 * at length on `TerminalLog` above and none is a style — the mount that was
 * taken out there was a shader compiled on the frame the leaves finish parting,
 * and it would be the same mount and the same frame here.
 *
 * ── what is new is that nothing here repaints ───────────────────────────────
 * The sheet is painted once, on the commit that makes it. Everything that moves
 * is geometry over the top: one plane per layer whose `opacity` is the light
 * that layer is throwing, and one bead walked along the wire. That is a handful
 * of floats per tick against a megabyte of texture — see the head of `flow.js`
 * for why a diagram that redraws itself is the wrong build on a screen somebody
 * may stand in front of for a minute.
 *
 * Written straight to the materials and to the bead's own transform, never
 * through React state: a screen that lives through `setState` re-renders the
 * whole landing eighteen times a second for three floats. Same rule as
 * `useScreenLife` and `buttonPulse`, and the size the bead is walked across is
 * held in a ref so a viewport resize does not restart the run.
 */
function RequestFlow({ y, z, w, h, live }) {
  const still = useReducedMotion();
  const locale = useSceneLocale();
  // The glass's own shape, which is what the sheet is built to — the canvas is
  // rebuilt at it rather than the drawing being stretched onto it. Rounded by
  // `flowAspect`, so a viewport that moves by a pixel is not a repaint.
  const aspect = w / h;
  const [surface] = useState(() => (
    typeof document === 'undefined' ? null : flowSurface(aspect)
  ));
  const L = flowLayout(aspect);
  const halo = useRef([]);
  const bead = useRef(null);
  const beadMat = useRef(null);
  // What the bead is walked across, held in a ref: a resize must move the bead,
  // not restart the run it is in the middle of.
  const across = useRef([w, h, aspect]);
  across.current = [w, h, aspect];

  const haloMap = flowHalo();
  const beadMap = flowBead();

  useEffect(() => {
    if (!surface) return;
    // `sizeFlow` first, and only then paint: writing `canvas.width` wipes the
    // canvas, so the order is not a preference.
    sizeFlow(surface, aspect);
    paintFlow(surface.canvas, aspect, locale);
    surface.texture.needsUpdate = true;
    invalidateScene();
  }, [surface, aspect, locale]);

  useEffect(() => {
    // Every lamp back to nothing, which is the sheet at rest — the settle
    // `useScreenLife` performs, and for its reason: a landing that goes dark
    // mid-run must not come back with one layer still alight.
    const settle = () => {
      for (const m of halo.current) if (m) m.opacity = 0;
      if (beadMat.current) beadMat.current.opacity = 0;
      invalidateScene();
    };

    // NBC-25: the impulse is a bead travelling down a wire. `settle` leaves the
    // sheet at rest — the diagram itself, painted and lit — which is the whole
    // of what the screen has to say without it.
    if (!live || still) {
      settle();
      return undefined;
    }

    const t0 = performance.now();
    let timer = 0;
    const step = () => {
      const [pw, ph, a] = across.current;
      const { u, lit } = flowAt(performance.now() - t0, a);
      lit.forEach((level, i) => {
        const m = halo.current[i];
        if (m) m.opacity = level;
      });
      if (beadMat.current) {
        beadMat.current.opacity = u === null
          ? 0
          : Math.max(0, Math.min(1, u / FLOW_EDGE, (1 - u) / FLOW_EDGE));
      }
      if (u !== null && bead.current) {
        const [px, py] = pathAt(u, a);
        const box = flowLayout(a);
        // canvas pixels to the plane's own space: +x right, +y *up*
        bead.current.position.x = (px / box.w - 0.5) * pw;
        bead.current.position.y = (0.5 - py / box.h) * ph;
      }
      invalidateScene();
      timer = setTimeout(step, FLOW_TICK_MS);
    };
    step();

    return () => {
      clearTimeout(timer);
      settle();
    };
  }, [live, still]);

  if (!surface) return null;

  // The bead is square in the room, not in canvas fractions: a blob sized off
  // one axis of a canvas this far from square arrives as an egg. Small — at a
  // tenth of the glass it stopped reading as a thing travelling down a wire and
  // started reading as the corner of the sheet going bright.
  const beadSize = h * 0.055;

  return (
    <group position={[0, y, z]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {haloMap && L.boxes.map((b, i) => (
        <mesh
          key={STATIONS[i].id}
          position={[
            ((b.x + b.w / 2) / L.w - 0.5) * w,
            (0.5 - (b.y + b.h / 2) / L.h) * h,
            0.2,
          ]}
        >
          {/* a shade over the box, so the glow spills onto the tube around it
              rather than stopping dead on the rule it is lighting */}
          <planeGeometry args={[(b.w / L.w) * w * 1.06, (b.h / L.h) * h * 1.16]} />
          <meshBasicMaterial
            ref={(m) => { halo.current[i] = m; }}
            map={haloMap}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {beadMap && (
        <mesh ref={bead} position={[0, 0, 0.4]}>
          <planeGeometry args={[beadSize, beadSize]} />
          <meshBasicMaterial
            ref={beadMat}
            map={beadMap}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * The 3. OG screen: the route card of the district this workshop stands in.
 *
 * ── the mounting is the terminal's, whole ───────────────────────────────────
 * Built once and never unbuilt, the canvas carrying the state, every write
 * asking the *scene* for a frame rather than this canvas. All three are argued
 * at length on `TerminalLog` above and none is a style.
 *
 * ── and the sheet is the glass ──────────────────────────────────────────────
 * The whole opening, edge to edge, and not a drawing fitted inside it. The
 * canvas is **rebuilt** at the glass's own shape rather than stretched onto it —
 * a map stretched is a map with the wrong distances on it, which is the one
 * thing this screen may not have. See the head of `nrwMap.js`.
 *
 * The only thing that repaints is a change of shape. What moves is a single
 * ring of light out of the cross, written straight to its material and its
 * transform — never through React state, which would re-render the whole
 * landing eighteen times a second for two floats.
 */
function NrwMap({ y, z, w, h, live }) {
  const still = useReducedMotion();
  const locale = useSceneLocale();
  const aspect = w / h;
  const [surface] = useState(() => (
    typeof document === 'undefined' ? null : mapSurface(aspect)
  ));
  const ring = useRef(null);
  const ringMat = useRef(null);
  // What the ring is drawn across, held in a ref: a resize must move and resize
  // the ring, not restart the beacon in the middle of a run.
  const across = useRef([w, h, aspect]);
  across.current = [w, h, aspect];

  const pingMap = mapPing();

  useEffect(() => {
    if (!surface) return;
    // `sizeMap` first, and only then paint: writing `canvas.width` wipes the
    // canvas, so the order is not a preference.
    sizeMap(surface, aspect);
    paintMap(surface.canvas, aspect, locale);
    surface.texture.needsUpdate = true;
    invalidateScene();
  }, [surface, aspect, locale]);

  useEffect(() => {
    // Back to nothing, which is the card at rest — the settle `useScreenLife`
    // performs, and for its reason: a landing that goes dark mid-run must not
    // come back with a ring frozen half way out.
    const settle = () => {
      if (ringMat.current) ringMat.current.opacity = 0;
      invalidateScene();
    };

    // NBC-25: the ping is a ring going out across the map, and a ring going out
    // is travel. `settle` leaves the card at rest, which still names every town
    // on it.
    if (!live || still) {
      settle();
      return undefined;
    }

    const t0 = performance.now();
    let timer = 0;
    const step = () => {
      const [pw, ph, a] = across.current;
      const L = mapLayout(a);
      const { k, alpha } = pingAt(performance.now() - t0);
      if (ringMat.current) ringMat.current.opacity = alpha;
      if (ring.current) {
        // canvas pixels to the plane's own space: +x right, +y *up*, and the
        // ring stays a circle because the canvas is built at the plane's own
        // shape — its pixels are square in the room.
        ring.current.position.x = (L.home.px / L.w - 0.5) * pw;
        ring.current.position.y = (0.5 - L.home.py / L.h) * ph;
        const reach = (L.field.h * PING_REACH * 2 * k) / L.h;
        ring.current.scale.setScalar(Math.max(1e-4, reach * ph));
      }
      invalidateScene();
      timer = setTimeout(step, FLOW_TICK_MS);
    };
    step();

    return () => {
      clearTimeout(timer);
      settle();
    };
  }, [live, still]);

  if (!surface) return null;

  return (
    <group position={[0, y, z]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {pingMap && (
        // A unit plane the tick scales, rather than a geometry rebuilt per
        // frame: a `planeGeometry` written eighteen times a second is eighteen
        // buffers a second for the driver to let go of.
        <mesh ref={ring} position={[0, 0, 0.3]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={ringMat}
            map={pingMap}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * The 2. OG screen's picture tube: whichever shot of the archive the console has
 * paged to.
 *
 * ── it inherits the terminal's rules whole ──────────────────────────────────
 * Built once and never unbuilt, the canvas carrying the state, and every paint
 * asking the *scene* for a frame rather than this canvas. All three are written
 * out at length on `TerminalLog` above and none of them is a style: the mount
 * that was removed there was a shader compiled on the frame the leaves finish
 * parting, and it would be the same mount and the same frame here.
 *
 * ── what is new is that the picture arrives late ────────────────────────────
 * A shot is a file, and a file is not there on the commit that asks for it. So
 * the tube is painted twice when it has to be: once immediately, with the
 * picture's own box empty, and again when the image lands. `readyShot` is what
 * keeps that from being the common case — paging back to something already
 * looked at paints once, on the same commit the counter moved, because the
 * decoded image is still in hand.
 *
 * With nothing in the archive at all there is no shot to wait for and the glass
 * shows a test card. See `paintStandby`.
 */
function ProjectSlide({ y, z, w, h, page, aspect, onImageClick }) {
  const [surface] = useState(() => (typeof document === 'undefined' ? null : gallerySurface()));
  const locale = useSceneLocale();

  useEffect(() => {
    if (!surface) return undefined;
    const show = () => {
      surface.texture.needsUpdate = true;
      invalidateScene();
    };
    const slide = SLIDES[page] ?? null;
    if (!slide) {
      paintStandby(surface.canvas, aspect, locale);
      show();
      return undefined;
    }
    const held = readyShot(slide.src);
    paintSlide(surface.canvas, held, slide, aspect, undefined, locale);
    show();
    if (held) return undefined;

    let live = true;
    const missing = () => t('screen.archive.missing', locale);
    loadShot(slide.src)
      .then((img) => { if (live) { paintSlide(surface.canvas, img, slide, aspect, undefined, locale); show(); } })
      .catch(() => {
        if (live) { paintSlide(surface.canvas, null, slide, aspect, missing(), locale); show(); }
      });
    return () => { live = false; };
  }, [surface, page, aspect, locale]);

  // Paging off this floor mid-hover unmounts this mesh without ever firing
  // `onPointerOut` — three.js has nothing left to raycast against, so the
  // pointer leaving is never detected. Left uncleared the cursor would stay
  // `zoom-in` everywhere else in the scene. Unconditional, ahead of the
  // `surface` guard below — a hook cannot follow an early return.
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  if (!surface) return null;

  const slide = SLIDES[page] ?? null;
  const imageSrc = slide?.src ?? null;

  const handlePointerOver = () => {
    if (imageSrc) document.body.style.cursor = 'zoom-in';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = '';
  };
  const handleClick = (e) => {
    e.stopPropagation();
    if (imageSrc && onImageClick) onImageClick();
  };

  return (
    <mesh
      position={[0, y, z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * One landing's wall screen: a dark cast frame set into the back wall, and a
 * fluted glass panel recessed inside it. Floor 0 carries the terminal; the rest
 * are bare glow until there is something to put on them.
 *
 * Sized off the doorway itself (`left`/`w`), not the wider back wall behind
 * it — the room runs past the opening on every side (see `Landing` in
 * `ShaftScene.jsx`), and a screen built to that width read as continuing on
 * past what the doorway actually frames. And it stands on only one half of
 * that width, `side` picking which: the page content takes the other half,
 * see `SCREEN_SIDE` in `lift/decks.js`.
 */
function LandingScreen({
  floor, side, left, w, floorY, ceilingY, back, live, doorOpen, doorShut,
}) {
  const t = SCREEN_TUNING.find((t) => t.floor === floor)?.tuning ?? SCREEN_TUNING[0].tuning;
  const half = w / 2;
  // ── the console's state, and where it actually lives now ───────────────────
  // Which picture of the archive is loaded. It used to be `useState` here, kept
  // across a visit because the lift comes back to a floor often and a gallery
  // that rewinds itself every time the doors shut is a gallery nobody gets to
  // the end of. It still is kept — `Dieselpunk` outlives every visit just as
  // this component did — but it moved up there because the fullscreen modal
  // pages the same number, and a modal rendered outside the Canvas cannot
  // reach state held inside it. See `fullscreenImage.js`.
  const { page, step, openFullscreenImage } = useFullscreenGallery();
  const pages = SLIDES.length;
  const slide = SLIDES[page] ?? null;
  const slotLeft = side === 'left' ? left : left + half;
  const frameLeft = slotLeft + (side === 'left' ? t.outerMarginX : t.innerMarginX);
  const frameW = half - t.outerMarginX - t.innerMarginX;
  const cx = frameLeft + frameW / 2;
  const cy = (floorY + ceilingY) / 2;
  const frameH = (floorY - ceilingY) - t.marginTop - t.marginBottom;

  // Projekte is the floor that gets a control panel rather than a vent — it is
  // the only deck with anything to page through — so it is the one variant
  // named by floor. `DECKS` indexes it 2; see `lift/decks.js`.
  const variant = floor === 2 ? 'console' : 'plain';
  const m = frameMetrics(frameW, frameH, variant === 'console');

  const glow = screenGlow(40);

  // ── the screen is running, not printed ──────────────────────────────────────
  // Three slots handed to `useScreenLife`: the panel's own material, the eight
  // pieces of bead `ScreenFrame` hands back, and the frame bar's map. The
  // waveform is one, deliberately — the bead is lit *by* the glass, so the two
  // flickering off separate clocks would be the same fault `useRideMotion` was
  // written to end.
  const panel = useRef([]);
  const spill = useRef([]);
  const lit = useMemo(() => [panel, spill], []);
  // Cloned per landing so the bar's phase belongs to this screen. `bake` caches
  // by key, and several landings are furnished at once during a ride — sharing
  // the texture would have two drivers writing one offset, and both would win
  // every other tick. A clone shares the image, so this is a descriptor rather
  // than a second upload.
  const rasterSrc = screenRaster();
  const raster = useMemo(() => {
    if (!rasterSrc) return null;
    const map = rasterSrc.clone();
    map.needsUpdate = true;
    return map;
  }, [rasterSrc]);
  useEffect(() => () => raster?.dispose(), [raster]);
  useScreenLife(lit, raster, live);


  // One group at the wall, and everything inside it in the frame's own space:
  // +z out of the plaster, +y up. The frame's tiers are all offsets from the
  // wall, and re-adding `back` to each of them at the call site is how they
  // would drift apart.
  return (
    <group position={[cx, worldY(cy), back]}>
      {/* `live` gates the buttons' invitation on the doors actually being
          open, the same way the patch bay's lamps are gated — see
          `buttonPulse.js` for why a demand-driven scene cares. */}
      <ScreenFrame
        w={frameW} h={frameH} variant={variant} live={doorOpen} spill={spill}
        gallery={{ page, pages, title: slide?.title ?? '', url: slide?.url ?? null }}
        onPage={step}
      />
      <mesh position={[0, m.glassY, m.glassZ]}>
        <planeGeometry args={[m.glassW, m.glassH]} />
        <meshStandardMaterial
          ref={(mat) => { panel.current[0] = mat; }}
          userData={{ selfLit: true }}
          color="#120f0c"
          emissive="#ffe6c4"
          emissiveIntensity={0.5}
          emissiveMap={glow}
          roughness={0.32}
        />
      </mesh>
      {floor === 0 && (
        // The whole glass, edge to edge — the same call as the 1. OG sheet below
        // and for the same reason: a picture fitted inside the opening leaves
        // bare fluted glass down both sides and reads as a window open on a
        // screen. Nothing is stretched to manage it; the *page* of monospace
        // inside is still a fixed grid, centred on a tube built at the opening's
        // own shape. See the head of `terminal.js`.
        <TerminalLog
          y={m.glassY} z={m.glassZ + 0.5}
          w={m.glassW} h={m.glassH}
          open={doorOpen} shut={doorShut}
        />
      )}
      {floor === 1 && (
        // The whole glass, edge to edge, and *not* fitted inside it the way the
        // terminal is. A tube shows its picture to the rim; a drawing floating
        // in the middle of one with bare fluted glass down either side reads as
        // a window open on a screen, which is exactly what Mykolai saw in the
        // first cut. Nothing is stretched to manage it — the sheet is built at
        // the opening's own shape. See the head of `flow.js`.
        //
        // On `live` rather than `doorOpen`, unlike the terminal above. The
        // terminal has something to replay on each arrival and wants the doors;
        // this runs whether or not anyone came, which is what a machine on a
        // wall does — and `doorOpen` is the wiring that left the valve rack dead
        // in an open doorway for the better part of a second. See `Landing`.
        <RequestFlow
          y={m.glassY} z={m.glassZ + 0.5}
          w={m.glassW} h={m.glassH}
          live={live}
        />
      )}
      {floor === 2 && (
        // Stretched to the glass rather than fitted to a box inside it, which
        // is the opposite of the terminal's rule and for the opposite reason:
        // there is no type on this canvas whose letterforms a stretch would
        // give away, and a picture fitted inside a *second* rectangle inside a
        // portrait screen ends up the size of a stamp. The canvas is told the
        // glass's own aspect instead and lays the photograph out against it —
        // see `fitShot`.
        <ProjectSlide
          y={m.glassY} z={m.glassZ + 0.5}
          w={m.glassW * t.screenFill} h={m.glassH * t.screenFill}
          page={page} aspect={m.glassW / m.glassH}
          onImageClick={openFullscreenImage}
        />
      )}
      {floor === 3 && (
        // The whole glass, edge to edge — the 1. OG's rule and not the picture
        // tube's `screenFill`. A map is the one drawing on this wall that must
        // not be scaled to fit something: the distances printed on it are the
        // point of it. See the head of `nrwMap.js`.
        //
        // On `live` rather than `doorOpen`, like the request sheet above: a
        // beacon does not wait for somebody to arrive, and `doorOpen` is the
        // wiring that left the valve rack dead in an open doorway for the
        // better part of a second. See `Landing`.
        <NrwMap
          y={m.glassY} z={m.glassZ + 0.5}
          w={m.glassW} h={m.glassH}
          live={live}
        />
      )}
      {raster && (
        // The frame bar, laid over the whole panel — the print included, which
        // is the point: a bar that stops at the edge of the text is a shadow on
        // the glass, and one that crosses it is the tube redrawing. Multiply
        // rather than additive, because a roll bar is the field that has *not*
        // been drawn yet; there is nothing there to add. `renderOrder` because
        // it and the terminal are both transparent and both write no depth, and
        // which of the two lands first should not be left to a sort.
        <mesh position={[0, m.glassY, m.glassZ + 1.1]} renderOrder={1}>
          <planeGeometry args={[m.glassW, m.glassH]} />
          <meshBasicMaterial
            map={raster}
            transparent
            // three refuses `MultiplyBlending` without it, and it costs nothing
            // here: the mask is fully opaque, so premultiplying by its own alpha
            // leaves every value exactly where it was baked.
            premultipliedAlpha
            depthWrite={false}
            blending={MultiplyBlending}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

export default LandingScreen;
