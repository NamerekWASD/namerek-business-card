import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MultiplyBlending } from 'three';
import { worldY } from '../renderers/r3f/camera.js';
import { screenGlow, screenRaster } from '../renderers/r3f/patterns.js';
import useScreenLife from '../renderers/r3f/screenLife.js';
import { invalidateScene } from '../renderers/r3f/frames.js';
import {
  CHANGE_MS, NOTICE_ASPECT, noticeSurface, paintNotice, swapped, warmUp,
} from '../renderers/r3f/notice.js';
import { SLIDES } from '../../decks/projects.js';
import ScreenFrame, { frameMetrics } from './ScreenFrame.jsx';
import { useFullscreenGallery } from './fullscreenImage.js';
import useReducedMotion from '../../motion/reduced.js';

// ── the works notice, 2. OG ──────────────────────────────────────────────────
// The description of whatever job is on the glass, on a screen of its own on
// the back wall. It replaces an enamel plate of selectable HTML, and the whole
// argument for the swap is in the header of `notice.js`: nobody has any reason
// to copy this sentence, and what it actually has to do — be seen changing —
// is the one thing a plate cannot do and a tube can.
//
// It is the same object as the landing screens, built a size down. Same frame,
// same fluted glass, same hum and roll bar, and the bands come out proportion-
// ately narrower because `ScreenFrame` measures every member as a fraction of
// the panel — which is exactly what Mykolai asked for ("похож на тот что на
// других этажах ... но с меньшими рамками") and why no second frame was drawn.
//
// ── the two writers, and how they stay apart ─────────────────────────────────
// `useScreenLife` owns `emissiveIntensity` on the glass and the bead, as it
// does on every other screen in the building. The fade and the strike are
// carried by the *print* plane's own colour instead, and by nothing else. One
// property, one writer — the rule `useRideMotion` was written to enforce and
// the one this component would otherwise break twice a second.
//
// The fade to black works because of what is on the print canvas: `paintNotice`
// lays down a nearly opaque tube before it prints a word, so a plane multiplied
// to zero is a dead screen rather than a transparent one. What survives is a
// thread of the frame's own glow round the very edge, where the tube's gradient
// thins out — which is what a dark tube in a lit surround actually looks like.

/** What the glass rests at, and what `useScreenLife` multiplies. */
const GLASS_EMISSIVE = 0.5;

/** How often the print is resampled while nothing is changing. */
const IDLE_MS = 90;

/**
 * @param {{ x: number, y: number, z: number, w: number, live?: boolean }} props
 *   `y` is a landing y, not a world one — `worldY` is applied here, the way
 *   every other prop on this wall does it.
 */
