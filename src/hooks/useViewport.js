import { useEffect, useState } from 'react';

/**
 * The window, in pixels. Everything in the scene is sized off this — the shaft
 * is as wide as the viewport and a floor is as tall as one — so a resize is a
 * rebuild of the whole picture rather than a reflow of part of it.
 *
 * @returns {{ vw: number, vh: number }}
 */
export default function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window === 'undefined' ? 1920 : window.innerWidth,
    vh: typeof window === 'undefined' ? 1080 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setSize({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}
