import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEBUG_PANEL } from '../scene/effects/quality.js';
import {
  BOOT_JOBS, BOOT_MIN_MS, CSS_JOBS, FADE_MS, SPIN_MS, fractionDone,
} from './plan.js';

// The state machine behind the boot screen. Four phases and three transitions,
// and the reason it is a hook rather than a `useState` in the variant is that
// two of those transitions are timers and one is a race — none of which belong
// in a component that also lays out a lift shaft.
//
// The progress *figure* is deliberately not React state. It changes on every
// frame, and putting it through a `setState` would re-render the whole scene
// sixty times a second to move a gear that is drawn in an SVG nobody else can
// see. So the fraction lives on a mutable object, `BootScreen` reads it in its
// own animation frame and writes transforms straight to the DOM, and React only
// hears about the phase changes — of which there are three, ever.

/** Nothing may hold the screen longer than this, whatever it is waiting for. */
export const BOOT_MAX_MS = 8000;

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

/**
 * @typedef {'loading' | 'spin' | 'fade' | 'done'} BootPhase
 */

/**
 * @param {boolean} r3f whether the WebGL backend is the one drawing
 * @returns {{
 *   phase: BootPhase,
 *   settle: (name: string) => void,
 *   screen: { fraction: number, phase: BootPhase, spinStart: number, t0: number },
 * }}
 */
export default function useBoot(r3f) {
  // The CSS backend compiles no shaders, so waiting on two canvases that do not
  // exist would hold a black screen until the hard timeout fired.
  const jobs = useMemo(() => (
    r3f ? BOOT_JOBS : Object.fromEntries(CSS_JOBS.map((k) => [k, BOOT_JOBS[k]]))
  ), [r3f]);

  const [phase, setPhase] = useState(/** @type {BootPhase} */ ('loading'));
  const settled = useRef(new Set());
  // Held on the loading phase, so the screen can actually be looked at. It is
  // over in under two seconds on a warm reload, and `useIntroClock` already
  // makes the argument for why that is not good enough: an animation you can
  // only ever watch at full speed is one you tune by guessing. `?boot` starts
  // held; `window.__boot` drives it from the console.
  const held = useRef(typeof location !== 'undefined' && location.search.includes('boot'));
  // What `BootScreen` reads every frame. One object, mutated in place, never
  // replaced — a fresh one would be a new prop and would re-render the screen.
  const screen = useRef({ fraction: 0, phase: /** @type {BootPhase} */ ('loading'), spinStart: 0, t0: now() });

  const enter = useCallback((next) => {
    screen.current.phase = next;
    if (next === 'spin') screen.current.spinStart = now();
    setPhase(next);
  }, []);

  const settle = useCallback((name) => {
    if (settled.current.has(name)) return;
    settled.current.add(name);
    screen.current.fraction = fractionDone(settled.current, jobs);
  }, [jobs]);

  // Fonts are their own job and nobody else's: `document.fonts.ready` is a
  // promise the browser hands out for free, and Archivo Black arriving after
  // the doors open reflows the floor selector — the same failure as a texture
  // popping in, one layer up.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) { settle('fonts'); return undefined; }
    let live = true;
    document.fonts.ready.then(() => { if (live) settle('fonts'); }, () => settle('fonts'));
    return () => { live = false; };
  }, [settle]);

  // The spin begins when every job has reported *and* the screen has had its
  // minimum time. Polled rather than pushed because the two conditions finish
  // in either order, and a poll on a 60ms tick is a great deal less code than
  // a second timer racing the first.
  useEffect(() => {
    if (phase !== 'loading') return undefined;
    const tick = () => {
      if (held.current) return;
      // A link opened in a background tab is the case this whole feature exists
      // for and the one it would otherwise miss completely. `requestAnimationFrame`
      // does not run in a hidden document, so the gears would not turn and the
      // intro clock would not advance — but these timers *do* run, so the screen
      // would march through its phases to an empty room and the visitor would
      // arrive at a lit shaft with the doors already open, having been shown
      // none of it.
      //
      // So a hidden document holds the boot at the start and keeps pushing the
      // minimum-time mark along with it. The arrival begins when somebody is
      // actually there to see it.
      if (typeof document !== 'undefined' && document.hidden) {
        screen.current.t0 = now();
        return;
      }
      const elapsed = now() - screen.current.t0;
      const all = screen.current.fraction >= 1;
      // The escape hatch. A lost WebGL context, a canvas that never draws, a
      // font that never resolves — none of them should leave a visitor looking
      // at a black rectangle with a gear on it. The scene behind has been
      // drawing this whole time; going in early is always better than not
      // going in.
      if ((all && elapsed >= BOOT_MIN_MS) || elapsed >= BOOT_MAX_MS) {
        screen.current.fraction = 1;
        enter('spin');
      }
    };
    const id = setInterval(tick, 60);
    tick();
    return () => clearInterval(id);
  }, [phase, enter]);

  useEffect(() => {
    if (phase !== 'spin') return undefined;
    const id = setTimeout(() => enter('fade'), SPIN_MS);
    return () => clearTimeout(id);
  }, [phase, enter]);

  useEffect(() => {
    if (phase !== 'fade') return undefined;
    const id = setTimeout(() => enter('done'), FADE_MS);
    return () => clearTimeout(id);
  }, [phase, enter]);

  // The same handle `__shots` and `__scenes` are: the app exposing its own
  // states rather than a harness trying to catch them mid-flight. Debug builds
  // only — it is a lever on the first thing a visitor sees.
  //
  //   window.__boot.hold()            // freeze on the gears
  //   window.__boot.fraction = 0.4    // put the ratchet where you want it
  //   window.__boot.release()         // let it finish
  //   window.__boot.replay()          // from the top, without a reload
  useEffect(() => {
    if (!DEBUG_PANEL || typeof window === 'undefined') return undefined;
    window.__boot = {
      hold: () => { held.current = true; },
      release: () => { held.current = false; },
      replay: () => {
        held.current = false;
        settled.current = new Set();
        screen.current.fraction = 0;
        screen.current.t0 = now();
        enter('loading');
      },
      get phase() { return screen.current.phase; },
      get fraction() { return screen.current.fraction; },
      set fraction(v) { screen.current.fraction = Math.min(1, Math.max(0, v)); },
    };
    return () => { delete window.__boot; };
  }, [enter]);

  return { phase, settle, screen: screen.current };
}
