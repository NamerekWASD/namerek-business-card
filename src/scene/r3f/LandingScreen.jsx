import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { SURFACES } from '../model/materials.js';
import { surfaceProps } from '../renderers/r3f/surfaceMaterial.js';
import { worldY } from '../renderers/r3f/camera.js';
import { screenGlow } from '../renderers/r3f/patterns.js';
import { FRAMES, SPAN, markStrip, markSurface, paintMark } from '../renderers/r3f/screenMark.js';

// The wall screen every landing shares: a fluted glass panel recessed into a
// frame on the back wall, the same ribbing the arcade cabinet's own screen
// uses. Plain exported numbers rather than a live panel — this is layout, not
// a taste call judged frame-to-frame like the lighting rig — so Mykolai can
// nudge them by hand here whenever the landing's proportions change.
export const SCREEN_TUNING = {
  marginX: 46, // gap from the doorway's own edges — outer wall side and centre gutter alike
  marginTop: 70, // gap under the cornice
  marginBottom: 70, // gap above the skirting
  frameInset: 18, // how far the glass sits inside its own frame lip
  frameDepth: 10, // how proud the frame stands off the wall
  glassDepth: 4, // how proud the glass stands off the frame
  markSize: 0.72, // the logo's size as a fraction of the glass height
};

// The reveal plays once for the life of the page, the same rule the cabinet's
// own mark used to follow — the landing this screen belongs to mounts and
// unmounts as it comes in and out of ride range, and a logo that redraws
// itself every arrival would be a tic rather than a flourish.
let revealed = false;

/**
 * The mark, drawing itself in on the ground-floor screen only.
 *
 * Lifted from `ArcadeCabinet`'s own `ScreenMark`: same canvas, same reveal,
 * just aimed at a plain plane instead of the cabinet's glass mesh, which is
 * why it needs no `planarUV` — a `planeGeometry` already unwraps 0..1 the
 * way this wants.
 */
function LogoMark({ x, y, z, size }) {
  const invalidate = useThree((s) => s.invalidate);
  const [surface] = useState(() => (typeof document === 'undefined' ? null : markSurface()));
  const [ready, setReady] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!surface) return undefined;
    let live = true;
    markStrip().then((frames) => {
      if (!live || !frames.length) return;
      const last = frames[frames.length - 1];
      const show = (frame) => {
        paintMark(surface.canvas, frame);
        surface.texture.needsUpdate = true;
        invalidate();
      };
      if (revealed) { show(last); setReady(true); return; }
      revealed = true;
      const t0 = performance.now();
      const step = () => {
        if (!live) return;
        const p = Math.min(1, (performance.now() - t0) / (SPAN * 1000));
        show(frames[Math.min(frames.length - 1, Math.round(p * (FRAMES - 1)))]);
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      show(frames[0]);
      setReady(true);
      raf.current = requestAnimationFrame(step);
    });
    return () => { live = false; cancelAnimationFrame(raf.current); };
  }, [surface, invalidate]);

  if (!surface || !ready) return null;
  return (
    <mesh position={[x, worldY(y), z]}>
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
function LandingScreen({ floor, side, left, w, floorY, ceilingY, back }) {
  const t = SCREEN_TUNING;
  const half = w / 2;
  const slotLeft = side === 'left' ? left : left + half;
  const cx = slotLeft + half / 2;
  const cy = (floorY + ceilingY) / 2;
  const frameW = half - t.marginX * 2;
  const frameH = (floorY - ceilingY) - t.marginTop - t.marginBottom;
  const glassW = frameW - t.frameInset * 2;
  const glassH = frameH - t.frameInset * 2;
  const frameCenterZ = back + t.frameDepth / 2;
  const glassZ = back + t.frameDepth + t.glassDepth;

  const glow = screenGlow();

  return (
    <group>
      <mesh position={[cx, worldY(cy), frameCenterZ]} castShadow receiveShadow>
        <boxGeometry args={[frameW, frameH, t.frameDepth]} />
        <meshStandardMaterial {...surfaceProps(SURFACES.cabinetFrame, 1)} />
      </mesh>
      <mesh position={[cx, worldY(cy), glassZ]}>
        <planeGeometry args={[glassW, glassH]} />
        <meshStandardMaterial
          userData={{ selfLit: true }}
          color="#120f0c"
          emissive="#ffe6c4"
          emissiveIntensity={1.1}
          emissiveMap={glow}
          roughness={0.32}
        />
      </mesh>
      {floor === 0 && (
        <LogoMark x={cx} y={cy} z={glassZ + 0.5} size={glassH * t.markSize} />
      )}
    </group>
  );
}

export default LandingScreen;