function NoticeScreen({ x, y, z, w, live = true }) {
  const still = useReducedMotion();
  const gallery = useFullscreenGallery();
  const slide = SLIDES[gallery?.page ?? 0] ?? null;
  // Which project, not which frame. Six shots of one job are one job, and a
  // description that restrikes on every press of NEXT is a description that
  // looks like it changed when it did not. Same rule the box on the belt and
  // the console's own plate follow.
  const blurb = slide?.blurb ?? '';

  const [surface] = useState(() => (typeof document === 'undefined' ? null : noticeSurface()));
  // What is actually on the canvas — `null` until the first paint, which is
  // how arriving on the floor is told apart from a change made while standing
  // on it. The first one goes up without a strike; a screen that flashes at
  // you for having walked into the room is a screen that cried wolf.
  const shown = useRef(null);
  const changedAt = useRef(null);
  // Read by the ticker, which must not be rebuilt on every page of the console.
  const blurbRef = useRef(blurb);
  blurbRef.current = blurb;

  const paint = useCallback((text) => {
    if (!surface || shown.current === text) return;
    shown.current = text;
    paintNotice(surface.canvas, text);
    surface.texture.needsUpdate = true;
  }, [surface]);

  useEffect(() => {
    if (shown.current === null) {
      paint(blurb);
      invalidateScene();
      return;
    }
    if (shown.current === blurb) return;
    // NBC-25. The strike is the tube going dark and coming back up — a flicker,
    // and the one this scene plays *at* the visitor rather than around them.
    // The new text goes up in its place, with no interval in which the screen
    // is anything but a lit screen.
    if (still) {
      paint(blurb);
      invalidateScene();
      return;
    }
    changedAt.current = performance.now();
  }, [blurb, paint, still]);

  const panel = useRef([]);
  const spill = useRef([]);
  const lit = useMemo(() => [panel, spill], []);
  const print = useRef(null);

  // Cloned per screen so the bar's phase belongs to this one — `bake` caches by
  // key, and this screen shares that key with four landing screens. Two drivers
  // on one offset both win every other tick.
  const rasterSrc = screenRaster();
  const raster = useMemo(() => {
    if (!rasterSrc) return null;
    const map = rasterSrc.clone();
    map.needsUpdate = true;
    return map;
  }, [rasterSrc]);
  useEffect(() => () => raster?.dispose(), [raster]);
  useScreenLife(lit, raster, live);

  useEffect(() => {
    if (!live) return undefined;
    if (still) {
      // Including a strike caught half way through by the preference being
      // turned on: the new text goes up now and the print goes back to its
      // resting colour, rather than being left mid-fade.
      changedAt.current = null;
      paint(blurbRef.current);
      if (print.current) print.current.color.setScalar(warmUp(null));
      invalidateScene();
      return undefined;
    }
    let raf = 0;
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const at = changedAt.current;
      const ms = at === null ? null : now - at;
      const changing = ms !== null && ms < CHANGE_MS;
      // Idle, this is a few property writes and no frame asked for. It is only
      // during the change that the scene is woken, which is the same bargain
      // the belt and the pilot lamps strike with `frameloop="demand"`.
      if (!changing && now - last < IDLE_MS) return;
      last = now;
      if (ms !== null && swapped(ms)) paint(blurbRef.current);
      if (print.current) print.current.color.setScalar(warmUp(ms));
      if (ms === null) return;
      if (!changing) changedAt.current = null;
      invalidateScene();
    };
    raf = requestAnimationFrame(tick);
    // Nothing to undo. An idle tick writes `warmUp(null)`, which is exactly the
    // resting level, so the first tick after the landing comes back puts a
    // screen that went dark mid-strike back where it belongs.
    return () => cancelAnimationFrame(raf);
  }, [live, still, paint]);

  // The glass is what is sized here, not the panel: the print is a canvas of
  // fixed proportions and the opening has to be that shape or the frame is
  // holding a letterbox. `band` is a fraction of the width alone, so it can be
  // asked for before the height it helps decide.
  const { band } = frameMetrics(w, 1);
  const h = w / NOTICE_ASPECT + band * 2;
  const m = frameMetrics(w, h);
  const glow = screenGlow(40);
  // Fitted inside the glass rather than stretched to it, the terminal's rule
  // and for the terminal's reason: this is type on a canvas of fixed
  // proportions, and a viewport of another shape must move the *box*, never the
  // letterforms in it.
  const fitW = Math.min(m.glassW * 0.95, m.glassH * 0.95 * NOTICE_ASPECT);

  return (
    <group position={[x, worldY(y), z]}>
      <ScreenFrame w={w} h={h} spill={spill} />
      <mesh position={[0, m.glassY, m.glassZ]}>
        <planeGeometry args={[m.glassW, m.glassH]} />
        <meshStandardMaterial
          ref={(mat) => { panel.current[0] = mat; }}
          userData={{ selfLit: true }}
          color="#120f0c"
          emissive="#ffe6c4"
          emissiveIntensity={GLASS_EMISSIVE}
          emissiveMap={glow}
          roughness={0.32}
        />
      </mesh>
      {surface && (
        <mesh position={[0, m.glassY, m.glassZ + 0.5]}>
          <planeGeometry args={[fitW, fitW / NOTICE_ASPECT]} />
          <meshBasicMaterial
            ref={print}
            map={surface.texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {raster && (
        // Over the print as well as the glass, which is the point: a bar that
        // stops at the edge of the text is a shadow, and one that crosses it is
        // the tube redrawing. The reasoning in full is on `LandingScreen`.
        <mesh position={[0, m.glassY, m.glassZ + 1.1]} renderOrder={1}>
          <planeGeometry args={[m.glassW, m.glassH]} />
          <meshBasicMaterial
            map={raster}
            transparent
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

export default NoticeScreen;
