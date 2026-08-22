import { useEffect, useRef } from 'react';
import { LAYERS } from '../scene/layers.js';
import { FADE_MS, SPIN_MS, chase, idleCreep } from './plan.js';
import {
  DRIVER_TEETH, IDLER_PHASE, IDLER_TEETH, gearPath, idlerAngle, ratchetAngle, spinAngle,
} from './gears.js';

// The first thing anybody sees: a black screen with a pair of gears in the
// corner, taking up one tooth at a time while the scene behind it loads.
//
// It is black and it is nearly empty on purpose. Everything this site has to
// say is in a room that has not been lit yet, and a loading screen that tries
// to introduce that room ahead of time spends the reveal before it happens. A
// mechanism turning over in the dark says the same thing in the same language
// and gives the reveal away for nothing.
//
// The gears are drawn once and never re-rendered. Their angles are written
// straight onto the two `<g>` elements from an animation frame — see the loop
// below — because they change every frame and React has no business hearing
// about it. The same rule the ride already follows for the backdrop and the
// deck column.

// The driver sits low and right, the idler up and to its left, exactly one
// pitch apart so the teeth actually mesh. Anything else and the two wheels
// visibly slip past each other.
const DRIVER = { rTip: 54, rRoot: 43, teeth: DRIVER_TEETH };
const IDLER = { rTip: 36, rRoot: 27, teeth: IDLER_TEETH };
const CENTRES = 48.5 + 31.5;
const IDLER_AT = (205 * Math.PI) / 180;
const IDLER_X = CENTRES * Math.cos(IDLER_AT);
const IDLER_Y = CENTRES * Math.sin(IDLER_AT);

const IRON = '#221b13';
const BRASS = '#8a6a35';
const RIM = '#c2903f';

/** The spokes and hub that make a wheel read as turning at all. */
function Wheel({ path, rRoot, spokes }) {
  return (
    <>
      <path d={path} fill={IRON} stroke={BRASS} strokeWidth="1.6" strokeLinejoin="round" />
      {/* A solid disc gives the eye nothing to track, and a gear whose teeth are
          the only moving feature reads as a texture scrolling rather than a
          wheel rotating. */}
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={Math.cos(a) * rRoot * 0.26} y1={Math.sin(a) * rRoot * 0.26}
            x2={Math.cos(a) * rRoot * 0.82} y2={Math.sin(a) * rRoot * 0.82}
            stroke={BRASS} strokeWidth="3.2" strokeLinecap="round" opacity="0.55"
          />
        );
      })}
      <circle r={rRoot * 0.26} fill={IRON} stroke={RIM} strokeWidth="1.8" />
      <circle r={rRoot * 0.09} fill={RIM} opacity="0.7" />
    </>
  );
}

/**
 * @param {{ screen: { fraction: number, phase: string, spinStart: number, t0: number } }} props
 */
export default function BootScreen({ screen }) {
  const driverRef = useRef(null);
  const idlerRef = useRef(null);

  useEffect(() => {
    // Someone who has asked their machine to stop moving things at them should
    // not be handed a spinning mechanism as the very first thing. The screen
    // still does its job — it still holds the scene back until the work is in —
    // it just holds still while it does it.
    const still = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let shown = 0;
    let last = performance.now();
    let ratchet = 0;

    const frame = (t) => {
      const dt = Math.min(64, t - last);
      last = t;
      const { fraction, phase, spinStart, t0 } = screen;

      // The needle chases the work, floored by a creep that cannot finish on
      // its own — see `idleCreep`. Five jobs is five steps, and five steps is
      // not enough motion to tell a slow load from a hung one.
      shown = chase(shown, Math.max(fraction, idleCreep(t - t0)), dt);

      let angle;
      if (phase === 'loading') {
        ratchet = ratchetAngle(shown);
        angle = ratchet;
      } else {
        // The ratchet's last position is where the free spin starts from, so
        // the two are one continuous movement rather than a cut.
        angle = ratchet + spinAngle(t - spinStart, SPIN_MS);
      }

      if (!still) {
        driverRef.current?.setAttribute('transform', `rotate(${((angle * 180) / Math.PI).toFixed(2)})`);
        idlerRef.current?.setAttribute('transform', `translate(${IDLER_X.toFixed(2)} ${IDLER_Y.toFixed(2)}) rotate(${((idlerAngle(angle) * 180) / Math.PI).toFixed(2)})`);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  // `phase` is read here from the same object rather than taken as a prop: this
  // component re-renders when the variant does, which is exactly on the phase
  // changes, and reading it here keeps one source of truth for it.
  const gone = screen.phase === 'fade' || screen.phase === 'done';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: LAYERS.boot,
        background: '#000',
        pointerEvents: gone ? 'none' : 'auto',
        opacity: gone ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <svg
        viewBox="-116 -78 178 140"
        width="210"
        style={{
          position: 'absolute', right: '5vw', bottom: '6vh',
          width: 'clamp(170px, 19vw, 260px)', height: 'auto', overflow: 'visible',
        }}
      >
        {/* the light the mechanism is standing in — one warm pool, so the gears
            are lit by something rather than floating on flat black */}
        <defs>
          <radialGradient id="bootPool">
            <stop offset="0%" stopColor="rgba(255,180,84,0.15)" />
            <stop offset="70%" stopColor="rgba(255,140,60,0.04)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <circle cx="-20" cy="-8" r="130" fill="url(#bootPool)" />
        <g ref={idlerRef} transform={`translate(${IDLER_X.toFixed(2)} ${IDLER_Y.toFixed(2)}) rotate(${((IDLER_PHASE * 180) / Math.PI).toFixed(2)})`}>
          <Wheel path={gearPath(IDLER.teeth, IDLER.rTip, IDLER.rRoot)} rRoot={IDLER.rRoot} spokes={4} />
        </g>
        <g ref={driverRef}>
          <Wheel path={gearPath(DRIVER.teeth, DRIVER.rTip, DRIVER.rRoot)} rRoot={DRIVER.rRoot} spokes={6} />
        </g>
      </svg>
    </div>
  );
}
