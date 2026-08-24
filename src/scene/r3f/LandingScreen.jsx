import { useEffect, useRef, useState } from 'react';
import { worldY } from '../renderers/r3f/camera.js';
import { screenGlow } from '../renderers/r3f/patterns.js';
import { FRAMES, SPAN, clearMark, markStrip, markSurface, paintMark } from '../renderers/r3f/screenMark.js';
import { invalidateScene } from '../renderers/r3f/frames.js';
import ScreenFrame, { frameMetrics } from './ScreenFrame.jsx';

// The wall screen every landing shares: a fluted glass panel recessed into a
// frame on the back wall, the same ribbing the arcade cabinet's own screen
// uses. Plain exported numbers rather than a live panel — this is layout, not
// a taste call judged frame-to-frame like the lighting rig — so Mykolai can
// nudge them by hand here whenever the landing's proportions change.
//
// The frame's own dimensions are not here: how wide a band is, how far each of
// its tiers stands off the wall and where the glass sits inside it are all
// fractions of the panel, and they live with the geometry that reads them —
// `ScreenFrame.jsx`. What is left here is where on the wall the panel goes.
export const SCREEN_TUNING = {
  outerMarginX: -118,
  innerMarginX: 196,
  marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
  marginTop: 110, // gap under the cornice
  marginBottom: 110, // gap above the skirting
  markSize: 0.72, // the logo's size as a fraction of the glass height
};

/**
 * The mark, drawing itself in on the ground-floor screen only.
 *
 * Lifted from `ArcadeCabinet`'s own `ScreenMark`: same canvas, same reveal,
 * just aimed at a plain plane instead of the cabinet's glass mesh, which is
 * why it needs no `planarUV` — a `planeGeometry` already unwraps 0..1 the
 * way this wants.
 *
 * The landing this mounts in is built once and kept around hidden rather than
 * unbuilt — see `Landing` — so the strip is decoded eagerly but held on the
 * first frame until `open` says the leaves have actually finished parting.
 * Starting on mount instead used to run the whole reveal behind a shut (or
 * still-opening) door, so by the time anyone could see the screen the
 * animation was already over.
 *
 * It plays again on every arrival, not just once for the life of the page —
 * `shut` clears the mark back to nothing the moment the doors have fully
 * closed, so an unrelated trip through another floor cannot leave it sitting
 * half a reveal ahead of where its own door is.
 */
function LogoMark({ x, y, z, size, open, shut }) {
  const [surface] = useState(() => (typeof document === 'undefined' ? null : markSurface()));
  const [frames, setFrames] = useState(null);
  const raf = useRef(0);
  // has this open cycle already shown its reveal — cleared on the next full close
  const playing = useRef(false);

  useEffect(() => {
    if (!surface) return undefined;
    let live = true;
    markStrip().then((loaded) => {
      if (live && loaded.length) setFrames(loaded);
    });
    return () => { live = false; };
  }, [surface]);

  useEffect(() => {
    if (!surface) return undefined;
    if (shut) {
      playing.current = false;
      // Wiped, not unmounted — see the note on the mesh below.
      clearMark(surface.canvas);
      surface.texture.needsUpdate = true;
      invalidateScene();
      return undefined;
    }
    if (!frames || !open || playing.current) return undefined;
    playing.current = true;
    let live = true;
    // `paintMark` runs two shadow-blur passes over a 512² canvas — cheap once,
    // not sixty times a second. rAF ticks far more often than the strip has
    // stills, so most ticks would ask to redraw a frame already on the canvas;
    // this only repaints when the chosen still actually changes.
    let lastIndex = -1;
    const show = (index) => {
      if (index === lastIndex) return;
      lastIndex = index;
      paintMark(surface.canvas, frames[index]);
      surface.texture.needsUpdate = true;
      // The whole scene, not this canvas. The reveal runs for two seconds with
      // the lift standing still, so both canvases are on demand — and asking
      // only this one left the near canvas, which holds the doors, sitting out
      // a couple of thousand composites without drawing. That is the door
      // flicker: see `frames.js`.
      invalidateScene();
    };
    const t0 = performance.now();
    const step = () => {
      if (!live) return;
      const p = Math.min(1, (performance.now() - t0) / (SPAN * 1000));
      show(Math.min(frames.length - 1, Math.round(p * (FRAMES - 1))));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    show(0);
    raf.current = requestAnimationFrame(step);
    return () => { live = false; cancelAnimationFrame(raf.current); };
  }, [surface, frames, open, shut]);

  if (!surface) return null;
  // **Built once, and never unbuilt.** This mesh used to be gated on the reveal
  // having started — `null` until the doors opened, `null` again once they shut —
  // and that is a mount and an unmount on every single visit to this floor. A
  // mount is a fresh material, a fresh material is a shader compiled and a
  // program linked, and the driver does that work synchronously on the frame
  // that asks for it. The frame that asked was the one where the leaves finish
  // parting, so arriving at the ground floor stuttered right at the end of the
  // animation — every time, and nowhere else, because this is the only landing
  // that carries the mark. Measured: two `compileShader` calls and a
  // `linkProgram` on each arrival here, none at all on any other floor.
  //
  // So the mesh stays for the life of the page and the *canvas* carries the
  // state. Cleared, it is fully transparent and draws nothing; there is no
  // `visible` flag to get wrong, and it is on screen during the boot warm-up
  // (`Landing` forces its fittings visible under `warm`), which is where the one
  // compile it ever needs now happens — behind the black rectangle, with nobody
  // looking. This is the rule `Landing` states for the room around it; the mark
  // was the one thing in here still breaking it.
  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={surface.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/**
 * One landing's wall screen: a dark cast frame set into the back wall, and a
 * fluted glass panel recessed inside it. Floor 0 carries the mark reveal;
 * the rest are bare glow until there is something to put on them.
 *
 * Sized off the doorway itself (`left`/`w`), not the wider back wall behind
 * it — the room runs past the opening on every side (see `Landing` in
 * `ShaftScene.jsx`), and a screen built to that width read as continuing on
 * past what the doorway actually frames. And it stands on only one half of
 * that width, `side` picking which: the page content takes the other half,
 * see `SCREEN_SIDE` in `lift/decks.js`.
 */
function LandingScreen({ floor, side, left, w, floorY, ceilingY, back, doorOpen, doorShut }) {
  const t = SCREEN_TUNING;
  const half = w / 2;
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

  // One group at the wall, and everything inside it in the frame's own space:
  // +z out of the plaster, +y up. The frame's tiers are all offsets from the
  // wall, and re-adding `back` to each of them at the call site is how they
  // would drift apart.
  return (
    <group position={[cx, worldY(cy), back]}>
      <ScreenFrame w={frameW} h={frameH} variant={variant} />
      <mesh position={[0, m.glassY, m.glassZ]}>
        <planeGeometry args={[m.glassW, m.glassH]} />
        <meshStandardMaterial
          userData={{ selfLit: true }}
          color="#120f0c"
          emissive="#ffe6c4"
          emissiveIntensity={0.5}
          emissiveMap={glow}
          roughness={0.32}
        />
      </mesh>
      {floor === 0 && (
        <LogoMark
          x={0} y={m.glassY} z={m.glassZ + 0.5} size={m.glassH * t.markSize}
          open={doorOpen} shut={doorShut}
        />
      )}
    </group>
  );
}

export default LandingScreen;
