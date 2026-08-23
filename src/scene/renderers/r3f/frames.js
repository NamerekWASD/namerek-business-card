// ── asking for a frame ───────────────────────────────────────────────────────
// This scene is two WebGL contexts drawing one picture. They have to be two,
// because the decks are genuinely *between* the halves — they sit on the landing,
// behind the doors — and no z-index inside one canvas can express that. But the
// viewer is not looking at two canvases; they are looking at a lift shaft, and
// anything that is true of one half's frame has to be true of the other's at the
// same moment.
//
// Both canvases are `frameloop="demand"` at rest, which is what makes the scene
// cheap when nobody is riding: a still picture redrawn sixty times a second is
// two fans spinning for nothing. The catch is that R3F's `invalidate` belongs to
// one canvas, so a component that asks for a frame only ever wakes the context it
// happens to be mounted in — and a canvas that sits out a long run of composites
// while its neighbour is drawing on every one of them does not reliably keep what
// it last drew. A WebGL drawing buffer is not `preserveDrawingBuffer`, and the
// browser is entitled to hand back an empty one.
//
// That is not theoretical, and it is the door flicker. Arriving at the ground
// floor opens the doors, which starts the mark's two-second reveal on the landing
// screen — and only there, because floor 0 is the only landing that carries the
// mark. The reveal invalidated its own canvas about sixty times a second while
// the near canvas, holding the doors, the architrave and the cage, drew *nothing*
// for the whole of it. Measured on an arrival: 60fps in the shaft canvas, zero
// frames in the near one, for 1.2 seconds. The doors blinked, on that floor, a
// second after they opened, and nowhere else — which is exactly what was
// reported and exactly what no amount of looking at the door code would have
// explained.
//
// So a frame is asked of the scene, not of a canvas.

/** @type {Set<() => void>} */
const canvases = new Set();

/**
 * Adds a canvas's own `invalidate` to the scene. Returns the unregister, for the
 * effect that called it.
 * @param {() => void} invalidate
 * @returns {() => void}
 */
export function registerCanvas(invalidate) {
  canvases.add(invalidate);
  return () => canvases.delete(invalidate);
}

/**
 * Asks every canvas in the scene for a frame.
 *
 * Use this instead of R3F's own `invalidate` for anything the viewer perceives
 * as happening to *the scene* — an animation playing out, a state settling —
 * rather than to one context's contents. `useRideMotion` is the exception that
 * proves it: a ride puts both canvases on `frameloop="always"`, so during one
 * there is no demand to express.
 */
export function invalidateScene() {
  for (const invalidate of canvases) invalidate();
}
