import { useEffect, useRef, useState } from 'react';

// Quality. What this budget used to buy was the vertical motion smear — an SVG
// filter over the deck column — and that is gone (NBC-79): a reference filter is
// not composited, so it took a layer that moves every frame off the compositor
// and had the text repainted, convolved and handed over at its own slower rate
// while the canvases behind it ran on. What is left to give up is the pixels
// themselves, the dpr ceiling the two canvases are built at. 'auto' measures and
// decides; 'on' and 'off' override.
//
// Words, not booleans, and that is a bug fix rather than a preference: the
// switch used to read 'auto' | true | false, so writing the obvious thing —
// detail: 'off' — turned it fully *on*, because a non-empty string is truthy and
// the value was handed straight back as the answer. A switch whose off position
// is on is a switch that will lie to whoever measures with it.
export const QUALITY = { detail: 'on' };

export const DEBUG_PANEL = import.meta.env.DEV
  && (typeof location !== 'undefined' && location.search.includes('debug'));

// Frames longer than this are under 25fps and you can see it.
export const SLOW_FRAME_MS = 40;

// Watches what frames actually cost while the lift is moving, and gives the
// extra detail up for good once the machine has shown it cannot afford it.
// Measured rather than guessed from the user agent, because the thing that
// matters is this machine drawing this scene, not what it says it is.
export function useDetailBudget(moving) {
  const [afford, setAfford] = useState(true);
  const slow = useRef(0);
  useEffect(() => {
    if (QUALITY.detail !== 'auto' || !moving || !afford) return undefined;
    let id;
    let last = 0;
    const tick = (t) => {
      // the first sample spans the gap since the ride began, so it is not a frame
      const dt = last ? t - last : 0;
      if (dt > SLOW_FRAME_MS) slow.current += 1;
      last = t;
      // Four slow frames, or one frame so long it is a visible hitch on its own.
      // The old threshold of six needed several rides to trip, which meant the
      // machines that needed this most spent the longest not getting it.
      if (slow.current >= 4 || dt > 80) {
        setAfford(false);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [moving, afford]);
  return QUALITY.detail === 'auto' ? afford : QUALITY.detail === 'on';
}
