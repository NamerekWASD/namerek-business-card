import { useEffect, useRef, useState } from 'react';

/**
 * A clock that plays once from zero and can then be dragged by hand. It drives
 * the door intro, and the ability to stop it and scrub it is what makes the
 * intro tunable at all — an animation you can only ever watch at full speed is
 * one you tune by guessing.
 *
 * @param {number} totalMs
 * @param {boolean} [autoplay] whether the one-off intro may begin
 * @param {boolean} [instant] NBC-25: play it by arriving at the end of it. The
 *   intro is a shudder and a flicker — the two things `prefers-reduced-motion`
 *   names by name — and both are this clock, so a visitor who has asked for
 *   stillness gets the settled scene the intro was on its way to: leaves open,
 *   lamps up, no frame ever asked for.
 * @returns {{ t: number, setT: (v: number) => void, playing: boolean, play: (from?: number) => void, stop: () => void }}
 */
export default function useIntroClock(totalMs, autoplay = true, instant = false) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  const play = (from = 0) => {
    stop();
    if (instant) { setT(totalMs); return; }
    setPlaying(true);
    setT(from);
    startRef.current = performance.now() - from;
    const tick = (now) => {
      const elapsed = now - startRef.current;
      if (elapsed >= totalMs) {
        setT(totalMs);
        setPlaying(false);
        return;
      }
      setT(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!autoplay) return undefined;
    play(0);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, instant]);

  return { t, setT: (v) => { stop(); setT(v); }, playing, play, stop };
}
