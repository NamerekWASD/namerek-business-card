import { useEffect, useLayoutEffect, useRef } from 'react';
import { LAYERS } from '../scene/layers.js';
import { ARRIVE_MS, BOOT_LAMPS, FADE_MS, litLamps } from './plan.js';
import {
  HOME_DEG, LAMP_Y, LENS_R, PX, PY, RIDE_MS, VIEW_H, VIEW_W, lampX, needleKeyframes,
} from './dial.js';
import { DialFace, DialGlass, DialNeedle } from './DialArt.jsx';

// The first thing anybody sees: a black screen with the floor indicator from
// over a lift's doors, its needle riding up and down the building while the
// scene behind it loads, and a row of lamps that light as the work comes in.
//
// Everything that moves here moves on the compositor — a `transform` or an
// `opacity` keyframe — and nothing is animated from script. The boot is when
// the main thread is busiest, and the gears this replaced were turned from
// `requestAnimationFrame`: they froze for exactly as long as they were needed.
// Script only switches lamps on, which is a step, and a step that lands late
// still reads as a step.

const BOOT_CSS = `
${needleKeyframes('boot-needle')}
@keyframes boot-hum {
  0%, 100% { opacity: 0.75; }
  18% { opacity: 0.95; }
  21% { opacity: 0.6; }
  24% { opacity: 0.9; }
  60% { opacity: 0.8; }
}
@keyframes boot-strike {
  0% { opacity: 0; }
  30% { opacity: 1; }
  45% { opacity: 0.3; }
  70% { opacity: 1; }
  100% { opacity: 1; }
}
.boot-ride { animation: boot-needle ${RIDE_MS}ms linear infinite; }
.boot-hum { animation: boot-hum 3.1s ease-in-out infinite; }
.boot-lamp-lit { opacity: 0; }
[data-lit="true"] > .boot-lamp-lit { opacity: 1; animation: boot-strike 320ms linear; }
@media (prefers-reduced-motion: reduce) {
  .boot-ride { animation: none; transform: rotate(${HOME_DEG}deg); }
  .boot-hum, [data-lit="true"] > .boot-lamp-lit { animation: none; }
}
`;

// Where the dial's centre sits, in percent of the screen's height. Low, not
// centred: in the middle it read as a web spinner, and in the fade it landed
// on the logo painted across the closed doors.
const DIAL_Y = 64;

const pct = (v, of) => `${(v / of) * 100}%`;
const layer = { position: 'absolute', inset: 0 };

/** The lit glass over one lamp's lens. The lens itself is in the artwork. */
function Lamp({ x }) {
  const size = pct(LENS_R * 2, VIEW_W);
  return (
    <span
      data-boot="lamp" data-lit="false"
      style={{
        position: 'absolute', left: pct(x, VIEW_W), top: pct(LAMP_Y, VIEW_H),
        width: size, aspectRatio: '1', transform: 'translate(-50%, -50%)',
      }}
    >
      <span
        className="boot-lamp-lit"
        style={{
          ...layer, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, #fffbe8 0%, #ffd27a 28%, #ff9a2e 62%, #a8440a 100%)',
          boxShadow: '0 0 10px 3px rgba(255, 170, 70, 0.75), 0 0 34px 10px rgba(255, 130, 40, 0.3)',
        }}
      />
    </span>
  );
}

/** The angle a running animation has put the needle at, in degrees. */
function currentDeg(el) {
  const m = /matrix\(([^,]+),\s*([^,]+)/.exec(getComputedStyle(el).transform || '');
  return m ? (Math.atan2(Number(m[2]), Number(m[1])) * 180) / Math.PI : HOME_DEG;
}

/**
 * @param {{ screen: { fraction: number, phase: string } }} props
 */
export default function BootScreen({ screen }) {
  const rootRef = useRef(null);
  const needleRef = useRef(null);
  const { phase } = screen;
  const arrived = phase !== 'loading';
  const gone = phase === 'fade' || phase === 'done';

  // The needle's motion is handed to the browser once per phase and then left
  // alone. Arriving takes the angle the ride had reached and swings home from
  // there with a transition, which is as compositor-driven as the ride was.
  useLayoutEffect(() => {
    const el = needleRef.current;
    if (!el) return;
    el.style.transition = 'none';
    if (!arrived) {
      el.style.transform = '';
      el.classList.add('boot-ride');
      return;
    }
    const still = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.style.transform = `rotate(${currentDeg(el)}deg)`;
    el.classList.remove('boot-ride');
    if (!still) {
      el.getBoundingClientRect(); // commit the start angle before the swing
      el.style.transition = `transform ${Math.round(ARRIVE_MS * 0.85)}ms cubic-bezier(0.5, 0, 0.25, 1.22)`;
    }
    el.style.transform = `rotate(${HOME_DEG}deg)`;
  }, [arrived]);

  // The lamps, whenever the main thread can spare a frame for them.
  useEffect(() => {
    const lamps = rootRef.current?.querySelectorAll('[data-boot="lamp"]') ?? [];
    let shown = -1;
    let raf = 0;
    const frame = () => {
      const lit = litLamps(screen.fraction);
      if (lit !== shown) {
        shown = lit;
        lamps.forEach((lamp, i) => lamp.setAttribute('data-lit', String(i < lit)));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  // Gone for good once it has faded: the artwork's SVG filters have no business
  // staying mounted over a scene whose decks move every frame.
  if (phase === 'done') return null;

  return (
    <div
      ref={rootRef}
      data-boot="screen"
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: LAYERS.boot,
        background: '#000',
        pointerEvents: gone ? 'none' : 'auto',
        opacity: gone ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <style>{BOOT_CSS}</style>
      <div
        className="boot-hum"
        style={{
          ...layer,
          background: `radial-gradient(ellipse 38vmax 30vmax at 50% ${DIAL_Y - 3}%, rgba(255,170,80,0.16), rgba(255,130,50,0.05) 50%, rgba(0,0,0,0) 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute', left: '50%', top: `${DIAL_Y}%`, transform: 'translate(-50%, -50%)',
          // Capped by height too, so a phone held sideways keeps the lamps on screen.
          width: 'clamp(220px, min(30vw, 58vh), 440px)', aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        }}
      >
        <DialFace lamps={BOOT_LAMPS} />
        <div
          ref={needleRef}
          data-boot="needle"
          style={{ ...layer, transformOrigin: `${pct(PX, VIEW_W)} ${pct(PY, VIEW_H)}`, willChange: 'transform' }}
        >
          <DialNeedle />
        </div>
        <DialGlass />
        {Array.from({ length: BOOT_LAMPS }, (_, i) => <Lamp key={i} x={lampX(i, BOOT_LAMPS)} />)}
      </div>
    </div>
  );
}
