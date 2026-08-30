// Whether this browser can actually run the WebGL backend.
//
// Asked once, by making a throwaway context rather than by sniffing anything:
// the answer depends on the driver, the GPU blocklist and how many contexts
// the tab already holds, and none of those are visible from a user-agent
// string. This is the capability probe `App.jsx`'s gate is built on — see
// NAM-48.
//
// @returns {boolean}
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
