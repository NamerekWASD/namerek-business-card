// Which backend draws the scene's volume. CSS 3D is the default and stays the
// reference: the R3F backend is judged against it, not the other way round, so
// it has to be possible to put the two side by side in the same build.
//
// `?renderer=r3f` in the query string is the whole of the switch. It is read
// once, at module load, rather than through React state — the two backends do
// not swap at runtime, and a flag that could would mean every component
// underneath has to survive its scene being torn out from under it.

/**
 * @param {string} [search] the query string, defaulting to the document's own
 * @returns {'css3d' | 'r3f'}
 */
export function rendererFrom(search) {
  const q = search ?? (typeof window === 'undefined' ? '' : window.location.search);
  return new URLSearchParams(q).get('renderer') === 'r3f' ? 'r3f' : 'css3d';
}

/**
 * Whether this browser can actually run the WebGL backend.
 *
 * Asked once, by making a throwaway context rather than by sniffing anything:
 * the answer depends on the driver, the GPU blocklist and how many contexts the
 * tab already holds, and none of those are visible from a user-agent string.
 *
 * @returns {boolean}
 */
export function webglAvailable() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export const RENDERER = rendererFrom();

// Asking for the WebGL backend is not the same as getting it. A machine that
// cannot give us a context gets the CSS scene rather than a blank frame — which
// is the whole reason the CSS backend is still here and still the default.
export const R3F = RENDERER === 'r3f' && webglAvailable();
