import { useEffect, useRef, useState } from 'react';

// Quality. The vertical motion blur is an SVG filter over a full-viewport 3D
// subtree, which is far and away the most expensive thing in this scene, and it
// is also the only one that is pure garnish — nothing is unreadable without it.
// So it is the first thing to give up. 'auto' measures and decides; 'on' and
// 'off' override.
//
// Words, not booleans, and that is a bug fix rather than a preference: the
// switch used to read 'auto' | true | false, so writing the obvious thing —
// blur: 'off' — turned it fully *on*, because a non-empty string is truthy and
// the value was handed straight back as the answer. A switch whose off position
// is on is a switch that will lie to whoever measures with it.
export const QUALITY = { blur: 'off' };

// The debug panel is not part of the scene and has no business shipping with it.
// It rendered unconditionally, pinned bottom-left over everything, on what is
// meant to be a business card. Query flag as well as dev build, so it can still
// be reached on a deployed copy when something only misbehaves there.
//
// Lives here rather than its own file: it is one line, gated by the same idea of
// "is this a build that should be measured" as the rest of this module.
export const DEBUG_PANEL = import.meta.env.DEV
  || (typeof location !== 'undefined' && location.search.includes('debug'));

// Frames longer than this are under 25fps and you can see it.
export const SLOW_FRAME_MS = 40;

// Watches what frames actually cost while the lift is moving, and gives the blur
// up for good once the machine has shown it cannot afford it. Measured rather
// than guessed from the user agent, because the thing that matters is this
// machine drawing this scene, not what it says it is.
export function useBlurBudget(moving) {
  const [afford, setAfford] = useState(true);
  const slow = useRef(0);
  useEffect(() => {
    if (QUALITY.blur !== 'auto' || !moving || !afford) return undefined;
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
  return QUALITY.blur === 'auto' ? afford : QUALITY.blur === 'on';
}
