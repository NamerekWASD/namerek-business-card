import { useEffect, useRef, useState } from 'react';

/**
 * Fires exactly once, the first time the element is meaningfully in view — the
 * flat page's whole motion trigger. Once, and not on every re-entry: an arrival
 * that replays each time you scroll past becomes tiring within three floors.
 *
 * Where there is no `IntersectionObserver` at all the answer is "arrived", not
 * "never" — a page that hides its content behind an observer it cannot build is
 * a page with no content.
 */
export default function useArrival() {
  const ref = useRef(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setArrived(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setArrived(true);
          io.disconnect();
        }
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, arrived };
}
